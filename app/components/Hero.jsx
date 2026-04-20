import SceneCanvas from "./SceneCanvas";

export default function Hero() {
  return (
    <section className="relative min-h-screen flex items-center bg-hero-bg overflow-hidden">
      <SceneCanvas mode="vault" theme="light-calm" overlay={0.15} />

      <div className="absolute top-24 right-6 md:right-10 lg:right-16 z-10 hidden md:flex items-center gap-2 px-3 py-1.5 rounded-full border border-border bg-panel/60 backdrop-blur-sm text-[11px] text-muted-foreground opacity-0 animate-[fade-in_0.5s_ease-out_forwards]" style={{ animationDelay: "1.1s" }}>
        <span className="h-1.5 w-1.5 rounded-full bg-primary animate-[pulse-dot_2.2s_ease-in-out_infinite]" />
        <span>All systems nominal · 47 agents live</span>
      </div>

      <div className="relative z-10 w-full max-w-7xl mx-auto px-6 md:px-10 lg:px-16 pt-24 pb-16 md:py-32">
        <div className="max-w-3xl">
          <div className="opacity-0 animate-[fade-up_0.7s_cubic-bezier(0.16,1,0.3,1)_forwards] inline-flex items-center gap-3 px-3 py-1.5 rounded-full border border-border bg-panel/70 text-[11.5px] text-muted-foreground mb-8" style={{ animationDelay: "0.1s" }}>
            <span className="h-1.5 w-1.5 rounded-full bg-primary" />
            <span>Enterprise AI agent platform</span>
            <span className="h-3 w-px bg-border" />
            <span className="text-foreground/70">v3.2</span>
          </div>

          <h1 className="opacity-0 animate-[fade-up_0.7s_cubic-bezier(0.16,1,0.3,1)_forwards] text-[clamp(2.75rem,7vw,5.75rem)] font-semibold leading-[1] tracking-[-0.035em] text-foreground" style={{ animationDelay: "0.2s" }}>
            Agents,<br />
            <span className="text-primary">governed.</span>
          </h1>

          <p className="opacity-0 animate-[fade-up_0.7s_cubic-bezier(0.16,1,0.3,1)_forwards] text-foreground/80 text-[clamp(1.1rem,1.8vw,1.4rem)] font-light mt-6 leading-relaxed max-w-2xl" style={{ animationDelay: "0.4s" }}>
            Build, deploy, and govern AI agents your risk team will sign off on. Policy-as-code, full observability, and eight production accelerators — all in a vault you control.
          </p>

          <div className="opacity-0 animate-[fade-up_0.7s_cubic-bezier(0.16,1,0.3,1)_forwards] flex flex-wrap gap-3 mt-10" style={{ animationDelay: "0.6s" }}>
            <button className="bg-primary text-primary-foreground px-7 py-3.5 text-[13.5px] rounded-md cursor-pointer hover:brightness-110 transition-all active:scale-[0.97] font-medium flex items-center gap-2.5">
              Start building
              <span>→</span>
            </button>
            <button className="bg-panel border border-border text-foreground hover:bg-muted hover:border-foreground/25 px-7 py-3.5 text-[13.5px] rounded-md cursor-pointer transition-all active:scale-[0.97] font-medium">
              Our accelerators
            </button>
          </div>

          <div className="opacity-0 animate-[fade-up_0.7s_cubic-bezier(0.16,1,0.3,1)_forwards] mt-12 flex flex-wrap items-center gap-x-6 gap-y-2 text-[12px] text-muted-foreground" style={{ animationDelay: "0.8s" }}>
            <span>Trusted by 47 enterprises</span>
            <span className="text-border">·</span>
            <span>SOC 2 Type II · HIPAA · GDPR</span>
            <span className="text-border">·</span>
            <span className="text-foreground">2.1B agent actions / month</span>
          </div>
        </div>
      </div>

      <div className="absolute bottom-8 right-6 md:right-10 lg:right-16 z-10 hidden md:block opacity-0 animate-[fade-in_0.5s_ease-out_forwards]" style={{ animationDelay: "1.3s" }}>
        <div className="text-right space-y-0.5 font-mono text-[10.5px] text-muted-foreground">
          <div>vault://prod-us-east-01</div>
          <div>policy.check() → <span className="text-primary">ok</span></div>
        </div>
      </div>
    </section>
  );
}
