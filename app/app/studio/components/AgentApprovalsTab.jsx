'use client';

/* The "Approvals" tab inside the Agent inspector.
   Renders a stack of approval-point cards grouped by trigger kind, with a
   preset row at the top and a live preview pane that shows what the human
   will see (and whether the gate would fire) given the current sample input. */

import { useMemo, useState } from 'react';
import {
  APPROVAL_PRESETS,
  channelKind,
  channelValue,
  dryRunApprovals,
  groupApprovals,
  makeChannel,
  makeTrigger,
  renderPreview,
  triggerKind,
  triggerToolId,
} from './_approvals';
import { AGENT_TOOL_CATALOG } from './node-kinds';

const inputCls    = "w-full px-2.5 py-1.5 bg-background border border-border rounded-md text-[12px] text-foreground placeholder:text-muted-foreground/60 focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all";
const textareaCls = "w-full px-2.5 py-1.5 bg-background border border-border rounded-md text-[11.5px] text-foreground font-mono placeholder:text-muted-foreground/60 focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all resize-none";
const selectCls   = "w-full px-2 py-1.5 bg-background border border-border rounded-md text-[12px] text-foreground focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20";

const KIND_META = {
  before_run:  { label: 'Pre-flight gate',     hint: 'before the agent starts',          tone: 'primary' },
  before_tool: { label: 'Tool guardrail',      hint: 'pause mid-loop on a tool',         tone: 'accent'  },
  after_run:   { label: 'Post-flight review',  hint: 'review proposed result',           tone: 'primary' },
  on_demand:   { label: 'Clarifying question', hint: 'agent asks, human answers',        tone: 'accent'  },
};

/* ───────────── presets row ───────────── */

function PresetButtons({ onAdd }) {
  return (
    <div className="grid grid-cols-2 gap-2">
      {APPROVAL_PRESETS.map(p => (
        <button
          key={p.id}
          type="button"
          onClick={() => onAdd(p.template())}
          className="text-left rounded-md border border-border bg-panel2 hover:bg-panel hover:border-primary/40 transition-colors px-2.5 py-2"
        >
          <div className="text-[12px] font-medium text-foreground">{p.label}</div>
          <div className="text-[10.5px] text-muted-foreground mt-0.5 leading-snug">{p.desc}</div>
        </button>
      ))}
    </div>
  );
}

/* ───────────── single card ───────────── */

function ChannelEditor({ channel, onChange }) {
  const kind  = channelKind(channel);
  const value = channelValue(channel);
  return (
    <div className="grid grid-cols-[110px_1fr] gap-2">
      <select value={kind} onChange={(e) => onChange(makeChannel(e.target.value, value))} className={selectCls}>
        <option value="queue">in-app</option>
        <option value="slack">Slack</option>
        <option value="email">Email</option>
      </select>
      <input
        value={value}
        onChange={(e) => onChange(makeChannel(kind, e.target.value))}
        placeholder={kind === 'slack' ? '#channel' : kind === 'email' ? 'addr@corp' : 'queue name'}
        className={inputCls}
      />
    </div>
  );
}

/* Editable comma-separated list (for fields_editable / approvers if multi). */
function CsvInput({ value, onChange, placeholder }) {
  return (
    <input
      value={(value || []).join(', ')}
      onChange={(e) => onChange(e.target.value.split(',').map(s => s.trim()).filter(Boolean))}
      placeholder={placeholder}
      className={inputCls + ' font-mono'}
    />
  );
}

/* The condition builder. Most users get a guided form; power users can flip
   to raw expression mode. We keep both views in sync — the form *parses* the
   expression on entry; if it can't, we lock to raw mode. */
