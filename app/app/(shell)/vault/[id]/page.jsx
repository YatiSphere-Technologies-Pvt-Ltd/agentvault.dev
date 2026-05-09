'use client';

import { use, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter, notFound } from 'next/navigation';
import {
  ChevronLeft, KeyRound, RefreshCw, Trash2, Copy, ExternalLink,
  ShieldCheck, AlertTriangle, Clock, History, Network, FileText,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { useVault, isExpiringSoon } from '../_vaultStore';
import {
  REFERENCE_STATUSES, secretTypeLabel, statusColor, backendKindById, backendTone,
} from '../_backendCatalog';

export default function VaultRefDetailPage({ params }) {
  const { id } = use(params);
  const decoded = decodeURIComponent(id);
  const router = useRouter();
  const { backends, refs, hydrated, removeReference, rotateReference } = useVault();

  const ref = useMemo(() => refs.find(r => r.id === decoded), [refs, decoded]);
  const backend = ref ? backends.find(b => b.id === ref.backendId) : null;
  const [tab, setTab] = useState('overview');

  if (!hydrated) {
    return <div className="max-w-7xl mx-auto px-6 py-10 text-[13px] text-muted-foreground">Loading…</div>;
  }
  if (!ref) notFound();

  const expiringSoon = isExpiringSoon(ref);
  const color = statusColor(ref.status);
  const meta = REFERENCE_STATUSES.find(s => s.id === ref.status);

  const onCopy = () => { try { navigator.clipboard?.writeText(ref.path); } catch {} };
  const onRotate = () => rotateReference(ref.id);
  const onDelete = () => {
    const ok = confirm(`Delete reference "${ref.path}"? Anything that resolves it will fail until it's recreated.`);
    if (!ok) return;
    removeReference(ref.id);
    router.push('/app/vault');
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-10 py-7">
      <Link href="/app/vault" className="text-[12px] text-muted-foreground hover:text-foreground inline-flex items-center gap-1.5">
        <ChevronLeft className="h-3.5 w-3.5" /> All references
      </Link>

      {/* Header */}
      <div className="mt-4 flex items-start justify-between gap-4 flex-wrap">
        <div className="min-w-0 max-w-3xl">
          <div className="flex items-center gap-2.5 flex-wrap">
            <div className="h-9 w-9 rounded-md bg-muted/40 flex items-center justify-center shrink-0">
              <KeyRound className="h-4 w-4 text-muted-foreground" />
            </div>
            <h2 className="text-[20px] font-mono font-semibold text-foreground leading-tight break-all">
              {ref.path}
            </h2>
            <button type="button" onClick={onCopy}
                    className="h-7 w-7 rounded text-muted-foreground hover:text-foreground hover:bg-muted/40 flex items-center justify-center"
                    title="Copy path">
              <Copy className="h-3.5 w-3.5" />
            </button>
            <span
              className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md border text-[11px] font-medium"
              style={{ borderColor: color + '55', color, background: color + '12' }}
            >
              <span className="h-1.5 w-1.5 rounded-full" style={{ background: color }} />
              {meta?.label || ref.status}
            </span>
          </div>
          {ref.description && (
            <p className="mt-3 text-[13px] text-foreground/85 leading-relaxed">{ref.description}</p>
          )}
          <div className="mt-2 text-[12px] text-muted-foreground">
            <span className="font-mono">{secretTypeLabel(ref.type)}</span>
            <span> · </span>
            <span>v{ref.version}</span>
            {ref.updatedAt && (
              <>
                <span> · </span>
                <span>updated {new Date(ref.updatedAt).toLocaleDateString()}</span>
              </>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <Button variant="outline" size="sm" onClick={onRotate}>
            <RefreshCw className="h-3.5 w-3.5" /> Rotate
          </Button>
          <Button variant="outline" size="sm" onClick={onDelete}
                  className="text-destructive border-destructive/40 hover:bg-destructive/10 hover:text-destructive">
            <Trash2 className="h-3.5 w-3.5" /> Delete
          </Button>
        </div>
      </div>

      {expiringSoon && ref.status !== 'expired' && (
        <div className="mt-4 rounded-md border border-accent/40 bg-accent/5 px-3 py-2 text-[12px] text-accent flex items-center gap-2">
          <AlertTriangle className="h-3.5 w-3.5" />
          Next rotation due {new Date(ref.rotation.nextRotationAt).toLocaleDateString()} — within 7 days.
        </div>
      )}

      {/* Stat strip */}
      <div className="mt-5 grid grid-cols-2 sm:grid-cols-4 gap-3">
        <Stat label="Backend"        value={backend?.name || 'unresolved'} sub={backend?.kind} />
        <Stat label="Last rotated"   value={ref.rotation?.lastRotatedAt ? new Date(ref.rotation.lastRotatedAt).toLocaleDateString() : '—'} />
        <Stat label="Next rotation"  value={ref.rotation?.nextRotationAt ? new Date(ref.rotation.nextRotationAt).toLocaleDateString() : '—'}
              tone={ref.status === 'expired' ? 'bad' : expiringSoon ? 'warn' : 'default'} />
        <Stat label="Used by"        value={(ref.usedBy || []).length} sub={(ref.usedBy || []).length === 1 ? 'consumer' : 'consumers'} />
      </div>

      {/* Tabs */}
      <Tabs value={tab} onValueChange={setTab} className="mt-6">
        <TabsList className="h-9 bg-muted/40">
          <TabsTrigger value="overview" className="text-[12.5px]">Overview</TabsTrigger>
          <TabsTrigger value="versions" className="text-[12.5px]">Versions</TabsTrigger>
          <TabsTrigger value="rotation" className="text-[12.5px]">Rotation</TabsTrigger>
          <TabsTrigger value="usedby"   className="text-[12.5px]">Used by</TabsTrigger>
          <TabsTrigger value="audit"    className="text-[12.5px]">Audit</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="mt-5">
          <OverviewTab refData={ref} backend={backend} />
        </TabsContent>
        <TabsContent value="versions" className="mt-5">
          <VersionsTab refData={ref} />
        </TabsContent>
        <TabsContent value="rotation" className="mt-5">
          <RotationTab refData={ref} backend={backend} />
        </TabsContent>
        <TabsContent value="usedby" className="mt-5">
          <UsedByTab refData={ref} />
        </TabsContent>
        <TabsContent value="audit" className="mt-5">
          <AuditTab refData={ref} />
        </TabsContent>
      </Tabs>
    </div>
  );
}

/* ─────────────── Overview ─────────────── */

function OverviewTab({ refData, backend }) {
  const kind = backend ? backendKindById(backend.kind) : null;
  const color = backend ? backendTone(backend.kind) : 'var(--muted-foreground)';

  return (
    <div className="space-y-5">
      <Section title="Backend resolution" subtitle="Where the secret bytes actually live. AgentVault holds only the path + connection metadata.">
        {!backend ? (
          <div className="rounded-xl border border-destructive/40 bg-destructive/5 p-4 text-[12.5px] text-destructive flex items-start gap-2">
            <AlertTriangle className="h-4 w-4 mt-0.5 shrink-0" />
            <span>Backend <span className="font-mono">{refData.backendId}</span> no longer exists. Resolution will fail until you re-attach to a backend.</span>
          </div>
        ) : (
          <div className="rounded-xl border border-border bg-card p-4">
            <div className="flex items-start gap-3">
              <span className="mt-1.5 h-2 w-2 rounded-full" style={{ background: color }} />
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <Link href="/app/vault/backends" className="text-[14px] font-semibold text-foreground hover:text-primary">{backend.name}</Link>
                  <span className="inline-flex items-center px-1.5 py-0.5 rounded border text-[10px] font-medium"
                        style={{ borderColor: color + '55', color, background: color + '12' }}>
                    {kind?.label.split(' (')[0]}
                  </span>
                </div>
                <div className="mt-1 text-[11.5px] text-muted-foreground font-mono break-all">
                  → {refData.backendPath || '—'}
                </div>
                <div className="mt-2 flex flex-wrap gap-2 text-[11px] font-mono text-muted-foreground">
                  {backend.options?.region && <span>region: <span className="text-foreground">{backend.options.region}</span></span>}
                  {backend.auth?.authMethod && <span>auth: <span className="text-foreground">{backend.auth.authMethod}</span></span>}
                </div>
              </div>
              <Link href="/app/vault/backends" className="text-[12px] text-primary hover:brightness-110 inline-flex items-center gap-1 shrink-0">
                Open <ExternalLink className="h-3 w-3" />
              </Link>
            </div>
          </div>
        )}
      </Section>

      <Section title="Identity" subtitle="Stable metadata about this reference.">
        <dl className="rounded-xl border border-border bg-card divide-y divide-border">
          <Row label="Reference ID" value={<span className="font-mono">{refData.id}</span>} />
          <Row label="Path"         value={<span className="font-mono break-all">{refData.path}</span>} />
          <Row label="Backend path" value={<span className="font-mono break-all">{refData.backendPath || '—'}</span>} />
          <Row label="Type"         value={secretTypeLabel(refData.type)} />
          <Row label="Created"      value={refData.createdAt ? new Date(refData.createdAt).toLocaleString() : '—'} />
          <Row label="Updated"      value={refData.updatedAt ? new Date(refData.updatedAt).toLocaleString() : '—'} />
        </dl>
      </Section>
    </div>
  );
}

/* ─────────────── Versions ─────────────── */

function VersionsTab({ refData }) {
  const versions = refData.versions || [];
  return (
    <Section title="Version history" subtitle="Each rotation creates a new version. AgentVault tracks the version id; bytes live in the backend.">
      <div className="rounded-xl border border-border bg-card overflow-hidden divide-y divide-border">
        {versions.length === 0 ? (
          <div className="p-6 text-center text-[12.5px] text-muted-foreground">No versions recorded.</div>
        ) : versions.map((v, i) => {
          const current = v.version === refData.version;
          return (
            <div key={v.version} className="px-4 py-3 grid grid-cols-[80px_1fr_140px] gap-3 items-baseline">
              <div className="font-mono text-[12px] tabular-nums text-foreground">
                v{v.version}
                {current && (
                  <span className="ml-2 inline-flex items-center px-1.5 py-0.5 rounded border border-primary/40 bg-primary/10 text-primary text-[9.5px] font-medium">
                    current
                  </span>
                )}
              </div>
              <div>
                <div className="text-[12.5px] text-foreground">
                  {v.autoRefresh ? 'Auto-refreshed' : 'Created'}{v.by ? ` by ${v.by}` : ''}
                </div>
              </div>
              <div className="text-right text-[11px] font-mono text-muted-foreground">
                {new Date(v.createdAt).toLocaleString()}
              </div>
            </div>
          );
        })}
      </div>
    </Section>
  );
}

/* ─────────────── Rotation ─────────────── */

const POLICIES = [
  { id: 'manual',           label: 'Manual',          blurb: 'Only rotate when an operator clicks Rotate.' },
  { id: 'auto-refresh',     label: 'Auto-refresh',    blurb: 'OAuth-style: refresh tokens are exchanged transparently. No fixed cadence.' },
  { id: 'every-30-days',    label: 'Every 30 days',   blurb: 'Aggressive — for high-value API keys.' },
  { id: 'every-90-days',    label: 'Every 90 days',   blurb: 'Recommended for most API keys.' },
  { id: 'every-180-days',   label: 'Every 180 days',  blurb: 'For lower-value keys with operational rotation cost.' },
  { id: 'every-365-days',   label: 'Every 365 days',  blurb: 'Minimum for long-lived certificates.' },
];

function RotationTab({ refData, backend }) {
  const r = refData.rotation || {};
  const policy = POLICIES.find(p => p.id === r.policy);
  const expiringSoon = isExpiringSoon(refData);

  return (
    <div className="space-y-5">
      <Section title="Rotation policy">
        <div className="rounded-xl border border-border bg-card p-4">
          <div className="flex items-center gap-2 mb-2">
            <Clock className="h-4 w-4 text-muted-foreground" />
            <span className="text-[14px] font-semibold text-foreground">{policy?.label || 'Manual'}</span>
            {r.autoRotate && (
              <span className="inline-flex items-center px-1.5 py-0.5 rounded border border-(--brand-teal)/40 bg-(--brand-teal)/10 text-brand-teal text-[10px] font-medium">
                auto
              </span>
            )}
          </div>
          {policy?.blurb && <p className="text-[12px] text-muted-foreground">{policy.blurb}</p>}
        </div>
      </Section>

      <Section title="Schedule">
        <dl className="rounded-xl border border-border bg-card divide-y divide-border">
          <Row label="Last rotated" value={r.lastRotatedAt ? new Date(r.lastRotatedAt).toLocaleString() : '—'} />
          <Row label="Next rotation"
               value={
                 r.nextRotationAt
                   ? <span className={refData.status === 'expired' ? 'text-destructive' : expiringSoon ? 'text-accent' : 'text-foreground'}>
                       {new Date(r.nextRotationAt).toLocaleString()}
                     </span>
                   : <span className="text-muted-foreground">—</span>
               } />
          <Row label="Auto-rotate"  value={r.autoRotate ? 'Yes' : 'No'} />
        </dl>
      </Section>

      {backend && (
        <Section title="Backend support" subtitle="Whether the connected backend supports automated rotation natively.">
          <div className="rounded-xl border border-border bg-card p-4 text-[12.5px]">
            {(() => {
              const kind = backend.kind;
              if (kind === 'aws-secrets-manager') return <span><span className="text-brand-teal">✓</span> AWS Secrets Manager supports native rotation via Lambda. Configure rotation in the AWS console; AgentVault detects new versions automatically.</span>;
              if (kind === 'azure-keyvault')      return <span><span className="text-brand-teal">✓</span> Azure Key Vault supports auto-rotation via Event Grid + Function App.</span>;
              if (kind === 'gcp-secret-manager')  return <span><span className="text-brand-teal">✓</span> GCP Secret Manager supports rotation schedules via Cloud Scheduler.</span>;
              if (kind === 'hashicorp-vault')     return <span><span className="text-brand-teal">✓</span> HashiCorp Vault supports dynamic secrets + lease rotation.</span>;
              if (kind === 'builtin')             return <span><span className="text-amber-500">!</span> The built-in vault rotates on a fixed schedule via the AgentVault control plane.</span>;
              return <span className="text-muted-foreground">No native rotation hook for this backend. Rotate manually.</span>;
            })()}
          </div>
        </Section>
      )}
    </div>
  );
}

/* ─────────────── Used by ─────────────── */

function UsedByTab({ refData }) {
  const consumers = refData.usedBy || [];
  return (
    <Section title="Resolved by"
             subtitle="Every entity that calls this reference. Removing the reference will cause these to fail at runtime.">
      {consumers.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border bg-muted/20 p-6 text-center text-[12.5px] text-muted-foreground">
          Nothing in the workspace currently resolves this reference.
        </div>
      ) : (
        <div className="rounded-xl border border-border bg-card overflow-hidden divide-y divide-border">
          {consumers.map((c, i) => {
            const href =
                c.kind === 'tool-provider' ? `/app/tools/${encodeURIComponent(c.toolId)}`
              : c.kind === 'tool'          ? `/app/tools/${encodeURIComponent(c.toolId)}`
              : c.kind === 'mcp-server'    ? `/app/mcp/${c.mcpServerId}`
              :                              null;
            const Icon =
                c.kind === 'tool-provider' || c.kind === 'tool' ? Network
              : c.kind === 'mcp-server'                          ? Network
              :                                                    FileText;
            return (
              <div key={i} className="px-4 py-3 flex items-center justify-between gap-2">
                <div className="flex items-center gap-3 min-w-0">
                  <Icon className="h-4 w-4 text-muted-foreground shrink-0" />
                  <div className="min-w-0">
                    <div className="text-[13px] text-foreground truncate">{c.label}</div>
                    <div className="text-[10.5px] font-mono text-muted-foreground">{c.kind}</div>
                  </div>
                </div>
                {href && (
                  <Link href={href} className="text-[12px] text-primary hover:brightness-110 inline-flex items-center gap-1 shrink-0">
                    Open <ExternalLink className="h-3 w-3" />
                  </Link>
                )}
              </div>
            );
          })}
        </div>
      )}
    </Section>
  );
}

/* ─────────────── Audit ─────────────── */

function AuditTab({ refData }) {
  const events = synthAuditTrail(refData);
  return (
    <Section title="Activity"
             subtitle="Every read, rotation, attach, and update — chained for tamper-evidence (av.run.audit-log).">
      <div className="rounded-xl border border-border bg-card overflow-hidden divide-y divide-border">
        {events.map((e, i) => (
          <div key={i} className="px-4 py-3 grid grid-cols-[120px_1fr_140px] gap-3 items-baseline">
            <div className="text-[10.5px] font-mono text-muted-foreground tabular-nums">{e.kind}</div>
            <div>
              <div className="text-[12.5px] text-foreground">{e.message}</div>
              {e.actor && <div className="mt-0.5 text-[11px] font-mono text-muted-foreground">{e.actor}</div>}
            </div>
            <div className="text-right text-[11px] font-mono text-muted-foreground">
              {new Date(e.at).toLocaleString()}
            </div>
          </div>
        ))}
      </div>
    </Section>
  );
}

function synthAuditTrail(ref) {
  // Real implementation pulls from an immutable log keyed off ref.id.
  // For the demo, derive a plausible series from existing fields.
  const events = [];
  events.push({
    kind: 'created',
    message: `Reference created at ${ref.path}`,
    actor: 'platform@agentvault.io',
    at: ref.createdAt,
  });
  for (const v of (ref.versions || []).slice().reverse()) {
    if (v.version === 1 && new Date(v.createdAt).getTime() === new Date(ref.createdAt).getTime()) continue;
    events.push({
      kind: v.autoRefresh ? 'auto-refresh' : 'rotated',
      message: v.autoRefresh ? `Auto-refreshed to v${v.version}` : `Rotated to v${v.version}`,
      actor: v.by,
      at: v.createdAt,
    });
  }
  for (const u of (ref.usedBy || [])) {
    events.push({
      kind: 'attached',
      message: `Attached as credential for ${u.label}`,
      actor: 'platform@agentvault.io',
      at: ref.createdAt,
    });
  }
  events.sort((a, b) => new Date(b.at).getTime() - new Date(a.at).getTime());
  return events;
}

/* ─────────────── Helpers ─────────────── */

function Section({ title, subtitle, children }) {
  return (
    <section>
      <div className="mb-3">
        <h3 className="text-[14px] font-semibold text-foreground">{title}</h3>
        {subtitle && <p className="mt-0.5 text-[12px] text-muted-foreground max-w-200">{subtitle}</p>}
      </div>
      {children}
    </section>
  );
}

function Row({ label, value }) {
  return (
    <div className="grid grid-cols-[140px_1fr] gap-3 px-4 py-2.5">
      <dt className="text-[12px] text-muted-foreground">{label}</dt>
      <dd className="text-[12.5px] text-foreground break-all">{value}</dd>
    </div>
  );
}

function Stat({ label, value, sub, tone = 'default' }) {
  const color = tone === 'bad'  ? 'text-destructive'
              : tone === 'warn' ? 'text-primary'
              : tone === 'ok'   ? 'text-brand-teal'
              :                   'text-foreground';
  return (
    <div className="rounded-lg border border-border bg-card p-3">
      <div className="text-[11.5px] font-medium text-muted-foreground">{label}</div>
      <div className="mt-1 flex items-baseline gap-1.5">
        <div className={`text-[16px] font-semibold tabular-nums ${color} truncate`}>{value}</div>
        {sub && <div className="text-[11px] text-muted-foreground truncate">{sub}</div>}
      </div>
    </div>
  );
}
