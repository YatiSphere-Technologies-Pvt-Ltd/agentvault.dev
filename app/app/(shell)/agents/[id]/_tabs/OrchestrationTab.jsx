'use client';

import Link from 'next/link';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Slider } from '@/components/ui/slider';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Plus, Trash2, Workflow } from 'lucide-react';
import { FieldRow, Section } from './_shared';
import { useAgents } from '../../_store';

const PATTERNS = [
  { id: 'solo',       label: 'Solo',       desc: 'This agent runs alone. No delegation.' },
  { id: 'supervisor', label: 'Supervisor', desc: 'Top-level agent delegates to specialized workers.' },
  { id: 'sequential', label: 'Sequential', desc: 'Fixed pipeline — agent A → B → C.' },
  { id: 'router',     label: 'Router',     desc: 'Classify input → route to one specialist.' },
  { id: 'parallel',   label: 'Parallel',   desc: 'Fan out to N agents, merge results.' },
];

export default function OrchestrationTab({ agent, patch }) {
  const o = agent.orchestration;
  const { agents } = useAgents();
  const others = agents.filter(a => a.id !== agent.id);
  const [pickOpen, setPickOpen] = useState(false);

  const addSub = (targetId, role) => {
    const tgt = others.find(a => a.id === targetId);
    if (!tgt) return;
    patch('orchestration.subAgents', [
      ...o.subAgents,
      { id: tgt.id, label: tgt.name, role, memory: 'isolated' },
    ]);
  };
  const removeSub = (id) => patch('orchestration.subAgents', o.subAgents.filter(s => s.id !== id));
  const updateSub = (id, mut) => patch('orchestration.subAgents', o.subAgents.map(s => s.id === id ? { ...s, ...mut } : s));

  return (
    <div className="grid grid-cols-1 lg:grid-cols-[1fr_340px] gap-5">
      <div className="space-y-5">
        <Section title="Orchestration pattern" description="How this agent coordinates with others.">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
            {PATTERNS.map(p => {
              const active = o.pattern === p.id;
              return (
                <button
                  key={p.id}
                  onClick={() => patch('orchestration.pattern', p.id)}
                  className={`text-left rounded-lg border p-3 transition-colors ${
                    active ? 'border-primary bg-primary/5' : 'border-border hover:bg-muted/50'
                  }`}
                >
                  <div className="text-[13px] font-medium">{p.label}</div>
                  <div className="text-[11.5px] text-muted-foreground mt-0.5">{p.desc}</div>
                </button>
              );
            })}
          </div>
        </Section>

        <Section
          title={`Sub-agents · ${o.subAgents.length}`}
          description="Other agents attached as tools or workers."
          action={
            <Dialog open={pickOpen} onOpenChange={setPickOpen}>
              <DialogTrigger render={<Button size="sm" disabled={others.length === 0}><Plus className="h-3.5 w-3.5" /> Attach sub-agent</Button>} />
              <DialogContent>
                <DialogHeader><DialogTitle>Attach a sub-agent</DialogTitle></DialogHeader>
                <ul className="divide-y divide-border border border-border rounded-lg overflow-hidden">
                  {others.map(a => (
                    <li key={a.id} className="flex items-center justify-between p-3">
                      <div>
                        <div className="text-[13px] font-medium">{a.name}</div>
                        <div className="text-[10.5px] text-muted-foreground font-mono">{a.id} · v{a.version.current}</div>
                      </div>
                      <Button
                        size="sm"
                        variant="outline"
                        disabled={o.subAgents.some(s => s.id === a.id)}
                        onClick={() => { addSub(a.id, 'worker'); setPickOpen(false); }}
                      >
                        Attach
                      </Button>
                    </li>
                  ))}
                </ul>
              </DialogContent>
            </Dialog>
          }
        >
          {o.subAgents.length === 0 ? (
            <div className="p-6 border border-dashed border-border rounded-lg text-center">
              <div className="h-10 w-10 rounded-full bg-muted mx-auto flex items-center justify-center text-muted-foreground">
                <Workflow className="h-4 w-4" />
              </div>
              <div className="mt-2 text-[13px] font-medium">Solo agent</div>
              <div className="mt-1 text-[11.5px] text-muted-foreground">
                Attach another agent to delegate. Pick a pattern above to structure the handoff.
              </div>
            </div>
          ) : (
            <ul className="divide-y divide-border border border-border rounded-lg overflow-hidden">
              {o.subAgents.map(s => (
                <li key={s.id} className="grid grid-cols-[1fr_auto_auto_auto] gap-3 items-center p-3">
                  <div className="min-w-0">
                    <div className="text-[13px] font-medium truncate">{s.label}</div>
                    <div className="text-[10.5px] text-muted-foreground font-mono truncate">{s.id}</div>
                  </div>
                  <Input value={s.role} onChange={e => updateSub(s.id, { role: e.target.value })} className="h-8 text-[12.5px] w-36" placeholder="role" />
                  <Select value={s.memory} onValueChange={v => updateSub(s.id, { memory: v })}>
                    <SelectTrigger className="h-8 w-32 text-[12px]"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="isolated">Isolated</SelectItem>
                      <SelectItem value="shared">Shared</SelectItem>
                    </SelectContent>
                  </Select>
                  <Button variant="ghost" size="icon" className="text-destructive" onClick={() => removeSub(s.id)}>
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </li>
              ))}
            </ul>
          )}
        </Section>

        <Section title="Safety limits">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <FieldRow label={`Loop limit · ${o.loopLimit}`} hint="calls to self">
              <Slider min={0} max={20} step={1} value={[o.loopLimit]} onValueChange={([v]) => patch('orchestration.loopLimit', v)} />
            </FieldRow>
            <FieldRow label={`Max delegation depth · ${o.maxDepth}`}>
              <Slider min={1} max={8} step={1} value={[o.maxDepth]} onValueChange={([v]) => patch('orchestration.maxDepth', v)} />
            </FieldRow>
          </div>
        </Section>

        <Section
          title="Visual canvas"
          description="For complex orchestration, use Agent Studio's full flow canvas."
          action={
            <Button variant="outline" size="sm" render={<Link href="/app/studio" />}>Open in Studio →</Button>
          }
        >
          <div className="text-[12.5px] text-muted-foreground">
            The visual canvas handles branching, retries, and parallel fan-out with live traces. Changes made in Studio sync back here.
          </div>
        </Section>
      </div>

      <aside className="space-y-5">
        <Section title="Pattern cheatsheet">
          <ul className="text-[12px] text-muted-foreground space-y-2 list-disc pl-4">
            <li><b className="text-foreground">Supervisor</b> is the safest default for complex workflows — clear accountability.</li>
            <li><b className="text-foreground">Router</b> shines when inputs cleanly cluster into known categories.</li>
            <li><b className="text-foreground">Parallel</b> fan-out needs a merge strategy; don't overuse or costs balloon.</li>
          </ul>
        </Section>
      </aside>
    </div>
  );
}
