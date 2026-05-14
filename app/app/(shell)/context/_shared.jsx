'use client';

/* Shared UI bits for the Context Engine pages.
   Banner header, source-icon registry, source-family pill, health pill,
   freshness chip — same pattern as GrcHeader for consistency. */

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Database, Layers, Sparkles, ShieldCheck } from 'lucide-react';
import { SOURCE_FAMILIES, sourceById } from './_sourceCatalog';

const TABS = [
  { href: '/app/context',         label: 'Overview' },
  { href: '/app/context/sources', label: 'Sources'  },
  { href: '/app/context/corpora', label: 'Corpora'  },
];

export function ContextHeader() {
  const pathname = usePathname();
  return (
    <div className="border-b border-border bg-gradient-to-br from-primary/[0.04] via-transparent to-transparent">
      <div className="max-w-[1680px] mx-auto px-4 sm:px-6 lg:px-8 pt-7 pb-3">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div className="min-w-0">
            <div className="inline-flex items-center gap-2 mb-2 px-2 py-0.5 rounded-md border border-primary/40 bg-primary/10 text-primary text-[10.5px] font-medium uppercase tracking-[0.14em]">
              <Sparkles className="h-3 w-3" />
              AgentVault Suite
            </div>
            <h1 className="text-[24px] font-semibold tracking-tight text-foreground leading-tight">
              Context Engine
            </h1>
            <p className="mt-1 text-[13px] text-muted-foreground max-w-[60ch] leading-relaxed">
              Enterprise RAG, managed. Sources keep your warehouse permissions intact;
              corpora are searchable units agents subscribe to. Freshness, ACLs, and
              eval scores are first-class.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2 shrink-0">
            <Pill icon={ShieldCheck} text="Row-level ACL inheritance" />
            <Pill icon={Database} text="Hybrid vector + keyword" />
            <Pill icon={Layers} text="Eval-set scoring" />
          </div>
        </div>
        <nav className="mt-5 flex items-center gap-1">
          {TABS.map(t => {
            const active = t.href === '/app/context'
              ? pathname === '/app/context'
              : pathname.startsWith(t.href);
            return (
              <Link
                key={t.href}
                href={t.href}
                className={`inline-flex items-center px-3 py-1.5 rounded-md text-[12.5px] font-medium transition-colors ${
                  active
                    ? 'bg-primary/10 text-primary'
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

function Pill({ icon: Icon, text }) {
  return (
    <span className="inline-flex items-center gap-1.5 px-2 py-1 rounded-md border border-border bg-card text-[11px] text-foreground">
      <Icon className="h-3 w-3 text-primary" />
      {text}
    </span>
  );
}

/* ────────── small reusable cells ────────── */

const HEALTH_TONE = {
  green:  'border-(--brand-teal)/40 text-brand-teal bg-(--brand-teal)/10',
  yellow: 'border-primary/40 text-primary bg-primary/10',
  red:    'border-destructive/40 text-destructive bg-destructive/10',
};

export function HealthPill({ health }) {
  return (
    <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded border text-[10.5px] font-mono uppercase tracking-[0.12em] ${HEALTH_TONE[health] || HEALTH_TONE.green}`}>
      <span className={`h-1.5 w-1.5 rounded-full ${
        health === 'green'  ? 'bg-brand-teal' :
        health === 'yellow' ? 'bg-primary animate-pulse-dot' :
                              'bg-destructive'
      }`} />
      {health}
    </span>
  );
}

export function FamilyPill({ family }) {
  const meta = SOURCE_FAMILIES[family];
  if (!meta) return null;
  return (
    <span
      className="inline-flex items-center gap-1.5 px-1.5 py-0.5 rounded border text-[10.5px] font-medium"
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

/* Render the source's logo. We don't ship vendor SVGs; a colored letter
   tile keyed by source-family is enough to read the row at a glance. */
export function SourceIcon({ kind, size = 28 }) {
  const src = sourceById(kind);
  if (!src) {
    return (
      <div className="rounded-md bg-muted text-muted-foreground flex items-center justify-center font-mono text-[11px] shrink-0"
           style={{ height: size, width: size }}>
        ?
      </div>
    );
  }
  const meta = SOURCE_FAMILIES[src.family];
  const initial = (src.label || '').slice(0, 2).toUpperCase();
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

/* Format helpers shared across pages. */
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

export function fmtMins(n) {
  if (n == null) return '—';
  if (n < 60)    return `${n}m`;
  const h = Math.floor(n / 60);
  if (h < 24)    return `${h}h`;
  return `${Math.floor(h / 24)}d`;
}
