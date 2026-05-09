// GRC suite fixtures.
//
// Five linked entities:
//   FRAMEWORKS   — AI/data/security regimes the workspace is in scope for.
//   CONTROLS     — atomic, framework-agnostic policy units. Each has a runtime
//                  hook (when it fires during an agent run) and an enforcement
//                  mode (what it does on violation).
//   MAPPINGS     — many-to-many: one control discharges clauses across many
//                  frameworks. This is what makes a single configuration cover
//                  EU AI Act + NIST AI RMF + ISO 42001 + SOC 2 simultaneously.
//   POLICIES     — curated bundles of controls scoped to workspace / agent / tool.
//   EVALUATIONS  — the runtime evidence: each time a policy gate fired on an
//                  agent run, what control(s) it consulted, and the decision.

export const FRAMEWORKS = [
  {
    slug: 'eu-ai-act',
    name: 'EU AI Act',
    kind: 'AI regulation',
    jurisdiction: 'EU',
    status: 'in-force',
    color: '#3B5CFF',
    summary:
      'Risk-based regime for AI systems placed on the EU market. GPAI obligations live since Aug 2025; high-risk Annex III obligations from Aug 2026.',
    clauses: [
      { id: 'art-9',  label: 'Art. 9 — Risk management system',
        description: 'You must run a continuous, documented risk-management process for any high-risk AI system — identify foreseeable risks, evaluate them, and put mitigations in place across the system\'s lifecycle.' },
      { id: 'art-10', label: 'Art. 10 — Data governance',
        description: 'Training, validation, and prompt data must be relevant, representative, free of obvious errors, and handled lawfully. For agents, this includes the corpora your retrieval reads from.' },
      { id: 'art-11', label: 'Art. 11 — Technical documentation',
        description: 'A technical file must exist for every high-risk system — purpose, design, capabilities, limitations, training data summary, eval results — kept current as the system evolves.' },
      { id: 'art-12', label: 'Art. 12 — Record-keeping (logs)',
        description: 'High-risk AI must automatically log events that allow post-hoc investigation. For agents, this means an immutable, tamper-evident record of every run, tool call, and model invocation.' },
      { id: 'art-13', label: 'Art. 13 — Transparency to deployers',
        description: 'Whoever uses your AI system must receive instructions clear enough to understand what it does, what it cannot do, and how to operate it safely.' },
      { id: 'art-14', label: 'Art. 14 — Human oversight',
        description: 'A human must be able to effectively oversee a high-risk AI system in use — interrupt it, override it, or stop it. For agents, this typically means review-before-deliver on impactful outputs and an off-switch on autonomous loops.' },
      { id: 'art-15', label: 'Art. 15 — Accuracy, robustness, cybersecurity',
        description: 'High-risk AI must be designed to be accurate, resilient against errors and attacks (including prompt injection), and consistent across its lifecycle.' },
      { id: 'art-26', label: 'Art. 26 — Deployer obligations',
        description: 'If you deploy an AI system you didn\'t build, you must still use it as intended, monitor its operation, keep logs, and inform people when its decisions affect them.' },
      { id: 'art-27', label: 'Art. 27 — Fundamental rights impact assessment',
        description: 'Before deploying certain high-risk AI, you must produce a Fundamental Rights Impact Assessment (FRIA) — who is affected, what risks to their rights, and how you mitigate them.' },
      { id: 'art-50', label: 'Art. 50 — Transparency obligations (deepfake/AI disclosure)',
        description: 'When a person interacts with an AI system or sees AI-generated content, they have a right to know. For agents that talk to users or produce visible artifacts, you must disclose AI involvement.' },
      { id: 'art-53', label: 'Art. 53 — GPAI provider obligations',
        description: 'Providers of general-purpose AI models (foundation models) must publish technical documentation, training-data summaries, and a copyright-compliance policy. If you build on their model, mirror those documents.' },
    ],
  },
  {
    slug: 'nist-ai-rmf',
    name: 'NIST AI RMF 1.0 + GenAI Profile',
    kind: 'AI framework',
    jurisdiction: 'US (voluntary)',
    status: 'adopted',
    color: '#7C3AED',
    summary:
      'Voluntary risk management framework — GOVERN / MAP / MEASURE / MANAGE — with a Generative AI profile (NIST AI 600-1) covering 12 GenAI-specific risks.',
    clauses: [
      { id: 'govern-1.1',  label: 'GOVERN-1.1 — Legal/regulatory mapping',
        description: 'Identify which laws, regulations, and standards apply to each AI system in your organization, and who is responsible for each.' },
      { id: 'govern-3.2',  label: 'GOVERN-3.2 — AI roles and responsibilities',
        description: 'Define who owns each AI risk decision — model selection, deployment approval, incident response — so accountability is named, not implied.' },
      { id: 'govern-4.1',  label: 'GOVERN-4.1 — Organizational policy',
        description: 'A written, organization-wide policy must exist for how AI is built, evaluated, and operated. People should be able to point to it.' },
      { id: 'map-1.1',     label: 'MAP-1.1 — Context of use defined',
        description: 'For each AI system, document the intended purpose, the users, the deployment context, and the data it processes. Vague intended-use statements are how systems drift into unintended ones.' },
      { id: 'map-2.3',     label: 'MAP-2.3 — Capabilities and limitations',
        description: 'Be explicit and current about what the system can and cannot do — known failure modes, edge cases, and out-of-scope tasks.' },
      { id: 'measure-2.6', label: 'MEASURE-2.6 — AI system safety, security, robustness',
        description: 'Continuously measure how the system handles unexpected inputs, adversarial attacks, and operational stress. For agents, this includes prompt-injection, jailbreaks, and loops that exhaust resources.' },
      { id: 'measure-2.7', label: 'MEASURE-2.7 — Privacy risks measured',
        description: 'Identify and quantify privacy risks — what personal data could leak through prompts, retrieval, or outputs — and verify your safeguards actually work.' },
      { id: 'measure-2.11',label: 'MEASURE-2.11 — Fairness and bias',
        description: 'Test for disparate impact across protected groups in evaluation. Track metrics over time so you notice when a model update introduces bias.' },
      { id: 'manage-1.3',  label: 'MANAGE-1.3 — Risk responses prioritized',
        description: 'Treat AI risks the way you treat security vulnerabilities — triage, prioritize, assign owners, track to resolution.' },
      { id: 'manage-4.1',  label: 'MANAGE-4.1 — Post-deployment monitoring',
        description: 'Monitor the system after it ships, not just before. Catch model drift, behavior changes, and emerging failure modes from real traffic.' },
      { id: 'genai-2.6',   label: 'GenAI-2.6 — Confabulation / hallucination controls',
        description: 'Generative models invent plausible-but-false content. You must measure how often and put guards in place — citation requirements, retrieval grounding, refusal patterns.' },
      { id: 'genai-2.7',   label: 'GenAI-2.7 — Data privacy in prompts/outputs',
        description: 'Prompts and outputs both leak data. Detect personal or confidential information at both ends and redact or block before it crosses a trust boundary.' },
    ],
  },
  {
    slug: 'iso-42001',
    name: 'ISO/IEC 42001 (AI Management System)',
    kind: 'AI management standard',
    jurisdiction: 'International',
    status: 'certifiable',
    color: '#0891B2',
    summary:
      'Management system standard for AI — sister to ISO 27001 in structure. Annex A enumerates AI-specific controls.',
    clauses: [
      { id: 'a-5-2',  label: 'A.5.2 — Internal AI policy',
        description: 'A documented internal policy describing how your organization develops, deploys, and operates AI — approved by leadership, available to staff.' },
      { id: 'a-6-1-2',label: 'A.6.1.2 — AI risk assessment',
        description: 'A formal risk assessment for each AI system before it goes into production, repeated when the system or its context materially changes.' },
      { id: 'a-6-2-2',label: 'A.6.2.2 — AI impact assessment',
        description: 'Beyond technical risk, assess the system\'s impact on the people and groups affected by its outputs — analogous to a DPIA but broader.' },
      { id: 'a-7-2',  label: 'A.7.2 — Resources for AI systems',
        description: 'Make sure the people, compute, data, and tooling needed to run the AI safely are actually allocated — not assumed.' },
      { id: 'a-7-4',  label: 'A.7.4 — Data quality for AI',
        description: 'Data feeding training, fine-tuning, and retrieval must be fit for purpose — accurate, current, lawful, and traceable to its source.' },
      { id: 'a-8-2',  label: 'A.8.2 — Documentation of AI systems',
        description: 'Every AI system has a documentation package — model card, intended use, evaluation results, known limitations — kept current.' },
      { id: 'a-8-4',  label: 'A.8.4 — Verification and validation',
        description: 'Before deployment and on each material change, verify the system meets its requirements and validate it behaves as intended in realistic conditions.' },
      { id: 'a-9-2',  label: 'A.9.2 — Process for responsible use',
        description: 'A defined process governs how the system is used in production — approval to deploy, oversight, escalation, and decommissioning.' },
      { id: 'a-9-3',  label: 'A.9.3 — Objectives for responsible AI use',
        description: 'Set measurable objectives for "responsible use" — fairness, transparency, safety — and review against them periodically.' },
      { id: 'a-10-2', label: 'A.10.2 — Suppliers / third-party AI',
        description: 'When you use a foundation model or a third-party AI component, your suppliers\' AI obligations carry through. Capture their documentation, their commitments, and their incident channels.' },
    ],
  },
  {
    slug: 'iso-27001',
    name: 'ISO/IEC 27001 (ISMS)',
    kind: 'Security standard',
    jurisdiction: 'International',
    status: 'certifiable',
    color: '#10B981',
    summary:
      'Information security management system. AI agent traffic touches access control, cryptography, and supplier controls.',
    clauses: [
      { id: 'a-5-1',  label: 'A.5.1 — Policies for information security',
        description: 'Documented information security policies, approved by management.' },
      { id: 'a-5-15', label: 'A.5.15 — Access control',
        description: 'Access to information and systems is restricted on a least-privilege basis.' },
      { id: 'a-5-23', label: 'A.5.23 — Cloud services security',
        description: 'Cloud-based services are evaluated, contracted, and monitored against your security requirements.' },
      { id: 'a-8-2',  label: 'A.8.2 — Privileged access rights',
        description: 'Privileged access is granted, reviewed, and revoked under explicit controls.' },
      { id: 'a-8-15', label: 'A.8.15 — Logging',
        description: 'Security-relevant events are logged, retained, and protected from tampering.' },
      { id: 'a-8-24', label: 'A.8.24 — Use of cryptography',
        description: 'Cryptography is used appropriately for confidentiality, integrity, and authenticity, with managed keys.' },
    ],
  },
  {
    slug: 'soc2',
    name: 'SOC 2 (Trust Services Criteria)',
    kind: 'Audit standard',
    jurisdiction: 'US',
    status: 'auditable',
    color: '#F59E0B',
    summary:
      'AICPA Trust Services Criteria. Security is required; Confidentiality/Privacy commonly added when agents handle customer data.',
    clauses: [
      { id: 'cc6-1',  label: 'CC6.1 — Logical access controls',
        description: 'Access to systems and data is restricted to authorized users and reviewed.' },
      { id: 'cc6-7',  label: 'CC6.7 — Restricted information transmission',
        description: 'Sensitive information in transit is protected from unauthorized access.' },
      { id: 'cc7-2',  label: 'CC7.2 — System monitoring',
        description: 'System events are monitored to detect security or operational issues.' },
      { id: 'cc7-3',  label: 'CC7.3 — Anomaly detection',
        description: 'Anomalies are detected, evaluated, and acted upon.' },
      { id: 'cc8-1',  label: 'CC8.1 — Change management',
        description: 'Changes to systems are authorized, tested, and tracked.' },
      { id: 'p-4-1',  label: 'P4.1 — Privacy notice and consent',
        description: 'Individuals are notified of and, where required, consent to how their personal data is used.' },
    ],
  },
  {
    slug: 'hipaa',
    name: 'HIPAA Security & Privacy Rule',
    kind: 'Sector regulation',
    jurisdiction: 'US (healthcare)',
    status: 'in-force',
    color: '#EF4444',
    summary:
      'US healthcare data protection. Agents touching PHI inherit 164.308–164.312 administrative, physical, and technical safeguards.',
    clauses: [
      { id: '164-308-a-3', label: '§164.308(a)(3) — Workforce access management',
        description: 'Authorize, supervise, and end workforce access to PHI in line with their role.' },
      { id: '164-308-a-4', label: '§164.308(a)(4) — Information access management',
        description: 'Apply policies for granting access to PHI by role and by least-privilege.' },
      { id: '164-312-a-1', label: '§164.312(a)(1) — Access control (technical)',
        description: 'Technical safeguards that restrict PHI access to authorized users only.' },
      { id: '164-312-b',   label: '§164.312(b) — Audit controls',
        description: 'Mechanisms that record and examine activity in systems handling PHI.' },
      { id: '164-312-e-1', label: '§164.312(e)(1) — Transmission security',
        description: 'Technical safeguards against unauthorized access to PHI being transmitted.' },
    ],
  },
  {
    slug: 'gdpr',
    name: 'GDPR',
    kind: 'Data protection regulation',
    jurisdiction: 'EU/EEA',
    status: 'in-force',
    color: '#8B5CF6',
    summary:
      'EU data protection. Articles 5, 22, 25, 32, 35 are the agent-relevant load-bearing ones — minimization, automated decision rights, DPbD, security, DPIA.',
    clauses: [
      { id: 'art-5',  label: 'Art. 5 — Principles (lawfulness, minimization)',
        description: 'Personal data must be processed lawfully, fairly, and transparently — and only the minimum needed for the stated purpose. Agents that process more than they need are a Principle 5 problem.' },
      { id: 'art-22', label: 'Art. 22 — Automated individual decision-making',
        description: 'A person has the right not to be subject to a purely automated decision that significantly affects them. If an agent makes such decisions, you must allow human intervention, explanation, and appeal.' },
      { id: 'art-25', label: 'Art. 25 — Data protection by design and default',
        description: 'Bake data protection into the system from the start — default to collecting and exposing the least data possible. Retrofitting privacy is too late.' },
      { id: 'art-32', label: 'Art. 32 — Security of processing',
        description: 'Implement appropriate technical and organizational measures — encryption, access controls, integrity protection — so personal data is safe against accidental and malicious harms.' },
      { id: 'art-35', label: 'Art. 35 — Data Protection Impact Assessment',
        description: 'When processing is likely to result in a high risk to people\'s rights — large-scale automated decisions, profiling, novel tech — produce a DPIA before you start.' },
    ],
  },
  {
    slug: 'owasp-llm-top10',
    name: 'OWASP LLM Top 10 (2025)',
    kind: 'Threat catalog',
    jurisdiction: 'International',
    status: 'guidance',
    color: '#DC2626',
    summary:
      'Operational threat catalog for LLM applications. The defenses map directly onto agent runtime guardrails.',
    clauses: [
      { id: 'llm01', label: 'LLM01 — Prompt injection',
        description: 'Attacker input that overrides the developer\'s intent — direct (in the user message) or indirect (in retrieved/tool data).' },
      { id: 'llm02', label: 'LLM02 — Sensitive information disclosure',
        description: 'The model leaks personal, secret, or proprietary content through its outputs.' },
      { id: 'llm03', label: 'LLM03 — Supply chain',
        description: 'Risks introduced via the model, dataset, or tooling supply chain — including foundation-model providers.' },
      { id: 'llm04', label: 'LLM04 — Data and model poisoning',
        description: 'Training, fine-tuning, or retrieval data is manipulated to bias or compromise behavior.' },
      { id: 'llm05', label: 'LLM05 — Improper output handling',
        description: 'Downstream code treats model output as trusted — leading to XSS, SQL injection, RCE, or unsafe automation.' },
      { id: 'llm06', label: 'LLM06 — Excessive agency',
        description: 'The agent has more tools, scope, or autonomy than the task requires — small bug, big blast radius.' },
      { id: 'llm07', label: 'LLM07 — System prompt leakage',
        description: 'Sensitive content embedded in the system prompt (secrets, business logic) leaks through outputs.' },
      { id: 'llm08', label: 'LLM08 — Vector and embedding weaknesses',
        description: 'Vulnerabilities in retrieval — index poisoning, ACL bypass, embedding inversion.' },
      { id: 'llm09', label: 'LLM09 — Misinformation',
        description: 'Confidently wrong outputs — hallucinations, fabricated citations, plausible-but-false claims.' },
      { id: 'llm10', label: 'LLM10 — Unbounded consumption',
        description: 'Resource exhaustion — token, tool-call, or wallclock loops; cost-blowup attacks.' },
    ],
  },
];

