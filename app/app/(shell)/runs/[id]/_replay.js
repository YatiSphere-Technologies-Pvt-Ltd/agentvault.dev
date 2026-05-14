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

/* Critical path
   ─────────────
   For agentic traces the most useful "where did the time go?" answer is
   the longest root-to-leaf path through the span tree. The bars on that
   path are what an operator should look at first when triaging slow runs.

   We compute it by recursing down: for each node, the path through it is
   its own duration plus the maximum of its children's paths. Returns a
   Set of span ids on the chosen path plus the total ms it accounts for.

   Note: spans here are nested but have explicit start/end times — sibling
   spans can overlap. We treat the path as the *sequential* longest chain,
   which matches how humans read the waterfall (parents wrap their kids,
   the slowest leaf chain is the offender). */
export function computeCriticalPath(spans) {
  const childrenBy = new Map();
  for (const s of spans) {
    if (!childrenBy.has(s.parentId)) childrenBy.set(s.parentId, []);
    childrenBy.get(s.parentId).push(s);
  }
  const memo = new Map(); // spanId → { dur, ids: [...] }
  const walk = (id) => {
    if (memo.has(id)) return memo.get(id);
    const s = spans.find(x => x.id === id);
    if (!s) return { dur: 0, ids: [] };
    const kids = childrenBy.get(id) || [];
    let bestDur = 0;
    let bestIds = [];
    for (const k of kids) {
      const sub = walk(k.id);
      if (sub.dur > bestDur) { bestDur = sub.dur; bestIds = sub.ids; }
    }
    const out = { dur: s.durMs + bestDur, ids: [s.id, ...bestIds] };
    memo.set(id, out);
    return out;
  };
  const root = spans.find(s => s.parentId == null);
  if (!root) return { ids: new Set(), totalMs: 0 };
  const { dur, ids } = walk(root.id);
  return { ids: new Set(ids), totalMs: dur };
}

/* Spread a list of policy gates evenly across the run timeline so they can
   be drawn as dots above the waterfall. Real gates from the EVALUATIONS
   store don't carry timestamps, so we anchor them to the spans whose hook
   matches (input/output/tool/run/etc) and fall back to a uniform spread. */
export function placeGatesOnTimeline(gates, spans, totalDurMs) {
  if (!gates?.length) return [];
  const HOOK_TO_KIND = {
    'input':  'agent',
    'output': 'guardrail',
    'tool':   'tool',
    'pre-run':  'agent',
    'post-run': 'guardrail',
    'pre-tool':  'tool',
    'post-tool': 'tool',
    'pre-model': 'llm',
    'post-model': 'llm',
  };
  const out = [];
  for (let i = 0; i < gates.length; i++) {
    const g = gates[i];
    const kind = HOOK_TO_KIND[g.hook] || null;
    const candidate = kind ? spans.find(s => s.kind === kind && s.parentId != null) : null;
    let atMs;
    if (candidate) {
      atMs = candidate.startMs + Math.min(candidate.durMs, 80);
    } else {
      // Spread evenly across the run, leaving a small margin at each end.
      atMs = (totalDurMs * (i + 1)) / (gates.length + 1);
    }
    out.push({ ...g, atMs: Math.max(0, Math.min(totalDurMs, atMs)) });
  }
  return out;
}

/* Build a token-density series for the trace, sampled into N buckets.
   Each LLM span contributes its total tokens, distributed uniformly across
   the time it occupied. Other spans contribute 0. Returns an array of
   { ms, tokens } points the waterfall draws as a small density bar. */
export function tokenDensity(spans, totalDurMs, buckets = 60) {
  const series = new Array(buckets).fill(0);
  if (!totalDurMs) return series.map((tokens, i) => ({ ms: 0, tokens }));
  const stepMs = totalDurMs / buckets;
  for (const s of spans) {
    if (s.kind !== 'llm') continue;
    const tokens = Number(s.attrs?.['gen_ai.usage.total_tokens'] || 0);
    if (!tokens) continue;
    const startB = Math.max(0, Math.floor(s.startMs / stepMs));
    const endB   = Math.min(buckets - 1, Math.floor((s.startMs + s.durMs) / stepMs));
    const span = Math.max(1, endB - startB + 1);
    const per  = tokens / span;
    for (let i = startB; i <= endB; i++) series[i] += per;
  }
  const max = Math.max(...series, 1);
  return series.map((tokens, i) => ({ ms: i * stepMs, tokens, norm: tokens / max }));
}

/* Order errors chronologically — used by "next error" hotkey + chip. */
export function listErrors(spans) {
  return spans.filter(s => s.status === 'error').sort((a, b) => a.startMs - b.startMs);
}
