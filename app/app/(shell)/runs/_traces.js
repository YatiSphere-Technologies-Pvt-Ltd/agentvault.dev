/* Deterministic trace generator. Given a run id + agent id, produces a
   realistic nested span tree with OpenTelemetry-flavored gen_ai.* attributes.
   Same run id always produces the same trace. */

import { makeDefaultAgent } from '../agents/_store';

/* ── small deterministic RNG seeded by a string ── */
function hash(str) {
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 16777619); }
  return h >>> 0;
}
function makeRng(seed) {
  let s = typeof seed === 'string' ? hash(seed) : seed >>> 0;
  return () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 0xffffffff; };
}
const pick = (rng, arr) => arr[Math.floor(rng() * arr.length)];
const rand = (rng, min, max) => Math.round(min + rng() * (max - min));

/* ── span kind registry ── */
export const KIND_META = {
  agent:      { label: 'Agent',       color: '#3B5CFF' },
  llm:        { label: 'LLM',         color: '#7C3AED' },
  tool:       { label: 'Tool',        color: '#0891B2' },
  retrieval:  { label: 'Retrieval',   color: '#6366F1' },
  guardrail:  { label: 'Guardrail',   color: '#F59E0B' },
  branch:     { label: 'Branch',      color: '#F97316' },
  'sub-agent':{ label: 'Sub-agent',   color: '#10B981' },
  memory:     { label: 'Memory',      color: '#8B5CF6' },
  human:      { label: 'Human',       color: '#E11D48' },
};

