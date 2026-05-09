'use client';

import { useEffect, useMemo, useState } from 'react';
import { CONTROLS, decisionTone, hookLabel } from './_data';
import { useClauseMappings } from './_clauseMappingStore';

/* Heuristic recommender — given a clause description and label, score every
   control by token overlap with the clause text. Used to highlight likely
   matches at the top of the sheet so the operator doesn't scroll through 15
   controls trying to find the right one.

   This is the same shape as _extractPolicyDraft.js — local first, leaving
   room to swap in a real LLM call later. */
function recommendControls(clauseLabel, clauseDescription) {
  const text = `${clauseLabel || ''} ${clauseDescription || ''}`.toLowerCase();
  if (!text.trim()) return new Map();

  const scores = new Map();
  for (const c of CONTROLS) {
    const corpus = `${c.title} ${c.summary} ${c.family} ${c.id}`.toLowerCase();
    const tokens = corpus.split(/[^a-z0-9]+/).filter(t => t.length >= 4);
    let score = 0;
    for (const tok of new Set(tokens)) {
      if (text.includes(tok)) score += 1;
    }
    if (score > 0) scores.set(c.id, score);
  }
  return scores;
}

export default function MapControlsSheet({ open, onClose, framework, clause }) {
  const { controlsForClause, attach, detach } = useClauseMappings();
  const [query, setQuery] = useState('');

  // Reset search when sheet opens for a new clause
  useEffect(() => {
    if (open) setQuery('');
  }, [open, clause?.id, framework?.slug]);

  // Lock body scroll while open
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = prev; };
  }, [open]);

  // Close on Escape
  useEffect(() => {
    if (!open) return;
    const onKey = (e) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  const attached = useMemo(() => {
    if (!framework || !clause) return new Map();
    const list = controlsForClause(framework.slug, clause.id);
    return new Map(list.map(o => [o.controlId, o.origin]));
  }, [controlsForClause, framework, clause]);

  const recommendations = useMemo(
    () => clause ? recommendControls(clause.label, clause.description) : new Map(),
    [clause],
  );

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    const sorted = [...CONTROLS].sort((a, b) => {
      const ra = recommendations.get(a.id) || 0;
      const rb = recommendations.get(b.id) || 0;
      if (rb !== ra) return rb - ra;
      return a.title.localeCompare(b.title);
    });
    if (!q) return sorted;
    return sorted.filter(c =>
      c.title.toLowerCase().includes(q) ||
      c.id.toLowerCase().includes(q) ||
      c.family.toLowerCase().includes(q) ||
      c.summary.toLowerCase().includes(q)
    );
  }, [query, recommendations]);

  if (!open || !framework || !clause) return null;

  const onToggle = (controlId) => {
    if (attached.has(controlId)) {
      detach(controlId, framework.slug, clause.id);
    } else {
      attach(controlId, framework.slug, clause.id);
    }
  };

  const attachedCount = attached.size;

  return (
    <>
      {/* Backdrop */}
      <button
        type="button"
        aria-label="Close"
        onClick={onClose}
        className="fixed inset-0 z-40 bg-black/40 backdrop-blur-[2px] animate-fade-in"
      />

      {/* Drawer */}
      <aside
        role="dialog"
        aria-label={`Map controls to ${clause.label}`}
        className="fixed inset-y-0 right-0 z-50 w-full sm:w-[460px] lg:w-[520px] bg-panel border-l border-border shadow-2xl flex flex-col animate-fade-in"
      >
        {/* Header */}
        <div className="px-5 py-4 border-b border-border">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <span className="h-2 w-2 rounded-full" style={{ background: framework.color }} />
                <span className="text-[10.5px] font-mono uppercase tracking-[0.15em] text-muted-foreground">
                  Map controls · {framework.name}
                </span>
              </div>
              <h3 className="mt-1.5 text-[15px] font-semibold text-foreground leading-tight">
                {clause.label}
              </h3>
              {clause.description && (
                <p className="mt-1.5 text-[12px] text-muted-foreground leading-relaxed">
                  {clause.description}
                </p>
              )}
            </div>
            <button
              type="button"
              onClick={onClose}
              className="shrink-0 h-7 w-7 rounded text-muted-foreground hover:text-foreground hover:bg-muted flex items-center justify-center"
              aria-label="Close"
            >
              <svg width="13" height="13" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="2"><path d="M5 5l10 10M15 5l-10 10"/></svg>
            </button>
          </div>

          <div className="mt-3 flex items-center gap-2 text-[10.5px] font-mono">
            <span
              className="px-1.5 py-0.5 rounded border"
              style={{
                borderColor: attachedCount > 0 ? 'var(--accent)55' : 'var(--border)',
                color:       attachedCount > 0 ? 'var(--accent)'   : 'var(--muted-foreground)',
                background:  attachedCount > 0 ? 'var(--accent)10' : 'transparent',
              }}
            >
              {attachedCount === 0
                ? 'No controls attached — clause is unmapped'
                : `${attachedCount} control${attachedCount === 1 ? '' : 's'} attached`}
            </span>
          </div>

          <div className="mt-3 relative">
            <input
              value={query}
              onChange={e => setQuery(e.target.value)}
              placeholder="Search controls…"
              className="w-full pl-8 pr-3 py-1.5 bg-hero-bg border border-border rounded-md text-[12.5px] focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/15"
            />
            <svg width="13" height="13" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.8" className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground">
              <circle cx="9" cy="9" r="6"/><path d="M14 14l4 4"/>
            </svg>
          </div>
        </div>

        {/* List */}
        <div className="flex-1 overflow-y-auto divide-y divide-border">
          {filtered.length === 0 && (
            <div className="p-8 text-center text-[12.5px] text-muted-foreground">
              No controls match.
            </div>
          )}
          {filtered.map(c => {
            const isAttached = attached.has(c.id);
            const origin = attached.get(c.id);
            const recScore = recommendations.get(c.id) || 0;
            const tone = decisionTone(c.enforcement);
            return (
              <label
                key={c.id}
                className={`flex items-start gap-3 px-5 py-3.5 cursor-pointer transition-colors ${
                  isAttached ? 'bg-accent/5' : 'hover:bg-muted/40'
                }`}
              >
                <input
                  type="checkbox"
                  checked={isAttached}
                  onChange={() => onToggle(c.id)}
                  className="mt-1 h-3.5 w-3.5 accent-primary cursor-pointer"
                />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-[12.5px] font-medium text-foreground">{c.title}</span>
                    {recScore >= 2 && !isAttached && (
                      <span className="text-[9.5px] font-mono px-1.5 py-0.5 rounded bg-primary/10 text-primary border border-primary/30">
                        suggested
                      </span>
                    )}
                    {isAttached && origin === 'user' && (
                      <span className="text-[9.5px] font-mono px-1.5 py-0.5 rounded bg-accent/10 text-accent border border-accent/30">
                        added by you
                      </span>
                    )}
                    {isAttached && origin === 'seed' && (
                      <span className="text-[9.5px] font-mono px-1.5 py-0.5 rounded bg-muted text-muted-foreground border border-border">
                        default
                      </span>
                    )}
                  </div>
                  <div className="mt-0.5 text-[10.5px] font-mono text-muted-foreground">
                    {c.id} · {c.family}
                  </div>
                  <p className="mt-1 text-[11.5px] text-muted-foreground leading-relaxed line-clamp-2">
                    {c.summary}
                  </p>
                  <div className="mt-1.5 flex items-center gap-1.5 flex-wrap">
                    <span
                      className="text-[9.5px] font-mono px-1.5 py-0.5 rounded border"
                      style={{ borderColor: tone.color + '55', color: tone.color, background: tone.color + '10' }}
                    >
                      {tone.label}
                    </span>
                    <span className="text-[9.5px] font-mono px-1.5 py-0.5 rounded border border-border text-muted-foreground">
                      {hookLabel(c.hook)}
                    </span>
                  </div>
                </div>
              </label>
            );
          })}
        </div>

        {/* Footer */}
        <div className="px-5 py-3 border-t border-border flex items-center justify-between gap-2">
          <p className="text-[10.5px] text-muted-foreground leading-relaxed">
            Changes save automatically. Unmapping a default does not delete it from your library — it only stops it from satisfying this clause.
          </p>
          <button
            type="button"
            onClick={onClose}
            className="text-[12px] px-3 py-1.5 rounded-md bg-primary text-primary-foreground hover:brightness-110 font-medium shrink-0"
          >
            Done
          </button>
        </div>
      </aside>
    </>
  );
}
