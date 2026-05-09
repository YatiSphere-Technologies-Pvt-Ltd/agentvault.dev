'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import {
  ChevronLeft, Plus, Server, ShieldCheck, Activity, AlertTriangle,
  ExternalLink, Pencil, Trash2, X,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  BACKEND_KINDS, backendKindById, backendTone,
} from '../_backendCatalog';
import { useVault } from '../_vaultStore';

export default function VaultBackendsPage() {
  const { backends, refs, hydrated, addBackend, updateBackend, removeBackend } = useVault();

  const [sheetOpen, setSheetOpen]   = useState(false);
  const [editingId, setEditingId]   = useState(null);

  const refsByBackend = useMemo(() => {
    const m = new Map();
    for (const r of refs) {
      const arr = m.get(r.backendId) || [];
      arr.push(r);
      m.set(r.backendId, arr);
    }
    return m;
  }, [refs]);

  const onAdd = () => { setEditingId(null); setSheetOpen(true); };
  const onEdit = (id) => { setEditingId(id); setSheetOpen(true); };
  const onRemove = (b) => {
    const refs = refsByBackend.get(b.id) || [];
    if (refs.length > 0) {
      alert(`Cannot remove "${b.name}" — ${refs.length} reference${refs.length === 1 ? '' : 's'} still point to it. Move or delete those first.`);
      return;
    }
    const ok = confirm(`Disconnect backend "${b.name}"? AgentVault will stop resolving references against it.`);
    if (!ok) return;
    removeBackend(b.id);
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-10 py-7">
      <Link href="/app/vault" className="text-[12px] text-muted-foreground hover:text-foreground inline-flex items-center gap-1.5">
        <ChevronLeft className="h-3.5 w-3.5" /> Back to references
      </Link>

      <div className="mt-4 flex items-end justify-between mb-5 flex-wrap gap-3">
        <div>
          <h2 className="text-[18px] font-semibold text-foreground">Vault backends</h2>
          <p className="mt-1 text-[13px] text-muted-foreground max-w-180 leading-relaxed">
            Where secrets actually live. AgentVault is a reference broker — the bytes never leave your backend, just the metadata. Connect one or more.
          </p>
        </div>
        <Button size="sm" onClick={onAdd}>
          <Plus className="h-3.5 w-3.5" /> Connect backend
        </Button>
      </div>

      {!hydrated ? (
        <div className="text-[13px] text-muted-foreground">Loading…</div>
      ) : backends.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border bg-muted/20 p-10 text-center">
          <Server className="h-6 w-6 text-muted-foreground/70 mx-auto" />
          <div className="mt-3 text-[14px] font-medium text-foreground">No backends connected</div>
          <p className="mt-1 text-[12.5px] text-muted-foreground max-w-100 mx-auto">
            Connect a vault backend to start storing references. The AgentVault built-in vault is enabled out of the box.
          </p>
          <Button size="sm" className="mt-4" onClick={onAdd}>
            <Plus className="h-3.5 w-3.5" /> Connect backend
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {backends.map(b => (
            <BackendCard
              key={b.id}
              backend={b}
              refsCount={(refsByBackend.get(b.id) || []).length}
              onEdit={() => onEdit(b.id)}
              onRemove={() => onRemove(b)}
            />
          ))}
        </div>
      )}

      <AddBackendSheet
        open={sheetOpen}
        onClose={() => { setSheetOpen(false); setEditingId(null); }}
        existing={editingId ? backends.find(b => b.id === editingId) : null}
        onCreate={(draft) => addBackend(draft)}
        onUpdate={(id, patch) => updateBackend(id, patch)}
      />
    </div>
  );
}

/* ─────────────── Backend card ─────────────── */

