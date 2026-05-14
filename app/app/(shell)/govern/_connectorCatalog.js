/* Connectors that feed the AI control plane.
   ─────────────────────────────────────────
   Each connector pulls signals from a different upstream — proxy, CASB,
   browser endpoint, SaaS admin API, SIEM, IDE — and the platform turns
   those into discovery events + inventory rows.

   At the demo level a connector is a config record; in production each
   would be a backend microservice with its own ingestion pipeline. The UI
   here is the same pattern as the MCP connect flow. */

export const CONNECTOR_FAMILIES = {
  proxy:    { label: 'Network proxy / SWG', accent: '#3B5CFF' },
  casb:     { label: 'CASB',                 accent: '#7C3AED' },
  endpoint: { label: 'Endpoint / Browser',   accent: '#10B981' },
  ide:      { label: 'IDE / Code',            accent: '#0891B2' },
  saas:     { label: 'SaaS admin API',       accent: '#F59E0B' },
  siem:     { label: 'SIEM / log lake',      accent: '#E11D48' },
  cloud:    { label: 'Cloud audit',          accent: '#6366F1' },
  identity: { label: 'Identity provider',    accent: '#8B5CF6' },
};

export const CONNECTOR_CATALOG = [
  /* ── Network proxy / SWG ─────────────────────────────────── */
  {
    id: 'zscaler',
    label: 'Zscaler ZIA',
    family: 'proxy',
    blurb: 'Pull cloud-proxy logs to detect outbound traffic to public LLM endpoints.',
    signals: ['user', 'destination', 'payload-size', 'category', 'tls-fingerprint'],
    auth: [
      { key: 'tenantId',   label: 'Tenant ID',    placeholder: 'acme.zscalerzero.net', required: true },
      { key: 'credential', label: 'API token',    kind: 'vault-ref', required: true },
    ],
  },
  {
    id: 'netskope',
    label: 'Netskope',
    family: 'casb',
    blurb: 'Cloud-native CASB — already classifies AI SaaS, just authorize the API.',
    signals: ['user', 'app', 'risk-tag', 'data-category', 'action'],
    auth: [
      { key: 'tenantHost', label: 'Tenant host', placeholder: 'example.goskope.com', required: true },
      { key: 'credential', label: 'API token',    kind: 'vault-ref', required: true },
    ],
  },
  {
    id: 'palo-alto',
    label: 'Palo Alto Prisma Access',
    family: 'proxy',
    blurb: 'Egress logs from Prisma — hostname, app-id, user, bytes.',
    signals: ['user', 'app-id', 'destination', 'bytes', 'verdict'],
    auth: [
      { key: 'pano',       label: 'Panorama URL', placeholder: 'https://panorama.acme.internal', required: true },
      { key: 'credential', label: 'Service account', kind: 'vault-ref', required: true },
    ],
  },
  {
    id: 'cloudflare-zt',
    label: 'Cloudflare Zero Trust',
    family: 'proxy',
    blurb: 'Gateway logs + Browser Isolation. Cheap to deploy, broad coverage.',
    signals: ['user', 'destination', 'http-host', 'category'],
    auth: [
      { key: 'accountId',  label: 'Account ID',  placeholder: 'cf_account_xxx', required: true },
      { key: 'credential', label: 'API token',    kind: 'vault-ref', required: true },
    ],
  },

  /* ── Endpoint / Browser ─────────────────────────────────── */
  {
    id: 'browser-ext',
    label: 'AgentVault browser extension',
    family: 'endpoint',
    blurb: 'First-party browser extension. Sees prompts before they leave the device.',
    signals: ['prompt', 'user', 'destination', 'redaction-suggestions'],
    auth: [
      { key: 'distribution', label: 'Distribution', type: 'select', options: ['Chrome MDM', 'Edge MDM', 'Firefox policy', 'Manual'], required: true },
    ],
  },
  {
    id: 'crowdstrike',
    label: 'CrowdStrike Falcon',
    family: 'endpoint',
    blurb: 'Process telemetry — detect AI desktop apps, IDE plugins, browser AI extensions.',
    signals: ['process', 'binary-hash', 'user', 'connection'],
    auth: [
      { key: 'cloudUrl',   label: 'Cloud URL',  placeholder: 'https://api.crowdstrike.com', required: true },
      { key: 'credential', label: 'OAuth client', kind: 'vault-ref', required: true },
    ],
  },
  {
    id: 'defender-cloud-apps',
    label: 'Defender for Cloud Apps',
    family: 'casb',
    blurb: 'Microsoft CASB — already maps OAuth apps and risky third-party AI tools.',
    signals: ['app', 'user', 'risk-score', 'permissions'],
    auth: [
      { key: 'tenantId',   label: 'Tenant ID',    placeholder: '00000000-0000-0000-0000-000000000000', required: true },
      { key: 'credential', label: 'App registration', kind: 'vault-ref', required: true },
    ],
  },

  /* ── IDE / Code ─────────────────────────────────────────── */
  {
    id: 'github-copilot',
    label: 'GitHub Copilot admin',
    family: 'ide',
    blurb: 'Seat assignments + usage analytics from the GitHub Copilot Business API.',
    signals: ['user', 'seat', 'editor', 'language', 'completions'],
    auth: [
      { key: 'org',        label: 'GitHub org', placeholder: 'acme-corp', required: true },
      { key: 'credential', label: 'Admin PAT',  kind: 'vault-ref', required: true },
    ],
  },
  {
    id: 'cursor',
    label: 'Cursor for Business',
    family: 'ide',
    blurb: 'Seat + usage telemetry from the Cursor admin API.',
    signals: ['user', 'seat', 'feature', 'tokens'],
    auth: [
      { key: 'workspace',  label: 'Workspace',  placeholder: 'acme', required: true },
      { key: 'credential', label: 'Admin token', kind: 'vault-ref', required: true },
    ],
  },

  /* ── SaaS admin / cloud / identity ─────────────────────── */
  {
    id: 'azure-openai-audit',
    label: 'Azure OpenAI audit',
    family: 'cloud',
    blurb: 'Diagnostic settings on Azure OpenAI deployments — calls, prompts, completions.',
    signals: ['deployment', 'caller', 'tokens-in', 'tokens-out', 'cost'],
    auth: [
      { key: 'subscriptionId', label: 'Subscription ID', placeholder: '00000000-…', required: true },
      { key: 'credential',     label: 'Service principal', kind: 'vault-ref', required: true },
    ],
  },
  {
    id: 'okta',
    label: 'Okta',
    family: 'identity',
    blurb: 'OAuth grants + system log — discover when employees authorize AI apps.',
    signals: ['user', 'grant', 'oauth-app', 'scopes'],
    auth: [
      { key: 'orgUrl',     label: 'Org URL',    placeholder: 'https://acme.okta.com', required: true },
      { key: 'credential', label: 'API token',  kind: 'vault-ref', required: true },
    ],
  },
  {
    id: 'slack',
    label: 'Slack admin API',
    family: 'saas',
    blurb: 'Discover AI bots, summary features, and apps installed by users.',
    signals: ['workspace', 'app', 'installer', 'permissions'],
    auth: [
      { key: 'workspace',  label: 'Workspace',  placeholder: 'acme.slack.com', required: true },
      { key: 'credential', label: 'Admin token', kind: 'vault-ref', required: true },
    ],
  },
  {
    id: 'splunk',
    label: 'Splunk Cloud',
    family: 'siem',
    blurb: 'Pull AI-relevant search results — DNS lookups, proxy lines, EDR events.',
    signals: ['raw-event', 'index', 'sourcetype'],
    auth: [
      { key: 'host',       label: 'Splunk host', placeholder: 'acme.splunkcloud.com', required: true },
      { key: 'credential', label: 'HEC token',   kind: 'vault-ref', required: true },
    ],
  },
];

