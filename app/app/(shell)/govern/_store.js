'use client';

/* Govern (control plane) store.
   ─────────────────────────────
   Three collections sharing one localStorage key:
     - assets      (the AI inventory — the unifying primitive)
     - events      (discovery feed; we keep the seed + any user mutations)
     - connectors  (which upstream signals are wired)

   Same overlay pattern as approvals + context: additions, mutations,
   tombstones. Cached snapshots so useSyncExternalStore stays stable. */

import { useSyncExternalStore } from 'react';
import { buildAssetsSeed, buildEventsSeed, buildConnectorsSeed } from './_seed';
import { buildDlpRulesSeed, buildGatewayConfigSeed } from './_runtimeSeed';
import { RISK_CLASSES } from './_connectorCatalog';

const STORAGE_KEY = 'agentvault.govern.v1';

function emptySlice() {
  return { additions: [], mutations: {}, tombstones: [] };
}
function emptyState() {
  return {
    assets:     emptySlice(),
    events:     emptySlice(),
    connectors: emptySlice(),
    dlpRules:   emptySlice(),
    // Gateway is a singleton — store its patch as a single object instead
    // of an overlay slice. Null = use seed as-is.
    gatewayPatch: null,
  };
}

function readRaw() {
  if (typeof window === 'undefined') return emptyState();
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return emptyState();
    const parsed = JSON.parse(raw);
    return {
      assets:       normalize(parsed.assets),
      events:       normalize(parsed.events),
      connectors:   normalize(parsed.connectors),
      dlpRules:     normalize(parsed.dlpRules),
      gatewayPatch: parsed.gatewayPatch && typeof parsed.gatewayPatch === 'object' ? parsed.gatewayPatch : null,
    };
  } catch {
    return emptyState();
  }
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
let cachedAssets = null;
let cachedEvents = null;
let cachedConnectors = null;
let cachedDlpRules = null;
let cachedGateway = null;
function notify() {
  cachedAssets = null;
  cachedEvents = null;
  cachedConnectors = null;
  cachedDlpRules = null;
  cachedGateway = null;
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

function snapAssets() {
  if (cachedAssets == null) cachedAssets = fold(buildAssetsSeed(), readRaw().assets);
  return cachedAssets;
}
function snapEvents() {
  if (cachedEvents == null) {
    // Events are sorted newest-first.
    const merged = fold(buildEventsSeed(), readRaw().events);
    merged.sort((a, b) => (b.ts || 0) - (a.ts || 0));
    cachedEvents = merged;
  }
  return cachedEvents;
}
function snapConnectors() {
  if (cachedConnectors == null) cachedConnectors = fold(buildConnectorsSeed(), readRaw().connectors);
  return cachedConnectors;
}
function snapDlpRules() {
  if (cachedDlpRules == null) cachedDlpRules = fold(buildDlpRulesSeed(), readRaw().dlpRules);
  return cachedDlpRules;
}
function snapGateway() {
  if (cachedGateway == null) {
    const seed = buildGatewayConfigSeed();
    const patch = readRaw().gatewayPatch;
    cachedGateway = patch ? { ...seed, ...patch } : seed;
  }
  return cachedGateway;
}

function mutate(updater) {
  const prev = readRaw();
  const next = updater(prev);
  if (next === prev) return;
  writeRaw(next);
  notify();
}

/* ───── asset mutations ───── */

let _aid = 0;
export function newAssetId() { _aid += 1; return `asset_${Date.now().toString(36).slice(-4)}${_aid}`; }

export function approveAsset(id, owner) {
  mutate((raw) => {
    const muts = { ...raw.assets.mutations };
    muts[id] = { ...(muts[id] || {}), approval_state: 'approved', owner: owner || muts[id]?.owner || null };
    return { ...raw, assets: { ...raw.assets, mutations: muts } };
  });
}
export function quarantineAsset(id) {
  mutate((raw) => {
    const muts = { ...raw.assets.mutations };
    muts[id] = { ...(muts[id] || {}), approval_state: 'quarantined' };
    return { ...raw, assets: { ...raw.assets, mutations: muts } };
  });
}
export function blockAsset(id) {
  mutate((raw) => {
    const muts = { ...raw.assets.mutations };
    muts[id] = { ...(muts[id] || {}), approval_state: 'blocked', user_count_7d: 0, traffic_events_7d: 0 };
    return { ...raw, assets: { ...raw.assets, mutations: muts } };
  });
}
export function setRiskClass(id, riskClass) {
  mutate((raw) => {
    const muts = { ...raw.assets.mutations };
    muts[id] = { ...(muts[id] || {}), risk_class: riskClass };
    return { ...raw, assets: { ...raw.assets, mutations: muts } };
  });
}
export function setAssetOwner(id, owner) {
  mutate((raw) => {
    const muts = { ...raw.assets.mutations };
    muts[id] = { ...(muts[id] || {}), owner };
    return { ...raw, assets: { ...raw.assets, mutations: muts } };
  });
}

/* Manually-registered asset. `discovered_via: 'manual'` is the marker
   the detail page reads to decide whether Delete is allowed (auto-
   discovered rows can be quarantined/blocked but never removed). */
export function createAsset(record) {
  mutate((raw) => {
    const additions = [...raw.assets.additions, record];
    return { ...raw, assets: { ...raw.assets, additions } };
  });
}

export function updateAsset(id, patch) {
  mutate((raw) => {
    // Edits to manually-added (additions) rows are folded in place so the
    // form result round-trips; for seeded rows we use the mutations map
    // the same way approveAsset etc. do.
    const inAdditions = raw.assets.additions.some(a => a.id === id);
    if (inAdditions) {
      const additions = raw.assets.additions.map(a => a.id === id ? { ...a, ...patch } : a);
      return { ...raw, assets: { ...raw.assets, additions } };
    }
    const muts = { ...raw.assets.mutations };
    muts[id] = { ...(muts[id] || {}), ...patch };
    return { ...raw, assets: { ...raw.assets, mutations: muts } };
  });
}

export function removeAsset(id) {
  mutate((raw) => {
    // Manually-added rows: drop from additions. Seeded rows: tombstone.
    const inAdditions = raw.assets.additions.some(a => a.id === id);
    if (inAdditions) {
      const additions = raw.assets.additions.filter(a => a.id !== id);
      return { ...raw, assets: { ...raw.assets, additions } };
    }
    const tombstones = Array.from(new Set([...raw.assets.tombstones, id]));
    return { ...raw, assets: { ...raw.assets, tombstones } };
  });
}

/* ───── event mutations ───── */

export function ackEvent(id, decision) {
  mutate((raw) => {
    const muts = { ...raw.events.mutations };
    muts[id] = { ...(muts[id] || {}), decision: decision || muts[id]?.decision, acked_at: Date.now() };
    return { ...raw, events: { ...raw.events, mutations: muts } };
  });
}

/* ───── connector mutations ───── */

let _cid = 0;
export function newConnectorId() { _cid += 1; return `conn_${Date.now().toString(36).slice(-4)}${_cid}`; }

export function createConnector(record) {
  mutate((raw) => {
    const additions = [...raw.connectors.additions, record];
    return { ...raw, connectors: { ...raw.connectors, additions } };
  });
}
export function disconnect(id) {
  mutate((raw) => {
    const muts = { ...raw.connectors.mutations };
    muts[id] = { ...(muts[id] || {}), status: 'disconnected', health: 'red' };
    return { ...raw, connectors: { ...raw.connectors, mutations: muts } };
  });
}

/* ───── DLP rule mutations ───── */

let _did = 0;
export function newDlpRuleId() { _did += 1; return `dlp_${Date.now().toString(36).slice(-4)}${_did}`; }

export function createDlpRule(record) {
  mutate((raw) => {
    const additions = [...raw.dlpRules.additions, record];
    return { ...raw, dlpRules: { ...raw.dlpRules, additions } };
  });
}
export function updateDlpRule(id, patch) {
  mutate((raw) => {
    const muts = { ...raw.dlpRules.mutations };
    muts[id] = { ...(muts[id] || {}), ...patch };
    return { ...raw, dlpRules: { ...raw.dlpRules, mutations: muts } };
  });
}
export function toggleDlpRule(id, enabled) { updateDlpRule(id, { enabled }); }
export function removeDlpRule(id) {
  mutate((raw) => {
    const seedIds = new Set(buildDlpRulesSeed().map(r => r.id));
    if (seedIds.has(id)) {
      return { ...raw, dlpRules: { ...raw.dlpRules, tombstones: Array.from(new Set([...raw.dlpRules.tombstones, id])) } };
    }
    return { ...raw, dlpRules: { ...raw.dlpRules, additions: raw.dlpRules.additions.filter(r => r.id !== id) } };
  });
}

/* ───── gateway config mutations ───── */

export function updateGatewayConfig(patch) {
  mutate((raw) => ({ ...raw, gatewayPatch: { ...(raw.gatewayPatch || {}), ...patch } }));
}
export function compileGatewayBundle() {
  updateGatewayConfig({
    last_compiled_at: Date.now(),
    bundle_size_kb: 140 + Math.floor(Math.random() * 12),
  });
}
export function deployGateway() {
  updateGatewayConfig({
    last_deployed_at: Date.now(),
    last_compiled_at: Date.now(),
  });
}

/* ───── selectors / hooks ───── */

const EMPTY = Object.freeze([]);

export function useAssets()     { return useSyncExternalStore(subscribe, snapAssets,     () => EMPTY); }
export function useEvents()     { return useSyncExternalStore(subscribe, snapEvents,     () => EMPTY); }
export function useConnectors() { return useSyncExternalStore(subscribe, snapConnectors, () => EMPTY); }
export function useDlpRules()   { return useSyncExternalStore(subscribe, snapDlpRules,   () => EMPTY); }

const EMPTY_GW = Object.freeze({});
export function useGatewayConfig() { return useSyncExternalStore(subscribe, snapGateway, () => EMPTY_GW); }

export function findAsset(id)     { return snapAssets().find(a => a.id === id) || null; }
export function findConnector(id) { return snapConnectors().find(c => c.id === id) || null; }
export function findDlpRule(id)   { return snapDlpRules().find(r => r.id === id) || null; }
export function listDlpRules()    { return snapDlpRules(); }

/* ───── derived ───── */

/* Risk score for the executive dashboard.
   Composite: sum of (asset risk × users × destination factor) for
   anything not approved. Returns a 0-100 normalized number that drifts
   smoothly as assets get approved or blocked. */
export function computeRiskScore(assets) {
  const DEST_FACTOR = { 'public-llm': 4, 'enterprise-saas': 1.5, 'sandbox': 0.5, 'internal-agent': 0.5 };
  let raw = 0;
  for (const a of assets) {
    if (a.approval_state === 'approved' || a.approval_state === 'blocked') continue;
    const r = RISK_CLASSES[a.risk_class]?.score || 1;
    const dest = DEST_FACTOR[a.destination_class] || 1;
    const users = Math.max(1, Math.log2(1 + (a.user_count_7d || 0)));
    raw += r * dest * users;
  }
  // Cap at a sensible upper bound for the demo.
  return Math.min(100, Math.round(raw));
}

export function rollupApproval(assets) {
  const out = { approved: 0, pending: 0, quarantined: 0, blocked: 0, unknown: 0 };
  for (const a of assets) out[a.approval_state || 'unknown'] = (out[a.approval_state || 'unknown'] || 0) + 1;
  return out;
}

/* Department roll-up: { Eng: { count: 12, riskScore: 38, restricted: 1 }, ... } */
export function rollupByDepartment(assets) {
  const out = {};
  for (const a of assets) {
    const dept = a.department || 'Unattributed';
    if (!out[dept]) out[dept] = { count: 0, restricted: 0, high: 0, users7d: 0, traffic7d: 0 };
    out[dept].count++;
    if (a.risk_class === 'restricted') out[dept].restricted++;
    if (a.risk_class === 'high')       out[dept].high++;
    out[dept].users7d  += a.user_count_7d || 0;
    out[dept].traffic7d += a.traffic_events_7d || 0;
  }
  return out;
}

export function topAtRisk(assets, n = 5) {
  return assets
    .filter(a => a.approval_state !== 'approved' && a.approval_state !== 'blocked')
    .sort((a, b) => {
      const ra = (RISK_CLASSES[a.risk_class]?.score || 0) * (a.user_count_7d || 1);
      const rb = (RISK_CLASSES[b.risk_class]?.score || 0) * (b.user_count_7d || 1);
      return rb - ra;
    })
    .slice(0, n);
}
