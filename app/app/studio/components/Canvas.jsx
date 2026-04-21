'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { getVariant, NODE_KINDS, NodeIcon } from './node-kinds';
import { NODE_H, NODE_W } from './seed';

// n8n-style: every node is a uniform rounded rectangle. Kind is conveyed by
// the brand-colored icon tile on the left, not by silhouette.
function shapePath() {
  const w = NODE_W, h = NODE_H;
  const r = 12;
  return `M ${r} 0 H ${w - r} A ${r} ${r} 0 0 1 ${w} ${r} V ${h - r} A ${r} ${r} 0 0 1 ${w - r} ${h} H ${r} A ${r} ${r} 0 0 1 0 ${h - r} V ${r} A ${r} ${r} 0 0 1 ${r} 0 Z`;
}

export function nodePortPos(n, side) {
  if (side === 'in')  return { x: n.x,          y: n.y + NODE_H / 2 };
  return                       { x: n.x + NODE_W, y: n.y + NODE_H / 2 };
}

function bezierPath(a, b) {
  const dx = Math.max(60, Math.abs(b.x - a.x) * 0.5);
  return `M ${a.x} ${a.y} C ${a.x + dx} ${a.y}, ${b.x - dx} ${b.y}, ${b.x} ${b.y}`;
}

// Per-variant brand palette — color of the icon tile. Keeps n8n vibe:
// every node wears its integration's brand color so the canvas reads
// chromatically at a glance.
const BRAND = {
  // triggers — green family (entry points)
  'trigger.webhook':  '#10B981',
  'trigger.schedule': '#14B8A6',
  'trigger.event':    '#06B6D4',
  // AI — violet family
  'llm.chat':         '#8B5CF6',
  'llm.classify':     '#A855F7',
  'llm.extract':      '#7C3AED',
  'agent.registry':   '#3B5CFF',
  // tools — real brand colors
  'tool.http':        '#6B7280',
  'tool.salesforce':  '#00A1E0',
  'tool.netsuite':    '#126DFF',
  'tool.snowflake':   '#29B5E8',
  'tool.slack':       '#4A154B',
  // flow / human / policy — warm accents
  'human.slack':      '#E11D48',
  'human.email':      '#F59E0B',
  'policy.cedar':     '#0891B2',
  'branch.if':        '#F97316',
  'code.js':          '#EAB308',
  'code.py':          '#2563EB',
  // outputs — slate
  'output.return':    '#475569',
  'output.webhook':   '#334155',
};

function brandFor(variantId) {
  return BRAND[variantId] || '#6B7280';
}

