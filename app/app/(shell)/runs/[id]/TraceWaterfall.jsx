'use client';

/* TraceWaterfall — the unified trace view.

   This replaces the prior 3-pane (tree · waterfall · detail) layout with a
   single LangSmith/Datadog-style waterfall where each span is one row:

     [chevron] [kind dot] [🔥 critical?] [name           ] [▌▌▌ bar  ] [dur] [status]
       └─ label column (sticky, ~340px) ─┘ └────── timeline column (flex) ──────┘

   The tree IS the waterfall. Selection opens a right-side drawer (handled
   by the parent), so the timeline gets the full content width.

   Above the rows we render three header strips, in this order:
     1. Tick axis (ms grid)
     2. Token-density band — where tokens were burned over time
     3. Gates lane — clickable dots at the moment each policy gate fired

   Replay states drive bar opacity/fill (pending = ghosted, running = striped
   moving fill, done = solid). Clicking the timeline column seeks the replay. */

import { useMemo } from 'react';
import { ChevronRight, Flame, AlertOctagon } from 'lucide-react';
import { KIND_META } from '../_traces';
import { spanProgress, placeGatesOnTimeline, tokenDensity } from './_replay';

const LABEL_W = 340;

const GATE_TONE = {
  block:           'var(--destructive)',
  require_approval:'var(--primary)',
  redact:          'var(--accent)',
  warn:            'var(--accent)',
  log:             'var(--muted-foreground)',
  allow:           'var(--brand-teal)',
};

export default function TraceWaterfall({
  trace,
  selectedId,
  onSelect,
  expanded,
  onToggle,
  currentMs,
  criticalIds = new Set(),
  filterText = '',
  gates = [],
  onSelectGate,
  onSeek,
}) {
  const { spans, totalDurMs } = trace;

  // Build a flat ordered list (pre-order) with depth, and a children index
  // for the chevrons. Same algorithm the previous waterfall used; this is
  // the single source of truth now.
  const { ordered, depths, hasChildren } = useMemo(() => {
    const childrenBy = new Map();
    for (const s of spans) {
      if (!childrenBy.has(s.parentId)) childrenBy.set(s.parentId, []);
      childrenBy.get(s.parentId).push(s);
    }
    for (const arr of childrenBy.values()) arr.sort((a, b) => a.startMs - b.startMs);
    const ordered = [];
    const depths = new Map();
    const hasChildren = new Map();
    const walk = (parentId, depth) => {
      const kids = childrenBy.get(parentId) || [];
      for (const s of kids) {
        depths.set(s.id, depth);
        hasChildren.set(s.id, (childrenBy.get(s.id) || []).length > 0);
        ordered.push(s);
        walk(s.id, depth + 1);
      }
    };
    walk(null, 0);
    return { ordered, depths, hasChildren };
  }, [spans]);

  // Filter visibility — when the user types in the filter box we hide rows
  // that don't match name/kind, but keep ancestors of any match so matched
  // rows remain reachable in their context.
  const visibleSet = useMemo(() => {
    if (!filterText?.trim()) return null;
    const q = filterText.trim().toLowerCase();
    const direct = new Set();
    for (const s of spans) {
      if ((s.name || '').toLowerCase().includes(q) ||
          (s.kind || '').toLowerCase().includes(q)) direct.add(s.id);
    }
    const byId = new Map(spans.map(s => [s.id, s]));
    const out = new Set(direct);
    for (const id of direct) {
      let cur = byId.get(id);
      while (cur && cur.parentId) {
        out.add(cur.parentId);
        cur = byId.get(cur.parentId);
      }
    }
    return out;
  }, [spans, filterText]);

  // Collapsed-children handling: if any ancestor of a row is collapsed, we
  // skip it. The chevron in the parent row is the only way back.
  const visibleByCollapse = useMemo(() => {
    const byId = new Map(spans.map(s => [s.id, s]));
    return (id) => {
      let cur = byId.get(id);
      // walk up; if any ancestor !expanded, hide
      while (cur && cur.parentId) {
        if (!expanded.has(cur.parentId)) return false;
        cur = byId.get(cur.parentId);
      }
      return true;
    };
  }, [spans, expanded]);

  // Tick values for the axis. Same logic as before.
  const ticks = tickValues(totalDurMs);
  const density = useMemo(() => tokenDensity(spans, totalDurMs, 60), [spans, totalDurMs]);
  const placedGates = useMemo(() => placeGatesOnTimeline(gates, spans, totalDurMs), [gates, spans, totalDurMs]);

  // Click on the timeline track seeks replay.
  const onTimelineClick = (e) => {
    if (!onSeek) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const ratio = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    onSeek(ratio * totalDurMs);
  };

  return (
    <div className="rounded-xl border border-border bg-card overflow-hidden">
      {/* ── Sticky header — tick axis + tokens band + gates lane ── */}
      <div
        className="sticky top-0 z-20 bg-card border-b border-border"
        style={{ paddingLeft: LABEL_W }}
      >
        <TimelineHeader
          totalDurMs={totalDurMs}
          ticks={ticks}
          density={density}
          gates={placedGates}
          currentMs={currentMs}
          onSelectGate={onSelectGate}
          onTimelineClick={onTimelineClick}
        />
      </div>

      {/* ── Rows ── */}
      <div className="relative" onClick={onTimelineClick} onMouseDownCapture={(e) => {
        // Only seek when click lands on the timeline cell, not the label.
        // The row itself uses stopPropagation on selection. We rely on the
        // delegated handler here for clicks in empty timeline gaps between
        // bars.
      }}>
        {/* Vertical playhead line spans all rows. */}
        <Playhead
          totalDurMs={totalDurMs}
          currentMs={currentMs}
          labelW={LABEL_W}
        />
        {/* Tick gridlines extend down across rows for visual alignment. */}
        <TickGrid totalDurMs={totalDurMs} ticks={ticks} labelW={LABEL_W} />

        <div className="divide-y divide-border/40">
          {ordered.map((s) => {
            if (visibleSet && !visibleSet.has(s.id)) return null;
            if (!visibleByCollapse(s.id)) return null;
            return (
              <SpanRow
                key={s.id}
                span={s}
                depth={depths.get(s.id) || 0}
                hasChildren={hasChildren.get(s.id) || false}
                isExpanded={expanded.has(s.id)}
                isSelected={selectedId === s.id}
                onCritical={criticalIds.has(s.id)}
                currentMs={currentMs}
                totalDurMs={totalDurMs}
                onSelect={onSelect}
                onToggle={onToggle}
              />
            );
          })}
        </div>
      </div>
    </div>
  );
}

