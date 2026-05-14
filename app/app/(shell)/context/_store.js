'use client';

/* Context Engine store.
   ─────────────────────
   Two collections — sources and corpora — sharing one localStorage key
   and the same overlay pattern used elsewhere (approvals, vault, mcp):

     additions    — user-created records
     mutations    — partial patches keyed by id
     tombstones   — ids the user explicitly removed (so seeds can be removed)

   Reads fold seed + additions, drop tombstones, layer mutations. Writes
   bust both cached snapshots so useSyncExternalStore keeps a stable
   reference across renders. */

import { useSyncExternalStore } from 'react';
import { buildSourcesSeed, buildCorporaSeed } from './_seed';

const STORAGE_KEY = 'agentvault.context.v1';

function emptyState() {
  return {
    sources:   { additions: [], mutations: {}, tombstones: [] },
    corpora:   { additions: [], mutations: {}, tombstones: [] },
  };
}

function readRaw() {
  if (typeof window === 'undefined') return emptyState();
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return emptyState();
    const parsed = JSON.parse(raw);
    return {
      sources: normalizeSlice(parsed.sources),
      corpora: normalizeSlice(parsed.corpora),
    };
  } catch {
    return emptyState();
  }
}

function normalizeSlice(slice) {
  if (!slice || typeof slice !== 'object') return { additions: [], mutations: {}, tombstones: [] };
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

/* ───────────────────── pub-sub + cached snapshots ───────────────────── */

const listeners = new Set();
let cachedSources = null;
let cachedCorpora = null;
function notify() {
  cachedSources = null;
  cachedCorpora = null;
  listeners.forEach(fn => { try { fn(); } catch {} });
}
function subscribe(fn) { listeners.add(fn); return () => listeners.delete(fn); }
if (typeof window !== 'undefined') {
  window.addEventListener('storage', (e) => { if (e.key === STORAGE_KEY) notify(); });
}

function fold(seed, slice) {
  const tomb = new Set(slice.tombstones);
  const adds = slice.additions || [];
  const merged = [...seed, ...adds].filter(x => !tomb.has(x.id));
  return merged.map(x => slice.mutations[x.id] ? { ...x, ...slice.mutations[x.id] } : x);
}

function snapSources() {
  if (cachedSources == null) cachedSources = fold(buildSourcesSeed(), readRaw().sources);
  return cachedSources;
}
function snapCorpora() {
  if (cachedCorpora == null) cachedCorpora = fold(buildCorporaSeed(), readRaw().corpora);
  return cachedCorpora;
}

/* ───────────────────── mutate ───────────────────── */

function mutate(updater) {
  const prev = readRaw();
  const next = updater(prev);
  if (next === prev) return;
  writeRaw(next);
  notify();
}

/* ───────────────────── source mutations ───────────────────── */

let _sid = 0;
export function newSourceId() {
  _sid += 1;
  return `src_${Date.now().toString(36).slice(-4)}${_sid}`;
}

export function createSource(record) {
  mutate((raw) => {
    const additions = [...raw.sources.additions, record];
    return { ...raw, sources: { ...raw.sources, additions } };
  });
}

export function updateSource(id, patch) {
  mutate((raw) => {
    const muts = { ...raw.sources.mutations };
    muts[id] = { ...(muts[id] || {}), ...patch };
    return { ...raw, sources: { ...raw.sources, mutations: muts } };
  });
}

export function removeSource(id) {
  mutate((raw) => {
    const seedIds = new Set(buildSourcesSeed().map(s => s.id));
    if (seedIds.has(id)) {
      return { ...raw, sources: { ...raw.sources, tombstones: Array.from(new Set([...raw.sources.tombstones, id])) } };
    }
    return { ...raw, sources: { ...raw.sources, additions: raw.sources.additions.filter(s => s.id !== id) } };
  });
}

/* Simulate a sync — clears the lag so the freshness card looks alive when
   you click "Sync now" in the demo. */
export function simulateSync(id) {
  updateSource(id, { last_sync_at: Date.now(), freshness_lag_min: 0, health: 'green' });
}

/* ───────────────────── corpus mutations ───────────────────── */

export function newCorpusId() {
  _sid += 1;
  return `cor_${Date.now().toString(36).slice(-4)}${_sid}`;
}

export function createCorpus(record) {
  mutate((raw) => {
    const additions = [...raw.corpora.additions, record];
    return { ...raw, corpora: { ...raw.corpora, additions } };
  });
}

export function updateCorpus(id, patch) {
  mutate((raw) => {
    const muts = { ...raw.corpora.mutations };
    muts[id] = { ...(muts[id] || {}), ...patch };
    return { ...raw, corpora: { ...raw.corpora, mutations: muts } };
  });
}

export function removeCorpus(id) {
  mutate((raw) => {
    const seedIds = new Set(buildCorporaSeed().map(c => c.id));
    if (seedIds.has(id)) {
      return { ...raw, corpora: { ...raw.corpora, tombstones: Array.from(new Set([...raw.corpora.tombstones, id])) } };
    }
    return { ...raw, corpora: { ...raw.corpora, additions: raw.corpora.additions.filter(c => c.id !== id) } };
  });
}

export function simulateReindex(id) {
  updateCorpus(id, { last_reindex_at: Date.now(), drift_score: 0.01, health: 'green', health_detail: undefined });
}

/* ───────────────────── selectors / hooks ───────────────────── */

const EMPTY = Object.freeze([]);

export function useSources() {
  return useSyncExternalStore(subscribe, snapSources, () => EMPTY);
}
export function useCorpora() {
  return useSyncExternalStore(subscribe, snapCorpora, () => EMPTY);
}

export function findSource(id) {
  return snapSources().find(s => s.id === id) || null;
}
export function findCorpus(id) {
  return snapCorpora().find(c => c.id === id) || null;
}

export function listSources() { return snapSources(); }
export function listCorpora() { return snapCorpora(); }

/* Aggregate roll-ups for the overview. */
export function rollupHealth(items) {
  const c = { green: 0, yellow: 0, red: 0 };
  for (const i of items) c[i.health] = (c[i.health] || 0) + 1;
  return c;
}

export function freshnessAdherence(sources) {
  // Fraction of sources within their freshness target.
  if (!sources.length) return 1;
  const within = sources.filter(s => (s.freshness_lag_min ?? 0) <= (s.freshness_target_min ?? Infinity)).length;
  return within / sources.length;
}
