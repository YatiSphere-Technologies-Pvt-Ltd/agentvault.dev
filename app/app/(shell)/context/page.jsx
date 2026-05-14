'use client';

import Link from 'next/link';
import { useMemo } from 'react';
import { Database, Layers, AlertTriangle, ShieldCheck, ChevronRight, ArrowRight, RefreshCw } from 'lucide-react';
import { ContextHeader, FamilyPill, HealthPill, SourceIcon, fmtAgo, fmtNum, fmtMins } from './_shared';
import { useSources, useCorpora, rollupHealth, freshnessAdherence, simulateSync, simulateReindex } from './_store';
import { sourceById } from './_sourceCatalog';

/* Context Engine — overview page.
   Mirrors GRC's structure: KPI strip, then a two-column body that pairs
   a primary list (sources) with the runtime feed (corpora). */

export default function ContextOverviewPage() {
  const sources = useSources();
  const corpora = useCorpora();

  const stats = useMemo(() => {
    const srcHealth = rollupHealth(sources);
    const corHealth = rollupHealth(corpora);
    const adherence = freshnessAdherence(sources);
    const totalChunks = corpora.reduce((s, c) => s + (c.chunk_count || 0), 0);
    const totalQueries7d = corpora.reduce((s, c) => s + (c.query_count_7d || 0), 0);
    const avgNdcg = corpora.length === 0
      ? 0
      : corpora.reduce((s, c) => s + (c.ndcg_at_10 || 0), 0) / corpora.length;
    const totalCost7d = corpora.reduce((s, c) => s + (c.cost_7d_usd || 0), 0);
    return { srcHealth, corHealth, adherence, totalChunks, totalQueries7d, avgNdcg, totalCost7d };
  }, [sources, corpora]);

  const breachingSources = sources
    .filter(s => (s.freshness_lag_min ?? 0) > (s.freshness_target_min ?? Infinity) || s.health !== 'green')
    .slice(0, 4);

  return (
    <>
      <ContextHeader />

      <div className="max-w-[1680px] mx-auto px-4 sm:px-6 lg:px-8 py-7 space-y-6">
        {/* KPI strip */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-2">
          <Stat label="Sources"      value={String(sources.length)}     sub={`${stats.srcHealth.green || 0} healthy`} icon={<Database className="h-3.5 w-3.5" />} />
          <Stat label="Corpora"      value={String(corpora.length)}     sub={`${stats.corHealth.green || 0} healthy`} icon={<Layers className="h-3.5 w-3.5" />} />
          <Stat label="Chunks indexed"  value={fmtNum(stats.totalChunks)}  sub="across all corpora" />
          <Stat label="SLA adherence"   value={`${Math.round(stats.adherence * 100)}%`} sub="freshness in target" tone={stats.adherence >= 0.9 ? 'ok' : stats.adherence >= 0.75 ? 'warn' : 'bad'} />
          <Stat label="Queries · 7d"    value={fmtNum(stats.totalQueries7d)} sub={`avg nDCG ${stats.avgNdcg.toFixed(2)}`} />
          <Stat label="Cost · 7d"       value={`$${stats.totalCost7d.toFixed(2)}`} sub="embeddings + retrieval" />
        </div>

        {/* Two-column body — corpora on the left (the asset agents subscribe to),
            sources on the right (the plumbing). */}
        <div className="grid grid-cols-1 lg:grid-cols-[1.4fr_1fr] gap-6">
          <section>
            <SectionHead
              eyebrow="Corpora"
              title={`${corpora.length} searchable corpora`}
              link="/app/context/corpora"
              linkLabel="View all"
            />
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {corpora.slice(0, 4).map(c => (
                <CorpusCard key={c.id} corpus={c} sources={sources} onReindex={() => simulateReindex(c.id)} />
              ))}
            </div>
          </section>

          <aside className="space-y-5">
            <section>
              <SectionHead
                eyebrow="Freshness"
                title="Sources to watch"
                link="/app/context/sources"
                linkLabel="View all"
              />
              {breachingSources.length === 0 ? (
                <div className="rounded-xl border border-(--brand-teal)/30 bg-(--brand-teal)/[0.04] px-4 py-5 text-center">
                  <ShieldCheck className="h-5 w-5 text-brand-teal mx-auto mb-1.5" />
                  <div className="text-[13px] font-medium text-foreground">All sources within SLA</div>
                  <div className="text-[11.5px] text-muted-foreground mt-0.5">No freshness breaches.</div>
                </div>
              ) : (
                <div className="rounded-xl border border-border bg-card divide-y divide-border overflow-hidden">
                  {breachingSources.map(s => (
                    <SourceFreshnessRow key={s.id} source={s} onSync={() => simulateSync(s.id)} />
                  ))}
                </div>
              )}
            </section>

            <section>
              <SectionHead
                eyebrow="Quick start"
                title="Connect & curate"
              />
              <div className="rounded-xl border border-border bg-card divide-y divide-border overflow-hidden">
                <QuickAction
                  href="/app/context/sources"
                  icon={Database}
                  title="Connect a source"
                  body="Snowflake, BigQuery, Postgres, S3, Salesforce — twelve connectors with vault-backed credentials."
                />
                <QuickAction
                  href="/app/context/corpora"
                  icon={Layers}
                  title="Build a corpus"
                  body="Bind sources, pick a chunking strategy and embedding model. Indexes start in minutes."
                />
                <QuickAction
                  href="/app/agents"
                  icon={ArrowRight}
                  title="Subscribe an agent"
                  body="Open an agent's Knowledge tab to attach corpora — ACLs flow through automatically."
                />
              </div>
            </section>
          </aside>
        </div>
      </div>
    </>
  );
}

/* ────────── building blocks ────────── */

function SectionHead({ eyebrow, title, link, linkLabel }) {
  return (
    <div className="flex items-end justify-between mb-3">
      <div>
        <div className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground font-mono">{eyebrow}</div>
        <h2 className="text-[15px] font-semibold text-foreground mt-0.5">{title}</h2>
      </div>
      {link && (
        <Link href={link} className="text-[11.5px] text-primary hover:brightness-110 font-medium inline-flex items-center gap-1">
          {linkLabel} <ChevronRight className="h-3.5 w-3.5" />
        </Link>
      )}
    </div>
  );
}

function CorpusCard({ corpus, sources, onReindex }) {
  const boundSources = (corpus.source_ids || []).map(id => sources.find(s => s.id === id)).filter(Boolean);
  return (
    <div className="rounded-xl border border-border bg-card overflow-hidden hover:border-primary/40 transition-colors">
      <div className="px-4 py-3 border-b border-border flex items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <HealthPill health={corpus.health} />
            <code className="text-[10.5px] font-mono text-muted-foreground truncate">{corpus.id}</code>
          </div>
          <Link href={`/app/context/corpora/${corpus.id}`} className="text-[13px] font-medium text-foreground hover:text-primary truncate block">
            {corpus.name}
          </Link>
        </div>
        <button
          type="button"
          onClick={onReindex}
          className="h-7 w-7 rounded text-muted-foreground hover:text-foreground hover:bg-muted flex items-center justify-center shrink-0"
          title="Simulate reindex"
        >
          <RefreshCw className="h-3.5 w-3.5" />
        </button>
      </div>
      <div className="px-4 py-3 space-y-2">
        <div className="flex items-center gap-1.5 flex-wrap">
          {boundSources.slice(0, 4).map(s => (
            <span key={s.id} className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded border border-border bg-muted/40 text-[10.5px]">
              <SourceIcon kind={s.kind} size={14} />
              <span className="text-foreground">{s.name.split('·')[0].trim()}</span>
            </span>
          ))}
          {boundSources.length > 4 && (
            <span className="text-[10.5px] font-mono text-muted-foreground">+{boundSources.length - 4}</span>
          )}
        </div>
        <div className="grid grid-cols-3 gap-2 text-[11px]">
          <Mini label="chunks" value={fmtNum(corpus.chunk_count)} />
          <Mini label="nDCG@10" value={(corpus.ndcg_at_10 || 0).toFixed(2)} tone={corpus.ndcg_at_10 >= 0.9 ? 'ok' : corpus.ndcg_at_10 >= 0.85 ? 'warn' : 'bad'} />
          <Mini label="reindex" value={fmtAgo(corpus.last_reindex_at)} />
        </div>
      </div>
    </div>
  );
}

function SourceFreshnessRow({ source, onSync }) {
  const breach = (source.freshness_lag_min ?? 0) > (source.freshness_target_min ?? Infinity);
  const family = sourceById(source.kind)?.family;
  return (
    <div className="px-4 py-3 flex items-center gap-3">
      <SourceIcon kind={source.kind} size={26} />
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-0.5">
          <Link href={`/app/context/sources/${source.id}`} className="text-[12.5px] font-medium text-foreground hover:text-primary truncate">
            {source.name}
          </Link>
          {family && <FamilyPill family={family} />}
        </div>
        <div className="text-[10.5px] font-mono text-muted-foreground">
          lag <span className={breach ? 'text-destructive' : 'text-foreground'}>{fmtMins(source.freshness_lag_min)}</span>
          <span> · target {fmtMins(source.freshness_target_min)}</span>
          {source.health_detail && <span className="ml-2 text-destructive">· {source.health_detail}</span>}
        </div>
      </div>
      <button
        type="button"
        onClick={onSync}
        className="h-7 px-2 rounded border border-border text-muted-foreground hover:text-foreground hover:bg-muted text-[11px] font-medium inline-flex items-center gap-1 shrink-0"
      >
        <RefreshCw className="h-3 w-3" /> Sync now
      </button>
    </div>
  );
}

function QuickAction({ href, icon: Icon, title, body }) {
  return (
    <Link href={href} className="px-4 py-3 flex items-start gap-3 hover:bg-muted/30 transition-colors group">
      <div className="h-8 w-8 rounded-md bg-primary/10 text-primary flex items-center justify-center shrink-0">
        <Icon className="h-3.5 w-3.5" />
      </div>
      <div className="min-w-0 flex-1">
        <div className="text-[12.5px] font-medium text-foreground">{title}</div>
        <div className="text-[11.5px] text-muted-foreground leading-relaxed mt-0.5">{body}</div>
      </div>
      <ChevronRight className="h-4 w-4 text-muted-foreground group-hover:text-primary group-hover:translate-x-0.5 transition-all shrink-0 mt-1" />
    </Link>
  );
}

function Stat({ label, value, sub, icon, tone = 'default' }) {
  const color = tone === 'bad'  ? 'text-destructive'
              : tone === 'warn' ? 'text-primary'
              : tone === 'ok'   ? 'text-brand-teal'
              :                   'text-foreground';
  return (
    <div className="rounded-lg border border-border bg-card px-3 py-2">
      <div className="text-[10.5px] font-medium uppercase tracking-[0.1em] text-muted-foreground inline-flex items-center gap-1.5">
        {icon}
        {label}
      </div>
      <div className="mt-0.5 flex items-baseline gap-1.5">
        <div className={`text-[17px] font-semibold tabular-nums ${color} truncate`}>{value}</div>
        {sub && <div className="text-[10.5px] font-mono text-muted-foreground truncate">{sub}</div>}
      </div>
    </div>
  );
}

function Mini({ label, value, tone = 'default' }) {
  const color = tone === 'bad'  ? 'text-destructive'
              : tone === 'warn' ? 'text-primary'
              : tone === 'ok'   ? 'text-brand-teal'
              :                   'text-foreground';
  return (
    <div className="rounded border border-border bg-muted/30 px-2 py-1">
      <div className="text-[9.5px] uppercase tracking-[0.12em] font-mono text-muted-foreground">{label}</div>
      <div className={`text-[11.5px] font-mono tabular-nums ${color}`}>{value}</div>
    </div>
  );
}
