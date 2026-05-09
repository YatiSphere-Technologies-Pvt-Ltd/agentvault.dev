'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';
import { WORKFLOW_TEMPLATES } from './_workflowStore';

/* Studio launcher — the first thing the user sees when they open /app/studio.
   Two paths:
     • Start new   — blank canvas or a template
     • Open existing — pick from the saved workflows list

   Premium / responsive: hero + two-column layout that collapses to a single
   column under md. All tokens come from .studio-root in studio.css. */
export default function Launcher({ workflows, onCreate, onOpen }) {
  const [search, setSearch] = useState('');
  const [selectedTemplate, setSelectedTemplate] = useState(null);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return workflows.list;
    return workflows.list.filter(w =>
      (w.name || '').toLowerCase().includes(q) ||
      (w.description || '').toLowerCase().includes(q)
    );
  }, [workflows.list, search]);

  const sorted = useMemo(
    () => [...filtered].sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt)),
    [filtered]
  );

  const handleTemplate = (tplId) => {
    setSelectedTemplate(tplId);
    const tpl = WORKFLOW_TEMPLATES.find(t => t.id === tplId);
    const name = tpl?.label || 'Untitled workflow';
    onCreate({ name, template: tplId });
  };

  return (
    <div className="studio-launcher absolute inset-0 overflow-y-auto" data-studio-launcher>
      {/* ambient backdrop */}
      <div className="launcher-aurora" aria-hidden />

      <div className="relative max-w-6xl mx-auto px-5 sm:px-8 py-10 md:py-16">
        {/* Hero */}
        <div className="mb-8 md:mb-12">
          <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-full chip-sandbox text-[10.5px] font-mono mb-5">
            <span className="h-1.5 w-1.5 rounded-full bg-accent" style={{ animation: 'pulse-dot 2.2s ease-in-out infinite' }} />
            <span>agent studio · sandbox</span>
          </div>
          <h1 className="text-[28px] sm:text-[34px] md:text-[42px] leading-[1.1] font-semibold tracking-tight text-foreground">
            Build an agent workflow
          </h1>
          <p className="mt-3 text-[14px] sm:text-[15px] text-muted-foreground max-w-2xl">
            Compose nodes, enforce policy, run a trace, and promote — visually.
            Start from a blank canvas or continue a saved draft.
          </p>
        </div>

        {/* Two columns */}
        <div className="grid grid-cols-1 lg:grid-cols-[1.1fr_1fr] gap-6 lg:gap-8">
          {/* Start new */}
          <section className="space-y-4">
            <header className="flex items-center justify-between">
              <div className="text-[10px] uppercase tracking-[0.22em] font-mono text-muted-foreground">
                Start new
              </div>
              <span className="text-[10px] text-muted-foreground/70 font-mono">
                {WORKFLOW_TEMPLATES.length} templates
              </span>
            </header>

            {/* Primary card — blank canvas */}
            <button
              type="button"
              onClick={() => handleTemplate('blank')}
              disabled={selectedTemplate !== null}
              className="launcher-hero-card group relative w-full text-left rounded-2xl p-5 sm:p-6 overflow-hidden disabled:opacity-60"
            >
              <div className="launcher-hero-card-glow" aria-hidden />
              <div className="relative flex items-start gap-4">
                <div className="launcher-icon-tile shrink-0">
                  <svg width="22" height="22" viewBox="0 0 22 22" fill="none">
                    <rect x="2" y="2" width="18" height="18" rx="3" stroke="currentColor" strokeWidth="1.4" strokeDasharray="3 3" />
                    <path d="M11 7v8M7 11h8" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
                  </svg>
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-baseline gap-2 flex-wrap">
                    <div className="text-[16px] sm:text-[17px] font-semibold text-foreground">Start from scratch</div>
                    <span className="text-[10px] uppercase tracking-[0.18em] font-mono text-primary">recommended</span>
                  </div>
                  <div className="mt-1 text-[13px] text-muted-foreground">
                    A blank canvas with your trigger ready to wire. Drop nodes, draw edges, run.
                  </div>
                  <div className="mt-3 inline-flex items-center gap-1.5 text-[11.5px] font-mono text-primary opacity-90 group-hover:opacity-100 transition">
                    <span>Open blank canvas</span>
                    <span className="transition-transform group-hover:translate-x-0.5">→</span>
                  </div>
                </div>
              </div>
            </button>

            {/* Secondary templates (everything except blank) */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {WORKFLOW_TEMPLATES.filter(t => t.id !== 'blank').map(tpl => (
                <button
                  key={tpl.id}
                  type="button"
                  onClick={() => handleTemplate(tpl.id)}
                  disabled={selectedTemplate !== null}
                  className="launcher-card group relative text-left rounded-xl p-4 disabled:opacity-60"
                >
                  <div className="flex items-start gap-3">
                    <div className="launcher-icon-tile-sm shrink-0">
                      <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                        <rect x="2" y="2" width="12" height="12" rx="2" stroke="currentColor" strokeWidth="1.3" />
                        <path d="M5 6h6M5 8h4M5 10h5" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
                      </svg>
                    </div>
                    <div className="min-w-0">
                      <div className="text-[13.5px] font-medium text-foreground">{tpl.label}</div>
                      <div className="mt-0.5 text-[11.5px] text-muted-foreground line-clamp-2">{tpl.desc}</div>
                    </div>
                  </div>
                  <div className="mt-3 text-[10.5px] font-mono text-muted-foreground/80 group-hover:text-primary transition-colors">
                    Use template →
                  </div>
                </button>
              ))}
            </div>

            <div className="text-[11px] text-muted-foreground/80 pt-1">
              Need an agent-bound workflow? Open it from the agent&apos;s Orchestration tab.
              <Link href="/app" className="ml-1 underline underline-offset-2 hover:text-foreground">Back to dashboard</Link>
            </div>
          </section>

          {/* Existing workflows */}
          <section className="space-y-4">
            <header className="flex items-center justify-between gap-3">
              <div className="text-[10px] uppercase tracking-[0.22em] font-mono text-muted-foreground">
                Continue working
              </div>
              <span className="text-[10px] text-muted-foreground/70 font-mono">
                {workflows.list.length} saved
              </span>
            </header>

            <div className="launcher-list-shell rounded-2xl">
              {/* Search */}
              <div className="px-3 sm:px-4 pt-3 pb-2 border-b border-border/70">
                <div className="relative">
                  <svg className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground/70" width="13" height="13" viewBox="0 0 14 14" fill="none">
                    <circle cx="6" cy="6" r="4" stroke="currentColor" strokeWidth="1.4" />
                    <path d="M9.5 9.5l3 3" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
                  </svg>
                  <input
                    value={search}
                    onChange={e => setSearch(e.target.value)}
                    placeholder="Search workflows…"
                    className="w-full pl-8 pr-3 py-1.5 bg-transparent text-[12.5px] focus:outline-none placeholder:text-muted-foreground/60"
                  />
                </div>
              </div>

              {/* List */}
              <div className="max-h-[55vh] overflow-y-auto">
                {sorted.length === 0 ? (
                  <div className="p-8 text-center">
                    <div className="text-[12.5px] text-muted-foreground">
                      {search.trim() ? 'No workflows match your search.' : 'No saved workflows yet.'}
                    </div>
                    {!search.trim() && (
                      <button
                        onClick={() => handleTemplate('blank')}
                        className="mt-3 btn-primary text-[11.5px] px-3 py-1.5 rounded-md font-medium"
                      >
                        Create your first
                      </button>
                    )}
                  </div>
                ) : (
                  <ul className="divide-y divide-border/60">
                    {sorted.map(w => (
                      <li key={w.id}>
                        <button
                          onClick={() => onOpen(w.id)}
                          disabled={selectedTemplate !== null}
                          className="launcher-row w-full text-left px-3 sm:px-4 py-3 flex items-center gap-3 disabled:opacity-60"
                        >
                          <div className="launcher-row-dot shrink-0" />
                          <div className="min-w-0 flex-1">
                            <div className="flex items-baseline gap-2">
                              <div className="text-[13px] font-medium text-foreground truncate">{w.name || 'Untitled'}</div>
                              {w.id === workflows.currentId && (
                                <span className="text-[9.5px] font-mono uppercase tracking-[0.18em] text-primary">current</span>
                              )}
                            </div>
                            <div className="text-[10.5px] font-mono text-muted-foreground truncate">
                              {w.description ? w.description : w.id}
                            </div>
                          </div>
                          <div className="text-right shrink-0">
                            <div className="text-[10.5px] font-mono text-muted-foreground">
                              {formatRelative(w.updatedAt)}
                            </div>
                            <div className="text-[10px] text-primary opacity-0 group-hover:opacity-100">open →</div>
                          </div>
                          <span className="launcher-row-arrow text-muted-foreground/60 group-hover:text-primary transition-colors">→</span>
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}

function formatRelative(iso) {
  if (!iso) return '';
  const d = new Date(iso);
  const diffMs = Date.now() - d.getTime();
  const sec = Math.round(diffMs / 1000);
  if (sec < 60) return 'just now';
  const min = Math.round(sec / 60);
  if (min < 60) return `${min}m ago`;
  const hr = Math.round(min / 60);
  if (hr < 24) return `${hr}h ago`;
  const day = Math.round(hr / 24);
  if (day < 7) return `${day}d ago`;
  return d.toLocaleDateString();
}
