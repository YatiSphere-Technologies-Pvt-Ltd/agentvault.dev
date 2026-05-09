/* Provider catalog
   ────────────────
   Some tools are abstract capabilities that need a concrete provider behind
   them. `web.search` is the canonical example — the tool is the abstraction
   the agent calls; the provider is the engine that actually answers.

   This file is a registry of provider templates per tool category. Each
   template declares:
     • id, label, vendor metadata
     • the credentialFields the operator must fill in (vault refs only)
     • optional regions, default cost, default rate limits
     • notes — provenance / pricing hints / gotchas an operator should see

   The /app/tools/[id] Overview tab uses this to drive its "Add provider" sheet.
   The runtime would use it to know which environment-variable to read; today
   the demo just persists vault refs.
*/

/* ── Web search providers ── */

export const WEB_SEARCH_PROVIDERS = [
  {
    id: 'bing-grounding',
    label: 'Bing Grounding (Azure AI Foundry)',
    vendor: 'microsoft',
    badge: 'Recommended',
    blurb:
      'Microsoft\'s managed web grounding via Azure AI Foundry. Bing under the hood; Foundry adds responsible-AI filters, freshness scoring, and citation guarantees.',
    docsUrl: 'https://learn.microsoft.com/azure/ai-foundry/agents/how-to/tools/bing-grounding',
    regions: ['global', 'us', 'eu', 'apac'],
    defaultCostPerCallUsd: 0.012,
    defaultRpm: 600,
    credentialFields: [
      { name: 'foundryResourceId', label: 'Foundry resource ID', placeholder: '/subscriptions/.../resourceGroups/.../providers/Microsoft.AI/ai-services/foundry-prod', secret: false, required: true },
      { name: 'apiKeyRef',         label: 'API key (vault ref)', placeholder: 'vault://web-search/bing-grounding/key',                              secret: true,  required: true },
      { name: 'endpoint',          label: 'Endpoint',             placeholder: 'https://foundry-prod.cognitiveservices.azure.com',                  secret: false, required: true },
    ],
    options: [
      { name: 'safeSearch',  label: 'SafeSearch',     type: 'select', values: ['off', 'moderate', 'strict'], default: 'moderate' },
      { name: 'freshness',   label: 'Freshness',      type: 'select', values: ['any', 'day', 'week', 'month'], default: 'any' },
      { name: 'market',      label: 'Market',          type: 'text',   default: 'en-US' },
      { name: 'maxResults',  label: 'Max results',     type: 'number', default: 10, min: 1, max: 50 },
    ],
    notes: [
      'Bing Search API (legacy direct) was retired Aug 2025 — use Foundry-managed grounding for new deployments.',
      'Bills via your Azure AI Foundry subscription; per-query price varies by tier.',
      'Returns Microsoft-issued citations the runtime preserves into the run trace.',
    ],
  },
  {
    id: 'brave',
    label: 'Brave Search',
    vendor: 'brave',
    blurb:
      'Independent web index built by Brave. Simple REST API, transparent pricing, strong site-categorization signals. Good fallback or primary for cost-sensitive workloads.',
    docsUrl: 'https://api.search.brave.com/app/documentation',
    regions: ['global'],
    defaultCostPerCallUsd: 0.008,
    defaultRpm: 1000,
    credentialFields: [
      { name: 'apiKeyRef', label: 'API key (vault ref)', placeholder: 'vault://web-search/brave/key', secret: true, required: true },
      { name: 'endpoint',  label: 'Endpoint',             placeholder: 'https://api.search.brave.com/res/v1/web/search', secret: false, required: false },
    ],
    options: [
      { name: 'country',    label: 'Country',     type: 'text',   default: 'us' },
      { name: 'safesearch', label: 'SafeSearch',  type: 'select', values: ['off', 'moderate', 'strict'], default: 'moderate' },
      { name: 'freshness',  label: 'Freshness',   type: 'select', values: ['any', 'pd', 'pw', 'pm', 'py'], default: 'any' },
      { name: 'count',      label: 'Result count', type: 'number', default: 10, min: 1, max: 20 },
    ],
    notes: [
      'Free tier: 1 query / second. Paid tiers from $3/CPM.',
      'Returns categorized sources (news, video, faq, discussion) — useful for filtering before retrieval.',
    ],
  },
  {
    id: 'google-cse',
    label: 'Google Programmable Search (CSE)',
    vendor: 'google',
    blurb:
      'Google Custom Search Engine. Requires a CSE configured in your Google Cloud Console with the sites you want indexed. Best when you need Google-quality results scoped to specific domains.',
    docsUrl: 'https://developers.google.com/custom-search/v1/overview',
    regions: ['global'],
    defaultCostPerCallUsd: 0.005,
    defaultRpm: 100,
    credentialFields: [
      { name: 'apiKeyRef', label: 'API key (vault ref)', placeholder: 'vault://web-search/google-cse/key', secret: true, required: true },
      { name: 'cx',        label: 'Search engine ID (cx)', placeholder: '0123456789abcdef0:abc',                  secret: false, required: true },
    ],
    options: [
      { name: 'lr',        label: 'Language',     type: 'text',   default: 'lang_en' },
      { name: 'gl',        label: 'Geolocation',  type: 'text',   default: 'us' },
      { name: 'safe',      label: 'Safe search',  type: 'select', values: ['off', 'active'], default: 'active' },
      { name: 'num',       label: 'Result count', type: 'number', default: 10, min: 1, max: 10 },
    ],
    notes: [
      'Free tier: 100 queries/day. Paid: $5/1000 queries up to 10k/day.',
      'Results scoped to whatever sites you configure in your Programmable Search Engine.',
      'No general-web fallback — use Bing or Brave if you need everything-on-the-internet coverage.',
    ],
  },
  {
    id: 'tavily',
    label: 'Tavily',
    vendor: 'tavily',
    blurb:
      'Search built specifically for LLM agents. Returns pre-summarized snippets, structured citations, and a "raw answer" mode. Higher per-query cost but cuts your post-retrieval token spend.',
    docsUrl: 'https://docs.tavily.com',
    regions: ['global'],
    defaultCostPerCallUsd: 0.015,
    defaultRpm: 300,
    credentialFields: [
      { name: 'apiKeyRef', label: 'API key (vault ref)', placeholder: 'vault://web-search/tavily/key', secret: true, required: true },
    ],
    options: [
      { name: 'searchDepth',     label: 'Search depth',    type: 'select', values: ['basic', 'advanced'], default: 'basic' },
      { name: 'includeAnswer',   label: 'Include answer',  type: 'boolean', default: true },
      { name: 'includeImages',   label: 'Include images',  type: 'boolean', default: false },
      { name: 'maxResults',      label: 'Max results',     type: 'number', default: 5, min: 1, max: 20 },
    ],
    notes: [
      'Pricing: $0.008 (basic) / $0.04 (advanced) per call. Free tier: 1,000 calls/month.',
      '`includeAnswer` returns a Tavily-generated summary alongside the raw results — useful for grounding.',
    ],
  },
  {
    id: 'you',
    label: 'You.com Search',
    vendor: 'you',
    blurb:
      'Hybrid web + AI snippets API from You.com. Strong on semantic queries; returns citations the agent can pass through to the user.',
    docsUrl: 'https://documentation.you.com',
    regions: ['global'],
    defaultCostPerCallUsd: 0.010,
    defaultRpm: 200,
    credentialFields: [
      { name: 'apiKeyRef', label: 'API key (vault ref)', placeholder: 'vault://web-search/you/key', secret: true, required: true },
    ],
    options: [
      { name: 'mode',       label: 'Mode',         type: 'select', values: ['web', 'news', 'snippets'], default: 'web' },
      { name: 'numResults', label: 'Result count', type: 'number', default: 10, min: 1, max: 20 },
    ],
    notes: [
      'Pricing tiers gated by API plan; talk to sales for enterprise rates.',
    ],
  },
  {
    id: 'perplexity',
    label: 'Perplexity API',
    vendor: 'perplexity',
    blurb:
      'Perplexity\'s sonar models accessible as a search-and-summarize tool. Returns an LLM-composed answer with citations rather than raw results.',
    docsUrl: 'https://docs.perplexity.ai',
    regions: ['global'],
    defaultCostPerCallUsd: 0.005,
    defaultRpm: 60,
    credentialFields: [
      { name: 'apiKeyRef', label: 'API key (vault ref)', placeholder: 'vault://web-search/perplexity/key', secret: true, required: true },
    ],
    options: [
      { name: 'model',         label: 'Model',          type: 'select', values: ['sonar', 'sonar-pro', 'sonar-reasoning'], default: 'sonar' },
      { name: 'searchRecency', label: 'Search recency', type: 'select', values: ['any', 'day', 'week', 'month', 'year'], default: 'any' },
    ],
    notes: [
      'Returns prose + citations, not URLs — different shape from the other providers. Use when you want a finished answer rather than raw search hits.',
      'Pricing: $1/1M input tokens, $1/1M output tokens for sonar; higher for sonar-pro/reasoning.',
    ],
  },
  {
    id: 'exa',
    label: 'Exa (formerly Metaphor)',
    vendor: 'exa',
    blurb:
      'Neural search for technical and long-tail content. Strong on developer-doc / academic / niche-blog discovery. Returns full-page text alongside snippets.',
    docsUrl: 'https://docs.exa.ai',
    regions: ['global'],
    defaultCostPerCallUsd: 0.010,
    defaultRpm: 200,
    credentialFields: [
      { name: 'apiKeyRef', label: 'API key (vault ref)', placeholder: 'vault://web-search/exa/key', secret: true, required: true },
    ],
    options: [
      { name: 'type',         label: 'Search type',  type: 'select', values: ['neural', 'keyword', 'auto'], default: 'auto' },
      { name: 'numResults',   label: 'Result count', type: 'number', default: 10, min: 1, max: 20 },
      { name: 'includeText',  label: 'Include full text', type: 'boolean', default: false },
    ],
    notes: [
      'Pricing: $5/1k searches + $0.10/1k pages of text content if includeText is on.',
    ],
  },
];

