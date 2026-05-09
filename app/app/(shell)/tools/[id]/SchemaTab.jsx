'use client';

import { Code2, ArrowRight } from 'lucide-react';

export default function SchemaTab({ tool }) {
  const { input, output } = tool.schema || {};
  return (
    <div className="space-y-5">
      <Section
        title="Tool schema"
        subtitle="The shape an agent's LLM sees when deciding to call this tool. Input is the tool's parameter contract; output is what the runtime returns."
      >
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <SchemaCard label="Input" content={input} />
          <SchemaCard label="Output" content={output} />
        </div>
      </Section>

      {tool.sampleInput && (
        <Section title="Sample call" subtitle="Example payload the agent would send.">
          <CodeBlock value={JSON.stringify(tool.sampleInput, null, 2)} />
        </Section>
      )}

      {tool.scopes && tool.scopes.length > 0 && (
        <Section title="Required scopes" subtitle="OAuth or platform scopes the runtime checks before invocation.">
          <div className="flex flex-wrap gap-1.5">
            {tool.scopes.map(s => (
              <span key={s} className="inline-flex items-center px-2 py-0.5 rounded-md border border-border bg-muted/40 text-[11.5px] font-mono">
                {s}
              </span>
            ))}
          </div>
        </Section>
      )}
    </div>
  );
}

function SchemaCard({ label, content }) {
  return (
    <div className="rounded-xl border border-border bg-card overflow-hidden">
      <div className="px-4 py-2.5 border-b border-border flex items-center gap-2">
        <Code2 className="h-3.5 w-3.5 text-muted-foreground" />
        <span className="text-[12px] font-medium text-foreground">{label}</span>
      </div>
      <CodeBlock value={typeof content === 'string' ? content : JSON.stringify(content, null, 2)} />
    </div>
  );
}

function CodeBlock({ value }) {
  return (
    <pre className="px-4 py-3 text-[11.5px] font-mono text-foreground/90 overflow-x-auto bg-muted/20 m-0 leading-relaxed">
      <code>{value || '—'}</code>
    </pre>
  );
}

function Section({ title, subtitle, children }) {
  return (
    <section>
      <div className="mb-3">
        <h3 className="text-[14px] font-semibold text-foreground">{title}</h3>
        {subtitle && <p className="mt-0.5 text-[12px] text-muted-foreground max-w-200">{subtitle}</p>}
      </div>
      {children}
    </section>
  );
}
