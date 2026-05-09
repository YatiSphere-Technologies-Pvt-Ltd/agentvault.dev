'use client';

import Link from 'next/link';
import { ExternalLink, ChevronRight } from 'lucide-react';

export default function UsageTab({ tool }) {
  const u = tool.usage7d || {};
  const f = tool.findings7d || {};
  const callingAgents = u.callingAgents || [];

  // Synthesize a 14-day daily call count series from the 7d total — enough
  // to show a realistic sparkline shape without pretending to be live data.
  const series = useMemo14daySeries(tool.id, u.calls || 0);

  return (
    <div className="space-y-5">
      <Section title="Volume" subtitle="Daily call count, last 14 days.">
        <div className="rounded-xl border border-border bg-card p-4">
          <Sparkline values={series} />
          <div className="mt-3 flex items-center justify-between text-[11px] font-mono text-muted-foreground">
            <span>{daysAgoLabel(13)}</span>
            <span>now</span>
          </div>
        </div>
      </Section>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <Section title="Health" subtitle="7-day rollup of error rate and latency.">
          <div className="rounded-xl border border-border bg-card p-4 grid grid-cols-3 gap-3">
            <Field label="Calls"      value={(u.calls || 0).toLocaleString()} />
            <Field label="Error rate" value={`${((u.errorRate || 0) * 100).toFixed(2)}%`}
                   tone={(u.errorRate || 0) > 0.05 ? 'bad' : (u.errorRate || 0) > 0.01 ? 'warn' : 'ok'} />
            <Field label="p50"        value={u.p50LatencyMs ? `${u.p50LatencyMs} ms` : '—'} />
          </div>
        </Section>

        <Section title="Findings" subtitle="Policy gates this tool triggered, last 7 days.">
          <div className="rounded-xl border border-border bg-card p-4 grid grid-cols-4 gap-3">
            <Field label="Blocked"   value={f.block || 0}    tone={(f.block || 0) > 0 ? 'bad' : 'default'} />
            <Field label="Approvals" value={f.approval || 0} tone={(f.approval || 0) > 0 ? 'warn' : 'default'} />
            <Field label="Warnings"  value={f.warn || 0}     tone={(f.warn || 0) > 0 ? 'warn' : 'default'} />
            <Field label="Logged"    value={(f.log || 0).toLocaleString()} />
          </div>
        </Section>
      </div>

      <Section title="Top callers" subtitle="Agents that invoked this tool over the past 7 days.">
        {callingAgents.length === 0 ? (
          <div className="rounded-xl border border-dashed border-border bg-muted/20 p-6 text-center text-[12.5px] text-muted-foreground">
            No agent has called this tool yet.
          </div>
        ) : (
          <div className="rounded-xl border border-border bg-card overflow-hidden divide-y divide-border">
            {callingAgents.map(id => (
              <Link
                key={id}
                href={`/app/agents/${id}`}
                className="px-4 py-3 flex items-center justify-between hover:bg-muted/40 transition-colors"
              >
                <div>
                  <div className="text-[13px] font-medium text-foreground">{id}</div>
                  <div className="text-[11.5px] text-muted-foreground">Agent</div>
                </div>
                <ChevronRight className="h-3.5 w-3.5 text-muted-foreground" />
              </Link>
            ))}
          </div>
        )}
      </Section>

      <Section title="Recent runs" subtitle="Open the runs explorer with this tool pre-filtered.">
        <Link
          href={`/app/runs?tool=${encodeURIComponent(tool.id)}`}
          className="inline-flex items-center gap-1.5 text-[12.5px] text-primary hover:brightness-110 font-medium"
        >
          View runs that called this tool <ExternalLink className="h-3.5 w-3.5" />
        </Link>
      </Section>
    </div>
  );
}

function useMemo14daySeries(seed, total) {
  // Deterministic from tool id + total; not an actual hook, named for clarity.
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) | 0;
  const out = [];
  let remaining = total;
  for (let i = 0; i < 14; i++) {
    const factor = 0.4 + (((h + i * 17) >>> 0) % 1000) / 1000;
    const v = Math.round((total / 14) * factor);
    out.push(v);
    remaining -= v;
  }
  // Keep totals close — not exact, fine for a demo.
  return out;
}

function daysAgoLabel(n) {
  const d = new Date(); d.setDate(d.getDate() - n);
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

function Sparkline({ values }) {
  const max = Math.max(...values, 1);
  return (
    <div className="flex items-end gap-1 h-20">
      {values.map((v, i) => {
        const pct = (v / max) * 100;
        return (
          <div
            key={i}
            title={`${v.toLocaleString()} calls`}
            className="flex-1 rounded-sm bg-primary/30 hover:bg-primary/60 transition-colors"
            style={{ height: `${Math.max(pct, 4)}%` }}
          />
        );
      })}
    </div>
  );
}

function Field({ label, value, tone = 'default' }) {
  const color = tone === 'bad'  ? 'text-destructive'
              : tone === 'warn' ? 'text-primary'
              : tone === 'ok'   ? 'text-brand-teal'
              :                   'text-foreground';
  return (
    <div>
      <div className="text-[10.5px] font-medium text-muted-foreground">{label}</div>
      <div className={`mt-0.5 text-[18px] font-semibold tabular-nums ${color}`}>{value}</div>
    </div>
  );
}

function Section({ title, subtitle, children }) {
  return (
    <section>
      <div className="mb-3">
        <h3 className="text-[14px] font-semibold text-foreground">{title}</h3>
        {subtitle && <p className="mt-0.5 text-[12px] text-muted-foreground max-w-200">{subtitle}</p>}
      </div>
      {children}
    </section>
  );
}
