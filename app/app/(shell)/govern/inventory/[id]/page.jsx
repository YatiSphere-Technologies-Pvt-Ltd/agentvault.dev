'use client';

import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { useMemo } from 'react';
import { ArrowLeft, ShieldCheck, Ban, AlertTriangle, Activity, Users, Database, Gauge, Pencil, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { GovernHeader, RiskPill, ApprovalPill, AssetTypePill, DestinationPill, DecisionPill, fmtAgo, fmtNum, fmtKb } from '../../_shared';
import { useAssets, useEvents, useDlpRules, approveAsset, quarantineAsset, blockAsset, setRiskClass, removeAsset } from '../../_store';
import { RISK_CLASSES } from '../../_connectorCatalog';

export default function AssetDetailPage() {
  const { id } = useParams();
  const router = useRouter();
  const assets = useAssets();
  const events = useEvents();
  const asset = useMemo(() => assets.find(a => a.id === id) || null, [assets, id]);
  const assetEvents = useMemo(
    () => events.filter(e => e.asset_id === id).slice(0, 12),
    [events, id],
  );
  const allRules = useDlpRules();
  // Which DLP rules would fire on this asset? A rule "applies" when its
  // destination scope includes the asset's destination_class AND its asset
  // scope matches the asset's approval state.
  const applicableRules = useMemo(() => {
    if (!asset) return [];
    return allRules.filter(r => {
      if (r.enabled === false) return false;
      const dests = Array.isArray(r.scope_destinations) ? r.scope_destinations : [];
      if (dests.length > 0 && !dests.includes(asset.destination_class)) return false;
      if (r.scope_assets === 'unapproved') {
        return ['pending', 'unknown', 'quarantined'].includes(asset.approval_state);
      }
      if (r.scope_assets === 'quarantined') {
        return asset.approval_state === 'quarantined';
      }
      return true;
    });
  }, [allRules, asset]);

  if (!asset) {
    return (
      <>
        <GovernHeader title="AI Inventory" />
        <div className="max-w-[1680px] mx-auto px-4 sm:px-6 lg:px-8 py-7">
          <div className="rounded-lg border border-dashed border-border bg-card px-6 py-10 text-center">
            <div className="text-[13px] font-medium text-foreground">Asset not found</div>
            <Link href="/app/govern/inventory" className="mt-4 inline-block text-[12px] text-primary hover:underline">All assets →</Link>
          </div>
        </div>
      </>
    );
  }

  const decisionsByEvent = assetEvents.reduce((acc, e) => { acc[e.decision] = (acc[e.decision] || 0) + 1; return acc; }, {});

  return (
    <>
      <GovernHeader title="AI Inventory" />
      <div className="max-w-[1680px] mx-auto px-4 sm:px-6 lg:px-8 py-7 space-y-5">
        <Link href="/app/govern/inventory" className="text-[12px] text-muted-foreground hover:text-foreground inline-flex items-center gap-1.5">
          <ArrowLeft className="h-3.5 w-3.5" /> All assets
        </Link>

        {/* Header */}
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap mb-1">
              <code className="text-[10.5px] font-mono text-muted-foreground">{asset.id}</code>
              <ApprovalPill state={asset.approval_state} />
              <RiskPill risk={asset.risk_class} />
              <AssetTypePill type={asset.type} />
              <DestinationPill destination={asset.destination_class} />
            </div>
            <h2 className="text-[20px] font-semibold tracking-tight text-foreground leading-tight">{asset.name}</h2>
            <div className="mt-1 text-[12px] text-muted-foreground">
              {asset.vendor} · {asset.model_family || '—'} · discovered via <span className="font-mono">{asset.discovered_via}</span>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0 flex-wrap">
            <Button variant="outline" size="sm" render={
              <Link href={`/app/govern/inventory/${asset.id}/edit`}>
                <Pencil className="h-3.5 w-3.5" /> Edit
              </Link>
            } />
            <Button variant="outline" size="sm" onClick={() => approveAsset(asset.id)}>
              <ShieldCheck className="h-3.5 w-3.5" /> Approve
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => quarantineAsset(asset.id)}
              className="border-(--chart-3)/40 text-(--chart-3) hover:bg-(--chart-3)/10"
            >
              <AlertTriangle className="h-3.5 w-3.5" /> Quarantine
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => blockAsset(asset.id)}
              className="border-destructive/40 text-destructive hover:bg-destructive/10"
            >
              <Ban className="h-3.5 w-3.5" /> Block
            </Button>
            {asset.discovered_via === 'manual' && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  if (confirm(`Delete "${asset.name}" from inventory? This action cannot be undone.`)) {
                    removeAsset(asset.id);
                    router.push('/app/govern/inventory');
                  }
                }}
                className="border-destructive/40 text-destructive hover:bg-destructive/10"
              >
                <Trash2 className="h-3.5 w-3.5" /> Delete
              </Button>
            )}
          </div>
        </div>

        {/* Stat strip */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          <Stat label="Users · 7d"  value={fmtNum(asset.user_count_7d)}      icon={<Users className="h-3.5 w-3.5" />} />
          <Stat label="Events · 7d" value={fmtNum(asset.traffic_events_7d)}  icon={<Activity className="h-3.5 w-3.5" />} />
          <Stat label="First seen"  value={fmtAgo(asset.first_seen_at)}      icon={<Database className="h-3.5 w-3.5" />} />
          <Stat label="Last seen"   value={fmtAgo(asset.last_seen_at)} />
        </div>

        {/* Three-card body */}
        <div className="grid grid-cols-1 lg:grid-cols-[1.3fr_1fr] gap-5">
          <section className="space-y-5">
            <Card title="Recent events" hint={`${assetEvents.length} events tied to this asset`} link="/app/govern/discovery" linkLabel="Open feed">
              {assetEvents.length === 0 ? (
                <div className="text-[12px] text-muted-foreground italic">No discovery events for this asset yet.</div>
              ) : (
                <div className="-mx-4 divide-y divide-border/60">
                  {assetEvents.map(e => (
                    <div key={e.id} className="px-4 py-2.5">
                      <div className="flex items-center gap-2 flex-wrap mb-0.5">
                        <DecisionPill decision={e.decision} />
                        <span className="text-[10.5px] font-mono text-muted-foreground tabular-nums">{fmtAgo(e.ts)}</span>
                        <span className="text-[10.5px] font-mono text-foreground/85 truncate">{e.user}</span>
                        <span className="text-[10.5px] font-mono text-muted-foreground ml-auto">{fmtKb(e.size_kb)}</span>
                      </div>
                      <div className="text-[12px] text-foreground/85 truncate">{e.preview}</div>
                      {(e.categories || []).length > 0 && (
                        <div className="mt-1 flex items-center gap-1 flex-wrap">
                          {e.categories.map(c => (
                            <span key={c} className="text-[9.5px] font-mono px-1.5 py-0.5 rounded border border-border bg-muted/60 text-foreground">
                              {c}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </Card>

            <Card title="Data categories observed">
              {(asset.data_categories || []).length === 0 ? (
                <div className="text-[12px] text-muted-foreground italic">No sensitive categories detected in observed traffic.</div>
              ) : (
                <div className="flex flex-wrap gap-1.5">
                  {asset.data_categories.map(c => (
                    <span key={c} className="inline-flex items-center gap-1.5 text-[11px] font-mono px-2 py-1 rounded border border-border bg-muted/60 text-foreground">
                      <span className="h-1.5 w-1.5 rounded-full bg-(--chart-3) shrink-0" />
                      {c}
                    </span>
                  ))}
                </div>
              )}
            </Card>
          </section>

          <aside className="space-y-5">
            <Card title="Governance">
              <div className="space-y-2.5">
                <Field label="Risk class">
                  <select
                    value={asset.risk_class}
                    onChange={(e) => setRiskClass(asset.id, e.target.value)}
                    className="w-full px-2.5 py-1.5 bg-background border border-border rounded-md text-[12px] text-foreground"
                  >
                    {Object.entries(RISK_CLASSES).map(([id, m]) => (
                      <option key={id} value={id}>{m.label}</option>
                    ))}
                  </select>
                </Field>
                <Field label="Owner">
                  <div className="text-[12px] font-mono text-foreground/90 truncate">{asset.owner || '—'}</div>
                </Field>
                <Field label="Department">
                  <div className="text-[12px] font-mono text-foreground/90 truncate">{asset.department || '—'}</div>
                </Field>
                <Field label="Discovered via">
                  <div className="text-[12px] font-mono text-foreground/90 truncate">{asset.discovered_via}</div>
                </Field>
              </div>
            </Card>

            <Card title="Linked policies" hint="From the GRC suite. Bind more on the policy detail page.">
              {(asset.policy_refs || []).length === 0 ? (
                <div className="text-[12px] text-muted-foreground italic">No policies bound. Quarantine triggers default DLP policy.</div>
              ) : (
                <div className="flex flex-wrap gap-1.5">
                  {asset.policy_refs.map(p => (
                    <Link
                      key={p}
                      href={`/app/grc/policies?q=${encodeURIComponent(p)}`}
                      className="inline-flex items-center gap-1 px-2 py-0.5 rounded border border-border bg-muted/40 text-[10.5px] font-mono text-foreground hover:border-primary/40 hover:text-primary transition-colors"
                    >
                      {p}
                    </Link>
                  ))}
                </div>
              )}
            </Card>

            <Card title="DLP rules applied" hint="Enforced at the AI gateway for this asset.">
              {applicableRules.length === 0 ? (
                <div className="text-[12px] text-muted-foreground italic">No DLP rules in scope for this asset.</div>
              ) : (
                <div className="space-y-1.5">
                  {applicableRules.map(r => (
                    <Link
                      key={r.id}
                      href={`/app/govern/runtime/dlp/${r.id}`}
                      className="flex items-center gap-2 px-2.5 py-1.5 rounded border border-border bg-background hover:border-primary/40 hover:bg-primary/[0.03] transition-colors"
                    >
                      <Gauge className="h-3 w-3 text-primary shrink-0" />
                      <span className="text-[11.5px] font-medium text-foreground truncate flex-1">{r.name}</span>
                      <span className="text-[9.5px] font-mono uppercase tracking-[0.12em] text-muted-foreground shrink-0">{r.action}</span>
                    </Link>
                  ))}
                </div>
              )}
              <div className="mt-2.5 text-[10.5px] text-muted-foreground">
                Try a prompt → <Link href="/app/govern/runtime/inspector" className="text-primary hover:underline">Prompt Inspector</Link>
              </div>
            </Card>

            {asset.notes && (
              <Card title="Notes">
                <div className="text-[12px] text-muted-foreground leading-relaxed">{asset.notes}</div>
              </Card>
            )}
          </aside>
        </div>
      </div>
    </>
  );
}

function Card({ title, hint, link, linkLabel, children }) {
  return (
    <div className="rounded-xl border border-border bg-card overflow-hidden">
      <div className="px-4 py-2.5 border-b border-border flex items-baseline justify-between gap-3">
        <div className="flex items-baseline gap-3 min-w-0">
          <div className="text-[10.5px] uppercase tracking-[0.16em] font-mono text-muted-foreground">{title}</div>
          {hint && <div className="text-[10.5px] text-muted-foreground/80 truncate">{hint}</div>}
        </div>
        {link && (
          <Link href={link} className="text-[11.5px] text-primary hover:brightness-110 font-medium shrink-0">
            {linkLabel} →
          </Link>
        )}
      </div>
      <div className="px-4 py-3">{children}</div>
    </div>
  );
}

function Field({ label, children }) {
  return (
    <div>
      <div className="text-[10px] uppercase tracking-[0.14em] font-mono text-muted-foreground mb-1">{label}</div>
      {children}
    </div>
  );
}

function Stat({ label, value, sub, tone = 'default', icon }) {
  const color = tone === 'bad'  ? 'text-destructive'
              : tone === 'warn' ? 'text-(--chart-3)'
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
