import Link from "next/link";
import VaultMark from "../VaultMark";

export default function FooterCTA() {
  return (
    <>
      {/* Big dual-CTA band */}
      <section id="demo" className="py-24 border-t border-border bg-panel/60">
        <div className="max-w-5xl mx-auto px-6 lg:px-10 text-center">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-border bg-hero-bg text-[10.5px] uppercase tracking-[0.2em] font-mono text-muted-foreground">
            <span className="h-1.5 w-1.5 rounded-full bg-accent animate-pulse-dot" />
            Ship AI your risk team signs off on
          </div>
          <h2 className="mt-5 text-[34px] lg:text-[44px] leading-[1.08] font-semibold tracking-tight text-foreground">
            Infrastructure for the AI your business<br />actually depends on.
          </h2>
          <p className="mt-5 text-[15px] text-muted-foreground max-w-[560px] mx-auto leading-relaxed">
            Start building on the Core Platform or talk to our team about a pre-built solution suite.
            Deployable in your VPC, governed end-to-end, audit-ready from day one.
          </p>
          <div className="mt-8 flex flex-wrap justify-center items-center gap-3">
            <Link
              href="/signup"
              className="inline-flex items-center gap-2 px-5 py-3 rounded-md bg-primary text-primary-foreground text-[14px] font-medium hover:brightness-110 active:scale-[0.99] transition-all shadow-sm"
            >
              Start building — free 14 days
              <svg width="14" height="14" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M5 10h10M11 5l5 5-5 5"/></svg>
            </Link>
            <Link
              href="#sales"
              className="inline-flex items-center gap-2 px-5 py-3 rounded-md border border-border bg-panel text-[14px] font-medium text-foreground hover:bg-muted transition-colors"
            >
              Talk to sales
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border bg-hero-bg">
        <div className="max-w-7xl mx-auto px-6 lg:px-10 py-14 grid grid-cols-2 md:grid-cols-6 gap-8">
          <div className="col-span-2">
            <Link href="/" className="flex items-center gap-2.5 text-foreground text-[15px] font-semibold tracking-tight">
              <VaultMark />
              <span>AgentVault</span>
            </Link>
            <p className="mt-3 text-[12.5px] text-muted-foreground leading-relaxed max-w-[280px]">
              The enterprise AI agent platform. Build, deploy, and govern AI workflows at scale.
            </p>
            <div className="mt-5 flex flex-wrap gap-2 text-[10px] font-mono uppercase tracking-[0.15em] text-muted-foreground">
              <span className="px-2 py-0.5 rounded border border-border">SOC 2</span>
              <span className="px-2 py-0.5 rounded border border-border">ISO 27001</span>
              <span className="px-2 py-0.5 rounded border border-border">HIPAA</span>
              <span className="px-2 py-0.5 rounded border border-border">GDPR</span>
            </div>
          </div>

          <FooterCol title="Platform" links={[
            ["Agent Orchestration", "/platform"],
            ["Context Engine", "/platform#context"],
            ["Integrations", "/platform#integrations"],
            ["Observability", "/platform#observability"],
          ]} />

          <FooterCol title="Solutions" links={[
            ["GRC Suite", "/solutions#grc"],
            ["KYC Intelligence", "/solutions#kyc"],
            ["Workforce", "/solutions#workforce"],
            ["Context Engine", "/solutions#context"],
          ]} />

          <FooterCol title="Developers" links={[
            ["Documentation", "/developers"],
            ["SDKs", "/developers#sdk"],
            ["API reference", "/developers#api"],
            ["Changelog", "/developers#changelog"],
          ]} />

          <FooterCol title="Company" links={[
            ["About", "/company"],
            ["Customers", "/company#customers"],
            ["Security", "/company#security"],
            ["Contact", "/company#contact"],
          ]} />
        </div>

        <div className="border-t border-border">
          <div className="max-w-7xl mx-auto px-6 lg:px-10 py-5 flex flex-col md:flex-row md:items-center md:justify-between gap-3 text-[11px] text-muted-foreground">
            <span>© 2026 AgentVault. Enterprise agents, governed.</span>
            <div className="flex items-center gap-5">
              <Link href="#" className="hover:text-foreground transition-colors">Terms</Link>
              <Link href="#" className="hover:text-foreground transition-colors">Privacy</Link>
              <Link href="#" className="hover:text-foreground transition-colors">Security</Link>
              <Link href="#" className="hover:text-foreground transition-colors">Status</Link>
            </div>
          </div>
        </div>
      </footer>
    </>
  );
}

function FooterCol({ title, links }) {
  return (
    <div>
      <div className="text-[11px] uppercase tracking-[0.2em] text-foreground font-medium">{title}</div>
      <ul className="mt-4 space-y-2">
        {links.map(([label, href]) => (
          <li key={label}>
            <Link href={href} className="text-[12.5px] text-muted-foreground hover:text-foreground transition-colors">
              {label}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