export function connectorById(id) {
  return CONNECTOR_CATALOG.find(c => c.id === id) || null;
}

/* ──────────── asset + risk classifiers ────────────── */

export const ASSET_TYPES = {
  'internal-agent':   { label: 'Internal agent',     hint: 'AgentVault-managed agent', accent: '#3B5CFF' },
  'external-saas':    { label: 'External SaaS',      hint: 'Public AI service',         accent: '#E11D48' },
  'copilot-seat':     { label: 'Copilot seat',       hint: 'Coding assistant seat',     accent: '#0891B2' },
  'browser-extension':{ label: 'Browser extension',  hint: 'In-browser AI helper',      accent: '#F59E0B' },
  'oauth-app':        { label: 'OAuth app',          hint: 'AI app granted SSO scope',  accent: '#7C3AED' },
  'byo-llm':          { label: 'BYO LLM',            hint: 'Self-hosted model',         accent: '#10B981' },
  'personal-account': { label: 'Personal account',   hint: 'Employee personal AI',      accent: '#E11D48' },
  'saas-feature':     { label: 'SaaS AI feature',    hint: 'AI built into a tool',      accent: '#6366F1' },
};

export const RISK_CLASSES = {
  restricted: { label: 'Restricted', accent: '#E11D48', score: 4 },
  high:       { label: 'High',       accent: '#F59E0B', score: 3 },
  standard:   { label: 'Standard',   accent: '#3B5CFF', score: 2 },
  low:        { label: 'Low',        accent: '#10B981', score: 1 },
};

export const APPROVAL_STATES = {
  approved:    { label: 'Approved',    accent: '#10B981' },
  pending:     { label: 'Pending',     accent: '#F59E0B' },
  quarantined: { label: 'Quarantined', accent: '#E11D48' },
  blocked:     { label: 'Blocked',     accent: '#E11D48' },
  unknown:     { label: 'Unknown',     accent: '#6B7280' },
};

export const DATA_CATEGORIES = [
  'source-code', 'customer-pii', 'financial', 'legal', 'health-phi',
  'contracts', 'credentials', 'business-strategy', 'employee-data',
];

export const DESTINATION_CLASSES = {
  'public-llm':       { label: 'Public LLM',       accent: '#E11D48' },
  'enterprise-saas':  { label: 'Enterprise SaaS',  accent: '#3B5CFF' },
  'internal-agent':   { label: 'Internal agent',   accent: '#10B981' },
  'sandbox':          { label: 'Sandbox',          accent: '#7C3AED' },
};
