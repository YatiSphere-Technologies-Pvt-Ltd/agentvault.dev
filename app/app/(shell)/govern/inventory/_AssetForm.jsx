'use client';

/* Shared AI-asset form used by both /app/govern/inventory/new and
   /app/govern/inventory/[id]/edit. The two pages just bind it to a
   different submit handler and initial value. */

import { useState } from 'react';
import { Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  ASSET_TYPES, RISK_CLASSES, APPROVAL_STATES,
  DESTINATION_CLASSES, DATA_CATEGORIES,
} from '../_connectorCatalog';

const inputCls =
  'w-full px-2.5 py-1.5 bg-background border border-border rounded-md text-[12.5px] text-foreground placeholder:text-muted-foreground/60 focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all';

const labelCls = 'text-[11px] uppercase tracking-[0.14em] font-mono text-muted-foreground';

/* Sensible defaults for a freshly-registered asset. */
export const EMPTY_ASSET = {
  name: '',
  type: 'external-saas',
  vendor: '',
  model_family: '',
  owner: '',
  department: '',
  risk_class: 'standard',
  approval_state: 'pending',
  destination_class: 'public-llm',
  data_categories: [],
  notes: '',
};

export default function AssetForm({ initial = EMPTY_ASSET, mode = 'create', onSubmit, onCancel }) {
  const [form, setForm] = useState({ ...EMPTY_ASSET, ...initial });
  const set = (k) => (v) => setForm(f => ({ ...f, [k]: v }));
  const toggleCategory = (cat) => {
    const next = form.data_categories.includes(cat)
      ? form.data_categories.filter(c => c !== cat)
      : [...form.data_categories, cat];
    set('data_categories')(next);
  };

  const canSave = form.name.trim().length > 0 && form.vendor.trim().length > 0;

  const submit = () => {
    if (!canSave) return;
    onSubmit({
      ...form,
      name: form.name.trim(),
      vendor: form.vendor.trim(),
      model_family: form.model_family.trim() || null,
      owner: form.owner.trim() || null,
      department: form.department.trim() || null,
      notes: form.notes.trim() || null,
    });
  };

  return (
    <div className="space-y-5">
      {/* Identity */}
      <Section title="Identity" hint="What is this AI asset and who owns it?">
        <Field label="Name" required>
          <input
            className={inputCls}
            placeholder="e.g. ChatGPT (chat.openai.com)"
            value={form.name}
            onChange={(e) => set('name')(e.target.value)}
          />
        </Field>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <Field label="Vendor" required>
            <input
              className={inputCls}
              placeholder="OpenAI / Anthropic / GitHub / …"
              value={form.vendor}
              onChange={(e) => set('vendor')(e.target.value)}
            />
          </Field>
          <Field label="Model family" hint="optional">
            <input
              className={inputCls}
              placeholder="gpt-4o / claude-3-5-sonnet / …"
              value={form.model_family}
              onChange={(e) => set('model_family')(e.target.value)}
            />
          </Field>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <Field label="Owner" hint="email or team">
            <input
              className={inputCls}
              placeholder="security@acme.com"
              value={form.owner}
              onChange={(e) => set('owner')(e.target.value)}
            />
          </Field>
          <Field label="Department">
            <input
              className={inputCls}
              placeholder="Engineering / Legal / Multiple"
              value={form.department}
              onChange={(e) => set('department')(e.target.value)}
            />
          </Field>
        </div>
      </Section>

      {/* Classification */}
      <Section title="Classification" hint="How should the platform treat this asset?">
        <Field label="Asset type">
          <ChipPicker
            options={Object.entries(ASSET_TYPES).map(([v, m]) => ({ value: v, label: m.label, accent: m.accent, hint: m.hint }))}
            value={form.type}
            onChange={set('type')}
          />
        </Field>
        <Field label="Destination class" hint="Where does the data go?">
          <ChipPicker
            options={Object.entries(DESTINATION_CLASSES).map(([v, m]) => ({ value: v, label: m.label, accent: m.accent }))}
            value={form.destination_class}
            onChange={set('destination_class')}
          />
        </Field>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <Field label="Risk class">
            <ChipPicker
              options={Object.entries(RISK_CLASSES).map(([v, m]) => ({ value: v, label: m.label, accent: m.accent }))}
              value={form.risk_class}
              onChange={set('risk_class')}
            />
          </Field>
          <Field label="Approval state">
            <ChipPicker
              options={Object.entries(APPROVAL_STATES).map(([v, m]) => ({ value: v, label: m.label, accent: m.accent }))}
              value={form.approval_state}
              onChange={set('approval_state')}
            />
          </Field>
        </div>
      </Section>

      {/* Data categories */}
      <Section title="Data categories observed" hint="What types of data does this asset touch? (multi-select)">
        <div className="flex flex-wrap gap-1.5">
          {DATA_CATEGORIES.map(cat => {
            const on = form.data_categories.includes(cat);
            return (
              <button
                key={cat}
                type="button"
                onClick={() => toggleCategory(cat)}
                className={`inline-flex items-center gap-1 text-[11px] font-mono px-2 py-1 rounded border transition-colors ${
                  on
                    ? 'border-primary/40 bg-primary/[0.08] text-primary'
                    : 'border-border bg-muted/40 text-foreground hover:border-primary/30'
                }`}
              >
                {on && <Check className="h-3 w-3" />}
                {cat}
              </button>
            );
          })}
        </div>
      </Section>

      {/* Notes */}
      <Section title="Notes" hint="Optional context for the next reviewer">
        <textarea
          className={`${inputCls} h-20 resize-none`}
          placeholder="Why was this registered? Any open compliance questions?"
          value={form.notes || ''}
          onChange={(e) => set('notes')(e.target.value)}
        />
      </Section>

      {/* Actions */}
      <div className="flex items-center gap-2 pt-2">
        <Button onClick={submit} disabled={!canSave}>
          <Check className="h-3.5 w-3.5" /> {mode === 'edit' ? 'Save changes' : 'Register asset'}
        </Button>
        {onCancel && (
          <Button variant="outline" onClick={onCancel}>Cancel</Button>
        )}
        {!canSave && (
          <span className="text-[11px] text-muted-foreground">Name + vendor are required.</span>
        )}
      </div>
    </div>
  );
}

