'use client';

import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useState } from 'react';
import { ArrowLeft, ArrowRight, Check, Plus, Layers, ShieldCheck, Sparkles } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ICONS, MODELS, TOOL_CATALOG } from '../_catalog';
import { useAgents } from '../_store';
import { useSources } from '../../knowledge/_store';
import { AgentIcon } from '../_Icon';
import { templateById } from '../_templates';

/* Resolve a template's mcpTools to the runtime attach-shape using whatever
   is currently in the MCP registry (read straight from localStorage so this
   helper stays synchronous). Tools that reference a server/tool that isn't
   registered get silently dropped. */
function resolveTemplateMcpTools(template) {
  if (!template?.mcpTools?.length) return [];
  let servers = [];
  try { servers = JSON.parse(localStorage.getItem('av-mcp-v1') || '[]'); } catch {}
  const out = [];
  for (const ref of template.mcpTools) {
    const server = servers.find(s => s.id === ref.serverId);
    if (!server) continue;
    const tool = server.tools?.find(t => t.name === ref.toolName);
    if (!tool) continue;
    out.push({
      id: `${server.id}.${tool.name}`,
      source: 'mcp',
      label: `${server.name}: ${tool.name}`,
      desc: tool.description || '',
      icon: 'plug',
      enabled: true,
      requiresApproval: tool.approval || tool.riskLevel === 'high' || server.approvalPolicy === 'always',
      config: { serverId: server.id, serverEndpoint: server.endpoint, toolName: tool.name, riskLevel: tool.riskLevel },
    });
  }
  return out;
}

const MODE_META = {
  simple:   { label: 'Simple builder',     icon: Sparkles,    blurb: 'Identity → model → tools → knowledge.' },
  advanced: { label: 'Advanced builder',   icon: Layers,      blurb: 'Same as Simple — full surface unlocked on the detail page.' },
  admin:    { label: 'Admin / governance', icon: ShieldCheck, blurb: 'Identity + governance posture only.' },
};

// Step IDs map to the rendered step component below.
const STEPS_BY_MODE = {
  simple:   ['identity', 'brain', 'tools', 'attach'],
  advanced: ['identity', 'brain', 'tools', 'attach'],
  admin:    ['identity', 'governance'],
};

const STEP_LABEL = {
  identity:   { label: 'Identity',    hint: 'Name, icon, ownership' },
  brain:      { label: 'Brain',       hint: 'Model + system prompt' },
  tools:      { label: 'Tools',       hint: 'Pick from the catalog' },
  attach:     { label: 'Knowledge',   hint: 'Attach workspace sources' },
  governance: { label: 'Governance',  hint: 'Visibility, environment, ACL' },
};

export default function NewAgentPage() {
  const search = useSearchParams();
  const rawMode = search.get('mode');
  const templateId = search.get('template');
  const template = templateId ? templateById(templateId) : null;

  // Arriving with a template but no mode — skip the mode picker and go straight
  // into the wizard with the template's declared mode.
  const effectiveMode = (rawMode === 'simple' || rawMode === 'advanced' || rawMode === 'admin')
    ? rawMode
    : (template?.mode || null);

  if (!effectiveMode) return <ModeSelection />;
  return <Wizard mode={effectiveMode} template={template} />;
}

