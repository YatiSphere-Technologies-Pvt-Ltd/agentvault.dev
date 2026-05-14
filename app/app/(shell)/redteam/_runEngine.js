/* Red Team run engine — deterministic mock.
   ─────────────────────────────────────────
   Given a (target, suite, library_version), produce the same findings on
   every call. Verdicts are weighted so the demo looks realistic:

     - Most probes PASS (the platform's policies work)
     - 5–10% BYPASS, concentrated in the harder categories (indirect
       injection, supply chain, multimodal — the categories the buyer
       expects to be hard)
     - 2–3% INCONCLUSIVE (routes to human review queue)

   Deterministic seeding uses a string hash of
   (target_id × attack_id × library_version) so the same probe always
   yields the same verdict until you change the library or target. */

import { ATTACKS, attackById } from './_attackCatalog';
import { suiteById } from './_targetCatalog';

/* ── tiny deterministic RNG ── */
function strHash(s) {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); }
  return h >>> 0;
}
function rngFor(seed) {
  let s = typeof seed === 'string' ? strHash(seed) : seed >>> 0;
  return () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 0xffffffff; };
}

/* ── category-bypass weights ──
   Higher = more likely to bypass. Tuned so the demo lands realistic
   numbers (~5–10% overall) with the *hard* categories more often
   failing — which is what a CISO would expect. */
const BYPASS_WEIGHT = {
  direct_prompt_injection:   0.06,
  indirect_prompt_injection: 0.12,   // hardest — planted payloads sneak through
  jailbreak:                 0.07,
  agent_abuse:               0.09,
  data_exfiltration:         0.04,   // DLP catches most
  rag_attack:                0.10,
  multimodal:                0.14,   // visual / audio attacks underrepresented in training
  model_abuse:               0.05,
  supply_chain:              0.11,
};

const INCONCLUSIVE_RATE = 0.025;

/* ── public: resolve suite filter to a list of attack ids ── */
export function resolveSuiteAttacks(suite, library = ATTACKS) {
  const f = suite.filter || {};
  let pool = library.slice();
  if (Array.isArray(f.categories) && f.categories.length) {
    pool = pool.filter(a => f.categories.includes(a.category));
  }
  if (Array.isArray(f.severities) && f.severities.length) {
    pool = pool.filter(a => f.severities.includes(a.severity));
  }
  if (Array.isArray(f.owasp_llm) && f.owasp_llm.length) {
    pool = pool.filter(a => (a.owasp_llm_refs || []).some(r => f.owasp_llm.includes(r)));
  }
  if (Array.isArray(f.atlas) && f.atlas.length) {
    pool = pool.filter(a => (a.atlas_refs || []).some(r => f.atlas.includes(r)));
  }

  const max = typeof f.sample === 'number' ? f.sample : null;
  if (max && pool.length > max) {
    if (f.sample_mode === 'stratified-by-severity') {
      pool = stratifiedSample(pool, max, a => a.severity);
    } else {
      // risk-weighted by default — sort by severity score, drop the tail
      const score = { critical: 4, high: 3, medium: 2, low: 1 };
      pool.sort((a, b) => (score[b.severity] || 0) - (score[a.severity] || 0));
      pool = pool.slice(0, max);
    }
  }
  return pool;
}

function stratifiedSample(pool, n, keyFn) {
  const buckets = {};
  for (const x of pool) {
    const k = keyFn(x);
    (buckets[k] = buckets[k] || []).push(x);
  }
  const perBucket = Math.max(1, Math.floor(n / Object.keys(buckets).length));
  const out = [];
  for (const k of Object.keys(buckets)) {
    out.push(...buckets[k].slice(0, perBucket));
  }
  return out.slice(0, n);
}

/* ── public: compute the deterministic verdict for one probe ── */
export function verdictFor({ targetId, attackId, libraryVersion }) {
  const rng = rngFor(`${targetId}:${attackId}:${libraryVersion}`);
  const attack = attackById(attackId);
  const cat = attack?.category || 'direct_prompt_injection';
  const baseWeight = BYPASS_WEIGHT[cat] || 0.06;

  // Severity adjustment — higher-severity attacks land slightly more often,
  // mirroring real-world model brittleness against critical attacks.
  const sevAdj = { critical: 1.15, high: 1.05, medium: 0.95, low: 0.80 }[attack?.severity] || 1.0;
  const effectiveBypass = baseWeight * sevAdj;

  const r = rng();
  if (r < INCONCLUSIVE_RATE)                                return 'inconclusive';
  if (r < INCONCLUSIVE_RATE + effectiveBypass)               return 'bypass';
  return 'pass';
}

