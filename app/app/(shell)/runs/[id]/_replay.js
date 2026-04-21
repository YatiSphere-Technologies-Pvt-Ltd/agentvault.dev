'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

/* Drives a scrubbable replay of a static trace.
   state.currentMs — where the head is; 0 on mount, advances while playing.
   state.playing   — whether the interval is ticking.
   state.speed     — playback multiplier (0.5, 1, 2, 5, 10).
   stops automatically when currentMs >= totalDurMs. */
export function useReplay(totalDurMs) {
  const [currentMs, setCurrentMs] = useState(0);
  const [playing,   setPlaying]   = useState(false);
  const [speed,     setSpeed]     = useState(2);
  const rafRef = useRef(null);
  const lastTsRef = useRef(null);

  // Reset if trace changes length (new run).
  useEffect(() => { setCurrentMs(0); setPlaying(false); }, [totalDurMs]);

  // rAF loop — advances currentMs by (dtMs * speed).
  useEffect(() => {
    if (!playing) {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
      lastTsRef.current = null;
      return;
    }
    const tick = (ts) => {
      if (lastTsRef.current == null) lastTsRef.current = ts;
      const dt = ts - lastTsRef.current;
      lastTsRef.current = ts;
      setCurrentMs(prev => {
        const next = prev + dt * speed;
        if (next >= totalDurMs) {
          setPlaying(false);
          return totalDurMs;
        }
        return next;
      });
      rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
      lastTsRef.current = null;
    };
  }, [playing, speed, totalDurMs]);

  const play  = useCallback(() => {
    // If we're at the end, restart from 0.
    setCurrentMs(c => (c >= totalDurMs ? 0 : c));
    setPlaying(true);
  }, [totalDurMs]);
  const pause = useCallback(() => setPlaying(false), []);
  const stop  = useCallback(() => { setPlaying(false); setCurrentMs(0); }, []);
  const jumpEnd = useCallback(() => { setPlaying(false); setCurrentMs(totalDurMs); }, [totalDurMs]);
  const seek  = useCallback((ms) => {
    setCurrentMs(Math.max(0, Math.min(totalDurMs, ms)));
  }, [totalDurMs]);

  return { currentMs, playing, speed, setSpeed, play, pause, stop, jumpEnd, seek };
}

/* For each span, compute how far into its own duration the replay head has
   progressed, clamped to [0, 1]. Also pre-derive simple status flags. */
export function spanProgress(span, currentMs) {
  const end = span.startMs + span.durMs;
  if (currentMs <= span.startMs) return { state: 'pending', pct: 0 };
  if (currentMs >= end)          return { state: 'done',    pct: 1 };
  const pct = (currentMs - span.startMs) / Math.max(1, span.durMs);
  return { state: 'running', pct };
}

/* Aggregate spans that are completed (or partially done) at currentMs.
   Used for the live token/cost counters in the summary strip. */
export function liveStats(spans, currentMs) {
  let tokens = 0;
  let cost   = 0;
  let completed = 0;
  let errors = 0;
  for (const s of spans) {
    const p = spanProgress(s, currentMs);
    if (p.state === 'pending') continue;
    if (p.state === 'done') {
      completed++;
      if (s.status === 'error') errors++;
      tokens += Number(s.attrs?.['gen_ai.usage.total_tokens'] || 0);
      cost   += Number(s.attrs?.['gen_ai.response.cost_usd']  || 0);
    } else if (p.state === 'running') {
      // For LLM spans we interpolate tokens/cost by pct so the counter ticks up live.
      if (s.kind === 'llm') {
        tokens += Math.round((Number(s.attrs?.['gen_ai.usage.total_tokens'] || 0)) * p.pct);
        cost   += (Number(s.attrs?.['gen_ai.response.cost_usd']  || 0)) * p.pct;
      }
    }
  }
  return { tokens, cost: Number(cost.toFixed(5)), completed, errors };
}

/* Pick the "currently focused" span at currentMs.
   Preference: the deepest running span. If none are running, the most recently
   completed leaf. If currentMs is 0, the root. */
export function activeSpanAt(spans, currentMs) {
  if (!spans?.length) return null;
  if (currentMs <= 0) return spans[0];
  const depthBy = buildDepthMap(spans);
  let best = null;
  let bestDepth = -1;
  for (const s of spans) {
    const p = spanProgress(s, currentMs);
    if (p.state !== 'running') continue;
    const d = depthBy.get(s.id) || 0;
    if (d > bestDepth) { best = s; bestDepth = d; }
  }
  if (best) return best;
  // fall through: most recently completed
  let latest = null;
  let latestEnd = -1;
  for (const s of spans) {
    const end = s.startMs + s.durMs;
    if (end <= currentMs && end > latestEnd) { latest = s; latestEnd = end; }
  }
  return latest || spans[0];
}

function buildDepthMap(spans) {
  const byId = new Map(spans.map(s => [s.id, s]));
  const depths = new Map();
  const walk = (id) => {
    if (depths.has(id)) return depths.get(id);
    const s = byId.get(id); if (!s) return 0;
    const d = s.parentId == null ? 0 : 1 + walk(s.parentId);
    depths.set(id, d);
    return d;
  };
  for (const s of spans) walk(s.id);
  return depths;
}

/* Format ms as "1.42 s" / "420 ms". */
export function fmtMs(ms) {
  if (ms == null) return '—';
  if (ms < 1000) return `${Math.round(ms)} ms`;
  return `${(ms / 1000).toFixed(2)} s`;
}
