'use client';

/* DecisionSheet — right-side drawer that lets a human decide on a paused
   agent step. Opens from the inbox row click, the run-trace gate panel,
   and the standalone deep-link page (which renders the sheet inline as a
   page). The same component is the source of truth for all three so the
   decision flow is identical no matter how the human got here. */

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import {
  X, Check, Ban, ArrowUpRightFromSquare, AlertTriangle, Clock, ShieldAlert,
  ChevronRight, Hand, ExternalLink, FileLock2, Forward, Pencil, Bot, Hourglass,
  Compass, Wrench, SkipForward, RotateCcw, ArrowRightLeft, Wand2, MessageSquare,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  claim, decide, escalate, extendDeadline, findTask, release, useApprovals, useMe,
  TRIGGER_KIND, TRIGGER_TOOL, isOpen, deadlineState,
} from './_store';

const TRIGGER_META = {
  before_run:  { label: 'Pre-flight gate',     icon: ShieldAlert, hint: 'Approve before the agent starts.' },
  before_tool: { label: 'Tool guardrail',      icon: Hand,        hint: 'Pause mid-loop before a specific tool fires.' },
  after_run:   { label: 'Post-flight review',  icon: FileLock2,   hint: 'Review the agent’s proposed result.' },
  on_demand:   { label: 'Clarifying question', icon: Bot,         hint: 'Agent asked for help mid-loop.' },
};

const PRIORITY_TONE = {
  critical: 'border-destructive/50 text-destructive bg-destructive/10',
  high:     'border-primary/50 text-primary bg-primary/10',
  normal:   'border-border text-muted-foreground bg-muted/40',
  low:      'border-border/60 text-muted-foreground/80 bg-muted/20',
};

const STATUS_TONE = {
  pending:    'border-primary/40 text-primary bg-primary/10',
  claimed:    'border-accent/50 text-accent bg-accent/10',
  approved:   'border-(--brand-teal)/40 text-brand-teal bg-(--brand-teal)/10',
  rejected:   'border-destructive/40 text-destructive bg-destructive/10',
  expired:    'border-muted-foreground/40 text-muted-foreground bg-muted/40',
  escalated:  'border-destructive/40 text-destructive bg-destructive/10',
  redirected: 'border-accent/50 text-accent bg-accent/10',
};

/* ───────────────────── public API ───────────────────── */

export default function DecisionSheet({ open, taskId, onClose }) {
  // Re-resolve the task whenever the store changes so optimistic updates
  // (claim/decide/extend) reflect immediately without re-opening.
  const tasks = useApprovals();
  const task = useMemo(() => tasks.find(t => t.id === taskId) || null, [tasks, taskId]);

  // Body scroll lock + Escape close
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const onKey = (e) => { if (e.key === 'Escape') onClose?.(); };
    window.addEventListener('keydown', onKey);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener('keydown', onKey);
    };
  }, [open, onClose]);

  if (!open || !task) return null;

  return (
    <>
      <button
        type="button"
        aria-label="Close"
        onClick={onClose}
        className="fixed inset-0 z-40 bg-black/40 backdrop-blur-[2px] animate-fade-in"
      />
      <aside
        role="dialog"
        aria-modal="true"
        className="fixed top-0 right-0 z-50 h-full w-full max-w-[640px] bg-card border-l border-border shadow-2xl flex flex-col animate-slide-in-right"
      >
        <DecisionContent task={task} onClose={onClose} />
      </aside>
    </>
  );
}

/* The same body is reused inside the standalone /app/approvals/[id] page,
   exported so it can render full-bleed without the drawer chrome. */

