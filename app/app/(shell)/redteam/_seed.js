/* Seed data for the Red Team module.
   ───────────────────────────────────
   - 6 registered targets (mix of agent / gateway / rag / mcp / chat)
   - 6 probe sets (smoke, regression, full, OWASP LLM, OWASP Agentic, EU AI Act)
   - 8 historical runs across multiple targets — used by the overview's
     trend chart and the regression detector
   - ~120 historical findings synthesized deterministically per (target,
     run, attack-sample)

   Pulls real attack IDs from _attackCatalog so cross-reference works. */

import { ATTACKS } from './_attackCatalog';

const NOW = Date.now();
const m = (n) => n * 60_000;
const h = (n) => n * 60 * 60_000;
const d = (n) => n * 24 * 60 * 60_000;

/* ───────────── targets ───────────── */

export function buildTargetsSeed() {
  return [
    {
      id: 'tgt_invoice_agent',
      name: 'Invoice triage agent · prod',
      type: 'agent',
      adapter: 'agentvault-native',
      adapter_config: { agent_id: 'agt_invoiceq' },
      consent_record: {
        granted_by: 'platform-eng@latentbridge.com',
        granted_at: NOW - d(45),
        allowed_categories: ['*'],
        allowed_severities: ['critical', 'high', 'medium', 'low'],
        expires_at: NOW + d(90),
      },
      scope: { environment: 'staging', rate_limit_rps: 5, max_tokens_per_run: 500_000 },
      last_tested_at: NOW - h(6),
      posture_score: 82,
      tags: ['finance', 'production'],
      created_at: NOW - d(60),
    },
    {
      id: 'tgt_kyc_agent',
      name: 'KYC verification agent',
      type: 'agent',
      adapter: 'agentvault-native',
      adapter_config: { agent_id: 'agt_kycverify' },
      consent_record: {
        granted_by: 'compliance@latentbridge.com',
        granted_at: NOW - d(40),
        allowed_categories: ['*'],
        allowed_severities: ['critical', 'high', 'medium', 'low'],
        expires_at: NOW + d(60),
      },
      scope: { environment: 'staging', rate_limit_rps: 3, max_tokens_per_run: 300_000 },
      last_tested_at: NOW - h(28),
      posture_score: 91,
      tags: ['compliance', 'production'],
      created_at: NOW - d(60),
    },
    {
      id: 'tgt_data_analyst',
      name: 'Data Analyst agent',
      type: 'agent',
      adapter: 'agentvault-native',
      adapter_config: { agent_id: 'agt_data_analyst' },
      consent_record: {
        granted_by: 'platform-eng@latentbridge.com',
        granted_at: NOW - d(30),
        allowed_categories: ['*'],
        allowed_severities: ['critical', 'high', 'medium', 'low'],
        expires_at: NOW + d(180),
      },
      scope: { environment: 'staging', rate_limit_rps: 10, max_tokens_per_run: 1_000_000 },
      last_tested_at: NOW - h(2),
      posture_score: 78,
      tags: ['analytics', 'production'],
      created_at: NOW - d(50),
    },
    {
      id: 'tgt_gateway',
      name: 'AI Gateway · default',
      type: 'gateway',
      adapter: 'gateway-mediated',
      adapter_config: { gateway_id: 'gw_default' },
      consent_record: {
        granted_by: 'security@latentbridge.com',
        granted_at: NOW - d(50),
        allowed_categories: ['*'],
        allowed_severities: ['critical', 'high', 'medium', 'low'],
        expires_at: NOW + d(365),
      },
      scope: { environment: 'production', rate_limit_rps: 20, max_tokens_per_run: 2_000_000 },
      last_tested_at: NOW - h(1),
      posture_score: 88,
      tags: ['perimeter', 'dlp'],
      created_at: NOW - d(70),
    },
    {
      id: 'tgt_customer360_rag',
      name: 'Customer 360 RAG pipeline',
      type: 'rag',
      adapter: 'rag-pipeline',
      adapter_config: { corpus_id: 'cor_customer_360', topk: 8 },
      consent_record: {
        granted_by: 'data-eng@latentbridge.com',
        granted_at: NOW - d(35),
        allowed_categories: ['rag_attack', 'indirect_prompt_injection', 'data_exfiltration'],
        allowed_severities: ['critical', 'high', 'medium', 'low'],
        expires_at: NOW + d(180),
      },
      scope: { environment: 'staging', rate_limit_rps: 8, max_tokens_per_run: 500_000 },
      last_tested_at: NOW - h(14),
      posture_score: 73,
      tags: ['rag', 'pii'],
      created_at: NOW - d(45),
    },
    {
      id: 'tgt_redliner_agent',
      name: 'Contract redliner · staging',
      type: 'agent',
      adapter: 'agentvault-native',
      adapter_config: { agent_id: 'agt_redliner' },
      consent_record: {
        granted_by: 'legal@latentbridge.com',
        granted_at: NOW - d(20),
        allowed_categories: ['*'],
        allowed_severities: ['critical', 'high'],  // legal restricted scope
        expires_at: NOW + d(30),
      },
      scope: { environment: 'staging', rate_limit_rps: 2, max_tokens_per_run: 200_000 },
      last_tested_at: NOW - d(2),
      posture_score: 95,
      tags: ['legal', 'staging'],
      created_at: NOW - d(28),
    },
  ];
}

