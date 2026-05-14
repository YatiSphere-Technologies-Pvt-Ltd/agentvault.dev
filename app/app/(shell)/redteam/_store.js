'use client';

/* Red Team store.
   ──────────────
   Five collections under one localStorage key:
     - targets       — registered adapters with consent records
     - probeSets     — bindings of suite + target + schedule
     - runs          — historical + user-launched
     - findings      — one per non-pass finding (passes are stat-only)
     - acknowledgements — acknowledged-risk records, with expiry

   Overlay pattern (additions / mutations / tombstones) + cached snapshots
   for useSyncExternalStore stability. */

import { useSyncExternalStore } from 'react';
import {
  buildTargetsSeed, buildProbeSetsSeed, buildRunsSeed, buildFindingsSeed,
} from './_seed';
import { synthesizeFindings, runStatsFromFindings, postureScoreFor, estimateRunCost } from './_runEngine';
import { suiteById } from './_targetCatalog';
import { LIBRARY_VERSION } from './_attackCatalog';

const STORAGE_KEY = 'agentvault.redteam.v1';

function emptySlice() { return { additions: [], mutations: {}, tombstones: [] }; }
function emptyState() {
  return {
    targets: emptySlice(),
    probeSets: emptySlice(),
    runs: emptySlice(),
    findings: emptySlice(),
    acknowledgements: emptySlice(),
  };
}

function readRaw() {
  if (typeof window === 'undefined') return emptyState();
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return emptyState();
    const parsed = JSON.parse(raw);
    return {
      targets:           normalize(parsed.targets),
      probeSets:         normalize(parsed.probeSets),
      runs:              normalize(parsed.runs),
      findings:          normalize(parsed.findings),
      acknowledgements:  normalize(parsed.acknowledgements),
    };
  } catch { return emptyState(); }
}
function normalize(slice) {
  if (!slice || typeof slice !== 'object') return emptySlice();
  return {
    additions:  Array.isArray(slice.additions)  ? slice.additions  : [],
    mutations:  slice.mutations  && typeof slice.mutations  === 'object' ? slice.mutations  : {},
    tombstones: Array.isArray(slice.tombstones) ? slice.tombstones : [],
  };
}
function writeRaw(state) {
  if (typeof window === 'undefined') return;
  try { window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); } catch {}
}

/* ───── pub-sub + cached snapshots ───── */

const listeners = new Set();
let cachedTargets = null, cachedSets = null, cachedRuns = null, cachedFindings = null, cachedAcks = null;
function notify() {
  cachedTargets = cachedSets = cachedRuns = cachedFindings = cachedAcks = null;
  listeners.forEach(fn => { try { fn(); } catch {} });
}
function subscribe(fn) { listeners.add(fn); return () => listeners.delete(fn); }
if (typeof window !== 'undefined') {
  window.addEventListener('storage', (e) => { if (e.key === STORAGE_KEY) notify(); });
}

function fold(seed, slice) {
  const tomb = new Set(slice.tombstones);
  const merged = [...seed, ...slice.additions].filter(x => !tomb.has(x.id));
  return merged.map(x => slice.mutations[x.id] ? { ...x, ...slice.mutations[x.id] } : x);
}

function snapTargets() {
  if (cachedTargets == null) cachedTargets = fold(buildTargetsSeed(), readRaw().targets);
  return cachedTargets;
}
function snapSets() {
  if (cachedSets == null) cachedSets = fold(buildProbeSetsSeed(), readRaw().probeSets);
  return cachedSets;
}
function snapRuns() {
  if (cachedRuns == null) cachedRuns = fold(buildRunsSeed(), readRaw().runs).sort((a, b) => (b.started_at || 0) - (a.started_at || 0));
  return cachedRuns;
}
function snapFindings() {
  if (cachedFindings == null) cachedFindings = fold(buildFindingsSeed(), readRaw().findings);
  return cachedFindings;
}
function snapAcks() {
  if (cachedAcks == null) cachedAcks = fold([], readRaw().acknowledgements);
  return cachedAcks;
}

function mutate(updater) {
  const prev = readRaw();
  const next = updater(prev);
  if (next === prev) return;
  writeRaw(next);
  notify();
}

/* ───── targets ───── */

let _tid = 0;
export function newTargetId() { _tid += 1; return `tgt_${Date.now().toString(36).slice(-4)}${_tid}`; }

