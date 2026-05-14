/* Source kinds the Context Engine can connect to.

   Each kind describes what an enterprise *data source* looks like at the
   platform level — distinct from the per-agent /app/knowledge sources which
   are file/url/saas-doc oriented. Context Engine sources lean toward
   warehouses, lakes, and structured systems where row-level ACLs and
   freshness SLAs actually matter.

   Each entry carries:
     id            — slug, used in URLs and the picker
     label         — display name
     family        — 'warehouse' | 'lake' | 'oltp' | 'saas' | 'docs'
     icon          — small svg name (drawn in _shared.jsx)
     blurb         — one-line marketing
     aclSupport    — ['row', 'column', 'tag', 'static']  what ACL strategies
                     this connector supports out of the box
     freshnessHint — typical SLA you'd set ('< 5min CDC' / '15min batch')
     auth          — fields for the connection form, vault-backed
     props         — extra config inputs (database, schema, dataset, prefix,
                     etc.) the user has to fill in
*/

export const SOURCE_FAMILIES = {
  warehouse: { label: 'Warehouse',        accent: '#3B5CFF' },
  lake:      { label: 'Lakehouse',        accent: '#10B981' },
  oltp:      { label: 'Operational DB',   accent: '#F59E0B' },
  saas:      { label: 'SaaS system',      accent: '#7C3AED' },
  docs:      { label: 'Document store',   accent: '#0891B2' },
};

