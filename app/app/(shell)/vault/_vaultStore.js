'use client';

import { useCallback, useEffect, useState } from 'react';

/* Vault store
   ───────────
   Two collections in localStorage:
     av-vault-backends-v1    — connected backends (where secrets live)
     av-vault-refs-v1        — secret reference index (vault://... → backend + path)

   Same overlay model as the rest of the app: seeded fixtures hydrate on first
   load; user creates/edits override; deletes are tombstoned.
   av-vault-deleted-v1 stores ids of seeded refs the user removed. */

const BACKENDS_KEY = 'av-vault-backends-v1';
const REFS_KEY     = 'av-vault-refs-v1';
const REFS_TOMB    = 'av-vault-refs-deleted-v1';

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

function makeId(prefix) {
  return `${prefix}_` + Math.random().toString(36).slice(2, 10);
}

/* ─────────────────────── Seeded backends ─────────────────────── */

const SEED_BACKENDS = () => {
  const now = new Date().toISOString();
  return [
    {
      id: 'be_builtin',
      kind: 'builtin',
      name: 'AgentVault built-in',
      description: 'Default workspace vault. KMS-encrypted in your AgentVault VPC. Use for low-friction secrets while you wire a cloud backend.',
      status: 'connected',
      health: { ok: true, latencyMs: 12, lastCheckedAt: now },
      auth: {},
      options: { region: 'us-east-1' },
      pathPrefix: 'vault://',
      createdAt: '2025-09-01T08:00:00.000Z',
      updatedAt: '2026-04-22T08:00:00.000Z',
      origin: 'seed',
    },
    {
      id: 'be_aws_prod',
      kind: 'aws-secrets-manager',
      name: 'AWS Secrets Manager · prod',
      description: 'Production secrets in the AgentVault prod AWS account. OIDC-federated; no static keys.',
      status: 'connected',
      health: { ok: true, latencyMs: 64, lastCheckedAt: now },
      auth: {
        authMethod: 'oidc',
        roleArn:    'arn:aws:iam::847234923847:role/agentvault-vault-prod',
        externalId: 'av-prod-9zV3',
      },
      options: { region: 'us-east-1', kmsKeyArn: 'arn:aws:kms:us-east-1:847234923847:key/c1f8…' },
      pathPrefix: 'vault://aws/',
      createdAt: '2025-11-04T08:00:00.000Z',
      updatedAt: '2026-04-30T08:00:00.000Z',
      origin: 'seed',
    },
    {
      id: 'be_azure_eu',
      kind: 'azure-keyvault',
      name: 'Azure Key Vault · EU',
      description: 'EU-resident secrets for the European deployment. Workload-identity federated.',
      status: 'connected',
      health: { ok: true, latencyMs: 92, lastCheckedAt: now },
      auth: {
        authMethod: 'workload-identity',
        tenantId:   '0e6c1ff3-2b8a-4f90-b7e2-9128a3a7f0ab',
        clientId:   '7c2f3a91-1a04-4cc3-a4ef-31b99a7a08bf',
        vaultUri:   'https://av-prod-eu.vault.azure.net',
      },
      options: { environment: 'AzurePublic' },
      pathPrefix: 'vault://az/',
      createdAt: '2026-01-08T08:00:00.000Z',
      updatedAt: '2026-04-12T08:00:00.000Z',
      origin: 'seed',
    },
    {
      id: 'be_hashi_internal',
      kind: 'hashicorp-vault',
      name: 'HashiCorp Vault · internal',
      description: 'Internal HashiCorp Vault cluster used for database mTLS certs + on-prem service auth.',
      status: 'degraded',
      health: { ok: false, latencyMs: 410, lastCheckedAt: now, message: 'p95 latency 1.4s · 3 retries last hour' },
      auth: { authMethod: 'jwt-oidc', address: 'https://vault.internal.corp', namespace: 'admin/team-platform', role: 'agentvault' },
      options: { mountPath: 'secret', kvVersion: 'v2' },
      pathPrefix: 'vault://hashi/',
      createdAt: '2025-12-12T08:00:00.000Z',
      updatedAt: '2026-05-02T08:00:00.000Z',
      origin: 'seed',
    },
  ];
};

/* ─────────────────────── Seeded refs ─────────────────────── */

