'use client';

import { useCallback, useEffect, useState } from 'react';
import { SEED_WORKFLOW } from './seed';

/* Storage model
   -------------
   av-studio-workflows-v1   list of { id, name, description, updatedAt, createdAt }
   av-studio-workflow::<id> per-workflow body { name, description, nodes, edges }
   av-studio-current-v1     last-opened workflow id

   The Studio prior to this used a single key, `av-studio-workflow-v2`, for
   the body of a single workflow. First-run migration copies that body into
   `av-studio-workflow::wf_default` and registers it in the list. After
   migration the old key is left in place (harmless) so we don't lose data
   if the user reverts the app. */

const LIST_KEY    = 'av-studio-workflows-v1';
const CURRENT_KEY = 'av-studio-current-v1';
const BODY_PREFIX = 'av-studio-workflow::';
const LEGACY_KEY  = 'av-studio-workflow-v2';
const DEFAULT_ID  = 'wf_default';

export function bodyKey(id) { return `${BODY_PREFIX}${id}`; }

function makeId() { return 'wf_' + Math.random().toString(36).slice(2, 10); }

function writeList(list) {
  try { localStorage.setItem(LIST_KEY, JSON.stringify(list)); } catch {}
}
function readList() {
  try { return JSON.parse(localStorage.getItem(LIST_KEY) || '[]'); } catch { return []; }
}
export function readBody(id) {
  try { return JSON.parse(localStorage.getItem(bodyKey(id)) || 'null'); } catch { return null; }
}
export function writeBody(id, body) {
  try { localStorage.setItem(bodyKey(id), JSON.stringify(body)); } catch {}
}

/* One-shot bootstrap — runs on first access.
   - If nothing exists yet, seed a "Default workflow" (from SEED_WORKFLOW) and
     a "Blank" so the user sees >1 entry and can switch.
   - If the legacy v2 key exists, migrate it to wf_default. */
function ensureBootstrapped() {
  const existing = readList();
  if (existing.length > 0) return existing;

  const now = new Date().toISOString();
  const list = [];

  // Legacy migration — reuse whatever body the user had.
  let defaultBody = null;
  try {
    const legacy = localStorage.getItem(LEGACY_KEY);
    if (legacy) defaultBody = JSON.parse(legacy);
  } catch {}
  if (!defaultBody) defaultBody = SEED_WORKFLOW;

  list.push({
    id: DEFAULT_ID,
    name: defaultBody.name || 'Invoice processor',
    description: defaultBody.description || '',
    createdAt: now,
    updatedAt: now,
  });
  writeBody(DEFAULT_ID, {
    name:        defaultBody.name || 'Invoice processor',
    description: defaultBody.description || '',
    nodes:       defaultBody.nodes || [],
    edges:       defaultBody.edges || [],
  });

  // Ship a second "Blank" entry so users discover the switcher.
  const blankId = 'wf_blank';
  list.push({
    id: blankId,
    name: 'Blank canvas',
    description: 'Start from scratch.',
    createdAt: now,
    updatedAt: now,
  });
  writeBody(blankId, { name: 'Blank canvas', description: 'Start from scratch.', nodes: [], edges: [] });

  writeList(list);
  // Point current at whichever was already on screen (legacy default).
  try { localStorage.setItem(CURRENT_KEY, DEFAULT_ID); } catch {}
  return list;
}

/* ---------------- TEMPLATES ---------------- */

const COL = 280;

/* Multi-agent templates — concrete starting points so users can see patterns
   like supervisor + workers, plan-execute, and a single autonomous agent
   already wired to a trigger and an output. Each template body returns a
   self-contained { name, description, nodes, edges } shape. */

