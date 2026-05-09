'use client';

/* Autonomous Agent inspector. The agent is a *loop*, not a single LLM call:
   it picks tools at runtime, observes results, and keeps going until a
   termination condition fires. The inspector is organised around that mental
   model:
     • Goal     — one-line objective the agent tries to satisfy each invocation
     • Tools    — pickable registry of capabilities
     • Config   — model + loop control + ops
     • I/O      — variables in / output schema (loop trace shape)
     • Test     — run the agent in isolation and *watch* its loop unfold
     • Runs     — recent invocations
*/

import { useEffect, useMemo, useRef, useState } from 'react';
import {
  AGENT_TOOL_CATALOG,
  findModel,
  findTool,
  getOutputSchema,
  groupedTools,
  LLM_PROVIDERS,
} from './node-kinds';
import { describeSchema, parseSchema, sampleFromSchema, validate } from './_agentSchema';
import { dryRunApprovals, evalRequired, renderPreview, triggerKind, triggerToolId } from './_approvals';
import AgentApprovalsTab from './AgentApprovalsTab';
import { estimateTokens, getAvailableVars } from './_workflowVars';

const inputCls    = "w-full px-2.5 py-1.5 bg-background border border-border rounded-md text-[12px] text-foreground placeholder:text-muted-foreground/60 focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all";
const textareaCls = "w-full px-2.5 py-1.5 bg-background border border-border rounded-md text-[11.5px] text-foreground font-mono placeholder:text-muted-foreground/60 focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all resize-none";
const selectCls   = "w-full px-2 py-1.5 bg-background border border-border rounded-md text-[12px] text-foreground focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20";

function Field({ label, hint, children }) {
  return (
    <label className="block">
      <div className="flex items-center justify-between mb-1">
        <span className="text-[10.5px] uppercase tracking-[0.15em] text-muted-foreground font-medium">{label}</span>
        {hint && <span className="text-[10px] text-muted-foreground/80 font-mono">{hint}</span>}
      </div>
      {children}
    </label>
  );
}

function Toggle({ on, onChange }) {
  return (
    <button
      type="button"
      onClick={() => onChange(!on)}
      className={`inline-flex items-center h-6 w-11 rounded-full border transition-colors ${on ? 'bg-primary border-primary' : 'bg-background border-border'}`}
    >
      <span className={`inline-block h-4 w-4 rounded-full bg-panel border border-border transform transition-transform ${on ? 'translate-x-6' : 'translate-x-1'}`} />
    </button>
  );
}

function Stat({ label, value }) {
  return (
    <div className="px-2 py-1.5 rounded-md border border-border bg-background">
      <div className="text-[9.5px] uppercase tracking-[0.16em] font-mono text-muted-foreground">{label}</div>
      <div className="text-[12.5px] font-mono text-foreground tabular-nums">{value}</div>
    </div>
  );
}

/* ───────────────────────── tools picker ───────────────────────── */

