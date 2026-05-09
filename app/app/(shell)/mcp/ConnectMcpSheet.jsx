'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import {
  X, ChevronRight, ChevronLeft, Check, ExternalLink, ShieldCheck,
  KeyRound, Server, FileKey, ListPlus, Loader2,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { vendorById } from './_catalog';
import { VendorIcon } from './_shared';
import { makeDefaultServer, useServers } from './_store';
import VaultRefPicker from '../vault/VaultRefPicker';

/* ConnectMcpSheet
   ───────────────
   Right drawer that walks an operator from "I want to use this vendor's MCP"
   to a fully-registered server. Branches by `vendor.defaultAuth`:

     oauth   → simulated redirect dance (scopes preview → account picker → authorized)
     bearer  → paste / pick a vault ref for the bearer token
     header  → configure header name + value + extra headers
     mtls    → paste / pick vault refs for cert + key
     none    → just configure endpoint + visibility

   On finish, calls createServer() with a deterministic id (`mcp_<vendorId>_default`)
   and a status of `connected` plus realistic seeded tool list pulled from the
   catalog's mockTools.
*/

export default function ConnectMcpSheet({ open, onClose, vendorId, onConnected }) {
  const vendor = vendorId ? vendorById(vendorId) : null;
  const { createServer } = useServers();

  const [step, setStep]     = useState('configure');     // configure | oauth-scopes | oauth-account | finishing
  const [form, setForm]     = useState(() => emptyForm());
  const [busy, setBusy]     = useState(false);

  // Reset form when sheet opens for a new vendor
  useEffect(() => {
    if (!open || !vendor) return;
    setForm(initialFormFor(vendor));
    setStep('configure');
  }, [open, vendorId, vendor]);

  // Body scroll lock + Escape
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const onKey = (e) => { if (e.key === 'Escape' && !busy) onClose(); };
    window.addEventListener('keydown', onKey);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener('keydown', onKey);
    };
  }, [open, onClose, busy]);

  if (!open || !vendor) return null;

  const authKind = vendor.defaultAuth;
  const requiredMissing = authKind === 'oauth' ? false
    : authKind === 'bearer' ? !form.bearerSecretRef
    : authKind === 'header' ? !form.headerName || !form.headerSecretRef
    : authKind === 'mtls'   ? !form.certRef || !form.keyRef
    :                          false;

  const isOauth = authKind === 'oauth';

  const onFinish = async () => {
    setBusy(true);
    setStep('finishing');
    // Tiny pause so the spinner actually shows; no real network.
    await new Promise(r => setTimeout(r, 320));

    const id = `mcp_${vendor.id}_${Math.random().toString(36).slice(2, 6)}`;
    const auth = buildAuth(vendor, form);
    const tools = (vendor.mockTools || []).map(t => ({
      ...t,
      enabled: true,
      approval: !!t.approval || (t.riskLevel === 'high'),
      p50: 0, errorRate: 0, callsMTD: 0, lastUsedAt: null,
    }));
    const server = makeDefaultServer({
      id,
      name: form.name || vendor.label,
      description: form.description || vendor.blurb,
      vendorId: vendor.id,
      transport: vendor.transport,
      endpoint: form.endpoint || vendor.endpoint,
      auth,
      extraHeaders: form.extraHeaders || [],
      allowedIps: form.allowedIps,
      visibility: form.visibility,
      approvalPolicy: form.approvalPolicy,
      acl: { mode: form.aclMode, allowGroups: form.aclGroups },
      status: 'connected',
      lastCheckedAt: new Date().toISOString(),
      tools,
      resources: vendor.mockResources || [],
    });

    createServer(server);
    onConnected?.(server);
    setBusy(false);
    onClose();
  };

  return (
    <>
      <button type="button" aria-label="Close" onClick={busy ? undefined : onClose}
              className="fixed inset-0 z-40 bg-black/40 backdrop-blur-[2px] animate-fade-in" />
      <aside role="dialog" aria-label={`Connect ${vendor.label}`}
             className="fixed inset-y-0 right-0 z-50 w-full sm:w-[560px] lg:w-[640px] bg-card border-l border-border shadow-2xl flex flex-col animate-fade-in">
        {/* Header */}
        <div className="px-5 py-4 border-b border-border flex items-start justify-between gap-3">
          <div className="min-w-0 flex items-start gap-3">
            <div className="h-10 w-10 rounded-md bg-primary/10 text-primary flex items-center justify-center shrink-0">
              <VendorIcon vendorId={vendor.id} size={18} />
            </div>
            <div className="min-w-0">
              <span className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
                Connect MCP server
              </span>
              <h3 className="mt-1 text-[16px] font-semibold text-foreground leading-tight">{vendor.label}</h3>
              <p className="mt-1 text-[12px] text-muted-foreground leading-relaxed line-clamp-2">{vendor.blurb}</p>
            </div>
          </div>
          <button type="button" onClick={onClose} disabled={busy}
                  className="shrink-0 h-7 w-7 rounded text-muted-foreground hover:text-foreground hover:bg-muted disabled:opacity-50 flex items-center justify-center"
                  aria-label="Close">
            <X className="h-3.5 w-3.5" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto">
          {step === 'configure' && (
            <ConfigureStep vendor={vendor} form={form} setForm={setForm} authKind={authKind} />
          )}
          {step === 'oauth-scopes' && (
            <OAuthScopesStep vendor={vendor} form={form} />
          )}
          {step === 'oauth-account' && (
            <OAuthAccountStep vendor={vendor} form={form} setForm={setForm} />
          )}
          {step === 'finishing' && (
            <div className="p-10 text-center">
              <Loader2 className="h-6 w-6 animate-spin text-primary mx-auto" />
              <div className="mt-3 text-[13px] font-medium text-foreground">Registering {vendor.label}…</div>
              <p className="mt-1 text-[12px] text-muted-foreground">Persisting connection metadata.</p>
            </div>
          )}
        </div>

        {/* Footer */}
        {step !== 'finishing' && (
          <div className="px-5 py-3 border-t border-border flex items-center justify-between gap-2">
            <FooterHint
              authKind={authKind}
              step={step}
              requiredMissing={requiredMissing}
            />
            <div className="flex items-center gap-2">
              {step === 'oauth-account' && (
                <Button variant="outline" size="sm" onClick={() => setStep('oauth-scopes')}>
                  <ChevronLeft className="h-3.5 w-3.5" /> Back
                </Button>
              )}
              {step === 'oauth-scopes' && (
                <Button variant="outline" size="sm" onClick={() => setStep('configure')}>
                  <ChevronLeft className="h-3.5 w-3.5" /> Back
                </Button>
              )}
              <Button variant="outline" size="sm" onClick={onClose}>Cancel</Button>
              {step === 'configure' && isOauth && (
                <Button size="sm" onClick={() => setStep('oauth-scopes')}>
                  Authorize <ChevronRight className="h-3.5 w-3.5" />
                </Button>
              )}
              {step === 'configure' && !isOauth && (
                <Button size="sm" onClick={onFinish} disabled={requiredMissing}>
                  <Check className="h-3.5 w-3.5" /> Connect
                </Button>
              )}
              {step === 'oauth-scopes' && (
                <Button size="sm" onClick={() => setStep('oauth-account')}>
                  Continue <ChevronRight className="h-3.5 w-3.5" />
                </Button>
              )}
              {step === 'oauth-account' && (
                <Button size="sm" onClick={onFinish} disabled={!form.oauthAccountId}>
                  <Check className="h-3.5 w-3.5" /> Authorize & connect
                </Button>
              )}
            </div>
          </div>
        )}
      </aside>
    </>
  );
}