function Wizard({ mode, template }) {
  const router = useRouter();
  const { createAgent } = useAgents();

  const steps = STEPS_BY_MODE[mode];

  const [stepIdx, setStepIdx] = useState(0);
  const currentStepId = steps[stepIdx];

  const [identity, setIdentity] = useState(() => template?.identity ? {
    name: template.identity.name || '',
    description: template.identity.description || '',
    icon: template.identity.icon || 'sparkles',
    category: template.identity.category || 'Assistant',
    tags: template.identity.tags || '',
    team: template.identity.team || 'Default team',
    visibility: template.identity.visibility || 'team',
  } : {
    name: '',
    description: '',
    icon: 'sparkles',
    category: 'Assistant',
    tags: '',
    team: 'Default team',
    visibility: 'team',
  });
  const [brain, setBrain] = useState(() => template?.brain ? {
    primary: template.brain.primary || 'claude-3-5-sonnet',
    systemPrompt: template.brain.systemPrompt || '',
    structuredOutput: !!template.brain.structuredOutput,
  } : {
    primary: 'claude-3-5-sonnet',
    systemPrompt: 'You are a helpful enterprise assistant. Be concise and precise.',
    structuredOutput: false,
  });
  // Tools step uses a Set of ids. Templates specify `builtinTools` (from TOOL_CATALOG).
  const [picked, setPicked] = useState(() => new Set(template?.builtinTools || []));
  // Attach step picks workspace knowledge sources.
  const [attachedIds, setAttachedIds] = useState(() => template?.attachedSourceIds || []);
  const [governance, setGovernance] = useState({ owner: 'you@agentvault.io', environment: 'dev' });

  const togglePick = (id) => {
    setPicked(s => { const n = new Set(s); n.has(id) ? n.delete(id) : n.add(id); return n; });
  };

  const canAdvance = (() => {
    switch (currentStepId) {
      case 'identity':   return identity.name.trim().length > 0;
      case 'brain':      return brain.systemPrompt.trim().length > 0;
      case 'tools':      return true;
      case 'attach':     return true;
      case 'governance': return governance.owner.trim().length > 0;
      default:           return true;
    }
  })();

  const finish = () => {
    const agent = createAgent({
      name: identity.name.trim(),
      description: identity.description.trim(),
      icon: identity.icon,
      category: identity.category,
      tags: identity.tags.split(',').map(s => s.trim()).filter(Boolean),
      team: identity.team,
      visibility: identity.visibility,
      mode,
      ...(mode === 'admin' ? { owner: governance.owner.trim(), environment: governance.environment } : {}),
    });
    // For Simple/Advanced, persist the brain + tools + knowledge as a follow-up patch.
    const extras = mode === 'admin' ? null : {
      model: {
        primary: brain.primary,
        fallback: 'gpt-4o-mini',
        temperature: 0.2,
        topP: 1.0,
        maxTokens: 4096,
        stop: [],
        reasoningEffort: 'medium',
        systemPrompt: brain.systemPrompt,
        structuredOutput: { enabled: brain.structuredOutput, schema: '{\n  "type": "object"\n}' },
      },
      tools: {
        attached: [
          ...Array.from(picked).map(id => ({
            id, enabled: true,
            requiresApproval: TOOL_CATALOG.find(t => t.id === id)?.risk === 'high',
          })),
          ...resolveTemplateMcpTools(template),
        ],
        rateLimit: { perMinute: 60, timeoutMs: 30000, retries: 2 },
      },
      knowledge: {
        attachedSourceIds: attachedIds,
        retrieval: { topK: 8, threshold: 0.25, reranker: true, hybrid: true },
      },
    };
    if (extras) {
      try {
        const raw = localStorage.getItem('av-agents-v3');
        const list = raw ? JSON.parse(raw) : [];
        const idx = list.findIndex(a => a.id === agent.id);
        if (idx !== -1) {
          list[idx] = { ...list[idx], ...extras, updatedAt: new Date().toISOString() };
          localStorage.setItem('av-agents-v3', JSON.stringify(list));
        }
      } catch {}
    }
    router.push(`/app/agents/${agent.id}`);
  };

  const ModeIcon = MODE_META[mode].icon;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-10 py-6 sm:py-10">
      <Link href="/app/agents" className="text-[12px] text-muted-foreground hover:text-foreground inline-flex items-center gap-1.5">
        <ArrowLeft className="h-3.5 w-3.5" /> All agents
      </Link>

      <div className="mt-4 flex items-start gap-3">
        <div className="h-10 w-10 rounded-md bg-primary/10 text-primary flex items-center justify-center shrink-0 mt-1">
          <ModeIcon className="h-5 w-5" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <div className="text-[10.5px] uppercase tracking-[0.2em] text-muted-foreground font-mono">New agent</div>
            <Badge variant="outline" className="text-[9.5px]">{MODE_META[mode].label}</Badge>
            {template && (
              <Badge className="text-[9.5px] bg-primary/10 text-primary border border-primary/30">
                Template · {template.name}
              </Badge>
            )}
          </div>
          <h1 className="mt-1 text-[28px] font-semibold tracking-tight">
            {template ? `Create from "${template.name}"` : 'Create a new agent'}
          </h1>
          <p className="mt-1 text-[13.5px] text-muted-foreground">
            {template ? <>{template.blurb} <Link href="/app/agents/new" className="underline-offset-2 hover:underline text-primary">Start from scratch</Link></>
                      : <>{MODE_META[mode].blurb} <Link href="/app/agents/new" className="underline-offset-2 hover:underline text-primary">Change mode</Link></>}
          </p>
        </div>
      </div>

      {/* Progress rail */}
      <ol className={`mt-7 grid gap-3`} style={{ gridTemplateColumns: `repeat(${steps.length}, minmax(0, 1fr))` }}>
        {steps.map((sid, i) => {
          const state = stepIdx > i ? 'done' : stepIdx === i ? 'active' : 'future';
          const meta = STEP_LABEL[sid];
          return (
            <li
              key={sid}
              className={`relative rounded-lg border p-3 ${
                state === 'active' ? 'border-primary/50 bg-primary/5'
                : state === 'done' ? 'border-border bg-card'
                : 'border-dashed border-border bg-muted/30'
              }`}
            >
              <div className="flex items-center gap-2">
                <div className={`h-6 w-6 rounded-full flex items-center justify-center text-[11px] font-medium ${
                  state === 'done'    ? 'bg-brand-teal text-white'
                  : state === 'active' ? 'bg-primary text-primary-foreground'
                  : 'bg-muted text-muted-foreground'
                }`}>
                  {state === 'done' ? <Check className="h-3.5 w-3.5" /> : i + 1}
                </div>
                <div className="min-w-0">
                  <div className="text-[12px] font-medium leading-tight truncate">{meta.label}</div>
                  <div className="text-[10.5px] text-muted-foreground truncate">{meta.hint}</div>
                </div>
              </div>
            </li>
          );
        })}
      </ol>

      <div className="mt-6">
        {currentStepId === 'identity'   && <StepIdentity   value={identity}   onChange={setIdentity} />}
        {currentStepId === 'brain'      && <StepBrain      value={brain}      onChange={setBrain} />}
        {currentStepId === 'tools'      && <StepTools      picked={picked}    onToggle={togglePick} />}
        {currentStepId === 'attach'     && <StepAttachSources attachedIds={attachedIds} setAttachedIds={setAttachedIds} />}
        {currentStepId === 'governance' && <StepGovernance value={governance} onChange={setGovernance} />}
      </div>

      <div className="mt-7 flex items-center justify-between gap-3">
        <Button
          variant="ghost"
          onClick={() => stepIdx === 0 ? router.push('/app/agents') : setStepIdx(s => s - 1)}
        >
          <ArrowLeft className="h-4 w-4" />
          {stepIdx === 0 ? 'Cancel' : 'Back'}
        </Button>
        {stepIdx < steps.length - 1 ? (
          <Button disabled={!canAdvance} onClick={() => setStepIdx(s => s + 1)}>
            Continue
            <ArrowRight className="h-4 w-4" />
          </Button>
        ) : (
          <Button onClick={finish} disabled={!canAdvance}>
            Create agent
            <ArrowRight className="h-4 w-4" />
          </Button>
        )}
      </div>
    </div>
  );
}

