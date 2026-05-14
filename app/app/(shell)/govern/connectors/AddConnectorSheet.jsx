'use client';

/* AddConnectorSheet — pick a connector kind, fill auth, save.
   Reuses the 2-step picker → configure pattern from AddSourceSheet. */

import { useEffect, useMemo, useState } from 'react';
import { X, ChevronLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { CONNECTOR_CATALOG, CONNECTOR_FAMILIES } from '../_connectorCatalog';
import { ConnectorIcon } from '../_shared';
import { createConnector, newConnectorId } from '../_store';

const inputCls = "w-full px-2.5 py-1.5 bg-background border border-border rounded-md text-[12.5px] text-foreground placeholder:text-muted-foreground/60 focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all";

export default function AddConnectorSheet({ open, onClose }) {
  const [step, setStep] = useState(1);
  const [kindId, setKindId] = useState(null);
  const [name, setName] = useState('');
  const [auth, setAuth] = useState({});

  const kind = useMemo(() => CONNECTOR_CATALOG.find(k => k.id === kindId) || null, [kindId]);

  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const onKey = (e) => { if (e.key === 'Escape') onClose?.(); };
    window.addEventListener('keydown', onKey);
    return () => { document.body.style.overflow = prev; window.removeEventListener('keydown', onKey); };
  }, [open, onClose]);

  useEffect(() => {
    if (!open) { setStep(1); setKindId(null); setName(''); setAuth({}); }
  }, [open]);

  useEffect(() => {
    if (!kind) return;
    if (!name) setName(`${kind.label} · prod`);
  }, [kind]); // eslint-disable-line react-hooks/exhaustive-deps

  const canSubmit = !!kind && name.trim()
    && (kind.auth || []).every(f => !f.required || (auth[f.key] && String(auth[f.key]).trim()));

  const onSubmit = () => {
    if (!canSubmit) return;
    const summaryFields = (kind.auth || []).filter(f => f.kind !== 'vault-ref').slice(0, 1);
    const auth_summary = summaryFields.length
      ? `${summaryFields[0].key}: ${auth[summaryFields[0].key]}`
      : kind.label;
    createConnector({
      id: newConnectorId(),
      kind: kind.id,
      name: name.trim(),
      status: 'connected',
      health: 'green',
      events_24h: 0,
      last_event_at: Date.now(),
      auth_summary,
      created_at: Date.now(),
    });
    onClose?.();
  };

  if (!open) return null;

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
              {step === 1 ? 'Step 1 of 2 · Pick a connector' : 'Step 2 of 2 · Authorize'}
            </div>
            <div className="text-[15px] font-semibold text-foreground">
              {step === 1 ? 'Add a connector' : kind?.label}
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
              auth={auth} setAuth={setAuth}
            />
          )}
        </div>

        {step === 2 && (
          <div className="border-t border-border bg-muted/20 px-5 py-3 flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => setStep(1)}>Back</Button>
            <Button size="sm" disabled={!canSubmit} onClick={onSubmit} className="ml-auto">
              Connect
            </Button>
          </div>
        )}
      </aside>
    </>
  );
}

function KindPicker({ onPick }) {
  const grouped = CONNECTOR_CATALOG.reduce((acc, k) => {
    (acc[k.family] = acc[k.family] || []).push(k);
    return acc;
  }, {});
  return (
    <div className="space-y-5">
      {Object.entries(grouped).map(([family, list]) => {
        const meta = CONNECTOR_FAMILIES[family];
        return (
          <section key={family}>
            <div className="text-[10px] uppercase tracking-[0.16em] font-mono text-muted-foreground mb-2">
              {meta?.label || family}
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {list.map(k => (
                <button
                  key={k.id}
                  type="button"
                  onClick={() => onPick(k)}
                  className="text-left rounded-md border border-border bg-background hover:border-primary/50 hover:bg-primary/[0.03] hover:shadow-sm transition-all p-3 flex items-start gap-3"
                >
                  <ConnectorIcon kind={k.id} size={32} />
                  <div className="min-w-0 flex-1">
                    <div className="text-[12.5px] font-medium text-foreground">{k.label}</div>
                    <div className="text-[11px] text-muted-foreground leading-relaxed mt-0.5 line-clamp-2">{k.blurb}</div>
                    <div className="flex items-center gap-1 mt-1.5 flex-wrap">
                      {(k.signals || []).slice(0, 4).map(s => (
                        <span key={s} className="text-[9.5px] font-mono px-1.5 py-0.5 rounded border border-border bg-muted/40 text-muted-foreground">
                          {s}
                        </span>
                      ))}
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </section>
        );
      })}
    </div>
  );
}

function ConfigureForm({ kind, name, setName, auth, setAuth }) {
  return (
    <div className="space-y-5">
      <Section title="Identity">
        <Field label="Display name" required>
          <input className={inputCls} value={name} onChange={(e) => setName(e.target.value)} placeholder={`${kind.label} · prod`} />
        </Field>
      </Section>

      <Section title="Authorization" hint="Credentials are stored as Vault references; the platform never reads the secret bytes.">
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
              <input className={inputCls} value={auth[f.key] || ''} onChange={(e) => setAuth({ ...auth, [f.key]: e.target.value })} placeholder={f.placeholder} />
            )}
          </Field>
        ))}
      </Section>

      <Section title="What you'll see">
        <div className="rounded-md border border-border bg-muted/30 px-3 py-2">
          <div className="text-[11px] text-muted-foreground mb-1.5">Signals captured by this connector:</div>
          <div className="flex flex-wrap gap-1.5">
            {(kind.signals || []).map(s => (
              <span key={s} className="text-[10.5px] font-mono px-1.5 py-0.5 rounded border border-primary/30 bg-primary/[0.05] text-primary">
                {s}
              </span>
            ))}
          </div>
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
        {hint && <div className="text-[10.5px] text-muted-foreground/80 max-w-[60%] text-right leading-snug">{hint}</div>}
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