// Runtime hooks the agent executor consults.
//   pre-run    — before the agent loop starts (input validation, scope checks)
//   pre-tool   — before any tool invocation (allowlist, parameter checks)
//   pre-model  — before each LLM call (PII redaction, prompt-injection scan)
//   post-model — after each LLM call (output filter, hallucination guard)
//   post-run   — at run completion (audit log emit, evidence capture)
//   scheduled  — runs out of band (drift detection, evidence sampling)

// Enforcement modes:
//   block            — hard stop, run terminates with a policy violation
//   require_approval — pause run, route to a human approver
//   redact           — mutate the payload (mask PII, strip secrets) and continue
//   warn             — emit a finding, continue
//   log              — record only, no behavior change

export const CONTROLS = [
  {
    id: 'av.input.pii-detect',
    title: 'No unredacted PII in prompts',
    family: 'Data governance',
    kind: 'preventive',
    hook: 'pre-model',
    enforcement: 'redact',
    summary:
      'Detects PII (name, email, phone, national ID, payment data) in prompt payloads and redacts before model invocation. Findings annotate the run.',
    inputs: ['prompt.text', 'prompt.attachments'],
    coverage: 0.94,
    runs7d: 12480,
    violations7d: 38,
  },
  {
    id: 'av.input.injection-scan',
    title: 'Prompt injection defense',
    family: 'Threat defense',
    kind: 'detective',
    hook: 'pre-model',
    enforcement: 'block',
    summary:
      'Heuristic + classifier scan for jailbreak and prompt-injection patterns in user input and tool outputs (indirect injection).',
    inputs: ['prompt.text', 'tool.result'],
    coverage: 0.91,
    runs7d: 12480,
    violations7d: 12,
  },
  {
    id: 'av.tool.allowlist',
    title: 'Tool allowlist per agent',
    family: 'Excessive agency',
    kind: 'preventive',
    hook: 'pre-tool',
    enforcement: 'block',
    summary:
      'Enforces that the agent may only call tools declared in its manifest. Bounds blast radius and satisfies excessive-agency controls.',
    inputs: ['tool.name', 'agent.manifest'],
    coverage: 1.00,
    runs7d: 12480,
    violations7d: 4,
  },
  {
    id: 'av.tool.high-risk-approval',
    title: 'Human approval for high-risk tool calls',
    family: 'Human oversight',
    kind: 'preventive',
    hook: 'pre-tool',
    enforcement: 'require_approval',
    summary:
      'Tools tagged risk≥high (payments, deletions, external sends, PII writes) pause the run and route an approval card to the policy owner.',
    inputs: ['tool.name', 'tool.risk', 'tool.args'],
    coverage: 0.96,
    runs7d: 612,
    violations7d: 0,
  },
  {
    id: 'av.output.disclosure',
    title: 'AI-generated content disclosure',
    family: 'Transparency',
    kind: 'corrective',
    hook: 'post-model',
    enforcement: 'redact',
    summary:
      'Appends a disclosure marker to outputs delivered to natural persons (deployer obligation under AI Act Art. 50). Suppresses for system-internal traffic.',
    inputs: ['output.text', 'audience'],
    coverage: 0.88,
    runs7d: 9210,
    violations7d: 0,
  },
  {
    id: 'av.output.hallucination',
    title: 'Hallucination guard (citation required)',
    family: 'Accuracy',
    kind: 'detective',
    hook: 'post-model',
    enforcement: 'warn',
    summary:
      'For agents tagged factual, every claim must trace to a retrieved chunk. Uncited claims surface a finding and a confidence score.',
    inputs: ['output.text', 'context.chunks'],
    coverage: 0.79,
    runs7d: 4180,
    violations7d: 142,
  },
  {
    id: 'av.run.audit-log',
    title: 'Immutable run audit log',
    family: 'Auditability',
    kind: 'detective',
    hook: 'post-run',
    enforcement: 'log',
    summary:
      'Every run emits a hash-chained record of inputs, tool calls, model versions, and decisions. Retained 18 months minimum.',
    inputs: ['run.full'],
    coverage: 1.00,
    runs7d: 12480,
    violations7d: 0,
  },
  {
    id: 'av.run.human-oversight',
    title: 'Human-in-the-loop on high-risk agents',
    family: 'Human oversight',
    kind: 'preventive',
    hook: 'pre-run',
    enforcement: 'require_approval',
    summary:
      'Agents classified Annex-III high-risk under EU AI Act cannot run autonomously — every output requires named human review before delivery.',
    inputs: ['agent.risk-class', 'output.audience'],
    coverage: 1.00,
    runs7d: 218,
    violations7d: 0,
  },
  {
    id: 'av.model.card',
    title: 'Model card present and current',
    family: 'Documentation',
    kind: 'preventive',
    hook: 'pre-run',
    enforcement: 'block',
    summary:
      'Every model used in a run must have a current model card (purpose, training data lineage, eval scores, known limitations). Cards expire after 180 days.',
    inputs: ['model.id', 'model.card'],
    coverage: 0.83,
    runs7d: 12480,
    violations7d: 7,
  },
  {
    id: 'av.data.lineage',
    title: 'Data lineage and consent',
    family: 'Data governance',
    kind: 'preventive',
    hook: 'pre-run',
    enforcement: 'block',
    summary:
      'Knowledge sources used by the agent must declare lawful basis (consent / contract / legitimate interest) and a minimization rationale.',
    inputs: ['knowledge.source', 'knowledge.basis'],
    coverage: 0.74,
    runs7d: 8640,
    violations7d: 21,
  },
  {
    id: 'av.bias.eval',
    title: 'Bias and fairness evaluation',
    family: 'Fairness',
    kind: 'scheduled',
    hook: 'scheduled',
    enforcement: 'warn',
    summary:
      'Per-agent disparity metrics (DPD, EOD) sampled weekly across protected attributes available in the eval set. Drift past threshold opens a finding.',
    inputs: ['agent.id', 'eval.set'],
    coverage: 0.62,
    runs7d: 0, // scheduled; not per-run
    violations7d: 3,
  },
  {
    id: 'av.fria',
    title: 'Fundamental Rights Impact Assessment',
    family: 'Risk assessment',
    kind: 'preventive',
    hook: 'pre-run',
    enforcement: 'block',
    summary:
      'Annex-III deployments require a current FRIA on file (AI Act Art. 27). Absence blocks deployment, not individual runs.',
    inputs: ['agent.deployment', 'fria.doc'],
    coverage: 0.89,
    runs7d: 0,
    violations7d: 0,
  },
  {
    id: 'av.tool.rate-limit',
    title: 'Per-agent token and tool budgets',
    family: 'Unbounded consumption',
    kind: 'preventive',
    hook: 'pre-tool',
    enforcement: 'block',
    summary:
      'Agents have token / tool-call / wall-clock budgets per run and per day. Caps a runaway loop and DoS via tool spam.',
    inputs: ['run.tokens', 'run.tool-calls', 'agent.budget'],
    coverage: 1.00,
    runs7d: 12480,
    violations7d: 9,
  },
  {
    id: 'av.knowledge.acl',
    title: 'Row-level ACLs carried into retrieval',
    family: 'Access control',
    kind: 'preventive',
    hook: 'pre-tool',
    enforcement: 'block',
    summary:
      'Retrieval API enforces the calling user’s row-level ACL from the source warehouse. Prevents cross-tenant or out-of-scope data leakage.',
    inputs: ['user.id', 'knowledge.source', 'query'],
    coverage: 1.00,
    runs7d: 8640,
    violations7d: 0,
  },
  {
    id: 'av.gpai.provider-disclosure',
    title: 'GPAI provider documentation captured',
    family: 'Supply chain',
    kind: 'preventive',
    hook: 'scheduled',
    enforcement: 'warn',
    summary:
      'For each foundation model in use, the provider’s AI Act Art. 53 documentation (training summary, copyright policy) is mirrored into the vault.',
    inputs: ['model.provider', 'gpai.docs'],
    coverage: 0.55,
    runs7d: 0,
    violations7d: 5,
  },
  {
    id: 'av.policy.organizational',
    title: 'Organizational AI & security policy published',
    family: 'Governance',
    kind: 'preventive',
    hook: 'scheduled',
    enforcement: 'warn',
    summary:
      'A current, approved policy document covering AI usage and information security must exist, be findable, and be reviewed at least annually. Verified weekly against the policy registry.',
    inputs: ['policy.registry', 'policy.last-review'],
    coverage: 0.71,
    runs7d: 0,
    violations7d: 1,
  },
  {
    id: 'av.risk.assessment',
    title: 'Per-agent AI risk assessment',
    family: 'Risk assessment',
    kind: 'preventive',
    hook: 'pre-run',
    enforcement: 'block',
    summary:
      'Every agent must have a current AI risk assessment on file before it can run — risks identified, severity rated, mitigations linked. Refreshed on each material change.',
    inputs: ['agent.id', 'risk-assessment.doc'],
    coverage: 0.82,
    runs7d: 12480,
    violations7d: 3,
  },
  {
    id: 'av.resources.attestation',
    title: 'Named owner & resource attestation',
    family: 'Governance',
    kind: 'detective',
    hook: 'scheduled',
    enforcement: 'log',
    summary:
      'Each agent has a named owner, an on-call channel, and a documented compute / cost budget. Reviewed quarterly. Missing attestations open a finding.',
    inputs: ['agent.owner', 'agent.budget', 'agent.oncall'],
    coverage: 0.68,
    runs7d: 0,
    violations7d: 2,
  },
  {
    id: 'av.crypto.transit-rest',
    title: 'Encryption in transit and at rest',
    family: 'Cryptography',
    kind: 'preventive',
    hook: 'pre-tool',
    enforcement: 'block',
    summary:
      'All tool and connector traffic must use TLS 1.2+. All vault storage uses customer-managed keys. Misconfigured endpoints are blocked at run time.',
    inputs: ['tool.endpoint', 'storage.kms'],
    coverage: 0.97,
    runs7d: 12480,
    violations7d: 0,
  },
  {
    id: 'av.detect.anomaly',
    title: 'Run anomaly detection',
    family: 'Threat defense',
    kind: 'detective',
    hook: 'post-run',
    enforcement: 'warn',
    summary:
      'Flags runs whose shape deviates from baseline — token bursts, retry loops, off-hours activity, unusual tool sequences. Surfaces the top 1% as findings.',
    inputs: ['run.metrics', 'run.tool-sequence'],
    coverage: 0.74,
    runs7d: 12480,
    violations7d: 18,
  },
  {
    id: 'av.output.sanitize',
    title: 'Output sanitization',
    family: 'Output safety',
    kind: 'preventive',
    hook: 'post-model',
    enforcement: 'redact',
    summary:
      'Escapes or strips dangerous content from model output before downstream code consumes it — script tags, SQL, shell metacharacters, command injection patterns.',
    inputs: ['output.text', 'output.structured'],
    coverage: 0.86,
    runs7d: 9210,
    violations7d: 11,
  },
  {
    id: 'av.output.system-prompt-guard',
    title: 'System prompt leakage guard',
    family: 'Output safety',
    kind: 'detective',
    hook: 'post-model',
    enforcement: 'block',
    summary:
      'Detects fragments of the system prompt or developer instructions in model output and blocks delivery before they reach the caller.',
    inputs: ['output.text', 'agent.system-prompt'],
    coverage: 0.81,
    runs7d: 9210,
    violations7d: 4,
  },
  {
    id: 'av.knowledge.index-integrity',
    title: 'Vector index integrity',
    family: 'Threat defense',
    kind: 'detective',
    hook: 'scheduled',
    enforcement: 'warn',
    summary:
      'Continuously checks the retrieval index for poisoning signals — abnormal embedding clusters, source-attribution drift, embedding-inversion probes. Findings open per-source remediation tickets.',
    inputs: ['knowledge.index', 'embedding.distribution'],
    coverage: 0.66,
    runs7d: 0,
    violations7d: 6,
  },
];

