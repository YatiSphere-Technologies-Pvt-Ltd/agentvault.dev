import Link from "next/link";
import Navbar from "../components/Navbar";
import FooterCTA from "../components/home/FooterCTA";
import { Eyebrow } from "../components/home/PlatformPillars";

/* /platform — the full capability story. Previously a ComingSoon stub.
   ────────────────────────────────────────────────────────────────────
   Replaces the bullet-list teaser with a real marketing surface that
   names the modules actually shipping: Orchestration, Context Engine,
   Integrations, Observability, Govern (Discovery/Inventory), Runtime
   Control (DLP/Gateway/Inspector), Red Team, Approvals (HITL),
   Compliance Evidence, Deploy-anywhere. */

export const metadata = {
  title: "Platform — AgentVault",
  description:
    "The control plane for enterprise AI. Orchestration, context, integrations, observability, governance, runtime control, red team, approvals.",
};

const ACCENT = "var(--primary)";
const DEEP_LINK_BASE = "/app";

/* Each capability gets an anchor so footer/landing #links work. */
const CAPABILITIES = [
  {
    slug: "orchestration",
    kicker: "01",
    pillar: "Runtime",
    name: "Agent Orchestration",
    tagline: "Multi-agent workflows, built visually. Running deterministically.",
    body:
      "Compose triggers, LLM calls, tools, human-in-the-loop, and policy gates on a single canvas. Deterministic retries, parallel branches, and first-class observability for every node.",
    specs: [
      ["p50 step latency", "85 ms"],
      ["Runtime SLA",      "99.95%"],
      ["Parallel branches","Up to 64"],
      ["Retry semantics",  "Exactly-once"],
    ],
    deepLink: `${DEEP_LINK_BASE}/studio`,
    built_for: ["Platform engineering", "Backend teams"],
  },
  {
    slug: "context",
    kicker: "02",
    pillar: "Data layer",
    name: "Context Engine",
    tagline: "Retrieval that respects your data model.",
    body:
      "Hybrid vector + BM25 retrieval on your warehouse, lakehouse, and doc stores. Row-level ACLs, freshness SLAs, and a unified context API.",
    specs: [
      ["p50 retrieval", "< 120 ms"],
      ["Max context",   "2M tokens"],
      ["ACL model",     "Row-level"],
    ],
    deepLink: `${DEEP_LINK_BASE}/context`,
    built_for: ["Data platform", "ML teams"],
  },
  {
    slug: "integrations",
    kicker: "03",
    pillar: "Connectors",
    name: "Tool & API Integrations",
    tagline: "Your stack, already wired.",
    body:
      "4,200+ pre-built connectors plus OpenAPI and MCP support for the long tail. Scoped credentials, per-tool rate limits, and human-readable diff on every call.",
    specs: [
      ["Connectors",   "4,200+"],
      ["Custom via",   "OpenAPI · MCP"],
      ["Scoped creds", "Per tool"],
    ],
    deepLink: `${DEEP_LINK_BASE}/tools`,
    built_for: ["Integration eng", "Ops"],
  },
  {
    slug: "observability",
    kicker: "04",
    pillar: "Visibility",
    name: "Observability & Evaluation",
    tagline: "Replay any run. Audit any decision.",
    body:
      "Full structured traces for every step. Evaluation harness for offline grading. Replay-any-execution. Cost attribution per agent, per tool, per workflow.",
    specs: [
      ["Trace retention", "18 months"],
      ["Replay",          "Deterministic"],
      ["Cost attribution","Per node"],
    ],
    deepLink: `${DEEP_LINK_BASE}/runs`,
    built_for: ["Platform engineering", "SRE"],
  },
  {
    slug: "govern",
    kicker: "05",
    pillar: "Governance",
    name: "Govern (Discovery + Inventory)",
    tagline: "See every AI in your org — sanctioned or not.",
    body:
      "Live discovery feed from egress / identity / SaaS connectors. AI Inventory ledger tracks owner, approval state, risk class, and destination for every asset — internal agents, SaaS apps, Copilot seats, browser extensions, personal accounts.",
    specs: [
      ["Connectors",      "14 (Zscaler · Okta · Splunk · …)"],
      ["Approval states", "Pending · Approved · Quarantined · Blocked"],
      ["Asset types",     "8 (agent · SaaS · copilot · OAuth · …)"],
    ],
    deepLink: `${DEEP_LINK_BASE}/govern`,
    built_for: ["CISO", "Security ops"],
    isNew: true,
  },
  {
    slug: "runtime",
    kicker: "06",
    pillar: "Enforcement",
    name: "Runtime Control",
    tagline: "AI gateway with DLP, prompt-injection screens, and live preview.",
    body:
      "A gateway sits in front of every model call. Real DLP engine — regex + Luhn-validated PII + classifier + prompt-injection phrase list. Prompt Inspector lets you paste a prompt and preview decisions before you deploy.",
    specs: [
      ["DLP detectors",     "Regex · Luhn · classifier · injection"],
      ["Gateway protocols", "OpenAI · Anthropic · Azure OpenAI"],
      ["Decision audit",    "Every request stamped"],
    ],
    deepLink: `${DEEP_LINK_BASE}/govern/runtime`,
    built_for: ["AI Platform", "Privacy / Legal"],
    isNew: true,
  },
  {
    slug: "redteam",
    kicker: "07",
    pillar: "Adversarial",
    name: "Red Team",
    tagline: "Continuous adversarial testing, mapped to every framework.",
    body:
      "2,000+ real-corpus attack templates (HarmBench, AdvBench, AgentDojo, JailbreakBench, Garak), MITRE ATLAS / OWASP LLM / OWASP Agentic / NIST AI RMF mappings. Targets with consent records, lifecycle states, and reproducible findings.",
    specs: [
      ["Attacks",       "2,000+"],
      ["Frameworks",    "ATLAS · OWASP × 2 · NIST"],
      ["Target types",  "agent · chat · RAG · MCP · browser"],
    ],
    deepLink: `${DEEP_LINK_BASE}/redteam`,
    built_for: ["Red team", "AI safety"],
    isNew: true,
  },
  {
    slug: "approvals",
    kicker: "08",
    pillar: "Human in the loop",
    name: "Approvals (HITL)",
    tagline: "Pause autonomous agents at the high-stakes step.",
    body:
      "Inbox of paused agents waiting for human guidance. Approve, reject, redirect with free-text, or nudge — all changes write back to the run trace so the audit story stays intact.",
    specs: [
      ["Inbox",   "Per agent · per step"],
      ["Actions", "Approve · Reject · Redirect · Nudge"],
      ["Audit",   "Inline in run trace"],
    ],
    deepLink: `${DEEP_LINK_BASE}/approvals`,
    built_for: ["Ops", "Compliance"],
    isNew: true,
  },
  {
    slug: "compliance",
    kicker: "09",
    pillar: "Evidence",
    name: "Compliance Evidence",
    tagline: "Audit bundle on demand. 12+ frameworks pre-mapped.",
    body:
      "Consolidates framework coverage, control state, red-team runs, DLP enforcement, and approval logs into a signed JSON bundle. EU AI Act, NIST AI RMF, ISO 42001, SOC 2, GDPR, OWASP LLM Top 10.",
    specs: [
      ["Frameworks",  "12+"],
      ["Export",      "Signed JSON · SHA-256 pinned"],
      ["Drill-down",  "To the run that produced it"],
    ],
    deepLink: `${DEEP_LINK_BASE}/govern/compliance`,
    built_for: ["GRC", "Audit"],
    isNew: true,
  },
  {
    slug: "deploy",
    kicker: "10",
    pillar: "Infrastructure",
    name: "Deploy Anywhere",
    tagline: "Cloud, your VPC, or air-gapped on-prem.",
    body:
      "Same runtime, same APIs across AgentVault Cloud, BYOC in your VPC, and on-prem Kubernetes. SSO / SCIM, scoped secrets, network isolation, Cedar policy-as-code, immutable audit log.",
    specs: [
      ["Deployments",  "Cloud · BYOC · On-prem"],
      ["SSO / SCIM",   "SAML 2.0 · OIDC · SCIM 2.0"],
      ["Policy lang",  "Cedar"],
    ],
    deepLink: null,
    built_for: ["Security", "Platform engineering"],
  },
];

