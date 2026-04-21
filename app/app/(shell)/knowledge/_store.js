'use client';

import { useCallback, useEffect, useState } from 'react';

const STORAGE_KEY = 'av-knowledge-v1';

/* -----------------------------------------------------------
   Default source shape — every knowledge source the workspace
   has. Per-agent attachment (which sources + retrieval knobs)
   lives on the agent, not here.
----------------------------------------------------------- */
export function makeDefaultSource(overrides = {}) {
  const id = overrides.id || `src_${Math.random().toString(36).slice(2, 10)}`;
  const now = new Date().toISOString();
  const defaults = {
    id,
    name:        'Untitled knowledge source',
    description: '',
    kind:        'file',         // one of KIND_CATALOG ids
    status:      'ready',        // draft | indexing | ready | failed | paused
    visibility:  'team',         // private | team | org
    owner:       'you@agentvault.io',
    team:        'Default team',
    connection:  {},
    filePatterns:['*'],
    chunking:    { strategy: 'semantic', size: 512, overlap: 64 },
    embedding:   { model: 'text-embedding-3-large', dim: 3072 },
    refresh:     { cron: '0 */6 * * *', mode: 'incremental' },
    acl:         { mode: 'inherit-from-source', allow: [] },

    // health / stats (mocked)
    docs:          0,
    chunks:        0,
    failedDocs:    0,
    indexBytes:    0,
    p50Retrieval:  0,
    recall:        0,
    lastIndexedAt: null,
    nextRunAt:     null,

    // usage (derived by /app/knowledge by scanning agents)
    attachedAgents: [],
    queries30d:     0,
    lastUsedAt:     null,

    createdAt: now,
    updatedAt: now,
  };
  return mergeSource(defaults, overrides);
}

const NESTED = ['connection', 'chunking', 'embedding', 'refresh', 'acl'];
function mergeSource(defaults, overrides) {
  const out = { ...defaults, ...overrides };
  for (const k of NESTED) {
    if (overrides?.[k] && typeof overrides[k] === 'object' && !Array.isArray(overrides[k])) {
      out[k] = { ...defaults[k], ...overrides[k] };
    }
  }
  return out;
}

/* -----------------------------------------------------------
   Hook — collection read/write
----------------------------------------------------------- */
export function useSources() {
  const [sources, setSources] = useState([]);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      const existing = raw ? JSON.parse(raw) : [];
      const healed = existing.map(s => makeDefaultSource(s));
      // Non-destructive merge for demo seeds — preserves user edits.
      const demos = DEMO_SOURCES();
      const missing = demos.filter(d => !healed.some(h => h.id === d.id));
      const merged = [...healed, ...missing];
      setSources(merged);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(merged));
    } catch {}
    setHydrated(true);
  }, []);

  const persist = useCallback((next) => {
    setSources(next);
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(next)); } catch {}
  }, []);

  const createSource = useCallback((overrides) => {
    const src = makeDefaultSource(overrides);
    persist([src, ...sources]);
    return src;
  }, [sources, persist]);

  const updateSource = useCallback((id, patch) => {
    const next = sources.map(s => s.id === id
      ? { ...s, ...patch, updatedAt: new Date().toISOString() }
      : s);
    persist(next);
  }, [sources, persist]);

  const deleteSource = useCallback((id) => persist(sources.filter(s => s.id !== id)), [sources, persist]);

  return { sources, hydrated, createSource, updateSource, deleteSource };
}

export function useSource(id) {
  const { sources, hydrated, updateSource } = useSources();
  const source = sources.find(s => s.id === id) || null;

  const patch = useCallback((path, value) => {
    if (!source) return;
    if (typeof path === 'function') {
      updateSource(id, path(source));
      return;
    }
    const segs = path.split('.');
    const next = structuredClone(source);
    let cur = next;
    for (let i = 0; i < segs.length - 1; i++) {
      cur[segs[i]] ??= {};
      cur = cur[segs[i]];
    }
    cur[segs[segs.length - 1]] = value;
    const { id: _id, ...rest } = next;
    updateSource(id, rest);
  }, [source, id, updateSource]);

  return { source, hydrated, patch };
}

