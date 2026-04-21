'use client';

import { useMemo } from 'react';
import { Badge } from '@/components/ui/badge';
import JsonTree from './JsonTree';

/* Pick a renderer for a span's input or output based on span kind + attrs. */
export function IOView({ span, which /* 'input' | 'output' */, currentMs }) {
  const value = span[which];
  if (value == null) return <Empty>No {which} captured.</Empty>;

  // Kind-specific output renderers
  if (which === 'output') {
    if (span.kind === 'llm')       return <LLMOutputView span={span} currentMs={currentMs} />;
    if (span.kind === 'retrieval') return <RetrievalOutputView span={span} />;
    if (span.kind === 'guardrail') return <GuardrailOutputView span={span} />;
    if (span.kind === 'tool') {
      if (span.attrs?.['db.system']) return <SqlOutputView span={span} />;
      return <HttpOutputView span={span} />;
    }
  }

  // Kind-specific input renderers
  if (which === 'input') {
    if (span.kind === 'llm')       return <LLMInputView span={span} />;
    if (span.kind === 'retrieval') return <RetrievalInputView span={span} />;
    if (span.kind === 'tool') {
      if (span.attrs?.['db.system']) return <SqlInputView span={span} />;
      return <HttpInputView span={span} />;
    }
  }

  // Fallback: pretty JSON tree
  return <JsonTree value={value} />;
}

/* ========== LLM ========== */

function LLMInputView({ span }) {
  const messages = span.input?.messages || [];
  const system   = span.input?.system;
  return (
    <div className="space-y-2">
      <ModelBadges span={span} />
      <div className="space-y-1.5">
        {system && <Bubble role="system" content={system} />}
        {messages.map((m, i) => <Bubble key={i} role={m.role} content={typeof m.content === 'string' ? m.content : JSON.stringify(m.content)} />)}
      </div>
    </div>
  );
}

