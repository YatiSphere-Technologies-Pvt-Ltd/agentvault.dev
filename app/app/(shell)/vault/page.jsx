'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useMemo, useState } from 'react';
import {
  Search, Plus, Download, KeyRound, Server, RefreshCw,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from '@/components/ui/tooltip';
import { DataTable } from '@/components/tables/DataTable';
import { FacetFilterBar } from '@/components/tables/FacetFilter';
import {
  BACKEND_KINDS, SECRET_TYPES, REFERENCE_STATUSES,
  backendKindById, backendTone, statusColor, secretTypeLabel,
} from './_backendCatalog';
import { useVault, isExpiringSoon } from './_vaultStore';

function StatusPill({ status }) {
  const meta = REFERENCE_STATUSES.find(s => s.id === status) || REFERENCE_STATUSES[0];
  const color = statusColor(status);
  return (
    <span
      className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md border text-[11px] font-medium whitespace-nowrap"
      style={{ borderColor: color + '55', color, background: color + '12' }}
    >
      <span className="h-1.5 w-1.5 rounded-full" style={{ background: color }} />
      {meta.label}
    </span>
  );
}

function BackendPill({ backend }) {
  if (!backend) {
    return <span className="text-[12px] text-destructive">unresolved</span>;
  }
  const kind = backendKindById(backend.kind);
  const color = backendTone(backend.kind);
  return (
    <span
      className="inline-flex items-center gap-1.5 px-1.5 py-0.5 rounded border text-[11px] font-medium whitespace-nowrap"
      style={{ borderColor: color + '55', color, background: color + '12' }}
    >
      <span className="h-1.5 w-1.5 rounded-full" style={{ background: color }} />
      {kind.label.split(' (')[0]}
    </span>
  );
}

function fmtDate(iso) {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString();
}

function fmtAgo(iso) {
  if (!iso) return '—';
  const ms = Date.now() - new Date(iso).getTime();
  const days = Math.floor(ms / 86400000);
  if (days < 0) return `in ${Math.abs(days)}d`;
  if (days === 0) return 'today';
  if (days < 30) return `${days}d ago`;
  const months = Math.floor(days / 30);
  return `${months}mo ago`;
}

function fmtUntil(iso) {
  if (!iso) return '—';
  const ms = new Date(iso).getTime() - Date.now();
  if (ms < 0) return 'overdue';
  const days = Math.floor(ms / 86400000);
  if (days === 0) return 'today';
  if (days < 30) return `in ${days}d`;
  const months = Math.floor(days / 30);
  return `in ${months}mo`;
}

function toCsv(rows, backendsById) {
  const header = ['path', 'type', 'backend', 'backend_path', 'status', 'version', 'last_rotated', 'next_rotation', 'used_by_count'];
  const body = rows.map(r => [
    r.path, r.type,
    backendsById.get(r.backendId)?.name || r.backendId,
    r.backendPath || '',
    r.status, r.version,
    r.rotation?.lastRotatedAt || '',
    r.rotation?.nextRotationAt || '',
    (r.usedBy || []).length,
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

export default function VaultListPage() {
  const router = useRouter();
  const { backends, refs, hydrated, rotateReference } = useVault();
  const backendsById = useMemo(() => new Map(backends.map(b => [b.id, b])), [backends]);

  const [globalFilter, setGlobalFilter] = useState('');
  const [backendSel, setBackendSel] = useState(new Set());
  const [typeSel,    setTypeSel]    = useState(new Set());
  const [statusSel,  setStatusSel]  = useState(new Set());

  const filtered = useMemo(() => refs.filter(r => {
    if (backendSel.size > 0 && !backendSel.has(r.backendId)) return false;
    if (typeSel.size    > 0 && !typeSel.has(r.type))         return false;
    if (statusSel.size  > 0 && !statusSel.has(r.status))     return false;
    return true;
  }), [refs, backendSel, typeSel, statusSel]);

  const stats = useMemo(() => ({
    total:   filtered.length,
    expiring: filtered.filter(r => r.status === 'expiring' || isExpiringSoon(r)).length,
    expired:  filtered.filter(r => r.status === 'expired').length,
    autoRotate: filtered.filter(r => r.rotation?.autoRotate).length,
  }), [filtered]);

  const columns = useMemo(() => [
    {
      accessorKey: 'path',
      header: 'Reference',
      cell: ({ row }) => {
        const r = row.original;
        return (
          <div className="flex items-start gap-3 min-w-0">
            <div className="h-8 w-8 rounded-md bg-muted/40 flex items-center justify-center shrink-0">
              <KeyRound className="h-3.5 w-3.5 text-muted-foreground" />
            </div>
            <div className="min-w-0">
              <div className="text-[13px] font-mono text-foreground truncate">{r.path}</div>
              {r.description && (
                <div className="mt-0.5 text-[11.5px] text-muted-foreground truncate max-w-180">{r.description}</div>
              )}
              <div className="mt-1 text-[10.5px] font-mono text-muted-foreground truncate">
                {r.backendPath ? `→ ${r.backendPath}` : '—'}
              </div>
            </div>
          </div>
        );
      },
      sortingFn: (a, b) => a.original.path.localeCompare(b.original.path),
    },
    {
      accessorKey: 'type',
      header: 'Type',
      cell: ({ row }) => (
        <span className="inline-flex items-center px-1.5 py-0.5 rounded border border-border bg-muted/40 text-[10.5px] font-medium">
          {secretTypeLabel(row.original.type)}
        </span>
      ),
      enableGlobalFilter: false,
    },
    {
      accessorKey: 'backendId',
      header: 'Backend',
      cell: ({ row }) => <BackendPill backend={backendsById.get(row.original.backendId)} />,
      enableGlobalFilter: false,
    },
    {
      accessorKey: 'status',
      header: 'Status',
      cell: ({ row }) => <StatusPill status={row.original.status} />,
      enableGlobalFilter: false,
    },
    {
      accessorKey: 'version',
      header: 'Ver.',
      cell: ({ row }) => <span className="font-mono tabular-nums text-foreground text-[12px]">v{row.original.version || 1}</span>,
      meta: { align: 'right' },
      enableGlobalFilter: false,
    },
    {
      id: 'lastRotated',
      accessorFn: (r) => r.rotation?.lastRotatedAt ? new Date(r.rotation.lastRotatedAt).getTime() : 0,
      header: 'Last rotated',
      cell: ({ row }) => <span className="text-[12px] text-muted-foreground tabular-nums">{fmtAgo(row.original.rotation?.lastRotatedAt)}</span>,
      meta: { align: 'right' },
      enableGlobalFilter: false,
    },
    {
      id: 'nextRotation',
      accessorFn: (r) => r.rotation?.nextRotationAt ? new Date(r.rotation.nextRotationAt).getTime() : Infinity,
      header: 'Next rotation',
      cell: ({ row }) => {
        const r = row.original;
        const at = r.rotation?.nextRotationAt;
        if (!at) return <span className="text-[12px] text-muted-foreground">—</span>;
        const ms = new Date(at).getTime() - Date.now();
        const tone = ms < 0 ? 'text-destructive' : ms < 7 * 86400000 ? 'text-accent' : 'text-foreground';
        return (
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger render={<span className={`text-[12px] tabular-nums ${tone} cursor-help`}>{fmtUntil(at)}</span>} />
              <TooltipContent>
                <div className="text-[11.5px] font-mono">{fmtDate(at)}</div>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        );
      },
      meta: { align: 'right' },
      enableGlobalFilter: false,
    },
    {
      id: 'usedBy',
      accessorFn: (r) => (r.usedBy || []).length,
      header: 'Used by',
      cell: ({ row }) => {
        const refs = row.original.usedBy || [];
        if (refs.length === 0) return <span className="text-[12px] text-muted-foreground">—</span>;
        return (
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger render={<span className="font-mono tabular-nums text-foreground text-[12px] cursor-help">{refs.length}</span>} />
              <TooltipContent>
                <div className="text-[11.5px] space-y-0.5">
                  {refs.map((u, i) => <div key={i}>{u.label}</div>)}
                </div>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        );
      },
      meta: { align: 'right' },
      enableGlobalFilter: false,
    },
    {
      id: 'rotate',
      header: '',
      cell: ({ row }) => (
        <Button
          size="sm" variant="outline" className="h-7 text-[11.5px]"
          onClick={(e) => { e.stopPropagation(); rotateReference(row.original.id); }}
        >
          <RefreshCw className="h-3 w-3" /> Rotate
        </Button>
      ),
      meta: { align: 'right' },
      enableSorting: false,
      enableHiding: false,
    },
  ], [backendsById, rotateReference]);

  const backendOptions = backends.map(b => ({
    value: b.id,
    label: b.name,
    color: backendTone(b.kind),
  }));
  const typeOptions = SECRET_TYPES.map(t => ({ value: t.id, label: t.label }));
  const statusOptions = REFERENCE_STATUSES.map(s => ({ value: s.id, label: s.label, color: statusColor(s.id) }));

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-10 py-7">
      {/* Title row */}
      <div className="flex items-end justify-between mb-5 flex-wrap gap-3">
        <div>
          <h2 className="text-[18px] font-semibold text-foreground">Vault</h2>
          <p className="mt-1 text-[13px] text-muted-foreground max-w-160 leading-relaxed">
            Every <code className="px-1 py-0.5 rounded bg-muted text-foreground font-mono text-[11.5px]">vault://</code> reference your agents and tools resolve. Secrets live in your connected backends — Azure Key Vault, AWS Secrets Manager, GCP Secret Manager, HashiCorp Vault, or the AgentVault built-in vault. Sort by next-rotation to triage.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" render={<Link href="/app/vault/backends"><Server className="h-3.5 w-3.5" /> Backends · {backends.length}</Link>} />
          <Button variant="outline" size="sm" onClick={() => downloadCsv('vault-references.csv', toCsv(filtered, backendsById))}>
            <Download className="h-3.5 w-3.5" /> Export
          </Button>
          <Button size="sm" render={<Link href="/app/vault/new"><Plus className="h-3.5 w-3.5" /> New reference</Link>} />
        </div>
      </div>

      {/* Triage strip */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-5">
        <Stat label="References"      value={stats.total}      sub={`of ${refs.length}`} />
        <Stat label="Expiring · 7d"   value={stats.expiring}   tone={stats.expiring > 0 ? 'warn' : 'ok'} />
        <Stat label="Expired"         value={stats.expired}    tone={stats.expired > 0 ? 'bad' : 'ok'} />
        <Stat label="Auto-rotating"   value={stats.autoRotate} sub={`${refs.length - stats.autoRotate} manual`} />
      </div>

      <DataTable
        columns={columns}
        data={hydrated ? filtered : []}
        globalFilter={globalFilter}
        onGlobalFilterChange={setGlobalFilter}
        onRowClick={(r) => router.push(`/app/vault/${r.id}`)}
        emptyMessage={hydrated ? 'No references match the current filters.' : 'Loading…'}
        pageSize={25}
        minWidth="min-w-[1180px]"
        initialSorting={[{ id: 'nextRotation', desc: false }]}
        toolbar={
          <div className="relative w-full max-w-xs">
            <Search className="h-3.5 w-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={globalFilter}
              onChange={(e) => setGlobalFilter(e.target.value)}
              placeholder="Search references…"
              className="pl-8 h-8 text-[12.5px] font-mono"
            />
          </div>
        }
        filters={
          <FacetFilterBar
            filters={[
              { title: 'Backend', options: backendOptions, selected: backendSel, onChange: setBackendSel },
              { title: 'Type',    options: typeOptions,    selected: typeSel,    onChange: setTypeSel },
              { title: 'Status',  options: statusOptions,  selected: statusSel,  onChange: setStatusSel },
            ]}
            onClearAll={() => {
              setBackendSel(new Set());
              setTypeSel(new Set());
              setStatusSel(new Set());
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
