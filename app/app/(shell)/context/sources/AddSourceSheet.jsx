'use client';

/* AddSourceSheet — right-side drawer to connect a new source.
   Step 1: pick a kind (warehouse / lake / oltp / saas / docs).
   Step 2: fill auth + props + ACL strategy + freshness target.

   Vault-backed credential fields render as a simple "vault://path" picker
   (real Vault picker exists at /app/vault but for the demo a text input
   pre-filled with a sensible vault:// path is enough). */

import { useEffect, useMemo, useState } from 'react';
import { X, ChevronLeft, ShieldCheck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { SOURCE_CATALOG, SOURCE_FAMILIES } from '../_sourceCatalog';
import { createSource, newSourceId } from '../_store';
import { FamilyPill, SourceIcon } from '../_shared';

const ACL_CHOICES = [
  { id: 'row',    label: 'Row-level',    hint: 'Carry warehouse / RLS row policies through retrieval.' },
  { id: 'column', label: 'Column-level', hint: 'Mask sensitive columns based on role.' },
  { id: 'tag',    label: 'Tag-based',    hint: 'Map data classification tags to retrieval scopes.' },
  { id: 'static', label: 'Static',       hint: 'Manual allowlist — for systems without identity.' },
];

const inputCls = "w-full px-2.5 py-1.5 bg-background border border-border rounded-md text-[12.5px] text-foreground placeholder:text-muted-foreground/60 focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all";

export default function AddSourceSheet({ open, onClose }) {
  const [step, setStep] = useState(1);
  const [kindId, setKindId] = useState(null);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [auth, setAuth] = useState({});
  const [props, setProps] = useState({});
  const [aclStrategy, setAclStrategy] = useState('row');
  const [aclDetail, setAclDetail] = useState('');
  const [freshnessTarget, setFreshnessTarget] = useState(15);
  const [syncMode, setSyncMode] = useState('scheduled');

  const kind = useMemo(() => SOURCE_CATALOG.find(s => s.id === kindId) || null, [kindId]);

  // Body-scroll lock + Escape close + reset on close.
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const onKey = (e) => { if (e.key === 'Escape') onClose?.(); };
    window.addEventListener('keydown', onKey);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener('keydown', onKey);
    };
  }, [open, onClose]);

  useEffect(() => {
    if (!open) {
      setStep(1); setKindId(null); setName(''); setDescription('');
      setAuth({}); setProps({});
      setAclStrategy('row'); setAclDetail(''); setFreshnessTarget(15);
      setSyncMode('scheduled');
    }
  }, [open]);

  // When the user picks a kind, prefill the name + acl default.
  useEffect(() => {
    if (!kind) return;
    if (!name) setName(`${kind.label} · `);
    setAclStrategy(kind.aclSupport?.[0] || 'row');
  }, [kind]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!open) return null;

  const canSubmit = !!kind && name.trim()
    && (kind.auth || []).every(f => !f.required || (auth[f.key] && String(auth[f.key]).trim()))
    && (kind.props || []).every(f => !f.required || (props[f.key] && String(props[f.key]).trim()));

  const onSubmit = () => {
    if (!canSubmit) return;
    const record = {
      id: newSourceId(),
      kind: kind.id,
      name: name.trim(),
      description: description.trim(),
      auth,
      props,
      acl_strategy: aclStrategy,
      acl_detail: aclDetail.trim() || (kind.aclSupport?.includes(aclStrategy) ? `${kind.label} ${aclStrategy}-level access` : ''),
      freshness_target_min: Number(freshnessTarget) || 15,
      freshness_lag_min: 0,
      sync_mode: syncMode,
      last_sync_at: Date.now(),
      row_count: 0,
      tables: 0,
      health: 'green',
      created_at: Date.now(),
      created_by: 'me',
      tags: [],
    };
    createSource(record);
    onClose?.();
  };

  return (
    <>
      <button
        type="button"
        aria-label="Close"
        onClick={onClose}
        className="fixed inset-0 z-40 bg-black/40 backdrop-blur-[2px] animate-fade-in"
      />
      <aside
        role="dialog"
        aria-modal="true"
        className="fixed top-0 right-0 z-50 h-full w-full max-w-[640px] bg-card border-l border-border shadow-2xl flex flex-col animate-slide-in-right"
      >
        <div className="px-5 py-4 border-b border-border flex items-center gap-2">
          {step === 2 && (
            <button onClick={() => setStep(1)} className="h-7 w-7 rounded text-muted-foreground hover:text-foreground hover:bg-muted flex items-center justify-center" aria-label="Back">
              <ChevronLeft className="h-4 w-4" />
            </button>
          )}
          <div className="flex-1 min-w-0">
            <div className="text-[10px] uppercase tracking-[0.16em] font-mono text-muted-foreground">
              {step === 1 ? 'Step 1 of 2 · Pick a source' : 'Step 2 of 2 · Configure'}
            </div>
            <div className="text-[15px] font-semibold text-foreground">
              {step === 1 ? 'Connect a new source' : kind?.label}
            </div>
          </div>
          <button onClick={onClose} className="h-8 w-8 rounded text-muted-foreground hover:text-foreground hover:bg-muted flex items-center justify-center" aria-label="Close">
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-5">
          {step === 1 ? (
            <KindPicker onPick={(k) => { setKindId(k.id); setStep(2); }} />
          ) : (
            <ConfigureForm
              kind={kind}
              name={name} setName={setName}
              description={description} setDescription={setDescription}
              auth={auth} setAuth={setAuth}
              props={props} setProps={setProps}
              aclStrategy={aclStrategy} setAclStrategy={setAclStrategy}
              aclDetail={aclDetail} setAclDetail={setAclDetail}
              freshnessTarget={freshnessTarget} setFreshnessTarget={setFreshnessTarget}
              syncMode={syncMode} setSyncMode={setSyncMode}
            />
          )}
        </div>

        {step === 2 && (
          <div className="border-t border-border bg-muted/20 px-5 py-3 flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => setStep(1)}>Back</Button>
            <Button size="sm" disabled={!canSubmit} onClick={onSubmit} className="ml-auto">
              Connect source
            </Button>
          </div>
        )}
      </aside>
    </>
  );
}