function ToolsPicker({ selected, onChange }) {
  const [search, setSearch] = useState('');
  const groups = useMemo(() => groupedTools(), []);
  const selSet = useMemo(() => new Set(selected || []), [selected]);

  const toggle = (id) => {
    const next = selSet.has(id) ? selected.filter(x => x !== id) : [...(selected || []), id];
    onChange(next);
  };

  const matches = (t) => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return t.label.toLowerCase().includes(q) || t.desc.toLowerCase().includes(q) || t.id.toLowerCase().includes(q);
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-2">
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search tools…"
          className={inputCls + ' max-w-[220px]'}
        />
        <div className="text-[10.5px] font-mono text-muted-foreground">
          {selected?.length || 0} / {AGENT_TOOL_CATALOG.length} selected
        </div>
      </div>

      {Object.entries(groups).map(([group, tools]) => {
        const visible = tools.filter(matches);
        if (visible.length === 0) return null;
        return (
          <div key={group}>
            <div className="text-[10px] uppercase tracking-[0.18em] font-mono text-muted-foreground mb-1.5">{group}</div>
            <div className="space-y-1.5">
              {visible.map(t => {
                const on = selSet.has(t.id);
                return (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => toggle(t.id)}
                    className={`w-full text-left px-2.5 py-2 rounded-md border transition-colors ${
                      on
                        ? 'border-primary/60 bg-primary/5'
                        : 'border-border bg-background hover:border-primary/40 hover:bg-primary/[0.03]'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <span className="text-[12px] font-medium text-foreground">{t.label}</span>
                          <span className="text-[10px] font-mono text-muted-foreground">{t.id}</span>
                        </div>
                        <div className="text-[11px] text-muted-foreground mt-0.5">{t.desc}</div>
                        <div className="text-[10px] font-mono text-foreground/60 mt-1 truncate">args: <span className="text-primary/80">{t.args}</span></div>
                      </div>
                      <div className={`shrink-0 mt-0.5 h-4 w-4 rounded-sm border flex items-center justify-center text-[10px] ${
                        on ? 'border-primary bg-primary text-primary-foreground' : 'border-border bg-panel'
                      }`}>
                        {on ? '✓' : ''}
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}

/* ───────────────────────── mock loop runner ───────────────────────── */

/* Synthesise a plausible agent loop: pick a few registered tools, alternate
   think → call → observe steps, end with a "done" marker. The output obeys
   the §1 contract: { status, result, handoff?, reasoning?, usage, trace }.

   Approval points are inlined as `awaiting_human` steps at the right spot —
   pre-flight gates land first, tool guardrails interrupt before their tool,
   on_demand fires after a random think, and post-flight runs after `done`.
   The Test panel pauses on these and the user resolves them inline. */
function simulateAgentLoop(params, contextObj) {
  const tools = (params.tools || []).map(id => findTool(id)).filter(Boolean);
  const maxSteps = Math.max(2, Math.min(params.max_steps || 8, 12));
  const planSize = Math.min(maxSteps - 2, Math.max(2, Math.floor(Math.random() * 3) + 2), tools.length || 2);
  const chosen = tools.length ? shuffle(tools).slice(0, planSize) : [];

  const steps = [];
  const usage = { input_tokens: 0, output_tokens: 0, cost_usd: 0 };
  const goal = resolveTemplate(params.goal || '', { context: contextObj });

  // Pre-bin approvals by trigger so the loop can inject them in place.
  const allApprovals = (params.approvals || []).filter(a => a.enabled);
  const preflight   = allApprovals.filter(a => triggerKind(a.trigger) === 'before_run');
  const postflight  = allApprovals.filter(a => triggerKind(a.trigger) === 'after_run');
  const onDemand    = allApprovals.filter(a => triggerKind(a.trigger) === 'on_demand');
  const toolGates   = allApprovals.filter(a => triggerKind(a.trigger) === 'before_tool');
  const gateForTool = (toolId) => toolGates.find(a => triggerToolId(a.trigger) === toolId);

  // Pre-flight gates — evaluated against context only (result not known yet).
  for (const ap of preflight) {
    const evalCtx = { context: contextObj, result: null, tool: null, tool_args: null };
    if (!evalRequired(ap.required, evalCtx)) continue;
    steps.push({
      type: 'awaiting_human',
      approval_id: ap.id,
      approval: ap,
      preview: renderPreview(ap.preview, evalCtx),
      phase: 'before_run',
      latency_ms: 0, // resolved by user
    });
  }

  steps.push({
    type: 'think',
    text: chosen.length
      ? `Goal: "${shorten(goal, 80)}". I'll start with ${chosen[0]?.label.toLowerCase()} to gather signal.`
      : `Goal: "${shorten(goal, 80)}". No tools registered — answering from context only.`,
    latency_ms: 280 + Math.round(Math.random() * 240),
  });
  bumpUsage(usage, params, 200, 80);

  for (const tool of chosen) {
    const args = synthesizeArgs(tool, contextObj);

    // Tool guardrail — fires before the tool_call step.
    const gate = gateForTool(tool.id);
    if (gate) {
      const evalCtx = { context: contextObj, result: null, tool: tool.id, tool_args: args };
      if (evalRequired(gate.required, evalCtx)) {
        steps.push({
          type: 'awaiting_human',
          approval_id: gate.id,
          approval: gate,
          preview: renderPreview(gate.preview, evalCtx),
          phase: 'before_tool',
          tool: tool.id,
          tool_label: tool.label,
          tool_args: args,
          latency_ms: 0,
        });
      }
    }

    steps.push({ type: 'tool_call', tool: tool.id, tool_label: tool.label, args, latency_ms: 180 + Math.round(Math.random() * 220) });
    bumpUsage(usage, params, 120, 40);
    steps.push({ type: 'observation', tool: tool.id, tool_label: tool.label, result: synthesizeObservation(tool, args), latency_ms: 60 + Math.round(Math.random() * 280) });
    if (Math.random() < 0.35 && steps.length < maxSteps - 1) {
      steps.push({ type: 'think', text: `${tool.label} returned usable data. Considering next move.`, latency_ms: 200 + Math.round(Math.random() * 200) });
      bumpUsage(usage, params, 240, 110);
    }
  }

  // On-demand: simulate the agent calling for help once, mid-loop.
  if (onDemand.length && Math.random() < 0.5) {
    const ap = onDemand[0];
    const evalCtx = { context: contextObj, result: null, tool: null, tool_args: null };
    steps.push({
      type: 'awaiting_human',
      approval_id: ap.id,
      approval: ap,
      preview: renderPreview(ap.preview, { ...evalCtx, question: 'Need clarification — should I proceed with the current plan?' }),
      phase: 'on_demand',
      latency_ms: 0,
    });
  }

  steps.push({ type: 'done', text: 'Goal satisfied — returning structured result.', latency_ms: 240 + Math.round(Math.random() * 200) });
  bumpUsage(usage, params, 320, 200);

  // Build the typed `result` from the declared returns schema.
  const parsed = parseSchema(params.returns || '');
  const sampledResult = parsed.ok ? sampleFromSchema(parsed.schema) : { note: 'invalid returns schema; emitted free-form' };
  // If the schema declared it, occasionally flip a "needs_human" / "needs_handoff"
  // status so users see all branches in the test panel.
  const wantsHuman = sampledResult && typeof sampledResult === 'object' && 'needs_human' in sampledResult && Math.random() < 0.25;
  if (wantsHuman) sampledResult.needs_human = true;

  // Validate. Failed validation → status "failed" with errors surfaced.
  const v = parsed.ok ? validate(sampledResult, parsed.schema) : { ok: false, errors: [parsed.error] };

  let status = 'ok';
  if (!v.ok) status = 'failed';
  else if (wantsHuman) status = 'needs_human';
  // Demo: occasionally raise a handoff to a fictional target so users see the shape.
  let handoff;
  if (status === 'ok' && Math.random() < 0.15 && (params.handoff_targets?.length)) {
    status = 'needs_handoff';
    const to = params.handoff_targets[Math.floor(Math.random() * params.handoff_targets.length)];
    handoff = { to, reason: 'Specialist needed per declared targets.', payload: sampledResult };
  }

  // Post-flight gates — evaluated against the now-known result.
  for (const ap of postflight) {
    const evalCtx = { context: contextObj, result: sampledResult, tool: null, tool_args: null };
    if (!evalRequired(ap.required, evalCtx)) continue;
    steps.push({
      type: 'awaiting_human',
      approval_id: ap.id,
      approval: ap,
      preview: renderPreview(ap.preview, evalCtx),
      phase: 'after_run',
      latency_ms: 0,
    });
  }

  const latency_ms = steps.reduce((a, s) => a + (s.latency_ms || 0), 0);
  const tools_used = [...new Set(chosen.map(t => t.id))];

  const output = {
    status,
    result:    sampledResult,
    ...(handoff ? { handoff } : {}),
    reasoning: status === 'failed'
      ? `Output did not match the declared schema: ${v.errors.slice(0, 2).join('; ')}`
      : 'Synthesised from registered tools.',
    usage,
    model_used: params.model,
    latency_ms,
    trace: {
      steps,
      steps_taken: steps.length,
      tools_used,
      terminated_by: status === 'failed' ? 'error' : 'goal_met',
    },
    // Carried separately for the Test panel; not part of the public schema.
    _validation: v,
  };
  return { steps, output };
}

function shuffle(arr) { return arr.slice().sort(() => Math.random() - 0.5); }
function shorten(s, n) { s = String(s || ''); return s.length > n ? s.slice(0, n - 1) + '…' : s; }

function resolveTemplate(s, ctx) {
  return String(s || '').replace(/\{\{\s*([^}]+?)\s*\}\}/g, (_, key) => {
    const segs = key.split('.');
    let cur = ctx;
    for (const seg of segs) cur = cur?.[seg];
    if (cur == null) return `{{${key}}}`;
    return typeof cur === 'string' ? cur : JSON.stringify(cur);
  });
}

/* Resolve the agent's declared context_map against the sample input the user
   typed in the Test tab. Each entry is { field, source } where source is a
   {{...}} expression referencing trigger.* or steps.<id>.output.*. We feed
   the sample under both `trigger` and `input` for backward compatibility. */
function buildContextFromMap(contextMap, sampleInput) {
  const ctx = { input: sampleInput, trigger: sampleInput, steps: {} };
  const out = {};
  for (const entry of contextMap || []) {
    if (!entry?.field) continue;
    out[entry.field] = resolveTemplate(entry.source || '', ctx);
  }
  return out;
}

function bumpUsage(u, params, inTok, outTok) {
  u.input_tokens  += inTok;
  u.output_tokens += outTok;
  const rate = (params.model || '').includes('opus')   ? { in: 15,    out: 75 }
            : (params.model || '').includes('sonnet') ? { in: 3,     out: 15 }
            : (params.model || '').includes('haiku')  ? { in: 1,     out: 5 }
            : (params.model || '').includes('gpt-4o-mini') ? { in: 0.15, out: 0.6 }
            : (params.model || '').includes('gpt-4o') ? { in: 5, out: 15 }
            : { in: 0.6, out: 1.8 };
  u.cost_usd = +((u.input_tokens * rate.in + u.output_tokens * rate.out) / 1_000_000).toFixed(6);
}

function synthesizeArgs(tool, sampleInput) {
  switch (tool.id) {
    case 'http.get':
    case 'web.fetch':       return { url: 'https://api.corp.example/lookup?id=' + (sampleInput?.id || 'INV-1042') };
    case 'http.post':       return { url: 'https://api.corp.example/post', body: { invoice: sampleInput?.id || 'INV-1042' } };
    case 'web.search':      return { query: sampleInput?.text?.slice(0, 60) || 'enterprise agent best practices', k: 5 };
    case 'snowflake.query': return { sql: `SELECT * FROM vendors WHERE name ILIKE '${sampleInput?.vendor || 'ACME'}'` };
    case 'postgres.query':  return { sql: `SELECT id, status FROM tickets WHERE customer = '${sampleInput?.customer || 'acme'}'` };
    case 'vector.search':   return { query: sampleInput?.text?.slice(0, 60) || 'invoice processing policy', k: 4 };
    case 'kb.lookup':       return { query: 'AP exception handling' };
    case 'kb.cite':         return { doc_id: 'doc_' + Math.random().toString(36).slice(2, 8) };
    case 'slack.post':      return { channel: '#ap-approvals', text: 'Heads up — needs manager review.' };
    case 'email.send':      return { to: sampleInput?.contact || 'finance@corp', subject: 'Re: ' + (sampleInput?.id || 'invoice'), body: '...' };
    case 'salesforce.query':return { soql: "SELECT Id, Name FROM Account WHERE Name LIKE '%ACME%'" };
    case 'salesforce.update':return { object: 'Account', id: '0010xxxxxxxxxxx', fields: { Status__c: 'Reviewed' } };
    case 'netsuite.bill':   return { vendor: sampleInput?.vendor || 'ACME', amount: 4200, lines: [] };
    case 'code.run':        return { source: 'return ctx.input.total * 1.0825;' };
    case 'calc.eval':       return { expr: '4200 * 0.0825' };
    case 'memory.read':     return { key: 'thread:' + (sampleInput?.id || 'demo') };
    case 'memory.write':    return { key: 'thread:' + (sampleInput?.id || 'demo'), value: { last_seen: 'now' } };
    case 'human.ask':       return { question: 'Approve $4,200 invoice from ACME?', channel: '#ap-approvals' };
    default: return {};
  }
}

function synthesizeObservation(tool, args) {
  switch (tool.id) {
    case 'http.get':         return { status: 200, body: { ok: true, vendor: 'ACME Corp', verified: true } };
    case 'http.post':        return { status: 201, body: { id: 'rec_' + Math.random().toString(36).slice(2, 8) } };
    case 'web.search':       return { results: [{ title: 'How to triage AP exceptions', url: 'https://docs.corp/ap-triage', snippet: '…' }, { title: 'NetSuite vendor flows', url: 'https://docs.corp/ns', snippet: '…' }] };
    case 'web.fetch':        return { text: 'Page text… (4,200 chars)' };
    case 'snowflake.query':  return { rows: [{ vendor_id: 'V-771', name: 'ACME Corp', tier: 'gold' }], row_count: 1 };
    case 'postgres.query':   return { rows: [{ id: 17, status: 'open' }], row_count: 1 };
    case 'vector.search':    return { hits: [{ doc_id: 'pol-13', score: 0.91, snippet: 'Invoices > $5k require manager approval…' }] };
    case 'kb.lookup':        return { matches: 2, top: { title: 'AP exception handling v3', doc_id: 'pol-13' } };
    case 'kb.cite':          return { url: 'https://kb.corp/doc/pol-13', title: 'AP exception handling v3' };
    case 'slack.post':       return { ts: '1714567890.001234', ok: true };
    case 'email.send':       return { sent: true, message_id: 'msg_' + Math.random().toString(36).slice(2, 10) };
    case 'salesforce.query': return { records: [{ Id: '0010xxxxxxxxxxx', Name: 'ACME Corp' }], totalSize: 1 };
    case 'salesforce.update':return { success: true, id: args.id };
    case 'netsuite.bill':    return { bill_id: 'BILL-' + (1000 + Math.floor(Math.random() * 9000)) };
    case 'code.run':         return { result: 4546.5 };
    case 'calc.eval':        return { result: 346.5 };
    case 'memory.read':      return { value: { last_seen: 'yesterday', turn_count: 3 } };
    case 'memory.write':     return { ok: true };
    case 'human.ask':        return { reply: 'Approved.', by: '@alice', latency_ms: 1820 };
    default: return { ok: true };
  }
}

/* ───────────────────────── the loop trace UI ───────────────────────── */

function StepIcon({ type }) {
  if (type === 'think')          return <span title="think"          className="inline-block h-2 w-2 rounded-full bg-primary/70" />;
  if (type === 'tool_call')      return <span title="tool call"      className="inline-block h-2 w-2 rotate-45 bg-accent" />;
  if (type === 'observation')    return <span title="observation"    className="inline-block h-2 w-2 rounded-sm bg-foreground/60" />;
  if (type === 'awaiting_human') return <span title="awaiting human" className="inline-block h-2.5 w-2.5 rounded-full bg-amber-400 ring-2 ring-amber-400/30 animate-pulse" />;
  if (type === 'done')           return <span title="done"           className="inline-block h-2 w-2 rounded-full bg-accent ring-2 ring-accent/30" />;
  return <span className="inline-block h-2 w-2 rounded bg-border" />;
}

function StepRow({ step, idx, current, resolution, onResolve }) {
  const isAwaiting = step.type === 'awaiting_human';
  const isPending  = isAwaiting && !resolution;
  const tone = isPending
    ? 'border-amber-400/60 bg-amber-50/40 dark:bg-amber-400/5'
    : current
      ? 'border-primary/60 bg-primary/5'
      : 'border-border bg-background';

  const phaseLabel = step.phase === 'before_run'  ? 'Pre-flight'
                  : step.phase === 'before_tool' ? 'Tool guardrail'
                  : step.phase === 'after_run'   ? 'Post-flight'
                  : step.phase === 'on_demand'   ? 'Clarifying'
                  : '';

  return (
    <div className={`rounded-md border ${tone} px-2.5 py-2`}>
      <div className="flex items-center gap-2">
        <span className="text-[9.5px] font-mono text-muted-foreground tabular-nums w-5 text-right">{String(idx + 1).padStart(2, '0')}</span>
        <StepIcon type={step.type} />
        <span className="text-[10px] uppercase tracking-[0.18em] font-mono text-muted-foreground">{step.type.replace('_', ' ')}</span>
        {phaseLabel && <span className="text-[10px] font-mono text-amber-700 dark:text-amber-400">{phaseLabel}</span>}
        {step.tool_label && <span className="text-[11px] text-foreground font-medium truncate">{step.tool_label}</span>}
        {resolution && (
          <span className={`text-[10px] font-mono ml-1 ${resolution.decision === 'reject' ? 'text-destructive' : 'text-accent'}`}>
            → {resolution.decision}
          </span>
        )}
        {typeof step.latency_ms === 'number' && step.type !== 'awaiting_human' && (
          <span className="ml-auto text-[10px] font-mono text-muted-foreground tabular-nums">{step.latency_ms}ms</span>
        )}
      </div>

      {step.type === 'think' && (
        <div className="mt-1.5 ml-7 text-[11px] text-foreground/85">{step.text}</div>
      )}
      {step.type === 'tool_call' && (
        <pre className="mt-1.5 ml-7 bg-panel2 border border-border rounded p-2 text-[10.5px] font-mono text-foreground/80 overflow-x-auto whitespace-pre-wrap">{`${step.tool}(${JSON.stringify(step.args, null, 2)})`}</pre>
      )}
      {step.type === 'observation' && (
        <pre className="mt-1.5 ml-7 bg-panel2 border border-border rounded p-2 text-[10.5px] font-mono text-foreground/80 overflow-x-auto whitespace-pre-wrap">{JSON.stringify(step.result, null, 2)}</pre>
      )}
      {step.type === 'done' && (
        <div className="mt-1.5 ml-7 text-[11px] text-foreground/85 italic">{step.text}</div>
      )}

      {isAwaiting && (
        <div className="mt-2 ml-7 rounded-md border border-amber-400/50 bg-panel">
          <div className="px-2.5 py-2 border-b border-amber-400/30 flex items-center justify-between">
            <div>
              <div className="text-[10px] uppercase tracking-[0.18em] font-mono text-amber-700 dark:text-amber-400">awaiting human</div>
              <div className="text-[11px] text-foreground mt-0.5">{step.approval?.approvers || 'team:operators'} · {step.approval?.channel || 'queue:default'}</div>
            </div>
            <div className="text-[10px] font-mono text-muted-foreground">timeout {step.approval?.timeout_h ?? 24}h</div>
          </div>

          <div className="px-2.5 py-2 border-b border-border/70">
            <div className="text-[10px] uppercase tracking-[0.16em] font-mono text-muted-foreground mb-1">preview</div>
            <pre className="text-[11px] text-foreground/90 font-mono whitespace-pre-wrap">{step.preview || <span className="italic text-muted-foreground">(no preview template)</span>}</pre>
          </div>

          {step.tool && (
            <div className="px-2.5 py-2 border-b border-border/70">
              <div className="text-[10px] uppercase tracking-[0.16em] font-mono text-muted-foreground mb-1">about to call</div>
              <pre className="text-[10.5px] text-foreground/80 font-mono whitespace-pre-wrap">{step.tool}({JSON.stringify(step.tool_args, null, 2)})</pre>
            </div>
          )}

          <div className="px-2.5 py-2">
            {isPending ? (
              <div className="flex items-center gap-1.5 flex-wrap">
                {(step.approval?.decisions || ['approve', 'reject']).map(d => {
                  const isReject = d === 'reject';
                  return (
                    <button
                      key={d}
                      type="button"
                      onClick={() => onResolve?.({ decision: d, by: 'you (test)', at: Date.now() })}
                      className={`text-[11px] px-2.5 py-1 rounded font-medium transition-colors ${
                        isReject
                          ? 'border border-destructive/60 text-destructive hover:bg-destructive/10'
                          : 'btn-primary'
                      }`}
                    >
                      {d}
                    </button>
                  );
                })}
                <button
                  type="button"
                  onClick={() => onResolve?.({ decision: 'timeout-' + (step.approval?.on_timeout || 'reject'), by: 'system', at: Date.now() })}
                  className="text-[10.5px] px-2 py-1 rounded text-muted-foreground hover:text-foreground"
                >
                  simulate timeout
                </button>
              </div>
            ) : (
              <div className="text-[11px] text-foreground/80">
                Resolved: <span className="font-mono">{resolution.decision}</span> by <span className="font-mono">{resolution.by}</span>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

/* ───────────────────────── returns schema field ───────────────────────── */

function ReturnsField({ value, onChange }) {
  const parsed = useMemo(() => parseSchema(value), [value]);
  return (
    <Field label="Returns" hint={parsed.ok ? 'shorthand or JSON schema' : 'invalid'}>
      <textarea
        rows={5}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className={textareaCls}
        placeholder='{ "decision": "approve | reject | escalate", "amount": "number" }'
      />
      {!parsed.ok && (
        <div className="mt-1.5 text-[10.5px] font-mono text-destructive">{parsed.error}</div>
      )}
      {parsed.ok && parsed.schema?.type === 'object' && (
        <div className="mt-1.5 text-[10px] text-muted-foreground">
          {Object.keys(parsed.schema.properties || {}).length} field(s) declared. Output <span className="font-mono">result</span> is validated against this on every run.
        </div>
      )}
    </Field>
  );
}

function ReturnsPreview({ returns }) {
  const parsed = useMemo(() => parseSchema(returns), [returns]);
  if (!parsed.ok) {
    return <div className="text-[11px] font-mono text-destructive">Schema is invalid: {parsed.error}</div>;
  }
  return (
    <pre className="bg-background border border-border rounded-md p-3 font-mono text-[11px] text-foreground/85 overflow-x-auto whitespace-pre-wrap">{describeSchema(parsed.schema)}</pre>
  );
}

/* ───────────────────────── context map editor ───────────────────────── */

/* The Inputs tab. Each row is { field, source } — the agent will only see
   fields named here, and each source is one of the {{...}} expressions the
   variable picker offers. This is the harness that prevents agents from
   silently reading whatever happens to be upstream. */

function ContextMapEditor({ contextMap, onChange, availableVars }) {
  const update = (i, patch) => {
    const next = contextMap.slice();
    next[i] = { ...next[i], ...patch };
    onChange(next);
  };
  const add = () => onChange([...contextMap, { field: '', source: '' }]);
  const remove = (i) => onChange(contextMap.filter((_, idx) => idx !== i));
  const move = (from, to) => {
    if (to < 0 || to >= contextMap.length) return;
    const next = contextMap.slice();
    const [m] = next.splice(from, 1);
    next.splice(to, 0, m);
    onChange(next);
  };

  return (
    <div className="space-y-3">
      <div className="rounded-md border border-border bg-panel2 px-3 py-2.5">
        <div className="text-[10px] uppercase tracking-[0.18em] font-mono text-muted-foreground">how this works</div>
        <div className="mt-1.5 text-[11.5px] text-foreground/80 leading-relaxed">
          Declare exactly the fields this agent should see as <span className="font-mono">context.&lt;field&gt;</span>. Reference them in the goal / system prompt. The agent cannot reach for arbitrary upstream values — refactor-safe and auditable.
        </div>
      </div>

      <div className="space-y-2">
        {contextMap.length === 0 && (
          <div className="text-[11px] text-muted-foreground italic">No fields declared yet — the agent will see an empty context.</div>
        )}
        {contextMap.map((row, i) => (
          <div key={i} className="rounded-md border border-border bg-background px-2.5 py-2">
            <div className="grid grid-cols-[140px_1fr_auto] gap-2 items-start">
              <input
                value={row.field || ''}
                onChange={(e) => update(i, { field: e.target.value.replace(/[^a-zA-Z0-9_]/g, '') })}
                placeholder="field_name"
                className={inputCls + ' font-mono'}
              />
              <input
                value={row.source || ''}
                onChange={(e) => update(i, { source: e.target.value })}
                placeholder="{{trigger.x}} or {{steps.n2.output.result.y}}"
                className={inputCls + ' font-mono'}
              />
              <div className="flex items-center gap-0.5 pt-0.5 text-muted-foreground">
                <button type="button" disabled={i === 0} onClick={() => move(i, i - 1)} className="h-6 w-6 rounded hover:bg-muted disabled:opacity-30 disabled:cursor-not-allowed">↑</button>
                <button type="button" disabled={i === contextMap.length - 1} onClick={() => move(i, i + 1)} className="h-6 w-6 rounded hover:bg-muted disabled:opacity-30 disabled:cursor-not-allowed">↓</button>
                <button type="button" onClick={() => remove(i)} className="h-6 w-6 rounded hover:bg-destructive/10 hover:text-destructive">✕</button>
              </div>
            </div>
            {availableVars.length > 0 && (
              <div className="mt-1.5 flex flex-wrap gap-1.5">
                {availableVars.slice(0, 6).map(v => (
                  <button
                    key={v.path}
                    type="button"
                    onClick={() => update(i, { source: v.path })}
                    title={`${v.source} · ${v.hint}`}
                    className="inline-flex items-center px-1.5 py-0.5 rounded border border-border bg-panel2 hover:bg-primary/5 hover:border-primary/40 text-[10px] font-mono text-foreground/80 transition-colors"
                  >
                    {v.path.replace(/^\{\{|\}\}$/g, '')}
                  </button>
                ))}
                {availableVars.length > 6 && (
                  <span className="text-[10px] text-muted-foreground/70 font-mono self-center">+{availableVars.length - 6} more</span>
                )}
              </div>
            )}
          </div>
        ))}
      </div>

      <button
        type="button"
        onClick={add}
        className="text-[11.5px] px-2.5 py-1 rounded border border-border hover:border-primary/50 hover:bg-primary/5 text-foreground transition-colors"
      >
        + add field
      </button>
    </div>
  );
}

/* ───────────────────────── main ───────────────────────── */

const TABS = [
  { id: 'goal',      label: 'Goal' },
  { id: 'tools',     label: 'Tools' },
  { id: 'config',    label: 'Config' },
  { id: 'inputs',    label: 'Inputs' },
  { id: 'outputs',   label: 'Outputs' },
  { id: 'approvals', label: 'Approvals' },
  { id: 'test',      label: 'Test' },
  { id: 'runs',      label: 'Runs' },
];

export default function AgentInspector({ node, workflow, onUpdate, runStates }) {
  const params = node.params || {};
  const setParam = (patch) => onUpdate(node.id, { params: { ...params, ...patch } });
  const [tab, setTab] = useState('goal');

  const vars = useMemo(() => getAvailableVars(workflow, node.id), [workflow, node.id]);
  const modelMeta = findModel(params.model);
  const outputSchema = getOutputSchema('agent.autonomous');

  // Test state — sample input + animated playback of the simulated loop
  const [sampleJson, setSampleJson] = useState('{ "id": "INV-1042", "vendor": "ACME Corp", "text": "Process invoice from ACME", "total": 12000 }');
  const [testRunning, setTestRunning] = useState(false);
  const [stepsShown, setStepsShown] = useState([]);
  const [testOutput, setTestOutput] = useState(null);
  // Resolutions keyed by the step's index in `stepsShown`.
  const [resolutions, setResolutions] = useState({});
  // When the runner is paused on an approval, we stash a resolver here.
  const [pendingResolve, setPendingResolve] = useState(null);
  const cancelRef = useRef(false);

  useEffect(() => () => { cancelRef.current = true; }, []);

  const runTest = async () => {
    cancelRef.current = false;
    setTestRunning(true);
    setStepsShown([]);
    setTestOutput(null);
    setResolutions({});
    setPendingResolve(null);

    let parsedSample; try { parsedSample = JSON.parse(sampleJson); } catch { parsedSample = {}; }
    const context = buildContextFromMap(params.context_map, parsedSample);
    const { steps, output } = simulateAgentLoop(params, context);

    let rejected = false;

    for (let i = 0; i < steps.length; i++) {
      if (cancelRef.current) break;
      const s = steps[i];
      await new Promise(r => setTimeout(r, Math.min(s.latency_ms || 200, 600)));
      setStepsShown(prev => [...prev, s]);

      if (s.type === 'awaiting_human') {
        // Pause until the user clicks a decision in the rendered card.
        const myIdx = i;
        const decision = await new Promise((resolve) => {
          setPendingResolve(() => (res) => {
            setResolutions(prev => ({ ...prev, [myIdx]: res }));
            setPendingResolve(null);
            resolve(res);
          });
        });
        if (cancelRef.current) break;
        const d = decision.decision;
        // Reject (or timeout-reject) ends the run early with status needs_human.
        if (d === 'reject' || d === 'timeout-reject') {
          rejected = true;
          break;
        }
      }
    }

    if (!cancelRef.current) {
      if (rejected) {
        setTestOutput({
          ...output,
          status: 'needs_human',
          reasoning: 'Run halted by reviewer (rejected).',
          // Keep trace as-emitted so the user can see where it stopped.
        });
      } else {
        setTestOutput(output);
      }
    }
    setTestRunning(false);
  };

  const stopTest = () => {
    cancelRef.current = true;
    // If we're paused on an approval, free the resolver so the loop unwinds.
    if (pendingResolve) {
      pendingResolve({ decision: 'cancelled', by: 'system', at: Date.now() });
    }
  };

  return (
    <div className="flex-1 flex flex-col min-h-0">
      <div className="flex px-4 border-b border-border overflow-x-auto">
        {TABS.map(t => {
          const badge = t.id === 'approvals' && (params.approvals?.length || 0) > 0
            ? params.approvals.filter(a => a.enabled).length
            : null;
          return (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`px-3 py-2 text-[11.5px] font-medium border-b-2 -mb-px transition-colors whitespace-nowrap inline-flex items-center gap-1.5 ${
                tab === t.id ? 'text-foreground border-primary' : 'text-muted-foreground border-transparent hover:text-foreground'
              }`}
            >
              {t.label}
              {badge != null && (
                <span className="inline-flex items-center justify-center min-w-4 h-4 px-1 rounded-full bg-primary/15 text-primary text-[9.5px] font-mono">{badge}</span>
              )}
            </button>
          );
        })}
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
        {tab === 'goal' && (
          <div className="space-y-4">
            <Field label="Goal" hint="what success looks like">
              <textarea rows={4} value={params.goal || ''} onChange={(e) => setParam({ goal: e.target.value })} className={textareaCls} placeholder="Reference context.<field> declared in the Inputs tab." />
            </Field>
            <Field label="System / persona">
              <textarea rows={3} value={params.system || ''} onChange={(e) => setParam({ system: e.target.value })} className={textareaCls} placeholder="High-level persona, constraints, citation rules…" />
            </Field>

            <ReturnsField value={params.returns || ''} onChange={(s) => setParam({ returns: s })} />

            <div className="rounded-md border border-border bg-panel2 px-3 py-2.5">
              <div className="text-[10px] uppercase tracking-[0.18em] font-mono text-muted-foreground">how the loop works</div>
              <div className="mt-1.5 text-[11.5px] text-foreground/80 leading-relaxed">
                The agent reads <span className="font-mono">context.*</span> (declared in Inputs), picks a tool, observes the result, and repeats.
                When done it emits <span className="font-mono">{'{ status, result, … }'}</span>; <span className="font-mono">result</span> is validated against the Returns schema you declare here.
              </div>
            </div>
          </div>
        )}

        {tab === 'tools' && (
          <ToolsPicker selected={params.tools || []} onChange={(next) => setParam({ tools: next })} />
        )}

        {tab === 'config' && (
          <>
            <Field label="Model" hint={modelMeta ? `${modelMeta.providerLabel} · ${(modelMeta.ctx / 1000).toFixed(0)}K ctx` : ''}>
              <select
                value={params.model}
                onChange={(e) => {
                  const m = findModel(e.target.value);
                  setParam({ model: e.target.value, provider: m?.provider || params.provider });
                }}
                className={selectCls}
              >
                {LLM_PROVIDERS.map(p => (
                  <optgroup key={p.id} label={p.label}>
                    {p.models.map(m => (
                      <option key={m.id} value={m.id}>{m.label} · {m.caps.join(' / ')}</option>
                    ))}
                  </optgroup>
                ))}
              </select>
            </Field>

            <Field label={`Temperature · ${params.temperature ?? 0.3}`}>
              <input type="range" min="0" max="1" step="0.05" value={params.temperature ?? 0.3} onChange={(e) => setParam({ temperature: parseFloat(e.target.value) })} className="w-full accent-primary" />
            </Field>

            <Field label="Max tokens per turn">
              <input type="number" value={params.max_tokens ?? 1024} onChange={(e) => setParam({ max_tokens: parseInt(e.target.value) || 0 })} className={inputCls} />
            </Field>

            <div className="border-t border-border/70 pt-3 space-y-3">
              <div className="text-[10px] uppercase tracking-[0.18em] font-mono text-muted-foreground">Loop control</div>

              <Field label="Termination">
                <select value={params.termination || 'goal_or_steps'} onChange={(e) => setParam({ termination: e.target.value })} className={selectCls}>
                  <option value="goal_or_steps">Goal met OR max steps</option>
                  <option value="goal_met">Only when goal declared met</option>
                  <option value="max_steps">Only on step cap</option>
                  <option value="external_signal">Wait for external signal</option>
                </select>
              </Field>

              <div className="grid grid-cols-2 gap-3">
                <Field label="Max steps">
                  <input type="number" min="1" max="50" value={params.max_steps ?? 8} onChange={(e) => setParam({ max_steps: parseInt(e.target.value) || 1 })} className={inputCls} />
                </Field>
                <Field label="Goal check">
                  <Toggle on={!!params.require_goal_check} onChange={(on) => setParam({ require_goal_check: on })} />
                </Field>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <Field label="Parallel tools">
                  <Toggle on={!!params.parallel_tools} onChange={(on) => setParam({ parallel_tools: on })} />
                </Field>
                <Field label="Show thinking">
                  <Toggle on={!!params.show_thinking} onChange={(on) => setParam({ show_thinking: on })} />
                </Field>
              </div>
            </div>

            <div className="border-t border-border/70 pt-3 space-y-3">
              <div className="text-[10px] uppercase tracking-[0.18em] font-mono text-muted-foreground">Operational</div>

              <div className="grid grid-cols-2 gap-3">
                <Field label="Retries">
                  <input type="number" min="0" max="5" value={params.retries ?? 0} onChange={(e) => setParam({ retries: parseInt(e.target.value) || 0 })} className={inputCls} />
                </Field>
                <Field label="Stop on error">
                  <Toggle on={!!params.stop_on_error} onChange={(on) => setParam({ stop_on_error: on })} />
                </Field>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <Field label="Timeout (s)">
                  <input type="number" value={params.timeout_s ?? 60} onChange={(e) => setParam({ timeout_s: parseInt(e.target.value) || 0 })} className={inputCls} />
                </Field>
                <Field label="Budget (USD)">
                  <input type="number" step="0.01" value={params.budget_usd ?? 0.5} onChange={(e) => setParam({ budget_usd: parseFloat(e.target.value) })} className={inputCls} />
                </Field>
              </div>
            </div>
          </>
        )}

        {tab === 'inputs' && (
          <ContextMapEditor
            contextMap={params.context_map || []}
            onChange={(next) => setParam({ context_map: next })}
            availableVars={vars}
          />
        )}

        {tab === 'outputs' && (
          <div className="space-y-5">
            <section>
              <div className="text-[10px] uppercase tracking-[0.18em] font-mono text-muted-foreground mb-2">Routing contract</div>
              <div className="text-[11px] text-muted-foreground mb-2">
                Reference downstream via <span className="font-mono text-foreground">{`{{steps.${node.id}.output.*}}`}</span>. The runner uses <span className="font-mono">status</span> to decide whether to follow the next edge, dispatch a handoff, or pause for a human.
              </div>
              <div className="space-y-1">
                {outputSchema.fields.map(f => (
                  <div key={f.path} className="flex items-start justify-between gap-3 px-2 py-1.5 rounded border border-border bg-background">
                    <div className="min-w-0">
                      <div className="font-mono text-[11px] text-foreground">{f.path}</div>
                      <div className="text-[10.5px] text-muted-foreground">{f.desc}</div>
                    </div>
                    <div className="text-[10px] font-mono text-primary/80 whitespace-nowrap">{f.type}</div>
                  </div>
                ))}
              </div>
            </section>

            <section>
              <div className="text-[10px] uppercase tracking-[0.18em] font-mono text-muted-foreground mb-2">Your <span className="text-foreground">result</span> shape</div>
              <ReturnsPreview returns={params.returns || ''} />
            </section>
          </div>
        )}

        {tab === 'approvals' && (() => {
          // Build the same sample context the Test tab uses, plus a sampled
          // result so the dry-run / preview shows realistic values.
          let parsedSample; try { parsedSample = JSON.parse(sampleJson); } catch { parsedSample = {}; }
          const sampleContext = buildContextFromMap(params.context_map, parsedSample);
          const parsedSchema  = parseSchema(params.returns || '');
          const sampleResult  = parsedSchema.ok ? sampleFromSchema(parsedSchema.schema) : {};
          return (
            <AgentApprovalsTab
              approvals={params.approvals || []}
              onChange={(next) => setParam({ approvals: next })}
              sampleContext={sampleContext}
              sampleResult={sampleResult}
            />
          );
        })()}

        {tab === 'test' && (
          <div className="space-y-3">
            <Field label="Sample upstream input" hint="resolved through context_map">
              <textarea rows={4} value={sampleJson} onChange={(e) => setSampleJson(e.target.value)} className={textareaCls} />
            </Field>

            <Field label="Resolved context the agent sees">
              <pre className="bg-background border border-border rounded-md p-3 font-mono text-[10.5px] text-foreground/80 overflow-x-auto whitespace-pre-wrap">{(() => {
                let parsed; try { parsed = JSON.parse(sampleJson); } catch { parsed = {}; }
                const ctx = buildContextFromMap(params.context_map, parsed);
                return Object.keys(ctx).length === 0
                  ? '// no fields declared in Inputs tab — context is empty'
                  : JSON.stringify(ctx, null, 2);
              })()}</pre>
            </Field>

            <div className="flex items-center justify-between">
              <div className="text-[10.5px] text-muted-foreground font-mono">
                Mock loop — picks {Math.min((params.tools || []).length || 0, 4) || 'no'} of your registered tools.
              </div>
              <div className="flex items-center gap-2">
                {testRunning && (
                  <button onClick={stopTest} className="text-[11px] px-2 py-1 rounded border border-destructive/50 text-destructive">Stop</button>
                )}
                <button onClick={runTest} disabled={testRunning} className="btn-primary text-[11.5px] px-3 py-1.5 rounded-md font-medium disabled:opacity-60">
                  {testRunning ? 'Running…' : 'Run agent'}
                </button>
              </div>
            </div>

            {(stepsShown.length > 0 || testRunning) && (
              <div className="space-y-2">
                <div className="text-[10px] uppercase tracking-[0.18em] font-mono text-muted-foreground">Loop trace</div>
                {stepsShown.map((s, i) => {
                  // Pending if it's the latest awaiting_human step and we
                  // haven't recorded a resolution for it yet.
                  const isPending = s.type === 'awaiting_human' && !resolutions[i];
                  return (
                    <StepRow
                      key={i}
                      step={s}
                      idx={i}
                      current={testRunning && i === stepsShown.length - 1}
                      resolution={resolutions[i]}
                      onResolve={isPending && pendingResolve ? pendingResolve : undefined}
                    />
                  );
                })}
              </div>
            )}

            {testOutput && (
              <div className="space-y-3 pt-2">
                <div className="grid grid-cols-4 gap-2">
                  <Stat label="status"        value={testOutput.status} />
                  <Stat label="steps"         value={String(testOutput.trace.steps_taken)} />
                  <Stat label="in / out tok"  value={`${testOutput.usage.input_tokens} / ${testOutput.usage.output_tokens}`} />
                  <Stat label="cost"          value={`$${testOutput.usage.cost_usd.toFixed(6)}`} />
                </div>

                {testOutput._validation?.ok === false && (
                  <div className="rounded-md border border-destructive/60 bg-destructive/5 px-3 py-2 text-[11px] font-mono text-destructive">
                    <div className="uppercase tracking-[0.16em] text-[9.5px] mb-1">schema validation failed</div>
                    {testOutput._validation.errors.map((e, i) => <div key={i}>· {e}</div>)}
                  </div>
                )}

                <Field label="result · validated">
                  <pre className="bg-background border border-border rounded-md p-3 font-mono text-[11px] text-foreground/90 overflow-x-auto whitespace-pre-wrap">{JSON.stringify(testOutput.result, null, 2)}</pre>
                </Field>

                {testOutput.handoff && (
                  <Field label="handoff">
                    <pre className="bg-background border border-primary/40 rounded-md p-3 font-mono text-[11px] text-foreground/90 overflow-x-auto whitespace-pre-wrap">{JSON.stringify(testOutput.handoff, null, 2)}</pre>
                  </Field>
                )}

                <Field label="Tools used">
                  <div className="flex flex-wrap gap-1.5">
                    {testOutput.trace.tools_used.length === 0 && <span className="text-[11px] text-muted-foreground italic">none</span>}
                    {testOutput.trace.tools_used.map(id => (
                      <span key={id} className="inline-flex items-center px-1.5 py-0.5 rounded border border-border bg-panel2 text-[10.5px] font-mono">{id}</span>
                    ))}
                  </div>
                </Field>

                <Field label="Full output">
                  <pre className="bg-background border border-border rounded-md p-3 font-mono text-[10.5px] text-foreground/70 overflow-x-auto">{JSON.stringify({ ...testOutput, _validation: undefined }, null, 2)}</pre>
                </Field>
              </div>
            )}

            {!testRunning && stepsShown.length === 0 && !testOutput && (
              <div className="text-[11px] text-muted-foreground/80 italic">Run the agent to watch its loop unfold.</div>
            )}
          </div>
        )}

        {tab === 'runs' && (
          <div className="space-y-2">
            {[
              ['just now', runStates?.nodes?.[node.id] === 'success' ? 'ok' : runStates?.nodes?.[node.id] === 'error' ? 'err' : '—', '—', '—'],
              ['12m ago', 'ok',  '8 steps', '$0.024'],
              ['1h ago',  'ok',  '5 steps', '$0.011'],
              ['3h ago',  'err', '—',       '—'],
            ].map(([t, s, l, c], i) => (
              <div key={i} className="flex items-center justify-between px-3 py-2 bg-background border border-border rounded-md text-[11.5px]">
                <div className="flex items-center gap-2">
                  <span className={`h-1.5 w-1.5 rounded-full ${s === 'ok' ? 'bg-accent' : s === 'err' ? 'bg-destructive' : 'bg-border'}`} />
                  <span className="text-foreground">{t}</span>
                </div>
                <div className="font-mono text-muted-foreground">{l} · {c}</div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