function singleAgentTemplate() {
  return {
    name: 'Single autonomous agent',
    description: 'One agent with tools, gated by a webhook trigger and emitting a structured response.',
    nodes: [
      { id: 'n1', variantId: 'trigger.webhook',  x: 60,            y: 220, params: { method: 'POST', path: '/agent', schema: '{ "text": "string", "id": "string" }', auth: 'bearer', label: 'Inbound request' } },
      { id: 'n2', variantId: 'agent.autonomous', x: 60 + COL,      y: 220, params: {
          provider: 'anthropic', model: 'claude-sonnet-4-6',
          goal: 'Answer the request in context.text. Use tools to look up facts; cite sources.',
          system: 'You are an enterprise agent. Plan, choose tools, observe, and finish.',
          context_map: [
            { field: 'text',         source: '{{trigger.text}}' },
            { field: 'request_id',   source: '{{trigger.id}}' },
          ],
          returns: '{\n  "answer": "string",\n  "citations": "string[]",\n  "confidence": "number"\n}',
          tools: ['web.search', 'kb.lookup', 'vector.search', 'memory.read', 'memory.write'],
          termination: 'goal_or_steps', max_steps: 8, require_goal_check: true,
          temperature: 0.3, max_tokens: 1024,
          parallel_tools: true, show_thinking: true,
          retries: 2, timeout_s: 60, budget_usd: 0.5, stop_on_error: false,
          label: 'Research agent',
        }
      },
      { id: 'n3', variantId: 'output.return',    x: 60 + COL * 2,  y: 220, params: { shape: '{ "answer": "{{steps.n2.output.result.answer}}", "citations": "{{steps.n2.output.result.citations}}", "cost": "{{steps.n2.output.usage.cost_usd}}" }', label: 'Return 200' } },
    ],
    edges: [
      { id: 'e1', from: 'n1', to: 'n2' },
      { id: 'e2', from: 'n2', to: 'n3' },
    ],
  };
}

