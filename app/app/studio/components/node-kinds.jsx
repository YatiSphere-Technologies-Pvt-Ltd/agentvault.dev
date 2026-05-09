export const NODE_KINDS = {
  trigger: {
    label: 'Trigger',
    category: 'Triggers',
    accent: 'accent',
    shape: 'pill',
    desc: 'Kicks off the workflow.',
    variants: [
      { id: 'trigger.webhook',  label: 'Webhook',   sub: 'POST endpoint',  icon: 'webhook' },
      { id: 'trigger.schedule', label: 'Schedule',  sub: 'cron',           icon: 'clock' },
      { id: 'trigger.event',    label: 'Event bus', sub: 'subscribe',      icon: 'radio' },
    ],
    defaultParams: (variant) => ({
      method: 'POST',
      path: '/run',
      schema: '{ "invoice_id": "string" }',
      auth: 'bearer',
      ...(variant === 'trigger.schedule' && { cron: '0 */4 * * *', tz: 'UTC' }),
    }),
  },
  llm: {
    label: 'LLM',
    category: 'AI',
    accent: 'primary',
    shape: 'hex',
    desc: 'Call a language model.',
    variants: [
      { id: 'llm.chat',     label: 'Chat',     sub: 'multi-turn',      icon: 'sparkles' },
      { id: 'llm.classify', label: 'Classify', sub: 'structured out',  icon: 'tag' },
      { id: 'llm.extract',  label: 'Extract',  sub: 'JSON schema',     icon: 'braces' },
    ],
    defaultParams: (variant) => {
      if (variant === 'llm.chat') {
        return {
          provider: 'anthropic',
          model: 'claude-sonnet-4-6',
          system: 'You are a helpful enterprise agent. Be concise and cite sources when applicable.',
          messages: [
            { role: 'user', content: '{{input.text}}' },
          ],
          // decoding
          temperature: 0.2,
          top_p: 1,
          max_tokens: 1024,
          stop: [],
          seed: null,
          // shape of the response
          response_format: 'text',          // 'text' | 'json_object' | 'json_schema'
          json_schema: '',
          // tool use (declarative; actual tool wiring happens via downstream nodes)
          tool_choice: 'auto',              // 'auto' | 'none' | 'required'
          // operational
          stream: true,
          prompt_cache: true,
          retries: 2,
          fallback_model: '',               // empty = none
          timeout_s: 30,
          budget_usd: 0.10,
        };
      }
      return {
        model: 'gpt-4o-mini',
        temperature: 0.2,
        max_tokens: 512,
        system: 'You are a helpful agent.',
        prompt: '{{input.text}}',
        ...(variant === 'llm.extract' && { schema: '{ "total": "number", "vendor": "string" }' }),
      };
    },
  },
  agent: {
    label: 'Agent',
    category: 'AI',
    accent: 'primary',
    shape: 'hex',
    desc: 'Sub-agent from your registry, or an autonomous tool-using agent.',
    variants: [
      { id: 'agent.autonomous', label: 'Autonomous',    sub: 'tool loop',  icon: 'agent' },
      { id: 'agent.registry',   label: 'Registry agent', sub: 'versioned', icon: 'agent' },
    ],
    defaultParams: (variant) => {
      if (variant === 'agent.autonomous') {
        return {
          provider: 'anthropic',
          model: 'claude-sonnet-4-6',
          // Goal-oriented: this is what the agent tries to accomplish for each
          // invocation. References context.* (declared in context_map below).
          goal: 'Process the inbound request in context.text. Use the tools you have to answer accurately, then return a structured summary.',
          system: 'You are an autonomous enterprise agent. Plan, choose tools, observe results, and continue until the goal is met. Cite tool outputs in your final answer.',
          // Input mapping (§2b). Declared field names → upstream sources.
          // The agent only sees context.<field>; it cannot reach for arbitrary
          // upstream values. Refactor-safe and auditable.
          context_map: [
            { field: 'text', source: '{{trigger.text}}' },
          ],
          // Output schema (§2a). The agent's `result` MUST conform to this.
          // Format here is the lo-fi "shorthand" we already use elsewhere
          // (string keys → type names). The runner validates against it.
          returns: '{\n  "answer": "string",\n  "confidence": "number",\n  "needs_human": "boolean"\n}',
          // Tool registry — the set of tools this agent can choose from at
          // runtime. Each entry references one of the catalog ids below.
          tools: ['http.get', 'slack.post', 'snowflake.query'],
          // Loop control
          termination: 'goal_or_steps',     // 'max_steps' | 'goal_met' | 'goal_or_steps' | 'external_signal'
          max_steps: 8,
          require_goal_check: true,
          // Decoding
          temperature: 0.3,
          max_tokens: 1024,
          // Operational
          parallel_tools: true,
          show_thinking: true,
          retries: 2,
          timeout_s: 60,
          budget_usd: 0.50,
          stop_on_error: false,
          // Human-in-the-loop approval points. Each entry pauses the agent
          // (synchronously or post-hoc) and waits for a human decision. See
          // _approvals.js for the full schema. Default ships empty — most
          // agents don't need approvals; templates layer them in.
          approvals: [],
        };
      }
      return {
        agent_id: 'ap-triage@v2',
        timeout_s: 30,
        budget_usd: 0.50,
      };
    },
  },
  tool: {
    label: 'Tool',
    category: 'Integrations',
    accent: 'primary',
    shape: 'rect',
    desc: 'Call an external API or connector.',
    variants: [
      { id: 'tool.http',       label: 'HTTP',       sub: 'any REST',       icon: 'globe' },
      { id: 'tool.salesforce', label: 'Salesforce', sub: 'SObject',        icon: 'plug' },
      { id: 'tool.netsuite',   label: 'NetSuite',   sub: 'bill / vendor',  icon: 'plug' },
      { id: 'tool.snowflake',  label: 'Snowflake',  sub: 'query',          icon: 'db' },
      { id: 'tool.slack',      label: 'Slack',      sub: 'post message',   icon: 'chat' },
    ],
    defaultParams: (variant) => ({
      method: 'POST',
      url: 'https://api.example.com/endpoint',
      body: '{ "amount": {{input.total}} }',
      ...(variant === 'tool.snowflake' && { warehouse: 'AGENT_WH', sql: 'SELECT * FROM vendors WHERE id = {{input.vendor_id}}' }),
      ...(variant === 'tool.slack' && { channel: '#ops-approvals', template: 'New invoice {{input.id}}' }),
    }),
  },
  human: {
    label: 'Human',
    category: 'Flow',
    accent: 'accent',
    shape: 'circle',
    desc: 'Request human approval.',
    variants: [
      { id: 'human.slack',  label: 'Slack approval', sub: 'thumbs up', icon: 'user' },
      { id: 'human.email',  label: 'Email approval', sub: 'link',      icon: 'mail' },
    ],
    defaultParams: () => ({
      approvers: 'finance-managers',
      timeout_h: 24,
      escalate_to: 'cfo-office',
    }),
  },
  policy: {
    label: 'Policy',
    category: 'Flow',
    accent: 'foreground',
    shape: 'diamond',
    desc: 'Policy-as-code gate.',
    variants: [
      { id: 'policy.cedar', label: 'Cedar', sub: 'allow/deny', icon: 'shield' },
    ],
    defaultParams: () => ({
      policy_file: 'policies/invoice.cedar',
      mode: 'strict',
      on_deny: 'halt',
    }),
  },
  branch: {
    label: 'Branch',
    category: 'Flow',
    accent: 'foreground',
    shape: 'diamond',
    desc: 'Conditional split.',
    variants: [
      { id: 'branch.if', label: 'If / else', sub: 'expression', icon: 'branch' },
    ],
    defaultParams: () => ({
      condition: '{{input.total}} > 50000',
      true_label: 'high-value',
      false_label: 'standard',
    }),
  },
  code: {
    label: 'Code',
    category: 'Flow',
    accent: 'foreground',
    shape: 'code',
    desc: 'Run a JS/Python snippet.',
    variants: [
      { id: 'code.js', label: 'JS', sub: 'V8 sandbox',    icon: 'code' },
      { id: 'code.py', label: 'Python', sub: 'pyodide',   icon: 'code' },
    ],
    defaultParams: (variant) => ({
      language: variant === 'code.py' ? 'python' : 'javascript',
      source: variant === 'code.py'
        ? "def run(ctx):\n    return { 'doubled': ctx.input['value'] * 2 }"
        : "export default (ctx) => ({\n  doubled: ctx.input.value * 2\n});",
    }),
  },
  output: {
    label: 'Output',
    category: 'Output',
    accent: 'accent',
    shape: 'terminal',
    desc: 'Emit the final result.',
    variants: [
      { id: 'output.return',  label: 'Return',  sub: 'sync response', icon: 'out' },
      { id: 'output.webhook', label: 'Webhook', sub: 'fire + forget', icon: 'out' },
    ],
    defaultParams: () => ({
      shape: '{ "ok": true, "bill_id": "{{steps.netsuite.bill_id}}" }',
    }),
  },
};