// Many-to-many. One control discharges multiple framework clauses — that's the
// whole point. Format: control_id -> array of [framework_slug, clause_id].
export const MAPPINGS = {
  'av.input.pii-detect': [
    ['eu-ai-act',     'art-10'],
    ['gdpr',          'art-5'],
    ['gdpr',          'art-25'],
    ['gdpr',          'art-32'],
    ['nist-ai-rmf',   'measure-2.7'],
    ['nist-ai-rmf',   'genai-2.7'],
    ['iso-42001',     'a-7-4'],
    ['soc2',          'cc6-7'],
    ['hipaa',         '164-312-e-1'],
    ['owasp-llm-top10','llm02'],
  ],
  'av.input.injection-scan': [
    ['eu-ai-act',     'art-15'],
    ['nist-ai-rmf',   'measure-2.6'],
    ['iso-42001',     'a-8-4'],
    ['iso-27001',     'a-5-23'],
    ['owasp-llm-top10','llm01'],
  ],
  'av.tool.allowlist': [
    ['eu-ai-act',     'art-14'],
    ['eu-ai-act',     'art-15'],
    ['nist-ai-rmf',   'manage-1.3'],
    ['iso-42001',     'a-9-2'],
    ['iso-27001',     'a-5-15'],
    ['iso-27001',     'a-8-2'],
    ['soc2',          'cc6-1'],
    ['owasp-llm-top10','llm06'],
  ],
  'av.tool.high-risk-approval': [
    ['eu-ai-act',     'art-14'],
    ['eu-ai-act',     'art-26'],
    ['nist-ai-rmf',   'govern-3.2'],
    ['iso-42001',     'a-9-2'],
    ['gdpr',          'art-22'],
    ['soc2',          'cc8-1'],
    ['owasp-llm-top10','llm06'],
  ],
  'av.output.disclosure': [
    ['eu-ai-act',     'art-13'],
    ['eu-ai-act',     'art-50'],
    ['nist-ai-rmf',   'map-2.3'],
    ['iso-42001',     'a-9-3'],
    ['soc2',          'p-4-1'],
    ['gdpr',          'art-5'],
  ],
  'av.output.hallucination': [
    ['eu-ai-act',     'art-15'],
    ['nist-ai-rmf',   'measure-2.6'],
    ['nist-ai-rmf',   'genai-2.6'],
    ['iso-42001',     'a-8-4'],
    ['owasp-llm-top10','llm09'],
  ],
  'av.run.audit-log': [
    ['eu-ai-act',     'art-12'],
    ['nist-ai-rmf',   'manage-4.1'],
    ['iso-42001',     'a-8-2'],
    ['iso-27001',     'a-8-15'],
    ['soc2',          'cc7-2'],
    ['hipaa',         '164-312-b'],
  ],
  'av.run.human-oversight': [
    ['eu-ai-act',     'art-14'],
    ['eu-ai-act',     'art-26'],
    ['nist-ai-rmf',   'govern-3.2'],
    ['iso-42001',     'a-9-2'],
    ['gdpr',          'art-22'],
  ],
  'av.model.card': [
    ['eu-ai-act',     'art-11'],
    ['eu-ai-act',     'art-53'],
    ['nist-ai-rmf',   'map-1.1'],
    ['nist-ai-rmf',   'map-2.3'],
    ['iso-42001',     'a-8-2'],
  ],
  'av.data.lineage': [
    ['eu-ai-act',     'art-10'],
    ['nist-ai-rmf',   'map-1.1'],
    ['iso-42001',     'a-7-4'],
    ['gdpr',          'art-5'],
    ['gdpr',          'art-25'],
    ['hipaa',         '164-308-a-4'],
    ['owasp-llm-top10','llm04'],
  ],
  'av.bias.eval': [
    ['eu-ai-act',     'art-10'],
    ['eu-ai-act',     'art-15'],
    ['nist-ai-rmf',   'measure-2.11'],
    ['iso-42001',     'a-8-4'],
  ],
  'av.fria': [
    ['eu-ai-act',     'art-9'],
    ['eu-ai-act',     'art-27'],
    ['nist-ai-rmf',   'govern-1.1'],
    ['iso-42001',     'a-6-2-2'],
    ['gdpr',          'art-35'],
  ],
  'av.tool.rate-limit': [
    ['eu-ai-act',     'art-15'],
    ['nist-ai-rmf',   'measure-2.6'],
    ['iso-27001',     'a-5-23'],
    ['owasp-llm-top10','llm10'],
  ],
  'av.knowledge.acl': [
    ['eu-ai-act',     'art-10'],
    ['nist-ai-rmf',   'measure-2.7'],
    ['iso-42001',     'a-7-4'],
    ['iso-27001',     'a-5-15'],
    ['iso-27001',     'a-8-2'],
    ['soc2',          'cc6-1'],
    ['hipaa',         '164-308-a-3'],
    ['hipaa',         '164-312-a-1'],
    ['gdpr',          'art-25'],
  ],
  'av.gpai.provider-disclosure': [
    ['eu-ai-act',     'art-53'],
    ['nist-ai-rmf',   'govern-1.1'],
    ['iso-42001',     'a-10-2'],
    ['owasp-llm-top10','llm03'],
  ],
  'av.policy.organizational': [
    ['nist-ai-rmf',   'govern-4.1'],
    ['iso-42001',     'a-5-2'],
    ['iso-27001',     'a-5-1'],
    ['soc2',          'cc6-1'],
  ],
  'av.risk.assessment': [
    ['eu-ai-act',     'art-9'],
    ['iso-42001',     'a-6-1-2'],
    ['nist-ai-rmf',   'manage-1.3'],
  ],
  'av.resources.attestation': [
    ['iso-42001',     'a-7-2'],
    ['nist-ai-rmf',   'govern-3.2'],
  ],
  'av.crypto.transit-rest': [
    ['iso-27001',     'a-8-24'],
    ['soc2',          'cc6-7'],
    ['hipaa',         '164-312-e-1'],
    ['gdpr',          'art-32'],
  ],
  'av.detect.anomaly': [
    ['soc2',          'cc7-3'],
    ['nist-ai-rmf',   'manage-4.1'],
    ['iso-27001',     'a-8-15'],
  ],
  'av.output.sanitize': [
    ['owasp-llm-top10','llm05'],
    ['eu-ai-act',     'art-15'],
    ['nist-ai-rmf',   'measure-2.6'],
  ],
  'av.output.system-prompt-guard': [
    ['owasp-llm-top10','llm07'],
    ['nist-ai-rmf',   'measure-2.6'],
  ],
  'av.knowledge.index-integrity': [
    ['owasp-llm-top10','llm08'],
    ['nist-ai-rmf',   'measure-2.6'],
    ['iso-42001',     'a-7-4'],
  ],
};

