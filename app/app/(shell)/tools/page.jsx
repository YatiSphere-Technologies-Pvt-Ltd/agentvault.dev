'use client';

import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Search, Plus, Download, Wrench } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from '@/components/ui/tooltip';
import { DataTable } from '@/components/tables/DataTable';
import { FacetFilterBar } from '@/components/tables/FacetFilter';
import {
  ORIGINS, SIDE_EFFECTS, RISKS, STATUSES,
  RISK_TONE, STATUS_TONE, SIDE_EFFECT_TONE,
  originLabel, sideEffectLabel,
} from './_toolsCatalog';
import { useTools } from './_toolsStore';

function distinct(items, key) {
  return Array.from(new Set(items.map(i => i[key]).filter(Boolean))).sort();
}

function OriginPill({ origin }) {
  const tone = origin === 'mcp'         ? 'bg-(--brand-teal)/10 text-brand-teal border-(--brand-teal)/40'
             : origin === 'integration' ? 'bg-primary/10 text-primary border-primary/40'
             : origin === 'custom'      ? 'bg-accent/10 text-accent border-accent/40'
             :                            'bg-muted text-muted-foreground border-border';
  return (
    <span className={`inline-flex items-center px-1.5 py-0.5 rounded-md border text-[10.5px] font-medium ${tone}`}>
      {originLabel(origin)}
    </span>
  );
}

function RiskPill({ risk }) {
  const tone = RISK_TONE[risk] || RISK_TONE.low;
  return (
    <span
      className="inline-flex items-center gap-1.5 px-1.5 py-0.5 rounded-md border text-[11px] font-medium"
      style={{ borderColor: tone.color + '55', color: tone.color, background: tone.color + '12' }}
    >
      <span className="h-1.5 w-1.5 rounded-full" style={{ background: tone.color }} />
      {tone.label}
    </span>
  );
}

function StatusPill({ status }) {
  const tone = STATUS_TONE[status] || STATUS_TONE.active;
  return (
    <span
      className="inline-flex items-center px-1.5 py-0.5 rounded-md border text-[11px] font-medium"
      style={{ borderColor: tone.color + '55', color: tone.color, background: tone.color + '12' }}
    >
      {tone.label}
    </span>
  );
}

function SideEffectPill({ id }) {
  const tone = SIDE_EFFECT_TONE[id] || SIDE_EFFECT_TONE.read;
  return (
    <span
      className="inline-flex items-center gap-1.5 px-1.5 py-0.5 rounded-md border text-[10.5px] font-medium"
      style={{ borderColor: tone.color + '55', color: tone.color, background: tone.color + '12' }}
    >
      {tone.label}
    </span>
  );
}

function ErrorRateCell({ rate }) {
  if (!rate) return <span className="font-mono tabular-nums text-muted-foreground text-[12px]">0%</span>;
  const pct = (rate * 100);
  const tone = rate > 0.05 ? 'text-destructive' : rate > 0.01 ? 'text-primary' : 'text-foreground';
  return <span className={`font-mono tabular-nums text-[12px] ${tone}`}>{pct.toFixed(1)}%</span>;
}

