import Link from "next/link";
import Navbar from "../components/Navbar";
import FooterCTA from "../components/home/FooterCTA";
import { Eyebrow } from "../components/home/PlatformPillars";

/* Top-level marketing page for the Govern stack.
   ───────────────────────────────────────────────
   The single CISO-facing surface that explains five capabilities that
   live in /app/govern + /app/redteam today: Shadow AI Discovery,
   AI Inventory, Runtime Control (DLP + Gateway + Prompt Inspector),
   Red Team, and Compliance Evidence. */

export const metadata = {
  title: "Govern — AgentVault",
  description:
    "Govern every AI in your organization. Discover Shadow AI, enforce DLP at the gateway, red-team your agents continuously, and ship audit evidence on demand.",
};

const ACCENT = "#0891B2"; // cyan — sits between indigo (platform) and teal (brand)

const MODULES = [
  {
    slug: "discovery",
    kicker: "Module 01",
    name: "Shadow AI Discovery",
    tagline: "See every AI your org is already using.",
    body:
      "Live stream of AI activity observed across egress, identity, and SaaS connectors. Triage unmanaged usage before it becomes an audit finding — Copilot seats, OAuth apps, browser AI helpers, personal accounts on corporate data.",
    deepLink: "/app/govern/discovery",
    points: [
      "Connectors: Zscaler · Netskope · Cloudflare · CrowdStrike · Okta · Defender · Splunk",
      "Signals: user · destination · category · TLS · prompt content (when proxied)",
      "Actions: approve · quarantine · block · escalate to GRC",
    ],
  },
  {
    slug: "inventory",
    kicker: "Module 02",
    name: "AI Inventory",
    tagline: "One ledger for every AI asset.",
    body:
      "Internal agents, approved SaaS, Copilot seats, OAuth apps, BYO models, browser extensions, and unmanaged tools — one record per asset, with owner, approval state, risk class, destination, and data categories observed.",
    deepLink: "/app/govern/inventory",
    points: [
      "Manual register or auto-populated from discovery",
      "Owner + department + approval lifecycle (draft → approved → blocked)",
      "Join key for runtime events, GRC controls, and audit reports",
    ],
  },
  {
    slug: "runtime",
    kicker: "Module 03",
    name: "Runtime Control",
    tagline: "Enforce policy on every model request.",
    body:
      "An AI gateway sits in front of model calls. DLP rules redact secrets, prompt-injection screens fire, decisions are stamped onto the audit log. A live Prompt Inspector lets you paste a prompt and see exactly which rules would fire and what gets redacted.",
    deepLink: "/app/govern/runtime",
    points: [
      "DLP rules: regex · Luhn-validated PII · classifier · prompt-injection",
      "AI gateway: OpenAI / Anthropic / Azure OpenAI compatible",
      "Prompt Inspector: paste & preview decisions before deploy",
    ],
  },
  {
    slug: "redteam",
    kicker: "Module 04",
    name: "Red Team",
    tagline: "Empirical proof your AI is safe.",
    body:
      "Continuous adversarial testing — 2,000+ attacks mapped to MITRE ATLAS, OWASP LLM Top 10, OWASP Agentic, and NIST AI RMF. Run on schedule, on deploy, or on policy change. Findings include reproducible payloads, regression detection, and a signed evidence pack.",
    deepLink: "/app/redteam",
    points: [
      "Targets: agents · chat APIs · RAG · MCP · browser chat · multimodal",
      "Suites: smoke · regression · full · OWASP · agent-misuse",
      "Evidence: signed JSON pack with mappings to every framework",
    ],
  },
  {
    slug: "compliance",
    kicker: "Module 05",
    name: "Compliance Evidence",
    tagline: "Audit bundle, one click.",
    body:
      "Consolidates framework coverage, control state, red-team runs, DLP enforcement, and approval logs into a single auditor-facing view. Export a signed bundle when the auditor calls — EU AI Act, NIST AI RMF, ISO 42001, SOC 2, GDPR, OWASP LLM Top 10.",
    deepLink: "/app/govern/compliance",
    points: [
      "Framework coverage cards (12+ frameworks)",
      "Red-team evidence linked to ATLAS / OWASP / NIST mappings",
      "Signed audit bundle export (sha-256 pinned)",
    ],
  },
];

