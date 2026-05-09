'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { X, Pencil, Trash2, ExternalLink, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  CONTROLS,
  frameworkBySlug,
  decisionTone,
  hookLabel,
} from './_data';
import { usePolicies, effectiveAttachedAgents, effectiveAgentCount } from './_policyStore';
import { useAgents } from '../agents/_store';

/* PolicyDetailSheet
   ----------------
   Right-side drawer with the full policy view: identity, frameworks,
   controls in bundle, attachments, attach-to-agent affordance.
   Edit/Delete actions live in the header. Closes on Escape, locks body
   scroll while open. Persists attachments via the policy store. */

export default function PolicyDetailSheet({ open, policyId, onClose }) {
  const { list, remove, attachAgent, detachAgent } = usePolicies();
  const { agents } = useAgents();
  const policy = useMemo(
    () => list.find(p => p.id === policyId) || null,
    [list, policyId],
  );

  const [agentSearch, setAgentSearch] = useState('');

  // Body scroll lock + Escape close
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const onKey = (e) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener('keydown', onKey);
    };
  }, [open, onClose]);

  useEffect(() => { if (open) setAgentSearch(''); }, [open, policyId]);

  if (!open || !policy) return null;

  const attachedAgents = effectiveAttachedAgents(policy);
  const attachedSet = new Set(attachedAgents);
  const agentCount = effectiveAgentCount(policy);
  const totalAttached =
    (policy.attached?.workspaces || 0) + agentCount + (policy.attached?.tools || 0);
  const isAttached = totalAttached > 0;

  const filteredAgents = (agents || []).filter(a =>
    !agentSearch.trim() || `${a.name} ${a.id} ${a.team || ''}`.toLowerCase().includes(agentSearch.trim().toLowerCase())
  );

  const onDelete = () => {
    const ok = confirm(`Delete policy "${policy.name}"? This cannot be undone.`);
    if (!ok) return;
    remove(policy.id);
    onClose();
  };

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
        aria-label={`Policy: ${policy.name}`}
        className="fixed inset-y-0 right-0 z-50 w-full sm:w-[520px] lg:w-[580px] bg-card border-l border-border shadow-2xl flex flex-col animate-fade-in"
      >
        {/* Header */}
        <div className="px-5 py-4 border-b border-border">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
                  Policy
                </span>
                <OriginBadge policy={policy} />
                <AttachedBadge isAttached={isAttached} count={totalAttached} />
              </div>
              <h3 className="mt-1.5 text-[16px] font-semibold text-foreground leading-tight">
                {policy.name}
              </h3>
              {policy.summary && (
                <p className="mt-1.5 text-[12.5px] text-muted-foreground leading-relaxed">
                  {policy.summary}
                </p>
              )}
            </div>
            <button
              type="button"
              onClick={onClose}
              className="shrink-0 h-7 w-7 rounded text-muted-foreground hover:text-foreground hover:bg-muted flex items-center justify-center"
              aria-label="Close"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>

          <div className="mt-4 flex items-center gap-2">
            <Button variant="outline" size="sm" className="h-8 text-[12px]" render={
              <Link href={`/app/grc/policies/new?edit=${encodeURIComponent(policy.id)}`}>
                <Pencil className="h-3.5 w-3.5" /> Edit
              </Link>
            } />
            <Button
              variant="outline"
              size="sm"
              onClick={onDelete}
              className="h-8 text-[12px] text-destructive border-destructive/40 hover:bg-destructive/10 hover:text-destructive"
            >
              <Trash2 className="h-3.5 w-3.5" /> Delete
            </Button>
            {policy.updatedAt && (
              <span className="ml-auto text-[11px] text-muted-foreground">
                Updated {new Date(policy.updatedAt).toLocaleDateString()}
              </span>
            )}
          </div>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto">
          {/* Frameworks */}
          <Section title="Frameworks discharged" count={policy.frameworks.length}>
            <div className="flex flex-wrap gap-1.5">
              {policy.frameworks.map(slug => {
                const fw = frameworkBySlug(slug);
                if (!fw) return null;
                return (
                  <Link
                    key={slug}
                    href={`/app/grc/frameworks/${slug}`}
                    onClick={(e) => e.stopPropagation()}
                    className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md border text-[11.5px] font-medium hover:brightness-110 transition"
                    style={{ borderColor: fw.color + '55', color: fw.color, background: fw.color + '12' }}
                  >
                    <span className="h-1.5 w-1.5 rounded-full" style={{ background: fw.color }} />
                    {fw.name}
                  </Link>
                );
              })}
              {policy.frameworks.length === 0 && (
                <span className="text-[12px] text-muted-foreground">None</span>
              )}
            </div>
          </Section>

          {/* Controls */}
          <Section title="Controls in bundle" count={policy.controls.length}>
            <div className="rounded-md border border-border overflow-hidden divide-y divide-border">
              {policy.controls.map(cid => {
                const c = CONTROLS.find(x => x.id === cid);
                if (!c) return null;
                const tone = decisionTone(policy.enforcementOverrides?.[cid] || c.enforcement);
                const overridden = policy.enforcementOverrides?.[cid] && policy.enforcementOverrides[cid] !== c.enforcement;
                return (
                  <Link
                    key={cid}
                    href={`/app/grc/controls#${cid}`}
                    onClick={(e) => e.stopPropagation()}
                    className="block px-3 py-2.5 hover:bg-muted/40 transition-colors"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="h-1.5 w-1.5 rounded-full shrink-0" style={{ background: tone.color }} />
                        <span className="text-[12.5px] font-medium text-foreground truncate">{c.title}</span>
                      </div>
                      <div className="flex items-center gap-1.5 shrink-0">
                        <span className="inline-flex items-center px-1.5 py-0.5 rounded border border-border bg-muted/40 text-[10.5px] font-medium text-foreground">
                          {hookLabel(c.hook)}
                        </span>
                        <span
                          className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded border text-[10.5px] font-medium"
                          style={{ borderColor: tone.color + '55', color: tone.color, background: tone.color + '12' }}
                        >
                          {tone.label}
                          {overridden && <span className="text-[9px] opacity-80">(override)</span>}
                        </span>
                      </div>
                    </div>
                    <div className="mt-0.5 ml-3.5 text-[11px] text-muted-foreground truncate">
                      {c.id}
                    </div>
                  </Link>
                );
              })}
              {policy.controls.length === 0 && (
                <div className="p-4 text-center text-[12.5px] text-muted-foreground">
                  No controls in this bundle.
                </div>
              )}
            </div>
          </Section>

          {/* Attachment summary */}
          <Section title="Attachment" count={totalAttached}>
            <div className="rounded-md border border-border bg-muted/20 p-3 grid grid-cols-3 gap-3">
              <Stat label="Workspace" value={policy.attached?.workspaces || 0} />
              <Stat label="Agents"    value={agentCount} />
              <Stat label="Tools"     value={policy.attached?.tools || 0} />
            </div>
          </Section>

          {/* Attach to agents */}
          <Section title="Attach to agents" count={attachedSet.size} subtitle="Select agents to enforce this policy on every run.">
            <div className="relative mb-2">
              <Input
                value={agentSearch}
                onChange={(e) => setAgentSearch(e.target.value)}
                placeholder="Search agents…"
                className="h-8 text-[12.5px]"
              />
            </div>
            <div className="rounded-md border border-border overflow-hidden divide-y divide-border max-h-[280px] overflow-y-auto">
              {filteredAgents.length === 0 && (
                <div className="p-4 text-center text-[12px] text-muted-foreground">
                  No agents match.
                </div>
              )}
              {filteredAgents.map(a => {
                const isOn = attachedSet.has(a.id);
                return (
                  <button
                    key={a.id}
                    type="button"
                    onClick={() => isOn ? detachAgent(policy.id, a.id) : attachAgent(policy.id, a.id)}
                    className={`w-full flex items-center gap-3 px-3 py-2.5 text-left hover:bg-muted/40 transition-colors ${
                      isOn ? 'bg-(--brand-teal)/5' : ''
                    }`}
                  >
                    <div
                      className={`flex h-4 w-4 items-center justify-center rounded-[3px] border shrink-0 ${
                        isOn
                          ? 'bg-primary border-primary text-primary-foreground'
                          : 'border-input opacity-60'
                      }`}
                    >
                      <Check className={`h-3 w-3 ${isOn ? '' : 'invisible'}`} />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="text-[12.5px] font-medium text-foreground truncate">{a.name}</div>
                      <div className="text-[11px] text-muted-foreground truncate">
                        {a.id}{a.team ? ` · ${a.team}` : ''}{a.environment ? ` · ${a.environment}` : ''}
                      </div>
                    </div>
                    <Link
                      href={`/app/agents/${a.id}`}
                      onClick={(e) => e.stopPropagation()}
                      className="shrink-0 h-6 w-6 rounded text-muted-foreground hover:text-foreground hover:bg-muted/60 flex items-center justify-center"
                      aria-label="Open agent"
                    >
                      <ExternalLink className="h-3.5 w-3.5" />
                    </Link>
                  </button>
                );
              })}
            </div>
            <p className="mt-3 text-[11.5px] text-muted-foreground leading-relaxed">
              Once attached, every run of the selected agent evaluates this policy at the declared hooks. Findings appear in the live evaluations feed and the run trace.
            </p>
          </Section>
        </div>
      </aside>
    </>
  );
}