/* ── Code interpreter sandbox providers ──
   For `code.exec`, "providers" are the sandboxes that actually run the code.
   Built-in is the default (gVisor in your VPC); the rest are commercial
   sandbox-as-a-service offerings the operator can wire in. */

export const CODE_EXEC_PROVIDERS = [
  {
    id: 'builtin-gvisor',
    label: 'Built-in · gVisor',
    vendor: 'agentvault',
    badge: 'Default',
    blurb:
      'AgentVault\'s in-VPC sandbox using gVisor isolation. No external dependency, no extra cost beyond your compute. Best for general workloads.',
    docsUrl: 'https://gvisor.dev',
    regions: ['us-east-1', 'us-west-2', 'eu-west-1', 'ap-south-1'],
    defaultCostPerCallUsd: 0.0,
    defaultRpm: 1200,
    capabilities: ['python', 'node', 'bash', 'gpu-cpu-only'],
    credentialFields: [],
    options: [
      { name: 'pool',     label: 'Worker pool', type: 'select', values: ['shared', 'dedicated'], default: 'shared' },
    ],
    notes: [
      'Runs entirely inside your AgentVault VPC. No data leaves the perimeter.',
      'No GPUs on the shared pool — use a dedicated pool or an external sandbox provider for ML workloads.',
    ],
  },
  {
    id: 'e2b',
    label: 'E2B',
    vendor: 'e2b',
    badge: 'Recommended for ML',
    blurb:
      'Cloud sandboxes built for AI agents. Pre-baked images for Python data science, Node, web browsers, and a custom Docker option. Sub-second cold starts.',
    docsUrl: 'https://e2b.dev/docs',
    regions: ['us-east-1', 'us-west-1', 'eu-central-1'],
    defaultCostPerCallUsd: 0.018,
    defaultRpm: 600,
    capabilities: ['python', 'node', 'bash', 'gpu', 'browser', 'custom-image'],
    credentialFields: [
      { name: 'apiKeyRef', label: 'API key (vault ref)', placeholder: 'vault://code-exec/e2b/key', secret: true, required: true },
      { name: 'team',      label: 'Team slug',           placeholder: 'agentvault-prod',           secret: false, required: false },
    ],
    options: [
      { name: 'template', label: 'Template',  type: 'select', values: ['code-interpreter-v1', 'desktop-v1', 'custom'], default: 'code-interpreter-v1' },
      { name: 'gpu',      label: 'GPU',       type: 'select', values: ['none', 'a10g', 'a100'], default: 'none' },
      { name: 'idleTtlS', label: 'Idle TTL',  type: 'number', default: 300, min: 30, max: 3600 },
    ],
    notes: [
      'Pricing: $0.0001 / vCPU-second + $0.0001 / GB-second of RAM. GPU pricing on top.',
      'Sandboxes auto-shut-down after `idleTtlS` seconds of no activity.',
      'Custom images supported via E2B\'s image-build flow — point at a Dockerfile in your repo.',
    ],
  },
  {
    id: 'modal',
    label: 'Modal',
    vendor: 'modal',
    blurb:
      'Serverless cloud functions with GPU support. Best when you need heavy compute (CUDA, large models) on demand. Higher latency than E2B for cold starts but cheaper at scale.',
    docsUrl: 'https://modal.com/docs',
    regions: ['us-east', 'us-west', 'eu-west'],
    defaultCostPerCallUsd: 0.025,
    defaultRpm: 300,
    capabilities: ['python', 'gpu', 'custom-image'],
    credentialFields: [
      { name: 'tokenIdRef',     label: 'Token ID (vault ref)',     placeholder: 'vault://code-exec/modal/token-id',     secret: true, required: true },
      { name: 'tokenSecretRef', label: 'Token secret (vault ref)', placeholder: 'vault://code-exec/modal/token-secret', secret: true, required: true },
      { name: 'workspace',      label: 'Workspace',                 placeholder: 'agentvault-prod',                     secret: false, required: true },
    ],
    options: [
      { name: 'image',     label: 'Image',     type: 'select', values: ['python:3.11-slim', 'pytorch-2.4-cuda', 'custom'], default: 'python:3.11-slim' },
      { name: 'gpu',       label: 'GPU',       type: 'select', values: ['none', 't4', 'a10g', 'a100', 'h100'], default: 'none' },
      { name: 'cpuCores',  label: 'CPU cores', type: 'number', default: 2, min: 0.25, max: 64, step: 0.25 },
      { name: 'memoryMb',  label: 'Memory',    type: 'number', default: 2048, min: 256, max: 65536, step: 256 },
    ],
    notes: [
      'Per-CPU-second + GPU-second pricing. Free tier: $30/month credit.',
      'Cold starts: ~3s for slim images, ~15s for CUDA images. Use Modal\'s pre-warmed pools for sub-second.',
    ],
  },
  {
    id: 'daytona',
    label: 'Daytona',
    vendor: 'daytona',
    blurb:
      'Open-source dev sandbox you can self-host or use as a managed service. Strong filesystem story; good when agents need to clone repos and run multi-file workflows.',
    docsUrl: 'https://daytona.io/docs',
    regions: ['self-hosted', 'us-east', 'eu-west'],
    defaultCostPerCallUsd: 0.012,
    defaultRpm: 400,
    capabilities: ['python', 'node', 'bash', 'git', 'custom-image'],
    credentialFields: [
      { name: 'apiKeyRef', label: 'API key (vault ref)', placeholder: 'vault://code-exec/daytona/key',  secret: true,  required: true },
      { name: 'endpoint',  label: 'Endpoint',             placeholder: 'https://api.daytona.io',          secret: false, required: true },
    ],
    options: [
      { name: 'workspaceClass', label: 'Workspace class', type: 'select', values: ['small', 'medium', 'large'], default: 'small' },
      { name: 'persist',        label: 'Persistent home', type: 'boolean', default: true },
    ],
    notes: [
      'When self-hosted, runs entirely in your own infrastructure — no external dependency.',
      'Persistent home directory means agent state survives across calls (good for multi-step workflows).',
    ],
  },
  {
    id: 'riza',
    label: 'Riza',
    vendor: 'riza',
    blurb:
      'Lightweight code sandbox with sub-100ms cold starts. JavaScript/Python only, no filesystem or network by default — strict and fast.',
    docsUrl: 'https://docs.riza.io',
    regions: ['global'],
    defaultCostPerCallUsd: 0.003,
    defaultRpm: 2000,
    capabilities: ['python', 'node'],
    credentialFields: [
      { name: 'apiKeyRef', label: 'API key (vault ref)', placeholder: 'vault://code-exec/riza/key', secret: true, required: true },
    ],
    options: [
      { name: 'language', label: 'Language', type: 'select', values: ['python', 'javascript'], default: 'python' },
    ],
    notes: [
      'Best for low-latency, deterministic workloads. No persistent state, no network access — by design.',
      'Pricing: $0.0003 / call + minor compute overage.',
    ],
  },
  {
    id: 'byo',
    label: 'Bring your own runtime',
    vendor: 'custom',
    blurb:
      'Point at any HTTP endpoint that implements the AgentVault sandbox protocol. Use this when you have an internal compute platform you want agents to call.',
    docsUrl: '',
    regions: [],
    defaultCostPerCallUsd: 0.0,
    defaultRpm: 100,
    capabilities: ['custom'],
    credentialFields: [
      { name: 'endpoint',  label: 'Endpoint URL',         placeholder: 'https://sandbox.internal/v1/exec', secret: false, required: true },
      { name: 'apiKeyRef', label: 'Auth token (vault ref)', placeholder: 'vault://code-exec/byo/token',     secret: true,  required: false },
    ],
    options: [
      { name: 'protocol', label: 'Protocol version', type: 'select', values: ['av-sandbox-v1', 'jupyter'], default: 'av-sandbox-v1' },
    ],
    notes: [
      'Your endpoint must accept POST {language, code, files, limits} and return {stdout, stderr, files, exitCode}.',
      'TLS 1.2+ required. mTLS supported via the workspace key vault.',
    ],
  },
];

