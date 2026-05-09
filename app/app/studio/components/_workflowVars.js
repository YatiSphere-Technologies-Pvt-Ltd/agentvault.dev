/* Compute the {{...}} variables that are valid to reference from a given
   node, based on the workflow graph. Returns a flat list of suggestions:
   each one is `{ path, source, hint }` where `path` is what gets inserted
   into the textarea (e.g. "{{steps.n3.output.text}}").

   Sources we surface today:
     • trigger inputs   — guessed from the trigger node's `schema` field,
       which is a JSON-ish blob describing the body. We parse keys from it.
     • upstream step outputs — for every ancestor node, we pull a few common
       fields based on its variant kind (text, status, rows, label, …).
     • workflow-level vars — currently a static list, expand later.

   This is intentionally lo-fi (string-keyed, not type-checked) — the goal is
   discoverability, not validation. */

import { getOutputSchema, getVariant } from './node-kinds';

function ancestorIds(workflow, targetId) {
  const incoming = {};
  for (const e of workflow.edges) {
    if (!incoming[e.to]) incoming[e.to] = [];
    incoming[e.to].push(e.from);
  }
  const seen = new Set();
  const stack = [...(incoming[targetId] || [])];
  while (stack.length) {
    const cur = stack.pop();
    if (seen.has(cur)) continue;
    seen.add(cur);
    for (const p of incoming[cur] || []) stack.push(p);
  }
  return [...seen];
}

function triggerInputKeys(workflow) {
  const trigger = workflow.nodes.find(n => n.variantId?.startsWith('trigger.'));
  if (!trigger) return [];
  const schema = trigger.params?.schema;
  if (typeof schema !== 'string') return [];
  // Extract bare keys from a JSON-ish blob — accept either real JSON or the
  // shorthand we ship in seeds (`{ "x": "string" }`).
  const keys = [];
  const re = /"([a-zA-Z_][a-zA-Z0-9_]*)"\s*:/g;
  let m;
  while ((m = re.exec(schema)) !== null) keys.push(m[1]);
  return keys;
}

function fallbackOutputFields(variantId) {
  // For variants we don't have a getOutputSchema entry for yet, surface a few
  // common fields so the picker isn't empty.
  if (variantId?.startsWith('tool.')) return [
    { path: 'status',   type: 'number' },
    { path: 'body',     type: 'any' },
    { path: 'latency',  type: 'number' },
  ];
  if (variantId === 'tool.snowflake') return [
    { path: 'rows',     type: 'array' },
    { path: 'row_count',type: 'number' },
  ];
  if (variantId?.startsWith('human.')) return [
    { path: 'approved', type: 'boolean' },
    { path: 'by',       type: 'string' },
  ];
  if (variantId?.startsWith('branch.')) return [
    { path: 'branch',   type: 'string' },
  ];
  if (variantId === 'policy.cedar') return [
    { path: 'allowed',  type: 'boolean' },
    { path: 'reasons',  type: 'string[]' },
  ];
  if (variantId?.startsWith('code.')) return [
    { path: 'result',   type: 'any' },
  ];
  return [{ path: 'output', type: 'any' }];
}

export function getAvailableVars(workflow, nodeId) {
  if (!workflow || !nodeId) return [];
  const out = [];

  for (const k of triggerInputKeys(workflow)) {
    out.push({
      path:   `{{trigger.${k}}}`,
      source: 'trigger',
      hint:   `from trigger schema · ${k}`,
    });
  }

  const ancestors = ancestorIds(workflow, nodeId);
  for (const aid of ancestors) {
    const node = workflow.nodes.find(n => n.id === aid);
    if (!node) continue;
    const v = getVariant(node.variantId);
    const label = node.params?.label || v?.label || aid;
    const schema = getOutputSchema(node.variantId);
    const fields = schema?.fields?.length ? schema.fields : fallbackOutputFields(node.variantId);
    // Surface up to 4 fields per upstream node — keeps the picker tight.
    for (const f of fields.slice(0, 4)) {
      out.push({
        path:   `{{steps.${aid}.output.${f.path}}}`,
        source: `${label} · ${aid}`,
        hint:   `${f.type}${f.desc ? ` · ${f.desc.split('.')[0]}` : ''}`,
      });
    }
  }

  return out;
}

/* Heuristic token estimate — we don't import a real tokenizer client-side.
   Char/4 is the well-known rule-of-thumb that's close enough for a UI hint. */
export function estimateTokens(str) {
  if (!str) return 0;
  return Math.ceil(String(str).length / 4);
}
