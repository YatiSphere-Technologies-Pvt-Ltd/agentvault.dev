"use client";

import { useEffect, useState } from "react";

export function VaultMark() {
  return (
    <svg width="22" height="22" viewBox="0 0 22 22" fill="none">
      <rect x="1" y="1" width="20" height="20" stroke="hsl(var(--primary))" strokeWidth="1.5" />
      <rect x="5" y="5" width="12" height="12" stroke="hsl(var(--primary))" strokeWidth="1" />
      <circle cx="11" cy="11" r="2.5" fill="hsl(var(--primary))" />
    </svg>
  );
}

function Eyebrow({ children, num }) {
  return (
    <div className="flex items-center gap-3 text-muted-foreground text-[11px] font-medium tracking-[0.25em] uppercase">
      {num && <span className="text-primary font-mono">{num}</span>}
      <span className="h-px w-8 bg-border" />
      <span>{children}</span>
    </div>
  );
}

function SectionHeader({ num, eyebrow, title, kicker }) {
  return (
    <div className="max-w-3xl">
      <Eyebrow num={num}>{eyebrow}</Eyebrow>
      <h2 className="mt-5 text-[clamp(2.25rem,5vw,4rem)] font-semibold leading-[1.02] tracking-[-0.03em] text-foreground">
        {title}
      </h2>
      {kicker && (
        <p className="mt-5 text-muted-foreground text-base md:text-lg font-light max-w-2xl">{kicker}</p>
      )}
    </div>
  );
}

export function TrustTicker() {
  const items = [
    "SOC 2 TYPE II", "HIPAA", "GDPR", "ISO 27001", "FedRAMP ready",
    "Zero-trust architecture", "BYO cloud", "On-prem supported",
    "Air-gap deployment", "99.99% uptime", "Model-agnostic",
  ];
  const doubled = [...items, ...items];
  return (
    <div className="border-y border-border bg-hero-bg py-6 overflow-hidden">
      <div className="marquee animate-[ticker_60s_linear_infinite] gap-12 px-6">
        {doubled.map((t, i) => (
          <div key={i} className="flex items-center gap-12 text-muted-foreground text-xs tracking-[0.3em] uppercase font-light whitespace-nowrap">
            <span>{t}</span>
            <span className="text-primary">◆</span>
          </div>
        ))}
      </div>
    </div>
  );
}

