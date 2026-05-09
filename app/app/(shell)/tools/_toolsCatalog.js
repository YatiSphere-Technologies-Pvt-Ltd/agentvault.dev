/* Tools registry — the unified capability catalog.
   ──────────────────────────────────────────────────
   A "tool" is anything an agent can call to read or affect the world. Every
   tool — built-in primitive, first-party integration, MCP-exposed action,
   custom webhook — lives here in one shape so:

   • GRC controls have a real attach surface (av.tool.allowlist,
     av.tool.high-risk-approval, av.tool.rate-limit, av.crypto.transit-rest).
   • Run traces can resolve `tool.name` spans to a record.
   • The agent Studio Tools tab can be one picker instead of three.
   • MCP servers can list "tools exposed by me" with real drill-downs.

   Origins (where the tool implementation lives):
     builtin     — primitive shipped by AgentVault, sandboxed runtime
     integration — first-party connector to a SaaS (Salesforce, NetSuite, …)
     mcp         — exposed by a customer-registered MCP server
     custom      — customer-authored webhook / function

   Side effects (what the tool *does* — drives risk policy):
     read          — read-only, no external state changes
     write-local   — writes to vault-managed storage
     write-external— writes to a third-party system
     send-message  — emits messages to humans (email / Slack / Teams)
     payment       — moves money or grants entitlements
     admin         — security/IAM changes (revoke, escalate, deploy)
*/

export const ORIGINS = [
  { id: 'builtin',     label: 'Built-in',    blurb: 'Sandboxed primitive shipped by AgentVault.' },
  { id: 'integration', label: 'Integration', blurb: 'First-party connector to a SaaS provider.' },
  { id: 'mcp',         label: 'MCP',         blurb: 'Exposed by a registered MCP server.' },
  { id: 'custom',      label: 'Custom',      blurb: 'Customer-authored webhook or function.' },
];

export const SIDE_EFFECTS = [
  { id: 'read',           label: 'Read',           blurb: 'Read-only — no external state changes.' },
  { id: 'write-local',    label: 'Write · local',  blurb: 'Writes to vault-managed storage only.' },
  { id: 'write-external', label: 'Write · external', blurb: 'Writes to a third-party system.' },
  { id: 'send-message',   label: 'Send message',   blurb: 'Sends messages to humans.' },
  { id: 'payment',        label: 'Payment',        blurb: 'Moves money or grants entitlements.' },
  { id: 'admin',          label: 'Admin',          blurb: 'Changes security or IAM state.' },
];

export const RISKS = [
  { id: 'low',  label: 'Low',  blurb: 'Reversible, no external impact.' },
  { id: 'med',  label: 'Med',  blurb: 'External effect; recoverable in minutes.' },
  { id: 'high', label: 'High', blurb: 'Irreversible or material business impact.' },
];

export const STATUSES = [
  { id: 'active',     label: 'Active' },
  { id: 'beta',       label: 'Beta' },
  { id: 'deprecated', label: 'Deprecated' },
  { id: 'disabled',   label: 'Disabled' },
];

/* ── seeded fixtures ──
   Curated set covering all four origins. Numbers are realistic but synthetic.
   The store hydrates over these and adds extra MCP-derived tools at runtime
   from the user's registered MCP servers (so they don't have to be re-seeded
   here every time the customer adds a server). */