/* These match the vault://... strings already scattered through MCP servers
   and tool providers in the app, so the new vault page surfaces them as
   real entries on first visit instead of being empty. */

const SEED_REFS = () => {
  const now = new Date().toISOString();
  const monthAgo = new Date(Date.now() - 30 * 86400000).toISOString();
  const weekAgo  = new Date(Date.now() - 7  * 86400000).toISOString();
  const tomorrow = new Date(Date.now() + 1  * 86400000).toISOString();
  const in60d    = new Date(Date.now() + 60 * 86400000).toISOString();
  const in90d    = new Date(Date.now() + 90 * 86400000).toISOString();
  return [
    {
      id: 'ref_websearch_bing',
      path: 'vault://web-search/bing-grounding/key',
      type: 'api-key',
      backendId: 'be_aws_prod',
      backendPath: 'agentvault/web-search/bing-grounding/key',
      description: 'Bing Grounding API key (Foundry resource).',
      status: 'active',
      version: 7,
      versions: [
        { version: 7, createdAt: weekAgo,  by: 'platform@agentvault.io' },
        { version: 6, createdAt: monthAgo, by: 'platform@agentvault.io' },
      ],
      rotation: { policy: 'every-90-days', lastRotatedAt: weekAgo, nextRotationAt: in90d, autoRotate: true },
      usedBy: [
        { kind: 'tool-provider', toolId: 'web.search', providerId: 'prov_bing_us', label: 'web.search · Bing Grounding · US' },
      ],
      createdAt: '2026-01-15T10:00:00.000Z',
      updatedAt: weekAgo,
      origin: 'seed',
    },
    {
      id: 'ref_websearch_brave',
      path: 'vault://web-search/brave/key',
      type: 'api-key',
      backendId: 'be_builtin',
      backendPath: 'web-search/brave/key',
      description: 'Brave Search API key.',
      status: 'active',
      version: 3,
      versions: [
        { version: 3, createdAt: monthAgo, by: 'platform@agentvault.io' },
        { version: 2, createdAt: '2026-01-12T10:00:00.000Z', by: 'platform@agentvault.io' },
      ],
      rotation: { policy: 'manual', lastRotatedAt: monthAgo, nextRotationAt: null, autoRotate: false },
      usedBy: [
        { kind: 'tool-provider', toolId: 'web.search', providerId: 'prov_brave_global', label: 'web.search · Brave · global' },
      ],
      createdAt: '2026-02-04T10:00:00.000Z',
      updatedAt: monthAgo,
      origin: 'seed',
    },
    {
      id: 'ref_codeexec_e2b',
      path: 'vault://code-exec/e2b/key',
      type: 'api-key',
      backendId: 'be_aws_prod',
      backendPath: 'agentvault/code-exec/e2b/key',
      description: 'E2B sandbox API key.',
      status: 'active',
      version: 2,
      versions: [
        { version: 2, createdAt: weekAgo,  by: 'platform@agentvault.io' },
        { version: 1, createdAt: '2026-02-04T10:00:00.000Z', by: 'platform@agentvault.io' },
      ],
      rotation: { policy: 'every-30-days', lastRotatedAt: weekAgo, nextRotationAt: in60d, autoRotate: true },
      usedBy: [
        { kind: 'tool-provider', toolId: 'code.exec', providerId: 'prov_e2b_ml', label: 'code.exec · E2B · ML workloads' },
      ],
      createdAt: '2026-02-04T10:00:00.000Z',
      updatedAt: weekAgo,
      origin: 'seed',
    },
    {
      id: 'ref_retrieval_qdrant',
      path: 'vault://retrieval/qdrant/key',
      type: 'api-key',
      backendId: 'be_aws_prod',
      backendPath: 'agentvault/retrieval/qdrant/key',
      description: 'Qdrant cloud API key.',
      status: 'expiring',
      version: 4,
      versions: [
        { version: 4, createdAt: '2026-02-12T10:00:00.000Z', by: 'data-platform@agentvault.io' },
      ],
      rotation: { policy: 'every-90-days', lastRotatedAt: '2026-02-12T10:00:00.000Z', nextRotationAt: tomorrow, autoRotate: true },
      usedBy: [
        { kind: 'tool-provider', toolId: 'knowledge.search', providerId: 'prov_kn_qdrant', label: 'knowledge.search · Qdrant · prod' },
      ],
      createdAt: '2026-01-12T10:00:00.000Z',
      updatedAt: '2026-02-12T10:00:00.000Z',
      origin: 'seed',
    },
    {
      id: 'ref_retrieval_graphrag',
      path: 'vault://retrieval/graphrag/storage-key',
      type: 'api-key',
      backendId: 'be_azure_eu',
      backendPath: 'graphrag/storage-key',
      description: 'Microsoft GraphRAG index storage key.',
      status: 'active',
      version: 1,
      versions: [{ version: 1, createdAt: '2026-02-10T10:00:00.000Z', by: 'data-platform@agentvault.io' }],
      rotation: { policy: 'every-180-days', lastRotatedAt: '2026-02-10T10:00:00.000Z', nextRotationAt: '2026-08-09T10:00:00.000Z', autoRotate: true },
      usedBy: [
        { kind: 'tool-provider', toolId: 'knowledge.graph', providerId: 'prov_kg_msr', label: 'knowledge.graph · MSR · prod' },
      ],
      createdAt: '2026-02-10T10:00:00.000Z',
      updatedAt: '2026-02-10T10:00:00.000Z',
      origin: 'seed',
    },
    {
      id: 'ref_retrieval_neo4j',
      path: 'vault://retrieval/neo4j/key',
      type: 'api-key',
      backendId: 'be_azure_eu',
      backendPath: 'neo4j/key',
      description: 'Neo4j AuraDB API key (staging).',
      status: 'active',
      version: 1,
      versions: [{ version: 1, createdAt: '2026-03-22T10:00:00.000Z', by: 'data-platform@agentvault.io' }],
      rotation: { policy: 'manual', lastRotatedAt: '2026-03-22T10:00:00.000Z', nextRotationAt: null, autoRotate: false },
      usedBy: [
        { kind: 'tool-provider', toolId: 'knowledge.graph', providerId: 'prov_kg_neo4j', label: 'knowledge.graph · Neo4j · staging' },
      ],
      createdAt: '2026-03-22T10:00:00.000Z',
      updatedAt: '2026-03-22T10:00:00.000Z',
      origin: 'seed',
    },
    {
      id: 'ref_mcp_databases_cert',
      path: 'vault://mcp/mcp_databases_prod/client.crt',
      type: 'tls-cert',
      backendId: 'be_hashi_internal',
      backendPath: 'kv/data/mcp/databases-prod/client-cert',
      description: 'mTLS client certificate for the Databases MCP server.',
      status: 'active',
      version: 2,
      versions: [
        { version: 2, createdAt: weekAgo, by: 'data-platform@agentvault.io' },
        { version: 1, createdAt: '2025-12-12T10:00:00.000Z', by: 'data-platform@agentvault.io' },
      ],
      rotation: { policy: 'every-365-days', lastRotatedAt: weekAgo, nextRotationAt: '2027-05-02T10:00:00.000Z', autoRotate: true },
      usedBy: [
        { kind: 'mcp-server', mcpServerId: 'mcp_databases_prod', label: 'Databases · Prod (mTLS cert)' },
      ],
      createdAt: '2025-12-12T10:00:00.000Z',
      updatedAt: weekAgo,
      origin: 'seed',
    },
    {
      id: 'ref_mcp_databases_key',
      path: 'vault://mcp/mcp_databases_prod/client.key',
      type: 'ssh-key',
      backendId: 'be_hashi_internal',
      backendPath: 'kv/data/mcp/databases-prod/client-key',
      description: 'mTLS client private key for the Databases MCP server.',
      status: 'active',
      version: 2,
      versions: [
        { version: 2, createdAt: weekAgo, by: 'data-platform@agentvault.io' },
      ],
      rotation: { policy: 'every-365-days', lastRotatedAt: weekAgo, nextRotationAt: '2027-05-02T10:00:00.000Z', autoRotate: true },
      usedBy: [
        { kind: 'mcp-server', mcpServerId: 'mcp_databases_prod', label: 'Databases · Prod (mTLS key)' },
      ],
      createdAt: '2025-12-12T10:00:00.000Z',
      updatedAt: weekAgo,
      origin: 'seed',
    },
    {
      id: 'ref_mcp_stripe',
      path: 'vault://mcp/mcp_stripe_sandbox/token',
      type: 'bearer-token',
      backendId: 'be_aws_prod',
      backendPath: 'agentvault/mcp/stripe-sandbox/token',
      description: 'Stripe sandbox bearer token.',
      status: 'expired',
      version: 1,
      versions: [{ version: 1, createdAt: '2026-01-15T10:00:00.000Z', by: 'billing-ai@agentvault.io' }],
      rotation: { policy: 'every-90-days', lastRotatedAt: '2026-01-15T10:00:00.000Z', nextRotationAt: '2026-04-15T10:00:00.000Z', autoRotate: false },
      usedBy: [
        { kind: 'mcp-server', mcpServerId: 'mcp_stripe_sandbox', label: 'Stripe · Sandbox (bearer)' },
      ],
      createdAt: '2026-01-15T10:00:00.000Z',
      updatedAt: '2026-01-15T10:00:00.000Z',
      origin: 'seed',
    },
    {
      id: 'ref_email_send',
      path: 'vault://email-send/gmail/oauth',
      type: 'oauth-token',
      backendId: 'be_builtin',
      backendPath: 'email-send/gmail/oauth',
      description: 'Gmail OAuth refresh + access token.',
      status: 'active',
      version: 12,
      versions: [
        { version: 12, createdAt: now, by: 'comms-platform@agentvault.io', autoRefresh: true },
      ],
      rotation: { policy: 'auto-refresh', lastRotatedAt: now, nextRotationAt: null, autoRotate: true },
      usedBy: [
        { kind: 'tool', toolId: 'email.send', label: 'email.send · default credential' },
      ],
      createdAt: '2025-10-04T10:00:00.000Z',
      updatedAt: now,
      origin: 'seed',
    },
  ];
};

