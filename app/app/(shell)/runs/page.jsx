'use client';

import { useRouter } from 'next/navigation';
import { useMemo, useState } from 'react';
import { Search, Download } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { DataTable } from '@/components/tables/DataTable';

/* -----------------------------------------------------------
   Seed — runs are tied to agent ids so the trace page can resolve
   the agent's config for rendering APM-style traces.
----------------------------------------------------------- */
const AGENT_POOL = [
  { id: 'agt_data_analyst', label: 'Data Analyst' },
  { id: 'agt_invoiceq',     label: 'Invoice triage' },
  { id: 'agt_kycverify',    label: 'KYC verification' },
  { id: 'agt_redliner',     label: 'Contract redliner' },
];

const ALL_RUNS = Array.from({ length: 42 }).map((_, i) => {
  // Biased toward Data Analyst so the trace view demos the rich shape often.
  const biased = i % 4 === 3 ? AGENT_POOL[(i / 4 | 0) % AGENT_POOL.length] : AGENT_POOL[0];
  const agent = i < 18 ? AGENT_POOL[0] : biased;
  const statuses  = ['success', 'success', 'success', 'success', 'running', 'error'];
  const status = statuses[i % statuses.length];
  const total = 14;
  const durMs = status === 'running' ? null : Math.round((1 + ((i * 37) % 100) / 12) * 1000);
  return {
    id:       `run_${9500 - i}`,
    agentId:  agent.id,
    workflow: agent.label,
    status,
    durMs,
    costUSD:  status === 'running' ? null : +(((i * 0.0013) % 0.04).toFixed(4)),
    steps:    { done: status === 'error' ? 3 : total, total, error: status === 'error' },
    whenMs:   (i * 3 + 2) * 60 * 1000,
  };
});

const STATUS_TONE = {
  success: 'border-(--brand-teal)/40 text-brand-teal bg-(--brand-teal)/10',
  running: 'border-primary/50 text-primary bg-primary/10',
  error:   'border-destructive/50 text-destructive bg-destructive/10',
};