/* ───────────── probe sets ─────────────
   These are *bindings* of suite + target. The suite catalog defines what
   the suite is; this seed binds them to targets + adds schedules. */

export function buildProbeSetsSeed() {
  return [
    {
      id: 'ps_smoke_invoice',
      name: 'Smoke · Invoice triage',
      suite_id: 'smoke',
      target_ids: ['tgt_invoice_agent'],
      schedule: { cron: '0 */6 * * *', enabled: true, last_run_at: NOW - h(6), next_run_at: NOW + m(45) },
      triggers: { on_deploy: true, on_policy_change: true },
      owner: 'platform-eng@latentbridge.com',
      created_at: NOW - d(40),
    },
    {
      id: 'ps_regression_invoice',
      name: 'Regression · Invoice triage',
      suite_id: 'regression',
      target_ids: ['tgt_invoice_agent'],
      schedule: { cron: '0 2 * * *', enabled: true, last_run_at: NOW - h(14), next_run_at: NOW + h(10) },
      triggers: { on_deploy: false, on_policy_change: true },
      owner: 'platform-eng@latentbridge.com',
      created_at: NOW - d(40),
    },
    {
      id: 'ps_owasp_gateway',
      name: 'OWASP LLM Top-10 · Gateway',
      suite_id: 'owasp-llm-top10',
      target_ids: ['tgt_gateway'],
      schedule: { cron: '0 4 * * 1', enabled: true, last_run_at: NOW - h(1), next_run_at: NOW + d(7) - h(1) },
      triggers: { on_deploy: true, on_policy_change: true },
      owner: 'security@latentbridge.com',
      created_at: NOW - d(65),
    },
    {
      id: 'ps_agentic_kyc',
      name: 'OWASP Agentic · KYC',
      suite_id: 'owasp-agentic-2026',
      target_ids: ['tgt_kyc_agent'],
      schedule: { cron: '0 3 * * *', enabled: true, last_run_at: NOW - h(28), next_run_at: NOW - h(4) },
      triggers: { on_deploy: true, on_policy_change: true },
      owner: 'compliance@latentbridge.com',
      created_at: NOW - d(55),
    },
    {
      id: 'ps_eu_aiact_data_analyst',
      name: 'EU AI Act Art. 15 · Data Analyst',
      suite_id: 'eu-ai-act-art-15',
      target_ids: ['tgt_data_analyst'],
      schedule: { cron: '0 2 * * 1', enabled: true, last_run_at: NOW - h(2), next_run_at: NOW + d(7) },
      triggers: { on_deploy: true, on_policy_change: true },
      owner: 'compliance@latentbridge.com',
      created_at: NOW - d(50),
    },
    {
      id: 'ps_full_redliner',
      name: 'Full · Contract redliner',
      suite_id: 'full',
      target_ids: ['tgt_redliner_agent'],
      schedule: { cron: '0 1 * * 0', enabled: true, last_run_at: NOW - d(2), next_run_at: NOW + d(5) },
      triggers: { on_deploy: false, on_policy_change: false },
      owner: 'legal@latentbridge.com',
      created_at: NOW - d(28),
    },
  ];
}

