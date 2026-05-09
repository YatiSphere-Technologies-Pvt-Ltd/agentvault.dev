'use client';

/* Approvals task store.
   ─────────────────────
   The runtime side of the human-in-the-loop primitive that's defined at
   design-time in Studio (see `studio/components/_approvals.js`). When an
   agent's approval point fires, the agent's status flips to `needs_human`
   and a task lands here. People who weren't on the screen at the time pick
   it up off the queue, decide, and the agent resumes.

   Tasks are the canonical record. Slack/email "channels" on each task are
   delivery hints — they tell us how the human got pinged, not where the
   decision lives. The decision always lives here.

   Storage follows the same overlay pattern used elsewhere:

     additions    — user-created or seed-promoted records
     mutations    — partial patches keyed by id (decisions, claims, etc.)
     tombstones   — ids of seed rows the user explicitly removed

   On read we fold seed + additions, drop tombstones, then layer mutations
   on top. That keeps the demo deterministic while letting users decide,
   claim, edit, and (later) re-seed without losing changes.
*/

import { useEffect, useState, useSyncExternalStore } from 'react';
import { buildSeed, buildNudgesSeed } from './_seed';

const STORAGE_KEY = 'agentvault.approvals.v1';

/* ───────────────────── persistence ───────────────────── */

function emptyState() {
  return { additions: [], mutations: {}, tombstones: [], nudges: {} };
}

function readRaw() {
  if (typeof window === 'undefined') return emptyState();
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return emptyState();
    const parsed = JSON.parse(raw);
    return {
      additions:  Array.isArray(parsed.additions)  ? parsed.additions  : [],
      mutations:  parsed.mutations  && typeof parsed.mutations  === 'object' ? parsed.mutations  : {},
      tombstones: Array.isArray(parsed.tombstones) ? parsed.tombstones : [],
      nudges:     parsed.nudges     && typeof parsed.nudges     === 'object' ? parsed.nudges     : {},
    };
  } catch {
    return emptyState();
  }
}

function writeRaw(state) {
  if (typeof window === 'undefined') return;
  try { window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); } catch {}
}

/* ───────────────────── pub-sub for cross-component sync ───────────── */

const listeners = new Set();
function notify() {
  // Bust both snapshot caches so React's useSyncExternalStore returns a new
  // reference on the next read.
  cachedSnapshot = null;
  cachedNudges = null;
  listeners.forEach(fn => { try { fn(); } catch {} });
}
function subscribe(fn) { listeners.add(fn); return () => listeners.delete(fn); }

/* Keep tabs in sync (sidebar badge in one tab, sheet in another). */
if (typeof window !== 'undefined') {
  window.addEventListener('storage', (e) => { if (e.key === STORAGE_KEY) notify(); });
}

/* Cached folded snapshot. useSyncExternalStore re-reads on every render, so
   the snapshot MUST be referentially stable until something actually
   changes. Mutations call notify() which clears the cache. */
let cachedSnapshot = null;
let cachedNudges = null;
function getSnapshot() {
  if (cachedSnapshot == null) cachedSnapshot = fold(readRaw());
  return cachedSnapshot;
}

/* ───────────────────── fold ───────────────────── */

function fold(raw) {
  const seed = buildSeed();
  const tomb = new Set(raw.tombstones);
  const adds = raw.additions || [];
  const merged = [...seed, ...adds].filter(t => !tomb.has(t.id));
  return merged.map(t => raw.mutations[t.id] ? { ...t, ...raw.mutations[t.id] } : t);
}

/* ───────────────────── timeout sweeper ───────────────────── */

