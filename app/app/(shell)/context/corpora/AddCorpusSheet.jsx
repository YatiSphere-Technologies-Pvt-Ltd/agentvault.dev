'use client';

/* AddCorpusSheet — right-side drawer to build a new corpus.
   Single-screen form (no step-through): identity → sources → chunking
   → embedding → reranker → ACL inheritance. The corpus shows up
   immediately in the table on submit. */

import { useEffect, useMemo, useState } from 'react';
import { X, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { CHUNKING_STRATEGIES, EMBEDDING_MODELS, RERANKERS, sourceById } from '../_sourceCatalog';
import { createCorpus, newCorpusId } from '../_store';
import { SourceIcon, FamilyPill } from '../_shared';

const inputCls = "w-full px-2.5 py-1.5 bg-background border border-border rounded-md text-[12.5px] text-foreground placeholder:text-muted-foreground/60 focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all";

export default function AddCorpusSheet({ open, onClose, sources }) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [pickedSources, setPickedSources] = useState(new Set());
  const [strategy, setStrategy] = useState('semantic');
  const [size, setSize] = useState(1200);
  const [overlap, setOverlap] = useState(0);
  const [embedding, setEmbedding] = useState('text-embedding-3-large');
  const [reranker, setReranker] = useState('cohere-rr');
  const [aclInheritance, setAclInheritance] = useState('row');

  // Reset on close.
  useEffect(() => {
    if (!open) {
      setName(''); setDescription('');
      setPickedSources(new Set());
      setStrategy('semantic'); setSize(1200); setOverlap(0);
      setEmbedding('text-embedding-3-large');
      setReranker('cohere-rr'); setAclInheritance('row');
    }
  }, [open]);

  // Body lock + Esc.
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const onKey = (e) => { if (e.key === 'Escape') onClose?.(); };
    window.addEventListener('keydown', onKey);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener('keydown', onKey);
    };
  }, [open, onClose]);

  // When the chunking strategy changes, prefill its defaults.
  useEffect(() => {
    const meta = CHUNKING_STRATEGIES.find(s => s.id === strategy);
    if (!meta) return;
    setSize(meta.defaultSize);
    setOverlap(meta.defaultOverlap);
  }, [strategy]);

  // Default ACL inheritance to whatever the *most restrictive* of the
  // picked sources supports (row > column > tag > static). If none picked,
  // leave row.
  useEffect(() => {
    if (pickedSources.size === 0) return;
    const order = ['row', 'column', 'tag', 'static'];
    const supportSets = Array.from(pickedSources)
      .map(id => sources.find(s => s.id === id))
      .filter(Boolean)
      .map(s => new Set(sourceById(s.kind)?.aclSupport || []));
    const intersection = order.find(a => supportSets.every(s => s.has(a)));
    if (intersection) setAclInheritance(intersection);
  }, [pickedSources, sources]);

  const dimByModel = EMBEDDING_MODELS.find(m => m.id === embedding)?.dim || 1024;

  const canSubmit = name.trim() && pickedSources.size > 0;

  const onSubmit = () => {
    if (!canSubmit) return;
    const projection = {};
    for (const id of pickedSources) projection[id] = '';  // user fills later from detail page
    const record = {
      id: newCorpusId(),
      name: name.trim(),
      description: description.trim(),
      source_ids: Array.from(pickedSources),
      projection,
      chunking: { strategy, size: Number(size), overlap: Number(overlap) },
      embedding: { model: embedding, dim: dimByModel },
      reranker,
      acl_inheritance: aclInheritance,
      chunk_count: 0,
      last_reindex_at: Date.now(),
      drift_score: 0,
      ndcg_at_10: 0,
      recall_at_10: 0,
      mrr: 0,
      health: 'green',
      query_count_7d: 0,
      cost_7d_usd: 0,
      tags: [],
      created_at: Date.now(),
      created_by: 'me',
    };
    createCorpus(record);
    onClose?.();
  };

  if (!open) return null;

  return (
    <>
      <button
        type="button"
        aria-label="Close"
        onClick={onClose}
        className="fixed inset-0 z-40 bg-black/40 backdrop-blur-[2px] animate-fade-in"
      />
      <aside
        role="dialog"
        aria-modal="true"
        className="fixed top-0 right-0 z-50 h-full w-full max-w-[640px] bg-card border-l border-border shadow-2xl flex flex-col animate-slide-in-right"
      >
        <div className="px-5 py-4 border-b border-border flex items-center gap-2">
          <div className="flex-1 min-w-0">
            <div className="text-[10px] uppercase tracking-[0.16em] font-mono text-muted-foreground">New corpus</div>
            <div className="text-[15px] font-semibold text-foreground">Build a corpus</div>
          </div>
          <button onClick={onClose} className="h-8 w-8 rounded text-muted-foreground hover:text-foreground hover:bg-muted flex items-center justify-center" aria-label="Close">
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-5 space-y-5">
          <Section title="Identity">
            <Field label="Display name" required>
              <input className={inputCls} value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Customer 360 corpus" />
            </Field>
            <Field label="Description">
              <input className={inputCls} value={description} onChange={(e) => setDescription(e.target.value)} placeholder="What agents will use this for." />
            </Field>
          </Section>

          <Section title={`Sources · ${pickedSources.size} selected`} hint="Pick one or more. Strictest supported ACL strategy is auto-selected below.">
            <div className="grid grid-cols-1 gap-1.5">
              {sources.map(s => {
                const checked = pickedSources.has(s.id);
                const family = sourceById(s.kind)?.family;
                return (
                  <button
                    key={s.id}
                    type="button"
                    onClick={() => {
                      const next = new Set(pickedSources);
                      next.has(s.id) ? next.delete(s.id) : next.add(s.id);
                      setPickedSources(next);
                    }}
                    className={`text-left rounded-md border px-3 py-2 transition-colors flex items-center gap-3 ${
                      checked
                        ? 'border-primary/50 bg-primary/[0.05]'
                        : 'border-border bg-background hover:border-primary/30'
                    }`}
                  >
                    <div className={`h-4 w-4 rounded border flex items-center justify-center shrink-0 ${
                      checked ? 'bg-primary border-primary text-primary-foreground' : 'border-border'
                    }`}>
                      {checked && <Check className="h-3 w-3" />}
                    </div>
                    <SourceIcon kind={s.kind} size={26} />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="text-[12.5px] font-medium text-foreground truncate">{s.name}</span>
                        {family && <FamilyPill family={family} />}
                      </div>
                      <div className="text-[10.5px] font-mono text-muted-foreground truncate">
                        {sourceById(s.kind)?.label || s.kind} · ACL: {s.acl_strategy}
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </Section>

          <Section title="Chunking strategy">
            <div className="grid grid-cols-2 gap-2">
              {CHUNKING_STRATEGIES.map(c => (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => setStrategy(c.id)}
                  className={`text-left rounded-md border px-3 py-2 transition-colors ${
                    strategy === c.id
                      ? 'border-primary/50 bg-primary/[0.05]'
                      : 'border-border bg-background hover:border-primary/30'
                  }`}
                >
                  <div className={`text-[12px] font-medium ${strategy === c.id ? 'text-primary' : 'text-foreground'}`}>{c.label}</div>
                  <div className="text-[10.5px] text-muted-foreground leading-snug">{c.hint}</div>
                </button>
              ))}
            </div>
            {strategy !== 'structured' && (
              <div className="grid grid-cols-2 gap-3">
                <Field label="Chunk size (tokens)">
                  <input type="number" className={inputCls} value={size} onChange={(e) => setSize(e.target.value)} />
                </Field>
                <Field label="Overlap (tokens)">
                  <input type="number" className={inputCls} value={overlap} onChange={(e) => setOverlap(e.target.value)} />
                </Field>
              </div>
            )}
          </Section>

          <Section title="Embedding + reranker">
            <Field label="Embedding model" required>
              <select className={inputCls} value={embedding} onChange={(e) => setEmbedding(e.target.value)}>
                {EMBEDDING_MODELS.map(m => (
                  <option key={m.id} value={m.id}>{m.label} · {m.dim} dim · ${m.cost.toFixed(2)}/1M</option>
                ))}
              </select>
            </Field>
            <Field label="Reranker">
              <select className={inputCls} value={reranker} onChange={(e) => setReranker(e.target.value)}>
                {RERANKERS.map(r => <option key={r.id} value={r.id}>{r.label}</option>)}
              </select>
            </Field>
          </Section>

          <Section title="ACL inheritance" hint="How retrieval enforces who can see what. Auto-set to the strictest strategy supported by all picked sources.">
            <div className="grid grid-cols-2 gap-2">
              {[
                { id: 'row',    label: 'Row-level',    hint: 'Carry warehouse / RLS row policies through retrieval.' },
                { id: 'column', label: 'Column-level', hint: 'Mask sensitive columns based on role.' },
                { id: 'tag',    label: 'Tag-based',    hint: 'Map data classification tags to retrieval scopes.' },
                { id: 'static', label: 'Static',       hint: 'Manual allowlist.' },
              ].map(c => (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => setAclInheritance(c.id)}
                  className={`text-left rounded-md border px-3 py-2 transition-colors ${
                    aclInheritance === c.id
                      ? 'border-primary/50 bg-primary/[0.05]'
                      : 'border-border bg-background hover:border-primary/30'
                  }`}
                >
                  <div className={`text-[12px] font-medium ${aclInheritance === c.id ? 'text-primary' : 'text-foreground'}`}>{c.label}</div>
                  <div className="text-[10.5px] text-muted-foreground leading-snug">{c.hint}</div>
                </button>
              ))}
            </div>
          </Section>
        </div>

        <div className="border-t border-border bg-muted/20 px-5 py-3 flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={onClose}>Cancel</Button>
          <Button size="sm" disabled={!canSubmit} onClick={onSubmit} className="ml-auto">
            Build corpus
          </Button>
        </div>
      </aside>
    </>
  );
}

function Section({ title, hint, children }) {
  return (
    <section>
      <div className="flex items-baseline justify-between gap-2 mb-2">
        <div className="text-[10px] uppercase tracking-[0.16em] font-mono text-muted-foreground">{title}</div>
        {hint && <div className="text-[10.5px] text-muted-foreground/80 max-w-[60%] text-right leading-snug">{hint}</div>}
      </div>
      <div className="space-y-2.5">{children}</div>
    </section>
  );
}

function Field({ label, required, children }) {
  return (
    <div>
      <div className="text-[10.5px] uppercase tracking-[0.14em] font-mono text-muted-foreground mb-1">
        {label}{required && <span className="text-destructive ml-0.5">*</span>}
      </div>
      {children}
    </div>
  );
}
