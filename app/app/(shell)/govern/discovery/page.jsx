'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';
import { Search, ArrowRight, Pause, Play, Filter } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { FacetFilterBar } from '@/components/tables/FacetFilter';
import {
  GovernHeader, DecisionPill, ApprovalPill, RiskPill, AssetTypePill, fmtAgo, fmtKb,
} from '../_shared';
import { useEvents, useAssets, ackEvent } from '../_store';

/* Discovery feed.

   Streaming-style list. Each row is a single AI usage event captured by
   one of the connectors — proxy log, browser ext, OAuth grant, GitHub
   completion, etc. Filters are facet-style; the live tail can be paused.

   Click a row → expands inline to show the prompt preview (redacted) + a
   set of triage actions ("approve asset", "quarantine", "open ticket").
*/

const SOURCE_OPTIONS = [
  { value: 'proxy',       label: 'Network proxy' },
  { value: 'browser-ext', label: 'Browser ext' },
  { value: 'casb',        label: 'CASB' },
  { value: 'github',      label: 'GitHub' },
  { value: 'cloud-audit', label: 'Cloud audit' },
  { value: 'oauth',       label: 'OAuth' },
  { value: 'crowdstrike', label: 'EDR' },
  { value: 'saas',        label: 'SaaS API' },
];

const DECISION_OPTIONS = [
  { value: 'block',  label: 'Blocked',  color: 'var(--destructive)' },
  { value: 'redact', label: 'Redacted', color: 'var(--accent)' },
  { value: 'warn',   label: 'Warned',   color: 'var(--accent)' },
  { value: 'allow',  label: 'Allowed',  color: 'var(--brand-teal)' },
  { value: 'detect', label: 'Detected', color: 'var(--primary)' },
];

const CATEGORY_OPTIONS = [
  { value: 'source-code',       label: 'Source code' },
  { value: 'customer-pii',      label: 'Customer PII' },
  { value: 'financial',         label: 'Financial' },
  { value: 'legal',             label: 'Legal' },
  { value: 'contracts',         label: 'Contracts' },
  { value: 'business-strategy', label: 'Business strategy' },
  { value: 'employee-data',     label: 'Employee data' },
  { value: 'health-phi',        label: 'PHI' },
  { value: 'credentials',       label: 'Credentials' },
];

