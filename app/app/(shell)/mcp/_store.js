'use client';

import { useCallback, useEffect, useState } from 'react';

const STORAGE_KEY = 'av-mcp-v1';

/* -----------------------------------------------------------
   Default MCP server shape.
   Secrets are never stored here — only vault references (strings
   like "vault://mcp/<serverId>/<slot>"). The ref is what the UI
   shows; the actual secret lives in the workspace auth vault.
----------------------------------------------------------- */
export function makeDefaultServer(overrides = {}) {
  const id = overrides.id || `mcp_${Math.random().toString(36).slice(2, 10)}`;
  const now = new Date().toISOString();
  const defaults = {
    id,
    name:        'Untitled MCP server',
    description: '',
    vendorId:    'custom',
    owner:       'you@agentvault.io',
    team:        'Default team',

    transport:   'streamable-http',
    endpoint:    '',

    auth: {
      kind:      'bearer',            // oauth | bearer | header | mtls | none
      // oauth
      clientId:  '',
      tokenUrl:  '',
      scopes:    [],
      accountId: null,                // picked connected account
      // bearer / header: secretRef string
      secretRef: null,
      headerName:'X-API-Key',
      // mtls
      certRef:   null,
      keyRef:    null,
    },
    extraHeaders: [],                 // [{ name, valueRef }]
    allowedIps:   [],

    // Discovery
    tools:     [],                    // [{ name, description, riskLevel, approval, enabled, schema, p50, errorRate, callsMTD, lastUsedAt }]
    resources: [],
    prompts:   [],

    // Access
    visibility:     'team',           // private | team | org
    acl:            { mode: 'inherit', allowGroups: [] },
    approvalPolicy: 'per-tool',       // per-tool | always | never

    // Governance
    versionPin:    'latest',

    // Health (mocked)
    status:        'disconnected',    // connected | disconnected | degraded | paused | failed
    lastCheckedAt: null,
    lastUsedAt:    null,
    p50:           0,
    p95:           0,
    errorRate7d:   0,
    toolCalls30d:  0,

    // Derived usage
    attachedAgents: [],               // agent ids that have at least one tool from this server

    createdAt: now,
    updatedAt: now,
  };
  return mergeServer(defaults, overrides);
}

const NESTED = ['auth', 'acl'];
function mergeServer(defaults, overrides) {
  const out = { ...defaults, ...overrides };
  for (const k of NESTED) {
    if (overrides?.[k] && typeof overrides[k] === 'object' && !Array.isArray(overrides[k])) {
      out[k] = { ...defaults[k], ...overrides[k] };
    }
  }
  return out;
}

/* ----------------------------- hooks ----------------------------- */
export function useServers() {
  const [servers, setServers]   = useState([]);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      const existing = raw ? JSON.parse(raw) : [];
      const healed = existing.map(s => makeDefaultServer(s));
      // Non-destructive merge: append any demo seeds not already present by id.
      // Preserves the user's edits to existing records.
      const demos = DEMO();
      const missing = demos.filter(d => !healed.some(h => h.id === d.id));
      const merged = [...healed, ...missing];
      setServers(merged);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(merged));
    } catch {}
    setHydrated(true);
  }, []);

  const persist = useCallback((next) => {
    setServers(next);
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(next)); } catch {}
  }, []);

  const createServer = useCallback((overrides) => {
    const s = makeDefaultServer(overrides);
    persist([s, ...servers]);
    return s;
  }, [servers, persist]);

  const updateServer = useCallback((id, patch) => {
    const next = servers.map(s => s.id === id ? { ...s, ...patch, updatedAt: new Date().toISOString() } : s);
    persist(next);
  }, [servers, persist]);

  const deleteServer = useCallback((id) => persist(servers.filter(s => s.id !== id)), [servers, persist]);

  return { servers, hydrated, createServer, updateServer, deleteServer };
}

export function useServer(id) {
  const { servers, hydrated, updateServer } = useServers();
  const server = servers.find(s => s.id === id) || null;

  const patch = useCallback((path, value) => {
    if (!server) return;
    if (typeof path === 'function') { updateServer(id, path(server)); return; }
    const segs = path.split('.');
    const next = structuredClone(server);
    let cur = next;
    for (let i = 0; i < segs.length - 1; i++) {
      cur[segs[i]] ??= {};
      cur = cur[segs[i]];
    }
    cur[segs[segs.length - 1]] = value;
    const { id: _id, ...rest } = next;
    updateServer(id, rest);
  }, [server, id, updateServer]);

  return { server, hydrated, patch };
}

