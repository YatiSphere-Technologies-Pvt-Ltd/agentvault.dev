'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { ArrowLeft, ArrowRight, Check, KeyRound, Plus, Shield, Trash2 } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import {
  ACL_MODES, APPROVAL_POLICIES, AUTH_KINDS, TRANSPORTS, VENDORS, vendorById,
} from '../_catalog';
import { useServers } from '../_store';
import { RiskPill, VendorIcon } from '../_shared';

const STEPS = [
  { id: 'source',    label: 'Source',       hint: 'Vendor preset or custom' },
  { id: 'transport', label: 'Transport',    hint: 'How to reach the server' },
  { id: 'auth',      label: 'Authentication',hint: 'Credentials in the vault' },
  { id: 'access',    label: 'Access · Discover', hint: 'ACL + probe tools' },
];

export default function NewMCPServerPage() {
  const router = useRouter();
  const { createServer } = useServers();
  const [stepIdx, setStepIdx] = useState(0);
  const step = STEPS[stepIdx].id;

  // step 1
  const [vendorId, setVendorId] = useState('custom');
  // step 2
  const [identity, setIdentity] = useState({ name: '', description: '', team: 'Default team' });
  const [transport, setTransport] = useState('streamable-http');
  const [endpoint, setEndpoint] = useState('');
  const [testState, setTestState] = useState('idle'); // idle | testing | ok | fail
  // step 3
  const [authKind, setAuthKind] = useState('bearer');
  const [oauth, setOauth] = useState({ clientId: '', tokenUrl: '', scopes: '', accountId: '' });
  const [bearer, setBearer] = useState({ secretRef: '' });
  const [header, setHeader] = useState({ headerName: 'X-API-Key', secretRef: '' });
  const [mtls, setMtls] = useState({ certRef: '', keyRef: '' });
  const [extraHeaders, setExtraHeaders] = useState([]);
  // step 4
  const [visibility, setVisibility]   = useState('team');
  const [aclMode, setAclMode]         = useState('inherit');
  const [allowGroups, setAllowGroups] = useState('');
  const [approvalPolicy, setApprovalPolicy] = useState('per-tool');
  const [discovered, setDiscovered]   = useState(null); // { tools, resources }
  const [discoverState, setDiscoverState] = useState('idle'); // idle | discovering | done | fail

  const vendor = vendorById(vendorId);

  const applyVendor = (id) => {
    const v = vendorById(id);
    setVendorId(id);
    setTransport(v.transport);
    setEndpoint(v.endpoint);
    setAuthKind(v.defaultAuth);
    if (v.defaultAuth === 'oauth' && v.scopes.length) {
      setOauth(o => ({ ...o, scopes: v.scopes.join(' ') }));
    }
    if (v.id !== 'custom' && !identity.name) {
      setIdentity(s => ({ ...s, name: `${v.label} server` }));
    }
  };

  const testConnection = async () => {
    setTestState('testing');
    await new Promise(r => setTimeout(r, 900));
    setTestState(Math.random() > 0.08 ? 'ok' : 'fail');
  };

  const discoverTools = async () => {
    setDiscoverState('discovering');
    await new Promise(r => setTimeout(r, 1100));
    // Custom vendor returns a placeholder tool; others use catalog mock.
    const tools = vendor.mockTools?.length ? vendor.mockTools : [
      { name: 'echo', description: 'Ping the server and echo a payload.', riskLevel: 'low' },
    ];
    setDiscovered({
      tools: tools.map(t => ({ ...t, enabled: true, approval: t.riskLevel === 'high', p50: 0, errorRate: 0, callsMTD: 0, lastUsedAt: null })),
      resources: vendor.mockResources || [],
    });
    setDiscoverState('done');
  };

  const canAdvance = (() => {
    if (step === 'source')    return !!vendorId;
    if (step === 'transport') return identity.name.trim().length > 0 && endpoint.trim().length > 0;
    if (step === 'auth')      return authValid();
    if (step === 'access')    return !!discovered;
    return true;
  })();

  function authValid() {
    if (authKind === 'none')   return true;
    if (authKind === 'oauth')  return oauth.clientId.trim() && oauth.tokenUrl.trim();
    if (authKind === 'bearer') return bearer.secretRef.trim();
    if (authKind === 'header') return header.headerName.trim() && header.secretRef.trim();
    if (authKind === 'mtls')   return mtls.certRef.trim() && mtls.keyRef.trim();
    return false;
  }

  const finish = () => {
    const auth = buildAuth({ authKind, oauth, bearer, header, mtls });
    const s = createServer({
      vendorId,
      name: identity.name.trim(),
      description: identity.description.trim(),
      team: identity.team,
      transport,
      endpoint: endpoint.trim(),
      auth,
      extraHeaders: extraHeaders.map(h => ({ name: h.name, valueRef: h.valueRef })),
      visibility,
      acl: { mode: aclMode, allowGroups: allowGroups.split(',').map(s => s.trim()).filter(Boolean) },
      approvalPolicy,
      tools: (discovered?.tools || []),
      resources: (discovered?.resources || []),
      status: 'connected',
      lastCheckedAt: new Date().toISOString(),
    });
    router.push(`/app/mcp/${s.id}`);
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-10 py-6 sm:py-10">
      <Link href="/app/mcp" className="text-[12px] text-muted-foreground hover:text-foreground inline-flex items-center gap-1.5">
        <ArrowLeft className="h-3.5 w-3.5" /> All servers
      </Link>

      <div className="mt-4 flex items-start gap-3">
        <div className="h-10 w-10 rounded-md bg-primary/10 text-primary flex items-center justify-center shrink-0 mt-1">
          <VendorIcon vendorId={vendorId} size={18} />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <div className="text-[10.5px] uppercase tracking-[0.2em] text-muted-foreground font-mono">Add MCP server</div>
            {vendor && <Badge variant="outline" className="text-[9.5px]">{vendor.label}</Badge>}
          </div>
          <h1 className="mt-1 text-[28px] font-semibold tracking-tight">Register a Model Context Protocol endpoint</h1>
          <p className="mt-1 text-[13.5px] text-muted-foreground">
            Credentials never leave the vault. Agents get scoped tool access; they never see raw secrets.
          </p>
        </div>
      </div>

      <ol className="mt-7 grid gap-3" style={{ gridTemplateColumns: `repeat(${STEPS.length}, minmax(0, 1fr))` }}>
        {STEPS.map((s, i) => {
          const state = stepIdx > i ? 'done' : stepIdx === i ? 'active' : 'future';
          return (
            <li key={s.id}
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
                  <div className="text-[12px] font-medium leading-tight truncate">{s.label}</div>
                  <div className="text-[10.5px] text-muted-foreground truncate">{s.hint}</div>
                </div>
              </div>
            </li>
          );
        })}
      </ol>

      <div className="mt-6">
        {step === 'source'    && <StepSource    vendorId={vendorId} onPick={applyVendor} />}
        {step === 'transport' && <StepTransport identity={identity} setIdentity={setIdentity} transport={transport} setTransport={setTransport} endpoint={endpoint} setEndpoint={setEndpoint} testState={testState} testConnection={testConnection} />}
        {step === 'auth'      && <StepAuth      vendor={vendor} authKind={authKind} setAuthKind={setAuthKind} oauth={oauth} setOauth={setOauth} bearer={bearer} setBearer={setBearer} header={header} setHeader={setHeader} mtls={mtls} setMtls={setMtls} extraHeaders={extraHeaders} setExtraHeaders={setExtraHeaders} />}
        {step === 'access'    && <StepAccess    visibility={visibility} setVisibility={setVisibility} aclMode={aclMode} setAclMode={setAclMode} allowGroups={allowGroups} setAllowGroups={setAllowGroups} approvalPolicy={approvalPolicy} setApprovalPolicy={setApprovalPolicy} discovered={discovered} discoverState={discoverState} discoverTools={discoverTools} />}
      </div>

      <div className="mt-7 flex items-center justify-between gap-3">
        <Button variant="ghost" onClick={() => stepIdx === 0 ? router.push('/app/mcp') : setStepIdx(s => s - 1)}>
          <ArrowLeft className="h-4 w-4" />
          {stepIdx === 0 ? 'Cancel' : 'Back'}
        </Button>
        {stepIdx < STEPS.length - 1 ? (
          <Button disabled={!canAdvance} onClick={() => setStepIdx(s => s + 1)}>Continue <ArrowRight className="h-4 w-4" /></Button>
        ) : (
          <Button disabled={!canAdvance} onClick={finish}>Register server <ArrowRight className="h-4 w-4" /></Button>
        )}
      </div>
    </div>
  );
}

