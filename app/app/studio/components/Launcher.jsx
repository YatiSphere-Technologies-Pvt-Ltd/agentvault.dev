'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';
import { ArrowLeft, ArrowRight, Plus, Search, Sparkles, FileText, Workflow, Receipt, ShieldCheck, Headphones, Zap } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { WORKFLOW_TEMPLATES } from './_workflowStore';

/* Studio launcher — rebuilt to match the rest-of-app theme (GRC / Vault /
   Tools pages). Uses bg-card / border-border / shadcn primitives instead of
   the bespoke studio-launcher CSS that was breaking layout when content
   exceeded its container. */

export default function Launcher({ workflows, onCreate, onOpen }) {
  const [search, setSearch] = useState('');
  const [busy, setBusy] = useState(false);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return workflows.list;
    return workflows.list.filter(w =>
      (w.name || '').toLowerCase().includes(q) ||
      (w.description || '').toLowerCase().includes(q),
    );
  }, [workflows.list, search]);

  const sorted = useMemo(
    () => [...filtered].sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt)),
    [filtered],
  );

  const handleTemplate = (tplId) => {
    const tpl = WORKFLOW_TEMPLATES.find(t => t.id === tplId);
    setBusy(true);
    onCreate({ name: tpl?.label || 'Untitled workflow', template: tplId });
  };

  const blankTpl = WORKFLOW_TEMPLATES.find(t => t.id === 'blank');
  const otherTpls = WORKFLOW_TEMPLATES.filter(t => t.id !== 'blank');

  return (
    <div className="absolute inset-0 overflow-y-auto bg-hero-bg">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-10 py-8 lg:py-10">
        {/* Header */}
        <Link href="/app" className="text-[12px] text-muted-foreground hover:text-foreground inline-flex items-center gap-1.5">
          <ArrowLeft className="h-3.5 w-3.5" /> Back to dashboard
        </Link>

        <div className="mt-4 mb-5 flex items-end justify-between flex-wrap gap-3">
          <div>
            <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md border border-accent/40 bg-accent/10 text-accent text-[10.5px] font-mono mb-3">
              <span className="h-1.5 w-1.5 rounded-full bg-accent animate-pulse-dot" />
              <span>sandbox</span>
            </div>
            <h2 className="text-[20px] sm:text-[24px] font-semibold tracking-tight text-foreground">
              Build an agent workflow
            </h2>
            <p className="mt-1 text-[13px] text-muted-foreground max-w-160 leading-relaxed">
              Compose nodes, enforce policy, run a trace, and promote — visually. Start from a blank canvas, pick a template, or continue a saved draft.
            </p>
          </div>
        </div>

        {/* ── Real-work band ── */}
        <RealWorkBand onPick={handleTemplate} />

        {/* Two columns */}
        <div className="grid grid-cols-1 lg:grid-cols-[1.2fr_1fr] gap-6">
          {/* ─────────────── Start new ─────────────── */}
          <section className="space-y-4 min-w-0">
            <div className="flex items-center justify-between">
              <h3 className="text-[14px] font-semibold text-foreground">Start new</h3>
              <span className="text-[11px] text-muted-foreground">{WORKFLOW_TEMPLATES.length} templates</span>
            </div>

            {/* Hero card — blank canvas */}
            <button
              type="button"
              onClick={() => handleTemplate('blank')}
              disabled={busy}
              className="w-full text-left rounded-xl border border-primary/30 bg-card p-5 hover:border-primary/50 hover:shadow-md transition-all disabled:opacity-60 group"
            >
              <div className="flex items-start gap-4">
                <div className="h-10 w-10 rounded-md bg-primary/10 text-primary flex items-center justify-center shrink-0 ring-1 ring-primary/20">
                  <Plus className="h-5 w-5" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-[15px] font-semibold text-foreground">Start from scratch</span>
                    <span className="inline-flex items-center px-1.5 py-0.5 rounded border border-primary/40 bg-primary/10 text-primary text-[10px] font-medium">
                      Recommended
                    </span>
                  </div>
                  <p className="mt-1 text-[12.5px] text-muted-foreground leading-relaxed">
                    {blankTpl?.desc || 'A blank canvas with your trigger ready to wire. Drop nodes, draw edges, run.'}
                  </p>
                  <div className="mt-3 inline-flex items-center gap-1 text-[12px] text-primary font-medium">
                    Open blank canvas
                    <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
                  </div>
                </div>
              </div>
            </button>

            {/* Other templates */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {otherTpls.map(tpl => (
                <button
                  key={tpl.id}
                  type="button"
                  onClick={() => handleTemplate(tpl.id)}
                  disabled={busy}
                  className="text-left rounded-xl border border-border bg-card p-4 hover:border-primary/40 hover:shadow-sm transition-all disabled:opacity-60 group min-w-0"
                >
                  <div className="flex items-start gap-3 min-w-0">
                    <div className="h-8 w-8 rounded-md bg-muted/40 text-muted-foreground flex items-center justify-center shrink-0">
                      <FileText className="h-3.5 w-3.5" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="text-[13px] font-medium text-foreground truncate">{tpl.label}</div>
                      <p className="mt-1 text-[11.5px] text-muted-foreground leading-relaxed line-clamp-2">{tpl.desc}</p>
                      <div className="mt-2 inline-flex items-center gap-1 text-[11px] text-muted-foreground group-hover:text-primary transition-colors">
                        Use template
                        <ArrowRight className="h-3 w-3 transition-transform group-hover:translate-x-0.5" />
                      </div>
                    </div>
                  </div>
                </button>
              ))}
            </div>

            <p className="text-[11.5px] text-muted-foreground">
              Need an agent-bound workflow? Open it from the agent's Orchestration tab.
            </p>
          </section>

          {/* ─────────────── Continue working ─────────────── */}
          <section className="space-y-4 min-w-0">
            <div className="flex items-center justify-between">
              <h3 className="text-[14px] font-semibold text-foreground">Continue working</h3>
              <span className="text-[11px] text-muted-foreground">{workflows.list.length} saved</span>
            </div>

            <div className="rounded-xl border border-border bg-card overflow-hidden">
              {/* Search */}
              <div className="px-3 py-2.5 border-b border-border bg-muted/20">
                <div className="relative">
                  <Search className="h-3.5 w-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Search workflows…"
                    className="pl-8 h-8 text-[12.5px]"
                  />
                </div>
              </div>

              {/* List */}
              <div className="max-h-[60vh] overflow-y-auto">
                {sorted.length === 0 ? (
                  <div className="p-8 text-center">
                    <Workflow className="h-5 w-5 text-muted-foreground/70 mx-auto" />
                    <div className="mt-2 text-[13px] font-medium text-foreground">
                      {search.trim() ? 'No workflows match' : 'No saved workflows yet'}
                    </div>
                    {!search.trim() && (
                      <Button size="sm" className="mt-3" onClick={() => handleTemplate('blank')}>
                        <Plus className="h-3.5 w-3.5" /> Create your first
                      </Button>
                    )}
                  </div>
                ) : (
                  <ul className="divide-y divide-border">
                    {sorted.map(w => (
                      <li key={w.id}>
                        <button
                          onClick={() => onOpen(w.id)}
                          disabled={busy}
                          className="w-full text-left px-4 py-3 flex items-start gap-3 hover:bg-muted/40 transition-colors disabled:opacity-60 group min-w-0"
                        >
                          <span className="mt-1.5 h-1.5 w-1.5 rounded-full bg-primary/60 shrink-0" />
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="text-[13px] font-medium text-foreground truncate">
                                {w.name || 'Untitled'}
                              </span>
                              {w.id === workflows.currentId && (
                                <span className="inline-flex items-center px-1.5 py-0.5 rounded border border-primary/40 bg-primary/10 text-primary text-[10px] font-medium">
                                  current
                                </span>
                              )}
                            </div>
                            {w.description && (
                              <p className="mt-0.5 text-[11.5px] text-muted-foreground leading-relaxed line-clamp-2">
                                {w.description}
                              </p>
                            )}
                            <div className="mt-1 text-[10.5px] font-mono text-muted-foreground/80 truncate">
                              {w.id}
                            </div>
                          </div>
                          <div className="flex flex-col items-end shrink-0 gap-1">
                            <span className="text-[10.5px] font-mono text-muted-foreground tabular-nums">
                              {formatRelative(w.updatedAt)}
                            </span>
                            <ArrowRight className="h-3 w-3 text-muted-foreground/60 group-hover:text-primary transition-colors" />
                          </div>
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

/* ── Real-work band ──
   Sits above the columns to anchor the operator on a simple idea: this canvas
   is for production-grade work, not toy demos. Chips link directly to the
   templates that match each example so motivation translates into a click. */
function RealWorkBand({ onPick }) {
  const examples = [
    { icon: Receipt,       label: 'Invoice processor',     blurb: '9 days → 4 hours',          template: 'invoice'         },
    { icon: ShieldCheck,   label: 'KYC + risk scoring',    blurb: '80% auto-decisioned',       template: 'agent.supervisor' },
    { icon: Headphones,    label: 'Customer support',      blurb: '24/7, escalates safely',    template: 'agent.support'   },
    { icon: Zap,           label: 'Plan → execute → critique', blurb: 'Self-checking agents', template: 'agent.plan_execute' },
  ];
  return (
    <section className="mb-7 rounded-xl border border-primary/25 bg-card overflow-hidden">
      <div
        aria-hidden
        className="absolute pointer-events-none"
      />
      <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.4fr)] gap-0">
        {/* Left: pitch */}
        <div className="px-5 py-5 lg:py-6 border-b lg:border-b-0 lg:border-r border-primary/15 bg-gradient-to-br from-primary/[0.06] via-transparent to-transparent">
          <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md border border-primary/40 bg-primary/10 text-primary text-[10.5px] font-medium mb-3">
            <Sparkles className="h-3 w-3" />
            <span>Built for real work</span>
          </div>
          <h3 className="text-[15px] sm:text-[16px] font-semibold tracking-tight text-foreground leading-snug">
            Replace ten-step manual processes with auditable agent workflows.
          </h3>
          <p className="mt-1.5 text-[12.5px] text-muted-foreground leading-relaxed max-w-150">
            Process invoices, triage incidents, screen vendors, draft replies — with policy gates, human approvals, and a full audit trail. Not toy demos. Production patterns your operators can sign off on.
          </p>
        </div>

        {/* Right: example chips */}
        <div className="px-5 py-5 lg:py-6">
          <div className="text-[11px] font-medium text-muted-foreground mb-2.5">
            Try a real example
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {examples.map(ex => {
              const Icon = ex.icon;
              return (
                <button
                  key={ex.template}
                  type="button"
                  onClick={() => onPick(ex.template)}
                  className="group text-left rounded-lg border border-border bg-background hover:border-primary/40 hover:bg-primary/[0.03] hover:shadow-sm transition-all p-3 flex items-center gap-3 min-w-0"
                >
                  <div className="h-7 w-7 rounded-md bg-primary/10 text-primary flex items-center justify-center shrink-0">
                    <Icon className="h-3.5 w-3.5" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="text-[12.5px] font-medium text-foreground truncate">{ex.label}</div>
                    <div className="text-[11px] text-muted-foreground truncate">{ex.blurb}</div>
                  </div>
                  <ArrowRight className="h-3.5 w-3.5 text-muted-foreground/60 group-hover:text-primary group-hover:translate-x-0.5 transition-all shrink-0" />
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </section>
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