function supervisorWorkersTemplate() {
  return {
    name: 'Supervisor + specialists',
    description: 'A supervisor agent delegates to specialist agents (research, finance, comms) and synthesises a final answer.',
    nodes: [
      { id: 'n1',  variantId: 'trigger.webhook',  x: 40,            y: 320, params: { method: 'POST', path: '/dispatch', schema: '{ "task": "string", "customer_id": "string" }', auth: 'bearer', label: 'Inbound task' } },

      { id: 'n2',  variantId: 'agent.autonomous', x: 40 + COL,      y: 320, params: {
          provider: 'anthropic', model: 'claude-sonnet-4-6',
          goal: 'Decide which specialists this task needs. Read context.task, then return a delegation plan with the specialist names and a brief for each.',
          system: 'You are a supervisor. Read the task, decompose it, and pick the right specialists.',
          context_map: [
            { field: 'task',        source: '{{trigger.task}}' },
            { field: 'customer_id', source: '{{trigger.customer_id}}' },
          ],
          returns: '{\n  "specialists": "string[]",\n  "research_brief": "string",\n  "finance_brief": "string",\n  "comms_brief": "string"\n}',
          tools: ['memory.read', 'kb.lookup'],
          termination: 'goal_or_steps', max_steps: 4, require_goal_check: true,
          temperature: 0.2, max_tokens: 600,
          parallel_tools: false, show_thinking: true,
          retries: 1, timeout_s: 30, budget_usd: 0.10, stop_on_error: false,
          label: 'Supervisor',
        }
      },

      { id: 'n3',  variantId: 'agent.autonomous', x: 40 + COL * 2,  y: 160, params: {
          provider: 'anthropic', model: 'claude-haiku-4-5',
          goal: 'Run research per context.brief. Use search and KB. Return findings with sources.',
          system: 'You are a research specialist. Be thorough and cite sources.',
          context_map: [
            { field: 'brief', source: '{{steps.n2.output.result.research_brief}}' },
            { field: 'task',  source: '{{trigger.task}}' },
          ],
          returns: '{\n  "findings": "string",\n  "sources": "string[]"\n}',
          tools: ['web.search', 'web.fetch', 'kb.lookup', 'vector.search'],
          termination: 'goal_or_steps', max_steps: 8, require_goal_check: true,
          temperature: 0.3, max_tokens: 1024,
          parallel_tools: true, show_thinking: false,
          retries: 2, timeout_s: 45, budget_usd: 0.20, stop_on_error: false,
          label: 'Research specialist',
        }
      },
      { id: 'n4',  variantId: 'agent.autonomous', x: 40 + COL * 2,  y: 320, params: {
          provider: 'anthropic', model: 'claude-haiku-4-5',
          goal: 'Pull financial data per context.brief. Run queries; never speculate beyond data.',
          system: 'You are a finance specialist.',
          context_map: [
            { field: 'brief',       source: '{{steps.n2.output.result.finance_brief}}' },
            { field: 'customer_id', source: '{{trigger.customer_id}}' },
          ],
          returns: '{\n  "summary": "string",\n  "metrics": "object"\n}',
          tools: ['snowflake.query', 'postgres.query', 'calc.eval'],
          termination: 'goal_or_steps', max_steps: 6, require_goal_check: true,
          temperature: 0.1, max_tokens: 800,
          parallel_tools: false, show_thinking: false,
          retries: 2, timeout_s: 45, budget_usd: 0.15, stop_on_error: false,
          label: 'Finance specialist',
        }
      },
      { id: 'n5',  variantId: 'agent.autonomous', x: 40 + COL * 2,  y: 480, params: {
          provider: 'anthropic', model: 'claude-haiku-4-5',
          goal: 'Draft customer-facing comms per context.brief.',
          system: 'You write empathetic, concise customer communications. No marketing fluff.',
          context_map: [
            { field: 'brief', source: '{{steps.n2.output.result.comms_brief}}' },
          ],
          returns: '{\n  "subject": "string",\n  "body": "string",\n  "tone": "professional | empathetic | terse"\n}',
          tools: ['kb.lookup'],
          termination: 'goal_or_steps', max_steps: 5, require_goal_check: true,
          temperature: 0.5, max_tokens: 800,
          parallel_tools: false, show_thinking: false,
          retries: 1, timeout_s: 30, budget_usd: 0.10, stop_on_error: false,
          label: 'Comms specialist',
        }
      },

      { id: 'n6',  variantId: 'agent.autonomous', x: 40 + COL * 3,  y: 320, params: {
          provider: 'anthropic', model: 'claude-sonnet-4-6',
          goal: 'Synthesise specialist outputs into one customer-ready answer for context.task.',
          system: 'You are the synthesiser. Combine specialist outputs faithfully.',
          context_map: [
            { field: 'task',     source: '{{trigger.task}}' },
            { field: 'research', source: '{{steps.n3.output.result}}' },
            { field: 'finance',  source: '{{steps.n4.output.result}}' },
            { field: 'comms',    source: '{{steps.n5.output.result}}' },
          ],
          returns: '{\n  "answer": "string",\n  "needs_human": "boolean",\n  "rationale": "string"\n}',
          tools: ['memory.write'],
          termination: 'goal_met', max_steps: 3, require_goal_check: true,
          temperature: 0.2, max_tokens: 1024,
          parallel_tools: false, show_thinking: true,
          retries: 1, timeout_s: 30, budget_usd: 0.15, stop_on_error: false,
          label: 'Synthesiser',
        }
      },

      { id: 'n7',  variantId: 'human.slack',      x: 40 + COL * 4,  y: 200, params: { approvers: 'cs-leads', timeout_h: 4, escalate_to: 'cs-director', label: 'Sign-off (high-stakes)' } },
      { id: 'n8',  variantId: 'output.return',    x: 40 + COL * 5,  y: 320, params: { shape: '{ "answer": "{{steps.n6.output.result.answer}}", "approved_by": "{{steps.n7.output.by}}" }', label: 'Return result' } },
    ],
    edges: [
      { id: 'e1', from: 'n1', to: 'n2' },
      { id: 'e2', from: 'n2', to: 'n3' },
      { id: 'e3', from: 'n2', to: 'n4' },
      { id: 'e4', from: 'n2', to: 'n5' },
      { id: 'e5', from: 'n3', to: 'n6' },
      { id: 'e6', from: 'n4', to: 'n6' },
      { id: 'e7', from: 'n5', to: 'n6' },
      { id: 'e8', from: 'n6', to: 'n7' },
      { id: 'e9', from: 'n7', to: 'n8' },
    ],
  };
}

