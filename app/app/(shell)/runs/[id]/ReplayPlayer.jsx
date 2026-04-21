'use client';

import { Pause, Play, SkipBack, SkipForward } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { KIND_META } from '../_traces';
import { fmtMs } from './_replay';

export default function ReplayPlayer({
  spans, totalDurMs, currentMs, playing, speed,
  onPlay, onPause, onStop, onJumpEnd, onSeek, onSetSpeed,
}) {
  const pct = Math.max(0, Math.min(100, (currentMs / Math.max(1, totalDurMs)) * 100));

  // Translate a click on the scrubber track to an ms time.
  const onTrackClick = (e) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const ratio = (e.clientX - rect.left) / rect.width;
    onSeek(ratio * totalDurMs);
  };
  const onTrackDrag = (e) => {
    if (e.buttons !== 1) return;
    onTrackClick(e);
  };

  return (
    <div className="rounded-xl border border-border bg-card px-4 py-3 flex items-center gap-4 flex-wrap">
      <div className="flex items-center gap-1">
        <Button variant="outline" size="icon" className="h-8 w-8" onClick={onStop} title="Rewind to start">
          <SkipBack className="h-3.5 w-3.5" />
        </Button>
        {playing ? (
          <Button size="icon" className="h-9 w-9" onClick={onPause} title="Pause">
            <Pause className="h-4 w-4" />
          </Button>
        ) : (
          <Button size="icon" className="h-9 w-9" onClick={onPlay} title="Play">
            <Play className="h-4 w-4" />
          </Button>
        )}
        <Button variant="outline" size="icon" className="h-8 w-8" onClick={onJumpEnd} title="Jump to end">
          <SkipForward className="h-3.5 w-3.5" />
        </Button>
      </div>

      {/* Scrubber — click or drag. Markers show where each span starts. */}
      <div className="flex-1 min-w-[240px]">
        <div
          role="slider"
          aria-valuenow={Math.round(currentMs)}
          aria-valuemin={0}
          aria-valuemax={Math.round(totalDurMs)}
          className="relative h-8 cursor-pointer select-none"
          onClick={onTrackClick}
          onMouseMove={onTrackDrag}
        >
          {/* base rail */}
          <div className="absolute left-0 right-0 top-1/2 -translate-y-1/2 h-1.5 rounded-full bg-muted overflow-hidden">
            {/* elapsed fill */}
            <div
              className="absolute inset-y-0 left-0 rounded-full bg-primary/70 transition-[width] duration-75"
              style={{ width: `${pct}%` }}
            />
          </div>
          {/* span start markers — colored ticks so you can feel the shape of the run */}
          {spans.filter(s => s.parentId).map(s => {
            const left = Math.max(0, Math.min(100, (s.startMs / Math.max(1, totalDurMs)) * 100));
            const meta = KIND_META[s.kind] || KIND_META.agent;
            return (
              <span
                key={s.id}
                className="absolute top-1 h-6 w-0.5 opacity-60 pointer-events-none"
                style={{ left: `${left}%`, background: meta.color }}
              />
            );
          })}
          {/* playhead */}
          <div
            className="absolute top-0 bottom-0 w-3 -translate-x-1/2 pointer-events-none"
            style={{ left: `${pct}%` }}
          >
            <div className="absolute inset-x-1 top-1/2 -translate-y-1/2 h-3 w-1 bg-primary rounded-full shadow" />
            <div className="absolute inset-0 rounded-full bg-primary/20 blur-sm" />
          </div>
        </div>
      </div>

      {/* elapsed / total */}
      <div className="font-mono text-[12px] tabular-nums text-muted-foreground whitespace-nowrap">
        {fmtMs(currentMs)} <span className="text-muted-foreground/50">/</span> {fmtMs(totalDurMs)}
      </div>

      {/* speed */}
      <div className="flex items-center gap-2">
        <span className="text-[10.5px] uppercase tracking-[0.15em] font-mono text-muted-foreground">speed</span>
        <Select value={String(speed)} onValueChange={(v) => onSetSpeed(Number(v))}>
          <SelectTrigger className="h-7 w-20 text-[12px]"><SelectValue /></SelectTrigger>
          <SelectContent>
            {[0.5, 1, 2, 5, 10].map(s => <SelectItem key={s} value={String(s)}>{s}×</SelectItem>)}
          </SelectContent>
        </Select>
      </div>
    </div>
  );
}