// Distinctive white glyph on colored tile — n8n-style brand marks.
// Size is 22px inside a 40px tile; strokes at 1.8 for crisp readability.
function BrandGlyph({ variantId, size = 22 }) {
  const s = size;
  const p = { width: s, height: s, viewBox: '0 0 24 24', fill: 'none', stroke: 'white', strokeWidth: 1.8, strokeLinecap: 'round', strokeLinejoin: 'round' };
  switch (variantId) {
    // Triggers
    case 'trigger.webhook':
      return <svg {...p}><circle cx="7" cy="15.5" r="2.5"/><circle cx="17" cy="15.5" r="2.5"/><circle cx="12" cy="6" r="2.5"/><path d="M10.5 8l-2.8 5M13.5 8l2.8 5M9 15.5h6"/></svg>;
    case 'trigger.schedule':
      return <svg {...p}><circle cx="12" cy="12" r="8"/><path d="M12 7v5l3.5 2.5"/></svg>;
    case 'trigger.event':
      return <svg {...p}><circle cx="12" cy="12" r="2"/><path d="M7.5 7.5a6 6 0 000 9M16.5 7.5a6 6 0 010 9M4.5 4.5a10 10 0 000 15M19.5 4.5a10 10 0 010 15"/></svg>;

    // LLM — sparkle-star
    case 'llm.chat':
      return <svg {...p}><path d="M12 3v5M12 16v5M3 12h5M16 12h5M6 6l3 3M18 18l-3-3M18 6l-3 3M6 18l3-3"/></svg>;
    case 'llm.classify':
      // tag-with-dot
      return <svg {...p}><path d="M3 12V4h8l10 10-8 8L3 12z"/><circle cx="7.5" cy="7.5" r="1.4" fill="white" stroke="none"/></svg>;
    case 'llm.extract':
      // braces
      return <svg {...p}><path d="M9 4c-2.5 0-2.5 2.5-2.5 4s0 3-2.5 3c2.5 0 2.5 1.5 2.5 3s0 4 2.5 4"/><path d="M15 4c2.5 0 2.5 2.5 2.5 4s0 3 2.5 3c-2.5 0-2.5 1.5-2.5 3s0 4-2.5 4"/></svg>;
    case 'agent.registry':
      // avatar-in-crosshair
      return <svg {...p}><circle cx="12" cy="9.5" r="3.5"/><path d="M4 19c1-3.5 4-5 8-5s7 1.5 8 5"/></svg>;

    // Tools — brand-ish glyphs in white
    case 'tool.http':
      return <svg {...p}><path d="M8 6l-5 6 5 6M16 6l5 6-5 6"/></svg>;
    case 'tool.salesforce':
      // stylized cloud
      return <svg {...p} strokeWidth="1.6"><path d="M6.5 17a4 4 0 110-8 5 5 0 019.7-1.5A4 4 0 0118 17H6.5z"/></svg>;
    case 'tool.netsuite':
      // bar-chart / ledger
      return <svg {...p}><path d="M4 20V10M10 20V5M16 20v-7M22 20V14"/></svg>;
    case 'tool.snowflake':
      // 6-point snowflake
      return <svg {...p}><path d="M12 3v18M3 12h18M6 6l12 12M18 6L6 18M9 5l3-2 3 2M9 19l3 2 3-2M5 9l-2 3 2 3M19 9l2 3-2 3"/></svg>;
    case 'tool.slack':
      // Slack-ish four-corner squares
      return <svg {...p} strokeWidth="1.6"><rect x="10" y="3"  width="4" height="7" rx="2"/><rect x="10" y="14" width="4" height="7" rx="2"/><rect x="3"  y="10" width="7" height="4" rx="2"/><rect x="14" y="10" width="7" height="4" rx="2"/></svg>;

    // Humans
    case 'human.slack':
      // person + chat bubble
      return <svg {...p}><circle cx="12" cy="9" r="3.2"/><path d="M5 20c1-3.5 3.5-5 7-5s6 1.5 7 5"/></svg>;
    case 'human.email':
      return <svg {...p}><rect x="3" y="6" width="18" height="12" rx="1.5"/><path d="M3 7.5l9 6 9-6"/></svg>;

    // Policy
    case 'policy.cedar':
      return <svg {...p}><path d="M12 3l8 3v5c0 5-3.5 8-8 9-4.5-1-8-4-8-9V6l8-3z"/><path d="M9 12l2.2 2.2L15.5 10"/></svg>;

    // Branch
    case 'branch.if':
      return <svg {...p}><circle cx="6" cy="5" r="1.8"/><circle cx="6" cy="19" r="1.8"/><circle cx="18" cy="19" r="1.8"/><path d="M6 6.8v10.4M6 12c0 3.5 2.5 6 6 6h4"/></svg>;

    // Code
    case 'code.js':
    case 'code.py':
      return <svg {...p}><path d="M9 7l-6 5 6 5M15 7l6 5-6 5"/></svg>;

    // Outputs
    case 'output.return':
    case 'output.webhook':
      return <svg {...p}><path d="M3 12h14M12 6l6 6-6 6"/></svg>;

    default:
      return <svg {...p}><rect x="5" y="5" width="14" height="14" rx="3"/></svg>;
  }
}