export function NodeIcon({ name, size = 14 }) {
  const props = {
    width: size, height: size, viewBox: '0 0 20 20', fill: 'none',
    stroke: 'currentColor', strokeWidth: 1.6, strokeLinecap: 'round', strokeLinejoin: 'round',
  };
  switch (name) {
    case 'webhook':   return <svg {...props}><circle cx="6" cy="13" r="2.5"/><circle cx="14" cy="13" r="2.5"/><circle cx="10" cy="5" r="2.5"/><path d="M8 7l-2 4M12 7l2 4M7.5 13h5"/></svg>;
    case 'clock':     return <svg {...props}><circle cx="10" cy="10" r="7"/><path d="M10 6v4l2.5 2.5"/></svg>;
    case 'radio':     return <svg {...props}><circle cx="10" cy="10" r="2"/><path d="M6.5 6.5a5 5 0 000 7M13.5 6.5a5 5 0 010 7M4 4a8 8 0 000 12M16 4a8 8 0 010 12"/></svg>;
    case 'sparkles':  return <svg {...props}><path d="M10 3v4M10 13v4M3 10h4M13 10h4M5.5 5.5l2.5 2.5M12 12l2.5 2.5M14.5 5.5L12 8M8 12l-2.5 2.5"/></svg>;
    case 'tag':       return <svg {...props}><path d="M3 10V4h6l8 8-6 6-8-8z"/><circle cx="6.5" cy="6.5" r="1"/></svg>;
    case 'braces':    return <svg {...props}><path d="M7 3c-2 0-2 2-2 3s0 2-2 2c2 0 2 2 2 3s0 3 2 3"/><path d="M13 3c2 0 2 2 2 3s0 2 2 2c-2 0-2 2-2 3s0 3-2 3"/></svg>;
    case 'agent':     return <svg {...props}><circle cx="10" cy="8" r="3"/><path d="M4 17c1-3 3.5-4 6-4s5 1 6 4"/><circle cx="10" cy="8" r="0.5" fill="currentColor"/></svg>;
    case 'globe':     return <svg {...props}><circle cx="10" cy="10" r="7"/><path d="M3 10h14M10 3c2 2 3 4.5 3 7s-1 5-3 7c-2-2-3-4.5-3-7s1-5 3-7z"/></svg>;
    case 'plug':      return <svg {...props}><path d="M7 3v4M13 3v4M5 7h10v4a5 5 0 01-10 0V7zM10 16v2"/></svg>;
    case 'db':        return <svg {...props}><ellipse cx="10" cy="5" rx="6" ry="2"/><path d="M4 5v5c0 1 3 2 6 2s6-1 6-2V5M4 10v5c0 1 3 2 6 2s6-1 6-2v-5"/></svg>;
    case 'chat':      return <svg {...props}><path d="M4 5h12v9H9l-3 3v-3H4V5z"/></svg>;
    case 'user':      return <svg {...props}><circle cx="10" cy="7" r="3"/><path d="M4 17c0-3 3-5 6-5s6 2 6 5"/></svg>;
    case 'mail':      return <svg {...props}><rect x="3" y="5" width="14" height="10" rx="1"/><path d="M3 6l7 5 7-5"/></svg>;
    case 'shield':    return <svg {...props}><path d="M10 3l6 2v5c0 4-3 6-6 7-3-1-6-3-6-7V5l6-2z"/><path d="M7.5 10l2 2 3-3.5"/></svg>;
    case 'branch':    return <svg {...props}><circle cx="5" cy="5" r="1.5"/><circle cx="5" cy="15" r="1.5"/><circle cx="15" cy="15" r="1.5"/><path d="M5 6.5v7M5 10c0 3 2 5 5 5h4"/></svg>;
    case 'code':      return <svg {...props}><path d="M7 6l-4 4 4 4M13 6l4 4-4 4"/></svg>;
    case 'out':       return <svg {...props}><path d="M4 10h10M10 5l5 5-5 5"/></svg>;
    default:          return <svg {...props}><rect x="4" y="4" width="12" height="12" rx="2"/></svg>;
  }
}