/* ───────────────────── header strips ───────────────────── */

function TimelineHeader({ totalDurMs, ticks, density, gates, currentMs, onSelectGate, onTimelineClick }) {
  return (
    <div className="relative" onClick={onTimelineClick}>
      {/* Tick axis */}
      <div className="relative h-7 select-none">
        {ticks.map((t) => {
          const pct = (t / Math.max(1, totalDurMs)) * 100;
          return (
            <div key={t}
                 className="absolute top-0 bottom-0 flex items-end pb-1 -translate-x-1/2"
                 style={{ left: `${pct}%` }}>
              <span className="text-[9.5px] font-mono text-muted-foreground tabular-nums whitespace-nowrap">
                {formatTick(t)}
              </span>
            </div>
          );
        })}
      </div>

      {/* Token-density band */}
      <div className="relative h-5 px-px">
        <div
          className="absolute -left-[42px] top-0 bottom-0 w-10 flex items-center justify-end pr-1.5"
          style={{ top: 0 }}
        >
          <span className="text-[9px] font-mono uppercase tracking-[0.14em] text-muted-foreground">tok</span>
        </div>
        <div className="absolute inset-0 flex items-end gap-px">
          {density.map((d, i) => (
            <div
              key={i}
              className="flex-1 rounded-sm"
              style={{
                height: d.tokens === 0 ? 1 : `${Math.max(20, d.norm * 100)}%`,
                background: d.tokens === 0
                  ? 'color-mix(in oklab, var(--muted-foreground) 20%, transparent)'
                  : `color-mix(in oklab, var(--primary) ${30 + d.norm * 60}%, transparent)`,
                minHeight: 1,
              }}
              title={d.tokens === 0 ? '' : `+${Math.round(d.ms)}ms · ${Math.round(d.tokens).toLocaleString()} tokens`}
            />
          ))}
        </div>
      </div>

      {/* Gates lane */}
      <div className="relative h-6 border-t border-border/40">
        <div
          className="absolute -left-[42px] top-0 bottom-0 w-10 flex items-center justify-end pr-1.5"
        >
          <span className="text-[9px] font-mono uppercase tracking-[0.14em] text-muted-foreground">gates</span>
        </div>
        <div className="absolute left-0 right-0 top-1/2 h-px bg-border/40" />
        {gates.map(g => {
          const pct = (g.atMs / Math.max(1, totalDurMs)) * 100;
          const tone = GATE_TONE[g.decision] || GATE_TONE.allow;
          return (
            <button
              key={g.id}
              type="button"
              onClick={(e) => { e.stopPropagation(); onSelectGate?.(g); }}
              className="absolute top-1/2 -translate-x-1/2 -translate-y-1/2 h-3 w-3 rounded-full border hover:scale-125 transition-transform"
              style={{
                left: `${pct}%`,
                background: `color-mix(in oklab, ${tone} 18%, transparent)`,
                borderColor: tone,
              }}
              title={`${g.decision} · ${g.controlId}\n${g.detail || ''}`}
            >
              <span className="block h-1.5 w-1.5 rounded-full mx-auto" style={{ background: tone }} />
            </button>
          );
        })}
      </div>
    </div>
  );
}

