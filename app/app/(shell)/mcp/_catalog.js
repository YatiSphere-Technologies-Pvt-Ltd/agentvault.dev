/* Vendor presets for the add-server wizard.
   Each preset seeds transport / endpoint / auth kind / scope hints and a
   plausible mocked tool list for discovery. "Custom" lets users type any URL. */

export const VENDORS = [
  {
    id: 'custom',
    label: 'Custom server',
    blurb: 'Any MCP-compatible endpoint. You configure everything.',
    icon: 'plug',
    transport: 'streamable-http',
    endpoint: '',
    authKinds: ['oauth', 'bearer', 'header', 'mtls', 'none'],
    defaultAuth: 'bearer',
    scopes: [],
    mockTools: [],
  },
  {
    id: 'atlassian',
    label: 'Atlassian',
    blurb: 'Jira + Confluence + Bitbucket unified MCP gateway.',
    icon: 'plug',
    transport: 'streamable-http',
    endpoint: 'https://mcp.atlassian.com',
    authKinds: ['oauth'],
    defaultAuth: 'oauth',
    scopes: ['read:jira-work', 'write:jira-work', 'read:confluence-content', 'read:confluence-space'],
    mockTools: [
      { name: 'jira.search',          description: 'Search Jira issues by JQL.',                  riskLevel: 'low'  },
      { name: 'jira.create_issue',    description: 'Create a new Jira issue.',                    riskLevel: 'high' },
      { name: 'jira.add_comment',     description: 'Add a comment to an existing issue.',          riskLevel: 'med'  },
      { name: 'jira.transition',      description: 'Transition an issue to a new status.',         riskLevel: 'high' },
      { name: 'confluence.page.get',  description: 'Fetch a Confluence page by ID.',               riskLevel: 'low'  },
      { name: 'confluence.page.search', description: 'Search Confluence across spaces.',           riskLevel: 'low'  },
    ],
    mockResources: [{ uri: 'jira://issue/{key}', description: 'Jira issue resource by key.' }],
  },
  {
    id: 'github',
    label: 'GitHub',
    blurb: 'Repos, pull requests, issues, and actions.',
    icon: 'plug',
    transport: 'streamable-http',
    endpoint: 'https://api.githubcopilot.com/mcp',
    authKinds: ['oauth', 'bearer'],
    defaultAuth: 'oauth',
    scopes: ['repo', 'issues:read', 'pull_requests:write'],
    mockTools: [
      { name: 'repo.search',       description: 'Search repositories and code.',         riskLevel: 'low'  },
      { name: 'issue.get',         description: 'Fetch an issue by number.',              riskLevel: 'low'  },
      { name: 'issue.comment',     description: 'Post a comment on an issue.',            riskLevel: 'med'  },
      { name: 'pr.review',         description: 'Submit a PR review.',                     riskLevel: 'high' },
      { name: 'workflow.dispatch', description: 'Trigger a GitHub Actions workflow.',       riskLevel: 'high' },
    ],
  },
  {
    id: 'linear',
    label: 'Linear',
    blurb: 'Tickets, projects, cycles.',
    icon: 'plug',
    transport: 'streamable-http',
    endpoint: 'https://mcp.linear.app/sse',
    authKinds: ['oauth'],
    defaultAuth: 'oauth',
    scopes: ['read', 'write'],
    mockTools: [
      { name: 'issue.list',   description: 'List issues in a team.',     riskLevel: 'low'  },
      { name: 'issue.create', description: 'Create an issue.',            riskLevel: 'med'  },
      { name: 'issue.update', description: 'Update an issue status or assignee.', riskLevel: 'med' },
    ],
  },
  {
    id: 'figma',
    label: 'Figma',
    blurb: 'Read files, leave comments, export frames.',
    icon: 'plug',
    transport: 'streamable-http',
    endpoint: 'https://mcp.figma.com',
    authKinds: ['oauth', 'bearer'],
    defaultAuth: 'oauth',
    scopes: ['file_content:read', 'file_comments:write'],
    mockTools: [
      { name: 'file.get',      description: 'Fetch a Figma file by key.',                riskLevel: 'low' },
      { name: 'comment.add',   description: 'Post a comment on a frame.',                riskLevel: 'med' },
      { name: 'frame.export',  description: 'Export a frame as PNG / SVG / PDF.',        riskLevel: 'low' },
    ],
  },
  {
    id: 'stripe',
    label: 'Stripe',
    blurb: 'Payments, subscriptions, customers — read/write.',
    icon: 'plug',
    transport: 'streamable-http',
    endpoint: 'https://mcp.stripe.com/v1',
    authKinds: ['oauth', 'bearer'],
    defaultAuth: 'bearer',
    scopes: ['read_write'],
    mockTools: [
      { name: 'customer.search',  description: 'Search customers by email / ID.',   riskLevel: 'low'  },
      { name: 'charge.refund',    description: 'Issue a refund for a charge.',      riskLevel: 'high' },
      { name: 'subscription.cancel', description: 'Cancel a subscription.',          riskLevel: 'high' },
    ],
  },
  {
    id: 'notion',
    label: 'Notion',
    blurb: 'Databases, pages, comments.',
    icon: 'docs',
    transport: 'streamable-http',
    endpoint: 'https://mcp.notion.com',
    authKinds: ['oauth'],
    defaultAuth: 'oauth',
    scopes: ['read_content', 'update_content', 'read_comments'],
    mockTools: [
      { name: 'page.get',       description: 'Fetch a Notion page by ID.',                   riskLevel: 'low' },
      { name: 'page.update',    description: 'Patch page properties.',                        riskLevel: 'med' },
      { name: 'db.query',       description: 'Query a Notion database.',                      riskLevel: 'low' },
      { name: 'comment.post',   description: 'Add a comment to a page.',                      riskLevel: 'med' },
    ],
  },
  {
    id: 'sentry',
    label: 'Sentry',
    blurb: 'Errors, issues, releases.',
    icon: 'plug',
    transport: 'streamable-http',
    endpoint: 'https://mcp.sentry.dev',
    authKinds: ['oauth', 'bearer'],
    defaultAuth: 'oauth',
    scopes: ['project:read', 'event:read', 'issue:write'],
    mockTools: [
      { name: 'issue.list',    description: 'List unresolved issues in a project.', riskLevel: 'low' },
      { name: 'issue.resolve', description: 'Resolve an issue.',                      riskLevel: 'med' },
      { name: 'release.track', description: 'Attach a commit range to a release.',    riskLevel: 'low' },
    ],
  },
];

