'use client';

import { useCallback, useEffect, useState } from 'react';
import { SEEDED_TOOLS } from './_toolsCatalog';

/* Tools store
   ───────────
   Same overlay pattern as the policy store:
     av-tools-v1          user-created or edited tool records
     av-tools-deleted-v1  tombstones for seeded tools the user deleted

   Resolution:
     1. Start with SEEDED_TOOLS, drop tombstoned ids.
     2. For each user record: replace by id if it matches a seed,
        otherwise append.
     3. Append tools derived from registered MCP servers (so adding a
        server in /app/mcp surfaces its tools here without re-seeding).

   The MCP-derived tools have a stable id `mcp.<serverId>.<toolName>` so
   policy attachments and run-trace links keep working across reloads. */

const TOOLS_KEY   = 'av-tools-v1';
const DELETED_KEY = 'av-tools-deleted-v1';
const MCP_KEY     = 'av-mcp-v1';

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
  return 'tool_' + Math.random().toString(36).slice(2, 10);
}

function deriveMcpTools() {
  const servers = readJson(MCP_KEY, []);
  const out = [];
  for (const s of servers) {
    if (!Array.isArray(s.tools)) continue;
    for (const t of s.tools) {
      const id = `mcp.${s.id}.${t.name}`;
      out.push({
        id,
        name: t.name,
        origin: 'mcp',
        vendor: s.vendorId,
        mcpServerId: s.id,
        mcpServerName: s.name,
        description: t.description || '',
        sideEffect: inferSideEffect(t),
        risk: t.riskLevel || 'low',
        scopes: s.auth?.scopes || [],
        owner: s.owner,
        team: s.team,
        status: t.enabled === false ? 'disabled' : 'active',
        version: 'live',
        schema: t.schema || { input: '—', output: '—' },
        sampleInput: null,
        usage7d: {
          calls: t.callsMTD || 0,
          errorRate: t.errorRate || 0,
          p50LatencyMs: t.p50 || 0,
          callingAgents: s.attachedAgents || [],
        },
        findings7d: {
          block: 0,
          approval: t.approval ? Math.round((t.callsMTD || 0) * 0.05) : 0,
          warn: 0,
          log: t.callsMTD || 0,
        },
        deprecation: null,
        createdAt: s.createdAt,
        updatedAt: s.updatedAt,
      });
    }
  }
  return out;
}

function inferSideEffect(tool) {
  const n = (tool.name || '').toLowerCase();
  if (tool.riskLevel === 'high') {
    if (n.includes('refund') || n.includes('charge')) return 'payment';
    if (n.includes('delete') || n.includes('cancel')) return 'admin';
    return 'write-external';
  }
  if (n.includes('comment') || n.includes('post') || n.includes('send')) return 'send-message';
  if (n.includes('write') || n.includes('update') || n.includes('create') || n.includes('dispatch')) return 'write-external';
  return 'read';
}

function resolve(userTools, deleted) {
  const deletedSet = new Set(deleted);
  const userById = new Map(userTools.map(t => [t.id, t]));

  const merged = [];
  // Seeded first
  for (const seed of SEEDED_TOOLS) {
    if (deletedSet.has(seed.id)) continue;
    merged.push(userById.has(seed.id) ? userById.get(seed.id) : seed);
  }
  // User-created (not matching any seed id)
  const seedIds = new Set(SEEDED_TOOLS.map(t => t.id));
  for (const t of userTools) {
    if (!seedIds.has(t.id)) merged.push(t);
  }
  // MCP-derived
  for (const t of deriveMcpTools()) {
    if (deletedSet.has(t.id)) continue;
    if (userById.has(t.id)) {
      merged.push(userById.get(t.id));   // user override of an mcp tool
    } else {
      merged.push(t);
    }
  }
  return merged;
}

