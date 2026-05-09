'use client';

import { useEffect, useRef, useState } from 'react';
import {
  parseSchema as parseAgentSchema,
  sampleFromSchema as sampleAgentSchema,
  validate as validateAgentSchema,
} from './_agentSchema';
import { evalRequired, renderPreview, triggerKind, triggerToolId } from './_approvals';
import { getVariant } from './node-kinds';

function computeRunPlan(workflow) {
  const adj = {}; workflow.nodes.forEach(n => { adj[n.id] = []; });
  workflow.edges.forEach(e => { if (adj[e.from]) adj[e.from].push(e.to); });
  const indeg = {}; workflow.nodes.forEach(n => { indeg[n.id] = 0; });
  workflow.edges.forEach(e => { if (e.to in indeg) indeg[e.to]++; });
  const queue = workflow.nodes.filter(n => indeg[n.id] === 0).map(n => n.id);
  const order = [];
  while (queue.length) {
    const id = queue.shift();
    order.push(id);
    (adj[id] || []).forEach(next => { indeg[next]--; if (indeg[next] === 0) queue.push(next); });
  }
  return order;
}

function mockResult(variant, node) {
  const id = variant.id;
  if (id === 'agent.autonomous') {
    // §1 contract — every agent emits { status, result, handoff?, usage, trace }.
    // `result` is sampled from the declared `returns` schema and validated.
    const params = node?.params || {};
    const tools = (params.tools || []).slice(0, Math.min(4, (params.tools || []).length));
    const stepCount = Math.max(2, Math.min(params.max_steps || 6, 2 + tools.length * 2 + 1));
    const steps = [];
    steps.push({ type: 'think', text: 'Plan: gather signal, then synthesise.', latency_ms: 250 });
    for (const t of tools) {
      steps.push({ type: 'tool_call', tool: t, tool_label: t, args: { query: 'derived from context' }, latency_ms: 220 });
      steps.push({ type: 'observation', tool: t, tool_label: t, result: { ok: true }, latency_ms: 140 });
      if (steps.length >= stepCount - 1) break;
    }
    steps.push({ type: 'done', text: 'Goal satisfied.', latency_ms: 280 });

    const parsed = parseAgentSchema(params.returns || '');
    const sampledResult = parsed.ok ? sampleAgentSchema(parsed.schema) : { note: 'no/invalid returns schema' };
    const v = parsed.ok ? validateAgentSchema(sampledResult, parsed.schema) : { ok: false, errors: [parsed.error] };
    const status = v.ok ? 'ok' : 'failed';

    const inputTok  = 600 + Math.round(Math.random() * 1400);
    const outputTok = 220 + Math.round(Math.random() * 800);
    const cost_usd  = +(((inputTok * 3) + (outputTok * 15)) / 1_000_000).toFixed(6);
    const latency_ms = steps.reduce((a, s) => a + (s.latency_ms || 0), 0);

    return {
      kind:        'agent.autonomous',
      status,
      result:      sampledResult,
      reasoning:   v.ok ? 'Synthesised from registered tools.' : `Schema validation failed: ${v.errors.slice(0,2).join('; ')}`,
      usage:       { input_tokens: inputTok, output_tokens: outputTok, cost_usd },
      model_used:  params.model || 'unknown',
      latency_ms,
      trace: {
        steps,
        steps_taken:   steps.length,
        tools_used:    [...new Set(tools)],
        terminated_by: status === 'failed' ? 'error' : 'goal_met',
      },
      // Legacy fields kept for the trace-rail summary line below.
      tokens:  inputTok + outputTok,
      cost:    cost_usd.toFixed(4),
      latency: latency_ms,
    };
  }
  if (id === 'llm.chat') {
    // Produce the full output contract surfaced in the Inspector's IO tab so
    // downstream {{steps.<id>.output.*}} references resolve to something
    // realistic during a sandbox run.
    const params = node?.params || {};
    const inputTok  = 200 + Math.round(Math.random() * 1400);
    const outputTok = 80  + Math.round(Math.random() * 600);
    const cacheTok  = params.prompt_cache ? Math.round(inputTok * 0.6) : 0;
    const cost_usd  = +(((inputTok * 3) + (outputTok * 15)) / 1_000_000).toFixed(6);
    const usedTool  = params.tool_choice === 'required' || (params.tool_choice === 'auto' && Math.random() < 0.2);
    const wantsJson = params.response_format === 'json_object' || params.response_format === 'json_schema';
    const text = usedTool ? '' : (wantsJson ? '{"ok":true,"summary":"simulated"}' : 'Sure — here is a simulated chat response.');
    return {
      kind:           'llm.chat',
      text,
      messages:       [...(params.messages || []), { role: 'assistant', content: text }],
      tool_calls:     usedTool ? [{ id: 'call_' + Math.random().toString(36).slice(2, 8), name: 'lookup_vendor', arguments: { query: 'ACME Corp' } }] : [],
      finish_reason:  usedTool ? 'tool_use' : 'stop',
      parsed:         wantsJson && !usedTool ? safeJson(text) : null,
      usage:          { input_tokens: inputTok, output_tokens: outputTok, cache_read_tokens: cacheTok, cost_usd },
      model_used:     params.model || 'unknown',
      attempts:       1,
      latency_ms:     360 + Math.round(Math.random() * 1100),
      // Legacy fields kept for the trace-rail summary line below.
      tokens:  inputTok + outputTok,
      cost:    cost_usd.toFixed(4),
      latency: 360 + Math.round(Math.random() * 1100),
    };
  }
  if (id.startsWith('llm.') || id === 'agent.registry')
    return { tokens: 140 + Math.round(Math.random() * 800), cost: (0.0008 + Math.random() * 0.008).toFixed(4), latency: 400 + Math.round(Math.random() * 800) };
  if (id === 'tool.snowflake') return { rows: 1 + Math.round(Math.random() * 42), latency: 120 + Math.round(Math.random() * 300) };
  if (id.startsWith('tool.')) return { status: 200, latency: 80 + Math.round(Math.random() * 400) };
  if (id.startsWith('human.')) return { by: '@alice', latency: 1200 + Math.round(Math.random() * 3000) };
  if (id === 'policy.cedar') return { rules: 12, latency: 18 + Math.round(Math.random() * 22) };
  if (id.startsWith('branch.')) return { branch: Math.random() > 0.5 ? 'standard' : 'high-value', latency: 2 };
  return { latency: 30 + Math.round(Math.random() * 200) };
}