export function createTarget(record) {
  mutate(raw => ({ ...raw, targets: { ...raw.targets, additions: [...raw.targets.additions, record] } }));
}
export function updateTarget(id, patch) {
  mutate(raw => {
    const muts = { ...raw.targets.mutations };
    muts[id] = { ...(muts[id] || {}), ...patch };
    return { ...raw, targets: { ...raw.targets, mutations: muts } };
  });
}
export function removeTarget(id) {
  mutate(raw => {
    const seedIds = new Set(buildTargetsSeed().map(t => t.id));
    if (seedIds.has(id)) {
      return { ...raw, targets: { ...raw.targets, tombstones: Array.from(new Set([...raw.targets.tombstones, id])) } };
    }
    return { ...raw, targets: { ...raw.targets, additions: raw.targets.additions.filter(t => t.id !== id) } };
  });
}

/* Lifecycle status — explicit field on the target.
     draft    → registered but consent not approved; runs are blocked
     active   → approved and accepting runs
     paused   → temporarily blocked from new runs (history preserved)
     archived → soft-deleted; hidden from default views, history preserved
   Seed targets default to `active` (treated as approved on first load);
   manually-created targets start as `draft` and need explicit Activate. */
export function setTargetStatus(id, status) {
  updateTarget(id, { status });
}

/* How many probe sets reference this target? Used by the detail page
   to warn before archive/delete. */
export function probeSetsBoundToTarget(id) {
  return snapSets().filter(p => (p.target_ids || []).includes(id)).length;
}

/* ───── probe sets ───── */

let _psid = 0;
export function newProbeSetId() { _psid += 1; return `ps_${Date.now().toString(36).slice(-4)}${_psid}`; }
export function createProbeSet(record) {
  mutate(raw => ({ ...raw, probeSets: { ...raw.probeSets, additions: [...raw.probeSets.additions, record] } }));
}
export function updateProbeSet(id, patch) {
  mutate(raw => {
    const muts = { ...raw.probeSets.mutations };
    muts[id] = { ...(muts[id] || {}), ...patch };
    return { ...raw, probeSets: { ...raw.probeSets, mutations: muts } };
  });
}
export function removeProbeSet(id) {
  mutate(raw => {
    const seedIds = new Set(buildProbeSetsSeed().map(p => p.id));
    if (seedIds.has(id)) {
      return { ...raw, probeSets: { ...raw.probeSets, tombstones: Array.from(new Set([...raw.probeSets.tombstones, id])) } };
    }
    return { ...raw, probeSets: { ...raw.probeSets, additions: raw.probeSets.additions.filter(p => p.id !== id) } };
  });
}

/* ───── runs ───── */

let _rid = 0;
export function newRunId() { _rid += 1; return `rtrun_${Date.now().toString(36).slice(-4)}${_rid}`; }

/* Launch a run synchronously. Synthesizes findings via the engine,
   computes stats, and persists. The UI polls the run record for status
   transitions during the streaming-progress display. */
export function launchRun({ probeSetId, targetId, suiteId, triggeredBy = 'manual', environment = 'staging' }) {
  const id = newRunId();
  const startedAt = Date.now();
  // Find previous run for regression detection.
  const allRuns = snapRuns();
  const prev = allRuns.find(r => r.target_id === targetId && r.suite_id === suiteId && r.status === 'completed');
  const allFindings = snapFindings();
  const previousVerdictMap = {};
  if (prev) {
    for (const f of allFindings.filter(x => x.run_id === prev.id)) {
      previousVerdictMap[`${targetId}:${f.attack_id}`] = f.verdict;
    }
  }
  const newFindings = synthesizeFindings({
    runId: id, targetId, suiteId, libraryVersion: LIBRARY_VERSION,
    previousFindings: previousVerdictMap,
  });
  const suite = suiteById(suiteId);
  const est = estimateRunCost(suite);
  const stats = runStatsFromFindings(newFindings, est.probes);

  const run = {
    id, probe_set_id: probeSetId, target_id: targetId, suite_id: suiteId,
    library_version: LIBRARY_VERSION,
    started_at: startedAt,
    finished_at: startedAt + Math.round(est.probes * 80),  // ~80ms per probe in the mock
    status: 'completed',
    triggered_by: triggeredBy,
    environment,
    sampling_mode: suite?.filter?.sample_mode || 'full',
    total: est.probes,
    passed: stats.passed,
    bypassed: stats.bypassed,
    inconclusive: stats.inconclusive,
    regressions: stats.regressions,
    cost_usd: est.cost_usd,
    tokens_total: est.tokens,
    slo_breach: hasSloBreach(suite, stats),
    posture_delta: null,  // computed after we know previous posture
  };

  mutate(raw => ({
    ...raw,
    runs:     { ...raw.runs, additions: [...raw.runs.additions, run] },
    findings: { ...raw.findings, additions: [...raw.findings.additions, ...newFindings] },
  }));
  return { run, findings: newFindings };
}