/* ── Vector retrieval providers ──
   For `knowledge.search`, "providers" are the vector store + retrieval engine
   that runs the search. The runtime delegates to one of these per call. */

export const KNOWLEDGE_SEARCH_PROVIDERS = [
  {
    id: 'builtin-pgvector',
    label: 'Built-in · pgvector',
    vendor: 'agentvault',
    badge: 'Default',
    blurb:
      'AgentVault\'s in-VPC retrieval on Postgres + pgvector. Hybrid search via PGroonga or tsvector. Best when you want everything inside your VPC and don\'t need >100M chunks.',
    docsUrl: 'https://github.com/pgvector/pgvector',
    regions: ['us-east-1', 'us-west-2', 'eu-west-1', 'ap-south-1'],
    defaultCostPerCallUsd: 0.0,
    defaultRpm: 1500,
    capabilities: ['vector', 'bm25', 'hybrid', 'metadata-filter'],
    credentialFields: [],
    options: [
      { name: 'indexType',  label: 'Index type',  type: 'select', values: ['hnsw', 'ivfflat'], default: 'hnsw' },
      { name: 'efSearch',   label: 'ef_search',   type: 'number', default: 64, min: 8, max: 512 },
    ],
    notes: [
      'Runs entirely inside your AgentVault VPC. No data leaves the perimeter.',
      'HNSW has higher memory but better recall than IVFFlat at scale.',
    ],
  },
  {
    id: 'qdrant',
    label: 'Qdrant',
    vendor: 'qdrant',
    blurb:
      'Open-source vector database with strong hybrid-search support, payload indexing, and filtering. Cloud or self-hosted.',
    docsUrl: 'https://qdrant.tech/documentation/',
    regions: ['us-east-1', 'eu-west-1', 'self-hosted'],
    defaultCostPerCallUsd: 0.0008,
    defaultRpm: 2000,
    capabilities: ['vector', 'sparse', 'hybrid', 'metadata-filter', 'multi-vector'],
    credentialFields: [
      { name: 'apiKeyRef', label: 'API key (vault ref)', placeholder: 'vault://retrieval/qdrant/key', secret: true,  required: true },
      { name: 'endpoint',  label: 'Endpoint',             placeholder: 'https://my-cluster.us-east.aws.cloud.qdrant.io', secret: false, required: true },
    ],
    options: [
      { name: 'collection',     label: 'Collection',     type: 'text',   default: 'av-prod' },
      { name: 'hnswEf',         label: 'hnsw_ef',        type: 'number', default: 128, min: 8, max: 1024 },
      { name: 'sparseEnabled',  label: 'Sparse vectors', type: 'boolean', default: true },
    ],
    notes: [
      'Strong native support for hybrid search via sparse vectors (BM25-style) on the same collection.',
      'Self-hosted is free; cloud bills per cluster size + egress.',
    ],
  },
  {
    id: 'pinecone',
    label: 'Pinecone',
    vendor: 'pinecone',
    blurb:
      'Managed vector database with serverless and pod-based options. Excellent for global low-latency reads at very large scale.',
    docsUrl: 'https://docs.pinecone.io',
    regions: ['us-east-1', 'us-west-2', 'eu-west-1'],
    defaultCostPerCallUsd: 0.0012,
    defaultRpm: 1000,
    capabilities: ['vector', 'sparse', 'hybrid', 'metadata-filter', 'namespaces'],
    credentialFields: [
      { name: 'apiKeyRef', label: 'API key (vault ref)', placeholder: 'vault://retrieval/pinecone/key', secret: true,  required: true },
      { name: 'indexHost', label: 'Index host',           placeholder: 'av-prod-abcd.svc.us-east1.pinecone.io', secret: false, required: true },
    ],
    options: [
      { name: 'namespace', label: 'Namespace',  type: 'text',   default: 'default' },
      { name: 'topK',      label: 'Default top-k', type: 'number', default: 8, min: 1, max: 100 },
    ],
    notes: [
      'Serverless pricing: $0.33 per million read units + $4 per million write units.',
      'Use namespaces for tenant isolation rather than separate indexes.',
    ],
  },
  {
    id: 'weaviate',
    label: 'Weaviate',
    vendor: 'weaviate',
    blurb:
      'Open-source vector DB with a strong schema layer and built-in modules for hybrid + reranking. Cloud, embedded, or self-hosted.',
    docsUrl: 'https://weaviate.io/developers/weaviate',
    regions: ['us-east-1', 'eu-west-1', 'self-hosted'],
    defaultCostPerCallUsd: 0.001,
    defaultRpm: 1500,
    capabilities: ['vector', 'bm25', 'hybrid', 'graphql', 'multi-tenancy'],
    credentialFields: [
      { name: 'apiKeyRef', label: 'API key (vault ref)', placeholder: 'vault://retrieval/weaviate/key', secret: true,  required: true },
      { name: 'endpoint',  label: 'Endpoint',             placeholder: 'https://my-cluster.weaviate.network', secret: false, required: true },
    ],
    options: [
      { name: 'class',     label: 'Class',     type: 'text',   default: 'Document' },
      { name: 'alpha',     label: 'Hybrid α',  type: 'number', default: 0.5, min: 0, max: 1, step: 0.05 },
    ],
    notes: [
      'GraphQL query interface — useful when retrieval needs structured filters.',
      'Hybrid α = 0 is pure BM25, α = 1 is pure vector. Tune per use case.',
    ],
  },
  {
    id: 'elastic',
    label: 'Elastic Search',
    vendor: 'elastic',
    blurb:
      'Elastic\'s combined keyword + dense vector search. Best when you already have an Elastic cluster for logs/search and want to consolidate.',
    docsUrl: 'https://www.elastic.co/guide/en/elasticsearch/reference/current/dense-vector.html',
    regions: ['us-east-1', 'eu-west-1', 'self-hosted'],
    defaultCostPerCallUsd: 0.0,
    defaultRpm: 1200,
    capabilities: ['vector', 'bm25', 'hybrid', 'metadata-filter', 'aggregations'],
    credentialFields: [
      { name: 'apiKeyRef', label: 'API key (vault ref)', placeholder: 'vault://retrieval/elastic/key', secret: true,  required: true },
      { name: 'endpoint',  label: 'Endpoint',             placeholder: 'https://my-deployment.es.us-east1.aws.elastic.cloud', secret: false, required: true },
    ],
    options: [
      { name: 'index',  label: 'Index',  type: 'text',   default: 'av-docs' },
      { name: 'rrfK',   label: 'RRF k',  type: 'number', default: 60, min: 1, max: 500 },
    ],
    notes: [
      'Use Reciprocal Rank Fusion (RRF) to combine BM25 and kNN — Elastic ships this natively.',
    ],
  },
  {
    id: 'turbopuffer',
    label: 'Turbopuffer',
    vendor: 'turbopuffer',
    blurb:
      'Vector + full-text search built on object storage. Cheaper than other clouds at very large scale, slightly higher latency.',
    docsUrl: 'https://turbopuffer.com/docs',
    regions: ['us-east-1', 'us-west-2', 'eu-west-1'],
    defaultCostPerCallUsd: 0.0002,
    defaultRpm: 1000,
    capabilities: ['vector', 'bm25', 'hybrid', 'metadata-filter'],
    credentialFields: [
      { name: 'apiKeyRef', label: 'API key (vault ref)', placeholder: 'vault://retrieval/turbopuffer/key', secret: true, required: true },
    ],
    options: [
      { name: 'namespace', label: 'Namespace', type: 'text', default: 'default' },
    ],
    notes: [
      'S3-backed — pay for storage + queries, not for instances.',
      'Great for archival corpora that get queried rarely.',
    ],
  },
];

