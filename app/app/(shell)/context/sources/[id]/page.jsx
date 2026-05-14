'use client';

import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { useMemo } from 'react';
import { ArrowLeft, RefreshCw, Trash2, Database, ShieldCheck, Activity, Clock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ContextHeader, FamilyPill, HealthPill, SourceIcon, fmtAgo, fmtMins, fmtNum } from '../../_shared';
import { useSources, useCorpora, simulateSync, removeSource, updateSource } from '../../_store';
import { sourceById } from '../../_sourceCatalog';

export default function SourceDetailPage() {
  const { id } = useParams();
  const router = useRouter();
  const sources = useSources();
  const corpora = useCorpora();
  const source = useMemo(() => sources.find(s => s.id === id) || null, [sources, id]);
  const usingCorpora = useMemo(
    () => corpora.filter(c => (c.source_ids || []).includes(id)),
    [corpora, id],
  );

  if (!source) {
    return (
      <>
        <ContextHeader />
        <div className="max-w-[1680px] mx-auto px-4 sm:px-6 lg:px-8 py-7">
          <div className="rounded-lg border border-dashed border-border bg-card px-6 py-10 text-center">
            <div className="text-[13px] font-medium text-foreground">Source not found</div>
            <div className="text-[12px] text-muted-foreground mt-1">It may have been removed.</div>
            <Link href="/app/context/sources" className="mt-4 inline-block text-[12px] text-primary hover:underline">All sources →</Link>
          </div>
        </div>
      </>
    );
  }

  const family = sourceById(source.kind)?.family;
  const breach = (source.freshness_lag_min ?? 0) > (source.freshness_target_min ?? Infinity);

  const onDelete = () => {
    if (!confirm(`Delete source "${source.name}"? Corpora bound to it will keep their reference but stop receiving data.`)) return;
    removeSource(source.id);
    router.push('/app/context/sources');
  };

  return (
    <>
      <ContextHeader />
      <div className="max-w-[1680px] mx-auto px-4 sm:px-6 lg:px-8 py-7 space-y-5">
        <Link href="/app/context/sources" className="text-[12px] text-muted-foreground hover:text-foreground inline-flex items-center gap-1.5">
          <ArrowLeft className="h-3.5 w-3.5" /> All sources
        </Link>

        {/* Header */}
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div className="flex items-start gap-3 min-w-0">
            <SourceIcon kind={source.kind} size={44} />
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap mb-1">
                <code className="text-[10.5px] font-mono text-muted-foreground">{source.id}</code>
                <HealthPill health={source.health} />
                {family && <FamilyPill family={family} />}
                <span className="text-[10.5px] font-mono text-muted-foreground">· {source.sync_mode}</span>
              </div>
              <h2 className="text-[20px] font-semibold tracking-tight text-foreground leading-tight">{source.name}</h2>
              {source.description && (
                <p className="mt-1 text-[12.5px] text-muted-foreground leading-relaxed max-w-[80ch]">{source.description}</p>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <Button variant="outline" size="sm" onClick={() => simulateSync(source.id)}>
              <RefreshCw className="h-3.5 w-3.5" /> Sync now
            </Button>
            <Button variant="outline" size="sm" onClick={onDelete} className="text-destructive border-destructive/40 hover:bg-destructive/10">
              <Trash2 className="h-3.5 w-3.5" /> Disconnect
            </Button>
          </div>
        </div>

        {/* Stat strip */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          <Stat label="Rows"        value={fmtNum(source.row_count)} sub={source.tables ? `${source.tables} tables` : undefined} icon={<Database className="h-3.5 w-3.5" />} />
          <Stat
            label="Freshness lag"
            value={fmtMins(source.freshness_lag_min)}
            sub={`target ${fmtMins(source.freshness_target_min)}`}
            tone={breach ? 'bad' : 'ok'}
            icon={<Clock className="h-3.5 w-3.5" />}
          />
          <Stat
            label="ACL strategy"
            value={(source.acl_strategy || '').toUpperCase()}
            sub="inherits at retrieval"
            icon={<ShieldCheck className="h-3.5 w-3.5" />}
          />
          <Stat
            label="Used by corpora"
            value={String(usingCorpora.length)}
            sub={usingCorpora.length === 0 ? 'unbound' : undefined}
          />
        </div>

        {/* Two-column body */}
        <div className="grid grid-cols-1 lg:grid-cols-[1.3fr_1fr] gap-5">
          <section className="space-y-5">
            <Card title="Connection">
              <KV pairs={[
                ['Kind', sourceById(source.kind)?.label || source.kind],
                ...Object.entries(source.auth || {}).map(([k, v]) => [k, String(v)]),
                ...Object.entries(source.props || {}).map(([k, v]) => [k, String(v)]),
              ]} />
            </Card>

            <Card title="Access control">
              <div className="space-y-2">
                <div className="text-[12.5px] text-foreground">
                  <span className="font-mono uppercase tracking-[0.1em] text-[10.5px] text-muted-foreground mr-2">strategy</span>
                  {source.acl_strategy}
                </div>
                <div className="text-[12.5px] text-muted-foreground leading-relaxed">{source.acl_detail}</div>
              </div>
            </Card>

            <Card title="Freshness">
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <span className="text-[10.5px] uppercase font-mono tracking-[0.1em] text-muted-foreground">SLA target</span>
                  <input
                    type="number"
                    value={source.freshness_target_min}
                    onChange={(e) => updateSource(source.id, { freshness_target_min: Number(e.target.value) || 0 })}
                    className="w-24 px-2 py-1 bg-background border border-border rounded text-[12px] font-mono"
                  />
                  <span className="text-[11px] text-muted-foreground">minutes</span>
                </div>
                <ProgressBar lag={source.freshness_lag_min} target={source.freshness_target_min} />
                <div className="flex items-center justify-between text-[11px] font-mono text-muted-foreground">
                  <span>Last sync {fmtAgo(source.last_sync_at)}</span>
                  <span>Lag <span className={breach ? 'text-destructive' : 'text-foreground'}>{fmtMins(source.freshness_lag_min)}</span></span>
                </div>
                {source.health_detail && (
                  <div className="text-[11.5px] text-destructive bg-destructive/[0.06] border border-destructive/30 rounded px-2 py-1.5">
                    {source.health_detail}
                  </div>
                )}
              </div>
            </Card>
          </section>

          <aside className="space-y-5">
            <Card title="Used by corpora" hint={usingCorpora.length === 0 ? 'Not yet bound' : 'These corpora pull from this source.'}>
              {usingCorpora.length === 0 ? (
                <div className="text-[12px] text-muted-foreground italic">No corpora are bound to this source.</div>
              ) : (
                <div className="space-y-1.5">
                  {usingCorpora.map(c => (
                    <Link
                      key={c.id}
                      href={`/app/context/corpora/${c.id}`}
                      className="flex items-center gap-2 px-2 py-1.5 rounded border border-border hover:border-primary/40 hover:bg-primary/[0.04] transition-colors"
                    >
                      <HealthPill health={c.health} />
                      <span className="text-[12px] text-foreground truncate flex-1">{c.name}</span>
                      <span className="text-[10.5px] font-mono text-muted-foreground">{fmtNum(c.chunk_count)} ch</span>
                    </Link>
                  ))}
                </div>
              )}
            </Card>

            <Card title="Activity" hint="Demo data. In production these come from the platform's ingestion logs.">
              <ul className="space-y-1 text-[11.5px] font-mono">
                <ActivityRow t={source.last_sync_at} kind="sync.success" body={`Synced ${fmtNum(source.row_count)} rows`} />
                <ActivityRow t={source.last_sync_at - 30 * 60_000} kind="acl.refresh" body={`Refreshed ACL grants for ${source.acl_strategy}`} />
                <ActivityRow t={source.created_at} kind="source.connected" body={`Connected by ${source.created_by || '—'}`} />
              </ul>
            </Card>
          </aside>
        </div>
      </div>
    </>
  );
}

/* ─────────── shared bits ─────────── */

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

function KV({ pairs }) {
  return (
    <dl className="divide-y divide-border/60 -mx-4">
      {pairs.map(([k, v]) => (
        <div key={k} className="grid grid-cols-[140px_1fr] gap-3 px-4 py-2">
          <dt className="text-[10.5px] uppercase tracking-[0.12em] font-mono text-muted-foreground">{k}</dt>
          <dd className="text-[12px] font-mono text-foreground break-all">{String(v)}</dd>
        </div>
      ))}
    </dl>
  );
}

function ProgressBar({ lag, target }) {
  const pct = Math.min(100, ((lag || 0) / Math.max(1, target || 1)) * 100);
  const tone = pct > 100 ? 'bg-destructive' : pct > 80 ? 'bg-primary' : 'bg-brand-teal';
  return (
    <div className="relative h-1.5 rounded-full bg-muted overflow-hidden">
      <div className={`absolute inset-y-0 left-0 rounded-full ${tone}`} style={{ width: `${Math.min(pct, 100)}%` }} />
    </div>
  );
}

function ActivityRow({ t, kind, body }) {
  return (
    <li className="flex items-baseline gap-2">
      <span className="text-muted-foreground tabular-nums w-16 shrink-0">{fmtAgo(t)}</span>
      <span className="uppercase text-[9.5px] tracking-[0.14em] text-muted-foreground w-28 shrink-0 truncate">{kind}</span>
      <span className="text-foreground">{body}</span>
    </li>
  );
}

function Stat({ label, value, sub, tone = 'default', icon }) {
  const color = tone === 'bad'  ? 'text-destructive'
              : tone === 'warn' ? 'text-primary'
              : tone === 'ok'   ? 'text-brand-teal'
              :                   'text-foreground';
  return (
    <div className="rounded-lg border border-border bg-card px-3 py-2">
      <div className="text-[10.5px] font-medium uppercase tracking-[0.1em] text-muted-foreground inline-flex items-center gap-1.5">
        {icon}
        {label}
      </div>
      <div className="mt-0.5 flex items-baseline gap-1.5">
        <div className={`text-[17px] font-semibold tabular-nums ${color} truncate`}>{value}</div>
        {sub && <div className="text-[10.5px] font-mono text-muted-foreground truncate">{sub}</div>}
      </div>
    </div>
  );
}
