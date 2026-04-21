import Link from "next/link";
import SceneCanvas from "../SceneCanvas";

export default function Hero() {
  return (
    <section className="relative pt-32 pb-24 lg:pt-40 lg:pb-32 overflow-hidden">
      {/* Animated canvas background — kept subtle so the copy reads cleanly. */}
      <div aria-hidden className="absolute inset-0 pointer-events-none">
        <SceneCanvas mode="vault" theme="light-calm" overlay={0.06} />
      </div>

      {/* Soft radial mask behind the headline — pulls focus to the text without a hard gradient band. */}
      <div
        aria-hidden
        className="absolute inset-0 pointer-events-none"
        style={{
          background:
            "radial-gradient(700px 400px at 50% 45%, color-mix(in oklab, var(--background) 85%, transparent), transparent 75%)",
        }}
      />

      <div className="relative max-w-4xl mx-auto px-6 lg:px-10 text-center">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-border bg-panel/70 backdrop-blur-sm text-[11px] uppercase tracking-[0.18em] font-mono text-muted-foreground">
          <span className="h-1.5 w-1.5 rounded-full bg-accent animate-pulse-dot" />
          The enterprise AI agent platform
        </div>

        <h1 className="mt-6 text-[44px] sm:text-[54px] lg:text-[64px] leading-[1.04] font-semibold tracking-tight text-foreground">
          Build, deploy, and govern<br />
          <span className="text-primary">AI agents at scale.</span>
        </h1>

        <p className="mt-6 text-[16px] lg:text-[17.5px] leading-relaxed text-muted-foreground max-w-155 mx-auto">
          AgentVault is the control plane for enterprise AI — one platform to orchestrate agents,
          connect tools, enforce policy, and ship production workflows your risk team will sign off on.
        </p>

        <div className="mt-9 flex flex-wrap justify-center items-center gap-3">
          <Link
            href="#demo"
            className="inline-flex items-center gap-2 px-5 py-3 rounded-md bg-primary text-primary-foreground text-[14px] font-medium hover:brightness-110 active:scale-[0.99] transition-all shadow-sm"
          >
            Book demo
            <svg width="14" height="14" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M5 10h10M11 5l5 5-5 5"/></svg>
          </Link>
          <Link
            href="/platform"
            className="inline-flex items-center gap-2 px-5 py-3 rounded-md border border-border bg-panel text-[14px] font-medium text-foreground hover:bg-muted transition-colors"
          >
            Explore platform
          </Link>
        </div>

        <div className="mt-12 flex flex-wrap justify-center items-center gap-x-8 gap-y-3 text-[11.5px] text-muted-foreground">
          <div className="flex items-center gap-2">
            <CheckShield />
            <span>SOC 2 Type II</span>
          </div>
          <div className="flex items-center gap-2">
            <CheckShield />
            <span>ISO 27001</span>
          </div>
          <div className="flex items-center gap-2">
            <CheckShield />
            <span>HIPAA · GDPR</span>
          </div>
          <div className="flex items-center gap-2">
            <CheckShield />
            <span>VPC deployable</span>
          </div>
        </div>
      </div>
    </section>
  );
}

function CheckShield() {
  return (
    <svg width="14" height="14" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.7" className="text-accent" aria-hidden>
      <path d="M10 2l7 3v5c0 4-3 7-7 8-4-1-7-4-7-8V5l7-3z"/>
      <path d="M7 10l2 2 4-4"/>
    </svg>
  );
}
