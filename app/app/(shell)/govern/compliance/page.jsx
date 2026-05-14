'use client';

import Link from 'next/link';
import { useMemo } from 'react';
import { Download, ChevronRight, Shield, FileText, BookText, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { GovernHeader } from '../_shared';
import { FRAMEWORKS, CONTROLS, frameworkBySlug, coverageFor } from '../../grc/_data';
import { useRuns, useFindings } from '../../redteam/_store';
import { useDlpRules } from '../_store';
import { LIBRARY_VERSION } from '../../redteam/_attackCatalog';

/* Compliance evidence — the audit-facing landing.

   Three concerns combined:
     1. Framework coverage (from GRC)
     2. Recent red-team runs that produced exportable evidence packs
     3. Audit bundle export — one click consolidates everything into a
        JSON the auditor can ingest

   GRC remains the build-time concern (define controls, write policies);
   this page is the audit-time concern (export evidence). */

export default function CompliancePage() {
  const runs = useRuns();
  const findings = useFindings();
  const dlpRules = useDlpRules();

  // Top frameworks for the prototype — Govern-relevant ones first
  const featured = ['eu-ai-act', 'nist-ai-rmf', 'iso-42001', 'soc2', 'gdpr', 'hipaa', 'owasp-llm-top10', 'iso-27001']
    .map(slug => FRAMEWORKS.find(f => f.slug === slug))
    .filter(Boolean);

  // Recent red-team runs (excluding running) — these are the evidence
  // records available to export.
  const recentRuns = useMemo(
    () => runs.filter(r => r.status === 'completed').slice(0, 8),
    [runs],
  );

  // Aggregate counts for the hero
  const stats = useMemo(() => {
    const totalControls = CONTROLS.length;
    const shadowAiControls = CONTROLS.filter(c => c.domain === 'shadow-ai').length;
    const passingControls = CONTROLS.filter(c => (c.coverage ?? 0) >= 0.9).length;
    const totalRuns = runs.length;
    const totalFindings = findings.filter(f => f.verdict !== 'pass').length;
    const activeRules = dlpRules.filter(r => r.enabled !== false).length;
    return {
      frameworks: FRAMEWORKS.length,
      totalControls,
      shadowAiControls,
      passingControls,
      totalRuns,
      totalFindings,
      activeRules,
    };
  }, [runs, findings, dlpRules]);

  const onExportBundle = () => {
    const bundle = buildAuditBundle({ runs, findings, dlpRules });
    const blob = new Blob([JSON.stringify(bundle, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `agentvault-audit-bundle-${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  };

  return (
    <>
      <GovernHeader
        title="Compliance evidence"
        subtitle="One auditor-facing view that consolidates framework coverage, control state, red-team runs, and DLP enforcement. Export an audit bundle when the auditor calls."
      />

      <div className="max-w-[1680px] mx-auto px-4 sm:px-6 lg:px-8 py-7 space-y-6">
        {/* Hero */}
        <div className="rounded-xl border border-(--brand-teal)/30 bg-(--brand-teal)/[0.04] px-5 py-4 flex items-center gap-5 flex-wrap">
          <div className="h-12 w-12 rounded-md bg-(--brand-teal)/15 text-brand-teal flex items-center justify-center shrink-0">
            <Shield className="h-6 w-6" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="text-[10.5px] uppercase tracking-[0.16em] font-mono text-muted-foreground">Audit-ready evidence</div>
            <h1 className="text-[20px] font-semibold tracking-tight text-foreground leading-tight">
              Compliance evidence
            </h1>
            <p className="text-[12.5px] text-muted-foreground mt-0.5 max-w-[80ch]">
              One destination for auditors. Coverage across {stats.frameworks} frameworks, {stats.totalRuns} red-team
              runs, {stats.totalFindings} findings, and {stats.activeRules} runtime rules — bundled in a single
              JSON export.
            </p>
          </div>
          <Button onClick={onExportBundle} className="shrink-0">
            <Download className="h-3.5 w-3.5" /> Generate audit bundle
          </Button>
        </div>

        {/* Stat strip */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          <Stat label="Frameworks"       value={String(stats.frameworks)}        sub="in scope" />
          <Stat label="Controls"         value={`${stats.passingControls}/${stats.totalControls}`} sub={`${stats.shadowAiControls} Shadow-AI`} tone={stats.passingControls === stats.totalControls ? 'ok' : 'warn'} />
          <Stat label="Red-team runs"    value={String(stats.totalRuns)}         sub={`library ${LIBRARY_VERSION}`} />
          <Stat label="Open findings"    value={String(stats.totalFindings)}     sub={stats.totalFindings > 0 ? 'mapped to frameworks' : 'no open findings'} tone={stats.totalFindings === 0 ? 'ok' : 'warn'} />
        </div>

        {/* Two-column body */}
        <div className="grid grid-cols-1 lg:grid-cols-[1.3fr_1fr] gap-5">
          <section className="space-y-5">
            <Card
              title="Framework coverage"
              hint="Controls discharging clauses across each framework"
              link="/app/grc/frameworks"
              linkLabel="Manage frameworks"
            >
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {featured.map(f => {
                  const cov = coverageFor(f.slug);
                  return <FrameworkCard key={f.slug} framework={f} coverage={cov} />;
                })}
              </div>
            </Card>

            <Card
              title="Recent red-team evidence"
              hint="Each run produces an exportable, reproducible evidence pack"
              link="/app/redteam/runs"
              linkLabel="All runs"
            >
              {recentRuns.length === 0 ? (
                <div className="text-[12px] text-muted-foreground italic">No completed runs yet.</div>
              ) : (
                <div className="-mx-4 divide-y divide-border/60">
                  {recentRuns.map(r => (
                    <Link
                      key={r.id}
                      href={`/app/redteam/runs/${r.id}`}
                      className="px-4 py-2.5 flex items-center gap-3 hover:bg-muted/30 transition-colors"
                    >
                      <FileText className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                      <div className="min-w-0 flex-1">
                        <div className="text-[12px] font-medium text-foreground truncate">{r.suite_id} → {r.target_id}</div>
                        <div className="text-[10.5px] font-mono text-muted-foreground truncate">
                          {new Date(r.started_at).toLocaleDateString()} · {r.passed}/{r.total} pass · library {r.library_version}
                        </div>
                      </div>
                      {r.slo_breach && (
                        <span className="inline-flex items-center gap-1 text-[9.5px] font-mono uppercase tracking-[0.12em] px-1.5 py-0.5 rounded border border-border bg-muted/60 text-foreground shrink-0">
                          <span className="h-1.5 w-1.5 rounded-full bg-destructive shrink-0" />
                          SLO breach
                        </span>
                      )}
                      <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
                    </Link>
                  ))}
                </div>
              )}
            </Card>
          </section>

          <aside className="space-y-5">
            <Card title="What the bundle includes">
              <ul className="space-y-2 text-[12px]">
                <BundleItem icon={<Shield className="h-3 w-3" />} label="Framework + control catalog">
                  All {stats.frameworks} frameworks with their clauses, plus {stats.totalControls} discharging
                  controls + their coverage stats.
                </BundleItem>
                <BundleItem icon={<FileText className="h-3 w-3" />} label="Red-team run records">
                  {stats.totalRuns} runs · each with target, suite, library version, every finding's evidence,
                  judge confidence, and OWASP / NIST / ATLAS mappings.
                </BundleItem>
                <BundleItem icon={<BookText className="h-3 w-3" />} label="Runtime policy bundle">
                  {stats.activeRules} active DLP rules · severity · scope · GRC binding.
                </BundleItem>
                <BundleItem icon={<Sparkles className="h-3 w-3" />} label="Mappings">
                  Each finding cross-referenced to OWASP LLM Top-10, OWASP Agentic, NIST AI 600-1, MITRE ATLAS,
                  and the EU AI Act articles it discharges.
                </BundleItem>
              </ul>
              <div className="mt-3 text-[10.5px] font-mono text-muted-foreground border-t border-border pt-2.5">
                Demo export is JSON. Production also produces a signed PDF +
                ZIP suitable for EU AI Act post-market monitoring evidence.
              </div>
            </Card>

            <Card title="Why this matters">
              <div className="space-y-2 text-[12px] text-muted-foreground leading-relaxed">
                <p>
                  Auditors don't want to navigate your platform — they want a single artifact that proves
                  controls are designed, deployed, exercised, and reviewed.
                </p>
                <p>
                  This page is the audit-time view. <Link href="/app/grc" className="text-primary hover:underline">GRC</Link> is the build-time view
                  (define controls). <Link href="/app/redteam" className="text-primary hover:underline">Red Team</Link> is the proof layer (run attacks against them).
                  This page consolidates the two.
                </p>
              </div>
            </Card>
          </aside>
        </div>
      </div>
    </>
  );
}

/* ─── building blocks ─── */

function FrameworkCard({ framework, coverage }) {
  const pct = Math.round(coverage.pct * 100);
  const tone = pct >= 80 ? 'ok' : pct >= 50 ? 'warn' : 'bad';
  const barCls = tone === 'ok' ? 'bg-brand-teal' : tone === 'warn' ? 'bg-(--chart-3)' : 'bg-destructive';
  const pctColor = tone === 'ok' ? 'text-brand-teal' : tone === 'warn' ? 'text-(--chart-3)' : 'text-destructive';
  return (
    <Link
      href={`/app/grc/frameworks/${framework.slug}`}
      className="group rounded-md border border-border bg-card hover:border-primary/40 hover:shadow-sm transition-all px-3 py-2.5"
    >
      <div className="flex items-center justify-between mb-1.5">
        <span className="text-[12px] font-medium text-foreground truncate" style={{ color: framework.color }}>{framework.name.split(' ')[0]}</span>
        <span className={`text-[10.5px] font-mono tabular-nums ${pctColor}`}>
          {pct}%
        </span>
      </div>
      <div className="text-[10.5px] font-mono text-muted-foreground truncate">{framework.name}</div>
      <div className="mt-1.5 h-1 rounded-full bg-muted overflow-hidden">
        <div className={`h-full ${barCls}`} style={{ width: `${pct}%` }} />
      </div>
      <div className="text-[10px] font-mono text-muted-foreground mt-1.5">
        {coverage.covered}/{coverage.total} clauses discharged
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

function BundleItem({ icon, label, children }) {
  return (
    <li className="flex items-start gap-2.5">
      <div className="h-5 w-5 rounded-md bg-primary/10 text-primary flex items-center justify-center shrink-0 mt-0.5">{icon}</div>
      <div className="min-w-0">
        <div className="text-[12px] font-medium text-foreground">{label}</div>
        <div className="text-[11px] text-muted-foreground leading-snug">{children}</div>
      </div>
    </li>
  );
}

function Stat({ label, value, sub, tone = 'default' }) {
  const color = tone === 'bad' ? 'text-destructive'
              : tone === 'warn' ? 'text-(--chart-3)'
              : tone === 'ok' ? 'text-brand-teal'
              : 'text-foreground';
  return (
    <div className="rounded-lg border border-border bg-card px-3 py-2">
      <div className="text-[10.5px] font-medium uppercase tracking-[0.1em] text-muted-foreground">{label}</div>
      <div className="mt-0.5 flex items-baseline gap-1.5">
        <div className={`text-[17px] font-semibold tabular-nums ${color} truncate`}>{value}</div>
        {sub && <div className="text-[10.5px] font-mono text-muted-foreground truncate">{sub}</div>}
      </div>
    </div>
  );
}

/* ─── audit bundle export ─── */

function buildAuditBundle({ runs, findings, dlpRules }) {
  return {
    schema: 'agentvault.compliance.audit-bundle.v1',
    generated_at: new Date().toISOString(),
    frameworks: FRAMEWORKS.map(f => {
      const cov = coverageFor(f.slug);
      return {
        slug: f.slug,
        name: f.name,
        clauses: f.clauses?.map(c => ({ id: c.id, label: c.label })) || [],
        coverage: { covered: cov.covered, total: cov.total, pct: cov.pct },
      };
    }),
    controls: CONTROLS.map(c => ({
      id: c.id,
      title: c.title,
      family: c.family,
      domain: c.domain || null,
      kind: c.kind,
      hook: c.hook,
      enforcement: c.enforcement,
      coverage: c.coverage,
    })),
    redteam: {
      library_version: LIBRARY_VERSION,
      runs: runs.filter(r => r.status === 'completed').map(r => ({
        id: r.id, target_id: r.target_id, suite_id: r.suite_id,
        library_version: r.library_version,
        started_at: new Date(r.started_at).toISOString(),
        finished_at: new Date(r.finished_at).toISOString(),
        total: r.total, passed: r.passed, bypassed: r.bypassed,
        inconclusive: r.inconclusive, regressions: r.regressions,
        slo_breach: r.slo_breach,
      })),
      findings: findings.map(f => ({
        id: f.id, run_id: f.run_id, target_id: f.target_id, attack_id: f.attack_id,
        verdict: f.verdict, severity: f.severity, cvss_ai_score: f.cvss_ai_score,
        atlas: f.atlas, owasp_llm: f.owasp_llm, owasp_agentic: f.owasp_agentic, nist: f.nist,
        judge: f.judge, is_regression: f.is_regression, status: f.status,
      })),
    },
    runtime: {
      dlp_rules: dlpRules.map(r => ({
        id: r.id, name: r.name, enabled: r.enabled, severity: r.severity,
        match: r.match, action: r.action,
        scope_destinations: r.scope_destinations, scope_assets: r.scope_assets,
        controls_ref: r.controls_ref, policy_refs: r.policy_refs,
      })),
    },
    integrity: {
      // Demo marker only — production would HMAC the bundle with a tenant key.
      sha256_marker: `demo:bundle:${Date.now()}`,
    },
  };
}
