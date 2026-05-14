'use client';

import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useMemo } from 'react';
import { ArrowLeft, ExternalLink, Boxes } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { RedTeamHeader, SeverityPill, CategoryPill, AdversaryPill, fmtAgo } from '../../_shared';
import { ATTACKS, attackById, LOCALES, LIBRARY_VERSION } from '../../_attackCatalog';
import { useFindings } from '../../_store';

export default function AttackDetailPage() {
  const { id } = useParams();
  const attack = attackById(id);
  const findings = useFindings();

  const findingsForAttack = useMemo(
    () => findings.filter(f => f.attack_id === id).slice(0, 10),
    [findings, id],
  );

  if (!attack) {
    return (
      <>
        <RedTeamHeader title="Attack library" />
        <div className="max-w-[1680px] mx-auto px-4 sm:px-6 lg:px-8 py-7">
          <div className="rounded-lg border border-dashed border-border bg-card px-6 py-10 text-center">
            <div className="text-[13px] font-medium text-foreground">Attack not found</div>
            <Link href="/app/redteam/library" className="mt-4 inline-block text-[12px] text-primary hover:underline">All attacks →</Link>
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <RedTeamHeader title="Attack library" />
      <div className="max-w-[1680px] mx-auto px-4 sm:px-6 lg:px-8 py-7 space-y-5">
        <Link href="/app/redteam/library" className="text-[12px] text-muted-foreground hover:text-foreground inline-flex items-center gap-1.5">
          <ArrowLeft className="h-3.5 w-3.5" /> Attack library
        </Link>

        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap mb-1">
              <code className="text-[10.5px] font-mono text-muted-foreground">{attack.id}</code>
              <SeverityPill severity={attack.severity} />
              <CategoryPill category={attack.category} />
              <span className="text-[10.5px] font-mono text-muted-foreground">· v{attack.version} · {LOCALES[attack.locale]}</span>
            </div>
            <h2 className="text-[20px] font-semibold tracking-tight text-foreground leading-tight">{attack.name}</h2>
            <p className="mt-1 text-[12.5px] text-muted-foreground max-w-[80ch] leading-relaxed">{attack.description}</p>
          </div>
          <Button
            size="sm"
            render={
              <Link href={`/app/redteam/suites/new?attack=${attack.id}`}>
                <Boxes className="h-3.5 w-3.5" /> Add to suite
              </Link>
            }
          />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-[1.2fr_1fr] gap-5">
          <section className="space-y-5">
            <Card title="Payload template" hint="Real text from the cited corpus. Demonstrates the technique.">
              <pre className="rounded-md border border-border bg-muted/30 px-3 py-2.5 text-[11.5px] font-mono text-foreground/90 whitespace-pre-wrap leading-relaxed overflow-x-auto">
{attack.payload_template}
              </pre>
              {attack.subcategory && (
                <div className="mt-2 text-[10.5px] font-mono text-muted-foreground">
                  subcategory: <span className="text-foreground">{attack.subcategory}</span>
                </div>
              )}
            </Card>

            <Card title="Success criteria" hint="How the judge decides whether the attack landed.">
              <ul className="space-y-2">
                {(attack.success_criteria || []).map((c, i) => (
                  <li key={i} className="rounded-md border border-border bg-background px-3 py-2 text-[11.5px]">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-[9.5px] font-mono uppercase tracking-[0.12em] px-1.5 py-0.5 rounded border border-primary/40 bg-primary/10 text-primary">
                        {c.kind}
                      </span>
                      {c.expected && (
                        <span className="text-[10.5px] font-mono text-muted-foreground">
                          expected: <span className="text-foreground">{String(c.expected)}</span>
                        </span>
                      )}
                    </div>
                    {c.match && <code className="text-[11px] font-mono text-foreground/85 block">{c.match.toString()}</code>}
                    {c.rubric && <div className="text-[12px] text-foreground/85 italic">"{c.rubric}"</div>}
                    {c.expected_outcome && <div className="text-[11px] font-mono text-foreground/85">outcome: {c.expected_outcome}</div>}
                  </li>
                ))}
              </ul>
            </Card>

            <Card title="Recent findings tied to this attack">
              {findingsForAttack.length === 0 ? (
                <div className="text-[12px] text-muted-foreground italic">No findings yet for this attack.</div>
              ) : (
                <div className="-mx-4 divide-y divide-border/60">
                  {findingsForAttack.map(f => (
                    <Link key={f.id} href={`/app/redteam/findings/${f.id}`} className="px-4 py-2 flex items-center gap-3 hover:bg-muted/30 transition-colors">
                      <span className={`h-1.5 w-1.5 rounded-full shrink-0 ${
                        f.verdict === 'bypass' ? 'bg-destructive' : f.verdict === 'inconclusive' ? 'bg-accent' : 'bg-brand-teal'
                      }`} />
                      <div className="min-w-0 flex-1">
                        <div className="text-[11.5px] font-mono text-foreground truncate">{f.id} · target {f.target_id}</div>
                        <div className="text-[10.5px] font-mono text-muted-foreground">{fmtAgo(f.created_at)} · {f.verdict}</div>
                      </div>
                      {f.is_regression && (
                        <span className="text-[9.5px] font-mono uppercase tracking-[0.12em] px-1.5 py-0.5 rounded border border-destructive/40 bg-destructive/10 text-destructive">regression</span>
                      )}
                    </Link>
                  ))}
                </div>
              )}
            </Card>
          </section>

          <aside className="space-y-5">
            <Card title="Mappings">
              <div className="space-y-2.5 text-[12px]">
                <Row label="MITRE ATLAS">
                  <div className="flex flex-wrap gap-1 justify-end">
                    {(attack.atlas_refs || []).map(r => (
                      <code key={r} className="font-mono text-foreground/85 bg-muted/40 border border-border rounded px-1.5 py-0.5">{r}</code>
                    ))}
                  </div>
                </Row>
                <Row label="OWASP LLM Top-10">
                  <div className="flex flex-wrap gap-1 justify-end">
                    {(attack.owasp_llm_refs || []).map(r => (
                      <code key={r} className="font-mono text-primary bg-primary/[0.06] border border-primary/30 rounded px-1.5 py-0.5">{r}</code>
                    ))}
                  </div>
                </Row>
                {(attack.owasp_agentic_refs || []).length > 0 && (
                  <Row label="OWASP Agentic">
                    <div className="flex flex-wrap gap-1 justify-end">
                      {attack.owasp_agentic_refs.map(r => (
                        <code key={r} className="font-mono text-accent bg-accent/[0.06] border border-accent/30 rounded px-1.5 py-0.5">{r}</code>
                      ))}
                    </div>
                  </Row>
                )}
                <Row label="NIST AI 600-1">
                  <div className="flex flex-wrap gap-1 justify-end">
                    {(attack.nist_refs || []).map(r => (
                      <code key={r} className="font-mono text-foreground/85 bg-muted/40 border border-border rounded px-1.5 py-0.5">{r}</code>
                    ))}
                  </div>
                </Row>
              </div>
            </Card>

            <Card title="Targeting + adversary">
              <div className="space-y-2.5 text-[12px]">
                <Row label="Target types">
                  <div className="flex flex-wrap gap-1 justify-end">
                    {(attack.target_types || []).map(t => (
                      <span key={t} className="font-mono text-foreground/85 bg-muted/40 border border-border rounded px-1.5 py-0.5">{t}</span>
                    ))}
                  </div>
                </Row>
                <Row label="Adversary classes">
                  <div className="flex flex-wrap gap-1 justify-end">
                    {(attack.adversary_class || []).map(c => <AdversaryPill key={c} klass={c} />)}
                  </div>
                </Row>
                <Row label="Locale">
                  <span className="font-mono">{LOCALES[attack.locale] || attack.locale}</span>
                </Row>
                <Row label="Impact class">
                  <span className="font-mono text-foreground/85">{attack.impact_class}</span>
                </Row>
              </div>
            </Card>

            <Card title="Remediation hints" hint="Bound GRC controls + DLP rules.">
              {(attack.remediation_hints || []).length === 0 ? (
                <div className="text-[12px] text-muted-foreground italic">No remediation hints attached.</div>
              ) : (
                <div className="space-y-1">
                  {attack.remediation_hints.map(h => (
                    <Link
                      key={h}
                      href={h.startsWith('av.dlp.') ? `/app/govern/runtime/dlp` : `/app/grc/controls`}
                      className="block px-2 py-1.5 rounded border border-border bg-background text-[11.5px] font-mono text-foreground hover:border-primary/40 hover:text-primary transition-colors"
                    >
                      {h}
                    </Link>
                  ))}
                </div>
              )}
            </Card>

            <Card title="Attribution">
              <div className="space-y-1.5 text-[11.5px]">
                <Row label="Source">
                  <span className="font-mono">{attack.source}</span>
                </Row>
                <Row label="Version">
                  <span className="font-mono">{attack.version} · library {LIBRARY_VERSION}</span>
                </Row>
                <Row label="Restricted">
                  <span className="font-mono">{attack.restricted ? 'yes' : 'no'}</span>
                </Row>
                <Row label="Signed">
                  <code className="font-mono text-muted-foreground truncate max-w-32 block">{attack.signed_sha || '—'}</code>
                </Row>
              </div>
              {(attack.references || []).length > 0 && (
                <div className="mt-3">
                  <div className="text-[10px] uppercase tracking-[0.12em] font-mono text-muted-foreground mb-1">References</div>
                  <ul className="space-y-0.5">
                    {attack.references.map(r => (
                      <li key={r}>
                        <a href={r} target="_blank" rel="noopener noreferrer" className="text-[11.5px] text-primary hover:underline inline-flex items-center gap-1 break-all">
                          <ExternalLink className="h-3 w-3 shrink-0" />
                          <span>{r}</span>
                        </a>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
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
