'use client';

import Link from 'next/link';
import {
  FRAMEWORKS,
  CONTROLS,
  EVALUATIONS,
  decisionTone,
  hookLabel,
  frameworkBySlug,
} from './_data';
import { usePolicies } from './_policyStore';
import { useClauseMappings } from './_clauseMappingStore';
import GrcHeader from './_GrcHeader';
import FrameworkCard from './_FrameworkCard';

export default function GrcOverviewPage() {
  const { list: POLICIES } = usePolicies();
  const { mappings } = useClauseMappings();
  const totalControls = CONTROLS.length;
  const passing = CONTROLS.filter(c => c.coverage >= 0.9).length;
  const drifting = CONTROLS.filter(c => c.coverage > 0 && c.coverage < 0.9).length;

  const violations7d = CONTROLS.reduce((s, c) => s + c.violations7d, 0);
  const evaluations7d = CONTROLS.reduce((s, c) => s + c.runs7d, 0);

  const KPIS = [
    { label: 'Frameworks in scope', value: String(FRAMEWORKS.length),         hint: 'AI Act · NIST · ISO 42001 + 5 more' },
    { label: 'Active controls',     value: String(totalControls),              hint: `${passing} healthy · ${drifting} drift` },
    { label: 'Active policies',     value: String(POLICIES.length),            hint: `${POLICIES.filter(p => (p.attached?.workspaces || 0) + (p.attached?.agents || 0) + (p.attached?.tools || 0) > 0).length} attached` },
    { label: 'Evaluations · 7d',    value: evaluations7d.toLocaleString(),     hint: `${violations7d} findings` },
  ];

  return (
    <>
      <GrcHeader />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-10 py-7">
        {/* KPIs */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {KPIS.map(k => (
            <div key={k.label} className="bg-panel border border-border rounded-xl p-4">
              <div className="text-[10.5px] uppercase tracking-[0.15em] text-muted-foreground font-mono">{k.label}</div>
              <div className="mt-1.5 text-[22px] font-semibold text-foreground tracking-tight tabular-nums">{k.value}</div>
              <div className="mt-1 text-[11px] text-muted-foreground font-mono truncate">{k.hint}</div>
            </div>
          ))}
        </div>

        {/* Two-column: framework coverage + recent evaluations */}
        <div className="mt-7 grid grid-cols-1 lg:grid-cols-[1.3fr_1fr] gap-6">
          {/* Framework coverage */}
          <section>
            <div className="flex items-end justify-between mb-3">
              <div>
                <div className="text-[10.5px] uppercase tracking-[0.2em] text-muted-foreground font-mono">Framework coverage</div>
                <h2 className="text-[16px] font-semibold text-foreground mt-0.5">{FRAMEWORKS.length} frameworks</h2>
              </div>
              <Link href="/app/grc/frameworks" className="text-[11.5px] text-primary hover:brightness-110 font-medium">View all →</Link>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {FRAMEWORKS.map(fw => (
                <FrameworkCard key={fw.slug} framework={fw} mappings={mappings} />
              ))}
            </div>
          </section>

          {/* Recent evaluations — the runtime-binding feed */}
          <section>
            <div className="flex items-end justify-between mb-3">
              <div>
                <div className="text-[10.5px] uppercase tracking-[0.2em] text-muted-foreground font-mono">Live evaluations</div>
                <h2 className="text-[16px] font-semibold text-foreground mt-0.5">Last 8 policy gates</h2>
              </div>
              <Link href="/app/runs" className="text-[11.5px] text-primary hover:brightness-110 font-medium">All runs →</Link>
            </div>
            <div className="bg-panel border border-border rounded-xl overflow-hidden divide-y divide-border">
              {EVALUATIONS.map(e => {
                const tone = decisionTone(e.decision);
                const fw = frameworkBySlug(e.framework);
                return (
                  <Link
                    key={e.id}
                    href={`/app/runs/${e.runId}`}
                    className="block px-4 py-3 hover:bg-muted/40 transition-colors"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="h-1.5 w-1.5 rounded-full shrink-0" style={{ background: tone.color }} />
                        <span
                          className="text-[10.5px] font-mono uppercase tracking-[0.1em] shrink-0"
                          style={{ color: tone.color }}
                        >
                          {tone.label}
                        </span>
                        <span className="text-[10.5px] font-mono text-muted-foreground shrink-0">· {hookLabel(e.hook)}</span>
                      </div>
                      <span className="text-[10.5px] font-mono text-muted-foreground shrink-0">{e.when}</span>
                    </div>
                    <div className="mt-1 text-[12.5px] text-foreground truncate">{e.detail}</div>
                    <div className="mt-1 flex items-center gap-2 text-[10.5px] font-mono text-muted-foreground">
                      <span className="truncate">{e.agentName}</span>
                      <span>·</span>
                      <span className="truncate">{e.controlId}</span>
                      {fw && (
                        <>
                          <span>·</span>
                          <span className="truncate" style={{ color: fw.color }}>{fw.name.split(' ')[0]} {e.clause}</span>
                        </>
                      )}
                    </div>
                  </Link>
                );
              })}
            </div>
          </section>
        </div>

        {/* Active policies row */}
        <section className="mt-8">
          <div className="flex items-end justify-between mb-3">
            <div>
              <div className="text-[10.5px] uppercase tracking-[0.2em] text-muted-foreground font-mono">Active policies</div>
              <h2 className="text-[16px] font-semibold text-foreground mt-0.5">{POLICIES.length} bundles</h2>
            </div>
            <Link href="/app/grc/policies" className="text-[11.5px] text-primary hover:brightness-110 font-medium">Manage →</Link>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {POLICIES.map(p => {
              const totalAttached = p.attached.workspaces + p.attached.agents + p.attached.tools;
              return (
                <Link
                  key={p.id}
                  href={`/app/grc/policies#${p.id}`}
                  className="block bg-panel border border-border rounded-xl p-4 hover:border-primary/40 transition-colors"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="text-[13.5px] font-medium text-foreground leading-snug">{p.name}</div>
                    <span className="text-[10px] font-mono text-muted-foreground shrink-0 mt-0.5">{p.controls.length} ctrls</span>
                  </div>
                  <p className="mt-2 text-[12px] text-muted-foreground leading-relaxed line-clamp-2">{p.summary}</p>
                  <div className="mt-3 flex items-center gap-1.5 flex-wrap">
                    {p.frameworks.slice(0, 4).map(fwSlug => {
                      const fw = frameworkBySlug(fwSlug);
                      if (!fw) return null;
                      return (
                        <span
                          key={fwSlug}
                          className="text-[9.5px] font-mono px-1.5 py-0.5 rounded border"
                          style={{ borderColor: fw.color + '55', color: fw.color, background: fw.color + '10' }}
                        >
                          {fw.name.split(' ')[0]}
                        </span>
                      );
                    })}
                  </div>
                  <div className="mt-3 pt-3 border-t border-border text-[10.5px] font-mono text-muted-foreground flex items-center gap-3">
                    <span>{p.attached.workspaces} ws</span>
                    <span>·</span>
                    <span>{p.attached.agents} agents</span>
                    <span>·</span>
                    <span>{p.attached.tools} tools</span>
                    <span className="ml-auto" style={{ color: totalAttached > 0 ? 'var(--accent)' : undefined }}>
                      {totalAttached > 0 ? 'attached' : 'unattached'}
                    </span>
                  </div>
                </Link>
              );
            })}
          </div>
        </section>
      </div>
    </>
  );
}