/* ───────────────── Configure step ───────────────── */

function ConfigureStep({ vendor, form, setForm, authKind }) {
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));
  return (
    <div className="px-5 py-4 space-y-5">
      <Section title="Identity">
        <div className="space-y-3">
          <Field label="Display name" required>
            <Input value={form.name} onChange={(e) => set('name', e.target.value)}
                   placeholder={vendor.label} className="h-8 text-[12.5px]" />
          </Field>
          <Field label="Description">
            <Input value={form.description} onChange={(e) => set('description', e.target.value)}
                   placeholder="What this server is for" className="h-8 text-[12.5px]" />
          </Field>
          <Field label="Endpoint">
            <Input value={form.endpoint} onChange={(e) => set('endpoint', e.target.value)}
                   placeholder={vendor.endpoint} className="h-8 text-[12.5px] font-mono" />
            {vendor.transport && (
              <p className="mt-1 text-[10.5px] text-muted-foreground">Transport: <span className="font-mono">{vendor.transport}</span></p>
            )}
          </Field>
        </div>
      </Section>

      {/* Auth-specific */}
      {authKind === 'oauth' && (
        <Section title="OAuth" subtitle="Click Authorize to walk through the OAuth dance with this vendor.">
          <div className="rounded-xl border border-border bg-muted/30 p-4 text-[12px] text-muted-foreground flex items-center gap-3">
            <ShieldCheck className="h-4 w-4 text-primary shrink-0" />
            <span>You'll review the requested scopes, pick the account, and authorize on the next steps.</span>
          </div>
        </Section>
      )}

      {authKind === 'bearer' && (
        <Section title="Bearer token" subtitle="Paste a vault reference to the bearer token (or register a new one).">
          <Field label="Token (vault ref)" required>
            <VaultRefPicker
              value={form.bearerSecretRef}
              onChange={(v) => set('bearerSecretRef', v)}
              placeholder={`vault://mcp/${vendor.id}/token`}
            />
          </Field>
        </Section>
      )}

      {authKind === 'header' && (
        <Section title="Custom header" subtitle="Configure the auth header(s) this vendor expects.">
          <div className="space-y-3">
            <Field label="Header name" required>
              <Input value={form.headerName} onChange={(e) => set('headerName', e.target.value)}
                     placeholder="X-API-Key" className="h-8 text-[12.5px] font-mono" />
            </Field>
            <Field label="Value (vault ref)" required>
              <VaultRefPicker value={form.headerSecretRef}
                              onChange={(v) => set('headerSecretRef', v)}
                              placeholder={`vault://mcp/${vendor.id}/key`} />
            </Field>
          </div>

          {/* Extra headers list */}
          <ExtraHeadersEditor headers={form.extraHeaders}
                              onChange={(next) => set('extraHeaders', next)} />
        </Section>
      )}

      {authKind === 'mtls' && (
        <Section title="Mutual TLS" subtitle="Client certificate + private key, both as vault references.">
          <div className="space-y-3">
            <Field label="Client cert (vault ref)" required>
              <VaultRefPicker value={form.certRef}
                              onChange={(v) => set('certRef', v)}
                              placeholder={`vault://mcp/${vendor.id}/client.crt`} />
            </Field>
            <Field label="Client key (vault ref)" required>
              <VaultRefPicker value={form.keyRef}
                              onChange={(v) => set('keyRef', v)}
                              placeholder={`vault://mcp/${vendor.id}/client.key`} />
            </Field>
          </div>
        </Section>
      )}

      {authKind === 'none' && (
        <Section title="No authentication" subtitle="This vendor's endpoint is public or accessible from your VPC without credentials.">
          <div className="rounded-xl border border-amber-500/30 bg-amber-500/5 p-4 text-[12px] text-amber-700 dark:text-amber-400">
            Use only for internal-network endpoints. AgentVault still records every call to the audit log.
          </div>
        </Section>
      )}

      {/* Access controls (always shown, with sensible defaults) */}
      <Section title="Access" subtitle="Who in this workspace can attach + invoke tools from this server.">
        <div className="space-y-3">
          <Field label="Visibility">
            <div className="grid grid-cols-3 gap-2">
              {VISIBILITY_OPTS.map(o => (
                <RadioCard key={o.id}
                           active={form.visibility === o.id}
                           onClick={() => set('visibility', o.id)}
                           label={o.label} blurb={o.blurb} />
              ))}
            </div>
          </Field>
          <Field label="Approval policy">
            <div className="grid grid-cols-3 gap-2">
              {APPROVAL_OPTS.map(o => (
                <RadioCard key={o.id}
                           active={form.approvalPolicy === o.id}
                           onClick={() => set('approvalPolicy', o.id)}
                           label={o.label} blurb={o.blurb} />
              ))}
            </div>
          </Field>
          <Field label="ACL">
            <div className="grid grid-cols-2 gap-2">
              <RadioCard active={form.aclMode === 'inherit'} onClick={() => set('aclMode', 'inherit')}
                         label="Inherit" blurb="Use the vendor's own scoping (OAuth user / SCIM groups)." />
              <RadioCard active={form.aclMode === 'allow-list'} onClick={() => set('aclMode', 'allow-list')}
                         label="Allow list" blurb="Only listed SCIM groups can attach this server." />
            </div>
            {form.aclMode === 'allow-list' && (
              <div className="mt-2">
                <Input value={(form.aclGroups || []).join(', ')}
                       onChange={(e) => set('aclGroups', e.target.value.split(',').map(s => s.trim()).filter(Boolean))}
                       placeholder="grp_engineering, grp_finance"
                       className="h-8 text-[12.5px] font-mono" />
              </div>
            )}
          </Field>
          <Field label="Allowed IP ranges">
            <Input value={(form.allowedIps || []).join(', ')}
                   onChange={(e) => set('allowedIps', e.target.value.split(',').map(s => s.trim()).filter(Boolean))}
                   placeholder="10.0.0.0/8, 192.168.1.0/24"
                   className="h-8 text-[12.5px] font-mono" />
            <p className="mt-1 text-[10.5px] text-muted-foreground">Empty = no IP allowlist.</p>
          </Field>
        </div>
      </Section>
    </div>
  );
}