export function Pillars() {
  const items = [
    {
      n: "01",
      title: "Build",
      body: "Compose agents visually or in code. Bring any model — OpenAI, Anthropic, Gemini, open-source, or your own fine-tune. Version every prompt, tool, and policy.",
      stat: "400+",
      statLabel: "prebuilt tools & connectors",
    },
    {
      n: "02",
      title: "Govern",
      body: "Policy-as-code gates every action. PII redaction, prompt-injection defense, role-based access, and full audit trail — from first token to final tool call.",
      stat: "100%",
      statLabel: "actions logged & replayable",
    },
    {
      n: "03",
      title: "Deploy",
      body: "Ship to your VPC, on-prem, or our cloud. Autoscale, cost-cap, and route between models by task. Roll back in one click.",
      stat: "< 8 min",
      statLabel: "median time to production",
    },
  ];
  return (
    <section id="platform" className="relative bg-hero-bg border-t border-border">
      <div className="max-w-7xl mx-auto px-6 md:px-10 lg:px-16 py-24 md:py-32">
        <SectionHeader
          num="/01"
          eyebrow="The platform"
          title={<>Three layers. <span className="text-muted-foreground">One contract with your business.</span></>}
          kicker="Most agent projects stall between prototype and production. AgentVault is the substrate that spans both — with governance baked in, not bolted on."
        />

        <div className="mt-16 grid grid-cols-1 md:grid-cols-3 gap-px bg-border border border-border">
          {items.map((p) => (
            <div key={p.n} className="bg-hero-bg p-8 md:p-10 group hover:bg-muted transition-colors">
              <div className="flex items-start justify-between">
                <span className="text-primary font-mono text-xs tracking-widest">{p.n}</span>
                <div className="h-1.5 w-1.5 rounded-full bg-primary animate-[pulse-dot_2.2s_ease-in-out_infinite]" />
              </div>
              <h3 className="mt-8 text-3xl md:text-4xl font-semibold tracking-tight">{p.title}</h3>
              <p className="mt-4 text-muted-foreground text-[15px] leading-relaxed font-light">{p.body}</p>
              <div className="mt-10 pt-6 border-t border-border">
                <div className="text-3xl font-semibold text-foreground tracking-tight">{p.stat}</div>
                <div className="mt-1 text-muted-foreground text-[11px] uppercase tracking-widest">{p.statLabel}</div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function MockFrame({ title, right, children }) {
  return (
    <div className="border border-border rounded-md bg-panel overflow-hidden shadow-[0_20px_60px_-30px_rgba(0,0,0,0.15)]">
      <div className="flex items-center justify-between px-4 py-2.5 border-b border-border bg-secondary">
        <div className="flex items-center gap-2">
          <span className="h-2.5 w-2.5 rounded-full bg-muted-foreground/40" />
          <span className="h-2.5 w-2.5 rounded-full bg-muted-foreground/40" />
          <span className="h-2.5 w-2.5 rounded-full bg-muted-foreground/40" />
          <span className="ml-3 text-[11px] text-muted-foreground font-mono">{title}</span>
        </div>
        <div className="text-[11px] text-muted-foreground font-mono">{right}</div>
      </div>
      <div>{children}</div>
    </div>
  );
}

function RuntimeMock() {
  const [step, setStep] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setStep(s => (s + 1) % 5), 1400);
    return () => clearInterval(id);
  }, []);
  const steps = [
    { t: "plan", label: "plan()", out: "Derived 4-step plan from user goal." },
    { t: "retrieve", label: "retrieve(contracts, q=…)", out: "12 chunks · cached · 84ms" },
    { t: "tool", label: "salesforce.update_opp(#214)", out: "200 OK · stage = Negotiation" },
    { t: "eval", label: "policy.check(pii, tool_scope)", out: "pass · 0 violations" },
    { t: "respond", label: "compose(answer)", out: "streaming → 314 tokens" },
  ];
  return (
    <MockFrame title="vault run · agent:revenue-ops · trace 4f3a" right="● live">
      <div className="p-5 codeblock">
        {steps.map((s, i) => {
          const active = i === step;
          const done = i < step;
          return (
            <div key={i} className={`flex items-start gap-3 py-2 border-b border-border/60 last:border-0 transition-opacity ${active ? "opacity-100" : done ? "opacity-70" : "opacity-40"}`}>
              <span className={`mt-1 inline-block h-2 w-2 rounded-full shrink-0 ${active ? "bg-primary animate-[pulse-dot_2.2s_ease-in-out_infinite]" : done ? "bg-primary/60" : "bg-muted"}`} />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-3">
                  <span className="text-muted-foreground">{String(i + 1).padStart(2, "0")}</span>
                  <span className="text-foreground">{s.label}</span>
                </div>
                <div className="text-muted-foreground text-[11.5px] mt-0.5 truncate">{s.out}</div>
              </div>
              <span className="text-muted-foreground text-[11px] tabular-nums">{(120 + i * 67).toString().padStart(4, "0")}ms</span>
            </div>
          );
        })}
        <div className="pt-4 mt-2 flex items-center justify-between text-[11px] text-muted-foreground">
          <span>checkpoint: <span className="text-foreground">ckpt_9b21</span></span>
          <span>cost: <span className="text-foreground">$0.0143</span></span>
          <span>tokens: <span className="text-foreground">3,204</span></span>
        </div>
      </div>
    </MockFrame>
  );
}

function PolicyMock() {
  return (
    <MockFrame title="policies/revenue-ops.policy.yaml" right="v23 · deployed">
      <div className="p-5 codeblock whitespace-pre text-[12.5px] leading-[1.7]">
<span className="text-muted-foreground">{`# Gate every external tool call`}</span>{`\n`}
<span className="text-foreground">policy</span>{` `}<span className="text-primary">{`"revenue-ops"`}</span>{` {\n`}
{`  `}<span className="text-foreground">pre_call</span>{` {\n`}
{`    redact_pii      = `}<span className="text-primary">true</span>{`\n`}
{`    entities        = ["EMAIL", "SSN", "CC"]\n`}
{`    block_if_injection = `}<span className="text-primary">true</span>{`\n`}
{`  }\n`}
{`  `}<span className="text-foreground">tool_scope</span>{` {\n`}
{`    allow = ["salesforce.*", "gmail.read"]\n`}
{`    deny  = ["*.delete", "admin.*"]\n`}
{`  }\n`}
{`  `}<span className="text-foreground">human_review</span>{` {\n`}
{`    when = `}<span className="text-primary">{'`cost > 50 OR tool == "salesforce.close"`'}</span>{`\n`}
{`  }\n`}
{`}`}
      </div>
      <div className="border-t border-border px-5 py-3 flex items-center justify-between text-[11px]">
        <span className="text-primary">● 0 violations · last 24h</span>
        <span className="text-muted-foreground">enforced across 47 agents</span>
      </div>
    </MockFrame>
  );
}

function ObsMock() {
  const bars = Array.from({ length: 30 }, (_, i) => 18 + Math.sin(i * 0.6) * 10 + (i % 7 === 0 ? 22 : 0));
  return (
    <MockFrame title="traces · last 1h" right="2,418 runs">
      <div className="p-5">
        <div className="flex items-end gap-1.5 h-32">
          {bars.map((h, i) => (
            <div key={i} className="flex-1 bg-primary/70 hover:bg-primary transition-colors rounded-sm" style={{ height: `${h + 20}%`, opacity: 0.25 + (i / bars.length) * 0.75 }} />
          ))}
        </div>
        <div className="mt-6 grid grid-cols-4 gap-4 pt-4 border-t border-border">
          {[
            ["p50", "412ms"],
            ["p95", "1.8s"],
            ["errors", "0.12%"],
            ["cost/run", "$0.014"],
          ].map(([k, v]) => (
            <div key={k}>
              <div className="text-[10px] uppercase tracking-widest text-muted-foreground">{k}</div>
              <div className="mt-1 text-lg font-medium tabular-nums">{v}</div>
            </div>
          ))}
        </div>
        <div className="mt-5 text-[11px] codeblock text-muted-foreground space-y-1">
          <div><span className="text-primary">●</span> revenue-ops · <span className="text-foreground">compose()</span> · 312ms · $0.011 · ok</div>
          <div><span className="text-primary">●</span> support-triage · <span className="text-foreground">classify()</span> · 148ms · $0.002 · ok</div>
          <div><span className="text-destructive">●</span> contracts-bot · <span className="text-foreground">extract()</span> · 4.2s · $0.083 · timeout → fallback</div>
        </div>
      </div>
    </MockFrame>
  );
}

function RegistryMock() {
  const rows = [
    ["revenue-ops",     "v2.14.0", "production", "approved",   "2m ago"],
    ["support-triage",  "v1.08.2", "production", "approved",   "1h ago"],
    ["contracts-bot",   "v0.9.0",  "staging",    "in review",  "3h ago"],
    ["hr-onboard",      "v3.01.1", "production", "approved",   "1d ago"],
    ["finance-close",   "v0.2.0",  "dev",        "draft",      "2d ago"],
  ];
  return (
    <MockFrame title="registry · agents" right="12 total · 47 versions">
      <div className="codeblock text-[12.5px]">
        <div className="grid grid-cols-12 px-5 py-2.5 border-b border-border text-muted-foreground text-[10.5px] uppercase tracking-widest">
          <div className="col-span-4">agent</div>
          <div className="col-span-2">version</div>
          <div className="col-span-2">env</div>
          <div className="col-span-2">status</div>
          <div className="col-span-2 text-right">updated</div>
        </div>
        {rows.map(([a, v, e, s, u], i) => (
          <div key={i} className="grid grid-cols-12 px-5 py-3 border-b border-border/60 last:border-0 items-center hover:bg-secondary transition-colors">
            <div className="col-span-4 flex items-center gap-2 text-foreground">
              <span className="h-1.5 w-1.5 rounded-full bg-primary" /> {a}
            </div>
            <div className="col-span-2 text-muted-foreground">{v}</div>
            <div className="col-span-2">
              <span className={`inline-block px-2 py-0.5 text-[10px] uppercase tracking-widest ${
                e === "production" ? "text-primary" : e === "staging" ? "text-foreground" : "text-muted-foreground"
              }`}>{e}</span>
            </div>
            <div className="col-span-2 text-muted-foreground">{s}</div>
            <div className="col-span-2 text-right text-muted-foreground">{u}</div>
          </div>
        ))}
      </div>
    </MockFrame>
  );
}

export function FeatureShowcase() {
  const [tab, setTab] = useState("runtime");
  const tabs = [
    { id: "runtime", label: "Runtime" },
    { id: "policy", label: "Policy" },
    { id: "observability", label: "Observability" },
    { id: "registry", label: "Registry" },
  ];

  const panels = {
    runtime: {
      title: "A runtime built for agents, not chatbots.",
      body: "Durable execution, pause/resume, parallel tool calls, and stateful memory — all managed for you. Agents survive restarts, handle week-long workflows, and degrade gracefully when a model does.",
      bullets: [
        "Streaming + checkpointed execution",
        "Multi-model routing with fallback",
        "Structured outputs with schema repair",
        "Cost cap & rate-limit per tenant",
      ],
      mock: <RuntimeMock />,
    },
    policy: {
      title: "Policy-as-code, enforced at every token.",
      body: "Write policies in a declarative language or pull from our library. Pre-call, post-call, and on-tool-use hooks. Nothing ships until the policy CI passes.",
      bullets: [
        "PII detection & redaction (17 entity types)",
        "Prompt-injection & jailbreak defense",
        "Tool allowlist per role, per environment",
        "Human-in-the-loop escalation rules",
      ],
      mock: <PolicyMock />,
    },
    observability: {
      title: "See every thought. Replay every run.",
      body: "Full traces — prompts, tools, model I/O, latency, cost — captured by default. Filter by user, agent, cost, or outcome. Replay a run locally with one click.",
      bullets: [
        "OpenTelemetry-native traces",
        "Session replay (prompt + tool + output)",
        "Eval harness with golden sets",
        "Drift & regression alerting",
      ],
      mock: <ObsMock />,
    },
    registry: {
      title: "A private registry for your agents.",
      body: "Version every agent, prompt, and tool. Promote between dev → staging → prod with approval gates. Share internally with scoped access.",
      bullets: [
        "Git-backed versioning, immutable tags",
        "Approval workflows & change requests",
        "Forkable agent templates",
        "Semantic diff on prompts and policies",
      ],
      mock: <RegistryMock />,
    },
  };

  const p = panels[tab];

  return (
    <section id="product" className="relative bg-muted border-t border-border">
      <div className="max-w-7xl mx-auto px-6 md:px-10 lg:px-16 py-24 md:py-32">
        <SectionHeader
          num="/02"
          eyebrow="The product"
          title={<>Everything you need to run agents <span className="text-primary">in production.</span></>}
        />

        <div className="mt-12 flex flex-wrap gap-2 border-b border-border">
          {tabs.map(t => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`px-5 py-3 text-xs tracking-[0.25em] uppercase font-medium transition-colors border-b-2 -mb-px ${
                tab === t.id
                  ? "text-foreground border-primary"
                  : "text-muted-foreground border-transparent hover:text-foreground"
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        <div className="mt-12 grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-16 items-start">
          <div className="lg:col-span-5">
            <h3 className="text-3xl md:text-4xl font-semibold leading-tight tracking-tight">{p.title}</h3>
            <p className="mt-5 text-muted-foreground text-base font-light leading-relaxed">{p.body}</p>
            <ul className="mt-8 space-y-3">
              {p.bullets.map((b, i) => (
                <li key={i} className="flex items-start gap-3 text-[15px] text-foreground/90">
                  <span className="mt-2 h-1 w-4 bg-primary shrink-0" />
                  <span className="font-light">{b}</span>
                </li>
              ))}
            </ul>
          </div>
          <div className="lg:col-span-7">{p.mock}</div>
        </div>
      </div>
    </section>
  );
}

function AcceleratorGlyph({ i }) {
  const common = { width: 56, height: 56, viewBox: "0 0 56 56", fill: "none", stroke: "currentColor", strokeWidth: 1.2 };
  switch (i % 8) {
    case 0: return <svg {...common} className="text-primary"><rect x="4" y="4" width="48" height="48"/><path d="M14 20h28M14 28h20M14 36h14"/><circle cx="44" cy="36" r="3" fill="currentColor"/></svg>;
    case 1: return <svg {...common} className="text-primary"><path d="M4 44 L18 30 L26 38 L42 20 L52 30"/><circle cx="18" cy="30" r="2" fill="currentColor"/><circle cx="42" cy="20" r="2" fill="currentColor"/><path d="M4 52h48"/></svg>;
    case 2: return <svg {...common} className="text-primary"><circle cx="28" cy="28" r="22"/><circle cx="28" cy="28" r="14"/><circle cx="28" cy="28" r="6" fill="currentColor"/><path d="M28 6v14M28 36v14M6 28h14M36 28h14"/></svg>;
    case 3: return <svg {...common} className="text-primary"><rect x="4" y="10" width="48" height="36" rx="2"/><path d="M4 20h48"/><circle cx="10" cy="15" r="1.5" fill="currentColor"/><circle cx="15" cy="15" r="1.5" fill="currentColor"/><path d="M14 32h12M14 38h20M32 26h14v14H32z"/></svg>;
    case 4: return <svg {...common} className="text-primary"><path d="M28 4 L48 14 V30 C48 42 38 50 28 52 C18 50 8 42 8 30 V14 Z"/><path d="M20 28l6 6 10-12"/></svg>;
    case 5: return <svg {...common} className="text-primary"><rect x="6" y="20" width="44" height="28" rx="2"/><path d="M18 20v-6a10 10 0 0120 0v6"/><circle cx="28" cy="34" r="3" fill="currentColor"/></svg>;
    case 6: return <svg {...common} className="text-primary"><path d="M8 28 L28 8 L48 28 L28 48 Z"/><path d="M18 28 L28 18 L38 28 L28 38 Z" fill="currentColor" fillOpacity="0.2"/><path d="M4 28h8M44 28h8"/></svg>;
    case 7: return <svg {...common} className="text-primary"><circle cx="14" cy="14" r="6"/><circle cx="42" cy="14" r="6"/><circle cx="14" cy="42" r="6"/><circle cx="42" cy="42" r="6" fill="currentColor"/><path d="M14 20v16M42 20v16M20 14h16M20 42h16"/></svg>;
  }
}

export function Accelerators() {
  const cards = [
    { t: "Agent Studio",        d: "Visual + code canvas to author agents. Version every change, fork safely, preview runs in-editor.", tag: "Build" },
    { t: "Eval Harness",        d: "Golden-set evals, regression alerts, A/B across models. Run 10k cases in under a minute.",           tag: "Quality" },
    { t: "RAG Starter",         d: "Ingest → chunk → embed → retrieve, wired to your vector store. Hybrid search, re-rank, cite.",        tag: "Retrieval" },
    { t: "Connector Library",   d: "400+ typed tools: Salesforce, NetSuite, Jira, ServiceNow, SAP, Snowflake, and counting.",           tag: "Integrations" },
    { t: "Policy Pack",         d: "Pre-written policies for HIPAA, GDPR, SOX, FINRA. Drop-in, extendable, audited.",                   tag: "Governance" },
    { t: "Vault Gateway",       d: "Secrets broker with just-in-time credentials. Agents never see raw keys.",                           tag: "Security" },
    { t: "Cost Router",         d: "Route each call to the cheapest model that meets quality. Track spend per agent, per tenant.",       tag: "FinOps" },
    { t: "Red-Team Suite",      d: "Continuous adversarial testing: injection, exfil, tool-abuse. Reports you can hand to risk.",         tag: "Safety" },
  ];
  return (
    <section id="accelerators" className="relative bg-hero-bg border-t border-border">
      <div className="max-w-7xl mx-auto px-6 md:px-10 lg:px-16 py-24 md:py-32">
        <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-8">
          <SectionHeader
            num="/03"
            eyebrow="Accelerators"
            title={<>Start with a head-start. <br/><span className="text-muted-foreground">Eight accelerators, production-ready.</span></>}
          />
          <p className="text-muted-foreground text-sm md:text-base font-light max-w-sm">
            Don&apos;t boil the ocean. Each accelerator ships as code you own — fork it, extend it, govern it like anything else in the vault.
          </p>
        </div>

        <div className="mt-16 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-px bg-border border border-border">
          {cards.map((c, i) => (
            <div key={i} className="group bg-hero-bg p-6 md:p-7 relative overflow-hidden hover:bg-muted transition-colors cursor-pointer">
              <div className="flex items-center justify-between">
                <span className="text-[10px] text-muted-foreground uppercase tracking-[0.25em]">{c.tag}</span>
                <span className="text-muted-foreground font-mono text-[10px]">{String(i + 1).padStart(2, "0")}</span>
              </div>
              <div className="mt-8 h-14 flex items-center">
                <AcceleratorGlyph i={i} />
              </div>
              <h3 className="mt-6 text-xl font-semibold tracking-tight">{c.t}</h3>
              <p className="mt-3 text-muted-foreground text-sm font-light leading-relaxed">{c.d}</p>
              <div className="mt-6 flex items-center gap-2 text-primary text-[11px] uppercase tracking-[0.25em] opacity-0 group-hover:opacity-100 transition-opacity">
                Explore <span>→</span>
              </div>
              <div className="absolute top-0 right-0 w-8 h-8 border-t border-r border-transparent group-hover:border-primary transition-colors" />
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function DiagBox({ label, sub, muted }) {
  return (
    <div className={`border border-border rounded-sm p-3 ${muted ? "bg-panel" : "bg-secondary"}`}>
      <div className="text-foreground text-sm">{label}</div>
      <div className="text-muted-foreground text-[11px] mt-1 font-mono">{sub}</div>
    </div>
  );
}

function ArchitectureDiagram() {
  return (
    <div className="relative border border-border rounded-md p-6 md:p-8 bg-hero-bg">
      <div className="flex items-center justify-between mb-6 text-[11px] text-muted-foreground font-mono">
        <span>architecture · agentvault.yaml</span>
        <span className="text-primary">● enforced</span>
      </div>

      <div className="relative grid grid-cols-3 gap-4">
        <DiagBox label="User / System" sub="prompts · events · webhooks" />
        <DiagBox label="Retrieval" sub="vector · SQL · APIs" muted />
        <DiagBox label="Tools" sub="400+ connectors" muted />

        <div className="col-span-3 flex justify-center py-1">
          <svg width="60" height="24" viewBox="0 0 60 24" className="text-border">
            <path d="M30 0v16" stroke="currentColor" strokeWidth="1" />
            <path d="M24 14 L30 22 L36 14" stroke="currentColor" strokeWidth="1" fill="none" />
          </svg>
        </div>

        <div className="col-span-3 border border-primary/40 rounded-sm p-5 bg-[hsl(var(--primary)/0.08)] shadow-[0_0_0_1px_hsl(var(--primary)/0.25),0_0_40px_hsl(var(--primary)/0.15)]">
          <div className="flex items-center justify-between">
            <span className="text-primary text-[11px] uppercase tracking-[0.25em]">Policy Layer</span>
            <span className="text-muted-foreground text-[11px] font-mono">pre-call · post-call · on-tool</span>
          </div>
          <div className="mt-4 grid grid-cols-4 gap-3">
            {["PII redact", "Injection scan", "Tool scope", "Cost cap"].map((l) => (
              <div key={l} className="border border-primary/25 rounded-sm px-2 py-2 text-center">
                <span className="text-[11px] text-foreground">{l}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="col-span-3 flex justify-center py-1">
          <svg width="60" height="24" viewBox="0 0 60 24" className="text-border">
            <path d="M30 0v16" stroke="currentColor" strokeWidth="1" />
            <path d="M24 14 L30 22 L36 14" stroke="currentColor" strokeWidth="1" fill="none" />
          </svg>
        </div>

        <div className="col-span-3 border border-border rounded-sm p-5 bg-panel">
          <div className="flex items-center justify-between">
            <span className="text-foreground text-[11px] uppercase tracking-[0.25em]">Agent Runtime</span>
            <span className="text-muted-foreground text-[11px] font-mono">durable · parallel · checkpointed</span>
          </div>
          <div className="mt-4 grid grid-cols-3 gap-3">
            {[
              ["Planner", "plan → steps"],
              ["Router", "model per task"],
              ["Executor", "tools + memory"],
            ].map(([a, b]) => (
              <div key={a} className="border border-border rounded-sm p-3">
                <div className="text-foreground text-sm">{a}</div>
                <div className="text-muted-foreground text-[11px] mt-1 font-mono">{b}</div>
              </div>
            ))}
          </div>
        </div>

        <div className="col-span-3 flex justify-center py-1">
          <svg width="60" height="24" viewBox="0 0 60 24" className="text-border">
            <path d="M30 0v16" stroke="currentColor" strokeWidth="1" />
            <path d="M24 14 L30 22 L36 14" stroke="currentColor" strokeWidth="1" fill="none" />
          </svg>
        </div>

        <DiagBox label="Trace store" sub="OTel · 30d default" />
        <DiagBox label="Audit log" sub="immutable · signed" />
        <DiagBox label="Eval & drift" sub="golden sets · alerts" />
      </div>
    </div>
  );
}

export function Governance() {
  return (
    <section id="governance" className="relative bg-muted border-t border-border overflow-hidden">
      <div className="max-w-7xl mx-auto px-6 md:px-10 lg:px-16 py-24 md:py-32">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-20 items-start">
          <div className="lg:col-span-5 lg:sticky lg:top-32">
            <SectionHeader
              num="/04"
              eyebrow="Governance by default"
              title={<>Ship agents your <span className="text-primary">risk team</span> will sign off on.</>}
              kicker="Every prompt, tool call, and model output passes through the vault. Policies are versioned. Audits are one query away. Your CISO stops being the bottleneck."
            />
            <div className="mt-10 grid grid-cols-2 gap-px bg-border border border-border">
              {[
                ["17", "PII entity types detected"],
                ["< 5ms", "policy eval overhead"],
                ["100%", "actions audited"],
                ["SOC 2", "Type II certified"],
              ].map(([k, v]) => (
                <div key={k} className="bg-hero-bg p-6">
                  <div className="text-2xl md:text-3xl font-semibold tabular-nums">{k}</div>
                  <div className="mt-1 text-[11px] text-muted-foreground uppercase tracking-widest">{v}</div>
                </div>
              ))}
            </div>
          </div>

          <div className="lg:col-span-7">
            <ArchitectureDiagram />
          </div>
        </div>
      </div>
    </section>
  );
}

export function Testimonial() {
  return (
    <section id="customers" className="relative bg-hero-bg border-t border-border">
      <div className="max-w-5xl mx-auto px-6 md:px-10 lg:px-16 py-24 md:py-32 text-center">
        <div className="text-primary font-mono text-xs tracking-[0.3em] uppercase">Customers</div>
        <blockquote className="mt-8 text-[clamp(1.5rem,3.2vw,2.5rem)] font-light leading-[1.25] tracking-[-0.02em] text-foreground">
          <span className="text-muted-foreground">“We moved six agents from pilot to production in one quarter.</span> AgentVault is the only reason our risk team let us.<span className="text-muted-foreground">”</span>
        </blockquote>
        <div className="mt-10 flex flex-col items-center gap-3">
          <div className="h-10 w-10 rounded-full bg-muted border border-border flex items-center justify-center text-xs">MR</div>
          <div className="text-sm text-foreground">Maya Rao</div>
          <div className="text-xs text-muted-foreground uppercase tracking-widest">VP AI Platform · Fortune 100 Insurer</div>
        </div>

        <div className="mt-16 grid grid-cols-2 md:grid-cols-4 gap-px bg-border border border-border text-left">
          {[
            ["47", "Enterprises"],
            ["2.1B", "Agent actions / mo"],
            ["12+", "Regulated industries"],
            ["99.99%", "Platform uptime"],
          ].map(([k, v]) => (
            <div key={k} className="bg-hero-bg p-6 md:p-8">
              <div className="text-3xl md:text-4xl font-semibold tabular-nums">{k}</div>
              <div className="mt-2 text-[11px] text-muted-foreground uppercase tracking-widest">{v}</div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

export function ClosingCTA() {
  return (
    <section id="pricing" className="relative bg-muted border-t border-border overflow-hidden">
      <div className="max-w-7xl mx-auto px-6 md:px-10 lg:px-16 py-28 md:py-40 relative">
        <div aria-hidden className="absolute -right-10 top-1/2 -translate-y-1/2 text-[22vw] leading-none font-bold text-foreground/[0.04] tracking-tighter select-none pointer-events-none">
          VAULT
        </div>
        <div className="relative max-w-3xl">
          <div className="text-primary font-mono text-xs tracking-[0.3em] uppercase">/05 · Get started</div>
          <h2 className="mt-6 text-[clamp(2.5rem,6vw,5rem)] font-semibold leading-[1] tracking-[-0.04em]">
            Stop prototyping.<br />
            <span className="text-primary">Start shipping.</span>
          </h2>
          <p className="mt-6 text-muted-foreground text-lg font-light max-w-xl">
            Spin up a vault in your cloud in under 20 minutes. Bring one agent, or twenty. We&apos;ll meet your security review on the way in.
          </p>
          <div className="mt-10 flex flex-wrap gap-3 font-bold">
            <button className="bg-primary text-primary-foreground px-7 py-4 text-sm rounded-sm hover:brightness-110 transition-all btn-press uppercase tracking-[0.15em]">
              Start building
            </button>
            <button className="bg-panel border border-border text-foreground hover:bg-muted px-7 py-4 text-sm rounded-sm transition-all btn-press uppercase tracking-[0.15em]">
              Talk to sales
            </button>
          </div>
          <div className="mt-8 text-muted-foreground/70 text-xs font-light">
            No credit card. 30-day sandbox. Deploys in your VPC.
          </div>
        </div>
      </div>
    </section>
  );
}

export function Footer() {
  const cols = [
    ["Product", ["Platform", "Runtime", "Registry", "Observability", "Pricing"]],
    ["Accelerators", ["Agent Studio", "Eval Harness", "RAG Starter", "Connector Library", "Policy Pack"]],
    ["Governance", ["SOC 2 report", "HIPAA", "GDPR", "Trust center", "Security whitepaper"]],
    ["Company", ["About", "Customers", "Careers", "Press", "Contact"]],
  ];
  return (
    <footer className="relative bg-hero-bg border-t border-border">
      <div className="max-w-7xl mx-auto px-6 md:px-10 lg:px-16 py-16">
        <div className="grid grid-cols-2 md:grid-cols-6 gap-10">
          <div className="col-span-2 md:col-span-2">
            <div className="flex items-center gap-2">
              <VaultMark />
              <span className="text-foreground text-lg font-semibold tracking-tight">AgentVault</span>
            </div>
            <p className="mt-5 text-muted-foreground text-sm font-light max-w-xs">
              Enterprise agents, governed end-to-end. Build, ship, and audit with confidence.
            </p>
            <div className="mt-6 flex items-center gap-2 text-[11px] text-muted-foreground">
              <span className="h-1.5 w-1.5 rounded-full bg-primary animate-[pulse-dot_2.2s_ease-in-out_infinite]" />
              All systems nominal
            </div>
          </div>
          {cols.map(([h, links]) => (
            <div key={h}>
              <div className="text-[11px] uppercase tracking-[0.25em] text-foreground">{h}</div>
              <ul className="mt-5 space-y-3">
                {links.map((l) => (
                  <li key={l}>
                    <a href="#" className="text-muted-foreground hover:text-foreground text-sm font-light transition-colors">{l}</a>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="mt-16 pt-8 border-t border-border flex flex-col md:flex-row md:items-center md:justify-between gap-4 text-[11px] text-muted-foreground">
          <div>© 2026 AgentVault, Inc. All rights reserved.</div>
          <div className="flex flex-wrap gap-6 uppercase tracking-widest">
            <a href="#" className="hover:text-foreground">Privacy</a>
            <a href="#" className="hover:text-foreground">Terms</a>
            <a href="#" className="hover:text-foreground">DPA</a>
            <a href="#" className="hover:text-foreground">Security</a>
          </div>
        </div>
      </div>
    </footer>
  );
}
