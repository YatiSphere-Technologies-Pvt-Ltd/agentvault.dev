'use client';

import Link from 'next/link';
import { useAuth } from '../../auth/AuthProvider';

const STATS = [
  { label: 'Active agents',    value: '12',    delta: '+3',   tone: 'accent' },
  { label: 'Runs this month',  value: '8,421', delta: '+28%', tone: 'accent' },
  { label: 'Spend · MTD',      value: '$384',  delta: '-12%', tone: 'accent' },
  { label: 'Avg latency',      value: '1.4s',  delta: '+80ms',tone: 'foreground' },
];

const RECENT_RUNS = [
  { id: 'run_9412', workflow: 'Invoice Processor',  status: 'success', dur: '4.2s', cost: '$0.018', when: '2m ago' },
  { id: 'run_9411', workflow: 'KYC Verification',   status: 'success', dur: '2.8s', cost: '$0.009', when: '8m ago' },
  { id: 'run_9410', workflow: 'Contract Redliner',  status: 'running', dur: '—',    cost: '—',     when: 'now' },
  { id: 'run_9409', workflow: 'Invoice Processor',  status: 'success', dur: '3.9s', cost: '$0.017', when: '24m ago' },
  { id: 'run_9408', workflow: 'Claims Triage',      status: 'error',   dur: '12s',  cost: '$0.004', when: '1h ago' },
  { id: 'run_9407', workflow: 'Invoice Processor',  status: 'success', dur: '4.0s', cost: '$0.017', when: '2h ago' },
];

const WORKFLOWS = [
  { id: 'wf_invoice',  name: 'Invoice Processor',  desc: 'Extract, classify, gate & post vendor invoices to NetSuite.', runs: '5,120', primary: true },
  { id: 'wf_kyc',      name: 'KYC Verification',   desc: 'Ingest identity docs, screen sanctions, route to analyst.',   runs: '2,390' },
  { id: 'wf_contract', name: 'Contract Redliner',  desc: 'Agentic markup of MSAs against your playbook.',               runs: '610' },
  { id: 'wf_claims',   name: 'Claims Triage',      desc: 'First-notice-of-loss → severity score → adjuster queue.',     runs: '301' },
];

function StatusDot({ status }) {
  const tone = status === 'success' ? 'bg-accent' : status === 'running' ? 'bg-primary animate-pulse-dot' : 'bg-destructive';
  return <span className={`inline-block h-1.5 w-1.5 rounded-full ${tone}`} />;
}