function ExtraHeadersEditor({ headers, onChange }) {
  const [draft, setDraft] = useState({ name: '', valueRef: '' });
  return (
    <div className="mt-4">
      <div className="text-[11.5px] font-medium text-muted-foreground mb-2">Extra headers</div>
      {(headers || []).length > 0 && (
        <div className="space-y-1.5 mb-2">
          {(headers || []).map((h, i) => (
            <div key={i} className="flex items-center gap-2 px-3 py-2 rounded-md border border-border bg-muted/30 text-[11.5px] font-mono">
              <span className="text-foreground">{h.name}</span>
              <span className="text-muted-foreground">=</span>
              <span className="text-foreground truncate flex-1">{h.valueRef}</span>
              <button type="button" onClick={() => onChange(headers.filter((_, idx) => idx !== i))}
                      className="h-5 w-5 rounded text-muted-foreground hover:text-destructive hover:bg-muted/50 flex items-center justify-center"
                      aria-label="Remove">
                <X className="h-3 w-3" />
              </button>
            </div>
          ))}
        </div>
      )}
      <div className="grid grid-cols-1 sm:grid-cols-[1fr_2fr_auto] gap-2 items-end">
        <Field label="Header">
          <Input value={draft.name} onChange={(e) => setDraft({ ...draft, name: e.target.value })}
                 placeholder="X-Tenant-ID" className="h-8 text-[12.5px] font-mono" />
        </Field>
        <Field label="Value (vault ref)">
          <VaultRefPicker value={draft.valueRef}
                          onChange={(v) => setDraft({ ...draft, valueRef: v })}
                          placeholder="vault://mcp/.../tenant-id" />
        </Field>
        <Button size="sm" variant="outline" className="h-8 text-[12px]"
                disabled={!draft.name.trim() || !draft.valueRef.trim()}
                onClick={() => {
                  onChange([...(headers || []), { name: draft.name.trim(), valueRef: draft.valueRef.trim() }]);
                  setDraft({ name: '', valueRef: '' });
                }}>
          <ListPlus className="h-3.5 w-3.5" /> Add
        </Button>
      </div>
    </div>
  );
}