// Curated bundles. Each bundle is opinionated about which controls satisfy
// which regimes — the operator picks a bundle, the controls turn on together.
export const POLICIES = [
  {
    id: 'pol.eu-ai-act-high-risk',
    name: 'EU AI Act — High Risk (Annex III)',
    summary:
      'For agents classified high-risk under Annex III. Mandatory FRIA, human oversight on every output, full audit trail, transparency disclosure.',
    frameworks: ['eu-ai-act', 'nist-ai-rmf', 'iso-42001', 'gdpr'],
    controls: [
      'av.fria',
      'av.run.human-oversight',
      'av.input.pii-detect',
      'av.tool.high-risk-approval',
      'av.output.disclosure',
      'av.run.audit-log',
      'av.model.card',
      'av.data.lineage',
      'av.bias.eval',
    ],
    attached: { workspaces: 1, agents: 2, tools: 0 },
  },
  {
    id: 'pol.iso-42001-baseline',
    name: 'ISO 42001 baseline (AIMS)',
    summary:
      'Baseline AI management system — documentation, validation, supplier oversight. Pairs well with ISO 27001 for a certifiable posture.',
    frameworks: ['iso-42001', 'iso-27001', 'nist-ai-rmf'],
    controls: [
      'av.model.card',
      'av.data.lineage',
      'av.run.audit-log',
      'av.tool.allowlist',
      'av.gpai.provider-disclosure',
      'av.bias.eval',
      'av.knowledge.acl',
    ],
    attached: { workspaces: 1, agents: 6, tools: 2 },
  },
  {
    id: 'pol.healthcare-hipaa-ai',
    name: 'Healthcare (HIPAA + AI Act)',
    summary:
      'Agents touching PHI. Strong PII redaction, ACL enforcement on retrieval, immutable audit log, human approval on patient-facing outputs.',
    frameworks: ['hipaa', 'eu-ai-act', 'gdpr', 'soc2'],
    controls: [
      'av.input.pii-detect',
      'av.knowledge.acl',
      'av.run.human-oversight',
      'av.output.disclosure',
      'av.run.audit-log',
      'av.tool.allowlist',
      'av.tool.rate-limit',
    ],
    attached: { workspaces: 0, agents: 3, tools: 1 },
  },
  {
    id: 'pol.workforce-default',
    name: 'Workforce default (low-risk ops)',
    summary:
      'Operational guardrails for back-office agents — AP, HR, IT triage. Approval on writes, audit log, rate limits, output disclosure.',
    frameworks: ['eu-ai-act', 'iso-27001', 'soc2', 'owasp-llm-top10'],
    controls: [
      'av.tool.allowlist',
      'av.tool.high-risk-approval',
      'av.tool.rate-limit',
      'av.input.injection-scan',
      'av.run.audit-log',
      'av.output.disclosure',
    ],
    attached: { workspaces: 1, agents: 8, tools: 4 },
  },
  {
    id: 'pol.context-rag',
    name: 'Context Engine (RAG-only)',
    summary:
      'Retrieval-only agents. ACL carry-through, hallucination guard, prompt injection scan over retrieved chunks.',
    frameworks: ['gdpr', 'iso-27001', 'owasp-llm-top10', 'nist-ai-rmf'],
    controls: [
      'av.knowledge.acl',
      'av.input.injection-scan',
      'av.output.hallucination',
      'av.input.pii-detect',
      'av.run.audit-log',
    ],
    attached: { workspaces: 0, agents: 4, tools: 0 },
  },
];