export function getVariant(variantId) {
  for (const kind of Object.keys(NODE_KINDS)) {
    const v = NODE_KINDS[kind].variants.find(x => x.id === variantId);
    if (v) return { kind, ...v, kindDef: NODE_KINDS[kind] };
  }
  return null;
}

/* Provider catalog used by the LLM chat inspector. Grouped + tagged so the
   picker can render section headers and capability hints (vision, tools,
   reasoning). */
export const LLM_PROVIDERS = [
  {
    id: 'anthropic',
    label: 'Anthropic',
    models: [
      { id: 'claude-opus-4-7',     label: 'Claude Opus 4.7',     ctx: 200_000, caps: ['vision','tools','thinking'] },
      { id: 'claude-sonnet-4-6',   label: 'Claude Sonnet 4.6',   ctx: 200_000, caps: ['vision','tools','thinking'] },
      { id: 'claude-haiku-4-5',    label: 'Claude Haiku 4.5',    ctx: 200_000, caps: ['vision','tools'] },
    ],
  },
  {
    id: 'openai',
    label: 'OpenAI',
    models: [
      { id: 'gpt-4o',              label: 'GPT-4o',              ctx: 128_000, caps: ['vision','tools'] },
      { id: 'gpt-4o-mini',         label: 'GPT-4o mini',         ctx: 128_000, caps: ['vision','tools'] },
      { id: 'o3-mini',             label: 'o3-mini',             ctx: 200_000, caps: ['tools','thinking'] },
    ],
  },
  {
    id: 'google',
    label: 'Google',
    models: [
      { id: 'gemini-1.5-pro',      label: 'Gemini 1.5 Pro',      ctx: 1_000_000, caps: ['vision','tools'] },
      { id: 'gemini-1.5-flash',    label: 'Gemini 1.5 Flash',    ctx: 1_000_000, caps: ['vision','tools'] },
    ],
  },
  {
    id: 'meta',
    label: 'Meta',
    models: [
      { id: 'llama-3.3-70b',       label: 'Llama 3.3 70B',       ctx:  131_072, caps: ['tools'] },
    ],
  },
];