function LiveStrip({ variant, runState, tick }) {
  if (runState !== 'running') return null;
  const id = variant.id;
  const tokens = 80 + (tick % 500);
  if (id.startsWith('llm.') || id === 'agent.registry') {
    return (
      <div className="flex items-center gap-1.5 text-[9.5px] font-mono text-primary">
        <span className="inline-block h-1 w-1 rounded-full bg-primary" style={{ animation: 'blink 1.1s ease-in-out infinite' }} />
        <span>streaming · {tokens} tok</span>
      </div>
    );
  }
  if (id.startsWith('tool.') || id === 'trigger.webhook') {
    return (
      <div className="flex items-center gap-1.5 text-[9.5px] font-mono text-primary">
        <svg width="10" height="10" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="2.2" style={{ animation: 'spin-slow 2s linear infinite' }}>
          <path d="M10 3a7 7 0 017 7" strokeLinecap="round"/>
        </svg>
        <span>awaiting 200…</span>
      </div>
    );
  }
  if (id.startsWith('human.')) {
    return (
      <div className="flex items-center gap-1.5 text-[9.5px] font-mono text-primary">
        <span className="inline-block h-1 w-1 rounded-full bg-primary" style={{ animation: 'blink 1.1s ease-in-out infinite' }} />
        <span>waiting @approver</span>
      </div>
    );
  }
  if (id === 'policy.cedar') {
    return (
      <div className="flex items-center gap-1.5 text-[9.5px] font-mono text-primary">
        <svg width="10" height="10" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="2.2" style={{ animation: 'spin-slow 2s linear infinite' }}>
          <path d="M10 3a7 7 0 017 7" strokeLinecap="round"/>
        </svg>
        <span>evaluating rules…</span>
      </div>
    );
  }
  if (id.startsWith('branch.')) return <div className="text-[9.5px] font-mono text-primary">evaluating…</div>;
  if (id.startsWith('code.'))   return <div className="text-[9.5px] font-mono text-primary">executing · {Math.round(tick / 10)}ms</div>;
  return <div className="text-[9.5px] font-mono text-primary">running…</div>;
}

function DoneStrip({ variant, result }) {
  if (!result) return null;
  const id = variant.id;
  if (id.startsWith('llm.') || id === 'agent.registry')
    return <div className="text-[9.5px] font-mono text-accent">✓ {result.tokens} tok · ${result.cost}</div>;
  if (id.startsWith('tool.snowflake'))
    return <div className="text-[9.5px] font-mono text-accent">✓ {result.rows} rows</div>;
  if (id.startsWith('tool.'))
    return <div className="text-[9.5px] font-mono text-accent">✓ {result.status} · {result.latency}ms</div>;
  if (id.startsWith('human.'))
    return <div className="text-[9.5px] font-mono text-accent">✓ approved · {result.by}</div>;
  if (id === 'policy.cedar')
    return <div className="text-[9.5px] font-mono text-accent">✓ allow · {result.rules} rules</div>;
  if (id.startsWith('branch.'))
    return <div className="text-[9.5px] font-mono text-accent">→ {result.branch}</div>;
  return <div className="text-[9.5px] font-mono text-accent">✓ {result.latency}ms</div>;
}

