'use client';

import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Canvas from './Canvas';
import Inspector from './Inspector';
import { getVariant } from './node-kinds';
import { TraceRail, useRunner } from './run';
import { NODE_H, NODE_W, SEED_WORKFLOW } from './seed';
import Sidebar from './Sidebar';
import { agentToWorkflow } from './agentToWorkflow';
import { readBody, useWorkflows, writeBody } from './_workflowStore';
import WorkflowSwitcher from './WorkflowSwitcher';

const AGENTS_STORAGE_KEY = 'av-agents-v3';

/* Read the agent by id from localStorage and return its derived workflow, or
   null if the agent can't be found. Pure sync access so we can decide at
   mount time whether to skip the default workflow hydration path. */
function loadAgentDerivedWorkflow(agentId) {
  if (!agentId) return null;
  try {
    const raw = localStorage.getItem(AGENTS_STORAGE_KEY);
    if (!raw) return null;
    const list = JSON.parse(raw);
    const agent = list.find(a => a.id === agentId);
    if (!agent) return null;
    return { workflow: agentToWorkflow(agent), agent };
  } catch {
    return null;
  }
}

function nextNodeId(wf) {
  let i = 1;
  while (wf.nodes.some(n => n.id === 'n' + i)) i++;
  return 'n' + i;
}

