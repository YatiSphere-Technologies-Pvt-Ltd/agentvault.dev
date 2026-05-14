'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { Gauge, Sparkles, Copy, ChevronRight, Cloud, Boxes, Network, Anchor } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { GovernHeader, RuntimeSubNav, DecisionPill, fmtAgo, fmtKb } from '../../_shared';
import { useGatewayConfig, useDlpRules, useEvents, updateGatewayConfig, compileGatewayBundle, deployGateway } from '../../_store';

/* AI Gateway page.
   ─────────────────
   Three jobs:
     1. Edit gateway config (routing, fail-open, response inspection, banner)
     2. Show live traffic running through it (re-using the discovery feed)
     3. Show deploy instructions for 4 real targets so the buyer believes
        it's not vaporware

   The deploy snippets are concrete, copy-pasteable scaffolds for each
   target's actual integration model. */

const DEPLOY_TARGETS = [
  { id: 'cloudflare-worker', label: 'Cloudflare Worker', icon: Cloud,   blurb: 'Zero-server. Each Worker pop runs the policy bundle at egress.' },
  { id: 'helm',              label: 'Helm chart',          icon: Boxes,   blurb: 'Self-hosted on Kubernetes. Egress + sidecar mode supported.' },
  { id: 'envoy-filter',      label: 'Envoy WASM filter',   icon: Network, blurb: 'In-line at the service mesh. Lowest-latency option.' },
  { id: 'squid',             label: 'Squid proxy module',  icon: Anchor,  blurb: 'For legacy egress proxies. Drops in as an ICAP server.' },
];