export const SEEDED_TOOLS = [
  // ───── Built-ins ─────
  {
    id: 'web.search',
    name: 'Web search',
    origin: 'builtin',
    description: 'Search the public web and cite sources. Provider-agnostic abstraction — agents call `web.search`; the runtime picks the configured provider.',
    sideEffect: 'read',
    risk: 'low',
    scopes: [],
    owner: 'platform@agentvault.io',
    team: 'Platform',
    status: 'active',
    version: '1.4.2',
    schema: {
      input:  { query: 'string', maxResults: 'number?', site: 'string?' },
      output: { results: '[{ title, url, snippet, publishedAt }]', cost: 'number' },
    },
    sampleInput: { query: 'EU AI Act high-risk Annex III obligations', maxResults: 5 },
    usage7d: { calls: 18_420, errorRate: 0.004, p50LatencyMs: 380, callingAgents: ['agt_data_analyst', 'agt_kycverify'] },
    findings7d: { block: 0, approval: 0, warn: 2, log: 18_420 },
    deprecation: null,
    /* Multi-provider binding — see _providerCatalog.js for the templates.
       The runtime picks one provider per call based on `routing.strategy`.
       Credentials are vault refs only; the UI shows the path, never the secret. */
    providers: [
      {
        id:        'prov_bing_us',
        provider:  'bing-grounding',
        label:     'Bing Grounding · US',
        role:      'primary',
        status:    'active',
        regions:   ['us-east-1', 'us-west-2'],
        credentials: {
          foundryResourceId: '/subscriptions/8c92.../resourceGroups/agentvault-prod/providers/Microsoft.AI/ai-services/foundry-prod',
          apiKeyRef:         'vault://web-search/bing-grounding/key',
          endpoint:          'https://foundry-prod.cognitiveservices.azure.com',
        },
        options:   { safeSearch: 'moderate', freshness: 'any', market: 'en-US', maxResults: 10 },
        costPerCallUsd: 0.012,
        rpm: 600,
        usage7d: { calls: 18_000, errorRate: 0.003, p50LatencyMs: 340 },
        lastUsedAt: '2026-05-09T07:42:00.000Z',
        createdAt:  '2026-01-15T10:00:00.000Z',
      },
      {
        id:        'prov_brave_global',
        provider:  'brave',
        label:     'Brave Search · global',
        role:      'fallback',
        status:    'active',
        regions:   ['global'],
        credentials: {
          apiKeyRef: 'vault://web-search/brave/key',
          endpoint:  'https://api.search.brave.com/res/v1/web/search',
        },
        options:   { country: 'us', safesearch: 'moderate', freshness: 'any', count: 10 },
        costPerCallUsd: 0.008,
        rpm: 1000,
        usage7d: { calls: 420, errorRate: 0.008, p50LatencyMs: 410 },
        lastUsedAt: '2026-05-09T03:18:00.000Z',
        createdAt:  '2026-02-04T10:00:00.000Z',
      },
    ],
    routing: {
      strategy:           'primary-fallback',
      fallbackTriggers:   ['rate-limit', '5xx', 'timeout'],
      timeoutMs:          800,
      retryBudget:        2,
    },
    createdAt: '2025-09-12T08:00:00.000Z',
    updatedAt: '2026-04-04T11:24:00.000Z',
  },
  {
    id: 'code.exec',
    name: 'Code interpreter',
    origin: 'builtin',
    description: 'Execute code in a sandboxed runtime. Provider-agnostic — agents call `code.exec`; the runtime picks the configured sandbox (built-in / E2B / Modal / Daytona / BYO).',
    sideEffect: 'read',
    risk: 'med',
    scopes: ['sandbox:python', 'sandbox:node'],
    owner: 'platform@agentvault.io',
    team: 'Platform',
    status: 'active',
    version: '2.1.0',
    schema: {
      input:  { code: 'string', language: '"python"|"node"|"bash"|"r"', files: '[FileRef]?', timeoutMs: 'number?' },
      output: { stdout: 'string', stderr: 'string', files: '[FileRef]', figures: '[ImageRef]', exitCode: 'number', durationMs: 'number' },
    },
    sampleInput: {
      language: 'python',
      code: "import pandas as pd\ndf = pd.read_csv('/data/invoices.csv')\ndf.groupby('vendor_id')['amount'].sum().sort_values(ascending=False).head(10)"
    },
    usage7d: { calls: 4_120, errorRate: 0.018, p50LatencyMs: 1_200, callingAgents: ['agt_data_analyst'] },
    findings7d: { block: 0, approval: 0, warn: 6, log: 4_120 },
    deprecation: null,
    /* Runtime config — applies across providers. Different providers may
       advertise different *capabilities*, but the policy ("use Python 3.11
       with these packages, no network egress") is enforced uniformly. */
    runtime: {
      languages: {
        primary: 'python',
        enabled: ['python', 'node', 'bash'],
        python: {
          version: '3.11',
          baseImage: 'agentvault/py311-data-v3',
          packages: [
            'pandas==2.2.3', 'numpy==2.1.0', 'scipy==1.14.1', 'polars==1.12.0',
            'scikit-learn==1.5.2', 'matplotlib==3.9.2', 'seaborn==0.13.2',
            'pyarrow==18.0.0', 'duckdb==1.1.3', 'requests==2.32.3',
          ],
          allowRuntimeInstall: false,
        },
        node: {
          version: '22.10.0',
          baseImage: 'agentvault/node22-v1',
          packages: ['lodash@4.17.21', 'date-fns@4.1.0', 'zod@3.23.8'],
          allowRuntimeInstall: false,
        },
        bash: { version: 'gnu-5.2' },
      },
      limits: {
        cpuCores:        2,
        memoryMb:        2048,
        diskMb:          1024,
        wallClockMs:     30_000,
        maxOutputBytes:  1_048_576,
        maxFileBytes:    10_485_760,
      },
      network: {
        policy: 'allowlist',          // none | allowlist | egress-only | full
        allowlist: [
          'analytics.warehouse.internal',
          'docs.internal',
          'api.weather.gov',
        ],
        blocklist: [],
        requireTls: true,
      },
      filesystem: {
        mode: 'ephemeral',            // ephemeral | persistent | mounted
        prefixScoping: true,          // per-agent path prefix enforced
        mounts: [
          { path: '/data', source: 's3://agentvault-readonly/data', readOnly: true },
        ],
      },
      state: {
        mode: 'stateless',            // stateless | sticky-kernel
        kernelTtlS: 300,
      },
      output: {
        captureStdout: true,
        captureStderr: true,
        captureFigures: true,
        truncateAt: 1_048_576,
      },
      env: {
        allowSecrets: false,
        injectVars: ['AGENTVAULT_RUN_ID', 'AGENTVAULT_AGENT_ID'],
      },
      gpu: {
        enabled: false,
        type: 'none',
      },
    },
    providers: [
      {
        id:        'prov_builtin_us',
        provider:  'builtin-gvisor',
        label:     'Built-in · US',
        role:      'primary',
        status:    'active',
        regions:   ['us-east-1', 'us-west-2'],
        credentials: {},
        options:   { pool: 'shared' },
        costPerCallUsd: 0.0,
        rpm: 1200,
        usage7d: { calls: 3_980, errorRate: 0.014, p50LatencyMs: 1_100 },
        lastUsedAt: '2026-05-09T07:42:00.000Z',
        createdAt:  '2025-09-12T08:00:00.000Z',
      },
      {
        id:        'prov_e2b_ml',
        provider:  'e2b',
        label:     'E2B · ML workloads',
        role:      'fallback',
        status:    'active',
        regions:   ['us-east-1'],
        credentials: {
          apiKeyRef: 'vault://code-exec/e2b/key',
          team:      'agentvault-prod',
        },
        options:   { template: 'code-interpreter-v1', gpu: 'none', idleTtlS: 300 },
        costPerCallUsd: 0.018,
        rpm: 600,
        usage7d: { calls: 140, errorRate: 0.029, p50LatencyMs: 1_800 },
        lastUsedAt: '2026-05-08T16:20:00.000Z',
        createdAt:  '2026-02-04T10:00:00.000Z',
      },
    ],
    routing: {
      strategy:           'primary-fallback',
      fallbackTriggers:   ['rate-limit', '5xx', 'timeout'],
      timeoutMs:          5_000,
      retryBudget:        1,
    },
    createdAt: '2025-09-12T08:00:00.000Z',
    updatedAt: '2026-04-22T08:11:00.000Z',
  },
  {
    id: 'knowledge.search',
    name: 'Knowledge search (RAG)',
    origin: 'builtin',
    description: 'Vector + keyword retrieval over your connected knowledge corpora. Returns ranked chunks the agent uses for grounded answers.',
    sideEffect: 'read',
    risk: 'low',
    scopes: ['knowledge:read'],
    owner: 'data-platform@agentvault.io',
    team: 'Data Platform',
    status: 'active',
    version: '3.2.0',
    schema: {
      input:  { query: 'string', topK: 'number?', filter: 'object?', sourceIds: '[string]?' },
      output: { chunks: '[{ source, score, text, citation }]', queryId: 'string', latencyMs: 'number' },
    },
    sampleInput: {
      query: 'What is our policy for vendor invoices over $50k?',
      topK: 8,
    },
    usage7d: { calls: 8_640, errorRate: 0.002, p50LatencyMs: 120, callingAgents: ['agt_data_analyst', 'agt_invoiceq'] },
    findings7d: { block: 0, approval: 0, warn: 4, log: 8_640 },
    deprecation: null,
    /* Retrieval block — applies across providers. The provider implements the
       index lookup; the retrieval block decides what to ask of the index. */
    retrieval: {
      kind: 'vector',                                // 'vector' | 'graph' (drives card layout)
      corpora: [
        // Source IDs that exist in the user's /app/knowledge store. The card
        // resolves these against the live store and shows status / health.
        'src_confluence_prod', 'src_sharepoint_legal', 'src_runbooks',
      ],
      strategy: {
        mode: 'hybrid',                              // vector | bm25 | hybrid
        hybridWeight: 0.7,                           // 0=BM25, 1=vector
        queryRewriter: 'multi-query',                // none | hyde | multi-query | step-back | decompose
        rewriterModel: 'claude-haiku-4-5',
        topK: 12,
        minScore: 0.18,
      },
      embedding: {
        model: 'voyage-3-large',                     // see EMBEDDING_MODELS
        dim: 2048,
      },
      reranker: {
        id: 'cohere-rerank-3.5',
        topN: 6,
        applyAbove: 0,                                // only rerank if hits >= n
      },
      acl: {
        mode: 'inherit',                              // inherit | allowlist | per-user
        allowGroups: [],
      },
      freshness: {
        sla: 'hourly',                                // realtime | hourly | daily | weekly | manual
        alertOnLagMin: 120,
      },
      quality: {
        cacheTtlS: 60,
        tokenBudget: 8_000,
        truncateChunkChars: 1_200,
        citationsRequired: true,
      },
    },
    providers: [
      {
        id:        'prov_kn_pgvector',
        provider:  'builtin-pgvector',
        label:     'Built-in · pgvector',
        role:      'primary',
        status:    'active',
        regions:   ['us-east-1', 'eu-west-1'],
        credentials: {},
        options:   { indexType: 'hnsw', efSearch: 64 },
        costPerCallUsd: 0.0,
        rpm: 1500,
        usage7d: { calls: 7_200, errorRate: 0.001, p50LatencyMs: 95 },
        lastUsedAt: '2026-05-09T07:30:00.000Z',
        createdAt:  '2025-10-01T10:00:00.000Z',
      },
      {
        id:        'prov_kn_qdrant',
        provider:  'qdrant',
        label:     'Qdrant · prod',
        role:      'fallback',
        status:    'active',
        regions:   ['us-east-1'],
        credentials: {
          apiKeyRef: 'vault://retrieval/qdrant/key',
          endpoint:  'https://av-prod.us-east.aws.cloud.qdrant.io',
        },
        options:   { collection: 'av-prod', hnswEf: 128, sparseEnabled: true },
        costPerCallUsd: 0.0008,
        rpm: 2000,
        usage7d: { calls: 1_440, errorRate: 0.004, p50LatencyMs: 140 },
        lastUsedAt: '2026-05-08T22:14:00.000Z',
        createdAt:  '2026-01-12T10:00:00.000Z',
      },
    ],
    routing: {
      strategy:           'primary-fallback',
      fallbackTriggers:   ['rate-limit', '5xx', 'timeout'],
      timeoutMs:          1_500,
      retryBudget:        2,
    },
    createdAt: '2025-10-01T08:00:00.000Z',
    updatedAt: '2026-04-26T08:00:00.000Z',
  },
  {
    id: 'knowledge.graph',
    name: 'Knowledge graph (GraphRAG)',
    origin: 'builtin',
    description: 'GraphRAG retrieval — entity + relationship + community summaries built from your corpora. Answers global "themes" questions and local "tell me about X" questions vector RAG can\'t.',
    sideEffect: 'read',
    risk: 'low',
    scopes: ['knowledge:read', 'knowledge:graph:read'],
    owner: 'data-platform@agentvault.io',
    team: 'Data Platform',
    status: 'beta',
    version: '0.4.1',
    schema: {
      input:  { query: 'string', mode: '"local"|"global"|"drift"|"auto"?', communityLevel: 'number?' },
      output: { answer: 'string', entities: '[Entity]', relationships: '[Edge]', citations: '[Citation]' },
    },
    sampleInput: {
      query: 'How do our incident response, change management, and access review processes interact?',
      mode: 'drift',
    },
    usage7d: { calls: 1_240, errorRate: 0.018, p50LatencyMs: 1_800, callingAgents: ['agt_data_analyst'] },
    findings7d: { block: 0, approval: 0, warn: 8, log: 1_240 },
    deprecation: null,
    retrieval: {
      kind: 'graph',
      corpora: ['src_confluence_prod', 'src_runbooks'],
      graph: {
        backend: 'msr-graphrag',                      // matches a provider id below for primary
        communityLevels: 4,                            // depth of the hierarchy in the index
        defaultCommunityLevel: 2,
        entities: 18_420,
        relationships: 41_200,
        communities: 1_240,
        lastBuiltAt: '2026-05-04T03:11:00.000Z',
      },
      query: {
        mode: 'drift',                                 // local | global | drift | auto
        maxHops: 2,
        edgeConfThreshold: 0.6,
        reduceTopN: 10,                                // global queries: how many community summaries to merge
        mapBatchSize: 8,
      },
      summarization: {
        model: 'claude-sonnet-4-6',
        temperature: 0.0,
        maxTokensPerSummary: 2_000,
        citationsRequired: true,
      },
      embedding: {
        model: 'voyage-3-large',                       // for entity matching in local queries
        dim: 2048,
      },
      acl: {
        mode: 'inherit',
        allowGroups: [],
      },
      freshness: {
        sla: 'daily',
        alertOnLagMin: 2_880,
      },
      quality: {
        tokenBudget: 30_000,
        cacheTtlS: 300,
        citationsRequired: true,
      },
    },
    providers: [
      {
        id:        'prov_kg_msr',
        provider:  'msr-graphrag',
        label:     'Microsoft GraphRAG · prod',
        role:      'primary',
        status:    'active',
        regions:   ['us-east-1'],
        credentials: {
          storageRef: 'vault://retrieval/graphrag/storage-key',
          endpoint:   'https://graphrag.internal/v1',
        },
        options: { queryMode: 'drift', communityLevel: 2, reduceTopN: 10 },
        costPerCallUsd: 0.04,
        rpm: 200,
        usage7d: { calls: 1_180, errorRate: 0.014, p50LatencyMs: 1_750 },
        lastUsedAt: '2026-05-09T05:42:00.000Z',
        createdAt:  '2026-02-10T10:00:00.000Z',
      },
      {
        id:        'prov_kg_neo4j',
        provider:  'neo4j-graphrag',
        label:     'Neo4j GraphRAG · staging',
        role:      'fallback',
        status:    'active',
        regions:   ['us-east-1'],
        credentials: {
          apiKeyRef: 'vault://retrieval/neo4j/key',
          uri:       'neo4j+s://av-staging.databases.neo4j.io',
          database:  'agentvault',
        },
        options: { maxHops: 2, edgeConfThreshold: 0.6 },
        costPerCallUsd: 0.02,
        rpm: 400,
        usage7d: { calls: 60, errorRate: 0.05, p50LatencyMs: 2_100 },
        lastUsedAt: '2026-05-08T11:00:00.000Z',
        createdAt:  '2026-03-22T10:00:00.000Z',
      },
    ],
    routing: {
      strategy:           'primary-fallback',
      fallbackTriggers:   ['rate-limit', '5xx', 'timeout'],
      timeoutMs:          5_000,
      retryBudget:        1,
    },
    createdAt: '2026-02-10T08:00:00.000Z',
    updatedAt: '2026-05-04T08:00:00.000Z',
  },
  {
    id: 'calc',
    name: 'Calculator',
    origin: 'builtin',
    description: 'Exact arithmetic and unit conversion. No floats — uses arbitrary-precision rationals.',
    sideEffect: 'read',
    risk: 'low',
    scopes: [],
    owner: 'platform@agentvault.io',
    team: 'Platform',
    status: 'active',
    version: '1.0.7',
    schema: { input: { expression: 'string', unit: 'string?' }, output: { value: 'string', unit: 'string?' } },
    sampleInput: { expression: '23.45 USD * 100 / 5' },
    usage7d: { calls: 902, errorRate: 0.001, p50LatencyMs: 14, callingAgents: ['agt_data_analyst'] },
    findings7d: { block: 0, approval: 0, warn: 0, log: 902 },
    deprecation: null,
    createdAt: '2025-09-12T08:00:00.000Z',
    updatedAt: '2026-01-14T10:00:00.000Z',
  },
  {
    id: 'http',
    name: 'HTTP request',
    origin: 'builtin',
    description: 'Call any REST endpoint with scoped credentials from the vault. Egress allowlist enforced.',
    sideEffect: 'write-external',
    risk: 'med',
    scopes: ['vault:secret:read', 'egress:allowlisted'],
    owner: 'platform@agentvault.io',
    team: 'Platform',
    status: 'active',
    version: '3.0.1',
    schema: {
      input:  { method: 'GET|POST|PUT|PATCH|DELETE', url: 'string', headers: 'object?', body: 'any?' },
      output: { status: 'number', headers: 'object', body: 'any' },
    },
    sampleInput: { method: 'POST', url: 'https://api.example.com/v1/items', body: { name: 'demo' } },
    usage7d: { calls: 3_220, errorRate: 0.052, p50LatencyMs: 280, callingAgents: ['agt_redliner'] },
    findings7d: { block: 4, approval: 0, warn: 12, log: 3_220 },
    deprecation: null,
    createdAt: '2025-09-12T08:00:00.000Z',
    updatedAt: '2026-04-30T17:02:00.000Z',
  },
  {
    id: 'files',
    name: 'File ops',
    origin: 'builtin',
    description: 'Read / write files in connected storage buckets. Per-agent prefix scoping enforced.',
    sideEffect: 'write-local',
    risk: 'med',
    scopes: ['storage:bucket:read', 'storage:bucket:write'],
    owner: 'platform@agentvault.io',
    team: 'Platform',
    status: 'active',
    version: '1.6.0',
    schema: {
      input:  { op: 'read|write|list|delete', path: 'string', body: 'string?' },
      output: { ok: 'boolean', bytes: 'number?', listing: '[string]?' },
    },
    sampleInput: { op: 'list', path: 'invoices/2026-q1/' },
    usage7d: { calls: 1_840, errorRate: 0.012, p50LatencyMs: 92, callingAgents: ['agt_invoiceq'] },
    findings7d: { block: 0, approval: 0, warn: 3, log: 1_840 },
    deprecation: null,
    createdAt: '2025-09-12T08:00:00.000Z',
    updatedAt: '2026-03-19T09:30:00.000Z',
  },

  // ───── Integrations ─────
  {
    id: 'email.send',
    name: 'Send email',
    origin: 'integration',
    vendor: 'gmail',
    description: 'Send a transactional email via the workspace mailer. Subject + body required; attachments allowlisted.',
    sideEffect: 'send-message',
    risk: 'high',
    scopes: ['gmail.send'],
    owner: 'comms-platform@agentvault.io',
    team: 'Comms Platform',
    status: 'active',
    version: '2.4.1',
    schema: {
      input:  { to: 'string|[string]', subject: 'string', body: 'string', attachments: '[FileRef]?' },
      output: { messageId: 'string', delivered: 'boolean' },
    },
    sampleInput: { to: 'finance@corp', subject: 'Vendor invoice ready for review', body: 'Invoice INV-2024-0921 …' },
    usage7d: { calls: 612, errorRate: 0.008, p50LatencyMs: 720, callingAgents: ['agt_invoiceq'] },
    findings7d: { block: 0, approval: 612, warn: 0, log: 612 },
    deprecation: null,
    createdAt: '2025-10-04T08:00:00.000Z',
    updatedAt: '2026-04-01T14:08:00.000Z',
  },
  {
    id: 'slack.post',
    name: 'Slack: post',
    origin: 'integration',
    vendor: 'slack',
    description: 'Post a message to a Slack channel. Optional approval gate before sending.',
    sideEffect: 'send-message',
    risk: 'med',
    scopes: ['chat:write', 'chat:write.public'],
    owner: 'comms-platform@agentvault.io',
    team: 'Comms Platform',
    status: 'active',
    version: '1.9.3',
    schema: {
      input:  { channel: 'string', text: 'string', blocks: '[Block]?', threadTs: 'string?' },
      output: { ts: 'string', permalink: 'string' },
    },
    sampleInput: { channel: '#ap-posted', text: 'Bill posted to NetSuite — $12,420 to vendor V_8821.' },
    usage7d: { calls: 980, errorRate: 0.003, p50LatencyMs: 240, callingAgents: ['agt_invoiceq', 'agt_kycverify'] },
    findings7d: { block: 0, approval: 8, warn: 2, log: 980 },
    deprecation: null,
    createdAt: '2025-10-12T08:00:00.000Z',
    updatedAt: '2026-04-12T08:00:00.000Z',
  },
  {
    id: 'salesforce.update',
    name: 'Salesforce: update',
    origin: 'integration',
    vendor: 'salesforce',
    description: 'Update an SObject by ID. Field-level security enforced via OAuth scope.',
    sideEffect: 'write-external',
    risk: 'high',
    scopes: ['api', 'refresh_token'],
    owner: 'crm-ai@agentvault.io',
    team: 'CRM AI',
    status: 'active',
    version: '1.2.0',
    schema: {
      input:  { sObjectType: 'string', id: 'string', fields: 'object' },
      output: { success: 'boolean', errors: '[string]?' },
    },
    sampleInput: { sObjectType: 'Account', id: '001Hs00000abc', fields: { Risk_Tier__c: 'high' } },
    usage7d: { calls: 142, errorRate: 0.021, p50LatencyMs: 410, callingAgents: ['agt_kycverify'] },
    findings7d: { block: 1, approval: 4, warn: 1, log: 142 },
    deprecation: null,
    createdAt: '2025-11-04T08:00:00.000Z',
    updatedAt: '2026-04-24T08:00:00.000Z',
  },
  {
    id: 'netsuite.post',
    name: 'NetSuite: post bill',
    origin: 'integration',
    vendor: 'netsuite',
    description: 'Post a vendor bill to NetSuite. 3-way match required for amounts > $50k.',
    sideEffect: 'payment',
    risk: 'high',
    scopes: ['netsuite.bills.create'],
    owner: 'finance-platform@agentvault.io',
    team: 'Finance Platform',
    status: 'active',
    version: '2.0.4',
    schema: {
      input:  { vendor: 'string', amount: 'number', currency: 'string', poRef: 'string?', lineItems: '[LineItem]' },
      output: { tranId: 'string', status: 'pending|posted|rejected' },
    },
    sampleInput: { vendor: 'V_8821', amount: 12420, currency: 'USD', poRef: 'PO-9412', lineItems: [] },
    usage7d: { calls: 218, errorRate: 0.014, p50LatencyMs: 880, callingAgents: ['agt_invoiceq'] },
    findings7d: { block: 0, approval: 218, warn: 1, log: 218 },
    deprecation: null,
    createdAt: '2025-12-02T08:00:00.000Z',
    updatedAt: '2026-04-30T08:00:00.000Z',
  },
  {
    id: 'snowflake.query',
    name: 'Snowflake query',
    origin: 'integration',
    vendor: 'snowflake',
    description: 'Parameterized read on your warehouse. Row-level ACLs carried from the source.',
    sideEffect: 'read',
    risk: 'low',
    scopes: ['snowflake.read'],
    owner: 'data-platform@agentvault.io',
    team: 'Data Platform',
    status: 'active',
    version: '3.1.1',
    schema: {
      input:  { sql: 'string', maxRows: 'number?', warehouse: 'string?' },
      output: { rows: '[object]', rowCount: 'number', queryId: 'string' },
    },
    sampleInput: { sql: 'SELECT * FROM ANALYTICS.FCT_INVOICES WHERE created_at >= DATEADD(day, -30, CURRENT_DATE)' },
    usage7d: { calls: 6_402, errorRate: 0.003, p50LatencyMs: 480, callingAgents: ['agt_data_analyst'] },
    findings7d: { block: 0, approval: 0, warn: 4, log: 6_402 },
    deprecation: null,
    createdAt: '2025-09-30T08:00:00.000Z',
    updatedAt: '2026-04-18T08:00:00.000Z',
  },

  // ───── Custom (customer-authored) ─────
  {
    id: 'custom.payroll-cycle-status',
    name: 'Payroll: cycle status',
    origin: 'custom',
    description: 'Internal webhook that reports whether the current payroll cycle is open, closed, or in audit-hold. Authored by Payroll Engineering.',
    sideEffect: 'read',
    risk: 'low',
    scopes: [],
    owner: 'payroll-eng@agentvault.io',
    team: 'Payroll Engineering',
    status: 'beta',
    version: '0.3.2',
    schema: {
      input:  { period: 'string?' },
      output: { period: 'string', state: 'open|closed|audit-hold', closesAt: 'string' },
    },
    sampleInput: { period: '2026-05' },
    usage7d: { calls: 18, errorRate: 0.0, p50LatencyMs: 90, callingAgents: [] },
    findings7d: { block: 0, approval: 0, warn: 0, log: 18 },
    deprecation: null,
    createdAt: '2026-04-12T08:00:00.000Z',
    updatedAt: '2026-04-30T08:00:00.000Z',
  },

  // ───── Deprecated example ─────
  {
    id: 'http.legacy',
    name: 'HTTP request (legacy)',
    origin: 'builtin',
    description: 'Older HTTP client without egress allowlisting. Use `http` instead.',
    sideEffect: 'write-external',
    risk: 'high',
    scopes: [],
    owner: 'platform@agentvault.io',
    team: 'Platform',
    status: 'deprecated',
    version: '2.x',
    schema: {
      input:  { method: 'string', url: 'string', body: 'any?' },
      output: { status: 'number', body: 'any' },
    },
    sampleInput: { method: 'GET', url: 'https://example.com' },
    usage7d: { calls: 12, errorRate: 0.083, p50LatencyMs: 320, callingAgents: [] },
    findings7d: { block: 1, approval: 0, warn: 1, log: 12 },
    deprecation: { since: '2026-02-01', replacedBy: 'http', removeBy: '2026-08-01' },
    createdAt: '2024-06-01T08:00:00.000Z',
    updatedAt: '2026-02-01T08:00:00.000Z',
  },
];

