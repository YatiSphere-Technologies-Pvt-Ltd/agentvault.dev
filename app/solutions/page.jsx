import Link from "next/link";
import Navbar from "../components/Navbar";
import FooterCTA from "../components/home/FooterCTA";
import { Eyebrow } from "../components/home/PlatformPillars";
import { SOLUTIONS } from "../components/solutions/data";

export const metadata = {
  title: "Solutions — AgentVault",
  description: "Prebuilt enterprise suites: GRC, KYC Intelligence, Workforce, Context Engine.",
};

export default function SolutionsPage() {
  const all = Object.values(SOLUTIONS);

  return (
    <div className="bg-hero-bg min-h-screen">
      <Navbar />
      <main>
        <section className="relative pt-32 pb-16 lg:pt-40 lg:pb-20 overflow-hidden">
          <div
            aria-hidden
            className="absolute inset-0 pointer-events-none"
            style={{
              background:
                "radial-gradient(700px 420px at 70% 25%, hsl(232 45% 55% / 0.08), transparent 70%), radial-gradient(600px 380px at 15% 70%, hsl(195 55% 55% / 0.06), transparent 70%)",
            }}
          />
          <div className="relative max-w-7xl mx-auto px-6 lg:px-10">
            <Eyebrow label="Solutions" />
            <h1 className="mt-5 text-[40px] lg:text-[52px] leading-[1.05] font-semibold tracking-tight text-foreground max-w-200">
              Four enterprise suites.<br />
              <span className="text-primary">Built on the same vault.</span>
            </h1>
            <p className="mt-5 text-[15px] lg:text-[16px] leading-relaxed text-muted-foreground max-w-150">
              Each suite ships with the workflows, agents, policies, and connectors that map to a
              specific business outcome. Deploy the full suite, or drop individual capabilities into
              your existing stack.
            </p>
          </div>
        </section>

        <section className="pb-20">
          <div className="max-w-7xl mx-auto px-6 lg:px-10 grid grid-cols-1 md:grid-cols-2 gap-5">
            {all.map(s => <SolutionIndexCard key={s.slug} s={s} />)}
          </div>
        </section>

        {/* Trust / footprint band */}
        <section className="py-14 border-y border-border bg-panel/60">
          <div className="max-w-7xl mx-auto px-6 lg:px-10 flex flex-wrap items-center gap-x-10 gap-y-4 text-[12px] text-muted-foreground">
            <span className="font-semibold text-foreground">One platform, four suites.</span>
            <Pill>SOC 2 Type II</Pill>
            <Pill>ISO 27001</Pill>
            <Pill>HIPAA · GDPR</Pill>
            <Pill>VPC deployable</Pill>
            <Pill>99.95% SLA</Pill>
            <Pill>4,200+ connectors</Pill>
          </div>
        </section>

        <FooterCTA />
      </main>
    </div>
  );
}

function SolutionIndexCard({ s }) {
  return (
    <Link
      href={`/solutions/${s.slug}`}
      className="group relative block bg-panel border border-border rounded-xl overflow-hidden hover:border-primary/40 hover:shadow-sm transition-all"
    >
      <div className="h-1 w-full" style={{ background: s.accent }} />
      <div className="p-7 lg:p-8">
        <div className="flex items-center justify-between">
          <span className="text-[10.5px] font-mono uppercase tracking-[0.18em] text-muted-foreground">
            {s.shortTag}
          </span>
          <svg width="14" height="14" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.8" className="text-muted-foreground/50 group-hover:text-primary transition-colors">
            <path d="M5 10h10M11 5l5 5-5 5"/>
          </svg>
        </div>

        <h2 className="mt-3 text-[22px] font-semibold tracking-tight text-foreground leading-snug">
          {s.suite}
        </h2>
        <div className="mt-1.5 text-[13px] font-mono" style={{ color: s.accent }}>
          {s.tagline}
        </div>

        <p className="mt-4 text-[13.5px] text-muted-foreground leading-relaxed line-clamp-3">
          {s.problemStatement}
        </p>

        <dl className="mt-6 pt-5 border-t border-border grid grid-cols-3 gap-x-4">
          {s.impact.stats.map(([k, v]) => (
            <div key={k}>
              <dt className="text-[9.5px] uppercase tracking-[0.14em] font-mono text-muted-foreground">{k}</dt>
              <dd className="mt-0.5 text-[13.5px] font-semibold text-foreground tabular-nums truncate">{v}</dd>
            </div>
          ))}
        </dl>

        <div className="mt-6 inline-flex items-center gap-1.5 text-[12.5px] font-medium text-primary">
          Learn more
          <svg width="12" height="12" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" className="group-hover:translate-x-0.5 transition-transform"><path d="M5 10h10M11 5l5 5-5 5"/></svg>
        </div>
      </div>
    </Link>
  );
}

function Pill({ children }) {
  return (
    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded border border-border bg-hero-bg text-[11px] font-mono text-foreground">
      <span className="h-1.5 w-1.5 rounded-full bg-accent" />
      {children}
    </span>
  );
}
