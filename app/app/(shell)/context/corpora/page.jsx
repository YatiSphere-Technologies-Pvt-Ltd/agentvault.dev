'use client';

import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Plus, Search, RefreshCw, Layers } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { DataTable } from '@/components/tables/DataTable';
import { FacetFilterBar } from '@/components/tables/FacetFilter';
import { ContextHeader, HealthPill, SourceIcon, fmtAgo, fmtNum } from '../_shared';
import { useCorpora, useSources, simulateReindex } from '../_store';
import { CHUNKING_STRATEGIES, EMBEDDING_MODELS } from '../_sourceCatalog';
import AddCorpusSheet from './AddCorpusSheet';

const HEALTH_OPTIONS = [
  { value: 'green',  label: 'Healthy', color: 'var(--brand-teal)' },
  { value: 'yellow', label: 'Warning', color: 'var(--primary)' },
  { value: 'red',    label: 'Failing', color: 'var(--destructive)' },
];

const STRATEGY_OPTIONS = CHUNKING_STRATEGIES.map(c => ({ value: c.id, label: c.label }));
const EMBEDDING_OPTIONS = EMBEDDING_MODELS.map(m => ({ value: m.id, label: m.label }));
const ACL_OPTIONS = [
  { value: 'row',    label: 'Row-level' },
  { value: 'column', label: 'Column-level' },
  { value: 'tag',    label: 'Tag-based' },
  { value: 'static', label: 'Static' },
];

