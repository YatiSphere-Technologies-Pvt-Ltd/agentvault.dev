'use client';

/* Shared UI bits for the Govern (control plane) suite.
   Header banner with sub-nav, risk/approval/type pills, fmt helpers. */

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { ShieldAlert, Activity, Layers, Cable, Eye, Gauge } from 'lucide-react';
import {
  RISK_CLASSES, APPROVAL_STATES, ASSET_TYPES,
  DESTINATION_CLASSES, CONNECTOR_FAMILIES, connectorById,
} from './_connectorCatalog';

const TABS = [
  { href: '/app/govern',             label: 'Overview',     icon: Eye },
  { href: '/app/govern/discovery',   label: 'Discovery',    icon: Activity },
  { href: '/app/govern/inventory',   label: 'AI Inventory', icon: Layers },
  { href: '/app/govern/runtime',     label: 'Runtime',      icon: Gauge },
  { href: '/app/govern/connectors',  label: 'Connectors',   icon: Cable },
];

export function GovernHeader() {
  const pathname = usePathname();
  return (
    <div className="border-b border-border bg-gradient-to-br from-destructive/[0.04] via-transparent to-transparent">
      <div className="max-w-[1680px] mx-auto px-4 sm:px-6 lg:px-8 pt-7 pb-3">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div className="min-w-0">
            <div className="inline-flex items-center gap-2 mb-2 px-2 py-0.5 rounded-md border border-destructive/40 bg-destructive/10 text-destructive text-[10.5px] font-medium uppercase tracking-[0.14em]">
              <ShieldAlert className="h-3 w-3" />
              Control plane
            </div>
            <h1 className="text-[24px] font-semibold tracking-tight text-foreground leading-tight">
              AI Governance & Control
            </h1>
            <p className="mt-1 text-[13px] text-muted-foreground max-w-[68ch] leading-relaxed">
              Discover every AI asset across the organization — internal agents, approved
              SaaS, Copilot seats, and unmanaged Shadow AI. Apply policy, enforce DLP at the
              gateway, and answer the audit question: <em>who used which model on which data?</em>
            </p>
          </div>
        </div>
        <nav className="mt-5 flex items-center gap-1">
          {TABS.map(t => {
            const active = t.href === '/app/govern'
              ? pathname === '/app/govern'
              : pathname.startsWith(t.href);
            const Icon = t.icon;
            return (
              <Link
                key={t.href}
                href={t.href}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-[12.5px] font-medium transition-colors ${
                  active
                    ? 'bg-destructive/10 text-destructive'
                    : 'text-muted-foreground hover:text-foreground hover:bg-muted/40'
                }`}
              >
                <Icon className="h-3.5 w-3.5" />
                {t.label}
              </Link>
            );
          })}
        </nav>
      </div>
    </div>
  );
}

/* Sub-nav rendered on every /app/govern/runtime/* page so the four
   runtime surfaces (Overview / DLP / Inspector / Gateway) feel like one
   product. */
const RUNTIME_TABS = [
  { href: '/app/govern/runtime',           label: 'Overview' },
  { href: '/app/govern/runtime/dlp',       label: 'DLP rules' },
  { href: '/app/govern/runtime/inspector', label: 'Prompt inspector' },
  { href: '/app/govern/runtime/gateway',   label: 'AI gateway' },
];

export function RuntimeSubNav() {
  const pathname = usePathname();
  return (
    <div className="border-b border-border bg-card/40">
      <div className="max-w-[1680px] mx-auto px-4 sm:px-6 lg:px-8">
        <nav className="flex items-center gap-1 py-2">
          {RUNTIME_TABS.map(t => {
            const active = t.href === '/app/govern/runtime'
              ? pathname === '/app/govern/runtime'
              : pathname.startsWith(t.href);
            return (
              <Link
                key={t.href}
                href={t.href}
                className={`inline-flex items-center px-3 py-1 rounded-md text-[12px] font-medium transition-colors ${
                  active
                    ? 'bg-destructive/10 text-destructive'
                    : 'text-muted-foreground hover:text-foreground hover:bg-muted/40'
                }`}
              >
                {t.label}
              </Link>
            );
          })}
        </nav>
      </div>
    </div>
  );
}

/* ────── pills ────── */

export function RiskPill({ risk }) {
  const meta = RISK_CLASSES[risk] || RISK_CLASSES.standard;
  return (
    <span
      className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded border text-[10px] font-mono uppercase tracking-[0.12em]"
      style={{
        borderColor: `color-mix(in oklab, ${meta.accent} 50%, transparent)`,
        background: `color-mix(in oklab, ${meta.accent} 12%, transparent)`,
        color: meta.accent,
      }}
    >
      <span className="h-1.5 w-1.5 rounded-full" style={{ background: meta.accent }} />
      {meta.label}
    </span>
  );
}

export function ApprovalPill({ state }) {
  const meta = APPROVAL_STATES[state] || APPROVAL_STATES.unknown;
  return (
    <span
      className="inline-flex items-center px-1.5 py-0.5 rounded border text-[10.5px] font-medium"
      style={{
        borderColor: `color-mix(in oklab, ${meta.accent} 50%, transparent)`,
        background: `color-mix(in oklab, ${meta.accent} 12%, transparent)`,
        color: meta.accent,
      }}
    >
      {meta.label}
    </span>
  );
}

export function AssetTypePill({ type }) {
  const meta = ASSET_TYPES[type];
  if (!meta) return null;
  return (
    <span
      className="inline-flex items-center px-1.5 py-0.5 rounded border text-[10.5px] font-medium"
      style={{
        borderColor: `color-mix(in oklab, ${meta.accent} 40%, transparent)`,
        background: `color-mix(in oklab, ${meta.accent} 10%, transparent)`,
        color: meta.accent,
      }}
    >
      {meta.label}
    </span>
  );
}

export function DestinationPill({ destination }) {
  const meta = DESTINATION_CLASSES[destination];
  if (!meta) return null;
  return (
    <span
      className="inline-flex items-center px-1.5 py-0.5 rounded border text-[10.5px] font-mono"
      style={{
        borderColor: `color-mix(in oklab, ${meta.accent} 40%, transparent)`,
        background: `color-mix(in oklab, ${meta.accent} 10%, transparent)`,
        color: meta.accent,
      }}
    >
      {meta.label}
    </span>
  );
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

const DECISION_TONE = {
  block:  { label: 'Blocked',  color: 'var(--destructive)' },
  redact: { label: 'Redacted', color: 'var(--accent)' },
  warn:   { label: 'Warned',   color: 'var(--accent)' },
  allow:  { label: 'Allowed',  color: 'var(--brand-teal)' },
  detect: { label: 'Detected', color: 'var(--primary)' },
};
export function DecisionPill({ decision }) {
  const meta = DECISION_TONE[decision] || DECISION_TONE.allow;
  return (
    <span
      className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded border text-[10px] font-mono uppercase tracking-[0.12em]"
      style={{
        borderColor: `color-mix(in oklab, ${meta.color} 50%, transparent)`,
        background: `color-mix(in oklab, ${meta.color} 12%, transparent)`,
        color: meta.color,
      }}
    >
      <span className="h-1.5 w-1.5 rounded-full" style={{ background: meta.color }} />
      {meta.label}
    </span>
  );
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
