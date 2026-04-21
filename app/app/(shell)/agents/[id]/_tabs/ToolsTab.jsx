'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger,
} from '@/components/ui/dialog';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Check, Plug, Plus, Search, Trash2, Wrench } from 'lucide-react';
import { FieldRow, Section } from './_shared';
import { TOOL_CATALOG } from '../../_catalog';
import { useServers } from '../../../mcp/_store';
import { AgentIcon } from '../../_Icon';

const RISK_TONE = {
  low:  'border-(--brand-teal)/35 text-brand-teal bg-(--brand-teal)/10',
  med:  'border-amber-400/40 text-amber-700 bg-amber-400/10 dark:text-amber-400',
  high: 'border-destructive/40 text-destructive bg-destructive/10',
};

export default function ToolsTab({ agent, patch }) {
  const attached = agent.tools.attached || [];
  const [browse, setBrowse] = useState(false);
  const [browseQ, setBrowseQ] = useState('');
  const [customOpen, setCustomOpen] = useState(false);
  const [mcpOpen, setMcpOpen] = useState(false);
  const [test, setTest] = useState(null); // toolId being tested

  const isAttached = (id) => attached.some(t => t.id === id);

  const attach = (obj) => {
    if (attached.some(t => t.id === obj.id)) return;
    patch('tools.attached', [...attached, obj]);
  };
  const detach = (id) => patch('tools.attached', attached.filter(t => t.id !== id));
  const updateOne = (id, mut) => patch('tools.attached', attached.map(t => t.id === id ? { ...t, ...mut } : t));

  const filteredCatalog = useMemo(
    () => TOOL_CATALOG.filter(t => !browseQ || t.label.toLowerCase().includes(browseQ.toLowerCase()) || t.desc.toLowerCase().includes(browseQ.toLowerCase())),
    [browseQ],
  );

  return (
    <div className="grid grid-cols-1 lg:grid-cols-[1fr_340px] gap-5">
      <div className="space-y-5">
        <Section
          title={`Attached tools · ${attached.length}`}
          description="The tools this agent can call. Order doesn't matter; the model picks based on descriptions."
          action={
            <div className="flex items-center gap-2">
              <Dialog open={browse} onOpenChange={setBrowse}>
                <DialogTrigger render={<Button variant="outline" size="sm"><Plus className="h-3.5 w-3.5" /> From catalog</Button>} />
                <DialogContent className="max-w-2xl">
                  <DialogHeader>
                    <DialogTitle>Add from catalog</DialogTitle>
                    <DialogDescription>Built-in tools and pre-wired integrations.</DialogDescription>
                  </DialogHeader>
                  <div className="relative">
                    <Search className="h-3.5 w-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                    <Input value={browseQ} onChange={e => setBrowseQ(e.target.value)} className="pl-9" placeholder="Search…" autoFocus />
                  </div>
                  <div className="mt-2 max-h-[50vh] overflow-y-auto -mx-6 px-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                      {filteredCatalog.map(t => {
                        const already = isAttached(t.id);
                        return (
                          <button
                            key={t.id}
                            type="button"
                            disabled={already}
                            onClick={() => { attach({ id: t.id, enabled: true, requiresApproval: t.risk === 'high' }); }}
                            className={`text-left rounded-lg border p-3 transition-colors ${
                              already ? 'opacity-50 cursor-not-allowed' : 'hover:border-primary hover:bg-primary/5'
                            }`}
                          >
                            <div className="flex items-start gap-2.5">
                              <div className="h-7 w-7 rounded bg-primary/10 text-primary flex items-center justify-center shrink-0">
                                <AgentIcon name={t.icon} size={13} />
                              </div>
                              <div className="min-w-0 flex-1">
                                <div className="flex items-center gap-2">
                                  <span className="text-[12.5px] font-medium truncate">{t.label}</span>
                                  <Badge variant="outline" className="text-[9.5px]">{t.kind}</Badge>
                                  <span className={`ml-auto text-[9.5px] font-mono px-1.5 py-0.5 rounded border ${RISK_TONE[t.risk]}`}>{t.risk} risk</span>
                                </div>
                                <div className="mt-1 text-[11px] text-muted-foreground leading-snug">{t.desc}</div>
                              </div>
                              {already && <Check className="h-4 w-4 text-brand-teal" />}
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                  <DialogFooter>
                    <Button variant="ghost" onClick={() => setBrowse(false)}>Done</Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>

              <Dialog open={customOpen} onOpenChange={setCustomOpen}>
                <DialogTrigger render={<Button variant="outline" size="sm"><Wrench className="h-3.5 w-3.5" /> Custom tool</Button>} />
                <CustomToolDialog onSave={(t) => { attach(t); setCustomOpen(false); }} />
              </Dialog>

              <Dialog open={mcpOpen} onOpenChange={setMcpOpen}>
                <DialogTrigger render={<Button size="sm"><Plug className="h-3.5 w-3.5" /> MCP server</Button>} />
                <McpDialog
                  attachedIds={attached.map(t => t.id)}
                  onAttach={(t) => attach(t)}
                  onClose={() => setMcpOpen(false)}
                />
              </Dialog>
            </div>
          }
        >
          {attached.length === 0 ? (
            <div className="p-6 border border-dashed border-border rounded-lg text-center">
              <div className="h-10 w-10 rounded-full bg-muted mx-auto flex items-center justify-center text-muted-foreground">
                <Wrench className="h-4 w-4" />
              </div>
              <div className="mt-2 text-[13px] font-medium">No tools attached</div>
              <div className="mt-1 text-[11.5px] text-muted-foreground">Chat-only agent. Attach tools to let it take actions.</div>
            </div>
          ) : (
            <ul className="divide-y divide-border border border-border rounded-lg overflow-hidden">
              {attached.map(t => <AttachedRow key={t.id} t={t} onRemove={() => detach(t.id)} onUpdate={m => updateOne(t.id, m)} onTest={() => setTest(t.id)} />)}
            </ul>
          )}
        </Section>

        <Section title="Rate limits & retries" description="Applied to every tool call made by this agent.">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <FieldRow label="Calls per minute">
              <Input type="number" value={agent.tools.rateLimit.perMinute} onChange={e => patch('tools.rateLimit.perMinute', parseInt(e.target.value) || 0)} />
            </FieldRow>
            <FieldRow label="Timeout (ms)">
              <Input type="number" value={agent.tools.rateLimit.timeoutMs} onChange={e => patch('tools.rateLimit.timeoutMs', parseInt(e.target.value) || 0)} />
            </FieldRow>
            <FieldRow label="Retries">
              <Input type="number" value={agent.tools.rateLimit.retries} onChange={e => patch('tools.rateLimit.retries', parseInt(e.target.value) || 0)} />
            </FieldRow>
          </div>
        </Section>
      </div>

      {/* Right rail */}
      <aside className="space-y-5">
        <Section title="Approval rules">
          <p className="text-[12px] text-muted-foreground">
            Any tool flagged as <span className="font-mono">high risk</span> (send email, write to prod, post bill) will route through <span className="font-medium text-foreground">Human-in-the-loop</span> on every call.
          </p>
          <div className="mt-2 text-[11.5px] text-muted-foreground">
            High-risk attached: <span className="font-mono text-destructive">
              {attached.filter(t => TOOL_CATALOG.find(c => c.id === t.id)?.risk === 'high' || t.requiresApproval).length}
            </span>
          </div>
        </Section>
        <Section title="Credentials">
          <p className="text-[12px] text-muted-foreground">Secrets live in the auth vault. They're never rendered after creation.</p>
          <div className="mt-2 flex items-center gap-2 p-2 rounded-md border border-border bg-muted/60">
            <div className="font-mono text-[11px] text-muted-foreground flex-1">av_live_•••• 8f3a</div>
            <Button variant="ghost" size="sm">Rotate</Button>
          </div>
        </Section>
      </aside>

      {/* Test dialog */}
      <Dialog open={!!test} onOpenChange={(o) => !o && setTest(null)}>
        <TestPanel toolId={test} onClose={() => setTest(null)} />
      </Dialog>
    </div>
  );
}

/* ------------------- subs ------------------- */
function AttachedRow({ t, onRemove, onUpdate, onTest }) {
  const meta = TOOL_CATALOG.find(c => c.id === t.id);
  const label = t.label || meta?.label || t.id;
  const desc = t.desc || meta?.desc || 'Custom tool';
  const icon = t.icon || meta?.icon || 'plug';
  const risk = meta?.risk || 'med';

  return (
    <li className="grid grid-cols-[auto_1fr_auto] gap-3 p-3 items-center">
      <div className="h-8 w-8 rounded-md bg-primary/10 text-primary flex items-center justify-center">
        <AgentIcon name={icon} size={14} />
      </div>
      <div className="min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-[13px] font-medium truncate">{label}</span>
          <Badge variant="outline" className="text-[9.5px]">{meta?.kind || (t.source === 'mcp' ? 'MCP' : 'Custom')}</Badge>
          <span className={`text-[9.5px] font-mono px-1.5 py-0.5 rounded border ${RISK_TONE[risk]}`}>{risk} risk</span>
          {(t.requiresApproval || risk === 'high') && (
            <Badge variant="destructive" className="text-[9.5px]">requires approval</Badge>
          )}
        </div>
        <div className="mt-0.5 text-[11px] text-muted-foreground truncate">{desc}</div>
      </div>
      <div className="flex items-center gap-2">
        <Switch checked={t.enabled !== false} onCheckedChange={v => onUpdate({ enabled: v })} />
        <Button variant="ghost" size="sm" onClick={onTest}>Test</Button>
        <Button variant="ghost" size="icon" onClick={onRemove} className="text-destructive">
          <Trash2 className="h-3.5 w-3.5" />
        </Button>
      </div>
    </li>
  );
}

function CustomToolDialog({ onSave }) {
  const [name, setName] = useState('');
  const [desc, setDesc] = useState('');
  const [method, setMethod] = useState('POST');
  const [url, setUrl] = useState('');
  const [auth, setAuth] = useState('bearer');
  const [schema, setSchema] = useState('{\n  "type": "object",\n  "properties": {\n    "query": { "type": "string" }\n  },\n  "required": ["query"]\n}');
  const [reqApproval, setReqApproval] = useState(false);

  const save = () => {
    if (!name.trim() || !url.trim()) return;
    const id = `custom_${Math.random().toString(36).slice(2, 8)}`;
    onSave({
      id,
      source: 'custom',
      label: name.trim(),
      desc: desc.trim(),
      icon: 'globe',
      enabled: true,
      requiresApproval: reqApproval,
      config: { method, url, auth, schema },
    });
  };

  return (
    <DialogContent className="max-w-xl">
      <DialogHeader>
        <DialogTitle>New custom tool</DialogTitle>
        <DialogDescription>The description is what the LLM reads — be specific about what the tool does and when to use it.</DialogDescription>
      </DialogHeader>
      <div className="space-y-4">
        <FieldRow label="Name">
          <Input value={name} onChange={e => setName(e.target.value)} placeholder="get_customer" />
        </FieldRow>
        <FieldRow label="Description" hint="shown to the model">
          <Textarea value={desc} onChange={e => setDesc(e.target.value)} rows={3} placeholder="Fetches a customer record by ID from the CRM." />
        </FieldRow>
        <div className="grid grid-cols-[120px_1fr] gap-3">
          <FieldRow label="Method">
            <Select value={method} onValueChange={setMethod}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {['GET','POST','PUT','PATCH','DELETE'].map(m => <SelectItem key={m} value={m}>{m}</SelectItem>)}
              </SelectContent>
            </Select>
          </FieldRow>
          <FieldRow label="URL">
            <Input value={url} onChange={e => setUrl(e.target.value)} placeholder="https://api.corp/customers/{id}" />
          </FieldRow>
        </div>
        <FieldRow label="Auth">
          <Select value={auth} onValueChange={setAuth}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="bearer">Bearer token (vault)</SelectItem>
              <SelectItem value="basic">Basic</SelectItem>
              <SelectItem value="hmac">HMAC</SelectItem>
              <SelectItem value="oauth">OAuth 2.0 (user-delegated)</SelectItem>
              <SelectItem value="none">None</SelectItem>
            </SelectContent>
          </Select>
        </FieldRow>
        <FieldRow label="Parameters (JSON schema)">
          <Textarea value={schema} onChange={e => setSchema(e.target.value)} rows={7} className="font-mono text-[12px]" />
        </FieldRow>
        <label className="flex items-center gap-2 text-[12.5px]">
          <input type="checkbox" checked={reqApproval} onChange={e => setReqApproval(e.target.checked)} className="h-4 w-4 accent-primary" />
          Require human approval on every call
        </label>
      </div>
      <DialogFooter>
        <Button variant="ghost">Cancel</Button>
        <Button onClick={save} disabled={!name.trim() || !url.trim()}>Create tool</Button>
      </DialogFooter>
    </DialogContent>
  );
}

function McpDialog({ onAttach, onClose, attachedIds }) {
  const { servers, hydrated } = useServers();
  const availableServers = servers.filter(s => s.status !== 'failed' && s.tools.length > 0);

  const [selectedServer, setSelectedServer] = useState(availableServers[0]?.id || null);
  const server = availableServers.find(s => s.id === selectedServer) || null;
  const [picked, setPicked] = useState(new Set());

  const toggle = (name) => {
    setPicked(s => { const n = new Set(s); n.has(name) ? n.delete(name) : n.add(name); return n; });
  };

  const toggleAll = () => {
    if (!server) return;
    const eligible = server.tools.filter(t => t.enabled).map(t => t.name);
    const allPicked = eligible.every(n => picked.has(n));
    setPicked(allPicked ? new Set() : new Set(eligible));
  };

  const save = () => {
    if (!server) return;
    picked.forEach(toolName => {
      const t = server.tools.find(x => x.name === toolName);
      const attachedId = `${server.id}.${toolName}`;
      if (attachedIds.includes(attachedId)) return;   // skip duplicates
      onAttach({
        id: attachedId,
        source: 'mcp',
        label: `${server.name}: ${toolName}`,
        desc: t?.description || `Exposed via ${server.name}.`,
        icon: 'plug',
        enabled: true,
        requiresApproval: t?.approval || t?.riskLevel === 'high' || server.approvalPolicy === 'always',
        config: { serverId: server.id, serverEndpoint: server.endpoint, toolName, riskLevel: t?.riskLevel },
      });
    });
    onClose?.();
  };

  return (
    <DialogContent className="max-w-2xl">
      <DialogHeader>
        <DialogTitle>Attach MCP tools</DialogTitle>
        <DialogDescription>
          Pick specific tools from a registered <Link href="/app/mcp" className="text-primary hover:underline">MCP server</Link>. Attach the least-privilege set.
        </DialogDescription>
      </DialogHeader>
      {!hydrated ? (
        <div className="text-[12.5px] text-muted-foreground">Loading servers…</div>
      ) : availableServers.length === 0 ? (
        <div className="p-6 rounded-lg border border-dashed border-border text-center">
          <div className="text-[13px] font-medium">No MCP servers in your workspace</div>
          <div className="mt-1 text-[11.5px] text-muted-foreground">Register one to expose tools to this agent.</div>
          <div className="mt-3">
            <Button variant="outline" size="sm" render={<Link href="/app/mcp/new" />}>
              <Plus className="h-3.5 w-3.5" /> Register MCP server
            </Button>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          <FieldRow label="Server">
            <Select value={selectedServer} onValueChange={(v) => { setSelectedServer(v); setPicked(new Set()); }}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {availableServers.map(s => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </FieldRow>
          {server && (
            <>
              <div className="text-[11px] text-muted-foreground font-mono truncate">{server.endpoint}</div>
              <div className="flex items-center justify-between">
                <FieldRow label="Tools to expose"><div /></FieldRow>
                <Button variant="ghost" size="sm" onClick={toggleAll}>
                  {server.tools.filter(t => t.enabled).every(t => picked.has(t.name)) ? 'Deselect all' : 'Select all enabled'}
                </Button>
              </div>
              <ul className="divide-y divide-border border border-border rounded-lg overflow-hidden max-h-[50vh] overflow-y-auto">
                {server.tools.map(t => {
                  const attachedId = `${server.id}.${t.name}`;
                  const already = attachedIds.includes(attachedId);
                  const disabled = !t.enabled || already;
                  return (
                    <li key={t.name}>
                      <label className={`flex items-center gap-3 p-3 ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer hover:bg-muted/40'}`}>
                        <input type="checkbox"
                          checked={picked.has(t.name)}
                          onChange={() => !disabled && toggle(t.name)}
                          disabled={disabled}
                          className="h-4 w-4 accent-primary" />
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <code className="text-[12.5px] font-mono">{t.name}</code>
                            <span className={`text-[9.5px] font-mono px-1.5 py-0.5 rounded border ${RISK_TONE[t.riskLevel] || RISK_TONE.med}`}>{t.riskLevel} risk</span>
                            {t.approval && <Badge variant="destructive" className="text-[9.5px]">requires approval</Badge>}
                            {!t.enabled && <Badge variant="outline" className="text-[9.5px]">server-disabled</Badge>}
                            {already && <Badge variant="outline" className="text-[9.5px]">already attached</Badge>}
                          </div>
                          <div className="text-[11px] text-muted-foreground truncate mt-0.5">{t.description}</div>
                        </div>
                      </label>
                    </li>
                  );
                })}
              </ul>
            </>
          )}
        </div>
      )}
      <DialogFooter>
        <Button variant="ghost" onClick={onClose}>Cancel</Button>
        <Button onClick={save} disabled={picked.size === 0 || !server}>
          Attach {picked.size || ''} tools
        </Button>
      </DialogFooter>
    </DialogContent>
  );
}

function TestPanel({ toolId, onClose }) {
  const tool = TOOL_CATALOG.find(t => t.id === toolId);
  const [input, setInput] = useState('{\n  "query": "hello"\n}');
  const [output, setOutput] = useState(null);
  const [running, setRunning] = useState(false);

  const run = async () => {
    setRunning(true); setOutput(null);
    await new Promise(r => setTimeout(r, 600));
    setOutput({ ok: true, latency_ms: 240, result: { echoed: JSON.parse(input) } });
    setRunning(false);
  };

  return (
    <DialogContent className="max-w-xl">
      <DialogHeader>
        <DialogTitle>Test {tool?.label || toolId}</DialogTitle>
        <DialogDescription>Sends a mock invocation. No live traffic.</DialogDescription>
      </DialogHeader>
      <div className="space-y-4">
        <FieldRow label="Input (JSON)">
          <Textarea value={input} onChange={e => setInput(e.target.value)} rows={6} className="font-mono text-[12px]" />
        </FieldRow>
        {output && (
          <FieldRow label={`Output · ${output.latency_ms}ms`}>
            <pre className="text-[11.5px] bg-muted border border-border rounded p-3 overflow-x-auto font-mono">
{JSON.stringify(output.result, null, 2)}
            </pre>
          </FieldRow>
        )}
      </div>
      <DialogFooter>
        <Button variant="ghost" onClick={onClose}>Close</Button>
        <Button onClick={run} disabled={running}>{running ? 'Running…' : 'Invoke'}</Button>
      </DialogFooter>
    </DialogContent>
  );
}