export default function CorporaPage() {
  const router = useRouter();
  const corpora = useCorpora();
  const sources = useSources();
  const [globalFilter, setGlobalFilter] = useState('');
  const [healthSel, setHealthSel] = useState(new Set());
  const [strategySel, setStrategySel] = useState(new Set());
  const [embeddingSel, setEmbeddingSel] = useState(new Set());
  const [aclSel, setAclSel] = useState(new Set());
  const [sheetOpen, setSheetOpen] = useState(false);

  const data = useMemo(() => corpora.filter(c => {
    if (healthSel.size    > 0 && !healthSel.has(c.health))             return false;
    if (strategySel.size  > 0 && !strategySel.has(c.chunking?.strategy)) return false;
    if (embeddingSel.size > 0 && !embeddingSel.has(c.embedding?.model)) return false;
    if (aclSel.size       > 0 && !aclSel.has(c.acl_inheritance))        return false;
    return true;
  }), [corpora, healthSel, strategySel, embeddingSel, aclSel]);

  const stats = useMemo(() => {
    const totalChunks = data.reduce((s, c) => s + (c.chunk_count || 0), 0);
    const totalQueries = data.reduce((s, c) => s + (c.query_count_7d || 0), 0);
    const totalCost = data.reduce((s, c) => s + (c.cost_7d_usd || 0), 0);
    const avgNdcg = data.length === 0 ? 0 : data.reduce((s, c) => s + (c.ndcg_at_10 || 0), 0) / data.length;
    return { totalChunks, totalQueries, totalCost, avgNdcg };
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
      accessorFn: (c) => c.name,
      header: 'Corpus',
      cell: ({ row }) => (
        <div className="min-w-0">
          <div className="text-[12.5px] font-medium text-foreground truncate">{row.original.name}</div>
          <div className="text-[10.5px] font-mono text-muted-foreground truncate">{row.original.id}</div>
        </div>
      ),
      filterFn: (row, _id, q) => {
        if (!q) return true;
        const t = String(q).toLowerCase();
        return row.original.name.toLowerCase().includes(t) || row.original.id.toLowerCase().includes(t);
      },
    },
    {
      id: 'health',
      accessorFn: (c) => c.health,
      header: 'Health',
      cell: ({ getValue }) => <HealthPill health={getValue()} />,
      enableGlobalFilter: false,
    },
    {
      id: 'sources',
      header: 'Sources',
      accessorFn: (c) => (c.source_ids || []).length,
      cell: ({ row }) => {
        const bound = (row.original.source_ids || []).map(id => sources.find(s => s.id === id)).filter(Boolean);
        return (
          <div className="flex items-center gap-1">
            {bound.slice(0, 3).map(s => <SourceIcon key={s.id} kind={s.kind} size={20} />)}
            {bound.length > 3 && (
              <span className="text-[10.5px] font-mono text-muted-foreground ml-1">+{bound.length - 3}</span>
            )}
          </div>
        );
      },
      enableGlobalFilter: false,
    },
    {
      id: 'strategy',
      accessorFn: (c) => c.chunking?.strategy,
      header: 'Chunking',
      cell: ({ row }) => {
        const c = row.original;
        const meta = CHUNKING_STRATEGIES.find(s => s.id === c.chunking?.strategy);
        return (
          <div className="text-[11.5px]">
            <div className="font-mono text-foreground">{meta?.label || '—'}</div>
            <div className="text-[10px] text-muted-foreground font-mono">
              {c.chunking?.strategy === 'structured'
                ? '1 chunk / row'
                : `${c.chunking?.size || 0} / ${c.chunking?.overlap || 0}`}
            </div>
          </div>
        );
      },
      enableGlobalFilter: false,
    },
    {
      id: 'embedding',
      accessorFn: (c) => c.embedding?.model,
      header: 'Embedding',
      cell: ({ row }) => {
        const c = row.original;
        const meta = EMBEDDING_MODELS.find(m => m.id === c.embedding?.model);
        return (
          <div className="text-[11.5px]">
            <div className="font-mono text-foreground truncate max-w-44">{meta?.label?.split(' ').slice(0, 3).join(' ') || c.embedding?.model || '—'}</div>
            <div className="text-[10px] text-muted-foreground font-mono">{c.embedding?.dim} dim · {c.reranker !== 'none' ? c.reranker : 'no rerank'}</div>
          </div>
        );
      },
      enableGlobalFilter: false,
    },
    {
      id: 'acl',
      accessorFn: (c) => c.acl_inheritance,
      header: 'ACL',
      cell: ({ getValue }) => (
        <span className="font-mono text-[11.5px] text-foreground capitalize">{getValue()}</span>
      ),
      enableGlobalFilter: false,
    },
    {
      id: 'chunks',
      accessorFn: (c) => c.chunk_count ?? 0,
      header: 'Chunks',
      meta: { align: 'right' },
      cell: ({ getValue }) => (
        <span className="font-mono tabular-nums text-[12px] text-foreground">{fmtNum(getValue())}</span>
      ),
      enableGlobalFilter: false,
    },
    {
      id: 'ndcg',
      accessorFn: (c) => c.ndcg_at_10 ?? 0,
      header: 'nDCG@10',
      meta: { align: 'right' },
      cell: ({ getValue }) => {
        const v = getValue();
        const tone = v >= 0.9 ? 'text-brand-teal' : v >= 0.85 ? 'text-foreground' : 'text-destructive';
        return <span className={`font-mono tabular-nums text-[12px] ${tone}`}>{v.toFixed(2)}</span>;
      },
      enableGlobalFilter: false,
    },
    {
      id: 'reindex',
      accessorFn: (c) => c.last_reindex_at ?? 0,
      header: 'Last reindex',
      meta: { align: 'right' },
      cell: ({ row }) => (
        <span className="font-mono tabular-nums text-[11.5px] text-muted-foreground">{fmtAgo(row.original.last_reindex_at)}</span>
      ),
      enableGlobalFilter: false,
    },
    {
      id: 'actions',
      header: '',
      cell: ({ row }) => (
        <button
          type="button"
          onClick={(e) => { e.stopPropagation(); simulateReindex(row.original.id); }}
          className="h-7 w-7 rounded text-muted-foreground hover:text-foreground hover:bg-muted flex items-center justify-center"
          title="Simulate reindex"
        >
          <RefreshCw className="h-3.5 w-3.5" />
        </button>
      ),
      enableSorting: false,
      enableGlobalFilter: false,
      enableHiding: false,
      size: 44,
    },
  ]), [sources]);

  const clearAll = () => {
    setHealthSel(new Set());
    setStrategySel(new Set());
    setEmbeddingSel(new Set());
    setAclSel(new Set());
  };

  return (
    <>
      <ContextHeader />
      <div className="max-w-[1680px] mx-auto px-4 sm:px-6 lg:px-8 py-7 space-y-5">
        <div className="flex items-end justify-between gap-3 flex-wrap">
          <div>
            <div className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground font-mono">Catalog</div>
            <h2 className="text-[16px] font-semibold text-foreground mt-0.5">Corpora</h2>
            <p className="text-[12.5px] text-muted-foreground mt-0.5 max-w-[60ch]">
              A corpus is what an agent actually queries. Bind one or more sources, pick a chunking
              strategy and embedding model, and the platform handles indexing + ACL inheritance.
            </p>
          </div>
          <Button onClick={() => setSheetOpen(true)} size="sm" disabled={sources.length === 0} title={sources.length === 0 ? 'Connect a source first' : ''}>
            <Plus className="h-3.5 w-3.5" /> Build a corpus
          </Button>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          <Stat label="Corpora"      value={String(corpora.length)} icon={<Layers className="h-3.5 w-3.5" />} />
          <Stat label="Chunks"       value={fmtNum(stats.totalChunks)} />
          <Stat label="Queries · 7d" value={fmtNum(stats.totalQueries)} sub={`avg nDCG ${stats.avgNdcg.toFixed(2)}`} />
          <Stat label="Cost · 7d"    value={`$${stats.totalCost.toFixed(2)}`} />
        </div>

        <DataTable
          columns={columns}
          data={data}
          globalFilter={globalFilter}
          onGlobalFilterChange={setGlobalFilter}
          onRowClick={(c) => router.push(`/app/context/corpora/${c.id}`)}
          minWidth="min-w-[1240px]"
          emptyMessage="No corpora match these filters."
          initialSorting={[{ id: 'health', desc: false }]}
          pageSize={25}
          toolbar={
            <div className="relative w-full max-w-xs">
              <Search className="h-3.5 w-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={globalFilter}
                onChange={(e) => setGlobalFilter(e.target.value)}
                placeholder="Search corpora…"
                className="pl-8 h-8 text-[12.5px]"
              />
            </div>
          }
          filters={
            <FacetFilterBar
              filters={[
                { title: 'Health',    options: HEALTH_OPTIONS,    selected: healthSel,    onChange: setHealthSel },
                { title: 'Chunking',  options: STRATEGY_OPTIONS,  selected: strategySel,  onChange: setStrategySel },
                { title: 'Embedding', options: EMBEDDING_OPTIONS, selected: embeddingSel, onChange: setEmbeddingSel },
                { title: 'ACL',       options: ACL_OPTIONS,       selected: aclSel,       onChange: setAclSel },
              ]}
              onClearAll={clearAll}
            />
          }
        />
      </div>

      <AddCorpusSheet open={sheetOpen} onClose={() => setSheetOpen(false)} sources={sources} />
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