/* -----------------------------------------------------------
   Demo seed — three sources so the list isn't empty
----------------------------------------------------------- */
function DEMO_SOURCES() {
  const now = new Date().toISOString();
  const aDayAgo  = new Date(Date.now() - 86400000).toISOString();
  const anHrAgo  = new Date(Date.now() - 3600000).toISOString();
  return [
    makeDefaultSource({
      id: 'src_handbook',
      name: 'Employee handbook',
      description: 'Company-wide policies, benefits, and onboarding docs.',
      kind: 'confluence',
      status: 'ready',
      owner: 'people-ops@agentvault.io',
      team: 'People Ops',
      connection: { workspaceUrl: 'https://agentvault.atlassian.net', spaces: 'HR, BENEFITS', labels: 'kb, handbook', account: 'alice@agentvault.com (OAuth)' },
      embedding: { model: 'text-embedding-3-large', dim: 3072 },
      docs: 842,
      chunks: 12_420,
      failedDocs: 3,
      indexBytes: 38 * 1024 * 1024,
      p50Retrieval: 112,
      recall: 0.94,
      lastIndexedAt: anHrAgo,
      nextRunAt: new Date(Date.now() + 5 * 3600000).toISOString(),
      queries30d: 8_240,
      lastUsedAt: anHrAgo,
      attachedAgents: ['agt_invoiceq'],
    }),
    makeDefaultSource({
      id: 'src_invoice_rules',
      name: 'AP invoice policy',
      description: 'Accounts-payable rulebook + signing authority matrix.',
      kind: 'sharepoint',
      status: 'ready',
      owner: 'finance-ai@agentvault.io',
      team: 'Finance AI',
      connection: { tenantId: '1234-...', siteUrl: 'https://agentvault.sharepoint.com/sites/finance', libraries: 'Policy, Templates' },
      embedding: { model: 'cohere-embed-v3', dim: 1024 },
      docs: 124,
      chunks: 1_820,
      failedDocs: 0,
      indexBytes: 4 * 1024 * 1024,
      p50Retrieval: 88,
      recall: 0.97,
      lastIndexedAt: aDayAgo,
      nextRunAt: new Date(Date.now() + 18 * 3600000).toISOString(),
      queries30d: 3_980,
      lastUsedAt: anHrAgo,
      attachedAgents: ['agt_invoiceq'],
    }),
    makeDefaultSource({
      id: 'src_sanctions',
      name: 'Sanctions lists (OFAC · EU · UN)',
      description: 'Daily-refreshed OFAC/EU/UN feeds normalized into one index.',
      kind: 's3',
      status: 'indexing',
      owner: 'risk-eng@agentvault.io',
      team: 'Risk Eng',
      connection: { region: 'us-east-1', bucket: 'av-sanctions-feeds', prefix: 'normalized/', roleArn: 'arn:aws:iam::123456789012:role/AgentVaultKB' },
      docs: 0,
      chunks: 0,
      failedDocs: 0,
      indexBytes: 0,
      p50Retrieval: 0,
      recall: 0,
      lastIndexedAt: null,
      nextRunAt: new Date(Date.now() + 90000).toISOString(),
      queries30d: 0,
      lastUsedAt: null,
      attachedAgents: [],
      refresh: { cron: '0 * * * *', mode: 'incremental' },
    }),
    makeDefaultSource({
      id: 'src_analytics_dictionary',
      name: 'Analytics data dictionary',
      description: 'Schema docs, table owners, and column semantics for the analytics warehouse. Agents use this to ground SQL generation in business vocabulary.',
      kind: 'postgres',
      status: 'ready',
      owner: 'data-platform@agentvault.io',
      team: 'Data Platform',
      connection: { host: 'db.internal', database: 'metadata', tables: 'dim_*, fct_*', auth: 'iam-role' },
      embedding: { model: 'text-embedding-3-large', dim: 3072 },
      docs: 318,
      chunks: 4_912,
      failedDocs: 0,
      indexBytes: 9 * 1024 * 1024,
      p50Retrieval: 82,
      recall: 0.96,
      lastIndexedAt: new Date(Date.now() - 2 * 3600000).toISOString(),
      nextRunAt: new Date(Date.now() + 4 * 3600000).toISOString(),
      queries30d: 5_204,
      lastUsedAt: new Date(Date.now() - 3600000).toISOString(),
      attachedAgents: ['agt_data_analyst'],
      refresh: { cron: '0 */6 * * *', mode: 'incremental' },
    }),
  ];
}
