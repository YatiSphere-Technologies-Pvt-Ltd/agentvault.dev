'use client';

import { useState } from 'react';
import { accentClass, NodeIcon } from './node-kinds';

function Field({ label, children, hint }) {
  return (
    <label className="block">
      <div className="flex items-center justify-between mb-1">
        <span className="text-[10.5px] uppercase tracking-[0.15em] text-muted-foreground font-medium">{label}</span>
        {hint && <span className="text-[10px] text-muted-foreground/80 font-mono">{hint}</span>}
      </div>
      {children}
    </label>
  );
}

function TextInput(props) {
  return <input {...props} className="w-full px-2.5 py-1.5 bg-background border border-border rounded-md text-[12px] text-foreground placeholder:text-muted-foreground/60 focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all" />;
}

function TextArea(props) {
  return <textarea {...props} className="w-full px-2.5 py-1.5 bg-background border border-border rounded-md text-[11.5px] text-foreground font-mono placeholder:text-muted-foreground/60 focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all resize-none" rows={props.rows || 4} />;
}

function SelectInput({ value, onChange, options }) {
  return (
    <select value={value} onChange={onChange}
      className="w-full px-2 py-1.5 bg-background border border-border rounded-md text-[12px] text-foreground focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20">
      {options.map(o => <option key={o} value={o}>{o}</option>)}
    </select>
  );
}