function resolveBackends(user) {
  const userById = new Map(user.map(b => [b.id, b]));
  const merged = [];
  for (const seed of SEED_BACKENDS()) {
    merged.push(userById.has(seed.id) ? userById.get(seed.id) : seed);
  }
  for (const b of user) if (!SEED_BACKENDS().some(s => s.id === b.id)) merged.push(b);
  return merged;
}

function resolveRefs(user, deleted) {
  const tomb = new Set(deleted);
  const userById = new Map(user.map(r => [r.id, r]));
  const merged = [];
  for (const seed of SEED_REFS()) {
    if (tomb.has(seed.id)) continue;
    merged.push(userById.has(seed.id) ? userById.get(seed.id) : seed);
  }
  for (const r of user) if (!SEED_REFS().some(s => s.id === r.id)) merged.push(r);
  return merged;
}

/* ─────────────────────── Hook ─────────────────────── */

export function useVault() {
  const [backends, setBackends] = useState(SEED_BACKENDS());
  const [refs, setRefs]         = useState(SEED_REFS());
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    setBackends(resolveBackends(readJson(BACKENDS_KEY, [])));
    setRefs(resolveRefs(readJson(REFS_KEY, []), readJson(REFS_TOMB, [])));
    setHydrated(true);
  }, []);

  const persistBackends = useCallback((next) => {
    writeJson(BACKENDS_KEY, next);
    setBackends(resolveBackends(next));
  }, []);

  const persistRefs = useCallback((nextUser, nextDel) => {
    writeJson(REFS_KEY, nextUser);
    writeJson(REFS_TOMB, nextDel);
    setRefs(resolveRefs(nextUser, nextDel));
  }, []);

  /* ── Backends ── */

  const addBackend = useCallback((draft) => {
    const user = readJson(BACKENDS_KEY, []);
    const id = draft.id || makeId('be');
    const backend = {
      ...draft, id,
      status: draft.status || 'connected',
      health: draft.health || { ok: true, latencyMs: 0, lastCheckedAt: new Date().toISOString() },
      createdAt: draft.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      origin: 'user',
    };
    persistBackends([...user, backend]);
    return backend;
  }, [persistBackends]);

  const updateBackend = useCallback((id, patch) => {
    const user = readJson(BACKENDS_KEY, []);
    const seed = SEED_BACKENDS().find(b => b.id === id);
    const existing = user.find(b => b.id === id);
    const base = existing || seed;
    if (!base) return null;
    const merged = { ...base, ...patch, id, updatedAt: new Date().toISOString() };
    const next = existing ? user.map(b => b.id === id ? merged : b) : [...user, merged];
    persistBackends(next);
    return merged;
  }, [persistBackends]);

  const removeBackend = useCallback((id) => {
    const user = readJson(BACKENDS_KEY, []);
    persistBackends(user.filter(b => b.id !== id));
  }, [persistBackends]);

  /* ── References ── */

  const addReference = useCallback((draft) => {
    const user = readJson(REFS_KEY, []);
    const del  = readJson(REFS_TOMB, []);
    const id = draft.id || makeId('ref');
    const ref = {
      version: 1,
      versions: [{ version: 1, createdAt: new Date().toISOString(), by: 'you@agentvault.io' }],
      rotation: { policy: 'manual', lastRotatedAt: new Date().toISOString(), nextRotationAt: null, autoRotate: false },
      usedBy: [],
      ...draft,
      id,
      status: draft.status || 'active',
      createdAt: draft.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      origin: 'user',
    };
    persistRefs([...user, ref], del);
    return ref;
  }, [persistRefs]);

  const updateReference = useCallback((id, patch) => {
    const user = readJson(REFS_KEY, []);
    const del  = readJson(REFS_TOMB, []);
    const seed = SEED_REFS().find(r => r.id === id);
    const existing = user.find(r => r.id === id);
    const base = existing || seed;
    if (!base) return null;
    const merged = { ...base, ...patch, id, updatedAt: new Date().toISOString() };
    const next = existing ? user.map(r => r.id === id ? merged : r) : [...user, merged];
    persistRefs(next, del);
    return merged;
  }, [persistRefs]);

  const removeReference = useCallback((id) => {
    const user = readJson(REFS_KEY, []);
    const del  = readJson(REFS_TOMB, []);
    const isSeed = SEED_REFS().some(s => s.id === id);
    const nextUser = user.filter(r => r.id !== id);
    const nextDel  = isSeed && !del.includes(id) ? [...del, id] : del;
    persistRefs(nextUser, nextDel);
  }, [persistRefs]);

  /* Rotate — bumps version + lastRotatedAt + (optionally) computes nextRotationAt
     from the rotation policy. Does NOT touch any actual external secret store
     (the demo doesn't have one). Real implementation would call the backend SDK
     and persist the new version id returned from there. */
  const rotateReference = useCallback((id) => {
    const r = (readJson(REFS_KEY, []).find(x => x.id === id))
           || SEED_REFS().find(x => x.id === id);
    if (!r) return null;
    const nextVersion = (r.version || 1) + 1;
    const now = new Date();
    const policy = r.rotation?.policy || 'manual';
    const days =
        policy === 'every-30-days'  ? 30
      : policy === 'every-90-days'  ? 90
      : policy === 'every-180-days' ? 180
      : policy === 'every-365-days' ? 365
      : null;
    const nextAt = days
      ? new Date(now.getTime() + days * 86400000).toISOString()
      : null;
    return updateReference(id, {
      version: nextVersion,
      versions: [{ version: nextVersion, createdAt: now.toISOString(), by: 'you@agentvault.io' }, ...(r.versions || [])],
      rotation: { ...(r.rotation || {}), lastRotatedAt: now.toISOString(), nextRotationAt: nextAt },
      status: 'active',
    });
  }, [updateReference]);

  return {
    backends, refs, hydrated,
    addBackend, updateBackend, removeBackend,
    addReference, updateReference, removeReference, rotateReference,
  };
}

/* ─────────────────────── Read-only helpers ─────────────────────── */

export function readBackends() {
  return resolveBackends(readJson(BACKENDS_KEY, []));
}

export function readReferences() {
  return resolveRefs(readJson(REFS_KEY, []), readJson(REFS_TOMB, []));
}

export function readReferenceByPath(path) {
  return readReferences().find(r => r.path === path) || null;
}

export function readReferenceById(id) {
  return readReferences().find(r => r.id === id) || null;
}

/* Compute "expiring soon" status: any reference whose nextRotationAt is within
   N days (default 7). Used by the list page to color rows. */
export function isExpiringSoon(ref, days = 7) {
  const at = ref.rotation?.nextRotationAt;
  if (!at) return false;
  const ms = new Date(at).getTime() - Date.now();
  return ms > 0 && ms < days * 86400000;
}
