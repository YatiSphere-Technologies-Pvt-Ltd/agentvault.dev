'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { FileSearch, Sparkles, Ban, AlertTriangle, ShieldCheck, EyeOff } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { GovernHeader, RuntimeSubNav } from '../../_shared';
import { useDlpRules } from '../../_store';
import { inspect, SAMPLE_PROMPTS } from '../../_dlpEngine';

/* Prompt Inspector — paste anything, see exactly what the gateway would do.
   The DLP engine runs locally in the browser (deterministic regex +
   classifier), so the page works without a server. Users can:

     - Pick a sample or paste their own
     - See highlighted findings with category badges
     - See the post-rule decision (allow / warn / redact / block)
     - See the redacted prompt that would actually be forwarded
     - Toggle individual rules to see how the decision flips */

const DECISION_TONE = {
  allow:  { color: 'var(--brand-teal)',  label: 'Allowed',  icon: ShieldCheck },
  warn:   { color: 'var(--accent)',      label: 'Warned',   icon: AlertTriangle },
  redact: { color: 'var(--accent)',      label: 'Redacted', icon: EyeOff },
  block:  { color: 'var(--destructive)', label: 'Blocked',  icon: Ban },
  log:    { color: 'var(--muted-foreground)', label: 'Logged', icon: ShieldCheck },
};

const CATEGORY_TONE = {
  'credentials':       'var(--destructive)',
  'customer-pii':      'var(--destructive)',
  'financial':         'var(--destructive)',
  'health-phi':        'var(--destructive)',
  'source-code':       'var(--accent)',
  'legal':             'var(--accent)',
  'contracts':         'var(--accent)',
  'business-strategy': 'var(--primary)',
  'prompt-injection':  'var(--destructive)',
  'employee-data':     'var(--primary)',
};

