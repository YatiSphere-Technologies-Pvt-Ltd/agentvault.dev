'use client';

import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Plus, Search, RefreshCw, Database } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { DataTable } from '@/components/tables/DataTable';
import { FacetFilterBar } from '@/components/tables/FacetFilter';
import { ContextHeader, FamilyPill, HealthPill, SourceIcon, fmtAgo, fmtNum, fmtMins } from '../_shared';
import { useSources, simulateSync } from '../_store';
import { SOURCE_CATALOG, SOURCE_FAMILIES, sourceById } from '../_sourceCatalog';
import AddSourceSheet from './AddSourceSheet';

const ACL_OPTIONS = [
  { value: 'row',    label: 'Row-level' },
  { value: 'column', label: 'Column-level' },
  { value: 'tag',    label: 'Tag-based' },
  { value: 'static', label: 'Static list' },
];

const HEALTH_OPTIONS = [
  { value: 'green',  label: 'Healthy', color: 'var(--brand-teal)' },
  { value: 'yellow', label: 'Warning', color: 'var(--primary)' },
  { value: 'red',    label: 'Failing', color: 'var(--destructive)' },
];

const KIND_OPTIONS = SOURCE_CATALOG.map(s => ({ value: s.id, label: s.label }));

const FAMILY_OPTIONS = Object.entries(SOURCE_FAMILIES)
  .map(([id, meta]) => ({ value: id, label: meta.label, color: meta.accent }));

