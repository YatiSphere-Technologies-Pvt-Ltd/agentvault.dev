'use client';

import Link from 'next/link';
import { useMemo } from 'react';
import {
  ShieldAlert, AlertOctagon, ChevronRight, TrendingUp, TrendingDown,
  Boxes, Target as TargetIcon, BookText, Play,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { RedTeamHeader, SeverityPill, VerdictPill, CategoryPill, PostureBadge, fmtAgo, fmtNum, fmtCost } from './_shared';
import { useTargets, useRuns, useFindings, platformPostureScore, openRegressions } from './_store';
import { attackById, attackStats, LIBRARY_VERSION } from './_attackCatalog';

/* Red Team overview — the CISO landing page.

   PRD framing: "the platform proves its own policies work." Every tile
   on this page exists to answer that question. */

export default function RedTeamOverviewPage() {
  const targets = useTargets();
  const runs = useRuns();
  const findings = useFindings();

  const platformScore = useMemo(() => platformPostureScore(), [targets, runs]);
  const regressions = useMemo(() => openRegressions(), [findings]);
  const stats = useMemo(() => attackStats(), []);

  // Aggregate counters
  const openFindings = findings.filter(f => f.status === 'open').length;
  const inReview = findings.filter(f => f.status === 'pending-review').length;
  const sloBreaches = runs.filter(r => r.slo_breach).length;
  const lastWeekRuns = runs.filter(r => Date.now() - r.started_at < 7 * 24 * 60 * 60_000).length;

  // Top failing categories — count bypasses per category
  const byCategory = findings.reduce((acc, f) => {
    if (f.verdict !== 'bypass') return acc;
    const cat = attackById(f.attack_id)?.category;
    if (!cat) return acc;
    acc[cat] = (acc[cat] || 0) + 1;
    return acc;
  }, {});
  const topCategories = Object.entries(byCategory).sort(([, a], [, b]) => b - a).slice(0, 6);
  const topMax = topCategories[0]?.[1] || 1;

  return (
    <>
      <RedTeamHeader />

      <div className="max-w-[1680px] mx-auto px-4 sm:px-6 lg:px-8 py-7 space-y-6">
        {/* Hero: platform posture score + thesis */}
        <PostureHero score={platformScore} regressions={regressions.length} runs7d={lastWeekRuns} />

        {/* Stat cards — anchored to CISO questions */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
          <QuestionCard
            question="How big is our attack corpus?"
            value={String(stats.total)}
            sub={`library ${LIBRARY_VERSION} · 9 categories · 7 locales`}
            href="/app/redteam/library"
            cta="Browse library"
            icon={<BookText className="h-3.5 w-3.5" />}
          />
          <QuestionCard
            question="How many AI targets are we exercising?"
            value={String(targets.length)}
            sub={`${runs.filter(r => Date.now() - r.started_at < 24 * 60 * 60_000).length} runs in last 24h`}
            href="/app/redteam/targets"
            cta="Targets"
            icon={<TargetIcon className="h-3.5 w-3.5" />}
          />
          <QuestionCard
            question="Where are findings concentrated?"
            value={String(openFindings)}
            sub={`${inReview} in review · ${regressions.length} regressions`}
            href="/app/redteam/runs"
            cta="Open runs"
            tone={openFindings > 30 ? 'warn' : 'default'}
            icon={<AlertOctagon className="h-3.5 w-3.5" />}
          />
          <QuestionCard
            question="Are we breaching our SLOs?"
            value={String(sloBreaches)}
            sub={`out of ${runs.length} runs total`}
            href="/app/redteam/runs"
            cta="See runs"
            tone={sloBreaches > 0 ? 'bad' : 'ok'}
            icon={<Play className="h-3.5 w-3.5" />}
          />
        </div>

        {/* Two-column body */}
        <div className="grid grid-cols-1 lg:grid-cols-[1.2fr_1fr] gap-5">
          <div className="space-y-5">
            <Card
              title="Open regressions"
              hint="Attacks that previously passed and now bypass — fix first."
              link="/app/redteam/runs"
              linkLabel="All runs"
            >
              {regressions.length === 0 ? (
                <div className="text-[12px] text-muted-foreground italic px-1 py-2">
                  No open regressions. Nothing that used to pass is failing right now.
                </div>
              ) : (
                <div className="-mx-4 divide-y divide-border/60">
                  {regressions.slice(0, 8).map(f => {
                    const a = attackById(f.attack_id);
                    return (
                      <Link
                        key={f.id}
                        href={`/app/redteam/findings/${f.id}`}
                        className="px-4 py-3 flex items-start gap-3 hover:bg-muted/40 transition-colors"
                      >
                        <VerdictPill verdict={f.verdict} isRegression />
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2 flex-wrap mb-0.5">
                            <span className="text-[12.5px] font-medium text-foreground truncate">
                              {a?.name || f.attack_id}
                            </span>
                            <SeverityPill severity={f.severity} />
                            {a && <CategoryPill category={a.category} />}
                          </div>
                          <div className="text-[10.5px] font-mono text-muted-foreground truncate">
                            target {f.target_id} · {fmtAgo(f.created_at)} · CVSS {f.cvss_ai_score}
                          </div>
                        </div>
                        <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
                      </Link>
                    );
                  })}
                </div>
              )}
            </Card>

            <Card
              title="Top failing categories"
              hint="Where the platform leaks the most. Prioritize remediation here."
            >
              {topCategories.length === 0 ? (
                <div className="text-[12px] text-muted-foreground italic">All clear.</div>
              ) : (
                <div className="space-y-2">
                  {topCategories.map(([cat, count]) => (
                    <div key={cat} className="flex items-center gap-3">
                      <div className="w-44 shrink-0">
                        <CategoryPill category={cat} />
                      </div>
                      <div className="flex-1 h-2 rounded-full bg-muted overflow-hidden">
                        <div
                          className="h-full bg-destructive/70"
                          style={{ width: `${Math.round((count / topMax) * 100)}%` }}
                        />
                      </div>
                      <span className="font-mono text-[12px] tabular-nums text-foreground w-8 text-right">{count}</span>
                    </div>
                  ))}
                </div>
              )}
            </Card>
          </div>

          <aside className="space-y-5">
            <Card title="Recent runs" link="/app/redteam/runs" linkLabel="All">
              <div className="-mx-4 divide-y divide-border/60">
                {runs.slice(0, 6).map(r => (
                  <Link
                    key={r.id}
                    href={`/app/redteam/runs/${r.id}`}
                    className="px-4 py-2.5 flex items-center gap-3 hover:bg-muted/30 transition-colors"
                  >
                    <div className={`h-1.5 w-1.5 rounded-full shrink-0 ${
                      r.slo_breach ? 'bg-destructive' : r.bypassed > 0 ? 'bg-(--chart-3)' : 'bg-brand-teal'
                    }`} />
                    <div className="min-w-0 flex-1">
                      <div className="text-[12px] font-medium text-foreground truncate">{r.suite_id} → {r.target_id}</div>
                      <div className="text-[10.5px] font-mono text-muted-foreground">
                        {fmtAgo(r.started_at)} · {r.passed}/{r.total} pass · {r.bypassed} bypass
                        {r.regressions > 0 && <span className="text-destructive"> · {r.regressions} regression{r.regressions === 1 ? '' : 's'}</span>}
                      </div>
                    </div>
                    {r.posture_delta != null && (
                      <span className={`inline-flex items-center gap-0.5 text-[10.5px] font-mono ${
                        r.posture_delta < 0 ? 'text-destructive' : r.posture_delta > 0 ? 'text-brand-teal' : 'text-muted-foreground'
                      }`}>
                        {r.posture_delta < 0 ? <TrendingDown className="h-3 w-3" /> : r.posture_delta > 0 ? <TrendingUp className="h-3 w-3" /> : null}
                        {r.posture_delta > 0 ? '+' : ''}{r.posture_delta}
                      </span>
                    )}
                  </Link>
                ))}
              </div>
            </Card>

            <Card title="Why this matters">
              <div className="space-y-2.5 text-[12px] text-muted-foreground leading-relaxed">
                <p>
                  Detection and policy are <span className="text-foreground">commodities</span> within 18 months.
                  The defensible differentiator is a curated, evolving adversarial corpus plus a runner that ties
                  findings back to controls.
                </p>
                <p className="text-foreground/85">
                  The platform proves its own policies work, and regresses cleanly when they stop working.
                </p>
                <Link href="/app/grc" className="inline-flex items-center gap-1 text-[11.5px] text-primary hover:underline">
                  See controls that map to red-team findings → GRC
                </Link>
              </div>
            </Card>
          </aside>
        </div>
      </div>
    </>
  );
}

/* ─────────── building blocks ─────────── */

function PostureHero({ score, regressions, runs7d }) {
  const tone = score == null ? 'muted'
             : score >= 90 ? 'ok'
             : score >= 75 ? 'warn'
             : 'bad';
  const numberColor = tone === 'bad' ? 'text-destructive'
                    : tone === 'warn' ? 'text-foreground'
                    : tone === 'ok' ? 'text-brand-teal'
                    : 'text-foreground';
  // Calm white card + thin top-border accent. Same pattern as RiskHero
  // in Govern — keeps the page neutral and reserves red for genuine bad.
  const accentBorder = tone === 'bad' ? 'border-t-destructive'
                     : tone === 'warn' ? 'border-t-(--chart-3)'
                     : tone === 'ok' ? 'border-t-(--brand-teal)'
                     : 'border-t-border';
  const iconBg = tone === 'bad' ? 'bg-destructive/10 text-destructive'
              : tone === 'warn' ? 'bg-(--chart-3)/15 text-foreground'
              : tone === 'ok' ? 'bg-(--brand-teal)/12 text-brand-teal'
              : 'bg-muted text-muted-foreground';
  return (
    <div className={`rounded-xl border border-border ${accentBorder} border-t-2 bg-card px-5 py-4 flex items-center gap-5 flex-wrap`}>
      <div className="flex items-center gap-3 min-w-0">
        <div className={`h-12 w-12 rounded-md flex items-center justify-center ${iconBg}`}>
          <ShieldAlert className="h-6 w-6" />
        </div>
        <div>
          <div className="text-[10.5px] uppercase tracking-[0.16em] font-mono text-muted-foreground">Platform posture score</div>
          <div className="flex items-baseline gap-2">
            <span className={`text-[36px] font-semibold tabular-nums leading-none ${numberColor}`}>{score ?? '—'}</span>
            <span className="text-[12px] font-mono text-muted-foreground">/ 100</span>
          </div>
        </div>
      </div>

      <div className="flex-1 min-w-0">
        <div className="text-[12px] text-foreground/85 leading-relaxed">
          {score >= 90
            ? 'Strong posture — keep monitoring for novel attack variants and library updates.'
            : score >= 75
              ? 'Acceptable posture — actionable gaps remain in the higher-severity categories.'
              : 'Significant exposure — prioritize the open regressions and SLO-breaching suites.'}
        </div>
      </div>

      <div className="flex items-center gap-3 shrink-0">
        <Stat label="Regressions"  value={regressions}  tone={regressions ? 'bad' : 'ok'} />
        <Stat label="Runs · 7d"    value={runs7d}       tone="default" />
        <Button size="sm" render={<Link href="/app/redteam/runs">View runs</Link>} />
      </div>
    </div>
  );
}

function Stat({ label, value, tone }) {
  const dot = tone === 'ok'   ? 'var(--brand-teal)'
            : tone === 'warn' ? '#F59E0B'
            : tone === 'bad'  ? 'var(--destructive)'
            : 'var(--muted-foreground)';
  return (
    <span className="inline-flex items-center gap-1.5 px-2 py-1 rounded-md border border-border bg-muted/60 text-[11px] font-medium text-foreground">
      <span className="h-1.5 w-1.5 rounded-full shrink-0" style={{ background: dot }} />
      <span className="font-mono tabular-nums">{value}</span>
      <span className="text-muted-foreground">{label}</span>
    </span>
  );
}

function QuestionCard({ question, value, sub, href, cta, tone = 'default', icon }) {
  // 'warn' uses amber (chart-3) so it reads distinct from the default
  // (indigo-flavored CTAs). Red stays for genuine alarm only.
  const color = tone === 'bad' ? 'text-destructive'
              : tone === 'warn' ? 'text-(--chart-3)'
              : tone === 'ok' ? 'text-brand-teal'
              : 'text-foreground';
  return (
    <Link
      href={href}
      className="group rounded-xl border border-border bg-card p-4 hover:border-primary/40 hover:shadow-sm transition-all flex flex-col"
    >
      <div className="text-[11px] text-muted-foreground leading-snug mb-2 min-h-[2.4em] inline-flex items-start gap-1.5">
        {icon}
        <span>{question}</span>
      </div>
      <div className="flex items-baseline gap-2 mb-1">
        <div className={`text-[28px] font-semibold tabular-nums leading-none ${color}`}>{value}</div>
      </div>
      <div className="text-[11px] font-mono text-muted-foreground mt-1 truncate">{sub}</div>
      <div className="mt-auto pt-2 inline-flex items-center gap-1 text-[11.5px] text-primary group-hover:underline">
        {cta} <ChevronRight className="h-3.5 w-3.5" />
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
          <Link href={link} className="text-[11.5px] text-primary hover:brightness-110 font-medium shrink-0 inline-flex items-center gap-1">
            {linkLabel} <ChevronRight className="h-3.5 w-3.5" />
          </Link>
        )}
      </div>
      <div className="px-4 py-3">{children}</div>
    </div>
  );
}
