'use client';

import { useEffect, useMemo, useState } from 'react';
import { X, ChevronLeft, ExternalLink } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { vendorTone } from '../_providerCatalog';
import { useTools } from '../_toolsStore';
import VaultRefPicker from '../../vault/VaultRefPicker';

/* AddProviderSheet
   ────────────────
   Two-step right drawer:
     1. Pick a provider template from the tool's catalog (Bing Grounding,
        Brave, Google CSE, …).
     2. Fill in label, regions, credential references (vault paths only),
        and per-provider options (safesearch, freshness, etc.).

   When `existingProvider` is passed, we skip step 1 and edit that record
   directly. */

export default function AddProviderSheet({
  open, onClose, toolId, catalog, existingProvider, existingPrimaryId,
}) {
  const { addProvider, updateProvider } = useTools();

  const [tplId, setTplId] = useState(null);
  const [form, setForm] = useState(() => emptyForm());

  const tpl = useMemo(
    () => catalog.find(c => c.id === tplId),
    [catalog, tplId],
  );

  // Body scroll lock + Escape close
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const onKey = (e) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener('keydown', onKey);
    };
  }, [open, onClose]);

  // Hydrate form when sheet opens
  useEffect(() => {
    if (!open) return;
    if (existingProvider) {
      setTplId(existingProvider.provider);
      setForm({
        label:       existingProvider.label || '',
        role:        existingProvider.role  || 'fallback',
        regions:     (existingProvider.regions || []).join(', '),
        credentials: { ...(existingProvider.credentials || {}) },
        options:     { ...(existingProvider.options || {}) },
        costPerCallUsd: existingProvider.costPerCallUsd ?? null,
      });
    } else {
      setTplId(null);
      setForm(emptyForm());
    }
  }, [open, existingProvider]);

  // When picking a fresh template, prefill from defaults
  useEffect(() => {
    if (existingProvider) return;
    if (!tpl) return;
    const credentials = {};
    for (const f of tpl.credentialFields || []) credentials[f.name] = '';
    const options = {};
    for (const o of tpl.options || []) options[o.name] = o.default;
    setForm({
      label:       tpl.label,
      role:        existingPrimaryId ? 'fallback' : 'primary',
      regions:     (tpl.regions || []).join(', '),
      credentials,
      options,
      costPerCallUsd: tpl.defaultCostPerCallUsd ?? null,
    });
  }, [tpl, existingProvider, existingPrimaryId]);

  if (!open) return null;

  const onSave = () => {
    if (!tpl) return;
    const payload = {
      provider:    tpl.id,
      label:       form.label || tpl.label,
      role:        form.role,
      status:      'active',
      regions:     form.regions
        ? form.regions.split(',').map(s => s.trim()).filter(Boolean)
        : (tpl.regions || []),
      credentials: form.credentials,
      options:     form.options,
      costPerCallUsd: form.costPerCallUsd ?? tpl.defaultCostPerCallUsd ?? null,
      rpm:         tpl.defaultRpm ?? null,
      usage7d:     existingProvider?.usage7d || { calls: 0, errorRate: 0, p50LatencyMs: 0 },
    };

    if (existingProvider) {
      updateProvider(toolId, existingProvider.id, payload);
    } else {
      addProvider(toolId, payload);
    }
    onClose();
  };

  const requiredMissing = !!tpl && (tpl.credentialFields || [])
    .filter(f => f.required)
    .some(f => !form.credentials?.[f.name]);

  const showPicker = !tpl;

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
        aria-label={existingProvider ? `Edit provider ${existingProvider.label}` : 'Add provider'}
        className="fixed inset-y-0 right-0 z-50 w-full sm:w-[520px] lg:w-[600px] bg-card border-l border-border shadow-2xl flex flex-col animate-fade-in"
      >
        {/* Header */}
        <div className="px-5 py-4 border-b border-border flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              {!showPicker && !existingProvider && (
                <button
                  type="button"
                  onClick={() => { setTplId(null); }}
                  className="h-6 w-6 rounded text-muted-foreground hover:text-foreground hover:bg-muted/50 flex items-center justify-center"
                  aria-label="Back"
                >
                  <ChevronLeft className="h-3.5 w-3.5" />
                </button>
              )}
              <span className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
                {existingProvider ? 'Edit provider' : showPicker ? 'Choose a provider' : 'Configure provider'}
              </span>
            </div>
            <h3 className="mt-1.5 text-[16px] font-semibold text-foreground leading-tight">
              {existingProvider ? existingProvider.label : tpl?.label || 'Add provider'}
            </h3>
            {tpl && tpl.blurb && (
              <p className="mt-1.5 text-[12px] text-muted-foreground leading-relaxed">{tpl.blurb}</p>
            )}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="shrink-0 h-7 w-7 rounded text-muted-foreground hover:text-foreground hover:bg-muted flex items-center justify-center"
            aria-label="Close"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto">
          {showPicker ? (
            <PickerStep catalog={catalog} onPick={setTplId} />
          ) : (
            <ConfigureStep
              tpl={tpl}
              form={form}
              setForm={setForm}
              isEditing={!!existingProvider}
            />
          )}
        </div>

        {/* Footer */}
        {!showPicker && (
          <div className="px-5 py-3 border-t border-border flex items-center justify-between gap-2">
            <div className="text-[11px] text-muted-foreground">
              {requiredMissing
                ? <span className="text-destructive">Fill required credentials.</span>
                : 'Credentials are stored as vault references.'}
            </div>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={onClose}>Cancel</Button>
              <Button size="sm" onClick={onSave} disabled={requiredMissing}>
                {existingProvider ? 'Save changes' : 'Add provider'}
              </Button>
            </div>
          </div>
        )}
      </aside>
    </>
  );
}

