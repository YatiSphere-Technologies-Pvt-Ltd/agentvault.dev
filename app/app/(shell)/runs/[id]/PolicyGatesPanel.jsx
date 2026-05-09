'use client';

import Link from 'next/link';
import {
  CONTROLS,
  MAPPINGS,
  frameworkBySlug,
  decisionTone,
  hookLabel,
} from '../../grc/_data';
import { gatesForRun } from './_gates';

export default function PolicyGatesPanel({ runId, agentName }) {
  const gates = gatesForRun(runId, agentName);

  // Roll-up
  const counts = gates.reduce((acc, g) => {
    acc[g.decision] = (acc[g.decision] || 0) + 1;
    return acc;
  }, {});
  const blocked = (counts.block || 0);
  const approvals = (counts.require_approval || 0);
  const warned = (counts.warn || 0) + (counts.redact || 0);
  const overallTone = blocked > 0
    ? { label: 'Blocked', color: 'var(--destructive)' }
    : approvals > 0
      ? { label: 'Approval pending', color: 'var(--primary)' }
      : warned > 0
        ? { label: 'With warnings', color: 'var(--accent)' }
        : { label: 'All clear', color: 'var(--accent)' };

  return (
    <div className="mt-5 rounded-lg border border-border bg-panel">
      <div className="px-4 py-3 border-b border-border flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-2 min-w-0">
          <svg width="14" height="14" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.7" className="text-muted-foreground">
            <path d="M10 3l6 2v5c0 4-3 6-6 7-3-1-6-3-6-7V5l6-2z"/><path d="M7.5 10l2 2 3-3.5"/>
          </svg>
          <span className="text-[12.5px] font-medium text-foreground">Policy gates</span>
          <span className="text-[10.5px] font-mono text-muted-foreground">· {gates.length} evaluation{gates.length === 1 ? '' : 's'}</span>
        </div>
        <div className="flex items-center gap-2 text-[11px] font-mono">
          <span className="inline-flex items-center gap-1.5" style={{ color: overallTone.color }}>
            <span className="h-1.5 w-1.5 rounded-full" style={{ background: overallTone.color }} />
            {overallTone.label}
          </span>
          <Link href="/app/grc" className="text-primary hover:brightness-110">GRC →</Link>
        </div>
      </div>

      <div className="divide-y divide-border">
        {gates.map(g => {
          const tone = decisionTone(g.decision);
          const c = CONTROLS.find(x => x.id === g.controlId);
          const fw = g.framework ? frameworkBySlug(g.framework) : null;
          return (
            <div key={g.id} className="px-4 py-3">
              <div className="flex items-start justify-between gap-3 flex-wrap">
                <div className="flex items-center gap-2 min-w-0">
                  <span className="h-1.5 w-1.5 rounded-full shrink-0" style={{ background: tone.color }} />
                  <span
                    className="text-[10.5px] font-mono uppercase tracking-[0.1em] shrink-0"
                    style={{ color: tone.color }}
                  >
                    {tone.label}
                  </span>
                  <span className="text-[10.5px] font-mono text-muted-foreground shrink-0">· {hookLabel(g.hook)}</span>
                  <Link
                    href={`/app/grc/controls#${g.controlId}`}
                    className="text-[12px] text-foreground hover:text-primary truncate"
                  >
                    {c?.title || g.controlId}
                  </Link>
                </div>
                <span className="text-[10.5px] font-mono text-muted-foreground shrink-0">{g.when}</span>
              </div>
              <div className="mt-1 ml-3.5 text-[12px] text-muted-foreground">{g.detail}</div>
              <div className="mt-1.5 ml-3.5 flex items-center gap-1.5 flex-wrap">
                <span className="text-[10px] font-mono text-muted-foreground">discharges</span>
                {fw && (
                  <Link
                    href={`/app/grc/frameworks/${fw.slug}`}
                    className="text-[9.5px] font-mono px-1.5 py-0.5 rounded border hover:brightness-110"
                    style={{ borderColor: fw.color + '55', color: fw.color, background: fw.color + '10' }}
                  >
                    {fw.name.split(' ')[0]} {g.clause}
                  </Link>
                )}
                {!fw && c && (
                  // No specific framework on this synthesized eval — list the controls' linked frameworks.
                  <SyntheticFrameworkBadges controlId={c.id} />
                )}
              </div>
            </div>
          );
        })}
      </div>

      <div className="px-4 py-2.5 border-t border-border text-[10.5px] font-mono text-muted-foreground flex items-center justify-between">
        <span>Hook order: pre-run → pre-tool → pre-model → post-model → post-run</span>
        <Link href="/app/grc/policies" className="text-primary hover:brightness-110">Manage policies</Link>
      </div>
    </div>
  );
}

function SyntheticFrameworkBadges({ controlId }) {
  const slugs = Array.from(new Set((MAPPINGS[controlId] || []).map(([fw]) => fw)));
  return (
    <>
      {slugs.slice(0, 4).map(s => {
        const fw = frameworkBySlug(s);
        if (!fw) return null;
        return (
          <Link
            key={s}
            href={`/app/grc/frameworks/${s}`}
            className="text-[9.5px] font-mono px-1.5 py-0.5 rounded border hover:brightness-110"
            style={{ borderColor: fw.color + '55', color: fw.color, background: fw.color + '10' }}
          >
            {fw.name.split(' ')[0]}
          </Link>
        );
      })}
    </>
  );
}
