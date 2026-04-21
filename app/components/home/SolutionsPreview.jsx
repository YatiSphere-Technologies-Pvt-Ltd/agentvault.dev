import Link from "next/link";
import { Eyebrow } from "./PlatformPillars";

const SOLUTIONS = [
  {
    slug: "grc",
    name: "AgentVault GRC Suite",
    tagline: "Continuous controls, evidence on demand.",
    summary: "Automate SOC 2 / ISO / HIPAA evidence collection, map findings to controls, and route remediation tasks to owners — all with traceable agent runs.",
    stat: "−70% audit prep time",
    accent: "#3B5CFF",
    tag: "Governance",
  },
  {
    slug: "kyc",
    name: "AgentVault KYC Intelligence",
    tagline: "Identity + risk, scored in seconds.",
    summary: "Multi-source identity verification, sanctions & PEP screening, beneficial-ownership chain resolution, and analyst-in-the-loop review queues.",
    stat: "3.2× faster onboarding",
    accent: "#0891B2",
    tag: "Financial services",
  },
  {
    slug: "workforce",
    name: "AgentVault Workforce",
    tagline: "Always-on agents across your ops.",
    summary: "Pre-built agents for AP, HR intake, ticket triage, and contract review. Plug into your existing tools — no rip-and-replace.",
    stat: "18,000 hours returned / yr",
    accent: "#10B981",
    tag: "Operations",
  },
  {
    slug: "context",
    name: "AgentVault Context Engine",
    tagline: "Your data, agent-ready.",
    summary: "Managed RAG on top of your warehouse, lakehouse, and doc stores — with row-level permissions, freshness SLAs, and a unified context API.",
    stat: "< 120 ms p50 retrieval",
    accent: "#7C3AED",
    tag: "Data platform",
  },
];

export default function SolutionsPreview() {
  return (
    <section className="py-24 bg-panel/60 border-y border-border">
      <div className="max-w-7xl mx-auto px-6 lg:px-10">
        <Eyebrow label="The solutions" />
        <div className="mt-3 flex flex-col md:flex-row md:items-end md:justify-between gap-4">
          <h2 className="text-[32px] lg:text-[40px] leading-[1.1] font-semibold tracking-tight text-foreground max-w-180">
            Four enterprise suites, built on the same vault.
          </h2>
          <Link href="/solutions" className="text-[13px] text-primary hover:brightness-110 font-medium">
            See all solutions →
          </Link>
        </div>

        <div className="mt-12 grid grid-cols-1 md:grid-cols-2 gap-5">
          {SOLUTIONS.map(s => <SolutionCard key={s.slug} s={s} />)}
        </div>
      </div>
    </section>
  );
}

function SolutionCard({ s }) {
  return (
    <Link
      href={`/solutions/${s.slug}`}
      className="group relative block bg-hero-bg border border-border rounded-xl overflow-hidden hover:border-primary/40 hover:shadow-sm transition-all"
    >
      {/* top bar in brand color */}
      <div className="h-1 w-full" style={{ background: s.accent }} />

      <div className="p-6 lg:p-7">
        <div className="flex items-center justify-between">
          <span className="text-[10.5px] font-mono uppercase tracking-[0.18em] text-muted-foreground">
            {s.tag}
          </span>
          <svg width="14" height="14" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.8" className="text-muted-foreground/50 group-hover:text-primary transition-colors"><path d="M5 10h10M11 5l5 5-5 5"/></svg>
        </div>

        <h3 className="mt-3 text-[19px] font-semibold tracking-tight text-foreground">{s.name}</h3>
        <div className="mt-1 text-[12.5px] font-mono" style={{ color: s.accent }}>{s.tagline}</div>
        <p className="mt-3 text-[13.5px] leading-relaxed text-muted-foreground">{s.summary}</p>

        <div className="mt-5 pt-5 border-t border-border/70 flex items-center justify-between">
          <div>
            <div className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground font-mono">Business impact</div>
            <div className="mt-0.5 text-[14.5px] font-semibold tracking-tight text-foreground tabular-nums">
              {s.stat}
            </div>
          </div>
          <span className="text-[12px] text-primary font-medium opacity-0 group-hover:opacity-100 transition-opacity">
            Learn more →
          </span>
        </div>
      </div>
    </Link>
  );
}
