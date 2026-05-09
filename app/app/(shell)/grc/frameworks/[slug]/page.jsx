'use client';

import { use, useMemo, useState } from 'react';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { Search, ChevronLeft, Info, X, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from '@/components/ui/tooltip';
import { DataTable } from '@/components/tables/DataTable';
import { FacetFilterBar } from '@/components/tables/FacetFilter';
import {
  CONTROLS,
  frameworkBySlug,
  decisionTone,
  hookLabel,
} from '../../_data';
import {
  useClauseMappings,
  effectiveCoverageFor,
  effectiveControlsByFramework,
} from '../../_clauseMappingStore';
import GrcHeader from '../../_GrcHeader';
import MapControlsSheet from '../../_MapControlsSheet';

const GLOSSARY_DISMISSED_KEY = 'av-grc-glossary-dismissed-v1';

const STATUS_TONE = {
  'in-force':    'bg-destructive/10 text-destructive border-destructive/40',
  'certifiable': 'bg-primary/10 text-primary border-primary/40',
  'auditable':   'bg-primary/10 text-primary border-primary/40',
  'adopted':     'bg-(--brand-teal)/10 text-brand-teal border-(--brand-teal)/40',
  'guidance':    'bg-muted text-muted-foreground border-border',
};

export default function FrameworkDetailPage({ params }) {
  const { slug } = use(params);
  const fw = frameworkBySlug(slug);
  if (!fw) notFound();

  const { mappings, controlsForClause } = useClauseMappings();
  const cov = effectiveCoverageFor(mappings, slug);
  const pct = Math.round(cov.pct * 100);
  const contributingControls = effectiveControlsByFramework(mappings, slug, CONTROLS);
  const unmapped = cov.total - cov.covered;

  const [activeClause, setActiveClause] = useState(null);
  const [globalFilter, setGlobalFilter] = useState('');
  const [statusSel, setStatusSel] = useState(new Set());
  const [glossaryDismissed, setGlossaryDismissed] = useState(() => {
    if (typeof window === 'undefined') return false;
    try { return localStorage.getItem(GLOSSARY_DISMISSED_KEY) === '1'; } catch { return false; }
  });

  const dismissGlossary = () => {
    setGlossaryDismissed(true);
    try { localStorage.setItem(GLOSSARY_DISMISSED_KEY, '1'); } catch {}
  };

  // Build clause rows with mapping state derived live
  const rows = useMemo(() => fw.clauses.map(clause => {
    const attached = controlsForClause(fw.slug, clause.id);
    return {
      ...clause,
      attached,
      status: attached.length > 0 ? 'mapped' : 'unmapped',
    };
  }), [fw, controlsForClause]);

  const filteredRows = useMemo(() => rows.filter(r =>
    statusSel.size === 0 || statusSel.has(r.status)
  ), [rows, statusSel]);

  const columns = useMemo(() => [
    {
      accessorKey: 'label',
      header: 'Clause',
      cell: ({ row }) => {
        const r = row.original;
        return (
          <div className="min-w-0">
            <div className="text-[13px] font-medium text-foreground">{r.label}</div>
            {r.description && (
              <p className="mt-1 text-[12px] text-muted-foreground/95 leading-relaxed line-clamp-2 max-w-200">
                {r.description}
              </p>
            )}
          </div>
        );
      },
      sortingFn: (a, b) => a.original.label.localeCompare(b.original.label),
    },
    {
      accessorKey: 'status',
      header: 'Status',
      cell: ({ row }) => {
        const isMapped = row.original.status === 'mapped';
        return (
          <span
            className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md border text-[11px] font-medium whitespace-nowrap ${
              isMapped
                ? 'bg-(--brand-teal)/10 text-brand-teal border-(--brand-teal)/40'
                : 'bg-destructive/10 text-destructive border-destructive/40'
            }`}
          >
            <span className={`h-1.5 w-1.5 rounded-full ${isMapped ? 'bg-brand-teal' : 'bg-destructive'}`} />
            {isMapped ? 'mapped' : 'unmapped'}
          </span>
        );
      },
      sortingFn: (a, b) => a.original.status.localeCompare(b.original.status),
      enableGlobalFilter: false,
    },
    {
      accessorKey: 'attached',
      header: 'Controls mapped',
      cell: ({ row }) => {
        const r = row.original;
        if (r.attached.length === 0) {
          return <span className="text-[12px] text-muted-foreground">—</span>;
        }
        return <ControlChips attached={r.attached} />;
      },
      sortingFn: (a, b) => a.original.attached.length - b.original.attached.length,
      enableGlobalFilter: false,
    },
    {
      id: 'action',
      header: '',
      cell: ({ row }) => (
        <Button
          size="sm"
          variant={row.original.status === 'unmapped' ? 'default' : 'outline'}
          className="h-7 text-[11.5px]"
          onClick={(e) => { e.stopPropagation(); setActiveClause(row.original); }}
        >
          {row.original.status === 'unmapped' ? 'Map controls' : 'Edit'}
          <ArrowRight className="h-3 w-3" />
        </Button>
      ),
      meta: { align: 'right' },
      enableSorting: false,
      enableGlobalFilter: false,
      enableHiding: false,
    },
  ], []);

  const statusOptions = [
    { value: 'mapped',   label: 'Mapped',   color: 'var(--brand-teal)' },
    { value: 'unmapped', label: 'Unmapped', color: 'var(--destructive)' },
  ];

  return (
    <>
      <GrcHeader />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-10 py-7">
        <Link href="/app/grc/frameworks" className="text-[12px] text-muted-foreground hover:text-foreground inline-flex items-center gap-1">
          <ChevronLeft className="h-3.5 w-3.5" />
          All frameworks
        </Link>

        {/* Identity row */}
        <div className="mt-4 flex items-start justify-between gap-4 flex-wrap">
          <div className="min-w-0 max-w-3xl">
            <div className="flex items-center gap-2.5 flex-wrap">
              <span className="h-3 w-3 rounded-full" style={{ background: fw.color }} />
              <h2 className="text-[24px] font-semibold tracking-tight text-foreground">{fw.name}</h2>
              <span
                className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md border text-[11px] font-medium whitespace-nowrap ${
                  STATUS_TONE[fw.status] || STATUS_TONE.guidance
                }`}
              >
                <span className="h-1.5 w-1.5 rounded-full bg-current opacity-70" />
                {fw.status}
              </span>
            </div>
            <div className="mt-1.5 text-[12px] text-muted-foreground">
              {fw.kind} · {fw.jurisdiction}
            </div>
            <p className="mt-3 text-[13.5px] text-foreground/85 leading-relaxed">{fw.summary}</p>
          </div>
        </div>

        {/* Triage strip */}
        <div className="mt-6 grid grid-cols-2 sm:grid-cols-4 gap-3">
          <Stat
            label="Coverage"
            value={`${pct}%`}
            sub={cov.pct >= 1 ? 'all clauses mapped' : `${cov.covered}/${cov.total} mapped`}
            tone={pct === 100 ? 'ok' : pct >= 70 ? 'warn' : 'bad'}
          />
          <Stat label="Clauses"             value={cov.total} sub={`in ${fw.name.split(' ').slice(0, 2).join(' ')}`} />
          <Stat label="Unmapped"            value={unmapped}  tone={unmapped === 0 ? 'ok' : 'bad'} />
          <Stat label="Contributing controls" value={contributingControls.length} sub="from your library" />
        </div>

        {/* Slim glossary bar */}
        {!glossaryDismissed && (
          <div className="mt-5 relative bg-muted/40 border border-border rounded-lg px-4 py-2.5 flex items-start gap-3">
            <Info className="h-4 w-4 text-primary shrink-0 mt-0.5" />
            <dl className="flex-1 flex flex-wrap items-center gap-x-6 gap-y-1.5 text-[12px]">
              <Term term="Clause" def="A requirement from this regulation. Regulators write these." />
              <Term term="Control" def="Something AgentVault enforces at runtime to satisfy a clause." />
              <Term
                term="Mapped"
                def={<><span className="text-brand-teal font-medium">≥1 control attached</span>. <span className="text-destructive font-medium">Unmapped</span> = no enforcement yet.</>}
              />
            </dl>
            <button
              type="button"
              onClick={dismissGlossary}
              className="shrink-0 h-6 w-6 rounded text-muted-foreground hover:text-foreground hover:bg-muted/70 inline-flex items-center justify-center"
              aria-label="Dismiss"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        )}

        {/* Clauses table */}
        <div className="mt-6">
          <div className="flex items-end justify-between mb-3 gap-3 flex-wrap">
            <div>
              <h3 className="text-[15px] font-semibold text-foreground">Clauses</h3>
              <p className="mt-0.5 text-[12.5px] text-muted-foreground max-w-150">
                Sort by status to triage gaps. Click any row to attach or detach controls.
              </p>
            </div>
          </div>

          <DataTable
            columns={columns}
            data={filteredRows}
            globalFilter={globalFilter}
            onGlobalFilterChange={setGlobalFilter}
            onRowClick={(row) => setActiveClause(row)}
            emptyMessage="No clauses match the current filters."
            pageSize={25}
            minWidth="min-w-[820px]"
            initialSorting={[{ id: 'status', desc: true }]}
            toolbar={
              <div className="relative w-full max-w-xs">
                <Search className="h-3.5 w-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <Input
                  value={globalFilter}
                  onChange={(e) => setGlobalFilter(e.target.value)}
                  placeholder="Search clauses…"
                  className="pl-8 h-8 text-[12.5px]"
                />
              </div>
            }
            filters={
              <FacetFilterBar
                filters={[
                  { title: 'Status', options: statusOptions, selected: statusSel, onChange: setStatusSel },
                ]}
                onClearAll={() => setStatusSel(new Set())}
              />
            }
          />
        </div>
      </div>

      <MapControlsSheet
        open={!!activeClause}
        onClose={() => setActiveClause(null)}
        framework={fw}
        clause={activeClause}
      />
    </>
  );
}

/* ───────────────────── Cells ───────────────────── */

function ControlChips({ attached }) {
  // Show up to 3 chips inline; rest behind a hover popover with full list
  const SHOW = 3;
  const visible = attached.slice(0, SHOW);
  const overflow = attached.slice(SHOW);

  return (
    <TooltipProvider>
      <div className="flex flex-wrap items-center gap-1.5">
        {visible.map(({ controlId, origin }) => {
          const c = CONTROLS.find(x => x.id === controlId);
          if (!c) return null;
          const t = decisionTone(c.enforcement);
          return (
            <Tooltip key={controlId}>
              <TooltipTrigger
                render={
                  <Link
                    href={`/app/grc/controls#${controlId}`}
                    onClick={(e) => e.stopPropagation()}
                    className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md border border-border bg-card hover:border-primary/40 text-[11.5px] max-w-56"
                  >
                    <span className="h-1.5 w-1.5 rounded-full shrink-0" style={{ background: t.color }} />
                    <span className="text-foreground truncate">{c.title}</span>
                    {origin === 'user' && (
                      <span className="text-[9.5px] font-mono text-accent shrink-0">+you</span>
                    )}
                  </Link>
                }
              />
              <TooltipContent>
                <div className="text-[11.5px] space-y-0.5">
                  <div className="font-medium">{c.title}</div>
                  <div className="opacity-80">{hookLabel(c.hook)} · {t.label}</div>
                </div>
              </TooltipContent>
            </Tooltip>
          );
        })}
        {overflow.length > 0 && (
          <Tooltip>
            <TooltipTrigger
              render={
                <span className="inline-flex items-center px-2 py-0.5 rounded-md border border-border bg-muted/40 text-[11.5px] text-muted-foreground cursor-help">
                  +{overflow.length} more
                </span>
              }
            />
            <TooltipContent>
              <div className="text-[11.5px] space-y-1">
                {overflow.map(({ controlId }) => {
                  const c = CONTROLS.find(x => x.id === controlId);
                  if (!c) return null;
                  const t = decisionTone(c.enforcement);
                  return (
                    <div key={controlId} className="flex items-center gap-2">
                      <span className="h-1.5 w-1.5 rounded-full" style={{ background: t.color }} />
                      <span>{c.title}</span>
                    </div>
                  );
                })}
              </div>
            </TooltipContent>
          </Tooltip>
        )}
      </div>
    </TooltipProvider>
  );
}

function Term({ term, def }) {
  return (
    <div className="flex items-baseline gap-1.5">
      <dt className="font-medium text-foreground">{term}</dt>
      <dd className="text-muted-foreground">— {def}</dd>
    </div>
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
