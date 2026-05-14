'use client';

import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useMemo, useState } from 'react';
import { ArrowLeft, Download, ShieldAlert, AlertOctagon, FileText, Activity } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { RedTeamHeader, SeverityPill, VerdictPill, CategoryPill, fmtAgo, fmtCost } from '../../_shared';
import { useRuns, useTargets, useFindings, findingsForRun } from '../../_store';
import { attackById, LIBRARY_VERSION } from '../../_attackCatalog';
import { suiteById } from '../../_targetCatalog';

export default function RunDetailPage() {
  const { id } = useParams();
  const allRuns = useRuns();
  const targets = useTargets();
  const allFindings = useFindings();
  const [tab, setTab] = useState('findings');

  const run = useMemo(() => allRuns.find(r => r.id === id) || null, [allRuns, id]);
  const target = useMemo(() => run ? targets.find(t => t.id === run.target_id) : null, [run, targets]);
  const findings = useMemo(() => run ? findingsForRun(run.id) : [], [run, allFindings]);

  if (!run) {
    return (
      <>
        <RedTeamHeader title="Runs" />
        <div className="max-w-[1680px] mx-auto px-4 sm:px-6 lg:px-8 py-7">
          <div className="rounded-lg border border-dashed border-border bg-card px-6 py-10 text-center">
            <div className="text-[13px] font-medium text-foreground">Run not found</div>
            <Link href="/app/redteam/runs" className="mt-4 inline-block text-[12px] text-primary hover:underline">All runs →</Link>
          </div>
        </div>
      </>
    );
  }

  const suite = suiteById(run.suite_id);

  // Group findings by OWASP / NIST / ATLAS for the compliance tab.
  const owaspMap = {};
  const nistMap = {};
  const atlasMap = {};
  for (const f of findings) {
    for (const r of f.owasp_llm || [])    (owaspMap[r] = owaspMap[r] || []).push(f);
    for (const r of f.nist || [])         (nistMap[r]  = nistMap[r]  || []).push(f);
    for (const r of f.atlas || [])        (atlasMap[r] = atlasMap[r] || []).push(f);
  }

  const onExport = () => {
    const pack = buildEvidencePack(run, target, suite, findings);
    const blob = new Blob([JSON.stringify(pack, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `evidence-${run.id}.json`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  };

  return (
    <>
      <RedTeamHeader title="Runs" />
      <div className="max-w-[1680px] mx-auto px-4 sm:px-6 lg:px-8 py-7 space-y-5">
        <Link href="/app/redteam/runs" className="text-[12px] text-muted-foreground hover:text-foreground inline-flex items-center gap-1.5">
          <ArrowLeft className="h-3.5 w-3.5" /> All runs
        </Link>

        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap mb-1">
              <code className="text-[10.5px] font-mono text-muted-foreground">{run.id}</code>
              <span className={`inline-flex items-center gap-1.5 px-1.5 py-0.5 rounded border text-[10px] font-mono uppercase tracking-[0.12em] ${
                run.slo_breach ? 'border-destructive/40 text-destructive bg-destructive/10' :
                run.bypassed > 0 ? 'border-primary/40 text-primary bg-primary/10' :
                'border-(--brand-teal)/40 text-brand-teal bg-(--brand-teal)/10'
              }`}>
                <span className={`h-1.5 w-1.5 rounded-full ${
                  run.slo_breach ? 'bg-destructive' : run.bypassed > 0 ? 'bg-primary' : 'bg-brand-teal'
                }`} />
                {run.slo_breach ? 'SLO breach' : run.bypassed > 0 ? 'Bypasses' : 'Pass'}
              </span>
              <span className="text-[10.5px] font-mono text-muted-foreground">· library {run.library_version}</span>
              <span className="text-[10.5px] font-mono text-muted-foreground">· trigger {run.triggered_by}</span>
              <span className="text-[10.5px] font-mono text-muted-foreground">· env {run.environment}</span>
            </div>
            <h2 className="text-[20px] font-semibold tracking-tight text-foreground leading-tight">
              {suite?.name || run.suite_id} → <Link href={`/app/redteam/targets/${target?.id}`} className="hover:text-primary">{target?.name || run.target_id}</Link>
            </h2>
            <div className="mt-1 text-[12px] text-muted-foreground">
              Started {new Date(run.started_at).toLocaleString()} · finished {fmtAgo(run.finished_at)}
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <Button variant="outline" size="sm" onClick={onExport}>
              <Download className="h-3.5 w-3.5" /> Evidence pack
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-6 gap-2">
          <Stat label="Total"        value={String(run.total)} />
          <Stat label="Pass"         value={String(run.passed)}     tone="ok" />
          <Stat label="Bypass"       value={String(run.bypassed)}   tone={run.bypassed ? 'bad' : 'default'} />
          <Stat label="Inconclusive" value={String(run.inconclusive)} tone={run.inconclusive ? 'warn' : 'default'} />
          <Stat label="Regressions"  value={String(run.regressions)} tone={run.regressions ? 'bad' : 'ok'} />
          <Stat label="Cost"         value={fmtCost(run.cost_usd)} sub={`${(run.tokens_total / 1000).toFixed(0)}k tok`} />
        </div>

        <Tabs value={tab} onValueChange={setTab}>
          <TabsList className="h-9 bg-muted/40">
            <TabsTrigger value="findings"   className="text-[12.5px]">
              Findings
              {findings.length > 0 && (
                <span className="ml-1.5 text-[10px] font-mono tabular-nums px-1.5 py-0.5 rounded bg-destructive/15 text-destructive">{findings.length}</span>
              )}
            </TabsTrigger>
            <TabsTrigger value="compliance" className="text-[12.5px]">Compliance</TabsTrigger>
            <TabsTrigger value="meta"       className="text-[12.5px]">Meta</TabsTrigger>
          </TabsList>

          <TabsContent value="findings" className="mt-4">
            <FindingsTab findings={findings} />
          </TabsContent>

          <TabsContent value="compliance" className="mt-4">
            <ComplianceTab owaspMap={owaspMap} nistMap={nistMap} atlasMap={atlasMap} findings={findings} />
          </TabsContent>

          <TabsContent value="meta" className="mt-4">
            <MetaTab run={run} target={target} suite={suite} />
          </TabsContent>
        </Tabs>
      </div>
    </>
  );
}

/* ─── Findings tab ─── */

function FindingsTab({ findings }) {
  if (findings.length === 0) {
    return (
      <div className="rounded-xl border border-(--brand-teal)/30 bg-(--brand-teal)/[0.04] px-6 py-10 text-center">
        <ShieldAlert className="h-5 w-5 text-brand-teal mx-auto mb-2" />
        <div className="text-[13px] font-medium text-foreground">No findings.</div>
        <div className="text-[11.5px] text-muted-foreground mt-1">The platform's policies held against every probe in this suite.</div>
      </div>
    );
  }
  return (
    <div className="rounded-xl border border-border bg-card divide-y divide-border/60 overflow-hidden">
      {findings.map(f => (
        <FindingRow key={f.id} finding={f} />
      ))}
    </div>
  );
}

function FindingRow({ finding }) {
  const [open, setOpen] = useState(false);
  const a = attackById(finding.attack_id);
  return (
    <div>
      <button
        type="button"
        onClick={() => setOpen(v => !v)}
        className="w-full text-left px-4 py-3 flex items-start gap-3 hover:bg-muted/30 transition-colors"
      >
        <VerdictPill verdict={finding.verdict} isRegression={finding.is_regression} />
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 flex-wrap mb-0.5">
            <span className="text-[12.5px] font-medium text-foreground truncate">{a?.name || finding.attack_id}</span>
            <SeverityPill severity={finding.severity} />
            {a && <CategoryPill category={a.category} />}
            <span className="text-[9.5px] font-mono text-muted-foreground">CVSS {finding.cvss_ai_score}</span>
          </div>
          <div className="text-[10.5px] font-mono text-muted-foreground truncate">
            {finding.id} · judge {finding.judge?.kind} · conf {finding.judge?.llm_confidence?.toFixed(2)}
          </div>
        </div>
        <span className="text-[11px] text-muted-foreground shrink-0 mt-0.5">{open ? '▾' : '▸'}</span>
      </button>
      {open && (
        <div className="px-4 pb-3 pt-1 space-y-2.5 border-t border-border/60 bg-muted/10">
          <Section title="Payload">
            <pre className="text-[11.5px] font-mono text-foreground/90 bg-background border border-border rounded px-3 py-2 whitespace-pre-wrap break-words leading-relaxed">
{finding.evidence?.request?.payload_preview}
            </pre>
          </Section>
          <Section title="Response">
            <pre className="text-[11.5px] font-mono text-foreground/90 bg-background border border-border rounded px-3 py-2 whitespace-pre-wrap break-words leading-relaxed">
{finding.evidence?.response?.text}
            </pre>
          </Section>
          <Section title="Mappings">
            <div className="flex flex-wrap gap-1.5 text-[10px] font-mono">
              {(finding.atlas || []).map(r => <code key={r} className="px-1.5 py-0.5 rounded border border-border bg-muted/40 text-foreground/85">ATLAS {r}</code>)}
              {(finding.owasp_llm || []).map(r => <code key={r} className="px-1.5 py-0.5 rounded border border-primary/30 bg-primary/[0.06] text-primary">{r}</code>)}
              {(finding.nist || []).map(r => <code key={r} className="px-1.5 py-0.5 rounded border border-border bg-muted/40 text-foreground/85">NIST {r}</code>)}
            </div>
          </Section>
          <Section title="Remediation hints">
            {(finding.remediation?.suggested_controls || []).length === 0 ? (
              <span className="text-[11.5px] text-muted-foreground italic">None.</span>
            ) : (
              <div className="flex flex-wrap gap-1.5">
                {finding.remediation.suggested_controls.map(c => (
                  <Link
                    key={c}
                    href={c.startsWith('av.dlp.') ? '/app/govern/runtime/dlp' : '/app/grc/controls'}
                    className="text-[10.5px] font-mono text-primary bg-primary/[0.06] border border-primary/30 rounded px-1.5 py-0.5 hover:brightness-110"
                  >
                    {c}
                  </Link>
                ))}
              </div>
            )}
          </Section>
          <div className="flex items-center gap-2 pt-1">
            <Link href={`/app/redteam/findings/${finding.id}`}>
              <Button size="sm" variant="outline">Open finding</Button>
            </Link>
            {finding.is_regression && (
              <span className="text-[10.5px] font-mono text-destructive">↳ regression from previous run</span>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

/* ─── Compliance tab ─── */

function ComplianceTab({ owaspMap, nistMap, atlasMap, findings }) {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
      <ComplianceCard title="OWASP LLM Top-10 (v2 2025)" mapEntries={owaspMap} tone="primary" />
      <ComplianceCard title="NIST AI 600-1"               mapEntries={nistMap}  tone="default" />
      <ComplianceCard title="MITRE ATLAS"                  mapEntries={atlasMap} tone="default" />
    </div>
  );
}

function ComplianceCard({ title, mapEntries, tone }) {
  const entries = Object.entries(mapEntries).sort(([, a], [, b]) => b.length - a.length);
  return (
    <div className="rounded-xl border border-border bg-card overflow-hidden">
      <div className="px-4 py-2.5 border-b border-border">
        <div className="text-[10.5px] uppercase tracking-[0.16em] font-mono text-muted-foreground">{title}</div>
      </div>
      <div className="divide-y divide-border/60">
        {entries.length === 0 ? (
          <div className="px-4 py-6 text-[12px] text-muted-foreground italic text-center">No findings mapped.</div>
        ) : (
          entries.map(([ref, list]) => (
            <div key={ref} className="px-4 py-2 flex items-center justify-between gap-2">
              <code className={`text-[11px] font-mono ${tone === 'primary' ? 'text-primary' : 'text-foreground/85'}`}>{ref}</code>
              <span className="text-[11px] font-mono tabular-nums text-destructive">{list.length} bypass{list.length === 1 ? '' : 'es'}</span>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

/* ─── Meta tab ─── */

function MetaTab({ run, target, suite }) {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
      <Card title="Run record">
        <Pre>{JSON.stringify(run, null, 2)}</Pre>
      </Card>
      <Card title="Target + suite">
        <Pre>{JSON.stringify({ target: { id: target?.id, name: target?.name, type: target?.type, scope: target?.scope }, suite: { id: suite?.id, kind: suite?.kind, filter: suite?.filter, slo: suite?.slo_thresholds } }, null, 2)}</Pre>
      </Card>
    </div>
  );
}

/* ─── shared ─── */

function Section({ title, children }) {
  return (
    <div>
      <div className="text-[10px] uppercase tracking-[0.14em] font-mono text-muted-foreground mb-1">{title}</div>
      {children}
    </div>
  );
}
function Card({ title, children }) {
  return (
    <div className="rounded-xl border border-border bg-card overflow-hidden">
      <div className="px-4 py-2.5 border-b border-border">
        <div className="text-[10.5px] uppercase tracking-[0.16em] font-mono text-muted-foreground">{title}</div>
      </div>
      <div className="px-4 py-3">{children}</div>
    </div>
  );
}
function Pre({ children }) {
  return (
    <pre className="text-[11px] font-mono text-foreground/90 bg-muted/30 border border-border rounded px-3 py-2 whitespace-pre-wrap break-words leading-relaxed max-h-[480px] overflow-y-auto">{children}</pre>
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
      <div className="mt-0.5 flex items-baseline gap-1.5">
        <div className={`text-[17px] font-semibold tabular-nums ${color}`}>{value}</div>
        {sub && <div className="text-[10.5px] font-mono text-muted-foreground truncate">{sub}</div>}
      </div>
    </div>
  );
}

/* ─── evidence pack export ─── */

function buildEvidencePack(run, target, suite, findings) {
  return {
    schema: 'agentvault.redteam.evidence-pack.v1',
    generated_at: new Date().toISOString(),
    run: {
      id: run.id, target_id: run.target_id, suite_id: run.suite_id,
      library_version: run.library_version,
      started_at: new Date(run.started_at).toISOString(),
      finished_at: new Date(run.finished_at).toISOString(),
      triggered_by: run.triggered_by, environment: run.environment,
      total: run.total, passed: run.passed, bypassed: run.bypassed,
      inconclusive: run.inconclusive, regressions: run.regressions,
      cost_usd: run.cost_usd, tokens_total: run.tokens_total,
      slo_breach: run.slo_breach,
    },
    target: target ? {
      id: target.id, name: target.name, type: target.type, adapter: target.adapter,
      scope: target.scope, consent_record: target.consent_record,
    } : null,
    suite: suite ? {
      id: suite.id, name: suite.name, kind: suite.kind,
      filter: suite.filter, slo_thresholds: suite.slo_thresholds,
    } : null,
    findings: findings.map(f => ({
      id: f.id, attack_id: f.attack_id,
      verdict: f.verdict, severity: f.severity, cvss_ai_score: f.cvss_ai_score,
      atlas: f.atlas, owasp_llm: f.owasp_llm, owasp_agentic: f.owasp_agentic, nist: f.nist,
      evidence: f.evidence, judge: f.judge,
      is_regression: f.is_regression,
      remediation: f.remediation,
    })),
    integrity: {
      // Demo marker only — production would HMAC the bundle with a tenant key.
      sha256_marker: `demo:${run.id}:${Date.now()}`,
    },
  };
}
