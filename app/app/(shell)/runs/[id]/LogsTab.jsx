'use client';

import { useMemo, useState } from 'react';
import { Search } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { KIND_META } from '../_traces';
import { fmtMs } from './_replay';

/* LogsTab
   -------
   Flatten the per-span log lines into a single time-ordered stream so the
   operator can scan the whole run at once, filter by level, and search by
   substring. Each line shows the absolute offset, level, span kind + name,
   and the message. */

const LEVEL_TONE = {
  error: 'text-destructive',
  warn:  'text-amber-600 dark:text-amber-400',
  info:  'text-foreground',
  debug: 'text-muted-foreground',
};

export default function LogsTab({ trace }) {
  const [level, setLevel] = useState('all');
  const [q, setQ] = useState('');

  const lines = useMemo(() => {
    const out = [];
    for (const s of trace.spans) {
      for (const l of s.logs || []) {
        out.push({
          absMs: (s.startMs || 0) + (l.at || 0),
          level: l.level || 'info',
          msg:   l.msg,
          spanId:   s.id,
          spanName: s.name,
          spanKind: s.kind,
        });
      }
    }
    return out.sort((a, b) => a.absMs - b.absMs);
  }, [trace]);

  const filtered = useMemo(() => {
    const ql = q.trim().toLowerCase();
    return lines.filter(l => {
      if (level !== 'all' && l.level !== level) return false;
      if (ql && !`${l.msg} ${l.spanName} ${l.spanId}`.toLowerCase().includes(ql)) return false;
      return true;
    });
  }, [lines, level, q]);

  const counts = useMemo(() => {
    const c = { all: lines.length, error: 0, warn: 0, info: 0, debug: 0 };
    for (const l of lines) c[l.level] = (c[l.level] || 0) + 1;
    return c;
  }, [lines]);

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3 flex-wrap">
        <div className="relative w-full max-w-xs">
          <Search className="h-3.5 w-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search log lines…"
            className="pl-8 h-8 text-[12.5px]"
          />
        </div>
        <Tabs value={level} onValueChange={setLevel}>
          <TabsList className="h-8">
            <TabsTrigger value="all"   className="text-[11.5px]">All <span className="ml-1.5 text-[10px] font-mono opacity-70">{counts.all}</span></TabsTrigger>
            <TabsTrigger value="error" className="text-[11.5px]">Error <span className="ml-1.5 text-[10px] font-mono opacity-70">{counts.error}</span></TabsTrigger>
            <TabsTrigger value="warn"  className="text-[11.5px]">Warn <span className="ml-1.5 text-[10px] font-mono opacity-70">{counts.warn}</span></TabsTrigger>
            <TabsTrigger value="info"  className="text-[11.5px]">Info <span className="ml-1.5 text-[10px] font-mono opacity-70">{counts.info}</span></TabsTrigger>
            <TabsTrigger value="debug" className="text-[11.5px]">Debug <span className="ml-1.5 text-[10px] font-mono opacity-70">{counts.debug}</span></TabsTrigger>
          </TabsList>
        </Tabs>
        <span className="ml-auto text-[11px] font-mono text-muted-foreground tabular-nums">
          {filtered.length} of {lines.length} lines
        </span>
      </div>

      <div className="rounded-xl border border-border bg-card overflow-hidden">
        {filtered.length === 0 ? (
          <div className="p-6 text-center text-[12.5px] text-muted-foreground">No log lines match.</div>
        ) : (
          <ul className="divide-y divide-border font-mono text-[11.5px]">
            {filtered.map((l, i) => {
              const meta = KIND_META[l.spanKind] || KIND_META.agent;
              return (
                <li key={`${l.spanId}-${i}`} className="px-4 py-2 grid grid-cols-[80px_60px_1fr] gap-3 items-baseline">
                  <span className="tabular-nums text-muted-foreground">+{fmtMs(l.absMs)}</span>
                  <span className={`uppercase text-[10px] tracking-wider font-medium ${LEVEL_TONE[l.level] || LEVEL_TONE.info}`}>
                    {l.level}
                  </span>
                  <div className="min-w-0">
                    <div className="text-foreground break-words">{l.msg}</div>
                    <div className="mt-0.5 flex items-center gap-1.5 text-[10.5px] text-muted-foreground">
                      <span className="h-1 w-1 rounded-full" style={{ background: meta.color }} />
                      <span>{meta.label}</span>
                      <span>·</span>
                      <span className="truncate">{l.spanName}</span>
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}
