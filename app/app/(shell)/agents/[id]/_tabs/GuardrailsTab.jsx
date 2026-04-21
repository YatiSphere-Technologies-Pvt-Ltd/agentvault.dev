'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Plus, Trash2, ShieldAlert } from 'lucide-react';
import { FieldRow, Section } from './_shared';

export default function GuardrailsTab({ agent, patch }) {
  const g = agent.guardrails;
  const [addOpen, setAddOpen] = useState(false);
  const [newRule, setNewRule] = useState({ when: '', action: 'refuse', target: '' });

  const addRule = () => {
    if (!newRule.when.trim()) return;
    patch('guardrails.rules', [
      ...(g.rules || []),
      { id: `r_${Math.random().toString(36).slice(2,8)}`, ...newRule },
    ]);
    setNewRule({ when: '', action: 'refuse', target: '' });
    setAddOpen(false);
  };
  const removeRule = (id) => patch('guardrails.rules', (g.rules || []).filter(r => r.id !== id));

  const toggleTopic = (list, item) => {
    const s = new Set(list);
    s.has(item) ? s.delete(item) : s.add(item);
    return Array.from(s);
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-[1fr_340px] gap-5">
      <div className="space-y-5">
        <Section title="Input filters" description="What to do with user input before the model sees it.">
          <div className="space-y-2">
            <ToggleRow label="PII detection"            desc="Block or redact emails, SSNs, card numbers."                          checked={g.input.pii}             onCheckedChange={v => patch('guardrails.input.pii', v)} />
            <ToggleRow label="Prompt-injection defense" desc="Detect classic jailbreak and tool-hijack patterns."                   checked={g.input.promptInjection} onCheckedChange={v => patch('guardrails.input.promptInjection', v)} />
            <ToggleRow label="Profanity filter"         desc="Block profanity in user messages (rare in enterprise)."                checked={g.input.profanity}       onCheckedChange={v => patch('guardrails.input.profanity', v)} />
          </div>
          <FieldRow label="Topic allow/deny list" hint="comma separated; prefix with ! to deny">
            <Input
              value={(g.input.topics || []).join(', ')}
              onChange={e => patch('guardrails.input.topics', e.target.value.split(',').map(s => s.trim()).filter(Boolean))}
              placeholder="finance, !political, hr-benefits"
            />
          </FieldRow>
        </Section>

        <Section title="Output filters" description="Checks applied to model output before returning.">
          <div className="space-y-2">
            <ToggleRow label="Hallucination check"          desc="Flag low-confidence factual claims."                      checked={g.output.hallucination} onCheckedChange={v => patch('guardrails.output.hallucination', v)} />
            <ToggleRow label="Grounding check"              desc="Require output spans to match retrieved context."         checked={g.output.grounding}     onCheckedChange={v => patch('guardrails.output.grounding', v)} />
            <ToggleRow label="Toxicity filter"              desc="Block toxic language in responses."                        checked={g.output.toxicity}      onCheckedChange={v => patch('guardrails.output.toxicity', v)} />
            <ToggleRow label="PII redaction"                desc="Mask PII in output regardless of source."                 checked={g.output.piiRedaction}  onCheckedChange={v => patch('guardrails.output.piiRedaction', v)} />
          </div>
        </Section>

        <Section title="Jailbreak defense level">
          <Select value={g.jailbreakDefense} onValueChange={v => patch('guardrails.jailbreakDefense', v)}>
            <SelectTrigger className="max-w-sm"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="off">Off — fastest, no protection</SelectItem>
              <SelectItem value="balanced">Balanced — default</SelectItem>
              <SelectItem value="strict">Strict — highest protection, more false positives</SelectItem>
            </SelectContent>
          </Select>
        </Section>

        <Section
          title={`Custom rules · ${(g.rules || []).length}`}
          description="Deterministic rules on top of the LLM — evaluated before and after every turn."
          action={
            <Dialog open={addOpen} onOpenChange={setAddOpen}>
              <DialogTrigger render={<Button size="sm"><Plus className="h-3.5 w-3.5" /> Add rule</Button>} />
              <DialogContent>
                <DialogHeader><DialogTitle>New rule</DialogTitle></DialogHeader>
                <div className="space-y-4">
                  <FieldRow label="When (expression)" hint="JS-like">
                    <Input value={newRule.when} onChange={e => setNewRule({ ...newRule, when: e.target.value })} placeholder='user.text.includes("competitorX")' className="font-mono text-[12.5px]" />
                  </FieldRow>
                  <FieldRow label="Action">
                    <Select value={newRule.action} onValueChange={v => setNewRule({ ...newRule, action: v })}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="refuse">Refuse</SelectItem>
                        <SelectItem value="redact">Redact matches</SelectItem>
                        <SelectItem value="route-to-human">Route to human</SelectItem>
                        <SelectItem value="escalate">Escalate to supervisor</SelectItem>
                      </SelectContent>
                    </Select>
                  </FieldRow>
                  <FieldRow label="Target (optional)" hint="queue / user / channel">
                    <Input value={newRule.target} onChange={e => setNewRule({ ...newRule, target: e.target.value })} placeholder="ops-ai-reviewers" />
                  </FieldRow>
                </div>
                <DialogFooter>
                  <Button variant="ghost" onClick={() => setAddOpen(false)}>Cancel</Button>
                  <Button onClick={addRule} disabled={!newRule.when.trim()}>Create rule</Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          }
        >
          {(g.rules || []).length === 0 ? (
            <div className="p-4 border border-dashed border-border rounded-lg text-[12.5px] text-muted-foreground text-center">
              No custom rules.
            </div>
          ) : (
            <ul className="divide-y divide-border border border-border rounded-lg overflow-hidden">
              {g.rules.map(r => (
                <li key={r.id} className="grid grid-cols-[1fr_auto] gap-3 p-3">
                  <div className="min-w-0 space-y-1">
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="text-[9.5px]">{r.action}</Badge>
                      {r.target && <span className="text-[10.5px] font-mono text-muted-foreground">→ {r.target}</span>}
                    </div>
                    <code className="text-[12px] font-mono text-foreground break-all">{r.when}</code>
                  </div>
                  <Button variant="ghost" size="icon" className="text-destructive" onClick={() => removeRule(r.id)}>
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </li>
              ))}
            </ul>
          )}
        </Section>

        <Section title="Refusal message" description="Shown to users when guardrails block a request.">
          <Textarea value={g.refusalMessage} onChange={e => patch('guardrails.refusalMessage', e.target.value)} rows={3} />
        </Section>
      </div>

      <aside className="space-y-5">
        <Section title="Risk posture">
          <div className="flex items-start gap-3 p-3 rounded-lg border border-border bg-muted/40">
            <ShieldAlert className="h-5 w-5 text-brand-teal shrink-0 mt-0.5" />
            <div>
              <div className="text-[12.5px] font-medium">Guardrails are advisory by default</div>
              <div className="text-[11.5px] text-muted-foreground mt-1">Switch to <b>strict</b> for regulated workloads (finance, healthcare).</div>
            </div>
          </div>
        </Section>
        <Section title="Compliance">
          <ul className="text-[12px] text-muted-foreground space-y-2 list-disc pl-4">
            <li>PII redaction is required for HIPAA workloads.</li>
            <li>Jailbreak defense is part of our SOC 2 CC6.1 evidence.</li>
            <li>Refusal rates flow into the weekly safety report.</li>
          </ul>
        </Section>
      </aside>
    </div>
  );
}

function ToggleRow({ label, desc, checked, onCheckedChange }) {
  return (
    <div className="flex items-center justify-between p-3 rounded-lg border border-border">
      <div className="min-w-0">
        <div className="text-[13px] font-medium">{label}</div>
        <div className="text-[11.5px] text-muted-foreground">{desc}</div>
      </div>
      <Switch checked={checked} onCheckedChange={onCheckedChange} />
    </div>
  );
}