// Recent runtime evaluations — what would normally come from the run engine.
// Each entry: a gate fired on a run, what control(s) it consulted, decision.
export const EVALUATIONS = [
  {
    id: 'eval_8821',
    runId: 'run_9412',
    agentId: 'agt_invoice',
    agentName: 'Invoice Processor',
    hook: 'pre-tool',
    controlId: 'av.tool.high-risk-approval',
    decision: 'require_approval',
    detail: 'NetSuite post · amount $74,200 → CFO approval',
    when: '2m ago',
    framework: 'eu-ai-act',
    clause: 'art-14',
  },
  {
    id: 'eval_8820',
    runId: 'run_9412',
    agentId: 'agt_invoice',
    agentName: 'Invoice Processor',
    hook: 'pre-model',
    controlId: 'av.input.pii-detect',
    decision: 'redact',
    detail: 'Redacted 2 emails, 1 phone from prompt',
    when: '2m ago',
    framework: 'gdpr',
    clause: 'art-5',
  },
  {
    id: 'eval_8819',
    runId: 'run_9411',
    agentId: 'agt_kyc',
    agentName: 'KYC Verification',
    hook: 'post-model',
    controlId: 'av.output.hallucination',
    decision: 'warn',
    detail: '2 uncited claims in dossier · confidence 0.71',
    when: '8m ago',
    framework: 'eu-ai-act',
    clause: 'art-15',
  },
  {
    id: 'eval_8818',
    runId: 'run_9410',
    agentId: 'agt_contract',
    agentName: 'Contract Redliner',
    hook: 'pre-tool',
    controlId: 'av.tool.allowlist',
    decision: 'block',
    detail: 'Tool docusign.send not in agent manifest',
    when: '21m ago',
    framework: 'eu-ai-act',
    clause: 'art-15',
  },
  {
    id: 'eval_8817',
    runId: 'run_9410',
    agentId: 'agt_contract',
    agentName: 'Contract Redliner',
    hook: 'pre-model',
    controlId: 'av.input.injection-scan',
    decision: 'block',
    detail: 'Injection pattern detected in attached PDF (indirect)',
    when: '21m ago',
    framework: 'owasp-llm-top10',
    clause: 'llm01',
  },
  {
    id: 'eval_8816',
    runId: 'run_9409',
    agentId: 'agt_invoice',
    agentName: 'Invoice Processor',
    hook: 'post-run',
    controlId: 'av.run.audit-log',
    decision: 'log',
    detail: 'Run record sealed · sha256 0x91a4…',
    when: '34m ago',
    framework: 'soc2',
    clause: 'cc7-2',
  },
  {
    id: 'eval_8815',
    runId: 'run_9408',
    agentId: 'agt_claims',
    agentName: 'Claims Triage',
    hook: 'pre-run',
    controlId: 'av.model.card',
    decision: 'block',
    detail: 'Model card for claude-sonnet-4-6 expired 2026-04-12',
    when: '1h ago',
    framework: 'eu-ai-act',
    clause: 'art-11',
  },
  {
    id: 'eval_8814',
    runId: 'run_9407',
    agentId: 'agt_invoice',
    agentName: 'Invoice Processor',
    hook: 'pre-run',
    controlId: 'av.run.human-oversight',
    decision: 'allow',
    detail: 'Agent risk-class: standard · oversight not required',
    when: '2h ago',
    framework: 'eu-ai-act',
    clause: 'art-14',
  },
];

