'use client';

import Link from 'next/link';
import { useParams, useSearchParams } from 'next/navigation';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ArrowLeft, Copy, Download, Share2, ExternalLink,
  CheckCircle2, AlertTriangle, XCircle, Hourglass,
  Cpu, Webhook, Clock, Hand, Zap, Search, Flame, AlertOctagon, ChevronRight,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { generateTrace, KIND_META } from '../_traces';
import TraceWaterfall from './TraceWaterfall';
import SpanDrawer from './SpanDrawer';
import ReplayPlayer from './ReplayPlayer';
import OverviewTab from './OverviewTab';
import ComplianceTab from './ComplianceTab';
import LogsTab from './LogsTab';
import { useReplay, liveStats, activeSpanAt, fmtMs, computeCriticalPath, listErrors } from './_replay';
import { gatesForRun } from './_gates';

const TRIGGER_ICON = {
  webhook:  Webhook,
  schedule: Clock,
  manual:   Hand,
  event:    Zap,
};

export default function RunTracePage() {
  const { id } = useParams();
  const search = useSearchParams();
  const agentId = search.get('agent') || 'agt_data_analyst';

  const [trace, setTrace] = useState(null);
  const [tab, setTab] = useState('overview');

  useEffect(() => {
    setTrace(generateTrace(id, agentId));
  }, [id, agentId]);

  const totalDurMs = trace?.totalDurMs || 0;
  const replay = useReplay(totalDurMs);
  const { currentMs, playing, speed, setSpeed, play, pause, stop, jumpEnd, seek } = replay;

  // Trace-tab span selection / replay sync (kept identical to the prior page)
  const [userSelectedId, setUserSelectedId] = useState(null);
  const [expanded, setExpanded] = useState(() => new Set());
  const userPinRef = useRef(false);

  useEffect(() => {
    if (!trace) return;
    setExpanded(new Set(trace.spans.map(s => s.id)));
    // Honor a URL hash like #sp_tool_2 to deep-link directly at a span —
    // approvals + nudges link this way. Falls back to the root span.
    const hash = typeof window !== 'undefined' ? window.location.hash.replace(/^#/, '') : '';
    const initial = hash && trace.spans.find(s => s.id === hash)?.id;
    setUserSelectedId(initial || trace.spans[0]?.id || null);
    userPinRef.current = !!initial;
  }, [trace]);

  const autoSpan = useMemo(
    () => (trace ? activeSpanAt(trace.spans, currentMs) : null),
    [trace, currentMs],
  );
  const selectedId = userPinRef.current
    ? userSelectedId
    : (playing && autoSpan ? autoSpan.id : userSelectedId);

  const onSelectSpan = (spanId) => {
    userPinRef.current = true;
    setUserSelectedId(spanId);
    // Reflect the selection in the URL so reload + share preserve it.
    if (typeof window !== 'undefined' && spanId) {
      const url = new URL(window.location.href);
      url.hash = spanId;
      window.history.replaceState(null, '', url.toString());
    }
  };

  // Critical path — the longest root→leaf time chain. Drives the
  // highlighted bars in the waterfall and the flame badge in the tree.
  const critical = useMemo(
    () => trace ? computeCriticalPath(trace.spans) : { ids: new Set(), totalMs: 0 },
    [trace],
  );

  // Errors in chronological order — used by the "next error" hotkey/chip.
  const errorSpans = useMemo(
    () => trace ? listErrors(trace.spans) : [],
    [trace],
  );

  const selectedSpan = useMemo(
    () => trace?.spans.find(s => s.id === selectedId) || null,
    [trace, selectedId],
  );

  const toggleExpand = (spanId) => setExpanded(prev => {
    const next = new Set(prev);
    next.has(spanId) ? next.delete(spanId) : next.add(spanId);
    return next;
  });

  const onPlay = () => { userPinRef.current = false; play(); };

  const copyTraceId = () => { try { navigator.clipboard?.writeText(id); } catch {} };
  const downloadJson = () => {
    if (!trace) return;
    const blob = new Blob([JSON.stringify(trace, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${id}.trace.json`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  };

  // Synthesize a few non-trace meta fields (env / trigger) deterministically
  // from the runId so the header chips have realistic values. The runs index
  // already synthesizes its own; this matches the same shape.
  const meta = useMemo(() => deriveMeta(id, trace), [id, trace]);

  const gates = useMemo(
    () => trace ? gatesForRun(id, trace.agentName) : [],
    [id, trace],
  );

  if (!trace) {
    return (
      <div className="max-w-7xl mx-auto px-6 py-10 text-[13px] text-muted-foreground">
        Loading trace…
      </div>
    );
  }

  // Live (replay-aware) head metrics for the stat strip
  const live = liveStats(trace.spans, currentMs);
  const liveDone = currentMs >= totalDurMs;
  const headTokens = liveDone ? trace.totalTokens : live.tokens;
  const headCost   = liveDone ? trace.totalCostUSD : live.cost;
  const headStatus = liveDone
    ? trace.status
    : (currentMs <= 0 ? 'queued' : playing ? 'running' : 'paused');

  // Compliance roll-up for the strip
  const counts = gates.reduce((acc, g) => { acc[g.decision] = (acc[g.decision] || 0) + 1; return acc; }, {});
  const blocked   = counts.block || 0;
  const approvals = counts.require_approval || 0;
  const findings  = blocked + approvals + (counts.warn || 0) + (counts.redact || 0);

  // Header user-prompt preview
  const root = trace.spans.find(s => s.parentId === null);
  const userPromptPreview = root?.input?.user_message || '';

  return (
    <div className="max-w-[1680px] mx-auto px-4 sm:px-6 lg:px-8 py-6">
      <Link
        href="/app/runs"
        className="text-[12px] text-muted-foreground hover:text-foreground inline-flex items-center gap-1.5"
      >
        <ArrowLeft className="h-3.5 w-3.5" /> All runs
      </Link>

      {/* ── Header ── full-width row, title block expands; actions on the right */}
      <div className="mt-3 flex items-start justify-between gap-6 flex-wrap">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <code className="text-[11.5px] font-mono text-muted-foreground">{id}</code>
            <StatusPill status={headStatus} />
            <MetaChip>
              <Cpu className="h-3 w-3" /> {meta.model}
            </MetaChip>
            <MetaChip>{(() => {
              const Icon = TRIGGER_ICON[meta.trigger] || Zap;
              return <><Icon className="h-3 w-3" /> {meta.trigger}</>;
            })()}</MetaChip>
            <MetaChip tone={meta.env === 'prod' ? 'destructive' : meta.env === 'staging' ? 'primary' : 'muted'}>
              {meta.env}
            </MetaChip>
            <div className="ml-auto text-[11px] text-muted-foreground hidden md:block">
              Started {new Date(trace.startedAt).toLocaleString()} · agent{' '}
              <Link href={`/app/agents/${trace.agentId}`} className="text-primary hover:underline font-mono">
                {trace.agentId}
              </Link>
            </div>
          </div>
          <h2 className="mt-1.5 text-[20px] font-semibold tracking-tight text-foreground leading-tight truncate">
            {trace.agentName}
          </h2>
          {userPromptPreview && (
            <p className="mt-1 text-[12.5px] text-muted-foreground leading-relaxed line-clamp-1">
              <span className="text-foreground/80 font-medium">User: </span>
              {userPromptPreview}
            </p>
          )}
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <Button variant="outline" size="sm" onClick={copyTraceId}>
            <Copy className="h-3.5 w-3.5" /> Copy id
          </Button>
          <Button variant="outline" size="sm" onClick={downloadJson}>
            <Download className="h-3.5 w-3.5" /> Export
          </Button>
          <Button variant="outline" size="sm" render={
            <Link href={`/app/agents/${trace.agentId}?tab=observability`}>
              <ExternalLink className="h-3.5 w-3.5" /> Agent
            </Link>
          } />
          <Button variant="outline" size="sm">
            <Share2 className="h-3.5 w-3.5" /> Share
          </Button>
        </div>
      </div>

      {/* ── Stat strip — single dense row on desktop, smaller numbers, less padding ── */}
      <div className="mt-4 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2">
        <Stat label="Status"    value={liveDone ? trace.status : headStatus} tone={statusTone(liveDone ? trace.status : headStatus)} />
        <Stat label="Duration"  value={fmtMs(trace.totalDurMs)} sub={`${trace.spanCount} spans`} />
        <Stat label="Tokens"    value={headTokens.toLocaleString()} sub={`${liveDone ? '' : 'live'}`} />
        <Stat label="Cost"      value={`$${headCost.toFixed(4)}`} />
        <Stat
          label="Policy gates"
          value={gates.length}
          sub={`${blocked} blocked · ${approvals} approval`}
          tone={blocked > 0 ? 'bad' : approvals > 0 ? 'warn' : 'ok'}
        />
        <Stat
          label="Findings"
          value={findings}
          tone={findings === 0 ? 'ok' : findings >= 2 ? 'bad' : 'warn'}
        />
      </div>

      {/* ── Tabs ── */}
      <Tabs value={tab} onValueChange={setTab} className="mt-6">
        <TabsList className="h-9 bg-muted/40">
          <TabsTrigger value="overview"   className="text-[12.5px]">Overview</TabsTrigger>
          <TabsTrigger value="trace"      className="text-[12.5px]">Trace</TabsTrigger>
          <TabsTrigger value="compliance" className="text-[12.5px]">
            Compliance
            {(blocked > 0 || approvals > 0) && (
              <span className={`ml-1.5 inline-flex items-center justify-center h-4 min-w-4 px-1 rounded text-[10px] font-mono tabular-nums ${
                blocked > 0
                  ? 'bg-destructive/15 text-destructive'
                  : 'bg-primary/15 text-primary'
              }`}>
                {blocked + approvals}
              </span>
            )}
          </TabsTrigger>
          <TabsTrigger value="logs" className="text-[12.5px]">Logs</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="mt-5">
          <OverviewTab runId={id} trace={trace} gates={gates} onJumpToTab={setTab} />
        </TabsContent>

        <TabsContent value="trace" className="mt-5">
          <TraceTabContent
            trace={trace}
            selectedId={selectedId}
            selectedSpan={selectedSpan}
            onSelectSpan={onSelectSpan}
            expanded={expanded}
            toggleExpand={toggleExpand}
            currentMs={currentMs}
            playing={playing}
            speed={speed}
            onSetSpeed={setSpeed}
            onPlay={onPlay}
            onPause={pause}
            onStop={stop}
            onJumpEnd={jumpEnd}
            onSeek={seek}
            totalDurMs={totalDurMs}
            critical={critical}
            errorSpans={errorSpans}
            gates={gates}
            onJumpToCompliance={() => setTab('compliance')}
          />
        </TabsContent>

        <TabsContent value="compliance" className="mt-5">
          <ComplianceTab runId={id} agentName={trace.agentName} gates={gates} trace={trace} />
        </TabsContent>

        <TabsContent value="logs" className="mt-5">
          <LogsTab trace={trace} />
        </TabsContent>
      </Tabs>
    </div>
  );
}

/* ───────────────────── Trace tab content ───────────────────── */

function TraceTabContent({
  trace, selectedId, selectedSpan, onSelectSpan, expanded, toggleExpand,
  currentMs, playing, speed, onSetSpeed,
  onPlay, onPause, onStop, onJumpEnd, onSeek, totalDurMs,
  critical, errorSpans, gates, onJumpToCompliance,
}) {
  const spansByKind = countBy(trace.spans, s => s.kind);
  const [filterText, setFilterText] = useState('');
  const filterRef = useRef(null);

  // Critical-path stat: % of total duration covered by the path.
  const criticalPct = trace.totalDurMs > 0
    ? Math.round((critical.totalMs / trace.totalDurMs) * 100)
    : 0;

  // "Next error" cycler — pressing E selects the next error span after
  // the currently selected one (wrapping). The chip uses the same logic.
  const jumpToNextError = useCallback(() => {
    if (!errorSpans?.length) return;
    const curIdx = errorSpans.findIndex(s => s.id === selectedId);
    const next = errorSpans[(curIdx + 1) % errorSpans.length];
    onSelectSpan(next.id);
  }, [errorSpans, selectedId, onSelectSpan]);

  // J/K cycle through the ordered span list (tree pre-order). Useful when
  // you're triaging without grabbing the mouse. Skips when typing.
  const jumpRel = useCallback((delta) => {
    const arr = trace.spans;
    if (!arr.length) return;
    const curIdx = Math.max(0, arr.findIndex(s => s.id === selectedId));
    const next = arr[(curIdx + delta + arr.length) % arr.length];
    onSelectSpan(next.id);
  }, [trace.spans, selectedId, onSelectSpan]);

  // Hotkeys. We let / focus the filter, E jump to next error, J/K move
  // selection. Don't trigger when an input is focused.
  useEffect(() => {
    const onKey = (e) => {
      const tag = (e.target?.tagName || '').toLowerCase();
      const inField = tag === 'input' || tag === 'textarea' || e.target?.isContentEditable;
      if (e.key === '/' && !inField) {
        e.preventDefault();
        filterRef.current?.focus();
        filterRef.current?.select?.();
        return;
      }
      if (inField) return;
      if (e.key === 'e' || e.key === 'E') { e.preventDefault(); jumpToNextError(); }
      else if (e.key === 'j' || e.key === 'J') { e.preventDefault(); jumpRel(1);  }
      else if (e.key === 'k' || e.key === 'K') { e.preventDefault(); jumpRel(-1); }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [jumpToNextError, jumpRel]);

  // When the selected span changes (via tree click, hash, or hotkey), bring
  // the matching tree row into view so the user doesn't have to scroll.
  useEffect(() => {
    if (!selectedId) return;
    const el = document.querySelector(`[data-span-id="${selectedId}"]`);
    if (el && typeof el.scrollIntoView === 'function') {
      el.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
    }
  }, [selectedId]);

  // Drawer is open whenever there's a user-pinned selection. Closing the
  // drawer clears the pin so the replay can take over driving selection
  // again (for the auto-pulse on running spans).
  const [drawerOpen, setDrawerOpen] = useState(false);
  // Sync open state with explicit user picks: when the parent updates
  // selectedId in response to a click/hotkey/hash, we open. The replay's
  // auto-selected span never opens the drawer.
  // We track a hash of "last user pick" via the selectedSpan ref pattern:
  // simplest is to expose a setter that the parent calls. For minimal
  // surface area, we open on every onSelect call.
  const selectAndOpen = useCallback((id) => {
    onSelectSpan(id);
    setDrawerOpen(true);
  }, [onSelectSpan]);

  return (
    <div className="space-y-4">
      {/* Replay player */}
      <ReplayPlayer
        spans={trace.spans}
        totalDurMs={totalDurMs}
        currentMs={currentMs}
        playing={playing}
        speed={speed}
        onPlay={onPlay}
        onPause={onPause}
        onStop={onStop}
        onJumpEnd={onJumpEnd}
        onSeek={onSeek}
        onSetSpeed={onSetSpeed}
      />

      {/* Toolbar — filter input, kind legend, critical-path stat, error
          chip, hotkey hints. Sits in one row above the waterfall. */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative w-full max-w-xs">
          <Search className="h-3.5 w-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input
            ref={filterRef}
            value={filterText}
            onChange={(e) => setFilterText(e.target.value)}
            placeholder="Filter spans by name or kind…"
            className="w-full h-8 pl-8 pr-8 bg-background border border-border rounded-md text-[12.5px] text-foreground placeholder:text-muted-foreground/60 focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
          />
          {filterText && (
            <button
              type="button"
              onClick={() => setFilterText('')}
              className="absolute right-1.5 top-1/2 -translate-y-1/2 h-5 w-5 rounded text-muted-foreground hover:text-foreground hover:bg-muted flex items-center justify-center"
              aria-label="Clear filter"
            >
              <XCircle className="h-3 w-3" />
            </button>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-1.5">
          {Object.entries(spansByKind).map(([k, n]) => {
            const meta = KIND_META[k] || KIND_META.agent;
            return (
              <span key={k} className="inline-flex items-center gap-1.5 px-2 py-1 rounded-md border border-border bg-muted/40 text-[11px]">
                <span className="h-1.5 w-1.5 rounded-full" style={{ background: meta.color }} />
                <span className="text-foreground font-medium">{meta.label}</span>
                <span className="text-muted-foreground font-mono">{n}</span>
              </span>
            );
          })}
          {critical.totalMs > 0 && (
            <span className="inline-flex items-center gap-1.5 px-2 py-1 rounded-md border border-destructive/40 bg-destructive/[0.06] text-[11px] text-destructive">
              <Flame className="h-3 w-3" />
              <span className="font-medium">Critical path</span>
              <span className="font-mono">{criticalPct}%</span>
            </span>
          )}
          {errorSpans.length > 0 && (
            <button
              type="button"
              onClick={jumpToNextError}
              className="inline-flex items-center gap-1.5 px-2 py-1 rounded-md border border-destructive/40 bg-destructive/10 text-destructive text-[11px] hover:brightness-110"
              title="Jump to next error (E)"
            >
              <AlertOctagon className="h-3 w-3" />
              <span className="font-medium">{errorSpans.length} error{errorSpans.length === 1 ? '' : 's'}</span>
              <ChevronRight className="h-3 w-3" />
            </button>
          )}
        </div>

        <span className="ml-auto text-[10.5px] font-mono text-muted-foreground/80 hidden md:inline-flex items-center gap-2">
          <Hotkey k="/" /> filter
          <Hotkey k="E" /> next error
          <Hotkey k="J/K" /> next/prev span
        </span>
      </div>

      {/* The trace itself — full content width. The tree IS the waterfall:
          one row per span, label on the left, bar on the right. Selection
          opens SpanDrawer instead of stealing a third column. */}
      <TraceWaterfall
        trace={trace}
        selectedId={selectedId}
        onSelect={selectAndOpen}
        expanded={expanded}
        onToggle={toggleExpand}
        currentMs={currentMs}
        criticalIds={critical.ids}
        filterText={filterText}
        gates={gates}
        onSelectGate={onJumpToCompliance ? () => onJumpToCompliance() : undefined}
        onSeek={onSeek}
      />

      <SpanDrawer
        open={drawerOpen}
        span={selectedSpan}
        currentMs={currentMs}
        onCriticalPath={selectedSpan ? critical.ids.has(selectedSpan.id) : false}
        onClose={() => setDrawerOpen(false)}
      />
    </div>
  );
}

function Hotkey({ k }) {
  return (
    <kbd className="inline-flex items-center justify-center h-4 min-w-4 px-1 rounded border border-border bg-muted/40 text-[9.5px] font-mono text-muted-foreground">
      {k}
    </kbd>
  );
}

/* ───────────────────── Header bits ───────────────────── */

function StatusPill({ status }) {
  const tone =
      status === 'ok'       ? 'border-(--brand-teal)/40 text-brand-teal bg-(--brand-teal)/10'
    : status === 'running'  ? 'border-primary/40 text-primary bg-primary/10'
    : status === 'paused'   ? 'border-muted-foreground/30 text-muted-foreground bg-muted/50'
    : status === 'queued'   ? 'border-muted-foreground/30 text-muted-foreground bg-muted/30'
    : status === 'partial'  ? 'border-amber-400/40 text-amber-700 bg-amber-400/10 dark:text-amber-400'
    :                         'border-destructive/40 text-destructive bg-destructive/10';
  const Icon = status === 'ok' ? CheckCircle2
             : status === 'running' ? Hourglass
             : status === 'partial' ? AlertTriangle
             : status === 'paused' || status === 'queued' ? Hourglass
             : XCircle;
  return (
    <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md border text-[11px] font-medium ${tone}`}>
      <Icon className={`h-3 w-3 ${status === 'running' ? 'animate-pulse' : ''}`} />
      {status}
    </span>
  );
}

function MetaChip({ children, tone = 'muted' }) {
  const cls = tone === 'destructive' ? 'border-destructive/30 bg-destructive/10 text-destructive'
            : tone === 'primary'     ? 'border-primary/30 bg-primary/10 text-primary'
            :                          'border-border bg-muted/40 text-foreground';
  return (
    <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md border text-[11px] font-medium font-mono ${cls}`}>
      {children}
    </span>
  );
}

function Stat({ label, value, sub, tone = 'default' }) {
  const color = tone === 'bad'  ? 'text-destructive'
              : tone === 'warn' ? 'text-primary'
              : tone === 'ok'   ? 'text-brand-teal'
              :                   'text-foreground';
  return (
    <div className="rounded-lg border border-border bg-card px-3 py-2">
      <div className="text-[10.5px] font-medium uppercase tracking-[0.1em] text-muted-foreground">{label}</div>
      <div className="mt-0.5 flex items-baseline gap-1.5">
        <div className={`text-[17px] font-semibold tabular-nums ${color} truncate`}>{value}</div>
        {sub && <div className="text-[10.5px] font-mono text-muted-foreground truncate">{sub}</div>}
      </div>
    </div>
  );
}

function statusTone(status) {
  if (status === 'ok') return 'ok';
  if (status === 'partial' || status === 'paused' || status === 'queued') return 'warn';
  if (status === 'error') return 'bad';
  return 'default';
}

function deriveMeta(runId, trace) {
  let h = 0;
  for (let i = 0; i < runId.length; i++) h = (h * 31 + runId.charCodeAt(i)) | 0;
  const triggers = ['webhook', 'schedule', 'manual', 'event'];
  const trigger = triggers[Math.abs(h) % triggers.length];
  const env = trace?.spans?.[0]?.attrs?.['agentvault.environment'] || 'prod';
  // Infer model from the first LLM span if present; fall back to a placeholder.
  const llm = trace?.spans?.find(s => s.kind === 'llm');
  const model = llm?.attrs?.['gen_ai.request.model'] || 'unknown';
  return { trigger, env, model };
}

function countBy(arr, keyFn) {
  const m = {};
  for (const x of arr) { const k = keyFn(x); m[k] = (m[k] || 0) + 1; }
  return m;
}
