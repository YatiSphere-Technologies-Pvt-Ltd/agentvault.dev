'use client';

import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { useMemo, useState } from 'react';
import { ArrowLeft, Trash2, FileSearch } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { GovernHeader } from '../../../_shared';
import { useDlpRules, updateDlpRule, removeDlpRule } from '../../../_store';
import { inspect } from '../../../_dlpEngine';

const ACTIONS = [
  { id: 'block',  label: 'Block',  hint: 'Hard-block the prompt at the gateway.' },
  { id: 'redact', label: 'Redact', hint: 'Mask matched spans, forward the rewritten prompt.' },
  { id: 'warn',   label: 'Warn',   hint: 'Show a banner; user must confirm before proceeding.' },
  { id: 'log',    label: 'Log',    hint: 'No user-visible action — audit only.' },
];
const SEVERITIES = ['critical', 'high', 'medium', 'low'];
const CATEGORIES = [
  'customer-pii', 'credentials', 'source-code', 'financial', 'legal',
  'contracts', 'business-strategy', 'health-phi', 'prompt-injection', 'employee-data',
];
const DESTS = ['public-llm', 'enterprise-saas', 'internal-agent', 'sandbox'];

const inputCls = "w-full px-2.5 py-1.5 bg-background border border-border rounded-md text-[12.5px] text-foreground placeholder:text-muted-foreground/60 focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all";

