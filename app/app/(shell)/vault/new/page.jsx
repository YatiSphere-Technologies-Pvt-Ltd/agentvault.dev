'use client';

import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';
import { ChevronLeft, Plus, KeyRound, Server } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  SECRET_TYPES, backendKindById, backendTone,
} from '../_backendCatalog';
import { useVault } from '../_vaultStore';

const POLICY_OPTIONS = [
  { id: 'manual',         label: 'Manual',         days: null },
  { id: 'auto-refresh',   label: 'Auto-refresh',   days: null },
  { id: 'every-30-days',  label: 'Every 30 days',  days: 30 },
  { id: 'every-90-days',  label: 'Every 90 days',  days: 90 },
  { id: 'every-180-days', label: 'Every 180 days', days: 180 },
  { id: 'every-365-days', label: 'Every 365 days', days: 365 },
];

export default function NewVaultRefPage() {
  const router = useRouter();
  const search = useSearchParams();
  const presetPath = search.get('path') || '';
  const { backends, addReference } = useVault();

  const [backendId,    setBackendId]    = useState(backends[0]?.id || '');
  const [type,         setType]         = useState('api-key');
  const [path,         setPath]         = useState(presetPath);
  const [backendPath,  setBackendPath]  = useState('');
  const [description,  setDescription]  = useState('');
  const [policy,       setPolicy]       = useState('manual');
  const [autoRotate,   setAutoRotate]   = useState(false);
  const [errors,       setErrors]       = useState([]);

  // Default the path prefix from the chosen backend whenever it changes.
  const backend = backends.find(b => b.id === backendId);
  useEffect(() => {
    if (!backend) return;
    if (!path) setPath(backend.pathPrefix);
  }, [backend, path]);

  const validate = () => {
    const errs = [];
    if (!backendId) errs.push('Pick a backend.');
    if (!path.trim()) errs.push('Reference path is required.');
    if (!path.startsWith('vault://')) errs.push('Path must start with vault://');
    if (!backendPath.trim()) errs.push('Backend-side path is required.');
    return errs;
  };

  const onSave = () => {
    const errs = validate();
    setErrors(errs);
    if (errs.length > 0) return;
    const created = addReference({
      path: path.trim(),
      type,
      backendId,
      backendPath: backendPath.trim(),
      description: description.trim(),
      status: 'active',
      rotation: { policy, autoRotate, lastRotatedAt: new Date().toISOString(), nextRotationAt: nextRotationAt(policy) },
    });
    router.push(`/app/vault/${created.id}`);
  };

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-10 py-7">
      <Link href="/app/vault" className="text-[12px] text-muted-foreground hover:text-foreground inline-flex items-center gap-1.5">
        <ChevronLeft className="h-3.5 w-3.5" /> All references
      </Link>

      <div className="mt-4 mb-6">
        <h2 className="text-[20px] font-semibold tracking-tight text-foreground">New vault reference</h2>
        <p className="mt-1 text-[13px] text-muted-foreground">
          Register a path that AgentVault will resolve through one of your connected backends. The bytes never leave the backend — this page only persists wiring.
        </p>
      </div>

      {errors.length > 0 && (
        <div className="mb-4 border border-destructive/40 bg-destructive/5 rounded-md px-4 py-3 text-[12.5px] text-destructive">
          <div className="font-medium">Fix the following:</div>
          <ul className="mt-1 list-disc list-inside">
            {errors.map((e, i) => <li key={i}>{e}</li>)}
          </ul>
        </div>
      )}

      <div className="space-y-5">
        {/* Backend */}
        <Section title="Backend" subtitle="Where the secret bytes live.">
          {backends.length === 0 ? (
            <div className="rounded-xl border border-dashed border-border bg-muted/20 p-6 text-center">
              <Server className="h-5 w-5 text-muted-foreground/70 mx-auto" />
              <div className="mt-2 text-[13px] font-medium text-foreground">No backends connected</div>
              <p className="mt-1 text-[12px] text-muted-foreground">Connect a backend before registering a reference.</p>
              <Button size="sm" className="mt-3" render={<Link href="/app/vault/backends">Connect backend</Link>} />
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {backends.map(b => {
                const kind = backendKindById(b.kind);
                const color = backendTone(b.kind);
                const active = b.id === backendId;
                return (
                  <button key={b.id} type="button" onClick={() => { setBackendId(b.id); if (!path || path === backend?.pathPrefix) setPath(b.pathPrefix); }}
                          className={`text-left p-3 rounded-lg border transition-colors ${
                            active ? 'border-2 bg-card' : 'border-border bg-muted/20 hover:bg-muted/40'
                          }`}
                          style={{ borderColor: active ? color : undefined }}>
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="h-3 w-3 rounded-full border-2"
                            style={{ borderColor: color, background: active ? color : 'transparent' }} />
                      <span className={`text-[12.5px] font-medium ${active ? 'text-foreground' : 'text-foreground'}`}>{b.name}</span>
                      <span className="ml-auto text-[10.5px] font-mono text-muted-foreground">{kind.label.split(' (')[0]}</span>
                    </div>
                    <div className="mt-1 ml-5 text-[11px] font-mono text-muted-foreground">{b.pathPrefix}</div>
                  </button>
                );
              })}
            </div>
          )}
        </Section>

        {/* Identity */}
        <Section title="Reference">
          <div className="space-y-3">
            <Field label="Path" required>
              <Input value={path} onChange={(e) => setPath(e.target.value)}
                     placeholder={backend?.pathPrefix ? backend.pathPrefix + 'service/key' : 'vault://service/key'}
                     className="h-8 text-[12.5px] font-mono" />
              <p className="mt-1 text-[10.5px] text-muted-foreground">The vault:// URI agents and tools will resolve.</p>
            </Field>
            <Field label="Backend-side path" required>
              <Input value={backendPath} onChange={(e) => setBackendPath(e.target.value)}
                     placeholder={backendPathExample(backend)}
                     className="h-8 text-[12.5px] font-mono" />
              <p className="mt-1 text-[10.5px] text-muted-foreground">{backendPathHint(backend)}</p>
            </Field>
            <Field label="Type" required>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5">
                {SECRET_TYPES.map(t => {
                  const active = t.id === type;
                  return (
                    <button key={t.id} type="button" onClick={() => setType(t.id)}
                            className={`text-left p-2 rounded-md border text-[11.5px] transition-colors ${
                              active ? 'border-primary/40 bg-primary/5 text-primary'
                                     : 'border-border bg-muted/20 text-foreground hover:bg-muted/40'
                            }`}>
                      <div className="font-medium">{t.label}</div>
                      <div className="text-[10.5px] text-muted-foreground line-clamp-1">{t.blurb}</div>
                    </button>
                  );
                })}
              </div>
            </Field>
            <Field label="Description">
              <Input value={description} onChange={(e) => setDescription(e.target.value)}
                     placeholder="What this credential is for"
                     className="h-8 text-[12.5px]" />
            </Field>
          </div>
        </Section>

        {/* Rotation */}
        <Section title="Rotation">
          <div className="space-y-3">
            <Field label="Policy">
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5">
                {POLICY_OPTIONS.map(p => {
                  const active = p.id === policy;
                  return (
                    <button key={p.id} type="button" onClick={() => setPolicy(p.id)}
                            className={`text-left p-2 rounded-md border text-[11.5px] transition-colors ${
                              active ? 'border-primary/40 bg-primary/5 text-primary'
                                     : 'border-border bg-muted/20 text-foreground hover:bg-muted/40'
                            }`}>
                      <div className="font-medium">{p.label}</div>
                      {p.days && <div className="text-[10.5px] text-muted-foreground">{p.days} days</div>}
                    </button>
                  );
                })}
              </div>
            </Field>
            {policy !== 'manual' && (
              <label className="flex items-center gap-2 text-[12px] text-foreground">
                <input type="checkbox" checked={autoRotate} onChange={(e) => setAutoRotate(e.target.checked)}
                       className="h-3.5 w-3.5 accent-primary" />
                Auto-rotate via the backend's native rotation hook (if supported)
              </label>
            )}
          </div>
        </Section>

        {/* Actions */}
        <div className="flex items-center justify-end gap-2">
          <Button variant="outline" size="sm" render={<Link href="/app/vault">Cancel</Link>} />
          <Button size="sm" onClick={onSave}>
            <Plus className="h-3.5 w-3.5" /> Create reference
          </Button>
        </div>
      </div>
    </div>
  );
}