// Helpers ---------------------------------------------------------------

export function frameworkBySlug(slug) {
  return FRAMEWORKS.find(f => f.slug === slug);
}

export function controlsByFramework(frameworkSlug) {
  const out = [];
  for (const c of CONTROLS) {
    const m = MAPPINGS[c.id] || [];
    if (m.some(([fw]) => fw === frameworkSlug)) out.push(c);
  }
  return out;
}

export function clausesCovered(frameworkSlug) {
  const covered = new Set();
  for (const cId of Object.keys(MAPPINGS)) {
    for (const [fw, clause] of MAPPINGS[cId]) {
      if (fw === frameworkSlug) covered.add(clause);
    }
  }
  return covered;
}

export function frameworksFor(controlId) {
  const m = MAPPINGS[controlId] || [];
  const slugs = Array.from(new Set(m.map(([fw]) => fw)));
  return slugs.map(s => frameworkBySlug(s)).filter(Boolean);
}

export function decisionTone(decision) {
  switch (decision) {
    case 'block':            return { color: 'var(--destructive)', label: 'Blocked' };
    case 'require_approval': return { color: 'var(--primary)',     label: 'Approval' };
    case 'redact':           return { color: 'var(--brand-teal, #0891B2)', label: 'Redacted' };
    case 'warn':             return { color: 'var(--accent)',      label: 'Warning' };
    case 'log':              return { color: 'var(--muted-foreground)', label: 'Logged' };
    case 'allow':            return { color: 'var(--accent)',      label: 'Allowed' };
    default:                 return { color: 'var(--muted-foreground)', label: decision };
  }
}

