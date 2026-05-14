'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Search, Target as TargetIcon, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { DataTable } from '@/components/tables/DataTable';
import { FacetFilterBar } from '@/components/tables/FacetFilter';
import { Chip } from '../../govern/_shared';
import { RedTeamHeader, PostureBadge, fmtAgo } from '../_shared';
import { useTargets, useRuns, postureForTarget } from '../_store';
import { adapterById } from '../_targetCatalog';

const TYPE_OPTIONS = [
  { value: 'agent',      label: 'Agent' },
  { value: 'chat',       label: 'Chat API' },
  { value: 'gateway',    label: 'Gateway' },
  { value: 'rag',        label: 'RAG' },
  { value: 'mcp',        label: 'MCP' },
  { value: 'multimodal', label: 'Multimodal' },
  { value: 'browser',    label: 'Browser' },
];

const ENV_OPTIONS = [
  { value: 'production', label: 'Production' },
  { value: 'staging',    label: 'Staging' },
  { value: 'sandbox',    label: 'Sandbox' },
];

/* Lifecycle status — keys and accent colors used for the status pill +
   facet filter. Mirrors STATUS_OPTIONS in _TargetForm.jsx. */
const STATUS_OPTIONS = [
  { value: 'draft',    label: 'Draft',    color: 'var(--muted-foreground)' },
  { value: 'active',   label: 'Active',   color: 'var(--brand-teal)' },
  { value: 'paused',   label: 'Paused',   color: '#F59E0B' },
  { value: 'archived', label: 'Archived', color: 'var(--muted-foreground)' },
];

/* Seeded targets predate the `status` field; treat anything missing as
   `active` so the existing demo stays "active" by default. */
function statusOf(t) { return t.status || 'active'; }

const ENV_TONE = {
  production: '#E11D48',         // red — testing prod IS the riskiest, and rare
  staging:    '#F59E0B',         // amber
  sandbox:    'var(--muted-foreground)',
};

