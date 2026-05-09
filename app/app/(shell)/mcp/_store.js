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
    makeDefaultServer({
      id: 'mcp_databases_prod',
      name: 'Databases · Prod',
      description: 'Universal databases MCP. Connects Postgres + Snowflake + MySQL with read-only by default and DDL gated behind approval. Used by data + finance ops agents.',
      vendorId: 'databases',
      owner: 'data-platform@agentvault.io',
      team: 'Data Platform',
      transport: 'streamable-http',
      endpoint: 'https://mcp.agentvault.io/databases',
      auth: {
        kind: 'mtls',
        certRef: 'vault://mcp/mcp_databases_prod/client.crt',
        keyRef:  'vault://mcp/mcp_databases_prod/client.key',
      },
      extraHeaders: [
        { name: 'X-Tenant-ID', valueRef: 'vault://mcp/mcp_databases_prod/tenant-id' },
      ],
      allowedIps: ['10.0.0.0/8'],
      status: 'connected',
      lastCheckedAt: anHr,
      lastUsedAt: anHr,
      p50: 145, p95: 420, errorRate7d: 0.006, toolCalls30d: 12_840,
      visibility: 'org',
      approvalPolicy: 'per-tool',
      tools: [
        // Connection & catalog
        { name: 'db.connections.list',   description: 'List configured database connections.',                                          riskLevel: 'low',  approval: false, enabled: true,  p50: 40,  errorRate: 0,      callsMTD: 218,   lastUsedAt: anHr },
        { name: 'db.connection.test',    description: 'Test reachability + auth for a connection.',                                     riskLevel: 'low',  approval: false, enabled: true,  p50: 110, errorRate: 0.002, callsMTD: 142,   lastUsedAt: aDay },
        // Schema introspection
        { name: 'db.databases.list',     description: 'List databases in a connection.',                                                riskLevel: 'low',  approval: false, enabled: true,  p50: 60,  errorRate: 0.001, callsMTD: 482,   lastUsedAt: anHr },
        { name: 'db.schemas.list',       description: 'List schemas in a database.',                                                     riskLevel: 'low',  approval: false, enabled: true,  p50: 70,  errorRate: 0,      callsMTD: 612,   lastUsedAt: anHr },
        { name: 'db.tables.list',        description: 'List tables/views in a schema.',                                                   riskLevel: 'low',  approval: false, enabled: true,  p50: 90,  errorRate: 0.002, callsMTD: 980,   lastUsedAt: anHr },
        { name: 'db.table.describe',     description: 'Describe a table: columns + types + PK/FK + comments + size.',                    riskLevel: 'low',  approval: false, enabled: true,  p50: 105, errorRate: 0.001, callsMTD: 1_840, lastUsedAt: anHr },
        { name: 'db.table.sample',       description: 'Return a small (LIMIT 100) random sample of rows.',                                riskLevel: 'low',  approval: false, enabled: true,  p50: 240, errorRate: 0.004, callsMTD: 612,   lastUsedAt: anHr },
        { name: 'db.indexes.list',       description: 'List indexes on a table with usage stats.',                                        riskLevel: 'low',  approval: false, enabled: true,  p50: 95,  errorRate: 0.001, callsMTD: 184,   lastUsedAt: aDay },
        { name: 'db.foreign_keys.list',  description: 'List foreign-key relationships across a schema.',                                   riskLevel: 'low',  approval: false, enabled: true,  p50: 110, errorRate: 0,      callsMTD: 220,   lastUsedAt: aDay },
        // Query & analysis
        { name: 'db.sql.query',          description: 'Run a parameterized SELECT. Read-only role enforced; results capped.',              riskLevel: 'low',  approval: false, enabled: true,  p50: 320, errorRate: 0.005, callsMTD: 4_120, lastUsedAt: anHr },
        { name: 'db.sql.explain',        description: 'EXPLAIN [ANALYZE] a query and return the plan.',                                    riskLevel: 'low',  approval: false, enabled: true,  p50: 180, errorRate: 0.002, callsMTD: 412,   lastUsedAt: anHr },
        { name: 'db.stats.summarize',    description: 'Return numeric/percentile/cardinality stats for selected columns.',                 riskLevel: 'low',  approval: false, enabled: true,  p50: 380, errorRate: 0.003, callsMTD: 1_240, lastUsedAt: anHr },
        { name: 'db.lineage.fetch',      description: 'Fetch upstream/downstream lineage for a table.',                                    riskLevel: 'low',  approval: false, enabled: true,  p50: 220, errorRate: 0.002, callsMTD: 184,   lastUsedAt: aDay },
        // Writes
        { name: 'db.sql.dml',            description: 'Execute INSERT / UPDATE / DELETE inside an explicit transaction. Dry-run first.',  riskLevel: 'med',  approval: true,  enabled: true,  p50: 410, errorRate: 0.012, callsMTD: 142,   lastUsedAt: aDay },
        { name: 'db.txn.begin',          description: 'Begin a named transaction.',                                                         riskLevel: 'med',  approval: false, enabled: true,  p50: 80,  errorRate: 0.001, callsMTD: 142,   lastUsedAt: aDay },
        { name: 'db.txn.commit',         description: 'Commit a named transaction.',                                                        riskLevel: 'med',  approval: false, enabled: true,  p50: 90,  errorRate: 0.002, callsMTD: 132,   lastUsedAt: aDay },
        { name: 'db.txn.rollback',       description: 'Roll back a named transaction.',                                                     riskLevel: 'low',  approval: false, enabled: true,  p50: 70,  errorRate: 0,      callsMTD: 10,    lastUsedAt: aDay },
        { name: 'db.bulk.upsert',        description: 'Bulk upsert rows from a staged file. Generates a diff summary first.',              riskLevel: 'med',  approval: true,  enabled: true,  p50: 1_240, errorRate: 0.018, callsMTD: 22,    lastUsedAt: aDay },
        // DDL & admin (high — gated)
        { name: 'db.sql.ddl',            description: 'Execute DDL (CREATE / ALTER / DROP). Always dry-runs first; requires approval.',    riskLevel: 'high', approval: true,  enabled: false, p50: 0,    errorRate: 0,     callsMTD: 0,     lastUsedAt: null },
        { name: 'db.role.grant',         description: 'Grant a role / privilege to a user. Requires approval.',                            riskLevel: 'high', approval: true,  enabled: false, p50: 0,    errorRate: 0,     callsMTD: 0,     lastUsedAt: null },
        { name: 'db.role.revoke',        description: 'Revoke a role / privilege from a user. Requires approval.',                          riskLevel: 'high', approval: true,  enabled: false, p50: 0,    errorRate: 0,     callsMTD: 0,     lastUsedAt: null },
        { name: 'db.snapshot.create',    description: 'Create a point-in-time snapshot before a destructive operation.',                    riskLevel: 'med',  approval: true,  enabled: true,  p50: 4_200, errorRate: 0.014, callsMTD: 8,     lastUsedAt: aDay },
        { name: 'db.replica.failover',   description: 'Promote a replica. Requires approval; emits incident event.',                        riskLevel: 'high', approval: true,  enabled: false, p50: 0,    errorRate: 0,     callsMTD: 0,     lastUsedAt: null },
        // Operational
        { name: 'db.queries.list_running', description: 'List currently-running queries.',                                                  riskLevel: 'low',  approval: false, enabled: true,  p50: 70,  errorRate: 0.001, callsMTD: 32,    lastUsedAt: aDay },
        { name: 'db.queries.cancel',     description: 'Cancel a running query by id. Requires approval.',                                  riskLevel: 'high', approval: true,  enabled: true,  p50: 80,  errorRate: 0.012, callsMTD: 4,     lastUsedAt: aDay },
        { name: 'db.locks.list',         description: 'List blocking locks across active sessions.',                                        riskLevel: 'low',  approval: false, enabled: true,  p50: 90,  errorRate: 0,      callsMTD: 18,    lastUsedAt: aDay },
      ],
      resources: [
        { uri: 'db://prod-postgres',                           description: 'Primary OLTP cluster — Postgres 16, mtls.' },
        { uri: 'db://prod-postgres/app',                       description: 'App database (orders, vendors, payments).' },
        { uri: 'db://prod-postgres/app/public/fct_invoices',   description: 'Invoice fact table.' },
        { uri: 'db://prod-snowflake',                          description: 'Analytics warehouse — Snowflake, OAuth federated.' },
        { uri: 'db://prod-snowflake/analytics',                description: 'Analytics database (dbt-managed).' },
        { uri: 'db://lineage/fct_invoices',                    description: 'Lineage graph for the invoice fact table.' },
      ],
      attachedAgents: ['agt_data_analyst', 'agt_invoiceq'],
    }),
    makeDefaultServer({
      id: 'mcp_slack_workspace',
      name: 'Slack · agentvault.slack.com',
      description: 'Workspace Slack MCP. OAuth-federated; agents post + read in approved channels only.',
      vendorId: 'slack',
      owner: 'comms-platform@agentvault.io',
      team: 'Comms Platform',
      transport: 'streamable-http',
      endpoint: 'https://slack.com/mcp',
      auth: {
        kind: 'oauth',
        clientId: 'av-slack-prod',
        tokenUrl: 'https://slack.com/api/oauth.v2.access',
        scopes: ['channels:read', 'chat:write', 'chat:write.public', 'reactions:write', 'search:read'],
        accountId: 'agentvault.slack.com',
      },
      status: 'connected',
      lastCheckedAt: anHr,
      lastUsedAt: anHr,
      p50: 180, p95: 420, errorRate7d: 0.005, toolCalls30d: 5_240,
      visibility: 'org',
      approvalPolicy: 'per-tool',
      tools: [
        { name: 'slack.channels.list',     description: 'List channels in the workspace.',                          riskLevel: 'low',  approval: false, enabled: true,  p50: 110, errorRate: 0.001, callsMTD: 320,   lastUsedAt: anHr },
        { name: 'slack.messages.search',   description: 'Search messages across channels you can see.',             riskLevel: 'low',  approval: false, enabled: true,  p50: 240, errorRate: 0.003, callsMTD: 1_840, lastUsedAt: anHr },
        { name: 'slack.message.post',      description: 'Post a message to a channel.',                              riskLevel: 'med',  approval: false, enabled: true,  p50: 220, errorRate: 0.004, callsMTD: 2_120, lastUsedAt: anHr },
        { name: 'slack.message.dm',        description: 'Send a direct message.',                                    riskLevel: 'med',  approval: true,  enabled: true,  p50: 240, errorRate: 0.006, callsMTD: 318,   lastUsedAt: aDay },
        { name: 'slack.thread.reply',      description: 'Reply in a thread.',                                         riskLevel: 'med',  approval: false, enabled: true,  p50: 210, errorRate: 0.003, callsMTD: 480,   lastUsedAt: anHr },
        { name: 'slack.reaction.add',      description: 'Add a reaction to a message.',                               riskLevel: 'low',  approval: false, enabled: true,  p50: 90,  errorRate: 0.001, callsMTD: 162,   lastUsedAt: aDay },
        { name: 'slack.user.lookup',       description: 'Look up a user by id or email.',                             riskLevel: 'low',  approval: false, enabled: true,  p50: 120, errorRate: 0.002, callsMTD: 200,   lastUsedAt: aDay },
      ],
      attachedAgents: ['agt_invoiceq', 'agt_kycverify'],
    }),
    makeDefaultServer({
      id: 'mcp_cloudflare_devops',
      name: 'Cloudflare · DevOps',
      description: 'Workers, KV, R2, and DNS management for the AgentVault edge. Free dev plan; OAuth-federated to a service account.',
      vendorId: 'cloudflare',
      owner: 'devx@agentvault.io',
      team: 'Developer Experience',
      transport: 'streamable-http',
      endpoint: 'https://api.cloudflare.com/mcp',
      auth: {
        kind: 'oauth',
        clientId: 'av-cf-devx',
        tokenUrl: 'https://dash.cloudflare.com/oauth2/token',
        scopes: ['account:read', 'workers:write', 'kv:write', 'r2:write', 'dns:read'],
        accountId: 'agentvault-edge (Cloudflare)',
      },
      status: 'connected',
      lastCheckedAt: anHr,
      lastUsedAt: aDay,
      p50: 165, p95: 380, errorRate7d: 0.008, toolCalls30d: 1_240,
      visibility: 'team',
      approvalPolicy: 'per-tool',
      tools: [
        { name: 'cf.workers.deploy',     description: 'Deploy a Worker script.',                                     riskLevel: 'high', approval: true,  enabled: true,  p50: 1_840, errorRate: 0.018, callsMTD: 24,    lastUsedAt: aDay },
        { name: 'cf.workers.tail',       description: 'Stream live logs from a Worker.',                              riskLevel: 'low',  approval: false, enabled: true,  p50: 90,    errorRate: 0,     callsMTD: 84,    lastUsedAt: aDay },
        { name: 'cf.kv.get',             description: 'Read a key from a KV namespace.',                              riskLevel: 'low',  approval: false, enabled: true,  p50: 60,    errorRate: 0.001, callsMTD: 480,   lastUsedAt: anHr },
        { name: 'cf.kv.put',             description: 'Write a key into a KV namespace.',                             riskLevel: 'med',  approval: false, enabled: true,  p50: 110,   errorRate: 0.004, callsMTD: 142,   lastUsedAt: aDay },
        { name: 'cf.r2.list',            description: 'List objects in an R2 bucket.',                                riskLevel: 'low',  approval: false, enabled: true,  p50: 150,   errorRate: 0.002, callsMTD: 220,   lastUsedAt: aDay },
        { name: 'cf.r2.get',             description: 'Fetch an object from an R2 bucket.',                           riskLevel: 'low',  approval: false, enabled: true,  p50: 320,   errorRate: 0.005, callsMTD: 184,   lastUsedAt: aDay },
        { name: 'cf.r2.put',             description: 'Upload an object to an R2 bucket.',                            riskLevel: 'med',  approval: true,  enabled: true,  p50: 510,   errorRate: 0.009, callsMTD: 60,    lastUsedAt: aDay },
        { name: 'cf.pages.deployment.create', description: 'Trigger a Cloudflare Pages deployment.',                  riskLevel: 'high', approval: true,  enabled: false, p50: 0,     errorRate: 0,     callsMTD: 0,     lastUsedAt: null },
        { name: 'cf.dns.records.list',   description: 'List DNS records on a zone.',                                  riskLevel: 'low',  approval: false, enabled: true,  p50: 95,    errorRate: 0.001, callsMTD: 46,    lastUsedAt: aDay },
        { name: 'cf.dns.records.update', description: 'Update a DNS record. Requires approval.',                      riskLevel: 'high', approval: true,  enabled: false, p50: 0,     errorRate: 0,     callsMTD: 0,     lastUsedAt: null },
      ],
      attachedAgents: ['agt_redliner'],
    }),
    makeDefaultServer({
      id: 'mcp_datadog_obs',
      name: 'Datadog · Observability',
      description: 'Metrics + logs + monitors + APM for production. Free trial active; consolidated to small-host plan after.',
      vendorId: 'datadog',
      owner: 'sre@agentvault.io',
      team: 'SRE',
      transport: 'streamable-http',
      endpoint: 'https://api.datadoghq.com/mcp',
      auth: {
        kind: 'header',
        headerName: 'DD-API-KEY',
        secretRef: 'vault://mcp/mcp_datadog_obs/api-key',
      },
      extraHeaders: [
        { name: 'DD-APPLICATION-KEY', valueRef: 'vault://mcp/mcp_datadog_obs/app-key' },
      ],
      status: 'connected',
      lastCheckedAt: anHr,
      lastUsedAt: anHr,
      p50: 220, p95: 540, errorRate7d: 0.011, toolCalls30d: 2_840,
      visibility: 'team',
      approvalPolicy: 'per-tool',
      tools: [
        { name: 'dd.metrics.query',    description: 'Run a metrics query.',                              riskLevel: 'low',  approval: false, enabled: true,  p50: 280, errorRate: 0.005, callsMTD: 1_120, lastUsedAt: anHr },
        { name: 'dd.logs.search',      description: 'Search logs with a filter expression.',              riskLevel: 'low',  approval: false, enabled: true,  p50: 410, errorRate: 0.012, callsMTD: 980,   lastUsedAt: anHr },
        { name: 'dd.monitors.list',    description: 'List monitors with current state.',                  riskLevel: 'low',  approval: false, enabled: true,  p50: 180, errorRate: 0.003, callsMTD: 220,   lastUsedAt: aDay },
        { name: 'dd.monitor.get',      description: 'Fetch a monitor with full definition.',              riskLevel: 'low',  approval: false, enabled: true,  p50: 160, errorRate: 0.002, callsMTD: 184,   lastUsedAt: aDay },
        { name: 'dd.monitor.mute',     description: 'Mute a monitor for a duration.',                     riskLevel: 'med',  approval: true,  enabled: true,  p50: 120, errorRate: 0.008, callsMTD: 18,    lastUsedAt: aDay },
        { name: 'dd.dashboard.get',    description: 'Fetch a dashboard definition.',                      riskLevel: 'low',  approval: false, enabled: true,  p50: 240, errorRate: 0.004, callsMTD: 142,   lastUsedAt: aDay },
        { name: 'dd.events.list',      description: 'List events in a time window.',                      riskLevel: 'low',  approval: false, enabled: true,  p50: 200, errorRate: 0.003, callsMTD: 142,   lastUsedAt: aDay },
        { name: 'dd.synthetics.run',   description: 'Trigger a synthetic test on demand.',                riskLevel: 'med',  approval: true,  enabled: false, p50: 0,   errorRate: 0,     callsMTD: 0,     lastUsedAt: null },
      ],
      attachedAgents: ['agt_data_analyst'],
    }),
  ];
}
