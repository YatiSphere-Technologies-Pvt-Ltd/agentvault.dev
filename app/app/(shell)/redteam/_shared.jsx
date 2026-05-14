'use client';

/* Shared UI bits for the Red Team module.
   ────────────────────────────────────────
   Per-page header, pills (severity / verdict / category / status), fmt
   helpers. Same destructive-tinted palette as Govern. The sub-nav that
   used to live here is replaced by the Red Team collapsible group in the
   sidebar (Overview / Targets / Suites / Runs as children). */

import { ShieldAlert } from 'lucide-react';
import { GovernHeader, Chip } from '../govern/_shared';
import { SEVERITIES, CATEGORIES, ADVERSARY_CLASSES } from './_attackCatalog';

export function RedTeamHeader({ title = 'Red Team posture', subtitle, actions } = {}) {
  // Reuse Govern's outer banner — Red Team lives inside the Govern mode.
  // Pages can override the title/subtitle; the eyebrow is fixed to "Red Team".
  return (
    <GovernHeader
      eyebrow="Red Team"
      eyebrowIcon={ShieldAlert}
      title={title}
      subtitle={subtitle ?? 'Continuous adversarial testing — empirical proof for the policies in Govern. Run probes against targets, track regressions, ship evidence packs.'}
      actions={actions}
    />
  );
}

/* ─── pills ─── */

export function SeverityPill({ severity }) {
  const meta = SEVERITIES[severity] || SEVERITIES.medium;
  return <Chip variant="mono" accent={meta.accent} label={meta.label} />;
}

const VERDICT_TONE = {
  pass:         { color: 'var(--brand-teal)',  label: 'Pass' },
  bypass:       { color: 'var(--destructive)', label: 'Bypass' },
  inconclusive: { color: '#F59E0B',            label: 'Review' },
  regression:   { color: 'var(--destructive)', label: 'Regression' },
};
export function VerdictPill({ verdict, isRegression }) {
  const key = isRegression ? 'regression' : verdict;
  const meta = VERDICT_TONE[key] || VERDICT_TONE.bypass;
  return <Chip variant="mono" accent={meta.color} label={meta.label} />;
}

export function CategoryPill({ category }) {
  const meta = CATEGORIES[category];
  if (!meta) return null;
  return <Chip accent={meta.accent} label={meta.label} />;
}

export function AdversaryPill({ klass }) {
  const meta = ADVERSARY_CLASSES[klass];
  if (!meta) return null;
  // No accent — adversary class is taxonomic, not scored.
  return <Chip variant="mono" label={meta.label} title={meta.hint} />;
}

/* Posture score badge — color comes through the dot. Numeric label stays
   high-contrast slate so the score is always readable. */
export function PostureBadge({ score }) {
  if (score == null) return <span className="text-[11px] text-muted-foreground">—</span>;
  const accent = score >= 90 ? 'var(--brand-teal)'
              : score >= 75 ? 'var(--primary)'
              : score >= 60 ? '#F59E0B'
              : 'var(--destructive)';
  return (
    <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded border border-border bg-muted/60 text-[10.5px] font-mono font-medium tabular-nums text-foreground">
      <span className="h-1.5 w-1.5 rounded-full shrink-0" style={{ background: accent }} />
      {score}/100
    </span>
  );
}

/* ─── fmt helpers ─── */

export function fmtAgo(ms) {
  if (ms == null) return '—';
  const sec = Math.floor((Date.now() - ms) / 1000);
  if (sec < 60)  return `${sec}s ago`;
  const m = Math.floor(sec / 60);
  if (m < 60)    return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24)    return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

export function fmtNum(n) {
  if (n == null) return '—';
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000)     return `${(n / 1_000).toFixed(1)}k`;
  return String(n);
}

export function fmtCost(usd) {
  if (usd == null) return '—';
  if (usd < 1)   return `$${usd.toFixed(2)}`;
  if (usd < 100) return `$${usd.toFixed(2)}`;
  return `$${Math.round(usd).toLocaleString()}`;
}