/* ── Code interpreter runtime config primitives ──
   These drive the radio groups + selects in the OverviewTab runtime cards. */

export const RUNTIME_LANGUAGES = [
  { id: 'python', label: 'Python', blurb: 'Pandas, scikit-learn, matplotlib pre-installed.' },
  { id: 'node',   label: 'Node.js', blurb: 'Modern ESM with TypeScript support.' },
  { id: 'bash',   label: 'Bash',   blurb: 'Shell utilities for file + text manipulation.' },
  { id: 'r',      label: 'R',      blurb: 'tidyverse + ggplot2 — opt-in.' },
];

export const PYTHON_VERSIONS = ['3.10', '3.11', '3.12', '3.13'];
export const NODE_VERSIONS   = ['18.20.0', '20.18.0', '22.10.0'];

export const NETWORK_POLICIES = [
  { id: 'none',         label: 'No network',
    blurb: 'Sandbox is air-gapped. Safest. Recommended default.',
    tone: 'brand-teal' },
  { id: 'allowlist',    label: 'Allowlist',
    blurb: 'Only listed hosts/CIDRs reachable. Recommended for tools that need a few specific endpoints.',
    tone: 'primary' },
  { id: 'egress-only',  label: 'Egress only',
    blurb: 'Outbound any-host, no inbound. Use when you need open web access but distrust the sandbox.',
    tone: 'primary' },
  { id: 'full',         label: 'Full network',
    blurb: 'No restrictions. Internal trusted use only.',
    tone: 'destructive' },
];

