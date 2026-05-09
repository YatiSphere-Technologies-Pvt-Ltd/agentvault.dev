'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useMemo, useState } from 'react';
import { Plus, Search, Download, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from '@/components/ui/tooltip';
import { DataTable } from '@/components/tables/DataTable';
import { FacetFilterBar } from '@/components/tables/FacetFilter';
import { vendorById, VENDORS, AUTH_KINDS } from './_catalog';
import { useServers } from './_store';
import { VendorIcon, fmtAgo, authSummary } from './_shared';
import ConnectMcpSheet from './ConnectMcpSheet';

/* ── Status meta ── */
const STATUS_META = {
  connected:    { label: 'connected',    color: 'var(--brand-teal)' },
  degraded:     { label: 'degraded',     color: 'var(--accent)'      },
  paused:       { label: 'paused',       color: 'var(--muted-foreground)' },
  failed:       { label: 'failed',       color: 'var(--destructive)' },
  disconnected: { label: 'disconnected', color: 'var(--muted-foreground)' },
  available:    { label: 'available',    color: 'var(--primary)' },
};

function StatusPill({ status }) {
  const meta = STATUS_META[status] || STATUS_META.disconnected;
  const animated = status === 'connected';
  return (
    <span
      className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md border text-[11px] font-medium whitespace-nowrap"
      style={{ borderColor: meta.color + '55', color: meta.color, background: meta.color + '12' }}
    >
      <span className={`h-1.5 w-1.5 rounded-full ${animated ? 'animate-pulse' : ''}`} style={{ background: meta.color }} />
      {meta.label}
    </span>
  );
}

function ToolsCell({ tools }) {
  const enabled = tools.filter(t => t.enabled).length;
  const total = tools.length;
  const high = tools.filter(t => t.riskLevel === 'high').length;
  const med  = tools.filter(t => t.riskLevel === 'med').length;
  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger
          render={
            <span className="font-mono tabular-nums text-foreground text-[12px] cursor-help">
              {enabled}<span className="text-muted-foreground">/{total}</span>
            </span>
          }
        />
        <TooltipContent>
          <div className="text-[11.5px] font-mono space-y-0.5">
            <div>{enabled} enabled · {total - enabled} disabled</div>
            {high > 0 && <div className="text-destructive">{high} high-risk</div>}
            {med  > 0 && <div className="text-accent">{med} med-risk</div>}
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

function ErrorRateCell({ rate }) {
  if (!rate) return <span className="font-mono tabular-nums text-muted-foreground text-[12px]">0%</span>;
  const pct = (rate * 100);
  const tone = rate > 0.05 ? 'text-destructive' : rate > 0.01 ? 'text-primary' : 'text-foreground';
  return <span className={`font-mono tabular-nums text-[12px] ${tone}`}>{pct.toFixed(2)}%</span>;
}

function AgentsCell({ agents }) {
  if (!agents || agents.length === 0) {
    return <span className="text-[12px] text-muted-foreground">—</span>;
  }
  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger
          render={
            <span className="font-mono tabular-nums text-foreground text-[12px] cursor-help">{agents.length}</span>
          }
        />
        <TooltipContent>
          <div className="text-[11.5px] font-mono space-y-0.5">
            {agents.map(a => <div key={a}>{a}</div>)}
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

/* ── CSV export ── */
function toCsv(rows) {
  const header = [
    'id', 'name', 'vendor', 'status', 'transport', 'endpoint',
    'auth_kind', 'owner', 'team', 'visibility',
    'tools_enabled', 'tools_total', 'calls_30d', 'p50_ms', 'error_rate_7d', 'last_used_at',
  ];
  const body = rows.map(s => [
    s.id, s.name, s.vendorId, s.status, s.transport, s.endpoint,
    s.auth?.kind, s.owner, s.team, s.visibility,
    s.tools.filter(t => t.enabled).length, s.tools.length,
    s.toolCalls30d, s.p50, s.errorRate7d, s.lastUsedAt || '',
  ]);
  return [header, ...body].map(line => line.map(v => {
    const t = String(v ?? '');
    return /[",\n]/.test(t) ? `"${t.replace(/"/g, '""')}"` : t;
  }).join(',')).join('\n');
}

function downloadCsv(filename, csv) {
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = filename;
  document.body.appendChild(a); a.click(); a.remove();
  URL.revokeObjectURL(url);
}

const STATUS_OPTIONS = Object.entries(STATUS_META).map(([id, m]) => ({
  value: id, label: m.label, color: m.color,
}));

const TRANSPORT_OPTIONS = [
  { value: 'streamable-http', label: 'Streamable HTTP' },
  { value: 'sse',             label: 'HTTP + SSE' },
  { value: 'stdio',           label: 'stdio (local)' },
];

const VISIBILITY_OPTIONS = [
  { value: 'private', label: 'Private' },
  { value: 'team',    label: 'Team' },
  { value: 'org',     label: 'Org' },
];

/* ── Synthesise a row for any catalog vendor that isn't connected yet ──
   The user's complaint: catalog has 20+ vendors but the table only shows the
   handful seeded as connected. Solution: merge — every catalog preset shows
   up as a row. Connected ones use their real data; unconnected ones show
   status=available + a Connect button.

   Excluded: 'custom' (placeholder, requires a custom URL via the existing
   /app/mcp/new flow). */

function buildAvailableRow(vendor) {
  return {
    id:        `__available_${vendor.id}`,    // synthetic id; never hits the store
    vendorId:  vendor.id,
    name:      vendor.label,
    description: vendor.blurb,
    transport: vendor.transport,
    endpoint:  vendor.endpoint,
    auth:      { kind: vendor.defaultAuth },
    status:    'available',
    visibility:'team',
    tools:     vendor.mockTools || [],
    attachedAgents: [],
    p50: 0, errorRate7d: 0, toolCalls30d: 0,
    lastUsedAt: null,
    __synthetic: true,
  };
}

export default function MCPListPage() {
  const router = useRouter();
  const { servers, hydrated } = useServers();

  const [globalFilter, setGlobalFilter] = useState('');
  const [vendorSel,    setVendorSel]     = useState(new Set());
  const [statusSel,    setStatusSel]     = useState(new Set());
  const [transportSel, setTransportSel]  = useState(new Set());
  const [authSel,      setAuthSel]       = useState(new Set());
  const [visibilitySel, setVisibilitySel] = useState(new Set());

  const [connectVendorId, setConnectVendorId] = useState(null);

  // Merge: every connected server keeps its real data; every catalog vendor
  // *not* yet connected shows up as an "available" row.
  const merged = useMemo(() => {
    const connectedVendors = new Set(servers.map(s => s.vendorId));
    const available = VENDORS
      .filter(v => v.id !== 'custom' && !connectedVendors.has(v.id))
      .map(buildAvailableRow);
    return [...servers, ...available];
  }, [servers]);

  const filtered = useMemo(() => merged.filter(s => {
    if (vendorSel.size     > 0 && !vendorSel.has(s.vendorId))         return false;
    if (statusSel.size     > 0 && !statusSel.has(s.status))           return false;
    if (transportSel.size  > 0 && !transportSel.has(s.transport))     return false;
    if (authSel.size       > 0 && !authSel.has(s.auth?.kind))         return false;
    if (visibilitySel.size > 0 && !visibilitySel.has(s.visibility))   return false;
    return true;
  }), [merged, vendorSel, statusSel, transportSel, authSel, visibilitySel]);

  // Triage stats — count connected/available against the unfiltered merge
  const stats = useMemo(() => {
    const connected = merged.filter(s => s.status === 'connected').length;
    const available = merged.filter(s => s.status === 'available').length;
    const degraded  = merged.filter(s => s.status === 'degraded' || s.status === 'failed').length;
    const totalCalls = merged.reduce((n, s) => n + (s.toolCalls30d || 0), 0);
    return { connected, available, degraded, totalCalls };
  }, [merged]);

  const columns = useMemo(() => [
    {
      accessorKey: 'name',
      header: 'Server',
      cell: ({ row }) => {
        const s = row.original;
        return (
          <div className="flex items-start gap-3 min-w-0">
            <div className="h-8 w-8 rounded-md bg-primary/10 text-primary flex items-center justify-center shrink-0">
              <VendorIcon vendorId={s.vendorId} size={14} />
            </div>
            <div className="min-w-0">
              <div className="text-[13px] font-medium text-foreground truncate">{s.name}</div>
              <div className="mt-0.5 text-[11.5px] text-muted-foreground font-mono truncate">
                {vendorById(s.vendorId).label} · {s.endpoint || '—'}
              </div>
              {s.description && (
                <p className="mt-1 text-[11.5px] text-muted-foreground/95 leading-relaxed line-clamp-1 max-w-160">
                  {s.description}
                </p>
              )}
            </div>
          </div>
        );
      },
      sortingFn: (a, b) => a.original.name.localeCompare(b.original.name),
      filterFn: (row, _c, query) => {
        if (!query) return true;
        const q = String(query).toLowerCase();
        const s = row.original;
        return s.name.toLowerCase().includes(q) ||
               (s.description || '').toLowerCase().includes(q) ||
               (s.endpoint || '').toLowerCase().includes(q) ||
               (s.team || '').toLowerCase().includes(q);
      },
    },
    {
      accessorKey: 'status',
      header: 'Status',
      cell: ({ row }) => <StatusPill status={row.original.status} />,
      enableGlobalFilter: false,
    },
    {
      id: 'auth',
      accessorFn: (s) => s.auth?.kind || '',
      header: 'Auth',
      cell: ({ row }) => (
        <span className="text-[12px] font-mono text-foreground">{authSummary(row.original.auth)}</span>
      ),
      enableGlobalFilter: false,
    },
    {
      id: 'tools',
      accessorFn: (s) => s.tools?.filter(t => t.enabled).length || 0,
      header: 'Tools',
      cell: ({ row }) => <ToolsCell tools={row.original.tools || []} />,
      sortingFn: (a, b) => (a.original.tools?.filter(t => t.enabled).length || 0) - (b.original.tools?.filter(t => t.enabled).length || 0),
      meta: { align: 'right' },
      enableGlobalFilter: false,
    },
    {
      id: 'agents',
      accessorFn: (s) => (s.attachedAgents || []).length,
      header: 'Agents',
      cell: ({ row }) => <AgentsCell agents={row.original.attachedAgents || []} />,
      meta: { align: 'right' },
      enableGlobalFilter: false,
    },
    {
      id: 'calls',
      accessorFn: (s) => s.toolCalls30d || 0,
      header: 'Calls · 30d',
      cell: ({ row }) => (
        <span className="font-mono tabular-nums text-foreground text-[12px]">
          {(row.original.toolCalls30d || 0).toLocaleString()}
        </span>
      ),
      meta: { align: 'right' },
      enableGlobalFilter: false,
    },
    {
      id: 'p50',
      accessorFn: (s) => s.p50 || 0,
      header: 'p50',
      cell: ({ row }) => {
        const v = row.original.p50 || 0;
        return <span className="font-mono tabular-nums text-muted-foreground text-[12px]">{v ? `${v} ms` : '—'}</span>;
      },
      meta: { align: 'right' },
      enableGlobalFilter: false,
    },
    {
      id: 'errorRate',
      accessorFn: (s) => s.errorRate7d || 0,
      header: 'Error · 7d',
      cell: ({ row }) => <ErrorRateCell rate={row.original.errorRate7d || 0} />,
      meta: { align: 'right' },
      enableGlobalFilter: false,
    },
    {
      id: 'lastUsed',
      accessorFn: (s) => s.lastUsedAt ? new Date(s.lastUsedAt).getTime() : 0,
      header: 'Last used',
      cell: ({ row }) => (
        <span className="font-mono tabular-nums text-muted-foreground text-[11.5px]">{fmtAgo(row.original.lastUsedAt)}</span>
      ),
      meta: { align: 'right' },
      enableGlobalFilter: false,
    },
    {
      id: 'action',
      header: '',
      cell: ({ row }) => {
        const s = row.original;
        if (s.status === 'available') {
          return (
            <Button
              size="sm"
              variant="default"
              className="h-7 text-[11.5px]"
              onClick={(e) => { e.stopPropagation(); setConnectVendorId(s.vendorId); }}
            >
              Connect <ArrowRight className="h-3 w-3" />
            </Button>
          );
        }
        return (
          <Button
            size="sm"
            variant="ghost"
            className="h-7 text-[11.5px] text-muted-foreground hover:text-foreground"
            onClick={(e) => { e.stopPropagation(); router.push(`/app/mcp/${s.id}`); }}
          >
            Open <ArrowRight className="h-3 w-3" />
          </Button>
        );
      },
      meta: { align: 'right' },
      enableSorting: false,
      enableGlobalFilter: false,
      enableHiding: false,
    },
  ], [router]);

  const vendorOptions = VENDORS.map(v => ({ value: v.id, label: v.label }));
  const authOptions   = AUTH_KINDS.map(a => ({ value: a.id, label: a.label }));

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-10 py-7">
      {/* Title row */}
      <div className="flex items-end justify-between mb-5 flex-wrap gap-3">
        <div>
          <h2 className="text-[18px] font-semibold text-foreground">MCP Servers</h2>
          <p className="mt-1 text-[13px] text-muted-foreground max-w-160 leading-relaxed">
            Model Context Protocol endpoints your agents can call. Connected servers show real metrics; available ones can be connected in-place. Credentials always go to the workspace vault.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => downloadCsv('mcp-servers.csv', toCsv(filtered))}>
            <Download className="h-3.5 w-3.5" /> Export
          </Button>
          <Button size="sm" render={<Link href="/app/mcp/new" />}>
            <Plus className="h-3.5 w-3.5" /> Add server
          </Button>
        </div>
      </div>

      {/* Triage strip */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-5">
        <Stat label="Connected"   value={stats.connected} tone={stats.degraded === 0 ? 'ok' : 'default'} />
        <Stat label="Available"   value={stats.available} sub="not yet connected" />
        <Stat label="Degraded"    value={stats.degraded}  tone={stats.degraded > 0 ? 'bad' : 'ok'} />
        <Stat label="Tool calls · 30d" value={stats.totalCalls.toLocaleString()} />
      </div>

      <DataTable
        columns={columns}
        data={hydrated ? filtered : []}
        globalFilter={globalFilter}
        onGlobalFilterChange={setGlobalFilter}
        onRowClick={(s) => {
          if (s.status === 'available') setConnectVendorId(s.vendorId);
          else router.push(`/app/mcp/${s.id}`);
        }}
        emptyMessage={hydrated ? 'No servers match the current filters.' : 'Loading…'}
        pageSize={25}
        minWidth="min-w-[1180px]"
        initialSorting={[{ id: 'lastUsed', desc: true }]}
        toolbar={
          <div className="relative w-full max-w-xs">
            <Search className="h-3.5 w-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={globalFilter}
              onChange={(e) => setGlobalFilter(e.target.value)}
              placeholder="Search servers, endpoints, teams…"
              className="pl-8 h-8 text-[12.5px]"
            />
          </div>
        }
        filters={
          <FacetFilterBar
            filters={[
              { title: 'Vendor',     options: vendorOptions,     selected: vendorSel,     onChange: setVendorSel     },
              { title: 'Status',     options: STATUS_OPTIONS,    selected: statusSel,     onChange: setStatusSel     },
              { title: 'Transport',  options: TRANSPORT_OPTIONS, selected: transportSel,  onChange: setTransportSel  },
              { title: 'Auth',       options: authOptions,       selected: authSel,       onChange: setAuthSel       },
              { title: 'Visibility', options: VISIBILITY_OPTIONS, selected: visibilitySel, onChange: setVisibilitySel },
            ]}
            onClearAll={() => {
              setVendorSel(new Set());
              setStatusSel(new Set());
              setTransportSel(new Set());
              setAuthSel(new Set());
              setVisibilitySel(new Set());
            }}
          />
        }
      />

      <ConnectMcpSheet
        open={!!connectVendorId}
        vendorId={connectVendorId}
        onClose={() => setConnectVendorId(null)}
        onConnected={(server) => router.push(`/app/mcp/${server.id}`)}
      />
    </div>
  );
}

function Stat({ label, value, sub, tone = 'default' }) {
  const color = tone === 'bad'  ? 'text-destructive'
              : tone === 'warn' ? 'text-primary'
              : tone === 'ok'   ? 'text-brand-teal'
              :                   'text-foreground';
  return (
    <div className="rounded-lg border border-border bg-card p-3">
      <div className="text-[11.5px] font-medium text-muted-foreground">{label}</div>
      <div className="mt-1 flex items-baseline gap-1.5">
        <div className={`text-[22px] font-semibold tabular-nums ${color}`}>{value}</div>
        {sub && <div className="text-[11.5px] text-muted-foreground">{sub}</div>}
      </div>
    </div>
  );
}