function buildAuth({ authKind, oauth, bearer, header, mtls }) {
  if (authKind === 'none')   return { kind: 'none' };
  if (authKind === 'oauth')  return { kind: 'oauth',  clientId: oauth.clientId, tokenUrl: oauth.tokenUrl, scopes: oauth.scopes.split(/\s+/).filter(Boolean), accountId: oauth.accountId || null };
  if (authKind === 'bearer') return { kind: 'bearer', secretRef: bearer.secretRef };
  if (authKind === 'header') return { kind: 'header', headerName: header.headerName, secretRef: header.secretRef };
  if (authKind === 'mtls')   return { kind: 'mtls',   certRef: mtls.certRef, keyRef: mtls.keyRef };
  return { kind: authKind };
}

/* ================= Step 1 — Source ================= */
function StepSource({ vendorId, onPick }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-[16px]">Pick a source</CardTitle>
        <CardDescription>Vendor presets ship with a known endpoint, auth method, and tool manifest — you can customize on the next steps.</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {VENDORS.map(v => {
            const active = vendorId === v.id;
            return (
              <button
                key={v.id}
                type="button"
                onClick={() => onPick(v.id)}
                className={`text-left rounded-lg border p-4 transition-colors min-w-0 ${
                  active ? 'border-primary bg-primary/5 ring-2 ring-primary/15' : 'border-border hover:bg-muted/50'
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="h-9 w-9 rounded-md bg-primary/10 text-primary flex items-center justify-center shrink-0">
                    <VendorIcon vendorId={v.id} size={16} />
                  </div>
                  {active && <Check className="h-4 w-4 text-primary shrink-0" />}
                </div>
                <div className="mt-3 text-[14px] font-semibold">{v.label}</div>
                <p className="mt-1 text-[12px] text-muted-foreground leading-snug">{v.blurb}</p>
                {v.endpoint && <div className="mt-2 text-[10.5px] font-mono text-muted-foreground truncate">{v.endpoint}</div>}
              </button>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}

/* ================= Step 2 — Transport + endpoint ================= */
function StepTransport({ identity, setIdentity, transport, setTransport, endpoint, setEndpoint, testState, testConnection }) {
  const set = (k, v) => setIdentity({ ...identity, [k]: v });
  const t = TRANSPORTS.find(x => x.id === transport);
  return (
    <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-5">
      <div className="space-y-5">
        <Card>
          <CardHeader>
            <CardTitle className="text-[16px]">Identity</CardTitle>
            <CardDescription>How this server shows up in the registry and on agent tool lists.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label className="text-[10.5px] uppercase tracking-[0.15em] text-muted-foreground">Name</Label>
                <Input value={identity.name} onChange={e => set('name', e.target.value)} placeholder="Atlassian · Production" autoFocus />
              </div>
              <div>
                <Label className="text-[10.5px] uppercase tracking-[0.15em] text-muted-foreground">Team</Label>
                <Input value={identity.team} onChange={e => set('team', e.target.value)} />
              </div>
              <div className="md:col-span-2">
                <Label className="text-[10.5px] uppercase tracking-[0.15em] text-muted-foreground">Description</Label>
                <Textarea value={identity.description} onChange={e => set('description', e.target.value)} rows={2} placeholder="What's this server for? Who should attach it?" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-[16px]">Transport & endpoint</CardTitle>
            <CardDescription>{t?.blurb}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-[220px_1fr] gap-4">
              <div>
                <Label className="text-[10.5px] uppercase tracking-[0.15em] text-muted-foreground">Transport</Label>
                <Select value={transport} onValueChange={setTransport}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {TRANSPORTS.map(x => <SelectItem key={x.id} value={x.id}>{x.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-[10.5px] uppercase tracking-[0.15em] text-muted-foreground">{transport === 'stdio' ? 'Command' : 'Endpoint URL'}</Label>
                <Input
                  value={endpoint}
                  onChange={e => setEndpoint(e.target.value)}
                  placeholder={transport === 'stdio' ? '/usr/local/bin/my-mcp-server' : 'https://mcp.example.com'}
                  className="font-mono"
                />
              </div>
            </div>
            <div className="flex items-center justify-between p-3 rounded-lg border border-dashed border-border bg-muted/30 text-[12px]">
              <div className="text-muted-foreground">
                We'll probe the endpoint for <code className="font-mono">/.well-known/mcp</code> and verify transport.
              </div>
              <div className="flex items-center gap-2">
                {testState === 'ok' && <span className="text-[11.5px] text-brand-teal font-mono">✓ reachable</span>}
                {testState === 'fail' && <span className="text-[11.5px] text-destructive font-mono">✗ unreachable</span>}
                <Button variant="outline" size="sm" onClick={testConnection} disabled={testState === 'testing' || !endpoint.trim()}>
                  {testState === 'testing' ? 'Testing…' : 'Test connection'}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <aside className="space-y-5">
        <Card>
          <CardHeader><CardTitle className="text-[14px]">Connection rules</CardTitle></CardHeader>
          <CardContent className="text-[12px] text-muted-foreground leading-relaxed space-y-2">
            <p><b className="text-foreground">Only HTTPS</b> for remote servers. We refuse cleartext.</p>
            <p><b className="text-foreground">stdio</b> is local-only and runs inside a sandboxed worker. Rarely what you want in production.</p>
          </CardContent>
        </Card>
      </aside>
    </div>
  );
}

/* ================= Step 3 — Auth ================= */
function StepAuth({ vendor, authKind, setAuthKind, oauth, setOauth, bearer, setBearer, header, setHeader, mtls, setMtls, extraHeaders, setExtraHeaders }) {
  const allowed = vendor.authKinds?.length ? vendor.authKinds : ['oauth', 'bearer', 'header', 'mtls', 'none'];
  const kinds = AUTH_KINDS.filter(k => allowed.includes(k.id));

  const addHeader  = () => setExtraHeaders([...extraHeaders, { name: '', valueRef: '' }]);
  const setHdr     = (i, patch) => setExtraHeaders(extraHeaders.map((h, idx) => idx === i ? { ...h, ...patch } : h));
  const removeHdr  = (i) => setExtraHeaders(extraHeaders.filter((_, idx) => idx !== i));

  return (
    <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-5">
      <div className="space-y-5">
        <Card>
          <CardHeader>
            <CardTitle className="text-[16px]">Authentication</CardTitle>
            <CardDescription>Pick a method. Secrets store as references — we never render raw values after creation.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
              {kinds.map(k => {
                const active = authKind === k.id;
                return (
                  <button
                    key={k.id}
                    type="button"
                    onClick={() => setAuthKind(k.id)}
                    className={`text-left rounded-lg border p-3 transition-colors ${
                      active ? 'border-primary bg-primary/5' : 'border-border hover:bg-muted/50'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <div className="text-[13px] font-medium">{k.label}</div>
                      {k.recommended && <Badge variant="outline" className="text-[9.5px]">Recommended</Badge>}
                    </div>
                    <div className="mt-0.5 text-[11.5px] text-muted-foreground">{k.blurb}</div>
                  </button>
                );
              })}
            </div>

            {authKind === 'oauth' && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div><Label className="text-[10.5px] uppercase tracking-[0.15em] text-muted-foreground">Client ID</Label>
                  <Input value={oauth.clientId} onChange={e => setOauth({ ...oauth, clientId: e.target.value })} placeholder="av-atlassian-prod" /></div>
                <div><Label className="text-[10.5px] uppercase tracking-[0.15em] text-muted-foreground">Token URL</Label>
                  <Input value={oauth.tokenUrl} onChange={e => setOauth({ ...oauth, tokenUrl: e.target.value })} placeholder="https://auth.vendor.com/oauth/token" className="font-mono" /></div>
                <div className="md:col-span-2"><Label className="text-[10.5px] uppercase tracking-[0.15em] text-muted-foreground">Scopes (space-separated)</Label>
                  <Input value={oauth.scopes} onChange={e => setOauth({ ...oauth, scopes: e.target.value })} placeholder="read write:issues" className="font-mono" /></div>
                <div className="md:col-span-2"><Label className="text-[10.5px] uppercase tracking-[0.15em] text-muted-foreground">Connected account</Label>
                  <Select value={oauth.accountId} onValueChange={v => setOauth({ ...oauth, accountId: v })}>
                    <SelectTrigger><SelectValue placeholder="Pick a connected account or connect new…" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="agentvault-prod (OAuth)">agentvault-prod (OAuth)</SelectItem>
                      <SelectItem value="agentvault-eng (OAuth)">agentvault-eng (OAuth)</SelectItem>
                      <SelectItem value="__new">+ Connect new account…</SelectItem>
                    </SelectContent>
                  </Select>
                  <p className="mt-1 text-[10.5px] text-muted-foreground font-mono">Admin-managed at Settings → Integrations.</p>
                </div>
              </div>
            )}

            {authKind === 'bearer' && (
              <div>
                <Label className="text-[10.5px] uppercase tracking-[0.15em] text-muted-foreground">Vault reference</Label>
                <div className="flex gap-2">
                  <Input value={bearer.secretRef} onChange={e => setBearer({ secretRef: e.target.value })} placeholder="vault://mcp/my-server/token" className="font-mono" />
                  <Button variant="outline" size="sm"><KeyRound className="h-3.5 w-3.5" /> Pick</Button>
                </div>
                <p className="mt-1 text-[10.5px] text-muted-foreground">We never store raw tokens. The reference above points at an encrypted entry in the workspace vault.</p>
              </div>
            )}

            {authKind === 'header' && (
              <div className="grid grid-cols-1 md:grid-cols-[200px_1fr_auto] gap-2 items-end">
                <div><Label className="text-[10.5px] uppercase tracking-[0.15em] text-muted-foreground">Header name</Label>
                  <Input value={header.headerName} onChange={e => setHeader({ ...header, headerName: e.target.value })} placeholder="X-API-Key" className="font-mono" /></div>
                <div><Label className="text-[10.5px] uppercase tracking-[0.15em] text-muted-foreground">Vault reference</Label>
                  <Input value={header.secretRef} onChange={e => setHeader({ ...header, secretRef: e.target.value })} placeholder="vault://mcp/my-server/api-key" className="font-mono" /></div>
                <Button variant="outline" size="sm"><KeyRound className="h-3.5 w-3.5" /> Pick</Button>
              </div>
            )}

            {authKind === 'mtls' && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div><Label className="text-[10.5px] uppercase tracking-[0.15em] text-muted-foreground">Certificate reference</Label>
                  <Input value={mtls.certRef} onChange={e => setMtls({ ...mtls, certRef: e.target.value })} placeholder="vault://mcp/my-server/client.crt" className="font-mono" /></div>
                <div><Label className="text-[10.5px] uppercase tracking-[0.15em] text-muted-foreground">Private key reference</Label>
                  <Input value={mtls.keyRef} onChange={e => setMtls({ ...mtls, keyRef: e.target.value })} placeholder="vault://mcp/my-server/client.key" className="font-mono" /></div>
              </div>
            )}

            {authKind === 'none' && (
              <div className="rounded-lg border border-amber-400/40 bg-amber-400/10 p-3 text-[12px] text-amber-900 dark:text-amber-300">
                <b>No auth</b> — only for servers on private networks. This will be blocked if your workspace has public-egress hardening.
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-start justify-between gap-4">
            <div>
              <CardTitle className="text-[15px]">Extra headers (optional)</CardTitle>
              <CardDescription>Static headers sent on every request. Values come from the vault — not inline.</CardDescription>
            </div>
            <Button variant="outline" size="sm" onClick={addHeader}><Plus className="h-3.5 w-3.5" /> Add header</Button>
          </CardHeader>
          <CardContent>
            {extraHeaders.length === 0 ? (
              <div className="p-4 rounded-lg border border-dashed border-border text-[12px] text-muted-foreground text-center">None.</div>
            ) : (
              <ul className="space-y-2">
                {extraHeaders.map((h, i) => (
                  <li key={i} className="grid grid-cols-[1fr_1fr_auto] gap-2 items-center">
                    <Input value={h.name}     onChange={e => setHdr(i, { name: e.target.value })}     placeholder="X-Tenant-ID" className="font-mono" />
                    <Input value={h.valueRef} onChange={e => setHdr(i, { valueRef: e.target.value })} placeholder="vault://mcp/.../tenant-id" className="font-mono" />
                    <Button variant="ghost" size="icon" className="text-destructive" onClick={() => removeHdr(i)}>
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>

      <aside className="space-y-5">
        <Card>
          <CardHeader><CardTitle className="text-[14px] flex items-center gap-2"><Shield className="h-4 w-4 text-primary" /> Secret handling</CardTitle></CardHeader>
          <CardContent className="text-[12px] text-muted-foreground leading-relaxed space-y-2">
            <p>Secrets live in the workspace auth vault, encrypted with customer-managed keys.</p>
            <p>After creation the UI shows a <span className="font-mono text-foreground">vault://</span> reference — the raw value is never rendered again.</p>
            <p>Rotate from the server's <b className="text-foreground">Access</b> tab.</p>
          </CardContent>
        </Card>
      </aside>
    </div>
  );
}

/* ================= Step 4 — Access + Discovery ================= */
function StepAccess({
  visibility, setVisibility, aclMode, setAclMode, allowGroups, setAllowGroups,
  approvalPolicy, setApprovalPolicy, discovered, discoverState, discoverTools,
}) {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-5">
      <div className="space-y-5">
        <Card>
          <CardHeader>
            <CardTitle className="text-[16px]">Visibility & access</CardTitle>
            <CardDescription>Who in your workspace can attach this server's tools to an agent.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label className="text-[10.5px] uppercase tracking-[0.15em] text-muted-foreground">Visibility</Label>
                <Select value={visibility} onValueChange={setVisibility}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="private">Private — just me</SelectItem>
                    <SelectItem value="team">Team</SelectItem>
                    <SelectItem value="org">Organization</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-[10.5px] uppercase tracking-[0.15em] text-muted-foreground">Approval policy default</Label>
                <Select value={approvalPolicy} onValueChange={setApprovalPolicy}>
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
                  onClick={() => setAclMode(m.id)}
                  className={`text-left rounded-lg border p-3 transition-colors ${
                    aclMode === m.id ? 'border-primary bg-primary/5' : 'border-border hover:bg-muted/50'
                  }`}
                >
                  <div className="text-[13px] font-medium">{m.label}</div>
                  <div className="text-[11.5px] text-muted-foreground mt-0.5">{m.desc}</div>
                </button>
              ))}
            </div>
            {aclMode === 'allow-list' && (
              <div>
                <Label className="text-[10.5px] uppercase tracking-[0.15em] text-muted-foreground">Allow SCIM groups</Label>
                <Input value={allowGroups} onChange={e => setAllowGroups(e.target.value)} placeholder="platform-eng, billing-ai" />
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-start justify-between gap-4">
            <div>
              <CardTitle className="text-[16px]">Discover tools</CardTitle>
              <CardDescription>Probe the endpoint to fetch its tool manifest. You can re-run discovery later from the server page.</CardDescription>
            </div>
            <Button onClick={discoverTools} disabled={discoverState === 'discovering'} size="sm" variant={discovered ? 'outline' : 'default'}>
              {discoverState === 'discovering' ? 'Discovering…' : discovered ? 'Re-discover' : 'Discover tools'}
            </Button>
          </CardHeader>
          <CardContent>
            {!discovered ? (
              <div className="p-6 rounded-lg border border-dashed border-border text-center">
                <div className="text-[13px] font-medium">Not yet probed</div>
                <div className="mt-1 text-[11.5px] text-muted-foreground">Click <b>Discover tools</b> to fetch the manifest. Required before registering.</div>
              </div>
            ) : (
              <ul className="divide-y divide-border border border-border rounded-lg overflow-hidden">
                {discovered.tools.map(t => (
                  <li key={t.name} className="flex items-center gap-3 p-3">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <code className="text-[13px] font-mono text-foreground">{t.name}</code>
                        <RiskPill level={t.riskLevel} />
                        {t.approval && <Badge variant="destructive" className="text-[9.5px]">requires approval</Badge>}
                      </div>
                      <div className="text-[11.5px] text-muted-foreground mt-0.5">{t.description}</div>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>

      <aside className="space-y-5">
        <Card>
          <CardHeader><CardTitle className="text-[14px]">Approval cascade</CardTitle></CardHeader>
          <CardContent className="text-[12px] text-muted-foreground leading-relaxed space-y-2">
            <p>Approval decisions flow: <b className="text-foreground">server default</b> → <b className="text-foreground">per-tool override</b> → <b className="text-foreground">per-agent override</b>.</p>
            <p>A tool marked <span className="font-mono text-destructive">high risk</span> requires approval even if the server policy says <span className="font-mono">never</span>.</p>
          </CardContent>
        </Card>
      </aside>
    </div>
  );
}