/* Promote anything past its deadline into the configured terminal state. */
function sweepTimeouts(raw) {
  const now = Date.now();
  const folded = fold(raw);
  let changed = false;
  const muts = { ...raw.mutations };
  for (const t of folded) {
    if (t.status !== 'pending' && t.status !== 'claimed') continue;
    if (!t.deadline_at || now < t.deadline_at) continue;

    const decision = t.on_timeout === 'approve' ? 'approve'
                   : t.on_timeout === 'escalate' ? 'escalate'
                   : 'reject';
    const status = t.on_timeout === 'approve' ? 'approved'
                 : t.on_timeout === 'escalate' ? 'escalated'
                 : 'expired';
    muts[t.id] = {
      ...muts[t.id],
      status,
      decision,
      decided_by: 'system:timeout',
      decided_at: now,
      decided_notes: muts[t.id]?.decided_notes
        || `Auto-${decision} — deadline of ${new Date(t.deadline_at).toLocaleString()} reached.`,
    };
    changed = true;
  }
  if (!changed) return raw;
  return { ...raw, mutations: muts };
}

/* ───────────────────── mutations ───────────────────── */

function mutate(updater) {
  const prev = readRaw();
  const next = updater(prev);
  // sweepTimeouts returns the same reference when nothing crossed its
  // deadline; skip the write+notify so we don't churn renders on every
  // page mount.
  if (next === prev) return;
  writeRaw(next);
  notify();
}

export function tickTimeouts() {
  mutate((raw) => sweepTimeouts(raw));
}

export function claim(id, who) {
  mutate((raw) => {
    const muts = { ...raw.mutations };
    muts[id] = { ...(muts[id] || {}), status: 'claimed', claimed_by: who, claimed_at: Date.now() };
    return { ...raw, mutations: muts };
  });
}

export function release(id) {
  mutate((raw) => {
    const muts = { ...raw.mutations };
    muts[id] = { ...(muts[id] || {}), status: 'pending', claimed_by: null, claimed_at: null };
    return { ...raw, mutations: muts };
  });
}

/* decide(id, payload)
   ──────────────────
   The single decision entry point. Beyond approve/reject/escalate, this
   accepts two optional steering channels:

     guidance   — free-text "yes but…" the agent injects into context.
                  Lands at `human_response.guidance` on resume. Common with
                  approve/answered, occasionally with reject ("here's why,
                  try again") or redirect.

     redirect   — a structured alternative for the agent to take instead of
                  the proposed action. Shape:
                    { kind: 'tool' | 'skip' | 'retry' | 'handoff' | 'free',
                      tool?, args?, hint?, agent?, body? }
                  The agent reads `human_response.redirect` and re-plans.
                  When `decision === 'redirect'`, the task status becomes
                  `redirected` (a terminal state for this gate, but the run
                  resumes). */
export function decide(id, { decision, edits, notes, who, guidance, redirect }) {
  mutate((raw) => {
    const muts = { ...raw.mutations };
    const status = decision === 'redirect'
      ? 'redirected'
      : decision === 'approve' || decision === 'answered'
        ? 'approved'
        : decision === 'escalate'
          ? 'escalated'
          : 'rejected';
    muts[id] = {
      ...(muts[id] || {}),
      status,
      decision,
      decided_by: who || 'me',
      decided_at: Date.now(),
      decided_notes: notes || null,
      edited_fields: edits && Object.keys(edits).length ? edits : null,
      guidance: guidance && guidance.trim() ? guidance.trim() : null,
      redirect: redirect && (redirect.kind || redirect.body) ? redirect : null,
    };
    return { ...raw, mutations: muts };
  });
}

export function bulkDecide(ids, payload) {
  mutate((raw) => {
    const muts = { ...raw.mutations };
    const now = Date.now();
    const status = payload.decision === 'approve' ? 'approved'
                 : payload.decision === 'escalate' ? 'escalated'
                 : 'rejected';
    for (const id of ids) {
      muts[id] = {
        ...(muts[id] || {}),
        status,
        decision: payload.decision,
        decided_by: payload.who || 'me',
        decided_at: now,
        decided_notes: payload.notes || null,
      };
    }
    return { ...raw, mutations: muts };
  });
}

