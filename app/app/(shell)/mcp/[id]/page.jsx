'use client';

import Link from 'next/link';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { useMemo, useState } from 'react';
import { ArrowLeft, Copy, KeyRound, Pause, Play, RefreshCw, RotateCcw, Trash2 } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger,
} from '@/components/ui/dialog';
import { DataTable } from '@/components/tables/DataTable';
import { APPROVAL_POLICIES, ACL_MODES, vendorById } from '../_catalog';
import { useServer, useServers } from '../_store';
import { RiskPill, StatusPill, VendorIcon, authSummary, fmtAgo, maskedRef } from '../_shared';

const TABS = [
  { v: 'overview', label: 'Overview' },
  { v: 'tools',    label: 'Tools' },
  { v: 'access',   label: 'Access & Security' },
  { v: 'activity', label: 'Activity' },
];

export default function MCPServerDetailPage() {
  const { id } = useParams();
  const router = useRouter();
  const search = useSearchParams();
  const tab = search.get('tab') || 'overview';

  const { server, hydrated, patch } = useServer(id);
  const { deleteServer } = useServers();

  const setTab = (v) => {
    const p = new URLSearchParams(search.toString());
    p.set('tab', v);
    router.replace(`/app/mcp/${id}?${p.toString()}`);
  };

  if (!hydrated) return <div className="max-w-7xl mx-auto px-6 py-10 text-[13px] text-muted-foreground">Loading server…</div>;
  if (!server) return (
    <div className="max-w-3xl mx-auto px-6 py-10">
      <Link href="/app/mcp" className="text-[12px] text-muted-foreground hover:text-foreground inline-flex items-center gap-1.5">
        <ArrowLeft className="h-3.5 w-3.5" /> All servers
      </Link>
      <h1 className="mt-4 text-[24px] font-semibold">Server not found</h1>
      <p className="mt-2 text-[13.5px] text-muted-foreground">No server with id <span className="font-mono">{id}</span>.</p>
      <Button render={<Link href="/app/mcp" />} className="mt-5">Back to MCP</Button>
    </div>
  );

  const vendor = vendorById(server.vendorId);
  const confirmDelete = () => {
    deleteServer(server.id);
    router.push('/app/mcp');
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-10 py-6 sm:py-8">
      <Link href="/app/mcp" className="text-[12px] text-muted-foreground hover:text-foreground inline-flex items-center gap-1.5">
        <ArrowLeft className="h-3.5 w-3.5" /> All servers
      </Link>

      <div className="mt-4 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div className="flex items-start gap-3 min-w-0">
          <div className="h-11 w-11 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0">
            <VendorIcon vendorId={server.vendorId} size={20} />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-[22px] font-semibold tracking-tight truncate">{server.name}</h1>
              <StatusPill status={server.status} />
              <Badge variant="outline" className="text-[9.5px]">{vendor.label}</Badge>
            </div>
            <div className="text-[12px] text-muted-foreground font-mono truncate">{server.id} · {server.team}</div>
            {server.description && <div className="mt-1 text-[13px] text-foreground/80 max-w-prose">{server.description}</div>}
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {server.status !== 'paused' ? (
            <Button variant="outline" size="sm" onClick={() => patch('status', 'paused')}><Pause className="h-3.5 w-3.5" /> Pause</Button>
          ) : (
            <Button variant="outline" size="sm" onClick={() => patch('status', 'connected')}><Play className="h-3.5 w-3.5" /> Resume</Button>
          )}
          <Button variant="outline" size="sm" onClick={() => patch('lastCheckedAt', new Date().toISOString())}>
            <RefreshCw className="h-3.5 w-3.5" /> Re-check
          </Button>
          <AlertDialog>
            <AlertDialogTrigger render={<Button variant="destructive" size="sm"><Trash2 className="h-3.5 w-3.5" /> Delete</Button>} />
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Delete {server.name}?</AlertDialogTitle>
                <AlertDialogDescription>
                  Removes this server. Agents with attached tools from it will lose those capabilities on their next run.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction onClick={confirmDelete} className="bg-destructive text-destructive-foreground hover:brightness-110">Delete server</AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </div>

      <Tabs value={tab} onValueChange={setTab} className="mt-6">
        <TabsList className="h-9 bg-muted/60">
          {TABS.map(t => <TabsTrigger key={t.v} value={t.v} className="text-[12.5px]">{t.label}</TabsTrigger>)}
        </TabsList>

        <TabsContent value="overview" className="mt-5"><OverviewTab server={server} vendor={vendor} /></TabsContent>
        <TabsContent value="tools"    className="mt-5"><ToolsTab    server={server} patch={patch} /></TabsContent>
        <TabsContent value="access"   className="mt-5"><AccessTab   server={server} patch={patch} /></TabsContent>
        <TabsContent value="activity" className="mt-5"><ActivityTab server={server} /></TabsContent>
      </Tabs>
    </div>
  );
}