function LLMOutputView({ span, currentMs }) {
  const text = span.output?.text || '';
  const toolCalls = span.output?.tool_calls || [];
  // Stream text based on span's replay progress
  const { pct } = progressOf(span, currentMs);
  const chars = Math.max(0, Math.min(text.length, Math.floor(text.length * pct)));
  const displayed = pct >= 1 ? text : text.slice(0, chars);
  const stillTyping = pct > 0 && pct < 1;

  const tokensTotal = Number(span.attrs?.['gen_ai.usage.output_tokens'] || 0);
  const tokensLive = pct >= 1 ? tokensTotal : Math.floor(tokensTotal * pct);

  return (
    <div className="space-y-2">
      <ModelBadges span={span} right={
        <span className="text-[10.5px] font-mono text-muted-foreground tabular-nums">
          {tokensLive} tok
        </span>
      } />
      <Bubble
        role="assistant"
        content={
          <>
            {displayed}
            {stillTyping && <span className="inline-block w-[2px] h-[1em] bg-primary ml-0.5 align-text-bottom animate-pulse" />}
          </>
        }
      />
      {toolCalls.length > 0 && (
        <div className="space-y-1.5">
          <div className="text-[10px] uppercase tracking-[0.18em] font-mono text-muted-foreground px-1">Tool calls</div>
          {toolCalls.map((tc, i) => (
            <div key={i} className="rounded-md border border-primary/30 bg-primary/5 px-3 py-2 text-[12px] font-mono">
              <span className="text-primary">{tc.name}</span>
              <span className="text-muted-foreground">(</span>
              <span className="text-foreground">{tc.arguments && Object.keys(tc.arguments).length ? JSON.stringify(tc.arguments) : ''}</span>
              <span className="text-muted-foreground">)</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function ModelBadges({ span, right }) {
  const model  = span.attrs?.['gen_ai.request.model'];
  const system = span.attrs?.['gen_ai.system'];
  const temp   = span.attrs?.['gen_ai.request.temperature'];
  return (
    <div className="flex items-center gap-1.5 flex-wrap">
      {system && <Badge variant="outline" className="text-[9.5px] capitalize">{system}</Badge>}
      {model  && <Badge variant="outline" className="text-[9.5px] font-mono">{model}</Badge>}
      {temp != null && <Badge variant="outline" className="text-[9.5px] font-mono">t={Number(temp).toFixed(2)}</Badge>}
      {span.attrs?.['gen_ai.request.streaming'] && <Badge variant="outline" className="text-[9.5px]">streaming</Badge>}
      <div className="ml-auto">{right}</div>
    </div>
  );
}

function Bubble({ role, content }) {
  const toneClass =
    role === 'system'    ? 'border-muted-foreground/30 bg-muted/40' :
    role === 'user'      ? 'border-primary/30 bg-primary/5' :
    role === 'assistant' ? 'border-(--brand-teal)/30 bg-(--brand-teal)/5' :
    role === 'tool'      ? 'border-amber-400/30 bg-amber-400/5' :
                           'border-border bg-card';
  const initials =
    role === 'system'    ? 'SY' :
    role === 'user'      ? 'YOU' :
    role === 'assistant' ? 'AI' :
    role === 'tool'      ? 'T' : role.slice(0,2).toUpperCase();
  return (
    <div className={`flex items-start gap-2 rounded-lg border px-3 py-2 ${toneClass}`}>
      <div className="h-6 w-6 rounded-md bg-background/70 border border-border flex items-center justify-center text-[9.5px] font-mono shrink-0 mt-0.5">
        {initials}
      </div>
      <div className="min-w-0 flex-1">
        <div className="text-[9.5px] uppercase tracking-[0.15em] font-mono text-muted-foreground">{role}</div>
        <div className="mt-0.5 text-[12.5px] leading-relaxed text-foreground whitespace-pre-wrap break-words">{content}</div>
      </div>
    </div>
  );
}

/* ========== TOOL · SQL ========== */

function SqlInputView({ span }) {
  const sql = span.input?.sql || '';
  return (
    <div className="space-y-2">
      <div className="flex items-center gap-1.5 flex-wrap">
        <Badge variant="outline" className="text-[9.5px]">{span.attrs?.['db.system'] || 'sql'}</Badge>
        {span.attrs?.['db.operation.name'] && <Badge variant="outline" className="text-[9.5px] font-mono">{span.attrs['db.operation.name']}</Badge>}
        {span.attrs?.['db.namespace']      && <Badge variant="outline" className="text-[9.5px] font-mono">{span.attrs['db.namespace']}</Badge>}
      </div>
      <SqlBlock sql={sql} />
    </div>
  );
}

function SqlOutputView({ span }) {
  const rowsReturned = span.attrs?.['db.response.returned_rows'];
  const sample = span.output?.sample;
  if (span.output?.error) {
    return <ErrorBlock code={span.output.code} message={span.output.error} />;
  }
  return (
    <div className="space-y-2">
      <div className="flex items-center gap-1.5 flex-wrap">
        {rowsReturned != null && <Badge className="text-[9.5px] font-mono bg-(--brand-teal)/10 text-brand-teal border border-(--brand-teal)/35">{Number(rowsReturned).toLocaleString()} rows</Badge>}
        <span className="text-[10.5px] text-muted-foreground font-mono">
          {span.attrs?.['http.response.status_code'] ? `HTTP ${span.attrs['http.response.status_code']}` : ''}
        </span>
      </div>
      {Array.isArray(sample) && sample.length > 0 && (
        <div className="rounded-lg border border-border overflow-hidden">
          <table className="w-full text-[11.5px] font-mono">
            <thead className="bg-muted/50">
              <tr>
                {sample[0].map((_, i) => (
                  <th key={i} className="text-left px-3 py-1.5 text-[10px] uppercase tracking-[0.14em] text-muted-foreground font-medium">col_{i}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {sample.map((row, i) => (
                <tr key={i} className="border-t border-border/60">
                  {row.map((cell, j) => <td key={j} className="px-3 py-1.5 tabular-nums">{cell}</td>)}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {!sample && <JsonTree value={span.output} />}
    </div>
  );
}

/* lightweight SQL highlighter — keyword list + string/number regex */
const SQL_KEYWORDS = new Set([
  'SELECT','FROM','WHERE','GROUP','BY','ORDER','LIMIT','INNER','LEFT','RIGHT','OUTER','JOIN','ON',
  'AS','AND','OR','NOT','IN','IS','NULL','INSERT','INTO','VALUES','UPDATE','SET','DELETE','DROP',
  'TABLE','INDEX','WITH','DISTINCT','CASE','WHEN','THEN','ELSE','END','UNION','HAVING','ASC','DESC',
  'INTERVAL','NOW','SUM','COUNT','AVG','MIN','MAX','OVER','PARTITION','CAST','USING','EXPLAIN',
]);
function SqlBlock({ sql }) {
  // Tokenize to color keywords + strings + numbers
  const tokens = useMemo(() => tokenizeSql(sql), [sql]);
  return (
    <pre className="rounded-lg border border-border bg-muted/50 p-3 text-[11.5px] font-mono leading-relaxed whitespace-pre-wrap overflow-x-auto">
      {tokens.map((t, i) => {
        if (t.kind === 'kw')  return <span key={i} className="text-primary font-semibold">{t.text}</span>;
        if (t.kind === 'str') return <span key={i} className="text-brand-teal">{t.text}</span>;
        if (t.kind === 'num') return <span key={i} className="text-amber-700 dark:text-amber-400">{t.text}</span>;
        if (t.kind === 'com') return <span key={i} className="text-muted-foreground italic">{t.text}</span>;
        return <span key={i}>{t.text}</span>;
      })}
    </pre>
  );
}
function tokenizeSql(sql) {
  const out = [];
  const re = /(--[^\n]*|'(?:''|[^'])*'|"(?:""|[^"])*"|\d+(?:\.\d+)?|[A-Za-z_][A-Za-z_0-9]*|\s+|[^\w\s])/g;
  let m;
  while ((m = re.exec(sql)) !== null) {
    const text = m[0];
    if (text.startsWith('--')) out.push({ kind: 'com', text });
    else if (text.startsWith("'") || text.startsWith('"')) out.push({ kind: 'str', text });
    else if (/^\d/.test(text)) out.push({ kind: 'num', text });
    else if (/^[A-Za-z_]/.test(text) && SQL_KEYWORDS.has(text.toUpperCase())) out.push({ kind: 'kw', text });
    else out.push({ kind: 'txt', text });
  }
  return out;
}

/* ========== TOOL · HTTP ========== */

function HttpInputView({ span }) {
  const method = span.input?.method || span.attrs?.['http.request.method'] || 'POST';
  const url    = span.input?.url    || '(derived from server)';
  const body   = span.input?.body;
  const headers = span.input?.headers;
  const bodyStr = typeof body === 'string' ? body : body ? JSON.stringify(body, null, 2) : '';
  return (
    <div className="space-y-2">
      <div className="flex items-center gap-1.5 flex-wrap">
        <Badge variant="outline" className="text-[9.5px] font-mono">{method}</Badge>
        <code className="text-[11.5px] font-mono text-foreground truncate">{url}</code>
      </div>
      <pre className="rounded-lg border border-border bg-muted/50 p-3 text-[11.5px] font-mono leading-relaxed whitespace-pre-wrap overflow-x-auto">
        <span className="text-muted-foreground">$</span>{' '}<span className="text-foreground">curl -X {method}</span>{' '}
        <span className="text-brand-teal">&quot;{url}&quot;</span>
        {headers && Object.entries(headers).map(([k,v]) => (
          <span key={k}>{`\n  -H `}<span className="text-brand-teal">&quot;{k}: {v}&quot;</span></span>
        ))}
        {bodyStr && (
          <>
            {`\n  -H `}<span className="text-brand-teal">&quot;Content-Type: application/json&quot;</span>
            {`\n  -d `}<span className="text-brand-teal">&apos;{bodyStr}&apos;</span>
          </>
        )}
      </pre>
    </div>
  );
}

function HttpOutputView({ span }) {
  if (span.output?.error) return <ErrorBlock code={span.output.code} message={span.output.error} />;
  const status = Number(span.attrs?.['http.response.status_code'] || 200);
  const ok = status >= 200 && status < 300;
  return (
    <div className="space-y-2">
      <div className="flex items-center gap-1.5 flex-wrap">
        <Badge className={`text-[9.5px] font-mono border ${ok ? 'border-(--brand-teal)/40 text-brand-teal bg-(--brand-teal)/10' : 'border-destructive/40 text-destructive bg-destructive/10'}`}>
          HTTP {status}
        </Badge>
        {span.durMs != null && <span className="text-[10.5px] text-muted-foreground font-mono">{span.durMs} ms</span>}
      </div>
      <JsonTree value={span.output} />
    </div>
  );
}

/* ========== RETRIEVAL ========== */

function RetrievalInputView({ span }) {
  return (
    <div className="space-y-2">
      <div className="flex items-center gap-1.5 flex-wrap">
        <Badge variant="outline" className="text-[9.5px]">top-{span.attrs?.['retrieval.top_k']}</Badge>
        {span.attrs?.['retrieval.hybrid']     && <Badge variant="outline" className="text-[9.5px]">hybrid</Badge>}
        {span.attrs?.['retrieval.reranker']   && <Badge variant="outline" className="text-[9.5px]">reranker</Badge>}
        {span.attrs?.['retrieval.threshold'] != null && (
          <Badge variant="outline" className="text-[9.5px] font-mono">≥ {Number(span.attrs['retrieval.threshold']).toFixed(2)}</Badge>
        )}
      </div>
      <div className="rounded-lg border border-border bg-muted/50 px-3 py-2 text-[12.5px] font-mono text-foreground">
        {span.input?.query}
      </div>
    </div>
  );
}

function RetrievalOutputView({ span }) {
  const chunks = span.output?.chunks || [];
  return (
    <div className="space-y-2">
      <div className="text-[10.5px] text-muted-foreground font-mono">
        {chunks.length} chunks returned · nDCG {span.attrs?.['retrieval.nDCG'] ?? '—'}
      </div>
      <div className="space-y-1.5">
        {chunks.map((c, i) => (
          <div key={i} className="rounded-lg border border-border bg-card px-3 py-2">
            <div className="flex items-center justify-between gap-2 mb-1">
              <span className="text-[10.5px] text-muted-foreground font-mono truncate">{c.source}</span>
              <div className="flex items-center gap-1.5 shrink-0">
                <div className="relative h-1.5 w-24 rounded-full bg-muted overflow-hidden">
                  <div className="absolute inset-y-0 left-0 rounded-full bg-primary" style={{ width: `${Math.round(c.score * 100)}%` }} />
                </div>
                <span className="text-[10.5px] font-mono tabular-nums text-muted-foreground">{c.score.toFixed(2)}</span>
              </div>
            </div>
            <div className="text-[12px] text-foreground leading-relaxed">{c.text}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ========== GUARDRAIL ========== */

function GuardrailOutputView({ span }) {
  const checks = (span.attrs?.['guardrail.checks'] || '').split(',').filter(Boolean);
  const decision = span.output?.decision || span.attrs?.['guardrail.decision'] || 'allow';
  const flagged  = span.output?.flagged  || [];
  const score    = Number(span.attrs?.['guardrail.score'] || 0);
  const mode     = span.attrs?.['guardrail.mode'] || 'balanced';

  const tone = decision === 'allow'
    ? 'border-(--brand-teal)/40 text-brand-teal bg-(--brand-teal)/10'
    : 'border-destructive/40 text-destructive bg-destructive/10';
  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2 flex-wrap">
        <Badge className={`text-[9.5px] font-mono border ${tone} capitalize`}>{decision}</Badge>
        <Badge variant="outline" className="text-[9.5px] capitalize">{mode}</Badge>
        {score > 0 && <span className="text-[10.5px] font-mono text-muted-foreground">score {score.toFixed(2)}</span>}
      </div>
      {checks.length > 0 && (
        <ul className="rounded-lg border border-border divide-y divide-border/60">
          {checks.map((c) => (
            <li key={c} className="flex items-center gap-2 px-3 py-1.5 text-[12px]">
              <span className="text-brand-teal">✓</span>
              <span className="capitalize text-foreground">{c}</span>
              <span className="ml-auto text-[10.5px] text-muted-foreground font-mono">passed</span>
            </li>
          ))}
        </ul>
      )}
      {flagged.length > 0 && (
        <ul className="rounded-lg border border-destructive/40 divide-y divide-destructive/20">
          {flagged.map((f, i) => (
            <li key={i} className="flex items-center gap-2 px-3 py-1.5 text-[12px] text-destructive">
              <span>✕</span>
              <span>{typeof f === 'string' ? f : JSON.stringify(f)}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

/* ========== common bits ========== */

function ErrorBlock({ code, message }) {
  return (
    <div className="rounded-lg border border-destructive/40 bg-destructive/5 px-3 py-2">
      <div className="flex items-center gap-1.5 mb-1">
        <Badge variant="destructive" className="text-[9.5px] font-mono">error</Badge>
        {code && <code className="text-[11px] font-mono text-destructive">{code}</code>}
      </div>
      <div className="text-[12.5px] font-mono text-foreground">{message}</div>
    </div>
  );
}
function Empty({ children }) {
  return <div className="text-[12px] text-muted-foreground italic">{children}</div>;
}

function progressOf(span, currentMs) {
  const end = span.startMs + span.durMs;
  if (currentMs <= span.startMs) return { state: 'pending', pct: 0 };
  if (currentMs >= end)          return { state: 'done',    pct: 1 };
  return { state: 'running', pct: (currentMs - span.startMs) / Math.max(1, span.durMs) };
}