/* ── Embedding model catalog ── */
export const EMBEDDING_MODELS = [
  { id: 'text-embedding-3-large',  vendor: 'openai',    label: 'OpenAI · text-embedding-3-large',   dim: 3072, costPer1M: 0.13, contextWindow: 8191 },
  { id: 'text-embedding-3-small',  vendor: 'openai',    label: 'OpenAI · text-embedding-3-small',   dim: 1536, costPer1M: 0.02, contextWindow: 8191 },
  { id: 'cohere-embed-v3',         vendor: 'cohere',    label: 'Cohere · embed-english-v3',          dim: 1024, costPer1M: 0.10, contextWindow: 512  },
  { id: 'cohere-embed-multilingual-v3', vendor: 'cohere', label: 'Cohere · embed-multilingual-v3',  dim: 1024, costPer1M: 0.10, contextWindow: 512  },
  { id: 'voyage-3',                vendor: 'voyage',    label: 'Voyage · voyage-3',                  dim: 1024, costPer1M: 0.06, contextWindow: 32000 },
  { id: 'voyage-3-large',          vendor: 'voyage',    label: 'Voyage · voyage-3-large',            dim: 2048, costPer1M: 0.18, contextWindow: 32000 },
  { id: 'voyage-finance-2',        vendor: 'voyage',    label: 'Voyage · voyage-finance-2',          dim: 1024, costPer1M: 0.12, contextWindow: 32000 },
  { id: 'voyage-law-2',            vendor: 'voyage',    label: 'Voyage · voyage-law-2',              dim: 1024, costPer1M: 0.12, contextWindow: 16000 },
  { id: 'bge-m3',                  vendor: 'baai',      label: 'BAAI · bge-m3 (self-host)',          dim: 1024, costPer1M: 0.0,  contextWindow: 8192 },
  { id: 'jina-embeddings-v3',      vendor: 'jina',      label: 'Jina · jina-embeddings-v3',          dim: 1024, costPer1M: 0.05, contextWindow: 8192 },
];