export function escalate(id, to, notes) {
  mutate((raw) => {
    const muts = { ...raw.mutations };
    muts[id] = {
      ...(muts[id] || {}),
      status: 'escalated',
      decision: 'escalate',
      decided_at: Date.now(),
      decided_by: 'me',
      decided_notes: notes || `Escalated to ${to}.`,
    };
    return { ...raw, mutations: muts };
  });
}

export function extendDeadline(id, hours) {
  mutate((raw) => {
    const muts = { ...raw.mutations };
    const folded = fold(raw).find(t => t.id === id);
    const base = muts[id]?.deadline_at ?? folded?.deadline_at ?? Date.now();
    muts[id] = { ...(muts[id] || {}), deadline_at: base + hours * 60 * 60_000 };
    return { ...raw, mutations: muts };
  });
}

/* ───────────────────── nudges (out-of-band steering) ───────────── */

/* A nudge is a message a human sends to a *running* agent without it asking.
   The agent checks its inbox at safe checkpoints (between iterations, before
   tool calls) and incorporates pending nudges into context. If a nudge says
   `stop`, the agent halts at the next checkpoint and creates an approval
   task for confirmation.

   Shape:
     { id, run_id, sent_by, sent_at,
       kind: 'guidance' | 'stop' | 'redirect',
       body,                     // free-text message
       redirect?,                // structured payload when kind === 'redirect'
       consumed_at,              // when the agent picked this up
       agent_reaction }          // one-liner the agent sends back: how it
                                 // interpreted the nudge. Null until consumed. */

let _nid = 0;
function newNudgeId() { _nid += 1; return `nudge_${Date.now().toString(36).slice(-4)}${_nid}`; }

export function sendNudge(runId, payload) {
  mutate((raw) => {
    // Read the user-only list — seed nudges stay implicit. We don't fold
    // them into raw on send; getSnapshotNudges() merges seed + user at
    // read time so the seed remains a single source of truth and survives
    // localStorage clears that don't wipe the seed module.
    const userList = raw.nudges?.[runId] ? [...raw.nudges[runId]] : [];
    userList.push({
      id: newNudgeId(),
      run_id: runId,
      sent_by: payload.who || 'me',
      sent_at: Date.now(),
      kind: payload.kind || 'guidance',
      body: payload.body || '',
      redirect: payload.redirect || null,
      consumed_at: null,
      agent_reaction: null,
    });
    return { ...raw, nudges: { ...(raw.nudges || {}), [runId]: userList } };
  });
}

/* When the agent's loop checkpoint reads the inbox, it marks the nudge
   consumed and writes back a one-liner describing how it'll act. The demo
   simulates this immediately on send so the UI feels alive; in production
   the agent runtime calls this at its checkpoint.

   Seed nudges may not exist in raw.nudges yet (they live only in the
   merged snapshot); we fold the merged list into raw on first consume so
   the patch sticks. */
export function consumeNudge(runId, nudgeId, agentReaction) {
  mutate((raw) => {
    const merged = (() => {
      const seed = buildNudgesSeed();
      const user = raw.nudges || {};
      const out = { ...seed };
      for (const [k, v] of Object.entries(user)) out[k] = [...(out[k] || []), ...v];
      return out;
    })();
    const list = merged[runId];
    if (!list) return raw;
    const idx = list.findIndex(n => n.id === nudgeId);
    if (idx < 0) return raw;
    if (list[idx].consumed_at) return raw; // idempotent
    const updated = [...list];
    updated[idx] = { ...updated[idx], consumed_at: Date.now(), agent_reaction: agentReaction };
    return { ...raw, nudges: { ...raw.nudges, [runId]: updated } };
  });
}

export function listNudges(runId) {
  return getSnapshotNudges()[runId] || [];
}

/* Cached nudges-by-run snapshot, same caching contract as the task list.
   Declared up at the top alongside cachedSnapshot. */
