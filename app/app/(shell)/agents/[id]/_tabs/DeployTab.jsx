'use client';

import { useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { Switch } from '@/components/ui/switch';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { CornerUpLeft, Rocket } from 'lucide-react';
import { FieldRow, Section } from './_shared';

const ENVS = [
  { id: 'dev',     label: 'Development',  desc: 'Free-for-all. Your drafts live here.' },
  { id: 'staging', label: 'Staging',      desc: 'Pre-prod sandbox. Used by evals and QA.' },
  { id: 'prod',    label: 'Production',   desc: 'The one customers hit. Promotions require policy clearance.' },
];

export default function DeployTab({ agent, patch }) {
  const d = agent.deploy;
  const [target, setTarget] = useState('staging');

  const bumpVersion = () => {
    const [major, minor, patchN] = agent.version.current.split('.').map(n => parseInt(n) || 0);
    return `${major}.${minor}.${patchN + 1}`;
  };

  const promote = (env) => {
    const nextVersion = bumpVersion();
    const now = new Date().toISOString();
    // Add to versions + update env pointer + mark version status
    patch(current => ({
      ...current,
      version: {
        current: nextVersion,
        status: env === 'prod' ? 'published' : 'draft',
        changelog: [{ at: now, who: agent.owner, msg: `Promoted to ${env} as v${nextVersion}` }, ...agent.version.changelog],
      },
      deploy: {
        ...current.deploy,
        environments: {
          ...current.deploy.environments,
          [env]: { version: nextVersion, deployedAt: now, pinned: env === 'prod' },
        },
        versions: [{ version: nextVersion, createdAt: now, by: agent.owner, note: `Promote to ${env}` }, ...current.deploy.versions],
      },
    }));
  };

  const rollback = (env, version) => {
    const now = new Date().toISOString();
    patch(current => ({
      ...current,
      version: { ...current.version, current: version },
      deploy: {
        ...current.deploy,
        environments: {
          ...current.deploy.environments,
          [env]: { ...current.deploy.environments[env], version, deployedAt: now },
        },
      },
    }));
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-[1fr_340px] gap-5">
      <div className="space-y-5">
        <Section title="Environments" description="Promote code through environments. Pin versions so consumers don't move under them.">
          <ul className="divide-y divide-border border border-border rounded-lg overflow-hidden">
            {ENVS.map(e => {
              const env = d.environments[e.id];
              return (
                <li key={e.id} className="grid grid-cols-[1fr_auto_auto] gap-3 p-3 items-center">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-[13px] font-medium">{e.label}</span>
                      {env.pinned && <Badge variant="outline" className="text-[9.5px]">pinned</Badge>}
                      {e.id === 'prod' && env.version && <Badge className="bg-(--brand-teal)/15 text-brand-teal border border-(--brand-teal)/35">live</Badge>}
                    </div>
                    <div className="mt-0.5 text-[10.5px] text-muted-foreground font-mono">
                      {env.version ? `v${env.version}` : 'not deployed'}
                      {env.deployedAt && ` · ${new Date(env.deployedAt).toLocaleString()}`}
                    </div>
                    <div className="text-[11.5px] text-muted-foreground mt-0.5">{e.desc}</div>
                  </div>
                  <Button variant="outline" size="sm" onClick={() => setTarget(e.id)}>
                    Pick as target
                  </Button>
                  <AlertDialog>
                    <AlertDialogTrigger render={<Button size="sm" variant={e.id === 'prod' ? 'default' : 'outline'}> <Rocket className="h-3.5 w-3.5" /> Promote </Button>} />
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Promote to {e.label}?</AlertDialogTitle>
                        <AlertDialogDescription>
                          This creates a new version <span className="font-mono">v{bumpVersion()}</span> and points the {e.label.toLowerCase()} environment at it.
                          {e.id === 'prod' && ' Regression evals must pass; this is tracked in the audit log.'}
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={() => promote(e.id)}>
                          <Rocket className="h-3.5 w-3.5" /> Promote
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </li>
              );
            })}
          </ul>
        </Section>

        <Section title="Canary rollout" description="Route a % of prod traffic to the latest version before full cutover.">
          <div className="flex items-center justify-between p-3 rounded-lg border border-border">
            <div>
              <div className="text-[13px] font-medium">Canary active</div>
              <div className="text-[11.5px] text-muted-foreground">If on, new deploys get a slice of traffic first.</div>
            </div>
            <Switch checked={d.canary.enabled} onCheckedChange={v => patch('deploy.canary.enabled', v)} />
          </div>
          {d.canary.enabled && (
            <FieldRow label={`Canary percent · ${d.canary.percent}%`}>
              <Slider min={1} max={50} step={1} value={[d.canary.percent]} onValueChange={([v]) => patch('deploy.canary.percent', v)} />
            </FieldRow>
          )}
        </Section>

        <Section title="Versions" description="Every promotion creates a new immutable version. Roll back with one click.">
          <ul className="divide-y divide-border border border-border rounded-lg overflow-hidden">
            {d.versions.map(v => {
              const isCurrent = v.version === agent.version.current;
              return (
                <li key={v.version} className="grid grid-cols-[1fr_auto] gap-3 p-3 items-center">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-[13px] font-mono">v{v.version}</span>
                      {isCurrent && <Badge className="bg-primary/10 text-primary border border-primary/35">current</Badge>}
                    </div>
                    <div className="text-[10.5px] text-muted-foreground font-mono">
                      {new Date(v.createdAt).toLocaleString()} · {v.by}
                    </div>
                    <div className="text-[12px] text-muted-foreground mt-0.5">{v.note}</div>
                  </div>
                  {!isCurrent && (
                    <Button size="sm" variant="outline" onClick={() => rollback('prod', v.version)}>
                      <CornerUpLeft className="h-3.5 w-3.5" /> Roll back prod
                    </Button>
                  )}
                </li>
              );
            })}
          </ul>
        </Section>
      </div>

      <aside className="space-y-5">
        <Section title="Version pinning">
          <p className="text-[12px] text-muted-foreground">
            API consumers call <code className="font-mono">/v1/agents/{agent.id}?v=X</code> to pin a version. Without <code className="font-mono">v</code>, they get whatever <b className="text-foreground">prod</b> points at.
          </p>
        </Section>
        <Section title="Preview target">
          <div className="text-[13px] font-medium">{ENVS.find(e => e.id === target)?.label}</div>
          <div className="text-[11.5px] text-muted-foreground mt-1">
            Promote button on the {target} row deploys a new version to that environment.
          </div>
        </Section>
      </aside>
    </div>
  );
}
