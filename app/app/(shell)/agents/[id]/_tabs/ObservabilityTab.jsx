'use client';

import Link from 'next/link';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { ExternalLink } from 'lucide-react';
import { Section } from './_shared';

export default function ObservabilityTab({ agent, patch }) {
  const o = agent.observability;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-[1fr_340px] gap-5">
      <div className="space-y-5">
        <Section
          title="Last 30 days"
          description="Headline metrics. Drill into full traces on the Runs page."
          action={
            <Button variant="outline" size="sm" render={<Link href="/app/runs" />}>Open Runs <ExternalLink className="h-3.5 w-3.5" /></Button>
          }
        >
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <Stat label="Tokens"     value={o.tokensMTD.toLocaleString()} tone="fg" />
            <Stat label="Cost"       value={`$${o.costMTD.toFixed(2)}`}    tone="fg" />
            <Stat label="p50 latency" value={`${o.p50MS} ms`}               tone="fg" />
            <Stat label="Error rate"  value={`${(o.errorRate * 100).toFixed(2)}%`} tone={o.errorRate > 0.05 ? 'bad' : 'good'} />
          </div>

          <div className="rounded-lg border border-border p-4 bg-muted/30">
            <div className="text-[10.5px] uppercase tracking-[0.18em] text-muted-foreground font-mono mb-2">
              Cost split by tool
            </div>
            <ul className="space-y-2">
              {[
                ['LLM calls', 0.68],
                ['Tool calls', 0.21],
                ['Retrieval', 0.08],
                ['Human review', 0.03],
              ].map(([label, pct]) => (
                <li key={label} className="grid grid-cols-[120px_1fr_48px] gap-3 items-center">
                  <span className="text-[12px] text-muted-foreground">{label}</span>
                  <div className="h-2 rounded-full bg-muted overflow-hidden">
                    <div className="h-full bg-brand-teal" style={{ width: `${pct * 100}%` }} />
                  </div>
                  <span className="text-[11px] font-mono tabular-nums text-right">{Math.round(pct * 100)}%</span>
                </li>
              ))}
            </ul>
          </div>
        </Section>

        <Section title="Latency percentiles">
          <div className="grid grid-cols-3 gap-3">
            <Stat label="p50" value={`${o.p50MS} ms`} tone="fg" />
            <Stat label="p95" value={`${o.p95MS} ms`} tone="fg" />
            <Stat label="p99" value={`${Math.round(o.p95MS * 1.25)} ms`} tone="fg" />
          </div>
          <div className="text-[11.5px] text-muted-foreground">
            Target budget: p50 &lt; 1s, p95 &lt; 3s. Set SLOs per trigger in the API policy.
          </div>
        </Section>

        <Section
          title="Exports"
          description="Ship telemetry to your existing observability stack."
        >
          <div className="divide-y divide-border border border-border rounded-lg overflow-hidden">
            <ExportRow
              label="OpenTelemetry (OTLP)"
              desc="Push spans to any OTLP-compatible collector."
              enabled={o.exports.otel}
              onCheckedChange={v => patch('observability.exports.otel', v)}
            />
            <ExportRow
              label="Datadog"
              desc="Trace + logs + metric integration."
              enabled={o.exports.datadog}
              onCheckedChange={v => patch('observability.exports.datadog', v)}
            />
            <ExportRow
              label="Splunk"
              desc="HEC endpoint with signed payloads."
              enabled={o.exports.splunk}
              onCheckedChange={v => patch('observability.exports.splunk', v)}
            />
          </div>
        </Section>
      </div>

      <aside className="space-y-5">
        <Section title="Alerts">
          <ul className="text-[12px] text-muted-foreground space-y-2 list-disc pl-4">
            <li>p95 above budget for 10 min → PagerDuty <span className="font-mono text-foreground">oncall-ai</span></li>
            <li>Error rate &gt; 5% for 5 min → Slack <span className="font-mono text-foreground">#ai-alerts</span></li>
            <li>Daily spend &gt; $200 → email the owner</li>
          </ul>
          <Button variant="outline" size="sm">Configure</Button>
        </Section>
        <Section title="Retention">
          <div className="text-[12.5px] text-muted-foreground">
            18 months for traces and runs. Auto-expire older data unless pinned to an eval suite.
          </div>
        </Section>
      </aside>
    </div>
  );
}

function Stat({ label, value, tone }) {
  const color =
    tone === 'bad'  ? 'text-destructive' :
    tone === 'good' ? 'text-brand-teal' :
    'text-foreground';
  return (
    <div className="rounded-lg border border-border p-3">
      <div className="text-[10.5px] uppercase tracking-[0.15em] font-mono text-muted-foreground">{label}</div>
      <div className={`mt-1 text-[18px] font-semibold tabular-nums ${color}`}>{value}</div>
    </div>
  );
}

function ExportRow({ label, desc, enabled, onCheckedChange }) {
  return (
    <div className="flex items-center justify-between p-3">
      <div>
        <div className="text-[13px] font-medium flex items-center gap-2">
          {label}
          {enabled && <Badge variant="outline" className="text-[9.5px]">connected</Badge>}
        </div>
        <div className="text-[11.5px] text-muted-foreground">{desc}</div>
      </div>
      <Switch checked={enabled} onCheckedChange={onCheckedChange} />
    </div>
  );
}
