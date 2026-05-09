'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';
import { Search, ShieldCheck, Plus, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  CONTROLS, MAPPINGS, frameworkBySlug, decisionTone, hookLabel,
} from '../../grc/_data';
import { usePolicies, effectiveAttachedTools } from '../../grc/_policyStore';

/* PoliciesTab
   ───────────
   The load-bearing GRC × Tools surface. Two sub-sections:

   1. **Tool-relevant controls** — every GRC control whose `inputs[]` declares
      it acts on tools (`tool.name`, `tool.risk`, `tool.args`, etc.). These are
      the controls a runtime would consult for *this* tool. Read-only summary;
      full management lives on the controls page.

   2. **Attached policy bundles** — policies the operator has bound to this
      tool. Each bundle ships with controls that fire at runtime. Includes
      an "Attach a bundle" picker and detach action, persisted via the policy
      store's attachTool/detachTool methods. */

const TOOL_INPUT_TOKENS = ['tool', 'tool.name', 'tool.risk', 'tool.args', 'tool.result', 'agent.manifest'];

function isToolRelevant(control) {
  const inputs = control.inputs || [];
  return inputs.some(i => TOOL_INPUT_TOKENS.some(t => i.startsWith(t)));
}

export default function PoliciesTab({ tool }) {
  const { list: policies, attachTool, detachTool } = usePolicies();
  const [pickerOpen, setPickerOpen] = useState(false);

  // Controls that act on tools
  const relevantControls = useMemo(
    () => CONTROLS.filter(isToolRelevant),
    [],
  );

  // Policies attached to this tool
  const attachedPolicies = useMemo(
    () => policies.filter(p => effectiveAttachedTools(p).includes(tool.id)),
    [policies, tool.id],
  );

  // All policies the user could attach
  const availablePolicies = useMemo(
    () => policies.filter(p => !effectiveAttachedTools(p).includes(tool.id)),
    [policies, tool.id],
  );

  return (
    <div className="space-y-5">
      {/* Attached bundles */}
      <Section
        title="Attached policy bundles"
        subtitle="Policies whose controls evaluate every call to this tool. Each bundle is a curated set of GRC controls."
        action={
          <Button size="sm" onClick={() => setPickerOpen(true)} disabled={availablePolicies.length === 0}>
            <Plus className="h-3.5 w-3.5" /> Attach bundle
          </Button>
        }
      >
        {attachedPolicies.length === 0 ? (
          <div className="rounded-xl border border-dashed border-border bg-muted/20 p-6 text-center">
            <ShieldCheck className="h-5 w-5 text-muted-foreground/70 mx-auto" />
            <div className="mt-2 text-[13px] font-medium text-foreground">No bundles attached</div>
            <p className="mt-1 text-[12px] text-muted-foreground max-w-100 mx-auto">
              Attach a GRC policy to enforce its controls on every call to this tool. Without a bundle, only workspace-level defaults apply.
            </p>
            {availablePolicies.length > 0 && (
              <Button size="sm" className="mt-3" onClick={() => setPickerOpen(true)}>
                <Plus className="h-3.5 w-3.5" /> Attach bundle
              </Button>
            )}
          </div>
        ) : (
          <div className="rounded-xl border border-border bg-card overflow-hidden divide-y divide-border">
            {attachedPolicies.map(p => (
              <AttachedPolicyRow
                key={p.id}
                policy={p}
                onDetach={() => detachTool(p.id, tool.id)}
              />
            ))}
          </div>
        )}
      </Section>

      {/* Tool-relevant controls */}
      <Section
        title="Controls that act on tools"
        subtitle="GRC controls whose runtime hooks consult tool metadata. Bound through policy bundles, not directly."
      >
        <div className="rounded-xl border border-border bg-card overflow-hidden divide-y divide-border">
          {relevantControls.map(c => {
            const tone = decisionTone(c.enforcement);
            const fwSlugs = Array.from(new Set((MAPPINGS[c.id] || []).map(([f]) => f)));
            return (
              <Link
                key={c.id}
                href={`/app/grc/controls#${c.id}`}
                className="block px-4 py-3 hover:bg-muted/40 transition-colors"
              >
                <div className="flex items-start justify-between gap-3 flex-wrap">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-[13px] font-medium text-foreground">{c.title}</span>
                      <span
                        className="inline-flex items-center px-1.5 py-0.5 rounded border text-[10px] font-medium"
                        style={{ borderColor: tone.color + '55', color: tone.color, background: tone.color + '12' }}
                      >
                        {tone.label}
                      </span>
                      <span className="inline-flex items-center px-1.5 py-0.5 rounded border border-border bg-muted/40 text-[10px] font-medium text-foreground">
                        {hookLabel(c.hook)}
                      </span>
                    </div>
                    <div className="mt-0.5 text-[11.5px] font-mono text-muted-foreground">{c.id}</div>
                    <p className="mt-1 text-[11.5px] text-muted-foreground leading-relaxed line-clamp-2 max-w-200">{c.summary}</p>
                  </div>
                  <div className="flex flex-wrap gap-1 max-w-xs">
                    {fwSlugs.slice(0, 4).map(slug => {
                      const fw = frameworkBySlug(slug);
                      if (!fw) return null;
                      return (
                        <span
                          key={slug}
                          className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded border text-[10px] font-medium"
                          style={{ borderColor: fw.color + '55', color: fw.color, background: fw.color + '12' }}
                        >
                          {fw.name.split(' ').slice(0, 2).join(' ')}
                        </span>
                      );
                    })}
                    {fwSlugs.length > 4 && (
                      <span className="inline-flex items-center px-1.5 py-0.5 rounded border border-border bg-muted/40 text-[10px] font-medium text-muted-foreground">
                        +{fwSlugs.length - 4}
                      </span>
                    )}
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      </Section>

      <AttachPolicyPicker
        open={pickerOpen}
        onClose={() => setPickerOpen(false)}
        availablePolicies={availablePolicies}
        onAttach={(policyId) => {
          attachTool(policyId, tool.id);
          setPickerOpen(false);
        }}
      />
    </div>
  );
}

/* ── Attached row ── */

function AttachedPolicyRow({ policy, onDetach }) {
  return (
    <div className="px-4 py-3 flex items-start justify-between gap-3 flex-wrap">
      <div className="min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <Link
            href={`/app/grc/policies#${policy.id}`}
            className="text-[13px] font-semibold text-foreground hover:text-primary"
          >
            {policy.name}
          </Link>
          <span className="inline-flex items-center px-1.5 py-0.5 rounded border border-border bg-muted/40 text-[10px] font-medium text-foreground">
            {policy.controls?.length || 0} ctrls
          </span>
        </div>
        <p className="mt-1 text-[11.5px] text-muted-foreground line-clamp-2 max-w-200">{policy.summary}</p>
        <div className="mt-2 flex flex-wrap gap-1.5">
          {(policy.frameworks || []).slice(0, 4).map(slug => {
            const fw = frameworkBySlug(slug);
            if (!fw) return null;
            return (
              <span
                key={slug}
                className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded border text-[10px] font-medium"
                style={{ borderColor: fw.color + '55', color: fw.color, background: fw.color + '12' }}
              >
                {fw.name.split(' ').slice(0, 2).join(' ')}
              </span>
            );
          })}
        </div>
      </div>
      <Button
        size="sm"
        variant="outline"
        className="h-8 text-[12px] text-destructive border-destructive/40 hover:bg-destructive/10 hover:text-destructive"
        onClick={onDetach}
      >
        Detach
      </Button>
    </div>
  );
}

/* ── Attach policy picker ── */

function AttachPolicyPicker({ open, onClose, availablePolicies, onAttach }) {
  const [query, setQuery] = useState('');

  if (!open) return null;

  const filtered = availablePolicies.filter(p =>
    !query.trim() ||
    `${p.name} ${p.summary || ''}`.toLowerCase().includes(query.trim().toLowerCase()),
  );

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
        aria-label="Attach policy bundle"
        className="fixed inset-y-0 right-0 z-50 w-full sm:w-[480px] lg:w-[540px] bg-card border-l border-border shadow-2xl flex flex-col animate-fade-in"
      >
        <div className="px-5 py-4 border-b border-border">
          <div className="flex items-start justify-between gap-3">
            <div>
              <span className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
                Attach policy bundle
              </span>
              <h3 className="mt-1.5 text-[16px] font-semibold text-foreground">Choose a policy</h3>
              <p className="mt-1 text-[12px] text-muted-foreground">Bundle controls fire on every call to this tool.</p>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="shrink-0 h-7 w-7 rounded text-muted-foreground hover:text-foreground hover:bg-muted/50 flex items-center justify-center"
              aria-label="Close"
            >
              <span className="text-lg leading-none">×</span>
            </button>
          </div>

          <div className="mt-3 relative">
            <Search className="h-3.5 w-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search policies…"
              className="pl-8 h-8 text-[12.5px]"
            />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto">
          {filtered.length === 0 ? (
            <div className="p-8 text-center text-[12.5px] text-muted-foreground">
              {availablePolicies.length === 0
                ? 'Every policy is already attached to this tool.'
                : 'No policies match.'}
            </div>
          ) : (
            <ul className="divide-y divide-border">
              {filtered.map(p => (
                <li key={p.id}>
                  <button
                    type="button"
                    onClick={() => onAttach(p.id)}
                    className="w-full text-left px-5 py-3 hover:bg-muted/40 transition-colors"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <div className="text-[13px] font-medium text-foreground">{p.name}</div>
                        <p className="mt-0.5 text-[11.5px] text-muted-foreground line-clamp-2">{p.summary}</p>
                        <div className="mt-1.5 flex flex-wrap gap-1">
                          {(p.frameworks || []).slice(0, 4).map(slug => {
                            const fw = frameworkBySlug(slug);
                            if (!fw) return null;
                            return (
                              <span
                                key={slug}
                                className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded border text-[10px] font-medium"
                                style={{ borderColor: fw.color + '55', color: fw.color, background: fw.color + '12' }}
                              >
                                {fw.name.split(' ').slice(0, 2).join(' ')}
                              </span>
                            );
                          })}
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

function Section({ title, subtitle, action, children }) {
  return (
    <section>
      <div className="mb-3 flex items-end justify-between gap-3 flex-wrap">
        <div>
          <h3 className="text-[14px] font-semibold text-foreground">{title}</h3>
          {subtitle && <p className="mt-0.5 text-[12px] text-muted-foreground max-w-200">{subtitle}</p>}
        </div>
        {action}
      </div>
      {children}
    </section>
  );
}
