'use client';

import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { useMemo } from 'react';
import { ArrowLeft, RefreshCw, Trash2, Layers, ShieldCheck, Activity, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ContextHeader, HealthPill, SourceIcon, fmtAgo, fmtNum } from '../../_shared';
import { useCorpora, useSources, simulateReindex, removeCorpus } from '../../_store';
import { CHUNKING_STRATEGIES, EMBEDDING_MODELS, RERANKERS, sourceById } from '../../_sourceCatalog';

export default function CorpusDetailPage() {
  const { id } = useParams();
  const router = useRouter();
  const corpora = useCorpora();
  const sources = useSources();
  const corpus = useMemo(() => corpora.find(c => c.id === id) || null, [corpora, id]);
  const boundSources = useMemo(
    () => (corpus?.source_ids || []).map(sid => sources.find(s => s.id === sid)).filter(Boolean),
    [corpus, sources],
  );

  if (!corpus) {
    return (
      <>
        <ContextHeader />
        <div className="max-w-[1680px] mx-auto px-4 sm:px-6 lg:px-8 py-7">
          <div className="rounded-lg border border-dashed border-border bg-card px-6 py-10 text-center">
            <div className="text-[13px] font-medium text-foreground">Corpus not found</div>
            <Link href="/app/context/corpora" className="mt-4 inline-block text-[12px] text-primary hover:underline">All corpora →</Link>
          </div>
        </div>
      </>
    );
  }

  const chunkingMeta = CHUNKING_STRATEGIES.find(s => s.id === corpus.chunking?.strategy);
  const embeddingMeta = EMBEDDING_MODELS.find(m => m.id === corpus.embedding?.model);
  const rerankerMeta = RERANKERS.find(r => r.id === corpus.reranker);

  const onDelete = () => {
    if (!confirm(`Delete corpus "${corpus.name}"? Agents subscribed to it will lose access.`)) return;
    removeCorpus(corpus.id);
    router.push('/app/context/corpora');
  };

  return (
    <>
      <ContextHeader />
      <div className="max-w-[1680px] mx-auto px-4 sm:px-6 lg:px-8 py-7 space-y-5">
        <Link href="/app/context/corpora" className="text-[12px] text-muted-foreground hover:text-foreground inline-flex items-center gap-1.5">
          <ArrowLeft className="h-3.5 w-3.5" /> All corpora
        </Link>

        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap mb-1">
              <code className="text-[10.5px] font-mono text-muted-foreground">{corpus.id}</code>
              <HealthPill health={corpus.health} />
              <span className="text-[10.5px] font-mono text-muted-foreground capitalize">· ACL: {corpus.acl_inheritance}</span>
            </div>
            <h2 className="text-[20px] font-semibold tracking-tight text-foreground leading-tight">{corpus.name}</h2>
            {corpus.description && (
              <p className="mt-1 text-[12.5px] text-muted-foreground leading-relaxed max-w-[80ch]">{corpus.description}</p>
            )}
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <Button variant="outline" size="sm" onClick={() => simulateReindex(corpus.id)}>
              <RefreshCw className="h-3.5 w-3.5" /> Reindex
            </Button>
            <Button variant="outline" size="sm" onClick={onDelete} className="text-destructive border-destructive/40 hover:bg-destructive/10">
              <Trash2 className="h-3.5 w-3.5" /> Delete corpus
            </Button>
          </div>
        </div>

        {/* Stat strip */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2">
          <Stat label="Chunks"      value={fmtNum(corpus.chunk_count)} icon={<Layers className="h-3.5 w-3.5" />} />
          <Stat label="nDCG@10"     value={(corpus.ndcg_at_10 || 0).toFixed(2)} tone={corpus.ndcg_at_10 >= 0.9 ? 'ok' : corpus.ndcg_at_10 >= 0.85 ? 'default' : 'bad'} />
          <Stat label="Recall@10"   value={(corpus.recall_at_10 || 0).toFixed(2)} />
          <Stat label="MRR"         value={(corpus.mrr || 0).toFixed(2)} />
          <Stat label="Drift"       value={`${((corpus.drift_score || 0) * 100).toFixed(1)}%`} tone={corpus.drift_score > 0.05 ? 'warn' : 'ok'} />
          <Stat label="Reindexed"   value={fmtAgo(corpus.last_reindex_at)} />
        </div>

        {/* Three-card body */}
        <div className="grid grid-cols-1 lg:grid-cols-[1.3fr_1fr] gap-5">
          <section className="space-y-5">
            <Card title="Sources bound" hint="Each row is a source feeding chunks into this corpus.">
              {boundSources.length === 0 ? (
                <div className="text-[12px] text-muted-foreground italic">No sources are bound. Edit corpus to attach.</div>
              ) : (
                <div className="space-y-2">
                  {boundSources.map(s => {
                    const family = sourceById(s.kind)?.family;
                    const projection = corpus.projection?.[s.id] || '';
                    return (
                      <div key={s.id} className="rounded-md border border-border bg-background px-3 py-2.5 flex items-start gap-3">
                        <SourceIcon kind={s.kind} size={28} />
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2 mb-0.5">
                            <Link href={`/app/context/sources/${s.id}`} className="text-[12.5px] font-medium text-foreground hover:text-primary truncate">
                              {s.name}
                            </Link>
                            <HealthPill health={s.health} />
                          </div>
                          <div className="text-[10.5px] font-mono text-muted-foreground truncate">
                            {sourceById(s.kind)?.label || s.kind} · ACL {s.acl_strategy}
                          </div>
                          {projection && (
                            <div className="mt-1 text-[11px] font-mono text-foreground/85 bg-muted/40 rounded px-2 py-1">
                              {projection}
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </Card>

            <Card title="Indexing config">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <KVBlock label="Chunking">
                  <div className="text-[12.5px] text-foreground">{chunkingMeta?.label || corpus.chunking?.strategy}</div>
                  <div className="text-[10.5px] font-mono text-muted-foreground">
                    {corpus.chunking?.strategy === 'structured'
                      ? '1 chunk per row'
                      : `size ${corpus.chunking?.size} · overlap ${corpus.chunking?.overlap}`}
                  </div>
                </KVBlock>
                <KVBlock label="Embedding">
                  <div className="text-[12.5px] text-foreground truncate">{embeddingMeta?.label || corpus.embedding?.model}</div>
                  <div className="text-[10.5px] font-mono text-muted-foreground">{corpus.embedding?.dim} dim · ${embeddingMeta?.cost?.toFixed(2) || '0.00'}/1M tok</div>
                </KVBlock>
                <KVBlock label="Reranker">
                  <div className="text-[12.5px] text-foreground">{rerankerMeta?.label || corpus.reranker}</div>
                </KVBlock>
                <KVBlock label="ACL inheritance">
                  <div className="text-[12.5px] text-foreground capitalize inline-flex items-center gap-1.5">
                    <ShieldCheck className="h-3.5 w-3.5 text-brand-teal" />
                    {corpus.acl_inheritance}
                  </div>
                  <div className="text-[10.5px] font-mono text-muted-foreground">
                    queried as the calling agent's identity
                  </div>
                </KVBlock>
              </div>
            </Card>

            <Card title="Quality" hint="Scored against the corpus's eval set on every reindex.">
              <div className="space-y-2.5">
                <Metric label="nDCG@10"   value={corpus.ndcg_at_10}   target={0.9} />
                <Metric label="Recall@10" value={corpus.recall_at_10} target={0.85} />
                <Metric label="MRR"       value={corpus.mrr}          target={0.85} />
              </div>
            </Card>
          </section>

          <aside className="space-y-5">
            <Card title="Usage · 7d">
              <div className="space-y-2 text-[12.5px]">
                <Row label="Queries">{fmtNum(corpus.query_count_7d)}</Row>
                <Row label="Cost">${(corpus.cost_7d_usd || 0).toFixed(2)}</Row>
                <Row label="Drift">{((corpus.drift_score || 0) * 100).toFixed(1)}%</Row>
              </div>
            </Card>

            <Card title="Subscribe an agent" hint="Open an agent's Knowledge tab to attach.">
              <div className="rounded-md border border-dashed border-border bg-muted/30 px-3 py-2.5 text-[12.5px]">
                <div className="flex items-center gap-1.5 mb-1">
                  <Sparkles className="h-3.5 w-3.5 text-primary" />
                  <span className="text-foreground font-medium">Wire-up</span>
                </div>
                <p className="text-muted-foreground leading-relaxed">
                  Agents subscribe to corpora through their <code className="font-mono text-foreground/85">/app/agents/[id]</code> page.
                  ACLs flow through automatically — when an agent calls <code className="font-mono text-foreground/85">/context.search</code>,
                  the user's identity carries through to the source's enforcement layer.
                </p>
                <Link href="/app/agents" className="mt-2 inline-flex items-center gap-1 text-[11.5px] text-primary hover:underline">
                  Open agents →
                </Link>
              </div>
            </Card>

            <Card title="Activity">
              <ul className="space-y-1 text-[11.5px] font-mono">
                <li className="flex items-baseline gap-2">
                  <span className="text-muted-foreground tabular-nums w-16 shrink-0">{fmtAgo(corpus.last_reindex_at)}</span>
                  <span className="uppercase text-[9.5px] tracking-[0.14em] text-muted-foreground w-28 shrink-0">reindex.success</span>
                  <span className="text-foreground">Built {fmtNum(corpus.chunk_count)} chunks</span>
                </li>
                <li className="flex items-baseline gap-2">
                  <span className="text-muted-foreground tabular-nums w-16 shrink-0">{fmtAgo((corpus.last_reindex_at || 0) - 1000 * 60 * 60 * 24)}</span>
                  <span className="uppercase text-[9.5px] tracking-[0.14em] text-muted-foreground w-28 shrink-0">eval.scored</span>
                  <span className="text-foreground">nDCG@10 {(corpus.ndcg_at_10 || 0).toFixed(2)} · recall {(corpus.recall_at_10 || 0).toFixed(2)}</span>
                </li>
                <li className="flex items-baseline gap-2">
                  <span className="text-muted-foreground tabular-nums w-16 shrink-0">{fmtAgo(corpus.created_at)}</span>
                  <span className="uppercase text-[9.5px] tracking-[0.14em] text-muted-foreground w-28 shrink-0">corpus.created</span>
                  <span className="text-foreground">by {corpus.created_by || '—'}</span>
                </li>
              </ul>
            </Card>
          </aside>
        </div>
      </div>
    </>
  );
}

/* ─────────── shared bits ─────────── */

function Card({ title, hint, children }) {
  return (
    <div className="rounded-xl border border-border bg-card overflow-hidden">
      <div className="px-4 py-2.5 border-b border-border flex items-baseline justify-between gap-3">
        <div className="text-[10.5px] uppercase tracking-[0.16em] font-mono text-muted-foreground">{title}</div>
        {hint && <div className="text-[10.5px] text-muted-foreground/80 truncate max-w-[60%]">{hint}</div>}
      </div>
      <div className="px-4 py-3">{children}</div>
    </div>
  );
}

function KVBlock({ label, children }) {
  return (
    <div className="rounded-md border border-border bg-background px-3 py-2">
      <div className="text-[10px] uppercase tracking-[0.12em] font-mono text-muted-foreground">{label}</div>
      <div className="mt-0.5">{children}</div>
    </div>
  );
}

function Metric({ label, value, target }) {
  const v = value || 0;
  const pct = Math.min(100, (v / 1) * 100);
  const tone = v >= target ? 'bg-brand-teal' : v >= target * 0.95 ? 'bg-primary' : 'bg-destructive';
  return (
    <div>
      <div className="flex items-baseline justify-between mb-1 text-[11.5px]">
        <span className="font-mono uppercase tracking-[0.1em] text-muted-foreground">{label}</span>
        <span className={`font-mono tabular-nums ${v >= target ? 'text-brand-teal' : v >= target * 0.95 ? 'text-foreground' : 'text-destructive'}`}>
          {v.toFixed(2)}
          <span className="text-muted-foreground/80 ml-1">/ {target.toFixed(2)}</span>
        </span>
      </div>
      <div className="relative h-1.5 rounded-full bg-muted overflow-hidden">
        <div className={`absolute inset-y-0 left-0 rounded-full ${tone}`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

function Row({ label, children }) {
  return (
    <div className="flex items-baseline justify-between gap-3">
      <span className="text-[11px] font-mono uppercase tracking-[0.1em] text-muted-foreground">{label}</span>
      <span className="font-mono tabular-nums text-foreground">{children}</span>
    </div>
  );
}

function Stat({ label, value, sub, tone = 'default', icon }) {
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