/* ============================================================
   ModeSelection — rendered when /app/agents/new has no ?mode=
   ============================================================ */

const MODES = [
  {
    id: 'simple',
    icon: Sparkles,
    title: 'Simple',
    pitch: 'Identity, model, prompt, tools, knowledge. Covers most agents.',
    audience: 'Builders · PMs · domain experts',
    tta: '5 min',
    includes: ['Identity + ownership', 'Model + system prompt', 'Knowledge sources', 'Tools from catalog', 'Triggers + chat'],
  },
  {
    id: 'advanced',
    icon: Layers,
    title: 'Advanced',
    pitch: 'Everything Simple has, plus memory, sub-agents, guardrails, and evals.',
    audience: 'Platform engineers · agent leads',
    tta: '30 min',
    includes: ['Everything in Simple', 'Memory + inspector', 'Sub-agents + orchestration', 'Guardrail rules', 'Evals + A/B'],
    recommended: true,
  },
  {
    id: 'admin',
    icon: ShieldCheck,
    title: 'Admin',
    pitch: 'Configure policy posture without touching the prompt or tools.',
    audience: 'Risk · Security · Ops',
    tta: '10 min',
    includes: ['Identity + ownership', 'Visibility + environment', 'Guardrails posture', 'Triggers (on/off)', 'Observability + deploy'],
  },
];