function NodeCard({ node, selected, runState, runResult, tick, onMouseDown, onPortDown, onClick }) {
  const v = getVariant(node.variantId);
  if (!v) return null;
  const accent = v.kindDef.accent;
  const brand = brandFor(v.id);

  const stateClass =
      runState === 'running' ? 'node-running'
    : runState === 'success' ? 'node-success'
    : runState === 'error'   ? 'node-error'
    : selected ? 'node-selected' : '';

  const stroke =
      runState === 'running' ? 'var(--primary)'
    : runState === 'success' ? 'var(--accent)'
    : runState === 'error'   ? 'var(--destructive)'
    : selected ? 'var(--primary)'
    : 'var(--border)';
  const strokeW = (runState === 'running' || selected) ? 1.8 : 1.2;

  const kindColors = { primary: 'text-primary', accent: 'text-accent', foreground: 'text-foreground' };
  const kindColor = kindColors[accent] || 'text-muted-foreground';

  return (
    <div
      data-node-id={node.id}
      onMouseDown={(e) => onMouseDown(e, node.id)}
      onClick={(e) => { e.stopPropagation(); onClick(node.id); }}
      className={`node-shell absolute select-none ${stateClass}`}
      style={{ left: node.x, top: node.y, width: NODE_W, height: NODE_H, cursor: 'grab' }}
    >
      <svg width={NODE_W} height={NODE_H} className="absolute inset-0 pointer-events-none overflow-visible">
        <defs>
          <linearGradient id={`grad-${node.id}`} x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%"   stopColor="var(--panel)" />
            <stop offset="100%" stopColor="var(--panel-2)" />
          </linearGradient>
        </defs>
        <path d={shapePath()} fill={`url(#grad-${node.id})`} stroke={stroke} strokeWidth={strokeW} />
      </svg>

      <div className="relative h-full w-full flex items-center gap-3 pointer-events-none pl-2.5 pr-4">
        {/* Brand-colored icon tile — n8n's signature move */}
        <div
          className="shrink-0 h-13 w-13 rounded-lg flex items-center justify-center"
          style={{
            background: brand,
            boxShadow: `0 4px 10px ${brand}33, inset 0 1px 0 rgba(255,255,255,0.18)`,
          }}
        >
          <BrandGlyph variantId={v.id} size={26} />
        </div>

        <div className="flex-1 min-w-0">
          <div className={`text-[9.5px] uppercase tracking-[0.18em] font-medium ${kindColor}`}>
            {v.kindDef.label}
          </div>
          <div className="text-[13px] font-semibold text-foreground truncate leading-tight mt-0.5">
            {node.params?.label || v.label}
          </div>
          {runState === 'running'
            ? <LiveStrip variant={v} runState={runState} tick={tick} />
            : runState === 'success'
              ? <DoneStrip variant={v} result={runResult} />
              : <div className="text-[9.5px] font-mono text-muted-foreground truncate">{v.sub} · {node.id}</div>
          }
        </div>
      </div>

      {runState === 'running' && (
        <div className="absolute pointer-events-none" style={{ inset: 0 }}>
          <svg width={NODE_W} height={NODE_H} className="absolute overflow-visible">
            <path d={shapePath()} fill="none" stroke="var(--primary)" strokeWidth="2" opacity="0.6">
              <animate attributeName="stroke-opacity" values="0.7;0.15;0.7" dur="1.2s" repeatCount="indefinite" />
            </path>
          </svg>
        </div>
      )}

      {v.kind !== 'trigger' && (
        <div
          className="port absolute h-3 w-3 rounded-full cursor-crosshair"
          style={{
            left: -6, top: NODE_H / 2 - 6,
            background: 'var(--panel)',
            border: '2px solid var(--border)',
            boxShadow: '0 0 0 2px var(--panel-2)',
          }}
          data-port="in"
          onMouseDown={(e) => { e.stopPropagation(); onPortDown(e, node.id, 'in'); }}
        />
      )}
      {v.kind !== 'output' && (
        <div
          className="port absolute h-3 w-3 rounded-full cursor-crosshair"
          style={{
            right: -6, top: NODE_H / 2 - 6,
            background: 'var(--primary)',
            border: '2px solid var(--panel)',
            boxShadow: '0 0 8px color-mix(in oklab, var(--primary) 60%, transparent)',
          }}
          data-port="out"
          onMouseDown={(e) => { e.stopPropagation(); onPortDown(e, node.id, 'out'); }}
        />
      )}
    </div>
  );
}