export const SOURCE_CATALOG = [
  /* ── Warehouses ─────────────────────────────────────────── */
  {
    id: 'snowflake',
    label: 'Snowflake',
    family: 'warehouse',
    icon: 'snowflake',
    blurb: 'Connect a Snowflake warehouse with role-based row access carried into retrieval.',
    aclSupport: ['row', 'column', 'tag'],
    freshnessHint: '< 15min · scheduled refresh',
    auth: [
      { key: 'account',  label: 'Account identifier', placeholder: 'xy12345.us-east-1', required: true },
      { key: 'role',     label: 'Default role',       placeholder: 'AGENT_READ_RO',    required: true },
      { key: 'warehouse',label: 'Warehouse',          placeholder: 'COMPUTE_WH',       required: true },
      { key: 'credential', label: 'Credential', kind: 'vault-ref', required: true },
    ],
    props: [
      { key: 'database', label: 'Database', placeholder: 'ANALYTICS', required: true },
      { key: 'schema',   label: 'Schema',   placeholder: 'PUBLIC' },
    ],
  },
  {
    id: 'bigquery',
    label: 'BigQuery',
    family: 'warehouse',
    icon: 'bigquery',
    blurb: 'Pull from BigQuery datasets with IAM-mapped ACLs and partition-aware sync.',
    aclSupport: ['row', 'column'],
    freshnessHint: '< 30min · partition-aware CDC',
    auth: [
      { key: 'project',     label: 'GCP project',  placeholder: 'agentvault-prod',     required: true },
      { key: 'serviceAcct', label: 'Service account', kind: 'vault-ref', required: true },
    ],
    props: [
      { key: 'dataset',  label: 'Dataset',  placeholder: 'analytics', required: true },
      { key: 'location', label: 'Location', placeholder: 'US' },
    ],
  },
  {
    id: 'databricks',
    label: 'Databricks',
    family: 'lake',
    icon: 'databricks',
    blurb: 'Unity Catalog-aware ingestion from Delta tables with column masking.',
    aclSupport: ['row', 'column', 'tag'],
    freshnessHint: '< 10min · CDC via Delta',
    auth: [
      { key: 'workspaceUrl', label: 'Workspace URL', placeholder: 'https://acme.cloud.databricks.com', required: true },
      { key: 'token',        label: 'PAT', kind: 'vault-ref', required: true },
    ],
    props: [
      { key: 'catalog', label: 'Unity Catalog', placeholder: 'main',     required: true },
      { key: 'schema',  label: 'Schema',        placeholder: 'analytics' },
    ],
  },
  {
    id: 'redshift',
    label: 'Redshift',
    family: 'warehouse',
    icon: 'redshift',
    blurb: 'AWS Redshift with column-level grants forwarded into the retrieval layer.',
    aclSupport: ['row', 'column'],
    freshnessHint: '15–30min · scheduled',
    auth: [
      { key: 'cluster', label: 'Cluster endpoint', placeholder: 'my-cluster.abc123.us-east-1.redshift.amazonaws.com', required: true },
      { key: 'iam',     label: 'IAM role ARN', placeholder: 'arn:aws:iam::123:role/RedshiftAgentRO', required: true },
      { key: 'credential', label: 'Credential', kind: 'vault-ref', required: true },
    ],
    props: [
      { key: 'database', label: 'Database', placeholder: 'analytics', required: true },
      { key: 'schema',   label: 'Schema',   placeholder: 'public' },
    ],
  },

  /* ── Lakehouses / object stores ─────────────────────────── */
  {
    id: 's3-iceberg',
    label: 'Iceberg on S3',
    family: 'lake',
    icon: 'iceberg',
    blurb: 'Apache Iceberg tables on S3, schema-aware with snapshot isolation.',
    aclSupport: ['row', 'tag'],
    freshnessHint: '5–15min · snapshot-driven',
    auth: [
      { key: 'catalog', label: 'Iceberg catalog URI', placeholder: 'https://glue.us-east-1.amazonaws.com/v1', required: true },
      { key: 'role',    label: 'IAM role ARN',         placeholder: 'arn:aws:iam::123:role/IcebergRO',     required: true },
      { key: 'credential', label: 'Credential', kind: 'vault-ref', required: true },
    ],
    props: [
      { key: 'namespace', label: 'Namespace', placeholder: 'analytics.fct', required: true },
    ],
  },
  {
    id: 's3-objects',
    label: 'S3 (raw objects)',
    family: 'lake',
    icon: 's3',
    blurb: 'Plain S3 prefixes — Parquet, JSONL, CSV. Path-glob and prefix-based ACL.',
    aclSupport: ['tag', 'static'],
    freshnessHint: '15min · scheduled scan',
    auth: [
      { key: 'role',       label: 'IAM role ARN',  placeholder: 'arn:aws:iam::123:role/S3RO', required: true },
      { key: 'credential', label: 'Credential',    kind: 'vault-ref', required: true },
    ],
    props: [
      { key: 'bucket', label: 'Bucket', placeholder: 'agentvault-corpora', required: true },
      { key: 'prefix', label: 'Prefix', placeholder: 'invoices/2026/' },
      { key: 'format', label: 'Format', type: 'select', options: ['parquet', 'jsonl', 'csv'], required: true },
    ],
  },

  /* ── OLTP / Operational ─────────────────────────────────── */
  {
    id: 'postgres',
    label: 'Postgres',
    family: 'oltp',
    icon: 'postgres',
    blurb: 'Postgres with logical replication for sub-minute CDC and RLS-aware reads.',
    aclSupport: ['row', 'column'],
    freshnessHint: '< 1min · logical CDC',
    auth: [
      { key: 'host', label: 'Host', placeholder: 'db.acme.internal', required: true },
      { key: 'port', label: 'Port', placeholder: '5432', type: 'number' },
      { key: 'credential', label: 'Credential', kind: 'vault-ref', required: true },
    ],
    props: [
      { key: 'database',   label: 'Database',   placeholder: 'app',    required: true },
      { key: 'replication', label: 'Replication slot', placeholder: 'agentvault_slot' },
    ],
  },
  {
    id: 'mongo',
    label: 'MongoDB',
    family: 'oltp',
    icon: 'mongo',
    blurb: 'Change-stream backed sync from MongoDB with collection-level scoping.',
    aclSupport: ['static'],
    freshnessHint: '< 1min · change streams',
    auth: [
      { key: 'connStr',    label: 'Connection string', placeholder: 'mongodb+srv://…', required: true },
      { key: 'credential', label: 'Credential',         kind: 'vault-ref', required: true },
    ],
    props: [
      { key: 'database',    label: 'Database',     placeholder: 'app', required: true },
      { key: 'collections', label: 'Collections',  placeholder: 'invoices, vendors' },
    ],
  },

  /* ── SaaS systems ───────────────────────────────────────── */
  {
    id: 'salesforce',
    label: 'Salesforce',
    family: 'saas',
    icon: 'salesforce',
    blurb: 'Sync Account, Opportunity, and custom objects with profile-aware field-level security.',
    aclSupport: ['row', 'column'],
    freshnessHint: '5min · platform events',
    auth: [
      { key: 'instance',   label: 'Instance URL', placeholder: 'https://acme.my.salesforce.com', required: true },
      { key: 'credential', label: 'OAuth refresh token', kind: 'vault-ref', required: true },
    ],
    props: [
      { key: 'objects', label: 'Objects', placeholder: 'Account, Opportunity, Case', required: true },
    ],
  },
  {
    id: 'servicenow',
    label: 'ServiceNow',
    family: 'saas',
    icon: 'servicenow',
    blurb: 'Tickets, KB articles, and CMDB items via the Table API.',
    aclSupport: ['row', 'tag'],
    freshnessHint: '10min · table API polling',
    auth: [
      { key: 'instance',   label: 'Instance', placeholder: 'acme.service-now.com', required: true },
      { key: 'credential', label: 'Credential', kind: 'vault-ref', required: true },
    ],
    props: [
      { key: 'tables', label: 'Tables', placeholder: 'incident, kb_knowledge', required: true },
    ],
  },

  /* ── Document stores ─────────────────────────────────────── */
  {
    id: 'sharepoint',
    label: 'SharePoint',
    family: 'docs',
    icon: 'sharepoint',
    blurb: 'M365 document libraries with site-permissions translated to source ACLs.',
    aclSupport: ['row', 'tag'],
    freshnessHint: '15min · webhook + scan',
    auth: [
      { key: 'tenantId', label: 'Tenant ID', placeholder: '00000000-0000-0000-0000-000000000000', required: true },
      { key: 'credential', label: 'Credential', kind: 'vault-ref', required: true },
    ],
    props: [
      { key: 'siteUrl',   label: 'Site URL',   placeholder: 'https://acme.sharepoint.com/sites/eng', required: true },
      { key: 'libraries', label: 'Libraries',  placeholder: 'Documents, Runbooks' },
    ],
  },
  {
    id: 'confluence',
    label: 'Confluence',
    family: 'docs',
    icon: 'confluence',
    blurb: 'Spaces and pages with page-restriction-aware visibility.',
    aclSupport: ['row', 'tag'],
    freshnessHint: '5min · webhook + diff',
    auth: [
      { key: 'workspaceUrl', label: 'Workspace URL', placeholder: 'https://acme.atlassian.net', required: true },
      { key: 'credential',   label: 'Credential', kind: 'vault-ref', required: true },
    ],
    props: [
      { key: 'spaces', label: 'Spaces', placeholder: 'ENG, PRODUCT, KB', required: true },
      { key: 'labels', label: 'Include labels', placeholder: 'kb, handbook' },
    ],
  },
];

