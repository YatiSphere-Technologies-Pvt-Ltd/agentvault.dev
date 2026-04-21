'use client';

import { useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { KIND_META } from '../_traces';
import { fmtMs, spanProgress } from './_replay';
import { IOView } from './SpanRenderers';

export default function SpanDetail({ span, currentMs }) {
  const [tab, setTab] = useState('output');
  if (!span) {
    return (
      <div className="p-6 text-center">
        <div className="text-[13px] font-medium text-foreground">No span selected</div>
        <div className="mt-1 text-[11.5px] text-muted-foreground">Click a bar or tree row to inspect.</div>
      </div>
    );
  }
  const kind = KIND_META[span.kind] || KIND_META.agent;
  const { state } = spanProgress(span, currentMs ?? span.startMs + span.durMs);
  const stateTone = state === 'pending' ? 'text-muted-foreground'
                  : state === 'running' ? 'text-primary'
                  : 'text-muted-foreground';

  return (
    <div className="flex flex-col h-full min-h-0">
      {/* header */}
      <div className="px-4 py-3 border-b border-border">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="h-1.5 w-1.5 rounded-full" style={{ background: kind.color }} />
          <Badge variant="outline" className="text-[9.5px]">{kind.label}</Badge>
          <span className="font-mono text-[11px] text-muted-foreground">{span.id}</span>
          {span.status === 'error' && <Badge variant="destructive" className="text-[9.5px]">error</Badge>}
          <span className={`ml-auto inline-flex items-center gap-1 text-[9.5px] font-mono uppercase tracking-[0.14em] ${stateTone}`}>
            {state === 'running' && <span className="h-1 w-1 rounded-full bg-primary animate-pulse" />}
            {state}
          </span>
        </div>
        <div className="mt-1.5 text-[14px] font-semibold text-foreground leading-tight">{span.name}</div>
        <div className="mt-1 flex items-center gap-3 text-[10.5px] font-mono text-muted-foreground">
          <span>start +{fmtMs(span.startMs)}</span>
          <span>·</span>
          <span>dur {fmtMs(span.durMs)}</span>
        </div>
      </div>

      {/* tabs */}
      <Tabs value={tab} onValueChange={setTab} className="flex-1 min-h-0 flex flex-col">
        <div className="px-4 pt-2 shrink-0">
          <TabsList className="h-8 bg-muted/60">
            <TabsTrigger value="output"     className="text-[11.5px]">Output</TabsTrigger>
            <TabsTrigger value="input"      className="text-[11.5px]">Input</TabsTrigger>
            <TabsTrigger value="attributes" className="text-[11.5px]">Attributes</TabsTrigger>
            <TabsTrigger value="logs"       className="text-[11.5px]">Logs</TabsTrigger>
          </TabsList>
        </div>
        <div className="flex-1 min-h-0 overflow-y-auto px-4 py-3">
          <TabsContent value="output">
            {state === 'pending' ? (
              <EmptyHint>Not produced yet — span hasn&apos;t started in replay.</EmptyHint>
            ) : (
              <IOView span={span} which="output" currentMs={currentMs} />
            )}
          </TabsContent>
          <TabsContent value="input">
            <IOView span={span} which="input" currentMs={currentMs} />
          </TabsContent>
          <TabsContent value="attributes">
            <AttrTable attrs={span.attrs} />
          </TabsContent>
          <TabsContent value="logs">
            <Logs items={span.logs || []} currentMs={currentMs} spanStartMs={span.startMs} />
          </TabsContent>
        </div>
      </Tabs>
    </div>
  );
}

function AttrTable({ attrs }) {
  const entries = Object.entries(attrs || {});
  if (entries.length === 0) return <EmptyHint>No attributes.</EmptyHint>;
  return (
    <dl className="divide-y divide-border/60 border border-border rounded-lg">
      {entries.map(([k, v]) => (
        <div key={k} className="grid grid-cols-[minmax(140px,200px)_1fr] gap-3 px-3 py-2">
          <dt className="text-[10.5px] uppercase tracking-[0.14em] font-mono text-muted-foreground truncate">{k}</dt>
          <dd className="text-[12px] font-mono text-foreground break-all">{renderValue(v)}</dd>
        </div>
      ))}
    </dl>
  );
}

function renderValue(v) {
  if (v == null) return '—';
  if (typeof v === 'number') {
    if (Number.isFinite(v) && v >= 1000) return v.toLocaleString();
    return String(v);
  }
  if (typeof v === 'boolean') return v ? 'true' : 'false';
  return String(v);
}

function Logs({ items, currentMs, spanStartMs }) {
  if (!items.length) return <EmptyHint>No log lines.</EmptyHint>;
  return (
    <ul className="space-y-1 font-mono text-[11.5px]">
      {items.map((l, i) => {
        const absMs = (spanStartMs || 0) + (l.at || 0);
        const reached = currentMs == null || currentMs >= absMs;
        return (
          <li key={i} className={`flex items-baseline gap-2 ${reached ? '' : 'opacity-40'}`}>
            <span className="text-muted-foreground tabular-nums w-14">+{l.at}ms</span>
            <span className={`uppercase text-[9.5px] tracking-[0.14em] w-10 ${
              l.level === 'error' ? 'text-destructive' :
              l.level === 'warn'  ? 'text-amber-600 dark:text-amber-400' :
              l.level === 'debug' ? 'text-muted-foreground' :
              'text-foreground'
            }`}>{l.level}</span>
            <span className="text-foreground break-all">{l.msg}</span>
          </li>
        );
      })}
    </ul>
  );
}

function EmptyHint({ children }) {
  return <div className="text-[12px] text-muted-foreground italic">{children}</div>;
}
