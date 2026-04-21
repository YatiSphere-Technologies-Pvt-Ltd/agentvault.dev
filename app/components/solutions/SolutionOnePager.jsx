import Link from "next/link";
import Navbar from "../Navbar";
import FooterCTA from "../home/FooterCTA";
import { Eyebrow } from "../home/PlatformPillars";

/**
 * Shared template for every /solutions/<slug> page.
 *
 * Expected data shape:
 * {
 *   slug, suite, tagline, problemStatement, accent (hex),
 *   problems:     [{ title, body }, ...]    // 3–4 pain points
 *   capabilities: [{ title, body, specs: [[k,v],...] }, ...] // 4 capabilities
 *   workflow: { name, steps: [{ kind, label, metric, dur }] } // 5 steps
 *   impact: { headline, stats: [[k,v],...], quote, quoteBy, quoteRole }
 *   techSpecs: [[k,v], ...]                  // 6–8 rows
 *   next: [{ slug, suite, tagline }, ...]    // 2–3 related solutions
 * }
 */
export default function SolutionOnePager({ data }) {
  return (
    <div className="bg-hero-bg min-h-screen">
      <Navbar />
      <main>
        <Hero data={data} />
        <Problem data={data} />
        <Capabilities data={data} />
        <WorkflowSection data={data} />
        <Impact data={data} />
        <TechSpecs data={data} />
        <NextSolutions data={data} />
        <FooterCTA />
      </main>
    </div>
  );
}

/* ---------------------------- HERO ---------------------------- */

function Hero({ data }) {
  return (
    <section className="relative pt-32 pb-20 lg:pt-40 lg:pb-24 overflow-hidden">
      <div
        aria-hidden
        className="absolute inset-0 pointer-events-none"
        style={{
          background: `radial-gradient(700px 420px at 15% 30%, ${data.accent}14, transparent 70%), radial-gradient(600px 400px at 85% 70%, color-mix(in oklab, var(--primary) 5%, transparent), transparent 70%)`,
        }}
      />
      <div className="relative max-w-7xl mx-auto px-6 lg:px-10 grid grid-cols-1 lg:grid-cols-[1.1fr_0.9fr] gap-10 items-start">
        <div>
          <Link href="/solutions" className="text-[11.5px] text-muted-foreground hover:text-foreground transition-colors inline-flex items-center gap-1.5">
            <span>←</span><span>All solutions</span>
          </Link>

          <div className="mt-5 inline-flex items-center gap-2 px-3 py-1 rounded-full border border-border bg-panel/70 text-[11px] uppercase tracking-[0.18em] font-mono text-muted-foreground">
            <span className="h-1.5 w-1.5 rounded-full animate-pulse-dot" style={{ background: data.accent }} />
            AgentVault Solutions
          </div>

          <h1 className="mt-5 text-[40px] lg:text-[52px] leading-[1.05] font-semibold tracking-tight text-foreground">
            {data.suite}
          </h1>
          <div className="mt-3 text-[16px] lg:text-[17px] font-mono" style={{ color: data.accent }}>
            {data.tagline}
          </div>
          <p className="mt-5 text-[15px] text-muted-foreground leading-relaxed max-w-150">
            {data.problemStatement}
          </p>

          <div className="mt-8 flex flex-wrap items-center gap-3">
            <Link
              href="#demo"
              className="inline-flex items-center gap-2 px-5 py-3 rounded-md text-[14px] font-medium text-white hover:brightness-110 active:scale-[0.99] transition-all shadow-sm"
              style={{ background: data.accent }}
            >
              Book a demo
              <svg width="14" height="14" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M5 10h10M11 5l5 5-5 5"/></svg>
            </Link>
            <Link
              href="/signup"
              className="inline-flex items-center gap-2 px-5 py-3 rounded-md border border-border bg-panel text-[14px] font-medium text-foreground hover:bg-muted transition-colors"
            >
              Start free trial
            </Link>
          </div>
        </div>

        {/* Right: hero impact stat card */}
        <div className="relative">
          <div
            aria-hidden
            className="absolute -inset-4 rounded-2xl pointer-events-none opacity-50"
            style={{ background: `radial-gradient(360px 240px at 60% 40%, ${data.accent}22, transparent 70%)` }}
          />
          <div className="relative rounded-2xl border border-border bg-panel shadow-sm p-6 lg:p-8">
            <div className="h-1 w-12 rounded-full" style={{ background: data.accent }} />
            <div className="mt-4 text-[10.5px] uppercase tracking-[0.2em] font-mono text-muted-foreground">
              Business impact
            </div>
            <div className="mt-1 text-[32px] lg:text-[36px] font-semibold tracking-tight text-foreground leading-tight">
              {data.impact.headline}
            </div>

            <dl className="mt-6 grid grid-cols-3 gap-x-4 border-t border-border pt-5">
              {data.impact.stats.map(([k, v]) => (
                <div key={k}>
                  <dt className="text-[10px] uppercase tracking-[0.14em] font-mono text-muted-foreground">{k}</dt>
                  <dd className="mt-0.5 text-[14.5px] font-semibold text-foreground tabular-nums">{v}</dd>
                </div>
              ))}
            </dl>
          </div>
        </div>
      </div>
    </section>
  );
}

