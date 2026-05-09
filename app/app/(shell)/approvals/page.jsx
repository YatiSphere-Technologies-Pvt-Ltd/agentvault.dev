'use client';

import { useMemo, useState } from 'react';
import {
  Search, Inbox, Hourglass, Clock, AlertTriangle, CheckCircle2,
  Hand, ShieldAlert, FileLock2, Bot, Forward, Ban, Check,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { DataTable } from '@/components/tables/DataTable';
import { FacetFilterBar } from '@/components/tables/FacetFilter';
import {
  useApprovals, useTimeoutSweep, useMe, bulkDecide,
  TRIGGER_KIND, TRIGGER_TOOL, deadlineState, isOpen, priorityRank,
} from './_store';
import DecisionSheet from './_DecisionSheet';

/* ── visual tokens ───────────────────────────────────────────────── */

const STATUS_OPTIONS = [
  { value: 'pending',    label: 'Pending',    color: 'var(--primary)' },
  { value: 'claimed',    label: 'Claimed',    color: 'var(--accent)' },
  { value: 'approved',   label: 'Approved',   color: 'var(--brand-teal)' },
  { value: 'redirected', label: 'Redirected', color: 'var(--accent)' },
  { value: 'rejected',   label: 'Rejected',   color: 'var(--destructive)' },
  { value: 'expired',    label: 'Expired',    color: 'var(--muted-foreground)' },
  { value: 'escalated',  label: 'Escalated',  color: 'var(--destructive)' },
];

const STATUS_TONE = {
  pending:    'border-primary/40 text-primary bg-primary/10',
  claimed:    'border-accent/50 text-accent bg-accent/10',
  approved:   'border-(--brand-teal)/40 text-brand-teal bg-(--brand-teal)/10',
  rejected:   'border-destructive/40 text-destructive bg-destructive/10',
  expired:    'border-muted-foreground/40 text-muted-foreground bg-muted/40',
  escalated:  'border-destructive/40 text-destructive bg-destructive/10',
  redirected: 'border-accent/50 text-accent bg-accent/10',
};

const TRIGGER_OPTIONS = [
  { value: 'before_run',  label: 'Pre-flight gate' },
  { value: 'before_tool', label: 'Tool guardrail' },
  { value: 'after_run',   label: 'Post-flight review' },
  { value: 'on_demand',   label: 'Clarifying question' },
];

const TRIGGER_ICON = {
  before_run:  ShieldAlert,
  before_tool: Hand,
  after_run:   FileLock2,
  on_demand:   Bot,
};

const PRIORITY_OPTIONS = [
  { value: 'critical', label: 'Critical', color: 'var(--destructive)' },
  { value: 'high',     label: 'High',     color: 'var(--primary)' },
  { value: 'normal',   label: 'Normal' },
  { value: 'low',      label: 'Low' },
];

const PRIORITY_TONE = {
  critical: 'border-destructive/50 text-destructive bg-destructive/10',
  high:     'border-primary/50 text-primary bg-primary/10',
  normal:   'border-border text-muted-foreground bg-muted/40',
  low:      'border-border/60 text-muted-foreground/80 bg-muted/20',
};

/* ── small cells ─────────────────────────────────────────────────── */

function StatusPill({ status }) {
  return (
    <span className={`inline-flex items-center px-1.5 py-0.5 rounded border text-[10.5px] font-medium whitespace-nowrap ${STATUS_TONE[status]}`}>
      {status}
    </span>
  );
}

function PriorityPill({ priority }) {
  return (
    <span className={`inline-flex items-center px-1.5 py-0.5 rounded border text-[10px] font-mono uppercase tracking-[0.12em] ${PRIORITY_TONE[priority]}`}>
      {priority}
    </span>
  );
}

function TriggerCell({ task }) {
  const kind = TRIGGER_KIND(task);
  const Icon = TRIGGER_ICON[kind] || ShieldAlert;
  return (
    <div className="min-w-0">
      <div className="inline-flex items-center gap-1.5 text-[12px] text-foreground">
        <Icon className="h-3.5 w-3.5 text-muted-foreground" />
        {kind === 'before_tool' ? 'Tool guardrail' :
         kind === 'before_run'  ? 'Pre-flight' :
         kind === 'after_run'   ? 'Post-flight' :
                                  'Clarify'}
      </div>
      {kind === 'before_tool' && (
        <div className="text-[10.5px] font-mono text-muted-foreground truncate">
          {TRIGGER_TOOL(task)}
        </div>
      )}
    </div>
  );
}

function DeadlineCell({ task }) {
  const state = deadlineState(task);
  if (state === 'done') {
    return <span className="text-[11.5px] text-muted-foreground/60 font-mono">—</span>;
  }
  const ms = task.deadline_at - Date.now();
  const tone = state === 'expired' || state === 'breaching' ? 'text-destructive'
             : state === 'soon' ? 'text-primary'
             : 'text-foreground';
  return (
    <div className="text-right">
      <div className={`tabular-nums font-mono text-[12px] ${tone}`}>{fmtRel(ms)}</div>
      {state === 'expired' && <div className="text-[10px] font-mono text-destructive/80">past</div>}
    </div>
  );
}

function PreviewCell({ task }) {
  return (
    <div className="min-w-0">
      <div className="text-[12.5px] text-foreground truncate">{task.preview}</div>
      <div className="text-[10.5px] text-muted-foreground font-mono truncate">
        {task.agent_name} · run {task.run_id}
      </div>
    </div>
  );
}

/* ── main page ──────────────────────────────────────────────────── */

const SCOPE_OPTIONS = [
  { id: 'mine',    label: 'Mine' },
  { id: 'team',    label: 'My team' },
  { id: 'all',     label: 'All' },
  { id: 'decided', label: 'Decided' },
];

export default function ApprovalsPage() {
  useTimeoutSweep();
  const me = useMe();
  const tasks = useApprovals();

  const [globalFilter, setGlobalFilter] = useState('');
  const [scope, setScope]               = useState('all');
  const [statusSel, setStatusSel]       = useState(new Set());
  const [triggerSel, setTriggerSel]     = useState(new Set());
  const [agentSel, setAgentSel]         = useState(new Set());
  const [prioritySel, setPrioritySel]   = useState(new Set());
  const [selected, setSelected]         = useState(new Set());

  const [openId, setOpenId] = useState(null);
  const sheetOpen = openId != null;

  // Available agents derived from data
  const agentOptions = useMemo(() => {
    const seen = new Map();
    tasks.forEach(t => seen.set(t.agent_id, t.agent_name));
    return Array.from(seen.entries()).map(([value, label]) => ({ value, label }));
  }, [tasks]);

  // Scope first, facets second
  const scoped = useMemo(() => {
    return tasks.filter(t => {
      if (scope === 'mine')    return isOpen(t) && (t.claimed_by === me || (!t.claimed_by && t.approvers?.includes('me')));
      if (scope === 'team')    return isOpen(t);
      if (scope === 'decided') return !isOpen(t);
      return true;
    });
  }, [tasks, scope, me]);

  const filtered = useMemo(() => scoped.filter(t => {
    if (statusSel.size   > 0 && !statusSel.has(t.status))           return false;
    // 'redirected' is open-from-the-runs-perspective but terminal for the
    // gate, so it surfaces under "Decided" alongside approved/rejected.
    if (triggerSel.size  > 0 && !triggerSel.has(TRIGGER_KIND(t)))   return false;
    if (agentSel.size    > 0 && !agentSel.has(t.agent_id))          return false;
    if (prioritySel.size > 0 && !prioritySel.has(t.priority))       return false;
    return true;
  }), [scoped, statusSel, triggerSel, agentSel, prioritySel]);

  // Stat strip — computed off the *full* set, not filtered, so the numbers
  // don't lie to you when you're inside a filter view.
  const stats = useMemo(() => {
    const open = tasks.filter(isOpen);
    const mine = open.filter(t => t.claimed_by === me);
    const breaching = open.filter(t => deadlineState(t) === 'breaching' || deadlineState(t) === 'expired');
    const expiredToday = tasks.filter(t => t.status === 'expired' && t.decided_at && (Date.now() - t.decided_at) < 24 * 60 * 60_000);
    const decidedToday = tasks.filter(t => t.decided_at && (Date.now() - t.decided_at) < 24 * 60 * 60_000 && t.decided_by !== 'system:timeout');
    return {
      mine: mine.length,
      teamOpen: open.length - mine.length,
      breaching: breaching.length,
      expiredToday: expiredToday.length,
      decidedToday: decidedToday.length,
    };
  }, [tasks, me]);

  const allSelected = filtered.length > 0 && filtered.every(t => selected.has(t.id));
  const toggleSelectAll = () => {
    if (allSelected) setSelected(new Set());
    else setSelected(new Set(filtered.map(t => t.id)));
  };
  const toggleSelect = (id) => {
    const next = new Set(selected);
    next.has(id) ? next.delete(id) : next.add(id);
    setSelected(next);
  };

  const onBulk = (decision) => {
    const ids = Array.from(selected).filter(id => {
      const t = tasks.find(x => x.id === id);
      return t && isOpen(t);
    });
    if (ids.length === 0) return;
    const ok = window.confirm(`${decision === 'approve' ? 'Approve' : 'Reject'} ${ids.length} task${ids.length === 1 ? '' : 's'}?`);
    if (!ok) return;
    bulkDecide(ids, { decision, who: me });
    setSelected(new Set());
  };

  const columns = useMemo(() => ([
    {
      id: 'select',
      header: () => (
        <input
          type="checkbox"
          checked={allSelected}
          onChange={toggleSelectAll}
          aria-label="Select all"
          className="h-3.5 w-3.5 accent-primary cursor-pointer"
        />
      ),
      cell: ({ row }) => (
        <input
          type="checkbox"
          checked={selected.has(row.original.id)}
          onChange={(e) => { e.stopPropagation(); toggleSelect(row.original.id); }}
          onClick={(e) => e.stopPropagation()}
          aria-label="Select"
          className="h-3.5 w-3.5 accent-primary cursor-pointer"
        />
      ),
      enableSorting: false,
      enableGlobalFilter: false,
      enableHiding: false,
      size: 36,
    },
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
      id: 'status',
      accessorFn: (t) => t.status,
      header: 'Status',
      cell: ({ getValue }) => <StatusPill status={getValue()} />,
      enableGlobalFilter: false,
    },
    {
      id: 'priority',
      accessorFn: (t) => priorityRank(t.priority),
      header: 'Priority',
      cell: ({ row }) => <PriorityPill priority={row.original.priority} />,
      enableGlobalFilter: false,
    },
    {
      id: 'trigger',
      accessorFn: (t) => TRIGGER_KIND(t),
      header: 'Trigger',
      cell: ({ row }) => <TriggerCell task={row.original} />,
      enableGlobalFilter: false,
    },
    {
      id: 'agent',
      accessorFn: (t) => t.agent_name,
      header: 'Agent',
      cell: ({ row }) => (
        <div className="min-w-0">
          <div className="text-[12px] text-foreground truncate">{row.original.agent_name}</div>
          <div className="text-[10.5px] font-mono text-muted-foreground truncate">{row.original.agent_id}</div>
        </div>
      ),
    },
    {
      id: 'preview',
      accessorFn: (t) => t.preview,
      header: 'Preview',
      cell: ({ row }) => <PreviewCell task={row.original} />,
    },
    {
      id: 'approvers',
      accessorFn: (t) => t.approvers,
      header: 'Approvers',
      cell: ({ getValue }) => (
        <span className="font-mono text-[11.5px] text-muted-foreground truncate block max-w-40">
          {getValue() || '—'}
        </span>
      ),
      enableGlobalFilter: false,
    },
    {
      id: 'deadline',
      accessorFn: (t) => t.deadline_at ?? Number.MAX_SAFE_INTEGER,
      header: 'Deadline',
      meta: { align: 'right' },
      cell: ({ row }) => <DeadlineCell task={row.original} />,
      enableGlobalFilter: false,
    },
    {
      id: 'created',
      accessorFn: (t) => t.created_at,
      header: 'Created',
      meta: { align: 'right' },
      cell: ({ row }) => (
        <span className="tabular-nums font-mono text-[11.5px] text-muted-foreground">
          {fmtAgo(Date.now() - row.original.created_at)}
        </span>
      ),
      enableGlobalFilter: false,
    },
  ]), [selected, allSelected]);

  const clearAll = () => {
    setStatusSel(new Set());
    setTriggerSel(new Set());
    setAgentSel(new Set());
    setPrioritySel(new Set());
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-10 py-7">
      {/* Title row */}
      <div className="mb-5">
        <div className="flex items-center gap-2 mb-1">
          <Inbox className="h-4 w-4 text-primary" />
          <h2 className="text-[18px] font-semibold text-foreground">Approvals</h2>
        </div>
        <p className="text-[13px] text-muted-foreground max-w-160 leading-relaxed">
          Paused agent steps land here. Triage them, then decide — agents resume the moment
          the decision lands. Decisions, edits, and notes become part of the run's audit trail.
        </p>
      </div>

      {/* Triage strip */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 mb-5">
        <Stat label="Awaiting me"    value={stats.mine}         tone={stats.mine === 0 ? 'ok' : stats.mine > 5 ? 'bad' : 'warn'} icon={<Inbox className="h-3.5 w-3.5" />} />
        <Stat label="Team queue"     value={stats.teamOpen}     tone="default" icon={<Hand className="h-3.5 w-3.5" />} />
        <Stat label="SLA breaching"  value={stats.breaching}    tone={stats.breaching === 0 ? 'ok' : 'bad'} icon={<AlertTriangle className="h-3.5 w-3.5" />} />
        <Stat label="Expired today"  value={stats.expiredToday} tone={stats.expiredToday === 0 ? 'default' : 'bad'} icon={<Clock className="h-3.5 w-3.5" />} />
        <Stat label="Decided today"  value={stats.decidedToday} tone="ok" icon={<CheckCircle2 className="h-3.5 w-3.5" />} />
      </div>

      {/* Scope tabs */}
      <Tabs value={scope} onValueChange={(v) => { setScope(v); setSelected(new Set()); }} className="mb-3">
        <TabsList className="h-9 bg-muted/40">
          {SCOPE_OPTIONS.map(s => (
            <TabsTrigger key={s.id} value={s.id} className="text-[12.5px]">
              {s.label}
              {s.id === 'mine' && stats.mine > 0 && (
                <span className="ml-1.5 inline-flex items-center justify-center h-4 min-w-4 px-1 rounded text-[10px] font-mono tabular-nums bg-primary/15 text-primary">
                  {stats.mine}
                </span>
              )}
            </TabsTrigger>
          ))}
        </TabsList>
      </Tabs>

      {/* Bulk action bar (above the table when something selected) */}
      {selected.size > 0 && (
        <div className="mb-3 flex items-center gap-2 px-3 py-2 rounded-md border border-primary/40 bg-primary/[0.04]">
          <span className="text-[12px] text-foreground">
            <span className="font-mono font-medium text-primary">{selected.size}</span> selected
          </span>
          <span className="text-[11.5px] text-muted-foreground">·</span>
          <Button size="sm" onClick={() => onBulk('approve')} className="bg-(--brand-teal) text-white hover:brightness-110 h-7">
            <Check className="h-3.5 w-3.5" /> Approve
          </Button>
          <Button size="sm" variant="outline" onClick={() => onBulk('reject')} className="border-destructive/40 text-destructive hover:bg-destructive/10 h-7">
            <Ban className="h-3.5 w-3.5" /> Reject
          </Button>
          <button onClick={() => setSelected(new Set())} className="ml-auto text-[11.5px] text-muted-foreground hover:text-foreground">
            Clear selection
          </button>
        </div>
      )}

      <DataTable
        columns={columns}
        data={filtered}
        globalFilter={globalFilter}
        onGlobalFilterChange={setGlobalFilter}
        onRowClick={(t) => setOpenId(t.id)}
        minWidth="min-w-[1240px]"
        emptyMessage={scope === 'mine' ? 'No approvals waiting on you. Nice.' : 'No approvals match these filters.'}
        initialSorting={[{ id: 'deadline', desc: false }]}
        pageSize={25}
        toolbar={
          <div className="relative w-full max-w-xs">
            <Search className="h-3.5 w-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={globalFilter}
              onChange={(e) => setGlobalFilter(e.target.value)}
              placeholder="Search preview, agent, or run id…"
              className="pl-8 h-8 text-[12.5px]"
            />
          </div>
        }
        filters={
          <FacetFilterBar
            filters={[
              { title: 'Status',   options: STATUS_OPTIONS,   selected: statusSel,   onChange: setStatusSel },
              { title: 'Trigger',  options: TRIGGER_OPTIONS,  selected: triggerSel,  onChange: setTriggerSel },
              { title: 'Agent',    options: agentOptions,     selected: agentSel,    onChange: setAgentSel },
              { title: 'Priority', options: PRIORITY_OPTIONS, selected: prioritySel, onChange: setPrioritySel },
            ]}
            onClearAll={clearAll}
          />
        }
      />

      <DecisionSheet
        open={sheetOpen}
        taskId={openId}
        onClose={() => setOpenId(null)}
      />
    </div>
  );
}

function Stat({ label, value, sub, tone = 'default', icon }) {
  const color = tone === 'bad' ? 'text-destructive'
              : tone === 'warn' ? 'text-primary'
              : tone === 'ok' ? 'text-brand-teal'
              : 'text-foreground';
  return (
    <div className="rounded-lg border border-border bg-card p-3">
      <div className="text-[11.5px] font-medium text-muted-foreground inline-flex items-center gap-1.5">
        {icon}
        {label}
      </div>
      <div className="mt-1 flex items-baseline gap-1.5">
        <div className={`text-[22px] font-semibold tabular-nums ${color}`}>{value}</div>
        {sub && <div className="text-[11.5px] text-muted-foreground">{sub}</div>}
      </div>
    </div>
  );
}

function fmtRel(ms) {
  const abs = Math.abs(ms);
  const mins = Math.round(abs / 60_000);
  if (mins < 1) return ms >= 0 ? '< 1m' : 'past';
  if (mins < 60) return `${mins}m${ms < 0 ? ' ago' : ''}`;
  const hrs = Math.floor(mins / 60);
  const remM = mins % 60;
  if (hrs < 24) return remM ? `${hrs}h ${remM}m${ms < 0 ? ' ago' : ''}` : `${hrs}h${ms < 0 ? ' ago' : ''}`;
  const days = Math.floor(hrs / 24);
  return `${days}d${ms < 0 ? ' ago' : ''}`;
}

function fmtAgo(ms) {
  const mins = Math.floor(ms / 60_000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  return `${days}d ago`;
}
