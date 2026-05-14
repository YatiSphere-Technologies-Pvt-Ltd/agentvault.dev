'use client';

import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Plus, Search, Boxes, Calendar, GitBranch, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { DataTable } from '@/components/tables/DataTable';
import { FacetFilterBar } from '@/components/tables/FacetFilter';
import { RedTeamHeader, fmtAgo } from '../_shared';
import { useProbeSets, useTargets } from '../_store';
import { SUITE_CATALOG, suiteById } from '../_targetCatalog';

const KIND_OPTIONS = [
  { value: 'smoke',      label: 'Smoke' },
  { value: 'regression', label: 'Regression' },
  { value: 'full',       label: 'Full' },
  { value: 'custom',     label: 'Custom' },
];

export default function SuitesPage() {
  const router = useRouter();
  const probeSets = useProbeSets();
  const targets = useTargets();
  const [globalFilter, setGlobalFilter] = useState('');
  const [kindSel, setKindSel] = useState(new Set());

  const data = useMemo(() => probeSets.filter(p => {
    const suite = suiteById(p.suite_id);
    if (kindSel.size > 0 && !kindSel.has(suite?.kind)) return false;
    return true;
  }), [probeSets, kindSel]);

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
      id: 'name', accessorFn: (p) => p.name, header: 'Probe set',
      cell: ({ row }) => {
        const suite = suiteById(row.original.suite_id);
        return (
          <div className="min-w-0">
            <div className="text-[12.5px] font-medium text-foreground truncate">{row.original.name}</div>
            <div className="text-[10.5px] font-mono text-muted-foreground truncate">{row.original.id} · suite {suite?.name || row.original.suite_id}</div>
          </div>
        );
      },
      filterFn: (row, _id, q) => {
        if (!q) return true;
        const s = String(q).toLowerCase();
        return row.original.name.toLowerCase().includes(s);
      },
    },
    {
      id: 'kind', accessorFn: (p) => suiteById(p.suite_id)?.kind, header: 'Kind',
      cell: ({ getValue }) => (
        <span className="text-[10.5px] font-mono uppercase tracking-[0.12em] px-1.5 py-0.5 rounded border border-border bg-muted/40 text-foreground/85">
          {getValue()}
        </span>
      ),
      enableGlobalFilter: false,
    },
    {
      id: 'targets', header: 'Targets',
      accessorFn: (p) => (p.target_ids || []).length,
      cell: ({ row }) => (
        <div className="flex flex-wrap gap-1">
          {(row.original.target_ids || []).map(tid => {
            const t = targets.find(x => x.id === tid);
            return (
              <span key={tid} className="text-[10px] font-mono px-1.5 py-0.5 rounded border border-border bg-muted/40 text-foreground/85">
                {t?.name?.split('·')[0]?.trim() || tid}
              </span>
            );
          })}
        </div>
      ),
      enableGlobalFilter: false,
    },
    {
      id: 'schedule', header: 'Schedule', accessorFn: (p) => p.schedule?.cron,
      cell: ({ row }) => (
        <div className="flex items-center gap-1.5">
          {row.original.schedule?.enabled && <Calendar className="h-3 w-3 text-primary" />}
          <code className="text-[10.5px] font-mono text-foreground/85">{row.original.schedule?.cron || '—'}</code>
        </div>
      ),
      enableGlobalFilter: false,
    },
    {
      id: 'triggers', header: 'Triggers',
      accessorFn: (p) => Object.entries(p.triggers || {}).filter(([, v]) => v).map(([k]) => k).join(','),
      cell: ({ row }) => (
        <div className="flex items-center gap-1">
          {row.original.triggers?.on_deploy && <span className="text-[9.5px] font-mono px-1.5 py-0.5 rounded border border-accent/40 bg-accent/[0.06] text-accent">deploy</span>}
          {row.original.triggers?.on_policy_change && <span className="text-[9.5px] font-mono px-1.5 py-0.5 rounded border border-primary/40 bg-primary/[0.06] text-primary">policy</span>}
        </div>
      ),
      enableGlobalFilter: false,
    },
    {
      id: 'lastRun', accessorFn: (p) => p.schedule?.last_run_at ?? 0, header: 'Last run',
      meta: { align: 'right' },
      cell: ({ row }) => (
        <span className="font-mono tabular-nums text-[11.5px] text-muted-foreground">{fmtAgo(row.original.schedule?.last_run_at)}</span>
      ),
      enableGlobalFilter: false,
    },
  ]), [targets]);

  return (
    <>
      <RedTeamHeader
        title="Suites"
        subtitle="Probe sets bind a named attack suite (Smoke / Regression / Full / OWASP) to a target with a schedule — on cron, on deploy, or on policy change."
      />
      <div className="max-w-[1680px] mx-auto px-4 sm:px-6 lg:px-8 py-7 space-y-5">
        <div className="flex items-end justify-between gap-3 flex-wrap">
          <div>
            <div className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground font-mono">Catalog</div>
            <h2 className="text-[16px] font-semibold text-foreground mt-0.5 inline-flex items-center gap-2">
              <Boxes className="h-4 w-4 text-destructive" /> Suites + probe sets
            </h2>
            <p className="text-[12.5px] text-muted-foreground mt-0.5 max-w-[80ch]">
              Probe sets bind a <em>suite</em> (Smoke / Regression / Full / OWASP) to a target with a schedule.
              Schedules trigger on cron, on deploy, or on policy change — closing the loop with the gateway and the
              GRC suite.
            </p>
          </div>
          <Button
            size="sm"
            render={<Link href="/app/redteam/suites/new"><Plus className="h-3.5 w-3.5" /> New probe set</Link>}
          />
        </div>

        {/* Suite catalog reference */}
        <div className="rounded-xl border border-border bg-card overflow-hidden">
          <div className="px-4 py-2.5 border-b border-border flex items-center gap-2">
            <Sparkles className="h-3.5 w-3.5 text-primary" />
            <span className="text-[10.5px] uppercase tracking-[0.16em] font-mono text-muted-foreground">Suite catalog</span>
            <span className="text-[10.5px] text-muted-foreground/80">named, versioned suites</span>
          </div>
          <div className="divide-y divide-border/60">
            {SUITE_CATALOG.map(s => (
              <div key={s.id} className="px-4 py-2.5 flex items-start gap-3">
                <code className="text-[10.5px] font-mono text-muted-foreground shrink-0 pt-0.5">{s.id}</code>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="text-[12.5px] font-medium text-foreground">{s.name}</span>
                    <span className="text-[9.5px] font-mono uppercase tracking-[0.12em] px-1.5 py-0.5 rounded border border-border bg-muted/40 text-muted-foreground">{s.kind}</span>
                  </div>
                  <div className="text-[11px] text-muted-foreground leading-snug mt-0.5">{s.description}</div>
                </div>
                <span className="text-[10.5px] font-mono text-muted-foreground shrink-0 pt-0.5">~{s.expected_duration_min}m</span>
              </div>
            ))}
          </div>
        </div>

        <DataTable
          columns={columns}
          data={data}
          globalFilter={globalFilter}
          onGlobalFilterChange={setGlobalFilter}
          onRowClick={(p) => router.push(`/app/redteam/suites/${p.id}`)}
          minWidth="min-w-[1120px]"
          emptyMessage="No probe sets match these filters."
          initialSorting={[{ id: 'lastRun', desc: true }]}
          pageSize={25}
          toolbar={
            <div className="relative w-full max-w-xs">
              <Search className="h-3.5 w-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={globalFilter}
                onChange={(e) => setGlobalFilter(e.target.value)}
                placeholder="Search probe sets…"
                className="pl-8 h-8 text-[12.5px]"
              />
            </div>
          }
          filters={
            <FacetFilterBar
              filters={[
                { title: 'Kind', options: KIND_OPTIONS, selected: kindSel, onChange: setKindSel },
              ]}
              onClearAll={() => setKindSel(new Set())}
            />
          }
        />
      </div>
    </>
  );
}