export default function DiscoveryPage() {
  const events = useEvents();
  const assets = useAssets();
  const [globalFilter, setGlobalFilter] = useState('');
  const [sourceSel, setSourceSel] = useState(new Set());
  const [decisionSel, setDecisionSel] = useState(new Set());
  const [categorySel, setCategorySel] = useState(new Set());
  const [paused, setPaused] = useState(false);
  const [expandedId, setExpandedId] = useState(null);

  const filtered = useMemo(() => events.filter(e => {
    if (sourceSel.size   > 0 && !sourceSel.has(e.source))     return false;
    if (decisionSel.size > 0 && !decisionSel.has(e.decision)) return false;
    if (categorySel.size > 0 && !(e.categories || []).some(c => categorySel.has(c))) return false;
    if (globalFilter) {
      const q = globalFilter.toLowerCase();
      const haystack = `${e.user} ${e.destination} ${e.preview} ${e.asset_id || ''}`.toLowerCase();
      if (!haystack.includes(q)) return false;
    }
    return true;
  }), [events, sourceSel, decisionSel, categorySel, globalFilter]);

  const stats = useMemo(() => {
    const decisions = filtered.reduce((acc, e) => { acc[e.decision] = (acc[e.decision] || 0) + 1; return acc; }, {});
    const sensitive = filtered.filter(e => (e.categories || []).length > 0).length;
    const distinctUsers = new Set(filtered.map(e => e.user)).size;
    return { decisions, sensitive, distinctUsers };
  }, [filtered]);

  const clearAll = () => {
    setSourceSel(new Set());
    setDecisionSel(new Set());
    setCategorySel(new Set());
  };

  return (
    <>
      <GovernHeader />

      <div className="max-w-[1680px] mx-auto px-4 sm:px-6 lg:px-8 py-7 space-y-5">
        <div className="flex items-end justify-between gap-3 flex-wrap">
          <div>
            <div className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground font-mono">Live tail</div>
            <h2 className="text-[16px] font-semibold text-foreground mt-0.5">Discovery feed</h2>
            <p className="text-[12.5px] text-muted-foreground mt-0.5 max-w-[80ch]">
              Every AI usage event from connected upstreams. Each row links back to the asset
              it belongs to so you can promote it to the inventory or quarantine it in place.
            </p>
          </div>
          <Button variant="outline" size="sm" onClick={() => setPaused(p => !p)}>
            {paused ? <><Play className="h-3.5 w-3.5" /> Resume</> : <><Pause className="h-3.5 w-3.5" /> Pause</>}
          </Button>
        </div>

        {/* Triage strip */}
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
          <Stat label="Events"           value={String(filtered.length)} sub={`${events.length} total`} />
          <Stat label="Blocked"          value={String(stats.decisions.block || 0)} tone={stats.decisions.block ? 'bad' : 'default'} />
          <Stat label="Redacted"         value={String(stats.decisions.redact || 0)} tone={stats.decisions.redact ? 'warn' : 'default'} />
          <Stat label="With sensitive"   value={String(stats.sensitive)} sub="categories detected" tone={stats.sensitive ? 'warn' : 'default'} />
          <Stat label="Distinct users"   value={String(stats.distinctUsers)} />
        </div>

        {/* Toolbar */}
        <div className="rounded-xl border border-border bg-card overflow-hidden">
          <div className="flex items-center justify-between gap-2 px-3 py-2.5 border-b border-border bg-muted/20">
            <div className="flex items-center gap-2 flex-wrap flex-1 min-w-0">
              <div className="relative w-full max-w-xs">
                <Search className="h-3.5 w-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <Input
                  value={globalFilter}
                  onChange={(e) => setGlobalFilter(e.target.value)}
                  placeholder="Search events…"
                  className="pl-8 h-8 text-[12.5px]"
                />
              </div>
              <FacetFilterBar
                filters={[
                  { title: 'Source',    options: SOURCE_OPTIONS,    selected: sourceSel,    onChange: setSourceSel },
                  { title: 'Decision',  options: DECISION_OPTIONS,  selected: decisionSel,  onChange: setDecisionSel },
                  { title: 'Category',  options: CATEGORY_OPTIONS,  selected: categorySel,  onChange: setCategorySel },
                ]}
                onClearAll={clearAll}
              />
            </div>
            <div className="text-[10.5px] font-mono text-muted-foreground hidden md:flex items-center gap-1.5">
              <span className={`h-1.5 w-1.5 rounded-full ${paused ? 'bg-muted-foreground' : 'bg-(--brand-teal) animate-pulse-dot'}`} />
              {paused ? 'paused' : 'live'}
            </div>
          </div>

          {/* Feed */}
          <div className="divide-y divide-border/60">
            {filtered.length === 0 ? (
              <div className="px-4 py-10 text-center text-[12px] text-muted-foreground italic">
                No events match these filters.
              </div>
            ) : (
              filtered.map(e => (
                <EventRow
                  key={e.id}
                  event={e}
                  asset={assets.find(a => a.id === e.asset_id)}
                  expanded={expandedId === e.id}
                  onToggle={() => setExpandedId(p => p === e.id ? null : e.id)}
                />
              ))
            )}
          </div>
        </div>
      </div>
    </>
  );
}