function Section({ title, subtitle, count, children }) {
  return (
    <section className="px-5 py-4 border-b border-border">
      <div className="mb-2.5 flex items-baseline justify-between gap-2">
        <h4 className="text-[12px] font-semibold text-foreground">{title}</h4>
        {typeof count === 'number' && (
          <span className="text-[11px] font-mono tabular-nums text-muted-foreground">{count}</span>
        )}
      </div>
      {subtitle && <p className="mb-2.5 text-[11.5px] text-muted-foreground">{subtitle}</p>}
      {children}
    </section>
  );
}

function Stat({ label, value }) {
  return (
    <div>
      <div className="text-[10.5px] font-medium text-muted-foreground">{label}</div>
      <div className="mt-0.5 text-[16px] font-semibold tabular-nums text-foreground">{value}</div>
    </div>
  );
}

function OriginBadge({ policy }) {
  const tone =
    policy.origin === 'user'        ? { bg: 'bg-primary/10', fg: 'text-primary',     border: 'border-primary/40',  label: 'Custom' }
  : policy.origin === 'edited-seed' ? { bg: 'bg-accent/10',  fg: 'text-accent',      border: 'border-accent/40',   label: 'Edited' }
  :                                   { bg: 'bg-muted',      fg: 'text-muted-foreground', border: 'border-border', label: 'Seeded' };
  return (
    <span className={`inline-flex items-center px-1.5 py-0.5 rounded-md border text-[10.5px] font-medium ${tone.bg} ${tone.fg} ${tone.border}`}>
      {tone.label}
    </span>
  );
}

function AttachedBadge({ isAttached, count }) {
  if (!isAttached) {
    return (
      <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md border border-border bg-muted text-[10.5px] font-medium text-muted-foreground">
        Unattached
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md border border-(--brand-teal)/40 bg-(--brand-teal)/10 text-[10.5px] font-medium text-brand-teal">
      <span className="h-1.5 w-1.5 rounded-full bg-brand-teal" />
      Attached · {count}
    </span>
  );
}
