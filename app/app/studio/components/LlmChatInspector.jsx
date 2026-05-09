'use client';

/* LLM Chat node inspector — the rich variant of the Inspector body.
   Renders five sub-tabs:
     • Config    — provider, model, decoding, response format, ops
     • Messages  — multi-turn editor with role per turn + var picker
     • I/O       — visible input contract (vars referenced) + output schema
     • Test      — sample input + run-this-node-only with mocked response
     • Runs      — recent runs (mock list, same as before)

   Persists everything onto node.params via onUpdate(node.id, { params }).
   Reads workflow + node so it can compute available variables. */

import { useEffect, useMemo, useRef, useState } from 'react';
import { findModel, getOutputSchema, LLM_PROVIDERS, migrateLlmChatParams } from './node-kinds';
import { estimateTokens, getAvailableVars } from './_workflowVars';

/* ---------- shared bits (mirrors Inspector.jsx primitives) ---------- */

function Field({ label, hint, children }) {
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

const inputCls   = "w-full px-2.5 py-1.5 bg-background border border-border rounded-md text-[12px] text-foreground placeholder:text-muted-foreground/60 focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all";
const textareaCls = "w-full px-2.5 py-1.5 bg-background border border-border rounded-md text-[11.5px] text-foreground font-mono placeholder:text-muted-foreground/60 focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all resize-none";
const selectCls  = "w-full px-2 py-1.5 bg-background border border-border rounded-md text-[12px] text-foreground focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20";

/* ---------- variable-picker chip row ---------- */

function VarPicker({ vars, onPick }) {
  if (!vars.length) {
    return (
      <div className="text-[10.5px] text-muted-foreground/80 font-mono">
        No upstream variables yet. Connect this node to a trigger or another step.
      </div>
    );
  }
  return (
    <div className="flex flex-wrap gap-1.5">
      {vars.map(v => (
        <button
          key={v.path}
          type="button"
          onClick={() => onPick(v.path)}
          title={`${v.source} · ${v.hint}`}
          className="group inline-flex items-center gap-1 px-1.5 py-0.5 rounded border border-border bg-background hover:bg-primary/5 hover:border-primary/40 text-[10.5px] font-mono text-foreground transition-colors"
        >
          <span className="text-primary/80">{`{{`}</span>
          <span>{v.path.replace(/^\{\{|\}\}$/g, '')}</span>
          <span className="text-primary/80">{`}}`}</span>
        </button>
      ))}
    </div>
  );
}

/* ---------- messages editor ---------- */

const ROLES = ['user', 'assistant', 'system'];

function MessageRow({ msg, idx, total, onChange, onMove, onRemove, vars, focusKey }) {
  const taRef = useRef(null);

  // Insert a {{...}} reference at the cursor position when the user clicks
  // a chip in the picker scoped to this textarea.
  const insertVar = (snippet) => {
    const ta = taRef.current;
    if (!ta) {
      onChange({ ...msg, content: (msg.content || '') + snippet });
      return;
    }
    const start = ta.selectionStart ?? msg.content?.length ?? 0;
    const end   = ta.selectionEnd   ?? start;
    const next  = (msg.content || '').slice(0, start) + snippet + (msg.content || '').slice(end);
    onChange({ ...msg, content: next });
    requestAnimationFrame(() => {
      ta.focus();
      const pos = start + snippet.length;
      ta.setSelectionRange(pos, pos);
    });
  };

  return (
    <div className="rounded-md border border-border bg-background">
      <div className="flex items-center justify-between px-2 py-1.5 border-b border-border/70">
        <div className="flex items-center gap-2">
          <select
            value={msg.role}
            onChange={(e) => onChange({ ...msg, role: e.target.value })}
            className="text-[10.5px] font-mono uppercase tracking-[0.12em] bg-transparent text-foreground border border-border rounded px-1.5 py-0.5 focus:outline-none focus:border-primary"
          >
            {ROLES.map(r => <option key={r} value={r}>{r}</option>)}
          </select>
          <span className="text-[10px] font-mono text-muted-foreground">
            ~{estimateTokens(msg.content)} tok
          </span>
        </div>
        <div className="flex items-center gap-0.5 text-muted-foreground">
          <button type="button" disabled={idx === 0} onClick={() => onMove(idx, idx - 1)} className="h-5 w-5 rounded hover:bg-muted disabled:opacity-30 disabled:cursor-not-allowed flex items-center justify-center" title="Move up">↑</button>
          <button type="button" disabled={idx === total - 1} onClick={() => onMove(idx, idx + 1)} className="h-5 w-5 rounded hover:bg-muted disabled:opacity-30 disabled:cursor-not-allowed flex items-center justify-center" title="Move down">↓</button>
          <button type="button" disabled={total <= 1} onClick={() => onRemove(idx)} className="h-5 w-5 rounded hover:bg-destructive/10 hover:text-destructive disabled:opacity-30 disabled:cursor-not-allowed flex items-center justify-center" title="Remove">✕</button>
        </div>
      </div>
      <textarea
        ref={taRef}
        rows={4}
        value={msg.content || ''}
        onChange={(e) => onChange({ ...msg, content: e.target.value })}
        placeholder={msg.role === 'assistant' ? 'Pre-filled assistant turn (optional)' : msg.role === 'system' ? 'System instructions for this turn' : 'User message · use {{vars}}'}
        className={textareaCls + ' border-0 rounded-none rounded-b-md focus:ring-0'}
        data-msg-key={focusKey}
      />
      {vars.length > 0 && (
        <div className="px-2 pb-2 pt-1 flex flex-wrap gap-1.5 border-t border-border/70">
          {vars.slice(0, 8).map(v => (
            <button
              key={v.path}
              type="button"
              onClick={() => insertVar(v.path)}
              title={`${v.source} · ${v.hint}`}
              className="inline-flex items-center px-1.5 py-0.5 rounded border border-border bg-panel2 hover:bg-primary/5 hover:border-primary/40 text-[10px] font-mono text-foreground/80 transition-colors"
            >
              {v.path.replace(/^\{\{|\}\}$/g, '')}
            </button>
          ))}
          {vars.length > 8 && (
            <span className="text-[10px] text-muted-foreground/70 font-mono self-center">+{vars.length - 8} more</span>
          )}
        </div>
      )}
    </div>
  );
}

function MessagesEditor({ messages, onChange, vars }) {
  const set = (next) => onChange(next);

  const updateAt = (i, m) => {
    const next = messages.slice();
    next[i] = m;
    set(next);
  };
  const addMessage = (role) => {
    set([...messages, { role, content: '' }]);
  };
  const removeAt = (i) => {
    if (messages.length <= 1) return;
    set(messages.filter((_, idx) => idx !== i));
  };
  const moveTo = (from, to) => {
    if (to < 0 || to >= messages.length) return;
    const next = messages.slice();
    const [m] = next.splice(from, 1);
    next.splice(to, 0, m);
    set(next);
  };

  return (
    <div className="space-y-2">
      {messages.map((m, i) => (
        <MessageRow
          key={i}
          idx={i}
          total={messages.length}
          msg={m}
          onChange={(nm) => updateAt(i, nm)}
          onMove={moveTo}
          onRemove={removeAt}
          vars={vars}
          focusKey={`m-${i}`}
        />
      ))}
      <div className="flex items-center gap-1.5 pt-1">
        <button type="button" onClick={() => addMessage('user')}      className="text-[11px] px-2 py-1 rounded border border-border hover:border-primary/50 hover:bg-primary/5 text-foreground transition-colors">+ user</button>
        <button type="button" onClick={() => addMessage('assistant')} className="text-[11px] px-2 py-1 rounded border border-border hover:border-primary/50 hover:bg-primary/5 text-foreground transition-colors">+ assistant</button>
        <button type="button" onClick={() => addMessage('system')}    className="text-[11px] px-2 py-1 rounded border border-border hover:border-primary/50 hover:bg-primary/5 text-foreground transition-colors">+ system</button>
      </div>
    </div>
  );
}

/* ---------- mock test runner (in-inspector) ---------- */

function buildMockResponse(params, sampleInput) {
  // Resolve {{vars}} in messages against a tiny context.
  const ctx = { input: sampleInput, trigger: sampleInput, steps: {} };
  const resolve = (s) => String(s || '').replace(/\{\{\s*([^}]+?)\s*\}\}/g, (_, key) => {
    const segs = key.split('.');
    let cur = ctx;
    for (const seg of segs) cur = cur?.[seg];
    if (cur == null) return `{{${key}}}`;
    return typeof cur === 'string' ? cur : JSON.stringify(cur);
  });

  const resolved = (params.messages || []).map(m => ({ role: m.role, content: resolve(m.content) }));
  const inputTokens  = estimateTokens(params.system) + resolved.reduce((a, m) => a + estimateTokens(m.content), 0);
  const outputText = pickReply(params, sampleInput);
  const outputTokens = estimateTokens(outputText);

  // Fake $/M-token rates so the cost line feels real.
  const rate = (params.model || '').includes('opus') ? { in: 15, out: 75 }
            : (params.model || '').includes('sonnet') ? { in: 3, out: 15 }
            : (params.model || '').includes('haiku')  ? { in: 1, out: 5 }
            : (params.model || '').includes('gpt-4o-mini') ? { in: 0.15, out: 0.6 }
            : (params.model || '').includes('gpt-4o') ? { in: 5, out: 15 }
            : (params.model || '').includes('gemini-1.5-pro')   ? { in: 3.5, out: 10.5 }
            : (params.model || '').includes('gemini-1.5-flash') ? { in: 0.075, out: 0.3 }
            : (params.model || '').includes('o3-mini') ? { in: 1.1, out: 4.4 }
            : { in: 0.6, out: 1.8 };
  const cost_usd = +(((inputTokens * rate.in) + (outputTokens * rate.out)) / 1_000_000).toFixed(6);

  const respondsAsJson = params.response_format === 'json_object' || params.response_format === 'json_schema';
  const parsed = respondsAsJson ? safeParse(outputText) : null;

  // Tool-call simulation: if tool_choice is required, fabricate one. Otherwise
  // ~25% of the time go tool_use to demonstrate the shape.
  let tool_calls = [];
  let finish_reason = 'stop';
  if (params.tool_choice === 'required' || (params.tool_choice === 'auto' && Math.random() < 0.25)) {
    tool_calls = [{
      id: 'call_' + Math.random().toString(36).slice(2, 8),
      name: 'lookup_vendor',
      arguments: { query: (sampleInput?.vendor) || 'ACME Corp' },
    }];
    finish_reason = 'tool_use';
  }

  return {
    text: tool_calls.length ? '' : outputText,
    messages: [...resolved, { role: 'assistant', content: tool_calls.length ? '' : outputText }],
    tool_calls,
    finish_reason,
    parsed,
    usage: {
      input_tokens:       inputTokens,
      output_tokens:      outputTokens,
      cache_read_tokens:  params.prompt_cache ? Math.round(inputTokens * 0.6) : 0,
      cost_usd,
    },
    model_used: params.model,
    attempts: 1,
    latency_ms: 320 + Math.round(Math.random() * 900),
  };
}

