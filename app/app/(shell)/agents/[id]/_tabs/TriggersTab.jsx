'use client';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { Copy, MessageSquare, Webhook, Clock, Code2, Hash } from 'lucide-react';
import { FieldRow, Section } from './_shared';

const CHANNELS = [
  { id: 'slack',    label: 'Slack',            icon: 'chat' },
  { id: 'teams',    label: 'Microsoft Teams',  icon: 'chat' },
  { id: 'email',    label: 'Email',            icon: 'mail' },
  { id: 'whatsapp', label: 'WhatsApp',         icon: 'chat' },
  { id: 'zendesk',  label: 'Zendesk',          icon: 'plug' },
];

export default function TriggersTab({ agent, patch }) {
  const t = agent.triggers;

  const toggleChannel = (id) => {
    const existing = t.channels.find(c => c.id === id);
    const next = existing
      ? t.channels.filter(c => c.id !== id)
      : [...t.channels, { id, label: CHANNELS.find(c => c.id === id).label, connected: true, overrides: { systemPromptSuffix: '' } }];
    patch('triggers.channels', next);
  };
  const updateChannel = (id, mut) => {
    patch('triggers.channels', t.channels.map(c => c.id === id ? { ...c, ...mut } : c));
  };
  const isChannelOn = (id) => t.channels.some(c => c.id === id);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-[1fr_340px] gap-5">
      <div className="space-y-5">
        <Section title="Chat surface" description="A hosted chat page and an embeddable widget.">
          <div className="flex items-center justify-between p-3 rounded-lg border border-border">
            <div className="flex items-center gap-3">
              <div className="h-8 w-8 rounded-md bg-primary/10 text-primary flex items-center justify-center"><MessageSquare className="h-4 w-4" /></div>
              <div>
                <div className="text-[13px] font-medium">Hosted chat page</div>
                <div className="text-[10.5px] text-muted-foreground font-mono">agentvault.io/c/{t.chat.slug}</div>
              </div>
            </div>
            <Switch checked={t.chat.enabled} onCheckedChange={v => patch('triggers.chat.enabled', v)} />
          </div>
        </Section>

        <Section title="REST API" description="Call this agent over HTTP with a scoped key.">
          <div className="flex items-center justify-between p-3 rounded-lg border border-border">
            <div className="flex items-center gap-3">
              <div className="h-8 w-8 rounded-md bg-primary/10 text-primary flex items-center justify-center"><Code2 className="h-4 w-4" /></div>
              <div>
                <div className="text-[13px] font-medium">API endpoint</div>
                <div className="text-[10.5px] text-muted-foreground font-mono">POST /v1/agents/{agent.id}/messages</div>
              </div>
            </div>
            <Switch checked={t.api.enabled} onCheckedChange={v => patch('triggers.api.enabled', v)} />
          </div>

          <div className="flex items-center gap-2 p-2 rounded-md border border-border bg-muted/60">
            <code className="flex-1 font-mono text-[11.5px] text-muted-foreground truncate">{t.api.key}</code>
            <Button variant="ghost" size="sm"><Copy className="h-3.5 w-3.5" /> Copy</Button>
            <Button variant="ghost" size="sm">Rotate</Button>
          </div>

          <pre className="bg-muted border border-border rounded-lg p-3 font-mono text-[11.5px] overflow-x-auto">
{`curl -X POST https://api.agentvault.io/v1/agents/${agent.id}/messages \\
  -H "Authorization: Bearer $AV_LIVE_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{
    "user_id": "u_123",
    "message": "Summarize the Q4 invoice exceptions"
  }'`}
          </pre>
        </Section>

        <Section title="Inbound webhook" description="External events POST to this URL; the agent runs.">
          <div className="flex items-center justify-between p-3 rounded-lg border border-border">
            <div className="flex items-center gap-3">
              <div className="h-8 w-8 rounded-md bg-primary/10 text-primary flex items-center justify-center"><Webhook className="h-4 w-4" /></div>
              <div>
                <div className="text-[13px] font-medium">Webhook</div>
                <div className="text-[10.5px] text-muted-foreground font-mono">POST /v1/webhooks/{agent.id}</div>
              </div>
            </div>
            <Switch checked={t.webhook.enabled} onCheckedChange={v => patch('triggers.webhook.enabled', v)} />
          </div>
        </Section>

        <Section title="Schedule" description="Run the agent on a cron. The input is a synthetic scheduled message.">
          <div className="flex items-center justify-between p-3 rounded-lg border border-border">
            <div className="flex items-center gap-3">
              <div className="h-8 w-8 rounded-md bg-primary/10 text-primary flex items-center justify-center"><Clock className="h-4 w-4" /></div>
              <div>
                <div className="text-[13px] font-medium">Cron</div>
                <div className="text-[10.5px] text-muted-foreground font-mono">{t.cron.schedule}</div>
              </div>
            </div>
            <Switch checked={t.cron.enabled} onCheckedChange={v => patch('triggers.cron.enabled', v)} />
          </div>
          {t.cron.enabled && (
            <FieldRow label="Schedule" hint="crontab">
              <Input value={t.cron.schedule} onChange={e => patch('triggers.cron.schedule', e.target.value)} className="font-mono" />
            </FieldRow>
          )}
        </Section>

        <Section title="Events" description="Event-driven: run when a new row appears in a DB, a file lands in a bucket, etc.">
          <div className="flex items-center justify-between p-3 rounded-lg border border-border">
            <div className="flex items-center gap-3">
              <div className="h-8 w-8 rounded-md bg-primary/10 text-primary flex items-center justify-center"><Webhook className="h-4 w-4" /></div>
              <div>
                <div className="text-[13px] font-medium">Event source</div>
                <div className="text-[10.5px] text-muted-foreground font-mono">{t.events.source}</div>
              </div>
            </div>
            <Switch checked={t.events.enabled} onCheckedChange={v => patch('triggers.events.enabled', v)} />
          </div>
          {t.events.enabled && (
            <FieldRow label="Source">
              <Select value={t.events.source} onValueChange={v => patch('triggers.events.source', v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">None</SelectItem>
                  <SelectItem value="s3.put">S3 · object created</SelectItem>
                  <SelectItem value="snowflake.row">Snowflake · new row</SelectItem>
                  <SelectItem value="gmail.inbound">Gmail · inbound message</SelectItem>
                  <SelectItem value="jira.issue.created">Jira · issue created</SelectItem>
                </SelectContent>
              </Select>
            </FieldRow>
          )}
        </Section>

        <Section title="Channels" description="Where the agent meets users. Per-channel prompt overrides supported.">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
            {CHANNELS.map(c => {
              const on = isChannelOn(c.id);
              const current = t.channels.find(x => x.id === c.id);
              return (
                <div key={c.id} className={`rounded-lg border p-3 transition-colors ${on ? 'border-primary/40 bg-primary/5' : 'border-border'}`}>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      {c.id === 'slack' ? <Hash className="h-4 w-4 text-muted-foreground" /> : <span className="h-4 w-4 rounded bg-primary/20"/>}
                      <div className="text-[13px] font-medium">{c.label}</div>
                      {on && <Badge variant="outline" className="text-[9.5px]">connected</Badge>}
                    </div>
                    <Switch checked={on} onCheckedChange={() => toggleChannel(c.id)} />
                  </div>
                  {on && (
                    <div className="mt-3">
                      <label className="text-[10.5px] uppercase tracking-[0.15em] text-muted-foreground">Prompt suffix</label>
                      <Textarea
                        rows={2}
                        value={current?.overrides?.systemPromptSuffix || ''}
                        onChange={e => updateChannel(c.id, { overrides: { ...current.overrides, systemPromptSuffix: e.target.value } })}
                        placeholder="e.g. Keep answers under 3 sentences."
                      />
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </Section>
      </div>

      <aside className="space-y-5">
        <Section title="Live triggers">
          <div className="space-y-1.5 text-[12.5px]">
            <Dot label="Chat"    on={t.chat.enabled} />
            <Dot label="API"     on={t.api.enabled} />
            <Dot label="Webhook" on={t.webhook.enabled} />
            <Dot label="Cron"    on={t.cron.enabled} />
            <Dot label="Events"  on={t.events.enabled} />
            <Dot label="Channels" on={t.channels.length > 0} count={t.channels.length} />
          </div>
        </Section>
      </aside>
    </div>
  );
}

function Dot({ label, on, count }) {
  return (
    <div className="flex items-center justify-between">
      <span className="flex items-center gap-2 text-muted-foreground">
        <span className={`h-1.5 w-1.5 rounded-full ${on ? 'bg-brand-teal' : 'bg-border'}`} />
        {label}
      </span>
      <span className="text-[11px] font-mono">{on ? (count != null ? `${count} active` : 'on') : 'off'}</span>
    </div>
  );
}