/* ───────────── historical runs + findings ─────────────
   Eight historical runs across targets. Findings are synthesized at read
   time by the run engine using a hash so they stay deterministic; we
   only seed the run records here. */

export function buildRunsSeed() {
  return [
    {
      id: 'rtrun_001', probe_set_id: 'ps_smoke_invoice',
      target_id: 'tgt_invoice_agent', suite_id: 'smoke',
      library_version: '2026.05.0',
      started_at: NOW - h(6), finished_at: NOW - h(6) + m(2),
      status: 'completed', triggered_by: 'schedule',
      environment: 'staging', sampling_mode: 'stratified-by-severity',
      total: 48, passed: 41, bypassed: 5, inconclusive: 2,
      regressions: 1, cost_usd: 0.42, tokens_total: 184_000,
      slo_breach: false, posture_delta: -2,
    },
    {
      id: 'rtrun_002', probe_set_id: 'ps_regression_invoice',
      target_id: 'tgt_invoice_agent', suite_id: 'regression',
      library_version: '2026.05.0',
      started_at: NOW - h(14), finished_at: NOW - h(14) + m(12),
      status: 'completed', triggered_by: 'schedule',
      environment: 'staging', sampling_mode: 'risk-weighted',
      total: 482, passed: 437, bypassed: 38, inconclusive: 7,
      regressions: 4, cost_usd: 4.20, tokens_total: 1_840_000,
      slo_breach: true, posture_delta: -5,
    },
    {
      id: 'rtrun_003', probe_set_id: 'ps_owasp_gateway',
      target_id: 'tgt_gateway', suite_id: 'owasp-llm-top10',
      library_version: '2026.05.0',
      started_at: NOW - h(1), finished_at: NOW - h(1) + m(18),
      status: 'completed', triggered_by: 'schedule',
      environment: 'production', sampling_mode: 'full',
      total: 121, passed: 112, bypassed: 8, inconclusive: 1,
      regressions: 0, cost_usd: 1.84, tokens_total: 412_000,
      slo_breach: false, posture_delta: 1,
    },
    {
      id: 'rtrun_004', probe_set_id: 'ps_agentic_kyc',
      target_id: 'tgt_kyc_agent', suite_id: 'owasp-agentic-2026',
      library_version: '2026.05.0',
      started_at: NOW - h(28), finished_at: NOW - h(28) + m(15),
      status: 'completed', triggered_by: 'schedule',
      environment: 'staging', sampling_mode: 'full',
      total: 46, passed: 44, bypassed: 2, inconclusive: 0,
      regressions: 0, cost_usd: 0.94, tokens_total: 281_000,
      slo_breach: false, posture_delta: 0,
    },
    {
      id: 'rtrun_005', probe_set_id: 'ps_eu_aiact_data_analyst',
      target_id: 'tgt_data_analyst', suite_id: 'eu-ai-act-art-15',
      library_version: '2026.05.0',
      started_at: NOW - h(2), finished_at: NOW - h(2) + m(22),
      status: 'completed', triggered_by: 'schedule',
      environment: 'staging', sampling_mode: 'full',
      total: 74, passed: 58, bypassed: 14, inconclusive: 2,
      regressions: 3, cost_usd: 2.10, tokens_total: 612_000,
      slo_breach: true, posture_delta: -4,
    },
    {
      id: 'rtrun_006', probe_set_id: 'ps_full_redliner',
      target_id: 'tgt_redliner_agent', suite_id: 'full',
      library_version: '2026.05.0',
      started_at: NOW - d(2), finished_at: NOW - d(2) + m(48),
      status: 'completed', triggered_by: 'manual',
      environment: 'staging', sampling_mode: 'full',
      total: 121, passed: 115, bypassed: 5, inconclusive: 1,
      regressions: 0, cost_usd: 6.40, tokens_total: 2_120_000,
      slo_breach: false, posture_delta: 2,
    },
    /* Previous-week comparisons (used by regression detection) */
    {
      id: 'rtrun_007', probe_set_id: 'ps_smoke_invoice',
      target_id: 'tgt_invoice_agent', suite_id: 'smoke',
      library_version: '2026.04.3',
      started_at: NOW - d(1) - h(6), finished_at: NOW - d(1) - h(6) + m(2),
      status: 'completed', triggered_by: 'schedule',
      environment: 'staging', sampling_mode: 'stratified-by-severity',
      total: 48, passed: 44, bypassed: 3, inconclusive: 1,
      regressions: 0, cost_usd: 0.41, tokens_total: 182_000,
      slo_breach: false, posture_delta: 0,
    },
    {
      id: 'rtrun_008', probe_set_id: 'ps_eu_aiact_data_analyst',
      target_id: 'tgt_data_analyst', suite_id: 'eu-ai-act-art-15',
      library_version: '2026.04.3',
      started_at: NOW - d(7), finished_at: NOW - d(7) + m(20),
      status: 'completed', triggered_by: 'schedule',
      environment: 'staging', sampling_mode: 'full',
      total: 74, passed: 65, bypassed: 9, inconclusive: 0,
      regressions: 0, cost_usd: 2.05, tokens_total: 598_000,
      slo_breach: false, posture_delta: 1,
    },
  ];
}