function StatusPill({ status }) {
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded border text-[10.5px] font-mono ${STATUS_TONE[status]}`}>
      <span className={`h-1.5 w-1.5 rounded-full ${
        status === 'success' ? 'bg-brand-teal' :
        status === 'running' ? 'bg-primary animate-pulse-dot' :
        'bg-destructive'
      }`} />
      {status}
    </span>
  );
}

function fmtMs(ms) {
  if (ms == null) return '—';
  if (ms < 1000) return `${ms}ms`;
  return `${(ms / 1000).toFixed(1)}s`;
}

function fmtAgo(ms) {
  const mins = Math.floor(ms / 60000);
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

function toCsv(rows) {
  const header = ['id', 'workflow', 'status', 'duration_ms', 'cost_usd', 'steps', 'when'];
  const body = rows.map(r => [
    r.id, r.workflow, r.status, r.durMs ?? '', r.costUSD ?? '',
    `${r.steps.done}/${r.steps.total}`, fmtAgo(r.whenMs),
  ]);
  return [header, ...body].map(line => line.map(v => {
    const s = String(v ?? '');
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  }).join(',')).join('\n');
}

export default function RunsPage() {
  const router = useRouter();
  const [tab, setTab]                 = useState('all');
  const [globalFilter, setGlobalFilter] = useState('');

  const data = useMemo(() => ALL_RUNS.filter(r =>
    tab === 'all'     ? true :
    tab === 'success' ? r.status === 'success' :
    tab === 'running' ? r.status === 'running' :
    r.status === 'error'
  ), [tab]);

  const counts = useMemo(() => ({
    all:     ALL_RUNS.length,
    success: ALL_RUNS.filter(r => r.status === 'success').length,
    running: ALL_RUNS.filter(r => r.status === 'running').length,
    failed:  ALL_RUNS.filter(r => r.status === 'error').length,
  }), []);

  const columns = useMemo(() => ([
    {
      id: 'run',
      accessorFn: (r) => r.id,
      header: 'Run',
      cell: ({ row }) => <span className="font-mono text-[12px] text-foreground">{row.original.id}</span>,
      // Global filter hits id + workflow
      filterFn: (row, _colId, q) => {
        if (!q) return true;
        const s = String(q).toLowerCase();
        return row.original.id.toLowerCase().includes(s) || row.original.workflow.toLowerCase().includes(s);
      },
    },
    {
      id: 'workflow',
      accessorFn: (r) => r.workflow,
      header: 'Workflow',
      cell: ({ getValue }) => <span className="text-foreground">{getValue()}</span>,
    },
    {
      id: 'status',
      accessorFn: (r) => r.status,
      header: 'Status',
      cell: ({ getValue }) => <StatusPill status={getValue()} />,
    },
    {
      id: 'steps',
      accessorFn: (r) => r.steps.done / r.steps.total,
      header: 'Steps',
      cell: ({ row }) => {
        const s = row.original.steps;
        return (
          <span className={`font-mono text-[12px] ${s.error ? 'text-destructive' : 'text-muted-foreground'}`}>
            {s.done}/{s.total}{s.error ? ' · failed' : ''}
          </span>
        );
      },
    },
    {
      id: 'duration',
      accessorFn: (r) => r.durMs ?? -1,
      header: 'Duration',
      meta: { align: 'right' },
      cell: ({ row }) => <span className="tabular-nums font-mono text-[12px] text-muted-foreground">{fmtMs(row.original.durMs)}</span>,
    },
    {
      id: 'cost',
      accessorFn: (r) => r.costUSD ?? -1,
      header: 'Cost',
      meta: { align: 'right' },
      cell: ({ row }) => (
        <span className="tabular-nums font-mono text-[12px] text-muted-foreground">
          {row.original.costUSD == null ? '—' : `$${row.original.costUSD.toFixed(3)}`}
        </span>
      ),
    },
    {
      id: 'when',
      accessorFn: (r) => r.whenMs,
      header: 'When',
      meta: { align: 'right' },
      cell: ({ row }) => <span className="tabular-nums font-mono text-[12px] text-muted-foreground">{fmtAgo(row.original.whenMs)}</span>,
    },
  ]), []);

  const downloadCsv = () => {
    const blob = new Blob([toCsv(data)], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `runs-${tab}-${new Date().toISOString().slice(0,10)}.csv`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-10 py-6 sm:py-8">
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
        <div>
          <div className="text-[10.5px] uppercase tracking-[0.2em] text-muted-foreground font-mono">Observability</div>
          <h1 className="mt-1 text-[28px] font-semibold tracking-tight">Runs</h1>
          <p className="mt-1 text-[13.5px] text-muted-foreground">Every execution, fully traced. Click any row to inspect.</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={downloadCsv}>
            <Download className="h-3.5 w-3.5" /> Export CSV
          </Button>
        </div>
      </div>

      {/* Status tabs */}
      <Tabs value={tab} onValueChange={setTab} className="mt-6">
        <TabsList className="h-9 bg-muted/60">
          <TabsTrigger value="all" className="text-[12.5px]">
            All <Badge variant="outline" className="ml-1.5 text-[9.5px] font-mono">{counts.all}</Badge>
          </TabsTrigger>
          <TabsTrigger value="success" className="text-[12.5px]">
            Success <Badge variant="outline" className="ml-1.5 text-[9.5px] font-mono">{counts.success}</Badge>
          </TabsTrigger>
          <TabsTrigger value="running" className="text-[12.5px]">
            Running <Badge variant="outline" className="ml-1.5 text-[9.5px] font-mono">{counts.running}</Badge>
          </TabsTrigger>
          <TabsTrigger value="failed" className="text-[12.5px]">
            Failed <Badge variant="outline" className="ml-1.5 text-[9.5px] font-mono">{counts.failed}</Badge>
          </TabsTrigger>
        </TabsList>
      </Tabs>

      <Card className="mt-4">
        <CardContent className="p-4 sm:p-5">
          <DataTable
            columns={columns}
            data={data}
            globalFilter={globalFilter}
            onGlobalFilterChange={setGlobalFilter}
            onRowClick={(r) => router.push(`/app/runs/${r.id}?agent=${r.agentId}`)}
            minWidth="min-w-[880px]"
            emptyMessage="No runs match these filters."
            initialSorting={[{ id: 'when', desc: false }]}
            toolbar={
              <div className="relative w-full sm:w-80">
                <Search className="h-3.5 w-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <Input
                  value={globalFilter}
                  onChange={(e) => setGlobalFilter(e.target.value)}
                  placeholder="Search runs by ID or workflow…"
                  className="pl-9 h-8 text-[12.5px]"
                />
              </div>
            }
          />
        </CardContent>
      </Card>
    </div>
  );
}
