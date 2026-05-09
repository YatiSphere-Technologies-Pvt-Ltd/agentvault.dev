'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  CONTROLS,
  FRAMEWORKS,
  frameworkBySlug,
  decisionTone,
  hookLabel,
  frameworksFor,
} from '../../_data';
import { extractPolicyDraft, EXAMPLE_PROMPTS } from '../../_extractPolicyDraft';
import { usePolicies, readPolicyById } from '../../_policyStore';
import GrcHeader from '../../_GrcHeader';

const EMPTY_DRAFT = {
  name: '',
  summary: '',
  frameworks: [],
  controls: [],
  suggestions: {},
  enforcementOverrides: {},
  attached: { workspaces: 0, agents: 0, tools: 0 },
};

export default function NewPolicyPage() {
  const router = useRouter();
  const search = useSearchParams();
  const editId = search.get('edit');

  const { create, update } = usePolicies();

  const [tab, setTab] = useState('describe'); // 'describe' | 'build'
  const [prompt, setPrompt] = useState('');
  const [draft, setDraft] = useState(EMPTY_DRAFT);
  const [extracting, setExtracting] = useState(false);
  const [extractedOnce, setExtractedOnce] = useState(false);
  const [errors, setErrors] = useState([]);

  // Edit-mode bootstrap
  useEffect(() => {
    if (!editId) return;
    const existing = readPolicyById(editId);
    if (!existing) return;
    setDraft({
      ...EMPTY_DRAFT,
      ...existing,
      suggestions: {},
      enforcementOverrides: existing.enforcementOverrides || {},
    });
    setTab('build');
  }, [editId]);

  const onExtract = async () => {
    if (!prompt.trim()) return;
    setExtracting(true);
    try {
      const next = await extractPolicyDraft(prompt);
      setDraft({
        ...EMPTY_DRAFT,
        ...next,
        attached: next.attached || EMPTY_DRAFT.attached,
      });
      setExtractedOnce(true);
      setTab('build');
    } finally {
      setExtracting(false);
    }
  };

  const onSeedExample = (p) => {
    setPrompt(p.body);
  };

  const validate = () => {
    const errs = [];
    if (!draft.name.trim()) errs.push('Name is required.');
    if (draft.controls.length === 0) errs.push('Pick at least one control.');
    if (draft.frameworks.length === 0) errs.push('Pick at least one framework.');
    return errs;
  };

  const onSave = () => {
    const errs = validate();
    setErrors(errs);
    if (errs.length > 0) return;

    const payload = {
      name: draft.name.trim(),
      summary: draft.summary.trim(),
      frameworks: draft.frameworks,
      controls: draft.controls,
      enforcementOverrides: draft.enforcementOverrides,
      attached: draft.attached,
    };

    if (editId) {
      update(editId, payload);
      router.push(`/app/grc/policies#${editId}`);
    } else {
      const created = create(payload);
      router.push(`/app/grc/policies#${created.id}`);
    }
  };

  return (
    <>
      <GrcHeader />
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-10 py-6">
        <Link href="/app/grc/policies" className="text-[11.5px] text-muted-foreground hover:text-foreground inline-flex items-center gap-1">
          <svg width="11" height="11" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 5l-5 5 5 5"/></svg>
          All policies
        </Link>

        <div className="mt-3 flex items-end justify-between gap-4 flex-wrap">
          <div>
            <h2 className="text-[22px] font-semibold tracking-tight text-foreground">
              {editId ? 'Edit policy' : 'New policy'}
            </h2>
            <p className="mt-1 text-[13px] text-muted-foreground max-w-150">
              Describe the policy in your own words and let AgentVault draft the structured form, or build it directly.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Link
              href="/app/grc/policies"
              className="text-[12.5px] px-3 py-1.5 rounded-md border border-border hover:bg-muted transition-colors"
            >
              Cancel
            </Link>
            <button
              type="button"
              onClick={onSave}
              className="text-[12.5px] px-4 py-1.5 rounded-md bg-primary text-primary-foreground hover:brightness-110 font-medium"
            >
              {editId ? 'Save changes' : 'Create policy'}
            </button>
          </div>
        </div>

        {/* Tabs */}
        <div className="mt-5 border-b border-border flex items-center gap-1">
          <TabButton active={tab === 'describe'} onClick={() => setTab('describe')}>
            <span className="inline-flex items-center gap-2">
              <Sparkle /> Describe
            </span>
          </TabButton>
          <TabButton active={tab === 'build'} onClick={() => setTab('build')}>
            Build
          </TabButton>
        </div>

        {errors.length > 0 && (
          <div className="mt-4 border border-destructive/40 bg-destructive/5 rounded-md px-4 py-3 text-[12.5px] text-destructive">
            <div className="font-medium">Fix the following before saving:</div>
            <ul className="mt-1 list-disc list-inside">
              {errors.map((e, i) => <li key={i}>{e}</li>)}
            </ul>
          </div>
        )}

        {tab === 'describe' ? (
          <DescribeTab
            prompt={prompt}
            onPrompt={setPrompt}
            onExtract={onExtract}
            extracting={extracting}
            extractedOnce={extractedOnce}
            onSeedExample={onSeedExample}
          />
        ) : (
          <BuildTab draft={draft} onChange={setDraft} />
        )}
      </div>
    </>
  );
}

