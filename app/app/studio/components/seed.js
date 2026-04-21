const COL = 240;

export const SEED_WORKFLOW = {
  name: 'Invoice Processor',
  description: 'Ingest invoices → extract in parallel → classify → policy gate → branch by value → approvals → post + audit.',
  nodes: [
    { id: 'n1',  variantId: 'trigger.webhook',   x:   40,          y: 280, params: { method: 'POST', path: '/invoices', schema: '{ "invoice_url": "string" }', auth: 'bearer', label: 'Invoice received' } },

    { id: 'n2',  variantId: 'agent.registry',    x:   40 + COL,    y: 160, params: { agent_id: 'doc-extract@v4', timeout_s: 30, budget_usd: 0.10, label: 'Extract fields' } },
    { id: 'n3',  variantId: 'llm.classify',      x:   40 + COL,    y: 280, params: { model: 'gpt-4o-mini', temperature: 0.1, max_tokens: 128, system: 'Classify vendor type.', prompt: '{{input.text}}', label: 'Classify vendor' } },
    { id: 'n4',  variantId: 'tool.snowflake',    x:   40 + COL,    y: 400, params: { warehouse: 'AGENT_WH', sql: 'SELECT * FROM vendors WHERE name ILIKE {{input.vendor}}', label: 'Vendor lookup' } },

    { id: 'n5',  variantId: 'code.js',           x:   40 + COL*2,  y: 280, params: { language: 'javascript', source: 'export default (ctx) => ({\n  ...ctx.steps.n2.output,\n  vendor: ctx.steps.n3.output.label,\n  known: !!ctx.steps.n4.output.id\n});', label: 'Merge & normalize' } },

    { id: 'n6',  variantId: 'policy.cedar',      x:   40 + COL*3,  y: 280, params: { policy_file: 'policies/invoice.cedar', mode: 'strict', on_deny: 'halt', label: 'Policy gate' } },

    { id: 'n7',  variantId: 'branch.if',         x:   40 + COL*4,  y: 280, params: { condition: '{{n5.output.total}} > 50000', true_label: 'high-value', false_label: 'standard', label: 'Amount routing' } },

    { id: 'n8',  variantId: 'human.slack',       x:   40 + COL*5,  y: 160, params: { approvers: 'finance-managers', timeout_h: 24, escalate_to: 'cfo-office', label: 'Manager approval' } },
    { id: 'n9',  variantId: 'human.email',       x:   40 + COL*5,  y: 280, params: { approvers: 'cfo@corp', timeout_h: 48, escalate_to: 'board', label: 'CFO sign-off' } },
    { id: 'n10', variantId: 'llm.extract',       x:   40 + COL*5,  y: 400, params: { model: 'gpt-4o-mini', temperature: 0, max_tokens: 256, system: 'Extract line items.', prompt: '{{n5.output.raw}}', schema: '{ "lines": "array" }', label: 'Line-item QA' } },

    { id: 'n11', variantId: 'tool.netsuite',     x:   40 + COL*6,  y: 280, params: { method: 'POST', url: 'https://netsuite.com/bills', body: '{ "vendor": "{{n5.output.vendor}}", "amount": {{n5.output.total}} }', label: 'Post to NetSuite' } },

    { id: 'n12', variantId: 'tool.slack',        x:   40 + COL*7,  y: 160, params: { channel: '#ap-posted', template: '✅ Invoice {{input.id}} posted · ${{n5.output.total}}', label: 'Notify #ap-posted' } },
    { id: 'n13', variantId: 'tool.http',         x:   40 + COL*7,  y: 400, params: { method: 'POST', url: 'https://audit.corp/events', body: '{ "type": "invoice.posted", "id": "{{input.id}}" }', label: 'Audit trail' } },

    { id: 'n14', variantId: 'output.return',     x:   40 + COL*8,  y: 280, params: { shape: '{ "ok": true, "bill_id": "{{n11.output.bill_id}}" }', label: 'Return 200' } },
  ],
  edges: [
    { id: 'e1',  from: 'n1',  to: 'n2' },
    { id: 'e2',  from: 'n1',  to: 'n3' },
    { id: 'e3',  from: 'n1',  to: 'n4' },
    { id: 'e4',  from: 'n2',  to: 'n5' },
    { id: 'e5',  from: 'n3',  to: 'n5' },
    { id: 'e6',  from: 'n4',  to: 'n5' },
    { id: 'e7',  from: 'n5',  to: 'n6' },
    { id: 'e8',  from: 'n6',  to: 'n7' },
    { id: 'e9',  from: 'n7',  to: 'n8',  label: 'high-value' },
    { id: 'e10', from: 'n7',  to: 'n9',  label: 'high-value' },
    { id: 'e11', from: 'n7',  to: 'n10', label: 'standard' },
    { id: 'e12', from: 'n8',  to: 'n11' },
    { id: 'e13', from: 'n9',  to: 'n11' },
    { id: 'e14', from: 'n10', to: 'n11' },
    { id: 'e15', from: 'n11', to: 'n12' },
    { id: 'e16', from: 'n11', to: 'n13' },
    { id: 'e17', from: 'n12', to: 'n14' },
    { id: 'e18', from: 'n13', to: 'n14' },
  ],
};

export const NODE_W = 220;
export const NODE_H = 88;