export default function GatewayPage() {
  const gw = useGatewayConfig();
  const rules = useDlpRules();
  const events = useEvents();
  const [target, setTarget] = useState(gw.deployment_target || 'cloudflare-worker');

  const stats = useMemo(() => {
    const enabled = rules.filter(r => r.enabled !== false).length;
    const lastDeploy = gw.last_deployed_at;
    const lastCompile = gw.last_compiled_at;
    const pendingRedeploy = lastCompile && lastDeploy && lastCompile > lastDeploy;
    return { enabled, lastDeploy, lastCompile, pendingRedeploy };
  }, [rules, gw]);

  return (
    <>
      <GovernHeader />
      <RuntimeSubNav />

      <div className="max-w-[1680px] mx-auto px-4 sm:px-6 lg:px-8 py-7 space-y-5">
        {/* Header */}
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap mb-1">
              <code className="text-[10.5px] font-mono text-muted-foreground">{gw.id}</code>
              <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded border border-(--brand-teal)/40 bg-(--brand-teal)/10 text-brand-teal text-[10px] font-mono uppercase tracking-[0.12em]">
                <span className="h-1.5 w-1.5 rounded-full bg-brand-teal animate-pulse-dot" /> running
              </span>
              {stats.pendingRedeploy && (
                <span className="inline-flex items-center px-1.5 py-0.5 rounded border border-primary/40 bg-primary/10 text-primary text-[10px] font-mono uppercase tracking-[0.12em]">
                  pending redeploy
                </span>
              )}
            </div>
            <h2 className="text-[20px] font-semibold tracking-tight text-foreground leading-tight inline-flex items-center gap-2">
              <Gauge className="h-5 w-5 text-destructive" /> {gw.name}
            </h2>
            <p className="mt-1 text-[12.5px] text-muted-foreground max-w-[80ch]">
              Inspects all AI egress before it leaves the perimeter. Compiles DLP rules into a
              policy bundle that runs at the gateway target you've chosen.
            </p>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <Button size="sm" variant="outline" onClick={() => compileGatewayBundle()}>
              <Sparkles className="h-3.5 w-3.5" /> Compile
            </Button>
            <Button size="sm" onClick={() => deployGateway()} className="bg-destructive text-destructive-foreground hover:brightness-110">
              Redeploy
            </Button>
          </div>
        </div>

        {/* Stat strip */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          <Stat label="Active rules" value={String(stats.enabled)} icon={<Gauge className="h-3.5 w-3.5" />} />
          <Stat label="Bundle size"  value={`${gw.bundle_size_kb || 0} KB`} sub="policy bundle" />
          <Stat label="Last compiled" value={stats.lastCompile ? fmtAgo(stats.lastCompile) : '—'} />
          <Stat label="Last deployed" value={stats.lastDeploy ? fmtAgo(stats.lastDeploy) : '—'} tone={stats.pendingRedeploy ? 'warn' : 'ok'} />
        </div>

        {/* Two-column body */}
        <div className="grid grid-cols-1 lg:grid-cols-[1.2fr_1fr] gap-5">
          <section className="space-y-5">
            <Card title="Routing rules" hint="How AI traffic is classified at the gateway.">
              <ul className="space-y-1.5">
                {(gw.routing_rules || []).map(r => (
                  <li key={r.id} className="rounded-md border border-border bg-background px-3 py-2.5 flex items-center gap-3">
                    <code className="text-[10.5px] font-mono text-muted-foreground shrink-0">{r.id}</code>
                    <div className="text-[12px] font-mono text-foreground min-w-0 flex-1">
                      destination = <span className="text-primary">{r.match?.destination}</span>
                      <ChevronRight className="inline h-3 w-3 mx-1 text-muted-foreground" />
                      <span className="text-foreground/85">{r.action}</span>
                    </div>
                  </li>
                ))}
              </ul>
            </Card>

            <Card title="Behavior" hint="Edits compile into the next bundle.">
              <div className="space-y-3">
                <Toggle
                  label="Fail-open on outage"
                  desc="If the gateway is unreachable, allow traffic through (default: false)."
                  value={!!gw.fail_open}
                  onChange={(v) => updateGatewayConfig({ fail_open: v })}
                />
                <Toggle
                  label="Inspect responses too"
                  desc="Scan model responses for system-prompt leakage and unsafe content."
                  value={!!gw.inspect_response}
                  onChange={(v) => updateGatewayConfig({ inspect_response: v })}
                />
                <div>
                  <Lbl>Block banner</Lbl>
                  <textarea
                    rows={2}
                    value={gw.block_banner || ''}
                    onChange={(e) => updateGatewayConfig({ block_banner: e.target.value })}
                    placeholder="What users see when their prompt is blocked."
                    className="w-full px-2.5 py-1.5 bg-background border border-border rounded-md text-[12.5px] text-foreground placeholder:text-muted-foreground/60 focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 resize-none"
                  />
                </div>
              </div>
            </Card>

            <Card title="Monitored egress hosts" hint="Public LLM endpoints classified as AI traffic.">
              <div className="flex flex-wrap gap-1">
                {(gw.egress_targets || []).map(t => (
                  <code key={t} className="text-[11px] font-mono text-foreground bg-muted/40 border border-border rounded px-1.5 py-0.5">{t}</code>
                ))}
              </div>
            </Card>
          </section>

          <aside className="space-y-5">
            <Card title="Live traffic" hint="Last 6 events seen at the gateway." link="/app/govern/discovery" linkLabel="Open feed">
              <ul className="space-y-1.5">
                {events.slice(0, 6).map(e => (
                  <li key={e.id} className="rounded-md border border-border bg-background px-3 py-2">
                    <div className="flex items-center gap-2 mb-0.5 text-[10.5px]">
                      <DecisionPill decision={e.decision} />
                      <span className="font-mono text-muted-foreground">{fmtAgo(e.ts)}</span>
                      <span className="font-mono text-foreground/85 truncate flex-1">{e.destination}</span>
                      <span className="font-mono text-muted-foreground">{fmtKb(e.size_kb)}</span>
                    </div>
                    <div className="text-[11.5px] text-foreground/85 truncate">{e.preview}</div>
                  </li>
                ))}
              </ul>
            </Card>

            <Card title="Deploy guide" hint="Pick a target — copy the snippet.">
              <div className="grid grid-cols-2 gap-1.5 mb-3">
                {DEPLOY_TARGETS.map(t => {
                  const on = target === t.id;
                  const Icon = t.icon;
                  return (
                    <button
                      key={t.id}
                      type="button"
                      onClick={() => {
                        setTarget(t.id);
                        updateGatewayConfig({ deployment_target: t.id });
                      }}
                      className={`text-left rounded-md border p-2.5 transition-colors flex items-start gap-2 ${
                        on ? 'border-primary/50 bg-primary/[0.05]' : 'border-border bg-background hover:border-primary/30'
                      }`}
                    >
                      <Icon className={`h-4 w-4 mt-0.5 shrink-0 ${on ? 'text-primary' : 'text-muted-foreground'}`} />
                      <div className="min-w-0">
                        <div className={`text-[12px] font-medium ${on ? 'text-primary' : 'text-foreground'}`}>{t.label}</div>
                        <div className="text-[10.5px] text-muted-foreground leading-snug line-clamp-2">{t.blurb}</div>
                      </div>
                    </button>
                  );
                })}
              </div>
              <DeploySnippet target={target} gw={gw} />
            </Card>
          </aside>
        </div>
      </div>
    </>
  );
}

/* ─── deploy snippets ─── */

function DeploySnippet({ target, gw }) {
  const snippet = useMemo(() => buildSnippet(target, gw), [target, gw]);
  const onCopy = () => { try { navigator.clipboard?.writeText(snippet); } catch {} };
  return (
    <div className="rounded-md border border-border bg-background overflow-hidden">
      <div className="px-3 py-1.5 border-b border-border bg-muted/40 flex items-center justify-between">
        <code className="text-[10.5px] font-mono text-muted-foreground">{snippet.split('\n')[0]?.replace(/^#\s*/, '') || target}</code>
        <button onClick={onCopy} className="inline-flex items-center gap-1 text-[11px] text-muted-foreground hover:text-foreground">
          <Copy className="h-3 w-3" /> copy
        </button>
      </div>
      <pre className="px-3 py-2.5 text-[11px] font-mono text-foreground/90 leading-relaxed overflow-x-auto whitespace-pre">
        {snippet}
      </pre>
    </div>
  );
}

function buildSnippet(target, gw) {
  const bundleUrl = 'https://gateway.agentvault.dev/v1/bundles/' + (gw.id || 'gw_default');
  const banner = (gw.block_banner || '').replace(/"/g, '\\"');
  switch (target) {
    case 'cloudflare-worker':
      return `# wrangler.toml
name = "agentvault-egress"
main = "src/index.ts"
compatibility_date = "2026-05-01"

[vars]
AGENTVAULT_GATEWAY_URL = "${bundleUrl}"
AGENTVAULT_FAIL_OPEN  = "${gw.fail_open ? 'true' : 'false'}"

# Bind to your egress route:
# wrangler deploy --route "*.openai.com/*" --route "*.anthropic.com/*"`;
    case 'helm':
      return `# values.yaml
agentvault:
  gateway:
    bundleUrl: ${bundleUrl}
    failOpen: ${gw.fail_open ? 'true' : 'false'}
    inspectResponse: ${gw.inspect_response ? 'true' : 'false'}
    mode: egress       # or "sidecar"
    blockBanner: "${banner}"

# Install:
# helm repo add agentvault https://charts.agentvault.dev
# helm install av-gateway agentvault/gateway -f values.yaml`;
    case 'envoy-filter':
      return `# Envoy WASM filter — drop in next to your gateway listener
http_filters:
- name: agentvault.dlp
  typed_config:
    "@type": type.googleapis.com/envoy.extensions.filters.http.wasm.v3.Wasm
    config:
      vm_config:
        runtime: envoy.wasm.runtime.v8
        code:
          remote:
            http_uri:
              uri: ${bundleUrl}.wasm
      configuration:
        fail_open: ${gw.fail_open ? 'true' : 'false'}`;
    case 'squid':
      return `# squid.conf
icap_enable on
icap_service agentvault_req reqmod_precache 0 ${bundleUrl}/icap
adaptation_access agentvault_req allow all
# Restart squid:
# squid -k reconfigure`;
    default:
      return '# unsupported target';
  }
}

/* ─── shared ─── */

function Card({ title, hint, link, linkLabel, children }) {
  return (
    <div className="rounded-xl border border-border bg-card overflow-hidden">
      <div className="px-4 py-2.5 border-b border-border flex items-baseline justify-between gap-3">
        <div className="flex items-baseline gap-3 min-w-0">
          <div className="text-[10.5px] uppercase tracking-[0.16em] font-mono text-muted-foreground">{title}</div>
          {hint && <div className="text-[10.5px] text-muted-foreground/80 truncate">{hint}</div>}
        </div>
        {link && (
          <Link href={link} className="text-[11.5px] text-primary hover:brightness-110 font-medium shrink-0 inline-flex items-center gap-1">
            {linkLabel} <ChevronRight className="h-3.5 w-3.5" />
          </Link>
        )}
      </div>
      <div className="px-4 py-3">{children}</div>
    </div>
  );
}

function Toggle({ label, desc, value, onChange }) {
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

function Lbl({ children }) {
  return <div className="text-[10px] uppercase tracking-[0.14em] font-mono text-muted-foreground mb-1">{children}</div>;
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
