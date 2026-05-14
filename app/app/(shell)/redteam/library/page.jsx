'use client';

import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Search, BookText } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { DataTable } from '@/components/tables/DataTable';
import { FacetFilterBar } from '@/components/tables/FacetFilter';
import { RedTeamHeader, SeverityPill, CategoryPill, AdversaryPill, fmtAgo } from '../_shared';
import { ATTACKS, CATEGORIES, SEVERITIES, ADVERSARY_CLASSES, LOCALES, LIBRARY_VERSION, attackStats } from '../_attackCatalog';

const CATEGORY_OPTIONS = Object.entries(CATEGORIES).map(([v, m]) => ({ value: v, label: m.label, color: m.accent }));
const SEVERITY_OPTIONS = Object.entries(SEVERITIES).map(([v, m]) => ({ value: v, label: m.label, color: m.accent }));
const ADVERSARY_OPTIONS = Object.entries(ADVERSARY_CLASSES).map(([v, m]) => ({ value: v, label: m.label }));
const LOCALE_OPTIONS    = Object.entries(LOCALES).map(([v, l]) => ({ value: v, label: l }));
const OWASP_LLM_OPTIONS = ['LLM01','LLM02','LLM03','LLM04','LLM05','LLM06','LLM07','LLM08','LLM09','LLM10'].map(o => ({ value: o, label: o }));
const TARGET_TYPE_OPTIONS = [
  { value: 'chat', label: 'Chat API' },
  { value: 'agent', label: 'Agent' },
  { value: 'rag', label: 'RAG' },
  { value: 'mcp', label: 'MCP' },
  { value: 'multimodal', label: 'Multimodal' },
  { value: 'browser', label: 'Browser' },
  { value: 'gateway', label: 'Gateway' },
];