/* ── Reranker catalog ── */
export const RERANKERS = [
  { id: 'none',                  vendor: 'none',     label: 'None',                        blurb: 'No rerank — trust the retriever order.' },
  { id: 'cohere-rerank-3',       vendor: 'cohere',   label: 'Cohere · rerank-3',           blurb: 'Best general-purpose. ~50ms for top-100.', costPer1k: 2.0 },
  { id: 'cohere-rerank-3.5',     vendor: 'cohere',   label: 'Cohere · rerank-3.5',         blurb: 'Latest; better on long queries. Higher latency.', costPer1k: 2.0 },
  { id: 'voyage-rerank-2',       vendor: 'voyage',   label: 'Voyage · rerank-2',           blurb: 'Voyage\'s flagship reranker. Strong on technical content.', costPer1k: 1.5 },
  { id: 'voyage-rerank-2-lite',  vendor: 'voyage',   label: 'Voyage · rerank-2-lite',      blurb: 'Cheaper, faster, ~95% of rerank-2 quality.', costPer1k: 0.5 },
  { id: 'jina-reranker-v2',      vendor: 'jina',     label: 'Jina · reranker-v2-base-multilingual', blurb: 'Open weights, multilingual.', costPer1k: 0.0 },
  { id: 'cross-encoder-mini',    vendor: 'huggingface', label: 'cross-encoder/ms-marco-MiniLM-L-12', blurb: 'Free, self-hosted. Lower quality but predictable.', costPer1k: 0.0 },
];