export default function PlatformPage() {
  return (
    <div className="bg-hero-bg min-h-screen">
      <Navbar />
      <main>
        <Hero />
        <CapabilitiesSection />
        <TrustStrip />
        <FooterCTA />
      </main>
    </div>
  );
}

function Hero() {
  return (
    <section className="relative pt-32 pb-20 lg:pt-40 lg:pb-24 overflow-hidden">
      <div
        aria-hidden
        className="absolute inset-0 pointer-events-none"
        style={{
          background: `radial-gradient(700px 420px at 15% 30%, color-mix(in oklab, ${ACCENT} 8%, transparent), transparent 70%), radial-gradient(600px 400px at 85% 70%, color-mix(in oklab, ${ACCENT} 4%, transparent), transparent 70%)`,
        }}
      />
      <div className="relative max-w-7xl mx-auto px-6 lg:px-10">
        <Eyebrow label="The platform" />
        <h1 className="mt-5 text-[40px] lg:text-[54px] leading-[1.04] font-semibold tracking-tight text-foreground max-w-[20ch]">
          The control plane for enterprise AI.
        </h1>
        <p className="mt-5 text-[15px] lg:text-[17px] leading-relaxed text-muted-foreground max-w-[68ch]">
          Ten capabilities, one runtime. Orchestrate agents, retrieve from your data, integrate with
          every tool you own, observe every run — and govern, red-team, and audit the whole thing
          end to end.
        </p>

        <div className="mt-8 flex flex-wrap items-center gap-3">
          <Link
            href="/signup"
            className="inline-flex items-center gap-2 px-5 py-3 rounded-md bg-primary text-primary-foreground text-[14px] font-medium hover:brightness-110 active:scale-[0.99] transition-all shadow-sm"
          >
            Start free trial
            <svg width="14" height="14" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M5 10h10M11 5l5 5-5 5"/></svg>
          </Link>
          <Link
            href="/govern"
            className="inline-flex items-center gap-2 px-5 py-3 rounded-md border border-border bg-panel text-[14px] font-medium text-foreground hover:bg-muted transition-colors"
          >
            See Govern →
          </Link>
        </div>
      </div>
    </section>
  );
}

