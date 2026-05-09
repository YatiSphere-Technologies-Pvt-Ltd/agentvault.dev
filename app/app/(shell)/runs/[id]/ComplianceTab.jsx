'use client';

import Link from 'next/link';
import { useMemo } from 'react';
import { Shield, FileSignature, Hash, ExternalLink, CheckCircle2 } from 'lucide-react';
import {
  CONTROLS,
  MAPPINGS,
  frameworkBySlug,
  decisionTone,
  hookLabel,
} from '../../grc/_data';

/* ComplianceTab
   -------------
   Operator + auditor view of the run, organised by the questions a regulator
   actually asks:

     1. Did every required policy gate fire? Show every gate, when, decision.
     2. Which framework clauses did this run discharge? Group by framework.
     3. Was the run sealed into evidence? Show the audit record id + hash.
     4. Were any approvals captured? Show approver + decision time.
*/

export default function ComplianceTab({ runId, agentName, gates, trace }) {
  const counts = gates.reduce((acc, g) => { acc[g.decision] = (acc[g.decision] || 0) + 1; return acc; }, {});

  // Aggregate framework discharge: for each gate, look up the control's
  // mappings; collect a Set of (framework, clause) the run discharges.
  const dischargedByFramework = useMemo(() => {
    const out = new Map();
    for (const g of gates) {
      // Prefer the explicit framework+clause on the eval row.
      if (g.framework) {
        const k = g.framework;
        if (!out.has(k)) out.set(k, new Map());
        const inner = out.get(k);
        const clauses = inner.get(g.clause) || [];
        clauses.push(g);
        inner.set(g.clause, clauses);
        continue;
      }
      // Fall through: synthesize from the control's mappings.
      const pairs = MAPPINGS[g.controlId] || [];
      for (const [fw, clause] of pairs) {
        if (!out.has(fw)) out.set(fw, new Map());
        const inner = out.get(fw);
        const arr = inner.get(clause) || [];
        arr.push(g);
        inner.set(clause, arr);
      }
    }
    return out;
  }, [gates]);

  const evidenceHash = useMemo(() => fakeHash(runId), [runId]);

  const approvals = gates.filter(g => g.decision === 'require_approval');

  return (
    <div className="space-y-5">
      {/* Headline strip: counts by decision */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        <Tile label="Total gates" value={gates.length} />
        <Tile label="Blocked"   value={counts.block || 0}            tone={counts.block ? 'bad' : 'muted'} />
        <Tile label="Approvals" value={counts.require_approval || 0} tone={counts.require_approval ? 'warn' : 'muted'} />
        <Tile label="Warnings"  value={(counts.warn || 0) + (counts.redact || 0)} tone={(counts.warn || counts.redact) ? 'warn' : 'muted'} />
        <Tile label="Logged"    value={counts.log || 0} />
      </div>

      {/* Gate-by-gate ledger */}
      <Section title="Policy gate ledger" subtitle={`Every gate the run engine evaluated, in order`}>
        <div className="rounded-xl border border-border bg-card overflow-hidden divide-y divide-border">
          {gates.length === 0 && (
            <div className="p-6 text-center text-[12.5px] text-muted-foreground">
              No policy gates fired during this run.
            </div>
          )}
          {gates.map(g => {
            const tone = decisionTone(g.decision);
            const c = CONTROLS.find(x => x.id === g.controlId);
            const fw = g.framework ? frameworkBySlug(g.framework) : null;
            return (
              <div key={g.id} className="px-4 py-3 grid grid-cols-1 lg:grid-cols-[140px_minmax(0,1fr)_180px] gap-3 items-start">
                <div className="flex items-center gap-2">
                  <span className="h-1.5 w-1.5 rounded-full shrink-0" style={{ background: tone.color }} />
                  <span
                    className="inline-flex items-center px-2 py-0.5 rounded-md border text-[11px] font-medium"
                    style={{ borderColor: tone.color + '55', color: tone.color, background: tone.color + '12' }}
                  >
                    {tone.label}
                  </span>
                  <span className="text-[10.5px] font-mono text-muted-foreground">{hookLabel(g.hook)}</span>
                </div>
                <div className="min-w-0">
                  <Link
                    href={`/app/grc/controls#${g.controlId}`}
                    className="text-[13px] font-medium text-foreground hover:text-primary truncate inline-block max-w-full"
                  >
                    {c?.title || g.controlId}
                  </Link>
                  <div className="mt-0.5 text-[12px] text-muted-foreground leading-relaxed">{g.detail}</div>
                  {(fw || (c && (MAPPINGS[c.id] || []).length > 0)) && (
                    <div className="mt-1.5 flex items-center gap-1 flex-wrap">
                      <span className="text-[10.5px] text-muted-foreground">discharges</span>
                      {fw ? (
                        <Badge fw={fw} clauseId={g.clause} />
                      ) : (
                        Array.from(new Set((MAPPINGS[c.id] || []).map(([s]) => s))).slice(0, 5).map(slug => {
                          const f = frameworkBySlug(slug);
                          return f ? <Badge key={slug} fw={f} /> : null;
                        })
                      )}
                    </div>
                  )}
                </div>
                <div className="text-right text-[10.5px] font-mono text-muted-foreground">
                  {g.when}
                </div>
              </div>
            );
          })}
        </div>
      </Section>

      {/* Frameworks discharged */}
      <Section title="Frameworks discharged" subtitle={`${dischargedByFramework.size} framework${dischargedByFramework.size === 1 ? '' : 's'} satisfied by this run`}>
        {dischargedByFramework.size === 0 ? (
          <div className="rounded-xl border border-dashed border-border bg-muted/20 p-4 text-[12.5px] text-muted-foreground">
            No clauses were discharged.
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
            {Array.from(dischargedByFramework.entries()).map(([slug, clauseMap]) => {
              const fw = frameworkBySlug(slug);
              if (!fw) return null;
              const totalClauses = fw.clauses.length;
              const clauseEntries = Array.from(clauseMap.entries());
              return (
                <div key={slug} className="rounded-xl border border-border bg-card p-4">
                  <div className="flex items-center justify-between gap-2">
                    <Link
                      href={`/app/grc/frameworks/${slug}`}
                      className="inline-flex items-center gap-2 text-[13px] font-semibold text-foreground hover:text-primary truncate"
                    >
                      <span className="h-2 w-2 rounded-full shrink-0" style={{ background: fw.color }} />
                      <span className="truncate">{fw.name}</span>
                    </Link>
                    <span className="text-[11px] font-mono text-muted-foreground tabular-nums shrink-0">
                      {clauseEntries.length}/{totalClauses}
                    </span>
                  </div>
                  <ul className="mt-3 space-y-1.5">
                    {clauseEntries.map(([clauseId, gs]) => {
                      const clause = fw.clauses.find(c => c.id === clauseId);
                      return (
                        <li key={clauseId} className="text-[12px]">
                          <div className="flex items-baseline gap-2">
                            <CheckCircle2 className="h-3 w-3 text-brand-teal shrink-0" />
                            <span className="text-foreground">{clause?.label || clauseId}</span>
                          </div>
                          {clause?.description && (
                            <p className="mt-0.5 ml-5 text-[11px] text-muted-foreground line-clamp-1">
                              {clause.description}
                            </p>
                          )}
                        </li>
                      );
                    })}
                  </ul>
                </div>
              );
            })}
          </div>
        )}
      </Section>

      {/* Approvals + Evidence side-by-side */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <Section title="Approvals" subtitle={approvals.length === 0 ? 'No approvals required' : `${approvals.length} captured`}>
          {approvals.length === 0 ? (
            <div className="rounded-xl border border-dashed border-border bg-muted/20 p-4 flex items-center gap-3 text-[12.5px] text-muted-foreground">
              <Shield className="h-4 w-4 text-muted-foreground/70 shrink-0" />
              <span>No high-risk action triggered an approval gate.</span>
            </div>
          ) : (
            <div className="rounded-xl border border-border bg-card divide-y divide-border">
              {approvals.map((g, i) => {
                const c = CONTROLS.find(x => x.id === g.controlId);
                const approver = pickApprover(runId, i);
                return (
                  <div key={g.id} className="px-4 py-3">
                    <div className="text-[12.5px] font-medium text-foreground">{c?.title || g.controlId}</div>
                    <div className="mt-0.5 text-[11.5px] text-muted-foreground">{g.detail}</div>
                    <div className="mt-2 flex items-center gap-2 flex-wrap text-[11px]">
                      <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md border border-primary/30 bg-primary/10 text-primary font-medium">
                        <CheckCircle2 className="h-3 w-3" />
                        Approved
                      </span>
                      <span className="text-muted-foreground">by</span>
                      <span className="font-mono text-foreground">{approver}</span>
                      <span className="text-muted-foreground">·</span>
                      <span className="font-mono text-muted-foreground">{g.when}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </Section>

        <Section title="Evidence record" subtitle="Hash-chained audit artifact for this run">
          <div className="rounded-xl border border-border bg-card p-4 space-y-3">
            <div className="flex items-start gap-3">
              <FileSignature className="h-4 w-4 text-brand-teal shrink-0 mt-0.5" />
              <div>
                <div className="text-[12.5px] font-medium text-foreground">Audit record sealed</div>
                <p className="mt-0.5 text-[11.5px] text-muted-foreground">
                  Run inputs, tool calls, model versions, and policy decisions captured under SOC 2 CC7.2 and EU AI Act Art. 12.
                </p>
              </div>
            </div>
            <dl className="border border-border rounded-lg divide-y divide-border bg-muted/20">
              <Field label="Run ID"        value={runId} mono />
              <Field label="Agent"         value={agentName} />
              <Field label="Sealed at"     value={trace.endedAt ? new Date(trace.endedAt).toLocaleString() : '—'} />
              <Field label="SHA-256"       value={evidenceHash} mono />
              <Field label="Retention"     value="18 months · immutable" />
              <Field label="Frameworks"    value={`${dischargedByFramework.size} discharged`} />
            </dl>
            <div className="flex items-center gap-2">
              <Link
                href="/app/grc"
                className="inline-flex items-center gap-1 text-[12px] text-primary hover:brightness-110"
              >
                <Hash className="h-3.5 w-3.5" />
                Verify in GRC
                <ExternalLink className="h-3.5 w-3.5" />
              </Link>
            </div>
          </div>
        </Section>
      </div>
    </div>
  );
}

/* ───────────────────── Building blocks ───────────────────── */

function Section({ title, subtitle, children }) {
  return (
    <section>
      <div className="mb-3">
        <h3 className="text-[14px] font-semibold text-foreground">{title}</h3>
        {subtitle && <p className="mt-0.5 text-[12px] text-muted-foreground">{subtitle}</p>}
      </div>
      {children}
    </section>
  );
}

function Tile({ label, value, tone = 'muted' }) {
  const color = tone === 'bad'  ? 'text-destructive'
              : tone === 'warn' ? 'text-primary'
              : tone === 'ok'   ? 'text-brand-teal'
              :                   'text-foreground';
  return (
    <div className="rounded-lg border border-border bg-card p-3">
      <div className="text-[11.5px] font-medium text-muted-foreground">{label}</div>
      <div className={`mt-1 text-[20px] font-semibold tabular-nums ${color}`}>{value}</div>
    </div>
  );
}

function Field({ label, value, mono = false }) {
  return (
    <div className="grid grid-cols-[120px_1fr] gap-3 px-3 py-2">
      <dt className="text-[11px] text-muted-foreground">{label}</dt>
      <dd className={`text-[12px] text-foreground break-all ${mono ? 'font-mono' : ''}`}>{value}</dd>
    </div>
  );
}

function Badge({ fw, clauseId }) {
  return (
    <Link
      href={`/app/grc/frameworks/${fw.slug}`}
      className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded border text-[10px] font-medium hover:brightness-110"
      style={{ borderColor: fw.color + '55', color: fw.color, background: fw.color + '12' }}
    >
      <span className="h-1 w-1 rounded-full" style={{ background: fw.color }} />
      {fw.name.split(' ').slice(0, 2).join(' ')}
      {clauseId && <span className="opacity-70 font-mono">{clauseId}</span>}
    </Link>
  );
}

function fakeHash(seed) {
  // Stable hex digest for the demo — derived from runId so the same run shows
  // the same hash every time.
  let h = 2166136261;
  for (let i = 0; i < seed.length; i++) { h ^= seed.charCodeAt(i); h = Math.imul(h, 16777619); }
  const hex = (h >>> 0).toString(16).padStart(8, '0');
  return `0x${hex}${hex}${hex}…${hex}`.slice(0, 38);
}

function pickApprover(runId, idx) {
  const pool = ['priya.nair@corp', 'marcus.lee@corp', 'samira.kenji@corp', 'danielle.okafor@corp'];
  let h = 0;
  for (let i = 0; i < runId.length; i++) h = (h * 31 + runId.charCodeAt(i)) | 0;
  return pool[(Math.abs(h) + idx) % pool.length];
}