const PROBLEMS = [
  {
    title: "You don't know what AI your org is using",
    body: "Employees sign up for ChatGPT, Claude, Cursor, Notion AI, Otter, Jasper — on corporate data, with no IT approval. Discovery shows you what's actually running.",
  },
  {
    title: "You can't prove what was blocked",
    body: "Auditors ask: who used which model on which data, and what did the gateway decide? Runtime Control stamps every decision into the audit log.",
  },
  {
    title: "Your agents have never been red-teamed",
    body: "Prompt injection, jailbreaks, data exfiltration, tool misuse — the model is one bad prompt away from a headline. Continuous testing catches regressions before prod.",
  },
  {
    title: "Audit season is still a fire drill",
    body: "Evidence is scattered across tickets, screenshots, sheets. Compliance Evidence consolidates everything into a signed bundle on demand — 12+ frameworks pre-mapped.",
  },
];

const FOR_WHO = [
  ["CISO",                "Defensible posture for the board"],
  ["Head of GRC",         "Continuous evidence across frameworks"],
  ["AI Platform lead",    "Empirical safety pre-deploy"],
  ["Privacy / Legal",     "Provable data handling"],
];

const FRAMEWORKS = [
  "EU AI Act", "NIST AI RMF", "ISO 42001", "SOC 2", "ISO 27001",
  "HIPAA", "GDPR", "OWASP LLM Top 10", "OWASP Agentic Top 10", "MITRE ATLAS",
];

export default function GovernMarketingPage() {
  return (
    <div className="bg-hero-bg min-h-screen">
      <Navbar />
      <main>
        <Hero />
        <Modules />
        <ProblemsSection />
        <ForWho />
        <FrameworksStrip />
        <FooterCTA />
      </main>
    </div>
  );
}

/* ─── HERO ─── */

