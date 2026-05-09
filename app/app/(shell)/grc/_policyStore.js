'use client';

import { useCallback, useEffect, useState } from 'react';
import { POLICIES as SEEDED } from './_data';

/* Storage model
   -------------
   av-grc-policies-v1   array of policy objects (same shape as POLICIES fixture).
   av-grc-deleted-v1    array of seeded policy ids the user has deleted.

   Why overlay rather than persist-and-replace: the seeded fixtures are
   meaningful demo content. We want the first visit to show them, edits to
   stick, and deletes to be remembered — without copying the entire seed array
   into localStorage on first load (which would lock users out of future seed
   updates). So we keep two small stores: user-created/edited policies, and a
   tombstone set for seed deletions.

   Resolution order on read:
     1. Start with seeded fixtures, filtered by the tombstone set.
     2. For each user policy: if id matches a seed id, replace; otherwise append.
*/

const POLICIES_KEY = 'av-grc-policies-v1';
const DELETED_KEY  = 'av-grc-deleted-v1';

function readJson(key, fallback) {
  if (typeof window === 'undefined') return fallback;
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
}

function writeJson(key, value) {
  if (typeof window === 'undefined') return;
  try { localStorage.setItem(key, JSON.stringify(value)); } catch {}
}

function makeId() {
  return 'pol_' + Math.random().toString(36).slice(2, 10);
}

function resolve(userPolicies, deleted) {
  const deletedSet = new Set(deleted);
  const userById = new Map(userPolicies.map(p => [p.id, p]));

  const merged = [];
  // Seeded first (preserving fixture order), with overrides applied
  for (const seed of SEEDED) {
    if (deletedSet.has(seed.id)) continue;
    merged.push(userById.has(seed.id) ? userById.get(seed.id) : seed);
  }
  // Then any user-created policies whose ids don't match a seed
  const seedIds = new Set(SEEDED.map(p => p.id));
  for (const p of userPolicies) {
    if (!seedIds.has(p.id)) merged.push(p);
  }
  return merged;
}

export function usePolicies() {
  // Start with the seeded fixtures so the very first SSR / first-paint shows
  // demo content even before localStorage is read.
  const [list, setList] = useState(SEEDED);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    const userPolicies = readJson(POLICIES_KEY, []);
    const deleted      = readJson(DELETED_KEY, []);
    setList(resolve(userPolicies, deleted));
    setHydrated(true);
  }, []);

  const persist = useCallback((userPolicies, deleted) => {
    writeJson(POLICIES_KEY, userPolicies);
    writeJson(DELETED_KEY, deleted);
    setList(resolve(userPolicies, deleted));
  }, []);

  const create = useCallback((draft) => {
    const userPolicies = readJson(POLICIES_KEY, []);
    const deleted      = readJson(DELETED_KEY, []);
    const id = draft.id || makeId();
    const next = {
      ...draft,
      id,
      attached: draft.attached || { workspaces: 0, agents: 0, tools: 0 },
      createdAt: draft.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      origin: 'user',
    };
    persist([...userPolicies, next], deleted);
    return next;
  }, [persist]);

  const update = useCallback((id, patch) => {
    const userPolicies = readJson(POLICIES_KEY, []);
    const deleted      = readJson(DELETED_KEY, []);
    const seed = SEEDED.find(p => p.id === id);
    const existing = userPolicies.find(p => p.id === id);

    const base = existing || seed;
    if (!base) return null;

    const merged = {
      ...base,
      ...patch,
      id,
      updatedAt: new Date().toISOString(),
      origin: existing ? existing.origin || 'user' : 'edited-seed',
    };
    const nextUser = existing
      ? userPolicies.map(p => p.id === id ? merged : p)
      : [...userPolicies, merged];
    persist(nextUser, deleted);
    return merged;
  }, [persist]);

  const remove = useCallback((id) => {
    const userPolicies = readJson(POLICIES_KEY, []);
    const deleted      = readJson(DELETED_KEY, []);
    const isSeed = SEEDED.some(p => p.id === id);
    const nextUser = userPolicies.filter(p => p.id !== id);
    const nextDel  = isSeed && !deleted.includes(id) ? [...deleted, id] : deleted;
    persist(nextUser, nextDel);
  }, [persist]);

  // Attach an agent (by id) to a policy. Stored on `attachedAgents` (string[])
  // alongside the seeded `attached.agents` count so seed display is preserved
  // until the user touches it. Once they do, attachedAgents wins.
  const attachAgent = useCallback((policyId, agentId) => {
    const target = readPolicies().find(p => p.id === policyId);
    if (!target) return;
    const current = target.attachedAgents || [];
    if (current.includes(agentId)) return;
    update(policyId, { attachedAgents: [...current, agentId] });
  }, [update]);

  const detachAgent = useCallback((policyId, agentId) => {
    const target = readPolicies().find(p => p.id === policyId);
    if (!target) return;
    const current = target.attachedAgents || [];
    if (!current.includes(agentId)) return;
    update(policyId, { attachedAgents: current.filter(a => a !== agentId) });
  }, [update]);

  const attachTool = useCallback((policyId, toolId) => {
    const target = readPolicies().find(p => p.id === policyId);
    if (!target) return;
    const current = target.attachedTools || [];
    if (current.includes(toolId)) return;
    update(policyId, { attachedTools: [...current, toolId] });
  }, [update]);

  const detachTool = useCallback((policyId, toolId) => {
    const target = readPolicies().find(p => p.id === policyId);
    if (!target) return;
    const current = target.attachedTools || [];
    if (!current.includes(toolId)) return;
    update(policyId, { attachedTools: current.filter(t => t !== toolId) });
  }, [update]);

  const restoreSeeds = useCallback(() => {
    persist(readJson(POLICIES_KEY, []), []);
  }, [persist]);

  return { list, hydrated, create, update, remove, attachAgent, detachAgent, attachTool, detachTool, restoreSeeds };
}

// Effective attached-agents list: prefer the user-edited array if set,
// otherwise fall back to the seeded count by synthesizing placeholder ids.
// (We don't actually need placeholders most places; counts come from
// `effectiveAgentCount` below for display purposes.)
export function effectiveAttachedAgents(policy) {
  if (Array.isArray(policy.attachedAgents)) return policy.attachedAgents;
  return [];
}

export function effectiveAgentCount(policy) {
  if (Array.isArray(policy.attachedAgents)) return policy.attachedAgents.length;
  return policy.attached?.agents || 0;
}

export function effectiveAttachedTools(policy) {
  if (Array.isArray(policy.attachedTools)) return policy.attachedTools;
  return [];
}

export function effectiveToolCount(policy) {
  if (Array.isArray(policy.attachedTools)) return policy.attachedTools.length;
  return policy.attached?.tools || 0;
}

// Read-only helper for non-hook contexts (e.g. SSR fallbacks).
export function readPolicies() {
  const userPolicies = readJson(POLICIES_KEY, []);
  const deleted      = readJson(DELETED_KEY, []);
  return resolve(userPolicies, deleted);
}

export function readPolicyById(id) {
  return readPolicies().find(p => p.id === id) || null;
}