export default function Inspector({ node, variant, onUpdate, onDelete, onClose, runStates, collapsed, onToggle }) {
  const [tab, setTab] = useState('config');

  if (collapsed) {
    return (
      <aside className="w-10 shrink-0 h-full border-l border-border bg-panel flex flex-col items-center py-3 gap-3">
        <button onClick={onToggle} className="h-7 w-7 flex items-center justify-center rounded hover:bg-panel2 text-muted-foreground hover:text-foreground" title="Expand inspector">
          <svg width="12" height="12" viewBox="0 0 12 12" fill="currentColor"><path d="M8 2L3 6l5 4V2z"/></svg>
        </button>
        <div className="h-px w-6 bg-border" />
        <div className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground" style={{ writingMode: 'vertical-rl' }}>
          Inspector{node ? ` · ${node.id}` : ''}
        </div>
      </aside>
    );
  }

  if (!node || !variant) {
    return (
      <aside className="w-[340px] shrink-0 border-l border-border bg-panel h-full flex flex-col">
        <div className="px-4 py-3 border-b border-border flex items-center justify-between">
          <div className="text-[10.5px] uppercase tracking-[0.2em] text-muted-foreground">Inspector</div>
          <button onClick={onToggle} className="h-7 w-7 flex items-center justify-center rounded hover:bg-panel2 text-muted-foreground hover:text-foreground" title="Collapse inspector">
            <svg width="12" height="12" viewBox="0 0 12 12" fill="currentColor"><path d="M4 2l5 4-5 4V2z"/></svg>
          </button>
        </div>
        <div className="flex-1 flex flex-col items-center justify-center px-10 text-center text-muted-foreground">
          <div className="h-12 w-12 rounded-full border border-border flex items-center justify-center mb-4">
            <svg width="18" height="18" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5"><circle cx="10" cy="10" r="7"/><path d="M10 6v4l2 2"/></svg>
          </div>
          <div className="text-[12.5px] font-medium text-foreground">Select a node to inspect</div>
          <div className="text-[11px] mt-1.5 max-w-[220px] leading-relaxed">Click a node on the canvas to edit its parameters, view inputs/outputs, and check its last run.</div>
        </div>
      </aside>
    );
  }

  const accent = variant.kindDef.accent;
  const bg = accentClass(accent, 'bg');
  const runState = runStates?.nodes?.[node.id];
  const params = node.params || {};

  const setParam = (key, value) => onUpdate(node.id, { params: { ...params, [key]: value } });

  const renderConfig = () => {
    const kind = variant.kind;
    const fields = [];

    if (kind === 'trigger') {
      if (variant.id === 'trigger.webhook') {
        fields.push(
          <Field key="method" label="Method"><SelectInput value={params.method || 'POST'} onChange={(e) => setParam('method', e.target.value)} options={['POST','GET','PUT']} /></Field>,
          <Field key="path" label="Path"><TextInput value={params.path || ''} onChange={(e) => setParam('path', e.target.value)} placeholder="/run" /></Field>,
          <Field key="auth" label="Auth"><SelectInput value={params.auth || 'bearer'} onChange={(e) => setParam('auth', e.target.value)} options={['bearer','basic','hmac','none']} /></Field>,
          <Field key="schema" label="Input schema" hint="JSON"><TextArea value={params.schema || ''} onChange={(e) => setParam('schema', e.target.value)} rows={5} /></Field>,
        );
      } else if (variant.id === 'trigger.schedule') {
        fields.push(
          <Field key="cron" label="Cron" hint="utc"><TextInput value={params.cron || ''} onChange={(e) => setParam('cron', e.target.value)} placeholder="0 */4 * * *" /></Field>,
          <Field key="tz" label="Timezone"><SelectInput value={params.tz || 'UTC'} onChange={(e) => setParam('tz', e.target.value)} options={['UTC','America/New_York','Europe/London','Asia/Singapore']} /></Field>,
        );
      }
    } else if (kind === 'llm') {
      fields.push(
        <Field key="model" label="Model"><SelectInput value={params.model || 'gpt-4o-mini'} onChange={(e) => setParam('model', e.target.value)} options={['gpt-4o-mini','gpt-4o','claude-3-5-sonnet','claude-3-5-haiku','gemini-1.5-pro','llama-3.3-70b']} /></Field>,
        <Field key="temp" label={`Temperature · ${params.temperature ?? 0.2}`}>
          <input type="range" min="0" max="1" step="0.05" value={params.temperature ?? 0.2} onChange={(e) => setParam('temperature', parseFloat(e.target.value))} className="w-full accent-primary" />
        </Field>,
        <Field key="max" label="Max tokens"><TextInput type="number" value={params.max_tokens ?? 512} onChange={(e) => setParam('max_tokens', parseInt(e.target.value) || 0)} /></Field>,
        <Field key="sys" label="System"><TextArea value={params.system || ''} onChange={(e) => setParam('system', e.target.value)} rows={3} /></Field>,
        <Field key="prompt" label="Prompt" hint="{{vars}} ok"><TextArea value={params.prompt || ''} onChange={(e) => setParam('prompt', e.target.value)} rows={5} /></Field>,
      );
      if (variant.id === 'llm.extract') {
        fields.push(<Field key="schema" label="JSON schema"><TextArea value={params.schema || ''} onChange={(e) => setParam('schema', e.target.value)} rows={5} /></Field>);
      }
    } else if (kind === 'agent') {
      fields.push(
        <Field key="agent_id" label="Agent"><SelectInput value={params.agent_id || ''} onChange={(e) => setParam('agent_id', e.target.value)} options={['doc-extract@v4','ap-triage@v2','risk-classifier@v1','kyc-verify@v3']} /></Field>,
        <Field key="timeout" label="Timeout (s)"><TextInput type="number" value={params.timeout_s ?? 30} onChange={(e) => setParam('timeout_s', parseInt(e.target.value) || 0)} /></Field>,
        <Field key="budget" label="Budget (USD)"><TextInput type="number" step="0.01" value={params.budget_usd ?? 0.5} onChange={(e) => setParam('budget_usd', parseFloat(e.target.value))} /></Field>,
      );
    } else if (kind === 'tool') {
      if (variant.id === 'tool.http' || variant.id === 'tool.salesforce' || variant.id === 'tool.netsuite') {
        fields.push(
          <Field key="method" label="Method"><SelectInput value={params.method || 'POST'} onChange={(e) => setParam('method', e.target.value)} options={['GET','POST','PUT','PATCH','DELETE']} /></Field>,
          <Field key="url" label="URL"><TextInput value={params.url || ''} onChange={(e) => setParam('url', e.target.value)} /></Field>,
          <Field key="body" label="Body"><TextArea value={params.body || ''} onChange={(e) => setParam('body', e.target.value)} rows={5} /></Field>,
        );
      } else if (variant.id === 'tool.snowflake') {
        fields.push(
          <Field key="wh" label="Warehouse"><TextInput value={params.warehouse || ''} onChange={(e) => setParam('warehouse', e.target.value)} /></Field>,
          <Field key="sql" label="SQL"><TextArea value={params.sql || ''} onChange={(e) => setParam('sql', e.target.value)} rows={6} /></Field>,
        );
      } else if (variant.id === 'tool.slack') {
        fields.push(
          <Field key="ch" label="Channel"><TextInput value={params.channel || ''} onChange={(e) => setParam('channel', e.target.value)} /></Field>,
          <Field key="tpl" label="Template"><TextArea value={params.template || ''} onChange={(e) => setParam('template', e.target.value)} rows={4} /></Field>,
        );
      }
    } else if (kind === 'human') {
      fields.push(
        <Field key="app" label="Approvers"><TextInput value={params.approvers || ''} onChange={(e) => setParam('approvers', e.target.value)} /></Field>,
        <Field key="t" label="Timeout (hours)"><TextInput type="number" value={params.timeout_h ?? 24} onChange={(e) => setParam('timeout_h', parseInt(e.target.value) || 0)} /></Field>,
        <Field key="esc" label="Escalate to"><TextInput value={params.escalate_to || ''} onChange={(e) => setParam('escalate_to', e.target.value)} /></Field>,
      );
    } else if (kind === 'policy') {
      fields.push(
        <Field key="pf" label="Policy file"><TextInput value={params.policy_file || ''} onChange={(e) => setParam('policy_file', e.target.value)} /></Field>,
        <Field key="mode" label="Mode"><SelectInput value={params.mode || 'strict'} onChange={(e) => setParam('mode', e.target.value)} options={['strict','dry-run','permissive']} /></Field>,
        <Field key="ondeny" label="On deny"><SelectInput value={params.on_deny || 'halt'} onChange={(e) => setParam('on_deny', e.target.value)} options={['halt','branch','log-only']} /></Field>,
      );
    } else if (kind === 'branch') {
      fields.push(
        <Field key="cond" label="Condition" hint="expression"><TextArea value={params.condition || ''} onChange={(e) => setParam('condition', e.target.value)} rows={3} /></Field>,
        <Field key="tl" label="True label"><TextInput value={params.true_label || ''} onChange={(e) => setParam('true_label', e.target.value)} /></Field>,
        <Field key="fl" label="False label"><TextInput value={params.false_label || ''} onChange={(e) => setParam('false_label', e.target.value)} /></Field>,
      );
    } else if (kind === 'code') {
      fields.push(
        <Field key="lang" label="Language"><SelectInput value={params.language || 'javascript'} onChange={(e) => setParam('language', e.target.value)} options={['javascript','python']} /></Field>,
        <Field key="src" label="Source"><TextArea value={params.source || ''} onChange={(e) => setParam('source', e.target.value)} rows={8} /></Field>,
      );
    } else if (kind === 'output') {
      fields.push(
        <Field key="shape" label="Response shape"><TextArea value={params.shape || ''} onChange={(e) => setParam('shape', e.target.value)} rows={6} /></Field>,
      );
    }
    return fields;
  };

  return (
    <aside className="w-[340px] shrink-0 border-l border-border bg-panel h-full flex flex-col">
      <div className="px-4 py-3 border-b border-border">
        <div className="flex items-start gap-2.5">
          <div className={`shrink-0 h-8 w-8 rounded ${bg} text-primary-foreground flex items-center justify-center`}>
            <NodeIcon name={variant.icon} size={15} />
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground">{variant.kindDef.label} · {variant.sub}</div>
            <input
              value={params.label || variant.label}
              onChange={(e) => setParam('label', e.target.value)}
              className="w-full mt-0.5 -ml-0.5 px-0.5 py-0 text-[14px] font-medium text-foreground bg-transparent border border-transparent hover:border-border focus:border-primary rounded focus:outline-none transition-colors"
            />
          </div>
          <button onClick={onClose} className="shrink-0 h-6 w-6 rounded text-muted-foreground hover:text-foreground hover:bg-panel2 flex items-center justify-center" title="Deselect">✕</button>
          <button onClick={onToggle} className="shrink-0 h-6 w-6 rounded text-muted-foreground hover:text-foreground hover:bg-panel2 flex items-center justify-center" title="Collapse inspector">
            <svg width="11" height="11" viewBox="0 0 12 12" fill="currentColor"><path d="M4 2l5 4-5 4V2z"/></svg>
          </button>
        </div>
        <div className="mt-2 font-mono text-[10px] text-muted-foreground flex items-center gap-2">
          <span>{node.id}</span>
          <span className="h-1 w-1 rounded-full bg-border" />
          <span>{variant.id}</span>
          {runState && (
            <>
              <span className="h-1 w-1 rounded-full bg-border" />
              <span className={runState === 'running' ? 'text-primary' : runState === 'success' ? 'text-accent' : runState === 'error' ? 'text-destructive' : ''}>
                {runState}
              </span>
            </>
          )}
        </div>
      </div>

      <div className="flex px-4 border-b border-border">
        {['config','io','runs'].map(t => (
          <button key={t} onClick={() => setTab(t)}
            className={`px-3 py-2 text-[11.5px] font-medium capitalize border-b-2 -mb-px transition-colors ${tab === t ? 'text-foreground border-primary' : 'text-muted-foreground border-transparent hover:text-foreground'}`}>
            {t === 'io' ? 'Inputs / outputs' : t === 'runs' ? 'Runs' : 'Config'}
          </button>
        ))}
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
        {tab === 'config' && renderConfig()}
        {tab === 'io' && (
          <div className="space-y-4">
            <Field label="Input (context)">
              <pre className="bg-background border border-border rounded-md p-3 font-mono text-[11px] text-foreground/80 overflow-x-auto">{`{
  "trigger": { "invoice_url": "..." },
  "steps":   { ...upstream outputs... }
}`}</pre>
            </Field>
            <Field label="Output (last run)">
              <pre className="bg-background border border-border rounded-md p-3 font-mono text-[11px] text-foreground/80 overflow-x-auto">{runState === 'success' || runState === 'done'
                ? `{\n  "ok": true,\n  "latency_ms": 420,\n  "cost_usd": 0.003\n}`
                : '// run the workflow to see output'}</pre>
            </Field>
          </div>
        )}
        {tab === 'runs' && (
          <div className="space-y-2">
            {[['2m ago','ok','420ms','$0.003'],['1h ago','ok','510ms','$0.004'],['3h ago','error','—','—']].map(([t,s,l,c],i) => (
              <div key={i} className="flex items-center justify-between px-3 py-2 bg-background border border-border rounded-md text-[11.5px]">
                <div className="flex items-center gap-2">
                  <span className={`h-1.5 w-1.5 rounded-full ${s === 'ok' ? 'bg-accent' : 'bg-destructive'}`}/>
                  <span className="text-foreground">{t}</span>
                </div>
                <div className="font-mono text-muted-foreground">{l} · {c}</div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="border-t border-border p-3 flex items-center justify-between">
        <button onClick={() => onDelete(node.id)} className="text-[11.5px] text-destructive hover:brightness-110 px-2 py-1 rounded font-medium">Delete node</button>
        <div className="text-[10.5px] text-muted-foreground font-mono">autosaved</div>
      </div>
    </aside>
  );
}
