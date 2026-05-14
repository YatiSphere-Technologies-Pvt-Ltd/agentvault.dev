'use client';

/* Shared Red Team target form used by both /new and /[id]/edit.
   ───────────────────────────────────────────────────────────────
   Mirrors the inventory AssetForm pattern but with three extra
   sections that matter for red-team governance:

     1. Adapter — picks one of the ADAPTER_KINDS and renders that
        adapter's `config_fields[]` dynamically. `vault-ref` fields
        accept a free-text reference for now (e.g. "vault://aoai-key");
        in production they'd open the Vault picker.

     2. Scope — environment + rate-limit + token budget. These are
        enforced by the runner at execution time.

     3. Consent record — granted_by / expires_at + allowed categories
        + allowed severities. This is what the auditor reads to know
        the testing was authorized. */

import { useMemo, useState } from 'react';
import { Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ADAPTER_KINDS } from '../_targetCatalog';
import { CATEGORIES, SEVERITIES } from '../_attackCatalog';

const inputCls =
  'w-full px-2.5 py-1.5 bg-background border border-border rounded-md text-[12.5px] text-foreground placeholder:text-muted-foreground/60 focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all';

const labelCls = 'text-[11px] uppercase tracking-[0.14em] font-mono text-muted-foreground';

const TYPE_OPTIONS = [
  { value: 'agent',      label: 'Agent' },
  { value: 'chat',       label: 'Chat API' },
  { value: 'gateway',    label: 'Gateway' },
  { value: 'rag',        label: 'RAG pipeline' },
  { value: 'mcp',        label: 'MCP server' },
  { value: 'browser',    label: 'Browser chat' },
  { value: 'multimodal', label: 'Multimodal' },
];

const ENV_OPTIONS = [
  { value: 'sandbox',    label: 'Sandbox',    accent: '#6366F1' }, // indigo
  { value: 'staging',    label: 'Staging',    accent: '#F59E0B' }, // amber
  { value: 'production', label: 'Production', accent: '#E11D48' }, // red — testing prod is the riskiest
];

const STATUS_OPTIONS = [
  { value: 'draft',    label: 'Draft',    accent: 'var(--muted-foreground)' },
  { value: 'active',   label: 'Active',   accent: 'var(--brand-teal)' },
  { value: 'paused',   label: 'Paused',   accent: '#F59E0B' },
  { value: 'archived', label: 'Archived', accent: 'var(--muted-foreground)' },
];

/* Sensible defaults for a brand-new target. */
export const EMPTY_TARGET = {
  name: '',
  type: 'chat',
  adapter: 'openai-compat',
  adapter_config: {},
  status: 'draft',
  owner: '',
  tags: [],
  scope: {
    environment: 'staging',
    rate_limit_rps: 5,
    max_tokens_per_run: 500_000,
  },
  consent_record: {
    granted_by: '',
    allowed_categories: ['*'],
    allowed_severities: ['critical', 'high', 'medium', 'low'],
    expires_at: null,
  },
};

/* Convert an ms timestamp to the YYYY-MM-DD form an <input type=date>
   wants, and back. */
function tsToDate(ms) {
  if (!ms) return '';
  const d = new Date(ms);
  return d.toISOString().slice(0, 10);
}
function dateToTs(str) {
  if (!str) return null;
  const d = new Date(str + 'T00:00:00Z');
  return d.getTime();
}