/* ── main entry ── */
export function generateTrace(runId, agentId) {
  const rng = makeRng(`${runId}:${agentId}`);
  const spans = [];
  let cursor = 0;

  // Resolve the agent config if it exists in localStorage so we can tailor the trace.
  const agent = resolveAgent(agentId);

  // root span
  const rootStart = 0;
  const rootId = 'sp_root';
  spans.push({
    id: rootId,
    parentId: null,
    kind: 'agent',
    name: `${agent?.name || 'Agent'} · run`,
    startMs: rootStart,
    durMs: 0, // filled at the end
    status: 'ok',
    attrs: {
      'service.name':           'agentvault',
      'gen_ai.operation.name':  'agent.invoke',
      'gen_ai.agent.id':        agentId,
      'gen_ai.agent.name':      agent?.name || agentId,
      'agentvault.run.id':      runId,
      'agentvault.environment': agent?.environment || 'prod',
    },
    input: {
      user_message: pickUserMessage(rng, agent),
      user_id:      pick(rng, ['u_12a4', 'u_8fe2', 'u_441b', 'u_bb9c']),
      trace_id:     runId,
    },
    output: null,
    logs: [
      { at: 0, level: 'info', msg: 'Run started' },
    ],
  });

  // Plan call (light LLM)
  cursor += rand(rng, 2, 8);
  const planStart = cursor;
  const planDur   = rand(rng, 140, 320);
  const planTokensIn  = rand(rng, 380, 780);
  const planTokensOut = rand(rng, 80,  220);
  spans.push({
    id: 'sp_plan',
    parentId: rootId,
    kind: 'llm',
    name: 'plan · decide next action',
    startMs: planStart,
    durMs: planDur,
    status: 'ok',
    attrs: {
      'gen_ai.system':            vendorOf(agent?.model?.primary),
      'gen_ai.request.model':     agent?.model?.primary || 'claude-3-5-sonnet',
      'gen_ai.request.temperature': agent?.model?.temperature ?? 0.2,
      'gen_ai.request.max_tokens':  agent?.model?.maxTokens ?? 4096,
      'gen_ai.usage.input_tokens':  planTokensIn,
      'gen_ai.usage.output_tokens': planTokensOut,
      'gen_ai.usage.total_tokens':  planTokensIn + planTokensOut,
      'gen_ai.response.finish_reason': 'tool_use',
      'gen_ai.response.cost_usd':      costFor(agent?.model?.primary, planTokensIn, planTokensOut),
    },
    input: {
      system: (agent?.model?.systemPrompt || 'You are a helpful assistant.').split('\n').slice(0, 2).join('\n'),
      messages: [{ role: 'user', content: spans[0].input.user_message }],
    },
    output: {
      text: 'I will first inspect the schema, then run a targeted query.',
      tool_calls: [{ name: 'sql.schema', arguments: {} }],
    },
    logs: [
      { at: 0,       level: 'info',  msg: 'Sent to model' },
      { at: planDur, level: 'debug', msg: `Got ${planTokensOut} tokens · ${planTokensIn} in` },
    ],
  });
  cursor = planStart + planDur;

  // Retrieval (if agent has attached knowledge)
  const hasKnowledge = (agent?.knowledge?.attachedSourceIds || []).length > 0;
  if (hasKnowledge) {
    const rStart = cursor + rand(rng, 2, 6);
    const rDur   = rand(rng, 60, 180);
    spans.push({
      id: 'sp_retrieve',
      parentId: rootId,
      kind: 'retrieval',
      name: 'retrieve · analytics dictionary',
      startMs: rStart,
      durMs: rDur,
      status: 'ok',
      attrs: {
        'gen_ai.operation.name':      'retrieval.search',
        'retrieval.top_k':            agent?.knowledge?.retrieval?.topK || 8,
        'retrieval.threshold':        agent?.knowledge?.retrieval?.threshold || 0.25,
        'retrieval.hybrid':           !!agent?.knowledge?.retrieval?.hybrid,
        'retrieval.reranker':         !!agent?.knowledge?.retrieval?.reranker,
        'retrieval.source_ids':       (agent?.knowledge?.attachedSourceIds || []).join(','),
        'retrieval.results_returned': 4,
        'retrieval.nDCG':             0.87,
      },
      input: { query: 'columns in the invoices fact table and their types' },
      output: {
        chunks: [
          { source: 'src_analytics_dictionary', score: 0.91, text: 'fct_invoices: id bigint PK, vendor_id bigint FK, amount_cents bigint …' },
          { source: 'src_analytics_dictionary', score: 0.88, text: 'dim_vendors.vendor_id maps to fct_invoices.vendor_id (canonical join)' },
          { source: 'src_analytics_dictionary', score: 0.82, text: 'amount_cents is stored in integer cents — divide by 100 for display' },
          { source: 'src_analytics_dictionary', score: 0.74, text: 'fct_invoices.created_at is UTC; use tz_convert for reporting' },
        ],
      },
      logs: [{ at: 0, level: 'info', msg: 'Hybrid retrieval (BM25 + vector) · reranked' }],
    });
    cursor = rStart + rDur;
  }

  // Tool calls — derive from agent's attached tools; fall back to two demo tools
  const tools = (agent?.tools?.attached || []).filter(t => t.enabled !== false).slice(0, 4);
  const fallbackTools = [{ id: 'sql.schema', label: 'sql.schema' }, { id: 'sql.query', label: 'sql.query' }];
  const toolList = tools.length ? tools : fallbackTools;

  toolList.forEach((t, idx) => {
    const gap = rand(rng, 5, 25);
    const tStart = cursor + gap;
    const tDur   = rand(rng, 50, 360);
    const isError = rng() < 0.05 && idx > 0;  // ~5% tool error rate on non-first tool
    const toolName = t.config?.toolName || t.label?.split(':').pop().trim() || t.id;
    const serverId = t.config?.serverId || 'builtin';

    const toolSpanId = `sp_tool_${idx}`;
    spans.push({
      id: toolSpanId,
      parentId: rootId,
      kind: 'tool',
      name: `tool · ${toolName}`,
      startMs: tStart,
      durMs: tDur,
      status: isError ? 'error' : 'ok',
      attrs: {
        'gen_ai.operation.name': 'tool.execute',
        'tool.name':             toolName,
        'tool.server_id':        serverId,
        'tool.risk_level':       t.config?.riskLevel || 'low',
        'tool.requires_approval': !!t.requiresApproval,
        'http.request.method':    'POST',
        'http.response.status_code': isError ? 500 : 200,
        ...(toolName.startsWith('sql.') ? {
          'db.system':        'postgresql',
          'db.namespace':     'analytics',
          'db.operation.name': toolName === 'sql.query' ? 'SELECT' : 'INTROSPECT',
          'db.response.returned_rows': toolName === 'sql.query' ? rand(rng, 12, 2_400) : 0,
        } : {}),
      },
      input: sampleToolInput(toolName, rng),
      output: isError
        ? { error: 'connection refused', code: 'ECONNREFUSED' }
        : sampleToolOutput(toolName, rng),
      logs: [
        { at: 0, level: 'info', msg: `Calling ${toolName}` },
        ...(isError ? [{ at: tDur, level: 'error', msg: 'Upstream 500; retry exhausted' }]
                    : [{ at: tDur, level: 'info', msg: 'OK' }]),
      ],
    });
    cursor = tStart + tDur;

    // Occasional nested sub-llm call that "interprets" the tool output (streaming)
    if (!isError && idx === 1 && rng() > 0.4) {
      const subStart = cursor + rand(rng, 1, 6);
      const subDur   = rand(rng, 280, 720);
      const subIn    = rand(rng, 800, 1600);
      const subOut   = rand(rng, 180, 420);
      spans.push({
        id: `sp_llm_after_${idx}`,
        parentId: toolSpanId,
        kind: 'llm',
        name: 'llm · interpret tool result',
        startMs: subStart,
        durMs: subDur,
        status: 'ok',
        attrs: {
          'gen_ai.system':            vendorOf(agent?.model?.primary),
          'gen_ai.request.model':     agent?.model?.primary || 'claude-3-5-sonnet',
          'gen_ai.request.streaming': true,
          'gen_ai.usage.input_tokens':  subIn,
          'gen_ai.usage.output_tokens': subOut,
          'gen_ai.usage.total_tokens':  subIn + subOut,
          'gen_ai.response.cost_usd':   costFor(agent?.model?.primary, subIn, subOut),
        },
        input:  { messages: [{ role: 'tool', content: '…truncated…' }] },
        output: { text: 'Vendor name mapping looks canonical — proceeding to query fct_invoices with a 30-day window.' },
        logs: [
          { at: 0,      level: 'info', msg: 'Streaming started' },
          { at: subDur, level: 'info', msg: `Streamed ${subOut} tokens in ${subDur}ms` },
        ],
      });
      cursor = subStart + subDur;
    }
  });

  // Guardrail check (if the agent has any output filter or custom rule)
  const gr = agent?.guardrails;
  const hasGuardrail = gr && (gr.output?.hallucination || gr.output?.grounding || gr.output?.piiRedaction || (gr.rules?.length || 0) > 0);
  if (hasGuardrail) {
    const gStart = cursor + rand(rng, 2, 6);
    const gDur   = rand(rng, 14, 40);
    spans.push({
      id: 'sp_guardrail',
      parentId: rootId,
      kind: 'guardrail',
      name: 'guardrail · output policy',
      startMs: gStart,
      durMs: gDur,
      status: 'ok',
      attrs: {
        'guardrail.mode':        gr.jailbreakDefense || 'balanced',
        'guardrail.rules_count': (gr.rules || []).length,
        'guardrail.checks':      ['hallucination', 'grounding', 'pii'].filter(k => gr.output?.[k === 'pii' ? 'piiRedaction' : k]).join(','),
        'guardrail.decision':    'allow',
        'guardrail.score':       0.98,
      },
      input:  { text: '…model output…' },
      output: { decision: 'allow', flagged: [] },
      logs: [{ at: 0, level: 'info', msg: 'All checks passed' }],
    });
    cursor = gStart + gDur;
  }

  // Final LLM summarize
  const sStart = cursor + rand(rng, 2, 8);
  const sDur   = rand(rng, 220, 520);
  const sIn    = rand(rng, 1200, 2200);
  const sOut   = rand(rng, 160, 360);
  spans.push({
    id: 'sp_summarize',
    parentId: rootId,
    kind: 'llm',
    name: 'llm · summarize response',
    startMs: sStart,
    durMs: sDur,
    status: 'ok',
    attrs: {
      'gen_ai.system':            vendorOf(agent?.model?.primary),
      'gen_ai.request.model':     agent?.model?.primary || 'claude-3-5-sonnet',
      'gen_ai.request.streaming': true,
      'gen_ai.usage.input_tokens':  sIn,
      'gen_ai.usage.output_tokens': sOut,
      'gen_ai.usage.total_tokens':  sIn + sOut,
      'gen_ai.response.cost_usd':   costFor(agent?.model?.primary, sIn, sOut),
      'gen_ai.response.finish_reason': 'end_turn',
    },
    input:  { messages: [{ role: 'user', content: spans[0].input.user_message }, { role: 'assistant', content: '…tool results…' }] },
    output: { text: sampleFinalAnswer(rng) },
    logs: [{ at: 0, level: 'info', msg: 'Finalizing answer' }],
  });
  cursor = sStart + sDur;

  // Fix root duration + aggregates
  const totalDur = cursor;
  spans[0].durMs = totalDur;
  const anyError = spans.some(s => s.status === 'error');
  spans[0].status = anyError ? 'partial' : 'ok';
  spans[0].output = { text: spans[spans.length - 1].output?.text || 'done' };

  const llmSpans = spans.filter(s => s.kind === 'llm');
  const totalTokens = llmSpans.reduce((a, s) => a + (s.attrs['gen_ai.usage.total_tokens'] || 0), 0);
  const totalCost   = llmSpans.reduce((a, s) => a + (s.attrs['gen_ai.response.cost_usd'] || 0), 0);

  return {
    id: runId,
    agentId,
    agentName: agent?.name || agentId,
    startedAt: new Date(Date.now() - totalDur).toISOString(),
    endedAt:   new Date().toISOString(),
    status:    spans[0].status,
    totalDurMs: totalDur,
    totalTokens,
    totalCostUSD: Number(totalCost.toFixed(4)),
    spanCount: spans.length,
    errorCount: spans.filter(s => s.status === 'error').length,
    spans,
  };
}