export const FILESYSTEM_MODES = [
  { id: 'ephemeral',  label: 'Ephemeral',
    blurb: 'New scratch FS per call. Anything written is discarded at exit.' },
  { id: 'persistent', label: 'Persistent',
    blurb: 'Per-agent working directory survives across calls.' },
  { id: 'mounted',    label: 'Mounted volumes',
    blurb: 'Read-only or read/write mounts from S3 / GCS / NFS.' },
];

export const STATE_MODES = [
  { id: 'stateless',     label: 'Stateless',
    blurb: 'Every call is a fresh process. No variables carry over.' },
  { id: 'sticky-kernel', label: 'Sticky kernel',
    blurb: 'Jupyter-style — variables persist between calls in the same run.' },
];

export const GPU_TYPES = ['none', 't4', 'a10g', 'a100', 'h100'];

/* ── Retrieval / GraphRAG primitives ─── */

export const GRAPH_QUERY_MODES = [
  { id: 'local',  label: 'Local',
    blurb: 'Anchor on entities matched from the query; walk neighborhood. Best for "tell me about X" questions.' },
  { id: 'global', label: 'Global',
    blurb: 'Aggregate community summaries across the whole graph. Best for "what are the themes" questions.' },
  { id: 'drift',  label: 'DRIFT',
    blurb: 'Microsoft\'s 2024 hybrid: starts global, drifts to local based on query specificity. Recommended default.' },
  { id: 'auto',   label: 'Auto',
    blurb: 'LLM-routed — picks Local / Global / DRIFT per call based on query shape.' },
];