function safeJson(s) { try { return JSON.parse(s); } catch { return null; } }

function metricFor(res, v) {
  if (!res || !v) return '—';
  const id = v.id;
  if (id === 'agent.autonomous') {
    const stepCount = res.trace?.steps_taken ?? res.steps_taken ?? 0;
    const toolCount = res.trace?.tools_used?.length ?? res.tools_used?.length ?? 0;
    const tag = res.status && res.status !== 'ok' ? ` · ${res.status}` : '';
    return `${stepCount} steps · ${toolCount} tools${tag}`;
  }
  if (id === 'llm.chat') {
    if (res.tool_calls?.length) return `→ ${res.tool_calls[0].name}()`;
    if (res.finish_reason && res.finish_reason !== 'stop') return res.finish_reason;
    return `${res.usage?.input_tokens ?? 0}/${res.usage?.output_tokens ?? 0} tok`;
  }
  if (id.startsWith('llm.') || id === 'agent.registry') return `${res.tokens} tok`;
  if (id === 'tool.snowflake') return `${res.rows} rows`;
  if (id.startsWith('tool.')) return `HTTP ${res.status}`;
  if (id.startsWith('human.')) return res.by;
  if (id === 'policy.cedar') return `${res.rules} rules`;
  if (id.startsWith('branch.')) return `→ ${res.branch}`;
  return '—';
}

