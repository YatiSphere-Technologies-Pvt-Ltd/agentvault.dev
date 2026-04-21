'use client';

import Link from 'next/link';
import { useParams, useSearchParams } from 'next/navigation';
import { useEffect, useMemo, useRef, useState } from 'react';
import { ArrowLeft, Copy, Download, Share2, ExternalLink } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { generateTrace, KIND_META } from '../_traces';
import TraceTree from './TraceTree';
import Waterfall from './Waterfall';
import SpanDetail from './SpanDetail';
import ReplayPlayer from './ReplayPlayer';
import { useReplay, liveStats, activeSpanAt, fmtMs } from './_replay';

export default function RunTracePage() {
  const { id } = useParams();
  const search = useSearchParams();
  const agentId = search.get('agent') || 'agt_data_analyst';

  const [trace, setTrace] = useState(null);
  useEffect(() => {
    setTrace(generateTrace(id, agentId));
  }, [id, agentId]);

  const totalDurMs = trace?.totalDurMs || 0;
  const { currentMs, playing, speed, setSpeed, play, pause, stop, jumpEnd, seek } = useReplay(totalDurMs);

  // Selection: if the user has clicked a row, we follow that until they unlock
  // auto-follow. When playing and the user hasn't pinned a span, we auto-select
  // the "active" span at the current replay head.
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

  // Effective selected id — if auto-follow is on, follow replay. Otherwise pinned.
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

  // Re-enable auto-follow on play (so "play" resumes tracking the active span).
  const onPlay = () => { userPinRef.current = false; play(); };

  if (!trace) {
    return (
      <div className="max-w-7xl mx-auto px-6 py-10 text-[13px] text-muted-foreground">
        Loading trace…
      </div>
    );
  }

  const live = liveStats(trace.spans, currentMs);
  const spansByKind = countBy(trace.spans, s => s.kind);
  const liveDone = currentMs >= totalDurMs;
  const headTokens = liveDone ? trace.totalTokens : live.tokens;
  const headCost   = liveDone ? trace.totalCostUSD : live.cost;
  const headErrors = liveDone ? trace.errorCount : live.errors;
  const headStatus = liveDone
    ? trace.status
    : (currentMs <= 0 ? 'queued' : playing ? 'running' : 'paused');

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-10 py-6 sm:py-8">
      <Link href="/app/runs" className="text-[12px] text-muted-foreground hover:text-foreground inline-flex items-center gap-1.5">
        <ArrowLeft className="h-3.5 w-3.5" /> All runs
      </Link>

      {/* ── Summary strip ── */}
      <div className="mt-4 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div className="min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <div className="text-[10.5px] uppercase tracking-[0.2em] text-muted-foreground font-mono">Trace</div>
            <code className="text-[12px] font-mono text-foreground">{id}</code>
            <StatusPill status={headStatus} />
          </div>
          <h1 className="mt-1 text-[22px] font-semibold tracking-tight truncate">
            {trace.agentName} · <span className="text-muted-foreground">run</span>
          </h1>
          <div className="text-[12px] text-muted-foreground font-mono">
            started {new Date(trace.startedAt).toLocaleString()} · agent <Link href={`/app/agents/${trace.agentId}`} className="text-primary hover:underline">{trace.agentId}</Link>
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <Button variant="outline" size="sm" onClick={copyTraceId}><Copy className="h-3.5 w-3.5" /> Copy id</Button>
          <Button variant="outline" size="sm" onClick={downloadJson}><Download className="h-3.5 w-3.5" /> Export JSON</Button>
          <Button variant="outline" size="sm" render={<Link href={`/app/agents/${trace.agentId}?tab=observability`} />}>
            <ExternalLink className="h-3.5 w-3.5" /> Agent observability
          </Button>
          <Button variant="outline" size="sm"><Share2 className="h-3.5 w-3.5" /> Share</Button>
        </div>
      </div>

      <Card className="mt-5">
        <CardContent className="p-4 sm:p-5">
          <div className="grid grid-cols-2 md:grid-cols-6 gap-3">
            <Stat label="Elapsed"      value={fmtMs(currentMs)} sub={`of ${fmtMs(trace.totalDurMs)}`} />
            <Stat label="Spans done"   value={`${live.completed} / ${trace.spanCount}`} />
            <Stat label="Errors"       value={headErrors} tone={headErrors ? 'bad' : 'good'} />
            <Stat label="Tokens"       value={headTokens.toLocaleString()} live={!liveDone && playing} />
            <Stat label="Cost"         value={`$${headCost.toFixed(4)}`} live={!liveDone && playing} />
            <Stat label="Kinds"        value={Object.keys(spansByKind).length} />
          </div>
          <div className="mt-4 flex flex-wrap gap-1.5">
            {Object.entries(spansByKind).map(([k, n]) => {
              const meta = KIND_META[k] || KIND_META.agent;
              return (
                <span key={k} className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded border border-border bg-muted/50 text-[10.5px] font-mono">
                  <span className="h-1.5 w-1.5 rounded-full" style={{ background: meta.color }} />
                  <span className="text-foreground">{meta.label}</span>
                  <span className="text-muted-foreground">{n}</span>
                </span>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* ── Replay player ── */}
      <div className="mt-4">
        <ReplayPlayer
          spans={trace.spans}
          totalDurMs={totalDurMs}
          currentMs={currentMs}
          playing={playing}
          speed={speed}
          onPlay={onPlay}
          onPause={pause}
          onStop={stop}
          onJumpEnd={jumpEnd}
          onSeek={seek}
          onSetSpeed={setSpeed}
        />
      </div>

      {/* ── 3-column trace layout ── */}
      <div className="mt-5 grid grid-cols-1 lg:grid-cols-[260px_minmax(0,1fr)_380px] gap-4">
        <Card className="lg:sticky lg:top-20 lg:self-start">
          <CardContent className="p-3">
            <div className="px-2 py-1 text-[10px] uppercase tracking-[0.18em] font-mono text-muted-foreground">Spans</div>
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
              <div className="text-[10.5px] uppercase tracking-[0.18em] font-mono text-muted-foreground">Waterfall</div>
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

function Stat({ label, value, tone, sub, live }) {
  const color = tone === 'bad' ? 'text-destructive' : tone === 'good' ? 'text-brand-teal' : 'text-foreground';
  return (
    <div className="rounded-lg border border-border p-3 relative overflow-hidden">
      {live && <span className="absolute top-2 right-2 h-1.5 w-1.5 rounded-full bg-primary animate-pulse" />}
      <div className="text-[10.5px] uppercase tracking-[0.15em] font-mono text-muted-foreground">{label}</div>
      <div className={`mt-1 text-[17px] font-semibold tabular-nums ${color}`}>{value}</div>
      {sub && <div className="text-[10px] font-mono text-muted-foreground/70 mt-0.5">{sub}</div>}
    </div>
  );
}

function StatusPill({ status }) {
  const tone =
      status === 'ok'       ? 'border-(--brand-teal)/40 text-brand-teal bg-(--brand-teal)/10'
    : status === 'running'  ? 'border-primary/40 text-primary bg-primary/10'
    : status === 'paused'   ? 'border-muted-foreground/30 text-muted-foreground bg-muted/50'
    : status === 'queued'   ? 'border-muted-foreground/30 text-muted-foreground bg-muted/30'
    : status === 'partial'  ? 'border-amber-400/40 text-amber-700 bg-amber-400/10 dark:text-amber-400'
    :                         'border-destructive/40 text-destructive bg-destructive/10';
  return <Badge className={`text-[10.5px] font-mono border ${tone}`}>{status}</Badge>;
}

function countBy(arr, keyFn) {
  const m = {};
  for (const x of arr) { const k = keyFn(x); m[k] = (m[k] || 0) + 1; }
  return m;
}