export function findModel(modelId) {
  for (const p of LLM_PROVIDERS) {
    const m = p.models.find(x => x.id === modelId);
    if (m) return { ...m, provider: p.id, providerLabel: p.label };
  }
  return null;
}

/* Tool catalog the autonomous agent can choose from at runtime. The Inspector
   "Tools" tab renders this as a pickable list. Each tool gets a stable id, a
   group, a one-line description (shown to the model), and a JSON-shape
   `args` description so the loop trace can render plausible call signatures. */
export const AGENT_TOOL_CATALOG = [
  // HTTP / generic
  { id: 'http.get',         group: 'Web',         label: 'HTTP GET',       desc: 'Fetch a URL and return the response body.',                  args: '{ url: string, headers?: object }' },
  { id: 'http.post',        group: 'Web',         label: 'HTTP POST',      desc: 'POST a JSON body to a URL and return the response.',         args: '{ url: string, body: object }' },
  { id: 'web.search',       group: 'Web',         label: 'Web search',     desc: 'Search the public web; returns top-k links + snippets.',     args: '{ query: string, k?: number }' },
  { id: 'web.fetch',        group: 'Web',         label: 'Fetch & extract',desc: 'Fetch a URL, extract main content as text.',                  args: '{ url: string }' },

  // Data
  { id: 'snowflake.query',  group: 'Data',        label: 'Snowflake query',desc: 'Run a SELECT against the configured Snowflake warehouse.',    args: '{ sql: string }' },
  { id: 'postgres.query',   group: 'Data',        label: 'Postgres query', desc: 'Run a SELECT against the configured Postgres.',               args: '{ sql: string }' },
  { id: 'vector.search',    group: 'Data',        label: 'Vector search',  desc: 'Semantic search over indexed documents.',                     args: '{ query: string, k?: number, filter?: object }' },

  // Knowledge
  { id: 'kb.lookup',        group: 'Knowledge',   label: 'Knowledge lookup',desc: 'Look up a document in the agent knowledge base.',            args: '{ query: string }' },
  { id: 'kb.cite',          group: 'Knowledge',   label: 'Citation',       desc: 'Resolve a citation to a permalinked source.',                  args: '{ doc_id: string }' },

  // Communications
  { id: 'slack.post',       group: 'Communications', label: 'Slack post',  desc: 'Post a message to a Slack channel or thread.',                args: '{ channel: string, text: string }' },
  { id: 'email.send',       group: 'Communications', label: 'Email send',  desc: 'Send an email via the configured provider.',                  args: '{ to: string, subject: string, body: string }' },

  // CRM / business
  { id: 'salesforce.query', group: 'CRM',         label: 'Salesforce query',desc: 'SOQL query against Salesforce.',                              args: '{ soql: string }' },
  { id: 'salesforce.update',group: 'CRM',         label: 'Salesforce update',desc: 'Update an SObject record.',                                  args: '{ object: string, id: string, fields: object }' },
  { id: 'netsuite.bill',    group: 'CRM',         label: 'NetSuite create bill', desc: 'Create a vendor bill in NetSuite.',                     args: '{ vendor: string, amount: number, lines: array }' },

  // Code / utility
  { id: 'code.run',         group: 'Utility',     label: 'Run code',       desc: 'Execute a JS snippet in a sandbox and return the result.',    args: '{ source: string }' },
  { id: 'calc.eval',        group: 'Utility',     label: 'Calculator',     desc: 'Evaluate a numeric expression.',                              args: '{ expr: string }' },

  // Memory
  { id: 'memory.read',      group: 'Memory',      label: 'Memory read',    desc: 'Read a key from the workflow shared memory.',                 args: '{ key: string }' },
  { id: 'memory.write',     group: 'Memory',      label: 'Memory write',   desc: 'Write a key to the workflow shared memory.',                  args: '{ key: string, value: any }' },

  // Human in the loop
  { id: 'human.ask',        group: 'Human',       label: 'Ask a human',    desc: 'Pause and ask a human a clarifying question. Returns reply.', args: '{ question: string, channel?: string }' },
];

