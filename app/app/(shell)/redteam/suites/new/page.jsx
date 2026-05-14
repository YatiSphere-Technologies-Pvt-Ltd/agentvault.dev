'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useMemo, useState } from 'react';
import { ArrowLeft, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { RedTeamHeader } from '../../_shared';
import { SUITE_CATALOG } from '../../_targetCatalog';
import { useTargets, createProbeSet, newProbeSetId } from '../../_store';

const inputCls = "w-full px-2.5 py-1.5 bg-background border border-border rounded-md text-[12.5px] text-foreground placeholder:text-muted-foreground/60 focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all";

export default function NewProbeSetPage() {
  const router = useRouter();
  const targets = useTargets();

  const [name, setName] = useState('');
  const [suiteId, setSuiteId] = useState('smoke');
  const [pickedTargets, setPickedTargets] = useState(new Set());
  const [cron, setCron] = useState('0 */6 * * *');
  const [scheduleEnabled, setScheduleEnabled] = useState(true);
  const [onDeploy, setOnDeploy] = useState(true);
  const [onPolicyChange, setOnPolicyChange] = useState(true);

  const suite = useMemo(() => SUITE_CATALOG.find(s => s.id === suiteId), [suiteId]);

  const canSave = name.trim() && pickedTargets.size > 0;

  const onSave = () => {
    if (!canSave) return;
    const record = {
      id: newProbeSetId(),
      name: name.trim(),
      suite_id: suiteId,
      target_ids: Array.from(pickedTargets),
      schedule: { cron, enabled: scheduleEnabled, last_run_at: null, next_run_at: null },
      triggers: { on_deploy: onDeploy, on_policy_change: onPolicyChange },
      owner: 'me',
      created_at: Date.now(),
    };
    createProbeSet(record);
    router.push(`/app/redteam/suites/${record.id}`);
  };

  return (
    <>
      <RedTeamHeader title="Suites" />
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-7 space-y-5">
        <Link href="/app/redteam/suites" className="text-[12px] text-muted-foreground hover:text-foreground inline-flex items-center gap-1.5">
          <ArrowLeft className="h-3.5 w-3.5" /> All suites
        </Link>

        <div>
          <div className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground font-mono">New probe set</div>
          <h2 className="text-[18px] font-semibold text-foreground mt-0.5">Bind a suite to targets</h2>
          <p className="text-[12.5px] text-muted-foreground mt-0.5">
            A probe set picks one of the named suites and binds it to one or more registered targets plus a
            schedule and event triggers.
          </p>
        </div>

        <Card title="Identity">
          <Field label="Name" required>
            <input className={inputCls} value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Smoke · Customer support copilot" />
          </Field>
        </Card>

        <Card title="Suite">
          <div className="space-y-1.5">
            {SUITE_CATALOG.map(s => (
              <button
                key={s.id}
                type="button"
                onClick={() => setSuiteId(s.id)}
                className={`w-full text-left rounded-md border px-3 py-2 transition-colors flex items-start gap-3 ${
                  suiteId === s.id ? 'border-primary/50 bg-primary/[0.05]' : 'border-border bg-background hover:border-primary/30'
                }`}
              >
                <span className={`mt-0.5 h-4 w-4 rounded-full border flex items-center justify-center shrink-0 ${suiteId === s.id ? 'bg-primary border-primary' : 'border-border'}`}>
                  {suiteId === s.id && <Check className="h-3 w-3 text-primary-foreground" />}
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="text-[12.5px] font-medium text-foreground">{s.name}</span>
                    <span className="text-[9.5px] font-mono uppercase tracking-[0.12em] px-1.5 py-0.5 rounded border border-border bg-muted/40 text-muted-foreground">{s.kind}</span>
                  </div>
                  <div className="text-[11px] text-muted-foreground leading-snug mt-0.5">{s.description}</div>
                </div>
                <span className="text-[10.5px] font-mono text-muted-foreground shrink-0">~{s.expected_duration_min}m</span>
              </button>
            ))}
          </div>
        </Card>

        <Card title={`Targets · ${pickedTargets.size} selected`} hint="Pick one or more registered targets.">
          <div className="space-y-1.5">
            {targets.map(t => {
              const on = pickedTargets.has(t.id);
              return (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => {
                    const next = new Set(pickedTargets);
                    on ? next.delete(t.id) : next.add(t.id);
                    setPickedTargets(next);
                  }}
                  className={`w-full text-left rounded-md border px-3 py-2 transition-colors flex items-center gap-3 ${
                    on ? 'border-primary/50 bg-primary/[0.05]' : 'border-border bg-background hover:border-primary/30'
                  }`}
                >
                  <span className={`h-4 w-4 rounded border flex items-center justify-center shrink-0 ${on ? 'bg-primary border-primary' : 'border-border'}`}>
                    {on && <Check className="h-3 w-3 text-primary-foreground" />}
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="text-[12.5px] font-medium text-foreground truncate">{t.name}</div>
                    <div className="text-[10.5px] font-mono text-muted-foreground truncate">{t.type} · {t.scope?.environment}</div>
                  </div>
                </button>
              );
            })}
          </div>
        </Card>

        <Card title="Schedule + triggers">
          <div className="space-y-2.5">
            <Field label="Cron">
              <input className={inputCls + ' font-mono'} value={cron} onChange={(e) => setCron(e.target.value)} placeholder="0 */6 * * *" />
            </Field>
            <ToggleRow label="Run on schedule" desc="Honor the cron above" value={scheduleEnabled} onChange={setScheduleEnabled} />
            <ToggleRow label="Run on deploy" desc="Re-run the suite when the target agent's config changes" value={onDeploy} onChange={setOnDeploy} />
            <ToggleRow label="Run on policy change" desc="Re-run when DLP / GRC policies that this suite tests change" value={onPolicyChange} onChange={setOnPolicyChange} />
          </div>
        </Card>

        <div className="flex items-center justify-end gap-2">
          <Button variant="outline" size="sm" onClick={() => router.push('/app/redteam/suites')}>Cancel</Button>
          <Button size="sm" disabled={!canSave} onClick={onSave}>Create probe set</Button>
        </div>
      </div>
    </>
  );
}

function Card({ title, hint, children }) {
  return (
    <div className="rounded-xl border border-border bg-card overflow-hidden">
      <div className="px-4 py-2.5 border-b border-border flex items-baseline justify-between gap-3">
        <div className="text-[10.5px] uppercase tracking-[0.16em] font-mono text-muted-foreground">{title}</div>
        {hint && <div className="text-[10.5px] text-muted-foreground/80">{hint}</div>}
      </div>
      <div className="px-4 py-3">{children}</div>
    </div>
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
function ToggleRow({ label, desc, value, onChange }) {
  return (
    <div className="flex items-start justify-between gap-3">
      <div className="min-w-0">
        <div className="text-[12.5px] font-medium text-foreground">{label}</div>
        <div className="text-[10.5px] text-muted-foreground leading-snug">{desc}</div>
      </div>
      <button
        type="button"
        onClick={() => onChange(!value)}
        className={`inline-flex items-center h-5 w-9 rounded-full border transition-colors shrink-0 ${value ? 'bg-primary border-primary' : 'bg-background border-border'}`}
      >
        <span className={`inline-block h-3.5 w-3.5 rounded-full bg-card border border-border transform transition-transform ${value ? 'translate-x-4' : 'translate-x-0.5'}`} />
      </button>
    </div>
  );
}
