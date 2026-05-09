'use client';

import { useMemo, useState } from 'react';
import { Search, Plus, Download } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from '@/components/ui/tooltip';
import { DataTable } from '@/components/tables/DataTable';
import { FacetFilterBar } from '@/components/tables/FacetFilter';
import {
  CONTROLS,
  FRAMEWORKS,
  frameworkBySlug,
  hookLabel,
  decisionTone,
} from '../_data';
import { useClauseMappings, effectiveFrameworksFor } from '../_clauseMappingStore';
import GrcHeader from '../_GrcHeader';

const HOOKS = [
  { value: 'pre-run',    label: 'Pre-run'    },
  { value: 'pre-tool',   label: 'Pre-tool'   },
  { value: 'pre-model',  label: 'Pre-model'  },
  { value: 'post-model', label: 'Post-model' },
  { value: 'post-run',   label: 'Post-run'   },
  { value: 'scheduled',  label: 'Scheduled'  },
];

const ENFORCEMENTS = [
  { value: 'block',            label: 'Block'    },
  { value: 'require_approval', label: 'Approval' },
  { value: 'redact',           label: 'Redact'   },
  { value: 'warn',             label: 'Warn'     },
  { value: 'log',              label: 'Log'      },
];

function distinct(items, key) {
  return Array.from(new Set(items.map(i => i[key]))).sort();
}

function EnforcementPill({ value }) {
  const tone = decisionTone(value);
  return (
    <span
      className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md border text-[11px] font-medium whitespace-nowrap"
      style={{ borderColor: tone.color + '55', color: tone.color, background: tone.color + '12' }}
    >
      <span className="h-1.5 w-1.5 rounded-full" style={{ background: tone.color }} />
      {tone.label}
    </span>
  );
}

function HookPill({ value }) {
  return (
    <span className="inline-flex items-center px-2 py-0.5 rounded-md border border-border bg-muted/40 text-foreground text-[11px] font-medium whitespace-nowrap">
      {hookLabel(value)}
    </span>
  );
}

function CoverageCell({ pct }) {
  const tone = pct >= 0.9 ? 'var(--accent)'
             : pct >= 0.7 ? 'var(--primary)'
             : 'var(--destructive)';
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 h-1.5 rounded-full bg-muted overflow-hidden min-w-16">
        <div className="h-full rounded-full" style={{ width: `${pct * 100}%`, background: tone }} />
      </div>
      <span className="text-[12px] font-mono tabular-nums text-foreground shrink-0 w-10 text-right">
        {Math.round(pct * 100)}%
      </span>
    </div>
  );
}

