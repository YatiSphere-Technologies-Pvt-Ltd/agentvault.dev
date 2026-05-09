'use client';

import { CONTROLS, FRAMEWORKS, MAPPINGS } from './_data';

/* extractPolicyDraft
   ------------------
   Takes a natural-language description of a policy and returns a structured
   draft the user can review before saving.

   Output shape matches the POLICIES fixture (plus per-suggestion rationale):
     {
       name, summary,
       frameworks: [slug, ...],
       controls:   [controlId, ...],
       suggestions: { [controlId]: { score, reasons: [string] } },
       attached:   { workspaces, agents, tools },
       enforcementOverrides: { [controlId]: 'block' | 'redact' | ... } // optional
     }

   The function is async on purpose. The current implementation is local and
   synchronous, but the call site treats it as async so we can swap in a route
   handler that calls Claude later without changing any UI.
*/

// Keyword index: control_id -> list of token bundles, each bundle scores points
// when ALL tokens in the bundle match the prompt. This catches both "no PII"
// (single token) and "human approval for high risk" (bundle).
const CONTROL_KEYWORDS = {
  'av.input.pii-detect': [
    ['pii'], ['personal information'], ['personal data'],
    ['email'], ['phone'], ['ssn'], ['national id'], ['payment'],
    ['credit card'], ['mask'], ['redact'], ['scrub'], ['anonymize'],
  ],
  'av.input.injection-scan': [
    ['prompt injection'], ['jailbreak'], ['prompt attack'],
    ['indirect injection'], ['injection'],
  ],
  'av.tool.allowlist': [
    ['allowlist'], ['allow list'], ['whitelist'],
    ['allowed tool'], ['approved tool'], ['restrict tool'],
    ['only', 'tool'], ['scope', 'tool'],
  ],
  'av.tool.high-risk-approval': [
    ['approval'], ['approve'], ['human approval'], ['manager approval'],
    ['four eyes'], ['high risk', 'tool'], ['payment', 'approval'],
    ['delete', 'approval'], ['external', 'approval'],
    ['external email'], ['outside', 'domain'],
    ['critical action'], ['sensitive action'],
  ],
  'av.output.disclosure': [
    ['disclosure'], ['disclose'], ['ai-generated'], ['ai generated'],
    ['transparency'], ['inform user'], ['notify user'], ['watermark'],
    ['art. 50'], ['article 50'], ['deepfake'],
  ],
  'av.output.hallucination': [
    ['hallucination'], ['confabulation'], ['cite'], ['citation'],
    ['grounded'], ['grounding'], ['source'], ['factual'], ['accuracy'],
    ['fact check'], ['verify claim'],
  ],
  'av.run.audit-log': [
    ['audit'], ['audit log'], ['immutable log'], ['log everything'],
    ['record keeping'], ['record-keeping'], ['evidence'],
    ['traceable'], ['retain'], ['retention'],
  ],
  'av.run.human-oversight': [
    ['human oversight'], ['human in the loop'], ['hitl'],
    ['human review'], ['no autonomous'], ['manual review'],
    ['high-risk', 'agent'], ['annex iii'], ['art. 14'], ['article 14'],
  ],
  'av.model.card': [
    ['model card'], ['model documentation'], ['model lineage'],
    ['model version'], ['model registry'],
  ],
  'av.data.lineage': [
    ['lineage'], ['lawful basis'], ['consent'], ['legitimate interest'],
    ['minimization'], ['data minimization'], ['gdpr', 'basis'],
    ['data source'], ['provenance'],
  ],
  'av.bias.eval': [
    ['bias'], ['fairness'], ['disparate'], ['protected attribute'],
    ['discrimination'], ['equal opportunity'], ['demographic parity'],
  ],
  'av.fria': [
    ['fria'], ['fundamental rights'], ['impact assessment'],
    ['art. 27'], ['article 27'], ['rights assessment'],
  ],
  'av.tool.rate-limit': [
    ['rate limit'], ['rate-limit'], ['budget'], ['token budget'],
    ['quota'], ['runaway'], ['cost cap'], ['unbounded'],
  ],
  'av.knowledge.acl': [
    ['acl'], ['row-level'], ['row level'], ['access control'],
    ['permission', 'retrieval'], ['permission', 'rag'],
    ['multi-tenant'], ['cross-tenant'], ['leak'], ['leakage'],
    ['retrieval', 'permission'],
  ],
  'av.gpai.provider-disclosure': [
    ['gpai'], ['foundation model', 'provider'],
    ['provider', 'documentation'], ['art. 53'], ['article 53'],
    ['supply chain'], ['third-party model'],
  ],
};