/* ───────────────── OAuth simulator steps ───────────────── */

function OAuthScopesStep({ vendor, form }) {
  const scopes = vendor.scopes || [];
  return (
    <div className="px-5 py-5">
      <div className="rounded-xl border border-border bg-card p-5">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-full bg-primary/10 text-primary flex items-center justify-center">
            <ShieldCheck className="h-5 w-5" />
          </div>
          <div>
            <div className="text-[13.5px] font-semibold text-foreground">{vendor.label} is requesting permission</div>
            <div className="text-[11.5px] text-muted-foreground">on behalf of your AgentVault workspace</div>
          </div>
        </div>

        <div className="mt-4 text-[12px] font-medium text-foreground">Scopes:</div>
        <ul className="mt-2 space-y-1.5">
          {scopes.length === 0 && (
            <li className="text-[12px] text-muted-foreground">No additional scopes — vendor uses default access.</li>
          )}
          {scopes.map(s => (
            <li key={s} className="flex items-center gap-2 text-[12px]">
              <Check className="h-3.5 w-3.5 text-brand-teal shrink-0" />
              <span className="font-mono">{s}</span>
            </li>
          ))}
        </ul>

        <div className="mt-4 pt-4 border-t border-border text-[11px] text-muted-foreground">
          AgentVault will request these scopes only. Token will be stored as a vault reference; the actual bytes never leave the OAuth provider.
        </div>
      </div>
    </div>
  );
}

