'use client';

import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { useMemo } from 'react';
import { ArrowLeft, Play, ShieldCheck, Calendar, Activity, Boxes, Pencil, Pause, PlayCircle, Archive, Trash2, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Chip } from '../../../govern/_shared';
import { RedTeamHeader, PostureBadge, fmtAgo, fmtCost } from '../../_shared';
import { useTargets, useRuns, useProbeSets, postureTrend, findingsForTarget, postureForTarget, setTargetStatus, removeTarget, probeSetsBoundToTarget } from '../../_store';
import { adapterById } from '../../_targetCatalog';

const STATUS_META = {
  draft:    { label: 'Draft',    color: 'var(--muted-foreground)' },
  active:   { label: 'Active',   color: 'var(--brand-teal)' },
  paused:   { label: 'Paused',   color: '#F59E0B' },
  archived: { label: 'Archived', color: 'var(--muted-foreground)' },
};

export default function TargetDetailPage() {
  const { id } = useParams();
  const router = useRouter();
  const targets = useTargets();
  const runs = useRuns();
  const probeSets = useProbeSets();
  const target = useMemo(() => targets.find(t => t.id === id) || null, [targets, id]);
  const targetRuns = useMemo(() => runs.filter(r => r.target_id === id), [runs, id]);
  const targetSets = useMemo(() => probeSets.filter(p => (p.target_ids || []).includes(id)), [probeSets, id]);
  const findings = useMemo(() => findingsForTarget(id), [id, runs]);
  const trend = useMemo(() => postureTrend(id, 30), [id, runs]);
  const posture = postureForTarget(id);

  if (!target) {
    return (
      <>
        <RedTeamHeader title="Targets" />
        <div className="max-w-[1680px] mx-auto px-4 sm:px-6 lg:px-8 py-7">
          <div className="rounded-lg border border-dashed border-border bg-card px-6 py-10 text-center">
            <div className="text-[13px] font-medium text-foreground">Target not found</div>
            <Link href="/app/redteam/targets" className="mt-4 inline-block text-[12px] text-primary hover:underline">All targets →</Link>
          </div>
        </div>
      </>
    );
  }

  const adapter = adapterById(target.adapter);

  return (
    <>
      <RedTeamHeader title="Targets" />
      <div className="max-w-[1680px] mx-auto px-4 sm:px-6 lg:px-8 py-7 space-y-5">
        <Link href="/app/redteam/targets" className="text-[12px] text-muted-foreground hover:text-foreground inline-flex items-center gap-1.5">
          <ArrowLeft className="h-3.5 w-3.5" /> All targets
        </Link>

        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap mb-1">
              <code className="text-[10.5px] font-mono text-muted-foreground">{target.id}</code>
              {(() => {
                const s = target.status || 'active';
                const meta = STATUS_META[s];
                return <Chip variant="mono" accent={meta.color} label={meta.label} />;
              })()}
              <PostureBadge score={posture} />
              <span className="text-[10.5px] font-mono text-muted-foreground">{adapter?.label || target.adapter}</span>
              <span className="text-[10.5px] font-mono text-muted-foreground">· env {target.scope?.environment}</span>
              {target.owner && (
                <span className="text-[10.5px] font-mono text-muted-foreground">· owner {target.owner}</span>
              )}
            </div>
            <h2 className="text-[20px] font-semibold tracking-tight text-foreground leading-tight">{target.name}</h2>
          </div>
          <div className="flex items-center gap-2 flex-wrap shrink-0">
            <Button
              variant="outline"
              size="sm"
              render={
                <Link href={`/app/redteam/targets/${target.id}/edit`}>
                  <Pencil className="h-3.5 w-3.5" /> Edit
                </Link>
              }
            />
            <LifecycleButtons target={target} router={router} />
            <Button size="sm" disabled={(target.status || 'active') !== 'active'}>
              <Play className="h-3.5 w-3.5" /> Run a suite
            </Button>
          </div>
        </div>

        {/* Lifecycle banners — surface the most important blocker first. */}
        <LifecycleBanner target={target} />

        <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
          <Stat label="Posture"      value={posture != null ? `${posture}/100` : '—'} tone={posture >= 90 ? 'ok' : posture >= 75 ? 'warn' : 'bad'} />
          <Stat label="Runs"          value={String(targetRuns.length)} />
          <Stat label="Findings"      value={String(findings.length)} tone={findings.length > 10 ? 'warn' : 'default'} />
          <Stat label="Regressions"   value={String(findings.filter(f => f.is_regression && f.status !== 'closed').length)} tone={findings.filter(f => f.is_regression).length ? 'bad' : 'ok'} />
          <Stat label="Last tested"   value={fmtAgo(target.last_tested_at)} />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-[1.2fr_1fr] gap-5">
          <section className="space-y-5">
            <Card title="Posture trend (30d)" hint={`${trend.length} runs charted`}>
              <PostureTrendChart trend={trend} />
            </Card>

            <Card title="Recent runs" link="/app/redteam/runs" linkLabel="All runs">
              {targetRuns.length === 0 ? (
                <div className="text-[12px] text-muted-foreground italic">No runs yet for this target.</div>
              ) : (
                <div className="-mx-4 divide-y divide-border/60">
                  {targetRuns.slice(0, 8).map(r => (
                    <Link key={r.id} href={`/app/redteam/runs/${r.id}`} className="px-4 py-2.5 flex items-center gap-3 hover:bg-muted/30 transition-colors">
                      <span className={`h-1.5 w-1.5 rounded-full shrink-0 ${
                        r.slo_breach ? 'bg-destructive' : r.bypassed > 0 ? 'bg-primary' : 'bg-brand-teal'
                      }`} />
                      <div className="min-w-0 flex-1">
                        <div className="text-[12px] font-medium text-foreground truncate">{r.suite_id}</div>
                        <div className="text-[10.5px] font-mono text-muted-foreground">
                          {fmtAgo(r.started_at)} · {r.passed}/{r.total} pass · {r.bypassed} bypass
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
            <Card title="Consent record" hint="Required before any run.">
              <div className="space-y-2 text-[12px]">
                <Row label="Granted by"><span className="font-mono">{target.consent_record?.granted_by || '—'}</span></Row>
                <Row label="Granted at"><span className="font-mono">{target.consent_record?.granted_at ? new Date(target.consent_record.granted_at).toLocaleDateString() : '—'}</span></Row>
                <Row label="Expires"><span className="font-mono">{target.consent_record?.expires_at ? new Date(target.consent_record.expires_at).toLocaleDateString() : '—'}</span></Row>
                <Row label="Allowed cats">
                  <div className="flex flex-wrap gap-1 justify-end">
                    {(target.consent_record?.allowed_categories || []).slice(0, 3).map(c => (
                      <span key={c} className="font-mono text-[10px] px-1.5 py-0.5 rounded border border-border bg-muted/40">{c}</span>
                    ))}
                  </div>
                </Row>
                <Row label="Severities">
                  <div className="flex flex-wrap gap-1 justify-end">
                    {(target.consent_record?.allowed_severities || []).map(s => (
                      <span key={s} className="font-mono text-[10px] px-1.5 py-0.5 rounded border border-border bg-muted/40">{s}</span>
                    ))}
                  </div>
                </Row>
              </div>
            </Card>

            <Card title="Scope" hint="Runner hard-limits.">
              <div className="space-y-2 text-[12px]">
                <Row label="Environment"><span className="font-mono">{target.scope?.environment}</span></Row>
                <Row label="Rate limit"><span className="font-mono">{target.scope?.rate_limit_rps} rps</span></Row>
                <Row label="Max tokens / run"><span className="font-mono tabular-nums">{(target.scope?.max_tokens_per_run || 0).toLocaleString()}</span></Row>
              </div>
            </Card>

            <Card title="Bound probe sets" hint="These probe sets target this asset.">
              {targetSets.length === 0 ? (
                <div className="text-[12px] text-muted-foreground italic">No probe sets bound yet.</div>
              ) : (
                <div className="space-y-1">
                  {targetSets.map(ps => (
                    <Link
                      key={ps.id}
                      href={`/app/redteam/suites/${ps.id}`}
                      className="flex items-center gap-2 px-2.5 py-1.5 rounded border border-border bg-background hover:border-primary/40 hover:bg-primary/[0.03] transition-colors"
                    >
                      <Boxes className="h-3 w-3 text-muted-foreground" />
                      <span className="text-[11.5px] font-medium text-foreground truncate flex-1">{ps.name}</span>
                      {ps.schedule?.enabled && <Calendar className="h-3 w-3 text-primary shrink-0" />}
                    </Link>
                  ))}
                </div>
              )}
            </Card>
          </aside>
        </div>
      </div>
    </>
  );
}

function PostureTrendChart({ trend }) {
  if (!trend.length) {
    return <div className="text-[12px] text-muted-foreground italic py-4 text-center">No completed runs yet.</div>;
  }
  const W = 600;
  const H = 80;
  const padX = 10;
  const minX = trend[0].t;
  const maxX = trend[trend.length - 1].t;
  const spanX = Math.max(1, maxX - minX);
  const pts = trend.map(p => ({
    x: padX + ((p.t - minX) / spanX) * (W - 2 * padX),
    y: H - 6 - (p.score / 100) * (H - 12),
    score: p.score,
  }));
  const d = pts.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ');
  const lastScore = trend[trend.length - 1].score;
  const firstScore = trend[0].score;
  const delta = lastScore - firstScore;
  return (
    <div>
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full" preserveAspectRatio="none">
        <line x1={padX} y1={H - 6} x2={W - padX} y2={H - 6} stroke="currentColor" className="text-border" strokeWidth="0.5" />
        <line x1={padX} y1={H / 2}     x2={W - padX} y2={H / 2}     stroke="currentColor" className="text-border/40" strokeDasharray="2 2" strokeWidth="0.5" />
        <path d={d} fill="none" stroke="var(--destructive)" strokeWidth="1.5" />
        {pts.map((p, i) => (
          <circle key={i} cx={p.x} cy={p.y} r="2" fill="var(--destructive)" />
        ))}
      </svg>
      <div className="flex items-center justify-between mt-1 text-[10.5px] font-mono text-muted-foreground">
        <span>{trend.length} runs</span>
        <span className={delta < 0 ? 'text-destructive' : delta > 0 ? 'text-brand-teal' : ''}>
          {delta > 0 ? '+' : ''}{delta} over 30d
        </span>
      </div>
    </div>
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
          <Link href={link} className="text-[11.5px] text-primary hover:brightness-110 font-medium shrink-0">
            {linkLabel} →
          </Link>
        )}
      </div>
      <div className="px-4 py-3">{children}</div>
    </div>
  );
}
function Stat({ label, value, sub, tone = 'default' }) {
  const color = tone === 'bad'  ? 'text-destructive'
              : tone === 'warn' ? 'text-(--chart-3)'
              : tone === 'ok'   ? 'text-brand-teal'
              :                   'text-foreground';
  return (
    <div className="rounded-lg border border-border bg-card px-3 py-2">
      <div className="text-[10.5px] font-medium uppercase tracking-[0.1em] text-muted-foreground">{label}</div>
      <div className={`mt-0.5 text-[17px] font-semibold tabular-nums ${color} truncate`}>{value}</div>
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

/* Status-dependent action buttons. Only show transitions that make sense:
     draft    → Activate
     active   → Pause, Archive
     paused   → Resume, Archive
     archived → Restore
   Manually-added targets that have no probe sets bound and no runs also
   get a Delete option (hard delete; otherwise Archive is the soft path). */
function LifecycleButtons({ target, router }) {
  const status = target.status || 'active';
  const bound = probeSetsBoundToTarget(target.id);

  // Hard-delete is only safe when nothing references the target.
  const canHardDelete = bound === 0 && (!target.last_tested_at);

  const archive = () => {
    if (bound > 0) {
      const ok = confirm(
        `${bound} probe set${bound === 1 ? '' : 's'} reference this target. ` +
        `Archiving will hide it from default views and block new runs, but bound suites stay attached. Continue?`,
      );
      if (!ok) return;
    }
    setTargetStatus(target.id, 'archived');
  };

  const hardDelete = () => {
    if (!confirm(`Delete "${target.name}"? This permanently removes the target.`)) return;
    removeTarget(target.id);
    router.push('/app/redteam/targets');
  };

  return (
    <>
      {status === 'draft' && (
        <Button
          variant="outline"
          size="sm"
          onClick={() => setTargetStatus(target.id, 'active')}
          className="border-(--brand-teal)/40 text-brand-teal hover:bg-(--brand-teal)/10"
        >
          <PlayCircle className="h-3.5 w-3.5" /> Activate
        </Button>
      )}
      {status === 'active' && (
        <Button
          variant="outline"
          size="sm"
          onClick={() => setTargetStatus(target.id, 'paused')}
          className="border-(--chart-3)/40 text-(--chart-3) hover:bg-(--chart-3)/10"
        >
          <Pause className="h-3.5 w-3.5" /> Pause
        </Button>
      )}
      {status === 'paused' && (
        <Button
          variant="outline"
          size="sm"
          onClick={() => setTargetStatus(target.id, 'active')}
          className="border-(--brand-teal)/40 text-brand-teal hover:bg-(--brand-teal)/10"
        >
          <PlayCircle className="h-3.5 w-3.5" /> Resume
        </Button>
      )}
      {status !== 'archived' && (
        <Button
          variant="outline"
          size="sm"
          onClick={archive}
        >
          <Archive className="h-3.5 w-3.5" /> Archive
        </Button>
      )}
      {status === 'archived' && (
        <Button
          variant="outline"
          size="sm"
          onClick={() => setTargetStatus(target.id, 'active')}
          className="border-(--brand-teal)/40 text-brand-teal hover:bg-(--brand-teal)/10"
        >
          <PlayCircle className="h-3.5 w-3.5" /> Restore
        </Button>
      )}
      {canHardDelete && (
        <Button
          variant="outline"
          size="sm"
          onClick={hardDelete}
          className="border-destructive/40 text-destructive hover:bg-destructive/10"
        >
          <Trash2 className="h-3.5 w-3.5" /> Delete
        </Button>
      )}
    </>
  );
}

/* One-line banner that surfaces the single most important lifecycle
   blocker for this target. Picked by priority:
     1. consent expired
     2. status archived
     3. status paused
     4. status draft + no runs ever
     5. consent expiring within 14 days
   Returns null if nothing to surface. */
function LifecycleBanner({ target }) {
  const status = target.status || 'active';
  const consent = target.consent_record || {};
  const now = Date.now();
  const expiresAt = consent.expires_at;
  const expiresIn = expiresAt ? expiresAt - now : null;
  const DAY = 86_400_000;

  let kind = null;
  let message = null;
  if (expiresAt && expiresIn < 0) {
    kind = 'bad';
    message = `Consent expired ${fmtAgo(expiresAt)}. Renew the consent record before running new suites.`;
  } else if (status === 'archived') {
    kind = 'muted';
    message = 'This target is archived. Runs cannot be launched; history is preserved for audit.';
  } else if (status === 'paused') {
    kind = 'warn';
    message = 'Target is paused. Bound probe sets still exist, but no new runs will execute.';
  } else if (status === 'draft') {
    kind = 'warn';
    message = 'Target is in draft. Activate it from the buttons above to allow runs.';
  } else if (expiresAt && expiresIn < 14 * DAY) {
    const days = Math.max(1, Math.round(expiresIn / DAY));
    kind = 'warn';
    message = `Consent expires in ${days} day${days === 1 ? '' : 's'}. Renew before that to avoid run interruption.`;
  }

  if (!kind) return null;

  const cls = kind === 'bad'
    ? 'border-destructive/40 bg-destructive/[0.05] text-destructive'
    : kind === 'warn'
      ? 'border-(--chart-3)/40 bg-(--chart-3)/[0.06] text-foreground'
      : 'border-border bg-muted/40 text-muted-foreground';

  return (
    <div className={`flex items-center gap-2 rounded-md border px-3 py-2 text-[12px] ${cls}`}>
      <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
      <span className="min-w-0">{message}</span>
    </div>
  );
}