function nextRotationAt(policy) {
  const m = { 'every-30-days': 30, 'every-90-days': 90, 'every-180-days': 180, 'every-365-days': 365 };
  const days = m[policy];
  if (!days) return null;
  return new Date(Date.now() + days * 86400000).toISOString();
}

function backendPathExample(backend) {
  if (!backend) return '';
  switch (backend.kind) {
    case 'aws-secrets-manager': return 'agentvault/web-search/bing/key';
    case 'azure-keyvault':      return 'web-search-bing-key';
    case 'gcp-secret-manager':  return 'projects/agentvault/secrets/web-search-bing/versions/latest';
    case 'hashicorp-vault':     return 'kv/data/web-search/bing/key';
    case 'onepassword':         return 'op://Production/Bing API Key/credential';
    case 'builtin':             return 'web-search/bing/key';
    default:                    return 'service/credential';
  }
}

function backendPathHint(backend) {
  if (!backend) return 'How AgentVault should look up the secret in the backend.';
  switch (backend.kind) {
    case 'aws-secrets-manager': return 'AWS Secrets Manager secret name (or ARN).';
    case 'azure-keyvault':      return 'Azure Key Vault secret name (sans the vault URI).';
    case 'gcp-secret-manager':  return 'Full GCP secret resource name including a version.';
    case 'hashicorp-vault':     return 'KV path inside the configured mount.';
    case 'onepassword':         return '1Password Connect URI (op://vault/item/field).';
    case 'builtin':             return 'Path inside the AgentVault built-in vault.';
    default:                    return '';
  }
}

function Section({ title, subtitle, children }) {
  return (
    <section className="rounded-xl border border-border bg-card p-4">
      <h3 className="text-[14px] font-semibold text-foreground">{title}</h3>
      {subtitle && <p className="mt-0.5 text-[12px] text-muted-foreground mb-3">{subtitle}</p>}
      <div className={subtitle ? '' : 'mt-3'}>{children}</div>
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
