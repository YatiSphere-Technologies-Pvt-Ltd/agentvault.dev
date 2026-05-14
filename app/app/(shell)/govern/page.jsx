'use client';

import Link from 'next/link';
import { useMemo } from 'react';
import {
  ShieldAlert, Activity, Layers, Cable, AlertOctagon,
  ArrowRight, ChevronRight, TrendingUp, Users,
} from 'lucide-react';
import {
  GovernHeader, RiskPill, ApprovalPill, AssetTypePill, DestinationPill,
  ConnectorIcon, DecisionPill, fmtAgo, fmtNum, fmtKb,
} from './_shared';
import {
  useAssets, useEvents, useConnectors,
  computeRiskScore, rollupApproval, rollupByDepartment, topAtRisk,
} from './_store';

/* Govern overview — the CISO/CIO landing page.

   Each tile is anchored to a question the buyer actually asks; we don't
   ship "Total AI Tools: 142" without the why-it-matters wrapper. */

export default function GovernOverviewPage() {
  const assets = useAssets();
  const events = useEvents();
  const connectors = useConnectors();

  const stats = useMemo(() => {
    const approval = rollupApproval(assets);
    const totalAssets = assets.length;
    const totalUsers7d = assets.reduce((s, a) => s + (a.user_count_7d || 0), 0);
    const totalEvents7d = assets.reduce((s, a) => s + (a.traffic_events_7d || 0), 0);
    const riskScore = computeRiskScore(assets);
    const exfilEvents = events.filter(e => e.decision === 'block' || e.decision === 'redact').length;
    return { approval, totalAssets, totalUsers7d, totalEvents7d, riskScore, exfilEvents };
  }, [assets, events]);

  const departments = useMemo(() => rollupByDepartment(assets), [assets]);
  const atRisk = useMemo(() => topAtRisk(assets, 5), [assets]);

  const liveConnectors = connectors.filter(c => c.status === 'connected').length;
  const totalEventsToday = connectors.reduce((s, c) => s + (c.events_24h || 0), 0);

  return (
    <>
      <GovernHeader />

      <div className="max-w-[1680px] mx-auto px-4 sm:px-6 lg:px-8 py-7 space-y-6">
        {/* Risk score hero — the one number the board wants */}
        <RiskHero score={stats.riskScore} approval={stats.approval} />

        {/* Question-anchored stat cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
          <QuestionCard
            question="How many AI assets do we have visibility into?"
            value={String(stats.totalAssets)}
            sub={`${stats.approval.approved} approved · ${stats.approval.pending + stats.approval.unknown} unreviewed · ${stats.approval.quarantined + stats.approval.blocked} actioned`}
            href="/app/govern/inventory"
            cta="See inventory"
          />
          <QuestionCard
            question="How many users hit unmanaged AI this week?"
            value={fmtNum(assets.filter(a => a.approval_state !== 'approved' && a.approval_state !== 'blocked').reduce((s, a) => s + (a.user_count_7d || 0), 0))}
            sub={`across ${assets.filter(a => a.approval_state !== 'approved').length} assets`}
            href="/app/govern/inventory?status=unreviewed"
            cta="Triage"
            tone="warn"
          />
          <QuestionCard
            question="How much traffic was blocked or redacted?"
            value={String(stats.exfilEvents)}
            sub={`out of ${events.length} discovery events`}
            href="/app/govern/discovery"
            cta="Open feed"
            tone={stats.exfilEvents > 0 ? 'bad' : 'ok'}
          />
          <QuestionCard
            question="How many discovery sources are live?"
            value={`${liveConnectors} / ${connectors.length}`}
            sub={`${fmtNum(totalEventsToday)} events / 24h`}
            href="/app/govern/connectors"
            cta="Manage connectors"
          />
        </div>

        {/* Two-column: department heatmap + top at-risk + recent events */}
        <div className="grid grid-cols-1 lg:grid-cols-[1.2fr_1fr] gap-5">
          <div className="space-y-5">
            <Card title="Top at-risk assets" hint="Highest priority for IT/Security review.">
              {atRisk.length === 0 ? (
                <div className="text-[12.5px] text-muted-foreground italic">Everything's reviewed — no unapproved high-volume AI assets right now.</div>
              ) : (
                <div className="divide-y divide-border/60 -mx-4">
                  {atRisk.map(a => (
                    <Link
                      key={a.id}
                      href={`/app/govern/inventory/${a.id}`}
                      className="px-4 py-3 flex items-center gap-3 hover:bg-muted/40 transition-colors"
                    >
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 flex-wrap mb-1">
                          <span className="text-[12.5px] font-medium text-foreground truncate">{a.name}</span>
                          <ApprovalPill state={a.approval_state} />
                          <RiskPill risk={a.risk_class} />
                          <AssetTypePill type={a.type} />
                        </div>
                        <div className="text-[10.5px] font-mono text-muted-foreground truncate">
                          {a.vendor} · {a.department} · {fmtNum(a.user_count_7d)} users · {fmtNum(a.traffic_events_7d)} events / 7d
                        </div>
                        {(a.data_categories || []).length > 0 && (
                          <div className="mt-1 flex items-center gap-1 flex-wrap">
                            {a.data_categories.map(c => (
                              <span key={c} className="text-[9.5px] font-mono px-1.5 py-0.5 rounded border border-destructive/40 bg-destructive/[0.06] text-destructive">
                                {c}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                      <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
                    </Link>
                  ))}
                </div>
              )}
            </Card>

            <Card title="Department heatmap" hint="Where AI is concentrated, and where the risk lives.">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {Object.entries(departments).sort(([,a], [,b]) => b.count - a.count).map(([dept, d]) => (
                  <DepartmentTile key={dept} dept={dept} d={d} />
                ))}
              </div>
            </Card>
          </div>

          <div className="space-y-5">
            <Card title="Recent discovery events" hint="Last 5 from the live feed." link="/app/govern/discovery" linkLabel="Full feed">
              <div className="-mx-4 divide-y divide-border/60">
                {events.slice(0, 5).map(e => (
                  <div key={e.id} className="px-4 py-2.5">
                    <div className="flex items-center gap-2 flex-wrap mb-0.5">
                      <DecisionPill decision={e.decision} />
                      <span className="text-[10.5px] font-mono text-muted-foreground">{fmtAgo(e.ts)}</span>
                      <span className="text-[10.5px] font-mono text-foreground/85">{e.user}</span>
                      <ArrowRight className="h-2.5 w-2.5 text-muted-foreground" />
                      <span className="text-[10.5px] font-mono text-foreground/85 truncate">{e.destination}</span>
                    </div>
                    <div className="text-[11.5px] text-foreground/85 truncate">{e.preview}</div>
                  </div>
                ))}
              </div>
            </Card>

            <Card title="Why this matters">
              <div className="space-y-2.5 text-[12px] text-muted-foreground leading-relaxed">
                <p>
                  <span className="text-foreground font-medium">Shadow AI</span> is the AI-era evolution of Shadow IT —
                  employees using AI tools without IT, security, or compliance approval. The platform answers four
                  audit-grade questions:
                </p>
                <ul className="list-disc pl-4 space-y-1">
                  <li>Which AI tools are being used?</li>
                  <li>Who is using them, on what data?</li>
                  <li>What was blocked, redacted, allowed?</li>
                  <li>Which decisions can we replay end-to-end?</li>
                </ul>
                <Link href="/app/grc" className="inline-flex items-center gap-1 text-[11.5px] text-primary hover:underline">
                  Map findings to your compliance frameworks → GRC
                </Link>
              </div>
            </Card>
          </div>
        </div>
      </div>
    </>
  );
}

/* ─────────── building blocks ─────────── */

function RiskHero({ score, approval }) {
  const tone = score >= 60 ? 'bad' : score >= 30 ? 'warn' : 'ok';
  const color = tone === 'bad' ? 'text-destructive' : tone === 'warn' ? 'text-primary' : 'text-brand-teal';
  const ring = tone === 'bad' ? 'border-destructive/40 bg-destructive/[0.04]'
             : tone === 'warn' ? 'border-primary/40 bg-primary/[0.04]'
             : 'border-(--brand-teal)/40 bg-(--brand-teal)/[0.04]';
  return (
    <div className={`rounded-xl border ${ring} px-5 py-4 flex items-center gap-5 flex-wrap`}>
      <div className="flex items-center gap-3 min-w-0">
        <div className={`h-12 w-12 rounded-md flex items-center justify-center ${tone === 'bad' ? 'bg-destructive/15' : tone === 'warn' ? 'bg-primary/15' : 'bg-(--brand-teal)/15'}`}>
          <ShieldAlert className={`h-6 w-6 ${color}`} />
        </div>
        <div>
          <div className="text-[10.5px] uppercase tracking-[0.16em] font-mono text-muted-foreground">AI risk score</div>
          <div className="flex items-baseline gap-2">
            <span className={`text-[36px] font-semibold tabular-nums leading-none ${color}`}>{score}</span>
            <span className="text-[12px] font-mono text-muted-foreground">/ 100</span>
          </div>
        </div>
      </div>

      <div className="flex-1 min-w-0">
        <div className="text-[12px] text-foreground/85 leading-relaxed">
          Composite of unapproved asset count, user reach, and destination class.
          {tone === 'bad'
            ? ' High exposure — prioritize Shadow AI triage and policy enforcement.'
            : tone === 'warn'
              ? ' Moderate exposure — keep working through pending reviews.'
              : ' Within tolerance — keep watch as new tools surface.'}
        </div>
      </div>

      <div className="flex items-center gap-3 shrink-0">
        <Pill label="Approved" value={approval.approved} tone="ok" />
        <Pill label="Pending"  value={approval.pending + approval.unknown} tone="warn" />
        <Pill label="Quarant." value={approval.quarantined} tone="bad" />
        <Pill label="Blocked"  value={approval.blocked} tone="muted" />
      </div>
    </div>
  );
}

function Pill({ label, value, tone }) {
  const cls = tone === 'ok'   ? 'border-(--brand-teal)/40 text-brand-teal bg-(--brand-teal)/10'
            : tone === 'warn' ? 'border-primary/40 text-primary bg-primary/10'
            : tone === 'bad'  ? 'border-destructive/40 text-destructive bg-destructive/10'
            : 'border-border text-muted-foreground bg-muted/40';
  return (
    <span className={`inline-flex items-center gap-1.5 px-2 py-1 rounded-md border text-[11px] font-medium ${cls}`}>
      <span className="font-mono tabular-nums">{value}</span>
      <span className="opacity-80">{label}</span>
    </span>
  );
}

function QuestionCard({ question, value, sub, href, cta, tone = 'default' }) {
  const color = tone === 'bad' ? 'text-destructive'
              : tone === 'warn' ? 'text-primary'
              : tone === 'ok' ? 'text-brand-teal'
              : 'text-foreground';
  return (
    <Link
      href={href || '#'}
      className="group rounded-xl border border-border bg-card p-4 hover:border-primary/40 hover:shadow-sm transition-all flex flex-col"
    >
      <div className="text-[11px] text-muted-foreground leading-snug mb-2 min-h-[2.4em]">{question}</div>
      <div className="flex items-baseline gap-2 mb-1">
        <div className={`text-[28px] font-semibold tabular-nums leading-none ${color}`}>{value}</div>
      </div>
      <div className="text-[11px] font-mono text-muted-foreground mt-1 truncate">{sub}</div>
      <div className="mt-auto pt-2 inline-flex items-center gap-1 text-[11.5px] text-primary group-hover:underline">
        {cta || 'Open'} <ChevronRight className="h-3.5 w-3.5" />
      </div>
    </Link>
  );
}

function Card({ title, hint, link, linkLabel, children }) {
  return (
    <div className="rounded-xl border border-border bg-card overflow-hidden">
      <div className="px-4 py-2.5 border-b border-border flex items-baseline justify-between gap-3">
        <div className="flex items-baseline gap-3 min-w-0">
          <div className="text-[10.5px] uppercase tracking-[0.16em] font-mono text-muted-foreground">{title}</div>
          {hint && <div className="text-[10.5px] text-muted-foreground/80 truncate">{hint}</div>}
        </div>
        {link && (
          <Link href={link} className="text-[11.5px] text-primary hover:brightness-110 font-medium inline-flex items-center gap-1 shrink-0">
            {linkLabel} <ChevronRight className="h-3.5 w-3.5" />
          </Link>
        )}
      </div>
      <div className="px-4 py-3">{children}</div>
    </div>
  );
}

function DepartmentTile({ dept, d }) {
  const heat = d.restricted * 3 + d.high * 1.5 + (d.count - d.restricted - d.high) * 0.3;
  // Map heat → 0..1 over a sensible range for the demo.
  const norm = Math.min(1, heat / 12);
  const tone = norm > 0.6 ? 'bad' : norm > 0.3 ? 'warn' : 'ok';
  const cls = tone === 'bad'  ? 'border-destructive/30 bg-destructive/[0.05]'
            : tone === 'warn' ? 'border-primary/30 bg-primary/[0.05]'
            : 'border-(--brand-teal)/30 bg-(--brand-teal)/[0.04]';
  return (
    <div className={`rounded-md border ${cls} px-3 py-2.5`}>
      <div className="flex items-center justify-between mb-1">
        <span className="text-[12.5px] font-medium text-foreground truncate">{dept}</span>
        <span className="text-[10.5px] font-mono tabular-nums text-muted-foreground">{d.count}</span>
      </div>
      <div className="text-[10.5px] font-mono text-muted-foreground">
        {d.restricted > 0 && <span className="text-destructive">{d.restricted} restricted · </span>}
        {d.high > 0      && <span className="text-primary">{d.high} high · </span>}
        {fmtNum(d.users7d)} users · {fmtNum(d.traffic7d)} ev
      </div>
      <div className="mt-1.5 h-1 rounded-full bg-muted overflow-hidden">
        <div className={`h-full ${tone === 'bad' ? 'bg-destructive' : tone === 'warn' ? 'bg-primary' : 'bg-brand-teal'}`}
             style={{ width: `${Math.max(8, norm * 100)}%` }} />
      </div>
    </div>
  );
}
