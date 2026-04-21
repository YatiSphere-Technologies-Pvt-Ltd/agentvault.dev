'use client';

import { useMemo, useRef, useState, useEffect } from 'react';
import { KIND_META } from '../_traces';
import { spanProgress } from './_replay';

/* APM-style waterfall with replay-aware progressive fill.
   - Pending spans render as a ghosted outline
   - Running spans fill left-to-right based on currentMs, with a moving stripe
   - Done spans are solid
   - A vertical playhead line spans all rows at currentMs */
const ROW_H   = 22;
const ROW_GAP = 6;
const LABEL_W = 180;
const PAD_L   = 8;
const PAD_R   = 12;
const PAD_T   = 28;
const PAD_B   = 8;

export default function Waterfall({ trace, selectedId, onSelect, currentMs }) {
  const { spans, totalDurMs } = trace;

  const { ordered, depths } = useMemo(() => {
    const childrenBy = new Map();
    for (const s of spans) {
      if (!childrenBy.has(s.parentId)) childrenBy.set(s.parentId, []);
      childrenBy.get(s.parentId).push(s);
    }
    for (const arr of childrenBy.values()) arr.sort((a, b) => a.startMs - b.startMs);
    const ordered = [];
    const depths  = new Map();
    const walk = (parentId, depth) => {
      const kids = childrenBy.get(parentId) || [];
      for (const s of kids) {
        depths.set(s.id, depth);
        ordered.push(s);
        walk(s.id, depth + 1);
      }
    };
    walk(null, 0);
    return { ordered, depths };
  }, [spans]);

  const containerRef = useRef(null);
  const [width, setWidth] = useState(900);
  useEffect(() => {
    if (!containerRef.current) return;
    const ro = new ResizeObserver((entries) => {
      const w = entries[0]?.contentRect?.width;
      if (w && Math.abs(w - width) > 1) setWidth(w);
    });
    ro.observe(containerRef.current);
    return () => ro.disconnect();
  }, [width]);

  const innerW  = Math.max(320, width - LABEL_W - PAD_L - PAD_R);
  const pxPerMs = innerW / Math.max(1, totalDurMs);
  const ticks   = tickValues(totalDurMs);
  const height  = PAD_T + ordered.length * (ROW_H + ROW_GAP) + PAD_B;

  const playheadX = LABEL_W + Math.max(0, Math.min(innerW, currentMs * pxPerMs));

  return (
    <div ref={containerRef} className="relative w-full overflow-x-auto">
      <svg width={width} height={height} className="block select-none">
        <defs>
          <pattern id="wf-running-stripes" width="12" height="12" patternUnits="userSpaceOnUse" patternTransform="rotate(-45)">
            <rect width="12" height="12" fill="white" opacity="0.12" />
            <rect x="0" width="4" height="12" fill="white" opacity="0.28">
              <animate attributeName="x" from="-12" to="12" dur="1.2s" repeatCount="indefinite" />
            </rect>
          </pattern>
        </defs>

        <line x1={LABEL_W} y1={PAD_T - 6} x2={LABEL_W + innerW} y2={PAD_T - 6} stroke="currentColor" className="text-border" strokeWidth={1} />
        {ticks.map(t => (
          <g key={t} transform={`translate(${LABEL_W + t * pxPerMs}, 0)`}>
            <line y1={PAD_T - 10} y2={height - PAD_B} stroke="currentColor" className="text-border/50" strokeDasharray="2 3" strokeWidth={1} />
            <text y={PAD_T - 14} textAnchor="middle" className="fill-muted-foreground font-mono" style={{ fontSize: 10 }}>
              {formatTick(t)}
            </text>
          </g>
        ))}

        {ordered.map((s, i) => {
          const y = PAD_T + i * (ROW_H + ROW_GAP);
          const depth = depths.get(s.id) || 0;
          const kind = KIND_META[s.kind] || KIND_META.agent;
          const baseX = LABEL_W + Math.max(0, s.startMs * pxPerMs);
          const fullW = Math.max(2, s.durMs * pxPerMs);
          const { state, pct } = spanProgress(s, currentMs);
          const filledW = Math.max(1, fullW * pct);
          const isSelected = selectedId === s.id;
          const isError    = s.status === 'error' && state === 'done';
          const fill = isError ? 'var(--destructive)' : kind.color;

          return (
            <g key={s.id} onClick={() => onSelect(s.id)} className="cursor-pointer group">
              <text
                x={PAD_L + depth * 10}
                y={y + ROW_H / 2 + 4}
                className={`${state === 'pending' ? 'fill-muted-foreground' : 'fill-foreground'} ${isSelected ? 'font-semibold' : ''} group-hover:fill-primary`}
                style={{ fontSize: 11, fontFamily: 'var(--font-mono, ui-monospace)' }}
              >
                {truncate(s.name, Math.max(6, Math.floor((LABEL_W - PAD_L - depth * 10 - 10) / 6)))}
              </text>

              {/* ghost outline — full span width, always rendered */}
              <rect
                x={baseX}
                y={y + 2}
                width={fullW}
                height={ROW_H - 4}
                rx={3}
                fill={fill}
                fillOpacity={state === 'pending' ? 0.1 : 0.22}
                stroke={fill}
                strokeOpacity={state === 'pending' ? 0.35 : 0}
                strokeDasharray={state === 'pending' ? '3 3' : '0'}
                strokeWidth={1}
              />

              {/* filled portion */}
              {state !== 'pending' && (
                <rect
                  x={baseX}
                  y={y + 2}
                  width={state === 'done' ? fullW : filledW}
                  height={ROW_H - 4}
                  rx={3}
                  fill={fill}
                  fillOpacity={isSelected ? 1 : 0.9}
                />
              )}

              {/* animated stripe over the running portion */}
              {state === 'running' && filledW > 6 && (
                <rect
                  x={baseX}
                  y={y + 2}
                  width={filledW}
                  height={ROW_H - 4}
                  rx={3}
                  fill="url(#wf-running-stripes)"
                  pointerEvents="none"
                />
              )}

              {isSelected && (
                <rect
                  x={baseX - 1}
                  y={y + 1}
                  width={fullW + 2}
                  height={ROW_H - 2}
                  rx={4}
                  fill="none"
                  stroke={fill}
                  strokeWidth={1.5}
                />
              )}

              {fullW > 48 && state !== 'pending' && (
                <text
                  x={baseX + 6}
                  y={y + ROW_H / 2 + 4}
                  fill="white"
                  style={{ fontSize: 10, fontFamily: 'var(--font-mono, ui-monospace)' }}
                >
                  {Math.round(s.durMs)}ms
                </text>
              )}

              <title>{`${s.name} · ${s.kind} · ${s.durMs}ms${isError ? ' · error' : ''}`}</title>
            </g>
          );
        })}

        {/* playhead */}
        <g pointerEvents="none">
          <line x1={playheadX} y1={PAD_T - 10} x2={playheadX} y2={height - PAD_B}
            stroke="var(--primary)" strokeOpacity="0.9" strokeWidth={1.5} />
          <polygon
            points={`${playheadX - 4},${PAD_T - 12} ${playheadX + 4},${PAD_T - 12} ${playheadX},${PAD_T - 4}`}
            fill="var(--primary)"
          />
        </g>
      </svg>
    </div>
  );
}

function tickValues(totalMs) {
  const candidates = [100, 200, 500, 1000, 2000, 5000, 10000, 20000];
  const step = candidates.find(c => totalMs / c <= 6) || candidates[candidates.length - 1];
  const out = [];
  for (let t = 0; t <= totalMs; t += step) out.push(t);
  if (out[out.length - 1] !== totalMs) out.push(totalMs);
  return out;
}
function formatTick(ms) {
  if (ms < 1000) return `${ms}`;
  return `${(ms / 1000).toFixed(1)}s`;
}
function truncate(s, maxChars) {
  if (!s) return '';
  if (s.length <= maxChars) return s;
  return s.slice(0, Math.max(1, maxChars - 1)) + '…';
}
