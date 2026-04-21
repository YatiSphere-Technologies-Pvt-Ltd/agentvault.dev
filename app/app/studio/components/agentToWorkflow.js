/* Derive a Studio workflow from an agent record.
   This is a read-only projection — the agent remains the source of truth.

   Shape of a workflow node: { id, variantId, x, y, params: { label, ... } }

   We fold the agent's Knowledge and Guardrails into the LLM node's params
   (they render as metadata inside the node card). Sub-agents and tools become
   their own parallel nodes. */

import { TOOL_CATALOG } from '../../(shell)/agents/_catalog';

const COL = 240;
const ROW_Y  = 280;
const ROW_UP = 160;
const ROW_DN = 400;

/**
 * Pick a Studio tool variantId that best matches an agent tool. Studio only
 * has a handful of integration variants — fall back to tool.http for any
 * MCP tool or unknown kind.
 */
function variantForTool(t) {
  const id = t.id || '';
  if (id.startsWith('tool.slack')       || t.config?.toolName?.includes('slack'))      return 'tool.slack';
  if (id.startsWith('tool.snowflake')   || t.config?.toolName?.includes('snowflake')) return 'tool.snowflake';
  if (id.startsWith('tool.netsuite'))   return 'tool.netsuite';
  if (id.startsWith('tool.salesforce')) return 'tool.salesforce';
  if (id === 'calc' || id === 'code.exec') return 'code.js';
  if (id === 'sql' || t.config?.toolName?.match(/^sql\./)) return 'tool.http';
  // default / MCP / custom
  return 'tool.http';
}

function toolLabel(t) {
  if (t.label) return t.label;
  const cat = TOOL_CATALOG.find(c => c.id === t.id);
  if (cat) return cat.label;
  return t.config?.toolName || t.id;
}