function planExecuteCritiqueTemplate() {
  return {
    name: 'Plan → execute → critique',
    description: 'Planner drafts steps, executor runs them with tools, critic reviews and either approves or sends it back.',
    nodes: [
      { id: 'n1', variantId: 'trigger.webhook',  x: 40,            y: 280, params: { method: 'POST', path: '/run', schema: '{ "objective": "string", "context": "string" }', auth: 'bearer', label: 'Objective received' } },
      { id: 'n2', variantId: 'agent.autonomous', x: 40 + COL,      y: 280, params: {
          provider: 'anthropic', model: 'claude-sonnet-4-6',
          goal: 'Produce a numbered execution plan for context.objective.',
          system: 'You are a planner. Decompose into 3–6 concrete steps.',
          context_map: [{ field: 'objective', source: '{{trigger.objective}}' }, { field: 'context', source: '{{trigger.context}}' }],
          returns: '{\n  "steps": "string[]",\n  "estimated_difficulty": "low | medium | high"\n}',
          tools: ['kb.lookup', 'web.search'],
          termination: 'goal_met', max_steps: 4, require_goal_check: true,
          temperature: 0.3, max_tokens: 800,
          parallel_tools: false, show_thinking: true,
          retries: 1, timeout_s: 30, budget_usd: 0.10, stop_on_error: false,
          label: 'Planner',
        }
      },
      { id: 'n3', variantId: 'agent.autonomous', x: 40 + COL * 2,  y: 280, params: {
          provider: 'anthropic', model: 'claude-sonnet-4-6',
          goal: 'Execute context.plan exactly. Use tools as needed. Return what you did and the outcome.',
          system: 'You are an executor. Follow the plan; do not add steps.',
          context_map: [{ field: 'plan', source: '{{steps.n2.output.result.steps}}' }, { field: 'objective', source: '{{trigger.objective}}' }],
          returns: '{\n  "outcome": "string",\n  "actions_taken": "string[]"\n}',
          tools: ['http.get', 'http.post', 'snowflake.query', 'salesforce.query', 'memory.write'],
          termination: 'goal_or_steps', max_steps: 12, require_goal_check: true,
          temperature: 0.2, max_tokens: 1024,
          parallel_tools: true, show_thinking: false,
          retries: 2, timeout_s: 90, budget_usd: 0.40, stop_on_error: false,
          label: 'Executor',
        }
      },
      { id: 'n4', variantId: 'agent.autonomous', x: 40 + COL * 3,  y: 280, params: {
          provider: 'anthropic', model: 'claude-haiku-4-5',
          goal: 'Critique the executor outcome against context.objective. Score 0–1; list gaps.',
          system: 'You are a strict critic.',
          context_map: [{ field: 'objective', source: '{{trigger.objective}}' }, { field: 'outcome', source: '{{steps.n3.output.result.outcome}}' }, { field: 'actions', source: '{{steps.n3.output.result.actions_taken}}' }],
          returns: '{\n  "score": "number",\n  "issues": "string[]",\n  "approve": "boolean"\n}',
          tools: ['kb.lookup'],
          termination: 'goal_met', max_steps: 3, require_goal_check: true,
          temperature: 0.1, max_tokens: 600,
          parallel_tools: false, show_thinking: false,
          retries: 1, timeout_s: 20, budget_usd: 0.05, stop_on_error: false,
          label: 'Critic',
        }
      },
      { id: 'n5', variantId: 'branch.if',        x: 40 + COL * 4,  y: 280, params: { condition: '{{steps.n4.output.result.approve}} == true', true_label: 'approve', false_label: 'rework', label: 'Quality gate' } },
      { id: 'n6', variantId: 'output.return',    x: 40 + COL * 5,  y: 200, params: { shape: '{ "ok": true, "outcome": "{{steps.n3.output.result.outcome}}", "score": "{{steps.n4.output.result.score}}" }', label: 'Approved' } },
      { id: 'n7', variantId: 'human.slack',      x: 40 + COL * 5,  y: 360, params: { approvers: 'eng-leads', timeout_h: 2, escalate_to: 'cto', label: 'Rework: needs human' } },
    ],
    edges: [
      { id: 'e1', from: 'n1', to: 'n2' },
      { id: 'e2', from: 'n2', to: 'n3' },
      { id: 'e3', from: 'n3', to: 'n4' },
      { id: 'e4', from: 'n4', to: 'n5' },
      { id: 'e5', from: 'n5', to: 'n6', label: 'approve' },
      { id: 'e6', from: 'n5', to: 'n7', label: 'rework' },
    ],
  };
}