export const AUTH_KINDS = [
  { id: 'oauth',  label: 'OAuth 2.1',     blurb: 'User-delegated — per-user tokens via redirect flow.', recommended: true },
  { id: 'bearer', label: 'Bearer token',  blurb: 'Static service token stored in the vault.' },
  { id: 'header', label: 'Custom header', blurb: 'Arbitrary header + secret (e.g. X-API-Key).' },
  { id: 'mtls',   label: 'Mutual TLS',    blurb: 'Client certificate + private key from the vault.' },
  { id: 'none',   label: 'No auth',       blurb: 'Public endpoint. Internal networks only.' },
];

export const TRANSPORTS = [
  { id: 'streamable-http', label: 'Streamable HTTP', blurb: 'Single endpoint; server streams deltas. Most modern servers.' },
  { id: 'sse',             label: 'HTTP + SSE',      blurb: 'Older spec. /sse stream + POST tool calls.' },
  { id: 'stdio',           label: 'stdio (local)',   blurb: 'Launch a local process. Not for remote servers.' },
];

export const APPROVAL_POLICIES = [
  { id: 'per-tool', label: 'Per-tool',  desc: 'Each tool carries its own approval flag. Recommended.' },
  { id: 'always',   label: 'Always',    desc: 'Every call routes through human review.' },
  { id: 'never',    label: 'Never',     desc: 'Fully automated. High-risk tools still respect their own flag.' },
];

export const ACL_MODES = [
  { id: 'inherit',    label: 'Inherit',    desc: 'Respect the auth provider\'s own user/group scoping.' },
  { id: 'allow-list', label: 'Allow list', desc: 'Only listed SCIM groups can attach or call tools from this server.' },
];

export const vendorById = (id) => VENDORS.find(v => v.id === id) || VENDORS[0];