function BackendCard({ backend, refsCount, onEdit, onRemove }) {
  const kind = backendKindById(backend.kind);
  const color = backendTone(backend.kind);
  const healthy = backend.health?.ok !== false;

  return (
    <div className="rounded-xl border border-border bg-card overflow-hidden">
      <div className="px-5 py-4 border-b border-border flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="h-2 w-2 rounded-full" style={{ background: color }} />
            <span className="text-[13.5px] font-semibold text-foreground truncate">{backend.name}</span>
            <span
              className="inline-flex items-center px-1.5 py-0.5 rounded border text-[10px] font-medium"
              style={{ borderColor: color + '55', color, background: color + '12' }}
            >
              {kind.label.split(' (')[0]}
            </span>
            {kind.badge && (
              <span className="inline-flex items-center px-1.5 py-0.5 rounded border border-primary/40 bg-primary/10 text-primary text-[10px] font-medium">
                {kind.badge}
              </span>
            )}
          </div>
          {backend.description && (
            <p className="mt-1.5 text-[12px] text-muted-foreground leading-relaxed line-clamp-2">{backend.description}</p>
          )}
          <div className="mt-2 flex flex-wrap gap-2 text-[11px] font-mono text-muted-foreground">
            {backend.options?.region && <span>region: <span className="text-foreground">{backend.options.region}</span></span>}
            {backend.auth?.authMethod && <span>auth: <span className="text-foreground">{backend.auth.authMethod}</span></span>}
            <span>prefix: <span className="text-foreground">{backend.pathPrefix}</span></span>
          </div>
        </div>
        <div className="flex items-center gap-1.5 shrink-0">
          <Button size="sm" variant="outline" className="h-8 text-[12px]" onClick={onEdit}>
            <Pencil className="h-3.5 w-3.5" /> Edit
          </Button>
          <Button
            size="sm" variant="outline"
            className="h-8 text-[12px] text-destructive border-destructive/40 hover:bg-destructive/10 hover:text-destructive"
            onClick={onRemove}
            disabled={backend.id === 'be_builtin'}
          >
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>

      {/* Health row */}
      <div className="px-5 py-3 border-b border-border bg-muted/20 flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-2">
          <span
            className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md border text-[11px] font-medium ${
              healthy
                ? 'bg-(--brand-teal)/10 text-brand-teal border-(--brand-teal)/40'
                : 'bg-destructive/10 text-destructive border-destructive/40'
            }`}
          >
            <span className={`h-1.5 w-1.5 rounded-full ${healthy ? 'bg-brand-teal animate-pulse' : 'bg-destructive'}`} />
            {healthy ? 'connected' : 'degraded'}
          </span>
          <span className="text-[11.5px] font-mono text-muted-foreground">
            {backend.health?.latencyMs != null ? `p50 ${backend.health.latencyMs} ms` : '—'}
          </span>
        </div>
        <span className="text-[10.5px] text-muted-foreground">
          checked {backend.health?.lastCheckedAt ? new Date(backend.health.lastCheckedAt).toLocaleTimeString() : '—'}
        </span>
      </div>

      {!healthy && backend.health?.message && (
        <div className="px-5 py-2 border-b border-border bg-destructive/5 text-[11.5px] text-destructive flex items-start gap-2">
          <AlertTriangle className="h-3.5 w-3.5 mt-0.5 shrink-0" />
          <span>{backend.health.message}</span>
        </div>
      )}

      <div className="px-5 py-3 grid grid-cols-2 gap-3">
        <Stat label="References" value={refsCount} />
        <Stat label="Connected"  value={backend.createdAt ? new Date(backend.createdAt).toLocaleDateString() : '—'} mono />
      </div>
    </div>
  );
}

function Stat({ label, value, mono = false }) {
  return (
    <div>
      <div className="text-[10.5px] font-medium text-muted-foreground">{label}</div>
      <div className={`mt-0.5 text-[14px] font-semibold ${mono ? 'font-mono' : ''} text-foreground`}>{value}</div>
    </div>
  );
}

/* ─────────────── Add / edit backend sheet ─────────────── */

function AddBackendSheet({ open, onClose, existing, onCreate, onUpdate }) {
  const [kindId, setKindId] = useState(null);
  const [form, setForm] = useState(() => emptyForm());

  useEffectOnOpen(open, existing, setKindId, setForm);

  if (!open) return null;
  const kind = kindId ? backendKindById(kindId) : null;
  const showPicker = !existing && !kindId;

  const onSave = () => {
    if (!kind) return;
    const payload = {
      kind: kind.id,
      name: form.name || kind.label,
      description: form.description,
      auth: form.auth,
      options: form.options,
      pathPrefix: form.pathPrefix || `vault://${kind.id === 'builtin' ? '' : kind.id.split('-')[0] + '/'}`,
      status: 'connected',
      health: existing?.health || { ok: true, latencyMs: 0, lastCheckedAt: new Date().toISOString() },
    };
    if (existing) onUpdate(existing.id, payload);
    else onCreate(payload);
    onClose();
  };

  const requiredMissing = !!kind && (kind.authFields || []).some(f => {
    if (!isFieldRequired(f, form.auth)) return false;
    return !form.auth?.[f.name];
  });

  return (
    <>
      <button type="button" aria-label="Close" onClick={onClose}
              className="fixed inset-0 z-40 bg-black/40 backdrop-blur-[2px] animate-fade-in" />
      <aside role="dialog" aria-label={existing ? `Edit backend ${existing.name}` : 'Connect backend'}
             className="fixed inset-y-0 right-0 z-50 w-full sm:w-[560px] lg:w-[640px] bg-card border-l border-border shadow-2xl flex flex-col animate-fade-in">
        <div className="px-5 py-4 border-b border-border">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                {!showPicker && !existing && (
                  <button type="button" onClick={() => setKindId(null)}
                          className="h-6 w-6 rounded text-muted-foreground hover:text-foreground hover:bg-muted/50 flex items-center justify-center"
                          aria-label="Back">
                    <ChevronLeft className="h-3.5 w-3.5" />
                  </button>
                )}
                <span className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
                  {existing ? 'Edit backend' : showPicker ? 'Choose a backend' : 'Configure backend'}
                </span>
              </div>
              <h3 className="mt-1.5 text-[16px] font-semibold text-foreground leading-tight">
                {existing ? existing.name : kind ? kind.label : 'Connect a vault backend'}
              </h3>
              {kind && kind.blurb && <p className="mt-1.5 text-[12px] text-muted-foreground leading-relaxed">{kind.blurb}</p>}
            </div>
            <button type="button" onClick={onClose}
                    className="shrink-0 h-7 w-7 rounded text-muted-foreground hover:text-foreground hover:bg-muted flex items-center justify-center"
                    aria-label="Close">
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto">
          {showPicker ? (
            <PickerStep onPick={(id) => setKindId(id)} />
          ) : (
            <ConfigureStep
              kind={kind}
              form={form}
              setForm={setForm}
              isEditing={!!existing}
            />
          )}
        </div>

        {!showPicker && (
          <div className="px-5 py-3 border-t border-border flex items-center justify-between gap-2">
            <div className="text-[11px] text-muted-foreground">
              {requiredMissing
                ? <span className="text-destructive">Fill required fields.</span>
                : 'Credentials are stored as-is in this demo build.'}
            </div>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={onClose}>Cancel</Button>
              <Button size="sm" onClick={onSave} disabled={requiredMissing}>
                {existing ? 'Save changes' : 'Connect'}
              </Button>
            </div>
          </div>
        )}
      </aside>
    </>
  );
}

