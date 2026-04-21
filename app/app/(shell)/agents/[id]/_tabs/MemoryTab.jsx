'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Slider } from '@/components/ui/slider';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Trash2, Plus } from 'lucide-react';
import { FieldRow, Section } from './_shared';

export default function MemoryTab({ agent, patch }) {
  const mem = agent.memory;
  const [addOpen, setAddOpen] = useState(false);
  const [newItem, setNewItem] = useState({ key: '', value: '', scope: 'per-user' });

  const addMem = () => {
    if (!newItem.key.trim() || !newItem.value.trim()) return;
    patch('memory.items', [
      ...mem.items,
      { id: `m_${Math.random().toString(36).slice(2,8)}`, ...newItem, writtenAt: new Date().toISOString() },
    ]);
    setNewItem({ key: '', value: '', scope: 'per-user' });
    setAddOpen(false);
  };

  const remove = (id) => patch('memory.items', mem.items.filter(i => i.id !== id));
  const clearAll = () => patch('memory.items', []);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-[1fr_340px] gap-5">
      <div className="space-y-5">
        <Section title="Session memory" description="What the agent keeps in working context across turns.">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <FieldRow label={`Window · ${mem.session.windowTurns} turns`}>
              <Slider min={2} max={40} step={1} value={[mem.session.windowTurns]} onValueChange={([v]) => patch('memory.session.windowTurns', v)} />
            </FieldRow>
            <FieldRow label="Strategy">
              <Select value={mem.session.strategy} onValueChange={v => patch('memory.session.strategy', v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="rolling">Rolling window</SelectItem>
                  <SelectItem value="summary">Running summary</SelectItem>
                  <SelectItem value="map-reduce">Map-reduce at cutover</SelectItem>
                </SelectContent>
              </Select>
            </FieldRow>
          </div>
          <div className="flex items-center justify-between p-3 rounded-lg border border-border">
            <div>
              <div className="text-[13px] font-medium">Summarize older turns</div>
              <div className="text-[11.5px] text-muted-foreground">Prevents context blow-up on long conversations.</div>
            </div>
            <Switch checked={mem.session.summarize} onCheckedChange={v => patch('memory.session.summarize', v)} />
          </div>
        </Section>

        <Section title="Long-term memory" description="What persists across sessions.">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <FieldRow label="Scope">
              <Select value={mem.longTerm.scope} onValueChange={v => patch('memory.longTerm.scope', v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="per-user">Per user</SelectItem>
                  <SelectItem value="per-org">Per organization</SelectItem>
                  <SelectItem value="per-agent">Per agent</SelectItem>
                </SelectContent>
              </Select>
            </FieldRow>
            <FieldRow label="Write policy">
              <Select value={mem.longTerm.writePolicy} onValueChange={v => patch('memory.longTerm.writePolicy', v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="auto">Auto — LLM decides what to save</SelectItem>
                  <SelectItem value="explicit">Explicit — only via `remember` tool</SelectItem>
                  <SelectItem value="off">Off — read-only</SelectItem>
                </SelectContent>
              </Select>
            </FieldRow>
          </div>
          <div className="flex items-center justify-between p-3 rounded-lg border border-border">
            <div>
              <div className="text-[13px] font-medium">Enabled</div>
              <div className="text-[11.5px] text-muted-foreground">Turn long-term memory on/off for this agent.</div>
            </div>
            <Switch checked={mem.longTerm.enabled} onCheckedChange={v => patch('memory.longTerm.enabled', v)} />
          </div>
          <FieldRow label={`TTL · ${mem.ttlDays} days`} hint="GDPR: set to 0 to disable expiry">
            <Slider min={0} max={720} step={15} value={[mem.ttlDays]} onValueChange={([v]) => patch('memory.ttlDays', v)} />
          </FieldRow>
        </Section>

        <Section
          title={`Memory inspector · ${mem.items.length} items`}
          description="See and edit exactly what the agent has remembered."
          action={
            <div className="flex items-center gap-2">
              <Dialog open={addOpen} onOpenChange={setAddOpen}>
                <DialogTrigger render={<Button size="sm" variant="outline"><Plus className="h-3.5 w-3.5" /> Add</Button>} />
                <DialogContent>
                  <DialogHeader><DialogTitle>Add memory item</DialogTitle></DialogHeader>
                  <div className="space-y-4">
                    <FieldRow label="Key"><Input value={newItem.key} onChange={e => setNewItem({ ...newItem, key: e.target.value })} placeholder="preferred-currency" /></FieldRow>
                    <FieldRow label="Value"><Input value={newItem.value} onChange={e => setNewItem({ ...newItem, value: e.target.value })} placeholder="USD" /></FieldRow>
                    <FieldRow label="Scope">
                      <Select value={newItem.scope} onValueChange={v => setNewItem({ ...newItem, scope: v })}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="per-user">per-user</SelectItem>
                          <SelectItem value="per-org">per-org</SelectItem>
                          <SelectItem value="per-agent">per-agent</SelectItem>
                        </SelectContent>
                      </Select>
                    </FieldRow>
                  </div>
                  <DialogFooter>
                    <Button variant="ghost" onClick={() => setAddOpen(false)}>Cancel</Button>
                    <Button onClick={addMem} disabled={!newItem.key.trim() || !newItem.value.trim()}>Save</Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
              <Button size="sm" variant="ghost" onClick={clearAll} disabled={mem.items.length === 0} className="text-destructive">
                Forget all
              </Button>
            </div>
          }
        >
          {mem.items.length === 0 ? (
            <div className="text-[12.5px] text-muted-foreground p-4 border border-dashed border-border rounded-lg text-center">
              No memory yet.
            </div>
          ) : (
            <ul className="divide-y divide-border border border-border rounded-lg overflow-hidden">
              {mem.items.map(i => (
                <li key={i.id} className="grid grid-cols-[1fr_auto] gap-2 p-3 items-center">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-mono text-[12px] text-primary truncate">{i.key}</span>
                      <Badge variant="outline" className="text-[9.5px]">{i.scope}</Badge>
                    </div>
                    <div className="mt-0.5 text-[12.5px] text-foreground truncate">{i.value}</div>
                    <div className="text-[10.5px] text-muted-foreground font-mono">written {new Date(i.writtenAt).toLocaleString()}</div>
                  </div>
                  <Button variant="ghost" size="icon" className="text-destructive" onClick={() => remove(i.id)}>
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </li>
              ))}
            </ul>
          )}
        </Section>
      </div>

      <aside className="space-y-5">
        <Section title="GDPR posture">
          <ul className="text-[12px] text-muted-foreground space-y-2 list-disc pl-4">
            <li>Per-user memory respects <span className="font-mono text-foreground">delete-my-data</span> requests via the Admin console.</li>
            <li>TTL applies per item. 0 = never expires (requires DPA).</li>
            <li>Scope <span className="font-mono text-foreground">per-agent</span> is shared across users — keep PII out.</li>
          </ul>
        </Section>
      </aside>
    </div>
  );
}
