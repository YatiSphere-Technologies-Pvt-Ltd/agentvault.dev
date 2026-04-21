import { Eyebrow } from "./PlatformPillars";

// Three-layer stack:
//   Top    — Industry Solutions   (4 tiles)
//   Middle — Modules              (6 tiles)
//   Bottom — Core Platform        (3 zones: compute / runtime · context · governance)
// Rendered as cleanly-labeled cards with connector rails between layers.

export default function ArchitectureDiagram() {
  return (
    <section className="py-24">
      <div className="max-w-7xl mx-auto px-6 lg:px-10">
        <Eyebrow label="The architecture" />
        <div className="mt-3 grid grid-cols-1 md:grid-cols-[1.2fr_0.8fr] gap-8 items-end">
          <h2 className="text-[32px] lg:text-[40px] leading-[1.1] font-semibold tracking-tight text-foreground max-w-[760px]">
            One platform, three layers. Build on every one.
          </h2>
          <p className="text-[14px] text-muted-foreground leading-relaxed">
            Use the Core Platform to build your own agents. Compose Modules into bespoke workflows.
            Or drop in a full Industry Solution on day one.
          </p>
        </div>

        <div className="mt-12 bg-panel border border-border rounded-2xl p-6 lg:p-10 shadow-sm">
          {/* Layer 1 — Industry Solutions */}
          <LayerLabel num="03" name="Industry Solutions" kicker="Productized outcomes · deploy in days" />
          <div className="mt-4 grid grid-cols-2 lg:grid-cols-4 gap-3">
            <SolutionTile color="#3B5CFF" label="GRC Suite"            sub="Continuous controls" />
            <SolutionTile color="#0891B2" label="KYC Intelligence"     sub="Identity + risk scoring" />
            <SolutionTile color="#10B981" label="Workforce"            sub="AP · HR · Support" />
            <SolutionTile color="#7C3AED" label="Context Engine"       sub="Managed enterprise RAG" />
          </div>

          <Connector />

          {/* Layer 2 — Modules */}
          <LayerLabel num="02" name="Modules" kicker="Composable capabilities · mix into your stack" />
          <div className="mt-4 grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
            <ModuleTile icon="canvas"   label="Agent Studio" />
            <ModuleTile icon="registry" label="Agent Registry" />
            <ModuleTile icon="policy"   label="Policy Engine" />
            <ModuleTile icon="eval"     label="Evaluations" />
            <ModuleTile icon="trace"    label="Observability" />
            <ModuleTile icon="human"    label="Human-in-loop" />
          </div>

          <Connector />

          {/* Layer 3 — Core Platform */}
          <LayerLabel num="01" name="Core Platform" kicker="The control plane · runs in your VPC or ours" />
          <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-3">
            <CoreZone
              title="Orchestration Runtime"
              subtitle="Deterministic, retryable, parallel"
              chips={["DAG scheduler", "State machine", "Retry policies", "Parallel branches"]}
            />
            <CoreZone
              title="Context & Memory"
              subtitle="RAG + permissions, built-in"
              chips={["Vector + keyword", "Row-level ACL", "Freshness SLAs", "Multi-tenant isolation"]}
            />
            <CoreZone
              title="Security & Governance"
              subtitle="Policy-as-code. Evidence-ready."
              chips={["Cedar policies", "Full audit log", "SOC 2 evidence", "Scoped secrets"]}
            />
          </div>

          {/* Footprint row */}
          <div className="mt-8 pt-6 border-t border-border flex flex-wrap items-center gap-x-8 gap-y-3 text-[11.5px] text-muted-foreground font-mono">
            <span className="text-foreground font-medium not-italic font-sans">Deploy anywhere:</span>
            <span>Your VPC (BYOC)</span>
            <span>·</span>
            <span>AgentVault Cloud</span>
            <span>·</span>
            <span>On-prem (Kubernetes)</span>
            <span>·</span>
            <span>AWS · Azure · GCP</span>
          </div>
        </div>
      </div>
    </section>
  );
}