export function agentToWorkflow(agent) {
  const nodes = [];
  const edges = [];
  let edgeCounter = 1;
  const nextEdge = (from, to, label) => {
    const id = `e${edgeCounter++}`;
    edges.push(label ? { id, from, to, label } : { id, from, to });
  };

  /* ───────── Column 0 — trigger ───────── */
  // Primary trigger preference: API > chat > webhook > cron > event
  const t = agent.triggers || {};
  const primaryTrigger = t.api?.enabled     ? { variantId: 'trigger.webhook',  params: { method: 'POST', path: `/v1/agents/${agent.id}/messages`, auth: 'bearer', label: 'API request' } }
                       : t.chat?.enabled    ? { variantId: 'trigger.webhook',  params: { method: 'POST', path: `/chat/${t.chat.slug || agent.id}`, auth: 'bearer', label: 'Chat message' } }
                       : t.webhook?.enabled ? { variantId: 'trigger.webhook',  params: { method: 'POST', path: `/webhooks/${agent.id}`, auth: 'hmac', label: 'Inbound webhook' } }
                       : t.cron?.enabled    ? { variantId: 'trigger.schedule', params: { cron: t.cron.schedule, tz: 'UTC', label: 'Scheduled run' } }
                       :                      { variantId: 'trigger.webhook',  params: { method: 'POST', path: '/run', auth: 'bearer', label: 'Incoming message' } };
  nodes.push({ id: 'n_trigger', ...primaryTrigger, x: 40, y: ROW_Y, params: primaryTrigger.params });

  /* ───────── Column 1 — the "brain" LLM node, with knowledge + guardrails folded into params ───────── */
  const model = agent.model || {};
  const knowledge = agent.knowledge || {};
  const guardrails = agent.guardrails || {};
  const attachedSourceIds = knowledge.attachedSourceIds || [];
  const retrieval = knowledge.retrieval || {};
  const brainLabel = attachedSourceIds.length
    ? `${agent.name} · with ${attachedSourceIds.length} source${attachedSourceIds.length === 1 ? '' : 's'}`
    : `${agent.name} · LLM`;

  nodes.push({
    id: 'n_brain',
    variantId: 'llm.chat',
    x: 40 + COL,
    y: ROW_Y,
    params: {
      model:          model.primary || 'claude-3-5-sonnet',
      temperature:    model.temperature ?? 0.2,
      max_tokens:     model.maxTokens ?? 4096,
      system:         (model.systemPrompt || '').split('\n').slice(0, 3).join(' '), // preview
      prompt:         '{{input.text}}',
      label:          brainLabel,
      // fold-into-LLM metadata (consumed purely by node rendering)
      _knowledge:     attachedSourceIds,
      _retrieval:     retrieval,
      _guardrails:    guardrails,
    },
  });
  nextEdge('n_trigger', 'n_brain');

  /* ───────── Column 2 — tools + sub-agents in parallel ───────── */
  const tools = (agent.tools?.attached || []).filter(t => t.enabled !== false);
  const subAgents = (agent.orchestration?.subAgents || []);

  const parallelCount = tools.length + subAgents.length;
  const spread = Math.max(0, parallelCount - 1);
  const step   = spread === 0 ? 0 : (ROW_DN - ROW_UP) / spread;
  const startY = spread === 0 ? ROW_Y : ROW_UP;

  let toolIds = [];

  tools.forEach((t, i) => {
    const id = `n_tool_${i}`;
    toolIds.push(id);
    const variantId = variantForTool(t);
    nodes.push({
      id,
      variantId,
      x: 40 + COL * 2,
      y: Math.round(startY + i * step),
      params: {
        label: toolLabel(t),
        method: 'POST',
        url: t.config?.serverEndpoint || 'https://api.example.com/endpoint',
        body: '{ "query": "{{input.text}}" }',
        _source: t.source || 'catalog',
        _serverId: t.config?.serverId || null,
        _riskLevel: t.config?.riskLevel || null,
        _requiresApproval: !!t.requiresApproval,
      },
    });
    nextEdge('n_brain', id);
  });

  subAgents.forEach((s, i) => {
    const id = `n_sub_${i}`;
    toolIds.push(id);
    const idx = tools.length + i;
    nodes.push({
      id,
      variantId: 'agent.registry',
      x: 40 + COL * 2,
      y: Math.round(startY + idx * step),
      params: {
        agent_id:   s.id,
        timeout_s:  30,
        budget_usd: 0.50,
        label:      `Sub-agent · ${s.label || s.id}`,
        _role:      s.role,
        _memory:    s.memory,
      },
    });
    nextEdge('n_brain', id);
  });

  /* ───────── Column 3 — optional approval gate if any attached tool requires approval ───────── */
  const anyApprovalRequired = tools.some(t => t.requiresApproval);
  const postNodeIds = [];

  if (anyApprovalRequired) {
    nodes.push({
      id: 'n_approval',
      variantId: 'human.slack',
      x: 40 + COL * 3,
      y: ROW_Y,
      params: {
        approvers: agent.humanLoop?.reviewQueue?.assignees?.[0] || 'ops-reviewers',
        timeout_h: 24,
        escalate_to: 'supervisor',
        label: 'Approval gate',
      },
    });
    toolIds.forEach(id => nextEdge(id, 'n_approval'));
    postNodeIds.push('n_approval');
  } else {
    // If no approval required, the tools all fan straight into the output.
    postNodeIds.push(...(toolIds.length ? toolIds : ['n_brain']));
  }

  /* ───────── Column 4 — policy / guardrails gate (if any output filter is on) ───────── */
  const hasGuardrails = guardrails.output?.hallucination || guardrails.output?.grounding ||
                        guardrails.output?.piiRedaction  || guardrails.output?.toxicity  ||
                        (guardrails.rules?.length || 0) > 0;

  if (hasGuardrails) {
    const col = anyApprovalRequired ? 4 : 3;
    nodes.push({
      id: 'n_policy',
      variantId: 'policy.cedar',
      x: 40 + COL * col,
      y: ROW_Y,
      params: {
        policy_file:  `policies/${agent.id}.cedar`,
        mode:         guardrails.jailbreakDefense === 'strict' ? 'strict' : 'dry-run',
        on_deny:      'halt',
        label:        'Guardrails',
        _rules:       (guardrails.rules || []).length,
        _input:       guardrails.input,
        _output:      guardrails.output,
      },
    });
    postNodeIds.forEach(id => nextEdge(id, 'n_policy'));
    postNodeIds.splice(0, postNodeIds.length, 'n_policy');
  }

  /* ───────── Last column — output ───────── */
  const lastCol = (hasGuardrails ? (anyApprovalRequired ? 5 : 4) : (anyApprovalRequired ? 4 : 3));
  nodes.push({
    id: 'n_output',
    variantId: 'output.return',
    x: 40 + COL * lastCol,
    y: ROW_Y,
    params: {
      shape: '{ "ok": true, "result": "{{n_brain.output}}" }',
      label: 'Return response',
    },
  });
  postNodeIds.forEach(id => nextEdge(id, 'n_output'));

  return {
    name: agent.name,
    description: agent.description || `Read-only view of agent ${agent.id}`,
    nodes,
    edges,
    _derivedFromAgentId: agent.id,
  };
}