function ModeSelection() {
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-10 py-8 sm:py-12">
      <Link href="/app/agents" className="text-[12px] text-muted-foreground hover:text-foreground inline-flex items-center gap-1.5">
        <ArrowLeft className="h-3.5 w-3.5" /> All agents
      </Link>

      <div className="mt-6 max-w-3xl">
        <div className="text-[10.5px] uppercase tracking-[0.2em] text-muted-foreground font-mono">New agent</div>
        <h1 className="mt-1 text-[32px] sm:text-[36px] font-semibold tracking-tight leading-tight">
          Pick a path.
        </h1>
        <p className="mt-2 text-[14px] text-muted-foreground leading-relaxed">
          Three ways to set up an agent — same runtime under the hood, different surface area to keep the wizard short. You can switch later from the agent's Overview tab.
        </p>
      </div>

      {/* Lane progression: Simple → Advanced  ··  Admin */}
      <div className="mt-10 grid grid-cols-1 lg:grid-cols-[1fr_auto_1fr_auto_1fr] gap-5 items-stretch">
        <ModeCard mode={MODES[0]} accent="brand-teal" />

        {/* Capability arrow: Simple → Advanced */}
        <ProgressionArrow label="more capability" />

        <ModeCard mode={MODES[1]} accent="primary" />

        {/* Persona divider before Admin */}
        <PersonaDivider />

        <ModeCard mode={MODES[2]} accent="amber" />
      </div>

      <div className="mt-10 p-4 rounded-lg border border-border bg-muted/40 text-[12.5px] text-muted-foreground leading-relaxed max-w-3xl">
        <span className="font-semibold text-foreground">Not sure?</span> Pick <span className="text-foreground">Simple</span> — it covers ~70% of agent designs. You can flip to <span className="text-foreground">Advanced</span> later with one click; nothing gets reset.
      </div>
    </div>
  );
}

function ModeCard({ mode, accent }) {
  const Icon = mode.icon;
  // accent → token. brand-teal / primary / amber map to specific Tailwind utilities.
  const tones = {
    'brand-teal': {
      iconBg: 'bg-(--brand-teal)/10 text-brand-teal',
      ring: 'hover:border-(--brand-teal)/40',
      cta: 'bg-(--brand-teal) text-white hover:bg-(--brand-teal)/90',
    },
    primary: {
      iconBg: 'bg-primary/10 text-primary',
      ring: 'hover:border-primary/40',
      cta: 'bg-primary text-primary-foreground hover:bg-primary/90',
    },
    amber: {
      iconBg: 'bg-amber-400/15 text-amber-700 dark:text-amber-400',
      ring: 'hover:border-amber-400/40',
      cta: 'bg-amber-500 text-white hover:bg-amber-500/90',
    },
  }[accent];

  return (
    <Link
      href={`/app/agents/new?mode=${mode.id}`}
      className={`group relative flex flex-col rounded-xl border bg-card p-5 transition-all ${tones.ring} hover:shadow-md`}
    >
      <div className="flex items-start justify-between gap-2">
        <div className={`h-10 w-10 rounded-lg flex items-center justify-center ${tones.iconBg}`}>
          <Icon className="h-5 w-5" />
        </div>
        {mode.recommended && (
          <Badge variant="outline" className="text-[9.5px] border-primary/40 text-primary">Recommended</Badge>
        )}
      </div>

      <div className="mt-4 flex items-baseline gap-2 flex-wrap">
        <h2 className="text-[20px] font-semibold tracking-tight">{mode.title}</h2>
        <span className="text-[10.5px] font-mono text-muted-foreground">~{mode.tta}</span>
      </div>
      <p className="mt-2 text-[13px] text-muted-foreground leading-snug min-h-[2.6em]">{mode.pitch}</p>
      <div className="mt-2 text-[10.5px] uppercase tracking-[0.18em] font-mono text-muted-foreground">
        For <span className="text-foreground normal-case tracking-normal font-sans">{mode.audience}</span>
      </div>

      <ul className="mt-4 space-y-1.5 flex-1">
        {mode.includes.map(item => (
          <li key={item} className="flex items-start gap-1.5 text-[12px] text-foreground">
            <Check className="h-3 w-3 shrink-0 mt-0.5 text-brand-teal" />
            <span className="leading-snug">{item}</span>
          </li>
        ))}
      </ul>

      <div className={`mt-5 inline-flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-md text-[13px] font-medium transition-colors ${tones.cta}`}>
        Choose {mode.title}
        <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
      </div>
    </Link>
  );
}