export default function StudioApp() {
  const search = useSearchParams();
  const agentId = search.get('agent');
  const isAgentView = !!agentId;

  const [workflow, setWorkflow] = useState(SEED_WORKFLOW);
  const [agentMeta, setAgentMeta] = useState(null);   // { id, name, mode, status } for banner
  const [selectedId, setSelectedId] = useState(null);
  const [viewport, setViewport] = useState({ x: 40, y: 40, zoom: 0.6 });
  const [runStates, setRunStates] = useState({ nodes: {}, edges: {} });
  const [runResults, setRunResults] = useState({});
  const [running, setRunning] = useState(false);
  const [logs, setLogs] = useState([]);
  const [activeNodeId, setActiveNodeId] = useState(null);
  const [traceOpen, setTraceOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(true);
  const [inspectorCollapsed, setInspectorCollapsed] = useState(true);
  const [tick, setTick] = useState(0);
  const [hydrated, setHydrated] = useState(false);

  const fitViewRef = useRef(null);

  // Workflow store — only matters when we're NOT in agent-projection mode.
  const workflows = useWorkflows();

  // Hydrate on mount (and whenever the selected workflow changes) — either
  // load the agent-derived workflow (read-only) or the current workflow's
  // body from the store.
  useEffect(() => {
    if (isAgentView) {
      const derived = loadAgentDerivedWorkflow(agentId);
      if (derived) {
        setWorkflow(derived.workflow);
        setAgentMeta({
          id: derived.agent.id,
          name: derived.agent.name,
          mode: derived.agent.mode || 'simple',
          status: derived.agent.version?.status,
        });
      }
      setHydrated(true);
      return;
    }
    if (!workflows.ready || !workflows.currentId) return;
    const body = readBody(workflows.currentId);
    if (body) {
      setWorkflow(body);
    } else {
      // Shouldn't happen (the store ensures a body exists), but fall back to seed.
      setWorkflow(SEED_WORKFLOW);
    }
    // Reset any prior run / selection state when switching workflows.
    setSelectedId(null);
    setRunStates({ nodes: {}, edges: {} });
    setRunResults({});
    setLogs([]);
    setActiveNodeId(null);
    setHydrated(true);
  }, [isAgentView, agentId, workflows.ready, workflows.currentId]);

  useEffect(() => {
    if (!running) return;
    const i = setInterval(() => setTick(t => t + 1), 80);
    return () => clearInterval(i);
  }, [running]);

  useEffect(() => {
    if (!hydrated) return;
    // Never persist the agent-derived workflow — the agent is the source of truth.
    if (isAgentView) return;
    if (!workflows.currentId) return;
    writeBody(workflows.currentId, workflow);
    // Touch list metadata so updatedAt stays fresh + name reflects inline edits.
    workflows.touch(workflows.currentId, { name: workflow.name || 'Untitled workflow' });
  }, [workflow, hydrated, isAgentView, workflows.currentId]);

  useEffect(() => {
    if (selectedId) setInspectorCollapsed(false);
  }, [selectedId]);

  const selectedNode = useMemo(() => workflow.nodes.find(n => n.id === selectedId), [workflow.nodes, selectedId]);
  const selectedVariant = useMemo(() => selectedNode ? getVariant(selectedNode.variantId) : null, [selectedNode]);

  const addNode = useCallback((variantId, at) => {
    const v = getVariant(variantId);
    const id = nextNodeId(workflow);
    let x, y;
    if (at) { x = at.x; y = at.y; }
    else {
      const stage = document.querySelector('[data-studio-stage]');
      const rect = stage ? stage.getBoundingClientRect() : { width: 1200, height: 600 };
      x = (-viewport.x + rect.width / 2) / viewport.zoom - NODE_W / 2;
      y = (-viewport.y + rect.height / 2) / viewport.zoom - NODE_H / 2;
    }
    const node = {
      id, variantId,
      x: Math.round((x + (Math.random() * 20 - 10)) / 10) * 10,
      y: Math.round((y + (Math.random() * 20 - 10)) / 10) * 10,
      params: { ...(v.kindDef.defaultParams(variantId) || {}) },
    };
    setWorkflow(w => ({ ...w, nodes: [...w.nodes, node] }));
    setSelectedId(id);
    return id;
  }, [workflow, viewport]);

  const addAfter = useCallback((fromId, variantId) => {
    const src = workflow.nodes.find(n => n.id === fromId);
    if (!src) return;
    const newX = src.x + NODE_W + 80;
    const newY = src.y;
    const newId = addNode(variantId, { x: newX, y: newY });
    setTimeout(() => {
      setWorkflow(w => ({ ...w, edges: [...w.edges, { id: 'e' + Date.now(), from: fromId, to: newId }] }));
    }, 0);
  }, [workflow, addNode]);

  const updateNode = useCallback((id, patch) => {
    setWorkflow(w => ({ ...w, nodes: w.nodes.map(n => n.id === id ? { ...n, ...patch } : n) }));
  }, []);

  const deleteNode = useCallback((id) => {
    setWorkflow(w => ({ ...w, nodes: w.nodes.filter(n => n.id !== id), edges: w.edges.filter(e => e.from !== id && e.to !== id) }));
    setSelectedId(null);
  }, []);

  // Re-fit whenever panel layout changes or on mount
  useEffect(() => {
    const t = setTimeout(() => fitViewRef.current?.(), 80);
    return () => clearTimeout(t);
  }, [sidebarCollapsed, inspectorCollapsed]);

  useEffect(() => {
    const t = setTimeout(() => fitViewRef.current?.(), 60);
    return () => clearTimeout(t);
  }, []);

  const centerOnNode = useCallback((nid) => {
    const n = workflow.nodes.find(x => x.id === nid);
    if (!n) return;
    const stage = document.querySelector('[data-studio-stage]');
    if (!stage) return;
    const rect = stage.getBoundingClientRect();
    const zoom = Math.max(viewport.zoom, 0.7);
    setViewport({
      zoom,
      x: rect.width / 2 - (n.x + NODE_W / 2) * zoom,
      y: rect.height / 2 - (n.y + NODE_H / 2) * zoom,
      smooth: true,
    });
    setSelectedId(nid);
  }, [workflow.nodes, viewport.zoom]);

  // Cinematic follow during run
  useEffect(() => {
    if (!running || !activeNodeId) return;
    const n = workflow.nodes.find(x => x.id === activeNodeId);
    if (!n) return;
    const stage = document.querySelector('[data-studio-stage]');
    if (!stage) return;
    const rect = stage.getBoundingClientRect();
    const zoom = 0.9;
    setViewport({
      zoom,
      x: rect.width / 2 - (n.x + NODE_W / 2) * zoom,
      y: rect.height / 2 - (n.y + NODE_H / 2) * zoom,
      smooth: true,
    });
  }, [activeNodeId, running, workflow.nodes]);

  const priorRunRef = useRef(false);
  useEffect(() => {
    if (running) { priorRunRef.current = true; return; }
    if (!priorRunRef.current) return;
    const t = setTimeout(() => fitViewRef.current?.({ smooth: true }), 500);
    return () => clearTimeout(t);
  }, [running]);

  const { run, stop } = useRunner(workflow, setRunStates, setRunResults, setRunning, setLogs, setActiveNodeId);

  const clearRun = () => {
    setRunStates({ nodes: {}, edges: {} });
    setRunResults({});
    setLogs([]);
    setActiveNodeId(null);
  };

  const resetWorkflow = () => {
    if (typeof window !== 'undefined' && window.confirm('Reset to seed workflow?')) {
      setWorkflow(SEED_WORKFLOW);
      setSelectedId(null);
      clearRun();
      setTimeout(() => fitViewRef.current?.(), 50);
    }
  };

  return (
    <div className="studio-root h-screen w-screen flex flex-col bg-hero-bg">
      {/* Top bar */}
      <div className="h-14 shrink-0 bg-panel border-b border-border flex items-center justify-between px-5 relative">
        <div className="flex items-center gap-3 min-w-0">
          {isAgentView && agentMeta ? (
            <Link href={`/app/agents/${agentMeta.id}`} className="text-[11.5px] text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1.5">
              <span>←</span><span>Back to {agentMeta.name}</span>
            </Link>
          ) : (
            <Link href="/app" className="text-[11.5px] text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1.5">
              <span>←</span><span>Back to dashboard</span>
            </Link>
          )}
          <span className="h-4 w-px bg-border" />
          <svg width="20" height="20" viewBox="0 0 22 22" fill="none">
            <rect x="1" y="1" width="20" height="20" stroke="var(--primary)" strokeWidth="1.5" />
            <rect x="5" y="5" width="12" height="12" stroke="var(--accent)" strokeWidth="1" />
            <circle cx="11" cy="11" r="2.5" fill="var(--primary)" />
          </svg>
          <div className="min-w-0">
            {isAgentView ? (
              <>
                <div className="text-[14px] font-semibold text-foreground px-1.5 py-0.5 truncate">
                  {workflow.name}
                </div>
                <div className="text-[10.5px] text-muted-foreground font-mono px-1.5 flex items-center gap-1.5 whitespace-nowrap">
                  <span>derived from agent</span>
                  {agentMeta?.status && <span className="text-accent">· {agentMeta.status}</span>}
                </div>
              </>
            ) : (
              <WorkflowSwitcher
                list={workflows.list}
                currentId={workflows.currentId}
                onSwitch={workflows.switchTo}
                onCreate={(args) => workflows.create(args)}
                onDuplicate={workflows.duplicate}
                onRename={(id, name) => {
                  workflows.rename(id, name);
                  // Keep the in-memory workflow's name in sync for the canvas + persist path
                  setWorkflow(w => ({ ...w, name }));
                }}
                onRemove={workflows.remove}
              />
            )}
          </div>
        </div>

        <div className="flex items-center gap-2">
          <div className="hidden md:flex items-center gap-1.5 px-2.5 py-1 rounded-md chip-sandbox text-[10.5px] font-mono">
            <span className="h-1.5 w-1.5 rounded-full bg-accent" style={{ animation: 'pulse-dot 2.2s ease-in-out infinite' }} />
            <span>{isAgentView ? 'read-only' : 'sandbox'}</span>
          </div>
          {isAgentView && agentMeta ? (
            <Link href={`/app/agents/${agentMeta.id}`} className="btn-primary text-[11.5px] px-3 py-1.5 rounded-md font-medium">
              Edit in agent →
            </Link>
          ) : (
            <>
              <button onClick={resetWorkflow} className="btn-ghost text-[11.5px] px-2.5 py-1.5 rounded-md">Reset</button>
              <button className="btn-ghost text-[11.5px] px-2.5 py-1.5 rounded-md">Validate</button>
              <button className="btn-primary text-[11.5px] px-3 py-1.5 rounded-md font-medium">Promote ↗</button>
            </>
          )}
        </div>
      </div>

      {/* Read-only banner when viewing an agent — tells the user the canvas
          is a projection, not the source of truth. */}
      {isAgentView && agentMeta && (
        <div className="shrink-0 border-b border-border bg-primary/5 text-[11.5px] px-5 py-2 flex items-center gap-3 flex-wrap">
          <span className="uppercase tracking-[0.18em] font-mono text-[10px] text-primary">Read-only</span>
          <span className="text-muted-foreground">
            This canvas is a projection of <span className="text-foreground font-medium">{agentMeta.name}</span>. Edits don't persist — use the agent's configuration tabs to change things.
          </span>
          <span className="ml-auto">
            <Link href={`/app/agents/${agentMeta.id}`} className="text-primary hover:underline underline-offset-2">Open agent →</Link>
          </span>
        </div>
      )}

      <div className="flex-1 flex min-h-0">
        <Sidebar
          onAddNode={(vid) => addNode(vid)}
          workflow={workflow}
          collapsed={sidebarCollapsed}
          onToggle={() => setSidebarCollapsed(v => !v)}
        />
        <main className="flex-1 flex flex-col min-w-0 relative">
          <div className="flex-1 relative min-h-0">
            <Canvas
              workflow={workflow}
              setWorkflow={setWorkflow}
              selectedId={selectedId}
              setSelectedId={setSelectedId}
              runStates={runStates}
              runResults={runResults}
              tick={tick}
              viewport={viewport}
              setViewport={setViewport}
              onAddAfter={addAfter}
              fitViewRef={fitViewRef}
            />
          </div>
          <TraceRail
            workflow={workflow}
            runStates={runStates}
            runResults={runResults}
            running={running}
            activeNodeId={activeNodeId}
            logs={logs}
            onRun={run}
            onStop={stop}
            onClear={clearRun}
            onJumpTo={centerOnNode}
            open={traceOpen}
            setOpen={setTraceOpen}
          />
        </main>
        <Inspector
          node={selectedNode}
          variant={selectedVariant}
          onUpdate={updateNode}
          onDelete={deleteNode}
          onClose={() => setSelectedId(null)}
          runStates={runStates}
          collapsed={inspectorCollapsed}
          onToggle={() => setInspectorCollapsed(v => !v)}
        />
      </div>
    </div>
  );
}
