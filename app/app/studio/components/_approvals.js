/* Human-in-the-loop approval points.
   ─────────────────────────────────
   An approval point is a declarative pause an agent (or other node) can take
   to wait for a human decision. The same primitive serves four patterns:

     before_run          — gate the whole agent before it starts
     before_tool:<id>    — interrupt the loop before a specific tool fires
     after_run           — review the agent's proposed result
     on_demand           — the agent itself asked for help (clarifying question)

   Shape (per approval point):
     {
       id:               unique within the agent
       trigger:          one of the strings above
       enabled:          boolean — toggles the gate without removing it
       required:         lo-fi expression evaluated against context + result
                         e.g. "context.amount > 10000"
                         empty → always required (i.e. always pause)
       preview:          template string shown to the human; uses {{...}}
       channel:          "slack:#chan" | "email:addr" | "queue:default"
       approvers:        free-text group / handle / email
       timeout_h:        hours to wait
       on_timeout:       "approve" | "reject" | "escalate:<id>"
       fields_editable:  array of `result` field names the human may change
       decisions:        ordered list, e.g. ["approve","reject"]
                         the agent's `context.human_response.decision` will be
                         one of these.
     }
*/

export const APPROVAL_PRESETS = [
  {
    id: 'preflight',
    label: 'Pre-flight gate',
    desc: 'Approve before the agent runs at all. Best for risky / costly actions.',
    template: () => ({
      id: newApprovalId(),
      trigger: 'before_run',
      enabled: true,
      required: '',
      preview:  'Approve agent run for: {{context}}',
      channel:  'queue:default',
      approvers: 'team:operators',
      timeout_h: 24,
      on_timeout: 'reject',
      fields_editable: [],
      decisions: ['approve', 'reject'],
    }),
  },
  {
    id: 'tool',
    label: 'Tool guardrail',
    desc: 'Pause mid-loop before a specific tool fires (e.g. posting to NetSuite).',
    template: ({ toolId } = {}) => ({
      id: newApprovalId(),
      trigger: 'before_tool:' + (toolId || 'netsuite.bill'),
      enabled: true,
      required: '',
      preview:  'Confirm before calling {{tool}}: {{tool_args}}',
      channel:  'slack:#approvals',
      approvers: 'finance-managers',
      timeout_h: 4,
      on_timeout: 'reject',
      fields_editable: [],
      decisions: ['approve', 'reject'],
    }),
  },
  {
    id: 'postflight',
    label: 'Post-flight review',
    desc: 'Review the agent\'s proposed result before it goes downstream.',
    template: () => ({
      id: newApprovalId(),
      trigger: 'after_run',
      enabled: true,
      required: '',
      preview:  'Review agent output:\n{{result}}',
      channel:  'queue:default',
      approvers: 'team:operators',
      timeout_h: 24,
      on_timeout: 'approve',
      fields_editable: [],
      decisions: ['approve', 'reject'],
    }),
  },
  {
    id: 'clarify',
    label: 'Clarifying question',
    desc: 'The agent calls for help mid-loop and waits for an answer.',
    template: () => ({
      id: newApprovalId(),
      trigger: 'on_demand',
      enabled: true,
      required: '',
      preview:  '{{question}}',
      channel:  'slack:#agent-help',
      approvers: 'team:operators',
      timeout_h: 1,
      on_timeout: 'reject',
      fields_editable: [],
      decisions: ['answered'],
    }),
  },
];

let _aid = 0;
export function newApprovalId() {
  _aid += 1;
  return `ap_${Date.now().toString(36).slice(-4)}${_aid}`;
}

/* Trigger helpers — the trigger field is "before_run" | "before_tool:<id>"
   | "after_run" | "on_demand". We split it so the UI can pick a tool when the
   user picks the tool guardrail preset. */
export function triggerKind(trigger) {
  if (!trigger) return 'before_run';
  if (trigger.startsWith('before_tool:')) return 'before_tool';
  return trigger;
}
export function triggerToolId(trigger) {
  if (!trigger?.startsWith('before_tool:')) return '';
  return trigger.slice('before_tool:'.length);
}
export function makeTrigger(kind, toolId) {
  if (kind === 'before_tool') return 'before_tool:' + (toolId || 'netsuite.bill');
  return kind;
}

/* Channel helpers — the channel string is "kind:value". */
export function channelKind(channel) {
  if (!channel) return 'queue';
  return channel.split(':')[0];
}
export function channelValue(channel) {
  if (!channel) return 'default';
  const parts = channel.split(':');
  return parts.slice(1).join(':') || 'default';
}
export function makeChannel(kind, value) {
  return `${kind}:${value || (kind === 'queue' ? 'default' : '')}`;
}