const FRAMEWORK_KEYWORDS = {
  'eu-ai-act':       ['eu ai act', 'ai act', 'european ai act', 'art. 9', 'art. 10', 'art. 11', 'art. 12', 'art. 13', 'art. 14', 'art. 15', 'art. 26', 'art. 27', 'art. 50', 'art. 53', 'annex iii', 'high-risk'],
  'nist-ai-rmf':     ['nist', 'ai rmf', 'nist ai', 'genai profile'],
  'iso-42001':       ['iso 42001', 'iso/iec 42001', '42001', 'aims'],
  'iso-27001':       ['iso 27001', 'iso/iec 27001', '27001', 'isms'],
  'soc2':            ['soc 2', 'soc2', 'soc-2', 'trust services'],
  'hipaa':           ['hipaa', 'phi', 'protected health', 'healthcare'],
  'gdpr':            ['gdpr', 'data protection regulation', 'dpia', 'art. 22', 'article 22', 'automated decision'],
  'owasp-llm-top10': ['owasp', 'llm top 10', 'llm10', 'llm01', 'llm02'],
};

const ATTACHMENT_HINTS = {
  workspace: ['workspace', 'every agent', 'all agents', 'globally', 'organization', 'org-wide'],
  agent:     ['agent', 'specific agent', 'this agent'],
  tool:      ['tool', 'connector', 'integration'],
};

// Loose enforcement-mode hints to optionally override a control's default.
const ENFORCEMENT_HINTS = [
  { mode: 'block',            patterns: ['block', 'prevent', 'disallow', 'deny', 'forbid', 'never'] },
  { mode: 'require_approval', patterns: ['require approval', 'manager approval', 'human approval', 'four eyes', 'pause', 'gate'] },
  { mode: 'redact',           patterns: ['redact', 'mask', 'strip', 'remove pii'] },
  { mode: 'warn',             patterns: ['warn', 'flag', 'alert', 'notify'] },
  { mode: 'log',              patterns: ['log only', 'just log', 'log everything', 'audit only'] },
];

function lower(s) { return (s || '').toLowerCase(); }

function bundleMatches(text, bundle) {
  return bundle.every(t => text.includes(t));
}

function scoreControls(text) {
  const scores = {};
  const reasons = {};
  for (const [cid, bundles] of Object.entries(CONTROL_KEYWORDS)) {
    let score = 0;
    const hits = [];
    for (const bundle of bundles) {
      if (bundleMatches(text, bundle)) {
        // Multi-token bundles score more than single tokens
        score += bundle.length === 1 ? 1 : 2;
        hits.push(bundle.join(' + '));
      }
    }
    if (score > 0) {
      scores[cid] = score;
      reasons[cid] = hits;
    }
  }
  return { scores, reasons };
}

function scoreFrameworks(text, controlIds) {
  const direct = new Set();
  for (const [slug, kws] of Object.entries(FRAMEWORK_KEYWORDS)) {
    if (kws.some(k => text.includes(k))) direct.add(slug);
  }

  // Inferred from chosen controls — every control discharges some clauses,
  // and if the user mentions controls but no frameworks, surface the implied set.
  const inferred = new Set();
  for (const cid of controlIds) {
    for (const [slug] of MAPPINGS[cid] || []) inferred.add(slug);
  }

  // Direct mentions win; if none, fall back to the top inferred frameworks
  // (capped — a policy with 8 framework badges is not informative).
  if (direct.size > 0) {
    return Array.from(direct);
  }
  // Sort inferred by how many of the chosen controls mention them
  const counts = {};
  for (const cid of controlIds) {
    for (const [slug] of MAPPINGS[cid] || []) counts[slug] = (counts[slug] || 0) + 1;
  }
  return Array.from(inferred)
    .sort((a, b) => (counts[b] || 0) - (counts[a] || 0))
    .slice(0, 4);
}