function FindingsCell({ row }) {
  const f = row.original.findings7d || {};
  const total = (f.block || 0) + (f.approval || 0) + (f.warn || 0);
  if (total === 0) {
    return <span className="font-mono tabular-nums text-muted-foreground text-[12px]">0</span>;
  }
  const tone = f.block > 0 ? 'text-destructive'
             : f.approval > 0 ? 'text-primary'
             : 'text-accent';
  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger
          render={
            <span className={`font-mono tabular-nums text-[12px] cursor-help ${tone}`}>
              {total}
            </span>
          }
        />
        <TooltipContent>
          <div className="text-[11.5px] font-mono space-y-0.5">
            <div className={f.block > 0    ? 'text-destructive' : ''}>Blocked: {f.block || 0}</div>
            <div className={f.approval > 0 ? 'text-primary' : ''}>Approvals: {f.approval || 0}</div>
            <div className={f.warn > 0     ? 'text-accent' : ''}>Warnings: {f.warn || 0}</div>
            <div className="opacity-80">Logged: {(f.log || 0).toLocaleString()}</div>
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

function CallingAgentsCell({ agents }) {
  if (!agents || agents.length === 0) {
    return <span className="text-[12px] text-muted-foreground">—</span>;
  }
  if (agents.length === 1) {
    return <span className="font-mono tabular-nums text-[12px] text-foreground">{agents.length}</span>;
  }
  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger
          render={
            <span className="font-mono tabular-nums text-[12px] text-foreground cursor-help">
              {agents.length}
            </span>
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

function toCsv(rows) {
  const header = [
    'id', 'name', 'origin', 'vendor', 'side_effect', 'risk', 'status', 'version',
    'owner', 'team', 'calls_7d', 'error_rate_7d', 'p50_ms',
    'findings_block', 'findings_approval', 'findings_warn',
    'calling_agents',
  ];
  const body = rows.map(r => [
    r.id, r.name, r.origin, r.vendor || '', r.sideEffect, r.risk, r.status, r.version,
    r.owner || '', r.team || '',
    r.usage7d?.calls || 0, r.usage7d?.errorRate || 0, r.usage7d?.p50LatencyMs || 0,
    r.findings7d?.block || 0, r.findings7d?.approval || 0, r.findings7d?.warn || 0,
    (r.usage7d?.callingAgents || []).join('|'),
  ]);
  return [header, ...body].map(line => line.map(v => {
    const s = String(v ?? '');
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
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

export default function ToolsPage() {
  const router = useRouter();
  const { list: tools, hydrated } = useTools();

  const [globalFilter, setGlobalFilter] = useState('');
  const [originSel, setOriginSel]           = useState(new Set());
  const [sideEffectSel, setSideEffectSel]   = useState(new Set());
  const [riskSel, setRiskSel]               = useState(new Set());
  const [statusSel, setStatusSel]           = useState(new Set());
  const [vendorSel, setVendorSel]           = useState(new Set());

  const filtered = useMemo(() => tools.filter(t => {
    if (originSel.size     > 0 && !originSel.has(t.origin))           return false;
    if (sideEffectSel.size > 0 && !sideEffectSel.has(t.sideEffect))   return false;
    if (riskSel.size       > 0 && !riskSel.has(t.risk))               return false;
    if (statusSel.size     > 0 && !statusSel.has(t.status))           return false;
    if (vendorSel.size     > 0 && !(t.vendor && vendorSel.has(t.vendor))) return false;
    return true;
  }), [tools, originSel, sideEffectSel, riskSel, statusSel, vendorSel]);

  const stats = useMemo(() => {
    const totalCalls    = filtered.reduce((s, t) => s + (t.usage7d?.calls || 0), 0);
    const totalFindings = filtered.reduce((s, t) => s + ((t.findings7d?.block || 0) + (t.findings7d?.approval || 0) + (t.findings7d?.warn || 0)), 0);
    const highRisk      = filtered.filter(t => t.risk === 'high').length;
    return { totalCalls, totalFindings, highRisk };
  }, [filtered]);

  const columns = useMemo(() => [
    {
      accessorKey: 'name',
      header: 'Tool',
      cell: ({ row }) => {
        const t = row.original;
        return (
          <div className="flex items-start gap-3 min-w-0">
            <div className="h-8 w-8 rounded-md bg-muted/40 flex items-center justify-center shrink-0">
              <Wrench className="h-4 w-4 text-muted-foreground" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-[13px] font-medium text-foreground truncate">{t.name}</span>
                <OriginPill origin={t.origin} />
                {t.deprecation && (
                  <span className="inline-flex items-center px-1.5 py-0.5 rounded border border-accent/40 bg-accent/10 text-accent text-[10px] font-medium">
                    deprecated
                  </span>
                )}
              </div>
              <div className="mt-0.5 text-[11.5px] text-muted-foreground truncate">
                <span className="font-mono">{t.id}</span>
                {t.version && <span> · v{t.version}</span>}
              </div>
              <p className="mt-1 text-[11.5px] text-muted-foreground/95 leading-relaxed line-clamp-1 max-w-160">
                {t.description}
              </p>
            </div>
          </div>
        );
      },
      sortingFn: (a, b) => a.original.name.localeCompare(b.original.name),
    },
    {
      accessorKey: 'sideEffect',
      header: 'Side effect',
      cell: ({ row }) => <SideEffectPill id={row.original.sideEffect} />,
      enableGlobalFilter: false,
    },
    {
      accessorKey: 'risk',
      header: 'Risk',
      cell: ({ row }) => <RiskPill risk={row.original.risk} />,
      sortingFn: (a, b) => RISKS.findIndex(r => r.id === a.original.risk) - RISKS.findIndex(r => r.id === b.original.risk),
      enableGlobalFilter: false,
    },
    {
      accessorKey: 'status',
      header: 'Status',
      cell: ({ row }) => <StatusPill status={row.original.status} />,
      enableGlobalFilter: false,
    },
    {
      id: 'usedBy',
      accessorFn: (t) => (t.usage7d?.callingAgents || []).length,
      header: 'Used by',
      cell: ({ row }) => <CallingAgentsCell agents={row.original.usage7d?.callingAgents} />,
      meta: { align: 'right' },
      enableGlobalFilter: false,
    },
    {
      id: 'calls7d',
      accessorFn: (t) => t.usage7d?.calls || 0,
      header: 'Calls · 7d',
      cell: ({ row }) => (
        <span className="font-mono tabular-nums text-foreground text-[12px]">
          {(row.original.usage7d?.calls || 0).toLocaleString()}
        </span>
      ),
      meta: { align: 'right' },
      enableGlobalFilter: false,
    },
    {
      id: 'errorRate',
      accessorFn: (t) => t.usage7d?.errorRate || 0,
      header: 'Error rate',
      cell: ({ row }) => <ErrorRateCell rate={row.original.usage7d?.errorRate || 0} />,
      meta: { align: 'right' },
      enableGlobalFilter: false,
    },
    {
      id: 'findings',
      accessorFn: (t) => (t.findings7d?.block || 0) + (t.findings7d?.approval || 0) + (t.findings7d?.warn || 0),
      header: 'Findings · 7d',
      cell: ({ row }) => <FindingsCell row={row} />,
      meta: { align: 'right' },
      enableGlobalFilter: false,
    },
    {
      id: 'p50',
      accessorFn: (t) => t.usage7d?.p50LatencyMs || 0,
      header: 'p50',
      cell: ({ row }) => {
        const v = row.original.usage7d?.p50LatencyMs || 0;
        return <span className="font-mono tabular-nums text-muted-foreground text-[12px]">{v ? `${v} ms` : '—'}</span>;
      },
      meta: { align: 'right' },
      enableGlobalFilter: false,
    },
  ], []);

  const originOptions     = ORIGINS.map(o => ({ value: o.id, label: o.label }));
  const sideEffectOptions = SIDE_EFFECTS.map(s => ({ value: s.id, label: s.label, color: SIDE_EFFECT_TONE[s.id]?.color }));
  const riskOptions       = RISKS.map(r => ({ value: r.id, label: r.label, color: RISK_TONE[r.id]?.color }));
  const statusOptions     = STATUSES.map(s => ({ value: s.id, label: s.label, color: STATUS_TONE[s.id]?.color }));
  const vendorOptions     = useMemo(
    () => distinct(tools, 'vendor').map(v => ({ value: v, label: v })),
    [tools],
  );

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-10 py-7">
      {/* Title row */}
      <div className="flex items-end justify-between mb-5 flex-wrap gap-3">
        <div>
          <h2 className="text-[18px] font-semibold text-foreground">Tools</h2>
          <p className="mt-1 text-[13px] text-muted-foreground max-w-160 leading-relaxed">
            Every capability your agents can call — built-in primitives, first-party integrations, MCP-exposed actions, and custom webhooks. Each tool carries a risk class, side-effect declaration, and a policy attachment surface that wires into GRC.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => downloadCsv('tools.csv', toCsv(filtered))}>
            <Download className="h-3.5 w-3.5" /> Export
          </Button>
          <Button size="sm" onClick={() => router.push('/app/tools/new')}>
            <Plus className="h-3.5 w-3.5" /> New tool
          </Button>
        </div>
      </div>

      {/* Triage strip */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-5">
        <Stat label="Tools"        value={filtered.length} sub={`of ${tools.length}`} />
        <Stat label="High risk"    value={stats.highRisk}      tone={stats.highRisk > 0 ? 'warn' : 'ok'} />
        <Stat label="Calls · 7d"   value={stats.totalCalls.toLocaleString()} />
        <Stat label="Findings · 7d" value={stats.totalFindings} tone={stats.totalFindings === 0 ? 'ok' : stats.totalFindings > 50 ? 'bad' : 'warn'} />
      </div>

      <DataTable
        columns={columns}
        data={hydrated ? filtered : []}
        globalFilter={globalFilter}
        onGlobalFilterChange={setGlobalFilter}
        onRowClick={(r) => router.push(`/app/tools/${encodeURIComponent(r.id)}`)}
        emptyMessage={hydrated ? 'No tools match the current filters.' : 'Loading…'}
        pageSize={25}
        minWidth="min-w-[1180px]"
        initialSorting={[{ id: 'calls7d', desc: true }]}
        toolbar={
          <div className="relative w-full max-w-xs">
            <Search className="h-3.5 w-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={globalFilter}
              onChange={(e) => setGlobalFilter(e.target.value)}
              placeholder="Search tools…"
              className="pl-8 h-8 text-[12.5px]"
            />
          </div>
        }
        filters={
          <FacetFilterBar
            filters={[
              { title: 'Origin',      options: originOptions,     selected: originSel,     onChange: setOriginSel     },
              { title: 'Side effect', options: sideEffectOptions, selected: sideEffectSel, onChange: setSideEffectSel },
              { title: 'Risk',        options: riskOptions,       selected: riskSel,       onChange: setRiskSel       },
              { title: 'Status',      options: statusOptions,     selected: statusSel,     onChange: setStatusSel     },
              ...(vendorOptions.length > 0
                ? [{ title: 'Vendor', options: vendorOptions, selected: vendorSel, onChange: setVendorSel }]
                : []),
            ]}
            onClearAll={() => {
              setOriginSel(new Set());
              setSideEffectSel(new Set());
              setRiskSel(new Set());
              setStatusSel(new Set());
              setVendorSel(new Set());
            }}
          />
        }
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
