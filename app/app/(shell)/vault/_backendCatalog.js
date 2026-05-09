/* Vault backend catalog
   ─────────────────────
   AgentVault is a *reference broker*, not a secret store. Every actual byte
   of a secret lives in a backend the customer connects — their cloud's
   secret manager or a self-hosted vault. The platform persists:

     1. Backend connection records (this catalog defines the shapes)
     2. Reference index — vault://... paths mapped to a backend + path-within-backend

   Six backends supported in the demo. Real implementations would call the
   relevant SDK per backend; the demo persists the wiring + metadata only. */

export const BACKEND_KINDS = [
  {
    id: 'builtin',
    label: 'AgentVault built-in vault',
    badge: 'Default',
    blurb: 'KMS-encrypted secret store inside your AgentVault VPC. Use this when you don\'t want to wire a cloud KMS. Free tier; per-secret pricing on enterprise plans.',
    docsUrl: '',
    requiresExternal: false,
    iconHint: 'lock',
    authFields: [],   // no credentials needed; managed by the platform
    options: [
      { name: 'region',     label: 'Region',     type: 'select', values: ['us-east-1', 'us-west-2', 'eu-west-1', 'ap-south-1'], default: 'us-east-1' },
      { name: 'kmsKeyArn',  label: 'KMS key ARN', type: 'text',  placeholder: 'arn:aws:kms:us-east-1:account:key/...', required: false },
    ],
    notes: [
      'Encrypted at rest with AWS KMS by default. BYOK supported on enterprise.',
      'Use this when you don\'t have an existing cloud secret manager.',
      'Migrating to a cloud backend later requires re-importing secrets — paths stay stable.',
    ],
    pathExample: 'vault://web-search/bing/key',
  },
  {
    id: 'azure-keyvault',
    label: 'Azure Key Vault',
    blurb: 'Microsoft\'s managed secret + cert store. Federate via Azure AD with workload identity for short-lived tokens; recommended over service-principal secrets.',
    docsUrl: 'https://learn.microsoft.com/azure/key-vault/',
    requiresExternal: true,
    iconHint: 'azure',
    authFields: [
      { name: 'authMethod',   label: 'Auth method', type: 'select',
        values: ['workload-identity', 'service-principal', 'managed-identity'], default: 'workload-identity', required: true,
        blurbPerValue: {
          'workload-identity':  'Federated workload identity — recommended.',
          'service-principal':  'Static client-id + client-secret. Older, broader audit log.',
          'managed-identity':   'Azure-assigned managed identity (no secrets to rotate).',
        }
      },
      { name: 'tenantId',     label: 'Tenant ID',         type: 'text', placeholder: '0e6c1ff3-...', required: true },
      { name: 'clientId',     label: 'Client ID',         type: 'text', placeholder: 'spn-or-uami-id', required: true },
      { name: 'clientSecret', label: 'Client secret',     type: 'text', placeholder: 'only for service-principal', secret: true, requiredIf: { authMethod: 'service-principal' } },
      { name: 'vaultUri',     label: 'Vault URI',         type: 'text', placeholder: 'https://my-kv.vault.azure.net', required: true },
    ],
    options: [
      { name: 'environment', label: 'Cloud',   type: 'select', values: ['AzurePublic', 'AzureUSGovernment', 'AzureChina'], default: 'AzurePublic' },
    ],
    notes: [
      'Workload identity needs a federated credential on the App Registration; AgentVault provides the OIDC issuer URL after the backend is created.',
      'Pricing: $0.03 per 10k operations. Versioning + soft-delete are free.',
      'Resolves paths like azkv://<vault-uri>/<secret-name>.',
    ],
    pathExample: 'vault://az/web-search/bing/key',
  },
  {
    id: 'aws-secrets-manager',
    label: 'AWS Secrets Manager',
    blurb: 'AWS\'s managed secret store with native rotation, automatic versioning, and tight IAM integration. Use IRSA / OIDC for keyless auth from AgentVault.',
    docsUrl: 'https://docs.aws.amazon.com/secretsmanager/',
    requiresExternal: true,
    iconHint: 'aws',
    authFields: [
      { name: 'authMethod', label: 'Auth method', type: 'select',
        values: ['oidc', 'access-key', 'instance-role'], default: 'oidc', required: true,
        blurbPerValue: {
          'oidc':         'OIDC web-identity federation — recommended. AgentVault assumes a role you specify.',
          'access-key':   'Static access-key + secret-key. Discouraged.',
          'instance-role':'EC2/EKS instance-attached role. Self-host AgentVault only.',
        }
      },
      { name: 'roleArn',     label: 'Role ARN',         type: 'text', placeholder: 'arn:aws:iam::ACCOUNT:role/agentvault-vault', required: true },
      { name: 'externalId',  label: 'External ID',      type: 'text', placeholder: 'AgentVault generates one for you', required: false },
      { name: 'accessKeyId', label: 'Access key ID',    type: 'text', placeholder: 'only for access-key', requiredIf: { authMethod: 'access-key' } },
      { name: 'secretKey',   label: 'Secret access key', type: 'text', secret: true, requiredIf: { authMethod: 'access-key' } },
    ],
    options: [
      { name: 'region',  label: 'Region',  type: 'select',
        values: ['us-east-1','us-east-2','us-west-1','us-west-2','eu-west-1','eu-west-2','eu-central-1','ap-south-1','ap-southeast-1','ap-northeast-1'],
        default: 'us-east-1' },
      { name: 'kmsKeyArn', label: 'KMS key ARN', type: 'text', placeholder: 'arn:aws:kms:...', required: false },
    ],
    notes: [
      'OIDC federation: paste the AgentVault OIDC issuer + audience into your IAM trust policy. No keys to rotate.',
      'Pricing: $0.40/secret/month + $0.05 per 10k API calls.',
      'Native rotation supported via Lambda — AgentVault detects new versions automatically.',
    ],
    pathExample: 'vault://aws/web-search/bing/key',
  },
  {
    id: 'gcp-secret-manager',
    label: 'GCP Secret Manager',
    blurb: 'Google Cloud\'s managed secret store. Use Workload Identity Federation from AgentVault\'s OIDC issuer to avoid service-account-key rotation entirely.',
    docsUrl: 'https://cloud.google.com/secret-manager/docs',
    requiresExternal: true,
    iconHint: 'gcp',
    authFields: [
      { name: 'authMethod',  label: 'Auth method', type: 'select',
        values: ['workload-identity', 'service-account-key'], default: 'workload-identity', required: true,
        blurbPerValue: {
          'workload-identity':   'Workload Identity Federation — recommended.',
          'service-account-key': 'Static JSON key. Discouraged; rotate often.',
        }
      },
      { name: 'projectId',     label: 'Project ID',                  type: 'text', placeholder: 'agentvault-prod', required: true },
      { name: 'workloadPool',  label: 'Workload identity pool',      type: 'text', placeholder: 'projects/.../workloadIdentityPools/agentvault', requiredIf: { authMethod: 'workload-identity' } },
      { name: 'serviceAccount',label: 'Service account email',       type: 'text', placeholder: 'agentvault@PROJECT.iam.gserviceaccount.com', required: true },
      { name: 'serviceKeyJson',label: 'Service account key JSON',    type: 'textarea', secret: true, requiredIf: { authMethod: 'service-account-key' } },
    ],
    options: [
      { name: 'replication', label: 'Replication', type: 'select', values: ['automatic', 'user-managed'], default: 'automatic' },
    ],
    notes: [
      'Workload Identity Federation needs a Provider configured against AgentVault\'s OIDC issuer.',
      'Pricing: $0.06/active secret/month + $0.03 per 10k access operations.',
    ],
    pathExample: 'vault://gcp/web-search/bing/key',
  },
  {
    id: 'hashicorp-vault',
    label: 'HashiCorp Vault',
    blurb: 'Self-hosted or HCP Vault. Strong policy engine, dynamic secrets, broad auth-method ecosystem. Best when you already operate Vault.',
    docsUrl: 'https://developer.hashicorp.com/vault/docs',
    requiresExternal: true,
    iconHint: 'hashi',
    authFields: [
      { name: 'authMethod', label: 'Auth method', type: 'select',
        values: ['approle', 'jwt-oidc', 'kubernetes', 'token'], default: 'approle', required: true,
        blurbPerValue: {
          'approle':    'AppRole with role-id + secret-id. Most common for service auth.',
          'jwt-oidc':   'JWT/OIDC against AgentVault\'s issuer. Keyless.',
          'kubernetes': 'Kubernetes auth method. Self-host AgentVault on K8s.',
          'token':      'Static token. Discouraged.',
        }
      },
      { name: 'address',    label: 'Vault address',   type: 'text', placeholder: 'https://vault.internal.corp', required: true },
      { name: 'namespace',  label: 'Namespace (Enterprise)', type: 'text', placeholder: 'admin/team-platform', required: false },
      { name: 'roleId',     label: 'Role ID',          type: 'text',   requiredIf: { authMethod: 'approle' } },
      { name: 'secretId',   label: 'Secret ID',        type: 'text', secret: true, requiredIf: { authMethod: 'approle' } },
      { name: 'role',       label: 'Role name',        type: 'text',   requiredIf: { authMethod: 'jwt-oidc' } },
      { name: 'token',      label: 'Token',            type: 'text', secret: true, requiredIf: { authMethod: 'token' } },
    ],
    options: [
      { name: 'mountPath', label: 'Mount path',   type: 'text', default: 'secret', placeholder: 'kv-v2 mount path' },
      { name: 'kvVersion', label: 'KV version',   type: 'select', values: ['v1', 'v2'], default: 'v2' },
      { name: 'caCertPem', label: 'CA cert (PEM)', type: 'textarea', placeholder: 'For self-signed Vault clusters', required: false },
    ],
    notes: [
      'For self-hosted Vault behind a firewall, configure outbound from AgentVault to your Vault address.',
      'KV-v2 is recommended (versioning, soft-delete). KV-v1 is supported for legacy mounts.',
    ],
    pathExample: 'vault://hashi/web-search/bing/key',
  },
  {
    id: 'onepassword',
    label: '1Password Secrets Automation',
    blurb: 'Connect-server based service-account auth. Useful for smaller teams who already store secrets in 1Password.',
    docsUrl: 'https://developer.1password.com/docs/connect/',
    requiresExternal: true,
    iconHint: 'onepassword',
    authFields: [
      { name: 'serviceAccountTokenRef', label: 'Service account token (vault ref)', type: 'text', secret: true, required: true,
        placeholder: 'ops_eyJ...' },
      { name: 'connectHost',  label: 'Connect server URL', type: 'text', placeholder: 'https://op-connect.internal', required: false },
    ],
    options: [
      { name: 'defaultVaultId', label: 'Default vault ID', type: 'text', required: true },
    ],
    notes: [
      'Service-account tokens are scoped to specific vaults — pick the narrowest scope.',
      'Pricing: included with 1Password Business and above.',
    ],
    pathExample: 'vault://1p/web-search/bing/key',
  },
];

