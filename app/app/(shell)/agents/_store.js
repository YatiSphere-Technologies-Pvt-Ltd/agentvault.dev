'use client';

import { useCallback, useEffect, useState } from 'react';

const STORAGE_KEY = 'av-agents-v3';

/* -----------------------------------------------------------
   Default shape — every agent has this scaffolding so every
   tab can render without null-checks. Missing sub-trees get
   merged in on read.
----------------------------------------------------------- */
/* Deep-merge for the known nested sub-trees so partial overrides
   (e.g. demo seeds supplying only a few observability fields) don't
   blow away the rest of the defaults. */
const NESTED_KEYS = [
  'model', 'knowledge', 'tools', 'orchestration', 'memory',
  'triggers', 'guardrails', 'humanLoop', 'evals', 'observability',
  'deploy', 'version',
];

function mergeAgent(defaults, overrides) {
  const out = { ...defaults, ...overrides };
  for (const k of NESTED_KEYS) {
    if (overrides?.[k] && typeof overrides[k] === 'object' && !Array.isArray(overrides[k])) {
      out[k] = { ...defaults[k], ...overrides[k] };
    }
  }
  return out;
}

export function makeDefaultAgent(overrides = {}) {
  const id = overrides.id || `agt_${Math.random().toString(36).slice(2, 10)}`;
  const now = new Date().toISOString();
  const defaults = {
    id,
    // 1 — Identity
    name: 'Untitled agent',
    description: '',
    icon: 'sparkles',
    category: 'Assistant',
    tags: [],
    owner: 'you@agentvault.io',
    team: 'Default team',
    visibility: 'team',        // private | team | org | public
    environment: 'dev',        // dev | staging | prod
    mode: 'simple',            // simple | advanced | admin — controls which detail tabs are visible
    version: { current: '0.1.0', status: 'draft', changelog: [{ at: now, who: 'you@agentvault.io', msg: 'Created' }] },
    createdAt: now,
    updatedAt: now,

    // 2 — Brain
    model: {
      primary: 'claude-3-5-sonnet',
      fallback: 'gpt-4o-mini',
      temperature: 0.2,
      topP: 1.0,
      maxTokens: 4096,
      stop: [],
      reasoningEffort: 'medium',
      systemPrompt: 'You are a helpful assistant for {{user.name}} at {{org.name}}. Today is {{date}}.',
      structuredOutput: { enabled: false, schema: '{\n  "type": "object",\n  "properties": {\n    "answer": { "type": "string" }\n  }\n}' },
    },

    // 3 — Knowledge
    //    Workspace-level sources live in /app/knowledge. The agent just picks
    //    which of those to retrieve from, plus per-agent retrieval knobs.
    knowledge: {
      attachedSourceIds: [],                      // ids from /app/knowledge
      retrieval: { topK: 8, threshold: 0.25, reranker: true, hybrid: true },
    },

    // 4 — Tools
    tools: {
      attached: [],            // ids from catalog or custom tool objects
      rateLimit: { perMinute: 60, timeoutMs: 30000, retries: 2 },
    },

    // 5 — Orchestration
    orchestration: {
      pattern: 'solo',         // solo | supervisor | sequential | router | parallel
      subAgents: [],           // { id, label, role, memory: 'shared' | 'isolated' }
      handoffs: [],            // { from, to, condition, passback }
      loopLimit: 5,
      maxDepth: 3,
    },

    // 6 — Memory
    memory: {
      session: { windowTurns: 12, summarize: true, strategy: 'rolling' },
      longTerm: { scope: 'per-user', enabled: true, writePolicy: 'auto' },
      ttlDays: 180,
      items: [               // demo memory inspector
        { id: 'm1', key: 'preferred-tone', value: 'concise, no emoji', scope: 'per-user', writtenAt: new Date(Date.now() - 86400000).toISOString() },
        { id: 'm2', key: 'default-region', value: 'ap-south-1', scope: 'per-user', writtenAt: new Date(Date.now() - 3 * 86400000).toISOString() },
      ],
    },

    // 7 — Triggers & channels
    triggers: {
      chat:    { enabled: true,  slug: id.replace(/^agt_/, 'chat-') },
      api:     { enabled: true,  key: `av_live_${id.replace(/^agt_/, '')}_••••` },
      webhook: { enabled: false, inboundUrl: '' },
      cron:    { enabled: false, schedule: '0 9 * * 1-5' },
      events:  { enabled: false, source: 'none' },
      channels: [
        // { id: 'slack', label: 'Slack', connected: false, overrides: { systemPromptSuffix: 'Keep Slack answers under 3 sentences.' } },
      ],
    },

    // 9 — Guardrails
    guardrails: {
      input:  { pii: true,  promptInjection: true, topics: [], profanity: false },
      output: { hallucination: true, grounding: true, toxicity: true, piiRedaction: true },
      jailbreakDefense: 'balanced',   // off | balanced | strict
      rules: [
        // { id, when, action, target }
      ],
      refusalMessage: 'I can help with that in a way that follows our policies. Would you like to rephrase?',
    },

    // 10 — Human-in-the-loop
    humanLoop: {
      approvals: [],          // per-tool approval wired in Tools tab
      reviewQueue: { assignees: ['ops-ai-reviewers'], lowConfidenceRoute: true },
      feedback: { thumbs: true, freeform: true },
    },

    // 11 — Evals
    evals: {
      suites: [
        { id: 's1', name: 'Smoke', cases: 12, lastScore: 0.92, lastRunAt: new Date(Date.now() - 2 * 3600000).toISOString() },
        { id: 's2', name: 'Golden prompts', cases: 48, lastScore: 0.87, lastRunAt: new Date(Date.now() - 24 * 3600000).toISOString() },
      ],
      judges: [
        { id: 'j1', kind: 'llm-as-judge', model: 'claude-3-5-sonnet', criteria: 'grounded, concise, accurate' },
        { id: 'j2', kind: 'rule',         rule: 'output length <= 400 tokens' },
      ],
      regressions: { onVersionChange: true },
      ab: { active: false, challengerVersion: null, split: 0.1 },
    },

    // 12 — Observability (summary; deep traces live in /app/runs)
    observability: {
      tokensMTD: 1_240_000,
      costMTD: 38.4,
      p50MS: 820,
      p95MS: 2150,
      errorRate: 0.018,
      exports: { otel: false, datadog: false, splunk: false },
    },

    // 13 — Deploy
    deploy: {
      environments: {
        dev:     { version: '0.1.0', deployedAt: now, pinned: false },
        staging: { version: '0.1.0', deployedAt: now, pinned: false },
        prod:    { version: null,    deployedAt: null, pinned: true  },
      },
      versions: [
        { version: '0.1.0', createdAt: now, by: 'you@agentvault.io', note: 'Initial draft' },
      ],
      canary: { enabled: false, percent: 10 },
    },
  };

  return mergeAgent(defaults, overrides);
}

