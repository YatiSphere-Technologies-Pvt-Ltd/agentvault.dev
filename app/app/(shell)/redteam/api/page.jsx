'use client';

import { useState } from 'react';
import { Copy, Webhook, Code, Boxes, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { RedTeamHeader } from '../_shared';

/* API + SDK reference page.
   For the prototype these are copy-pasteable snippets, not a live
   endpoint. Demonstrates the integration story the PRD §5.14 describes. */

const ENDPOINTS = [
  { method: 'POST', path: '/v1/runs',                         desc: 'Launch a run against a target + suite' },
  { method: 'GET',  path: '/v1/runs/{id}',                    desc: 'Read run status + summary stats' },
  { method: 'GET',  path: '/v1/runs/{id}/findings',           desc: 'Stream findings as they\'re produced' },
  { method: 'GET',  path: '/v1/findings/{id}',                desc: 'Single finding with evidence + repro' },
  { method: 'POST', path: '/v1/findings/{id}/acknowledge',    desc: 'Accept risk with reason + expiry' },
  { method: 'GET',  path: '/v1/attacks',                      desc: 'List attack library (versioned)' },
  { method: 'GET',  path: '/v1/suites',                       desc: 'List named suites' },
  { method: 'POST', path: '/v1/probe-sets',                   desc: 'Create / bind suite to targets' },
  { method: 'GET',  path: '/v1/targets',                      desc: 'List registered targets' },
  { method: 'POST', path: '/v1/targets/{id}/consent',         desc: 'Update consent record' },
];

const WEBHOOKS = [
  { event: 'run.started',        desc: 'A run has begun against a target' },
  { event: 'run.completed',      desc: 'A run finished with stats + finding count' },
  { event: 'finding.created',    desc: 'A non-pass finding was recorded' },
  { event: 'regression.detected',desc: 'A previously-passing probe now bypasses' },
  { event: 'slo.breached',       desc: 'A run breached its configured SLO thresholds' },
];

const TS_SDK_INSTALL = `npm install @agentvault/redteam-sdk`;

const TS_SDK_EXAMPLE = `import { RedTeam } from '@agentvault/redteam-sdk';

const rt = new RedTeam({
  apiKey: process.env.AGENTVAULT_RT_KEY!,
  workspace: 'acme-corp',
});

// Launch the smoke suite against the support copilot
const run = await rt.runs.create({
  probeSetId: 'ps_smoke_support_copilot',
  targetId:   'tgt_support_copilot_staging',
  environment:'staging',
});

// Stream findings as they're produced
for await (const finding of rt.runs.streamFindings(run.id)) {
  if (finding.verdict === 'bypass' && finding.severity === 'critical') {
    console.error(\`CRITICAL BYPASS: \${finding.attack_id}\`);
    process.exit(1);  // fail the CI build
  }
}

// Or just block until done and check the summary
const summary = await rt.runs.wait(run.id);
if (summary.slo_breach) {
  throw new Error(\`SLO breach: \${summary.bypassed} bypasses\`);
}`;

const PYTHON_SDK_INSTALL = `pip install agentvault-redteam`;

const PYTHON_SDK_EXAMPLE = `from agentvault.redteam import RedTeam

rt = RedTeam(api_key=os.environ['AGENTVAULT_RT_KEY'])

run = rt.runs.create(
  probe_set_id='ps_smoke_support_copilot',
  target_id='tgt_support_copilot_staging',
)

for finding in rt.runs.stream_findings(run.id):
  if finding.verdict == 'bypass' and finding.severity == 'critical':
    raise SystemExit(f'CRITICAL BYPASS: {finding.attack_id}')`;

const CURL_EXAMPLE = `# Launch a run
curl -X POST https://api.agentvault.dev/redteam/v1/runs \\
  -H "Authorization: Bearer $AGENTVAULT_RT_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{
    "probe_set_id": "ps_smoke_support_copilot",
    "target_id":    "tgt_support_copilot_staging",
    "environment":  "staging"
  }'`;

const GHA_EXAMPLE = `# .github/workflows/redteam.yml
name: Red Team
on:
  push:
    branches: [main]

jobs:
  redteam:
    runs-on: ubuntu-latest
    steps:
      - uses: agentvault/redteam-action@v1
        with:
          api-key: \${{ secrets.AGENTVAULT_RT_KEY }}
          probe-set: ps_smoke_support_copilot
          target:    tgt_support_copilot_staging
          fail-on:   critical   # any critical bypass fails the build`;

export default function ApiDocsPage() {
  return (
    <>
      <RedTeamHeader
        title="API + SDK"
        subtitle="Drive red-team runs from CI. The TypeScript and Python SDKs wrap the same REST surface; webhooks notify on run lifecycle and regressions."
      />
      <div className="max-w-[1680px] mx-auto px-4 sm:px-6 lg:px-8 py-7 space-y-5">
        <div>
          <div className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground font-mono">Developer</div>
          <h2 className="text-[16px] font-semibold text-foreground mt-0.5 inline-flex items-center gap-2">
            <Code className="h-4 w-4 text-destructive" /> API + SDK reference
          </h2>
          <p className="text-[12.5px] text-muted-foreground mt-0.5 max-w-[80ch]">
            Drive red-team runs from CI. The TypeScript and Python SDKs wrap the same REST surface;
            webhooks notify on run lifecycle and regressions.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
          <Snippet title="TypeScript SDK · install" lang="bash" code={TS_SDK_INSTALL} />
          <Snippet title="Python SDK · install" lang="bash" code={PYTHON_SDK_INSTALL} />
        </div>

        <Snippet title="TypeScript · launch + fail CI on critical bypass" lang="typescript" code={TS_SDK_EXAMPLE} />
        <Snippet title="Python · same flow" lang="python" code={PYTHON_SDK_EXAMPLE} />
        <Snippet title="curl · raw REST" lang="bash" code={CURL_EXAMPLE} />
        <Snippet title="GitHub Action" lang="yaml" code={GHA_EXAMPLE} />

        <div className="rounded-xl border border-border bg-card overflow-hidden">
          <div className="px-4 py-2.5 border-b border-border flex items-center gap-2">
            <Boxes className="h-3.5 w-3.5 text-primary" />
            <span className="text-[10.5px] uppercase tracking-[0.16em] font-mono text-muted-foreground">REST endpoints</span>
          </div>
          <table className="w-full text-[12px]">
            <thead className="bg-muted/40">
              <tr>
                <th className="text-left px-4 py-2 text-[10px] uppercase tracking-[0.12em] font-mono text-muted-foreground w-20">Method</th>
                <th className="text-left px-4 py-2 text-[10px] uppercase tracking-[0.12em] font-mono text-muted-foreground">Path</th>
                <th className="text-left px-4 py-2 text-[10px] uppercase tracking-[0.12em] font-mono text-muted-foreground">Purpose</th>
              </tr>
            </thead>
            <tbody>
              {ENDPOINTS.map(e => (
                <tr key={e.method + e.path} className="border-t border-border/60">
                  <td className="px-4 py-1.5">
                    <span className={`text-[10px] font-mono uppercase tracking-[0.12em] px-1.5 py-0.5 rounded border ${
                      e.method === 'GET' ? 'border-primary/40 bg-primary/10 text-primary' :
                      e.method === 'POST' ? 'border-(--brand-teal)/40 bg-(--brand-teal)/10 text-brand-teal' :
                      'border-border bg-muted/40'
                    }`}>{e.method}</span>
                  </td>
                  <td className="px-4 py-1.5"><code className="font-mono text-foreground">{e.path}</code></td>
                  <td className="px-4 py-1.5 text-muted-foreground">{e.desc}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="rounded-xl border border-border bg-card overflow-hidden">
          <div className="px-4 py-2.5 border-b border-border flex items-center gap-2">
            <Webhook className="h-3.5 w-3.5 text-primary" />
            <span className="text-[10.5px] uppercase tracking-[0.16em] font-mono text-muted-foreground">Webhooks</span>
            <span className="text-[10.5px] text-muted-foreground/80">subscribe in workspace settings</span>
          </div>
          <table className="w-full text-[12px]">
            <thead className="bg-muted/40">
              <tr>
                <th className="text-left px-4 py-2 text-[10px] uppercase tracking-[0.12em] font-mono text-muted-foreground w-56">Event</th>
                <th className="text-left px-4 py-2 text-[10px] uppercase tracking-[0.12em] font-mono text-muted-foreground">Description</th>
              </tr>
            </thead>
            <tbody>
              {WEBHOOKS.map(w => (
                <tr key={w.event} className="border-t border-border/60">
                  <td className="px-4 py-1.5"><code className="font-mono text-foreground">{w.event}</code></td>
                  <td className="px-4 py-1.5 text-muted-foreground">{w.desc}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="rounded-xl border border-primary/30 bg-primary/[0.04] px-4 py-3 flex items-start gap-3">
          <Sparkles className="h-4 w-4 text-primary mt-0.5 shrink-0" />
          <div className="text-[12px] text-foreground/85 leading-relaxed">
            <div className="font-medium text-foreground mb-0.5">Want it live?</div>
            <span className="text-muted-foreground">
              The REST + SDK surfaces above are illustrative for the prototype. In production they’re backed by
              the same orchestrator that runs scheduled and on-deploy probes. Talk to your AgentVault account team
              to enable the API in your workspace.
            </span>
          </div>
        </div>
      </div>
    </>
  );
}

function Snippet({ title, lang, code }) {
  const [copied, setCopied] = useState(false);
  const onCopy = () => {
    try {
      navigator.clipboard?.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {}
  };
  return (
    <div className="rounded-xl border border-border bg-card overflow-hidden">
      <div className="px-4 py-2 border-b border-border bg-muted/40 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-[10.5px] uppercase tracking-[0.16em] font-mono text-muted-foreground">{title}</span>
          <span className="text-[10px] font-mono text-muted-foreground/80">· {lang}</span>
        </div>
        <button onClick={onCopy} className="inline-flex items-center gap-1 text-[11px] text-muted-foreground hover:text-foreground">
          <Copy className="h-3 w-3" /> {copied ? 'copied' : 'copy'}
        </button>
      </div>
      <pre className="px-4 py-3 text-[11.5px] font-mono text-foreground/90 leading-relaxed overflow-x-auto whitespace-pre">{code}</pre>
    </div>
  );
}
