/* Knowledge source kinds — what the builder picks in step 1 of the wizard.
   Each kind has its own connection form (rendered in step 2) and a set of
   scope controls. All of it is mocked — no real ingestion. */

export const KIND_CATALOG = [
  {
    id: 'file',
    label: 'File upload',
    blurb: 'Drop PDFs, Word docs, Markdown, CSVs. Versioned in our bucket.',
    icon: 'docs',
    scopeHint: 'Files you upload directly.',
    connectionFields: [
      // File upload is handled by the uploader; we store the stub below.
    ],
  },
  {
    id: 'url',
    label: 'URL crawl',
    blurb: 'Crawl a public or authenticated website starting at a seed URL.',
    icon: 'globe',
    scopeHint: 'Domain + depth.',
    connectionFields: [
      { key: 'seedUrl',   label: 'Seed URL',       placeholder: 'https://docs.corp', required: true },
      { key: 'maxDepth',  label: 'Max depth',      placeholder: '3', type: 'number', required: true },
      { key: 'include',   label: 'Include paths',  placeholder: '/docs/*, /guides/*' },
      { key: 'exclude',   label: 'Exclude paths',  placeholder: '/changelog/*' },
      { key: 'auth',      label: 'Auth',           type: 'select', options: ['none', 'basic', 'bearer', 'oauth'], required: true },
    ],
  },
  {
    id: 'confluence',
    label: 'Confluence',
    blurb: 'Sync spaces and pages with your Atlassian account.',
    icon: 'docs',
    scopeHint: 'Spaces + labels.',
    connectionFields: [
      { key: 'workspaceUrl', label: 'Workspace URL', placeholder: 'https://acme.atlassian.net', required: true },
      { key: 'spaces',       label: 'Spaces',        placeholder: 'ENG, PRODUCT', required: true },
      { key: 'labels',       label: 'Include labels', placeholder: 'kb, handbook' },
      { key: 'account',      label: 'Atlassian account', type: 'select', options: ['alice@acme.com (OAuth)', 'Connect new…'], required: true },
    ],
  },
  {
    id: 'notion',
    label: 'Notion',
    blurb: 'Ingest Notion databases and pages via the Notion API.',
    icon: 'docs',
    scopeHint: 'Workspaces + databases.',
    connectionFields: [
      { key: 'workspace', label: 'Notion workspace', type: 'select', options: ['AgentVault (primary)', 'Connect new…'], required: true },
      { key: 'databases', label: 'Databases',        placeholder: 'Handbook, Runbooks' },
      { key: 'pages',     label: 'Root pages',       placeholder: 'comma-separated URLs' },
    ],
  },
  {
    id: 'sharepoint',
    label: 'SharePoint',
    blurb: 'Sync sites and document libraries from Microsoft 365.',
    icon: 'docs',
    scopeHint: 'Sites + libraries.',
    connectionFields: [
      { key: 'tenantId',  label: 'Tenant ID',  placeholder: '00000000-0000-0000-0000-000000000000', required: true },
      { key: 'siteUrl',   label: 'Site URL',   placeholder: 'https://acme.sharepoint.com/sites/eng', required: true },
      { key: 'libraries', label: 'Libraries',  placeholder: 'Documents, Runbooks' },
    ],
  },
  {
    id: 'gdrive',
    label: 'Google Drive',
    blurb: 'Sync folders from a Google Workspace account.',
    icon: 'docs',
    scopeHint: 'Folders.',
    connectionFields: [
      { key: 'account', label: 'Google account', type: 'select', options: ['ops@acme.com (OAuth)', 'Connect new…'], required: true },
      { key: 'folders', label: 'Folders',        placeholder: 'Shared drives / KB, My Drive / Runbooks', required: true },
    ],
  },
  {
    id: 's3',
    label: 'Amazon S3',
    blurb: 'Pull files from an S3 bucket via a cross-account role.',
    icon: 'plug',
    scopeHint: 'Bucket + prefix.',
    connectionFields: [
      { key: 'region',   label: 'Region',    placeholder: 'us-east-1', required: true },
      { key: 'bucket',   label: 'Bucket',    placeholder: 'acme-kb-prod', required: true },
      { key: 'prefix',   label: 'Prefix',    placeholder: 'docs/' },
      { key: 'roleArn',  label: 'Role ARN',  placeholder: 'arn:aws:iam::123456789012:role/AgentVaultKB', required: true },
    ],
  },
  {
    id: 'snowflake',
    label: 'Snowflake',
    blurb: 'Index rows from a Snowflake warehouse — structured + text columns.',
    icon: 'db',
    scopeHint: 'Database + schema + table.',
    connectionFields: [
      { key: 'account',   label: 'Account',   placeholder: 'acme-ap-south-1.snowflakecomputing.com', required: true },
      { key: 'warehouse', label: 'Warehouse', placeholder: 'AGENT_WH', required: true },
      { key: 'database',  label: 'Database',  placeholder: 'ANALYTICS', required: true },
      { key: 'schema',    label: 'Schema',    placeholder: 'KB', required: true },
      { key: 'tables',    label: 'Tables',    placeholder: 'ARTICLES, FAQS' },
    ],
  },
  {
    id: 'postgres',
    label: 'Postgres',
    blurb: 'Index rows from a managed Postgres database.',
    icon: 'db',
    scopeHint: 'Database + table.',
    connectionFields: [
      { key: 'host',     label: 'Host',     placeholder: 'db.corp.internal', required: true },
      { key: 'database', label: 'Database', placeholder: 'support',          required: true },
      { key: 'tables',   label: 'Tables',   placeholder: 'articles, macros' },
      { key: 'auth',     label: 'Auth',     type: 'select', options: ['vault-stored', 'iam-role'], required: true },
    ],
  },
];

export const EMBEDDING_MODELS = [
  { id: 'text-embedding-3-large', label: 'OpenAI text-embedding-3-large', dim: 3072 },
  { id: 'text-embedding-3-small', label: 'OpenAI text-embedding-3-small', dim: 1536 },
  { id: 'voyage-large-2',         label: 'Voyage large-2',                dim: 1536 },
  { id: 'cohere-embed-v3',        label: 'Cohere embed-v3',               dim: 1024 },
];

export const CHUNK_STRATEGIES = [
  { id: 'semantic',  label: 'Semantic (recommended)' },
  { id: 'fixed',     label: 'Fixed size' },
  { id: 'recursive', label: 'Recursive' },
];

export const ACL_MODES = [
  { id: 'inherit-from-source', label: 'Inherit from source', desc: 'Respect ACLs from the source system (e.g. Confluence space permissions). Recommended.' },
  { id: 'allow-list',          label: 'Allow list',          desc: 'Only the groups listed below can query this source.' },
  { id: 'open',                label: 'Open to workspace',   desc: 'Everyone in the workspace can query. Not for sensitive data.' },
];

export const kindById = (id) => KIND_CATALOG.find(k => k.id === id);
