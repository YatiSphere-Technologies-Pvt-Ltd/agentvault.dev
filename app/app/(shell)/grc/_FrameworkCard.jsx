'use client';

import Link from 'next/link';
import { CONTROLS, coverageFor, clauseStatusFor, healthFor } from './_data';
import {
  effectiveCoverageFor,
  effectiveClauseStatusFor,
  effectiveHealthFor,
} from './_clauseMappingStore';

/* CoverageRing
   ------------
   SVG donut. Stroke is the framework brand color; the unfilled portion is a
   muted track. Center text shows the integer percentage. Sized 64px square so
   it sits comfortably alongside two lines of title text. */
function CoverageRing({ pct, color, size = 64, stroke = 6 }) {
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const dash = c * Math.min(1, Math.max(0, pct));
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="shrink-0">
      <circle
        cx={size / 2}
        cy={size / 2}
        r={r}
        fill="none"
        stroke="var(--muted)"
        strokeWidth={stroke}
      />
      <circle
        cx={size / 2}
        cy={size / 2}
        r={r}
        fill="none"
        stroke={color}
        strokeWidth={stroke}
        strokeLinecap="round"
        strokeDasharray={`${dash} ${c - dash}`}
        transform={`rotate(-90 ${size / 2} ${size / 2})`}
        style={{ transition: 'stroke-dasharray 400ms ease' }}
      />
      <text
        x="50%"
        y="50%"
        dominantBaseline="central"
        textAnchor="middle"
        className="font-semibold tabular-nums fill-foreground"
        style={{ fontSize: size * 0.28 }}
      >
        {Math.round(pct * 100)}%
      </text>
    </svg>
  );
}

/* DensityGrid
   -----------
   One tile per clause. Filled = at least one control discharges it; muted =
   no control mapped yet. Tooltip shows the clause label and contributor count
   so the operator can see which clause is uncovered without opening the page. */
function DensityGrid({ statuses, color }) {
  return (
    <div className="flex flex-wrap gap-[3px]">
      {statuses.map(s => (
        <span
          key={s.id}
          title={`${s.label} · ${s.controls} control${s.controls === 1 ? '' : 's'}`}
          className="h-2 w-4 rounded-[2px]"
          style={{
            background: s.controls > 0 ? color : 'var(--muted)',
            opacity: s.controls > 0 ? Math.min(1, 0.55 + s.controls * 0.15) : 1,
          }}
        />
      ))}
    </div>
  );
}

export default function FrameworkCard({ framework, mappings }) {
  const fw = framework;
  const cov      = mappings ? effectiveCoverageFor(mappings, fw.slug)               : coverageFor(fw.slug);
  const statuses = mappings ? effectiveClauseStatusFor(mappings, fw.slug)           : clauseStatusFor(fw.slug);
  const health   = mappings ? effectiveHealthFor(mappings, fw.slug, CONTROLS)       : healthFor(fw.slug);

  const violationTone = health.violations7d === 0
    ? 'text-accent'
    : health.violations7d <= 5
      ? 'text-primary'
      : 'text-destructive';

  return (
    <Link
      href={`/app/grc/frameworks/${fw.slug}`}
      className="group relative block bg-panel border border-border rounded-xl overflow-hidden hover:border-primary/40 hover:shadow-sm transition-all"
    >
      {/* Subtle accent wash from the framework color */}
      <div
        aria-hidden
        className="absolute inset-0 pointer-events-none opacity-[0.06] group-hover:opacity-[0.10] transition-opacity"
        style={{ background: `radial-gradient(220px 140px at 100% 0%, ${fw.color}, transparent 60%)` }}
      />

      <div className="relative p-4">
        {/* Top: ring + identity */}
        <div className="flex items-start gap-3">
          <CoverageRing pct={cov.pct} color={fw.color} />
          <div className="min-w-0 flex-1">
            <div className="text-[13.5px] font-semibold text-foreground leading-tight truncate">
              {fw.name}
            </div>
            <div className="mt-0.5 text-[10.5px] text-muted-foreground font-mono truncate">
              {fw.kind} · {fw.jurisdiction}
            </div>
            <div className="mt-1.5 inline-flex items-center gap-1.5 text-[10px] font-mono px-1.5 py-0.5 rounded border"
                 style={{ borderColor: fw.color + '55', color: fw.color, background: fw.color + '10' }}>
              <span className="h-1 w-1 rounded-full" style={{ background: fw.color }} />
              {fw.status}
            </div>
          </div>
        </div>

        {/* Density grid */}
        <div className="mt-3">
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-[10px] uppercase tracking-[0.15em] font-mono text-muted-foreground">
              Clauses
            </span>
            <span className="text-[10.5px] font-mono tabular-nums text-foreground">
              {cov.covered}<span className="text-muted-foreground">/{cov.total}</span>
            </span>
          </div>
          <DensityGrid statuses={statuses} color={fw.color} />
        </div>

        {/* Footer stats */}
        <div className="mt-3 pt-3 border-t border-border grid grid-cols-2 gap-2 text-[10.5px] font-mono">
          <div className="flex items-center justify-between gap-2 min-w-0">
            <span className="text-muted-foreground truncate">Controls</span>
            <span className="text-foreground tabular-nums">{health.controls}</span>
          </div>
          <div className="flex items-center justify-between gap-2 min-w-0">
            <span className="text-muted-foreground truncate">Findings · 7d</span>
            <span className={`tabular-nums ${violationTone}`}>{health.violations7d}</span>
          </div>
        </div>
      </div>
    </Link>
  );
}
