'use client';

import { useMemo, useState } from 'react';
import {
  Plus, ArrowUp, Power, Pencil, Trash2, ExternalLink, Globe2, KeyRound, ChevronRight, FlaskConical,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  ROUTING_STRATEGIES, FALLBACK_TRIGGERS,
  providerCatalogFor, providerTemplate, vendorTone,
} from '../_providerCatalog';
import { useTools } from '../_toolsStore';
import AddProviderSheet from './AddProviderSheet';
import RuntimeCards from './RuntimeCards';
import KnowledgeCards from './KnowledgeCards';

export default function OverviewTab({ tool }) {
  const { promoteProvider, updateProvider, removeProvider, updateRouting } = useTools();
  const catalog = providerCatalogFor(tool.id);

  const [sheetOpen, setSheetOpen] = useState(false);
  const [editingProviderId, setEditingProviderId] = useState(null);

  // Sort providers: primary first, then fallback by createdAt, disabled last
  const providers = useMemo(() => {
    const list = [...(tool.providers || [])];
    return list.sort((a, b) => {
      const order = (p) => p.role === 'primary' ? 0 : p.status === 'disabled' ? 2 : 1;
      const oa = order(a), ob = order(b);
      if (oa !== ob) return oa - ob;
      return (a.createdAt || '').localeCompare(b.createdAt || '');
    });
  }, [tool.providers]);

  const onAdd = () => { setEditingProviderId(null); setSheetOpen(true); };
  const onEdit = (id) => { setEditingProviderId(id); setSheetOpen(true); };

  const onPromote = (id) => promoteProvider(tool.id, id);
  const onToggleStatus = (p) => {
    const next = p.status === 'active' ? 'disabled' : 'active';
    updateProvider(tool.id, p.id, { status: next });
  };
  const onRemove = (p) => {
    const ok = confirm(`Remove provider "${p.label}"? This cannot be undone.`);
    if (ok) removeProvider(tool.id, p.id);
  };

  // Variant copy depending on whether the tool is a compute tool, a retrieval
  // tool (RAG / GraphRAG), or a generic provider-backed tool.
  const isCompute   = !!tool.runtime;
  const isRetrieval = !!tool.retrieval;
  const isGraph     = isRetrieval && tool.retrieval?.kind === 'graph';

  const providersTitle =
      isCompute   ? 'Sandboxes'
    : isRetrieval ? (isGraph ? 'Graph backends' : 'Vector backends')
    :               'Providers';

  const providersSubtitle =
      isCompute
        ? 'Concrete sandbox runtimes that execute the code. The runtime picks one per call based on routing rules.'
    : isRetrieval
        ? (isGraph
            ? 'Concrete graph backends that store the knowledge graph and serve queries.'
            : 'Concrete vector stores that hold the index and serve queries.')
        : 'Concrete engines behind this tool. The runtime picks one per call based on routing rules.';

  const providersEmpty =
      isCompute
        ? 'Pick a sandbox runtime — built-in, E2B, Modal, Daytona, or your own.'
    : isRetrieval
        ? (isGraph
            ? 'Pick a graph backend — Microsoft GraphRAG, Neo4j, LightRAG, or BYO.'
            : 'Pick a vector backend — pgvector, Qdrant, Pinecone, Weaviate, Elastic, or Turbopuffer.')
        : `Pick from ${catalog?.length ?? 0} supported engines — Bing Grounding, Brave, Google CSE, Tavily, and more.`;

  const providersAddLabel =
      isCompute   ? 'Add sandbox'
    : isRetrieval ? (isGraph ? 'Add backend' : 'Add backend')
    :               'Add provider';

  return (
    <div className="space-y-5">
      {/* ── Runtime cards (only when the tool has a runtime block) ── */}
      <RuntimeCards tool={tool} />

      {/* ── Knowledge / retrieval cards (only when the tool has a retrieval block) ── */}
      <KnowledgeCards tool={tool} />

      {/* ── Providers / Sandboxes (only for tools with a catalog) ── */}
      {catalog && (
        <Section
          title={providersTitle}
          subtitle={providersSubtitle}
          action={
            <Button size="sm" onClick={onAdd}>
              <Plus className="h-3.5 w-3.5" /> {providersAddLabel}
            </Button>
          }
        >
          {providers.length === 0 ? (
            <div className="rounded-xl border border-dashed border-border bg-muted/20 p-6 text-center">
              <Globe2 className="h-5 w-5 text-muted-foreground/70 mx-auto" />
              <div className="mt-2 text-[13px] font-medium text-foreground">No {isCompute ? 'sandboxes' : 'providers'} configured</div>
              <p className="mt-1 text-[12px] text-muted-foreground max-w-100 mx-auto">
                {providersEmpty}
              </p>
              <Button size="sm" className="mt-3" onClick={onAdd}>
                <Plus className="h-3.5 w-3.5" /> {providersAddLabel}
              </Button>
            </div>
          ) : (
            <div className="space-y-2.5">
              {providers.map(p => (
                <ProviderCard
                  key={p.id}
                  toolId={tool.id}
                  provider={p}
                  onPromote={() => onPromote(p.id)}
                  onEdit={() => onEdit(p.id)}
                  onToggleStatus={() => onToggleStatus(p)}
                  onRemove={() => onRemove(p)}
                />
              ))}
            </div>
          )}
        </Section>
      )}

      {/* ── Routing rules ── */}
      {catalog && providers.length > 0 && (
        <Section
          title="Routing"
          subtitle="How the runtime decides which provider answers each call."
        >
          <RoutingCard
            tool={tool}
            onChangeStrategy={(v) => updateRouting(tool.id, { strategy: v })}
            onToggleTrigger={(t) => {
              const cur = tool.routing?.fallbackTriggers || [];
              const next = cur.includes(t) ? cur.filter(x => x !== t) : [...cur, t];
              updateRouting(tool.id, { fallbackTriggers: next });
            }}
            onChangeTimeout={(v) => updateRouting(tool.id, { timeoutMs: v })}
            onChangeRetries={(v) => updateRouting(tool.id, { retryBudget: v })}
          />
        </Section>
      )}

      {/* ── Identity card (always shown, light) ── */}
      <Section title="Identity" subtitle="Ownership, scopes, and lifecycle metadata.">
        <IdentityCard tool={tool} />
      </Section>

      <AddProviderSheet
        open={sheetOpen}
        onClose={() => { setSheetOpen(false); setEditingProviderId(null); }}
        toolId={tool.id}
        catalog={catalog || []}
        existingProvider={editingProviderId ? providers.find(p => p.id === editingProviderId) : null}
        existingPrimaryId={providers.find(p => p.role === 'primary')?.id}
      />
    </div>
  );
}

