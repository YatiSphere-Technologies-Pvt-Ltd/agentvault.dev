'use client';

import Link from 'next/link';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { ArrowLeft, Network, Play, Rocket, Share2 } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { useAgent } from '../_store';
import { AgentIcon } from '../_Icon';

import OverviewTab      from './_tabs/OverviewTab';
import ModelTab         from './_tabs/ModelTab';
import KnowledgeTab     from './_tabs/KnowledgeTab';
import ToolsTab         from './_tabs/ToolsTab';
import MemoryTab        from './_tabs/MemoryTab';
import OrchestrationTab from './_tabs/OrchestrationTab';
import GuardrailsTab    from './_tabs/GuardrailsTab';
import TriggersTab      from './_tabs/TriggersTab';
import EvalsTab         from './_tabs/EvalsTab';
import ObservabilityTab from './_tabs/ObservabilityTab';
import DeployTab        from './_tabs/DeployTab';

const ALL_TABS = [
  { v: 'overview',      label: 'Overview' },
  { v: 'model',         label: 'Model' },
  { v: 'knowledge',     label: 'Knowledge' },
  { v: 'tools',         label: 'Tools' },
  { v: 'memory',        label: 'Memory' },
  { v: 'orchestration', label: 'Orchestration' },
  { v: 'guardrails',    label: 'Guardrails' },
  { v: 'triggers',      label: 'Triggers' },
  { v: 'evals',         label: 'Evals' },
  { v: 'observability', label: 'Observability' },
  { v: 'deploy',        label: 'Deploy' },
];

// Mode → which tab IDs are visible. Same agent in localStorage; we just hide
// the ones the chosen persona doesn't need to touch.
const TABS_BY_MODE = {
  simple:   ['overview', 'model', 'knowledge', 'tools', 'triggers', 'observability', 'deploy'],
  advanced: ALL_TABS.map(t => t.v),
  admin:    ['overview', 'triggers', 'guardrails', 'observability', 'deploy'],
};

const STATUS_VARIANT = { published: 'default', draft: 'secondary', deprecated: 'outline' };
const ENV_TONE = {
  prod:    'bg-(--brand-teal)/10 text-brand-teal border-(--brand-teal)/35',
  staging: 'bg-primary/10 text-primary border-primary/35',
  dev:     'bg-muted text-muted-foreground border-border',
};