function CapabilitiesSection() {
  return (
    <section className="py-20 border-t border-border">
      <div className="max-w-7xl mx-auto px-6 lg:px-10">
        <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-5">
          <div className="max-w-170">
            <Eyebrow label="Capabilities" />
            <h2 className="mt-4 text-[28px] lg:text-[34px] leading-[1.1] font-semibold tracking-tight text-foreground">
              Ten capabilities. One runtime.
            </h2>
          </div>
          <p className="max-w-90 text-[13.5px] leading-relaxed text-muted-foreground">
            Every capability is a real surface in the product today. Deploy them together, or drop
            individual ones into your existing stack.
          </p>
        </div>

        <div className="mt-10 grid grid-cols-1 md:grid-cols-2 gap-5">
          {CAPABILITIES.map(c => (
            <article
              key={c.slug}
              id={c.slug}
              className="bg-panel border border-border rounded-xl p-6 lg:p-7 hover:border-primary/40 transition-colors flex flex-col"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span className="text-[10.5px] font-mono text-muted-foreground tabular-nums">{c.kicker}</span>
                  <span className="h-px w-5 bg-border" />
                  <span className="text-[10.5px] uppercase tracking-[0.22em] font-mono text-primary">{c.pillar}</span>
                </div>
                {c.isNew && (
                  <span className="text-[9.5px] font-mono uppercase tracking-[0.16em] px-1.5 py-0.5 rounded border border-primary/40 bg-primary/[0.08] text-primary">New</span>
                )}
              </div>

              <h3 className="mt-3 text-[18px] font-semibold tracking-tight text-foreground leading-snug">
                {c.name}
              </h3>
              <div className="mt-1 text-[12.5px] font-mono text-primary">{c.tagline}</div>
              <p className="mt-3 text-[13.5px] leading-relaxed text-muted-foreground">{c.body}</p>

              {c.specs?.length > 0 && (
                <dl className="mt-5 grid grid-cols-3 gap-x-4 pt-4 border-t border-border/70">
                  {c.specs.map(([k, v]) => (
                    <div key={k} className="min-w-0">
                      <dt className="text-[9.5px] uppercase tracking-[0.14em] font-mono text-muted-foreground truncate">{k}</dt>
                      <dd className="mt-0.5 text-[12px] font-semibold text-foreground tabular-nums truncate">{v}</dd>
                    </div>
                  ))}
                </dl>
              )}

              <div className="mt-5 pt-4 border-t border-border/70 flex items-center justify-between gap-3">
                <div className="text-[11px] text-muted-foreground min-w-0">
                  <span className="font-mono uppercase tracking-[0.18em] text-[10px]">Built for </span>
                  <span className="text-foreground truncate">{c.built_for.join(" · ")}</span>
                </div>
                {c.deepLink && (
                  <Link href={c.deepLink} className="text-[12px] text-primary hover:brightness-110 font-medium inline-flex items-center gap-1 shrink-0">
                    Open in app
                    <svg width="12" height="12" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M5 10h10M11 5l5 5-5 5"/></svg>
                  </Link>
                )}
              </div>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}

function TrustStrip() {
  return (
    <section className="py-14 border-y border-border bg-panel/60">
      <div className="max-w-7xl mx-auto px-6 lg:px-10 flex flex-wrap items-center gap-x-10 gap-y-3 text-[11.5px] text-muted-foreground">
        <span className="font-semibold text-foreground">One platform.</span>
        <Fact label="Uptime SLA" value="99.95%" />
        <Divider />
        <Fact label="Regions" value="12" />
        <Divider />
        <Fact label="Active connectors" value="4,200+" />
        <Divider />
        <Fact label="Runs / month" value="2.1B+" />
        <Divider />
        <Fact label="Certifications" value="SOC 2 · ISO 27001 · HIPAA · GDPR" />
      </div>
    </section>
  );
}

function Fact({ label, value }) {
  return (
    <div className="flex items-baseline gap-2">
      <span className="font-mono uppercase tracking-[0.15em] text-[10px] text-muted-foreground">{label}</span>
      <span className="text-[12.5px] font-semibold tabular-nums text-foreground">{value}</span>
    </div>
  );
}
function Divider() {
  return <span aria-hidden className="hidden md:inline h-3 w-px bg-border" />;
}