export default function AppHomePage() {
  const { user } = useAuth();
  const firstName = (user?.name || user?.email || 'there').split(/[\s@.]/)[0];

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-10 py-6 sm:py-8">
      {/* Greeting */}
      <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4">
        <div>
          <div className="text-[10.5px] uppercase tracking-[0.2em] text-muted-foreground font-mono">Home</div>
          <h1 className="mt-1 text-[28px] font-semibold tracking-tight text-foreground">
            Welcome back, {firstName}.
          </h1>
          <p className="mt-1 text-[13.5px] text-muted-foreground">
            Here's what's happening across your vault today.
          </p>
        </div>
        <Link
          href="/app/studio"
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-md bg-primary text-primary-foreground text-[13px] font-medium hover:brightness-110 active:scale-[0.99] transition-all shadow-sm"
        >
          <svg width="14" height="14" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round"><path d="M10 4v12M4 10h12"/></svg>
          Open Agent Studio
        </Link>
      </div>

      {/* Stats */}
      <div className="mt-7 grid grid-cols-2 md:grid-cols-4 gap-3">
        {STATS.map(s => (
          <div key={s.label} className="bg-panel border border-border rounded-xl p-4">
            <div className="text-[10.5px] uppercase tracking-[0.15em] text-muted-foreground font-mono">{s.label}</div>
            <div className="mt-1.5 flex items-baseline gap-2">
              <div className="text-[22px] font-semibold text-foreground tracking-tight tabular-nums">{s.value}</div>
              <div className={`text-[11px] font-mono ${s.tone === 'accent' ? 'text-accent' : 'text-muted-foreground'}`}>
                {s.delta}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Two-column: workflows + recent runs */}
      <div className="mt-8 grid grid-cols-1 lg:grid-cols-[1.4fr_1fr] gap-6">
        {/* Workflows */}
        <section>
          <div className="flex items-end justify-between mb-3">
            <div>
              <div className="text-[10.5px] uppercase tracking-[0.2em] text-muted-foreground font-mono">Your workflows</div>
              <h2 className="text-[16px] font-semibold text-foreground mt-0.5">{WORKFLOWS.length} workflows</h2>
            </div>
            <Link href="/app/studio" className="text-[11.5px] text-primary hover:brightness-110 font-medium">Open Studio →</Link>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {WORKFLOWS.map(w => (
              <Link
                key={w.id}
                href="/app/studio"
                className="group block bg-panel border border-border rounded-xl p-4 hover:border-primary/40 hover:shadow-sm transition-all"
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-2.5">
                    <div className={`h-8 w-8 rounded-md flex items-center justify-center ${w.primary ? 'bg-primary/10 text-primary' : 'bg-muted text-muted-foreground'}`}>
                      <svg width="14" height="14" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><circle cx="5" cy="5" r="2"/><circle cx="15" cy="5" r="2"/><circle cx="5" cy="15" r="2"/><circle cx="15" cy="15" r="2"/><path d="M7 5h6M5 7v6M15 7v6M7 15h6"/></svg>
                    </div>
                    <div>
                      <div className="text-[13.5px] font-medium text-foreground leading-tight">{w.name}</div>
                      <div className="text-[10.5px] text-muted-foreground font-mono mt-0.5">{w.id} · {w.runs} runs</div>
                    </div>
                  </div>
                  <svg width="13" height="13" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.8" className="text-muted-foreground group-hover:text-primary transition-colors mt-1.5" aria-hidden><path d="M5 10h10M11 5l5 5-5 5"/></svg>
                </div>
                <p className="mt-3 text-[12px] text-muted-foreground leading-relaxed">{w.desc}</p>
              </Link>
            ))}
          </div>
        </section>

        {/* Recent runs */}
        <section>
          <div className="flex items-end justify-between mb-3">
            <div>
              <div className="text-[10.5px] uppercase tracking-[0.2em] text-muted-foreground font-mono">Recent runs</div>
              <h2 className="text-[16px] font-semibold text-foreground mt-0.5">Last 6</h2>
            </div>
            <Link href="/app/runs" className="text-[11.5px] text-primary hover:brightness-110 font-medium">View all →</Link>
          </div>
          <div className="bg-panel border border-border rounded-xl overflow-x-auto">
            <table className="w-full min-w-120 text-[12px]">
              <thead className="bg-hero-bg border-b border-border">
                <tr className="text-[10px] uppercase tracking-[0.15em] text-muted-foreground font-mono">
                  <th className="text-left  px-3 py-2 font-medium">Run</th>
                  <th className="text-left  px-3 py-2 font-medium">Status</th>
                  <th className="text-right px-3 py-2 font-medium">Duration</th>
                  <th className="text-right px-3 py-2 font-medium">When</th>
                </tr>
              </thead>
              <tbody>
                {RECENT_RUNS.map(r => (
                  <tr key={r.id} className="border-b border-border/60 last:border-none hover:bg-muted/50 transition-colors cursor-pointer">
                    <td className="px-3 py-2">
                      <div className="text-foreground truncate">{r.workflow}</div>
                      <div className="text-[10px] text-muted-foreground font-mono">{r.id}</div>
                    </td>
                    <td className="px-3 py-2">
                      <span className="inline-flex items-center gap-1.5 text-[11px] font-mono">
                        <StatusDot status={r.status} />
                        <span className={r.status === 'success' ? 'text-accent' : r.status === 'running' ? 'text-primary' : 'text-destructive'}>
                          {r.status}
                        </span>
                      </span>
                    </td>
                    <td className="px-3 py-2 text-right tabular-nums text-muted-foreground font-mono">{r.dur}</td>
                    <td className="px-3 py-2 text-right tabular-nums text-muted-foreground font-mono">{r.when}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      </div>

      {/* Getting-started hint */}
      <section className="mt-8 bg-panel border border-border rounded-xl p-6 flex flex-col md:flex-row md:items-center gap-4 justify-between">
        <div className="flex items-start gap-4">
          <div className="h-10 w-10 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0">
            <svg width="18" height="18" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><path d="M10 3l6 2v5c0 4-3 6-6 7-3-1-6-3-6-7V5l6-2z"/><path d="M7.5 10l2 2 3-3.5"/></svg>
          </div>
          <div>
            <div className="text-[13.5px] font-semibold text-foreground">Finish setting up your vault</div>
            <p className="mt-1 text-[12.5px] text-muted-foreground">Connect your data sources, invite teammates, and configure policy files to move from sandbox to production.</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Link href="/app/settings" className="text-[12.5px] px-3 py-1.5 rounded-md border border-border hover:bg-muted transition-colors">Settings</Link>
          <Link href="/app/studio" className="text-[12.5px] px-3 py-1.5 rounded-md bg-primary text-primary-foreground hover:brightness-110 font-medium">Start building</Link>
        </div>
      </section>
    </div>
  );
}