/* ── Query rewriting strategies ── */
export const QUERY_REWRITERS = [
  { id: 'none',        label: 'None',          blurb: 'Send the user query verbatim.' },
  { id: 'hyde',        label: 'HyDE',          blurb: 'LLM hallucinates a hypothetical answer; embed that for retrieval.' },
  { id: 'multi-query', label: 'Multi-query',   blurb: 'LLM generates 3–5 paraphrases; retrieve from each, merge.' },
  { id: 'step-back',   label: 'Step-back',     blurb: 'LLM produces a higher-level abstraction first, then retrieves.' },
  { id: 'decompose',   label: 'Decompose',     blurb: 'LLM breaks the query into sub-questions, retrieves each.' },
];

/* ── Retrieval strategies ── */
export const RETRIEVAL_STRATEGIES = [
  { id: 'vector',  label: 'Vector only',
    blurb: 'Pure semantic similarity. Best when queries are conversational and corpora are well-described.' },
  { id: 'bm25',    label: 'BM25 only',
    blurb: 'Pure keyword. Best when queries contain rare terms (codes, IDs, names) the embedder misses.' },
  { id: 'hybrid',  label: 'Hybrid',
    blurb: 'Vector + BM25 fused. Recommended default — catches both semantic intent and exact matches.' },
];

