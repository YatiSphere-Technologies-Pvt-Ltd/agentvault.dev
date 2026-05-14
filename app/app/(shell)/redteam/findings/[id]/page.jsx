'use client';

import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useMemo, useState } from 'react';
import { ArrowLeft, ShieldCheck, Ban, Check, AlertOctagon, ExternalLink } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { RedTeamHeader, SeverityPill, VerdictPill, CategoryPill, fmtAgo } from '../../_shared';
import { useFindings, useRuns, useTargets, acknowledgeFinding, closeFinding, reviewFinding } from '../../_store';
import { attackById } from '../../_attackCatalog';

export default function FindingDetailPage() {
  const { id } = useParams();
  const findings = useFindings();
  const runs = useRuns();
  const targets = useTargets();

  const finding = useMemo(() => findings.find(f => f.id === id) || null, [findings, id]);
  const run = useMemo(() => finding ? runs.find(r => r.id === finding.run_id) : null, [finding, runs]);
  const target = useMemo(() => finding ? targets.find(t => t.id === finding.target_id) : null, [finding, targets]);
  const attack = useMemo(() => finding ? attackById(finding.attack_id) : null, [finding]);

  const [ackReason, setAckReason] = useState('');

  if (!finding) {
    return (
      <>
        <RedTeamHeader title="Runs" />
        <div className="max-w-[1680px] mx-auto px-4 sm:px-6 lg:px-8 py-7">
          <div className="rounded-lg border border-dashed border-border bg-card px-6 py-10 text-center">
            <div className="text-[13px] font-medium text-foreground">Finding not found</div>
            <Link href="/app/redteam/runs" className="mt-4 inline-block text-[12px] text-primary hover:underline">All runs →</Link>
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <RedTeamHeader title="Runs" />
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-7 space-y-5">
        <Link href={run ? `/app/redteam/runs/${run.id}` : '/app/redteam/runs'} className="text-[12px] text-muted-foreground hover:text-foreground inline-flex items-center gap-1.5">
          <ArrowLeft className="h-3.5 w-3.5" /> {run ? `Run ${run.id}` : 'All runs'}
        </Link>

        <div className="rounded-xl border border-border bg-card p-5">
          <div className="flex items-center gap-2 flex-wrap mb-2">
            <code className="text-[10.5px] font-mono text-muted-foreground">{finding.id}</code>
            <VerdictPill verdict={finding.verdict} isRegression={finding.is_regression} />
            <SeverityPill severity={finding.severity} />
            {attack && <CategoryPill category={attack.category} />}
            <span className="text-[10.5px] font-mono text-muted-foreground">CVSS {finding.cvss_ai_score}</span>
          </div>
          <h2 className="text-[18px] font-semibold tracking-tight text-foreground leading-snug">{attack?.name || finding.attack_id}</h2>
          <div className="mt-1 text-[12px] text-muted-foreground">
            target <Link href={`/app/redteam/targets/${target?.id}`} className="text-primary hover:underline">{target?.name || finding.target_id}</Link>
            {' · '}attack <Link href={`/app/redteam/library/${finding.attack_id}`} className="text-primary hover:underline">{finding.attack_id}</Link>
            {' · '}{fmtAgo(finding.created_at)}
          </div>

          {finding.is_regression && (
            <div className="mt-3 inline-flex items-center gap-1.5 px-2 py-1 rounded-md border border-destructive/40 bg-destructive/10 text-destructive text-[11.5px] font-medium">
              <AlertOctagon className="h-3.5 w-3.5" /> Regression — previously passed on this target
            </div>
          )}
        </div>

        <Card title="Payload">
          <pre className="text-[11.5px] font-mono text-foreground/90 bg-muted/30 border border-border rounded px-3 py-2 whitespace-pre-wrap break-words leading-relaxed">
{finding.evidence?.request?.payload_preview}
          </pre>
        </Card>

        <Card title="Response (synthesized for demo)">
          <pre className="text-[11.5px] font-mono text-foreground/90 bg-muted/30 border border-border rounded px-3 py-2 whitespace-pre-wrap break-words leading-relaxed">
{finding.evidence?.response?.text}
          </pre>
        </Card>

        <Card title="Mappings">
          <div className="flex flex-wrap gap-1.5">
            {(finding.atlas || []).map(r => <code key={r} className="text-[10.5px] font-mono text-foreground/85 bg-muted/40 border border-border rounded px-1.5 py-0.5">ATLAS {r}</code>)}
            {(finding.owasp_llm || []).map(r => <code key={r} className="text-[10.5px] font-mono text-primary bg-primary/[0.06] border border-primary/30 rounded px-1.5 py-0.5">{r}</code>)}
            {(finding.owasp_agentic || []).map(r => <code key={r} className="text-[10.5px] font-mono text-accent bg-accent/[0.06] border border-accent/30 rounded px-1.5 py-0.5">{r}</code>)}
            {(finding.nist || []).map(r => <code key={r} className="text-[10.5px] font-mono text-foreground/85 bg-muted/40 border border-border rounded px-1.5 py-0.5">NIST {r}</code>)}
          </div>
        </Card>

        <Card title="Remediation hints" hint="Bound controls + DLP rules.">
          {(finding.remediation?.suggested_controls || []).length === 0 ? (
            <div className="text-[12px] text-muted-foreground italic">No remediation hints attached.</div>
          ) : (
            <div className="space-y-1">
              {finding.remediation.suggested_controls.map(c => (
                <Link
                  key={c}
                  href={c.startsWith('av.dlp.') ? '/app/govern/runtime/dlp' : '/app/grc/controls'}
                  className="flex items-center gap-2 px-2.5 py-1.5 rounded border border-border bg-background text-[11.5px] hover:border-primary/40 hover:text-primary transition-colors"
                >
                  <ShieldCheck className="h-3 w-3 text-primary" />
                  <code className="font-mono flex-1">{c}</code>
                  <ExternalLink className="h-3 w-3 text-muted-foreground" />
                </Link>
              ))}
            </div>
          )}
        </Card>

        <Card title="Status">
          <div className="space-y-3">
            <div className="text-[12px] text-foreground">
              Current status: <span className="font-mono">{finding.status}</span>
              {finding.acknowledged_by && (
                <span className="text-muted-foreground"> · acknowledged by {finding.acknowledged_by}</span>
              )}
            </div>
            {finding.status === 'open' && (
              <>
                <textarea
                  rows={2}
                  value={ackReason}
                  onChange={(e) => setAckReason(e.target.value)}
                  placeholder="Acknowledge reason (optional) — e.g. accepted risk pending Q3 rollout of DLP rule R-117."
                  className="w-full px-2.5 py-1.5 bg-background border border-border rounded-md text-[12.5px] text-foreground focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 resize-none"
                />
                <div className="flex items-center gap-2 flex-wrap">
                  <Button size="sm" variant="outline" onClick={() => acknowledgeFinding(finding.id, { reason: ackReason, who: 'me', expiresAt: Date.now() + 30 * 24 * 60 * 60_000 })}>
                    <ShieldCheck className="h-3.5 w-3.5" /> Acknowledge (30d)
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => closeFinding(finding.id)} className="border-(--brand-teal)/40 text-brand-teal hover:bg-(--brand-teal)/10">
                    <Check className="h-3.5 w-3.5" /> Mark closed
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => reviewFinding(finding.id, 'pass')} className="border-destructive/40 text-destructive hover:bg-destructive/10">
                    <Ban className="h-3.5 w-3.5" /> Override → pass
                  </Button>
                </div>
              </>
            )}
            {finding.status === 'pending-review' && (
              <div className="flex items-center gap-2 flex-wrap">
                <Button size="sm" onClick={() => reviewFinding(finding.id, 'bypass')}>
                  Human verdict → bypass
                </Button>
                <Button size="sm" variant="outline" onClick={() => reviewFinding(finding.id, 'pass')}>
                  Human verdict → pass
                </Button>
              </div>
            )}
          </div>
        </Card>
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