function TabButton({ active, onClick, children }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`px-3 py-2 text-[12.5px] -mb-px border-b-2 transition-colors ${
        active
          ? 'border-primary text-foreground font-medium'
          : 'border-transparent text-muted-foreground hover:text-foreground'
      }`}
    >
      {children}
    </button>
  );
}

function Sparkle() {
  return (
    <svg width="13" height="13" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
      <path d="M10 2v4M10 14v4M2 10h4M14 10h4M5 5l2.5 2.5M12.5 12.5L15 15M5 15l2.5-2.5M12.5 7.5L15 5"/>
    </svg>
  );
}

/* ───────────────────── Describe tab ───────────────────── */

function DescribeTab({ prompt, onPrompt, onExtract, extracting, extractedOnce, onSeedExample }) {
  const wordCount = prompt.trim() === '' ? 0 : prompt.trim().split(/\s+/).length;

  return (
    <div className="mt-5 grid grid-cols-1 lg:grid-cols-[1.6fr_1fr] gap-6">
      <div className="bg-panel border border-border rounded-xl p-4">
        <label className="block text-[10.5px] uppercase tracking-[0.15em] font-mono text-muted-foreground">
          Describe the policy in plain language
        </label>
        <textarea
          value={prompt}
          onChange={e => onPrompt(e.target.value)}
          placeholder="e.g. Block any agent from sending external emails outside our domain unless a manager approves it. Log everything for audit. Apply to every agent in the workspace."
          className="mt-2 w-full min-h-[220px] bg-hero-bg border border-border rounded-md px-3 py-2.5 text-[13px] leading-relaxed focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/15 resize-y"
        />
        <div className="mt-2 flex items-center justify-between text-[10.5px] font-mono text-muted-foreground">
          <span>{wordCount} word{wordCount === 1 ? '' : 's'}</span>
          <span>AgentVault will draft a structured policy from your text. You'll review and edit before saving.</span>
        </div>
        <div className="mt-3 flex items-center gap-2">
          <button
            type="button"
            disabled={!prompt.trim() || extracting}
            onClick={onExtract}
            className="inline-flex items-center gap-2 text-[12.5px] px-4 py-2 rounded-md bg-primary text-primary-foreground hover:brightness-110 font-medium disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Sparkle />
            {extracting
              ? 'Extracting…'
              : extractedOnce
                ? 'Re-extract'
                : 'Draft policy with AI'}
          </button>
          <button
            type="button"
            onClick={() => onPrompt('')}
            disabled={!prompt}
            className="text-[12.5px] px-3 py-2 rounded-md border border-border hover:bg-muted transition-colors disabled:opacity-50"
          >
            Clear
          </button>
        </div>
      </div>

      <aside>
        <div className="text-[10.5px] uppercase tracking-[0.15em] text-muted-foreground font-mono mb-2">
          Try an example
        </div>
        <div className="space-y-2">
          {EXAMPLE_PROMPTS.map(p => (
            <button
              key={p.title}
              type="button"
              onClick={() => onSeedExample(p)}
              className="w-full text-left bg-panel border border-border rounded-lg p-3 hover:border-primary/40 transition-colors"
            >
              <div className="text-[12.5px] font-medium text-foreground">{p.title}</div>
              <div className="mt-1 text-[11.5px] text-muted-foreground line-clamp-3 leading-relaxed">{p.body}</div>
            </button>
          ))}
        </div>
        <div className="mt-4 p-3 rounded-lg border border-border bg-muted/30 text-[11.5px] text-muted-foreground leading-relaxed">
          <span className="font-medium text-foreground">How it works.</span>{' '}
          The extractor picks controls from your existing library and infers frameworks they discharge. Anything you don't agree with is editable in the Build tab before saving — nothing is committed automatically.
        </div>
      </aside>
    </div>
  );
}