/* -----------------------------------------------------------
   Hook: read + mutate the agent collection
----------------------------------------------------------- */
export function useAgents() {
  const [agents, setAgents] = useState([]);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      const existing = raw ? JSON.parse(raw) : [];
      // Heal shape drift on read: pass persisted agents through the merger
      // so any new nested defaults added since last write get filled in.
      const healed = existing.map(a => makeDefaultAgent(a));
      // Non-destructive merge: append any demo agents not already present by id.
      // Preserves the user's edits while introducing new seeded examples.
      const demos = DEMO_AGENTS();
      const missing = demos.filter(d => !healed.some(h => h.id === d.id));
      const merged = [...healed, ...missing];
      setAgents(merged);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(merged));
    } catch {}
    setHydrated(true);
  }, []);

  const persist = useCallback((next) => {
    setAgents(next);
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(next)); } catch {}
  }, []);

  const createAgent = useCallback((overrides) => {
    const agent = makeDefaultAgent(overrides);
    persist([agent, ...agents]);
    return agent;
  }, [agents, persist]);

  const updateAgent = useCallback((id, patch) => {
    const merged = agents.map(a => a.id === id
      ? { ...a, ...patch, updatedAt: new Date().toISOString() }
      : a);
    persist(merged);
  }, [agents, persist]);

  const deleteAgent = useCallback((id) => {
    persist(agents.filter(a => a.id !== id));
  }, [agents, persist]);

  return { agents, hydrated, createAgent, updateAgent, deleteAgent };
}