export default function AgentDetailPage() {
  const { id } = useParams();
  const router = useRouter();
  const search = useSearchParams();
  const tab = search.get('tab') || 'overview';

  const { agent, hydrated, patch } = useAgent(id);

  // Visible tab set is derived from the agent's mode; if the URL points at a tab
  // that isn't visible (e.g. ?tab=memory while in simple mode), fall back to overview.
  const mode = agent?.mode || 'simple';
  const visibleIds = TABS_BY_MODE[mode] || TABS_BY_MODE.advanced;
  const visibleTabs = ALL_TABS.filter(t => visibleIds.includes(t.v));
  const safeTab = visibleIds.includes(tab) ? tab : 'overview';

  const setTab = (v) => {
    const p = new URLSearchParams(search.toString());
    p.set('tab', v);
    router.replace(`/app/agents/${id}?${p.toString()}`);
  };

  if (!hydrated) {
    return (
      <div className="max-w-7xl mx-auto px-6 py-10 text-[13px] text-muted-foreground">
        Loading agent…
      </div>
    );
  }
  if (!agent) {
    return (
      <div className="max-w-3xl mx-auto px-6 py-10">
        <Link href="/app/agents" className="text-[12px] text-muted-foreground hover:text-foreground inline-flex items-center gap-1.5">
          <ArrowLeft className="h-3.5 w-3.5" /> All agents
        </Link>
        <h1 className="mt-4 text-[24px] font-semibold">Agent not found</h1>
        <p className="mt-2 text-[13.5px] text-muted-foreground">
          No agent with id <span className="font-mono">{id}</span>. It may have been deleted.
        </p>
        <Button className="mt-5" render={<Link href="/app/agents" />}>Back to agents</Button>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-10 py-6 sm:py-8">
      {/* Breadcrumb */}
      <Link href="/app/agents" className="text-[12px] text-muted-foreground hover:text-foreground inline-flex items-center gap-1.5">
        <ArrowLeft className="h-3.5 w-3.5" /> All agents
      </Link>

      {/* Header */}
      <div className="mt-4 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div className="flex items-start gap-3 min-w-0">
          <div className="h-11 w-11 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0">
            <AgentIcon name={agent.icon} size={20} />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-[22px] font-semibold tracking-tight truncate">{agent.name}</h1>
              <Badge variant={STATUS_VARIANT[agent.version.status] || 'secondary'}>
                v{agent.version.current} · {agent.version.status}
              </Badge>
              <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded border text-[10.5px] font-mono ${ENV_TONE[agent.environment]}`}>
                {agent.environment}
              </span>
              <Badge variant="outline" className="text-[9.5px]">{agent.mode || 'simple'} mode</Badge>
            </div>
            <div className="text-[12px] text-muted-foreground font-mono truncate">
              {agent.id} · {agent.category} · {agent.team}
            </div>
            {agent.description && (
              <div className="mt-1 text-[13px] text-foreground/80 max-w-prose">{agent.description}</div>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <Button variant="outline" size="sm"><Share2 className="h-3.5 w-3.5" /> Share</Button>
          <Button variant="outline" size="sm" render={<Link href={`/app/studio?agent=${agent.id}`} />}>
            <Network className="h-3.5 w-3.5" /> View in Studio
          </Button>
          <Button variant="outline" size="sm"><Play className="h-3.5 w-3.5" /> Test in playground</Button>
          <Button size="sm" onClick={() => setTab('deploy')}><Rocket className="h-3.5 w-3.5" /> Promote</Button>
        </div>
      </div>

      {/* Tabs — filtered by agent.mode */}
      <Tabs value={safeTab} onValueChange={setTab} className="mt-6">
        <div className="overflow-x-auto -mx-4 px-4 sm:mx-0 sm:px-0">
          <TabsList className="h-9 bg-muted/60">
            {visibleTabs.map(t => (
              <TabsTrigger key={t.v} value={t.v} className="text-[12.5px]">
                {t.label}
              </TabsTrigger>
            ))}
          </TabsList>
        </div>
        {(agent.mode || 'simple') !== 'advanced' && (
          <div className="mt-2 text-[11.5px] text-muted-foreground">
            {visibleTabs.length} of {ALL_TABS.length} sections shown for{' '}
            <span className="font-mono">{agent.mode || 'simple'}</span> mode.{' '}
            <button
              className="text-primary hover:underline underline-offset-2"
              onClick={() => patch('mode', 'advanced')}
            >
              Switch to advanced
            </button>
            {' '}to see everything.
          </div>
        )}

        <TabsContent value="overview"      className="mt-5"><OverviewTab      agent={agent} patch={patch} /></TabsContent>
        <TabsContent value="model"         className="mt-5"><ModelTab         agent={agent} patch={patch} /></TabsContent>
        <TabsContent value="knowledge"     className="mt-5"><KnowledgeTab     agent={agent} patch={patch} /></TabsContent>
        <TabsContent value="tools"         className="mt-5"><ToolsTab         agent={agent} patch={patch} /></TabsContent>
        <TabsContent value="memory"        className="mt-5"><MemoryTab        agent={agent} patch={patch} /></TabsContent>
        <TabsContent value="orchestration" className="mt-5"><OrchestrationTab agent={agent} patch={patch} /></TabsContent>
        <TabsContent value="guardrails"    className="mt-5"><GuardrailsTab    agent={agent} patch={patch} /></TabsContent>
        <TabsContent value="triggers"      className="mt-5"><TriggersTab      agent={agent} patch={patch} /></TabsContent>
        <TabsContent value="evals"         className="mt-5"><EvalsTab         agent={agent} patch={patch} /></TabsContent>
        <TabsContent value="observability" className="mt-5"><ObservabilityTab agent={agent} patch={patch} /></TabsContent>
        <TabsContent value="deploy"        className="mt-5"><DeployTab        agent={agent} patch={patch} /></TabsContent>
      </Tabs>
    </div>
  );
}