function safeParse(s) { try { return JSON.parse(s); } catch { return null; } }

function pickReply(params, sampleInput) {
  if (params.response_format === 'json_object' || params.response_format === 'json_schema') {
    return JSON.stringify({
      ok: true,
      input_echo: sampleInput,
      summary: 'simulated response',
    }, null, 2);
  }
  // Just enough text that the user sees it work.
  const last = (params.messages || []).slice().reverse().find(m => m.role === 'user');
  const seed = last?.content || 'your message';
  return `Sure — here's a simulated response from ${params.model}.\n\nI received: ${seed.slice(0, 140)}${seed.length > 140 ? '…' : ''}`;
}

/* ---------- main inspector body ---------- */

const TABS = [
  { id: 'config',   label: 'Config' },
  { id: 'messages', label: 'Messages' },
  { id: 'io',       label: 'Inputs / Outputs' },
  { id: 'test',     label: 'Test' },
  { id: 'runs',     label: 'Runs' },
];

export default function LlmChatInspector({ node, workflow, onUpdate, runStates }) {
  const params = useMemo(() => migrateLlmChatParams(node.params || {}), [node.params]);
  const [tab, setTab] = useState('config');
  const setParam = (patch) => onUpdate(node.id, { params: { ...params, ...patch } });

  // If the runtime params don't yet have `messages` (legacy save), persist the
  // migrated shape on first interaction so the rest of the system sees the new
  // contract. Doing this in an effect avoids fighting the user mid-typing.
  const migratedRef = useRef(false);
  useEffect(() => {
    if (migratedRef.current) return;
    if (Array.isArray(node.params?.messages)) { migratedRef.current = true; return; }
    onUpdate(node.id, { params });
    migratedRef.current = true;
  }, [node.id, node.params?.messages, onUpdate, params]);

  const vars = useMemo(() => getAvailableVars(workflow, node.id), [workflow, node.id]);
  const totalIn = estimateTokens(params.system) + (params.messages || []).reduce((a, m) => a + estimateTokens(m.content), 0);
  const modelMeta = findModel(params.model);

  // Test tab state
  const [sampleJson, setSampleJson] = useState('{ "text": "Process invoice INV-1042 from ACME Corp for $4,200.", "vendor": "ACME Corp" }');
  const [testResult, setTestResult] = useState(null);
  const [testRunning, setTestRunning] = useState(false);
  const runTest = async () => {
    setTestRunning(true);
    setTestResult(null);
    let parsed; try { parsed = JSON.parse(sampleJson); } catch { parsed = {}; }
    await new Promise(r => setTimeout(r, 350 + Math.random() * 600));
    setTestResult(buildMockResponse(params, parsed));
    setTestRunning(false);
  };

  const runState = runStates?.nodes?.[node.id];
  const outputSchema = getOutputSchema('llm.chat');

  return (
    <div className="flex-1 flex flex-col min-h-0">
      {/* sub-tab strip */}
      <div className="flex px-4 border-b border-border overflow-x-auto">
        {TABS.map(t => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`px-3 py-2 text-[11.5px] font-medium border-b-2 -mb-px transition-colors whitespace-nowrap ${
              tab === t.id ? 'text-foreground border-primary' : 'text-muted-foreground border-transparent hover:text-foreground'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
        {tab === 'config' && (
          <>
            <Field label="Model" hint={modelMeta ? `${modelMeta.providerLabel} · ${(modelMeta.ctx / 1000).toFixed(0)}K ctx` : ''}>
              <select
                value={params.model}
                onChange={(e) => {
                  const m = findModel(e.target.value);
                  setParam({ model: e.target.value, provider: m?.provider || params.provider });
                }}
                className={selectCls}
              >
                {LLM_PROVIDERS.map(p => (
                  <optgroup key={p.id} label={p.label}>
                    {p.models.map(m => (
                      <option key={m.id} value={m.id}>
                        {m.label} · {m.caps.join(' / ')}
                      </option>
                    ))}
                  </optgroup>
                ))}
              </select>
            </Field>

            <Field label={`Temperature · ${params.temperature ?? 0.2}`}>
              <input type="range" min="0" max="1" step="0.05" value={params.temperature ?? 0.2} onChange={(e) => setParam({ temperature: parseFloat(e.target.value) })} className="w-full accent-primary" />
            </Field>

            <div className="grid grid-cols-2 gap-3">
              <Field label="Top P">
                <input type="number" step="0.05" min="0" max="1" value={params.top_p ?? 1} onChange={(e) => setParam({ top_p: parseFloat(e.target.value) })} className={inputCls} />
              </Field>
              <Field label="Max tokens">
                <input type="number" value={params.max_tokens ?? 1024} onChange={(e) => setParam({ max_tokens: parseInt(e.target.value) || 0 })} className={inputCls} />
              </Field>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <Field label="Seed" hint="optional">
                <input type="number" value={params.seed ?? ''} onChange={(e) => setParam({ seed: e.target.value === '' ? null : parseInt(e.target.value) })} className={inputCls} placeholder="—" />
              </Field>
              <Field label="Stop sequences" hint="comma-sep">
                <input
                  value={(params.stop || []).join(', ')}
                  onChange={(e) => setParam({ stop: e.target.value.split(',').map(s => s.trim()).filter(Boolean) })}
                  className={inputCls}
                  placeholder="</done>, <|eot|>"
                />
              </Field>
            </div>

            <Field label="System">
              <textarea rows={3} value={params.system || ''} onChange={(e) => setParam({ system: e.target.value })} className={textareaCls} placeholder="High-level instructions" />
            </Field>

            <div className="grid grid-cols-2 gap-3">
              <Field label="Response format">
                <select value={params.response_format || 'text'} onChange={(e) => setParam({ response_format: e.target.value })} className={selectCls}>
                  <option value="text">text</option>
                  <option value="json_object">JSON object</option>
                  <option value="json_schema">JSON schema</option>
                </select>
              </Field>
              <Field label="Tool choice">
                <select value={params.tool_choice || 'auto'} onChange={(e) => setParam({ tool_choice: e.target.value })} className={selectCls}>
                  <option value="auto">auto</option>
                  <option value="none">none</option>
                  <option value="required">required</option>
                </select>
              </Field>
            </div>

            {params.response_format === 'json_schema' && (
              <Field label="JSON schema" hint="enforced">
                <textarea rows={5} value={params.json_schema || ''} onChange={(e) => setParam({ json_schema: e.target.value })} className={textareaCls} placeholder='{ "total": "number", "vendor": "string" }' />
              </Field>
            )}

            <div className="border-t border-border/70 pt-3 space-y-3">
              <div className="text-[10px] uppercase tracking-[0.18em] font-mono text-muted-foreground">Operational</div>

              <div className="grid grid-cols-2 gap-3">
                <Field label="Streaming">
                  <Toggle on={!!params.stream} onChange={(on) => setParam({ stream: on })} />
                </Field>
                <Field label="Prompt cache">
                  <Toggle on={!!params.prompt_cache} onChange={(on) => setParam({ prompt_cache: on })} />
                </Field>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <Field label="Retries">
                  <input type="number" min="0" max="5" value={params.retries ?? 0} onChange={(e) => setParam({ retries: parseInt(e.target.value) || 0 })} className={inputCls} />
                </Field>
                <Field label="Fallback model" hint="optional">
                  <select value={params.fallback_model || ''} onChange={(e) => setParam({ fallback_model: e.target.value })} className={selectCls}>
                    <option value="">— none —</option>
                    {LLM_PROVIDERS.flatMap(p => p.models).filter(m => m.id !== params.model).map(m => (
                      <option key={m.id} value={m.id}>{m.label}</option>
                    ))}
                  </select>
                </Field>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <Field label="Timeout (s)">
                  <input type="number" value={params.timeout_s ?? 30} onChange={(e) => setParam({ timeout_s: parseInt(e.target.value) || 0 })} className={inputCls} />
                </Field>
                <Field label="Budget (USD)">
                  <input type="number" step="0.01" value={params.budget_usd ?? 0.10} onChange={(e) => setParam({ budget_usd: parseFloat(e.target.value) })} className={inputCls} />
                </Field>
              </div>
            </div>
          </>
        )}

        {tab === 'messages' && (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="text-[11px] text-muted-foreground">
                Conversation sent to the model. Use <span className="font-mono text-foreground">{`{{vars}}`}</span> to inject upstream values.
              </div>
              <div className="text-[10px] font-mono text-muted-foreground">
                ~{totalIn} input tokens
              </div>
            </div>
            <MessagesEditor
              messages={params.messages || []}
              onChange={(next) => setParam({ messages: next })}
              vars={vars}
            />
          </div>
        )}

        {tab === 'io' && (
          <div className="space-y-5">
            <section>
              <div className="text-[10px] uppercase tracking-[0.18em] font-mono text-muted-foreground mb-2">Available variables</div>
              {vars.length === 0 ? (
                <div className="text-[11px] text-muted-foreground">
                  This node has no upstream connections yet. Wire it up to a trigger or another step to expose <span className="font-mono">{'{{trigger.*}}'}</span> and <span className="font-mono">{'{{steps.*.output.*}}'}</span> here.
                </div>
              ) : (
                <div className="space-y-1.5">
                  {vars.map(v => (
                    <div key={v.path} className="flex items-start justify-between gap-2 px-2 py-1.5 rounded border border-border bg-background">
                      <div className="min-w-0">
                        <div className="font-mono text-[11px] text-foreground truncate">{v.path}</div>
                        <div className="text-[10.5px] text-muted-foreground truncate">{v.source}</div>
                      </div>
                      <div className="text-[10px] text-muted-foreground/80 font-mono whitespace-nowrap">{v.hint}</div>
                    </div>
                  ))}
                </div>
              )}
            </section>

            <section>
              <div className="text-[10px] uppercase tracking-[0.18em] font-mono text-muted-foreground mb-2">Output schema</div>
              <div className="text-[11px] text-muted-foreground mb-2">
                Downstream nodes can reference these via <span className="font-mono text-foreground">{`{{steps.${node.id}.output.*}}`}</span>.
              </div>
              <div className="space-y-1">
                {outputSchema.fields.map(f => (
                  <div key={f.path} className="flex items-start justify-between gap-3 px-2 py-1.5 rounded border border-border bg-background">
                    <div className="min-w-0">
                      <div className="font-mono text-[11px] text-foreground">{f.path}</div>
                      <div className="text-[10.5px] text-muted-foreground">{f.desc}</div>
                    </div>
                    <div className="text-[10px] font-mono text-primary/80 whitespace-nowrap">{f.type}</div>
                  </div>
                ))}
              </div>
            </section>
          </div>
        )}

        {tab === 'test' && (
          <div className="space-y-3">
            <Field label="Sample input" hint="bound to {{trigger.*}} / {{input.*}}">
              <textarea rows={5} value={sampleJson} onChange={(e) => setSampleJson(e.target.value)} className={textareaCls} />
            </Field>
            <div className="flex items-center justify-between">
              <div className="text-[10.5px] text-muted-foreground font-mono">
                Mock — no API call. Estimates use {modelMeta?.label || params.model} pricing.
              </div>
              <button
                onClick={runTest}
                disabled={testRunning}
                className="btn-primary text-[11.5px] px-3 py-1.5 rounded-md font-medium disabled:opacity-60"
              >
                {testRunning ? 'Running…' : 'Run this node'}
              </button>
            </div>
            {testResult && (
              <div className="space-y-3">
                <div className="grid grid-cols-3 gap-2">
                  <Stat label="latency"   value={`${testResult.latency_ms}ms`} />
                  <Stat label="in / out tokens"  value={`${testResult.usage.input_tokens} / ${testResult.usage.output_tokens}`} />
                  <Stat label="cost"      value={`$${testResult.usage.cost_usd.toFixed(6)}`} />
                </div>
                {testResult.tool_calls.length > 0 && (
                  <Field label="Tool calls">
                    <pre className="bg-background border border-border rounded-md p-3 font-mono text-[11px] text-foreground/90 overflow-x-auto">{JSON.stringify(testResult.tool_calls, null, 2)}</pre>
                  </Field>
                )}
                <Field label={testResult.parsed ? 'Parsed JSON' : 'Assistant text'}>
                  <pre className="bg-background border border-border rounded-md p-3 font-mono text-[11px] text-foreground/90 overflow-x-auto whitespace-pre-wrap">
                    {testResult.parsed ? JSON.stringify(testResult.parsed, null, 2) : (testResult.text || '(empty — see tool calls)')}
                  </pre>
                </Field>
                <Field label="Full output">
                  <pre className="bg-background border border-border rounded-md p-3 font-mono text-[10.5px] text-foreground/70 overflow-x-auto">{JSON.stringify(testResult, null, 2)}</pre>
                </Field>
              </div>
            )}
            {!testResult && !testRunning && (
              <div className="text-[11px] text-muted-foreground/80 italic">Run to see the response shape and token / cost estimate.</div>
            )}
          </div>
        )}

        {tab === 'runs' && (
          <div className="space-y-2">
            {[
              ['just now', runState === 'success' ? 'ok' : runState === 'error' ? 'err' : '—', '—', '—'],
              ['2m ago', 'ok', '420ms', '$0.0030'],
              ['1h ago', 'ok', '510ms', '$0.0042'],
              ['3h ago', 'err', '—', '—'],
            ].map(([t, s, l, c], i) => (
              <div key={i} className="flex items-center justify-between px-3 py-2 bg-background border border-border rounded-md text-[11.5px]">
                <div className="flex items-center gap-2">
                  <span className={`h-1.5 w-1.5 rounded-full ${s === 'ok' ? 'bg-accent' : s === 'err' ? 'bg-destructive' : 'bg-border'}`} />
                  <span className="text-foreground">{t}</span>
                </div>
                <div className="font-mono text-muted-foreground">{l} · {c}</div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function Stat({ label, value }) {
  return (
    <div className="px-2 py-1.5 rounded-md border border-border bg-background">
      <div className="text-[9.5px] uppercase tracking-[0.16em] font-mono text-muted-foreground">{label}</div>
      <div className="text-[12.5px] font-mono text-foreground tabular-nums">{value}</div>
    </div>
  );
}

function Toggle({ on, onChange }) {
  return (
    <button
      type="button"
      onClick={() => onChange(!on)}
      className={`inline-flex items-center h-6 w-11 rounded-full border transition-colors ${on ? 'bg-primary border-primary' : 'bg-background border-border'}`}
    >
      <span className={`inline-block h-4 w-4 rounded-full bg-panel border border-border transform transition-transform ${on ? 'translate-x-6' : 'translate-x-1'}`} />
    </button>
  );
}