function FrameworksCell({ frameworks }) {
  if (frameworks.length === 0) {
    return <span className="text-[12px] text-muted-foreground">—</span>;
  }
  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger
          render={
            <div className="inline-flex items-center gap-1.5 cursor-help">
              <div className="flex -space-x-1">
                {frameworks.slice(0, 4).map(fw => (
                  <span
                    key={fw.slug}
                    className="h-3 w-3 rounded-full ring-1 ring-card"
                    style={{ background: fw.color }}
                  />
                ))}
              </div>
              <span className="text-[12px] font-mono tabular-nums text-foreground">
                {frameworks.length}
              </span>
            </div>
          }
        />
        <TooltipContent>
          <div className="text-[11.5px] space-y-1">
            {frameworks.map(fw => (
              <div key={fw.slug} className="flex items-center gap-2">
                <span className="h-1.5 w-1.5 rounded-full" style={{ background: fw.color }} />
                <span>{fw.name}</span>
              </div>
            ))}
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
  const header = ['id', 'title', 'family', 'kind', 'hook', 'enforcement', 'coverage_pct', 'frameworks', 'runs_7d', 'findings_7d'];
  const body = rows.map(r => [
    r.id, r.title, r.family, r.kind, r.hook, r.enforcement,
    Math.round(r.coverage * 100), r.frameworks.length, r.runs7d, r.violations7d,
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

export default function ControlsLibraryPage() {
  const [globalFilter, setGlobalFilter] = useState('');
  const [frameworkSel,   setFrameworkSel]   = useState(new Set());
  const [hookSel,        setHookSel]        = useState(new Set());
  const [enforcementSel, setEnforcementSel] = useState(new Set());
  const [familySel,      setFamilySel]      = useState(new Set());
  const { mappings } = useClauseMappings();

  // Pre-compute frameworks per control so the table sort/render doesn't recompute them.
  const rows = useMemo(() => CONTROLS.map(c => ({
    ...c,
    frameworks: effectiveFrameworksFor(mappings, c.id)
      .map(s => frameworkBySlug(s)).filter(Boolean),
  })), [mappings]);

  const families = useMemo(() => distinct(rows, 'family'), [rows]);

  const filteredRows = useMemo(() => rows.filter(c => {
    if (hookSel.size        > 0 && !hookSel.has(c.hook))               return false;
    if (enforcementSel.size > 0 && !enforcementSel.has(c.enforcement)) return false;
    if (familySel.size      > 0 && !familySel.has(c.family))           return false;
    if (frameworkSel.size   > 0 && !c.frameworks.some(f => frameworkSel.has(f.slug))) return false;
    return true;
  }), [rows, hookSel, enforcementSel, familySel, frameworkSel]);

  // Triage stats over the filtered set
  const stats = useMemo(() => {
    const totalRuns      = filteredRows.reduce((s, r) => s + (r.runs7d || 0), 0);
    const totalFindings  = filteredRows.reduce((s, r) => s + (r.violations7d || 0), 0);
    const avgCoverage    = filteredRows.length === 0 ? 0
      : filteredRows.reduce((s, r) => s + r.coverage, 0) / filteredRows.length;
    return { totalRuns, totalFindings, avgCoverage };
  }, [filteredRows]);

  const columns = useMemo(() => [
    {
      accessorKey: 'title',
      header: 'Control',
      cell: ({ row }) => {
        const c = row.original;
        return (
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger
                render={
                  <div className="min-w-0 cursor-help">
                    <div className="text-[13px] font-medium text-foreground truncate">{c.title}</div>
                    <div className="text-[11.5px] text-muted-foreground mt-0.5 truncate">
                      {c.id} · {c.family} · {c.kind}
                    </div>
                  </div>
                }
              />
              <TooltipContent>
                <div className="text-[12px] max-w-xs leading-relaxed">
                  {c.summary}
                  <div className="mt-1.5 pt-1.5 border-t border-background/20 text-[11px] font-mono opacity-80">
                    Inputs: {c.inputs.join(', ')}
                  </div>
                </div>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        );
      },
      sortingFn: (a, b) => a.original.title.localeCompare(b.original.title),
    },
    {
      accessorKey: 'hook',
      header: 'Hook',
      cell: ({ row }) => <HookPill value={row.original.hook} />,
      sortingFn: (a, b) => HOOKS.findIndex(h => h.value === a.original.hook) -
                           HOOKS.findIndex(h => h.value === b.original.hook),
      enableGlobalFilter: false,
    },
    {
      accessorKey: 'enforcement',
      header: 'Enforcement',
      cell: ({ row }) => <EnforcementPill value={row.original.enforcement} />,
      sortingFn: (a, b) => ENFORCEMENTS.findIndex(e => e.value === a.original.enforcement) -
                           ENFORCEMENTS.findIndex(e => e.value === b.original.enforcement),
      enableGlobalFilter: false,
    },
    {
      accessorKey: 'coverage',
      header: 'Coverage',
      cell: ({ row }) => <CoverageCell pct={row.original.coverage} />,
      sortingFn: (a, b) => a.original.coverage - b.original.coverage,
      enableGlobalFilter: false,
      size: 160,
    },
    {
      accessorKey: 'frameworks',
      header: 'Frameworks',
      cell: ({ row }) => <FrameworksCell frameworks={row.original.frameworks} />,
      sortingFn: (a, b) => a.original.frameworks.length - b.original.frameworks.length,
      enableGlobalFilter: false,
    },
    {
      accessorKey: 'runs7d',
      header: 'Runs · 7d',
      cell: ({ row }) => (
        <span className="font-mono tabular-nums text-foreground text-[12px]">{row.original.runs7d.toLocaleString()}</span>
      ),
      sortingFn: (a, b) => a.original.runs7d - b.original.runs7d,
      meta: { align: 'right' },
      enableGlobalFilter: false,
    },
    {
      accessorKey: 'violations7d',
      header: 'Findings · 7d',
      cell: ({ row }) => <FindingsCell count={row.original.violations7d} />,
      sortingFn: (a, b) => a.original.violations7d - b.original.violations7d,
      meta: { align: 'right' },
      enableGlobalFilter: false,
    },
  ], []);

  const frameworkOptions = useMemo(
    () => FRAMEWORKS.map(f => ({
      value: f.slug,
      label: f.name,
      color: f.color,
    })),
    [],
  );
  const hookOptions   = HOOKS.map(h => ({ value: h.value, label: h.label }));
  const enforcementOptions = ENFORCEMENTS.map(e => ({
    value: e.value,
    label: e.label,
    color: decisionTone(e.value).color,
  }));
  const familyOptions = useMemo(
    () => families.map(f => ({ value: f, label: f })),
    [families],
  );

  return (
    <>
      <GrcHeader />
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-10 py-7">
        {/* Title row */}
        <div className="flex items-end justify-between mb-5 flex-wrap gap-3">
          <div>
            <h2 className="text-[18px] font-semibold text-foreground">Controls library</h2>
            <p className="mt-1 text-[13px] text-muted-foreground max-w-160 leading-relaxed">
              Atomic policy units. Each control runs at a defined hook in the agent lifecycle and discharges clauses across multiple frameworks. Sort by findings to triage — the noisiest controls rise to the top.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => downloadCsv('controls.csv', toCsv(filteredRows))}>
              <Download className="h-3.5 w-3.5" /> Export
            </Button>
            <Button size="sm">
              <Plus className="h-3.5 w-3.5" /> New control
            </Button>
          </div>
        </div>

        {/* Triage strip */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-5">
          <Stat label="Controls"       value={filteredRows.length} sub={`of ${CONTROLS.length}`} />
          <Stat label="Avg coverage"   value={`${Math.round(stats.avgCoverage * 100)}%`} />
          <Stat label="Runs · 7d"      value={stats.totalRuns.toLocaleString()} />
          <Stat
            label="Findings · 7d"
            value={stats.totalFindings}
            tone={stats.totalFindings === 0 ? 'ok' : stats.totalFindings > 100 ? 'bad' : 'warn'}
          />
        </div>

        <DataTable
          columns={columns}
          data={filteredRows}
          globalFilter={globalFilter}
          onGlobalFilterChange={setGlobalFilter}
          emptyMessage="No controls match the current filters."
          pageSize={25}
          minWidth="min-w-[1080px]"
          initialSorting={[{ id: 'violations7d', desc: true }]}
          toolbar={
            <div className="relative w-full max-w-xs">
              <Search className="h-3.5 w-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={globalFilter}
                onChange={(e) => setGlobalFilter(e.target.value)}
                placeholder="Search controls…"
                className="pl-8 h-8 text-[12.5px]"
              />
            </div>
          }
          filters={
            <FacetFilterBar
              filters={[
                { title: 'Framework',   options: frameworkOptions,   selected: frameworkSel,   onChange: setFrameworkSel   },
                { title: 'Hook',        options: hookOptions,        selected: hookSel,        onChange: setHookSel        },
                { title: 'Enforcement', options: enforcementOptions, selected: enforcementSel, onChange: setEnforcementSel },
                { title: 'Family',      options: familyOptions,      selected: familySel,      onChange: setFamilySel      },
              ]}
              onClearAll={() => {
                setFrameworkSel(new Set());
                setHookSel(new Set());
                setEnforcementSel(new Set());
                setFamilySel(new Set());
              }}
            />
          }
        />
      </div>
    </>
  );
}

function Stat({ label, value, sub, tone = 'default' }) {
  const color = tone === 'bad' ? 'text-destructive'
              : tone === 'warn' ? 'text-primary'
              : tone === 'ok' ? 'text-brand-teal'
              : 'text-foreground';
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
