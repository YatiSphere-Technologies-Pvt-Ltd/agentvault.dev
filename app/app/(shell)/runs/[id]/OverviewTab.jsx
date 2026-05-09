'use client';

import Link from 'next/link';
import { useMemo } from 'react';
import {
  User, Bot, Wrench, Database, Shield, Cpu, ArrowRight, ChevronRight,
  CheckCircle2, AlertTriangle, XCircle, MinusCircle,
} from 'lucide-react';
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from '@/components/ui/tooltip';
import { KIND_META } from '../_traces';
import { fmtMs } from './_replay';

/* OverviewTab
   -----------
   The agentic + compliance "story" of the run, top to bottom:
     1. Input prompt + final output (the question and the answer)
     2. Phase timeline (Plan → Retrieve → Tools → Guardrail → Summarize)
     3. Tools used (real list, with risk + success/error)
     4. Knowledge sources used (with retrieved chunk count + recall)
     5. Findings + gate roll-up (links to the Compliance tab)

   Everything here is derived from the existing trace structure — no new
   data shape needed. */

export default function OverviewTab({ trace, gates, onJumpToTab }) {
  const root = trace.spans.find(s => s.parentId === null);
  const userPrompt = root?.input?.user_message || '—';
  const finalSpan  = trace.spans.find(s => s.id === 'sp_summarize') || trace.spans[trace.spans.length - 1];
  const finalAnswer = finalSpan?.output?.text || '—';

  const phases = useMemo(() => buildPhases(trace.spans), [trace.spans]);
  const toolSpans = trace.spans.filter(s => s.kind === 'tool');
  const retrievalSpans = trace.spans.filter(s => s.kind === 'retrieval');
  const guardrailSpans = trace.spans.filter(s => s.kind === 'guardrail');

  // Compliance roll-up
  const counts = gates.reduce((acc, g) => { acc[g.decision] = (acc[g.decision] || 0) + 1; return acc; }, {});
  const blocked   = counts.block || 0;
  const approvals = counts.require_approval || 0;
  const warnings  = (counts.warn || 0) + (counts.redact || 0);
  const overall = blocked > 0 ? 'blocked'
                : approvals > 0 ? 'approval'
                : warnings > 0  ? 'warning'
                : 'clear';

  return (
    <div className="space-y-5">
      {/* Conversation card — the question and the answer */}
      <div className="rounded-xl border border-border bg-card overflow-hidden">
        <div className="grid grid-cols-1 md:grid-cols-2 divide-y md:divide-y-0 md:divide-x divide-border">
          <ConversationPanel
            icon={<User className="h-4 w-4" />}
            label="User"
            tone="muted"
            body={userPrompt}
            meta={`Started ${new Date(trace.startedAt).toLocaleTimeString()}`}
          />
          <ConversationPanel
            icon={<Bot className="h-4 w-4 text-primary" />}
            label={trace.agentName}
            tone="primary"
            body={finalAnswer}
            meta={`Finished after ${fmtMs(trace.totalDurMs)} · ${trace.totalTokens.toLocaleString()} tokens · $${trace.totalCostUSD.toFixed(4)}`}
          />
        </div>
      </div>

      {/* Phase timeline — what happened, in order */}
      <Section title="Phase timeline" subtitle={`${phases.length} phase${phases.length === 1 ? '' : 's'} · sequential, with durations`}>
        <PhaseTimeline phases={phases} totalDurMs={trace.totalDurMs} onJumpToTrace={() => onJumpToTab('trace')} />
      </Section>

      {/* Side-by-side: Tools used + Knowledge used */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <Section title="Tools used" subtitle={toolSpans.length === 0 ? 'No tools called' : `${toolSpans.length} tool call${toolSpans.length === 1 ? '' : 's'}`}>
          {toolSpans.length === 0 ? (
            <EmptyHint icon={<Wrench className="h-4 w-4" />}>This run didn't invoke any tools.</EmptyHint>
          ) : (
            <ToolList spans={toolSpans} />
          )}
        </Section>
        <Section title="Knowledge used" subtitle={retrievalSpans.length === 0 ? 'No retrieval' : `${retrievalSpans.length} retrieval span${retrievalSpans.length === 1 ? '' : 's'}`}>
          {retrievalSpans.length === 0 ? (
            <EmptyHint icon={<Database className="h-4 w-4" />}>This run didn't retrieve from any knowledge source.</EmptyHint>
          ) : (
            <RetrievalList spans={retrievalSpans} />
          )}
        </Section>
      </div>

      {/* Compliance roll-up — links into Compliance tab */}
      <Section
        title="Compliance"
        subtitle={`${gates.length} policy gate${gates.length === 1 ? '' : 's'} fired during this run`}
        action={
          <button
            type="button"
            onClick={() => onJumpToTab('compliance')}
            className="inline-flex items-center gap-1 text-[12px] text-primary hover:brightness-110 font-medium"
          >
            Open Compliance <ChevronRight className="h-3.5 w-3.5" />
          </button>
        }
      >
        <ComplianceRollup overall={overall} blocked={blocked} approvals={approvals} warnings={warnings} logged={(counts.log || 0)} guardrails={guardrailSpans.length} />
      </Section>
    </div>
  );
}

/* ───────────────────── Building blocks ───────────────────── */

function ConversationPanel({ icon, label, tone, body, meta }) {
  const labelTone = tone === 'primary'
    ? 'bg-primary/10 text-primary border-primary/30'
    : 'bg-muted text-foreground border-border';
  return (
    <div className="p-5">
      <div className="flex items-center gap-2 mb-2">
        <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md border text-[11px] font-medium ${labelTone}`}>
          {icon}
          {label}
        </span>
      </div>
      <p className="text-[13px] text-foreground leading-relaxed whitespace-pre-wrap">{body}</p>
      <div className="mt-3 text-[11px] text-muted-foreground">{meta}</div>
    </div>
  );
}

function Section({ title, subtitle, action, children }) {
  return (
    <section>
      <div className="mb-3 flex items-end justify-between gap-3 flex-wrap">
        <div>
          <h3 className="text-[14px] font-semibold text-foreground">{title}</h3>
          {subtitle && <p className="mt-0.5 text-[12px] text-muted-foreground">{subtitle}</p>}
        </div>
        {action}
      </div>
      {children}
    </section>
  );
}

function EmptyHint({ icon, children }) {
  return (
    <div className="rounded-lg border border-dashed border-border bg-muted/20 p-4 flex items-center gap-3 text-[12.5px] text-muted-foreground">
      <span className="text-muted-foreground/70 shrink-0">{icon}</span>
      <span>{children}</span>
    </div>
  );
}

/* ───────────────────── Phase timeline ───────────────────── */

function buildPhases(spans) {
  // Roll consecutive same-kind sibling spans (parent === root) into a single
  // "phase" pill. We don't roll across kinds — the operator wants to see
  // distinct steps. Dur is the sum of the rolled spans.
  const root = spans.find(s => s.parentId === null);
  if (!root) return [];
  const direct = spans.filter(s => s.parentId === root.id).sort((a, b) => a.startMs - b.startMs);
  const phases = [];
  for (const s of direct) {
    const last = phases[phases.length - 1];
    const phaseLabel = phaseLabelFor(s);
    if (last && last.kind === s.kind && last.label === phaseLabel) {
      last.durMs += s.durMs;
      last.count += 1;
      last.endMs = s.startMs + s.durMs;
      if (s.status === 'error') last.errored = true;
    } else {
      phases.push({
        id: s.id,
        kind: s.kind,
        label: phaseLabel,
        durMs: s.durMs,
        startMs: s.startMs,
        endMs: s.startMs + s.durMs,
        count: 1,
        errored: s.status === 'error',
      });
    }
  }
  return phases;
}

function phaseLabelFor(s) {
  const meta = KIND_META[s.kind] || { label: s.kind };
  switch (s.kind) {
    case 'llm':
      if (s.id === 'sp_plan')      return 'Plan';
      if (s.id === 'sp_summarize') return 'Summarize';
      return 'Reason';
    case 'tool':       return 'Tool';
    case 'retrieval':  return 'Retrieve';
    case 'guardrail':  return 'Guardrail';
    case 'memory':     return 'Memory';
    case 'human':      return 'Human review';
    case 'sub-agent':  return 'Sub-agent';
    case 'branch':     return 'Branch';
    default:           return meta.label;
  }
}

function PhaseTimeline({ phases, totalDurMs, onJumpToTrace }) {
  return (
    <div className="rounded-xl border border-border bg-card p-4">
      <div className="flex items-center gap-2 flex-wrap">
        {phases.map((p, i) => {
          const meta = KIND_META[p.kind] || KIND_META.agent;
          const pct = Math.round((p.durMs / Math.max(1, totalDurMs)) * 100);
          return (
            <div key={p.id} className="flex items-center gap-2">
              <button
                type="button"
                onClick={onJumpToTrace}
                className={`group inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md border text-[12px] hover:brightness-110 transition ${
                  p.errored ? 'border-destructive/40 bg-destructive/5' : 'border-border bg-muted/30'
                }`}
                title={`${p.count}× · ${fmtMs(p.durMs)} (${pct}%)`}
              >
                <span className="h-1.5 w-1.5 rounded-full" style={{ background: meta.color }} />
                <span className="font-medium text-foreground">{p.label}</span>
                {p.count > 1 && (
                  <span className="text-[10.5px] font-mono text-muted-foreground">×{p.count}</span>
                )}
                <span className="text-[10.5px] font-mono text-muted-foreground">{fmtMs(p.durMs)}</span>
                {p.errored && <span className="text-[10px] text-destructive">·err</span>}
              </button>
              {i < phases.length - 1 && (
                <ArrowRight className="h-3 w-3 text-muted-foreground/60 shrink-0" />
              )}
            </div>
          );
        })}
      </div>
      {/* Width-proportional band beneath, color-coded by phase kind */}
      <div className="mt-3 flex h-1.5 overflow-hidden rounded-full bg-muted">
        {phases.map(p => {
          const meta = KIND_META[p.kind] || KIND_META.agent;
          const pct = (p.durMs / Math.max(1, totalDurMs)) * 100;
          return (
            <span
              key={`bar-${p.id}`}
              className="h-full"
              style={{ width: `${pct}%`, background: meta.color, opacity: p.errored ? 0.7 : 1 }}
              title={`${p.label} · ${fmtMs(p.durMs)}`}
            />
          );
        })}
      </div>
    </div>
  );
}

/* ───────────────────── Tools list ───────────────────── */

const RISK_TONE = {
  low:  'bg-(--brand-teal)/10 text-brand-teal border-(--brand-teal)/30',
  med:  'bg-primary/10 text-primary border-primary/30',
  high: 'bg-destructive/10 text-destructive border-destructive/30',
};

function ToolList({ spans }) {
  return (
    <div className="rounded-xl border border-border bg-card overflow-hidden divide-y divide-border">
      {spans.map(s => {
        const name = s.attrs?.['tool.name'] || s.name.replace('tool · ', '');
        const risk = s.attrs?.['tool.risk_level'] || 'low';
        const status = s.attrs?.['http.response.status_code'];
        const isErr = s.status === 'error';
        const rows = s.attrs?.['db.response.returned_rows'];
        return (
          <div key={s.id} className="px-4 py-3 flex items-start justify-between gap-3">
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <Wrench className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                <span className="text-[12.5px] font-mono text-foreground truncate">{name}</span>
                <span className={`inline-flex items-center px-1.5 py-0.5 rounded border text-[10px] font-medium ${RISK_TONE[risk] || RISK_TONE.low}`}>
                  risk: {risk}
                </span>
                {s.attrs?.['tool.requires_approval'] && (
                  <span className="inline-flex items-center px-1.5 py-0.5 rounded border border-primary/30 bg-primary/10 text-primary text-[10px] font-medium">
                    requires approval
                  </span>
                )}
              </div>
              <div className="mt-1 text-[11px] text-muted-foreground">
                {s.attrs?.['tool.server_id'] || 'builtin'} ·{' '}
                {rows != null ? `${rows.toLocaleString()} rows` : (status ? `HTTP ${status}` : '')}
              </div>
            </div>
            <div className="text-right shrink-0">
              <div className={`text-[12px] font-mono tabular-nums ${isErr ? 'text-destructive' : 'text-foreground'}`}>
                {fmtMs(s.durMs)}
              </div>
              <div className="mt-0.5 text-[10.5px] font-mono">
                {isErr
                  ? <span className="inline-flex items-center gap-1 text-destructive"><XCircle className="h-3 w-3" /> error</span>
                  : <span className="inline-flex items-center gap-1 text-brand-teal"><CheckCircle2 className="h-3 w-3" /> ok</span>}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

/* ───────────────────── Retrieval / knowledge list ───────────────────── */

function RetrievalList({ spans }) {
  return (
    <div className="rounded-xl border border-border bg-card overflow-hidden divide-y divide-border">
      {spans.map(s => {
        const sources = (s.attrs?.['retrieval.source_ids'] || '').split(',').filter(Boolean);
        const topK = s.attrs?.['retrieval.top_k'];
        const ndcg = s.attrs?.['retrieval.nDCG'];
        const returned = s.attrs?.['retrieval.results_returned'];
        const chunks = s.output?.chunks || [];
        return (
          <div key={s.id} className="px-4 py-3">
            <div className="flex items-center justify-between gap-3 flex-wrap">
              <div className="flex items-center gap-2 min-w-0">
                <Database className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                <span className="text-[12.5px] font-medium text-foreground truncate">
                  {s.input?.query || s.name}
                </span>
              </div>
              <div className="flex items-center gap-2 text-[10.5px] font-mono text-muted-foreground shrink-0">
                {topK     != null && <span>top-k {topK}</span>}
                {returned != null && <span>· {returned} hits</span>}
                {ndcg     != null && <span>· nDCG {ndcg}</span>}
                <span>· {fmtMs(s.durMs)}</span>
              </div>
            </div>
            {sources.length > 0 && (
              <div className="mt-2 flex flex-wrap gap-1">
                {sources.map(id => (
                  <span key={id} className="inline-flex items-center px-1.5 py-0.5 rounded border border-border bg-muted/40 text-[10.5px] font-mono text-foreground">
                    {id}
                  </span>
                ))}
              </div>
            )}
            {chunks.length > 0 && (
              <ul className="mt-3 space-y-1">
                {chunks.slice(0, 3).map((c, i) => (
                  <li key={i} className="flex items-start gap-2 text-[11.5px] leading-relaxed">
                    <span className="font-mono text-muted-foreground shrink-0 w-10 tabular-nums">
                      {(c.score ?? 0).toFixed(2)}
                    </span>
                    <span className="text-muted-foreground line-clamp-1">{c.text}</span>
                  </li>
                ))}
                {chunks.length > 3 && (
                  <li className="text-[11px] text-muted-foreground italic">+ {chunks.length - 3} more</li>
                )}
              </ul>
            )}
          </div>
        );
      })}
    </div>
  );
}

/* ───────────────────── Compliance rollup ───────────────────── */

function ComplianceRollup({ overall, blocked, approvals, warnings, logged, guardrails }) {
  const headline = overall === 'blocked' ? { icon: <XCircle className="h-4 w-4" />,    label: 'Run blocked by policy', tone: 'destructive' }
                 : overall === 'approval' ? { icon: <AlertTriangle className="h-4 w-4" />, label: 'Approval required',     tone: 'primary' }
                 : overall === 'warning'  ? { icon: <AlertTriangle className="h-4 w-4" />, label: 'Run completed with warnings', tone: 'accent' }
                 :                          { icon: <CheckCircle2 className="h-4 w-4" />,  label: 'All policy gates passed',     tone: 'brand-teal' };

  const toneClass = {
    destructive: 'bg-destructive/10 text-destructive border-destructive/40',
    primary:     'bg-primary/10 text-primary border-primary/40',
    accent:      'bg-accent/10 text-accent border-accent/40',
    'brand-teal':'bg-(--brand-teal)/10 text-brand-teal border-(--brand-teal)/40',
  }[headline.tone];

  return (
    <div className="rounded-xl border border-border bg-card p-4">
      <div className={`inline-flex items-center gap-2 px-2.5 py-1 rounded-md border text-[12px] font-medium ${toneClass}`}>
        {headline.icon}
        {headline.label}
      </div>
      <div className="mt-4 grid grid-cols-2 sm:grid-cols-5 gap-3">
        <RollupTile label="Blocked"   value={blocked}   tone={blocked > 0   ? 'destructive' : 'muted'} />
        <RollupTile label="Approvals" value={approvals} tone={approvals > 0 ? 'primary'     : 'muted'} />
        <RollupTile label="Warnings"  value={warnings}  tone={warnings > 0  ? 'accent'      : 'muted'} />
        <RollupTile label="Logged"    value={logged}    tone="muted" />
        <RollupTile label="Guardrails" value={guardrails} tone="muted" />
      </div>
    </div>
  );
}

function RollupTile({ label, value, tone }) {
  const color = tone === 'destructive' ? 'text-destructive'
              : tone === 'primary'     ? 'text-primary'
              : tone === 'accent'      ? 'text-accent'
              :                          'text-foreground';
  return (
    <div className="rounded-lg border border-border bg-muted/20 p-3">
      <div className="text-[11px] font-medium text-muted-foreground">{label}</div>
      <div className={`mt-1 text-[18px] font-semibold tabular-nums ${color}`}>{value}</div>
    </div>
  );
}
