'use client';

import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { useMemo } from 'react';
import { ArrowLeft, Play, Calendar } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { RedTeamHeader, fmtAgo, fmtCost } from '../../_shared';
import { useProbeSets, useTargets, useRuns, launchRun } from '../../_store';
import { suiteById } from '../../_targetCatalog';
import { resolveSuiteAttacks, estimateRunCost } from '../../_runEngine';

export default function ProbeSetDetailPage() {
  const { id } = useParams();
  const router = useRouter();
  const probeSets = useProbeSets();
  const targets = useTargets();
  const allRuns = useRuns();

  const ps = useMemo(() => probeSets.find(p => p.id === id) || null, [probeSets, id]);
  const suite = useMemo(() => ps ? suiteById(ps.suite_id) : null, [ps]);
  const boundTargets = useMemo(
    () => ps ? targets.filter(t => (ps.target_ids || []).includes(t.id)) : [],
    [ps, targets],
  );
  const runs = useMemo(
    () => ps ? allRuns.filter(r => r.probe_set_id === ps.id) : [],
    [ps, allRuns],
  );

  if (!ps || !suite) {
    return (
      <>
        <RedTeamHeader title="Suites" />
        <div className="max-w-[1680px] mx-auto px-4 sm:px-6 lg:px-8 py-7">
          <div className="rounded-lg border border-dashed border-border bg-card px-6 py-10 text-center">
            <div className="text-[13px] font-medium text-foreground">Probe set not found</div>
            <Link href="/app/redteam/suites" className="mt-4 inline-block text-[12px] text-primary hover:underline">All suites →</Link>
          </div>
        </div>
      </>
    );
  }

  const attacks = resolveSuiteAttacks(suite);
  const cost = estimateRunCost(suite);

  const onLaunch = (targetId) => {
    const { run } = launchRun({ probeSetId: ps.id, targetId, suiteId: suite.id, triggeredBy: 'manual' });
    router.push(`/app/redteam/runs/${run.id}`);
  };

  return (
    <>
      <RedTeamHeader title="Suites" />
      <div className="max-w-[1680px] mx-auto px-4 sm:px-6 lg:px-8 py-7 space-y-5">
        <Link href="/app/redteam/suites" className="text-[12px] text-muted-foreground hover:text-foreground inline-flex items-center gap-1.5">
          <ArrowLeft className="h-3.5 w-3.5" /> All suites
        </Link>

        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap mb-1">
              <code className="text-[10.5px] font-mono text-muted-foreground">{ps.id}</code>
              <span className="text-[10.5px] font-mono uppercase tracking-[0.12em] px-1.5 py-0.5 rounded border border-border bg-muted/40 text-foreground/85">{suite.kind}</span>
              {ps.schedule?.enabled && (
                <span className="text-[10.5px] font-mono uppercase tracking-[0.12em] px-1.5 py-0.5 rounded border border-primary/40 bg-primary/10 text-primary inline-flex items-center gap-1">
                  <Calendar className="h-3 w-3" /> scheduled
                </span>
              )}
            </div>
            <h2 className="text-[20px] font-semibold tracking-tight text-foreground leading-tight">{ps.name}</h2>
            <p className="mt-1 text-[12.5px] text-muted-foreground max-w-[80ch] leading-relaxed">{suite.description}</p>
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
          <Stat label="Probes resolved" value={String(attacks.length)} />
          <Stat label="Targets" value={String(boundTargets.length)} />
          <Stat label="Est. tokens" value={`${(cost.tokens / 1000).toFixed(0)}k`} />
          <Stat label="Est. cost" value={fmtCost(cost.cost_usd)} />
          <Stat label="Last run" value={fmtAgo(ps.schedule?.last_run_at)} />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-[1.2fr_1fr] gap-5">
          <section className="space-y-5">
            <Card title="Bound targets" hint="Pick one to launch the suite against.">
              <div className="space-y-2">
                {boundTargets.map(t => (
                  <div key={t.id} className="rounded-md border border-border bg-background px-3 py-2.5 flex items-center gap-3">
                    <div className="flex-1 min-w-0">
                      <Link href={`/app/redteam/targets/${t.id}`} className="text-[12.5px] font-medium text-foreground hover:text-primary truncate block">{t.name}</Link>
                      <div className="text-[10.5px] font-mono text-muted-foreground truncate">{t.type} · {t.scope?.environment} · {t.id}</div>
                    </div>
                    <Button size="sm" onClick={() => onLaunch(t.id)} className="bg-destructive text-destructive-foreground hover:brightness-110">
                      <Play className="h-3.5 w-3.5" /> Run
                    </Button>
                  </div>
                ))}
              </div>
            </Card>

            <Card title="Run history" hint={`${runs.length} runs`}>
              {runs.length === 0 ? (
                <div className="text-[12px] text-muted-foreground italic">No runs yet. Launch one above.</div>
              ) : (
                <div className="-mx-4 divide-y divide-border/60">
                  {runs.slice(0, 12).map(r => (
                    <Link key={r.id} href={`/app/redteam/runs/${r.id}`} className="px-4 py-2.5 flex items-center gap-3 hover:bg-muted/30 transition-colors">
                      <span className={`h-1.5 w-1.5 rounded-full shrink-0 ${
                        r.slo_breach ? 'bg-destructive' : r.bypassed > 0 ? 'bg-primary' : 'bg-brand-teal'
                      }`} />
                      <div className="min-w-0 flex-1">
                        <div className="text-[12px] font-medium text-foreground truncate">{r.id}</div>
                        <div className="text-[10.5px] font-mono text-muted-foreground">
                          {fmtAgo(r.started_at)} · target {r.target_id} · {r.passed}/{r.total} pass
                          {r.regressions > 0 && <span className="text-destructive"> · {r.regressions} regression</span>}
                        </div>
                      </div>
                      <span className="font-mono tabular-nums text-[10.5px] text-muted-foreground">{fmtCost(r.cost_usd)}</span>
                    </Link>
                  ))}
                </div>
              )}
            </Card>
          </section>

          <aside className="space-y-5">
            <Card title="Suite filter" hint="Declarative — resolved against current library on every run.">
              <pre className="text-[11px] font-mono text-foreground/90 bg-muted/30 border border-border rounded px-3 py-2 whitespace-pre-wrap overflow-x-auto">
{JSON.stringify(suite.filter, null, 2)}
              </pre>
            </Card>

            <Card title="SLO thresholds">
              <div className="space-y-2 text-[12px]">
                {Object.entries(suite.slo_thresholds || {}).map(([k, v]) => (
                  <div key={k} className="flex items-baseline justify-between gap-3">
                    <span className="text-[10.5px] font-mono uppercase tracking-[0.1em] text-muted-foreground">{k.replace(/_/g, ' ')}</span>
                    <span className="font-mono tabular-nums text-foreground">{v}</span>
                  </div>
                ))}
              </div>
            </Card>

            <Card title="Schedule + triggers">
              <div className="space-y-2 text-[12px]">
                <Row label="Cron"><code className="font-mono">{ps.schedule?.cron || '—'}</code></Row>
                <Row label="Enabled"><span className="font-mono">{ps.schedule?.enabled ? 'yes' : 'no'}</span></Row>
                <Row label="On deploy"><span className="font-mono">{ps.triggers?.on_deploy ? 'yes' : 'no'}</span></Row>
                <Row label="On policy change"><span className="font-mono">{ps.triggers?.on_policy_change ? 'yes' : 'no'}</span></Row>
                <Row label="Next run"><span className="font-mono text-muted-foreground">{ps.schedule?.next_run_at ? new Date(ps.schedule.next_run_at).toLocaleString() : '—'}</span></Row>
                <Row label="Owner"><span className="font-mono">{ps.owner}</span></Row>
              </div>
            </Card>
          </aside>
        </div>
      </div>
    </>
  );
}

function Card({ title, hint, children }) {
  return (
    <div className="rounded-xl border border-border bg-card overflow-hidden">
      <div className="px-4 py-2.5 border-b border-border flex items-baseline justify-between gap-3">
        <div className="text-[10.5px] uppercase tracking-[0.16em] font-mono text-muted-foreground">{title}</div>
        {hint && <div className="text-[10.5px] text-muted-foreground/80 truncate max-w-[60%]">{hint}</div>}
      </div>
      <div className="px-4 py-3">{children}</div>
    </div>
  );
}
function Row({ label, children }) {
  return (
    <div className="flex items-baseline justify-between gap-3">
      <span className="text-[10.5px] font-mono uppercase tracking-[0.1em] text-muted-foreground">{label}</span>
      <span className="text-foreground">{children}</span>
    </div>
  );
}
function Stat({ label, value }) {
  return (
    <div className="rounded-lg border border-border bg-card px-3 py-2">
      <div className="text-[10.5px] font-medium uppercase tracking-[0.1em] text-muted-foreground">{label}</div>
      <div className="mt-0.5 text-[17px] font-semibold tabular-nums text-foreground truncate">{value}</div>
    </div>
  );
}
