'use client';

import Link from 'next/link';
import { useParams, useSearchParams } from 'next/navigation';
import { useEffect, useMemo, useRef, useState } from 'react';
import {
  ArrowLeft, Copy, Download, Share2, ExternalLink,
  CheckCircle2, AlertTriangle, XCircle, Hourglass,
  Cpu, Webhook, Clock, Hand, Zap,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { generateTrace, KIND_META } from '../_traces';
import TraceTree from './TraceTree';
import Waterfall from './Waterfall';
import SpanDetail from './SpanDetail';
import ReplayPlayer from './ReplayPlayer';
import OverviewTab from './OverviewTab';
import ComplianceTab from './ComplianceTab';
import LogsTab from './LogsTab';
import { useReplay, liveStats, activeSpanAt, fmtMs } from './_replay';
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
    setUserSelectedId(trace.spans[0]?.id || null);
    userPinRef.current = false;
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
  };

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
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-10 py-7">
      <Link
        href="/app/runs"
        className="text-[12px] text-muted-foreground hover:text-foreground inline-flex items-center gap-1.5"
      >
        <ArrowLeft className="h-3.5 w-3.5" /> All runs
      </Link>

      {/* ── Header ── */}
      <div className="mt-4 flex items-start justify-between gap-4 flex-wrap">
        <div className="min-w-0 max-w-3xl">
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
          </div>
          <h2 className="mt-2 text-[22px] font-semibold tracking-tight text-foreground leading-tight truncate">
            {trace.agentName}
          </h2>
          {userPromptPreview && (
            <p className="mt-1.5 text-[13px] text-muted-foreground leading-relaxed line-clamp-2">
              <span className="text-foreground/80 font-medium">User: </span>
              {userPromptPreview}
            </p>
          )}
          <div className="mt-2 text-[11.5px] text-muted-foreground">
            Started {new Date(trace.startedAt).toLocaleString()} · agent{' '}
            <Link href={`/app/agents/${trace.agentId}`} className="text-primary hover:underline font-mono">
              {trace.agentId}
            </Link>
          </div>
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

      {/* ── Stat strip ── */}
      <div className="mt-5 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
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
}) {
  const spansByKind = countBy(trace.spans, s => s.kind);

  return (
    <div className="space-y-4">
      {/* Replay player — tucked above the 3-col layout but inside the Trace tab */}
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

      {/* Kind legend */}
      <div className="flex flex-wrap gap-1.5">
        {Object.entries(spansByKind).map(([k, n]) => {
          const meta = KIND_META[k] || KIND_META.agent;
          return (
            <span key={k} className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md border border-border bg-muted/40 text-[11px]">
              <span className="h-1.5 w-1.5 rounded-full" style={{ background: meta.color }} />
              <span className="text-foreground font-medium">{meta.label}</span>
              <span className="text-muted-foreground font-mono">{n}</span>
            </span>
          );
        })}
      </div>

      {/* 3-column trace layout */}
      <div className="grid grid-cols-1 lg:grid-cols-[260px_minmax(0,1fr)_380px] gap-4">
        <Card className="lg:sticky lg:top-20 lg:self-start">
          <CardContent className="p-3">
            <div className="px-2 py-1 mb-1 text-[11px] font-medium text-muted-foreground">Spans</div>
            <TraceTree
              spans={trace.spans}
              selectedId={selectedId}
              onSelect={onSelectSpan}
              expanded={expanded}
              onToggle={toggleExpand}
              currentMs={currentMs}
            />
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-2">
              <div className="text-[11px] font-medium text-muted-foreground">Waterfall</div>
              <div className="text-[10.5px] font-mono text-muted-foreground">0 – {fmtMs(trace.totalDurMs)}</div>
            </div>
            <Waterfall trace={trace} selectedId={selectedId} onSelect={onSelectSpan} currentMs={currentMs} />
          </CardContent>
        </Card>

        <Card className="lg:sticky lg:top-20 lg:self-start">
          <CardContent className="p-0 min-h-[520px] flex flex-col">
            <SpanDetail span={selectedSpan} currentMs={currentMs} />
          </CardContent>
        </Card>
      </div>
    </div>
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
    <div className="rounded-lg border border-border bg-card p-3">
      <div className="text-[11.5px] font-medium text-muted-foreground">{label}</div>
      <div className="mt-1 flex items-baseline gap-1.5">
        <div className={`text-[20px] font-semibold tabular-nums ${color} truncate`}>{value}</div>
        {sub && <div className="text-[11px] font-mono text-muted-foreground truncate">{sub}</div>}
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