export function hookLabel(hook) {
  return {
    'pre-run':    'Pre-run',
    'pre-tool':   'Pre-tool',
    'pre-model':  'Pre-model',
    'post-model': 'Post-model',
    'post-run':   'Post-run',
    'scheduled':  'Scheduled',
  }[hook] || hook;
}

// Coverage stats per framework — clauses with ≥1 mapped control / total clauses.
export function coverageFor(frameworkSlug) {
  const fw = frameworkBySlug(frameworkSlug);
  if (!fw) return { covered: 0, total: 0, pct: 0 };
  const covered = clausesCovered(frameworkSlug);
  return {
    covered: covered.size,
    total: fw.clauses.length,
    pct: fw.clauses.length === 0 ? 0 : covered.size / fw.clauses.length,
  };
}

// Per-clause status: which clauses of a framework are covered, and by how many
// controls. Used by the density grid on the framework card.
export function clauseStatusFor(frameworkSlug) {
  const fw = frameworkBySlug(frameworkSlug);
  if (!fw) return [];
  const counts = new Map();
  for (const cId of Object.keys(MAPPINGS)) {
    for (const [fwSlug, clauseId] of MAPPINGS[cId]) {
      if (fwSlug !== frameworkSlug) continue;
      counts.set(clauseId, (counts.get(clauseId) || 0) + 1);
    }
  }
  return fw.clauses.map(cl => ({
    id: cl.id,
    label: cl.label,
    controls: counts.get(cl.id) || 0,
  }));
}

// Health snapshot: how many distinct controls discharge this framework, and
// the total 7-day violations across those controls. Aggregates the runtime
// signal that the operator actually cares about.
export function healthFor(frameworkSlug) {
  const contributing = controlsByFramework(frameworkSlug);
  const violations7d = contributing.reduce((s, c) => s + (c.violations7d || 0), 0);
  return {
    controls: contributing.length,
    violations7d,
  };
}