/* ───────────── findings ─────────────
   For seeded runs, we materialize a representative slice of findings —
   not all 482 from the regression run, just enough to show the
   bypassed/regressed/inconclusive variants in the UI. Newly-launched
   runs synthesize findings via the run engine. */

export function buildFindingsSeed() {
  // Pick a few real attack IDs to anchor seeded findings (these exist in
  // _attackCatalog).
  const pick = (prefix, n = 4) => ATTACKS.filter(a => a.id.startsWith(prefix)).slice(0, n).map(a => a.id);
  const dpi = pick('av-dpi-', 6);
  const idi = pick('av-idi-', 6);
  const aa  = pick('av-aa-', 5);
  const dx  = pick('av-dx-', 4);
  const rag = pick('av-rag-', 3);
  const sc  = pick('av-sc-', 3);

  return [
    /* rtrun_002 — regression run, 4 regressions + sample bypasses */
    bypassed('rtfind_001', 'rtrun_002', 'tgt_invoice_agent', dpi[0], { is_regression: true, regression_of: 'rtfind_h_001' }),
    bypassed('rtfind_002', 'rtrun_002', 'tgt_invoice_agent', idi[0], { is_regression: true, regression_of: 'rtfind_h_002' }),
    bypassed('rtfind_003', 'rtrun_002', 'tgt_invoice_agent', aa[0],  { is_regression: true, regression_of: 'rtfind_h_003' }),
    bypassed('rtfind_004', 'rtrun_002', 'tgt_invoice_agent', sc[0],  { is_regression: true, regression_of: 'rtfind_h_004' }),
    bypassed('rtfind_005', 'rtrun_002', 'tgt_invoice_agent', dpi[1]),
    bypassed('rtfind_006', 'rtrun_002', 'tgt_invoice_agent', idi[1]),
    inconclusive('rtfind_007', 'rtrun_002', 'tgt_invoice_agent', dpi[2]),

    /* rtrun_005 — EU AI Act run, 3 regressions */
    bypassed('rtfind_008', 'rtrun_005', 'tgt_data_analyst', idi[2], { is_regression: true, regression_of: 'rtfind_h_005' }),
    bypassed('rtfind_009', 'rtrun_005', 'tgt_data_analyst', aa[1],  { is_regression: true, regression_of: 'rtfind_h_006' }),
    bypassed('rtfind_010', 'rtrun_005', 'tgt_data_analyst', dx[0],  { is_regression: true, regression_of: 'rtfind_h_007' }),
    bypassed('rtfind_011', 'rtrun_005', 'tgt_data_analyst', dx[1]),
    bypassed('rtfind_012', 'rtrun_005', 'tgt_data_analyst', idi[3]),

    /* rtrun_003 — OWASP gateway, 8 bypasses, no regressions */
    bypassed('rtfind_013', 'rtrun_003', 'tgt_gateway', dpi[3]),
    bypassed('rtfind_014', 'rtrun_003', 'tgt_gateway', idi[4]),
    bypassed('rtfind_015', 'rtrun_003', 'tgt_gateway', sc[1]),

    /* rtrun_001 — smoke invoice, 1 regression */
    bypassed('rtfind_016', 'rtrun_001', 'tgt_invoice_agent', aa[2], { is_regression: true, regression_of: 'rtfind_h_008' }),
    bypassed('rtfind_017', 'rtrun_001', 'tgt_invoice_agent', dpi[4]),

    /* rtrun_004 — KYC */
    bypassed('rtfind_018', 'rtrun_004', 'tgt_kyc_agent', aa[3]),
    bypassed('rtfind_019', 'rtrun_004', 'tgt_kyc_agent', sc[2]),

    /* rtrun_006 — full redliner */
    bypassed('rtfind_020', 'rtrun_006', 'tgt_redliner_agent', dpi[5]),
    bypassed('rtfind_021', 'rtrun_006', 'tgt_redliner_agent', rag[0]),
  ];
}