/* Tiny expression evaluator for the `required` field. Supports a small
   grammar — enough to gate without pulling in a parser dependency:

     <path>  <op>  <value>
     <path>                          (truthiness)
     <path>  &&  <path>              (AND/OR, two terms only)

   Where <path> is "context.x" / "result.y" / "trigger.z" and <op> is one of
   == != >= <= > <. <value> is a number, "string", true, false, or null.

   We deliberately keep it tiny. The textarea fallback handles power users. */
export function evalRequired(expr, ctx) {
  if (!expr || !expr.trim()) return true;
  const orParts = expr.split('||').map(s => s.trim());
  for (const part of orParts) {
    const andParts = part.split('&&').map(s => s.trim());
    if (andParts.every(t => evalSingle(t, ctx))) return true;
  }
  return false;
}

function evalSingle(term, ctx) {
  if (!term) return true;
  // Comparison?
  const m = term.match(/^(.+?)\s*(==|!=|>=|<=|>|<)\s*(.+)$/);
  if (m) {
    const lhs = readPath(m[1].trim(), ctx);
    const rhs = parseLiteral(m[3].trim(), ctx);
    switch (m[2]) {
      case '==': return looseEq(lhs, rhs);
      case '!=': return !looseEq(lhs, rhs);
      case '>':  return Number(lhs) >  Number(rhs);
      case '>=': return Number(lhs) >= Number(rhs);
      case '<':  return Number(lhs) <  Number(rhs);
      case '<=': return Number(lhs) <= Number(rhs);
      default:   return false;
    }
  }
  // Truthiness
  return Boolean(readPath(term, ctx));
}

function looseEq(a, b) {
  if (a == null && b == null) return true;
  if (typeof a === 'number' || typeof b === 'number') return Number(a) === Number(b);
  return String(a) === String(b);
}

function readPath(path, ctx) {
  if (path == null) return undefined;
  const segs = String(path).split('.');
  let cur = ctx;
  for (const s of segs) {
    if (cur == null) return undefined;
    cur = cur[s];
  }
  return cur;
}

function parseLiteral(s, ctx) {
  if (s === 'true')  return true;
  if (s === 'false') return false;
  if (s === 'null')  return null;
  if (/^-?\d+(\.\d+)?$/.test(s)) return Number(s);
  if ((s.startsWith('"') && s.endsWith('"')) || (s.startsWith("'") && s.endsWith("'"))) {
    return s.slice(1, -1);
  }
  // Treat unquoted bareword as a path
  return readPath(s, ctx);
}

/* Render the preview template against the runtime context. Mirrors the
   resolveTemplate helper used elsewhere — kept local so this module is
   import-cycle-free. */
export function renderPreview(tpl, ctx) {
  return String(tpl || '').replace(/\{\{\s*([^}]+?)\s*\}\}/g, (_, key) => {
    const segs = key.split('.');
    let cur = ctx;
    for (const seg of segs) cur = cur?.[seg];
    if (cur == null) return `{{${key}}}`;
    return typeof cur === 'string' ? cur : JSON.stringify(cur, null, 2);
  });
}

/* For the inspector's preview pane: figure out which approval points would
   actually fire given a sample context+result. Used to validate the user's
   `required` expression and let them see "yes, this would pause." */
export function dryRunApprovals(approvals, { context, result, tool, tool_args }) {
  const ctx = { context, result, tool, tool_args };
  const out = [];
  for (const a of approvals || []) {
    if (!a.enabled) { out.push({ id: a.id, fired: false, reason: 'disabled' }); continue; }
    let fired;
    try { fired = evalRequired(a.required || '', ctx); }
    catch (e) { out.push({ id: a.id, fired: false, reason: 'expr error: ' + e.message }); continue; }
    out.push({ id: a.id, fired, reason: a.required ? a.required : 'always' });
  }
  return out;
}

/* Convenience: split approvals by their trigger so the inspector can render
   them grouped (Pre-flight | Tool guardrails | Post-flight | On-demand). */
export function groupApprovals(approvals) {
  const groups = {
    before_run:   [],
    before_tool:  [],
    after_run:    [],
    on_demand:    [],
  };
  for (const a of approvals || []) {
    const k = triggerKind(a.trigger);
    if (groups[k]) groups[k].push(a);
  }
  return groups;
}