function StateBadge({ state }) {
  const map = {
    running:  { tone: 'text-primary border-primary/50 bg-primary/10',     label: 'running' },
    awaiting: { tone: 'text-amber-600 dark:text-amber-400 border-amber-400/60 bg-amber-400/10', label: 'awaiting' },
    success:  { tone: 'text-accent  border-accent/50  bg-accent/10',      label: 'success' },
    error:    { tone: 'text-destructive border-destructive/50 bg-destructive/10', label: 'error'   },
  };
  const m = map[state];
  if (!m) return <span className="text-muted-foreground font-mono text-[10px]">pending</span>;
  return (
    <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded border text-[10px] font-mono ${m.tone}`}>
      {state === 'running' && <span className="h-1.5 w-1.5 rounded-full bg-primary" style={{ animation: 'pulse-dot 2.2s ease-in-out infinite' }} />}
      {state === 'awaiting'&& <span className="h-1.5 w-1.5 rounded-full bg-amber-400" style={{ animation: 'pulse-dot 1.4s ease-in-out infinite' }} />}
      {state === 'success' && <span>✓</span>}
      {state === 'error'   && <span>✕</span>}
      {m.label}
    </span>
  );
}

/* The strip rendered at the top of the open trace rail when one or more
   approvals are pending. One row per pending approval — preview, the node
   it belongs to, channel/approvers, and Approve/Reject right inside. */
function PendingApprovalsStrip({ items, onResolve, onJumpTo, workflow }) {
  return (
    <div className="shrink-0 border-b border-amber-400/40 bg-amber-400/6">
      <div className="px-4 py-2 flex items-center gap-2 border-b border-amber-400/30">
        <span className="h-1.5 w-1.5 rounded-full bg-amber-400" style={{ animation: 'pulse-dot 1.4s ease-in-out infinite' }} />
        <span className="text-[10px] uppercase tracking-[0.18em] font-mono text-amber-700 dark:text-amber-400">Awaiting human</span>
        <span className="text-[10.5px] font-mono text-muted-foreground">{items.length} pending</span>
      </div>
      <div className="divide-y divide-amber-400/30">
        {items.map(item => {
          const n = workflow.nodes.find(x => x.id === item.nodeId);
          const decisions = item.approval?.decisions || ['approve', 'reject'];
          const phaseLabel = item.phase === 'before_run'  ? 'Pre-flight'
                          : item.phase === 'before_tool' ? 'Tool guardrail'
                          : item.phase === 'after_run'   ? 'Post-flight'
                          : item.phase === 'on_demand'   ? 'Clarifying'
                          : 'Awaiting';
          return (
            <div key={item.nodeId} className="px-4 py-2 flex items-start gap-3">
              <button
                type="button"
                onClick={() => onJumpTo?.(item.nodeId)}
                className="shrink-0 text-[10.5px] font-mono text-primary hover:underline"
                title="Center on canvas"
              >
                {item.nodeLabel || n?.id}
              </button>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-[10px] uppercase tracking-[0.16em] font-mono text-amber-700 dark:text-amber-400">{phaseLabel}</span>
                  {item.toolId && <span className="text-[10.5px] font-mono text-muted-foreground">{item.toolId}</span>}
                  <span className="text-[10.5px] font-mono text-muted-foreground/80">· {item.approval?.approvers || 'team:operators'}</span>
                  <span className="text-[10.5px] font-mono text-muted-foreground/80">· {item.approval?.channel || 'queue:default'}</span>
                </div>
                {item.preview && (
                  <pre className="mt-1 text-[10.5px] font-mono text-foreground/85 whitespace-pre-wrap line-clamp-3">{item.preview}</pre>
                )}
              </div>
              <div className="shrink-0 flex items-center gap-1.5">
                {decisions.map(d => {
                  const isReject = d === 'reject';
                  return (
                    <button
                      key={d}
                      type="button"
                      onClick={() => onResolve?.(item.nodeId, d)}
                      className={`text-[11px] px-2 py-1 rounded font-medium transition-colors ${
                        isReject
                          ? 'border border-destructive/60 text-destructive hover:bg-destructive/10'
                          : 'btn-primary'
                      }`}
                    >
                      {d}
                    </button>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export function TraceRail({ workflow, runStates, runResults, running, onRun, onStop, onClear, onJumpTo, activeNodeId, logs, open, setOpen, pendingApprovals, onResolveApproval }) {
  const [tab, setTab] = useState('steps'); // 'steps' | 'logs'
  const byId = Object.fromEntries(workflow.nodes.map(n => [n.id, n]));
  const order = Object.keys(runStates?.nodes || {});
  const doneCount = order.filter(id => runStates.nodes[id] === 'success').length;
  const pendingList = Object.values(pendingApprovals || {});
  const pendingCount = pendingList.length;
  // Auto-open the rail when an approval is pending so the user can act.
  const wasPendingRef = useRef(false);
  useEffect(() => {
    if (pendingCount > 0 && !wasPendingRef.current) {
      wasPendingRef.current = true;
      if (!open) setOpen?.(true);
    } else if (pendingCount === 0) {
      wasPendingRef.current = false;
    }
  }, [pendingCount, open, setOpen]);

  return (
    <div className={`shrink-0 border-t border-border bg-panel flex flex-col transition-all duration-300 ${open ? 'h-65' : 'h-10'}`}>
      {/* Header */}
      <div className="h-10 px-4 flex items-center justify-between border-b border-border shrink-0">
        <button onClick={() => setOpen(o => !o)} className="flex items-center gap-2 text-[11.5px] text-foreground font-medium">
          <svg width="10" height="10" viewBox="0 0 10 10" className={`transition-transform ${open ? '' : '-rotate-90'}`} fill="currentColor"><path d="M1 3h8L5 8z"/></svg>
          <span className="uppercase tracking-[0.18em] text-[10px] text-muted-foreground font-mono">Run trace</span>
          {running && pendingCount === 0 && (
            <span className="ml-2 flex items-center gap-1.5 px-2 py-0.5 rounded bg-primary/15 text-primary border border-primary/40 text-[10px] font-mono">
              <span className="h-1.5 w-1.5 rounded-full bg-primary" style={{ animation: 'pulse-dot 2.2s ease-in-out infinite' }} /> executing
            </span>
          )}
          {pendingCount > 0 && (
            <span className="ml-2 flex items-center gap-1.5 px-2 py-0.5 rounded bg-amber-400/15 text-amber-700 dark:text-amber-400 border border-amber-400/50 text-[10px] font-mono">
              <span className="h-1.5 w-1.5 rounded-full bg-amber-400" style={{ animation: 'pulse-dot 1.4s ease-in-out infinite' }} />
              {pendingCount} awaiting human
            </span>
          )}
          {!running && order.length > 0 && (
            <span className="ml-2 text-[10.5px] text-muted-foreground font-mono">
              {doneCount}/{order.length} steps complete
            </span>
          )}
        </button>
        <div className="flex items-center gap-2">
          {open && (
            <div className="flex items-center rounded-md border border-border overflow-hidden mr-1">
              <button
                onClick={(e) => { e.stopPropagation(); setTab('steps'); }}
                className={`px-2 py-0.5 text-[10.5px] font-medium transition-colors ${tab === 'steps' ? 'bg-panel2 text-foreground' : 'text-muted-foreground hover:text-foreground'}`}
              >Steps</button>
              <button
                onClick={(e) => { e.stopPropagation(); setTab('logs'); }}
                className={`px-2 py-0.5 text-[10.5px] font-medium transition-colors ${tab === 'logs' ? 'bg-panel2 text-foreground' : 'text-muted-foreground hover:text-foreground'}`}
              >Logs{logs.length > 0 ? ` (${logs.length})` : ''}</button>
            </div>
          )}
          <button onClick={onClear} disabled={running} className="text-[11px] text-muted-foreground hover:text-foreground px-2 py-1 rounded disabled:opacity-40">Clear</button>
          <button onClick={running ? onStop : onRun}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-[11.5px] font-medium transition-all active:scale-[0.97] ${
              running ? 'bg-destructive/15 text-destructive border border-destructive/50' : 'btn-primary'
            }`}>
            {running ? <><span className="h-2 w-2 bg-destructive rounded-sm" /> Stop</> : <><span className="inline-block" style={{ borderLeft: '7px solid currentColor', borderTop: '5px solid transparent', borderBottom: '5px solid transparent', marginLeft: '1px' }}/> Run workflow</>}
          </button>
        </div>
      </div>

      {open && (
        <div className="flex-1 min-h-0 overflow-hidden flex flex-col">
          {pendingCount > 0 && (
            <PendingApprovalsStrip
              items={pendingList}
              onResolve={onResolveApproval}
              onJumpTo={onJumpTo}
              workflow={workflow}
            />
          )}
          {tab === 'steps' && (
            order.length === 0 ? (
              <div className="h-full flex items-center px-4 text-[11.5px] text-muted-foreground font-mono">
                <span className="mr-2">▶</span> Press <span className="text-foreground mx-1">Run workflow</span> to watch execution light up the canvas.
              </div>
            ) : (
              <div className="flex-1 overflow-y-auto">
                <table className="w-full text-[11.5px] font-mono">
                  <thead className="sticky top-0 z-10 bg-panel border-b border-border">
                    <tr className="text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
                      <th className="text-left  px-3 py-2 font-medium w-12">#</th>
                      <th className="text-left  px-3 py-2 font-medium">Node</th>
                      <th className="text-left  px-3 py-2 font-medium w-28">Kind</th>
                      <th className="text-right px-3 py-2 font-medium w-24">Duration</th>
                      <th className="text-right px-3 py-2 font-medium w-28">Result</th>
                      <th className="text-right px-3 py-2 font-medium w-20">Cost</th>
                      <th className="text-left  px-3 py-2 font-medium w-28">State</th>
                    </tr>
                  </thead>
                  <tbody>
                    {order.map((nid, i) => {
                      const n = byId[nid];
                      const v = n && getVariant(n.variantId);
                      const state = runStates.nodes[nid];
                      const res = runResults?.[nid];
                      const isActive = nid === activeNodeId;
                      const rowTone =
                          state === 'awaiting' ? 'bg-amber-400/10 border-l-2 border-amber-400/60'
                        : isActive             ? 'bg-primary/10 border-l-2 border-primary'
                        : state === 'success'  ? 'hover:bg-panel2 border-l-2 border-transparent'
                        : state === 'running'  ? 'bg-primary/5 border-l-2 border-primary/40'
                        : state === 'error'    ? 'bg-destructive/5 border-l-2 border-destructive/40'
                        : 'hover:bg-panel2 border-l-2 border-transparent';
                      return (
                        <tr
                          key={nid}
                          onClick={() => onJumpTo(nid)}
                          className={`cursor-pointer border-b border-border/60 transition-colors ${rowTone}`}
                        >
                          <td className="px-3 py-1.5 text-muted-foreground tabular-nums">{String(i + 1).padStart(2, '0')}</td>
                          <td className="px-3 py-1.5">
                            <div className="text-[12px] font-medium text-foreground truncate not-italic font-sans">{n?.params?.label || v?.label}</div>
                            <div className="text-[10px] text-muted-foreground">{nid} · {v?.id}</div>
                          </td>
                          <td className="px-3 py-1.5 text-muted-foreground">{v?.kindDef.label}</td>
                          <td className="px-3 py-1.5 text-right tabular-nums text-foreground">{res?.latency ? `${res.latency}ms` : '—'}</td>
                          <td className="px-3 py-1.5 text-right tabular-nums text-muted-foreground">{metricFor(res, v)}</td>
                          <td className="px-3 py-1.5 text-right tabular-nums text-muted-foreground">{res?.cost ? `$${res.cost}` : '—'}</td>
                          <td className="px-3 py-1.5"><StateBadge state={state} /></td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )
          )}

          {tab === 'logs' && (
            <div className="flex-1 overflow-y-auto px-4 py-2 font-mono text-[11px] leading-relaxed">
              {logs.length === 0 ? (
                <div className="text-muted-foreground">—</div>
              ) : (
                logs.map((l, i) => (
                  <div key={i} className={
                    l.kind === 'start' ? 'text-foreground'
                    : l.kind === 'ok'  ? 'text-accent'
                    : l.kind === 'err' ? 'text-destructive'
                    : 'text-primary'
                  }>
                    <span className="text-muted-foreground mr-2 tabular-nums">
                      {new Date(l.t).toLocaleTimeString('en-US', { hour12: false })}
                    </span>
                    {l.msg}
                  </div>
                ))
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

/* Pick the approvals an agent node would actually fire on this run. We
   evaluate each approval's `required` condition against a stub context so
   the canvas demonstration is deterministic. before_run + before_tool gates
   pause *before* the node executes; after_run pauses *after*. on_demand
   randomly fires once mid-run to demo the pattern. */
function approvalsThatFire(node, phase, ctx) {
  const all = (node?.params?.approvals || []).filter(a => a.enabled);
  return all.filter(a => {
    const k = triggerKind(a.trigger);
    if (k !== phase) return false;
    try { return evalRequired(a.required, ctx); }
    catch { return false; }
  });
}

export function useRunner(workflow, setRunStates, setRunResults, setRunning, setLogs, setActiveNodeId, setPendingApprovals) {
  const stopRef = useRef(false);
  const resolversRef = useRef({});  // nodeId → resolver fn (for pending approvals)

  const resolve = (nodeId, decision) => {
    const r = resolversRef.current[nodeId];
    if (r) {
      delete resolversRef.current[nodeId];
      r(decision);
    }
  };

  const run = async () => {
    stopRef.current = false;
    setRunning(true);
    setLogs([]);
    setRunStates({ nodes: {}, edges: {} });
    setRunResults({});
    setActiveNodeId(null);
    setPendingApprovals?.({});

    const order = computeRunPlan(workflow);
    const byId = Object.fromEntries(workflow.nodes.map(n => [n.id, n]));

    for (const nid of order) {
      if (stopRef.current) break;
      const n = byId[nid];
      const v = getVariant(n.variantId);
      const incoming = workflow.edges.filter(e => e.to === nid);

      setActiveNodeId(nid);
      setRunStates(s => ({
        ...s,
        edges: { ...s.edges, ...Object.fromEntries(incoming.map(e => [e.id, 'running'])) },
        nodes: { ...s.nodes, [nid]: 'running' },
      }));
      setLogs(l => [...l, { t: Date.now(), nid, kind: 'start', msg: `→ ${v.label} (${nid})` }]);

      // Pre-flight approval (before_run)
      if (v.id === 'agent.autonomous') {
        const ctx = { context: n.params?.context_map || {}, result: null };
        const pre = approvalsThatFire(n, 'before_run', ctx);
        if (pre.length) {
          const decision = await pauseForApproval(nid, pre[0], 'before_run', ctx, n);
          if (stopRef.current) break;
          if (decision === 'reject' || decision === 'cancelled') {
            // Halt this node — mark error and skip the rest of the workflow.
            setRunStates(s => ({ ...s, nodes: { ...s.nodes, [nid]: 'error' } }));
            setLogs(l => [...l, { t: Date.now(), nid, kind: 'err', msg: `  ✕ ${v.label} rejected by reviewer` }]);
            break;
          }
        }
      }

      const dur = v.id.startsWith('human.') ? 1600
                : v.id === 'agent.autonomous' ? 1800 + Math.min((n.params?.tools?.length || 0), 4) * 350
                : v.id.startsWith('llm.') || v.id === 'agent.registry' ? 1100
                : v.id.startsWith('tool.') ? 850
                : v.id === 'policy.cedar' ? 500
                : 400;
      await new Promise(res => setTimeout(res, dur + Math.random() * 200));
      if (stopRef.current) break;

      const result = mockResult(v, n);

      // Post-flight approval (after_run) — evaluated against the result.
      if (v.id === 'agent.autonomous') {
        const ctx = { context: n.params?.context_map || {}, result: result.result };
        const post = approvalsThatFire(n, 'after_run', ctx);
        if (post.length) {
          // Stay in "running" state visually while paused for review.
          const decision = await pauseForApproval(nid, post[0], 'after_run', ctx, n);
          if (stopRef.current) break;
          if (decision === 'reject' || decision === 'cancelled') {
            setRunStates(s => ({ ...s, nodes: { ...s.nodes, [nid]: 'error' } }));
            setLogs(l => [...l, { t: Date.now(), nid, kind: 'err', msg: `  ✕ ${v.label} output rejected by reviewer` }]);
            break;
          }
        }
      }

      setRunStates(s => ({
        ...s,
        edges: { ...s.edges, ...Object.fromEntries(incoming.map(e => [e.id, 'done'])) },
        nodes: { ...s.nodes, [nid]: 'success' },
      }));
      setRunResults(r => ({ ...r, [nid]: result }));
      const summary = [
        result.tokens ? `${result.tokens}tok` : null,
        result.cost ? `$${result.cost}` : null,
        result.rows ? `${result.rows} rows` : null,
        result.status && typeof result.status === 'number' ? `HTTP ${result.status}` : null,
        result.by ? `by ${result.by}` : null,
        result.branch ? `→ ${result.branch}` : null,
        result.latency ? `${result.latency}ms` : null,
      ].filter(Boolean).join(' · ');
      setLogs(l => [...l, { t: Date.now(), nid, kind: 'ok', msg: `  ✓ ${v.label}  ${summary}` }]);
    }

    setActiveNodeId(null);
    setLogs(l => [...l, { t: Date.now(), kind: 'done', msg: `workflow complete · ${order.length} steps` }]);
    setRunning(false);
    setPendingApprovals?.({});
  };

  const pauseForApproval = (nid, approval, phase, ctx, node) => {
    return new Promise((resolveOuter) => {
      const previewText = renderPreview(approval.preview, ctx);
      const pending = {
        nodeId:    nid,
        nodeLabel: node.params?.label || node.id,
        approval,
        phase,
        preview:   previewText,
        toolId:    triggerToolId(approval.trigger) || null,
        startedAt: Date.now(),
      };
      setRunStates(s => ({ ...s, nodes: { ...s.nodes, [nid]: 'awaiting' } }));
      setPendingApprovals?.(p => ({ ...p, [nid]: pending }));
      setLogs(l => [...l, { t: Date.now(), nid, kind: 'wait', msg: `  ⏸ awaiting human (${phase})` }]);

      resolversRef.current[nid] = (decision) => {
        setPendingApprovals?.(p => { const n = { ...p }; delete n[nid]; return n; });
        setLogs(l => [...l, { t: Date.now(), nid, kind: decision === 'reject' ? 'err' : 'ok', msg: `  ${decision === 'reject' ? '✕' : '✓'} reviewer: ${decision}` }]);
        if (decision !== 'reject' && decision !== 'cancelled') {
          setRunStates(s => ({ ...s, nodes: { ...s.nodes, [nid]: 'running' } }));
        }
        resolveOuter(decision);
      };
    });
  };

  const stop = () => {
    stopRef.current = true;
    // Free any pending approval resolvers so the loop unwinds.
    for (const nid of Object.keys(resolversRef.current)) {
      resolve(nid, 'cancelled');
    }
  };

  return { run, stop, resolveApproval: resolve };
}