export function DecisionContent({ task, onClose, asPage = false }) {
  const me = useMe();
  const kind = TRIGGER_KIND(task);
  const meta = TRIGGER_META[kind] || TRIGGER_META.before_run;
  const open = isOpen(task);

  const [edits, setEdits] = useState({});
  const [notes, setNotes] = useState('');
  // Steering — these are the channels the agent reads on resume.
  // `guidance` is free text injected at human_response.guidance.
  // `redirect` is a structured alternative the agent runs instead.
  const [guidance, setGuidance] = useState('');
  const [redirect, setRedirect] = useState(null); // see RedirectPicker for shape

  // Reset local edit state when the task identity changes.
  useEffect(() => {
    setEdits({});
    setNotes('');
    setGuidance('');
    setRedirect(null);
  }, [task.id]);

  const canDecide = open && (!task.claimed_by || task.claimed_by === me);
  const claimedByOther = task.claimed_by && task.claimed_by !== me;

  const fields = task.fields_editable || [];
  const editableSource = task.tool_args
    ? task.tool_args
    : task.result && typeof task.result === 'object'
      ? task.result
      : task.context && typeof task.context === 'object'
        ? task.context
        : {};

  const onSubmit = (decision) => {
    decide(task.id, { decision, edits, notes, who: me, guidance, redirect });
  };
  const onSubmitRedirect = () => {
    if (!redirect || (!redirect.kind && !redirect.body)) {
      window.alert('Pick a redirect kind or write a free-text instruction first.');
      return;
    }
    decide(task.id, { decision: 'redirect', edits, notes, who: me, guidance, redirect });
  };

  const onEscalate = () => {
    const to = window.prompt('Escalate to (email or team handle):', 'mlro@latentbridge.com');
    if (!to) return;
    escalate(task.id, to, notes || `Escalated to ${to}.`);
  };

  return (
    <div className="flex flex-col h-full min-h-0">
      {/* ── Header ── */}
      <div className="px-5 py-4 border-b border-border flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md border text-[11px] font-medium ${STATUS_TONE[task.status]}`}>
              {task.status === 'pending' && <Hourglass className="h-3 w-3" />}
              {task.status === 'claimed' && <Hand className="h-3 w-3" />}
              {task.status === 'approved' && <Check className="h-3 w-3" />}
              {task.status === 'rejected' && <Ban className="h-3 w-3" />}
              {task.status === 'expired' && <Clock className="h-3 w-3" />}
              {task.status === 'escalated' && <Forward className="h-3 w-3" />}
              {task.status === 'redirected' && <Compass className="h-3 w-3" />}
              {task.status}
            </span>
            <span className={`inline-flex items-center px-1.5 py-0.5 rounded border text-[10px] font-mono uppercase tracking-[0.12em] ${PRIORITY_TONE[task.priority]}`}>
              {task.priority}
            </span>
            <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md border border-border bg-muted/40 text-[11px] font-medium text-foreground">
              <meta.icon className="h-3 w-3 text-muted-foreground" />
              {meta.label}
            </span>
            {kind === 'before_tool' && (
              <span className="inline-flex items-center px-1.5 py-0.5 rounded border border-accent/40 text-accent bg-accent/10 text-[10.5px] font-mono">
                {TRIGGER_TOOL(task)}
              </span>
            )}
          </div>
          <h2 className="mt-2 text-[16px] font-semibold tracking-tight text-foreground leading-snug">
            {task.agent_name}
          </h2>
          <div className="mt-1 text-[11.5px] text-muted-foreground font-mono flex items-center gap-2 flex-wrap">
            <Link href={`/app/runs/${task.run_id}?agent=${task.agent_id}`} className="text-primary hover:underline inline-flex items-center gap-1">
              {task.run_id} <ExternalLink className="h-3 w-3" />
            </Link>
            <span>·</span>
            <span>{task.agent_id}</span>
          </div>
        </div>
        {onClose && (
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="h-8 w-8 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted flex items-center justify-center shrink-0"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>

      {/* ── Body ── */}
      <div className={`flex-1 ${asPage ? '' : 'overflow-y-auto'} px-5 py-5 space-y-5`}>
        {/* Deadline + claim banner */}
        <DeadlineBanner task={task} me={me} />

        {/* Why this paused */}
        <Section title="Why this paused" hint={meta.hint}>
          {task.required_expr ? (
            <div className="rounded-md border border-border bg-muted/30 px-3 py-2 font-mono text-[12px] text-foreground">
              <span className="text-muted-foreground">required:</span> {task.required_expr}
            </div>
          ) : (
            <div className="text-[12px] text-muted-foreground italic">Always required (no condition).</div>
          )}
          {task.preview && (
            <div className="mt-2 rounded-md border border-dashed border-primary/40 bg-primary/[0.04] px-3 py-2.5 text-[12.5px] text-foreground/90 leading-relaxed whitespace-pre-wrap">
              {task.preview}
            </div>
          )}
        </Section>

        {/* Context */}
        {task.context && (
          <Section title="Context" hint="Snapshot at the moment the gate fired. Read-only.">
            <JsonBlock data={task.context} />
          </Section>
        )}

        {/* Tool call (if before_tool) */}
        {task.tool_args && (
          <Section title="Proposed tool call" hint={`The agent wants to call ${TRIGGER_TOOL(task) || 'a tool'}.`}>
            <EditableJson
              label={TRIGGER_TOOL(task)}
              data={task.tool_args}
              editable={fields}
              edits={edits}
              onChange={setEdits}
              disabled={!canDecide}
            />
          </Section>
        )}

        {/* Proposed result (if after_run) */}
        {task.result && (
          <Section title="Proposed result" hint="What the agent will hand off if approved.">
            <EditableJson
              label="result"
              data={task.result}
              editable={fields}
              edits={edits}
              onChange={setEdits}
              disabled={!canDecide}
            />
          </Section>
        )}

        {/* Policy citations */}
        {task.policy_refs?.length > 0 && (
          <Section title="Policy citations" hint="Why this gate exists.">
            <div className="flex flex-wrap gap-1.5">
              {task.policy_refs.map(ref => (
                <Link
                  key={ref}
                  href={`/app/grc/policies?q=${encodeURIComponent(ref)}`}
                  className="inline-flex items-center gap-1 px-2 py-0.5 rounded border border-border bg-muted/40 text-[10.5px] font-mono text-foreground hover:border-primary/40 hover:text-primary transition-colors"
                >
                  {ref}
                  <ChevronRight className="h-3 w-3 opacity-60" />
                </Link>
              ))}
            </div>
          </Section>
        )}

        {/* Cost / tokens / trace deep-link */}
        <Section title="Run state at pause" hint="Where this run sits when the gate fired.">
          <div className="grid grid-cols-3 gap-2 text-[12px]">
            <Stat label="Tokens" value={(task.tokens || 0).toLocaleString()} />
            <Stat label="Cost so far" value={`$${(task.cost_usd_so_far || 0).toFixed(4)}`} />
            <Stat label="Trace step" value={task.trace_step_id || '—'} mono />
          </div>
          <Link
            href={`/app/runs/${task.run_id}?agent=${task.agent_id}#${task.trace_step_id || ''}`}
            className="mt-2 inline-flex items-center gap-1 text-[11.5px] text-primary hover:underline"
          >
            <ArrowUpRightFromSquare className="h-3 w-3" /> Open in run trace
          </Link>
        </Section>

        {/* Audit trail (terminal states) */}
        {task.decided_at && (
          <Section title="Decision recorded">
            <div className="rounded-md border border-border bg-muted/30 px-3 py-2.5 text-[12px] space-y-1">
              <div>
                <span className="text-muted-foreground">Decision:</span>{' '}
                <span className="font-mono font-medium text-foreground">{task.decision}</span>
              </div>
              <div>
                <span className="text-muted-foreground">By:</span>{' '}
                <span className="font-mono text-foreground">{task.decided_by}</span>{' '}
                <span className="text-muted-foreground">at</span>{' '}
                <span className="font-mono text-foreground">{new Date(task.decided_at).toLocaleString()}</span>
              </div>
              {task.decided_notes && (
                <div className="pt-1 text-foreground/85 italic">"{task.decided_notes}"</div>
              )}
              {task.edited_fields && Object.keys(task.edited_fields).length > 0 && (
                <div className="pt-1">
                  <span className="text-muted-foreground">Edits:</span>
                  <pre className="mt-1 text-[11px] font-mono bg-background border border-border rounded p-2 overflow-x-auto">
                    {JSON.stringify(task.edited_fields, null, 2)}
                  </pre>
                </div>
              )}
              {task.guidance && (
                <div className="pt-1">
                  <span className="text-muted-foreground">Guidance to agent:</span>
                  <div className="mt-1 rounded border border-primary/30 bg-primary/[0.04] px-2 py-1.5 text-[11.5px] text-foreground/90 whitespace-pre-wrap leading-relaxed">
                    {task.guidance}
                  </div>
                </div>
              )}
              {task.redirect && (
                <div className="pt-1">
                  <span className="text-muted-foreground">Redirect:</span>
                  <div className="mt-1">
                    <RedirectAuditCard redirect={task.redirect} />
                  </div>
                </div>
              )}
            </div>
          </Section>
        )}
      </div>

      {/* ── Footer / decision row ── */}
      {open && (
        <div className="border-t border-border bg-muted/20 px-5 py-4 space-y-3">
          {claimedByOther && (
            <div className="flex items-center gap-2 text-[11.5px] text-muted-foreground">
              <AlertTriangle className="h-3.5 w-3.5 text-accent" />
              <span>Claimed by <span className="font-mono">{task.claimed_by}</span></span>
              <button onClick={() => release(task.id)} className="ml-auto text-primary hover:underline text-[11px]">
                Release
              </button>
            </div>
          )}
          {!claimedByOther && task.status === 'pending' && (
            <div className="flex items-center justify-between text-[11.5px]">
              <span className="text-muted-foreground">Unclaimed in queue.</span>
              <button onClick={() => claim(task.id, me)} className="text-primary hover:underline">
                Claim for me
              </button>
            </div>
          )}

          {/* Guide the agent — yes-but / steering input. The textarea is
              always visible because most decisions benefit from a sentence
              of context for the agent. The Redirect picker is collapsed by
              default. */}
          <SteeringPanel
            disabled={!canDecide}
            guidance={guidance}
            onGuidance={setGuidance}
            redirect={redirect}
            onRedirect={setRedirect}
            task={task}
          />

          <textarea
            rows={2}
            placeholder="Decision notes (audit-only, the agent does not read these)"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            disabled={!canDecide}
            className="w-full px-2.5 py-1.5 bg-background border border-border rounded-md text-[12px] text-foreground placeholder:text-muted-foreground/60 focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all resize-none disabled:opacity-50"
          />

          <div className="flex items-center gap-2 flex-wrap">
            {task.decisions.includes('approve') && (
              <Button
                size="sm"
                disabled={!canDecide}
                onClick={() => onSubmit('approve')}
                className="bg-(--brand-teal) text-white hover:brightness-110"
              >
                <Check className="h-3.5 w-3.5" />
                {guidance.trim() ? 'Approve with guidance' : 'Approve & resume'}
              </Button>
            )}
            {task.decisions.includes('answered') && (
              <Button
                size="sm"
                disabled={!canDecide}
                onClick={() => onSubmit('answered')}
              >
                <Check className="h-3.5 w-3.5" /> Send answer
              </Button>
            )}
            {redirect && (redirect.kind || redirect.body) && (
              <Button
                size="sm"
                disabled={!canDecide}
                onClick={onSubmitRedirect}
                className="bg-accent text-accent-foreground hover:brightness-110"
              >
                <Compass className="h-3.5 w-3.5" /> Redirect agent
              </Button>
            )}
            {task.decisions.includes('reject') && (
              <Button
                size="sm"
                variant="outline"
                disabled={!canDecide}
                onClick={() => onSubmit('reject')}
                className="border-destructive/40 text-destructive hover:bg-destructive/10"
              >
                <Ban className="h-3.5 w-3.5" /> Reject & stop
              </Button>
            )}
            <Button size="sm" variant="ghost" disabled={!canDecide} onClick={onEscalate} className="text-muted-foreground">
              <Forward className="h-3.5 w-3.5" /> Escalate…
            </Button>
            <div className="ml-auto flex items-center gap-2 text-[11px] text-muted-foreground">
              <button
                type="button"
                onClick={() => extendDeadline(task.id, 4)}
                className="hover:text-foreground inline-flex items-center gap-1"
                title="Add 4 hours to the deadline"
                disabled={!canDecide}
              >
                <Clock className="h-3 w-3" /> +4h
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/* ───────────────────── small bits ───────────────────── */

function DeadlineBanner({ task }) {
  const state = deadlineState(task);
  if (state === 'done') return null;
  const ms = task.deadline_at - Date.now();
  const tone = state === 'expired' ? 'destructive'
             : state === 'breaching' ? 'destructive'
             : state === 'soon' ? 'primary'
             : 'muted';
  const cls = tone === 'destructive' ? 'border-destructive/40 bg-destructive/10 text-destructive'
            : tone === 'primary'     ? 'border-primary/40 bg-primary/10 text-primary'
            :                          'border-border bg-muted/40 text-muted-foreground';
  return (
    <div className={`rounded-md border px-3 py-2 text-[11.5px] flex items-center gap-2 ${cls}`}>
      <Clock className="h-3.5 w-3.5" />
      <span className="font-mono">
        {state === 'expired' ? 'Past deadline' : 'Deadline in'} {fmtRel(ms)}
      </span>
      <span className="text-muted-foreground">
        · on timeout: <span className="font-mono">{task.on_timeout}</span>
      </span>
    </div>
  );
}

function Section({ title, hint, children }) {
  return (
    <section>
      <div className="flex items-baseline justify-between gap-2 mb-2">
        <div className="text-[10px] uppercase tracking-[0.16em] font-mono text-muted-foreground">{title}</div>
        {hint && <div className="text-[10.5px] text-muted-foreground/80">{hint}</div>}
      </div>
      {children}
    </section>
  );
}

function Stat({ label, value, mono }) {
  return (
    <div className="rounded-md border border-border bg-background px-2.5 py-1.5">
      <div className="text-[10px] uppercase tracking-[0.14em] font-mono text-muted-foreground">{label}</div>
      <div className={`mt-0.5 text-[12.5px] text-foreground tabular-nums ${mono ? 'font-mono' : ''}`}>{value}</div>
    </div>
  );
}

function JsonBlock({ data }) {
  return (
    <pre className="rounded-md border border-border bg-background px-3 py-2 text-[11.5px] font-mono text-foreground/90 overflow-x-auto whitespace-pre-wrap break-words">
      {JSON.stringify(data, null, 2)}
    </pre>
  );
}

function EditableJson({ label, data, editable, edits, onChange, disabled }) {
  const editableSet = new Set(editable || []);
  const entries = Object.entries(data || {});
  return (
    <div className="rounded-md border border-border bg-background overflow-hidden">
      <div className="px-3 py-1.5 bg-muted/40 border-b border-border text-[10.5px] font-mono text-muted-foreground flex items-center gap-2">
        <span>{label}</span>
        {editableSet.size > 0 && (
          <span className="inline-flex items-center gap-1 text-accent">
            <Pencil className="h-3 w-3" /> {editableSet.size} editable
          </span>
        )}
      </div>
      <div className="divide-y divide-border">
        {entries.map(([key, value]) => {
          const isEditable = editableSet.has(key);
          const current = key in edits ? edits[key] : value;
          if (isEditable) {
            return (
              <div key={key} className="px-3 py-2 grid grid-cols-[140px_1fr] gap-2 items-start">
                <div className="text-[11.5px] font-mono text-accent pt-1">{key}</div>
                <input
                  value={String(current ?? '')}
                  onChange={(e) => {
                    const v = typeof value === 'number' && e.target.value !== ''
                      ? Number(e.target.value)
                      : e.target.value;
                    onChange({ ...edits, [key]: Number.isNaN(v) ? e.target.value : v });
                  }}
                  disabled={disabled}
                  className="px-2 py-1 bg-background border border-accent/40 rounded text-[12px] font-mono text-foreground focus:outline-none focus:border-accent focus:ring-2 focus:ring-accent/20 disabled:opacity-50"
                />
              </div>
            );
          }
          return (
            <div key={key} className="px-3 py-2 grid grid-cols-[140px_1fr] gap-2 items-start">
              <div className="text-[11.5px] font-mono text-muted-foreground pt-0.5">{key}</div>
              <div className="text-[11.5px] font-mono text-foreground/90 break-words">
                {typeof value === 'object' ? JSON.stringify(value) : String(value)}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* ───────────── SteeringPanel: guidance + redirect ─────────────
   Sits between the claim banner and the notes box, above the decision
   buttons. Two stacked controls:

     1) Guidance textarea — always visible. The agent injects this string
        into context as `human_response.guidance` when it resumes. Use for
        "yes but…" steering: caps, exceptions, hints, missed context.

     2) Redirect picker — collapsed by default. Pick a structured
        alternative (run a different tool, skip, retry with hint, hand off
        to another agent), or fall through to a free-text instruction.
        When set, the footer surfaces a "Redirect agent" submit button. */

function SteeringPanel({ disabled, guidance, onGuidance, redirect, onRedirect, task }) {
  const [showRedirect, setShowRedirect] = useState(!!redirect);
  return (
    <div className="rounded-md border border-primary/30 bg-primary/[0.04] divide-y divide-primary/15">
      <div className="px-3 py-2.5">
        <div className="flex items-center gap-2 mb-1.5">
          <Wand2 className="h-3.5 w-3.5 text-primary" />
          <span className="text-[11.5px] font-medium text-foreground">Guide the agent</span>
          <span className="text-[10.5px] text-muted-foreground">
            free-text steer the agent reads on resume
          </span>
        </div>
        <textarea
          rows={2}
          placeholder='e.g. "approve, but cap at $10k and flag for review next month"'
          value={guidance}
          onChange={(e) => onGuidance(e.target.value)}
          disabled={disabled}
          className="w-full px-2.5 py-1.5 bg-background border border-border rounded-md text-[12.5px] text-foreground placeholder:text-muted-foreground/60 focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all resize-none disabled:opacity-50"
        />
      </div>
      <div className="px-3 py-2">
        <button
          type="button"
          onClick={() => setShowRedirect(v => !v)}
          disabled={disabled}
          className="w-full flex items-center gap-2 text-left disabled:opacity-50"
        >
          <Compass className="h-3.5 w-3.5 text-accent" />
          <span className="text-[11.5px] font-medium text-foreground">Or redirect the agent…</span>
          <span className="text-[10.5px] text-muted-foreground">
            run a different tool, skip, retry, or hand off
          </span>
          <ChevronRight className={`ml-auto h-3.5 w-3.5 text-muted-foreground transition-transform ${showRedirect ? 'rotate-90' : ''}`} />
        </button>
        {showRedirect && (
          <div className="mt-2.5">
            <RedirectPicker value={redirect} onChange={onRedirect} disabled={disabled} task={task} />
          </div>
        )}
      </div>
    </div>
  );
}

const REDIRECT_KINDS = [
  { id: 'tool',    label: 'Run a different tool', icon: Wrench,         hint: 'Pick a tool from the agent\'s catalog and provide args.' },
  { id: 'skip',    label: 'Skip this step',       icon: SkipForward,    hint: 'Continue with the next planned step.' },
  { id: 'retry',   label: 'Retry with a hint',    icon: RotateCcw,      hint: 'Re-run this step with extra context.' },
  { id: 'handoff', label: 'Hand off',             icon: ArrowRightLeft, hint: 'Route to a different agent or sub-agent.' },
  { id: 'free',    label: 'Free-text instruction',icon: MessageSquare,  hint: 'Tell the agent what to do in plain English.' },
];

function RedirectPicker({ value, onChange, disabled, task }) {
  const kind = value?.kind || null;
  const setKind = (k) => onChange({ kind: k });
  const patch = (p) => onChange({ ...(value || {}), ...p });
  const inputCls = "w-full px-2 py-1 bg-background border border-border rounded text-[12px] text-foreground font-mono focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 disabled:opacity-50";

  return (
    <div className="space-y-2">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
        {REDIRECT_KINDS.map(rk => {
          const Icon = rk.icon;
          const active = kind === rk.id;
          return (
            <button
              key={rk.id}
              type="button"
              onClick={() => setKind(rk.id)}
              disabled={disabled}
              className={`text-left rounded-md border px-2.5 py-2 transition-colors flex items-start gap-2 disabled:opacity-50 ${
                active
                  ? 'border-accent/60 bg-accent/[0.06]'
                  : 'border-border bg-background hover:border-accent/40'
              }`}
            >
              <Icon className={`h-3.5 w-3.5 mt-0.5 shrink-0 ${active ? 'text-accent' : 'text-muted-foreground'}`} />
              <div className="min-w-0">
                <div className={`text-[12px] font-medium ${active ? 'text-foreground' : 'text-foreground/85'}`}>{rk.label}</div>
                <div className="text-[10.5px] text-muted-foreground leading-snug">{rk.hint}</div>
              </div>
            </button>
          );
        })}
      </div>

      {/* Per-kind detail forms */}
      {kind === 'tool' && (
        <div className="space-y-1.5 rounded-md border border-border bg-background p-2.5">
          <Lbl>Tool id</Lbl>
          <input
            value={value?.tool || ''}
            onChange={(e) => patch({ tool: e.target.value })}
            placeholder="e.g. netsuite.bill or web.search"
            className={inputCls}
            disabled={disabled}
          />
          <Lbl>Args (JSON)</Lbl>
          <textarea
            rows={3}
            value={value?.argsRaw ?? (value?.args ? JSON.stringify(value.args, null, 2) : '')}
            onChange={(e) => {
              try {
                const parsed = e.target.value.trim() ? JSON.parse(e.target.value) : null;
                patch({ args: parsed, argsRaw: e.target.value });
              } catch {
                patch({ argsRaw: e.target.value });
              }
            }}
            placeholder='{"vendor":"Acme","amount":10000}'
            className={inputCls + ' resize-none'}
            disabled={disabled}
          />
        </div>
      )}
      {kind === 'skip' && (
        <div className="rounded-md border border-border bg-background p-2.5">
          <Lbl>Why skip (optional)</Lbl>
          <input
            value={value?.body || ''}
            onChange={(e) => patch({ body: e.target.value })}
            placeholder="e.g. PO already posted upstream, no second post needed"
            className={inputCls}
            disabled={disabled}
          />
        </div>
      )}
      {kind === 'retry' && (
        <div className="rounded-md border border-border bg-background p-2.5">
          <Lbl>Hint to add</Lbl>
          <textarea
            rows={2}
            value={value?.hint || ''}
            onChange={(e) => patch({ hint: e.target.value })}
            placeholder="e.g. use the FY-2025 GL chart, not FY-2024"
            className={inputCls + ' resize-none'}
            disabled={disabled}
          />
        </div>
      )}
      {kind === 'handoff' && (
        <div className="space-y-1.5 rounded-md border border-border bg-background p-2.5">
          <Lbl>Target agent</Lbl>
          <input
            value={value?.agent || ''}
            onChange={(e) => patch({ agent: e.target.value })}
            placeholder="e.g. agt_kyc_supervisor or @sara"
            className={inputCls}
            disabled={disabled}
          />
          <Lbl>Why hand off</Lbl>
          <input
            value={value?.body || ''}
            onChange={(e) => patch({ body: e.target.value })}
            placeholder="e.g. needs MLRO review per OFAC policy"
            className={inputCls}
            disabled={disabled}
          />
        </div>
      )}
      {kind === 'free' && (
        <div className="rounded-md border border-border bg-background p-2.5">
          <Lbl>Tell the agent what to do</Lbl>
          <textarea
            rows={3}
            value={value?.body || ''}
            onChange={(e) => patch({ body: e.target.value })}
            placeholder="e.g. don't post to NetSuite, instead draft an email to vendor with the discrepancy and wait for their reply"
            className={inputCls + ' resize-none'}
            disabled={disabled}
          />
        </div>
      )}

      {kind && (
        <button
          type="button"
          onClick={() => onChange(null)}
          disabled={disabled}
          className="text-[11px] text-muted-foreground hover:text-foreground"
        >
          Clear redirect
        </button>
      )}
    </div>
  );
}

function Lbl({ children }) {
  return <div className="text-[10px] uppercase tracking-[0.14em] font-mono text-muted-foreground">{children}</div>;
}

/* Renders a stored redirect for the audit trail. Accepts the same shape
   RedirectPicker writes; collapses to one-liner where it can. */
function RedirectAuditCard({ redirect }) {
  const r = redirect || {};
  if (r.kind === 'tool') {
    return (
      <div className="rounded border border-accent/40 bg-accent/5 px-2 py-1.5 text-[11.5px] font-mono">
        <div className="text-accent">run tool · <span className="text-foreground">{r.tool || '—'}</span></div>
        {r.args && (
          <pre className="mt-1 text-[11px] text-foreground/85 whitespace-pre-wrap break-words">
            {JSON.stringify(r.args, null, 2)}
          </pre>
        )}
      </div>
    );
  }
  if (r.kind === 'skip') {
    return (
      <div className="rounded border border-accent/40 bg-accent/5 px-2 py-1.5 text-[11.5px]">
        <span className="font-mono text-accent">skip step</span>
        {r.body && <span className="text-foreground/85"> — {r.body}</span>}
      </div>
    );
  }
  if (r.kind === 'retry') {
    return (
      <div className="rounded border border-accent/40 bg-accent/5 px-2 py-1.5 text-[11.5px]">
        <div className="font-mono text-accent">retry with hint</div>
        {r.hint && <div className="text-foreground/85 italic mt-0.5">"{r.hint}"</div>}
      </div>
    );
  }
  if (r.kind === 'handoff') {
    return (
      <div className="rounded border border-accent/40 bg-accent/5 px-2 py-1.5 text-[11.5px]">
        <div className="font-mono text-accent">hand off → <span className="text-foreground">{r.agent || '—'}</span></div>
        {r.body && <div className="text-foreground/85 italic mt-0.5">"{r.body}"</div>}
      </div>
    );
  }
  return (
    <div className="rounded border border-accent/40 bg-accent/5 px-2 py-1.5 text-[11.5px]">
      <div className="font-mono text-accent">free-text instruction</div>
      {r.body && <div className="text-foreground/85 mt-0.5 whitespace-pre-wrap">{r.body}</div>}
    </div>
  );
}

function fmtRel(ms) {
  const abs = Math.abs(ms);
  const mins = Math.round(abs / 60_000);
  if (mins < 1) return ms >= 0 ? '< 1m' : '— moments ago';
  if (mins < 60) return `${mins}m`;
  const hrs = Math.floor(mins / 60);
  const remM = mins % 60;
  if (hrs < 24) return remM ? `${hrs}h ${remM}m` : `${hrs}h`;
  const days = Math.floor(hrs / 24);
  return `${days}d`;
}