export const SECRET_TYPES = [
  { id: 'api-key',      label: 'API key',        blurb: 'Long-lived static key.',                              icon: 'key' },
  { id: 'bearer-token', label: 'Bearer token',   blurb: 'Bearer token sent in HTTP Authorization header.',     icon: 'key' },
  { id: 'oauth-token',  label: 'OAuth token',    blurb: 'OAuth refresh + access token pair (auto-refreshed).', icon: 'shield' },
  { id: 'username-password', label: 'Username + password', blurb: 'Two-field credential.',                      icon: 'shield' },
  { id: 'tls-cert',     label: 'TLS certificate',blurb: 'PEM-encoded cert + key. Used for mTLS.',              icon: 'shield-check' },
  { id: 'ssh-key',      label: 'SSH private key',blurb: 'OpenSSH-format private key.',                          icon: 'key-square' },
  { id: 'gpg-key',      label: 'GPG private key',blurb: 'For artifact signing.',                                icon: 'key-square' },
  { id: 'json-blob',    label: 'JSON credentials',blurb: 'Service-account JSON or other structured credential.', icon: 'braces' },
];

export const REFERENCE_STATUSES = [
  { id: 'active',     label: 'Active',     tone: 'brand-teal' },
  { id: 'rotating',   label: 'Rotating',   tone: 'primary' },
  { id: 'expiring',   label: 'Expiring',   tone: 'accent' },
  { id: 'expired',    label: 'Expired',    tone: 'destructive' },
  { id: 'disabled',   label: 'Disabled',   tone: 'muted-foreground' },
];

/* ── Helpers ── */

export function backendKindById(id) {
  return BACKEND_KINDS.find(b => b.id === id) || BACKEND_KINDS[0];
}

export function backendTone(id) {
  switch (id) {
    case 'builtin':             return 'var(--brand-teal)';
    case 'azure-keyvault':      return 'var(--primary)';
    case 'aws-secrets-manager': return 'var(--accent)';
    case 'gcp-secret-manager':  return 'var(--brand-teal)';
    case 'hashicorp-vault':     return 'var(--primary)';
    case 'onepassword':         return 'var(--accent)';
    default:                    return 'var(--muted-foreground)';
  }
}

export function statusTone(id) {
  return REFERENCE_STATUSES.find(s => s.id === id)?.tone || 'muted-foreground';
}

export function statusColor(id) {
  const tone = statusTone(id);
  return tone === 'destructive' ? 'var(--destructive)'
       : tone === 'primary'      ? 'var(--primary)'
       : tone === 'accent'       ? 'var(--accent)'
       : tone === 'brand-teal'   ? 'var(--brand-teal)'
       :                            'var(--muted-foreground)';
}

export function secretTypeLabel(id) {
  return SECRET_TYPES.find(s => s.id === id)?.label || id;
}