/* ──────────── helpers ──────────── */

function resolveAgent(agentId) {
  if (!agentId) return null;
  try {
    const list = JSON.parse(localStorage.getItem('av-agents-v3') || '[]');
    const raw = list.find(a => a.id === agentId);
    if (!raw) return null;
    return makeDefaultAgent(raw);
  } catch { return null; }
}

function vendorOf(model) {
  if (!model) return 'anthropic';
  if (model.startsWith('claude')) return 'anthropic';
  if (model.startsWith('gpt'))    return 'openai';
  if (model.startsWith('gemini')) return 'google';
  if (model.startsWith('mistral')) return 'mistral';
  return 'custom';
}
function costFor(model, inTok, outTok) {
  // Rough $/1M token pricing for the mock.
  const p = model?.startsWith('claude-3-5-sonnet') ? [3, 15]
         : model?.startsWith('claude-3-5-haiku')  ? [0.8, 4]
         : model?.startsWith('gpt-4o-mini')        ? [0.15, 0.6]
         : model?.startsWith('gpt-4o')             ? [2.5, 10]
         : model?.startsWith('gemini-1.5')         ? [1.25, 5]
         : [1, 3];
  return (inTok * p[0] + outTok * p[1]) / 1_000_000;
}
function pickUserMessage(rng, agent) {
  const pool = agent?.category === 'Data / Research' ? [
    'Top 10 vendors by invoice spend this quarter',
    'How many invoices did we reject last month and why?',
    'Show month-over-month AP throughput for 2026',
    "Which columns map to 'vendor ID' across our warehouse?",
  ] : agent?.category === 'Finance ops' ? [
    'Process this batch of invoices from vendor Acme Ltd',
    'What do I do with an invoice missing a PO number?',
  ] : agent?.category === 'Risk / Compliance' ? [
    'Run a KYC check on Northstar Ltd',
    'Are there sanctions hits on this UBO chain?',
  ] : [
    'Help me with a task.',
    'Summarize the attached document.',
  ];
  return pool[Math.floor(rng() * pool.length)];
}
function sampleToolInput(name, rng) {
  if (name === 'sql.schema') return { database: 'analytics', schema: 'public' };
  if (name === 'table.describe') return { table: 'fct_invoices' };
  if (name === 'sql.query') return { sql: 'SELECT vendor_id, SUM(amount_cents)/100 AS total FROM fct_invoices WHERE created_at >= NOW() - interval \'30 day\' GROUP BY 1 ORDER BY 2 DESC LIMIT 10;' };
  if (name === 'query.plan') return { sql: 'SELECT …' };
  if (name.startsWith('tool.') || name === 'http') return { method: 'POST', url: 'https://api.example.com/endpoint', body: {} };
  return { query: 'hello' };
}
function sampleToolOutput(name, rng) {
  if (name === 'sql.schema') return { schemas: ['public', 'staging'], table_count: 128 };
  if (name === 'table.describe') return { columns: ['id', 'vendor_id', 'amount_cents', 'created_at'], row_count: 4_812_004 };
  if (name === 'sql.query')  return { rows_returned: rand(rng, 12, 2_400), sample: [['v_8821', 182_400], ['v_1120', 142_010], ['v_9312', 118_820]] };
  if (name === 'query.plan') return { plan: 'Seq Scan on fct_invoices (cost=0.00..10000 rows=2.4M)' };
  return { ok: true };
}
function sampleFinalAnswer(rng) {
  const ans = [
    'Top 10 vendors by invoice spend in the last 30 days — results attached. Totals are in USD. Full SQL and plan included.',
    'Query produced 1,240 rows. Highest concentration is vendor v_8821 ($182k), followed by v_1120 ($142k). SQL and EXPLAIN attached.',
    'Retrieved 4 schema chunks, confirmed the join path through dim_vendors.vendor_id → fct_invoices.vendor_id, ran the query.',
  ];
  return ans[Math.floor(rng() * ans.length)];
}

/* For the trace page header — pretty-print ms. */
export function fmtMs(ms) {
  if (ms == null) return '—';
  if (ms < 1000) return `${ms} ms`;
  return `${(ms / 1000).toFixed(2)} s`;
}