function customerSupportAgentTemplate() {
  return {
    name: 'Customer-support agent',
    description: 'Email-triggered agent that researches, drafts a reply, and routes high-stakes responses to a human.',
    nodes: [
      { id: 'n1', variantId: 'trigger.event',    x: 40,            y: 280, params: { schema: '{ "from": "string", "subject": "string", "body": "string", "thread_id": "string" }', label: 'Email received' } },
      { id: 'n2', variantId: 'agent.autonomous', x: 40 + COL,      y: 280, params: {
          provider: 'anthropic', model: 'claude-sonnet-4-6',
          goal: 'Resolve the customer email in context.subject + context.body. Use KB + CRM. Draft a reply.',
          system: 'You are a customer-support specialist. Be concise, empathetic, and accurate. Always cite KB articles you use.',
          context_map: [
            { field: 'subject',     source: '{{trigger.subject}}' },
            { field: 'body',        source: '{{trigger.body}}' },
            { field: 'from',        source: '{{trigger.from}}' },
            { field: 'thread_id',   source: '{{trigger.thread_id}}' },
          ],
          returns: '{\n  "reply_subject": "string",\n  "reply_body": "string",\n  "requires_human": "boolean",\n  "kb_articles": "string[]"\n}',
          tools: ['kb.lookup', 'kb.cite', 'salesforce.query', 'vector.search', 'memory.read', 'memory.write'],
          termination: 'goal_or_steps', max_steps: 8, require_goal_check: true,
          temperature: 0.3, max_tokens: 900,
          parallel_tools: true, show_thinking: true,
          retries: 2, timeout_s: 60, budget_usd: 0.20, stop_on_error: false,
          label: 'Support agent',
        }
      },
      { id: 'n3', variantId: 'branch.if',        x: 40 + COL * 2,  y: 280, params: { condition: '{{steps.n2.output.result.requires_human}} == true', true_label: 'route to human', false_label: 'auto-send', label: 'Stake check' } },
      { id: 'n4', variantId: 'human.email',      x: 40 + COL * 3,  y: 160, params: { approvers: 'cs-team', timeout_h: 2, escalate_to: 'cs-lead', label: 'Human review' } },
      { id: 'n5', variantId: 'tool.slack',       x: 40 + COL * 3,  y: 400, params: { channel: '#cs-auto', template: 'Auto-reply sent for {{trigger.thread_id}}', label: 'Notify channel' } },
      { id: 'n6', variantId: 'output.return',    x: 40 + COL * 4,  y: 280, params: { shape: '{ "thread": "{{trigger.thread_id}}", "subject": "{{steps.n2.output.result.reply_subject}}", "body": "{{steps.n2.output.result.reply_body}}" }', label: 'Done' } },
    ],
    edges: [
      { id: 'e1', from: 'n1', to: 'n2' },
      { id: 'e2', from: 'n2', to: 'n3' },
      { id: 'e3', from: 'n3', to: 'n4', label: 'route to human' },
      { id: 'e4', from: 'n3', to: 'n5', label: 'auto-send' },
      { id: 'e5', from: 'n4', to: 'n6' },
      { id: 'e6', from: 'n5', to: 'n6' },
    ],
  };
}

export const WORKFLOW_TEMPLATES = [
  {
    id: 'blank',
    label: 'Blank canvas',
    desc: 'Start from scratch.',
    body: () => ({ name: 'Untitled workflow', description: '', nodes: [], edges: [] }),
  },
  {
    id: 'agent.single',
    label: 'Single autonomous agent',
    desc: 'One agent + tools + trigger + output. The simplest agentic shape — start here if you\'re new to agents.',
    body: singleAgentTemplate,
  },
  {
    id: 'agent.supervisor',
    label: 'Supervisor + specialists',
    desc: 'A supervisor delegates to research / finance / comms specialists; a synthesiser combines their answers.',
    body: supervisorWorkersTemplate,
  },
  {
    id: 'agent.plan_execute',
    label: 'Plan → execute → critique',
    desc: 'Planner drafts, executor runs with tools, critic scores. Failing scores route to a human.',
    body: planExecuteCritiqueTemplate,
  },
  {
    id: 'agent.support',
    label: 'Customer-support agent',
    desc: 'Email-triggered agent that researches the KB, drafts a reply, and routes high-stakes responses to a human.',
    body: customerSupportAgentTemplate,
  },
  {
    id: 'invoice',
    label: 'Invoice processor',
    desc: 'The classic AP flow — parallel extraction, policy gate, approvals, audit.',
    body: () => ({
      name: 'Invoice processor',
      description: SEED_WORKFLOW.description,
      nodes: JSON.parse(JSON.stringify(SEED_WORKFLOW.nodes)),
      edges: JSON.parse(JSON.stringify(SEED_WORKFLOW.edges)),
    }),
  },
];

