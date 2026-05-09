'use client';

import { useRouter } from 'next/navigation';
import { useMemo, useState } from 'react';
import { Search, Download, Webhook, Clock, Hand, Zap } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from '@/components/ui/tooltip';
import { DataTable } from '@/components/tables/DataTable';
import { FacetFilterBar } from '@/components/tables/FacetFilter';

/* -----------------------------------------------------------
   Seed — runs are tied to agent ids so the trace page can resolve
   the agent's config for rendering APM-style traces. Each row also
   carries the dimensions an operator actually triages on: model,
   trigger, environment, token usage, and how many policy gates
   fired during the run.
----------------------------------------------------------- */
const AGENT_POOL = [
  { id: 'agt_data_analyst', label: 'Data Analyst' },
  { id: 'agt_invoiceq',     label: 'Invoice triage' },
  { id: 'agt_kycverify',    label: 'KYC verification' },
  { id: 'agt_redliner',     label: 'Contract redliner' },
];

const MODEL_POOL = [
  'claude-sonnet-4-6',
  'claude-haiku-4-5',
  'gpt-4o',
  'gpt-4o-mini',
];

const TRIGGER_POOL = ['webhook', 'schedule', 'manual', 'event'];
const ENV_POOL     = ['prod', 'staging', 'dev'];

const ALL_RUNS = Array.from({ length: 42 }).map((_, i) => {
  // Biased toward Data Analyst so the trace view demos the rich shape often.
  const biased = i % 4 === 3 ? AGENT_POOL[(i / 4 | 0) % AGENT_POOL.length] : AGENT_POOL[0];
  const agent = i < 18 ? AGENT_POOL[0] : biased;
  const statuses  = ['success', 'success', 'success', 'success', 'running', 'error'];
  const status = statuses[i % statuses.length];
  const total = 14;
  const durMs = status === 'running' ? null : Math.round((1 + ((i * 37) % 100) / 12) * 1000);

  // Deterministic but varied — keeps the demo reproducible.
  const model   = MODEL_POOL[(i * 7) % MODEL_POOL.length];
  const trigger = TRIGGER_POOL[(i * 11) % TRIGGER_POOL.length];
  const env     = i % 9 === 0 ? 'staging' : i % 13 === 0 ? 'dev' : 'prod';
  const tokensIn  = status === 'running' ? null : 800 + ((i * 137) % 4200);
  const tokensOut = status === 'running' ? null : 200 + ((i * 53)  % 1800);

  // Policy gates fired during the run, broken down by decision tone.
  // Errors pick up at least one block; running rows get partial signal.
  const block    = status === 'error'   ? 1 : (i % 17 === 0 ? 1 : 0);
  const approval = (i % 8 === 0) ? 1 : 0;
  const warn     = (i % 5 === 0) ? (i % 10 === 0 ? 2 : 1) : 0;
  const log      = 4 + ((i * 3) % 5);
  const findings = block + approval + warn;

  return {
    id:       `run_${9500 - i}`,
    agentId:  agent.id,
    workflow: agent.label,
    status,
    durMs,
    costUSD:  status === 'running' ? null : +(((i * 0.0013) % 0.04).toFixed(4)),
    steps:    { done: status === 'error' ? 3 : total, total, error: status === 'error' },
    whenMs:   (i * 3 + 2) * 60 * 1000,
    model,
    trigger,
    env,
    tokensIn,
    tokensOut,
    tokensTotal: (tokensIn || 0) + (tokensOut || 0),
    gates: { block, approval, warn, log },
    findings,
  };
});

const STATUS_TONE = {
  success: 'bg-(--brand-teal)/10 text-brand-teal border-(--brand-teal)/40',
  running: 'bg-primary/10 text-primary border-primary/50',
  error:   'bg-destructive/10 text-destructive border-destructive/50',
};