function AddStepPopover({ x, y, fromNodeId, onPick, onClose }) {
  const [q, setQ] = useState('');
  const all = [];
  Object.entries(NODE_KINDS).forEach(([kind, def]) => {
    def.variants.forEach(v => all.push({ ...v, kind, kindDef: def }));
  });
  const filtered = all.filter(v => {
    if (!q) return true;
    const Q = q.toLowerCase();
    return v.label.toLowerCase().includes(Q) || v.kindDef.label.toLowerCase().includes(Q) || v.sub.toLowerCase().includes(Q);
  });
  return (
    <div className="add-step-popover" style={{ left: x, top: y }} onClick={(e) => e.stopPropagation()} onMouseDown={(e) => e.stopPropagation()}>
      <div className="px-2 pt-1 pb-2 border-b border-border">
        <input
          autoFocus
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search node to add…"
          onKeyDown={(e) => { if (e.key === 'Escape') onClose(); }}
          className="w-full px-2 py-1.5 text-[12px] bg-panel2 border border-border rounded focus:outline-none focus:border-primary"
        />
        <div className="text-[9.5px] uppercase tracking-[0.15em] text-muted-foreground mt-1 font-mono">
          after {fromNodeId}
        </div>
      </div>
      <div className="pt-1">
        {filtered.slice(0, 16).map(v => {
          const bg = v.kindDef.accent === 'primary' ? 'color-mix(in oklab, var(--primary) 85%, transparent)'
                   : v.kindDef.accent === 'accent'  ? 'color-mix(in oklab, var(--accent) 85%, transparent)'
                   : 'var(--muted)';
          return (
            <button
              key={v.id}
              onClick={() => onPick(v.id)}
              className="w-full flex items-center gap-2.5 px-2 py-1.5 rounded hover:bg-panel2 text-left"
            >
              <div className="shrink-0 h-6 w-6 rounded flex items-center justify-center text-white" style={{ background: bg }}>
                <NodeIcon name={v.icon} size={12} />
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-[12px] text-foreground truncate">{v.label}</div>
                <div className="text-[10px] text-muted-foreground truncate">{v.kindDef.label} · {v.sub}</div>
              </div>
            </button>
          );
        })}
        {filtered.length === 0 && <div className="px-2 py-4 text-[11px] text-muted-foreground text-center">no matches</div>}
      </div>
    </div>
  );
}