function getSnapshotNudges() {
  if (cachedNudges != null) return cachedNudges;
  // Merge seed nudges with user-sent nudges from raw. User nudges win on
  // id collision — same overlay-pattern semantics as tasks. Per-run lists
  // are concatenated, with seed entries first so chronological order
  // (oldest → newest) reads naturally.
  const seed = buildNudgesSeed();
  const user = readRaw().nudges;
  const merged = { ...seed };
  for (const [runId, list] of Object.entries(user || {})) {
    merged[runId] = [...(merged[runId] || []), ...list];
  }
  cachedNudges = merged;
  return cachedNudges;
}

export function useNudges(runId) {
  return useSyncExternalStore(
    subscribe,
    () => getSnapshotNudges()[runId] || EMPTY_NUDGES,
    () => EMPTY_NUDGES,
  );
}
const EMPTY_NUDGES = Object.freeze([]);

export function removeTask(id) {
  mutate((raw) => {
    const seedIds = new Set(buildSeed().map(t => t.id));
    if (seedIds.has(id)) {
      return { ...raw, tombstones: Array.from(new Set([...raw.tombstones, id])) };
    }
    return { ...raw, additions: raw.additions.filter(t => t.id !== id) };
  });
}

/* ───────────────────── selectors ───────────────────── */

export function listTasks() {
  return getSnapshot();
}

export function findTask(id) {
  return getSnapshot().find(t => t.id === id) || null;
}

/* ───────────────────── react bindings ───────────────────── */

/* Stable empty snapshot for SSR — useSyncExternalStore requires reference
   stability across renders when nothing has changed. */
const SSR_EMPTY = Object.freeze([]);

export function useApprovals() {
  return useSyncExternalStore(subscribe, getSnapshot, () => SSR_EMPTY);
}

/* Lightweight count hook for sidebar badges and headers. */
export function usePendingCount(filter = (t) => t.status === 'pending') {
  const tasks = useApprovals();
  return tasks.filter(filter).length;
}

/* On-mount sweep — every page that mounts the store ticks timeouts so the
   demo always shows a fresh view. Cheap; runs only when the page becomes
   visible. */
export function useTimeoutSweep() {
  useEffect(() => {
    tickTimeouts();
    const onVis = () => { if (!document.hidden) tickTimeouts(); };
    document.addEventListener('visibilitychange', onVis);
    return () => document.removeEventListener('visibilitychange', onVis);
  }, []);
}

/* ───────────────────── derived helpers ───────────────────── */

export const TRIGGER_KIND = (t) => {
  const v = String(t.trigger || '');
  if (v.startsWith('before_tool:')) return 'before_tool';
  return v;
};
export const TRIGGER_TOOL = (t) => {
  const v = String(t.trigger || '');
  return v.startsWith('before_tool:') ? v.slice('before_tool:'.length) : null;
};

export function isOpen(t) { return t.status === 'pending' || t.status === 'claimed'; }
export function isTerminal(t) { return !isOpen(t); }

export function deadlineState(t) {
  if (!isOpen(t)) return 'done';
  const ms = t.deadline_at - Date.now();
  if (ms <= 0) return 'expired';
  if (ms < 60 * 60_000) return 'breaching';     // < 1h
  if (ms < 4 * 60 * 60_000) return 'soon';      // < 4h
  return 'normal';
}

export function priorityRank(p) {
  return ({ critical: 4, high: 3, normal: 2, low: 1 })[p] || 0;
}

/* In-app "me" — the demo doesn't have real auth wired through, so we use
   the auth provider's email when available and fall back to a known string
   so the seed's `claimed_by: 'alice@latentbridge.com'` row stays distinct.
   This stays pure (no React) so the store is usable from non-component
   contexts. The hook below resolves it client-side. */
export function getMe() {
  if (typeof window === 'undefined') return 'me';
  try {
    const raw = window.localStorage.getItem('agentvault.auth.user');
    const u = raw ? JSON.parse(raw) : null;
    return u?.email || 'me@latentbridge.com';
  } catch { return 'me@latentbridge.com'; }
}

export function useMe() {
  const [me, setMe] = useState('me@latentbridge.com');
  useEffect(() => { setMe(getMe()); }, []);
  return me;
}