export function findTool(toolId) {
  return AGENT_TOOL_CATALOG.find(t => t.id === toolId) || null;
}

export function groupedTools() {
  const groups = {};
  for (const t of AGENT_TOOL_CATALOG) {
    if (!groups[t.group]) groups[t.group] = [];
    groups[t.group].push(t);
  }
  return groups;
}

/* Output schema for a variant — what downstream nodes can reference via
   {{steps.<id>.output.*}}. Visible in the Inspector "Inputs / Outputs" tab so
   wiring is no longer guesswork. */
export function getOutputSchema(variantId) {
  if (variantId === 'agent.autonomous') {
    return {
      kind: 'object',
      fields: [
        // Top-level routing contract (§1). Every agent emits this shape.
        { path: 'status',               type: 'enum',       desc: '"ok" | "needs_handoff" | "needs_human" | "failed". Drives downstream routing.' },
        { path: 'result',               type: 'object',     desc: 'Structured payload, validated against the agent\'s `returns` schema.' },
        { path: 'handoff.to',           type: 'string?',    desc: 'When status = "needs_handoff", the target agent id.' },
        { path: 'handoff.reason',       type: 'string?',    desc: 'Why the handoff was issued.' },
        { path: 'handoff.payload',      type: 'object?',    desc: 'Data to forward to the target agent.' },
        { path: 'reasoning',            type: 'string?',    desc: 'Optional one-line summary of the agent\'s rationale.' },
        // Aggregates
        { path: 'usage.input_tokens',   type: 'number',     desc: 'Input tokens summed across all LLM calls in the loop.' },
        { path: 'usage.output_tokens',  type: 'number',     desc: 'Output tokens summed across all LLM calls in the loop.' },
        { path: 'usage.cost_usd',       type: 'number',     desc: 'Aggregate cost in USD for the entire loop.' },
        { path: 'model_used',           type: 'string',     desc: 'Effective model id.' },
        { path: 'latency_ms',           type: 'number',     desc: 'Wall-clock latency of the loop.' },
        // Trace (loop detail) — moved here so top-level stays clean.
        { path: 'trace.steps',          type: 'agent_step[]', desc: 'Ordered loop: think / tool_call / observation / done.' },
        { path: 'trace.steps_taken',    type: 'number',     desc: 'Total loop iterations performed.' },
        { path: 'trace.tools_used',     type: 'string[]',   desc: 'Distinct tool ids the agent invoked at least once.' },
        { path: 'trace.terminated_by',  type: 'enum',       desc: '"goal_met" | "max_steps" | "budget" | "error" | "stopped"' },
      ],
    };
  }
  if (variantId === 'llm.chat') {
    return {
      kind: 'object',
      fields: [
        { path: 'text',                   type: 'string',   desc: 'Final assistant reply (concatenated content blocks).' },
        { path: 'messages',               type: 'message[]', desc: 'Full updated conversation including the new assistant turn. Pipe into another chat node to continue the thread.' },
        { path: 'tool_calls',             type: 'toolcall[]', desc: 'Tool invocations the model produced (name + arguments). Empty when finish_reason ≠ "tool_use".' },
        { path: 'finish_reason',          type: 'enum',     desc: '"stop" | "length" | "tool_use" | "content_filter"' },
        { path: 'parsed',                 type: 'any',      desc: 'Parsed JSON object when response_format = json_object | json_schema. Otherwise null.' },
        { path: 'usage.input_tokens',     type: 'number',   desc: 'Tokens billed for input.' },
        { path: 'usage.output_tokens',    type: 'number',   desc: 'Tokens billed for output.' },
        { path: 'usage.cache_read_tokens',type: 'number',   desc: 'Tokens served from prompt cache (when prompt_cache = true).' },
        { path: 'usage.cost_usd',         type: 'number',   desc: 'Estimated cost for this call in USD.' },
        { path: 'model_used',             type: 'string',   desc: 'Effective model id (may differ from request when fallback fired).' },
        { path: 'attempts',               type: 'number',   desc: 'Number of attempts including retries.' },
        { path: 'latency_ms',             type: 'number',   desc: 'Wall-clock latency of the call.' },
      ],
    };
  }
  if (variantId === 'llm.classify') {
    return {
      kind: 'object',
      fields: [
        { path: 'label',         type: 'string', desc: 'Predicted class label.' },
        { path: 'confidence',    type: 'number', desc: '0..1 model confidence.' },
        { path: 'usage.cost_usd', type: 'number', desc: 'Cost in USD.' },
      ],
    };
  }
  if (variantId === 'llm.extract') {
    return {
      kind: 'object',
      fields: [
        { path: 'data',           type: 'object', desc: 'Object matching the JSON schema you supplied.' },
        { path: 'usage.cost_usd', type: 'number', desc: 'Cost in USD.' },
      ],
    };
  }
  return null;
}

/* Migrate older llm.chat params (pre-multiturn). Prior schema had
   `prompt: string`; new schema uses `messages: [{role, content}]`. We keep
   migration cheap + idempotent so existing seed/saved workflows keep working. */
export function migrateLlmChatParams(params = {}) {
  if (Array.isArray(params.messages) && params.messages.length > 0) return params;
  if (typeof params.prompt === 'string' && params.prompt.length > 0) {
    const { prompt, ...rest } = params;
    return { ...rest, messages: [{ role: 'user', content: prompt }] };
  }
  return { ...params, messages: [{ role: 'user', content: '' }] };
}

export function accentClass(accent, which) {
  const map = {
    primary:    { text: 'text-primary', bg: 'bg-primary', border: 'border-primary', dot: 'bg-primary' },
    accent:     { text: 'text-accent',  bg: 'bg-accent',  border: 'border-accent',  dot: 'bg-accent' },
    foreground: { text: 'text-foreground', bg: 'bg-foreground', border: 'border-foreground', dot: 'bg-foreground' },
  };
  return map[accent]?.[which] || '';
}