/* ───────────────────── Provider card ───────────────────── */

function ProviderCard({ toolId, provider, onPromote, onEdit, onToggleStatus, onRemove }) {
  const tpl = providerTemplate(toolId, provider.provider);
  const tone = vendorTone(tpl?.vendor || provider.vendor);
  const isPrimary = provider.role === 'primary';
  const isDisabled = provider.status === 'disabled';

  return (
    <div
      className={`rounded-xl border bg-card overflow-hidden ${
        isPrimary ? 'border-primary/40 ring-1 ring-primary/20'
        : isDisabled ? 'border-border opacity-70' : 'border-border'
      }`}
    >
      <div className="px-4 py-3 flex items-start justify-between gap-3 flex-wrap">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="h-2 w-2 rounded-full shrink-0" style={{ background: tone.color }} />
            <span className="text-[13.5px] font-semibold text-foreground truncate">{provider.label}</span>
            <RolePill role={provider.role} status={provider.status} />
          </div>
          <div className="mt-1 text-[11.5px] text-muted-foreground font-mono truncate">
            {tpl?.label || provider.provider}
            {provider.regions && provider.regions.length > 0 && ` · ${provider.regions.join(', ')}`}
          </div>
        </div>
        <div className="flex items-center gap-1 shrink-0">
          {!isPrimary && !isDisabled && (
            <Button size="sm" variant="outline" className="h-8 text-[12px]" onClick={onPromote} title="Make primary">
              <ArrowUp className="h-3.5 w-3.5" /> Promote
            </Button>
          )}
          <Button size="sm" variant="outline" className="h-8 text-[12px]" onClick={onEdit}>
            <Pencil className="h-3.5 w-3.5" /> Edit
          </Button>
          <Button size="sm" variant="outline" className="h-8 text-[12px]" onClick={onToggleStatus} title={isDisabled ? 'Enable' : 'Disable'}>
            <Power className="h-3.5 w-3.5" /> {isDisabled ? 'Enable' : 'Disable'}
          </Button>
          <Button size="sm" variant="outline" className="h-8 text-[12px] text-destructive border-destructive/40 hover:bg-destructive/10 hover:text-destructive" onClick={onRemove}>
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>

      <div className="border-t border-border px-4 py-3 grid grid-cols-2 sm:grid-cols-4 gap-3 bg-muted/20">
        <Field label="Calls · 7d" value={(provider.usage7d?.calls || 0).toLocaleString()} />
        <Field label="Error rate" value={`${((provider.usage7d?.errorRate || 0) * 100).toFixed(2)}%`}
               tone={(provider.usage7d?.errorRate || 0) > 0.05 ? 'bad' : 'default'} />
        <Field label="p50" value={provider.usage7d?.p50LatencyMs ? `${provider.usage7d.p50LatencyMs} ms` : '—'} />
        <Field label="Cost / call" value={`$${(provider.costPerCallUsd || 0).toFixed(3)}`} />
      </div>

      {/* Credential refs (read-only) */}
      <div className="border-t border-border px-4 py-3">
        <div className="text-[11px] font-medium text-muted-foreground mb-1.5 flex items-center gap-1.5">
          <KeyRound className="h-3 w-3" /> Credentials
        </div>
        <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-1.5 text-[11.5px]">
          {Object.entries(provider.credentials || {}).map(([k, v]) => (
            <div key={k} className="flex items-baseline gap-2 min-w-0">
              <dt className="text-muted-foreground shrink-0">{labelFor(k)}</dt>
              <dd className="font-mono text-foreground truncate" title={v}>{v}</dd>
            </div>
          ))}
        </dl>
      </div>

      {/* Options */}
      {provider.options && Object.keys(provider.options).length > 0 && (
        <div className="border-t border-border px-4 py-3">
          <div className="text-[11px] font-medium text-muted-foreground mb-1.5">Options</div>
          <div className="flex flex-wrap gap-1.5">
            {Object.entries(provider.options).map(([k, v]) => (
              <span key={k} className="inline-flex items-center px-1.5 py-0.5 rounded border border-border bg-muted/40 text-[10.5px] font-mono">
                {k}=<span className="text-foreground">{String(v)}</span>
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function RolePill({ role, status }) {
  if (status === 'disabled') {
    return (
      <span className="inline-flex items-center px-1.5 py-0.5 rounded border border-border bg-muted text-[10px] font-medium text-muted-foreground">
        Disabled
      </span>
    );
  }
  if (role === 'primary') {
    return (
      <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded border border-primary/40 bg-primary/10 text-primary text-[10px] font-medium">
        <span className="h-1 w-1 rounded-full bg-primary" />
        Primary
      </span>
    );
  }
  return (
    <span className="inline-flex items-center px-1.5 py-0.5 rounded border border-(--brand-teal)/30 bg-(--brand-teal)/10 text-brand-teal text-[10px] font-medium">
      Fallback
    </span>
  );
}

function labelFor(key) {
  const map = {
    apiKeyRef: 'API key',
    foundryResourceId: 'Foundry resource',
    endpoint: 'Endpoint',
    cx: 'Search engine ID',
  };
  return map[key] || key;
}

/* ───────────────────── Routing card ───────────────────── */

function RoutingCard({ tool, onChangeStrategy, onToggleTrigger, onChangeTimeout, onChangeRetries }) {
  const r = tool.routing || {};
  const strategy = r.strategy || 'primary-fallback';
  const triggers = r.fallbackTriggers || [];
  const showTriggers = strategy === 'primary-fallback';

  return (
    <div className="rounded-xl border border-border bg-card p-4">
      {/* Strategy radio group */}
      <div className="text-[11.5px] font-medium text-muted-foreground mb-2">Strategy</div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        {ROUTING_STRATEGIES.map(s => {
          const active = s.id === strategy;
          return (
            <button
              key={s.id}
              type="button"
              onClick={() => onChangeStrategy(s.id)}
              className={`text-left p-3 rounded-lg border transition-colors ${
                active
                  ? 'border-primary/40 bg-primary/5'
                  : 'border-border bg-muted/20 hover:bg-muted/40'
              }`}
            >
              <div className="flex items-center gap-2">
                <span className={`h-3 w-3 rounded-full border-2 ${active ? 'border-primary bg-primary' : 'border-input bg-transparent'}`} />
                <span className={`text-[12.5px] font-medium ${active ? 'text-primary' : 'text-foreground'}`}>{s.label}</span>
              </div>
              <p className="mt-1 ml-5 text-[11.5px] text-muted-foreground leading-relaxed">{s.blurb}</p>
            </button>
          );
        })}
      </div>

      {/* Fallback triggers — only relevant for primary-fallback */}
      {showTriggers && (
        <>
          <div className="mt-4 pt-4 border-t border-border">
            <div className="text-[11.5px] font-medium text-muted-foreground mb-2">
              Fall back when…
            </div>
            <div className="flex flex-wrap gap-2">
              {FALLBACK_TRIGGERS.map(t => {
                const on = triggers.includes(t.id);
                return (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => onToggleTrigger(t.id)}
                    title={t.blurb}
                    className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md border text-[11.5px] font-medium transition-colors ${
                      on
                        ? 'border-primary/40 bg-primary/10 text-primary'
                        : 'border-border bg-muted/30 text-muted-foreground hover:text-foreground'
                    }`}
                  >
                    <span className={`h-3 w-3 rounded-[3px] border ${on ? 'border-primary bg-primary' : 'border-input'} flex items-center justify-center`}>
                      {on && <span className="text-primary-foreground text-[8px] leading-none">✓</span>}
                    </span>
                    {t.label}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="mt-4 pt-4 border-t border-border grid grid-cols-1 sm:grid-cols-2 gap-3">
            <NumberField
              label="Timeout threshold"
              value={r.timeoutMs || 800}
              onChange={onChangeTimeout}
              suffix="ms"
              min={100}
              max={30000}
              step={100}
            />
            <NumberField
              label="Retry budget"
              value={r.retryBudget ?? 2}
              onChange={onChangeRetries}
              suffix="retries"
              min={0}
              max={10}
              step={1}
            />
          </div>
        </>
      )}
    </div>
  );
}

function NumberField({ label, value, onChange, suffix, min, max, step }) {
  return (
    <label className="block">
      <div className="text-[11px] font-medium text-muted-foreground mb-1">{label}</div>
      <div className="flex items-center gap-2">
        <input
          type="number"
          value={value}
          min={min}
          max={max}
          step={step}
          onChange={(e) => onChange(Number(e.target.value))}
          className="flex-1 bg-hero-bg border border-border rounded-md px-2.5 py-1.5 text-[12.5px] tabular-nums focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/15"
        />
        {suffix && <span className="text-[11px] text-muted-foreground font-mono">{suffix}</span>}
      </div>
    </label>
  );
}

/* ───────────────────── Identity card ───────────────────── */

function IdentityCard({ tool }) {
  return (
    <div className="rounded-xl border border-border bg-card overflow-hidden">
      <dl className="divide-y divide-border">
        <Row label="Owner"     value={<span className="font-mono">{tool.owner}</span>} />
        <Row label="Team"      value={tool.team} />
        <Row label="Origin"    value={tool.origin} mono />
        {tool.vendor &&        <Row label="Vendor"    value={tool.vendor} />}
        {tool.mcpServerId &&   <Row label="MCP server" value={tool.mcpServerName || tool.mcpServerId} mono />}
        <Row label="Scopes"    value={
          tool.scopes && tool.scopes.length > 0
            ? <div className="flex flex-wrap gap-1">
                {tool.scopes.map(s => (
                  <span key={s} className="inline-flex items-center px-1.5 py-0.5 rounded border border-border bg-muted/40 text-[10.5px] font-mono">{s}</span>
                ))}
              </div>
            : '—'
        } />
        <Row label="Version"   value={`v${tool.version}`} mono />
        <Row label="Created"   value={tool.createdAt ? new Date(tool.createdAt).toLocaleDateString() : '—'} />
        <Row label="Updated"   value={tool.updatedAt ? new Date(tool.updatedAt).toLocaleDateString() : '—'} />
      </dl>
    </div>
  );
}

function Row({ label, value, mono }) {
  return (
    <div className="grid grid-cols-[140px_1fr] gap-3 px-4 py-2.5">
      <dt className="text-[12px] text-muted-foreground">{label}</dt>
      <dd className={`text-[12.5px] text-foreground break-all ${mono ? 'font-mono' : ''}`}>{value}</dd>
    </div>
  );
}

/* ───────────────────── Section + Field helpers ───────────────────── */

function Section({ title, subtitle, action, children }) {
  return (
    <section>
      <div className="mb-3 flex items-end justify-between gap-3 flex-wrap">
        <div>
          <h3 className="text-[14px] font-semibold text-foreground">{title}</h3>
          {subtitle && <p className="mt-0.5 text-[12px] text-muted-foreground max-w-200">{subtitle}</p>}
        </div>
        {action}
      </div>
      {children}
    </section>
  );
}

function Field({ label, value, tone = 'default' }) {
  const color = tone === 'bad' ? 'text-destructive' : 'text-foreground';
  return (
    <div>
      <div className="text-[10.5px] font-medium text-muted-foreground">{label}</div>
      <div className={`mt-0.5 text-[13px] font-mono tabular-nums ${color}`}>{value}</div>
    </div>
  );
}