export default function DlpRuleDetailPage() {
  const { id } = useParams();
  const router = useRouter();
  const rules = useDlpRules();
  const rule = useMemo(() => rules.find(r => r.id === id) || null, [rules, id]);

  // Local test box — paste a prompt, see how just this rule would fire.
  const [testText, setTestText] = useState('');
  const testResult = useMemo(() => {
    if (!rule || !testText.trim()) return null;
    return inspect(testText, [rule]);
  }, [rule, testText]);

  if (!rule) {
    return (
      <>
        <GovernHeader title="DLP rules" />
        <div className="max-w-[1680px] mx-auto px-4 sm:px-6 lg:px-8 py-7">
          <div className="rounded-lg border border-dashed border-border bg-card px-6 py-10 text-center">
            <div className="text-[13px] font-medium text-foreground">Rule not found</div>
            <Link href="/app/govern/runtime/dlp" className="mt-4 inline-block text-[12px] text-primary hover:underline">All DLP rules →</Link>
          </div>
        </div>
      </>
    );
  }

  const onDelete = () => {
    if (!confirm(`Delete DLP rule "${rule.name}"? Removes from gateway bundle on next deploy.`)) return;
    removeDlpRule(rule.id);
    router.push('/app/govern/runtime/dlp');
  };

  const matchCats = Array.isArray(rule.match) ? rule.match : [rule.match];
  const toggleCat = (cat) => {
    const next = matchCats.includes(cat) ? matchCats.filter(c => c !== cat) : [...matchCats, cat];
    updateDlpRule(rule.id, { match: next });
  };

  const dests = Array.isArray(rule.scope_destinations) ? rule.scope_destinations : [];
  const toggleDest = (d) => {
    const next = dests.includes(d) ? dests.filter(x => x !== d) : [...dests, d];
    updateDlpRule(rule.id, { scope_destinations: next });
  };

  return (
    <>
      <GovernHeader title="DLP rules" />
      <div className="max-w-[1680px] mx-auto px-4 sm:px-6 lg:px-8 py-7 space-y-5">
        <Link href="/app/govern/runtime/dlp" className="text-[12px] text-muted-foreground hover:text-foreground inline-flex items-center gap-1.5">
          <ArrowLeft className="h-3.5 w-3.5" /> All DLP rules
        </Link>

        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap mb-1">
              <code className="text-[10.5px] font-mono text-muted-foreground">{rule.id}</code>
              <ActionBadge action={rule.action} />
              <SeverityChip severity={rule.severity} />
              <span className="text-[10.5px] font-mono text-muted-foreground">
                · maps to <Link href="/app/grc/controls" className="text-primary hover:underline">{rule.controls_ref}</Link>
              </span>
              <span className="text-[10.5px] font-mono text-muted-foreground">
                · {rule.hits_7d || 0} hits / 7d
              </span>
            </div>
            <input
              className="text-[20px] font-semibold tracking-tight text-foreground leading-tight bg-transparent border-none outline-none focus:bg-muted/20 rounded px-1 -ml-1"
              value={rule.name}
              onChange={(e) => updateDlpRule(rule.id, { name: e.target.value })}
            />
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <label className="inline-flex items-center gap-1.5 text-[11.5px] font-mono text-muted-foreground">
              <input
                type="checkbox"
                checked={rule.enabled !== false}
                onChange={(e) => updateDlpRule(rule.id, { enabled: e.target.checked })}
                className="h-3.5 w-3.5 accent-primary"
              />
              {rule.enabled !== false ? 'enabled' : 'disabled'}
            </label>
            <Button variant="outline" size="sm" onClick={onDelete} className="text-destructive border-destructive/40 hover:bg-destructive/10">
              <Trash2 className="h-3.5 w-3.5" /> Delete
            </Button>
          </div>
        </div>

        <textarea
          className={inputCls + ' resize-none'}
          rows={2}
          value={rule.description || ''}
          onChange={(e) => updateDlpRule(rule.id, { description: e.target.value })}
          placeholder="What this rule does and why."
        />

        {/* Two-column body */}
        <div className="grid grid-cols-1 lg:grid-cols-[1.2fr_1fr] gap-5">
          <section className="space-y-5">
            <Card title="Match categories" hint="Findings in these classes trigger the rule.">
              <div className="flex flex-wrap gap-1.5">
                {CATEGORIES.map(c => {
                  const on = matchCats.includes(c);
                  return (
                    <button
                      key={c}
                      type="button"
                      onClick={() => toggleCat(c)}
                      className={`inline-flex items-center px-2 py-1 rounded border text-[11px] font-mono transition-colors ${
                        on
                          ? 'border-primary/50 bg-primary/[0.06] text-primary'
                          : 'border-border bg-background text-muted-foreground hover:text-foreground hover:border-primary/30'
                      }`}
                    >
                      {c}
                    </button>
                  );
                })}
              </div>
              <div className="mt-3">
                <Lbl>Minimum confidence to fire</Lbl>
                <div className="flex items-center gap-3">
                  <input
                    type="range"
                    min="0" max="1" step="0.05"
                    value={rule.min_confidence ?? 0.7}
                    onChange={(e) => updateDlpRule(rule.id, { min_confidence: Number(e.target.value) })}
                    className="flex-1 accent-primary"
                  />
                  <span className="font-mono tabular-nums text-[12px] text-foreground w-12 text-right">
                    {Number(rule.min_confidence ?? 0.7).toFixed(2)}
                  </span>
                </div>
              </div>
            </Card>

            <Card title="Action + severity">
              <Lbl>Action when matched</Lbl>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5 mb-3">
                {ACTIONS.map(a => {
                  const on = rule.action === a.id;
                  return (
                    <button
                      key={a.id}
                      type="button"
                      onClick={() => updateDlpRule(rule.id, { action: a.id })}
                      className={`text-left rounded-md border px-2.5 py-1.5 transition-colors ${
                        on ? 'border-primary/50 bg-primary/[0.05]' : 'border-border bg-background hover:border-primary/30'
                      }`}
                    >
                      <div className={`text-[12px] font-medium ${on ? 'text-primary' : 'text-foreground'} capitalize`}>{a.label}</div>
                      <div className="text-[10.5px] text-muted-foreground leading-snug">{a.hint}</div>
                    </button>
                  );
                })}
              </div>
              <Lbl>Severity</Lbl>
              <select
                value={rule.severity || 'medium'}
                onChange={(e) => updateDlpRule(rule.id, { severity: e.target.value })}
                className={inputCls}
              >
                {SEVERITIES.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </Card>

            <Card title="Scope" hint="Where the rule fires. Empty destinations = everywhere.">
              <Lbl>Destination classes</Lbl>
              <div className="flex flex-wrap gap-1.5 mb-3">
                {DESTS.map(d => {
                  const on = dests.includes(d);
                  return (
                    <button
                      key={d}
                      type="button"
                      onClick={() => toggleDest(d)}
                      className={`inline-flex items-center px-2 py-1 rounded border text-[11px] font-mono transition-colors ${
                        on ? 'border-primary/50 bg-primary/[0.06] text-primary' : 'border-border bg-background text-muted-foreground hover:text-foreground'
                      }`}
                    >
                      {d}
                    </button>
                  );
                })}
              </div>
              <Lbl>Asset scope</Lbl>
              <select
                value={typeof rule.scope_assets === 'string' ? rule.scope_assets : 'all'}
                onChange={(e) => updateDlpRule(rule.id, { scope_assets: e.target.value })}
                className={inputCls}
              >
                <option value="all">All assets</option>
                <option value="unapproved">Unapproved + unknown only</option>
                <option value="quarantined">Quarantined only</option>
              </select>
            </Card>
          </section>

          <aside className="space-y-5">
            <Card title="Test this rule" hint="Paste text — only this rule evaluates.">
              <textarea
                rows={5}
                className={inputCls + ' font-mono resize-none'}
                value={testText}
                onChange={(e) => setTestText(e.target.value)}
                placeholder="Paste a prompt to see whether this rule fires…"
              />
              {testResult && (
                <div className="mt-2.5 rounded-md border border-border bg-background overflow-hidden">
                  <div className="px-3 py-2 border-b border-border flex items-center gap-2">
                    <span className="text-[10.5px] uppercase tracking-[0.14em] font-mono text-muted-foreground">decision</span>
                    <ActionBadge action={testResult.decision === 'allow' ? 'log' : testResult.decision} />
                    <span className="text-[10.5px] font-mono text-muted-foreground ml-auto">
                      {testResult.findings.length} finding{testResult.findings.length === 1 ? '' : 's'}
                    </span>
                  </div>
                  <div className="px-3 py-2 text-[11.5px] text-foreground/85 leading-relaxed">
                    {testResult.reasoning}
                  </div>
                  {testResult.decision !== 'allow' && testResult.decision !== 'log' && testResult.redacted_text && (
                    <div className="px-3 py-2 border-t border-border bg-muted/30">
                      <div className="text-[10.5px] uppercase tracking-[0.12em] font-mono text-muted-foreground mb-1">resulting prompt</div>
                      <pre className="text-[11.5px] font-mono text-foreground whitespace-pre-wrap break-words leading-relaxed">{testResult.redacted_text}</pre>
                    </div>
                  )}
                </div>
              )}
              <div className="mt-3 text-[11px] text-muted-foreground">
                Want the full multi-rule view? Open the{' '}
                <Link href="/app/govern/runtime/inspector" className="text-primary hover:underline inline-flex items-center gap-0.5">
                  <FileSearch className="h-3 w-3" /> Prompt Inspector
                </Link>.
              </div>
            </Card>

            <Card title="Bindings">
              <div className="space-y-2 text-[12px]">
                <Row label="GRC control">
                  <Link href="/app/grc/controls" className="font-mono text-primary hover:underline">{rule.controls_ref || '—'}</Link>
                </Row>
                <Row label="Policy refs">
                  {(rule.policy_refs || []).length === 0 ? '—' : (
                    <div className="flex flex-wrap gap-1 justify-end">
                      {rule.policy_refs.map(p => (
                        <span key={p} className="text-[10px] font-mono px-1.5 py-0.5 rounded border border-border bg-muted/40">{p}</span>
                      ))}
                    </div>
                  )}
                </Row>
                <Row label="Hits · 7d">
                  <span className="font-mono tabular-nums">{(rule.hits_7d || 0).toLocaleString()}</span>
                </Row>
                <Row label="Created">
                  <span className="font-mono">{rule.created_by || '—'}</span>
                </Row>
              </div>
            </Card>
          </aside>
        </div>
      </div>
    </>
  );
}

/* ─── shared ─── */

function Card({ title, hint, children }) {
  return (
    <div className="rounded-xl border border-border bg-card overflow-hidden">
      <div className="px-4 py-2.5 border-b border-border flex items-baseline justify-between gap-3">
        <div className="text-[10.5px] uppercase tracking-[0.16em] font-mono text-muted-foreground">{title}</div>
        {hint && <div className="text-[10.5px] text-muted-foreground/80 truncate max-w-[60%]">{hint}</div>}
      </div>
      <div className="px-4 py-3">{children}</div>
    </div>
  );
}
function Lbl({ children }) {
  return <div className="text-[10px] uppercase tracking-[0.14em] font-mono text-muted-foreground mb-1.5">{children}</div>;
}
function Row({ label, children }) {
  return (
    <div className="flex items-baseline justify-between gap-3">
      <span className="text-[11px] font-mono uppercase tracking-[0.1em] text-muted-foreground">{label}</span>
      <span className="text-foreground">{children}</span>
    </div>
  );
}
function ActionBadge({ action }) {
  const dot = action === 'block'  ? 'var(--destructive)'
            : action === 'redact' ? '#D97706'
            : action === 'warn'   ? '#F59E0B'
            : 'var(--muted-foreground)';
  return (
    <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded border border-border bg-muted/60 text-[10px] font-mono uppercase tracking-[0.12em] text-foreground">
      <span className="h-1.5 w-1.5 rounded-full shrink-0" style={{ background: dot }} />
      {action}
    </span>
  );
}
function SeverityChip({ severity }) {
  if (!severity) return null;
  const dot = severity === 'critical' ? 'var(--destructive)'
            : severity === 'high'     ? '#F59E0B'
            : severity === 'medium'   ? 'var(--primary)'
            : 'var(--muted-foreground)';
  return (
    <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded border border-border bg-muted/60 text-[10px] font-mono uppercase tracking-[0.12em] text-foreground">
      <span className="h-1.5 w-1.5 rounded-full shrink-0" style={{ background: dot }} />
      {severity}
    </span>
  );
}