export const FRESHNESS_SLAS = [
  { id: 'realtime',  label: 'Realtime (< 1 min)',  windowMin: 1 },
  { id: 'hourly',    label: 'Hourly',              windowMin: 60 },
  { id: 'daily',     label: 'Daily',               windowMin: 1440 },
  { id: 'weekly',    label: 'Weekly',              windowMin: 10080 },
  { id: 'manual',    label: 'Manual refresh',      windowMin: null },
];

/* Vendor display metadata for badges + filters. */
export const VENDOR_LABELS = {
  gmail:       'Google Workspace',
  slack:       'Slack',
  salesforce:  'Salesforce',
  netsuite:    'NetSuite',
  snowflake:   'Snowflake',
};

/* ── helpers ── */
export function originLabel(id) {
  return ORIGINS.find(o => o.id === id)?.label || id;
}

export function sideEffectLabel(id) {
  return SIDE_EFFECTS.find(s => s.id === id)?.label || id;
}

export const RISK_TONE = {
  low:  { color: 'var(--brand-teal)',  label: 'Low'  },
  med:  { color: 'var(--primary)',      label: 'Med'  },
  high: { color: 'var(--destructive)',  label: 'High' },
};

export const STATUS_TONE = {
  active:     { color: 'var(--brand-teal)',     label: 'Active'     },
  beta:       { color: 'var(--primary)',         label: 'Beta'       },
  deprecated: { color: 'var(--accent)',          label: 'Deprecated' },
  disabled:   { color: 'var(--muted-foreground)', label: 'Disabled'  },
};

export const SIDE_EFFECT_TONE = {
  'read':            { color: 'var(--brand-teal)',     label: 'Read'           },
  'write-local':     { color: 'var(--primary)',         label: 'Write · local'  },
  'write-external':  { color: 'var(--primary)',         label: 'Write · external' },
  'send-message':    { color: 'var(--accent)',          label: 'Send message'   },
  'payment':         { color: 'var(--destructive)',     label: 'Payment'        },
  'admin':           { color: 'var(--destructive)',     label: 'Admin'          },
};