export default function TargetsPage() {
  const router = useRouter();
  const targets = useTargets();
  const runs = useRuns();
  const [globalFilter, setGlobalFilter] = useState('');
  const [typeSel,   setTypeSel]   = useState(new Set());
  const [envSel,    setEnvSel]    = useState(new Set());
  const [statusSel, setStatusSel] = useState(new Set());

  // Archived targets are hidden unless the user explicitly filters for
  // them. Matches the "soft-delete" semantic from the lifecycle model.
  const data = useMemo(() => targets.filter(t => {
    const s = statusOf(t);
    if (statusSel.size === 0 && s === 'archived') return false;
    if (statusSel.size > 0 && !statusSel.has(s)) return false;
    if (typeSel.size   > 0 && !typeSel.has(t.type)) return false;
    if (envSel.size    > 0 && !envSel.has(t.scope?.environment)) return false;
    return true;
  }), [targets, typeSel, envSel, statusSel]);

  const columns = useMemo(() => ([
    {
      id: 'sno', header: '#',
      cell: ({ row, table }) => {
        const ps = table.getState().pagination;
        const idx = ps ? ps.pageIndex * ps.pageSize + row.index + 1 : row.index + 1;
        return <span className="font-mono tabular-nums text-muted-foreground text-[11.5px]">{idx}</span>;
      },
      enableSorting: false, enableGlobalFilter: false, enableHiding: false, size: 44,
    },
    {
      id: 'name', accessorFn: (t) => t.name, header: 'Target',
      cell: ({ row }) => (
        <div className="min-w-0">
          <div className="text-[12.5px] font-medium text-foreground truncate">{row.original.name}</div>
          <div className="text-[10.5px] font-mono text-muted-foreground truncate">{row.original.id}</div>
        </div>
      ),
      filterFn: (row, _id, q) => {
        if (!q) return true;
        const s = String(q).toLowerCase();
        return row.original.name.toLowerCase().includes(s) || row.original.id.toLowerCase().includes(s);
      },
    },
    {
      id: 'type', accessorFn: (t) => t.type, header: 'Type',
      cell: ({ getValue }) => (
        <span className="text-[11px] font-mono px-1.5 py-0.5 rounded border border-border bg-muted/40 text-foreground">{getValue()}</span>
      ),
      enableGlobalFilter: false,
    },
    {
      id: 'adapter', accessorFn: (t) => t.adapter, header: 'Adapter',
      cell: ({ row }) => {
        const a = adapterById(row.original.adapter);
        return <span className="text-[11.5px] font-mono text-foreground/85">{a?.label || row.original.adapter}</span>;
      },
      enableGlobalFilter: false,
    },
    {
      id: 'env', accessorFn: (t) => t.scope?.environment || '—', header: 'Env',
      cell: ({ getValue }) => {
        const env = getValue();
        return <Chip accent={ENV_TONE[env]} label={env} />;
      },
      enableGlobalFilter: false,
    },
    {
      id: 'status', accessorFn: (t) => statusOf(t), header: 'Status',
      cell: ({ getValue }) => {
        const s = getValue();
        const meta = STATUS_OPTIONS.find(o => o.value === s);
        return <Chip variant="mono" accent={meta?.color} label={meta?.label || s} />;
      },
      enableGlobalFilter: false,
    },
    {
      id: 'posture', header: 'Posture', accessorFn: (t) => postureForTarget(t.id) ?? -1,
      cell: ({ row }) => <PostureBadge score={postureForTarget(row.original.id)} />,
      enableGlobalFilter: false,
    },
    {
      id: 'lastTested', accessorFn: (t) => t.last_tested_at ?? 0, header: 'Last tested',
      meta: { align: 'right' },
      cell: ({ row }) => (
        <span className="font-mono tabular-nums text-[11.5px] text-muted-foreground">{fmtAgo(row.original.last_tested_at)}</span>
      ),
      enableGlobalFilter: false,
    },
    {
      id: 'tags', header: 'Tags',
      accessorFn: (t) => (t.tags || []).join(','),
      cell: ({ row }) => (
        <div className="flex flex-wrap gap-1">
          {(row.original.tags || []).slice(0, 3).map(tg => (
            <span key={tg} className="text-[9.5px] font-mono px-1.5 py-0.5 rounded border border-border bg-muted/40 text-foreground/80">{tg}</span>
          ))}
        </div>
      ),
      enableGlobalFilter: false,
    },
  ]), []);

  return (
    <>
      <RedTeamHeader
        title="Targets"
        subtitle="Every system you want to probe — agents, chat endpoints, retrieval pipelines, tool-using copilots. Register a target before binding a suite of attacks to it."
      />
      <div className="max-w-[1680px] mx-auto px-4 sm:px-6 lg:px-8 py-7 space-y-5">
        <div className="flex items-end justify-between gap-3 flex-wrap">
          <div>
            <div className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground font-mono">Catalog</div>
            <h2 className="text-[16px] font-semibold text-foreground mt-0.5 inline-flex items-center gap-2">
              <TargetIcon className="h-4 w-4 text-primary" /> Targets
            </h2>
            <p className="text-[12.5px] text-muted-foreground mt-0.5 max-w-[80ch]">
              Registered AI surfaces the runner exercises. Each carries a signed consent record and a scoped
              environment so red-team probes never leave the test boundary.
            </p>
          </div>
          <Button
            size="sm"
            render={
              <Link href="/app/redteam/targets/new">
                <Plus className="h-3.5 w-3.5" /> Add target
              </Link>
            }
          />
        </div>

        <DataTable
          columns={columns}
          data={data}
          globalFilter={globalFilter}
          onGlobalFilterChange={setGlobalFilter}
          onRowClick={(t) => router.push(`/app/redteam/targets/${t.id}`)}
          minWidth="min-w-[1120px]"
          emptyMessage="No targets match these filters."
          initialSorting={[{ id: 'posture', desc: false }]}
          pageSize={25}
          toolbar={
            <div className="relative w-full max-w-xs">
              <Search className="h-3.5 w-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={globalFilter}
                onChange={(e) => setGlobalFilter(e.target.value)}
                placeholder="Search targets…"
                className="pl-8 h-8 text-[12.5px]"
              />
            </div>
          }
          filters={
            <FacetFilterBar
              filters={[
                { title: 'Status', options: STATUS_OPTIONS.map(o => ({ value: o.value, label: o.label, color: o.color })), selected: statusSel, onChange: setStatusSel },
                { title: 'Type',   options: TYPE_OPTIONS, selected: typeSel, onChange: setTypeSel },
                { title: 'Env',    options: ENV_OPTIONS,  selected: envSel,  onChange: setEnvSel },
              ]}
              onClearAll={() => { setTypeSel(new Set()); setEnvSel(new Set()); setStatusSel(new Set()); }}
            />
          }
        />
      </div>
    </>
  );
}