export default function TargetForm({ initial = EMPTY_TARGET, mode = 'create', onSubmit, onCancel }) {
  // Deep-merge initial over empty so missing sub-objects are filled in.
  const seed = useMemo(() => ({
    ...EMPTY_TARGET,
    ...initial,
    scope:          { ...EMPTY_TARGET.scope,          ...(initial.scope          || {}) },
    consent_record: { ...EMPTY_TARGET.consent_record, ...(initial.consent_record || {}) },
    adapter_config: { ...(initial.adapter_config || {}) },
    tags: initial.tags || [],
  }), [initial]);

  const [form, setForm] = useState(seed);
  const set = (k) => (v) => setForm(f => ({ ...f, [k]: v }));
  const setScope    = (k) => (v) => setForm(f => ({ ...f, scope:          { ...f.scope,          [k]: v } }));
  const setConsent  = (k) => (v) => setForm(f => ({ ...f, consent_record: { ...f.consent_record, [k]: v } }));
  const setAdapterCfg = (k) => (v) => setForm(f => ({ ...f, adapter_config: { ...f.adapter_config, [k]: v } }));

  const adapter = useMemo(() => ADAPTER_KINDS[form.adapter], [form.adapter]);

  // When the user switches adapter, reset adapter_config so we don't
  // carry stale fields between adapter kinds.
  const setAdapter = (id) => setForm(f => ({ ...f, adapter: id, adapter_config: {} }));

  const toggleCategory = (cat) => {
    const list = form.consent_record.allowed_categories;
    if (cat === '*') {
      setConsent('allowed_categories')(list.includes('*') ? [] : ['*']);
      return;
    }
    // Selecting any specific category clears the wildcard.
    const without = list.filter(c => c !== '*');
    const next = without.includes(cat) ? without.filter(c => c !== cat) : [...without, cat];
    setConsent('allowed_categories')(next);
  };
  const toggleSeverity = (sev) => {
    const list = form.consent_record.allowed_severities;
    setConsent('allowed_severities')(
      list.includes(sev) ? list.filter(s => s !== sev) : [...list, sev]
    );
  };

  // Tag input — comma-separated for the prototype.
  const tagsString = (form.tags || []).join(', ');
  const onTagsChange = (s) =>
    set('tags')(s.split(',').map(t => t.trim()).filter(Boolean));

  /* Validation:
       - name required
       - owner required (governance — every target has an accountable owner)
       - every required adapter field must be filled
       - granted_by required (audit — who authorized the test)
       - if a non-wildcard category list is empty, block save
  */
  const requiredAdapterFieldsOK = (adapter?.config_fields || [])
    .filter(f => f.required)
    .every(f => String(form.adapter_config[f.key] || '').trim().length > 0);

  const consentHasCategories = form.consent_record.allowed_categories.length > 0;
  const consentHasSeverities = form.consent_record.allowed_severities.length > 0;

  const canSave =
    form.name.trim().length > 0 &&
    form.owner.trim().length > 0 &&
    requiredAdapterFieldsOK &&
    form.consent_record.granted_by.trim().length > 0 &&
    consentHasCategories &&
    consentHasSeverities;

  const submit = () => {
    if (!canSave) return;
    onSubmit({
      ...form,
      name:  form.name.trim(),
      owner: form.owner.trim(),
      tags:  form.tags,
      consent_record: {
        ...form.consent_record,
        granted_by: form.consent_record.granted_by.trim(),
      },
    });
  };

  return (
    <div className="space-y-5">
      {/* Identity */}
      <Section title="Identity" hint="What system are you registering, and who owns it?">
        <Field label="Name" required>
          <input
            className={inputCls}
            placeholder="e.g. Support copilot · staging"
            value={form.name}
            onChange={(e) => set('name')(e.target.value)}
          />
        </Field>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <Field label="Target type">
            <ChipPicker
              options={TYPE_OPTIONS}
              value={form.type}
              onChange={set('type')}
            />
          </Field>
          <Field label="Lifecycle status" hint={mode === 'create' ? 'draft until you Activate' : 'change via Activate / Pause / Archive on the detail page'}>
            <ChipPicker
              options={STATUS_OPTIONS}
              value={form.status}
              onChange={set('status')}
              disabled={mode === 'create'}
            />
          </Field>
        </div>
        <Field label="Owner" required hint="Accountable engineer or team — auditor reads this">
          <input
            className={inputCls}
            placeholder="security-eng@acme.com"
            value={form.owner}
            onChange={(e) => set('owner')(e.target.value)}
          />
        </Field>
        <Field label="Tags" hint="comma-separated · used for filtering">
          <input
            className={inputCls}
            placeholder="finance, production, pii"
            value={tagsString}
            onChange={(e) => onTagsChange(e.target.value)}
          />
        </Field>
      </Section>

      {/* Adapter */}
      <Section title="Adapter" hint="How will the runner reach this target?">
        <Field label="Adapter">
          <div className="space-y-2">
            <ChipPicker
              options={Object.values(ADAPTER_KINDS).map(a => ({ value: a.id, label: a.label }))}
              value={form.adapter}
              onChange={setAdapter}
            />
            {adapter?.blurb && (
              <p className="text-[11.5px] text-muted-foreground leading-relaxed">{adapter.blurb}</p>
            )}
          </div>
        </Field>
        {adapter?.config_fields?.length > 0 && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {adapter.config_fields.map(f => (
              <Field key={f.key} label={f.label} required={f.required} hint={f.kind === 'vault-ref' ? 'vault reference' : undefined}>
                <input
                  className={inputCls}
                  placeholder={f.placeholder || (f.kind === 'vault-ref' ? 'vault://path/to/secret' : '')}
                  type={f.type || 'text'}
                  value={form.adapter_config[f.key] ?? ''}
                  onChange={(e) => setAdapterCfg(f.key)(e.target.value)}
                />
              </Field>
            ))}
          </div>
        )}
      </Section>

      {/* Scope */}
      <Section title="Scope" hint="Operational limits enforced by the runner">
        <Field label="Environment">
          <ChipPicker
            options={ENV_OPTIONS}
            value={form.scope.environment}
            onChange={setScope('environment')}
          />
        </Field>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <Field label="Rate limit" hint="requests per second">
            <input
              className={inputCls}
              type="number"
              min="1"
              value={form.scope.rate_limit_rps}
              onChange={(e) => setScope('rate_limit_rps')(Number(e.target.value) || 0)}
            />
          </Field>
          <Field label="Max tokens per run" hint="hard ceiling per probe execution">
            <input
              className={inputCls}
              type="number"
              min="0"
              value={form.scope.max_tokens_per_run}
              onChange={(e) => setScope('max_tokens_per_run')(Number(e.target.value) || 0)}
            />
          </Field>
        </div>
      </Section>

      {/* Consent */}
      <Section title="Consent record" hint="The audit trail for permission to test">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <Field label="Granted by" required hint="who authorized testing">
            <input
              className={inputCls}
              placeholder="compliance@acme.com"
              value={form.consent_record.granted_by}
              onChange={(e) => setConsent('granted_by')(e.target.value)}
            />
          </Field>
          <Field label="Expires at" hint="leave empty for indefinite">
            <input
              className={inputCls}
              type="date"
              value={tsToDate(form.consent_record.expires_at)}
              onChange={(e) => setConsent('expires_at')(dateToTs(e.target.value))}
            />
          </Field>
        </div>

        <Field label="Allowed attack categories" hint="* permits everything in the library">
          <div className="flex flex-wrap gap-1.5">
            <ToggleChip
              label="* All"
              active={form.consent_record.allowed_categories.includes('*')}
              onClick={() => toggleCategory('*')}
            />
            {Object.entries(CATEGORIES).map(([key, meta]) => (
              <ToggleChip
                key={key}
                label={meta.label}
                accent={meta.accent}
                active={form.consent_record.allowed_categories.includes(key)}
                disabled={form.consent_record.allowed_categories.includes('*')}
                onClick={() => toggleCategory(key)}
              />
            ))}
          </div>
          {!consentHasCategories && (
            <p className="mt-1 text-[11px] text-destructive">Pick at least one category (or "* All").</p>
          )}
        </Field>

        <Field label="Allowed severities">
          <div className="flex flex-wrap gap-1.5">
            {Object.entries(SEVERITIES).map(([key, meta]) => (
              <ToggleChip
                key={key}
                label={meta.label}
                accent={meta.accent}
                active={form.consent_record.allowed_severities.includes(key)}
                onClick={() => toggleSeverity(key)}
              />
            ))}
          </div>
          {!consentHasSeverities && (
            <p className="mt-1 text-[11px] text-destructive">Pick at least one severity.</p>
          )}
        </Field>
      </Section>

      {/* Actions */}
      <div className="flex items-center gap-2 pt-2">
        <Button onClick={submit} disabled={!canSave}>
          <Check className="h-3.5 w-3.5" /> {mode === 'edit' ? 'Save changes' : 'Register target'}
        </Button>
        {onCancel && (
          <Button variant="outline" onClick={onCancel}>Cancel</Button>
        )}
        {!canSave && (
          <span className="text-[11px] text-muted-foreground">Fill required fields to enable save.</span>
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

function ChipPicker({ options, value, onChange, disabled }) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {options.map(o => {
        const active = o.value === value;
        return (
          <button
            key={o.value}
            type="button"
            disabled={disabled}
            onClick={() => !disabled && onChange(o.value)}
            className={`inline-flex items-center gap-1.5 px-2 py-1 rounded border text-[11.5px] font-medium transition-colors ${
              disabled
                ? 'border-border bg-muted/30 text-muted-foreground cursor-not-allowed'
                : active
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

function ToggleChip({ label, accent, active, onClick, disabled }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`inline-flex items-center gap-1 text-[11px] font-mono px-2 py-1 rounded border transition-colors ${
        disabled
          ? 'border-border bg-muted/30 text-muted-foreground cursor-not-allowed opacity-60'
          : active
            ? 'border-primary/40 bg-primary/[0.08] text-foreground'
            : 'border-border bg-muted/40 text-foreground hover:border-primary/30'
      }`}
    >
      {active && <Check className="h-3 w-3" />}
      {accent && (
        <span className="h-1.5 w-1.5 rounded-full shrink-0" style={{ background: accent }} />
      )}
      {label}
    </button>
  );
}