/* Hook: a single agent by id (with patch helper). */
export function useAgent(id) {
  const { agents, hydrated, updateAgent } = useAgents();
  const agent = agents.find(a => a.id === id) || null;

  const patch = useCallback((path, value) => {
    if (!agent) return;
    // path can be "model.temperature" or a function (current) => nextPartial
    if (typeof path === 'function') {
      const next = path(agent);
      updateAgent(id, next);
      return;
    }
    const segs = path.split('.');
    const next = structuredClone(agent);
    let cur = next;
    for (let i = 0; i < segs.length - 1; i++) {
      cur[segs[i]] ??= {};
      cur = cur[segs[i]];
    }
    cur[segs[segs.length - 1]] = value;
    // Strip keys next/prev that `updateAgent` doesn't care about
    const { id: _id, ...rest } = next;
    updateAgent(id, rest);
  }, [agent, id, updateAgent]);

  return { agent, hydrated, patch };
}

/* -----------------------------------------------------------
   Demo seed — shown on first load; overwritten on any mutation
----------------------------------------------------------- */
function DEMO_AGENTS() {
  const now = new Date().toISOString();
  return [
    makeDefaultAgent({
      id: 'agt_invoiceq',
      name: 'Invoice triage',
      description: 'Classifies inbound vendor invoices and routes to the right approver.',
      category: 'Finance ops',
      owner: 'finance-ai@agentvault.io',
      team: 'Finance AI',
      visibility: 'team',
      environment: 'prod',
      icon: 'braces',
      tags: ['invoices', 'ap', 'netsuite'],
      version: { current: '1.4.2', status: 'published', changelog: [
        { at: now, who: 'meera@agentvault.io', msg: 'Tuned fallback model' },
        { at: now, who: 'meera@agentvault.io', msg: 'Added NetSuite post-tool' },
      ]},
      createdAt: new Date(Date.now() - 48 * 24 * 3600000).toISOString(),
      observability: { tokensMTD: 3_902_000, costMTD: 148, p50MS: 920, p95MS: 2800, errorRate: 0.012 },
    }),
    makeDefaultAgent({
      id: 'agt_kycverify',
      name: 'KYC verification',
      description: 'Identity + sanctions + UBO check for corporate onboarding.',
      category: 'Compliance',
      owner: 'risk-eng@agentvault.io',
      team: 'Risk Eng',
      environment: 'prod',
      icon: 'shield',
      tags: ['kyc', 'aml', 'onboarding'],
      version: { current: '2.1.0', status: 'published', changelog: [] },
      observability: { tokensMTD: 2_311_000, costMTD: 86, p50MS: 1340, p95MS: 3800, errorRate: 0.005 },
    }),
    makeDefaultAgent({
      id: 'agt_redliner',
      name: 'Contract redliner',
      description: 'Agentic markup of MSAs against your playbook.',
      category: 'Legal ops',
      owner: 'legal-ops@agentvault.io',
      team: 'Legal ops',
      environment: 'staging',
      icon: 'docs',
      tags: ['legal', 'contracts'],
      version: { current: '0.3.0', status: 'draft', changelog: [] },
      observability: { tokensMTD: 72_000, costMTD: 18, p50MS: 3400, p95MS: 8200, errorRate: 0.07 },
    }),
    makeDefaultAgent({
      id: 'agt_data_analyst',
      name: 'Data Analyst',
      description: 'SQL-native analyst over the Analytics Warehouse. Explains its query plan, cites schema, refuses destructive writes without approval.',
      category: 'Data / Research',
      owner: 'data-platform@agentvault.io',
      team: 'Data Platform',
      visibility: 'org',
      environment: 'prod',
      icon: 'db',
      mode: 'advanced',
      tags: ['analytics', 'sql', 'warehouse', 'research'],
      version: {
        current: '1.2.0',
        status: 'published',
        changelog: [
          { at: now, who: 'data-platform@agentvault.io', msg: 'Hardened guardrails: refuse DROP/DELETE without approval' },
          { at: now, who: 'data-platform@agentvault.io', msg: 'Attached Analytics Warehouse MCP (read-only)' },
          { at: now, who: 'data-platform@agentvault.io', msg: 'Initial release' },
        ],
      },
      createdAt: new Date(Date.now() - 21 * 24 * 3600000).toISOString(),
      model: {
        primary: 'claude-3-5-sonnet',
        fallback: 'gpt-4o-mini',
        temperature: 0.1,
        topP: 0.95,
        maxTokens: 4096,
        stop: [],
        reasoningEffort: 'high',
        systemPrompt: [
          'You are a senior data analyst at {{org.name}}. You answer analytical questions by writing SQL against the Analytics Warehouse.',
          '',
          'Rules:',
          '1. Always ground table and column names in the analytics data dictionary retrieved for you — never hallucinate schemas.',
          '2. For any question, first use `sql.schema` or `table.describe` to confirm tables and columns before writing SQL.',
          '3. Only run `sql.query` (SELECT). Refuse any DROP, DELETE, UPDATE, INSERT, TRUNCATE, or ALTER unless the user explicitly approves and the tool policy allows it.',
          '4. When returning results, include: the SQL you ran, a brief plan-and-why, and a short business-language summary (<3 sentences).',
          '5. Cap results at 10,000 rows. If a query would return more, ask for a narrower filter.',
          '6. Cite column semantics from the data dictionary when disambiguating similarly-named columns.',
          '',
          'Tone: precise, concise, no marketing language.',
        ].join('\n'),
        structuredOutput: { enabled: false, schema: '{\n  "type": "object"\n}' },
      },
      knowledge: {
        attachedSourceIds: ['src_analytics_dictionary'],
        retrieval: { topK: 10, threshold: 0.22, reranker: true, hybrid: true },
      },
      tools: {
        attached: [
          { id: 'mcp_analytics_warehouse.sql.schema',     source: 'mcp', label: 'Analytics Warehouse · Postgres: sql.schema',     desc: 'List schemas, tables, and columns.',                 icon: 'plug', enabled: true, requiresApproval: false, config: { serverId: 'mcp_analytics_warehouse', toolName: 'sql.schema',     riskLevel: 'low' } },
          { id: 'mcp_analytics_warehouse.table.describe', source: 'mcp', label: 'Analytics Warehouse · Postgres: table.describe', desc: 'Describe a table: columns, types, row count.',        icon: 'plug', enabled: true, requiresApproval: false, config: { serverId: 'mcp_analytics_warehouse', toolName: 'table.describe', riskLevel: 'low' } },
          { id: 'mcp_analytics_warehouse.sql.query',      source: 'mcp', label: 'Analytics Warehouse · Postgres: sql.query',      desc: 'Run a SELECT query. Results capped at 10k rows.',      icon: 'plug', enabled: true, requiresApproval: false, config: { serverId: 'mcp_analytics_warehouse', toolName: 'sql.query',      riskLevel: 'low' } },
          { id: 'mcp_analytics_warehouse.query.plan',     source: 'mcp', label: 'Analytics Warehouse · Postgres: query.plan',     desc: 'EXPLAIN a query and return the plan.',                icon: 'plug', enabled: true, requiresApproval: false, config: { serverId: 'mcp_analytics_warehouse', toolName: 'query.plan',     riskLevel: 'low' } },
          { id: 'calc',                                    source: 'builtin', label: 'Calculator',        desc: 'Exact arithmetic and unit conversion.', icon: 'calc',   enabled: true, requiresApproval: false },
        ],
        rateLimit: { perMinute: 30, timeoutMs: 45_000, retries: 2 },
      },
      guardrails: {
        input:  { pii: true,  promptInjection: true,  topics: ['analytics', 'data', '!hr-benefits'], profanity: false },
        output: { hallucination: true, grounding: true, toxicity: false, piiRedaction: true },
        jailbreakDefense: 'strict',
        rules: [
          { id: 'r_no_destructive', when: "/DROP|DELETE|TRUNCATE|UPDATE\\s+\\w+\\s+SET|INSERT\\s+INTO|ALTER\\s+TABLE/i.test(output.text)", action: 'route-to-human', target: 'data-platform-reviewers' },
          { id: 'r_row_cap',        when: 'output.sql && /LIMIT\\s+\\d+/i.test(output.sql) === false',                                      action: 'refuse',         target: '' },
        ],
        refusalMessage: "I can't run that query as-is — it looks destructive or unbounded. Want me to rewrite it as a SELECT with a LIMIT, or route to a human reviewer?",
      },
      triggers: {
        chat:    { enabled: true,  slug: 'chat-data-analyst' },
        api:     { enabled: true,  key: 'av_live_data_analyst_••••' },
        webhook: { enabled: false, inboundUrl: '' },
        cron:    { enabled: false, schedule: '0 9 * * 1-5' },
        events:  { enabled: false, source: 'none' },
        channels: [
          { id: 'slack', label: 'Slack', connected: true, overrides: { systemPromptSuffix: 'When replying in Slack, keep the SQL fenced with ```sql and the business summary under 3 bullets.' } },
        ],
      },
      evals: {
        suites: [
          { id: 's_smoke',  name: 'Smoke',              cases: 18,  lastScore: 0.96, lastRunAt: new Date(Date.now() - 3600000).toISOString() },
          { id: 's_sql',    name: 'SQL grounding',      cases: 64,  lastScore: 0.91, lastRunAt: new Date(Date.now() - 24 * 3600000).toISOString() },
          { id: 's_safety', name: 'Destructive-query refusal', cases: 24, lastScore: 1.0, lastRunAt: new Date(Date.now() - 24 * 3600000).toISOString() },
        ],
        judges: [
          { id: 'j1', kind: 'llm-as-judge', model: 'claude-3-5-sonnet', criteria: 'query correctness, schema grounding, conciseness' },
          { id: 'j2', kind: 'rule',         rule: 'output contains `sql` code fence AND a <3 sentence summary' },
        ],
        regressions: { onVersionChange: true },
        ab: { active: false, challengerVersion: null, split: 0.1 },
      },
      observability: {
        tokensMTD: 4_820_000,
        costMTD: 62.4,
        p50MS: 1_080,
        p95MS: 3_200,
        errorRate: 0.008,
        exports: { otel: true, datadog: false, splunk: false },
      },
      deploy: {
        environments: {
          dev:     { version: '1.2.0', deployedAt: now,                                 pinned: false },
          staging: { version: '1.2.0', deployedAt: now,                                 pinned: false },
          prod:    { version: '1.2.0', deployedAt: new Date(Date.now() - 2 * 24 * 3600000).toISOString(), pinned: true },
        },
        versions: [
          { version: '1.2.0', createdAt: new Date(Date.now() - 2 * 24 * 3600000).toISOString(), by: 'data-platform@agentvault.io', note: 'Hardened guardrails + retrieval threshold tuned' },
          { version: '1.1.0', createdAt: new Date(Date.now() - 8 * 24 * 3600000).toISOString(), by: 'data-platform@agentvault.io', note: 'Added query.plan tool; switched to Sonnet primary' },
          { version: '1.0.0', createdAt: new Date(Date.now() - 21 * 24 * 3600000).toISOString(), by: 'data-platform@agentvault.io', note: 'Initial release' },
        ],
        canary: { enabled: false, percent: 10 },
      },
    }),
  ];
}