export default function LibraryPage() {
  const router = useRouter();
  const [globalFilter, setGlobalFilter] = useState('');
  const [catSel, setCatSel] = useState(new Set());
  const [sevSel, setSevSel] = useState(new Set());
  const [advSel, setAdvSel] = useState(new Set());
  const [locSel, setLocSel] = useState(new Set());
  const [owaspSel, setOwaspSel] = useState(new Set());
  const [targetSel, setTargetSel] = useState(new Set());

  const data = useMemo(() => ATTACKS.filter(a => {
    if (catSel.size    > 0 && !catSel.has(a.category))            return false;
    if (sevSel.size    > 0 && !sevSel.has(a.severity))            return false;
    if (advSel.size    > 0 && !(a.adversary_class || []).some(c => advSel.has(c))) return false;
    if (locSel.size    > 0 && !locSel.has(a.locale))              return false;
    if (owaspSel.size  > 0 && !(a.owasp_llm_refs || []).some(o => owaspSel.has(o))) return false;
    if (targetSel.size > 0 && !(a.target_types || []).some(t => targetSel.has(t))) return false;
    return true;
  }), [catSel, sevSel, advSel, locSel, owaspSel, targetSel]);

  const stats = useMemo(() => attackStats(), []);

  const columns = useMemo(() => ([
    {
      id: 'sno',
      header: '#',
      cell: ({ row, table }) => {
        const ps = table.getState().pagination;
        const idx = ps ? ps.pageIndex * ps.pageSize + row.index + 1 : row.index + 1;
        return <span className="font-mono tabular-nums text-muted-foreground text-[11.5px]">{idx}</span>;
      },
      enableSorting: false, enableGlobalFilter: false, enableHiding: false,
      size: 44,
    },
    {
      id: 'name', accessorFn: (a) => a.name, header: 'Attack',
      cell: ({ row }) => (
        <div className="min-w-0">
          <div className="text-[12.5px] font-medium text-foreground truncate">{row.original.name}</div>
          <div className="text-[10.5px] font-mono text-muted-foreground truncate">{row.original.id} · v{row.original.version}</div>
        </div>
      ),
      filterFn: (row, _id, q) => {
        if (!q) return true;
        const s = String(q).toLowerCase();
        const a = row.original;
        return a.name.toLowerCase().includes(s) || a.id.toLowerCase().includes(s) || a.description.toLowerCase().includes(s);
      },
    },
    {
      id: 'category', accessorFn: (a) => a.category, header: 'Category',
      cell: ({ row }) => <CategoryPill category={row.original.category} />,
      enableGlobalFilter: false,
    },
    {
      id: 'severity', accessorFn: (a) => a.severity, header: 'Severity',
      cell: ({ row }) => <SeverityPill severity={row.original.severity} />,
      enableGlobalFilter: false,
    },
    {
      id: 'atlas', header: 'ATLAS',
      accessorFn: (a) => (a.atlas_refs || []).join(','),
      cell: ({ row }) => (
        <div className="flex flex-wrap gap-1">
          {(row.original.atlas_refs || []).map(r => (
            <code key={r} className="text-[10px] font-mono text-foreground/85 bg-muted/40 border border-border rounded px-1.5 py-0.5">{r}</code>
          ))}
        </div>
      ),
      enableGlobalFilter: false,
    },
    {
      id: 'owasp', header: 'OWASP LLM',
      accessorFn: (a) => (a.owasp_llm_refs || []).join(','),
      cell: ({ row }) => (
        <div className="flex flex-wrap gap-1">
          {(row.original.owasp_llm_refs || []).map(r => (
            <code key={r} className="text-[10px] font-mono text-primary bg-primary/[0.06] border border-primary/30 rounded px-1.5 py-0.5">{r}</code>
          ))}
        </div>
      ),
      enableGlobalFilter: false,
    },
    {
      id: 'adversary', header: 'Adversary',
      accessorFn: (a) => (a.adversary_class || []).join(','),
      cell: ({ row }) => (
        <div className="flex flex-wrap gap-1">
          {(row.original.adversary_class || []).slice(0, 2).map(c => <AdversaryPill key={c} klass={c} />)}
        </div>
      ),
      enableGlobalFilter: false,
    },
    {
      id: 'locale', accessorFn: (a) => a.locale, header: 'Locale',
      cell: ({ getValue }) => (
        <span className="text-[10.5px] font-mono text-foreground/85">{LOCALES[getValue()] || getValue()}</span>
      ),
      enableGlobalFilter: false,
    },
    {
      id: 'source', accessorFn: (a) => a.source, header: 'Source',
      cell: ({ getValue }) => (
        <span className="text-[10.5px] font-mono text-muted-foreground truncate block max-w-32">{getValue()}</span>
      ),
      enableGlobalFilter: false,
    },
  ]), []);

  const clearAll = () => {
    setCatSel(new Set()); setSevSel(new Set()); setAdvSel(new Set());
    setLocSel(new Set()); setOwaspSel(new Set()); setTargetSel(new Set());
  };

  return (
    <>
      <RedTeamHeader
        title="Attack library"
        subtitle="The versioned attack corpus — MITRE ATLAS, OWASP LLM Top 10, OWASP Agentic, NIST AI RMF. Each entry has a real-corpus payload, severity, and the techniques it demonstrates."
      />
      <div className="max-w-[1680px] mx-auto px-4 sm:px-6 lg:px-8 py-7 space-y-5">
        <div>
          <div className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground font-mono">Catalog</div>
          <h2 className="text-[16px] font-semibold text-foreground mt-0.5 inline-flex items-center gap-2">
            <BookText className="h-4 w-4 text-destructive" /> Attack library
          </h2>
          <p className="text-[12.5px] text-muted-foreground mt-0.5 max-w-[80ch]">
            Versioned, signed corpus of adversarial payloads. Every entry maps to MITRE ATLAS, OWASP LLM Top-10,
            OWASP Agentic AI Top-10, and NIST AI 600-1. Public corpora cited in attribution; v1.0 ships{' '}
            <span className="text-foreground">{stats.total} attacks</span> — full library targets 2,000+.
          </p>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
          <Stat label="Total"      value={String(stats.total)} sub={`library ${LIBRARY_VERSION}`} />
          <Stat label="Critical"   value={String(stats.bySeverity.critical || 0)} tone="bad" />
          <Stat label="High"       value={String(stats.bySeverity.high || 0)}     tone="warn" />
          <Stat label="Categories" value={String(Object.keys(stats.byCategory).length)} />
          <Stat label="Locales"    value={String(Object.keys(stats.byLocale).length)} />
        </div>

        <DataTable
          columns={columns}
          data={data}
          globalFilter={globalFilter}
          onGlobalFilterChange={setGlobalFilter}
          onRowClick={(a) => router.push(`/app/redteam/library/${a.id}`)}
          minWidth="min-w-[1280px]"
          emptyMessage="No attacks match these filters."
          initialSorting={[{ id: 'severity', desc: true }]}
          pageSize={25}
          toolbar={
            <div className="relative w-full max-w-xs">
              <Search className="h-3.5 w-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={globalFilter}
                onChange={(e) => setGlobalFilter(e.target.value)}
                placeholder="Search by name, id, or description…"
                className="pl-8 h-8 text-[12.5px]"
              />
            </div>
          }
          filters={
            <FacetFilterBar
              filters={[
                { title: 'Category',   options: CATEGORY_OPTIONS,   selected: catSel,    onChange: setCatSel    },
                { title: 'Severity',   options: SEVERITY_OPTIONS,   selected: sevSel,    onChange: setSevSel    },
                { title: 'OWASP LLM',  options: OWASP_LLM_OPTIONS,  selected: owaspSel,  onChange: setOwaspSel  },
                { title: 'Adversary',  options: ADVERSARY_OPTIONS,  selected: advSel,    onChange: setAdvSel    },
                { title: 'Target',     options: TARGET_TYPE_OPTIONS,selected: targetSel, onChange: setTargetSel },
                { title: 'Locale',     options: LOCALE_OPTIONS,     selected: locSel,    onChange: setLocSel    },
              ]}
              onClearAll={clearAll}
            />
          }
        />
      </div>
    </>
  );
}

function Stat({ label, value, sub, tone = 'default' }) {
  const color = tone === 'bad'  ? 'text-destructive'
              : tone === 'warn' ? 'text-primary'
              : tone === 'ok'   ? 'text-brand-teal'
              :                   'text-foreground';
  return (
    <div className="rounded-lg border border-border bg-card px-3 py-2">
      <div className="text-[10.5px] font-medium uppercase tracking-[0.1em] text-muted-foreground">{label}</div>
      <div className="mt-0.5 flex items-baseline gap-1.5">
        <div className={`text-[17px] font-semibold tabular-nums ${color} truncate`}>{value}</div>
        {sub && <div className="text-[10.5px] font-mono text-muted-foreground truncate">{sub}</div>}
      </div>
    </div>
  );
}
