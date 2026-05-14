'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import {
  Plus, X, Database, ExternalLink, Network, Sparkles, ShieldCheck,
  Clock, Layers, GitBranch, AlertTriangle,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  GRAPH_QUERY_MODES, FRESHNESS_SLAS,
} from '../_toolsCatalog';
import {
  EMBEDDING_MODELS, RERANKERS, QUERY_REWRITERS,
  RETRIEVAL_STRATEGIES, RETRIEVAL_ACL_MODES,
} from '../_providerCatalog';
import { useTools } from '../_toolsStore';

/* KnowledgeCards
   ──────────────
   Renders 5 cards specific to retrieval. Switches layout based on
   `tool.retrieval.kind`:
     'vector' → RAG cards (Corpora, Strategy, Reranker, ACL+Freshness, Quality)
     'graph'  → GraphRAG cards (Corpora, Graph index, Query mode, Traversal,
                Summarization, ACL+Freshness)

   Reads the user's actual knowledge sources from av-knowledge-v1 so the
   Connected corpora card shows live state (status, doc count, recall). */

export default function KnowledgeCards({ tool }) {
  if (!tool.retrieval) return null;
  const isGraph = tool.retrieval.kind === 'graph';

  return (
    <>
      <Section title="Connected corpora" subtitle="Knowledge sources this tool can read from. Sources are workspace-level; attach the ones this tool needs.">
        <CorporaCard tool={tool} />
      </Section>

      {isGraph ? (
        <>
          <Section title="Graph index" subtitle="The knowledge graph built from your corpora — entities, relationships, and hierarchical community summaries.">
            <GraphIndexCard tool={tool} />
          </Section>

          <Section title="Query mode" subtitle="How the agent traverses the graph at query time.">
            <GraphQueryModeCard tool={tool} />
          </Section>

          <Section title="Graph traversal" subtitle="Hop limits and edge confidence for local queries; reduce sizing for global queries.">
            <GraphTraversalCard tool={tool} />
          </Section>

          <Section title="Summarization" subtitle="LLM that generates community summaries during indexing and answers at query time.">
            <SummarizationCard tool={tool} />
          </Section>
        </>
      ) : (
        <>
          <Section title="Retrieval strategy" subtitle="Which retrieval method runs the lookup, plus optional query rewriting.">
            <StrategyCard tool={tool} />
          </Section>

          <Section title="Embedding model" subtitle="Which model produces vectors at index time and at query time. Must match across both.">
            <EmbeddingCard tool={tool} />
          </Section>

          <Section title="Reranker" subtitle="Optional second-pass ranking. Boosts precision at the top of the result list at the cost of latency.">
            <RerankerCard tool={tool} />
          </Section>
        </>
      )}

      <Section title="Access control & freshness" subtitle="Who can retrieve, and how stale results are allowed to be.">
        <AclFreshnessCard tool={tool} />
      </Section>

      <Section title="Quality controls" subtitle="Caps and caches the runtime applies before delivering chunks to the agent.">
        <QualityCard tool={tool} />
      </Section>
    </>
  );
}

/* ───────────────────── Connected corpora ───────────────────── */