/* ---------------- hook ---------------- */

export function useWorkflows() {
  const [list, setList] = useState([]);
  const [currentId, setCurrentId] = useState(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const seeded = ensureBootstrapped();
    setList(seeded);
    let cur = null;
    try { cur = localStorage.getItem(CURRENT_KEY); } catch {}
    if (!cur || !seeded.some(w => w.id === cur)) cur = seeded[0]?.id || null;
    setCurrentId(cur);
    if (cur) { try { localStorage.setItem(CURRENT_KEY, cur); } catch {} }
    setReady(true);
  }, []);

  const refresh = useCallback(() => {
    setList(readList());
  }, []);

  const switchTo = useCallback((id) => {
    if (!list.some(w => w.id === id)) return;
    try { localStorage.setItem(CURRENT_KEY, id); } catch {}
    setCurrentId(id);
  }, [list]);

  const create = useCallback(({ name, template }) => {
    const tpl = WORKFLOW_TEMPLATES.find(t => t.id === template) || WORKFLOW_TEMPLATES[0];
    const body = tpl.body();
    const id = makeId();
    const now = new Date().toISOString();
    body.name = name || body.name || 'Untitled workflow';
    writeBody(id, body);
    const entry = { id, name: body.name, description: body.description || '', createdAt: now, updatedAt: now };
    const nextList = [entry, ...readList()];
    writeList(nextList);
    setList(nextList);
    try { localStorage.setItem(CURRENT_KEY, id); } catch {}
    setCurrentId(id);
    return id;
  }, []);

  const rename = useCallback((id, name) => {
    const now = new Date().toISOString();
    const nextList = readList().map(w => w.id === id ? { ...w, name, updatedAt: now } : w);
    writeList(nextList);
    setList(nextList);
    const body = readBody(id);
    if (body) writeBody(id, { ...body, name });
  }, []);

  const duplicate = useCallback((srcId) => {
    const src = readBody(srcId);
    if (!src) return null;
    const id = makeId();
    const now = new Date().toISOString();
    const name = `${src.name} (copy)`;
    writeBody(id, { ...src, name });
    const entry = { id, name, description: src.description || '', createdAt: now, updatedAt: now };
    const nextList = [entry, ...readList()];
    writeList(nextList);
    setList(nextList);
    try { localStorage.setItem(CURRENT_KEY, id); } catch {}
    setCurrentId(id);
    return id;
  }, []);

  const remove = useCallback((id) => {
    const nextList = readList().filter(w => w.id !== id);
    if (nextList.length === 0) return false;    // never remove the last one
    writeList(nextList);
    try { localStorage.removeItem(bodyKey(id)); } catch {}
    setList(nextList);
    if (currentId === id) {
      const nextCur = nextList[0].id;
      try { localStorage.setItem(CURRENT_KEY, nextCur); } catch {}
      setCurrentId(nextCur);
    }
    return true;
  }, [currentId]);

  /* touch(id) — update updatedAt for the list entry after a save.
     Called by the app after it persists the body. */
  const touch = useCallback((id, updates = {}) => {
    const now = new Date().toISOString();
    const nextList = readList().map(w => w.id === id ? { ...w, ...updates, updatedAt: now } : w);
    writeList(nextList);
    setList(nextList);
  }, []);

  return { list, currentId, ready, switchTo, create, rename, duplicate, remove, refresh, touch };
}
