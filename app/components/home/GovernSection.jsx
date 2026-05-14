import Link from "next/link";
import { Eyebrow } from "./PlatformPillars";

/* Landing-page section that surfaces the Govern stack — Shadow AI
   Discovery, Runtime Control, Red Team, Compliance Evidence — in one
   CISO-shaped narrative. Lives between SolutionsPreview and Use Cases. */

const ACCENT = "#0891B2"; // matches the /govern marketing page accent

const STEPS = [
  {
    n: "01",
    label: "Discover",
    body: "Every AI tool your org uses — sanctioned or shadow.",
    link: "/govern#discovery",
  },
  {
    n: "02",
    label: "Inventory",
    body: "One ledger. Owner, risk class, approval state, destination.",
    link: "/govern#inventory",
  },
  {
    n: "03",
    label: "Enforce",
    body: "AI gateway with DLP + prompt-injection screens.",
    link: "/govern#runtime",
  },
  {
    n: "04",
    label: "Red team",
    body: "2,000+ attacks · MITRE ATLAS · OWASP · NIST mappings.",
    link: "/govern#redteam",
  },
  {
    n: "05",
    label: "Prove",
    body: "Signed audit bundle — 12+ frameworks pre-mapped.",
    link: "/govern#compliance",
  },
];

export default function GovernSection() {
  return (
    <section className="py-24 border-t border-border">
      <div className="max-w-7xl mx-auto px-6 lg:px-10">
        <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-5">
          <div className="max-w-200">
            <Eyebrow label="For the CISO" />
            <h2 className="mt-4 text-[32px] lg:text-[42px] leading-[1.08] font-semibold tracking-tight text-foreground">
              Empirical safety, audit-ready.
            </h2>
            <p className="mt-4 text-[15px] text-muted-foreground leading-relaxed max-w-[68ch]">
              Most AI tooling assumes you trust the model. AgentVault assumes you have to prove it
              — Shadow AI discovered, runtime enforced, agents red-teamed, evidence signed.
            </p>
          </div>
          <Link
            href="/govern"
            className="text-[13px] font-medium inline-flex items-center gap-1.5 hover:brightness-110"
            style={{ color: ACCENT }}
          >
            See the full Govern stack →
          </Link>
        </div>

        {/* Five-step loop */}
        <div className="mt-12 grid grid-cols-1 md:grid-cols-5 gap-3">
          {STEPS.map(s => (
            <Link
              key={s.n}
              href={s.link}
              className="group relative bg-panel border border-border rounded-xl p-5 hover:border-primary/40 transition-colors flex flex-col"
            >
              <div className="flex items-center gap-2">
                <span className="text-[10.5px] font-mono text-muted-foreground tabular-nums">{s.n}</span>
                <span className="h-px w-5 bg-border" />
                <span className="text-[10.5px] uppercase tracking-[0.22em] font-mono" style={{ color: ACCENT }}>{s.label}</span>
              </div>
              <p className="mt-3 text-[13px] text-foreground leading-relaxed flex-1">{s.body}</p>
              <span className="mt-3 text-[11.5px] text-muted-foreground inline-flex items-center gap-1 group-hover:text-primary transition-colors">
                Learn more
                <svg width="11" height="11" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" className="group-hover:translate-x-0.5 transition-transform"><path d="M5 10h10M11 5l5 5-5 5"/></svg>
              </span>
            </Link>
          ))}
        </div>

        {/* Trust signals */}
        <div className="mt-10 rounded-xl border border-border bg-panel/60 px-6 py-4 flex flex-wrap items-center gap-x-10 gap-y-3 text-[11.5px] text-muted-foreground">
          <Fact label="Attacks shipped"   value="2,000+" />
          <Divider />
          <Fact label="Frameworks mapped" value="12+" />
          <Divider />
          <Fact label="Discovery sources" value="14" />
          <Divider />
          <Fact label="Asset types"       value="8" />
          <Divider />
          <Fact label="DLP detectors"     value="Regex · Luhn · Classifier · Injection" />
        </div>
      </div>
    </section>
  );
}

function Fact({ label, value }) {
  return (
    <div className="flex items-baseline gap-2">
      <span className="font-mono uppercase tracking-[0.15em] text-[10px] text-muted-foreground">{label}</span>
      <span className="text-[12.5px] font-semibold tabular-nums text-foreground">{value}</span>
    </div>
  );
}

function Divider() {
  return <span aria-hidden className="hidden md:inline h-3 w-px bg-border" />;
}