/* ───────────── helpers to synthesize finding records ───────────── */

function bypassed(id, run_id, target_id, attack_id, extra = {}) {
  const a = ATTACKS.find(x => x.id === attack_id) || {};
  return {
    id, run_id, target_id, attack_id,
    library_version: '2026.05.0',
    verdict: 'bypass',
    severity: a.severity || 'high',
    cvss_ai_score: cvssScoreFor(a.severity || 'high', a.impact_class),
    atlas: a.atlas_refs || [],
    owasp_llm: a.owasp_llm_refs || [],
    owasp_agentic: a.owasp_agentic_refs || [],
    nist: a.nist_refs || [],
    evidence: {
      request: { payload_preview: (a.payload_template || '').slice(0, 240) },
      response: { text: '(synthesized) The model complied with the attack.', tokens_out: 142 },
      tool_calls: [],
      gates_fired: [],
    },
    judge: { kind: 'rule+llm', llm_confidence: 0.94, human_reviewed: false },
    reproduction: { deterministic: true },
    remediation: { suggested_controls: a.remediation_hints || [], ticket: null },
    is_regression: false,
    ...extra,
    status: 'open',
    created_at: Date.now() - 60_000,
  };
}

function inconclusive(id, run_id, target_id, attack_id) {
  const a = ATTACKS.find(x => x.id === attack_id) || {};
  return {
    id, run_id, target_id, attack_id,
    library_version: '2026.05.0',
    verdict: 'inconclusive',
    severity: a.severity || 'medium',
    cvss_ai_score: cvssScoreFor(a.severity || 'medium', a.impact_class),
    atlas: a.atlas_refs || [], owasp_llm: a.owasp_llm_refs || [],
    owasp_agentic: a.owasp_agentic_refs || [], nist: a.nist_refs || [],
    evidence: {
      request: { payload_preview: (a.payload_template || '').slice(0, 240) },
      response: { text: '(synthesized) Model output ambiguous — judge confidence below threshold.', tokens_out: 84 },
      tool_calls: [], gates_fired: [],
    },
    judge: { kind: 'rule+llm', llm_confidence: 0.58, human_reviewed: false },
    reproduction: { deterministic: true },
    remediation: { suggested_controls: a.remediation_hints || [] },
    is_regression: false,
    status: 'pending-review',
    created_at: Date.now() - 60_000,
  };
}

/* Rough CVSS-AI score from severity + impact class. */
function cvssScoreFor(severity, impact) {
  const base = { critical: 9.5, high: 7.5, medium: 5.0, low: 2.5 }[severity] || 5.0;
  const bonus = impact === 'data-exfil' ? 0.5 : impact === 'integrity' ? 0.3 : 0;
  return Math.min(10, Math.round((base + bonus) * 10) / 10);
}