/* ─── building blocks ─── */

function Section({ title, hint, children }) {
  return (
    <div className="rounded-xl border border-border bg-card overflow-hidden">
      <div className="px-4 py-2.5 border-b border-border flex items-baseline gap-3">
        <div className="text-[10.5px] uppercase tracking-[0.16em] font-mono text-muted-foreground">{title}</div>
        {hint && <div className="text-[10.5px] text-muted-foreground/80 truncate">{hint}</div>}
      </div>
      <div className="px-4 py-4 space-y-3">{children}</div>
    </div>
  );
}

function Field({ label, required, hint, children }) {
  return (
    <div className="space-y-1">
      <div className="flex items-baseline gap-2">
        <label className={labelCls}>
          {label}
          {required && <span className="text-destructive ml-1">*</span>}
        </label>
        {hint && <span className="text-[10.5px] text-muted-foreground/80">· {hint}</span>}
      </div>
      {children}
    </div>
  );
}

function ChipPicker({ options, value, onChange }) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {options.map(o => {
        const active = o.value === value;
        return (
          <button
            key={o.value}
            type="button"
            onClick={() => onChange(o.value)}
            title={o.hint}
            className={`inline-flex items-center gap-1.5 px-2 py-1 rounded border text-[11.5px] font-medium transition-colors ${
              active
                ? 'border-primary/40 bg-primary/[0.08] text-foreground'
                : 'border-border bg-muted/40 text-foreground hover:border-primary/30'
            }`}
          >
            {o.accent && (
              <span className="h-1.5 w-1.5 rounded-full shrink-0" style={{ background: o.accent }} />
            )}
            {o.label}
          </button>
        );
      })}
    </div>
  );
}
