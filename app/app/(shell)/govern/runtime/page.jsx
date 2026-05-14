'use client';

import Link from 'next/link';
import { useMemo } from 'react';
import {
  ShieldAlert, Ban, Eye, EyeOff, Gauge, ArrowRight, ChevronRight,
  CheckCircle2, AlertOctagon, Sparkles, FileSearch,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { GovernHeader, RuntimeSubNav } from '../_shared';
import { useDlpRules, useGatewayConfig, compileGatewayBundle, deployGateway } from '../_store';

/* Runtime overview — the landing page for the gateway + DLP product area.

   Three goals, top to bottom:
     1. Make the gateway look like it's actually running (status hero).
     2. Summarize what's enforced (DLP rules card).
     3. Give the user a way to act — try a prompt, edit a rule, redeploy. */

const ACTION_TONE = {
  block:  { color: 'var(--destructive)',     label: 'Block' },
  redact: { color: 'var(--accent)',          label: 'Redact' },
  warn:   { color: 'var(--accent)',          label: 'Warn' },
  log:    { color: 'var(--muted-foreground)',label: 'Log' },
};

export default function RuntimeOverviewPage() {
  const rules = useDlpRules();
  const gw = useGatewayConfig();

  const stats = useMemo(() => {
    const enabled = rules.filter(r => r.enabled !== false);
    const byAction = enabled.reduce((acc, r) => { acc[r.action] = (acc[r.action] || 0) + 1; return acc; }, {});
    const hits7d = enabled.reduce((s, r) => s + (r.hits_7d || 0), 0);
    const critical = enabled.filter(r => r.severity === 'critical').length;
    return { enabled: enabled.length, total: rules.length, byAction, hits7d, critical };
  }, [rules]);

  return (
    <>
      <GovernHeader />
      <RuntimeSubNav />

      <div className="max-w-[1680px] mx-auto px-4 sm:px-6 lg:px-8 py-7 space-y-6">
        {/* Gateway status hero */}
        <GatewayHero gw={gw} stats={stats} />

        {/* Three-up content row */}
        <div className="grid grid-cols-1 lg:grid-cols-[1.3fr_1fr] gap-5">
          <section className="space-y-5">
            <Card
              title="DLP rules in effect"
              hint={`${stats.enabled} of ${stats.total} enabled · ${stats.hits7d.toLocaleString()} hits / 7d`}
              link="/app/govern/runtime/dlp"
              linkLabel="Manage rules"
            >
              <div className="space-y-1.5">
                {rules.map(r => (
                  <Link
                    key={r.id}
                    href={`/app/govern/runtime/dlp/${r.id}`}
                    className="flex items-center gap-3 px-3 py-2 rounded-md border border-border bg-background hover:border-primary/40 hover:bg-primary/[0.02] transition-colors"
                  >
                    <ActionBadge action={r.action} />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className={`text-[12.5px] font-medium ${r.enabled === false ? 'text-muted-foreground line-through' : 'text-foreground'} truncate`}>
                          {r.name}
                        </span>
                        <SeverityChip severity={r.severity} />
                      </div>
                      <div className="text-[10.5px] font-mono text-muted-foreground truncate">
                        match: {(Array.isArray(r.match) ? r.match : [r.match]).join(' · ')}
                      </div>
                    </div>
                    <div className="shrink-0 text-right">
                      <div className="text-[11.5px] font-mono tabular-nums text-foreground">{(r.hits_7d || 0).toLocaleString()}</div>
                      <div className="text-[9.5px] font-mono text-muted-foreground">hits · 7d</div>
                    </div>
                    {r.enabled === false ? (
                      <EyeOff className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                    ) : (
                      <Eye className="h-3.5 w-3.5 text-foreground/60 shrink-0" />
                    )}
                  </Link>
                ))}
              </div>
            </Card>
          </section>

          <aside className="space-y-5">
            <Card title="Try a prompt" hint="See exactly what the gateway would do.">
              <div className="text-[12.5px] text-muted-foreground leading-relaxed mb-3">
                Paste real or sample text into the Prompt Inspector. The
                same engine that runs at the gateway evaluates it locally —
                findings highlighted, decision explained, redactions
                applied inline.
              </div>
              <Link href="/app/govern/runtime/inspector">
                <Button size="sm" className="w-full">
                  <FileSearch className="h-3.5 w-3.5" /> Open Prompt Inspector
                </Button>
              </Link>
            </Card>

            <Card title="Hooks served" hint="Where DLP runs in the lifecycle.">
              <ul className="space-y-1.5 text-[12px]">
                <HookRow name="prompt.intercept"   count={stats.enabled} desc="Before the prompt leaves the perimeter" />
                <HookRow name="response.intercept" count={gw.inspect_response ? stats.enabled : 0} desc="Scan model replies for system-prompt leakage" />
                <HookRow name="egress.classify"    count={stats.enabled} desc="Tag traffic by destination + data class" />
                <HookRow name="discovery.detect"   count={1} desc="Newly seen AI assets surface in the inventory" />
              </ul>
            </Card>
          </aside>
        </div>
      </div>
    </>
  );
}

/* ────── components ────── */

function GatewayHero({ gw, stats }) {
  const lastDeployedAgo = gw.last_deployed_at ? fmtAgo(gw.last_deployed_at) : '—';
  const compiledAfterDeploy = gw.last_compiled_at && gw.last_deployed_at && gw.last_compiled_at > gw.last_deployed_at;

  return (
    <div className="rounded-xl border border-destructive/30 bg-destructive/[0.03] overflow-hidden">
      <div className="px-5 py-4 flex items-start justify-between gap-5 flex-wrap">
        <div className="flex items-start gap-3 min-w-0">
          <div className="h-12 w-12 rounded-md bg-destructive/10 text-destructive flex items-center justify-center shrink-0">
            <Gauge className="h-6 w-6" />
          </div>
          <div className="min-w-0">
            <div className="text-[10.5px] uppercase tracking-[0.16em] font-mono text-muted-foreground">AI gateway</div>
            <div className="text-[18px] font-semibold text-foreground leading-tight">{gw.name || 'AgentVault AI Gateway'}</div>
            <div className="mt-1 flex items-center gap-2 flex-wrap text-[11.5px]">
              <span className="inline-flex items-center gap-1 text-brand-teal font-mono">
                <CheckCircle2 className="h-3.5 w-3.5" /> deployed · {lastDeployedAgo}
              </span>
              <span className="text-muted-foreground">·</span>
              <span className="text-muted-foreground font-mono">
                bundle {gw.bundle_size_kb || 0} KB · {stats.enabled} rules
              </span>
              {compiledAfterDeploy && (
                <span className="inline-flex items-center gap-1 text-primary font-mono">
                  · <AlertOctagon className="h-3 w-3" /> pending redeploy
                </span>
              )}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-2 shrink-0">
          <HeroStat label="Block"  value={stats.byAction.block  || 0} color="var(--destructive)" />
          <HeroStat label="Redact" value={stats.byAction.redact || 0} color="var(--accent)" />
          <HeroStat label="Warn"   value={stats.byAction.warn   || 0} color="var(--accent)" />
          <HeroStat label="Log"    value={stats.byAction.log    || 0} color="var(--muted-foreground)" />
        </div>
      </div>

      <div className="px-5 py-3 border-t border-destructive/15 bg-destructive/[0.02] flex items-center gap-2 flex-wrap">
        <span className="text-[11.5px] text-foreground/85">
          {stats.hits7d.toLocaleString()} policy actions enforced in the last 7 days
          {stats.critical > 0 && (
            <> · <span className="text-destructive font-medium">{stats.critical} critical rules</span> active</>
          )}
        </span>
        <div className="ml-auto flex items-center gap-2">
          <Button size="sm" variant="outline" onClick={() => compileGatewayBundle()}>
            <Sparkles className="h-3.5 w-3.5" /> Compile bundle
          </Button>
          <Button size="sm" onClick={() => deployGateway()} className="bg-destructive text-destructive-foreground hover:brightness-110">
            Redeploy
          </Button>
          <Link href="/app/govern/runtime/gateway">
            <Button size="sm" variant="outline">
              Gateway config <ChevronRight className="h-3.5 w-3.5" />
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
}

function HeroStat({ label, value, color }) {
  return (
    <div className="rounded-md border border-border bg-card px-2.5 py-1.5 min-w-[80px]">
      <div className="text-[9.5px] uppercase tracking-[0.12em] font-mono" style={{ color }}>{label}</div>
      <div className="text-[20px] font-semibold tabular-nums text-foreground leading-none mt-0.5">{value}</div>
    </div>
  );
}

function ActionBadge({ action }) {
  const tone = ACTION_TONE[action] || ACTION_TONE.log;
  return (
    <span
      className="inline-flex items-center px-1.5 py-0.5 rounded border text-[10px] font-mono uppercase tracking-[0.12em] shrink-0"
      style={{
        borderColor: `color-mix(in oklab, ${tone.color} 50%, transparent)`,
        background: `color-mix(in oklab, ${tone.color} 12%, transparent)`,
        color: tone.color,
      }}
    >
      {tone.label}
    </span>
  );
}

function SeverityChip({ severity }) {
  if (!severity) return null;
  const tone = severity === 'critical' ? 'destructive' : severity === 'high' ? 'primary' : severity === 'medium' ? 'accent' : 'muted';
  const cls = tone === 'destructive' ? 'border-destructive/40 text-destructive bg-destructive/10'
            : tone === 'primary'     ? 'border-primary/40 text-primary bg-primary/10'
            : tone === 'accent'      ? 'border-accent/40 text-accent bg-accent/10'
            : 'border-border text-muted-foreground bg-muted/40';
  return (
    <span className={`text-[9.5px] font-mono uppercase tracking-[0.12em] px-1.5 py-0.5 rounded border ${cls}`}>
      {severity}
    </span>
  );
}

function HookRow({ name, count, desc }) {
  return (
    <li className="flex items-baseline justify-between gap-2 py-1 border-b border-border/40 last:border-0">
      <div className="min-w-0">
        <div className="font-mono text-foreground truncate">{name}</div>
        <div className="text-[10.5px] text-muted-foreground leading-snug truncate">{desc}</div>
      </div>
      <span className="font-mono tabular-nums text-muted-foreground shrink-0">{count}</span>
    </li>
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

function fmtAgo(ms) {
  const sec = Math.floor((Date.now() - ms) / 1000);
  if (sec < 60) return `${sec}s ago`;
  const m = Math.floor(sec / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}