/* ── Step 1 — picker ── */

function PickerStep({ catalog, onPick }) {
  return (
    <ul className="divide-y divide-border">
      {catalog.map(p => {
        const tone = vendorTone(p.vendor);
        return (
          <li key={p.id}>
            <button
              type="button"
              onClick={() => onPick(p.id)}
              className="w-full text-left px-5 py-3.5 hover:bg-muted/40 transition-colors flex items-start gap-3"
            >
              <span className="mt-1.5 h-2 w-2 rounded-full shrink-0" style={{ background: tone.color }} />
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-[13px] font-medium text-foreground">{p.label}</span>
                  {p.badge && (
                    <span className="inline-flex items-center px-1.5 py-0.5 rounded border border-primary/40 bg-primary/10 text-primary text-[10px] font-medium">
                      {p.badge}
                    </span>
                  )}
                </div>
                <p className="mt-1 text-[11.5px] text-muted-foreground leading-relaxed line-clamp-2">{p.blurb}</p>
                <div className="mt-1.5 flex items-center gap-3 text-[10.5px] font-mono text-muted-foreground">
                  {p.defaultCostPerCallUsd != null && <span>${p.defaultCostPerCallUsd.toFixed(3)}/call</span>}
                  {p.defaultRpm && <span>· {p.defaultRpm} rpm</span>}
                  {p.regions && p.regions.length > 0 && <span>· {p.regions.length} region{p.regions.length === 1 ? '' : 's'}</span>}
                </div>
              </div>
            </button>
          </li>
        );
      })}
    </ul>
  );
}

/* ── Step 2 — configure ── */

