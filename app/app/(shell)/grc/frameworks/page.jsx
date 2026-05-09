'use client';

import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Search, Plus, Download } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from '@/components/ui/tooltip';
import { DataTable } from '@/components/tables/DataTable';
import { FacetFilterBar } from '@/components/tables/FacetFilter';
import { CONTROLS, FRAMEWORKS } from '../_data';
import {
  useClauseMappings,
  effectiveCoverageFor,
  effectiveControlsByFramework,
  effectiveHealthFor,
} from '../_clauseMappingStore';
import GrcHeader from '../_GrcHeader';

const STATUS_TONE = {
  'in-force':    'bg-destructive/10 text-destructive border-destructive/40',
  'certifiable': 'bg-primary/10 text-primary border-primary/40',
  'auditable':   'bg-primary/10 text-primary border-primary/40',
  'adopted':     'bg-(--brand-teal)/10 text-brand-teal border-(--brand-teal)/40',
  'guidance':    'bg-muted text-muted-foreground border-border',
};

function StatusPill({ status }) {
  const tone = STATUS_TONE[status] || STATUS_TONE.guidance;
  return (
    <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md border text-[11px] font-medium whitespace-nowrap ${tone}`}>
      <span className="h-1.5 w-1.5 rounded-full bg-current opacity-70" />
      {status}
    </span>
  );
}

function CoverageCell({ pct, covered, total, color }) {
  const unmapped = total - covered;
  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger
          render={
            <div className="flex items-center gap-3 cursor-help">
              <div className="flex-1 h-1.5 rounded-full bg-muted overflow-hidden min-w-20">
                <div className="h-full rounded-full transition-[width]"
                  style={{ width: `${pct * 100}%`, background: color }} />
              </div>
              <span className="text-[12px] font-mono tabular-nums text-foreground shrink-0 w-10 text-right">
                {Math.round(pct * 100)}%
              </span>
            </div>
          }
        />
        <TooltipContent>
          <div className="text-[11.5px] font-mono">
            <div>{covered}/{total} clauses mapped</div>
            {unmapped > 0 && <div className="opacity-80">{unmapped} unmapped</div>}
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

function FindingsCell({ count }) {
  if (count === 0) return <span className="font-mono tabular-nums text-muted-foreground text-[12px]">0</span>;
  const tone = count <= 5 ? 'text-primary' : 'text-destructive';
  return <span className={`font-mono tabular-nums text-[12px] ${tone}`}>{count}</span>;
}

function toCsv(rows) {
  const header = ['name', 'kind', 'jurisdiction', 'status', 'coverage_pct', 'covered', 'total', 'controls', 'findings_7d'];
  const body = rows.map(r => [
    r.name, r.kind, r.jurisdiction, r.status,
    Math.round(r.pct * 100), r.covered, r.total, r.controls, r.findings,
  ]);
  return [header, ...body].map(cols => cols.map(c => {
    const s = String(c ?? '');
    return /[,"\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  }).join(',')).join('\n');
}

function downloadCsv(filename, csv) {
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

function distinct(items, key) {
  return Array.from(new Set(items.map(i => i[key]))).sort();
}

export default function FrameworksIndexPage() {
  const router = useRouter();
  const { mappings } = useClauseMappings();
  const [globalFilter, setGlobalFilter] = useState('');
  const [jurisdictions, setJurisdictions] = useState(new Set());
  const [kinds, setKinds] = useState(new Set());
  const [statuses, setStatuses] = useState(new Set());

  // Build derived rows
  const rows = useMemo(() => FRAMEWORKS.map(fw => {
    const cov = effectiveCoverageFor(mappings, fw.slug);
    const controls = effectiveControlsByFramework(mappings, fw.slug, CONTROLS).length;
    const health = effectiveHealthFor(mappings, fw.slug, CONTROLS);
    return {
      slug:         fw.slug,
      name:         fw.name,
      kind:         fw.kind,
      jurisdiction: fw.jurisdiction,
      status:       fw.status,
      summary:      fw.summary,
      color:        fw.color,
      pct:          cov.pct,
      covered:      cov.covered,
      total:        cov.total,
      controls,
      findings:     health.violations7d,
    };
  }), [mappings]);

  const filteredRows = useMemo(() => rows.filter(r =>
    (jurisdictions.size === 0 || jurisdictions.has(r.jurisdiction)) &&
    (kinds.size === 0 || kinds.has(r.kind)) &&
    (statuses.size === 0 || statuses.has(r.status))
  ), [rows, jurisdictions, kinds, statuses]);

  const jurisdictionOptions = useMemo(
    () => distinct(rows, 'jurisdiction').map(j => ({ value: j, label: j })),
    [rows],
  );
  const kindOptions = useMemo(
    () => distinct(rows, 'kind').map(k => ({ value: k, label: k })),
    [rows],
  );
  const statusOptions = useMemo(
    () => distinct(rows, 'status').map(s => ({ value: s, label: s })),
    [rows],
  );

  const columns = useMemo(() => [
    {
      accessorKey: 'name',
      header: 'Framework',
      cell: ({ row }) => {
        const r = row.original;
        return (
          <div className="flex items-start gap-3 min-w-0">
            <span className="mt-1.5 h-2 w-2 rounded-full shrink-0" style={{ background: r.color }} />
            <div className="min-w-0">
              <div className="text-[13px] font-medium text-foreground truncate">{r.name}</div>
              <div className="text-[11.5px] text-muted-foreground mt-0.5 truncate">
                {r.kind} · {r.jurisdiction}
              </div>
              <p className="text-[11.5px] text-muted-foreground/90 line-clamp-1 mt-1 max-w-130">{r.summary}</p>
            </div>
          </div>
        );
      },
      sortingFn: (a, b) => a.original.name.localeCompare(b.original.name),
    },
    {
      accessorKey: 'status',
      header: 'Status',
      cell: ({ row }) => <StatusPill status={row.original.status} />,
      enableGlobalFilter: false,
    },
    {
      accessorKey: 'pct',
      header: 'Coverage',
      cell: ({ row }) => {
        const r = row.original;
        return <CoverageCell pct={r.pct} covered={r.covered} total={r.total} color={r.color} />;
      },
      sortingFn: (a, b) => a.original.pct - b.original.pct,
      enableGlobalFilter: false,
      size: 200,
    },
    {
      accessorKey: 'controls',
      header: 'Controls',
      cell: ({ row }) => (
        <span className="font-mono tabular-nums text-foreground text-[12px]">{row.original.controls}</span>
      ),
      sortingFn: (a, b) => a.original.controls - b.original.controls,
      meta: { align: 'right' },
      enableGlobalFilter: false,
    },
    {
      accessorKey: 'findings',
      header: 'Findings · 7d',
      cell: ({ row }) => <FindingsCell count={row.original.findings} />,
      sortingFn: (a, b) => a.original.findings - b.original.findings,
      meta: { align: 'right' },
      enableGlobalFilter: false,
    },
  ], []);

  const totalUnmapped = rows.reduce((s, r) => s + (r.total - r.covered), 0);
  const totalFindings = rows.reduce((s, r) => s + r.findings, 0);
  const avgCoverage   = rows.length === 0 ? 0
    : rows.reduce((s, r) => s + r.pct, 0) / rows.length;

  return (
    <>
      <GrcHeader />
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-10 py-7">
        {/* Title row */}
        <div className="flex items-end justify-between mb-5 flex-wrap gap-3">
          <div>
            <h2 className="text-[18px] font-semibold text-foreground">Frameworks in scope</h2>
            <p className="mt-1 text-[13px] text-muted-foreground max-w-160 leading-relaxed">
              Each framework is a body of clauses your agents must satisfy. Sort by coverage to triage gaps; click a row to map controls to its clauses.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => downloadCsv('frameworks.csv', toCsv(filteredRows))}>
              <Download className="h-3.5 w-3.5" /> Export
            </Button>
            <Button size="sm">
              <Plus className="h-3.5 w-3.5" /> Add framework
            </Button>
          </div>
        </div>

        {/* Triage strip */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-5">
          <Stat label="Frameworks"       value={rows.length} />
          <Stat label="Avg coverage"     value={`${Math.round(avgCoverage * 100)}%`} />
          <Stat label="Unmapped clauses" value={totalUnmapped} tone={totalUnmapped > 0 ? 'warn' : 'ok'} />
          <Stat label="Findings · 7d"    value={totalFindings} tone={totalFindings === 0 ? 'ok' : totalFindings > 10 ? 'bad' : 'warn'} />
        </div>

        <DataTable
          columns={columns}
          data={filteredRows}
          globalFilter={globalFilter}
          onGlobalFilterChange={setGlobalFilter}
          onRowClick={(row) => router.push(`/app/grc/frameworks/${row.slug}`)}
          emptyMessage="No frameworks match the current filters."
          pageSize={25}
          minWidth="min-w-[820px]"
          initialSorting={[{ id: 'pct', desc: false }]}
          toolbar={
            <div className="relative w-full max-w-xs">
              <Search className="h-3.5 w-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={globalFilter}
                onChange={(e) => setGlobalFilter(e.target.value)}
                placeholder="Search frameworks…"
                className="pl-8 h-8 text-[12.5px]"
              />
            </div>
          }
          filters={
            <FacetFilterBar
              filters={[
                { title: 'Jurisdiction', options: jurisdictionOptions, selected: jurisdictions, onChange: setJurisdictions },
                { title: 'Kind',         options: kindOptions,         selected: kinds,         onChange: setKinds },
                { title: 'Status',       options: statusOptions,       selected: statuses,      onChange: setStatuses },
              ]}
              onClearAll={() => { setJurisdictions(new Set()); setKinds(new Set()); setStatuses(new Set()); }}
            />
          }
        />
      </div>
    </>
  );
}

function Stat({ label, value, tone = 'default' }) {
  const color = tone === 'bad' ? 'text-destructive'
              : tone === 'warn' ? 'text-primary'
              : tone === 'ok' ? 'text-brand-teal'
              : 'text-foreground';
  return (
    <div className="rounded-lg border border-border bg-card p-3">
      <div className="text-[11.5px] font-medium text-muted-foreground">{label}</div>
      <div className={`mt-1 text-[22px] font-semibold tabular-nums ${color}`}>{value}</div>
    </div>
  );
}