/* ──────────── step 1 ──────────── */

function KindPicker({ onPick }) {
  // Group catalog by family for readability.
  const grouped = SOURCE_CATALOG.reduce((acc, k) => {
    (acc[k.family] = acc[k.family] || []).push(k);
    return acc;
  }, {});
  return (
    <div className="space-y-5">
      {Object.entries(grouped).map(([family, list]) => (
        <section key={family}>
          <div className="flex items-center gap-2 mb-2">
            <div className="text-[10px] uppercase tracking-[0.16em] font-mono text-muted-foreground">
              {SOURCE_FAMILIES[family]?.label || family}
            </div>
            <FamilyPill family={family} />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {list.map(k => (
              <button
                key={k.id}
                type="button"
                onClick={() => onPick(k)}
                className="text-left rounded-md border border-border bg-background hover:border-primary/50 hover:bg-primary/[0.03] hover:shadow-sm transition-all p-3 flex items-start gap-3"
              >
                <SourceIcon kind={k.id} size={32} />
                <div className="min-w-0 flex-1">
                  <div className="text-[12.5px] font-medium text-foreground">{k.label}</div>
                  <div className="text-[11px] text-muted-foreground leading-relaxed mt-0.5 line-clamp-2">{k.blurb}</div>
                  <div className="flex items-center gap-1.5 mt-1.5 flex-wrap">
                    {(k.aclSupport || []).map(a => (
                      <span key={a} className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded border border-(--brand-teal)/30 bg-(--brand-teal)/[0.06] text-brand-teal text-[9.5px] font-mono">
                        <ShieldCheck className="h-2.5 w-2.5" /> {a}
                      </span>
                    ))}
                  </div>
                </div>
              </button>
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}

/* ──────────── step 2 ──────────── */

function ConfigureForm({
  kind, name, setName, description, setDescription,
  auth, setAuth, props, setProps,
  aclStrategy, setAclStrategy, aclDetail, setAclDetail,
  freshnessTarget, setFreshnessTarget, syncMode, setSyncMode,
}) {
  return (
    <div className="space-y-5">
      <Section title="Identity" hint="Names appear in agent configurations and audit logs.">
        <Field label="Display name" required>
          <input className={inputCls} value={name} onChange={(e) => setName(e.target.value)} placeholder={`${kind.label} · production`} />
        </Field>
        <Field label="Description">
          <input className={inputCls} value={description} onChange={(e) => setDescription(e.target.value)} placeholder="What this source represents." />
        </Field>
      </Section>

      <Section title="Connection" hint="Credential fields are stored as Vault references; the platform never sees the secret bytes.">
        {(kind.auth || []).map(f => (
          <Field key={f.key} label={f.label} required={f.required}>
            {f.type === 'select' ? (
              <select className={inputCls} value={auth[f.key] || ''} onChange={(e) => setAuth({ ...auth, [f.key]: e.target.value })}>
                <option value="">{`Select ${f.label.toLowerCase()}…`}</option>
                {(f.options || []).map(o => <option key={o} value={o}>{o}</option>)}
              </select>
            ) : f.kind === 'vault-ref' ? (
              <input className={inputCls + ' font-mono'} value={auth[f.key] || ''} onChange={(e) => setAuth({ ...auth, [f.key]: e.target.value })} placeholder="vault://path/to/secret" />
            ) : (
              <input
                type={f.type === 'number' ? 'number' : 'text'}
                className={inputCls}
                value={auth[f.key] || ''}
                onChange={(e) => setAuth({ ...auth, [f.key]: e.target.value })}
                placeholder={f.placeholder}
              />
            )}
          </Field>
        ))}
      </Section>

      <Section title={`${kind.label} settings`}>
        {(kind.props || []).map(f => (
          <Field key={f.key} label={f.label} required={f.required}>
            {f.type === 'select' ? (
              <select className={inputCls} value={props[f.key] || ''} onChange={(e) => setProps({ ...props, [f.key]: e.target.value })}>
                <option value="">{`Select ${f.label.toLowerCase()}…`}</option>
                {(f.options || []).map(o => <option key={o} value={o}>{o}</option>)}
              </select>
            ) : (
              <input
                type={f.type === 'number' ? 'number' : 'text'}
                className={inputCls}
                value={props[f.key] || ''}
                onChange={(e) => setProps({ ...props, [f.key]: e.target.value })}
                placeholder={f.placeholder}
              />
            )}
          </Field>
        ))}
      </Section>

      <Section title="Access control" hint="How retrieval enforces who can see what. Strategies the connector supports are highlighted.">
        <div className="grid grid-cols-2 gap-2">
          {ACL_CHOICES.map(c => {
            const supported = (kind.aclSupport || []).includes(c.id);
            const active = aclStrategy === c.id;
            return (
              <button
                key={c.id}
                type="button"
                disabled={!supported}
                onClick={() => setAclStrategy(c.id)}
                className={`text-left rounded-md border px-3 py-2 transition-colors ${
                  active
                    ? 'border-primary/50 bg-primary/[0.05]'
                    : supported
                      ? 'border-border bg-background hover:border-primary/40'
                      : 'border-border/60 bg-muted/30 opacity-50 cursor-not-allowed'
                }`}
              >
                <div className="flex items-center justify-between mb-0.5">
                  <span className={`text-[12px] font-medium ${active ? 'text-primary' : 'text-foreground'}`}>{c.label}</span>
                  {!supported && <span className="text-[9.5px] font-mono text-muted-foreground">unsupported</span>}
                </div>
                <div className="text-[10.5px] text-muted-foreground leading-snug">{c.hint}</div>
              </button>
            );
          })}
        </div>
        <Field label="ACL detail (optional)">
          <input className={inputCls + ' font-mono'} value={aclDetail} onChange={(e) => setAclDetail(e.target.value)} placeholder="e.g. role AGENT_READ_RO + tenant_id row policy" />
        </Field>
      </Section>

      <Section title="Freshness + sync">
        <div className="grid grid-cols-2 gap-3">
          <Field label="SLA target (minutes)" required>
            <input
              type="number"
              className={inputCls}
              value={freshnessTarget}
              onChange={(e) => setFreshnessTarget(e.target.value)}
              min="1"
            />
          </Field>
          <Field label="Sync mode" required>
            <select className={inputCls} value={syncMode} onChange={(e) => setSyncMode(e.target.value)}>
              <option value="cdc">Change data capture (CDC)</option>
              <option value="scheduled">Scheduled</option>
              <option value="event">Event-driven</option>
            </select>
          </Field>
        </div>
        <div className="text-[10.5px] font-mono text-muted-foreground">
          Hint for {kind.label}: <span className="text-foreground">{kind.freshnessHint}</span>
        </div>
      </Section>
    </div>
  );
}

function Section({ title, hint, children }) {
  return (
    <section>
      <div className="flex items-baseline justify-between gap-2 mb-2">
        <div className="text-[10px] uppercase tracking-[0.16em] font-mono text-muted-foreground">{title}</div>
        {hint && <div className="text-[10.5px] text-muted-foreground/80 max-w-[60%] text-right">{hint}</div>}
      </div>
      <div className="space-y-2.5">{children}</div>
    </section>
  );
}

function Field({ label, required, children }) {
  return (
    <div>
      <div className="text-[10.5px] uppercase tracking-[0.14em] font-mono text-muted-foreground mb-1">
        {label}{required && <span className="text-destructive ml-0.5">*</span>}
      </div>
      {children}
    </div>
  );
}
