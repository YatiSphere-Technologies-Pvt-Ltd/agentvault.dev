'use client';

/* Shared UI bits for the Govern (control plane) suite.
   Header banner with sub-nav, risk/approval/type pills, fmt helpers. */

import { ShieldAlert } from 'lucide-react';
import {
  RISK_CLASSES, APPROVAL_STATES, ASSET_TYPES,
  DESTINATION_CLASSES, CONNECTOR_FAMILIES, connectorById,
} from './_connectorCatalog';

/* Per-page header for the Govern suite. Each page passes its own
   title + subtitle; the tab strip used to live here but the sidebar now
   carries that navigation. `eyebrow` defaults to "Control plane" but
   pages can override it (e.g. Red Team uses "Red Team"). `actions` is an
   optional slot rendered on the right of the title row for CTAs.

   Visual: muted parchment gradient + primary-tinted eyebrow chip. Red is
   reserved for explicit fail-state pills inside the page body, not the
   chrome that wraps every Govern page. */
export function GovernHeader({
  title = 'AI Governance & Control',
  subtitle,
  eyebrow = 'Control plane',
  eyebrowIcon: EyebrowIcon = ShieldAlert,
  actions,
}) {
  return (
    <div className="border-b border-border bg-gradient-to-br from-muted/40 via-transparent to-transparent">
      <div className="max-w-[1680px] mx-auto px-4 sm:px-6 lg:px-8 pt-7 pb-5">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div className="min-w-0">
            <div className="inline-flex items-center gap-2 mb-2 px-2 py-0.5 rounded-md border border-primary/30 bg-primary/[0.08] text-primary text-[10.5px] font-medium uppercase tracking-[0.14em]">
              {EyebrowIcon ? <EyebrowIcon className="h-3 w-3" /> : null}
              {eyebrow}
            </div>
            <h1 className="text-[24px] font-semibold tracking-tight text-foreground leading-tight">
              {title}
            </h1>
            {subtitle && (
              <p className="mt-1 text-[13px] text-muted-foreground max-w-[80ch] leading-relaxed">
                {subtitle}
              </p>
            )}
          </div>
          {actions && <div className="shrink-0">{actions}</div>}
        </div>
      </div>
    </div>
  );
}

/* ────── pills ────── */

/* Shared chip primitive used by every status pill in the Govern + Red
   Team suite. Three style decisions:
     1. Background is the muted neutral (`bg-muted/60`) — never the accent
        tinted. This keeps all chips reading at the same visual weight and
        avoids the red-on-red / amber-on-amber contrast problem the
        old `color-mix(... 10%)` design produced.
     2. Text is `text-foreground` (deep slate ink) — always high contrast
        regardless of the accent.
     3. Color comes through a 6px dot on the left. Reserves color as a
        signal, not as the whole chip.

   `variant` controls casing/font:
     - "default" → mixed-case medium label (Approval, Asset type, Destination)
     - "mono"    → uppercase mono small-caps (Risk, Severity, Verdict, Decision)
*/
export function Chip({ accent, label, variant = 'default', title }) {
  const isMono = variant === 'mono';
  const cls = isMono
    ? 'inline-flex items-center gap-1 px-1.5 py-0.5 rounded border border-border bg-muted/60 text-[10px] font-mono uppercase tracking-[0.12em] text-foreground'
    : 'inline-flex items-center gap-1 px-1.5 py-0.5 rounded border border-border bg-muted/60 text-[10.5px] font-medium text-foreground';
  return (
    <span className={cls} title={title}>
      {accent && <span className="h-1.5 w-1.5 rounded-full shrink-0" style={{ background: accent }} />}
      {label}
    </span>
  );
}

export function RiskPill({ risk }) {
  const meta = RISK_CLASSES[risk] || RISK_CLASSES.standard;
  return <Chip variant="mono" accent={meta.accent} label={meta.label} />;
}

export function ApprovalPill({ state }) {
  const meta = APPROVAL_STATES[state] || APPROVAL_STATES.unknown;
  return <Chip accent={meta.accent} label={meta.label} />;
}

export function AssetTypePill({ type }) {
  const meta = ASSET_TYPES[type];
  if (!meta) return null;
  return <Chip accent={meta.accent} label={meta.label} title={meta.hint} />;
}

export function DestinationPill({ destination }) {
  const meta = DESTINATION_CLASSES[destination];
  if (!meta) return null;
  return <Chip variant="mono" accent={meta.accent} label={meta.label} />;
}

/* Connector logo — same letter-tile pattern as Context Engine. */
export function ConnectorIcon({ kind, size = 28 }) {
  const c = connectorById(kind);
  const meta = c ? CONNECTOR_FAMILIES[c.family] : null;
  const initial = (c?.label || kind || '??').slice(0, 2).toUpperCase();
  return (
    <div
      className="rounded-md flex items-center justify-center font-mono font-medium shrink-0"
      style={{
        height: size,
        width: size,
        background: `color-mix(in oklab, ${meta?.accent || 'var(--muted-foreground)'} 12%, transparent)`,
        border: `1px solid color-mix(in oklab, ${meta?.accent || 'var(--muted-foreground)'} 30%, transparent)`,
        color: meta?.accent || 'var(--muted-foreground)',
        fontSize: size <= 20 ? 9 : size <= 28 ? 10.5 : 12,
      }}
    >
      {initial}
    </div>
  );
}

/* ────── decision tone for events ────── */

/* `redact` and `warn` used to reuse var(--accent), which is parchment-muted
   on the current theme and rendered as invisible text. Switch them to amber
   so they're visually distinct from "block" (red) and "allow" (teal). */
const DECISION_TONE = {
  block:  { label: 'Blocked',  color: 'var(--destructive)' },
  redact: { label: 'Redacted', color: '#D97706' /* dark amber */ },
  warn:   { label: 'Warned',   color: '#F59E0B' /* amber */ },
  allow:  { label: 'Allowed',  color: 'var(--brand-teal)' },
  detect: { label: 'Detected', color: 'var(--primary)' },
};
export function DecisionPill({ decision }) {
  const meta = DECISION_TONE[decision] || DECISION_TONE.allow;
  return <Chip variant="mono" accent={meta.color} label={meta.label} />;
}

/* ────── helpers ────── */

export function fmtAgo(ms) {
  if (ms == null) return '—';
  const sec = Math.floor((Date.now() - ms) / 1000);
  if (sec < 60)        return `${sec}s ago`;
  const mins = Math.floor(sec / 60);
  if (mins < 60)       return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24)        return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

export function fmtNum(n) {
  if (n == null) return '—';
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000)     return `${(n / 1_000).toFixed(1)}k`;
  return String(n);
}

export function fmtKb(kb) {
  if (kb == null) return '—';
  if (kb < 1) return `${(kb * 1024).toFixed(0)} B`;
  if (kb < 1024) return `${kb.toFixed(1)} KB`;
  return `${(kb / 1024).toFixed(1)} MB`;
}