export default function SourcesPage() {
  const router = useRouter();
  const sources = useSources();
  const [globalFilter, setGlobalFilter] = useState('');
  const [familySel, setFamilySel] = useState(new Set());
  const [healthSel, setHealthSel] = useState(new Set());
  const [aclSel, setAclSel] = useState(new Set());
  const [kindSel, setKindSel] = useState(new Set());
  const [sheetOpen, setSheetOpen] = useState(false);

  const data = useMemo(() => sources.filter(s => {
    const family = sourceById(s.kind)?.family;
    if (familySel.size > 0 && !familySel.has(family)) return false;
    if (healthSel.size > 0 && !healthSel.has(s.health)) return false;
    if (aclSel.size    > 0 && !aclSel.has(s.acl_strategy)) return false;
    if (kindSel.size   > 0 && !kindSel.has(s.kind))     return false;
    return true;
  }), [sources, familySel, healthSel, aclSel, kindSel]);

  const stats = useMemo(() => {
    const inSla = data.filter(s => (s.freshness_lag_min ?? 0) <= (s.freshness_target_min ?? Infinity)).length;
    const breaching = data.length - inSla;
    const totalRows = data.reduce((sum, s) => sum + (s.row_count || 0), 0);
    return { inSla, breaching, totalRows };
  }, [data]);

  const columns = useMemo(() => ([
    {
      id: 'sno',
      header: '#',
      cell: ({ row, table }) => {
        const ps = table.getState().pagination;
        const idx = ps ? ps.pageIndex * ps.pageSize + row.index + 1 : row.index + 1;
        return <span className="font-mono tabular-nums text-muted-foreground text-[11.5px]">{idx}</span>;
      },
      enableSorting: false,
      enableGlobalFilter: false,
      enableHiding: false,
      size: 44,
    },
    {
      id: 'name',
      accessorFn: (s) => s.name,
      header: 'Source',
      cell: ({ row }) => {
        const s = row.original;
        return (
          <div className="flex items-center gap-2.5 min-w-0">
            <SourceIcon kind={s.kind} size={28} />
            <div className="min-w-0">
              <div className="text-[12.5px] font-medium text-foreground truncate">{s.name}</div>
              <div className="text-[10.5px] font-mono text-muted-foreground truncate">{s.id}</div>
            </div>
          </div>
        );
      },
      filterFn: (row, _id, q) => {
        if (!q) return true;
        const t = String(q).toLowerCase();
        return row.original.name.toLowerCase().includes(t) || row.original.id.toLowerCase().includes(t);
      },
    },
    {
      id: 'family',
      accessorFn: (s) => sourceById(s.kind)?.family || '—',
      header: 'Family',
      cell: ({ row }) => {
        const fam = sourceById(row.original.kind)?.family;
        return fam ? <FamilyPill family={fam} /> : <span className="text-muted-foreground">—</span>;
      },
      enableGlobalFilter: false,
    },
    {
      id: 'health',
      accessorFn: (s) => s.health,
      header: 'Health',
      cell: ({ getValue }) => <HealthPill health={getValue()} />,
      enableGlobalFilter: false,
    },
    {
      id: 'acl',
      accessorFn: (s) => s.acl_strategy,
      header: 'ACL',
      cell: ({ row }) => (
        <div className="text-[11.5px]">
          <div className="font-mono text-foreground capitalize">{row.original.acl_strategy}</div>
          <div className="text-[10px] text-muted-foreground truncate max-w-56">{row.original.acl_detail}</div>
        </div>
      ),
      enableGlobalFilter: false,
    },
    {
      id: 'freshness',
      accessorFn: (s) => (s.freshness_target_min ?? 0) - (s.freshness_lag_min ?? 0),
      header: 'Freshness',
      cell: ({ row }) => {
        const s = row.original;
        const breach = (s.freshness_lag_min ?? 0) > (s.freshness_target_min ?? Infinity);
        return (
          <div className="text-[11.5px] font-mono">
            <span className={breach ? 'text-destructive' : 'text-foreground'}>{fmtMins(s.freshness_lag_min)}</span>
            <span className="text-muted-foreground"> / {fmtMins(s.freshness_target_min)}</span>
          </div>
        );
      },
      enableGlobalFilter: false,
    },
    {
      id: 'rows',
      accessorFn: (s) => s.row_count ?? 0,
      header: 'Rows',
      meta: { align: 'right' },
      cell: ({ row }) => (
        <span className="font-mono tabular-nums text-[12px] text-foreground">{fmtNum(row.original.row_count)}</span>
      ),
      enableGlobalFilter: false,
    },
    {
      id: 'sync',
      accessorFn: (s) => s.last_sync_at ?? 0,
      header: 'Last sync',
      meta: { align: 'right' },
      cell: ({ row }) => (
        <span className="font-mono tabular-nums text-[11.5px] text-muted-foreground">{fmtAgo(row.original.last_sync_at)}</span>
      ),
      enableGlobalFilter: false,
    },
    {
      id: 'actions',
      header: '',
      cell: ({ row }) => (
        <button
          type="button"
          onClick={(e) => { e.stopPropagation(); simulateSync(row.original.id); }}
          className="h-7 w-7 rounded text-muted-foreground hover:text-foreground hover:bg-muted flex items-center justify-center"
          title="Simulate sync now"
        >
          <RefreshCw className="h-3.5 w-3.5" />
        </button>
      ),
      enableSorting: false,
      enableGlobalFilter: false,
      enableHiding: false,
      size: 44,
    },
  ]), []);

  const clearAll = () => {
    setFamilySel(new Set());
    setHealthSel(new Set());
    setAclSel(new Set());
    setKindSel(new Set());
  };

  return (
    <>
      <ContextHeader />
      <div className="max-w-[1680px] mx-auto px-4 sm:px-6 lg:px-8 py-7 space-y-5">
        <div className="flex items-end justify-between gap-3 flex-wrap">
          <div>
            <div className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground font-mono">Catalog</div>
            <h2 className="text-[16px] font-semibold text-foreground mt-0.5">Sources</h2>
            <p className="text-[12.5px] text-muted-foreground mt-0.5 max-w-[60ch]">
              Each source is a connected enterprise data system. Credentials are vault-backed,
              ACLs flow through, and freshness is tracked against a named SLA.
            </p>
          </div>
          <Button onClick={() => setSheetOpen(true)} size="sm">
            <Plus className="h-3.5 w-3.5" /> Connect a source
          </Button>
        </div>

        {/* Triage strip */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          <Stat label="Total"          value={String(sources.length)} icon={<Database className="h-3.5 w-3.5" />} />
          <Stat label="Within SLA"     value={String(stats.inSla)}     tone="ok" />
          <Stat label="Breaching SLA"  value={String(stats.breaching)} tone={stats.breaching === 0 ? 'default' : 'bad'} />
          <Stat label="Rows indexed"   value={fmtNum(stats.totalRows)} />
        </div>

        <DataTable
          columns={columns}
          data={data}
          globalFilter={globalFilter}
          onGlobalFilterChange={setGlobalFilter}
          onRowClick={(s) => router.push(`/app/context/sources/${s.id}`)}
          minWidth="min-w-[1180px]"
          emptyMessage="No sources match these filters."
          initialSorting={[{ id: 'health', desc: false }]}
          pageSize={25}
          toolbar={
            <div className="relative w-full max-w-xs">
              <Search className="h-3.5 w-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={globalFilter}
                onChange={(e) => setGlobalFilter(e.target.value)}
                placeholder="Search sources by name or id…"
                className="pl-8 h-8 text-[12.5px]"
              />
            </div>
          }
          filters={
            <FacetFilterBar
              filters={[
                { title: 'Family',  options: FAMILY_OPTIONS,  selected: familySel,  onChange: setFamilySel },
                { title: 'Health',  options: HEALTH_OPTIONS,  selected: healthSel,  onChange: setHealthSel },
                { title: 'ACL',     options: ACL_OPTIONS,     selected: aclSel,     onChange: setAclSel },
                { title: 'Kind',    options: KIND_OPTIONS,    selected: kindSel,    onChange: setKindSel },
              ]}
              onClearAll={clearAll}
            />
          }
        />
      </div>

      <AddSourceSheet open={sheetOpen} onClose={() => setSheetOpen(false)} />
    </>
  );
}

function Stat({ label, value, sub, tone = 'default', icon }) {
  const color = tone === 'bad'  ? 'text-destructive'
              : tone === 'warn' ? 'text-primary'
              : tone === 'ok'   ? 'text-brand-teal'
              :                   'text-foreground';
  return (
    <div className="rounded-lg border border-border bg-card px-3 py-2">
      <div className="text-[10.5px] font-medium uppercase tracking-[0.1em] text-muted-foreground inline-flex items-center gap-1.5">
        {icon}
        {label}
      </div>
      <div className="mt-0.5 flex items-baseline gap-1.5">
        <div className={`text-[17px] font-semibold tabular-nums ${color} truncate`}>{value}</div>
        {sub && <div className="text-[10.5px] font-mono text-muted-foreground truncate">{sub}</div>}
      </div>
    </div>
  );
}
