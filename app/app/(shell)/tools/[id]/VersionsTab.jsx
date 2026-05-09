'use client';

import { Tag, ArrowUpRight } from 'lucide-react';

/* Versions tab — for the demo we synthesize a small history from the tool's
   updatedAt + createdAt. A real registry would have a versions[] field. */

export default function VersionsTab({ tool }) {
  const history = synthesizeHistory(tool);

  return (
    <div className="space-y-5">
      <Section title="Version" subtitle="Currently active version of this tool.">
        <div className="rounded-xl border border-border bg-card p-4 flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2">
              <Tag className="h-4 w-4 text-muted-foreground" />
              <span className="text-[14px] font-semibold text-foreground">v{tool.version}</span>
              {tool.deprecation && (
                <span className="inline-flex items-center px-1.5 py-0.5 rounded border border-accent/40 bg-accent/10 text-accent text-[10px] font-medium">
                  deprecated
                </span>
              )}
            </div>
            <div className="mt-1 text-[11.5px] text-muted-foreground">
              Updated {tool.updatedAt ? new Date(tool.updatedAt).toLocaleString() : '—'}
            </div>
          </div>
          {tool.deprecation?.replacedBy && (
            <a
              href={`/app/tools/${encodeURIComponent(tool.deprecation.replacedBy)}`}
              className="inline-flex items-center gap-1 text-[12px] text-primary hover:brightness-110"
            >
              Replaced by {tool.deprecation.replacedBy} <ArrowUpRight className="h-3.5 w-3.5" />
            </a>
          )}
        </div>
      </Section>

      <Section title="Change log" subtitle="Material changes to schema, scopes, or providers.">
        <div className="rounded-xl border border-border bg-card overflow-hidden divide-y divide-border">
          {history.map((e, i) => (
            <div key={i} className="px-4 py-3 grid grid-cols-[80px_1fr_140px] gap-3 items-baseline">
              <div className="font-mono text-[12px] tabular-nums text-foreground">v{e.version}</div>
              <div>
                <div className="text-[12.5px] text-foreground">{e.message}</div>
                {e.author && (
                  <div className="mt-0.5 text-[11px] text-muted-foreground font-mono">{e.author}</div>
                )}
              </div>
              <div className="text-right text-[11px] font-mono text-muted-foreground">
                {new Date(e.at).toLocaleDateString()}
              </div>
            </div>
          ))}
        </div>
      </Section>

      {tool.deprecation && (
        <Section title="Deprecation notice">
          <div className="rounded-xl border border-accent/40 bg-accent/5 p-4 text-[12.5px] text-accent">
            <div className="font-semibold">Deprecated since {tool.deprecation.since}</div>
            {tool.deprecation.replacedBy && (
              <p className="mt-1 text-accent/85">
                Use <span className="font-mono">{tool.deprecation.replacedBy}</span> instead.
                Existing agents using this tool will continue to function until removal.
              </p>
            )}
            {tool.deprecation.removeBy && (
              <p className="mt-1 text-accent/85">
                Will be removed on {tool.deprecation.removeBy}.
              </p>
            )}
          </div>
        </Section>
      )}
    </div>
  );
}

function synthesizeHistory(tool) {
  // Two-entry minimum: created + last updated. If they're the same date,
  // collapse to one. A real store would have versions[] with diffs.
  const created = {
    version: '0.1.0',
    message: `Initial release · ${tool.origin} tool registered.`,
    author: tool.owner,
    at: tool.createdAt || new Date().toISOString(),
  };
  if (!tool.updatedAt || tool.updatedAt === tool.createdAt) return [created];
  return [
    {
      version: tool.version,
      message: 'Schema or configuration updated.',
      author: tool.owner,
      at: tool.updatedAt,
    },
    created,
  ];
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