function PickerStep({ onPick }) {
  return (
    <ul className="divide-y divide-border">
      {BACKEND_KINDS.map(k => {
        const color = backendTone(k.id);
        return (
          <li key={k.id}>
            <button type="button" onClick={() => onPick(k.id)}
                    className="w-full text-left px-5 py-4 hover:bg-muted/40 transition-colors flex items-start gap-3">
              <span className="mt-1.5 h-2 w-2 rounded-full shrink-0" style={{ background: color }} />
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-[13px] font-medium text-foreground">{k.label}</span>
                  {k.badge && (
                    <span className="inline-flex items-center px-1.5 py-0.5 rounded border border-primary/40 bg-primary/10 text-primary text-[10px] font-medium">
                      {k.badge}
                    </span>
                  )}
                </div>
                <p className="mt-1 text-[11.5px] text-muted-foreground leading-relaxed line-clamp-2">{k.blurb}</p>
                {k.docsUrl && (
                  <div className="mt-1.5 text-[10.5px] font-mono text-primary inline-flex items-center gap-1">
                    {k.docsUrl.replace(/^https?:\/\//, '')}
                    <ExternalLink className="h-3 w-3" />
                  </div>
                )}
              </div>
            </button>
          </li>
        );
      })}
    </ul>
  );
}

function ConfigureStep({ kind, form, setForm, isEditing }) {
  const setAuth   = (k, v) => setForm(f => ({ ...f, auth: { ...f.auth, [k]: v } }));
  const setOption = (k, v) => setForm(f => ({ ...f, options: { ...f.options, [k]: v } }));

  if (!kind) return null;

  return (
    <div className="px-5 py-4 space-y-5">
      <Section title="Identity">
        <div className="space-y-3">
          <Field label="Backend name" required>
            <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })}
                   placeholder={kind.label} className="h-8 text-[12.5px]" />
          </Field>
          <Field label="Description">
            <Input value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })}
                   placeholder="What this backend is used for" className="h-8 text-[12.5px]" />
          </Field>
          <Field label="Path prefix">
            <Input value={form.pathPrefix} onChange={(e) => setForm({ ...form, pathPrefix: e.target.value })}
                   placeholder={kind.pathExample} className="h-8 text-[12.5px] font-mono" />
            <p className="mt-1 text-[10.5px] text-muted-foreground">References starting with this prefix resolve through this backend.</p>
          </Field>
        </div>
      </Section>

      {(kind.authFields || []).length > 0 && (
        <Section title="Authentication" subtitle="How AgentVault proves identity to the backend.">
          <div className="space-y-3">
            {kind.authFields.map(f => {
              const required = isFieldRequired(f, form.auth);
              const visible = isFieldVisible(f, form.auth);
              if (!visible) return null;
              return (
                <Field key={f.name} label={f.label} required={required}>
                  <FieldInput field={f} value={form.auth?.[f.name] || ''} onChange={(v) => setAuth(f.name, v)} />
                  {f.type === 'select' && f.blurbPerValue && form.auth?.[f.name] && (
                    <p className="mt-1 text-[10.5px] text-muted-foreground">{f.blurbPerValue[form.auth[f.name]]}</p>
                  )}
                </Field>
              );
            })}
          </div>
        </Section>
      )}

      {(kind.options || []).length > 0 && (
        <Section title="Options">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {kind.options.map(o => (
              <Field key={o.name} label={o.label}>
                <FieldInput field={o} value={form.options?.[o.name] ?? o.default ?? ''} onChange={(v) => setOption(o.name, v)} />
              </Field>
            ))}
          </div>
        </Section>
      )}

      {kind.notes && kind.notes.length > 0 && (
        <Section title="Notes">
          <ul className="space-y-1.5 text-[11.5px] text-muted-foreground leading-relaxed">
            {kind.notes.map((n, i) => (
              <li key={i} className="flex items-start gap-2">
                <span className="mt-1.5 h-1 w-1 rounded-full bg-muted-foreground/60 shrink-0" />
                <span>{n}</span>
              </li>
            ))}
          </ul>
          {kind.docsUrl && (
            <a href={kind.docsUrl} target="_blank" rel="noopener noreferrer"
               className="mt-3 inline-flex items-center gap-1 text-[12px] text-primary hover:brightness-110">
              Backend docs <ExternalLink className="h-3 w-3" />
            </a>
          )}
        </Section>
      )}
    </div>
  );
}