/* ── ACL modes for retrieval ── */
export const RETRIEVAL_ACL_MODES = [
  { id: 'inherit',     label: 'Inherit from source',
    blurb: 'Use the source\'s native ACLs (Confluence space permissions, SharePoint folder ACLs, etc.). Recommended.' },
  { id: 'allowlist',   label: 'Group allowlist',
    blurb: 'Only members of these SCIM groups can retrieve from this corpus.' },
  { id: 'per-user',    label: 'Per-user override',
    blurb: 'Caller identity flows through; the source is queried as that user.' },
];

/* ── GraphRAG providers ──
   Distinct catalog because the implementations are genuinely different.
   Microsoft GraphRAG is the canonical open-source reference; LightRAG and
   Nano-GraphRAG are lighter alternatives. Custom = BYO graph backend. */

export const KNOWLEDGE_GRAPH_PROVIDERS = [
  {
    id: 'msr-graphrag',
    label: 'Microsoft GraphRAG',
    vendor: 'microsoft',
    badge: 'Reference',
    blurb:
      'Microsoft Research\'s open-source GraphRAG implementation. Leiden community detection, hierarchical summaries, supports local + global + DRIFT queries.',
    docsUrl: 'https://microsoft.github.io/graphrag/',
    regions: ['us-east-1', 'us-west-2', 'eu-west-1'],
    defaultCostPerCallUsd: 0.04,
    defaultRpm: 200,
    capabilities: ['local', 'global', 'drift', 'community-summary', 'leiden'],
    credentialFields: [
      { name: 'storageRef', label: 'Index storage (vault ref)', placeholder: 'vault://retrieval/graphrag/storage-key', secret: true, required: true },
      { name: 'endpoint',   label: 'Index endpoint',              placeholder: 'https://graphrag.internal/v1',          secret: false, required: true },
    ],
    options: [
      { name: 'queryMode',         label: 'Default query mode', type: 'select', values: ['local', 'global', 'drift', 'auto'], default: 'auto' },
      { name: 'communityLevel',    label: 'Community level',     type: 'number', default: 2, min: 0, max: 5 },
      { name: 'reduceTopN',        label: 'Reduce top-N',         type: 'number', default: 10, min: 1, max: 50 },
    ],
    notes: [
      'Reference open-source implementation — expect to operate it (Indexer + Search + storage).',
      'Index construction is expensive: ~$1k–$5k of LLM calls per 10M-token corpus depending on the model.',
      'DRIFT (2024) blends global + local in a single query — good default once the index is mature.',
    ],
  },
  {
    id: 'neo4j-graphrag',
    label: 'Neo4j GraphRAG',
    vendor: 'neo4j',
    blurb:
      'Neo4j\'s GenAI library on top of a managed Neo4j cluster. Strong production story; plays well with existing Cypher pipelines.',
    docsUrl: 'https://neo4j.com/docs/genai/',
    regions: ['us-east-1', 'eu-west-1', 'self-hosted'],
    defaultCostPerCallUsd: 0.02,
    defaultRpm: 400,
    capabilities: ['local', 'global', 'cypher', 'community-summary'],
    credentialFields: [
      { name: 'apiKeyRef', label: 'API key (vault ref)',    placeholder: 'vault://retrieval/neo4j/key',        secret: true,  required: true },
      { name: 'uri',       label: 'Bolt URI',                 placeholder: 'neo4j+s://abc123.databases.neo4j.io', secret: false, required: true },
      { name: 'database',  label: 'Database',                  placeholder: 'neo4j',                             secret: false, required: true },
    ],
    options: [
      { name: 'maxHops',         label: 'Max hops (local)', type: 'number', default: 2, min: 1, max: 6 },
      { name: 'edgeConfThreshold', label: 'Edge confidence', type: 'number', default: 0.6, min: 0, max: 1, step: 0.05 },
    ],
    notes: [
      'When you already have a Neo4j cluster for other workloads, this is the lowest-friction option.',
      'Use Cypher to mix structured graph queries with semantic neighborhood expansion.',
    ],
  },
  {
    id: 'lightrag',
    label: 'LightRAG',
    vendor: 'opensource',
    blurb:
      'Lightweight open-source GraphRAG implementation. Smaller index footprint, faster cold queries, less mature than Microsoft\'s.',
    docsUrl: 'https://github.com/HKUDS/LightRAG',
    regions: ['self-hosted'],
    defaultCostPerCallUsd: 0.012,
    defaultRpm: 600,
    capabilities: ['local', 'global', 'naive-rag-fallback'],
    credentialFields: [
      { name: 'endpoint',  label: 'Endpoint',             placeholder: 'https://lightrag.internal/v1', secret: false, required: true },
      { name: 'apiKeyRef', label: 'API key (vault ref)', placeholder: 'vault://retrieval/lightrag/key', secret: true, required: false },
    ],
    options: [
      { name: 'mode',     label: 'Mode',     type: 'select', values: ['naive', 'local', 'global', 'hybrid'], default: 'hybrid' },
      { name: 'topK',     label: 'Top-k',    type: 'number', default: 60, min: 5, max: 200 },
    ],
    notes: [
      'No community detection — uses keyword + entity matching directly. Cheaper to index, sometimes lower recall.',
    ],
  },
  {
    id: 'nano-graphrag',
    label: 'Nano-GraphRAG',
    vendor: 'opensource',
    blurb:
      'Minimal Microsoft-GraphRAG-compatible implementation in ~1k LOC. Great for prototyping; not for production.',
    docsUrl: 'https://github.com/gusye1234/nano-graphrag',
    regions: ['self-hosted'],
    defaultCostPerCallUsd: 0.005,
    defaultRpm: 100,
    capabilities: ['local', 'global'],
    credentialFields: [
      { name: 'endpoint', label: 'Endpoint', placeholder: 'https://nano-graphrag.internal', secret: false, required: true },
    ],
    options: [],
    notes: [
      'Single-process; not horizontally scaled. Use for evaluation, not production.',
    ],
  },
  {
    id: 'byo-graph',
    label: 'Bring your own graph backend',
    vendor: 'custom',
    blurb:
      'Point at any HTTP endpoint that implements the AgentVault graph-retrieval protocol.',
    docsUrl: '',
    regions: [],
    defaultCostPerCallUsd: 0.0,
    defaultRpm: 100,
    capabilities: ['custom'],
    credentialFields: [
      { name: 'endpoint',  label: 'Endpoint URL',         placeholder: 'https://graph.internal/v1/query', secret: false, required: true },
      { name: 'apiKeyRef', label: 'Auth token (vault ref)', placeholder: 'vault://retrieval/byo-graph/token', secret: true, required: false },
    ],
    options: [
      { name: 'protocol', label: 'Protocol version', type: 'select', values: ['av-graph-v1'], default: 'av-graph-v1' },
    ],
    notes: [
      'Your endpoint must accept POST {query, mode, communityLevel} and return {entities, relationships, summary, citations}.',
    ],
  },
];

