'use client';

import { KIND_META } from '../_traces';
import { spanProgress } from './_replay';

export default function TraceTree({ spans, selectedId, onSelect, expanded, onToggle, currentMs }) {
  const children = new Map();
  for (const s of spans) {
    if (!children.has(s.parentId)) children.set(s.parentId, []);
    children.get(s.parentId).push(s);
  }
  for (const arr of children.values()) arr.sort((a, b) => a.startMs - b.startMs);
  const roots = children.get(null) || [];

  return (
    <div className="text-[12.5px] font-mono">
      {roots.map(r => (
        <Node
          key={r.id}
          span={r}
          depth={0}
          children={children}
          selectedId={selectedId}
          onSelect={onSelect}
          expanded={expanded}
          onToggle={onToggle}
          currentMs={currentMs}
        />
      ))}
    </div>
  );
}

function Node({ span, depth, children, selectedId, onSelect, expanded, onToggle, currentMs }) {
  const kids = children.get(span.id) || [];
  const isOpen = expanded.has(span.id);
  const isSelected = selectedId === span.id;
  const kind = KIND_META[span.kind] || KIND_META.agent;
  const { state } = spanProgress(span, currentMs);

  const textTone = state === 'pending' ? 'text-muted-foreground/60' :
                   state === 'running' ? 'text-foreground font-medium' :
                   isSelected          ? 'text-foreground font-medium' :
                                          'text-foreground/80';

  return (
    <div>
      <button
        onClick={() => onSelect(span.id)}
        className={`w-full flex items-center gap-1.5 px-2 py-1.5 rounded hover:bg-muted transition-colors text-left ${
          isSelected ? 'bg-primary/10' : state === 'running' ? 'bg-primary/5' : ''
        }`}
        style={{ paddingLeft: `${8 + depth * 14}px` }}
      >
        {kids.length > 0 ? (
          <button
            onClick={(e) => { e.stopPropagation(); onToggle(span.id); }}
            className="h-3.5 w-3.5 rounded hover:bg-muted-foreground/20 shrink-0 flex items-center justify-center"
            aria-label={isOpen ? 'Collapse' : 'Expand'}
          >
            <svg width="9" height="9" viewBox="0 0 10 10" fill="currentColor" className={`transition-transform ${isOpen ? '' : '-rotate-90'} text-muted-foreground`}>
              <path d="M1 3h8L5 8z"/>
            </svg>
          </button>
        ) : (
          <span className="h-3.5 w-3.5 shrink-0" />
        )}
        <span
          className={`h-1.5 w-1.5 rounded-full shrink-0 ${state === 'running' ? 'animate-pulse-dot' : ''}`}
          style={{ background: state === 'pending' ? 'color-mix(in oklab, var(--muted-foreground) 40%, transparent)' : kind.color }}
        />
        <span className={`truncate ${textTone}`}>{span.name}</span>
        {state === 'running' && (
          <span className="ml-auto inline-flex items-center gap-1 text-[9.5px] font-mono text-primary uppercase tracking-[0.14em]">
            <span className="h-1 w-1 rounded-full bg-primary animate-pulse" /> running
          </span>
        )}
        {state === 'done' && span.status === 'error' && (
          <span className="ml-auto text-[10px] text-destructive">✕</span>
        )}
        {state === 'done' && span.status !== 'error' && (
          <span className={`ml-auto tabular-nums text-[10.5px] ${isSelected ? 'text-foreground' : 'text-muted-foreground'}`}>{span.durMs}ms</span>
        )}
        {state === 'pending' && (
          <span className="ml-auto text-[9.5px] font-mono text-muted-foreground/60">queued</span>
        )}
      </button>
      {isOpen && kids.map(c => (
        <Node
          key={c.id}
          span={c}
          depth={depth + 1}
          children={children}
          selectedId={selectedId}
          onSelect={onSelect}
          expanded={expanded}
          onToggle={onToggle}
          currentMs={currentMs}
        />
      ))}
    </div>
  );
}