function OAuthAccountStep({ vendor, form, setForm }) {
  // Synthesize 2 plausible accounts for the user to "pick from"
  const accounts = useMemo(() => mockAccounts(vendor), [vendor]);
  return (
    <div className="px-5 py-5">
      <div className="text-[13px] font-medium text-foreground mb-1">Choose an account</div>
      <p className="text-[11.5px] text-muted-foreground mb-4">Which {vendor.label} account should AgentVault connect to?</p>

      <div className="space-y-2">
        {accounts.map(a => {
          const active = form.oauthAccountId === a.id;
          return (
            <button key={a.id} type="button"
                    onClick={() => setForm(f => ({ ...f, oauthAccountId: a.id, oauthAccountLabel: a.label }))}
                    className={`w-full text-left p-3 rounded-lg border transition-colors ${
                      active ? 'border-2 border-primary bg-primary/5' : 'border-border bg-muted/20 hover:bg-muted/40'
                    }`}>
              <div className="flex items-center gap-3">
                <span className={`h-3.5 w-3.5 rounded-full border-2 ${active ? 'border-primary bg-primary' : 'border-input'}`} />
                <div className="min-w-0">
                  <div className="text-[12.5px] font-medium text-foreground">{a.label}</div>
                  <div className="text-[10.5px] font-mono text-muted-foreground">{a.id}</div>
                </div>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}

function mockAccounts(vendor) {
  switch (vendor.id) {
    case 'slack':       return [
      { id: 'agentvault.slack.com',   label: 'agentvault.slack.com (workspace)' },
      { id: 'agentvault-eng.slack.com', label: 'agentvault-eng.slack.com (workspace)' },
    ];
    case 'github':      return [
      { id: 'agentvault-eng', label: 'agentvault-eng (org)' },
      { id: 'agentvault-bots', label: 'agentvault-bots (org)' },
    ];
    case 'atlassian':   return [
      { id: 'agentvault.atlassian.net', label: 'agentvault.atlassian.net' },
    ];
    case 'cloudflare':  return [
      { id: 'agentvault-edge', label: 'agentvault-edge (account)' },
    ];
    case 'hubspot':     return [
      { id: 'agentvault-revops', label: 'AgentVault RevOps (portal 27319281)' },
    ];
    case 'asana':       return [
      { id: 'agentvault.asana.com', label: 'AgentVault workspace' },
    ];
    case 'linear':      return [
      { id: 'agentvault', label: 'agentvault.linear.app' },
    ];
    case 'figma':       return [
      { id: 'agentvault-design', label: 'AgentVault Design (team)' },
    ];
    case 'notion':      return [
      { id: 'agentvault-notion', label: 'AgentVault workspace' },
    ];
    case 'zapier':      return [
      { id: 'platform@agentvault.io', label: 'platform@agentvault.io' },
    ];
    case 'pagerduty':   return [
      { id: 'agentvault.pagerduty.com', label: 'agentvault.pagerduty.com' },
    ];
    case 'sentry':      return [
      { id: 'agentvault', label: 'agentvault.sentry.io' },
    ];
    default:            return [{ id: 'default', label: `${vendor.label} default account` }];
  }
}

/* ───────────────── Footer hint ───────────────── */

function FooterHint({ authKind, step, requiredMissing }) {
  if (step === 'oauth-scopes')  return <span className="text-[11px] text-muted-foreground">Reviewing scopes about to be granted.</span>;
  if (step === 'oauth-account') return <span className="text-[11px] text-muted-foreground">Pick the account to authorize.</span>;
  if (requiredMissing)          return <span className="text-[11px] text-destructive">Fill required credential fields.</span>;
  return <span className="text-[11px] text-muted-foreground">Credentials are stored as vault references.</span>;
}

/* ───────────────── Building blocks ───────────────── */

function Section({ title, subtitle, children }) {
  return (
    <section>
      <div className="mb-2.5">
        <h4 className="text-[12px] font-semibold text-foreground">{title}</h4>
        {subtitle && <p className="mt-0.5 text-[11px] text-muted-foreground">{subtitle}</p>}
      </div>
      {children}
    </section>
  );
}

function Field({ label, required, children }) {
  return (
    <label className="block">
      <div className="text-[11px] font-medium text-muted-foreground mb-1">
        {label}{required && <span className="text-destructive ml-0.5">*</span>}
      </div>
      {children}
    </label>
  );
}

function RadioCard({ active, onClick, label, blurb }) {
  return (
    <button type="button" onClick={onClick}
            className={`text-left p-2.5 rounded-md border transition-colors ${
              active ? 'border-primary/40 bg-primary/5' : 'border-border bg-muted/20 hover:bg-muted/40'
            }`}>
      <div className="flex items-center gap-2">
        <span className={`h-3 w-3 rounded-full border-2 ${active ? 'border-primary bg-primary' : 'border-input'}`} />
        <span className={`text-[12px] font-medium ${active ? 'text-primary' : 'text-foreground'}`}>{label}</span>
      </div>
      <p className="mt-0.5 ml-5 text-[10.5px] text-muted-foreground leading-relaxed">{blurb}</p>
    </button>
  );
}

const VISIBILITY_OPTS = [
  { id: 'private', label: 'Private', blurb: 'Only the owner can attach.' },
  { id: 'team',    label: 'Team',    blurb: 'Members of the owning team.' },
  { id: 'org',     label: 'Org',     blurb: 'Anyone in the workspace.' },
];

const APPROVAL_OPTS = [
  { id: 'per-tool', label: 'Per-tool', blurb: 'Each tool carries its own approval flag. Recommended.' },
  { id: 'always',   label: 'Always',   blurb: 'Every call is reviewed.' },
  { id: 'never',    label: 'Never',    blurb: 'Fully automated. High-risk tools still respect their flag.' },
];

/* ───────────────── Form helpers ───────────────── */

function emptyForm() {
  return {
    name: '', description: '', endpoint: '',
    bearerSecretRef: '', headerName: 'X-API-Key', headerSecretRef: '',
    certRef: '', keyRef: '', extraHeaders: [],
    visibility: 'team', approvalPolicy: 'per-tool',
    aclMode: 'inherit', aclGroups: [], allowedIps: [],
    oauthAccountId: '', oauthAccountLabel: '',
  };
}

function initialFormFor(vendor) {
  return {
    ...emptyForm(),
    name: vendor.label,
    description: vendor.blurb,
    endpoint: vendor.endpoint,
    headerName: vendor.id === 'datadog' ? 'DD-API-KEY' : 'X-API-Key',
  };
}

function buildAuth(vendor, form) {
  const kind = vendor.defaultAuth;
  switch (kind) {
    case 'oauth':  return {
      kind: 'oauth',
      clientId: `av-${vendor.id}-prod`,
      tokenUrl: `${vendor.endpoint}/oauth/token`,
      scopes: vendor.scopes || [],
      accountId: form.oauthAccountLabel || form.oauthAccountId || vendor.label,
    };
    case 'bearer': return { kind: 'bearer', secretRef: form.bearerSecretRef };
    case 'header': return { kind: 'header', headerName: form.headerName, secretRef: form.headerSecretRef };
    case 'mtls':   return { kind: 'mtls',   certRef: form.certRef, keyRef: form.keyRef };
    default:       return { kind: 'none' };
  }
}