function Hero() {
  return (
    <section className="relative pt-32 pb-20 lg:pt-40 lg:pb-24 overflow-hidden">
      <div
        aria-hidden
        className="absolute inset-0 pointer-events-none"
        style={{
          background: `radial-gradient(700px 420px at 15% 30%, ${ACCENT}14, transparent 70%), radial-gradient(600px 400px at 85% 70%, color-mix(in oklab, var(--primary) 5%, transparent), transparent 70%)`,
        }}
      />
      <div className="relative max-w-7xl mx-auto px-6 lg:px-10 grid grid-cols-1 lg:grid-cols-[1.1fr_0.9fr] gap-10 items-start">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-border bg-panel/70 text-[11px] uppercase tracking-[0.18em] font-mono text-muted-foreground">
            <span className="h-1.5 w-1.5 rounded-full animate-pulse-dot" style={{ background: ACCENT }} />
            AgentVault Govern
          </div>

          <h1 className="mt-5 text-[40px] lg:text-[54px] leading-[1.04] font-semibold tracking-tight text-foreground max-w-200">
            Govern every AI in your organization.
          </h1>
          <p className="mt-5 text-[15px] lg:text-[17px] leading-relaxed text-muted-foreground max-w-[60ch]">
            Discover Shadow AI, enforce DLP at the gateway, red-team your agents continuously, and
            ship audit evidence on demand — one control plane, end to end.
          </p>

          <div className="mt-8 flex flex-wrap items-center gap-3">
            <Link
              href="#demo"
              className="inline-flex items-center gap-2 px-5 py-3 rounded-md text-[14px] font-medium text-white hover:brightness-110 active:scale-[0.99] transition-all shadow-sm"
              style={{ background: ACCENT }}
            >
              Book a demo
              <svg width="14" height="14" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M5 10h10M11 5l5 5-5 5"/></svg>
            </Link>
            <Link
              href="/app/govern"
              className="inline-flex items-center gap-2 px-5 py-3 rounded-md border border-border bg-panel text-[14px] font-medium text-foreground hover:bg-muted transition-colors"
            >
              Explore in app
            </Link>
          </div>
        </div>

        {/* Right: a stat card showing what Govern actually does */}
        <div className="relative">
          <div
            aria-hidden
            className="absolute -inset-4 rounded-2xl pointer-events-none opacity-50"
            style={{ background: `radial-gradient(360px 240px at 60% 40%, ${ACCENT}22, transparent 70%)` }}
          />
          <div className="relative rounded-2xl border border-border bg-panel shadow-sm p-6 lg:p-8">
            <div className="h-1 w-12 rounded-full" style={{ background: ACCENT }} />
            <div className="mt-4 text-[10.5px] uppercase tracking-[0.2em] font-mono text-muted-foreground">
              The control plane
            </div>
            <div className="mt-1 text-[26px] lg:text-[28px] font-semibold tracking-tight text-foreground leading-snug">
              From discovery to audit — one platform.
            </div>

            <dl className="mt-6 grid grid-cols-3 gap-x-4 border-t border-border pt-5">
              <div>
                <dt className="text-[10px] uppercase tracking-[0.14em] font-mono text-muted-foreground">Attacks</dt>
                <dd className="mt-0.5 text-[16px] font-semibold text-foreground tabular-nums">2,000+</dd>
              </div>
              <div>
                <dt className="text-[10px] uppercase tracking-[0.14em] font-mono text-muted-foreground">Frameworks</dt>
                <dd className="mt-0.5 text-[16px] font-semibold text-foreground tabular-nums">12+</dd>
              </div>
              <div>
                <dt className="text-[10px] uppercase tracking-[0.14em] font-mono text-muted-foreground">Connectors</dt>
                <dd className="mt-0.5 text-[16px] font-semibold text-foreground tabular-nums">14</dd>
              </div>
            </dl>

            <ul className="mt-5 space-y-1.5 text-[12.5px] text-muted-foreground">
              {[
                "MITRE ATLAS · OWASP LLM Top 10 · OWASP Agentic",
                "EU AI Act · NIST AI RMF · ISO 42001 · SOC 2 · HIPAA",
                "Signed evidence bundles · SHA-256 pinned",
              ].map(s => (
                <li key={s} className="flex items-start gap-2">
                  <span className="mt-1 h-1 w-1 rounded-full shrink-0" style={{ background: ACCENT }} />
                  <span>{s}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </section>
  );
}

/* ─── MODULES ─── */

function Modules() {
  return (
    <section className="py-20 border-t border-border">
      <div className="max-w-7xl mx-auto px-6 lg:px-10">
        <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-5">
          <div className="max-w-170">
            <Eyebrow label="The modules" />
            <h2 className="mt-4 text-[32px] lg:text-[42px] leading-[1.08] font-semibold tracking-tight text-foreground">
              Five modules. One control plane.
            </h2>
          </div>
          <p className="max-w-90 text-[13.5px] leading-relaxed text-muted-foreground">
            Each module is a real surface in the product today. Deploy them together, or drop the
            one you need into your existing stack.
          </p>
        </div>

        <div className="mt-12 grid grid-cols-1 lg:grid-cols-2 gap-5">
          {MODULES.map(m => (
            <article key={m.slug} id={m.slug} className="bg-panel border border-border rounded-xl p-6 lg:p-7 hover:border-primary/40 transition-colors">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span className="text-[10.5px] uppercase tracking-[0.22em] font-mono" style={{ color: ACCENT }}>{m.kicker}</span>
                </div>
                <Link href={m.deepLink} className="text-[11.5px] text-primary hover:brightness-110 font-medium inline-flex items-center gap-1">
                  Open in app
                  <svg width="12" height="12" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M5 10h10M11 5l5 5-5 5"/></svg>
                </Link>
              </div>
              <h3 className="mt-3 text-[20px] font-semibold tracking-tight text-foreground leading-snug">
                {m.name}
              </h3>
              <div className="mt-1 text-[13px] font-mono" style={{ color: ACCENT }}>{m.tagline}</div>
              <p className="mt-3 text-[13.5px] leading-relaxed text-muted-foreground">{m.body}</p>

              <ul className="mt-5 pt-4 border-t border-border/70 space-y-1.5 text-[12.5px] text-muted-foreground">
                {m.points.map(p => (
                  <li key={p} className="flex items-start gap-2">
                    <span className="mt-1.5 h-1 w-1 rounded-full shrink-0" style={{ background: ACCENT }} />
                    <span>{p}</span>
                  </li>
                ))}
              </ul>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ─── PROBLEMS ─── */

function ProblemsSection() {
  return (
    <section className="py-20 border-y border-border bg-panel/60">
      <div className="max-w-7xl mx-auto px-6 lg:px-10">
        <Eyebrow label="The problem" />
        <h2 className="mt-4 text-[28px] lg:text-[34px] leading-[1.1] font-semibold tracking-tight text-foreground max-w-170">
          The questions every CISO is being asked about AI.
        </h2>

        <div className="mt-10 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
          {PROBLEMS.map((p, i) => (
            <div key={p.title} className="relative bg-hero-bg border border-border rounded-xl p-5">
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-mono text-muted-foreground tabular-nums">
                  {String(i + 1).padStart(2, "0")}
                </span>
                <span className="h-px w-5 bg-border" />
                <span className="text-[10px] uppercase tracking-[0.2em] font-mono text-destructive">
                  Pain
                </span>
              </div>
              <div className="mt-3 text-[14.5px] font-semibold text-foreground leading-snug">
                {p.title}
              </div>
              <p className="mt-2 text-[12.5px] leading-relaxed text-muted-foreground">
                {p.body}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ─── FOR WHO ─── */

function ForWho() {
  return (
    <section className="py-20">
      <div className="max-w-7xl mx-auto px-6 lg:px-10">
        <Eyebrow label="Built for" />
        <h2 className="mt-4 text-[28px] lg:text-[34px] leading-[1.1] font-semibold tracking-tight text-foreground max-w-170">
          The team that owns AI risk.
        </h2>
        <div className="mt-8 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {FOR_WHO.map(([role, line]) => (
            <div key={role} className="rounded-md border border-border bg-panel/60 px-4 py-3">
              <div className="text-[11px] font-mono uppercase tracking-[0.16em]" style={{ color: ACCENT }}>{role}</div>
              <div className="mt-1 text-[13.5px] text-foreground leading-snug">{line}</div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ─── FRAMEWORKS STRIP ─── */

function FrameworksStrip() {
  return (
    <section className="py-14 border-y border-border bg-panel/60">
      <div className="max-w-7xl mx-auto px-6 lg:px-10">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <div className="text-[10.5px] uppercase tracking-[0.18em] font-mono text-muted-foreground">Frameworks mapped, out of the box</div>
            <div className="mt-1 text-[16px] font-semibold text-foreground">12+ compliance + adversarial frameworks pre-mapped.</div>
          </div>
          <Link href="/app/govern/compliance" className="text-[12.5px] text-primary hover:brightness-110 font-medium">
            See compliance evidence →
          </Link>
        </div>
        <div className="mt-6 flex flex-wrap gap-2">
          {FRAMEWORKS.map(f => (
            <span key={f} className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded border border-border bg-hero-bg text-[11px] font-mono text-foreground">
              <span className="h-1.5 w-1.5 rounded-full" style={{ background: ACCENT }} />
              {f}
            </span>
          ))}
        </div>
      </div>
    </section>
  );
}
