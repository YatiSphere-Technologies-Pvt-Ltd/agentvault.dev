import Link from "next/link";

// Asymmetric grid: one featured pillar (Orchestration) takes the left column
// with a trace mini-viz; three compact pillars stack on the right.
// Every pillar exposes key/value specs (not pill chips) and a "Built for" persona line.

const FEATURED = {
  key: "orchestration",
  number: "01",
  label: "Agent Orchestration",
  kicker: "The runtime",
  tagline: "Multi-agent workflows, built visually. Running deterministically.",
  body:
    "Compose triggers, LLM calls, tools, human-in-the-loop, and policy gates on a single canvas. Deterministic retries, parallel branches, and first-class observability for every node. Run the same workflow in dev, staging, and prod — with the same trace.",
  specs: [
    ["p50 step latency", "85 ms"],
    ["Runtime SLA",      "99.95%"],
    ["Parallel branches","Up to 64"],
    ["Retry semantics",  "Exactly-once"],
  ],
  builtFor: ["Platform engineering", "Backend teams"],
  docsLink: "/platform#orchestration",
};

const PILLARS = [
  {
    key: "context",
    number: "02",
    label: "Memory + Context Engine",
    kicker: "The data layer",
    tagline: "Retrieval that respects your data model.",
    specs: [
      ["p50 retrieval", "< 120 ms"],
      ["Max context",   "2M tokens"],
      ["ACL model",     "Row-level"],
    ],
    builtFor: ["Data platform", "ML teams"],
  },
  {
    key: "tools",
    number: "03",
    label: "Tool & API Integrations",
    kicker: "The connectors",
    tagline: "Your stack, already wired.",
    specs: [
      ["Connectors",       "4,200+"],
      ["Custom via",       "OpenAPI · MCP"],
      ["Scoped creds",     "Per tool"],
    ],
    builtFor: ["Integration eng", "Ops"],
  },
  {
    key: "governance",
    number: "04",
    label: "Observability & Governance",
    kicker: "The control plane",
    tagline: "Policy-as-code. Logs you can show auditors.",
    specs: [
      ["Trace retention", "18 months"],
      ["Policy lang",     "Cedar"],
      ["Evidence export", "SOC 2 · ISO"],
    ],
    builtFor: ["Risk · Security", "Compliance"],
  },
];

export default function PlatformPillars() {
  return (
    <section className="py-24 border-t border-border">
      <div className="max-w-7xl mx-auto px-6 lg:px-10">
        <header className="flex flex-col md:flex-row md:items-end md:justify-between gap-5">
          <div className="max-w-170">
            <Eyebrow label="The platform" />
            <h2 className="mt-4 text-[32px] lg:text-[42px] leading-[1.08] font-semibold tracking-tight text-foreground">
              Four pillars. One control plane<br className="hidden md:inline" /> for every AI workload.
            </h2>
          </div>
          <p className="max-w-90 text-[13.5px] leading-relaxed text-muted-foreground">
            The capabilities regulated enterprises actually need — built as
            first-class platform primitives, not bolted on.
          </p>
        </header>

        <div className="mt-12 grid grid-cols-1 lg:grid-cols-[1.35fr_1fr] gap-5">
          <FeaturedPillar />
          <div className="grid grid-cols-1 sm:grid-cols-1 gap-5">
            {PILLARS.map(p => <CompactPillar key={p.key} pillar={p} />)}
          </div>
        </div>

        {/* Trust-signal strip */}
        <div className="mt-10 rounded-xl border border-border bg-panel/60 px-6 py-4 flex flex-wrap items-center gap-x-10 gap-y-3 text-[11.5px] text-muted-foreground">
          <TrustFact label="Uptime SLA"     value="99.95%"     tone="accent" />
          <Divider />
          <TrustFact label="Regions"        value="12"         />
          <Divider />
          <TrustFact label="Active connectors" value="4,200+"  />
          <Divider />
          <TrustFact label="Runs / month"   value="2.1B+"      />
          <Divider />
          <TrustFact label="Certifications" value="SOC 2 · ISO 27001 · HIPAA · GDPR" />
        </div>
      </div>
    </section>
  );
}

