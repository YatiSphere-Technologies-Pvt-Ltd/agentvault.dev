'use client';

import { useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Slider } from '@/components/ui/slider';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Plus } from 'lucide-react';
import { FieldRow, Section } from './_shared';
import { MODELS, PROMPT_SNIPPETS } from '../../_catalog';

export default function ModelTab({ agent, patch }) {
  const m = agent.model;
  const current = MODELS.find(x => x.id === m.primary);
  const [snipOpen, setSnipOpen] = useState(false);

  const insertSnippet = (snippet) => {
    patch('model.systemPrompt', `${m.systemPrompt.trimEnd()}\n\n${snippet.body}`);
    setSnipOpen(false);
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-[1fr_340px] gap-5">
      <div className="space-y-5">
        <Section title="Model" description="Primary model and a fallback for failures or cheap-path routing.">
          <FieldRow label="Primary model" hint={current ? `${current.family} · ${current.ctx} ctx` : ''}>
            <Select value={m.primary} onValueChange={v => patch('model.primary', v)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {MODELS.map(mm => (
                  <SelectItem key={mm.id} value={mm.id}>
                    <div className="flex items-center justify-between gap-3 w-full">
                      <span>{mm.label}</span>
                      <span className="text-[10.5px] font-mono text-muted-foreground">${mm.inPrice}/${mm.outPrice} per 1M</span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {current && (
              <div className="mt-2 flex flex-wrap gap-1">
                {current.tags.map(t => <Badge key={t} variant="outline" className="text-[9.5px]">{t}</Badge>)}
              </div>
            )}
          </FieldRow>

          <FieldRow label="Fallback model" hint="used when primary fails or hits budget">
            <Select value={m.fallback} onValueChange={v => patch('model.fallback', v)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="none">No fallback</SelectItem>
                {MODELS.filter(mm => mm.id !== m.primary).map(mm => (
                  <SelectItem key={mm.id} value={mm.id}>{mm.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </FieldRow>
        </Section>

        <Section title="Sampling parameters">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <FieldRow label={`Temperature · ${m.temperature.toFixed(2)}`}>
              <Slider
                value={[m.temperature]}
                min={0} max={1} step={0.05}
                onValueChange={([v]) => patch('model.temperature', v)}
              />
            </FieldRow>
            <FieldRow label={`Top-p · ${m.topP.toFixed(2)}`}>
              <Slider
                value={[m.topP]}
                min={0} max={1} step={0.05}
                onValueChange={([v]) => patch('model.topP', v)}
              />
            </FieldRow>
            <FieldRow label="Max output tokens">
              <Input
                type="number"
                value={m.maxTokens}
                onChange={e => patch('model.maxTokens', parseInt(e.target.value) || 0)}
              />
            </FieldRow>
            <FieldRow label="Reasoning effort" hint="models that support it">
              <Select value={m.reasoningEffort} onValueChange={v => patch('model.reasoningEffort', v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="off">off</SelectItem>
                  <SelectItem value="low">low</SelectItem>
                  <SelectItem value="medium">medium</SelectItem>
                  <SelectItem value="high">high</SelectItem>
                </SelectContent>
              </Select>
            </FieldRow>
            <FieldRow label="Stop sequences" hint="comma separated">
              <Input
                value={(m.stop || []).join(', ')}
                onChange={e => patch('model.stop', e.target.value.split(',').map(s => s.trim()).filter(Boolean))}
                placeholder="</end>, ###"
              />
            </FieldRow>
          </div>
        </Section>

        <Section
          title="System prompt"
          description="Instructions the model sees on every run. Variables are interpolated."
          action={
            <Popover open={snipOpen} onOpenChange={setSnipOpen}>
              <PopoverTrigger render={<Button variant="outline" size="sm"><Plus className="h-3.5 w-3.5" /> Insert snippet</Button>} />
              <PopoverContent className="w-80 p-1" align="end">
                <div className="text-[10.5px] uppercase tracking-[0.15em] font-mono text-muted-foreground px-2 py-1.5">Prompt snippets</div>
                {PROMPT_SNIPPETS.map(s => (
                  <button
                    key={s.id}
                    onClick={() => insertSnippet(s)}
                    className="block w-full text-left px-2 py-1.5 rounded hover:bg-muted transition-colors"
                  >
                    <div className="text-[12.5px] font-medium">{s.label}</div>
                    <div className="text-[11px] text-muted-foreground truncate">{s.body}</div>
                  </button>
                ))}
              </PopoverContent>
            </Popover>
          }
        >
          <Textarea
            value={m.systemPrompt}
            onChange={e => patch('model.systemPrompt', e.target.value)}
            rows={14}
            className="font-mono text-[12.5px]"
          />
          <div className="text-[10.5px] text-muted-foreground font-mono">
            Variables: {'{{user.name}}'} · {'{{org.name}}'} · {'{{org.timezone}}'} · {'{{date}}'}
          </div>
        </Section>

        <Section title="Structured output" description="If enabled, the model must return JSON that matches the schema below.">
          <div className="flex items-center justify-between p-3 rounded-lg border border-border bg-muted/30">
            <div>
              <div className="text-[13px] font-medium">Return JSON only</div>
              <div className="text-[11.5px] text-muted-foreground">Useful for machine consumers or downstream tools.</div>
            </div>
            <Switch
              checked={m.structuredOutput.enabled}
              onCheckedChange={v => patch('model.structuredOutput.enabled', v)}
            />
          </div>
          {m.structuredOutput.enabled && (
            <FieldRow label="JSON schema">
              <Textarea
                value={m.structuredOutput.schema}
                onChange={e => patch('model.structuredOutput.schema', e.target.value)}
                rows={10}
                className="font-mono text-[12px]"
              />
            </FieldRow>
          )}
        </Section>
      </div>

      {/* Right rail */}
      <aside className="space-y-5">
        <Section title="Cost estimate" description="Based on this model's published pricing.">
          {current ? (
            <div className="space-y-2 text-[12.5px]">
              <div className="flex justify-between"><span className="text-muted-foreground">Input</span>  <span className="font-mono">${current.inPrice.toFixed(2)} / 1M</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Output</span> <span className="font-mono">${current.outPrice.toFixed(2)} / 1M</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Context</span><span className="font-mono">{current.ctx}</span></div>
              <div className="mt-3 p-2 rounded-md bg-muted/60 text-[11px] text-muted-foreground">
                ~{((current.inPrice + current.outPrice) / 2 / 1000).toFixed(4)} $/1K avg — assumes balanced in/out mix.
              </div>
            </div>
          ) : (
            <div className="text-[12px] text-muted-foreground">Pick a model to see pricing.</div>
          )}
        </Section>

        <Section title="Guidance">
          <ul className="text-[12px] text-muted-foreground space-y-2 list-disc pl-4">
            <li>Lower <span className="font-mono text-foreground">temperature</span> for classification / extraction; higher for generative writing.</li>
            <li>Set a cheaper <span className="font-mono text-foreground">fallback</span> to keep costs bounded under load spikes.</li>
            <li>When using structured output, keep the schema small — large schemas hurt latency and cost.</li>
          </ul>
        </Section>
      </aside>
    </div>
  );
}
