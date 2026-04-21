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
      { id: 'llm.chat',     label: 'Chat',     sub: 'single prompt',   icon: 'sparkles' },
      { id: 'llm.classify', label: 'Classify', sub: 'structured out',  icon: 'tag' },
      { id: 'llm.extract',  label: 'Extract',  sub: 'JSON schema',     icon: 'braces' },
    ],
    defaultParams: (variant) => ({
      model: 'gpt-4o-mini',
      temperature: 0.2,
      max_tokens: 512,
      system: 'You are a helpful agent.',
      prompt: '{{input.text}}',
      ...(variant === 'llm.extract' && { schema: '{ "total": "number", "vendor": "string" }' }),
    }),
  },
  agent: {
    label: 'Agent',
    category: 'AI',
    accent: 'primary',
    shape: 'hex',
    desc: 'Sub-agent from your registry.',
    variants: [
      { id: 'agent.registry', label: 'Registry agent', sub: 'versioned', icon: 'agent' },
    ],
    defaultParams: () => ({
      agent_id: 'ap-triage@v2',
      timeout_s: 30,
      budget_usd: 0.50,
    }),
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

export function accentClass(accent, which) {
  const map = {
    primary:    { text: 'text-primary', bg: 'bg-primary', border: 'border-primary', dot: 'bg-primary' },
    accent:     { text: 'text-accent',  bg: 'bg-accent',  border: 'border-accent',  dot: 'bg-accent' },
    foreground: { text: 'text-foreground', bg: 'bg-foreground', border: 'border-foreground', dot: 'bg-foreground' },
  };
  return map[accent]?.[which] || '';
}