function detectEnforcementOverrides(text, controlIds) {
  const overrides = {};
  for (const cid of controlIds) {
    for (const hint of ENFORCEMENT_HINTS) {
      if (hint.patterns.some(p => text.includes(p))) {
        // Only override if the requested mode is actually more restrictive
        // than the control default — e.g. user says "block" on a warn control.
        const ctrl = CONTROLS.find(c => c.id === cid);
        if (!ctrl) continue;
        const order = ['log', 'warn', 'redact', 'require_approval', 'block'];
        const userIdx = order.indexOf(hint.mode);
        const defIdx  = order.indexOf(ctrl.enforcement);
        if (userIdx > defIdx) overrides[cid] = hint.mode;
        break;
      }
    }
  }
  return overrides;
}

function detectAttachments(text) {
  const out = { workspaces: 0, agents: 0, tools: 0 };
  if (ATTACHMENT_HINTS.workspace.some(h => text.includes(h))) out.workspaces = 1;
  if (ATTACHMENT_HINTS.agent.some(h => text.includes(h))) out.agents = 1;
  if (ATTACHMENT_HINTS.tool.some(h => text.includes(h))) out.tools = 1;
  return out;
}

function deriveName(prompt) {
  const trimmed = prompt.trim();
  if (!trimmed) return 'Untitled policy';
  // First sentence, capped to ~64 chars, with trailing punctuation stripped
  const firstSentence = trimmed.split(/[.!?\n]/)[0].trim();
  const capped = firstSentence.length > 64 ? firstSentence.slice(0, 61) + '…' : firstSentence;
  return capped.charAt(0).toUpperCase() + capped.slice(1);
}

function deriveSummary(prompt) {
  const trimmed = prompt.trim();
  if (trimmed.length <= 240) return trimmed;
  return trimmed.slice(0, 237) + '…';
}

/* The seam.
   Today: local heuristic, returns synchronously wrapped in a Promise.
   Tomorrow: replace body with `await fetch('/api/grc/extract-policy', ...)`
   that calls Claude with structured outputs. UI doesn't change. */
export async function extractPolicyDraft(prompt) {
  const text = lower(prompt);
  if (!text.trim()) {
    return {
      name: '',
      summary: '',
      frameworks: [],
      controls: [],
      suggestions: {},
      enforcementOverrides: {},
      attached: { workspaces: 0, agents: 0, tools: 0 },
      empty: true,
    };
  }

  const { scores, reasons } = scoreControls(text);

  // Pick controls scoring above threshold; if nothing scores, pick the single
  // highest so the draft isn't empty (the user can drop it).
  const ranked = Object.entries(scores).sort(([, a], [, b]) => b - a);
  const passing = ranked.filter(([, s]) => s >= 1).map(([cid]) => cid);
  const controls = passing.length > 0 ? passing : (ranked[0] ? [ranked[0][0]] : []);

  const frameworks = scoreFrameworks(text, controls);
  const enforcementOverrides = detectEnforcementOverrides(text, controls);
  const attached = detectAttachments(text);

  const suggestions = {};
  for (const cid of controls) {
    suggestions[cid] = {
      score: scores[cid] || 0,
      reasons: reasons[cid] || [],
    };
  }

  return {
    name: deriveName(prompt),
    summary: deriveSummary(prompt),
    frameworks,
    controls,
    suggestions,
    enforcementOverrides,
    attached,
    empty: false,
  };
}

// Three example prompts the operator can click on the Describe tab
export const EXAMPLE_PROMPTS = [
  {
    title: 'Healthcare agent guardrails',
    body: 'Agents touching PHI must redact PII from prompts, enforce row-level ACLs on retrieval, require human approval before sending anything to a patient, and keep an immutable audit log. We need to satisfy HIPAA and the EU AI Act for our EU-resident patients.',
  },
  {
    title: 'External email gate',
    body: 'Block any agent from sending external emails to addresses outside our domain unless a manager approves it. Log everything for audit. Apply to every agent in the workspace.',
  },
  {
    title: 'EU AI Act high-risk readiness',
    body: 'For agents we classify high-risk under Annex III: require a current FRIA on file, mandatory human-in-the-loop on every output, append AI disclosure to outputs, capture model card and data lineage, and run weekly bias evaluations.',
  },
];
