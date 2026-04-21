'use client';

import { useState } from 'react';
import { NODE_KINDS, NodeIcon } from './node-kinds';

export default function Sidebar({ onAddNode, workflow, collapsed, onToggle }) {
  const [query, setQuery] = useState('');
  const [openCat, setOpenCat] = useState({ Triggers: true, AI: true, Integrations: true, Flow: true, Output: true });

  if (collapsed) {
    return (
      <aside className="w-10 shrink-0 h-full border-r border-border bg-panel flex flex-col items-center py-3 gap-3 relative">
        <button onClick={onToggle} className="h-7 w-7 flex items-center justify-center rounded hover:bg-panel2 text-muted-foreground hover:text-foreground" title="Expand library">
          <svg width="12" height="12" viewBox="0 0 12 12" fill="currentColor"><path d="M4 2l5 4-5 4V2z"/></svg>
        </button>
        <div className="h-px w-6 bg-border" />
        <div className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground" style={{ writingMode: 'vertical-rl' }}>
          Node library
        </div>
      </aside>
    );
  }

  const cats = {};
  Object.entries(NODE_KINDS).forEach(([kind, def]) => {
    def.variants.forEach(v => {
      (cats[def.category] ||= []).push({ ...v, kind, kindDef: def });
    });
  });

  const q = query.toLowerCase().trim();
  const matches = (v) => !q || v.label.toLowerCase().includes(q) || v.sub.toLowerCase().includes(q) || v.kindDef.label.toLowerCase().includes(q);

  return (
    <aside className="w-[260px] shrink-0 h-full border-r border-border bg-panel flex flex-col">
      <div className="px-4 py-3 border-b border-border flex items-center justify-between">
        <div>
          <div className="text-[10.5px] uppercase tracking-[0.2em] text-muted-foreground">Node library</div>
          <div className="text-[12.5px] font-semibold text-foreground mt-0.5">{Object.values(cats).reduce((a,b) => a + b.length, 0)} blocks</div>
        </div>
        <button onClick={onToggle} className="h-7 w-7 flex items-center justify-center rounded hover:bg-panel2 text-muted-foreground hover:text-foreground" title="Collapse library">
          <svg width="12" height="12" viewBox="0 0 12 12" fill="currentColor"><path d="M8 2L3 6l5 4V2z"/></svg>
        </button>
      </div>

      <div className="px-3 py-2.5 border-b border-border">
        <div className="relative">
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search nodes…"
            className="w-full pl-7 pr-2 py-1.5 rounded-md bg-panel2 border border-border text-[12px] focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all"
          />
          <svg width="12" height="12" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.8" className="absolute left-2 top-1/2 -translate-y-1/2 text-muted-foreground">
            <circle cx="9" cy="9" r="6"/><path d="M14 14l4 4"/>
          </svg>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto py-2">
        {Object.entries(cats).map(([cat, vars]) => {
          const visible = vars.filter(matches);
          if (q && visible.length === 0) return null;
          return (
            <div key={cat} className="mb-1">
              <button
                onClick={() => setOpenCat(o => ({ ...o, [cat]: !o[cat] }))}
                className="w-full flex items-center justify-between px-4 py-1.5 text-[10.5px] uppercase tracking-[0.2em] text-muted-foreground hover:text-foreground"
              >
                <span>{cat}</span>
                <span className="font-mono text-[9px]">{openCat[cat] ? '▾' : '▸'}</span>
              </button>
              {openCat[cat] && (
                <div className="px-2 space-y-1">
                  {visible.map(v => {
                    const bg = v.kindDef.accent === 'primary' ? 'color-mix(in oklab, var(--primary) 85%, transparent)'
                             : v.kindDef.accent === 'accent'  ? 'color-mix(in oklab, var(--accent) 85%, transparent)'
                             : 'var(--muted)';
                    return (
                      <button
                        key={v.id}
                        onClick={() => onAddNode(v.id)}
                        className="group w-full flex items-center gap-2.5 px-2 py-1.5 rounded-md hover:bg-panel2 border border-transparent hover:border-border transition-all text-left"
                        title={v.kindDef.desc}
                      >
                        <div className="shrink-0 h-7 w-7 rounded flex items-center justify-center text-white" style={{ background: bg }}>
                          <NodeIcon name={v.icon} size={12} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="text-[12px] text-foreground truncate font-medium">{v.label}</div>
                          <div className="text-[10px] text-muted-foreground truncate">{v.kindDef.label} · {v.sub}</div>
                        </div>
                        <span className="text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity font-mono text-[11px]">+</span>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </div>

      <div className="border-t border-border px-4 py-3 text-[10.5px] text-muted-foreground">
        <div className="font-mono flex items-center justify-between">
          <span>{workflow.nodes.length} nodes · {workflow.edges.length} edges</span>
          <span className="text-accent flex items-center gap-1">
            <span className="h-1.5 w-1.5 rounded-full bg-accent" style={{ animation: 'pulse-dot 2.2s ease-in-out infinite' }}/> ready
          </span>
        </div>
      </div>
    </aside>
  );
}