/* Map: tool id -> provider catalog. Generic so future tools (e.g. an LLM-as-tool
   with Anthropic/OpenAI/Google providers) plug in here. */
export const PROVIDERS_BY_TOOL = {
  'web.search':       WEB_SEARCH_PROVIDERS,
  'code.exec':        CODE_EXEC_PROVIDERS,
  'knowledge.search': KNOWLEDGE_SEARCH_PROVIDERS,
  'knowledge.graph':  KNOWLEDGE_GRAPH_PROVIDERS,
};

export function providerCatalogFor(toolId) {
  return PROVIDERS_BY_TOOL[toolId] || null;
}

export function providerTemplate(toolId, providerId) {
  const cat = providerCatalogFor(toolId);
  return cat ? cat.find(p => p.id === providerId) : null;
}

export const ROUTING_STRATEGIES = [
  { id: 'primary-fallback', label: 'Primary + fallback',
    blurb: 'Send all traffic to the primary; on failure, fall through the fallback chain in order.' },
  { id: 'round-robin',      label: 'Round-robin',
    blurb: 'Distribute calls evenly across all enabled providers. Useful for load-balancing.' },
  { id: 'latency',          label: 'Lowest latency',
    blurb: 'Pick the provider with the lowest observed p50 over the past 24h.' },
  { id: 'cost',             label: 'Lowest cost',
    blurb: 'Pick the cheapest enabled provider. Useful for high-volume non-critical traffic.' },
];

export const FALLBACK_TRIGGERS = [
  { id: 'rate-limit', label: 'Rate-limit (429)',     blurb: 'Provider returned a 429.' },
  { id: '5xx',        label: 'Server error (5xx)',   blurb: 'Provider returned a 5xx.' },
  { id: 'timeout',    label: 'Timeout > 800ms',      blurb: 'Provider took longer than the threshold.' },
  { id: 'no-results', label: 'Empty result set',     blurb: 'Provider returned zero results.' },
];

export function vendorTone(vendor) {
  switch (vendor) {
    case 'microsoft': return { color: 'var(--brand-teal)' };
    case 'google':    return { color: 'var(--accent)' };
    case 'brave':     return { color: 'var(--primary)' };
    case 'tavily':    return { color: 'var(--accent)' };
    case 'perplexity':return { color: 'var(--primary)' };
    case 'you':       return { color: 'var(--brand-teal)' };
    case 'exa':       return { color: 'var(--primary)' };
    default:          return { color: 'var(--muted-foreground)' };
  }
}
