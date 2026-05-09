'use client';

import { use, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter, notFound } from 'next/navigation';
import {
  ChevronLeft, Wrench, Trash2, ExternalLink,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { useTools } from '../_toolsStore';
import {
  RISK_TONE, STATUS_TONE, SIDE_EFFECT_TONE,
  originLabel, sideEffectLabel,
} from '../_toolsCatalog';
import { providerCatalogFor } from '../_providerCatalog';
import OverviewTab   from './OverviewTab';
import SchemaTab     from './SchemaTab';
import PoliciesTab   from './PoliciesTab';
import UsageTab      from './UsageTab';
import VersionsTab   from './VersionsTab';

export default function ToolDetailPage({ params }) {
  const { id } = use(params);
  const decodedId = decodeURIComponent(id);
  const router = useRouter();
  const { list, hydrated, remove } = useTools();
  const tool = useMemo(() => list.find(t => t.id === decodedId) || null, [list, decodedId]);
  const [tab, setTab] = useState('overview');

  if (!hydrated) {
    return (
      <div className="max-w-7xl mx-auto px-6 py-10 text-[13px] text-muted-foreground">
        Loading tool…
      </div>
    );
  }

  if (!tool) notFound();

  const supportsProviders = !!providerCatalogFor(tool.id);
  const findings = (tool.findings7d?.block || 0) + (tool.findings7d?.approval || 0) + (tool.findings7d?.warn || 0);

  const onDelete = () => {
    const ok = confirm(`Delete tool "${tool.name}"? This cannot be undone.`);
    if (!ok) return;
    remove(tool.id);
    router.push('/app/tools');
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-10 py-7">
      <Link
        href="/app/tools"
        className="text-[12px] text-muted-foreground hover:text-foreground inline-flex items-center gap-1.5"
      >
        <ChevronLeft className="h-3.5 w-3.5" /> All tools
      </Link>

      {/* ── Header ── */}
      <div className="mt-4 flex items-start justify-between gap-4 flex-wrap">
        <div className="min-w-0 max-w-3xl">
          <div className="flex items-center gap-2.5 flex-wrap">
            <div className="h-9 w-9 rounded-md bg-muted/40 flex items-center justify-center shrink-0">
              <Wrench className="h-4 w-4 text-muted-foreground" />
            </div>
            <h2 className="text-[22px] font-semibold tracking-tight text-foreground leading-tight">
              {tool.name}
            </h2>
            <Pill tone={tool.status === 'active' ? STATUS_TONE.active : STATUS_TONE[tool.status]}>
              {STATUS_TONE[tool.status]?.label || tool.status}
            </Pill>
            <Pill tone={RISK_TONE[tool.risk]}>Risk · {RISK_TONE[tool.risk]?.label || tool.risk}</Pill>
            <Pill tone={SIDE_EFFECT_TONE[tool.sideEffect]}>{sideEffectLabel(tool.sideEffect)}</Pill>
          </div>
          <div className="mt-2 text-[12px] text-muted-foreground font-mono">
            {tool.id} · v{tool.version} · {originLabel(tool.origin)}
            {tool.vendor && ` · ${tool.vendor}`}
          </div>
          <p className="mt-3 text-[13.5px] text-foreground/85 max-w-200 leading-relaxed">{tool.description}</p>
          {tool.deprecation && (
            <div className="mt-3 inline-flex items-center gap-2 px-3 py-2 rounded-md border border-accent/40 bg-accent/10 text-accent text-[12px] font-medium">
              <span>Deprecated since {tool.deprecation.since}</span>
              {tool.deprecation.replacedBy && (
                <span>· use <Link href={`/app/tools/${encodeURIComponent(tool.deprecation.replacedBy)}`} className="underline hover:brightness-110">{tool.deprecation.replacedBy}</Link></span>
              )}
              {tool.deprecation.removeBy && <span>· removed {tool.deprecation.removeBy}</span>}
            </div>
          )}
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {tool.mcpServerId && (
            <Button variant="outline" size="sm" render={
              <Link href={`/app/mcp/${tool.mcpServerId}`}>
                <ExternalLink className="h-3.5 w-3.5" /> MCP server
              </Link>
            } />
          )}
          <Button
            variant="outline"
            size="sm"
            onClick={onDelete}
            className="text-destructive border-destructive/40 hover:bg-destructive/10 hover:text-destructive"
          >
            <Trash2 className="h-3.5 w-3.5" /> Delete
          </Button>
        </div>
      </div>

      {/* ── Stat strip ── */}
      <div className="mt-5 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        <Stat label="Calls · 7d"  value={(tool.usage7d?.calls || 0).toLocaleString()} />
        <Stat label="Error rate"  value={`${((tool.usage7d?.errorRate || 0) * 100).toFixed(2)}%`}
              tone={(tool.usage7d?.errorRate || 0) > 0.05 ? 'bad' : (tool.usage7d?.errorRate || 0) > 0.01 ? 'warn' : 'ok'} />
        <Stat label="p50 latency" value={tool.usage7d?.p50LatencyMs ? `${tool.usage7d.p50LatencyMs} ms` : '—'} />
        <Stat label="Used by"     value={(tool.usage7d?.callingAgents || []).length} sub="agents" />
        <Stat label="Findings · 7d" value={findings}
              tone={findings === 0 ? 'ok' : findings >= 5 ? 'bad' : 'warn'} />
        <Stat label="Providers"   value={(tool.providers || []).length || (supportsProviders ? 0 : '—')}
              sub={supportsProviders ? '' : 'n/a'} />
      </div>

      {/* ── Tabs ── */}
      <Tabs value={tab} onValueChange={setTab} className="mt-6">
        <TabsList className="h-9 bg-muted/40">
          <TabsTrigger value="overview"  className="text-[12.5px]">Overview</TabsTrigger>
          <TabsTrigger value="schema"    className="text-[12.5px]">Schema</TabsTrigger>
          <TabsTrigger value="policies"  className="text-[12.5px]">Policies</TabsTrigger>
          <TabsTrigger value="usage"     className="text-[12.5px]">Usage</TabsTrigger>
          <TabsTrigger value="versions"  className="text-[12.5px]">Versions</TabsTrigger>
        </TabsList>

        <TabsContent value="overview"  className="mt-5"><OverviewTab tool={tool} /></TabsContent>
        <TabsContent value="schema"    className="mt-5"><SchemaTab tool={tool} /></TabsContent>
        <TabsContent value="policies"  className="mt-5"><PoliciesTab tool={tool} /></TabsContent>
        <TabsContent value="usage"     className="mt-5"><UsageTab tool={tool} /></TabsContent>
        <TabsContent value="versions"  className="mt-5"><VersionsTab tool={tool} /></TabsContent>
      </Tabs>
    </div>
  );
}

function Pill({ tone, children }) {
  if (!tone) return <span className="text-[11px] text-muted-foreground">{children}</span>;
  return (
    <span
      className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md border text-[11px] font-medium"
      style={{ borderColor: tone.color + '55', color: tone.color, background: tone.color + '12' }}
    >
      <span className="h-1.5 w-1.5 rounded-full" style={{ background: tone.color }} />
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
        {sub && <div className="text-[11px] text-muted-foreground truncate">{sub}</div>}
      </div>
    </div>
  );
}
