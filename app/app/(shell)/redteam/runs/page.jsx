'use client';

import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Search, Play, AlertOctagon, TrendingDown, TrendingUp } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { DataTable } from '@/components/tables/DataTable';
import { FacetFilterBar } from '@/components/tables/FacetFilter';
import { RedTeamHeader, fmtAgo, fmtCost } from '../_shared';
import { useRuns, useTargets } from '../_store';
import { suiteById } from '../_targetCatalog';

const SUITE_OPTIONS = [
  { value: 'smoke', label: 'Smoke' },
  { value: 'regression', label: 'Regression' },
  { value: 'full', label: 'Full' },
  { value: 'owasp-llm-top10', label: 'OWASP LLM' },
  { value: 'owasp-agentic-2026', label: 'OWASP Agentic' },
  { value: 'eu-ai-act-art-15', label: 'EU AI Act' },
];

const TRIGGER_OPTIONS = [
  { value: 'manual',       label: 'Manual' },
  { value: 'schedule',     label: 'Schedule' },
  { value: 'deploy',       label: 'Deploy' },
  { value: 'policy-change',label: 'Policy change' },
];

const STATUS_OPTIONS = [
  { value: 'completed', label: 'Completed' },
  { value: 'running',   label: 'Running' },
  { value: 'failed',    label: 'Failed' },
];