function hasSloBreach(suite, stats) {
  const t = suite?.slo_thresholds;
  if (!t) return false;
  // We don't track per-severity bypass counts in stats; conservative:
  // breach if total bypassed exceeds high_max_bypass + critical_max_bypass.
  return stats.bypassed > ((t.critical_max_bypass ?? 0) + (t.high_max_bypass ?? 0));
}

/* ───── findings ───── */

export function acknowledgeFinding(id, { reason, expiresAt, who }) {
  mutate(raw => {
    const muts = { ...raw.findings.mutations };
    muts[id] = {
      ...(muts[id] || {}),
      status: 'acknowledged',
      acknowledged_by: who || 'me',
      acknowledged_reason: reason,
      acknowledged_expires_at: expiresAt || null,
      acknowledged_at: Date.now(),
    };
    return { ...raw, findings: { ...raw.findings, mutations: muts } };
  });
}
export function closeFinding(id) {
  mutate(raw => {
    const muts = { ...raw.findings.mutations };
    muts[id] = { ...(muts[id] || {}), status: 'closed', closed_at: Date.now() };
    return { ...raw, findings: { ...raw.findings, mutations: muts } };
  });
}
export function reviewFinding(id, verdict) {
  // verdict: 'bypass' | 'pass' | 'inconclusive' — for human reviewer override
  mutate(raw => {
    const muts = { ...raw.findings.mutations };
    muts[id] = { ...(muts[id] || {}), verdict, judge: { ...(muts[id]?.judge || {}), human_reviewed: true, reviewed_at: Date.now() } };
    return { ...raw, findings: { ...raw.findings, mutations: muts } };
  });
}

/* ───── hooks ───── */

const EMPTY = Object.freeze([]);
export function useTargets()    { return useSyncExternalStore(subscribe, snapTargets,  () => EMPTY); }
export function useProbeSets()  { return useSyncExternalStore(subscribe, snapSets,     () => EMPTY); }
export function useRuns()       { return useSyncExternalStore(subscribe, snapRuns,     () => EMPTY); }
export function useFindings()   { return useSyncExternalStore(subscribe, snapFindings, () => EMPTY); }

export function findTarget(id)   { return snapTargets().find(t => t.id === id) || null; }
export function findProbeSet(id) { return snapSets().find(p => p.id === id) || null; }
export function findRun(id)      { return snapRuns().find(r => r.id === id) || null; }
export function findFinding(id)  { return snapFindings().find(f => f.id === id) || null; }

/* ───── derived ───── */

export function postureForTarget(targetId) {
  const target = findTarget(targetId);
  if (!target) return null;
  return postureScoreFor(target, snapRuns());
}

export function platformPostureScore() {
  const targets = snapTargets();
  if (!targets.length) return 100;
  const scores = targets.map(t => postureScoreFor(t, snapRuns())).filter(s => s != null);
  if (!scores.length) return null;
  return Math.round(scores.reduce((a, b) => a + b, 0) / scores.length);
}

/* Latest open regressions across all runs. */
export function openRegressions() {
  return snapFindings()
    .filter(f => f.is_regression && (f.status === 'open' || f.status === 'pending-review'))
    .sort((a, b) => (b.created_at || 0) - (a.created_at || 0));
}

/* Findings by target. */
export function findingsForTarget(targetId) {
  return snapFindings().filter(f => f.target_id === targetId);
}
export function findingsForRun(runId) {
  return snapFindings().filter(f => f.run_id === runId);
}

/* Trend of posture score over time for a target — uses the run history. */
export function postureTrend(targetId, days = 30) {
  const cutoff = Date.now() - days * 24 * 60 * 60_000;
  const runs = snapRuns()
    .filter(r => r.target_id === targetId && r.status === 'completed' && r.started_at >= cutoff)
    .sort((a, b) => a.started_at - b.started_at);
  return runs.map(r => {
    const failRate = (r.bypassed + r.inconclusive * 0.5) / Math.max(1, r.total);
    return {
      t: r.started_at,
      score: Math.max(0, Math.min(100, Math.round(100 * (1 - failRate * 1.5)))),
      run_id: r.id,
    };
  });
}