function ProgressionArrow({ label }) {
  // Horizontal on desktop; on mobile stacks vertically and rotates the arrow.
  return (
    <div className="hidden lg:flex flex-col items-center justify-center gap-1.5 w-10 self-center text-muted-foreground">
      <ArrowRight className="h-5 w-5 text-primary/60" />
      <div className="text-[9.5px] uppercase tracking-[0.18em] font-mono text-center leading-tight max-w-20">
        {label}
      </div>
    </div>
  );
}

function PersonaDivider() {
  return (
    <div className="hidden lg:flex flex-col items-center justify-center gap-2 w-12 self-stretch py-6">
      <div className="h-full w-px bg-border" />
      <div className="text-[9.5px] uppercase tracking-[0.18em] font-mono text-muted-foreground text-center leading-tight">
        different<br/>persona
      </div>
      <div className="h-full w-px bg-border" />
    </div>
  );
}

/* ============================================================
   Wizard step components (Identity / Brain / Tools / Knowledge / Governance)
   ============================================================ */

/* ------------------------ Identity ------------------------ */
function StepIdentity({ value, onChange }) {
  const set = (k, v) => onChange({ ...value, [k]: v });
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-[16px]">Identity</CardTitle>
        <CardDescription>How this agent appears across the vault.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-5">
        <div className="grid grid-cols-[84px_1fr] gap-4 items-start">
          <div>
            <Label className="text-[10.5px] uppercase tracking-[0.15em] text-muted-foreground">Icon</Label>
            <div className="mt-2 grid grid-cols-3 gap-1">
              {ICONS.slice(0, 9).map(i => (
                <button
                  key={i}
                  type="button"
                  onClick={() => set('icon', i)}
                  className={`h-7 w-7 rounded-md border flex items-center justify-center transition-colors ${
                    value.icon === i ? 'border-primary bg-primary/10 text-primary' : 'border-border text-muted-foreground hover:bg-muted'
                  }`}
                >
                  <AgentIcon name={i} size={14} />
                </button>
              ))}
            </div>
          </div>
          <div className="space-y-4">
            <div>
              <Label htmlFor="agent-name" className="text-[10.5px] uppercase tracking-[0.15em] text-muted-foreground">Name</Label>
              <Input id="agent-name" value={value.name} onChange={e => set('name', e.target.value)} placeholder="e.g. Invoice triage" autoFocus />
            </div>
            <div>
              <Label htmlFor="agent-desc" className="text-[10.5px] uppercase tracking-[0.15em] text-muted-foreground">Description</Label>
              <Textarea id="agent-desc" value={value.description} onChange={e => set('description', e.target.value)} placeholder="What does this agent do?" rows={3} />
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <Label className="text-[10.5px] uppercase tracking-[0.15em] text-muted-foreground">Category</Label>
            <Select value={value.category} onValueChange={v => set('category', v)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {['Assistant', 'Finance ops', 'Risk / Compliance', 'Customer support', 'Legal ops', 'Data / Research', 'IT ops', 'Sales'].map(c => (
                  <SelectItem key={c} value={c}>{c}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="text-[10.5px] uppercase tracking-[0.15em] text-muted-foreground">Team</Label>
            <Input value={value.team} onChange={e => set('team', e.target.value)} />
          </div>
          <div>
            <Label className="text-[10.5px] uppercase tracking-[0.15em] text-muted-foreground">Tags</Label>
            <Input value={value.tags} onChange={e => set('tags', e.target.value)} placeholder="comma, separated" />
          </div>
          <div>
            <Label className="text-[10.5px] uppercase tracking-[0.15em] text-muted-foreground">Visibility</Label>
            <Select value={value.visibility} onValueChange={v => set('visibility', v)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="private">Private — just me</SelectItem>
                <SelectItem value="team">Team — {value.team}</SelectItem>
                <SelectItem value="org">Organization</SelectItem>
                <SelectItem value="public">Public (catalog)</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

/* ------------------------ Brain ------------------------ */
function StepBrain({ value, onChange }) {
  const set = (k, v) => onChange({ ...value, [k]: v });
  const current = MODELS.find(m => m.id === value.primary);
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-[16px]">The brain</CardTitle>
        <CardDescription>Pick a model and write the agent's instructions. You can tune every parameter later.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-5">
        <div>
          <Label className="text-[10.5px] uppercase tracking-[0.15em] text-muted-foreground">Primary model</Label>
          <div className="mt-2 grid grid-cols-1 md:grid-cols-2 gap-2">
            {MODELS.map(m => (
              <button
                key={m.id}
                type="button"
                onClick={() => set('primary', m.id)}
                className={`text-left rounded-lg border p-3 transition-colors ${
                  value.primary === m.id ? 'border-primary bg-primary/5' : 'border-border hover:bg-muted/50'
                }`}
              >
                <div className="flex items-center justify-between gap-2">
                  <div className="min-w-0">
                    <div className="text-[13px] font-medium truncate">{m.label}</div>
                    <div className="text-[11px] text-muted-foreground">{m.family} · {m.ctx} ctx</div>
                  </div>
                  <div className="text-[10.5px] font-mono text-muted-foreground text-right">
                    ${m.inPrice.toFixed(2)}<span className="opacity-50"> / 1M in</span>
                  </div>
                </div>
                <div className="mt-2 flex flex-wrap gap-1">
                  {m.tags.map(t => <Badge key={t} variant="outline" className="text-[9.5px]">{t}</Badge>)}
                </div>
              </button>
            ))}
          </div>
          {current && (
            <p className="mt-2 text-[11px] text-muted-foreground">
              Estimated cost: <span className="font-mono text-foreground">${current.inPrice.toFixed(2)}</span> in / <span className="font-mono text-foreground">${current.outPrice.toFixed(2)}</span> out per 1M tokens.
            </p>
          )}
        </div>

        <div>
          <Label htmlFor="sys-prompt" className="text-[10.5px] uppercase tracking-[0.15em] text-muted-foreground">System prompt</Label>
          <Textarea
            id="sys-prompt"
            value={value.systemPrompt}
            onChange={e => set('systemPrompt', e.target.value)}
            rows={7}
            className="font-mono text-[12.5px]"
          />
          <p className="mt-1.5 text-[10.5px] text-muted-foreground font-mono">
            Variables: {'{{user.name}}'} · {'{{org.name}}'} · {'{{org.timezone}}'} · {'{{date}}'}
          </p>
        </div>

        <label className="flex items-start gap-3 p-3 rounded-lg border border-border bg-muted/30 cursor-pointer">
          <input
            type="checkbox"
            checked={value.structuredOutput}
            onChange={e => set('structuredOutput', e.target.checked)}
            className="mt-0.5 h-4 w-4 rounded accent-primary"
          />
          <div>
            <div className="text-[13px] font-medium">Return structured output (JSON)</div>
            <div className="text-[11.5px] text-muted-foreground">Agent must return a machine-readable document. You'll define the schema in the Model tab.</div>
          </div>
        </label>
      </CardContent>
    </Card>
  );
}

/* ------------------------ Tools ------------------------ */
function StepTools({ picked, onToggle }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-[16px]">Starter tools</CardTitle>
        <CardDescription>Pick a starter set. You can add, remove, and build custom tools on the Tools tab later.</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
          {TOOL_CATALOG.map(t => {
            const active = picked.has(t.id);
            return (
              <button
                key={t.id}
                type="button"
                onClick={() => onToggle(t.id)}
                className={`text-left rounded-lg border p-3 transition-colors ${
                  active ? 'border-primary bg-primary/5' : 'border-border hover:bg-muted/50'
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <div className="h-6 w-6 rounded bg-primary/10 text-primary flex items-center justify-center shrink-0">
                        <AgentIcon name={t.icon} size={12} />
                      </div>
                      <div className="text-[12.5px] font-medium truncate">{t.label}</div>
                    </div>
                    <div className="mt-1 text-[11px] text-muted-foreground leading-snug">{t.desc}</div>
                  </div>
                  <div className={`h-5 w-5 rounded-full border flex items-center justify-center shrink-0 ${
                    active ? 'bg-primary border-primary text-primary-foreground' : 'border-border'
                  }`}>
                    {active && <Check className="h-3 w-3" />}
                  </div>
                </div>
                <div className="mt-2 flex items-center gap-2 text-[10.5px] font-mono text-muted-foreground">
                  <Badge variant="outline" className="text-[9.5px]">{t.kind}</Badge>
                  {t.risk === 'high' && <Badge variant="destructive" className="text-[9.5px]">requires approval</Badge>}
                </div>
              </button>
            );
          })}
        </div>
        {picked.size === 0 && (
          <p className="mt-4 text-[12px] text-muted-foreground flex items-center gap-1.5">
            <Plus className="h-3.5 w-3.5" /> You can ship an agent with no tools. We'll set it up as chat-only.
          </p>
        )}
      </CardContent>
    </Card>
  );
}

/* ------------------------ Attach Sources ------------------------ */
function StepAttachSources({ attachedIds, setAttachedIds }) {
  const { sources, hydrated } = useSources();
  const toggle = (id) => setAttachedIds(attachedIds.includes(id)
    ? attachedIds.filter(x => x !== id)
    : [...attachedIds, id]);

  const ready = sources.filter(s => s.status === 'ready' || s.status === 'indexing');

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-[16px]">Attach knowledge sources</CardTitle>
        <CardDescription>
          Pick from sources configured in your workspace. You can fine-tune retrieval (top-k, hybrid, reranker) on the Knowledge tab after create.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {!hydrated ? (
          <div className="text-[12.5px] text-muted-foreground">Loading sources…</div>
        ) : ready.length === 0 ? (
          <div className="p-6 rounded-lg border border-dashed border-border text-center">
            <div className="text-[13px] font-medium">No sources in your workspace yet</div>
            <div className="mt-1 text-[11.5px] text-muted-foreground">You can create one now, or skip and attach later from the agent's Knowledge tab.</div>
            <div className="mt-3">
              <Button variant="outline" size="sm" render={<Link href="/app/knowledge/new" />}>
                <Plus className="h-3.5 w-3.5" /> Create a knowledge source
              </Button>
            </div>
          </div>
        ) : (
          <ul className="divide-y divide-border border border-border rounded-lg overflow-hidden">
            {ready.map(s => {
              const picked = attachedIds.includes(s.id);
              return (
                <li key={s.id}>
                  <button
                    type="button"
                    onClick={() => toggle(s.id)}
                    className={`w-full text-left flex items-center gap-3 p-3 transition-colors ${
                      picked ? 'bg-primary/5' : 'hover:bg-muted/40'
                    }`}
                  >
                    <div className={`h-5 w-5 rounded-full border flex items-center justify-center shrink-0 ${
                      picked ? 'bg-primary border-primary text-primary-foreground' : 'border-border'
                    }`}>
                      {picked && <Check className="h-3 w-3" />}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-[13px] font-medium truncate">{s.name}</span>
                        <Badge variant="outline" className="text-[9.5px]">{s.kind}</Badge>
                      </div>
                      <div className="text-[10.5px] font-mono text-muted-foreground truncate">
                        {s.docs.toLocaleString()} docs · {s.chunks.toLocaleString()} chunks · {s.team}
                      </div>
                    </div>
                  </button>
                </li>
              );
            })}
          </ul>
        )}
        <p className="text-[12px] text-muted-foreground">
          {attachedIds.length > 0
            ? `${attachedIds.length} source${attachedIds.length === 1 ? '' : 's'} selected.`
            : 'Skipping is fine — the agent will be chat-only until sources are attached.'}
        </p>
      </CardContent>
    </Card>
  );
}

/* ------------------------ Governance ------------------------ */
function StepGovernance({ value, onChange }) {
  const set = (k, v) => onChange({ ...value, [k]: v });
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-[16px]">Governance posture</CardTitle>
        <CardDescription>
          Set ownership and the deployment environment. The actual model + tools + knowledge are configured by the agent's builder team.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <Label className="text-[10.5px] uppercase tracking-[0.15em] text-muted-foreground">Owner</Label>
            <Input value={value.owner} onChange={e => set('owner', e.target.value)} placeholder="email" />
          </div>
          <div>
            <Label className="text-[10.5px] uppercase tracking-[0.15em] text-muted-foreground">Environment</Label>
            <Select value={value.environment} onValueChange={v => set('environment', v)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="dev">dev</SelectItem>
                <SelectItem value="staging">staging</SelectItem>
                <SelectItem value="prod">prod</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        <div className="rounded-lg border border-dashed border-border p-3 bg-muted/30 text-[12px] text-muted-foreground">
          After this, hand the agent off to a builder. The detail page shows the tabs your role can edit (Triggers, Guardrails, Observability, Deploy).
        </div>
      </CardContent>
    </Card>
  );
}