function Playhead({ totalDurMs, currentMs, labelW }) {
  const pct = totalDurMs > 0 ? Math.max(0, Math.min(1, currentMs / totalDurMs)) : 0;
  return (
    <div
      className="absolute top-0 bottom-0 z-10 pointer-events-none"
      style={{ left: `calc(${labelW}px + (100% - ${labelW}px) * ${pct})` }}
    >
      <div className="absolute top-0 bottom-0 w-px bg-primary/70" />
      <div className="absolute top-0 -translate-x-1/2 h-1.5 w-1.5 rounded-full bg-primary" />
    </div>
  );
}

function TickGrid({ totalDurMs, ticks, labelW }) {
  return (
    <div className="absolute top-0 bottom-0 pointer-events-none" style={{ left: labelW, right: 0 }}>
      {ticks.map(t => {
        const pct = (t / Math.max(1, totalDurMs)) * 100;
        return (
          <div
            key={t}
            className="absolute top-0 bottom-0 w-px bg-border/30"
            style={{ left: `${pct}%` }}
          />
        );
      })}
    </div>
  );
}

/* ───────────────────── single span row ───────────────────── */

function SpanRow({
  span, depth, hasChildren, isExpanded, isSelected, onCritical,
  currentMs, totalDurMs, onSelect, onToggle,
}) {
  const kind = KIND_META[span.kind] || KIND_META.agent;
  const { state, pct } = spanProgress(span, currentMs);
  const isError = state === 'done' && span.status === 'error';
  const fill = isError ? 'var(--destructive)' : kind.color;

  const startPct = totalDurMs > 0 ? (span.startMs / totalDurMs) * 100 : 0;
  const widthPct = totalDurMs > 0 ? Math.max(0.3, (span.durMs / totalDurMs) * 100) : 0;

  const rowTone = isSelected ? 'bg-primary/[0.07]'
                : state === 'running' ? 'bg-primary/[0.04]'
                : onCritical ? 'bg-destructive/[0.025]'
                : 'hover:bg-muted/40';

  return (
    <div
      data-span-id={span.id}
      role="button"
      tabIndex={0}
      onClick={(e) => { e.stopPropagation(); onSelect(span.id); }}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onSelect(span.id);
        }
      }}
      className={`relative flex items-center text-[12px] cursor-pointer transition-colors ${rowTone}`}
      style={{ height: 30 }}
    >
      {/* Critical-path stripe: full-height tinted bar pinned to the left edge */}
      {onCritical && (
        <span aria-hidden className="absolute left-0 top-0 bottom-0 w-0.5 bg-destructive/70" />
      )}

      {/* Label column ─ chevron, depth indent, kind dot, name */}
      <div
        className="shrink-0 flex items-center gap-1.5 pr-3 py-1 min-w-0"
        style={{ width: 340, paddingLeft: 8 + depth * 14 }}
      >
        {hasChildren ? (
          <button
            onClick={(e) => { e.stopPropagation(); onToggle(span.id); }}
            className="h-4 w-4 rounded hover:bg-muted-foreground/20 shrink-0 flex items-center justify-center"
            aria-label={isExpanded ? 'Collapse' : 'Expand'}
          >
            <ChevronRight className={`h-3 w-3 text-muted-foreground transition-transform ${isExpanded ? 'rotate-90' : ''}`} />
          </button>
        ) : (
          <span className="h-4 w-4 shrink-0" />
        )}

        <span
          className={`h-1.5 w-1.5 rounded-full shrink-0 ${state === 'running' ? 'animate-pulse-dot' : ''}`}
          style={{
            background: state === 'pending'
              ? 'color-mix(in oklab, var(--muted-foreground) 40%, transparent)'
              : kind.color,
          }}
        />

        {onCritical && (
          <Flame className="h-3 w-3 text-destructive shrink-0" aria-label="critical path" />
        )}

        <span className={`truncate font-mono ${
          state === 'pending' ? 'text-muted-foreground/70' :
          isSelected ? 'text-foreground font-medium' :
          'text-foreground/90'
        }`}>
          {span.name}
        </span>
      </div>

      {/* Bar column ─ flex region with absolute-positioned bar */}
      <div className="relative flex-1 h-full min-w-0">
        {/* Bar */}
        <div
          className="absolute top-1/2 -translate-y-1/2 rounded-md overflow-hidden"
          style={{
            left: `${startPct}%`,
            width: `${widthPct}%`,
            height: 16,
            background: state === 'pending'
              ? `color-mix(in oklab, ${fill} 12%, transparent)`
              : `color-mix(in oklab, ${fill} 22%, transparent)`,
            border: state === 'pending'
              ? `1px dashed color-mix(in oklab, ${fill} 50%, transparent)`
              : (onCritical && !isError ? `1px solid color-mix(in oklab, ${fill} 70%, transparent)` : '1px solid transparent'),
            boxShadow: isSelected ? `inset 0 0 0 1.5px var(--primary)` : 'none',
          }}
        >
          {/* Filled portion — solid */}
          {state !== 'pending' && (
            <div
              className="absolute inset-y-0 left-0"
              style={{
                width: state === 'done' ? '100%' : `${Math.max(2, pct * 100)}%`,
                background: fill,
                opacity: isSelected ? 1 : 0.9,
              }}
            />
          )}
          {/* Animated stripe on the running portion */}
          {state === 'running' && (
            <div
              className="absolute inset-y-0 left-0 pointer-events-none"
              style={{
                width: `${Math.max(2, pct * 100)}%`,
                background: 'repeating-linear-gradient(-45deg, rgba(255,255,255,0.25) 0 4px, rgba(255,255,255,0.05) 4px 12px)',
                animation: 'wf-stripes 1.2s linear infinite',
              }}
            />
          )}
          {/* Inline duration label, white-on-bar, only when wide enough */}
          {state !== 'pending' && (
            <span
              className="absolute inset-y-0 left-1.5 flex items-center text-[10px] font-mono tabular-nums text-white/95 whitespace-nowrap"
              style={{ opacity: widthPct > 8 ? 1 : 0 }}
            >
              {Math.round(span.durMs)}ms
            </span>
          )}
        </div>

        {/* Right-side hover micro-stats — duration + status */}
        <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-2 text-[10.5px] font-mono">
          {state === 'running' && (
            <span className="inline-flex items-center gap-1 text-primary uppercase tracking-[0.14em]">
              <span className="h-1 w-1 rounded-full bg-primary animate-pulse" />
              running
            </span>
          )}
          {state === 'done' && isError && (
            <span className="inline-flex items-center gap-1 text-destructive">
              <AlertOctagon className="h-3 w-3" /> error
            </span>
          )}
          {state === 'pending' && (
            <span className="text-muted-foreground/60">queued</span>
          )}
        </div>
      </div>

      <style jsx>{`
        @keyframes wf-stripes {
          from { background-position: 0 0; }
          to   { background-position: 24px 0; }
        }
      `}</style>
    </div>
  );
}

/* ───────────────────── helpers ───────────────────── */

function tickValues(totalMs) {
  const candidates = [100, 200, 500, 1000, 2000, 5000, 10000, 20000];
  const step = candidates.find(c => totalMs / c <= 6) || candidates[candidates.length - 1];
  const out = [];
  for (let t = 0; t <= totalMs; t += step) out.push(t);
  if (out[out.length - 1] !== totalMs) out.push(totalMs);
  return out;
}
function formatTick(ms) {
  if (ms === 0) return '0';
  if (ms < 1000) return `${ms}ms`;
  return `${(ms / 1000).toFixed(1)}s`;
}