function FieldInput({ field, value, onChange }) {
  if (field.type === 'select') {
    return (
      <select value={value} onChange={(e) => onChange(e.target.value)}
              className="w-full h-8 bg-hero-bg border border-border rounded-md px-2.5 text-[12.5px] focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/15">
        {field.values.map(v => <option key={v} value={v}>{v}</option>)}
      </select>
    );
  }
  if (field.type === 'textarea') {
    return (
      <textarea value={value} onChange={(e) => onChange(e.target.value)} placeholder={field.placeholder}
                className="w-full min-h-[80px] bg-hero-bg border border-border rounded-md px-2.5 py-1.5 text-[12.5px] font-mono focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/15" />
    );
  }
  return (
    <Input value={value} onChange={(e) => onChange(e.target.value)} placeholder={field.placeholder}
           className="h-8 text-[12.5px] font-mono" type={field.secret ? 'password' : 'text'} />
  );
}

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

function emptyForm() {
  return { name: '', description: '', pathPrefix: '', auth: {}, options: {} };
}

function isFieldRequired(field, currentAuth) {
  if (field.required) return true;
  if (field.requiredIf) {
    return Object.entries(field.requiredIf).every(([k, v]) => currentAuth?.[k] === v);
  }
  return false;
}

function isFieldVisible(field, currentAuth) {
  if (!field.requiredIf) return true;
  return Object.entries(field.requiredIf).every(([k, v]) => currentAuth?.[k] === v);
}

/* Custom hook to reset form state when sheet opens */
function useEffectOnOpen(open, existing, setKindId, setForm) {
  useEffect(() => {
    if (!open) return;
    if (existing) {
      setKindId(existing.kind);
      setForm({
        name:        existing.name || '',
        description: existing.description || '',
        pathPrefix:  existing.pathPrefix || '',
        auth:        { ...(existing.auth || {}) },
        options:     { ...(existing.options || {}) },
      });
    } else {
      setKindId(null);
      setForm(emptyForm());
    }
  }, [open, existing, setKindId, setForm]);
}