/* ── public: synthesize all findings for a run ── */
export function synthesizeFindings({ runId, targetId, suiteId, libraryVersion, previousFindings = {} }) {
  const suite = suiteById(suiteId);
  if (!suite) return [];

  const attacks = resolveSuiteAttacks(suite);
  const out = [];

  let _fid = 0;
  for (const attack of attacks) {
    const verdict = verdictFor({ targetId, attackId: attack.id, libraryVersion });
    if (verdict === 'pass') continue;  // we only persist non-pass findings; passes contribute to stats only

    _fid += 1;
    const findingId = `rtfind_${runId.replace('rtrun_', '')}_${String(_fid).padStart(3, '0')}`;

    // Regression: if the same (target × attack) was 'pass' in the previous
    // run for this target+suite and now is 'bypass', it's a regression.
    const prevVerdict = previousFindings[`${targetId}:${attack.id}`];
    const isRegression = verdict === 'bypass' && prevVerdict === 'pass';

    out.push({
      id: findingId, run_id: runId, target_id: targetId, attack_id: attack.id,
      library_version: libraryVersion,
      verdict,
      severity: attack.severity,
      cvss_ai_score: cvssScoreFor(attack.severity, attack.impact_class),
      atlas: attack.atlas_refs || [],
      owasp_llm: attack.owasp_llm_refs || [],
      owasp_agentic: attack.owasp_agentic_refs || [],
      nist: attack.nist_refs || [],
      evidence: {
        request: { payload_preview: (attack.payload_template || '').slice(0, 240) },
        response: {
          text: verdict === 'bypass'
            ? 'The model complied with the attack and produced disallowed output (synthesized for demo).'
            : 'Model output ambiguous; judge confidence below threshold (synthesized).',
          tokens_out: 96 + Math.floor(verdict === 'bypass' ? 80 : 0),
        },
        tool_calls: [],
        gates_fired: [],
      },
      judge: {
        kind: attack.success_criteria?.[0]?.kind?.startsWith('rule') ? 'rule' : 'rule+llm',
        llm_confidence: verdict === 'inconclusive' ? 0.58 : 0.92,
        human_reviewed: false,
      },
      reproduction: { deterministic: true },
      remediation: { suggested_controls: attack.remediation_hints || [], ticket: null },
      is_regression: isRegression,
      regression_of: isRegression ? `prev_${attack.id}` : null,
      status: verdict === 'inconclusive' ? 'pending-review' : 'open',
      created_at: Date.now(),
    });
  }
  return out;
}

/* ── public: aggregate stats for a run from its findings + total probes ── */
export function runStatsFromFindings(findings, totalProbes) {
  const bypassed = findings.filter(f => f.verdict === 'bypass').length;
  const inconclusive = findings.filter(f => f.verdict === 'inconclusive').length;
  return {
    total: totalProbes,
    passed: totalProbes - bypassed - inconclusive,
    bypassed,
    inconclusive,
    regressions: findings.filter(f => f.is_regression).length,
  };
}

/* ── public: posture score 0..100 from a target's most recent runs ── */
export function postureScoreFor(target, runs) {
  const last = runs.filter(r => r.target_id === target.id).sort((a, b) => b.started_at - a.started_at)[0];
  if (!last || !last.total) return null;
  // Weighted: critical bypasses cost more than low.
  // (Simplified for demo — derives from stored totals.)
  const failRate = (last.bypassed + last.inconclusive * 0.5) / last.total;
  return Math.max(0, Math.min(100, Math.round(100 * (1 - failRate * 1.5))));
}

function cvssScoreFor(severity, impact) {
  const base = { critical: 9.5, high: 7.5, medium: 5.0, low: 2.5 }[severity] || 5.0;
  const bonus = impact === 'data-exfil' ? 0.5 : impact === 'integrity' ? 0.3 : 0;
  return Math.min(10, Math.round((base + bonus) * 10) / 10);
}

/* ── public: cost / token estimate for a planned run ── */
export function estimateRunCost(suite) {
  const probes = resolveSuiteAttacks(suite).length;
  // rough: 6k tokens per probe (system + payload + response + judge)
  const tokens = probes * 6000;
  const cost = (tokens / 1_000_000) * 4.0;  // ~$4/MTok blended
  return { probes, tokens, cost_usd: Math.round(cost * 100) / 100 };
}