/* ───────────────────── Build tab ───────────────────── */

function BuildTab({ draft, onChange }) {
  const set = (patch) => onChange({ ...draft, ...patch });

  const toggleControl = (cid) => {
    const has = draft.controls.includes(cid);
    set({
      controls: has ? draft.controls.filter(x => x !== cid) : [...draft.controls, cid],
    });
  };

  const toggleFramework = (slug) => {
    const has = draft.frameworks.includes(slug);
    set({
      frameworks: has ? draft.frameworks.filter(x => x !== slug) : [...draft.frameworks, slug],
    });
  };

  const setOverride = (cid, mode) => {
    const next = { ...(draft.enforcementOverrides || {}) };
    if (mode === 'default') delete next[cid];
    else next[cid] = mode;
    set({ enforcementOverrides: next });
  };

  // Inferred frameworks from selected controls — surfaces "you might want these too"
  const inferred = useMemo(() => {
    const set = new Set();
    for (const cid of draft.controls) {
      for (const fw of frameworksFor(cid)) set.add(fw.slug);
    }
    for (const s of draft.frameworks) set.delete(s);
    return Array.from(set);
  }, [draft.controls, draft.frameworks]);

  return (
    <div className="mt-5 grid grid-cols-1 lg:grid-cols-[1.6fr_1fr] gap-6">
      <div className="space-y-5">
        {/* Identity */}
        <section className="bg-panel border border-border rounded-xl p-4">
          <div className="text-[10.5px] uppercase tracking-[0.15em] font-mono text-muted-foreground mb-3">Identity</div>
          <label className="block text-[11.5px] text-muted-foreground mb-1">Policy name</label>
          <input
            value={draft.name}
            onChange={e => set({ name: e.target.value })}
            placeholder="e.g. External email gate"
            className="w-full bg-hero-bg border border-border rounded-md px-3 py-2 text-[13px] focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/15"
          />
          <label className="block text-[11.5px] text-muted-foreground mt-3 mb-1">Summary</label>
          <textarea
            value={draft.summary}
            onChange={e => set({ summary: e.target.value })}
            placeholder="One paragraph describing the policy and its intent."
            className="w-full min-h-[80px] bg-hero-bg border border-border rounded-md px-3 py-2 text-[13px] focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/15 resize-y"
          />
        </section>

        {/* Controls */}
        <section className="bg-panel border border-border rounded-xl p-4">
          <div className="flex items-center justify-between mb-3">
            <div className="text-[10.5px] uppercase tracking-[0.15em] font-mono text-muted-foreground">
              Controls in bundle
            </div>
            <span className="text-[10.5px] font-mono text-muted-foreground">{draft.controls.length} selected</span>
          </div>

          <div className="border border-border rounded-lg divide-y divide-border max-h-[480px] overflow-y-auto">
            {CONTROLS.map(c => {
              const checked = draft.controls.includes(c.id);
              const suggestion = draft.suggestions?.[c.id];
              const tone = decisionTone(draft.enforcementOverrides?.[c.id] || c.enforcement);
              return (
                <label
                  key={c.id}
                  className={`flex items-start gap-3 px-3 py-3 cursor-pointer transition-colors ${
                    checked ? 'bg-primary/5' : 'hover:bg-muted/40'
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={checked}
                    onChange={() => toggleControl(c.id)}
                    className="mt-1 h-3.5 w-3.5 accent-primary cursor-pointer"
                  />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-[12.5px] font-medium text-foreground">{c.title}</span>
                      <span
                        className="text-[9.5px] font-mono px-1.5 py-0.5 rounded border"
                        style={{ borderColor: tone.color + '55', color: tone.color, background: tone.color + '10' }}
                      >
                        {tone.label}
                      </span>
                      <span className="text-[9.5px] font-mono px-1.5 py-0.5 rounded border border-border text-muted-foreground">
                        {hookLabel(c.hook)}
                      </span>
                      {suggestion && (
                        <span className="text-[9.5px] font-mono px-1.5 py-0.5 rounded bg-primary/10 text-primary border border-primary/30">
                          AI · score {suggestion.score}
                        </span>
                      )}
                    </div>
                    <div className="mt-0.5 text-[10.5px] font-mono text-muted-foreground">{c.id}</div>
                    <p className="mt-1 text-[11.5px] text-muted-foreground leading-relaxed">{c.summary}</p>
                    {suggestion && suggestion.reasons.length > 0 && (
                      <p className="mt-1 text-[10.5px] text-primary/80 italic">
                        Matched: {suggestion.reasons.slice(0, 3).join(', ')}
                      </p>
                    )}
                    {checked && (
                      <div className="mt-2 flex items-center gap-2 flex-wrap">
                        <span className="text-[10px] font-mono text-muted-foreground">Enforcement:</span>
                        <select
                          value={draft.enforcementOverrides?.[c.id] || 'default'}
                          onClick={e => e.stopPropagation()}
                          onChange={e => setOverride(c.id, e.target.value)}
                          className="text-[10.5px] bg-hero-bg border border-border rounded px-1.5 py-0.5 focus:outline-none focus:border-primary"
                        >
                          <option value="default">Default ({decisionTone(c.enforcement).label})</option>
                          <option value="block">Block</option>
                          <option value="require_approval">Approval</option>
                          <option value="redact">Redact</option>
                          <option value="warn">Warn</option>
                          <option value="log">Log</option>
                        </select>
                      </div>
                    )}
                  </div>
                </label>
              );
            })}
          </div>
        </section>
      </div>

      <aside className="space-y-5">
        {/* Frameworks */}
        <section className="bg-panel border border-border rounded-xl p-4">
          <div className="text-[10.5px] uppercase tracking-[0.15em] font-mono text-muted-foreground mb-3">
            Frameworks discharged
          </div>
          <div className="space-y-1">
            {FRAMEWORKS.map(fw => {
              const checked = draft.frameworks.includes(fw.slug);
              return (
                <label
                  key={fw.slug}
                  className={`flex items-center gap-2 px-2 py-1.5 rounded cursor-pointer transition-colors ${
                    checked ? 'bg-primary/5' : 'hover:bg-muted/40'
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={checked}
                    onChange={() => toggleFramework(fw.slug)}
                    className="h-3.5 w-3.5 accent-primary cursor-pointer"
                  />
                  <span className="h-2 w-2 rounded-full shrink-0" style={{ background: fw.color }} />
                  <span className="text-[12px] text-foreground truncate">{fw.name}</span>
                </label>
              );
            })}
          </div>

          {inferred.length > 0 && (
            <div className="mt-3 pt-3 border-t border-border">
              <div className="text-[10.5px] font-mono text-muted-foreground mb-1.5">
                Implied by selected controls
              </div>
              <div className="flex flex-wrap gap-1">
                {inferred.map(slug => {
                  const fw = frameworkBySlug(slug);
                  if (!fw) return null;
                  return (
                    <button
                      key={slug}
                      type="button"
                      onClick={() => toggleFramework(slug)}
                      className="text-[9.5px] font-mono px-1.5 py-0.5 rounded border hover:brightness-110"
                      style={{ borderColor: fw.color + '55', color: fw.color, background: fw.color + '10' }}
                    >
                      + {fw.name.split(' ')[0]}
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </section>

        {/* Attachment */}
        <section className="bg-panel border border-border rounded-xl p-4">
          <div className="text-[10.5px] uppercase tracking-[0.15em] font-mono text-muted-foreground mb-3">
            Attachment scope
          </div>
          <p className="text-[11.5px] text-muted-foreground leading-relaxed">
            How many places this policy is attached to. Detailed per-agent attachment is configured from the policy detail view after saving.
          </p>
          <div className="mt-3 grid grid-cols-3 gap-2">
            <NumberField
              label="Workspaces"
              value={draft.attached.workspaces}
              onChange={v => set({ attached: { ...draft.attached, workspaces: v } })}
            />
            <NumberField
              label="Agents"
              value={draft.attached.agents}
              onChange={v => set({ attached: { ...draft.attached, agents: v } })}
            />
            <NumberField
              label="Tools"
              value={draft.attached.tools}
              onChange={v => set({ attached: { ...draft.attached, tools: v } })}
            />
          </div>
        </section>
      </aside>
    </div>
  );
}

function NumberField({ label, value, onChange }) {
  return (
    <label className="block">
      <div className="text-[10px] font-mono text-muted-foreground mb-1">{label}</div>
      <input
        type="number"
        min={0}
        value={value}
        onChange={e => onChange(Math.max(0, Number(e.target.value) || 0))}
        className="w-full bg-hero-bg border border-border rounded-md px-2 py-1 text-[12.5px] tabular-nums focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/15"
      />
    </label>
  );
}