/* ================= Overview ================= */
function OverviewTab({ server, vendor }) {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-[1fr_340px] gap-5">
      <div className="space-y-5">
        <Card>
          <CardHeader>
            <CardTitle className="text-[15px]">Health</CardTitle>
            <CardDescription>Trailing 7-day operational stats from your probes + live traffic.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <Stat label="Calls (30d)"  value={server.toolCalls30d.toLocaleString()} />
              <Stat label="p50"          value={server.p50 ? `${server.p50} ms` : '—'} />
              <Stat label="p95"          value={server.p95 ? `${server.p95} ms` : '—'} />
              <Stat label="Error rate 7d" value={`${(server.errorRate7d * 100).toFixed(2)}%`} tone={server.errorRate7d > 0.05 ? 'bad' : 'good'} />
              <Stat label="Tools total"    value={server.tools.length} />
              <Stat label="Tools enabled"  value={server.tools.filter(t => t.enabled).length} />
              <Stat label="Last checked"   value={fmtAgo(server.lastCheckedAt)} />
              <Stat label="Last used"      value={fmtAgo(server.lastUsedAt)} />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-[15px]">Connection</CardTitle>
            <CardDescription>Summary of transport + auth. Change details in the tabs.</CardDescription>
          </CardHeader>
          <CardContent>
            <dl className="divide-y divide-border/60 border border-border rounded-lg">
              <Kv k="Vendor"     v={vendor.label} />
              <Kv k="Transport"  v={server.transport} mono />
              <Kv k="Endpoint"   v={server.endpoint || '—'} mono />
              <Kv k="Auth"       v={authSummary(server.auth)} />
              {server.auth.kind === 'oauth' && (
                <>
                  <Kv k="Client ID" v={server.auth.clientId || '—'} mono />
                  <Kv k="Scopes"    v={(server.auth.scopes || []).join(' ') || '—'} mono />
                  <Kv k="Account"   v={server.auth.accountId || '—'} mono />
                </>
              )}
              {server.auth.kind === 'bearer' && <Kv k="Secret" v={maskedRef(server.auth.secretRef)} mono />}
              {server.auth.kind === 'header' && (
                <>
                  <Kv k="Header"  v={server.auth.headerName} mono />
                  <Kv k="Secret"  v={maskedRef(server.auth.secretRef)} mono />
                </>
              )}
              {server.auth.kind === 'mtls' && (
                <>
                  <Kv k="Certificate" v={maskedRef(server.auth.certRef)} mono />
                  <Kv k="Private key" v={maskedRef(server.auth.keyRef)} mono />
                </>
              )}
              <Kv k="Approval policy" v={APPROVAL_POLICIES.find(p => p.id === server.approvalPolicy)?.label || server.approvalPolicy} />
              <Kv k="Visibility"      v={server.visibility} />
              <Kv k="Version pin"     v={server.versionPin} mono />
            </dl>
          </CardContent>
        </Card>
      </div>

      <aside className="space-y-5">
        <Card>
          <CardHeader><CardTitle className="text-[14px]">Attached agents</CardTitle></CardHeader>
          <CardContent>
            {server.attachedAgents.length === 0 ? (
              <div className="text-[12.5px] text-muted-foreground">No agents have tools attached from this server yet.</div>
            ) : (
              <ul className="space-y-1.5">
                {server.attachedAgents.map(aid => (
                  <li key={aid}>
                    <Link href={`/app/agents/${aid}?tab=tools`} className="text-[12.5px] font-mono text-primary hover:underline">{aid}</Link>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </aside>
    </div>
  );
}

/* ================= Tools ================= */
function ToolsTab({ server, patch }) {
  const [testTool, setTestTool] = useState(null);
  const updateTool = (name, mut) => patch('tools', server.tools.map(t => t.name === name ? { ...t, ...mut } : t));

  const columns = useMemo(() => ([
    {
      id: 'tool',
      accessorFn: (t) => t.name,
      header: 'Tool',
      cell: ({ row }) => (
        <div>
          <code className="text-[12.5px] font-mono text-foreground">{row.original.name}</code>
          <div className="text-[11px] text-muted-foreground truncate max-w-md">{row.original.description}</div>
        </div>
      ),
    },
    {
      id: 'risk',
      accessorFn: (t) => t.riskLevel,
      header: 'Risk',
      cell: ({ row }) => <RiskPill level={row.original.riskLevel} />,
    },
    {
      id: 'approval',
      accessorFn: (t) => t.approval,
      header: 'Approval',
      cell: ({ row }) => (
        <Switch
          checked={row.original.approval}
          onCheckedChange={v => updateTool(row.original.name, { approval: v })}
          onClick={(e) => e.stopPropagation()}
        />
      ),
    },
    {
      id: 'enabled',
      accessorFn: (t) => t.enabled,
      header: 'Enabled',
      cell: ({ row }) => (
        <Switch
          checked={row.original.enabled}
          onCheckedChange={v => updateTool(row.original.name, { enabled: v })}
          onClick={(e) => e.stopPropagation()}
        />
      ),
    },
    {
      id: 'calls',
      accessorFn: (t) => t.callsMTD || 0,
      header: 'Calls (30d)',
      meta: { align: 'right' },
      cell: ({ getValue }) => <span className="tabular-nums font-mono text-[12px] text-muted-foreground">{getValue().toLocaleString()}</span>,
    },
    {
      id: 'p50',
      accessorFn: (t) => t.p50 || 0,
      header: 'p50',
      meta: { align: 'right' },
      cell: ({ getValue }) => <span className="tabular-nums font-mono text-[12px] text-muted-foreground">{getValue() ? `${getValue()} ms` : '—'}</span>,
    },
    {
      id: 'errorRate',
      accessorFn: (t) => t.errorRate || 0,
      header: 'Error',
      meta: { align: 'right' },
      cell: ({ getValue }) => {
        const v = getValue();
        return <span className={`tabular-nums font-mono text-[12px] ${v > 0.05 ? 'text-destructive' : 'text-muted-foreground'}`}>{(v * 100).toFixed(2)}%</span>;
      },
    },
    {
      id: 'lastUsed',
      accessorFn: (t) => t.lastUsedAt ? new Date(t.lastUsedAt).getTime() : 0,
      header: 'Last used',
      meta: { align: 'right' },
      cell: ({ row }) => <span className="tabular-nums font-mono text-[12px] text-muted-foreground">{fmtAgo(row.original.lastUsedAt)}</span>,
    },
    {
      id: 'actions',
      header: '',
      enableSorting: false,
      cell: ({ row }) => (
        <Button variant="ghost" size="sm" onClick={(e) => { e.stopPropagation(); setTestTool(row.original); }}>
          Test
        </Button>
      ),
    },
  ]), [server.tools]);

  return (
    <div className="space-y-5">
      <Card>
        <CardHeader className="flex flex-row items-start justify-between gap-4">
          <div>
            <CardTitle className="text-[15px]">Tools ({server.tools.length})</CardTitle>
            <CardDescription>Exposed by this server. Toggle enabled/approval per tool — changes apply to all agents on next call.</CardDescription>
          </div>
          <Button variant="outline" size="sm" onClick={() => patch('lastCheckedAt', new Date().toISOString())}>
            <RotateCcw className="h-3.5 w-3.5" /> Re-discover
          </Button>
        </CardHeader>
        <CardContent className="p-0 sm:p-0">
          <div className="p-4 sm:p-5">
            <DataTable
              columns={columns}
              data={server.tools}
              minWidth="min-w-[980px]"
              pageSize={50}
              emptyMessage="No tools discovered yet. Use Re-discover to probe the endpoint."
              initialSorting={[{ id: 'calls', desc: true }]}
            />
          </div>
        </CardContent>
      </Card>

      <Dialog open={!!testTool} onOpenChange={(o) => !o && setTestTool(null)}>
        {testTool && <TestPanel tool={testTool} onClose={() => setTestTool(null)} />}
      </Dialog>
    </div>
  );
}

function TestPanel({ tool, onClose }) {
  const [input, setInput] = useState('{\n  "query": "hello"\n}');
  const [output, setOutput] = useState(null);
  const [running, setRunning] = useState(false);
  const run = async () => {
    setRunning(true); setOutput(null);
    await new Promise(r => setTimeout(r, 700));
    setOutput({ ok: true, latency_ms: 200 + Math.round(Math.random() * 400), echo: JSON.parse(input) });
    setRunning(false);
  };
  return (
    <DialogContent className="max-w-xl">
      <DialogHeader>
        <DialogTitle>Test <code className="font-mono text-[14px]">{tool.name}</code></DialogTitle>
        <DialogDescription>Mocked invocation. Uses the server's auth, not yours.</DialogDescription>
      </DialogHeader>
      <div className="space-y-4">
        <div>
          <Label className="text-[10.5px] uppercase tracking-[0.15em] text-muted-foreground">Input (JSON)</Label>
          <Textarea rows={6} value={input} onChange={e => setInput(e.target.value)} className="font-mono text-[12px]" />
        </div>
        {output && (
          <div>
            <Label className="text-[10.5px] uppercase tracking-[0.15em] text-muted-foreground">Output · {output.latency_ms}ms</Label>
            <pre className="mt-1 text-[11.5px] bg-muted border border-border rounded p-3 overflow-x-auto font-mono">
{JSON.stringify(output, null, 2)}
            </pre>
          </div>
        )}
      </div>
      <DialogFooter>
        <Button variant="ghost" onClick={onClose}>Close</Button>
        <Button onClick={run} disabled={running}>{running ? 'Running…' : 'Invoke'}</Button>
      </DialogFooter>
    </DialogContent>
  );
}

/* ================= Access ================= */
function AccessTab({ server, patch }) {
  const hasSecret = ['bearer', 'header'].includes(server.auth.kind);
  const [rotateOpen, setRotateOpen] = useState(false);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-[1fr_340px] gap-5">
      <div className="space-y-5">
        <Card>
          <CardHeader>
            <CardTitle className="text-[15px]">Secrets</CardTitle>
            <CardDescription>Every credential is a vault reference. Rotate to invalidate the current one and swap in a new entry.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {hasSecret && (
              <div className="flex items-center gap-2 p-2 rounded-md border border-border bg-muted/60">
                <code className="flex-1 font-mono text-[11.5px] text-muted-foreground truncate">{maskedRef(server.auth.secretRef)}</code>
                <Button variant="ghost" size="sm" onClick={() => navigator.clipboard?.writeText(server.auth.secretRef || '')}><Copy className="h-3.5 w-3.5" /> Copy ref</Button>
                <Button size="sm" onClick={() => setRotateOpen(true)}><RotateCcw className="h-3.5 w-3.5" /> Rotate</Button>
              </div>
            )}
            {server.auth.kind === 'mtls' && (
              <>
                <div className="flex items-center gap-2 p-2 rounded-md border border-border bg-muted/60">
                  <span className="text-[10.5px] font-mono text-muted-foreground w-20">Cert</span>
                  <code className="flex-1 font-mono text-[11.5px] text-muted-foreground truncate">{maskedRef(server.auth.certRef)}</code>
                  <Button size="sm" variant="ghost"><KeyRound className="h-3.5 w-3.5" /> Replace</Button>
                </div>
                <div className="flex items-center gap-2 p-2 rounded-md border border-border bg-muted/60">
                  <span className="text-[10.5px] font-mono text-muted-foreground w-20">Key</span>
                  <code className="flex-1 font-mono text-[11.5px] text-muted-foreground truncate">{maskedRef(server.auth.keyRef)}</code>
                  <Button size="sm" variant="ghost"><KeyRound className="h-3.5 w-3.5" /> Replace</Button>
                </div>
              </>
            )}
            {server.auth.kind === 'oauth' && (
              <div className="text-[12.5px] text-muted-foreground">
                OAuth account: <code className="font-mono text-foreground">{server.auth.accountId || '—'}</code>. Re-auth from <b className="text-foreground">Settings → Integrations</b> if tokens drift.
              </div>
            )}
            {server.auth.kind === 'none' && (
              <div className="text-[12.5px] text-muted-foreground">No credentials configured.</div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-[15px]">Visibility & ACL</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label className="text-[10.5px] uppercase tracking-[0.15em] text-muted-foreground">Visibility</Label>
                <Select value={server.visibility} onValueChange={v => patch('visibility', v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="private">Private</SelectItem>
                    <SelectItem value="team">Team</SelectItem>
                    <SelectItem value="org">Organization</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-[10.5px] uppercase tracking-[0.15em] text-muted-foreground">Approval policy</Label>
                <Select value={server.approvalPolicy} onValueChange={v => patch('approvalPolicy', v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {APPROVAL_POLICIES.map(p => <SelectItem key={p.id} value={p.id}>{p.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-1 gap-2">
              {ACL_MODES.map(m => (
                <button
                  key={m.id}
                  type="button"
                  onClick={() => patch('acl.mode', m.id)}
                  className={`text-left rounded-lg border p-3 transition-colors ${
                    server.acl.mode === m.id ? 'border-primary bg-primary/5' : 'border-border hover:bg-muted/50'
                  }`}
                >
                  <div className="text-[13px] font-medium">{m.label}</div>
                  <div className="text-[11.5px] text-muted-foreground mt-0.5">{m.desc}</div>
                </button>
              ))}
            </div>
            {server.acl.mode === 'allow-list' && (
              <div>
                <Label className="text-[10.5px] uppercase tracking-[0.15em] text-muted-foreground">Allow groups</Label>
                <Input
                  value={(server.acl.allowGroups || []).join(', ')}
                  onChange={e => patch('acl.allowGroups', e.target.value.split(',').map(s => s.trim()).filter(Boolean))}
                  placeholder="platform-eng, billing-ai"
                />
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-[15px]">Network</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label className="text-[10.5px] uppercase tracking-[0.15em] text-muted-foreground">Allowed egress IPs (optional)</Label>
              <Input
                value={(server.allowedIps || []).join(', ')}
                onChange={e => patch('allowedIps', e.target.value.split(',').map(s => s.trim()).filter(Boolean))}
                placeholder="10.0.0.0/8, 34.102.0.0/16"
                className="font-mono"
              />
              <p className="mt-1 text-[10.5px] text-muted-foreground">CIDR list. If set, the runtime refuses outbound calls to anything else.</p>
            </div>
            <div>
              <Label className="text-[10.5px] uppercase tracking-[0.15em] text-muted-foreground">Version pin</Label>
              <Select value={server.versionPin} onValueChange={v => patch('versionPin', v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="latest">latest (auto-upgrade)</SelectItem>
                  <SelectItem value="pinned">pinned (manual upgrade)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>
      </div>

      <aside className="space-y-5">
        <Card>
          <CardHeader><CardTitle className="text-[14px]">Audit</CardTitle></CardHeader>
          <CardContent className="text-[12px] text-muted-foreground leading-relaxed">
            Every tool call logs: agent · user · tool · input hash · outcome · latency. Retained 18 months.
          </CardContent>
        </Card>
      </aside>

      <AlertDialog open={rotateOpen} onOpenChange={setRotateOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Rotate secret?</AlertDialogTitle>
            <AlertDialogDescription>
              The current reference will stop working immediately. Make sure the replacement is already staged in the vault.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={() => { patch('auth.secretRef', `${(server.auth.secretRef || 'vault://mcp/new').replace(/\/rotated-.+$/, '')}/rotated-${Date.now().toString(36)}`); setRotateOpen(false); }}>
              Rotate now
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

/* ================= Activity ================= */
function ActivityTab({ server }) {
  const rows = useMemo(() => fakeActivity(server), [server]);
  const columns = useMemo(() => ([
    { id: 'when',    accessorFn: (r) => r.at, header: 'When',    cell: ({ row }) => <span className="tabular-nums font-mono text-[12px] text-muted-foreground">{fmtAgo(new Date(row.original.at).toISOString())}</span> },
    { id: 'agent',   accessorFn: (r) => r.agent, header: 'Agent', cell: ({ getValue }) => <code className="font-mono text-[12px]">{getValue()}</code> },
    { id: 'tool',    accessorFn: (r) => r.tool,  header: 'Tool',  cell: ({ getValue }) => <code className="font-mono text-[12px]">{getValue()}</code> },
    { id: 'outcome', accessorFn: (r) => r.outcome, header: 'Outcome', cell: ({ getValue }) => {
      const v = getValue();
      return <span className={`inline-flex items-center px-1.5 py-0.5 rounded border text-[10.5px] font-mono ${
        v === 'ok' ? 'border-(--brand-teal)/40 text-brand-teal bg-(--brand-teal)/10' :
        v === 'approval' ? 'border-amber-400/40 text-amber-700 bg-amber-400/10 dark:text-amber-400' :
        'border-destructive/40 text-destructive bg-destructive/10'
      }`}>{v}</span>;
    } },
    { id: 'latency', accessorFn: (r) => r.latency, header: 'Latency', meta: { align: 'right' }, cell: ({ getValue }) => <span className="tabular-nums font-mono text-[12px] text-muted-foreground">{getValue()} ms</span> },
    { id: 'user',    accessorFn: (r) => r.user,    header: 'User',    cell: ({ getValue }) => <span className="text-[12px] text-muted-foreground">{getValue()}</span> },
  ]), []);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-[15px]">Recent activity</CardTitle>
        <CardDescription>Last 50 tool calls, agent attribution + outcome. Full retention in the workspace audit log.</CardDescription>
      </CardHeader>
      <CardContent>
        <DataTable
          columns={columns}
          data={rows}
          pageSize={25}
          minWidth="min-w-[760px]"
          initialSorting={[{ id: 'when', desc: false }]}
          emptyMessage="No activity yet."
        />
      </CardContent>
    </Card>
  );
}

function fakeActivity(server) {
  if (server.tools.length === 0) return [];
  const agents = server.attachedAgents.length ? server.attachedAgents : ['agt_demo'];
  const users  = ['prashant@agentvault.io', 'meera@agentvault.io', 'sam@agentvault.io'];
  const outcomes = ['ok', 'ok', 'ok', 'ok', 'approval', 'error'];
  const n = Math.min(50, Math.max(8, Math.floor(server.toolCalls30d / 300)));
  return Array.from({ length: n }).map((_, i) => {
    const t = server.tools[i % server.tools.length];
    return {
      at:      Date.now() - i * 37000 - Math.floor(Math.random() * 120_000),
      agent:   agents[i % agents.length],
      tool:    t.name,
      outcome: outcomes[i % outcomes.length],
      latency: Math.round(80 + Math.random() * 1200),
      user:    users[i % users.length],
    };
  });
}

/* ================= small primitives ================= */
function Stat({ label, value, tone }) {
  const color = tone === 'bad' ? 'text-destructive' : tone === 'good' ? 'text-brand-teal' : 'text-foreground';
  return (
    <div className="rounded-lg border border-border p-3">
      <div className="text-[10.5px] uppercase tracking-[0.15em] font-mono text-muted-foreground">{label}</div>
      <div className={`mt-1 text-[17px] font-semibold tabular-nums ${color}`}>{value}</div>
    </div>
  );
}
function Kv({ k, v, mono }) {
  return (
    <div className="flex items-baseline justify-between gap-6 px-3 py-2 border-b border-border/60 last:border-none">
      <span className="text-[11px] uppercase tracking-[0.14em] font-mono text-muted-foreground">{k}</span>
      <span className={`text-[12.5px] text-right truncate max-w-[60%] ${mono ? 'font-mono' : ''}`}>{v}</span>
    </div>
  );
}
