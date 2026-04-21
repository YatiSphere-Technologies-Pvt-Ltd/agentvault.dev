'use client';

import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { Trash2 } from 'lucide-react';
import { FieldRow, Kv, Section } from './_shared';
import { ICONS } from '../../_catalog';
import { AgentIcon } from '../../_Icon';
import { useAgents } from '../../_store';

export default function OverviewTab({ agent, patch }) {
  const router = useRouter();
  const { deleteAgent } = useAgents();

  const confirmDelete = () => {
    deleteAgent(agent.id);
    router.push('/app/agents');
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-[1fr_340px] gap-5">
      {/* Left: identity editor */}
      <div className="space-y-5">
        <Section title="Identity" description="How this agent appears across the vault.">
          <div className="grid grid-cols-[84px_1fr] gap-4">
            <div>
              <FieldRow label="Icon">
                <div className="grid grid-cols-3 gap-1">
                  {ICONS.slice(0, 9).map(i => (
                    <button
                      key={i}
                      type="button"
                      onClick={() => patch('icon', i)}
                      className={`h-7 w-7 rounded-md border flex items-center justify-center transition-colors ${
                        agent.icon === i ? 'border-primary bg-primary/10 text-primary' : 'border-border text-muted-foreground hover:bg-muted'
                      }`}
                    >
                      <AgentIcon name={i} size={14} />
                    </button>
                  ))}
                </div>
              </FieldRow>
            </div>
            <div className="space-y-4">
              <FieldRow label="Name">
                <Input value={agent.name} onChange={e => patch('name', e.target.value)} />
              </FieldRow>
              <FieldRow label="Description">
                <Textarea value={agent.description} onChange={e => patch('description', e.target.value)} rows={3} />
              </FieldRow>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <FieldRow label="Category">
              <Select value={agent.category} onValueChange={v => patch('category', v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {['Assistant', 'Finance ops', 'Risk / Compliance', 'Customer support', 'Legal ops', 'Data / Research', 'IT ops', 'Sales'].map(c => (
                    <SelectItem key={c} value={c}>{c}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </FieldRow>
            <FieldRow label="Tags" hint="comma separated">
              <Input
                value={agent.tags.join(', ')}
                onChange={e => patch('tags', e.target.value.split(',').map(s => s.trim()).filter(Boolean))}
              />
            </FieldRow>
          </div>
        </Section>

        <Section title="Ownership & visibility" description="Who owns this agent and who can see it.">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <FieldRow label="Owner">
              <Input value={agent.owner} onChange={e => patch('owner', e.target.value)} />
            </FieldRow>
            <FieldRow label="Team">
              <Input value={agent.team} onChange={e => patch('team', e.target.value)} />
            </FieldRow>
            <FieldRow label="Visibility">
              <Select value={agent.visibility} onValueChange={v => patch('visibility', v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="private">Private — just me</SelectItem>
                  <SelectItem value="team">Team — {agent.team}</SelectItem>
                  <SelectItem value="org">Organization</SelectItem>
                  <SelectItem value="public">Public catalog</SelectItem>
                </SelectContent>
              </Select>
            </FieldRow>
            <FieldRow label="Environment">
              <Select value={agent.environment} onValueChange={v => patch('environment', v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="dev">dev</SelectItem>
                  <SelectItem value="staging">staging</SelectItem>
                  <SelectItem value="prod">prod</SelectItem>
                </SelectContent>
              </Select>
            </FieldRow>
          </div>
        </Section>

        <Section title="Changelog" description="Every change to this agent is captured here.">
          {agent.version.changelog.length === 0 ? (
            <div className="text-[12.5px] text-muted-foreground">No changes recorded yet.</div>
          ) : (
            <ol className="space-y-3">
              {agent.version.changelog.map((c, i) => (
                <li key={i} className="flex items-start gap-3 text-[12.5px]">
                  <div className="mt-1.5 h-1.5 w-1.5 rounded-full bg-primary shrink-0" />
                  <div className="min-w-0">
                    <div className="text-foreground">{c.msg}</div>
                    <div className="text-[10.5px] font-mono text-muted-foreground">
                      {new Date(c.at).toLocaleString()} · {c.who}
                    </div>
                  </div>
                </li>
              ))}
            </ol>
          )}
        </Section>

        <Section
          title="Danger zone"
          description="Irreversible. Think twice before acting here."
        >
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 p-3 rounded-lg border border-destructive/30 bg-destructive/5">
            <div>
              <div className="text-[13px] font-medium">Delete agent</div>
              <div className="text-[11.5px] text-muted-foreground">
                Removes the agent, its versions, triggers, and local run history.
              </div>
            </div>
            <AlertDialog>
              <AlertDialogTrigger render={<Button variant="destructive" size="sm"> <Trash2 className="h-3.5 w-3.5" /> Delete </Button>} />
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Delete {agent.name}?</AlertDialogTitle>
                  <AlertDialogDescription>
                    This will permanently remove the agent from your workspace. This action cannot be undone.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction onClick={confirmDelete} className="bg-destructive text-destructive-foreground hover:brightness-110">
                    Delete agent
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        </Section>
      </div>

      {/* Right: summary rail */}
      <aside className="space-y-5">
        <Section title="At a glance">
          <div>
            <Kv k="ID"           v={agent.id}                                     mono />
            <Kv k="Owner"        v={agent.owner}                                   mono />
            <Kv k="Team"         v={agent.team} />
            <Kv k="Category"     v={agent.category} />
            <Kv k="Environment"  v={agent.environment}                             mono />
            <Kv k="Visibility"   v={agent.visibility} />
            <Kv k="Version"      v={`v${agent.version.current} · ${agent.version.status}`} mono />
            <Kv k="Created"      v={new Date(agent.createdAt).toLocaleDateString()} />
            <Kv k="Updated"      v={new Date(agent.updatedAt).toLocaleDateString()} />
          </div>
        </Section>

        <Section title="Last 30 days">
          <div>
            <Kv k="Tokens"     v={agent.observability.tokensMTD.toLocaleString()} mono />
            <Kv k="Cost"       v={`$${agent.observability.costMTD.toFixed(2)}`}   mono />
            <Kv k="p50 latency" v={`${agent.observability.p50MS} ms`}              mono />
            <Kv k="p95 latency" v={`${agent.observability.p95MS} ms`}              mono />
            <Kv k="Error rate"  v={`${(agent.observability.errorRate * 100).toFixed(2)}%`} mono />
          </div>
        </Section>
      </aside>
    </div>
  );
}