export default function InspectorPage() {
  const allRules = useDlpRules();
  const [text, setText] = useState('');
  // Local copy of which rules are enabled — lets the user experiment without
  // changing real config. Initialized from rules' real enabled state.
  const [localEnabled, setLocalEnabled] = useState(() => {
    const m = {};
    allRules.forEach(r => { m[r.id] = r.enabled !== false; });
    return m;
  });

  // Keep local map in sync as new rules appear, but preserve user toggles.
  useMemo(() => {
    setLocalEnabled(prev => {
      const next = { ...prev };
      allRules.forEach(r => {
        if (!(r.id in next)) next[r.id] = r.enabled !== false;
      });
      return next;
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [allRules.length]);

  const activeRules = useMemo(
    () => allRules.map(r => ({ ...r, enabled: !!localEnabled[r.id] })),
    [allRules, localEnabled],
  );

  const result = useMemo(() => inspect(text, activeRules), [text, activeRules]);

  const useSample = (s) => setText(s.body);

  return (
    <>
      <GovernHeader />
      <RuntimeSubNav />

      <div className="max-w-[1680px] mx-auto px-4 sm:px-6 lg:px-8 py-7 space-y-5">
        <div>
          <div className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground font-mono">Runtime</div>
          <h2 className="text-[16px] font-semibold text-foreground mt-0.5 inline-flex items-center gap-2">
            <FileSearch className="h-4 w-4 text-destructive" /> Prompt Inspector
          </h2>
          <p className="text-[12.5px] text-muted-foreground mt-0.5 max-w-[80ch]">
            Paste a prompt below. The same engine that runs at the AI gateway evaluates it locally —
            findings are highlighted, the gateway's decision is shown, and any redactions are
            applied inline so you see exactly what would be forwarded.
          </p>
        </div>

        {/* Sample chips */}
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="text-[10.5px] font-mono text-muted-foreground mr-1">Try a sample:</span>
          {SAMPLE_PROMPTS.map(s => (
            <button
              key={s.id}
              type="button"
              onClick={() => useSample(s)}
              className="inline-flex items-center gap-1 px-2 py-1 rounded-md border border-border bg-card hover:border-primary/40 hover:bg-primary/[0.03] text-[11.5px] text-foreground transition-colors"
            >
              <Sparkles className="h-3 w-3 text-primary" />
              {s.label}
            </button>
          ))}
          {text && (
            <button
              type="button"
              onClick={() => setText('')}
              className="ml-2 text-[11px] text-muted-foreground hover:text-foreground"
            >
              clear
            </button>
          )}
        </div>

        {/* Two-column body */}
        <div className="grid grid-cols-1 lg:grid-cols-[1.3fr_1fr] gap-5">
          {/* Editor + highlighted view */}
          <section className="space-y-3">
            <div className="rounded-xl border border-border bg-card overflow-hidden">
              <div className="px-4 py-2.5 border-b border-border bg-muted/20 flex items-center justify-between">
                <div className="text-[10.5px] uppercase tracking-[0.16em] font-mono text-muted-foreground">Prompt</div>
                <div className="text-[10.5px] font-mono text-muted-foreground tabular-nums">
                  {text.length.toLocaleString()} chars
                </div>
              </div>
              <textarea
                rows={12}
                value={text}
                onChange={(e) => setText(e.target.value)}
                placeholder="Paste anything — emails, source code, contracts, instructions. The inspector flags sensitive content and shows what the gateway would do."
                className="w-full px-4 py-3 font-mono text-[12.5px] text-foreground bg-background placeholder:text-muted-foreground/60 focus:outline-none resize-none leading-relaxed"
              />
            </div>

            {text && (
              <div className="rounded-xl border border-border bg-card overflow-hidden">
                <div className="px-4 py-2.5 border-b border-border bg-muted/20 flex items-center gap-2">
                  <div className="text-[10.5px] uppercase tracking-[0.16em] font-mono text-muted-foreground">Highlighted findings</div>
                  <span className="text-[10.5px] font-mono text-muted-foreground">
                    · {result.findings.length} finding{result.findings.length === 1 ? '' : 's'}
                  </span>
                </div>
                <div className="px-4 py-3">
                  <HighlightedText text={text} findings={result.findings} />
                </div>
              </div>
            )}

            {text && result.decision !== 'allow' && result.redacted_text !== text && (
              <div className="rounded-xl border border-accent/30 bg-accent/[0.04] overflow-hidden">
                <div className="px-4 py-2.5 border-b border-accent/20 flex items-center gap-2">
                  <EyeOff className="h-3.5 w-3.5 text-accent" />
                  <div className="text-[10.5px] uppercase tracking-[0.16em] font-mono text-accent">Forwarded prompt (post-DLP)</div>
                </div>
                <pre className="px-4 py-3 font-mono text-[12px] text-foreground whitespace-pre-wrap break-words leading-relaxed">
                  {result.redacted_text}
                </pre>
              </div>
            )}
          </section>

          {/* Decision + rules */}
          <aside className="space-y-5">
            <DecisionCard result={result} hasText={!!text.trim()} />

            <div className="rounded-xl border border-border bg-card overflow-hidden">
              <div className="px-4 py-2.5 border-b border-border flex items-center gap-2">
                <div className="text-[10.5px] uppercase tracking-[0.16em] font-mono text-muted-foreground">Rules in this scan</div>
                <span className="text-[10.5px] font-mono text-muted-foreground ml-auto">
                  toggle to experiment
                </span>
              </div>
              <ul className="divide-y divide-border/60">
                {activeRules.map(r => {
                  const fired = result.rules_fired.some(f => f.rule_id === r.id);
                  return (
                    <li key={r.id} className={`px-3 py-2 flex items-center gap-2 ${fired ? 'bg-destructive/[0.03]' : ''}`}>
                      <input
                        type="checkbox"
                        checked={r.enabled}
                        onChange={(e) => setLocalEnabled(prev => ({ ...prev, [r.id]: e.target.checked }))}
                        className="h-3.5 w-3.5 accent-primary cursor-pointer shrink-0"
                      />
                      <Link
                        href={`/app/govern/runtime/dlp/${r.id}`}
                        className="flex-1 min-w-0 hover:underline"
                      >
                        <div className={`text-[12px] font-medium truncate ${!r.enabled ? 'text-muted-foreground line-through' : 'text-foreground'}`}>
                          {r.name}
                        </div>
                        <div className="text-[10px] font-mono text-muted-foreground truncate">
                          {r.action} · {(Array.isArray(r.match) ? r.match : [r.match]).join(', ')}
                        </div>
                      </Link>
                      {fired && (
                        <span className="text-[9.5px] font-mono uppercase tracking-[0.12em] px-1.5 py-0.5 rounded border border-destructive/40 bg-destructive/10 text-destructive shrink-0">
                          fired
                        </span>
                      )}
                    </li>
                  );
                })}
              </ul>
              <div className="px-4 py-2.5 border-t border-border text-[11px] text-muted-foreground">
                Manage rules → <Link href="/app/govern/runtime/dlp" className="text-primary hover:underline">DLP rules</Link>
              </div>
            </div>
          </aside>
        </div>
      </div>
    </>
  );
}

/* ─── components ─── */

function DecisionCard({ result, hasText }) {
  const tone = DECISION_TONE[result.decision] || DECISION_TONE.allow;
  const Icon = tone.icon;
  return (
    <div
      className="rounded-xl border-2 overflow-hidden"
      style={{
        borderColor: `color-mix(in oklab, ${tone.color} 50%, transparent)`,
        background: `color-mix(in oklab, ${tone.color} 5%, transparent)`,
      }}
    >
      <div className="px-4 py-3 flex items-center gap-3">
        <div
          className="h-10 w-10 rounded-md flex items-center justify-center shrink-0"
          style={{
            background: `color-mix(in oklab, ${tone.color} 15%, transparent)`,
            color: tone.color,
          }}
        >
          <Icon className="h-5 w-5" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="text-[10.5px] uppercase tracking-[0.14em] font-mono text-muted-foreground">Gateway decision</div>
          <div className="text-[20px] font-semibold leading-tight" style={{ color: tone.color }}>
            {hasText ? tone.label : 'Standing by'}
          </div>
        </div>
      </div>
      <div className="px-4 py-3 border-t" style={{ borderColor: `color-mix(in oklab, ${tone.color} 25%, transparent)` }}>
        <div className="text-[12px] text-foreground/85 leading-relaxed">
          {hasText ? result.reasoning : 'Paste a prompt to see the decision.'}
        </div>
        {hasText && result.findings.length > 0 && (
          <div className="mt-2 flex flex-wrap gap-1">
            {[...new Set(result.findings.map(f => f.category))].map(c => (
              <CategoryChip key={c} category={c} count={result.findings.filter(f => f.category === c).length} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function CategoryChip({ category, count }) {
  const color = CATEGORY_TONE[category] || 'var(--muted-foreground)';
  return (
    <span
      className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded border text-[10px] font-mono"
      style={{
        borderColor: `color-mix(in oklab, ${color} 40%, transparent)`,
        background: `color-mix(in oklab, ${color} 10%, transparent)`,
        color,
      }}
    >
      {category}
      <span className="opacity-70">{count}</span>
    </span>
  );
}

function HighlightedText({ text, findings }) {
  // Build a list of [start, end, finding] segments, then walk through the
  // text emitting plain text and highlighted spans in order.
  const sorted = findings
    .filter(f => !f.wholeText)  // skip the code-block all-text marker; we render that differently
    .sort((a, b) => a.start - b.start);

  // Coalesce overlapping ranges into the earliest/widest one (prefer the
  // first one when in conflict).
  const ranges = [];
  for (const f of sorted) {
    const last = ranges[ranges.length - 1];
    if (last && f.start < last.end) continue;
    ranges.push({ start: f.start, end: f.end, finding: f });
  }

  const wholeTextFlag = findings.find(f => f.wholeText);
  if (wholeTextFlag && ranges.length === 0) {
    // Whole input flagged as code — render it inside a single block.
    return (
      <div className="rounded border border-accent/40 bg-accent/[0.04] px-3 py-2">
        <div className="flex items-center gap-2 mb-1.5">
          <span className="text-[9.5px] font-mono uppercase tracking-[0.12em] text-accent">{wholeTextFlag.label}</span>
          <span className="text-[10px] font-mono text-muted-foreground">confidence {wholeTextFlag.confidence.toFixed(2)}</span>
        </div>
        <pre className="text-[12px] font-mono text-foreground whitespace-pre-wrap break-words leading-relaxed">{text}</pre>
      </div>
    );
  }

  const out = [];
  let cur = 0;
  for (const r of ranges) {
    if (r.start > cur) {
      out.push(<span key={`t-${cur}`}>{text.slice(cur, r.start)}</span>);
    }
    out.push(<Span key={`h-${r.start}`} finding={r.finding} text={text.slice(r.start, r.end)} />);
    cur = r.end;
  }
  if (cur < text.length) {
    out.push(<span key={`t-${cur}`}>{text.slice(cur)}</span>);
  }

  return (
    <pre className="text-[12.5px] font-mono text-foreground whitespace-pre-wrap break-words leading-relaxed">
      {out}
    </pre>
  );
}

function Span({ finding, text }) {
  const color = CATEGORY_TONE[finding.category] || 'var(--muted-foreground)';
  return (
    <span
      className="inline px-0.5 rounded border"
      style={{
        borderColor: `color-mix(in oklab, ${color} 50%, transparent)`,
        background: `color-mix(in oklab, ${color} 16%, transparent)`,
        color,
      }}
      title={`${finding.label} · confidence ${finding.confidence.toFixed(2)}`}
    >
      {text}
    </span>
  );
}