function ConditionEditor({ value, onChange }) {
  const [mode, setMode] = useState(() => detectMode(value));
  const guided = useMemo(() => parseGuided(value), [value]);

  const toForm = () => {
    if (guided.ok) setMode('form');
    else setMode('raw');
  };

  if (mode === 'raw' || !guided.ok) {
    return (
      <div className="space-y-1.5">
        <textarea
          rows={2}
          value={value || ''}
          onChange={(e) => onChange(e.target.value)}
          placeholder="empty = always require · e.g. context.amount > 10000"
          className={textareaCls}
        />
        <div className="flex items-center justify-between text-[10.5px] font-mono">
          <span className="text-muted-foreground">raw expression</span>
          <button type="button" onClick={toForm} className="text-primary hover:underline">simple form ↗</button>
        </div>
      </div>
    );
  }

  const { path, op, rhs } = guided.parsed;
  const set = (patch) => {
    const next = { path, op, rhs, ...patch };
    onChange(buildExpr(next));
  };

  return (
    <div className="space-y-1.5">
      <div className="grid grid-cols-[1fr_70px_1fr] gap-1.5">
        <input
          value={path}
          onChange={(e) => set({ path: e.target.value })}
          className={inputCls + ' font-mono'}
          placeholder="context.amount"
        />
        <select value={op} onChange={(e) => set({ op: e.target.value })} className={selectCls + ' font-mono'}>
          {['==','!=','>','>=','<','<=','exists'].map(o => <option key={o} value={o}>{o}</option>)}
        </select>
        <input
          value={rhs}
          onChange={(e) => set({ rhs: e.target.value })}
          className={inputCls + ' font-mono'}
          placeholder='10000 or "string"'
          disabled={op === 'exists'}
        />
      </div>
      <div className="flex items-center justify-between text-[10.5px] font-mono">
        <span className="text-muted-foreground">simple form</span>
        <button type="button" onClick={() => setMode('raw')} className="text-primary hover:underline">raw expression ↗</button>
      </div>
    </div>
  );
}

function detectMode(expr) {
  if (!expr || !expr.trim()) return 'form';
  return parseGuided(expr).ok ? 'form' : 'raw';
}

function parseGuided(expr) {
  if (!expr || !expr.trim()) return { ok: true, parsed: { path: 'context.', op: '==', rhs: '' } };
  // Single comparison only
  const m = expr.trim().match(/^([a-zA-Z0-9_.]+)\s*(==|!=|>=|<=|>|<)\s*(.+)$/);
  if (m) return { ok: true, parsed: { path: m[1], op: m[2], rhs: m[3].trim() } };
  // Bareword → exists check
  if (/^[a-zA-Z0-9_.]+$/.test(expr.trim())) return { ok: true, parsed: { path: expr.trim(), op: 'exists', rhs: '' } };
  return { ok: false };
}

function buildExpr({ path, op, rhs }) {
  if (!path || !path.trim()) return '';
  if (op === 'exists') return path.trim();
  if (rhs == null || rhs === '') return path.trim();
  return `${path.trim()} ${op} ${rhs}`.trim();
}

