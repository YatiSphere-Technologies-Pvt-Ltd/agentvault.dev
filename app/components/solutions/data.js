export const SOLUTIONS = {
  grc: {
    slug: "grc",
    suite: "AgentVault GRC Suite",
    tagline: "Continuous controls. Evidence on demand.",
    shortTag: "Governance",
    accent: "#3B5CFF",
    problemStatement:
      "Audit season eats quarters. Evidence is scattered across ticket systems, spreadsheets, and screenshots — so every SOC 2, ISO 27001, or HIPAA cycle means a manual scramble. GRC Suite turns compliance into a continuous, auditable agent workflow.",
    problems: [
      { title: "Audit prep eats a quarter",        body: "Teams spend 6–10 weeks pulling evidence, chasing owners, and reconciling controls — twice a year." },
      { title: "Evidence is scattered",             body: "Tickets, Slack, spreadsheets, screenshots. No single record of truth an auditor can trust." },
      { title: "Controls drift silently",           body: "A mis-configured bucket or disabled MFA isn't caught until the next audit cycle." },
      { title: "Remediation goes nowhere",          body: "Findings land in a sheet. Owners change teams. Half the items are still open next quarter." },
    ],
    capabilities: [
      {
        title: "Continuous control monitoring",
        body: "Agents sample controls on a schedule — access reviews, MFA coverage, encryption-at-rest checks, change-management conformance — and flag drift the moment it happens.",
        specs: [["Control library", "380+"], ["Frequencies", "1m–24h"], ["Frameworks", "SOC 2 · ISO · HIPAA"]],
      },
      {
        title: "Evidence collection, on demand",
        body: "One command produces a timestamped evidence bundle — agent-captured artifacts, hash-pinned, exportable as a signed PDF or CSV package auditors accept as-is.",
        specs: [["Formats", "PDF · CSV · JSON"], ["Hash", "SHA-256 pinned"], ["Signing", "Ed25519"]],
      },
      {
        title: "Remediation routing",
        body: "Every finding opens a ticket in the right system with the right owner, SLA, and policy reference. Agents chase stragglers. Escalations are automatic.",
        specs: [["Integrations", "Jira · Linear · ServiceNow"], ["SLA", "Per-control"], ["Escalation", "Policy-driven"]],
      },
      {
        title: "Auditor-ready reporting",
        body: "Prebuilt reports for SOC 2 Type II, ISO 27001, HIPAA, and custom frameworks — with full drill-down to the agent run that produced each piece of evidence.",
        specs: [["Templates", "12+ frameworks"], ["Drill-down", "Run-level"], ["Exports", "Signed archive"]],
      },
    ],
    workflow: {
      name: "Quarterly access review",
      steps: [
        { kind: "trigger.schedule",   label: "Cron · every 90 days",           metric: "policy:AC-2" },
        { kind: "tool.okta",          label: "Pull user + group roster",        metric: "12,480 rows",  dur: "380 ms" },
        { kind: "tool.aws",           label: "Pull IAM role assignments",       metric: "4,210 rows",   dur: "220 ms" },
        { kind: "agent.reconcile",    label: "Reconcile vs. HRIS active list",  metric: "94 exceptions" },
        { kind: "policy.cedar",       label: "Apply dormant-account rule",      metric: "47 must-revoke" },
        { kind: "human.slack",        label: "Route to control owners",         metric: "47 tickets",   dur: "1.2 s" },
        { kind: "output.evidence",    label: "Append to SOC 2 AC-2 bundle",     metric: "PDF · signed" },
      ],
    },
    impact: {
      headline: "Audit prep in days, not weeks.",
      stats: [
        ["Audit prep time",  "−70%"],
        ["Control coverage", "3.4×"],
        ["Findings to fix",  "< 5 days"],
      ],
      quote:
        "We replaced a 10-week SOC 2 evidence scramble with a continuous process that produces a signed bundle on demand. Our auditor called it the cleanest submission they'd seen.",
      quoteBy: "Priya Nair",
      quoteRole: "Head of GRC · Mid-market fintech",
    },
    techSpecs: [
      ["Control library",       "380+ controls across SOC 2 / ISO 27001 / HIPAA / PCI / NIST 800-53"],
      ["Evidence storage",      "S3-compatible, customer-managed KMS, configurable retention"],
      ["Integrations",          "Okta · Azure AD · AWS · GCP · Azure · Jira · Linear · ServiceNow · Slack · GitHub · GitLab"],
      ["Data residency",        "US · EU · APAC · or your own VPC (BYOC)"],
      ["Audit log",             "18-month minimum, immutable, exportable as signed archive"],
      ["SSO & SCIM",            "SAML 2.0 · OIDC · SCIM 2.0"],
      ["Isolation model",       "Per-tenant VPC isolation available on Enterprise"],
      ["Compliance posture",    "SOC 2 Type II · ISO 27001 · HIPAA · GDPR"],
    ],
  },

  kyc: {
    slug: "kyc",
    suite: "AgentVault KYC Intelligence",
    tagline: "Identity + risk, scored in seconds.",
    shortTag: "Financial services",
    accent: "#0891B2",
    problemStatement:
      "Corporate KYC has become a 9-day, 40-touchpoint obstacle course. Fragmented identity systems, stale sanctions lists, and manual UBO resolution push deals past their close date. KYC Intelligence compresses the whole workflow into one governed pipeline — with analyst-in-the-loop for the cases that need judgment.",
    problems: [
      { title: "9-day corporate KYC turnaround", body: "Deals get lost or repriced because diligence can't keep up with revenue teams." },
      { title: "Sanctions data goes stale fast",  body: "OFAC, EU, UN update daily. Batch lookups miss same-day changes and create false clears." },
      { title: "UBO chains are manual",           body: "Ownership resolution across jurisdictions is spreadsheet archaeology — and it's where auditors look first." },
      { title: "Analyst queues burn out",         body: "High-volume, low-context reviews cause fatigue and inconsistent risk scoring." },
    ],
    capabilities: [
      {
        title: "Multi-source identity verification",
        body: "ID-doc OCR + liveness, address + phone + email validation, corporate registry lookups across 180+ jurisdictions — composed in one configurable agent.",
        specs: [["Jurisdictions", "180+"], ["ID types", "42+"], ["p50 latency", "2.1 s"]],
      },
      {
        title: "Real-time sanctions & PEP screening",
        body: "OFAC, EU, UN, HMT, PEP lists refreshed continuously. Alias matching with fuzzy-logic scoring — agents explain why a match fired, not just that it did.",
        specs: [["Refresh cadence", "15 min"], ["Match confidence", "0–100"], ["Lists", "22 global"]],
      },
      {
        title: "UBO chain resolution",
        body: "Beneficial-ownership graphs resolved automatically across corporate registries, with cycle detection and confidence per edge. One click to audit the chain.",
        specs: [["Depth", "Unlimited"], ["Confidence", "Per edge"], ["Viz", "Graph + table"]],
      },
      {
        title: "Analyst review queues",
        body: "The cases that need humans get a pre-assembled dossier — risk score, evidence, policy reference, suggested decision. Review in 90 seconds, not 30 minutes.",
        specs: [["Avg review time", "90 s"], ["Escalation", "SLA-based"], ["Audit log", "Per decision"]],
      },
    ],
    workflow: {
      name: "Corporate onboarding",
      steps: [
        { kind: "trigger.webhook", label: "POST /kyc/onboard",                  metric: "bank-app" },
        { kind: "tool.registry",   label: "Corporate registry lookup",          metric: "DE · UK · SG",  dur: "1.4 s" },
        { kind: "agent.ubo",       label: "Resolve UBO chain",                   metric: "14 entities",   dur: "3.8 s" },
        { kind: "tool.sanctions",  label: "Screen sanctions + PEP",              metric: "3 soft hits",   dur: "420 ms" },
        { kind: "agent.score",     label: "Composite risk score",                metric: "62 / medium" },
        { kind: "policy.cedar",    label: "Apply risk appetite policy",          metric: "route:analyst" },
        { kind: "human.slack",     label: "Dossier to analyst queue",            metric: "p50 90 s" },
        { kind: "output.decision", label: "Decision + audit record",             metric: "approved" },
      ],
    },
    impact: {
      headline: "Same-day decisions. Continuous monitoring.",
      stats: [
        ["Turnaround",        "3.2× faster"],
        ["Analyst throughput","+180%"],
        ["False positives",   "−64%"],
      ],
      quote:
        "We moved corporate onboarding from 9 days to same-day for 80% of cases. The analysts spend their time on actual judgment, not on assembling dossiers.",
      quoteBy: "Marcus Lee",
      quoteRole: "Head of Financial Crime · Tier-1 bank",
    },
    techSpecs: [
      ["ID verification",    "Doc + liveness, 42 doc types, 180+ jurisdictions"],
      ["Sanctions lists",    "OFAC · EU · UN · HMT · AUSTRAC · 22 total, 15-min refresh"],
      ["UBO resolution",     "Registry integrations across DE · UK · SG · US · JP · AU · FR · IN + 170 more"],
      ["Risk scoring",       "Configurable weights, fully explainable, exportable as policy artifact"],
      ["Integrations",       "Salesforce · HubSpot · Workday · Slack · Microsoft Teams"],
      ["Data residency",     "US · EU · UK · APAC · BYOC"],
      ["Retention",          "Per-jurisdiction rules, customer-managed keys"],
      ["Compliance posture", "SOC 2 Type II · ISO 27001 · PCI-DSS · GDPR"],
    ],
  },

  workforce: {
    slug: "workforce",
    suite: "AgentVault Workforce",
    tagline: "Always-on agents across your ops.",
    shortTag: "Operations",
    accent: "#10B981",
    problemStatement:
      "Your ops teams spend their best hours on predictable, high-volume work — AP invoices, HR intake, ticket triage, contract review. Workforce gives you production-ready agents for each, wired into the tools you already run. No rip-and-replace, measurable hours back every week.",
    problems: [
      { title: "Repetitive work eats senior time", body: "Staff engineers, HR business partners, and AP leads burn hours on what should be templated." },
      { title: "Hiring can't scale with volume",    body: "Ops headcount grows linearly with transaction volume. Agents are the only way to break the curve." },
      { title: "Tool sprawl, not integration",     body: "The 'automation' story ends at the boundary of each SaaS tool — no one stitches them end to end." },
      { title: "Audit blind spots",                 body: "Low-code bots have no audit trail. They fail silently or worse, take action no one reviews." },
    ],
    capabilities: [
      {
        title: "Pre-built workforce agents",
        body: "Production agents for AP invoicing, HR intake, ticket triage, and contract review — each with tested prompts, connectors, policies, and guardrails.",
        specs: [["Agent library", "28 prebuilt"], ["Avg deploy time", "< 2 days"], ["Coverage", "AP · HR · IT · Legal"]],
      },
      {
        title: "Drop into your existing tools",
        body: "Agents work inside Slack, Teams, Outlook, Salesforce, ServiceNow, NetSuite — wherever your ops team already lives. No UI migration required.",
        specs: [["Integrations", "200+"], ["Surface", "Slack · Teams · Email"], ["Latency", "Real-time"]],
      },
      {
        title: "Human-in-the-loop by default",
        body: "Every agent has an approval surface, escalation paths, and SLA enforcement. Agents take the first 90%; humans handle the judgment calls.",
        specs: [["Approval surface", "Slack · Email"], ["SLA", "Per workflow"], ["Escalation", "Policy-driven"]],
      },
      {
        title: "Full audit and cost attribution",
        body: "Every agent run is traced. Cost attributes to a team, cost center, or ticket. Finance can see exactly where hours and dollars were saved.",
        specs: [["Trace retention", "18 months"], ["Cost attribution", "Per-run"], ["Reporting", "Hours + $"]],
      },
    ],
    workflow: {
      name: "AP invoice processing",
      steps: [
        { kind: "trigger.webhook",   label: "POST /invoices",                   metric: "vendor-portal" },
        { kind: "agent.extract",     label: "Extract fields · doc-extract@v4",  metric: "23 fields",  dur: "840 ms" },
        { kind: "tool.snowflake",    label: "Vendor lookup",                    metric: "matched",    dur: "180 ms" },
        { kind: "policy.cedar",      label: "3-way match · PO + receipt",       metric: "passed" },
        { kind: "branch.if",         label: "Amount > $50k → CFO approval",     metric: "standard" },
        { kind: "tool.netsuite",     label: "Post to NetSuite",                  metric: "HTTP 200",   dur: "120 ms" },
        { kind: "tool.slack",        label: "Notify #ap-posted",                 metric: "delivered" },
      ],
    },
    impact: {
      headline: "18,000 hours returned per year.",
      stats: [
        ["Hours returned / yr", "18,000+"],
        ["Auto-resolution",      "74%"],
        ["Cost per run",         "−82%"],
      ],
      quote:
        "Workforce took our AP team from 12 FTE of throughput to the same team shipping 4x the volume. The agents file cleaner tickets than our juniors did.",
      quoteBy: "Samira Kenji",
      quoteRole: "VP Shared Services · Global logistics",
    },
    techSpecs: [
      ["Prebuilt agents",    "28 production-tested agents across AP, HR, IT, Legal, Finance"],
      ["Connectors",         "200+ across Salesforce · NetSuite · Workday · ServiceNow · Slack · M365"],
      ["Approval surfaces",  "Slack · Microsoft Teams · Outlook · in-app"],
      ["LLM routing",        "Per-agent model selection with cost/quality SLAs"],
      ["Cost attribution",   "Per-agent, per-team, per-ticket — exportable to finance"],
      ["Isolation",          "Per-team scoped credentials, no shared secrets"],
      ["Data residency",     "US · EU · APAC · BYOC"],
      ["Compliance posture", "SOC 2 Type II · ISO 27001 · GDPR"],
    ],
  },

  context: {
    slug: "context",
    suite: "AgentVault Context Engine",
    tagline: "Your data, agent-ready.",
    shortTag: "Data platform",
    accent: "#7C3AED",
    problemStatement:
      "Every AI initiative trips over retrieval. The data is in the warehouse — but agents need permissioned, fresh, low-latency access with an API they can trust. Context Engine is managed enterprise RAG that respects your data model and carries your ACLs all the way through.",
    problems: [
      { title: "Retrieval without permissions leaks data", body: "Most vector stores lose row-level ACLs at ingestion — a compliance failure waiting to happen." },
      { title: "Indexes go stale quietly",                  body: "Your agents happily answer with yesterday's data. No freshness SLA, no alert, no fix." },
      { title: "Hybrid search is custom work",              body: "Vector alone misses exact matches; keyword alone misses semantics. Teams end up building brittle pipelines." },
      { title: "No unified context API",                    body: "Every agent team builds its own retrieval — different libraries, different guarantees, different bugs." },
    ],
    capabilities: [
      {
        title: "Row-level ACLs, end to end",
        body: "Your warehouse permissions carry through every retrieval. If a user can't see a row in Snowflake, their agent can't retrieve it — full stop.",
        specs: [["ACL model", "Row-level"], ["Backends", "Snowflake · BQ · Databricks · PG"], ["Latency", "< 5 ms overhead"]],
      },
      {
        title: "Hybrid vector + keyword",
        body: "Semantic search fused with BM25 keyword scoring and structured filters. Agents get the right chunks whether the query is conversational or exact.",
        specs: [["Vector dims", "Up to 3,072"], ["BM25", "Built-in"], ["Filters", "SQL-level"]],
      },
      {
        title: "Freshness SLAs you can monitor",
        body: "Every source has a named freshness target. Agents get alerted when context is stale; you get a dashboard and a pager.",
        specs: [["Staleness metric", "Per source"], ["SLA", "Configurable"], ["Alerts", "Slack · PagerDuty"]],
      },
      {
        title: "Unified context API",
        body: "One typed API for retrieval — `/context.search` — across every backend, with built-in rerankers, query expansion, and evaluation hooks.",
        specs: [["Protocol", "REST · gRPC"], ["SDKs", "TS · Python · Go"], ["Eval hooks", "Built-in"]],
      },
    ],
    workflow: {
      name: "Policy-aware retrieval",
      steps: [
        { kind: "trigger.request",  label: "agent.query · user=anita@corp",       metric: "msg_id 9412" },
        { kind: "context.parse",    label: "Extract filters + rewrite query",      metric: "sql+vector",  dur: "22 ms" },
        { kind: "context.acl",      label: "Apply row-level ACL from Okta group",  metric: "1.2M → 840k", dur: "4 ms" },
        { kind: "context.search",   label: "Hybrid BM25 + vector (top-k 32)",      metric: "recall 0.94", dur: "68 ms" },
        { kind: "context.rerank",   label: "Cross-encoder rerank (top-8)",         metric: "nDCG 0.87",   dur: "18 ms" },
        { kind: "output.context",   label: "Return to agent",                       metric: "8 chunks" },
      ],
    },
    impact: {
      headline: "Sub-120 ms retrieval. Permissions intact.",
      stats: [
        ["p50 retrieval",  "< 120 ms"],
        ["ACL leakage",    "0 incidents"],
        ["Time to RAG",    "< 1 day"],
      ],
      quote:
        "We killed three home-grown retrieval stacks in a quarter. Our agents went from 'cool demo' to 'production feature' the moment we could prove ACLs flowed through.",
      quoteBy: "Danielle Okafor",
      quoteRole: "Principal Data Engineer · Healthcare network",
    },
    techSpecs: [
      ["Backends",           "Snowflake · BigQuery · Databricks · Postgres · S3/Parquet · Elastic · native vector"],
      ["ACL model",          "Row-level, carried from source — no replication, no drift"],
      ["Embedding models",   "OpenAI · Cohere · Voyage · BYO — per-source configurable"],
      ["Query protocol",     "REST + gRPC, typed SDKs for TS / Python / Go"],
      ["Freshness SLA",      "Named per source, alert via Slack / PagerDuty / webhook"],
      ["Evaluation",         "Retrieval nDCG, recall@k, MRR — ship as CI check"],
      ["Data residency",     "US · EU · APAC · BYOC"],
      ["Compliance posture", "SOC 2 Type II · ISO 27001 · HIPAA · GDPR"],
    ],
  },
};

// Convenience: pick 3 "other" solutions (excluding current)
export function relatedFor(slug) {
  return Object.values(SOLUTIONS)
    .filter(s => s.slug !== slug)
    .map(s => ({ slug: s.slug, suite: s.suite, tagline: s.tagline }));
}