export function useTools() {
  // First-paint with seeded fixtures so SSR doesn't show empty.
  const [list, setList] = useState(SEEDED_TOOLS);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    setList(resolve(readJson(TOOLS_KEY, []), readJson(DELETED_KEY, [])));
    setHydrated(true);
  }, []);

  const persist = useCallback((userTools, deleted) => {
    writeJson(TOOLS_KEY, userTools);
    writeJson(DELETED_KEY, deleted);
    setList(resolve(userTools, deleted));
  }, []);

  const create = useCallback((draft) => {
    const userTools = readJson(TOOLS_KEY, []);
    const deleted   = readJson(DELETED_KEY, []);
    const id = draft.id || makeId();
    const next = {
      ...draft,
      id,
      origin: draft.origin || 'custom',
      status: draft.status || 'beta',
      version: draft.version || '0.1.0',
      scopes: draft.scopes || [],
      schema: draft.schema || { input: '—', output: '—' },
      usage7d:    draft.usage7d    || { calls: 0, errorRate: 0, p50LatencyMs: 0, callingAgents: [] },
      findings7d: draft.findings7d || { block: 0, approval: 0, warn: 0, log: 0 },
      deprecation: null,
      createdAt: draft.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    persist([...userTools, next], deleted);
    return next;
  }, [persist]);

  const update = useCallback((id, patch) => {
    const userTools = readJson(TOOLS_KEY, []);
    const deleted   = readJson(DELETED_KEY, []);
    const seed = SEEDED_TOOLS.find(t => t.id === id);
    const existing = userTools.find(t => t.id === id);
    const base = existing || seed;
    if (!base) return null;
    const merged = { ...base, ...patch, id, updatedAt: new Date().toISOString() };
    const next = existing
      ? userTools.map(t => t.id === id ? merged : t)
      : [...userTools, merged];
    persist(next, deleted);
    return merged;
  }, [persist]);

  const remove = useCallback((id) => {
    const userTools = readJson(TOOLS_KEY, []);
    const deleted   = readJson(DELETED_KEY, []);
    const isSeed = SEEDED_TOOLS.some(t => t.id === id);
    const nextUser = userTools.filter(t => t.id !== id);
    const nextDel  = isSeed && !deleted.includes(id) ? [...deleted, id] : deleted;
    persist(nextUser, nextDel);
  }, [persist]);

  /* ── Provider mutations ──
     These operate on the tool's `providers[]` array. Each mutation goes
     through `update` so seed-vs-user override semantics stay consistent. */

  const addProvider = useCallback((toolId, provider) => {
    const t = readToolById(toolId);
    if (!t) return null;
    const newProvider = {
      id: provider.id || ('prov_' + Math.random().toString(36).slice(2, 10)),
      role:   provider.role || 'fallback',
      status: provider.status || 'active',
      createdAt: new Date().toISOString(),
      ...provider,
    };
    const providers = [...(t.providers || []), newProvider];
    return update(toolId, { providers });
  }, [update]);

  const updateProvider = useCallback((toolId, providerId, patch) => {
    const t = readToolById(toolId);
    if (!t) return null;
    const providers = (t.providers || []).map(p =>
      p.id === providerId ? { ...p, ...patch } : p,
    );
    return update(toolId, { providers });
  }, [update]);

  const removeProvider = useCallback((toolId, providerId) => {
    const t = readToolById(toolId);
    if (!t) return null;
    const providers = (t.providers || []).filter(p => p.id !== providerId);
    return update(toolId, { providers });
  }, [update]);

  /* Promote a provider to primary; demote any existing primary to fallback.
     Bypassed when the strategy isn't primary-fallback. */
  const promoteProvider = useCallback((toolId, providerId) => {
    const t = readToolById(toolId);
    if (!t) return null;
    const providers = (t.providers || []).map(p =>
      p.id === providerId
        ? { ...p, role: 'primary', status: 'active' }
        : p.role === 'primary' ? { ...p, role: 'fallback' } : p,
    );
    return update(toolId, { providers });
  }, [update]);

  const updateRouting = useCallback((toolId, routingPatch) => {
    const t = readToolById(toolId);
    if (!t) return null;
    return update(toolId, { routing: { ...(t.routing || {}), ...routingPatch } });
  }, [update]);

  /* ── Runtime-block mutations ──
     Used by code interpreter (and any future compute tool). Each mutator
     deep-merges within its sub-tree so partial updates don't blow away
     unrelated fields. */

  const updateRuntime = useCallback((toolId, sub, patch) => {
    const t = readToolById(toolId);
    if (!t) return null;
    const runtime = { ...(t.runtime || {}) };
    if (sub) {
      runtime[sub] = { ...(runtime[sub] || {}), ...patch };
    } else {
      Object.assign(runtime, patch);
    }
    return update(toolId, { runtime });
  }, [update]);

  /* Specialised helpers that wrap updateRuntime for the named sub-trees. */
  const updateLanguages   = useCallback((toolId, patch) => updateRuntime(toolId, 'languages',  patch), [updateRuntime]);
  const updateLimits      = useCallback((toolId, patch) => updateRuntime(toolId, 'limits',      patch), [updateRuntime]);
  const updateNetwork     = useCallback((toolId, patch) => updateRuntime(toolId, 'network',     patch), [updateRuntime]);
  const updateFilesystem  = useCallback((toolId, patch) => updateRuntime(toolId, 'filesystem',  patch), [updateRuntime]);
  const updateStateMode   = useCallback((toolId, patch) => updateRuntime(toolId, 'state',       patch), [updateRuntime]);
  const updateOutput      = useCallback((toolId, patch) => updateRuntime(toolId, 'output',      patch), [updateRuntime]);
  const updateGpu         = useCallback((toolId, patch) => updateRuntime(toolId, 'gpu',         patch), [updateRuntime]);

  /* Per-language sub-config (e.g. update python.packages without touching node). */
  const updateLanguageConfig = useCallback((toolId, language, patch) => {
    const t = readToolById(toolId);
    if (!t) return null;
    const langs = { ...(t.runtime?.languages || {}) };
    langs[language] = { ...(langs[language] || {}), ...patch };
    return update(toolId, { runtime: { ...(t.runtime || {}), languages: langs } });
  }, [update]);

  /* ── Retrieval-block mutations ──
     For knowledge.search and knowledge.graph. Same shape as updateRuntime
     but writes to the `retrieval` sub-tree. */

  const updateRetrieval = useCallback((toolId, sub, patch) => {
    const t = readToolById(toolId);
    if (!t) return null;
    const retrieval = { ...(t.retrieval || {}) };
    if (sub) {
      retrieval[sub] = { ...(retrieval[sub] || {}), ...patch };
    } else {
      Object.assign(retrieval, patch);
    }
    return update(toolId, { retrieval });
  }, [update]);

  const updateStrategy      = useCallback((toolId, patch) => updateRetrieval(toolId, 'strategy',      patch), [updateRetrieval]);
  const updateEmbedding     = useCallback((toolId, patch) => updateRetrieval(toolId, 'embedding',     patch), [updateRetrieval]);
  const updateReranker      = useCallback((toolId, patch) => updateRetrieval(toolId, 'reranker',      patch), [updateRetrieval]);
  const updateRetrievalAcl  = useCallback((toolId, patch) => updateRetrieval(toolId, 'acl',           patch), [updateRetrieval]);
  const updateFreshness     = useCallback((toolId, patch) => updateRetrieval(toolId, 'freshness',     patch), [updateRetrieval]);
  const updateQuality       = useCallback((toolId, patch) => updateRetrieval(toolId, 'quality',       patch), [updateRetrieval]);
  const updateGraph         = useCallback((toolId, patch) => updateRetrieval(toolId, 'graph',         patch), [updateRetrieval]);
  const updateGraphQuery    = useCallback((toolId, patch) => updateRetrieval(toolId, 'query',         patch), [updateRetrieval]);
  const updateSummarization = useCallback((toolId, patch) => updateRetrieval(toolId, 'summarization', patch), [updateRetrieval]);

  /* Multi-select corpora (top-level array on the retrieval block). */
  const setCorpora = useCallback((toolId, corpora) => {
    const t = readToolById(toolId);
    if (!t) return null;
    return update(toolId, { retrieval: { ...(t.retrieval || {}), corpora } });
  }, [update]);

  return {
    list, hydrated,
    create, update, remove,
    addProvider, updateProvider, removeProvider, promoteProvider, updateRouting,
    // runtime (compute tools)
    updateRuntime,
    updateLanguages, updateLimits, updateNetwork, updateFilesystem, updateStateMode, updateOutput, updateGpu,
    updateLanguageConfig,
    // retrieval (RAG / GraphRAG)
    updateRetrieval,
    updateStrategy, updateEmbedding, updateReranker, updateRetrievalAcl,
    updateFreshness, updateQuality,
    updateGraph, updateGraphQuery, updateSummarization,
    setCorpora,
  };
}

/* Read-only — for non-hook contexts (run trace links, etc.) */
export function readTools() {
  return resolve(readJson(TOOLS_KEY, []), readJson(DELETED_KEY, []));
}

export function readToolById(id) {
  return readTools().find(t => t.id === id) || null;
}
