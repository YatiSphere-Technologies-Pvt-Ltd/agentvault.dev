/* Static catalogs used by the builder: models, starter tools, MCP servers,
   prompt snippets, and connector sources for Knowledge. */

export const MODELS = [
  { id: 'claude-3-5-sonnet',   family: 'Anthropic', label: 'Claude 3.5 Sonnet',   ctx: '200k', inPrice: 3.00, outPrice: 15.00, tags: ['quality', 'tools'] },
  { id: 'claude-3-5-haiku',    family: 'Anthropic', label: 'Claude 3.5 Haiku',    ctx: '200k', inPrice: 0.80, outPrice:  4.00, tags: ['speed', 'cost'] },
  { id: 'gpt-4o',              family: 'OpenAI',    label: 'GPT-4o',              ctx: '128k', inPrice: 2.50, outPrice: 10.00, tags: ['quality'] },
  { id: 'gpt-4o-mini',         family: 'OpenAI',    label: 'GPT-4o mini',         ctx: '128k', inPrice: 0.15, outPrice:  0.60, tags: ['cost', 'speed'] },
  { id: 'gemini-1.5-pro',      family: 'Google',    label: 'Gemini 1.5 Pro',      ctx:   '2M', inPrice: 1.25, outPrice:  5.00, tags: ['long-context'] },
  { id: 'llama-3.3-70b',       family: 'Meta',      label: 'Llama 3.3 70B',       ctx: '128k', inPrice: 0.40, outPrice:  0.40, tags: ['open-source', 'self-host'] },
  { id: 'mistral-large-latest',family: 'Mistral',   label: 'Mistral Large',       ctx: '128k', inPrice: 2.00, outPrice:  6.00, tags: ['quality'] },
];

export const TOOL_CATALOG = [
  { id: 'web.search',     label: 'Web search',     kind: 'Built-in',  desc: 'Search the public web and cite sources.',          icon: 'globe',   risk: 'low' },
  { id: 'code.exec',      label: 'Code interpreter', kind: 'Built-in',desc: 'Execute Python in a sandboxed runtime.',           icon: 'code',    risk: 'med' },
  { id: 'calc',           label: 'Calculator',     kind: 'Built-in',  desc: 'Exact arithmetic and unit conversion.',            icon: 'calc',   risk: 'low' },
  { id: 'sql',            label: 'SQL query',      kind: 'Built-in',  desc: 'Run parameterized queries on connected warehouses.', icon: 'db',   risk: 'med' },
  { id: 'http',           label: 'HTTP request',   kind: 'Built-in',  desc: 'Call any REST endpoint with scoped credentials.',  icon: 'globe',  risk: 'med' },
  { id: 'files',          label: 'File ops',       kind: 'Built-in',  desc: 'Read / write files in connected buckets.',         icon: 'docs',   risk: 'med' },
  { id: 'email.send',     label: 'Send email',     kind: 'Built-in',  desc: 'Send via your connected mailer.',                   icon: 'mail',   risk: 'high' },
  { id: 'cal.create',     label: 'Create calendar event', kind: 'Built-in', desc: 'Book time on a connected calendar.',         icon: 'clock',  risk: 'med' },
  { id: 'slack.post',     label: 'Slack: post',    kind: 'Integration', desc: 'Post to a channel, optionally with approval.',   icon: 'chat',   risk: 'med' },
  { id: 'salesforce.update', label: 'Salesforce: update', kind: 'Integration', desc: 'Update an SObject by ID.',                icon: 'plug',   risk: 'high' },
  { id: 'netsuite.post',  label: 'NetSuite: post bill', kind: 'Integration', desc: 'Post a vendor bill to NetSuite.',            icon: 'plug',   risk: 'high' },
  { id: 'snowflake.query',label: 'Snowflake query', kind: 'Integration', desc: 'Parameterized read on your warehouse.',          icon: 'db',     risk: 'low' },
];

export const MCP_SERVERS = [
  { id: 'mcp.atlassian',  label: 'Atlassian MCP',  url: 'https://mcp.atlassian.com',  tools: ['jira.search', 'jira.comment', 'confluence.page.get'] },
  { id: 'mcp.github',     label: 'GitHub MCP',     url: 'https://api.github.com/mcp',  tools: ['repo.search', 'pr.review', 'issue.comment'] },
  { id: 'mcp.figma',      label: 'Figma MCP',      url: 'https://mcp.figma.com',      tools: ['file.get', 'comment.add'] },
];

export const PROMPT_SNIPPETS = [
  { id: 'tone.enterprise',  label: 'Enterprise tone',         body: 'Be concise, precise, and never speculative. Use present tense. If you do not know, say so.' },
  { id: 'cite.sources',     label: 'Cite sources',            body: 'Always cite retrieved sources as inline numeric references like [1], [2].' },
  { id: 'refuse.unsafe',    label: 'Refuse unsafe requests',  body: 'If a request conflicts with our safety policy, refuse politely and suggest a compliant alternative.' },
  { id: 'format.json',      label: 'Return JSON only',        body: 'Return ONLY the JSON document described in the schema. No prose. No code fences.' },
  { id: 'vars.demo',        label: 'Insert user + org vars',  body: 'User: {{user.name}} — Org: {{org.name}} — TZ: {{org.timezone}} — Date: {{date}}' },
];

export const KNOWLEDGE_CONNECTORS = [
  { id: 'connector.confluence', label: 'Confluence',  icon: 'docs' },
  { id: 'connector.notion',     label: 'Notion',      icon: 'docs' },
  { id: 'connector.sharepoint', label: 'SharePoint',  icon: 'docs' },
  { id: 'connector.gdrive',     label: 'Google Drive',icon: 'docs' },
  { id: 'connector.s3',         label: 'Amazon S3',   icon: 'plug' },
  { id: 'connector.snowflake',  label: 'Snowflake',   icon: 'db' },
];

export const ICONS = ['sparkles', 'shield', 'docs', 'braces', 'globe', 'clock', 'plug', 'db', 'code', 'chat', 'mail'];
