import { Eyebrow } from "./PlatformPillars";

// Workflows, not features. Each one describes a concrete business outcome.

const USE_CASES = [
  {
    vertical: "Financial services",
    title: "Vendor-invoice processing, end to end",
    before: "8 analysts · 4-day cycle · 12% exception rate",
    after:  "1 analyst · 11-minute cycle · 2% exception rate",
    flow: ["Webhook", "Extract", "Classify", "Policy", "Approve", "Post to ERP"],
  },
  {
    vertical: "Banking · Compliance",
    title: "KYC onboarding for a new corporate client",
    before: "9-day turnaround · manual sanctions checks",
    after:  "Same-day decision · continuous monitoring",
    flow: ["Intake", "ID verify", "Sanctions", "UBO resolve", "Analyst review"],
  },
  {
    vertical: "Insurance",
    title: "First-notice-of-loss triage & severity scoring",
    before: "Avg 6-hour routing · misrouted 18% of claims",
    after:  "< 90-second routing · < 3% misroute rate",
    flow: ["Intake", "NLP extract", "Severity score", "Policy check", "Route"],
  },
  {
    vertical: "Enterprise IT",
    title: "Tier-1 ticket resolution with full audit",
    before: "65% of tickets needed human touch",
    after:  "74% auto-resolved with policy-scoped actions",
    flow: ["Ticket", "Classify", "Tool lookup", "Act", "Notify", "Audit"],
  },
];

export default function UseCases() {
  return (
    <section className="py-24">
      <div className="max-w-7xl mx-auto px-6 lg:px-10">
        <Eyebrow label="In production" />
        <h2 className="mt-3 text-[32px] lg:text-[40px] leading-[1.1] font-semibold tracking-tight text-foreground max-w-[720px]">
          Real business workflows, not demos.
        </h2>
        <p className="mt-4 text-[14px] text-muted-foreground max-w-[600px] leading-relaxed">
          What enterprises actually run on AgentVault — with the before / after numbers their ops teams reported.
        </p>

        <div className="mt-12 grid grid-cols-1 md:grid-cols-2 gap-5">
          {USE_CASES.map(u => <UseCaseCard key={u.title} u={u} />)}
        </div>
      </div>
    </section>
  );
}

function UseCaseCard({ u }) {
  return (
    <article className="bg-panel border border-border rounded-xl p-6 lg:p-7 hover:border-primary/40 transition-colors">
      <div className="text-[10.5px] uppercase tracking-[0.2em] text-muted-foreground font-mono">
        {u.vertical}
      </div>
      <h3 className="mt-2 text-[17px] font-semibold text-foreground tracking-tight leading-snug">
        {u.title}
      </h3>

      {/* Flow chips */}
      <div className="mt-4 flex flex-wrap items-center gap-1.5">
        {u.flow.map((step, i) => (
          <span key={i} className="inline-flex items-center gap-1.5">
            <span className="text-[10.5px] font-mono px-2 py-1 rounded border border-border bg-hero-bg text-foreground">
              {step}
            </span>
            {i < u.flow.length - 1 && <span className="text-muted-foreground/60 text-[10px]">→</span>}
          </span>
        ))}
      </div>

      {/* Before / after */}
      <div className="mt-5 pt-5 border-t border-border grid grid-cols-2 gap-4">
        <div>
          <div className="text-[9.5px] uppercase tracking-[0.2em] text-muted-foreground font-mono">Before</div>
          <div className="mt-1 text-[12.5px] text-muted-foreground leading-snug">{u.before}</div>
        </div>
        <div>
          <div className="text-[9.5px] uppercase tracking-[0.2em] text-accent font-mono">After</div>
          <div className="mt-1 text-[12.5px] text-foreground font-medium leading-snug">{u.after}</div>
        </div>
      </div>
    </article>
  );
}