function EventRow({ event, asset, expanded, onToggle }) {
  return (
    <div className={`px-4 py-2.5 transition-colors ${expanded ? 'bg-muted/30' : 'hover:bg-muted/30'}`}>
      <button
        type="button"
        onClick={onToggle}
        className="w-full text-left flex items-start gap-3"
      >
        {/* Decision badge column */}
        <div className="shrink-0 pt-0.5">
          <DecisionPill decision={event.decision} />
        </div>

        {/* Event main */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap mb-0.5">
            <span className="text-[10.5px] font-mono text-muted-foreground tabular-nums w-16 shrink-0">{fmtAgo(event.ts)}</span>
            <span className="text-[10.5px] uppercase tracking-[0.12em] font-mono text-muted-foreground w-24 shrink-0 truncate">{event.source}</span>
            <span className="text-[12px] font-mono text-foreground truncate">{event.user}</span>
            <ArrowRight className="h-3 w-3 text-muted-foreground" />
            <span className="text-[12px] font-mono text-foreground truncate">{event.destination}</span>
            <span className="text-[10.5px] font-mono text-muted-foreground ml-auto shrink-0">{fmtKb(event.size_kb)}</span>
          </div>
          <div className="text-[12.5px] text-foreground/90 leading-snug truncate">{event.preview}</div>

          {/* Categories + asset link */}
          <div className="mt-1 flex items-center gap-1.5 flex-wrap">
            {(event.categories || []).map(c => (
              <span key={c} className="text-[9.5px] font-mono px-1.5 py-0.5 rounded border border-destructive/40 bg-destructive/[0.06] text-destructive">
                {c}
              </span>
            ))}
            {asset && (
              <span className="text-[10px] font-mono text-muted-foreground inline-flex items-center gap-1">
                · asset
                <Link onClick={(e) => e.stopPropagation()} href={`/app/govern/inventory/${asset.id}`} className="text-primary hover:underline">
                  {asset.name}
                </Link>
                <ApprovalPill state={asset.approval_state} />
              </span>
            )}
          </div>
        </div>
      </button>

      {/* Expanded detail + triage actions */}
      {expanded && (
        <div className="mt-3 ml-[110px] rounded-md border border-border bg-card px-4 py-3 space-y-3">
          <div>
            <div className="text-[10px] uppercase tracking-[0.14em] font-mono text-muted-foreground mb-1">Prompt preview</div>
            <div className="rounded border border-border bg-muted/30 px-3 py-2 text-[12px] text-foreground font-mono whitespace-pre-wrap leading-relaxed">
              {event.preview}
              {event.decision === 'redact' && (
                <span className="block mt-2 text-[10.5px] text-accent">↳ DLP rewrote the prompt; the redacted version was forwarded.</span>
              )}
              {event.decision === 'block' && (
                <span className="block mt-2 text-[10.5px] text-destructive">↳ Blocked at gateway. The user saw a policy banner.</span>
              )}
            </div>
          </div>

          {asset && (
            <div className="flex items-center gap-2 flex-wrap">
              <RiskPill risk={asset.risk_class} />
              <AssetTypePill type={asset.type} />
              <ApprovalPill state={asset.approval_state} />
            </div>
          )}

          <div className="flex items-center gap-2 flex-wrap">
            <Button size="sm" variant="outline" onClick={(e) => { e.stopPropagation(); ackEvent(event.id, event.decision); }}>
              Acknowledge
            </Button>
            {asset && (
              <Link onClick={(e) => e.stopPropagation()} href={`/app/govern/inventory/${asset.id}`}>
                <Button size="sm" variant="outline">
                  Open asset
                </Button>
              </Link>
            )}
            <span className="ml-auto text-[10.5px] font-mono text-muted-foreground">
              event {event.id}
            </span>
          </div>
        </div>
      )}
    </div>
  );
}

function Stat({ label, value, sub, tone = 'default' }) {
  const color = tone === 'bad'  ? 'text-destructive'
              : tone === 'warn' ? 'text-primary'
              : tone === 'ok'   ? 'text-brand-teal'
              :                   'text-foreground';
  return (
    <div className="rounded-lg border border-border bg-card px-3 py-2">
      <div className="text-[10.5px] font-medium uppercase tracking-[0.1em] text-muted-foreground">{label}</div>
      <div className="mt-0.5 flex items-baseline gap-1.5">
        <div className={`text-[17px] font-semibold tabular-nums ${color} truncate`}>{value}</div>
        {sub && <div className="text-[10.5px] font-mono text-muted-foreground truncate">{sub}</div>}
      </div>
    </div>
  );
}