export function sourceById(id) {
  return SOURCE_CATALOG.find(s => s.id === id) || null;
}

/* ──────────────── chunking + embedding catalogs ────────────── */

export const CHUNKING_STRATEGIES = [
  { id: 'fixed',     label: 'Fixed window',     defaultSize: 800,  defaultOverlap: 100, hint: 'Simple. Good for prose.' },
  { id: 'semantic',  label: 'Semantic split',   defaultSize: 1200, defaultOverlap: 0,   hint: 'Splits on sentence/section boundaries.' },
  { id: 'structured', label: 'Structured (rows)', defaultSize: 1, defaultOverlap: 0,    hint: 'One chunk per row — for tabular sources.' },
  { id: 'parent-child', label: 'Parent-child',  defaultSize: 800,  defaultOverlap: 100, hint: 'Small chunks for retrieval, parent context for the LLM.' },
];

export const EMBEDDING_MODELS = [
  { id: 'text-embedding-3-large', label: 'OpenAI text-embedding-3-large', dim: 3072, vendor: 'openai',    cost: 0.13 },
  { id: 'text-embedding-3-small', label: 'OpenAI text-embedding-3-small', dim: 1536, vendor: 'openai',    cost: 0.02 },
  { id: 'voyage-3',               label: 'Voyage AI voyage-3',            dim: 1024, vendor: 'voyageai',  cost: 0.06 },
  { id: 'cohere-embed-v3',        label: 'Cohere embed-v3',               dim: 1024, vendor: 'cohere',    cost: 0.10 },
  { id: 'bge-large-en',           label: 'BGE-large-en (BYO model)',      dim: 1024, vendor: 'self',      cost: 0.00 },
];

export const RERANKERS = [
  { id: 'none',       label: 'None' },
  { id: 'cohere-rr',  label: 'Cohere rerank-english-v3' },
  { id: 'voyage-rr',  label: 'Voyage rerank-2' },
  { id: 'bge-rr',     label: 'BGE rerank-base (self-hosted)' },
];

/* Sample query-language for the playground (slice 2). */
export const SAMPLE_QUERIES = [
  'top vendors by spend last quarter',
  'invoices missing PO number for vendor Acme',
  'sanctioned counterparties matching Northstar',
  'GDPR DSAR requests open more than 15 days',
];