function StatusPill({ status }) {
  return (
    <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md border text-[11px] font-medium whitespace-nowrap ${STATUS_TONE[status]}`}>
      <span className={`h-1.5 w-1.5 rounded-full ${
        status === 'success' ? 'bg-brand-teal' :
        status === 'running' ? 'bg-primary animate-pulse-dot' :
        'bg-destructive'
      }`} />
      {status}
    </span>
  );
}

const ENV_TONE = {
  prod:    'bg-destructive/10 text-destructive border-destructive/30',
  staging: 'bg-primary/10 text-primary border-primary/30',
  dev:     'bg-muted text-muted-foreground border-border',
};

function EnvPill({ env }) {
  return (
    <span className={`inline-flex items-center px-1.5 py-0.5 rounded border text-[10.5px] font-medium ${ENV_TONE[env] || ENV_TONE.dev}`}>
      {env}
    </span>
  );
}

const TRIGGER_ICON = {
  webhook:  Webhook,
  schedule: Clock,
  manual:   Hand,
  event:    Zap,
};

function TriggerCell({ trigger }) {
  const Icon = TRIGGER_ICON[trigger] || Zap;
  return (
    <span className="inline-flex items-center gap-1.5 text-[12px] text-foreground">
      <Icon className="h-3.5 w-3.5 text-muted-foreground" />
      {trigger}
    </span>
  );
}

function ModelPill({ model }) {
  // Dimmer pill — model is metadata, not a primary signal.
  const family = model.startsWith('claude') ? 'claude'
               : model.startsWith('gpt')    ? 'gpt'
               : 'other';
  const familyTone = {
    claude: 'border-(--brand-teal)/30 text-brand-teal bg-(--brand-teal)/10',
    gpt:    'border-accent/30 text-accent bg-accent/10',
    other:  'border-border text-muted-foreground bg-muted/40',
  }[family];
  return (
    <span className={`inline-flex items-center px-1.5 py-0.5 rounded border text-[10.5px] font-mono ${familyTone}`}>
      {model}
    </span>
  );
}

function TokensCell({ row }) {
  const r = row.original;
  if (r.tokensTotal == null || r.tokensTotal === 0) {
    return <span className="font-mono tabular-nums text-muted-foreground text-[12px]">—</span>;
  }
  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger
          render={
            <span className="font-mono tabular-nums text-foreground text-[12px] cursor-help">
              {r.tokensTotal.toLocaleString()}
            </span>
          }
        />
        <TooltipContent>
          <div className="text-[11.5px] font-mono space-y-0.5">
            <div>{r.tokensIn?.toLocaleString()} in</div>
            <div>{r.tokensOut?.toLocaleString()} out</div>
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

function GatesCell({ gates }) {
  const total = gates.block + gates.approval + gates.warn + gates.log;
  const tone = gates.block > 0 ? 'destructive'
             : gates.approval > 0 ? 'primary'
             : gates.warn > 0 ? 'accent'
             : 'muted';

  if (total === 0) {
    return <span className="font-mono tabular-nums text-muted-foreground text-[12px]">—</span>;
  }

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger
          render={
            <span className={`inline-flex items-center gap-1.5 px-1.5 py-0.5 rounded border text-[10.5px] font-mono font-medium cursor-help whitespace-nowrap
              ${tone === 'destructive' ? 'border-destructive/40 text-destructive bg-destructive/10' :
                tone === 'primary'     ? 'border-primary/40 text-primary bg-primary/10' :
                tone === 'accent'      ? 'border-accent/40 text-accent bg-accent/10' :
                                         'border-border text-muted-foreground bg-muted/40'}`}>
              <span className="tabular-nums">{total}</span>
              {gates.block    > 0 && <span className="text-[9.5px]">·{gates.block}b</span>}
              {gates.approval > 0 && <span className="text-[9.5px]">·{gates.approval}a</span>}
              {gates.warn     > 0 && <span className="text-[9.5px]">·{gates.warn}w</span>}
            </span>
          }
        />
        <TooltipContent>
          <div className="text-[11.5px] font-mono space-y-0.5">
            <div className={gates.block    > 0 ? 'text-destructive' : ''}>Blocked: {gates.block}</div>
            <div className={gates.approval > 0 ? 'text-primary' : ''}>Approvals: {gates.approval}</div>
            <div className={gates.warn     > 0 ? 'text-accent' : ''}>Warnings: {gates.warn}</div>
            <div className="opacity-80">Logged: {gates.log}</div>
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
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
  const header = ['n', 'id', 'workflow', 'agent_id', 'status', 'env', 'trigger', 'model',
                  'duration_ms', 'tokens_in', 'tokens_out', 'cost_usd',
                  'gates_total', 'gates_block', 'gates_approval', 'gates_warn', 'gates_log',
                  'findings', 'steps', 'when_ago'];
  const body = rows.map((r, i) => [
    i + 1, r.id, r.workflow, r.agentId, r.status, r.env, r.trigger, r.model,
    r.durMs ?? '', r.tokensIn ?? '', r.tokensOut ?? '', r.costUSD ?? '',
    (r.gates.block + r.gates.approval + r.gates.warn + r.gates.log),
    r.gates.block, r.gates.approval, r.gates.warn, r.gates.log,
    r.findings,
    `${r.steps.done}/${r.steps.total}`,
    fmtAgo(r.whenMs),
  ]);
  return [header, ...body].map(line => line.map(v => {
    const s = String(v ?? '');
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  }).join(',')).join('\n');
}

const STATUS_OPTIONS  = [
  { value: 'success', label: 'Success', color: 'var(--brand-teal)'   },
  { value: 'running', label: 'Running', color: 'var(--primary)'      },
  { value: 'error',   label: 'Error',   color: 'var(--destructive)'  },
];
const TRIGGER_OPTIONS = TRIGGER_POOL.map(t => ({ value: t, label: t }));
const ENV_OPTIONS     = ENV_POOL.map(e => ({ value: e, label: e }));

export default function RunsPage() {
  const router = useRouter();
  const [globalFilter, setGlobalFilter] = useState('');
  const [statusSel, setStatusSel]   = useState(new Set());
  const [agentSel, setAgentSel]     = useState(new Set());
  const [triggerSel, setTriggerSel] = useState(new Set());
  const [envSel, setEnvSel]         = useState(new Set());
  const [modelSel, setModelSel]     = useState(new Set());

  const data = useMemo(() => ALL_RUNS.filter(r => {
    if (statusSel.size  > 0 && !statusSel.has(r.status))   return false;
    if (agentSel.size   > 0 && !agentSel.has(r.agentId))   return false;
    if (triggerSel.size > 0 && !triggerSel.has(r.trigger)) return false;
    if (envSel.size     > 0 && !envSel.has(r.env))         return false;
    if (modelSel.size   > 0 && !modelSel.has(r.model))     return false;
    return true;
  }), [statusSel, agentSel, triggerSel, envSel, modelSel]);

  // Triage stats over the filtered set
  const stats = useMemo(() => {
    const totalRuns   = data.length;
    const successes   = data.filter(r => r.status === 'success').length;
    const failures    = data.filter(r => r.status === 'error').length;
    const successRate = totalRuns === 0 ? 0 : successes / totalRuns;
    const totalCost   = data.reduce((s, r) => s + (r.costUSD || 0), 0);
    const totalFindings = data.reduce((s, r) => s + r.findings, 0);
    return { totalRuns, successes, failures, successRate, totalCost, totalFindings };
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
      size: 48,
    },
    {
      id: 'run',
      accessorFn: (r) => r.id,
      header: 'Run',
      cell: ({ row }) => (
        <div className="min-w-0">
          <div className="font-mono text-[12px] text-foreground truncate">{row.original.id}</div>
          <div className="text-[11px] text-muted-foreground truncate">{row.original.workflow}</div>
        </div>
      ),
      filterFn: (row, _colId, q) => {
        if (!q) return true;
        const s = String(q).toLowerCase();
        return row.original.id.toLowerCase().includes(s) || row.original.workflow.toLowerCase().includes(s);
      },
    },
    {
      id: 'status',
      accessorFn: (r) => r.status,
      header: 'Status',
      cell: ({ getValue }) => <StatusPill status={getValue()} />,
      enableGlobalFilter: false,
    },
    {
      id: 'env',
      accessorFn: (r) => r.env,
      header: 'Env',
      cell: ({ getValue }) => <EnvPill env={getValue()} />,
      enableGlobalFilter: false,
    },
    {
      id: 'trigger',
      accessorFn: (r) => r.trigger,
      header: 'Trigger',
      cell: ({ row }) => <TriggerCell trigger={row.original.trigger} />,
      enableGlobalFilter: false,
    },
    {
      id: 'model',
      accessorFn: (r) => r.model,
      header: 'Model',
      cell: ({ getValue }) => <ModelPill model={getValue()} />,
      enableGlobalFilter: false,
    },
    {
      id: 'duration',
      accessorFn: (r) => r.durMs ?? -1,
      header: 'Duration',
      meta: { align: 'right' },
      cell: ({ row }) => (
        <span className="tabular-nums font-mono text-[12px] text-foreground">{fmtMs(row.original.durMs)}</span>
      ),
    },
    {
      id: 'tokens',
      accessorFn: (r) => r.tokensTotal ?? -1,
      header: 'Tokens',
      meta: { align: 'right' },
      cell: ({ row }) => <TokensCell row={row} />,
      enableGlobalFilter: false,
    },
    {
      id: 'cost',
      accessorFn: (r) => r.costUSD ?? -1,
      header: 'Cost',
      meta: { align: 'right' },
      cell: ({ row }) => (
        <span className="tabular-nums font-mono text-[12px] text-foreground">
          {row.original.costUSD == null ? '—' : `$${row.original.costUSD.toFixed(3)}`}
        </span>
      ),
      enableGlobalFilter: false,
    },
    {
      id: 'gates',
      accessorFn: (r) => r.gates.block + r.gates.approval + r.gates.warn + r.gates.log,
      header: 'Policy gates',
      cell: ({ row }) => <GatesCell gates={row.original.gates} />,
      enableGlobalFilter: false,
    },
    {
      id: 'findings',
      accessorFn: (r) => r.findings,
      header: 'Findings',
      meta: { align: 'right' },
      cell: ({ row }) => {
        const n = row.original.findings;
        if (n === 0) return <span className="font-mono tabular-nums text-muted-foreground text-[12px]">0</span>;
        const tone = n >= 2 ? 'text-destructive' : 'text-accent';
        return <span className={`font-mono tabular-nums text-[12px] ${tone}`}>{n}</span>;
      },
      enableGlobalFilter: false,
    },
    {
      id: 'steps',
      accessorFn: (r) => r.steps.done / r.steps.total,
      header: 'Steps',
      meta: { align: 'right' },
      cell: ({ row }) => {
        const s = row.original.steps;
        return (
          <span className={`font-mono tabular-nums text-[12px] ${s.error ? 'text-destructive' : 'text-foreground'}`}>
            {s.done}/{s.total}
          </span>
        );
      },
      enableGlobalFilter: false,
    },
    {
      id: 'when',
      accessorFn: (r) => r.whenMs,
      header: 'When',
      meta: { align: 'right' },
      cell: ({ row }) => (
        <span className="tabular-nums font-mono text-[11.5px] text-muted-foreground">{fmtAgo(row.original.whenMs)}</span>
      ),
      enableGlobalFilter: false,
    },
  ]), []);

  const downloadCsv = () => {
    const blob = new Blob([toCsv(data)], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `runs-${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  };

  const agentOptions = useMemo(
    () => AGENT_POOL.map(a => ({ value: a.id, label: a.label })),
    [],
  );
  const modelOptions = useMemo(
    () => MODEL_POOL.map(m => ({ value: m, label: m })),
    [],
  );

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-10 py-7">
      {/* Title row */}
      <div className="flex items-end justify-between mb-5 flex-wrap gap-3">
        <div>
          <h2 className="text-[18px] font-semibold text-foreground">Runs</h2>
          <p className="mt-1 text-[13px] text-muted-foreground max-w-160 leading-relaxed">
            Every agent execution is fully traced. Filter to triage incidents, then click any row to inspect spans, tools, model calls, and policy gates.
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={downloadCsv}>
          <Download className="h-3.5 w-3.5" /> Export
        </Button>
      </div>

      {/* Triage strip */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 mb-5">
        <Stat label="Runs"      value={stats.totalRuns} sub={`of ${ALL_RUNS.length}`} />
        <Stat
          label="Success rate"
          value={`${Math.round(stats.successRate * 100)}%`}
          tone={stats.successRate >= 0.95 ? 'ok' : stats.successRate >= 0.8 ? 'warn' : 'bad'}
        />
        <Stat label="Failures"  value={stats.failures} tone={stats.failures === 0 ? 'ok' : 'bad'} />
        <Stat label="Cost"      value={`$${stats.totalCost.toFixed(2)}`} />
        <Stat
          label="Findings"
          value={stats.totalFindings}
          tone={stats.totalFindings === 0 ? 'ok' : stats.totalFindings > 10 ? 'bad' : 'warn'}
        />
      </div>

      <DataTable
        columns={columns}
        data={data}
        globalFilter={globalFilter}
        onGlobalFilterChange={setGlobalFilter}
        onRowClick={(r) => router.push(`/app/runs/${r.id}?agent=${r.agentId}`)}
        minWidth="min-w-[1280px]"
        emptyMessage="No runs match these filters."
        initialSorting={[{ id: 'when', desc: false }]}
        pageSize={25}
        toolbar={
          <div className="relative w-full max-w-xs">
            <Search className="h-3.5 w-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={globalFilter}
              onChange={(e) => setGlobalFilter(e.target.value)}
              placeholder="Search runs by ID or workflow…"
              className="pl-8 h-8 text-[12.5px]"
            />
          </div>
        }
        filters={
          <FacetFilterBar
            filters={[
              { title: 'Status',  options: STATUS_OPTIONS,  selected: statusSel,  onChange: setStatusSel  },
              { title: 'Agent',   options: agentOptions,    selected: agentSel,   onChange: setAgentSel   },
              { title: 'Trigger', options: TRIGGER_OPTIONS, selected: triggerSel, onChange: setTriggerSel },
              { title: 'Env',     options: ENV_OPTIONS,     selected: envSel,     onChange: setEnvSel     },
              { title: 'Model',   options: modelOptions,    selected: modelSel,   onChange: setModelSel   },
            ]}
            onClearAll={() => {
              setStatusSel(new Set());
              setAgentSel(new Set());
              setTriggerSel(new Set());
              setEnvSel(new Set());
              setModelSel(new Set());
            }}
          />
        }
      />
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