function ApprovalCard({ approval, idx, total, expanded, onToggle, onChange, onMove, onRemove, dryRun, livePreview }) {
  const meta = KIND_META[triggerKind(approval.trigger)] || KIND_META.before_run;
  const fired = dryRun?.fired;
  const tone = !approval.enabled
    ? 'border-border bg-panel2'
    : fired
      ? 'border-primary/60 bg-primary/[0.04]'
      : 'border-border bg-background';

  return (
    <div className={`rounded-md border ${tone}`}>
      {/* Header — clickable to toggle expansion */}
      <button
        type="button"
        onClick={onToggle}
        className="w-full text-left px-3 py-2 flex items-center gap-2"
      >
        <span className={`h-1.5 w-1.5 rounded-full ${fired ? 'bg-primary animate-pulse' : approval.enabled ? 'bg-accent' : 'bg-border'}`} />
        <div className="flex-1 min-w-0">
          <div className="flex items-baseline gap-2 flex-wrap">
            <span className="text-[12.5px] font-medium text-foreground">{meta.label}</span>
            {triggerKind(approval.trigger) === 'before_tool' && (
              <span className="text-[10.5px] font-mono text-muted-foreground">{triggerToolId(approval.trigger) || '—'}</span>
            )}
            {!approval.enabled && <span className="text-[9.5px] uppercase tracking-[0.18em] font-mono text-muted-foreground">disabled</span>}
            {approval.enabled && fired && <span className="text-[9.5px] uppercase tracking-[0.18em] font-mono text-primary">would fire</span>}
          </div>
          <div className="text-[10.5px] text-muted-foreground font-mono truncate">
            {approval.required ? approval.required : 'always required'} · {approval.channel || 'queue:default'}
          </div>
        </div>
        <span className="text-muted-foreground text-[11px]">{expanded ? '▾' : '▸'}</span>
      </button>

      {expanded && (
        <div className="px-3 pb-3 pt-0.5 space-y-3 border-t border-border/70">
          <Row>
            <Lbl>Trigger</Lbl>
            <div className="grid grid-cols-[1fr_1fr] gap-2">
              <select
                value={triggerKind(approval.trigger)}
                onChange={(e) => onChange({ ...approval, trigger: makeTrigger(e.target.value, triggerToolId(approval.trigger)) })}
                className={selectCls}
              >
                <option value="before_run">before_run</option>
                <option value="before_tool">before_tool</option>
                <option value="after_run">after_run</option>
                <option value="on_demand">on_demand</option>
              </select>
              {triggerKind(approval.trigger) === 'before_tool' && (
                <select
                  value={triggerToolId(approval.trigger)}
                  onChange={(e) => onChange({ ...approval, trigger: makeTrigger('before_tool', e.target.value) })}
                  className={selectCls}
                >
                  {AGENT_TOOL_CATALOG.map(t => <option key={t.id} value={t.id}>{t.id}</option>)}
                </select>
              )}
            </div>
          </Row>

          <Row>
            <Lbl>Required</Lbl>
            <ConditionEditor value={approval.required || ''} onChange={(v) => onChange({ ...approval, required: v })} />
            {dryRun?.reason && (
              <div className="text-[10px] font-mono mt-1 text-muted-foreground">
                dry-run: {dryRun.reason} → <span className={fired ? 'text-primary' : 'text-foreground/70'}>{fired ? 'pause' : 'skip'}</span>
              </div>
            )}
          </Row>

          <Row>
            <Lbl>Preview shown to human</Lbl>
            <textarea
              rows={3}
              value={approval.preview || ''}
              onChange={(e) => onChange({ ...approval, preview: e.target.value })}
              placeholder='Approve {{tool}} for {{context.amount}}'
              className={textareaCls}
            />
            {livePreview && (
              <div className="mt-1.5 rounded border border-dashed border-primary/40 bg-primary/3 p-2 text-[11px] font-mono text-foreground/85 whitespace-pre-wrap">
                {livePreview || <span className="italic text-muted-foreground">empty preview</span>}
              </div>
            )}
          </Row>

          <Row>
            <Lbl>Channel</Lbl>
            <ChannelEditor channel={approval.channel} onChange={(v) => onChange({ ...approval, channel: v })} />
          </Row>

          <div className="grid grid-cols-2 gap-3">
            <Row>
              <Lbl>Approvers</Lbl>
              <input
                value={approval.approvers || ''}
                onChange={(e) => onChange({ ...approval, approvers: e.target.value })}
                placeholder="team:operators / @alice"
                className={inputCls + ' font-mono'}
              />
            </Row>
            <Row>
              <Lbl>Timeout (h)</Lbl>
              <input
                type="number"
                value={approval.timeout_h ?? 24}
                onChange={(e) => onChange({ ...approval, timeout_h: parseInt(e.target.value) || 0 })}
                className={inputCls}
              />
            </Row>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Row>
              <Lbl>On timeout</Lbl>
              <select
                value={approval.on_timeout || 'reject'}
                onChange={(e) => onChange({ ...approval, on_timeout: e.target.value })}
                className={selectCls}
              >
                <option value="approve">auto-approve</option>
                <option value="reject">auto-reject</option>
                <option value="escalate">escalate</option>
              </select>
            </Row>
            <Row>
              <Lbl>Decisions</Lbl>
              <CsvInput
                value={approval.decisions}
                onChange={(v) => onChange({ ...approval, decisions: v })}
                placeholder="approve, reject"
              />
            </Row>
          </div>

          <Row>
            <Lbl>Editable fields</Lbl>
            <CsvInput
              value={approval.fields_editable}
              onChange={(v) => onChange({ ...approval, fields_editable: v })}
              placeholder="amount, vendor"
            />
            <div className="text-[10px] font-mono text-muted-foreground mt-1">
              human may edit these `result` fields before approving
            </div>
          </Row>

          <div className="flex items-center justify-between pt-2 border-t border-border/70">
            <div className="flex items-center gap-2">
              <Toggle on={!!approval.enabled} onChange={(on) => onChange({ ...approval, enabled: on })} />
              <span className="text-[11px] text-muted-foreground">enabled</span>
            </div>
            <div className="flex items-center gap-1 text-muted-foreground">
              <button type="button" disabled={idx === 0} onClick={() => onMove(idx, idx - 1)} className="h-6 w-6 rounded hover:bg-muted disabled:opacity-30 disabled:cursor-not-allowed">↑</button>
              <button type="button" disabled={idx === total - 1} onClick={() => onMove(idx, idx + 1)} className="h-6 w-6 rounded hover:bg-muted disabled:opacity-30 disabled:cursor-not-allowed">↓</button>
              <button type="button" onClick={() => onRemove(idx)} className="h-6 px-2 rounded text-destructive hover:bg-destructive/10 text-[11px]">remove</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function Toggle({ on, onChange }) {
  return (
    <button
      type="button"
      onClick={() => onChange(!on)}
      className={`inline-flex items-center h-5 w-9 rounded-full border transition-colors ${on ? 'bg-primary border-primary' : 'bg-background border-border'}`}
    >
      <span className={`inline-block h-3.5 w-3.5 rounded-full bg-panel border border-border transform transition-transform ${on ? 'translate-x-4' : 'translate-x-0.5'}`} />
    </button>
  );
}

function Row({ children }) { return <div>{children}</div>; }
function Lbl({ children }) {
  return <div className="text-[10px] uppercase tracking-[0.16em] font-mono text-muted-foreground mb-1">{children}</div>;
}

/* ───────────── main ───────────── */

export default function AgentApprovalsTab({ approvals, onChange, sampleContext, sampleResult }) {
  const [openIds, setOpenIds] = useState(() => new Set(approvals?.length ? [approvals[0].id] : []));

  const update = (i, next) => {
    const arr = approvals.slice();
    arr[i] = next;
    onChange(arr);
  };
  const remove = (i) => {
    const arr = approvals.filter((_, idx) => idx !== i);
    onChange(arr);
  };
  const move = (from, to) => {
    if (to < 0 || to >= approvals.length) return;
    const arr = approvals.slice();
    const [m] = arr.splice(from, 1);
    arr.splice(to, 0, m);
    onChange(arr);
  };
  const add = (a) => {
    onChange([...(approvals || []), a]);
    setOpenIds(prev => { const n = new Set(prev); n.add(a.id); return n; });
  };
  const toggleOpen = (id) => {
    setOpenIds(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n; });
  };

  // Dry-run + render previews against the supplied sample.
  const dryRunCtx = { context: sampleContext, result: sampleResult, tool: 'sample.tool', tool_args: { sample: true } };
  const sampleKey = JSON.stringify({ sampleContext, sampleResult });
  const dryRun = useMemo(
    () => Object.fromEntries(dryRunApprovals(approvals, dryRunCtx).map(r => [r.id, r])),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [approvals, sampleKey]
  );

  const groups = groupApprovals(approvals);
  const orderedKinds = ['before_run', 'before_tool', 'after_run', 'on_demand'];

  const empty = !approvals?.length;

  return (
    <div className="space-y-4">
      <div className="rounded-md border border-border bg-panel2 px-3 py-2.5">
        <div className="text-[10px] uppercase tracking-[0.18em] font-mono text-muted-foreground">human in the loop</div>
        <div className="mt-1.5 text-[11.5px] text-foreground/80 leading-relaxed">
          Approval points pause the agent and wait for a human decision. They reuse the §1 contract — when one fires, the
          agent&apos;s <span className="font-mono">status</span> becomes <span className="font-mono">needs_human</span> until the human responds.
          The response lands in <span className="font-mono">context.human_response</span> and the loop resumes.
        </div>
      </div>

      <section>
        <div className="text-[10px] uppercase tracking-[0.18em] font-mono text-muted-foreground mb-2">Add an approval</div>
        <PresetButtons onAdd={add} />
      </section>

      {empty ? (
        <div className="rounded-md border border-dashed border-border bg-background px-4 py-6 text-center">
          <div className="text-[12px] font-medium text-foreground">No approval points yet</div>
          <div className="text-[11px] text-muted-foreground mt-1">Pick a preset above. You can mix multiple — pre-flight + tool guardrail + post-flight is a common shape.</div>
        </div>
      ) : (
        <div className="space-y-4">
          {orderedKinds.map(kind => {
            const items = groups[kind];
            if (!items.length) return null;
            return (
              <section key={kind}>
                <div className="flex items-center justify-between mb-1.5">
                  <div className="text-[10px] uppercase tracking-[0.18em] font-mono text-muted-foreground">{KIND_META[kind].label}</div>
                  <div className="text-[10px] text-muted-foreground/70 font-mono">{KIND_META[kind].hint}</div>
                </div>
                <div className="space-y-1.5">
                  {items.map(a => {
                    const idx = approvals.indexOf(a);
                    return (
                      <ApprovalCard
                        key={a.id}
                        approval={a}
                        idx={idx}
                        total={approvals.length}
                        expanded={openIds.has(a.id)}
                        onToggle={() => toggleOpen(a.id)}
                        onChange={(next) => update(idx, next)}
                        onMove={move}
                        onRemove={remove}
                        dryRun={dryRun[a.id]}
                        livePreview={renderPreview(a.preview, dryRunCtx)}
                      />
                    );
                  })}
                </div>
              </section>
            );
          })}
        </div>
      )}
    </div>
  );
}
