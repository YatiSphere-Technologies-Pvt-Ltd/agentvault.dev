// Logo row — mock, monochrome, deliberately understated.
// The message is "enterprises trust this," not a marketing showcase.

const LOGOS = [
  "Acme Bank", "Meridian", "Vertex Health", "Polaris", "Northgate", "Helios", "Summit", "Aegis",
];

export default function TrustStrip() {
  return (
    <section className="border-y border-border bg-panel/60">
      <div className="max-w-7xl mx-auto px-6 lg:px-10 py-10">
        <div className="flex flex-col lg:flex-row lg:items-center gap-8">
          <div className="shrink-0 max-w-[280px]">
            <div className="text-[10.5px] uppercase tracking-[0.2em] text-muted-foreground font-mono">Trusted by</div>
            <div className="mt-1 text-[13.5px] text-foreground leading-snug">
              Regulated enterprises shipping AI into production.
            </div>
          </div>

          <div className="flex-1 grid grid-cols-4 md:grid-cols-8 gap-4 items-center">
            {LOGOS.map(name => (
              <div
                key={name}
                className="text-center text-[13px] font-semibold tracking-tight text-muted-foreground/70 hover:text-foreground transition-colors select-none"
                style={{ fontFamily: 'var(--font-sora), system-ui, sans-serif' }}
              >
                {name}
              </div>
            ))}
          </div>
        </div>

        <div className="mt-6 pt-6 border-t border-border/60 flex flex-wrap items-center gap-x-8 gap-y-3 text-[11.5px] text-muted-foreground">
          <span className="font-medium text-foreground">Enterprise-ready.</span>
          <span className="flex items-center gap-2"><Check /> Secure</span>
          <span className="flex items-center gap-2"><Check /> Scalable</span>
          <span className="flex items-center gap-2"><Check /> Compliant</span>
          <span className="flex items-center gap-2"><Check /> Audit-ready from day one</span>
          <span className="flex items-center gap-2"><Check /> Deployable in your VPC</span>
        </div>
      </div>
    </section>
  );
}

function Check() {
  return (
    <svg width="12" height="12" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="2" className="text-accent"><path d="M4 10l4 4 8-8"/></svg>
  );
}