/* ---------------------------- PROBLEM ---------------------------- */

function Problem({ data }) {
  return (
    <section className="py-20 border-y border-border bg-panel/60">
      <div className="max-w-7xl mx-auto px-6 lg:px-10">
        <Eyebrow label="The problem" />
        <h2 className="mt-4 text-[28px] lg:text-[34px] leading-[1.1] font-semibold tracking-tight text-foreground max-w-170">
          Enterprise teams keep hitting the same wall.
        </h2>

        <div className="mt-10 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
          {data.problems.map((p, i) => (
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

/* ---------------------------- CAPABILITIES ---------------------------- */

function Capabilities({ data }) {
  return (
    <section className="py-24">
      <div className="max-w-7xl mx-auto px-6 lg:px-10">
        <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-5">
          <div className="max-w-170">
            <Eyebrow label="What it does" />
            <h2 className="mt-4 text-[28px] lg:text-[34px] leading-[1.1] font-semibold tracking-tight text-foreground">
              Four capabilities, shipped as one suite.
            </h2>
          </div>
          <p className="max-w-90 text-[13.5px] leading-relaxed text-muted-foreground">
            Each capability composes with the rest of the AgentVault platform —
            so nothing here is a dead end.
          </p>
        </div>

        <div className="mt-10 grid grid-cols-1 md:grid-cols-2 gap-5">
          {data.capabilities.map((c, i) => (
            <article key={c.title} className="bg-panel border border-border rounded-xl p-6 lg:p-7 hover:border-primary/40 transition-colors">
              <div className="flex items-center gap-3">
                <span className="text-[10.5px] font-mono text-muted-foreground tabular-nums">
                  {String(i + 1).padStart(2, "0")}
                </span>
                <span className="h-px w-5 bg-border" />
                <span className="text-[10.5px] uppercase tracking-[0.22em] font-mono" style={{ color: data.accent }}>
                  Capability
                </span>
              </div>
              <h3 className="mt-3 text-[18px] font-semibold tracking-tight text-foreground leading-snug">
                {c.title}
              </h3>
              <p className="mt-2 text-[13.5px] leading-relaxed text-muted-foreground">
                {c.body}
              </p>
              {c.specs?.length > 0 && (
                <dl className="mt-5 grid grid-cols-3 gap-x-4 pt-4 border-t border-border/70">
                  {c.specs.map(([k, v]) => (
                    <div key={k}>
                      <dt className="text-[9.5px] uppercase tracking-[0.14em] font-mono text-muted-foreground">{k}</dt>
                      <dd className="mt-0.5 text-[12.5px] font-semibold text-foreground tabular-nums truncate">{v}</dd>
                    </div>
                  ))}
                </dl>
              )}
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ---------------------------- WORKFLOW ---------------------------- */

function WorkflowSection({ data }) {
  const wf = data.workflow;
  return (
    <section className="py-24 border-t border-border">
      <div className="max-w-7xl mx-auto px-6 lg:px-10">
        <Eyebrow label="How it works" />
        <h2 className="mt-4 text-[28px] lg:text-[34px] leading-[1.1] font-semibold tracking-tight text-foreground max-w-170">
          A real workflow, end to end.
        </h2>
        <p className="mt-4 text-[14px] text-muted-foreground max-w-150 leading-relaxed">
          This is how the suite runs in production — traced, governed, reproducible.
        </p>

        <div className="mt-10 rounded-xl border border-border bg-panel overflow-hidden shadow-sm">
          <div className="flex items-center justify-between px-4 py-2.5 border-b border-border bg-hero-bg">
            <span className="text-[10.5px] uppercase tracking-[0.18em] font-mono text-muted-foreground">
              Run trace · {wf.name}
            </span>
            <span className="inline-flex items-center gap-1.5 text-[10.5px] font-mono text-accent">
              <span className="h-1.5 w-1.5 rounded-full bg-accent animate-pulse-dot" />
              success
            </span>
          </div>
          <ul className="divide-y divide-border/70">
            {wf.steps.map((s, i) => (
              <li key={i} className="grid grid-cols-[40px_140px_1fr_auto] items-center gap-3 px-4 py-3 text-[12.5px] font-mono">
                <span className="text-muted-foreground tabular-nums">
                  {String(i + 1).padStart(2, "0")}
                </span>
                <span className="truncate" style={{ color: data.accent }}>
                  {s.kind}
                </span>
                <span className="text-foreground truncate not-italic" style={{ fontFamily: "var(--font-sora), system-ui, sans-serif" }}>
                  {s.label}
                </span>
                <span className="text-muted-foreground tabular-nums whitespace-nowrap">
                  {s.metric}{s.dur ? ` · ${s.dur}` : ""}
                </span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
}

/* ---------------------------- IMPACT / QUOTE ---------------------------- */

function Impact({ data }) {
  return (
    <section className="py-24 bg-panel/60 border-y border-border">
      <div className="max-w-7xl mx-auto px-6 lg:px-10 grid grid-cols-1 lg:grid-cols-[1fr_1fr] gap-10 items-center">
        <div>
          <Eyebrow label="Business impact" />
          <h2 className="mt-4 text-[30px] lg:text-[38px] leading-[1.08] font-semibold tracking-tight text-foreground">
            {data.impact.headline}
          </h2>

          <dl className="mt-8 grid grid-cols-3 gap-x-6 border-t border-border pt-6">
            {data.impact.stats.map(([k, v]) => (
              <div key={k}>
                <dt className="text-[10px] uppercase tracking-[0.14em] font-mono text-muted-foreground">{k}</dt>
                <dd className="mt-1 text-[18px] font-semibold text-foreground tabular-nums">{v}</dd>
              </div>
            ))}
          </dl>
        </div>

        <figure className="relative rounded-2xl border border-border bg-hero-bg p-7 lg:p-8">
          <svg
            aria-hidden
            className="absolute -top-3 left-7 text-primary/20"
            width="44" height="36" viewBox="0 0 44 36" fill="currentColor"
          >
            <path d="M0 22c0-9 5-16 13-20l3 5c-5 3-8 7-8 11h8v14H0V22zM24 22c0-9 5-16 13-20l3 5c-5 3-8 7-8 11h8v14H24V22z" />
          </svg>
          <blockquote className="text-[16px] leading-[1.55] text-foreground">
            &ldquo;{data.impact.quote}&rdquo;
          </blockquote>
          <figcaption className="mt-6 pt-5 border-t border-border flex items-center gap-3">
            <div className="h-10 w-10 rounded-full bg-primary/15 border border-primary/30 flex items-center justify-center text-[12px] font-semibold text-primary">
              {data.impact.quoteBy.split(" ").map(s => s[0]).slice(0, 2).join("")}
            </div>
            <div>
              <div className="text-[13px] font-semibold text-foreground">{data.impact.quoteBy}</div>
              <div className="text-[11.5px] text-muted-foreground font-mono">{data.impact.quoteRole}</div>
            </div>
          </figcaption>
        </figure>
      </div>
    </section>
  );
}

/* ---------------------------- TECH SPECS ---------------------------- */

function TechSpecs({ data }) {
  return (
    <section className="py-24">
      <div className="max-w-7xl mx-auto px-6 lg:px-10">
        <Eyebrow label="Under the hood" />
        <h2 className="mt-4 text-[28px] lg:text-[34px] leading-[1.1] font-semibold tracking-tight text-foreground max-w-170">
          Specs your security team can read.
        </h2>

        <div className="mt-10 rounded-xl border border-border bg-panel overflow-hidden">
          <dl className="divide-y divide-border/70">
            {data.techSpecs.map(([k, v]) => (
              <div key={k} className="grid grid-cols-1 md:grid-cols-[280px_1fr] gap-2 md:gap-6 px-6 py-4">
                <dt className="text-[11.5px] uppercase tracking-[0.15em] font-mono text-muted-foreground">{k}</dt>
                <dd className="text-[13px] text-foreground font-mono">{v}</dd>
              </div>
            ))}
          </dl>
        </div>
      </div>
    </section>
  );
}

/* ---------------------------- NEXT / RELATED ---------------------------- */

function NextSolutions({ data }) {
  if (!data.next?.length) return null;
  return (
    <section className="py-20 border-t border-border">
      <div className="max-w-7xl mx-auto px-6 lg:px-10">
        <Eyebrow label="More solutions" />
        <h2 className="mt-4 text-[22px] lg:text-[26px] font-semibold tracking-tight text-foreground">
          Explore the rest of the suite.
        </h2>
        <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-5">
          {data.next.map(n => (
            <Link
              key={n.slug}
              href={`/solutions/${n.slug}`}
              className="group block bg-panel border border-border rounded-xl p-5 hover:border-primary/40 transition-colors"
            >
              <div className="text-[10.5px] uppercase tracking-[0.18em] font-mono text-muted-foreground">
                AgentVault
              </div>
              <div className="mt-1 text-[15.5px] font-semibold text-foreground">{n.suite}</div>
              <div className="mt-1 text-[12px] text-muted-foreground leading-relaxed">{n.tagline}</div>
              <span className="mt-4 inline-flex items-center gap-1.5 text-[12px] text-primary font-medium">
                Learn more
                <svg width="12" height="12" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" className="group-hover:translate-x-0.5 transition-transform"><path d="M5 10h10M11 5l5 5-5 5"/></svg>
              </span>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}