export default function Canvas({
  workflow, setWorkflow,
  selectedId, setSelectedId,
  runStates, runResults, tick,
  viewport, setViewport,
  onAddAfter,
  fitViewRef,
}) {
  const stageRef = useRef(null);
  const viewRef = useRef(viewport);
  viewRef.current = viewport;
  const wfRef = useRef(workflow);
  wfRef.current = workflow;

  const [drag, setDrag] = useState(null);
  const [pan, setPan] = useState(null);
  const [drawEdge, setDrawEdge] = useState(null);
  const [addStep, setAddStep] = useState(null);

  const toCanvas = useCallback((clientX, clientY) => {
    const rect = stageRef.current.getBoundingClientRect();
    const x = (clientX - rect.left - viewRef.current.x) / viewRef.current.zoom;
    const y = (clientY - rect.top  - viewRef.current.y) / viewRef.current.zoom;
    return { x, y };
  }, []);

  const onNodeMouseDown = useCallback((e, nodeId) => {
    if (e.button !== 0) return;
    const n = wfRef.current.nodes.find(x => x.id === nodeId);
    if (!n) return;
    const p = toCanvas(e.clientX, e.clientY);
    setDrag({ nodeId, offsetX: p.x - n.x, offsetY: p.y - n.y });
    setSelectedId(nodeId);
    document.querySelector('.studio-root')?.classList.add('dragging');
    e.preventDefault();
  }, [toCanvas, setSelectedId]);

  const onPortDown = useCallback((e, nodeId, side) => {
    if (e.button !== 0) return;
    const p = toCanvas(e.clientX, e.clientY);
    setDrawEdge({ fromId: nodeId, side, cursorX: p.x, cursorY: p.y });
    document.querySelector('.studio-root')?.classList.add('dragging');
    e.preventDefault();
  }, [toCanvas]);

  const onStageMouseDown = (e) => {
    if (!(e.target === stageRef.current || e.target.classList.contains('canvas-dots-overlay') || e.target.classList.contains('canvas-stage'))) return;
    setPan({ startX: e.clientX, startY: e.clientY, origX: viewport.x, origY: viewport.y });
    setSelectedId(null);
    setAddStep(null);
    document.querySelector('.studio-root')?.classList.add('dragging');
    e.preventDefault();
  };

  useEffect(() => {
    const onMove = (e) => {
      if (drag) {
        const p = toCanvas(e.clientX, e.clientY);
        setWorkflow(w => ({
          ...w,
          nodes: w.nodes.map(n => n.id === drag.nodeId
            ? { ...n, x: Math.round((p.x - drag.offsetX) / 10) * 10, y: Math.round((p.y - drag.offsetY) / 10) * 10 }
            : n),
        }));
      } else if (pan) {
        setViewport(v => ({ ...v, x: pan.origX + (e.clientX - pan.startX), y: pan.origY + (e.clientY - pan.startY), smooth: false }));
      } else if (drawEdge) {
        const p = toCanvas(e.clientX, e.clientY);
        setDrawEdge(d => ({ ...d, cursorX: p.x, cursorY: p.y }));
      }
    };
    const onUp = (e) => {
      if (drawEdge) {
        const el = document.elementFromPoint(e.clientX, e.clientY);
        if (el && el.classList.contains('port') && el.getAttribute('data-port') === 'in') {
          const parent = el.closest('[data-node-id]');
          const toId = parent?.getAttribute('data-node-id');
          if (toId && toId !== drawEdge.fromId) {
            setWorkflow(w => {
              const exists = w.edges.some(ed => ed.from === drawEdge.fromId && ed.to === toId);
              if (exists) return w;
              return { ...w, edges: [...w.edges, { id: 'e' + Date.now(), from: drawEdge.fromId, to: toId }] };
            });
          }
        }
      }
      setDrag(null);
      setPan(null);
      setDrawEdge(null);
      document.querySelector('.studio-root')?.classList.remove('dragging');
    };
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
    return () => { window.removeEventListener('mousemove', onMove); window.removeEventListener('mouseup', onUp); };
  }, [drag, pan, drawEdge, toCanvas, setWorkflow, setViewport]);

  const onWheel = (e) => {
    e.preventDefault();
    const rect = stageRef.current.getBoundingClientRect();
    const mx = e.clientX - rect.left;
    const my = e.clientY - rect.top;
    const delta = -e.deltaY * 0.0015;
    const newZoom = Math.min(2, Math.max(0.3, viewport.zoom * (1 + delta)));
    const wx = (mx - viewport.x) / viewport.zoom;
    const wy = (my - viewport.y) / viewport.zoom;
    setViewport({ zoom: newZoom, x: mx - wx * newZoom, y: my - wy * newZoom });
  };

  useEffect(() => {
    const onKey = (e) => {
      if ((e.key === 'Delete' || e.key === 'Backspace') && selectedId && e.target === document.body) {
        setWorkflow(w => ({
          ...w,
          nodes: w.nodes.filter(n => n.id !== selectedId),
          edges: w.edges.filter(ed => ed.from !== selectedId && ed.to !== selectedId),
        }));
        setSelectedId(null);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [selectedId, setWorkflow, setSelectedId]);

  const nodeMap = useMemo(() => Object.fromEntries(workflow.nodes.map(n => [n.id, n])), [workflow.nodes]);

  const [hoverNodeId, setHoverNodeId] = useState(null);
  const showAddPlus = hoverNodeId && !drag && !pan && !drawEdge && !addStep;

  const addPlusPos = (() => {
    if (!hoverNodeId) return null;
    const n = nodeMap[hoverNodeId];
    if (!n) return null;
    const v = getVariant(n.variantId);
    if (v?.kind === 'output') return null;
    return { x: n.x + NODE_W + 34, y: n.y + NODE_H / 2 };
  })();

  // Expose fitView to parent
  useEffect(() => {
    if (!fitViewRef) return;
    fitViewRef.current = (opts = {}) => {
      if (!wfRef.current.nodes.length) return;
      const stage = stageRef.current;
      if (!stage) return;
      const rect = stage.getBoundingClientRect();
      const xs = wfRef.current.nodes.map(n => n.x);
      const ys = wfRef.current.nodes.map(n => n.y);
      const minX = Math.min(...xs) - 60;
      const minY = Math.min(...ys) - 60;
      const maxX = Math.max(...xs) + NODE_W + 60;
      const maxY = Math.max(...ys) + NODE_H + 60;
      const w = maxX - minX, h = maxY - minY;
      const zoom = Math.min(rect.width / w, rect.height / h, 1);
      setViewport({
        zoom,
        x: (rect.width - w * zoom) / 2 - minX * zoom,
        y: (rect.height - h * zoom) / 2 - minY * zoom,
        smooth: !!opts.smooth,
      });
    };
  }, [fitViewRef, setViewport]);

  return (
    <div
      ref={stageRef}
      data-studio-stage
      onMouseDown={onStageMouseDown}
      onWheel={onWheel}
      onMouseLeave={() => setHoverNodeId(null)}
      className="canvas-stage relative w-full h-full overflow-hidden"
      style={{ cursor: pan ? 'grabbing' : 'default' }}
    >
      <div className="canvas-dots-overlay" />

      <div
        className="absolute top-0 left-0 origin-top-left"
        style={{
          transform: `translate(${viewport.x}px, ${viewport.y}px) scale(${viewport.zoom})`,
          transition: viewport.smooth ? 'transform 0.6s cubic-bezier(0.4, 0, 0.2, 1)' : 'none',
        }}
      >
        <svg
          className="absolute pointer-events-none"
          style={{ left: -5000, top: -5000, width: 10000, height: 10000, overflow: 'visible' }}
          viewBox="-5000 -5000 10000 10000"
        >
          <defs>
            <marker id="arrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="5" markerHeight="5" orient="auto-start-reverse">
              <path d="M 0 0 L 10 5 L 0 10 z" fill="color-mix(in oklab, var(--muted-foreground) 60%, transparent)" />
            </marker>
            <marker id="arrow-running" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
              <path d="M 0 0 L 10 5 L 0 10 z" fill="var(--primary)" />
            </marker>
            <marker id="arrow-done" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="5" markerHeight="5" orient="auto-start-reverse">
              <path d="M 0 0 L 10 5 L 0 10 z" fill="var(--accent)" />
            </marker>
          </defs>
          {workflow.edges.map(ed => {
            const a = nodeMap[ed.from]; const b = nodeMap[ed.to];
            if (!a || !b) return null;
            const p1 = nodePortPos(a, 'out');
            const p2 = nodePortPos(b, 'in');
            const state = runStates?.edges?.[ed.id];
            const isRunning = state === 'running';
            const isDone    = state === 'done';
            const stroke = isRunning ? 'var(--primary)'
                         : isDone    ? 'var(--accent)'
                         : 'color-mix(in oklab, var(--muted-foreground) 35%, transparent)';
            const pathD = bezierPath(p1, p2);
            return (
              <g key={ed.id}>
                <path d={pathD}
                  fill="none"
                  stroke={stroke}
                  strokeWidth={isRunning ? 2.2 : isDone ? 1.6 : 1.2}
                  className={isRunning ? 'edge-running' : ''}
                  markerEnd={`url(#${isRunning ? 'arrow-running' : isDone ? 'arrow-done' : 'arrow'})`}
                />
                {isRunning && (
                  <circle r="3.5" className="edge-particle">
                    <animateMotion dur="1.1s" repeatCount="indefinite" path={pathD} />
                  </circle>
                )}
                {ed.label && (
                  <g transform={`translate(${(p1.x + p2.x) / 2}, ${(p1.y + p2.y) / 2 - 10})`}>
                    <rect x={-(ed.label.length * 3.4 + 8)} y={-9} width={ed.label.length * 6.8 + 16} height={18} rx={9}
                      fill="var(--panel)" stroke="var(--border)" strokeWidth={1}/>
                    <text textAnchor="middle" y={3.5} fontSize={10} fill="var(--muted-foreground)" style={{ fontFamily: 'var(--font-mono), monospace' }}>{ed.label}</text>
                  </g>
                )}
              </g>
            );
          })}
          {drawEdge && (() => {
            const src = nodeMap[drawEdge.fromId];
            if (!src) return null;
            const a = nodePortPos(src, 'out');
            const b = { x: drawEdge.cursorX, y: drawEdge.cursorY };
            return <path d={bezierPath(a, b)} stroke="var(--primary)" strokeWidth="2" strokeDasharray="5 4" fill="none" />;
          })()}
        </svg>

        <div onMouseOver={(e) => {
          const el = e.target.closest && e.target.closest('[data-node-id]');
          if (el) setHoverNodeId(el.getAttribute('data-node-id'));
        }} onMouseOut={(e) => {
          if (!e.relatedTarget || (e.relatedTarget.closest && !e.relatedTarget.closest('[data-node-id]') && !e.relatedTarget.closest('[data-add-plus]'))) {
            setHoverNodeId(null);
          }
        }}>
          {workflow.nodes.map(n => (
            <NodeCard
              key={n.id}
              node={n}
              selected={selectedId === n.id}
              runState={runStates?.nodes?.[n.id]}
              runResult={runResults?.[n.id]}
              tick={tick}
              onMouseDown={onNodeMouseDown}
              onPortDown={onPortDown}
              onClick={setSelectedId}
            />
          ))}

          {showAddPlus && addPlusPos && (
            <button
              data-add-plus
              className="absolute h-7 w-7 rounded-full flex items-center justify-center text-primary-foreground ghost-add visible transition-transform hover:scale-110"
              style={{
                left: addPlusPos.x - 14, top: addPlusPos.y - 14,
                background: 'var(--primary)',
                boxShadow: '0 0 0 3px var(--panel-2), 0 0 16px color-mix(in oklab, var(--primary) 60%, transparent)',
              }}
              title="Add next step"
              onClick={(e) => {
                e.stopPropagation();
                const rect = stageRef.current.getBoundingClientRect();
                const sx = rect.left + addPlusPos.x * viewport.zoom + viewport.x + 16;
                const sy = rect.top  + addPlusPos.y * viewport.zoom + viewport.y + 14;
                setAddStep({ fromId: hoverNodeId, sx: sx - rect.left, sy: sy - rect.top });
              }}
            >
              <svg width="14" height="14" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round"><path d="M10 4v12M4 10h12"/></svg>
            </button>
          )}
        </div>
      </div>

      {addStep && (
        <AddStepPopover
          x={addStep.sx}
          y={addStep.sy}
          fromNodeId={addStep.fromId}
          onClose={() => setAddStep(null)}
          onPick={(variantId) => {
            onAddAfter(addStep.fromId, variantId);
            setAddStep(null);
          }}
        />
      )}

      <div className="absolute bottom-5 right-5 z-20 flex flex-col gap-1 bg-panel border border-border rounded-md shadow-lg p-1">
        <button onClick={() => setViewport(v => ({ ...v, zoom: Math.min(2, v.zoom * 1.15), smooth: false }))}
          className="h-7 w-7 flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-panel2 rounded" title="Zoom in">+</button>
        <button onClick={() => setViewport(v => ({ ...v, zoom: Math.max(0.3, v.zoom / 1.15), smooth: false }))}
          className="h-7 w-7 flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-panel2 rounded" title="Zoom out">−</button>
        <div className="h-px bg-border mx-1" />
        <button onClick={() => fitViewRef?.current?.()}
          className="h-7 w-7 flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-panel2 rounded font-mono text-[10px]" title="Fit view">⤢</button>
      </div>

      <div className="absolute bottom-5 left-5 z-20 bg-panel border border-border rounded-md px-2.5 py-1 font-mono text-[10.5px] text-muted-foreground">
        {Math.round(viewport.zoom * 100)}%
      </div>

      <div className="absolute top-5 left-1/2 -translate-x-1/2 z-20 text-[10.5px] text-muted-foreground bg-panel/80 backdrop-blur border border-border rounded-md px-3 py-1 pointer-events-none whitespace-nowrap">
        Drag · Scroll · Hover <span className="text-primary">+</span> to add
      </div>
    </div>
  );
}