function ConfigureStep({ tpl, form, setForm, isEditing }) {
  if (!tpl) return null;
  const setCred   = (k, v) => setForm(f => ({ ...f, credentials: { ...f.credentials, [k]: v } }));
  const setOption = (k, v) => setForm(f => ({ ...f, options:     { ...f.options,     [k]: v } }));

  return (
    <div className="px-5 py-4 space-y-5">
      {/* Identity */}
      <Section title="Identity">
        <div className="space-y-3">
          <Field label="Display label">
            <Input
              value={form.label}
              onChange={(e) => setForm({ ...form, label: e.target.value })}
              placeholder={tpl.label}
              className="h-8 text-[12.5px]"
            />
          </Field>

          <Field label="Role">
            <div className="flex items-center gap-2">
              <RoleRadio
                value={form.role}
                onChange={(v) => setForm({ ...form, role: v })}
                option="primary"
                label="Primary"
                blurb="Default for all calls."
              />
              <RoleRadio
                value={form.role}
                onChange={(v) => setForm({ ...form, role: v })}
                option="fallback"
                label="Fallback"
                blurb="Used when the primary fails."
              />
            </div>
          </Field>

          <Field label="Regions">
            <Input
              value={form.regions}
              onChange={(e) => setForm({ ...form, regions: e.target.value })}
              placeholder="us-east-1, eu-west-1"
              className="h-8 text-[12.5px]"
            />
            <p className="mt-1 text-[10.5px] text-muted-foreground">Comma-separated. Used for region-aware routing.</p>
          </Field>
        </div>
      </Section>

      {/* Credentials */}
      <Section title="Credentials" subtitle="Vault references only — the UI never stores raw secrets.">
        <div className="space-y-3">
          {(tpl.credentialFields || []).map(f => {
            const isVaultRef = f.secret || /Ref$/.test(f.name);
            return (
              <Field key={f.name} label={f.label} required={f.required}>
                {isVaultRef ? (
                  <VaultRefPicker
                    value={form.credentials?.[f.name] || ''}
                    onChange={(v) => setCred(f.name, v)}
                    placeholder={f.placeholder}
                  />
                ) : (
                  <Input
                    value={form.credentials?.[f.name] || ''}
                    onChange={(e) => setCred(f.name, e.target.value)}
                    placeholder={f.placeholder}
                    className="h-8 text-[12.5px] font-mono"
                  />
                )}
              </Field>
            );
          })}
        </div>
      </Section>

      {/* Options */}
      {(tpl.options || []).length > 0 && (
        <Section title="Options" subtitle="Per-call defaults the runtime sends with every query.">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {tpl.options.map(o => (
              <Field key={o.name} label={o.label}>
                {o.type === 'select' ? (
                  <select
                    value={form.options?.[o.name] ?? o.default}
                    onChange={(e) => setOption(o.name, e.target.value)}
                    className="w-full h-8 bg-hero-bg border border-border rounded-md px-2.5 text-[12.5px] focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/15"
                  >
                    {o.values.map(v => <option key={v} value={v}>{v}</option>)}
                  </select>
                ) : o.type === 'number' ? (
                  <Input
                    type="number"
                    min={o.min}
                    max={o.max}
                    value={form.options?.[o.name] ?? o.default}
                    onChange={(e) => setOption(o.name, Number(e.target.value))}
                    className="h-8 text-[12.5px] tabular-nums"
                  />
                ) : o.type === 'boolean' ? (
                  <label className="inline-flex items-center gap-2 text-[12.5px]">
                    <input
                      type="checkbox"
                      checked={!!form.options?.[o.name]}
                      onChange={(e) => setOption(o.name, e.target.checked)}
                      className="h-3.5 w-3.5 accent-primary"
                    />
                    {form.options?.[o.name] ? 'Enabled' : 'Disabled'}
                  </label>
                ) : (
                  <Input
                    value={form.options?.[o.name] ?? o.default ?? ''}
                    onChange={(e) => setOption(o.name, e.target.value)}
                    className="h-8 text-[12.5px]"
                  />
                )}
              </Field>
            ))}
          </div>
        </Section>
      )}

      {/* Pricing override */}
      <Section title="Pricing">
        <Field label="Cost per call">
          <div className="flex items-center gap-2">
            <span className="text-[12.5px] font-mono text-muted-foreground">$</span>
            <Input
              type="number"
              step="0.001"
              min={0}
              value={form.costPerCallUsd ?? tpl.defaultCostPerCallUsd ?? 0}
              onChange={(e) => setForm({ ...form, costPerCallUsd: Number(e.target.value) })}
              className="h-8 text-[12.5px] font-mono tabular-nums"
            />
          </div>
          <p className="mt-1 text-[10.5px] text-muted-foreground">
            Used by the cost-routing strategy and per-run cost attribution.
          </p>
        </Field>
      </Section>

      {/* Notes from the catalog */}
      {tpl.notes && tpl.notes.length > 0 && (
        <Section title="Notes">
          <ul className="space-y-1.5 text-[11.5px] text-muted-foreground leading-relaxed">
            {tpl.notes.map((n, i) => (
              <li key={i} className="flex items-start gap-2">
                <span className="mt-1.5 h-1 w-1 rounded-full bg-muted-foreground/60 shrink-0" />
                <span>{n}</span>
              </li>
            ))}
          </ul>
          {tpl.docsUrl && (
            <a
              href={tpl.docsUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-3 inline-flex items-center gap-1 text-[12px] text-primary hover:brightness-110"
            >
              Provider docs <ExternalLink className="h-3 w-3" />
            </a>
          )}
        </Section>
      )}
    </div>
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

function RoleRadio({ value, onChange, option, label, blurb }) {
  const active = value === option;
  return (
    <button
      type="button"
      onClick={() => onChange(option)}
      className={`flex-1 text-left p-2.5 rounded-md border transition-colors ${
        active ? 'border-primary/40 bg-primary/5' : 'border-border bg-muted/20 hover:bg-muted/40'
      }`}
    >
      <div className="flex items-center gap-2">
        <span className={`h-3 w-3 rounded-full border-2 ${active ? 'border-primary bg-primary' : 'border-input'}`} />
        <span className={`text-[12.5px] font-medium ${active ? 'text-primary' : 'text-foreground'}`}>{label}</span>
      </div>
      <p className="mt-0.5 ml-5 text-[10.5px] text-muted-foreground">{blurb}</p>
    </button>
  );
}

function emptyForm() {
  return {
    label: '',
    role: 'primary',
    regions: '',
    credentials: {},
    options: {},
    costPerCallUsd: null,
  };
}
