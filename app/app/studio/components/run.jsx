'use client';

import { useRef, useState } from 'react';
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

function mockResult(variant) {
  const id = variant.id;
  if (id.startsWith('llm.') || id === 'agent.registry')
    return { tokens: 140 + Math.round(Math.random() * 800), cost: (0.0008 + Math.random() * 0.008).toFixed(4), latency: 400 + Math.round(Math.random() * 800) };
  if (id === 'tool.snowflake') return { rows: 1 + Math.round(Math.random() * 42), latency: 120 + Math.round(Math.random() * 300) };
  if (id.startsWith('tool.')) return { status: 200, latency: 80 + Math.round(Math.random() * 400) };
  if (id.startsWith('human.')) return { by: '@alice', latency: 1200 + Math.round(Math.random() * 3000) };
  if (id === 'policy.cedar') return { rules: 12, latency: 18 + Math.round(Math.random() * 22) };
  if (id.startsWith('branch.')) return { branch: Math.random() > 0.5 ? 'standard' : 'high-value', latency: 2 };
  return { latency: 30 + Math.round(Math.random() * 200) };
}

function metricFor(res, v) {
  if (!res || !v) return '—';
  const id = v.id;
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
    running: { tone: 'text-primary border-primary/50 bg-primary/10',     label: 'running' },
    success: { tone: 'text-accent  border-accent/50  bg-accent/10',      label: 'success' },
    error:   { tone: 'text-destructive border-destructive/50 bg-destructive/10', label: 'error'   },
  };
  const m = map[state];
  if (!m) return <span className="text-muted-foreground font-mono text-[10px]">pending</span>;
  return (
    <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded border text-[10px] font-mono ${m.tone}`}>
      {state === 'running' && <span className="h-1.5 w-1.5 rounded-full bg-primary" style={{ animation: 'pulse-dot 2.2s ease-in-out infinite' }} />}
      {state === 'success' && <span>✓</span>}
      {state === 'error'   && <span>✕</span>}
      {m.label}
    </span>
  );
}

export function TraceRail({ workflow, runStates, runResults, running, onRun, onStop, onClear, onJumpTo, activeNodeId, logs, open, setOpen }) {
  const [tab, setTab] = useState('steps'); // 'steps' | 'logs'
  const byId = Object.fromEntries(workflow.nodes.map(n => [n.id, n]));
  const order = Object.keys(runStates?.nodes || {});
  const doneCount = order.filter(id => runStates.nodes[id] === 'success').length;

  return (
    <div className={`shrink-0 border-t border-border bg-panel flex flex-col transition-all duration-300 ${open ? 'h-65' : 'h-10'}`}>
      {/* Header */}
      <div className="h-10 px-4 flex items-center justify-between border-b border-border shrink-0">
        <button onClick={() => setOpen(o => !o)} className="flex items-center gap-2 text-[11.5px] text-foreground font-medium">
          <svg width="10" height="10" viewBox="0 0 10 10" className={`transition-transform ${open ? '' : '-rotate-90'}`} fill="currentColor"><path d="M1 3h8L5 8z"/></svg>
          <span className="uppercase tracking-[0.18em] text-[10px] text-muted-foreground font-mono">Run trace</span>
          {running && (
            <span className="ml-2 flex items-center gap-1.5 px-2 py-0.5 rounded bg-primary/15 text-primary border border-primary/40 text-[10px] font-mono">
              <span className="h-1.5 w-1.5 rounded-full bg-primary" style={{ animation: 'pulse-dot 2.2s ease-in-out infinite' }} /> executing
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
        <div className="flex-1 min-h-0 overflow-hidden">
          {tab === 'steps' && (
            order.length === 0 ? (
              <div className="h-full flex items-center px-4 text-[11.5px] text-muted-foreground font-mono">
                <span className="mr-2">▶</span> Press <span className="text-foreground mx-1">Run workflow</span> to watch execution light up the canvas.
              </div>
            ) : (
              <div className="h-full overflow-y-auto">
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
                      const rowTone = isActive
                        ? 'bg-primary/10 border-l-2 border-primary'
                        : state === 'success' ? 'hover:bg-panel2 border-l-2 border-transparent'
                        : state === 'running' ? 'bg-primary/5 border-l-2 border-primary/40'
                        : state === 'error'   ? 'bg-destructive/5 border-l-2 border-destructive/40'
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
            <div className="h-full overflow-y-auto px-4 py-2 font-mono text-[11px] leading-relaxed">
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

export function useRunner(workflow, setRunStates, setRunResults, setRunning, setLogs, setActiveNodeId) {
  const stopRef = useRef(false);

  const run = async () => {
    stopRef.current = false;
    setRunning(true);
    setLogs([]);
    setRunStates({ nodes: {}, edges: {} });
    setRunResults({});
    setActiveNodeId(null);

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

      const dur = v.id.startsWith('human.') ? 1600
                : v.id.startsWith('llm.') || v.id === 'agent.registry' ? 1100
                : v.id.startsWith('tool.') ? 850
                : v.id === 'policy.cedar' ? 500
                : 400;
      await new Promise(res => setTimeout(res, dur + Math.random() * 200));
      if (stopRef.current) break;

      const result = mockResult(v);
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
        result.status ? `HTTP ${result.status}` : null,
        result.by ? `by ${result.by}` : null,
        result.branch ? `→ ${result.branch}` : null,
        result.latency ? `${result.latency}ms` : null,
      ].filter(Boolean).join(' · ');
      setLogs(l => [...l, { t: Date.now(), nid, kind: 'ok', msg: `  ✓ ${v.label}  ${summary}` }]);
    }

    setActiveNodeId(null);
    setLogs(l => [...l, { t: Date.now(), kind: 'done', msg: `workflow complete · ${order.length} steps` }]);
    setRunning(false);
  };

  const stop = () => { stopRef.current = true; };

  return { run, stop };
}