/* ----------------------------- demo seed ----------------------------- */
function DEMO() {
  const anHr = new Date(Date.now() - 3600000).toISOString();
  const aDay = new Date(Date.now() - 86400000).toISOString();
  return [
    makeDefaultServer({
      id: 'mcp_atlassian_prod',
      name: 'Atlassian · Production',
      description: 'Org-wide Atlassian MCP gateway. Used by the invoice-processor and support agents.',
      vendorId: 'atlassian',
      owner: 'platform@agentvault.io',
      team: 'Platform',
      transport: 'streamable-http',
      endpoint: 'https://mcp.atlassian.com',
      auth: {
        kind: 'oauth',
        clientId: 'av-atlassian-prod',
        tokenUrl: 'https://auth.atlassian.com/oauth/token',
        scopes: ['read:jira-work', 'write:jira-work', 'read:confluence-content'],
        accountId: 'workspace@agentvault.atlassian.net',
      },
      status: 'connected',
      lastCheckedAt: anHr,
      lastUsedAt: anHr,
      p50: 120,
      p95: 320,
      errorRate7d: 0.004,
      toolCalls30d: 14_823,
      approvalPolicy: 'per-tool',
      visibility: 'org',
      tools: [
        { name: 'jira.search',           description: 'Search Jira issues by JQL.',       riskLevel: 'low',  approval: false, enabled: true,  p50: 92,  errorRate: 0.001, callsMTD: 8_200, lastUsedAt: anHr },
        { name: 'jira.create_issue',     description: 'Create a new Jira issue.',          riskLevel: 'high', approval: true,  enabled: true,  p50: 260, errorRate: 0.009, callsMTD: 1_410, lastUsedAt: aDay },
        { name: 'jira.add_comment',      description: 'Add a comment to an issue.',        riskLevel: 'med',  approval: false, enabled: true,  p50: 170, errorRate: 0.003, callsMTD: 2_940, lastUsedAt: anHr },
        { name: 'jira.transition',       description: 'Transition an issue status.',       riskLevel: 'high', approval: true,  enabled: false, p50: 220, errorRate: 0.01,  callsMTD: 380,   lastUsedAt: aDay },
        { name: 'confluence.page.get',   description: 'Fetch a Confluence page.',          riskLevel: 'low',  approval: false, enabled: true,  p50: 140, errorRate: 0.002, callsMTD: 1_612, lastUsedAt: anHr },
        { name: 'confluence.page.search',description: 'Search pages across spaces.',       riskLevel: 'low',  approval: false, enabled: true,  p50: 190, errorRate: 0.002, callsMTD: 281,   lastUsedAt: aDay },
      ],
      attachedAgents: ['agt_invoiceq'],
    }),
    makeDefaultServer({
      id: 'mcp_github_eng',
      name: 'GitHub · Engineering',
      description: 'Scoped to the engineering org. Read-mostly with PR-review tool allowed on approval.',
      vendorId: 'github',
      owner: 'devx@agentvault.io',
      team: 'Developer Experience',
      transport: 'streamable-http',
      endpoint: 'https://api.githubcopilot.com/mcp',
      auth: {
        kind: 'oauth',
        clientId: 'av-gh-eng',
        tokenUrl: 'https://github.com/login/oauth/access_token',
        scopes: ['repo', 'issues:read', 'pull_requests:write'],
        accountId: 'agentvault-eng (github.com)',
      },
      status: 'connected',
      lastCheckedAt: anHr,
      lastUsedAt: aDay,
      p50: 145, p95: 480, errorRate7d: 0.012, toolCalls30d: 3_204,
      visibility: 'team',
      approvalPolicy: 'per-tool',
      tools: [
        { name: 'repo.search',       description: 'Search repositories and code.',       riskLevel: 'low',  approval: false, enabled: true,  p50: 120, errorRate: 0.004, callsMTD: 1_880, lastUsedAt: anHr },
        { name: 'issue.get',         description: 'Fetch an issue by number.',            riskLevel: 'low',  approval: false, enabled: true,  p50: 90,  errorRate: 0.003, callsMTD: 742,   lastUsedAt: aDay },
        { name: 'issue.comment',     description: 'Post a comment on an issue.',          riskLevel: 'med',  approval: false, enabled: true,  p50: 210, errorRate: 0.008, callsMTD: 405,   lastUsedAt: aDay },
        { name: 'pr.review',         description: 'Submit a PR review.',                   riskLevel: 'high', approval: true,  enabled: true,  p50: 340, errorRate: 0.02,  callsMTD: 162,   lastUsedAt: aDay },
        { name: 'workflow.dispatch', description: 'Trigger a GitHub Actions workflow.',    riskLevel: 'high', approval: true,  enabled: false, p50: 0,   errorRate: 0,     callsMTD: 0,     lastUsedAt: null },
      ],
      attachedAgents: [],
    }),
    makeDefaultServer({
      id: 'mcp_stripe_sandbox',
      name: 'Stripe · Sandbox',
      description: 'Sandbox-only, for the billing-ops agent. Refund tool hard-requires approval.',
      vendorId: 'stripe',
      owner: 'billing-ai@agentvault.io',
      team: 'Billing AI',
      transport: 'streamable-http',
      endpoint: 'https://mcp.stripe.com/v1',
      auth: {
        kind: 'bearer',
        secretRef: 'vault://mcp/mcp_stripe_sandbox/token',
      },
      status: 'degraded',
      lastCheckedAt: anHr,
      lastUsedAt: aDay,
      p50: 380, p95: 1800, errorRate7d: 0.072, toolCalls30d: 412,
      visibility: 'team',
      approvalPolicy: 'always',
      tools: [
        { name: 'customer.search',     description: 'Search customers by email / ID.', riskLevel: 'low',  approval: true,  enabled: true, p50: 180, errorRate: 0.02,  callsMTD: 320, lastUsedAt: aDay },
        { name: 'charge.refund',       description: 'Issue a refund.',                  riskLevel: 'high', approval: true,  enabled: true, p50: 820, errorRate: 0.15,  callsMTD: 62,  lastUsedAt: aDay },
        { name: 'subscription.cancel', description: 'Cancel a subscription.',            riskLevel: 'high', approval: true,  enabled: false, p50: 0,  errorRate: 0,     callsMTD: 0,  lastUsedAt: null },
      ],
      attachedAgents: [],
    }),
    makeDefaultServer({
      id: 'mcp_analytics_warehouse',
      name: 'Analytics Warehouse · Postgres',
      description: 'Read-only analytics warehouse. Exposes schema browsing, query execution, and plan inspection — no writes.',
      vendorId: 'custom',
      owner: 'data-platform@agentvault.io',
      team: 'Data Platform',
      transport: 'streamable-http',
      endpoint: 'https://mcp.internal/warehouse',
      auth: {
        kind: 'mtls',
        certRef: 'vault://mcp/mcp_analytics_warehouse/client.crt',
        keyRef:  'vault://mcp/mcp_analytics_warehouse/client.key',
      },
      extraHeaders: [{ name: 'X-Tenant-ID', valueRef: 'vault://mcp/mcp_analytics_warehouse/tenant-id' }],
      allowedIps:   ['10.0.0.0/8'],
      status: 'connected',
      lastCheckedAt: anHr,
      lastUsedAt: anHr,
      p50: 210, p95: 640, errorRate7d: 0.003, toolCalls30d: 6_402,
      visibility: 'org',
      approvalPolicy: 'per-tool',
      tools: [
        { name: 'sql.schema',      description: 'List schemas, tables, and columns in a database.',       riskLevel: 'low',  approval: false, enabled: true,  p50: 60,  errorRate: 0.001, callsMTD: 1_840, lastUsedAt: anHr },
        { name: 'table.describe',  description: 'Describe a table: columns, types, row count, size.',     riskLevel: 'low',  approval: false, enabled: true,  p50: 95,  errorRate: 0.002, callsMTD: 1_128, lastUsedAt: anHr },
        { name: 'sql.query',       description: 'Run a SELECT query. Results capped at 10k rows.',        riskLevel: 'low',  approval: false, enabled: true,  p50: 280, errorRate: 0.004, callsMTD: 3_120, lastUsedAt: anHr },
        { name: 'query.plan',      description: 'EXPLAIN a query and return the plan.',                    riskLevel: 'low',  approval: false, enabled: true,  p50: 110, errorRate: 0.001, callsMTD: 214,   lastUsedAt: aDay },
        { name: 'sql.write',       description: 'Run INSERT / UPDATE / DELETE. Disabled by default.',     riskLevel: 'high', approval: true,  enabled: false, p50: 0,   errorRate: 0,     callsMTD: 0,     lastUsedAt: null },
      ],
      attachedAgents: ['agt_data_analyst'],
    }),
  ];
}
