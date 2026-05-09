// Resolve policy gates for a run.
// Used by ComplianceTab, OverviewTab, and the legacy PolicyGatesPanel —
// keeps the synthesis logic in one place so the three views always agree.

import { EVALUATIONS, CONTROLS } from '../../grc/_data';

export function gatesForRun(runId, agentName) {
  const matched = EVALUATIONS.filter(e => e.runId === runId);
  if (matched.length > 0) return matched;

  // Deterministic synthetic fallback based on runId hash.
  let h = 0;
  for (let i = 0; i < runId.length; i++) h = (h * 31 + runId.charCodeAt(i)) | 0;
  const pickIdx = Math.abs(h) % CONTROLS.length;
  const seedControls = [
    CONTROLS[pickIdx],
    CONTROLS[(pickIdx + 3) % CONTROLS.length],
    CONTROLS[(pickIdx + 7) % CONTROLS.length],
    CONTROLS[(pickIdx + 11) % CONTROLS.length],
  ];

  const decisionPool = ['allow', 'redact', 'warn', 'log'];
  return seedControls.map((c, i) => {
    const d = c.enforcement === 'log' ? 'log'
            : c.enforcement === 'block' ? decisionPool[(Math.abs(h) + i) % decisionPool.length]
            : c.enforcement;
    return {
      id: `eval_synth_${runId}_${i}`,
      runId,
      agentName: agentName || '—',
      hook: c.hook,
      controlId: c.id,
      decision: d,
      detail: synthDetail(c),
      when: ['just now', '12s ago', '430ms ago', '1m ago'][i] || 'in run',
      framework: null,
      clause: null,
    };
  });
}

function synthDetail(c) {
  switch (c.id) {
    case 'av.input.pii-detect':         return 'Redacted 1 email and 1 phone from prompt';
    case 'av.input.injection-scan':     return 'Heuristic + classifier · no injection signal';
    case 'av.tool.allowlist':           return 'All tool invocations within manifest';
    case 'av.tool.high-risk-approval':  return 'No risk≥high tool calls in this run';
    case 'av.output.disclosure':        return 'Disclosure marker appended to output';
    case 'av.output.hallucination':     return 'All claims trace to retrieved chunks';
    case 'av.run.audit-log':            return 'Run record sealed · sha256 chained';
    case 'av.run.human-oversight':      return 'Agent risk-class: standard';
    case 'av.model.card':               return 'Model card current; expires in 92 days';
    case 'av.data.lineage':             return 'All sources declare lawful basis';
    case 'av.bias.eval':                return 'Last weekly eval: DPD 0.04 (in-tolerance)';
    case 'av.tool.rate-limit':          return 'Within token + tool-call budget';
    case 'av.knowledge.acl':            return 'Row-level ACL applied · 1.2M → 840k';
    case 'av.gpai.provider-disclosure': return 'Provider doc on file (Art. 53)';
    case 'av.fria':                     return 'FRIA on file · last reviewed 2026-03-12';
    case 'av.policy.organizational':   return 'Org-wide AI policy current; reviewed 2026-04-02';
    case 'av.risk.assessment':         return 'Risk assessment on file · refreshed 2026-04-12';
    case 'av.resources.attestation':   return 'Owner + on-call + budget attested this quarter';
    case 'av.crypto.transit-rest':     return 'TLS 1.3 in transit · CMK at rest';
    case 'av.detect.anomaly':          return 'Run shape within baseline tolerance';
    case 'av.output.sanitize':         return 'Stripped 1 unsafe HTML token from output';
    case 'av.output.system-prompt-guard': return 'No system-prompt fragments in output';
    case 'av.knowledge.index-integrity':  return 'Index distribution within tolerance · no poisoning signal';
    default:                            return 'Evaluated';
  }
}