function LayerLabel({ num, name, kicker }) {
  return (
    <div className="flex items-baseline gap-4">
      <span className="text-[10.5px] font-mono text-muted-foreground tabular-nums">{num}</span>
      <span className="h-px flex-1 max-w-[64px] bg-border" />
      <div className="flex items-baseline gap-3">
        <span className="text-[11px] uppercase tracking-[0.22em] font-mono text-foreground">{name}</span>
        <span className="text-[11px] text-muted-foreground hidden md:inline">{kicker}</span>
      </div>
    </div>
  );
}

function Connector() {
  // Visual hint of "stack" between layers
  return (
    <div className="my-6 flex flex-col items-center gap-1">
      <div className="h-5 w-px bg-border" />
      <svg width="12" height="12" viewBox="0 0 12 12" className="text-muted-foreground/60" fill="currentColor"><path d="M6 9L1 4h10z"/></svg>
      <div className="h-2 w-px bg-border" />
    </div>
  );
}

function SolutionTile({ color, label, sub }) {
  return (
    <div className="relative rounded-lg border border-border bg-hero-bg overflow-hidden p-4">
      <div className="absolute top-0 left-0 right-0 h-[3px]" style={{ background: color }} />
      <div className="flex items-center gap-2">
        <div className="h-6 w-6 rounded-md" style={{ background: color }} />
        <div className="text-[13px] font-semibold text-foreground">{label}</div>
      </div>
      <div className="mt-1 text-[11px] text-muted-foreground font-mono">{sub}</div>
    </div>
  );
}

function ModuleTile({ icon, label }) {
  return (
    <div className="rounded-lg border border-border bg-hero-bg p-3 flex items-center gap-2.5 hover:border-primary/40 transition-colors">
      <div className="h-8 w-8 rounded-md bg-primary/10 text-primary flex items-center justify-center shrink-0">
        <ModuleIcon name={icon} />
      </div>
      <div className="text-[12.5px] text-foreground font-medium truncate">{label}</div>
    </div>
  );
}

function ModuleIcon({ name }) {
  const p = { width: 14, height: 14, viewBox: "0 0 20 20", fill: "none", stroke: "currentColor", strokeWidth: 1.7, strokeLinecap: "round", strokeLinejoin: "round" };
  switch (name) {
    case "canvas":   return <svg {...p}><circle cx="5" cy="5" r="2"/><circle cx="15" cy="5" r="2"/><circle cx="5" cy="15" r="2"/><circle cx="15" cy="15" r="2"/><path d="M7 5h6M5 7v6M15 7v6M7 15h6"/></svg>;
    case "registry": return <svg {...p}><path d="M3 5h14v10H3z"/><path d="M3 9h14M8 5v10"/></svg>;
    case "policy":   return <svg {...p}><path d="M10 3l6 2v5c0 4-3 6-6 7-3-1-6-3-6-7V5l6-2z"/><path d="M7.5 10l2 2 3-3.5"/></svg>;
    case "eval":     return <svg {...p}><path d="M4 16V8M10 16V4M16 16v-5"/></svg>;
    case "trace":    return <svg {...p}><circle cx="10" cy="10" r="7"/><path d="M10 6v4l3 2"/></svg>;
    case "human":    return <svg {...p}><circle cx="10" cy="7" r="3"/><path d="M4 17c0-3 3-5 6-5s6 2 6 5"/></svg>;
    default:         return null;
  }
}

function CoreZone({ title, subtitle, chips }) {
  return (
    <div className="rounded-xl border border-border bg-hero-bg p-5">
      <div className="flex items-baseline justify-between gap-3">
        <div className="text-[14px] font-semibold text-foreground tracking-tight">{title}</div>
      </div>
      <div className="mt-0.5 text-[11.5px] font-mono text-primary">{subtitle}</div>
      <ul className="mt-4 flex flex-wrap gap-1.5">
        {chips.map(c => (
          <li key={c} className="text-[10.5px] font-mono px-2 py-0.5 rounded border border-border text-muted-foreground bg-panel">
            {c}
          </li>
        ))}
      </ul>
    </div>
  );
}