function CorporaCard({ tool }) {
  const { setCorpora } = useTools();
  const corpora = tool.retrieval?.corpora || [];
  const sources = useKnowledgeSources();

  const attached = sources.filter(s => corpora.includes(s.id));
  const available = sources.filter(s => !corpora.includes(s.id));
  const missing = corpora.filter(id => !sources.some(s => s.id === id));

  const [pickerOpen, setPickerOpen] = useState(false);

  return (
    <div className="rounded-xl border border-border bg-card overflow-hidden">
      <div className="px-4 py-4 border-b border-border flex items-center justify-between gap-3 flex-wrap">
        <div className="text-[11.5px] font-medium text-muted-foreground">
          Attached <span className="font-mono ml-1">{attached.length}</span>
          {missing.length > 0 && (
            <span className="ml-2 text-destructive">
              · {missing.length} unresolved
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <Button size="sm" variant="outline" render={
            <Link href="/app/knowledge"><ExternalLink className="h-3.5 w-3.5" /> Manage sources</Link>
          } />
          <Button size="sm" onClick={() => setPickerOpen(true)} disabled={available.length === 0}>
            <Plus className="h-3.5 w-3.5" /> Attach corpus
          </Button>
        </div>
      </div>

      {attached.length === 0 && missing.length === 0 ? (
        <div className="p-6 text-center">
          <Database className="h-5 w-5 text-muted-foreground/70 mx-auto" />
          <div className="mt-2 text-[13px] font-medium text-foreground">No corpora attached</div>
          <p className="mt-1 text-[12px] text-muted-foreground max-w-100 mx-auto">
            This tool can\'t retrieve anything until at least one knowledge source is attached.
          </p>
          {available.length > 0 && (
            <Button size="sm" className="mt-3" onClick={() => setPickerOpen(true)}>
              <Plus className="h-3.5 w-3.5" /> Attach corpus
            </Button>
          )}
        </div>
      ) : (
        <ul className="divide-y divide-border">
          {attached.map(s => (
            <CorpusRow
              key={s.id}
              source={s}
              onDetach={() => setCorpora(tool.id, corpora.filter(id => id !== s.id))}
            />
          ))}
          {missing.map(id => (
            <li key={id} className="px-4 py-3 flex items-center justify-between gap-2">
              <div className="flex items-center gap-2 text-[12px] text-destructive">
                <AlertTriangle className="h-3.5 w-3.5" />
                <span>Source <span className="font-mono">{id}</span> no longer exists in /app/knowledge.</span>
              </div>
              <Button size="sm" variant="outline" onClick={() => setCorpora(tool.id, corpora.filter(x => x !== id))}>
                Remove
              </Button>
            </li>
          ))}
        </ul>
      )}

      <CorpusPicker
        open={pickerOpen}
        onClose={() => setPickerOpen(false)}
        available={available}
        onPick={(id) => { setCorpora(tool.id, [...corpora, id]); setPickerOpen(false); }}
      />
    </div>
  );
}

function CorpusRow({ source, onDetach }) {
  const status = source.status || 'ready';
  const statusTone = status === 'ready' ? 'bg-(--brand-teal)/10 text-brand-teal border-(--brand-teal)/30'
                    : status === 'indexing' ? 'bg-primary/10 text-primary border-primary/30'
                    : status === 'failed' ? 'bg-destructive/10 text-destructive border-destructive/30'
                    : 'bg-muted text-muted-foreground border-border';
  return (
    <li className="px-4 py-3 flex items-start justify-between gap-3">
      <div className="min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <Database className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
          <Link href={`/app/knowledge/${source.id}`} className="text-[13px] font-medium text-foreground hover:text-primary truncate">
            {source.name}
          </Link>
          <span className={`inline-flex items-center px-1.5 py-0.5 rounded border text-[10px] font-medium ${statusTone}`}>
            {status}
          </span>
        </div>
        <div className="mt-1 text-[11.5px] font-mono text-muted-foreground truncate">
          {source.id} · {source.kind} · embedding {source.embedding?.model}
        </div>
        <div className="mt-1 flex flex-wrap gap-3 text-[11px] text-muted-foreground">
          {typeof source.docs === 'number' && <span>{source.docs.toLocaleString()} docs</span>}
          {typeof source.chunks === 'number' && <span>{source.chunks.toLocaleString()} chunks</span>}
          {typeof source.recall === 'number' && source.recall > 0 && <span>recall {source.recall.toFixed(2)}</span>}
          {typeof source.p50Retrieval === 'number' && source.p50Retrieval > 0 && <span>p50 {source.p50Retrieval} ms</span>}
        </div>
      </div>
      <Button size="sm" variant="outline" onClick={onDetach}
              className="h-8 text-[12px] text-destructive border-destructive/40 hover:bg-destructive/10 hover:text-destructive">
        <X className="h-3.5 w-3.5" /> Detach
      </Button>
    </li>
  );
}

function CorpusPicker({ open, onClose, available, onPick }) {
  const [q, setQ] = useState('');
  useEffect(() => { if (open) setQ(''); }, [open]);
  if (!open) return null;
  const ql = q.trim().toLowerCase();
  const filtered = ql
    ? available.filter(s => `${s.name} ${s.id} ${s.kind || ''}`.toLowerCase().includes(ql))
    : available;
  return (
    <>
      <button type="button" aria-label="Close" onClick={onClose}
              className="fixed inset-0 z-40 bg-black/40 backdrop-blur-[2px] animate-fade-in" />
      <aside role="dialog" aria-label="Attach corpus"
             className="fixed inset-y-0 right-0 z-50 w-full sm:w-[480px] lg:w-[520px] bg-card border-l border-border shadow-2xl flex flex-col animate-fade-in">
        <div className="px-5 py-4 border-b border-border">
          <div className="flex items-start justify-between gap-3">
            <div>
              <span className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">Attach corpus</span>
              <h3 className="mt-1.5 text-[16px] font-semibold text-foreground">Pick a knowledge source</h3>
              <p className="mt-1 text-[12px] text-muted-foreground">Sources are managed in /app/knowledge. Only those exist here.</p>
            </div>
            <button type="button" onClick={onClose}
                    className="shrink-0 h-7 w-7 rounded text-muted-foreground hover:text-foreground hover:bg-muted/50 flex items-center justify-center">
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
          <div className="mt-3">
            <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search corpora…" className="h-8 text-[12.5px]" />
          </div>
        </div>
        <div className="flex-1 overflow-y-auto">
          {filtered.length === 0 ? (
            <div className="p-8 text-center text-[12.5px] text-muted-foreground">
              {available.length === 0 ? 'Every available corpus is already attached.' : 'No corpora match.'}
            </div>
          ) : (
            <ul className="divide-y divide-border">
              {filtered.map(s => (
                <li key={s.id}>
                  <button type="button" onClick={() => onPick(s.id)}
                          className="w-full text-left px-5 py-3 hover:bg-muted/40 transition-colors">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <div className="text-[13px] font-medium text-foreground">{s.name}</div>
                        <div className="mt-0.5 text-[11.5px] font-mono text-muted-foreground">{s.id} · {s.kind}</div>
                        <div className="mt-0.5 text-[11px] text-muted-foreground">
                          {(s.docs || 0).toLocaleString()} docs · {(s.chunks || 0).toLocaleString()} chunks
                        </div>
                      </div>
                      <Plus className="h-4 w-4 text-primary shrink-0 mt-0.5" />
                    </div>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </aside>
    </>
  );
}

function useKnowledgeSources() {
  const [sources, setSources] = useState([]);
  useEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      const raw = localStorage.getItem('av-knowledge-v1');
      const list = raw ? JSON.parse(raw) : [];
      if (Array.isArray(list)) setSources(list);
    } catch {}
  }, []);
  return sources;
}

/* ───────────────────── Strategy (RAG) ───────────────────── */

function StrategyCard({ tool }) {
  const { updateStrategy } = useTools();
  const s = tool.retrieval?.strategy || {};
  const mode = s.mode || 'hybrid';

  return (
    <div className="rounded-xl border border-border bg-card overflow-hidden">
      <div className="px-4 py-4 border-b border-border">
        <div className="text-[11.5px] font-medium text-muted-foreground mb-2">Retrieval mode</div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
          {RETRIEVAL_STRATEGIES.map(r => {
            const active = r.id === mode;
            return (
              <button key={r.id} type="button" onClick={() => updateStrategy(tool.id, { mode: r.id })}
                      className={`text-left p-3 rounded-lg border transition-colors ${
                        active ? 'border-primary/40 bg-primary/5' : 'border-border bg-muted/20 hover:bg-muted/40'
                      }`}>
                <div className="flex items-center gap-2">
                  <span className={`h-3 w-3 rounded-full border-2 ${active ? 'border-primary bg-primary' : 'border-input'}`} />
                  <span className={`text-[12.5px] font-medium ${active ? 'text-primary' : 'text-foreground'}`}>{r.label}</span>
                </div>
                <p className="mt-1 ml-5 text-[11px] text-muted-foreground">{r.blurb}</p>
              </button>
            );
          })}
        </div>
      </div>

      {mode === 'hybrid' && (
        <div className="px-4 py-4 border-t border-border">
          <div className="text-[11.5px] font-medium text-muted-foreground mb-2">
            Hybrid weight α <span className="ml-1 font-mono text-foreground">{(s.hybridWeight ?? 0.7).toFixed(2)}</span>
          </div>
          <input type="range" min="0" max="1" step="0.05"
                 value={s.hybridWeight ?? 0.7}
                 onChange={(e) => updateStrategy(tool.id, { hybridWeight: Number(e.target.value) })}
                 className="w-full accent-primary" />
          <div className="flex justify-between mt-1 text-[10.5px] font-mono text-muted-foreground">
            <span>0 · BM25 only</span>
            <span>1 · vector only</span>
          </div>
        </div>
      )}

      <div className="px-4 py-4 border-t border-border">
        <div className="text-[11.5px] font-medium text-muted-foreground mb-2">Query rewriting</div>
        <div className="flex flex-wrap gap-2">
          {QUERY_REWRITERS.map(q => {
            const active = (s.queryRewriter || 'none') === q.id;
            return (
              <button key={q.id} type="button" onClick={() => updateStrategy(tool.id, { queryRewriter: q.id })}
                      title={q.blurb}
                      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md border text-[11.5px] font-medium transition-colors ${
                        active
                          ? 'border-primary/40 bg-primary/10 text-primary'
                          : 'border-border bg-muted/30 text-muted-foreground hover:text-foreground'
                      }`}>
                {active && <Sparkles className="h-3 w-3" />}
                {q.label}
              </button>
            );
          })}
        </div>
        {s.queryRewriter && s.queryRewriter !== 'none' && (
          <p className="mt-2 text-[11px] text-muted-foreground">
            {QUERY_REWRITERS.find(q => q.id === s.queryRewriter)?.blurb}
          </p>
        )}
        {s.queryRewriter && s.queryRewriter !== 'none' && (
          <div className="mt-3">
            <Field label="Rewriter model">
              <Input value={s.rewriterModel || ''} onChange={(e) => updateStrategy(tool.id, { rewriterModel: e.target.value })}
                     placeholder="claude-haiku-4-5" className="h-8 text-[12.5px] font-mono" />
            </Field>
          </div>
        )}
      </div>

      <div className="px-4 py-4 border-t border-border grid grid-cols-1 sm:grid-cols-2 gap-3">
        <NumberField label="Top-k"     value={s.topK ?? 12}     onChange={(v) => updateStrategy(tool.id, { topK: v })} min={1} max={100} step={1} />
        <NumberField label="Min score" value={s.minScore ?? 0.18} onChange={(v) => updateStrategy(tool.id, { minScore: v })} min={0} max={1} step={0.01} />
      </div>
    </div>
  );
}

/* ───────────────────── Embedding (RAG) ───────────────────── */

function EmbeddingCard({ tool }) {
  const { updateEmbedding } = useTools();
  const e = tool.retrieval?.embedding || {};
  const current = EMBEDDING_MODELS.find(m => m.id === e.model) || EMBEDDING_MODELS[0];

  return (
    <div className="rounded-xl border border-border bg-card p-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <Field label="Model">
          <select value={e.model || ''}
                  onChange={(ev) => {
                    const next = EMBEDDING_MODELS.find(m => m.id === ev.target.value);
                    updateEmbedding(tool.id, { model: ev.target.value, dim: next?.dim });
                  }}
                  className="w-full h-8 bg-hero-bg border border-border rounded-md px-2.5 text-[12.5px] focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/15">
            {EMBEDDING_MODELS.map(m => <option key={m.id} value={m.id}>{m.label}</option>)}
          </select>
        </Field>
        <Field label="Dimensions">
          <Input type="number" value={e.dim ?? current?.dim ?? 1024}
                 onChange={(ev) => updateEmbedding(tool.id, { dim: Number(ev.target.value) })}
                 className="h-8 text-[12.5px] font-mono tabular-nums" />
        </Field>
      </div>
      {current && (
        <div className="mt-3 grid grid-cols-3 gap-3 pt-3 border-t border-border text-[11px]">
          <Stat label="Vendor"       value={current.vendor} />
          <Stat label="Cost / 1M"    value={current.costPer1M === 0 ? 'self-host' : `$${current.costPer1M.toFixed(2)}`} />
          <Stat label="Context"      value={`${current.contextWindow.toLocaleString()} tok`} />
        </div>
      )}
      <div className="mt-3 inline-flex items-center gap-2 px-3 py-2 rounded-md border border-amber-500/30 bg-amber-500/5 text-amber-700 dark:text-amber-400 text-[11.5px]">
        <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
        <span>The query-time model must match the index-time model. Changing this without re-indexing breaks retrieval quality.</span>
      </div>
    </div>
  );
}

/* ───────────────────── Reranker (RAG) ───────────────────── */

function RerankerCard({ tool }) {
  const { updateReranker } = useTools();
  const r = tool.retrieval?.reranker || {};
  const current = RERANKERS.find(x => x.id === r.id) || RERANKERS[0];

  return (
    <div className="rounded-xl border border-border bg-card overflow-hidden">
      <div className="px-4 py-4 border-b border-border">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {RERANKERS.map(x => {
            const active = x.id === r.id;
            return (
              <button key={x.id} type="button" onClick={() => updateReranker(tool.id, { id: x.id })}
                      className={`text-left p-3 rounded-lg border transition-colors ${
                        active ? 'border-primary/40 bg-primary/5' : 'border-border bg-muted/20 hover:bg-muted/40'
                      }`}>
                <div className="flex items-center gap-2 flex-wrap">
                  <span className={`h-3 w-3 rounded-full border-2 ${active ? 'border-primary bg-primary' : 'border-input'}`} />
                  <span className={`text-[12.5px] font-medium ${active ? 'text-primary' : 'text-foreground'}`}>{x.label}</span>
                  {x.costPer1k != null && (
                    <span className="ml-auto text-[10.5px] font-mono text-muted-foreground">
                      {x.costPer1k === 0 ? 'free' : `$${x.costPer1k.toFixed(2)}/1k`}
                    </span>
                  )}
                </div>
                <p className="mt-1 ml-5 text-[11px] text-muted-foreground leading-relaxed">{x.blurb}</p>
              </button>
            );
          })}
        </div>
      </div>
      {r.id !== 'none' && (
        <div className="px-4 py-4 border-t border-border grid grid-cols-1 sm:grid-cols-2 gap-3">
          <NumberField label="Rerank top-N" value={r.topN ?? 6} onChange={(v) => updateReranker(tool.id, { topN: v })} min={1} max={50} step={1} />
          <NumberField label="Apply when hits ≥" value={r.applyAbove ?? 0} onChange={(v) => updateReranker(tool.id, { applyAbove: v })} min={0} max={100} step={1} />
        </div>
      )}
    </div>
  );
}

/* ───────────────────── Graph index (GraphRAG) ───────────────────── */

function GraphIndexCard({ tool }) {
  const g = tool.retrieval?.graph || {};
  return (
    <div className="rounded-xl border border-border bg-card p-4">
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <Stat label="Entities"        value={(g.entities || 0).toLocaleString()} />
        <Stat label="Relationships"   value={(g.relationships || 0).toLocaleString()} />
        <Stat label="Communities"     value={(g.communities || 0).toLocaleString()} />
        <Stat label="Hierarchy depth" value={g.communityLevels || 0} />
      </div>
      <div className="mt-4 pt-4 border-t border-border flex items-center justify-between gap-2 text-[11.5px]">
        <span className="text-muted-foreground">
          Last built: {g.lastBuiltAt ? new Date(g.lastBuiltAt).toLocaleString() : '—'}
        </span>
        <Button size="sm" variant="outline" render={
          <Link href="/app/knowledge"><GitBranch className="h-3.5 w-3.5" /> Rebuild graph</Link>
        } />
      </div>
    </div>
  );
}

/* ───────────────────── Graph query mode ───────────────────── */

function GraphQueryModeCard({ tool }) {
  const { updateGraphQuery } = useTools();
  const q = tool.retrieval?.query || {};
  const mode = q.mode || 'drift';
  return (
    <div className="rounded-xl border border-border bg-card p-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2">
        {GRAPH_QUERY_MODES.map(m => {
          const active = m.id === mode;
          return (
            <button key={m.id} type="button" onClick={() => updateGraphQuery(tool.id, { mode: m.id })}
                    className={`text-left p-3 rounded-lg border transition-colors ${
                      active ? 'border-primary/40 bg-primary/5' : 'border-border bg-muted/20 hover:bg-muted/40'
                    }`}>
              <div className="flex items-center gap-2">
                <span className={`h-3 w-3 rounded-full border-2 ${active ? 'border-primary bg-primary' : 'border-input'}`} />
                <span className={`text-[12.5px] font-medium ${active ? 'text-primary' : 'text-foreground'}`}>{m.label}</span>
              </div>
              <p className="mt-1 ml-5 text-[11px] text-muted-foreground leading-relaxed">{m.blurb}</p>
            </button>
          );
        })}
      </div>
    </div>
  );
}

/* ───────────────────── Graph traversal ───────────────────── */

function GraphTraversalCard({ tool }) {
  const { updateGraphQuery, updateGraph } = useTools();
  const q = tool.retrieval?.query || {};
  const g = tool.retrieval?.graph || {};

  return (
    <div className="rounded-xl border border-border bg-card p-4 space-y-4">
      {/* Local-mode controls */}
      <div>
        <div className="text-[11.5px] font-medium text-muted-foreground mb-2">Local queries (entity neighborhood)</div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <NumberField label="Max hops" value={q.maxHops ?? 2}
                       onChange={(v) => updateGraphQuery(tool.id, { maxHops: v })} min={1} max={6} step={1} />
          <NumberField label="Edge confidence ≥" value={q.edgeConfThreshold ?? 0.6}
                       onChange={(v) => updateGraphQuery(tool.id, { edgeConfThreshold: v })} min={0} max={1} step={0.05} />
        </div>
      </div>

      {/* Global-mode controls */}
      <div className="pt-3 border-t border-border">
        <div className="text-[11.5px] font-medium text-muted-foreground mb-2">Global queries (community map-reduce)</div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <NumberField label="Community level" value={g.defaultCommunityLevel ?? 2}
                       onChange={(v) => updateGraph(tool.id, { defaultCommunityLevel: v })} min={0} max={(g.communityLevels || 4)} step={1} />
          <NumberField label="Reduce top-N" value={q.reduceTopN ?? 10}
                       onChange={(v) => updateGraphQuery(tool.id, { reduceTopN: v })} min={1} max={50} step={1} />
          <NumberField label="Map batch size" value={q.mapBatchSize ?? 8}
                       onChange={(v) => updateGraphQuery(tool.id, { mapBatchSize: v })} min={1} max={32} step={1} />
        </div>
        <p className="mt-2 text-[11px] text-muted-foreground leading-relaxed">
          Lower community level = more abstract themes; higher level = leaf entities. Reduce top-N caps how many community summaries the LLM merges into the final answer.
        </p>
      </div>
    </div>
  );
}

/* ───────────────────── Summarization ───────────────────── */

function SummarizationCard({ tool }) {
  const { updateSummarization } = useTools();
  const s = tool.retrieval?.summarization || {};
  return (
    <div className="rounded-xl border border-border bg-card p-4">
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <Field label="Model">
          <Input value={s.model || ''} onChange={(e) => updateSummarization(tool.id, { model: e.target.value })}
                 placeholder="claude-sonnet-4-6" className="h-8 text-[12.5px] font-mono" />
        </Field>
        <NumberField label="Temperature" value={s.temperature ?? 0.0}
                     onChange={(v) => updateSummarization(tool.id, { temperature: v })} min={0} max={1} step={0.05} />
        <NumberField label="Max tokens / summary" value={s.maxTokensPerSummary ?? 2000}
                     onChange={(v) => updateSummarization(tool.id, { maxTokensPerSummary: v })} min={256} max={32_000} step={256} />
      </div>
      <div className="mt-3 flex items-center gap-2 text-[11px] text-muted-foreground">
        <Toggle checked={!!s.citationsRequired} onChange={(v) => updateSummarization(tool.id, { citationsRequired: v })} label="Citations required" />
        <span>
          {s.citationsRequired
            ? 'Every claim in the summary must cite at least one entity. Discharges av.output.hallucination.'
            : 'Citations are optional. Faster but harder to audit.'}
        </span>
      </div>
    </div>
  );
}

/* ───────────────────── ACL + freshness ───────────────────── */

function AclFreshnessCard({ tool }) {
  const { updateRetrievalAcl, updateFreshness } = useTools();
  const acl = tool.retrieval?.acl || {};
  const f   = tool.retrieval?.freshness || {};

  return (
    <div className="rounded-xl border border-border bg-card overflow-hidden">
      {/* ACL */}
      <div className="px-4 py-4 border-b border-border">
        <div className="text-[11.5px] font-medium text-muted-foreground mb-2 flex items-center gap-1.5">
          <ShieldCheck className="h-3 w-3" /> ACL mode
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
          {RETRIEVAL_ACL_MODES.map(m => {
            const active = (acl.mode || 'inherit') === m.id;
            return (
              <button key={m.id} type="button" onClick={() => updateRetrievalAcl(tool.id, { mode: m.id })}
                      className={`text-left p-3 rounded-lg border transition-colors ${
                        active ? 'border-primary/40 bg-primary/5' : 'border-border bg-muted/20 hover:bg-muted/40'
                      }`}>
                <div className="flex items-center gap-2">
                  <span className={`h-3 w-3 rounded-full border-2 ${active ? 'border-primary bg-primary' : 'border-input'}`} />
                  <span className={`text-[12.5px] font-medium ${active ? 'text-primary' : 'text-foreground'}`}>{m.label}</span>
                </div>
                <p className="mt-1 ml-5 text-[11px] text-muted-foreground leading-relaxed">{m.blurb}</p>
              </button>
            );
          })}
        </div>
      </div>

      {acl.mode === 'allowlist' && (
        <ListEditor
          title="Allowed SCIM groups"
          subtitle="Only members of these groups can query this tool."
          items={acl.allowGroups || []}
          onChange={(next) => updateRetrievalAcl(tool.id, { allowGroups: next })}
          placeholder="grp_engineering"
          tone="primary"
        />
      )}

      {/* Freshness */}
      <div className="px-4 py-4 border-t border-border">
        <div className="text-[11.5px] font-medium text-muted-foreground mb-2 flex items-center gap-1.5">
          <Clock className="h-3 w-3" /> Freshness SLA
        </div>
        <div className="flex flex-wrap gap-2">
          {FRESHNESS_SLAS.map(s => {
            const active = (f.sla || 'hourly') === s.id;
            return (
              <button key={s.id} type="button" onClick={() => updateFreshness(tool.id, { sla: s.id })}
                      className={`inline-flex items-center px-2.5 py-1 rounded-md border text-[11.5px] font-medium transition-colors ${
                        active
                          ? 'border-primary/40 bg-primary/10 text-primary'
                          : 'border-border bg-muted/30 text-muted-foreground hover:text-foreground'
                      }`}>
                {s.label}
              </button>
            );
          })}
        </div>
        <div className="mt-3">
          <NumberField label="Alert when index lags by" value={f.alertOnLagMin ?? 120}
                       onChange={(v) => updateFreshness(tool.id, { alertOnLagMin: v })} min={5} max={43_200} step={5} suffix="min" />
        </div>
      </div>
    </div>
  );
}

/* ───────────────────── Quality controls ───────────────────── */

function QualityCard({ tool }) {
  const { updateQuality } = useTools();
  const q = tool.retrieval?.quality || {};
  return (
    <div className="rounded-xl border border-border bg-card p-4">
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <NumberField label="Cache TTL"             value={q.cacheTtlS ?? 60}
                     onChange={(v) => updateQuality(tool.id, { cacheTtlS: v })} min={0} max={3600} step={10} suffix="s" />
        <NumberField label="Token budget / call"   value={q.tokenBudget ?? 8000}
                     onChange={(v) => updateQuality(tool.id, { tokenBudget: v })} min={1000} max={200_000} step={1000} suffix="tok" />
        <NumberField label="Truncate chunk at"     value={q.truncateChunkChars ?? 1200}
                     onChange={(v) => updateQuality(tool.id, { truncateChunkChars: v })} min={200} max={8000} step={50} suffix="chars" />
      </div>
      <div className="mt-3 flex items-center gap-2 text-[11px] text-muted-foreground">
        <Toggle checked={!!q.citationsRequired} onChange={(v) => updateQuality(tool.id, { citationsRequired: v })} label="Citations required" />
        <span>
          {q.citationsRequired
            ? 'Every chunk returned must carry a citation back to the source. Discharges av.output.hallucination.'
            : 'Chunks may be returned without citations.'}
        </span>
      </div>
    </div>
  );
}

/* ───────────────────── Shared building blocks ───────────────────── */

function Section({ title, subtitle, children }) {
  return (
    <section>
      <div className="mb-3">
        <h3 className="text-[14px] font-semibold text-foreground">{title}</h3>
        {subtitle && <p className="mt-0.5 text-[12px] text-muted-foreground max-w-200">{subtitle}</p>}
      </div>
      {children}
    </section>
  );
}

function Field({ label, children }) {
  return (
    <label className="block">
      <div className="text-[11px] font-medium text-muted-foreground mb-1">{label}</div>
      {children}
    </label>
  );
}

function NumberField({ label, value, onChange, suffix, min, max, step }) {
  return (
    <Field label={label}>
      <div className="flex items-center gap-2">
        <Input type="number" value={value}
               onChange={(e) => onChange(Number(e.target.value))}
               min={min} max={max} step={step}
               className="h-8 text-[12.5px] font-mono tabular-nums" />
        {suffix && <span className="text-[11px] text-muted-foreground font-mono shrink-0">{suffix}</span>}
      </div>
    </Field>
  );
}

function Stat({ label, value }) {
  return (
    <div>
      <div className="text-[10.5px] font-medium text-muted-foreground">{label}</div>
      <div className="mt-0.5 text-[14px] font-semibold tabular-nums text-foreground">{value}</div>
    </div>
  );
}

function Toggle({ checked, onChange, label }) {
  return (
    <button type="button" onClick={() => onChange(!checked)} aria-pressed={checked} aria-label={label}
            className={`relative inline-flex items-center h-5 w-9 rounded-full border transition-colors ${
              checked ? 'bg-primary border-primary' : 'bg-muted border-border'
            }`}>
      <span className={`inline-block h-3.5 w-3.5 rounded-full bg-card border border-border shadow transition-transform ${
        checked ? 'translate-x-4' : 'translate-x-0.5'
      }`} />
    </button>
  );
}

function ListEditor({ title, subtitle, items, onChange, placeholder, tone }) {
  const [draft, setDraft] = useState('');
  const add = () => {
    const v = draft.trim();
    if (!v || items.includes(v)) { setDraft(''); return; }
    onChange([...items, v]);
    setDraft('');
  };
  const toneClass = tone === 'destructive'
    ? 'border-destructive/40 bg-destructive/5 text-destructive'
    : tone === 'primary'
      ? 'border-primary/40 bg-primary/5 text-primary'
      : 'border-border bg-muted/40 text-foreground';
  return (
    <div className="px-4 py-4 border-t border-border">
      <div className="flex items-baseline justify-between gap-2 mb-2">
        <div>
          <div className="text-[12px] font-medium text-foreground">{title}</div>
          {subtitle && <div className="text-[11px] text-muted-foreground">{subtitle}</div>}
        </div>
        <span className="text-[10.5px] font-mono text-muted-foreground">{items.length}</span>
      </div>
      <div className="flex flex-wrap gap-1.5 mb-2">
        {items.length === 0 && <span className="text-[11.5px] text-muted-foreground italic">Empty.</span>}
        {items.map(i => (
          <span key={i} className={`inline-flex items-center gap-1 pl-2 pr-1 py-0.5 rounded-md border text-[11px] font-mono ${toneClass}`}>
            {i}
            <button type="button" onClick={() => onChange(items.filter(x => x !== i))}
                    className="h-4 w-4 rounded hover:bg-muted/40 flex items-center justify-center" aria-label={`Remove ${i}`}>
              <X className="h-3 w-3" />
            </button>
          </span>
        ))}
      </div>
      <div className="flex items-center gap-2">
        <Input value={draft} onChange={(e) => setDraft(e.target.value)}
               onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); add(); } }}
               placeholder={placeholder} className="h-8 text-[12.5px] font-mono" />
        <Button size="sm" variant="outline" className="h-8 text-[12px]" onClick={add} disabled={!draft.trim()}>
          <Plus className="h-3.5 w-3.5" /> Add
        </Button>
      </div>
    </div>
  );
}