function FeaturedPillar() {
  const p = FEATURED;
  return (
    <article className="relative bg-panel border border-border rounded-xl overflow-hidden flex flex-col">
      {/* Top accent rail */}
      <div className="h-1 w-full bg-primary" />

      <div className="p-7 lg:p-8 flex-1 flex flex-col">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="text-[10.5px] font-mono text-muted-foreground tabular-nums">{p.number}</span>
            <span className="h-px w-6 bg-border" />
            <span className="text-[10.5px] uppercase tracking-[0.22em] font-mono text-primary">{p.kicker}</span>
          </div>
          <span className="text-[10px] uppercase tracking-[0.18em] font-mono px-2 py-0.5 rounded border border-primary/40 bg-primary/5 text-primary">
            Featured
          </span>
        </div>

        <h3 className="mt-4 text-[22px] lg:text-[26px] font-semibold text-foreground tracking-tight leading-snug">
          {p.label}
        </h3>
        <div className="mt-1.5 text-[13px] font-mono text-primary">{p.tagline}</div>
        <p className="mt-3 text-[13.5px] leading-relaxed text-muted-foreground max-w-135">
          {p.body}
        </p>

        {/* Inline trace/workflow visual — tiny but credible */}
        <div className="mt-5 rounded-lg border border-border bg-hero-bg overflow-hidden">
          <div className="flex items-center justify-between px-3 py-1.5 border-b border-border bg-panel/60">
            <span className="text-[10px] uppercase tracking-[0.18em] font-mono text-muted-foreground">
              Run trace · invoice-processor
            </span>
            <span className="inline-flex items-center gap-1.5 text-[10px] font-mono text-accent">
              <span className="h-1.5 w-1.5 rounded-full bg-accent animate-pulse-dot" />
              success · 14/14
            </span>
          </div>
          <ul className="divide-y divide-border/70">
            {[
              ["01", "trigger.webhook",  "POST /invoices",          "12 ms"],
              ["02", "agent.extract",    "doc-extract@v4",          "840 ms"],
              ["03", "policy.cedar",     "policies/invoice.cedar",  "18 ms"],
              ["04", "branch.if",        "total > $50k → standard", "2 ms"],
              ["05", "tool.netsuite",    "POST /bills · HTTP 200",  "120 ms"],
            ].map(([n, kind, label, dur]) => (
              <li key={n} className="flex items-center gap-3 px-3 py-1.5 text-[11px] font-mono">
                <span className="text-muted-foreground tabular-nums w-6">{n}</span>
                <span className="text-primary w-35 truncate">{kind}</span>
                <span className="text-foreground/80 flex-1 truncate">{label}</span>
                <span className="text-muted-foreground tabular-nums">{dur}</span>
              </li>
            ))}
          </ul>
        </div>

        {/* Specs */}
        <dl className="mt-6 grid grid-cols-2 gap-x-6 gap-y-2.5">
          {p.specs.map(([k, v]) => (
            <div key={k} className="flex items-baseline justify-between border-b border-border/60 pb-2">
              <dt className="text-[10.5px] uppercase tracking-[0.15em] font-mono text-muted-foreground">{k}</dt>
              <dd className="text-[12.5px] font-semibold text-foreground tabular-nums">{v}</dd>
            </div>
          ))}
        </dl>

        {/* Footer: built-for + link */}
        <div className="mt-6 flex items-center justify-between gap-4">
          <div className="text-[11px] text-muted-foreground">
            <span className="font-mono uppercase tracking-[0.18em] text-[10px]">Built for </span>
            <span className="text-foreground">{p.builtFor.join(" · ")}</span>
          </div>
          <Link href={p.docsLink} className="text-[12px] text-primary hover:brightness-110 font-medium inline-flex items-center gap-1">
            Read docs
            <svg width="12" height="12" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M5 10h10M11 5l5 5-5 5"/></svg>
          </Link>
        </div>
      </div>
    </article>
  );
}

function CompactPillar({ pillar }) {
  const p = pillar;
  return (
    <article className="bg-panel border border-border rounded-xl p-5 lg:p-6 hover:border-primary/40 transition-colors">
      <div className="flex items-center gap-3">
        <span className="text-[10.5px] font-mono text-muted-foreground tabular-nums">{p.number}</span>
        <span className="h-px w-5 bg-border" />
        <span className="text-[10.5px] uppercase tracking-[0.22em] font-mono text-primary">{p.kicker}</span>
      </div>

      <h3 className="mt-3 text-[17px] font-semibold text-foreground tracking-tight leading-snug">
        {p.label}
      </h3>
      <div className="mt-1 text-[12.5px] font-mono text-primary">{p.tagline}</div>

      {/* Specs row — inline key/values */}
      <dl className="mt-4 grid grid-cols-3 gap-x-4">
        {p.specs.map(([k, v]) => (
          <div key={k}>
            <dt className="text-[9.5px] uppercase tracking-[0.14em] font-mono text-muted-foreground">{k}</dt>
            <dd className="mt-0.5 text-[12.5px] font-semibold text-foreground tabular-nums truncate">{v}</dd>
          </div>
        ))}
      </dl>

      <div className="mt-5 pt-4 border-t border-border/70 text-[11px] text-muted-foreground">
        <span className="font-mono uppercase tracking-[0.18em] text-[10px]">Built for </span>
        <span className="text-foreground">{p.builtFor.join(" · ")}</span>
      </div>
    </article>
  );
}

function TrustFact({ label, value, tone }) {
  return (
    <div className="flex items-baseline gap-2">
      <span className="font-mono uppercase tracking-[0.15em] text-[10px] text-muted-foreground">{label}</span>
      <span className={`text-[12.5px] font-semibold tabular-nums ${tone === "accent" ? "text-accent" : "text-foreground"}`}>
        {value}
      </span>
    </div>
  );
}

function Divider() {
  return <span aria-hidden className="hidden md:inline h-3 w-px bg-border" />;
}

export function Eyebrow({ label }) {
  return (
    <div className="flex items-center gap-3 text-[10.5px] uppercase tracking-[0.22em] text-muted-foreground font-mono">
      <span className="h-px w-8 bg-primary" />
      <span>{label}</span>
    </div>
  );
}