export default function RunsPage() {
  const router = useRouter();
  const runs = useRuns();
  const targets = useTargets();
  const [globalFilter, setGlobalFilter] = useState('');
  const [suiteSel, setSuiteSel] = useState(new Set());
  const [triggerSel, setTriggerSel] = useState(new Set());
  const [statusSel, setStatusSel] = useState(new Set());

  const data = useMemo(() => runs.filter(r => {
    if (suiteSel.size   > 0 && !suiteSel.has(r.suite_id))     return false;
    if (triggerSel.size > 0 && !triggerSel.has(r.triggered_by)) return false;
    if (statusSel.size  > 0 && !statusSel.has(r.status))      return false;
    return true;
  }), [runs, suiteSel, triggerSel, statusSel]);

  const stats = useMemo(() => {
    const sloBreaches = runs.filter(r => r.slo_breach).length;
    const regressions = runs.reduce((s, r) => s + (r.regressions || 0), 0);
    const totalBypasses = runs.reduce((s, r) => s + (r.bypassed || 0), 0);
    const totalCost = runs.reduce((s, r) => s + (r.cost_usd || 0), 0);
    return { sloBreaches, regressions, totalBypasses, totalCost };
  }, [runs]);

  const columns = useMemo(() => ([
    {
      id: 'sno', header: '#',
      cell: ({ row, table }) => {
        const ps = table.getState().pagination;
        return <span className="font-mono tabular-nums text-muted-foreground text-[11.5px]">{ps ? ps.pageIndex * ps.pageSize + row.index + 1 : row.index + 1}</span>;
      },
      enableSorting: false, enableGlobalFilter: false, enableHiding: false, size: 44,
    },
    {
      id: 'run', accessorFn: (r) => r.id, header: 'Run',
      cell: ({ row }) => {
        const t = targets.find(x => x.id === row.original.target_id);
        return (
          <div className="min-w-0">
            <div className="text-[12px] font-mono text-foreground truncate">{row.original.id}</div>
            <div className="text-[10.5px] text-muted-foreground truncate">
              {suiteById(row.original.suite_id)?.name || row.original.suite_id} → {t?.name || row.original.target_id}
            </div>
          </div>
        );
      },
    },
    {
      id: 'status', accessorFn: (r) => r.status, header: 'Status',
      cell: ({ row }) => {
        const r = row.original;
        const tone = r.slo_breach ? 'destructive' : r.bypassed > 0 ? 'primary' : 'brand-teal';
        const cls = tone === 'destructive' ? 'border-destructive/40 text-destructive bg-destructive/10'
                  : tone === 'primary' ? 'border-primary/40 text-primary bg-primary/10'
                  : 'border-(--brand-teal)/40 text-brand-teal bg-(--brand-teal)/10';
        const label = r.slo_breach ? 'SLO breach' : r.bypassed > 0 ? 'Bypasses' : 'Pass';
        return (
          <span className={`inline-flex items-center gap-1.5 px-1.5 py-0.5 rounded border text-[10px] font-mono uppercase tracking-[0.12em] ${cls}`}>
            <span className={`h-1.5 w-1.5 rounded-full ${tone === 'destructive' ? 'bg-destructive' : tone === 'primary' ? 'bg-primary' : 'bg-brand-teal'}`} />
            {label}
          </span>
        );
      },
      enableGlobalFilter: false,
    },
    {
      id: 'trigger', accessorFn: (r) => r.triggered_by, header: 'Trigger',
      cell: ({ getValue }) => (
        <span className="text-[10.5px] font-mono text-foreground/85 px-1.5 py-0.5 rounded border border-border bg-muted/40">{getValue()}</span>
      ),
      enableGlobalFilter: false,
    },
    {
      id: 'verdicts', header: 'Verdicts',
      accessorFn: (r) => r.bypassed,
      cell: ({ row }) => {
        const r = row.original;
        return (
          <div className="flex items-center gap-1.5 text-[11px] font-mono tabular-nums">
            <span className="text-brand-teal">{r.passed}</span>
            <span className="text-muted-foreground/60">·</span>
            <span className="text-destructive">{r.bypassed}</span>
            <span className="text-muted-foreground/60">·</span>
            <span className="text-accent">{r.inconclusive}</span>
            <span className="text-muted-foreground/60">/ {r.total}</span>
          </div>
        );
      },
      enableGlobalFilter: false,
    },
    {
      id: 'regressions', accessorFn: (r) => r.regressions || 0, header: 'Regressions',
      meta: { align: 'right' },
      cell: ({ row }) => {
        const n = row.original.regressions || 0;
        if (n === 0) return <span className="font-mono tabular-nums text-[11.5px] text-muted-foreground">—</span>;
        return (
          <span className="inline-flex items-center gap-1 text-destructive font-mono text-[12px]">
            <AlertOctagon className="h-3 w-3" />
            {n}
          </span>
        );
      },
      enableGlobalFilter: false,
    },
    {
      id: 'posture', accessorFn: (r) => r.posture_delta ?? 0, header: 'Δ posture',
      meta: { align: 'right' },
      cell: ({ row }) => {
        const d = row.original.posture_delta;
        if (d == null) return <span className="font-mono text-[11.5px] text-muted-foreground">—</span>;
        const Icon = d < 0 ? TrendingDown : d > 0 ? TrendingUp : null;
        const color = d < 0 ? 'text-destructive' : d > 0 ? 'text-brand-teal' : 'text-muted-foreground';
        return (
          <span className={`inline-flex items-center gap-0.5 font-mono tabular-nums text-[11.5px] ${color}`}>
            {Icon && <Icon className="h-3 w-3" />}
            {d > 0 ? '+' : ''}{d}
          </span>
        );
      },
      enableGlobalFilter: false,
    },
    {
      id: 'cost', accessorFn: (r) => r.cost_usd ?? 0, header: 'Cost',
      meta: { align: 'right' },
      cell: ({ getValue }) => <span className="font-mono tabular-nums text-[11.5px] text-muted-foreground">{fmtCost(getValue())}</span>,
      enableGlobalFilter: false,
    },
    {
      id: 'started', accessorFn: (r) => r.started_at ?? 0, header: 'Started',
      meta: { align: 'right' },
      cell: ({ row }) => <span className="font-mono tabular-nums text-[11.5px] text-muted-foreground">{fmtAgo(row.original.started_at)}</span>,
      enableGlobalFilter: false,
    },
  ]), [targets]);

  return (
    <>
      <RedTeamHeader
        title="Runs"
        subtitle="Every probe set execution — scheduled, on-deploy, and manual. Drill into a run to see findings, regressions, and the exact payloads that bypassed."
      />
      <div className="max-w-[1680px] mx-auto px-4 sm:px-6 lg:px-8 py-7 space-y-5">
        <div>
          <div className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground font-mono">Activity</div>
          <h2 className="text-[16px] font-semibold text-foreground mt-0.5 inline-flex items-center gap-2">
            <Play className="h-4 w-4 text-destructive" /> Runs
          </h2>
          <p className="text-[12.5px] text-muted-foreground mt-0.5 max-w-[80ch]">
            Every run produces an audit-grade record: target, suite, library version, findings, judge confidence,
            SLO outcome, and signed reproducible payloads. Evidence packs export from individual run pages.
          </p>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          <Stat label="Total runs" value={String(runs.length)} />
          <Stat label="SLO breaches" value={String(stats.sloBreaches)} tone={stats.sloBreaches ? 'bad' : 'ok'} />
          <Stat label="Regressions" value={String(stats.regressions)} tone={stats.regressions ? 'bad' : 'ok'} />
          <Stat label="Cost" value={fmtCost(stats.totalCost)} />
        </div>

        <DataTable
          columns={columns}
          data={data}
          globalFilter={globalFilter}
          onGlobalFilterChange={setGlobalFilter}
          onRowClick={(r) => router.push(`/app/redteam/runs/${r.id}`)}
          minWidth="min-w-[1240px]"
          emptyMessage="No runs match these filters."
          initialSorting={[{ id: 'started', desc: true }]}
          pageSize={25}
          toolbar={
            <div className="relative w-full max-w-xs">
              <Search className="h-3.5 w-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={globalFilter}
                onChange={(e) => setGlobalFilter(e.target.value)}
                placeholder="Search runs by id or target…"
                className="pl-8 h-8 text-[12.5px]"
              />
            </div>
          }
          filters={
            <FacetFilterBar
              filters={[
                { title: 'Suite',   options: SUITE_OPTIONS,   selected: suiteSel,   onChange: setSuiteSel },
                { title: 'Trigger', options: TRIGGER_OPTIONS, selected: triggerSel, onChange: setTriggerSel },
                { title: 'Status',  options: STATUS_OPTIONS,  selected: statusSel,  onChange: setStatusSel },
              ]}
              onClearAll={() => { setSuiteSel(new Set()); setTriggerSel(new Set()); setStatusSel(new Set()); }}
            />
          }
        />
      </div>
    </>
  );
}

function Stat({ label, value, tone = 'default' }) {
  const color = tone === 'bad'  ? 'text-destructive'
              : tone === 'warn' ? 'text-(--chart-3)'
              : tone === 'ok'   ? 'text-brand-teal'
              :                   'text-foreground';
  return (
    <div className="rounded-lg border border-border bg-card px-3 py-2">
      <div className="text-[10.5px] font-medium uppercase tracking-[0.1em] text-muted-foreground">{label}</div>
      <div className={`mt-0.5 text-[17px] font-semibold tabular-nums ${color} truncate`}>{value}</div>
    </div>
  );
}
