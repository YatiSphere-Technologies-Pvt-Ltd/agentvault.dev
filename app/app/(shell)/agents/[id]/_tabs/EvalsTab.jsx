'use client';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Slider } from '@/components/ui/slider';
import { Switch } from '@/components/ui/switch';
import { FlaskConical, Gauge, Play } from 'lucide-react';
import { FieldRow, Section } from './_shared';

export default function EvalsTab({ agent, patch }) {
  const e = agent.evals;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-[1fr_340px] gap-5">
      <div className="space-y-5">
        <Section
          title="Test suites"
          description="Fixed datasets of input → expected output. Runs produce a score."
          action={<Button size="sm" variant="outline"><FlaskConical className="h-3.5 w-3.5" /> New suite</Button>}
        >
          <ul className="divide-y divide-border border border-border rounded-lg overflow-hidden">
            {e.suites.map(s => (
              <li key={s.id} className="grid grid-cols-[1fr_auto_auto_auto] gap-4 items-center p-3">
                <div className="min-w-0">
                  <div className="text-[13px] font-medium">{s.name}</div>
                  <div className="text-[10.5px] font-mono text-muted-foreground">{s.cases} cases · last run {new Date(s.lastRunAt).toLocaleString()}</div>
                </div>
                <Badge variant="outline" className="text-[10.5px] font-mono">{Math.round(s.lastScore * 100)}%</Badge>
                <div className="w-40 h-1.5 rounded-full bg-muted overflow-hidden">
                  <div className="h-full bg-brand-teal" style={{ width: `${s.lastScore * 100}%` }} />
                </div>
                <Button size="sm" variant="ghost"><Play className="h-3.5 w-3.5" /> Run</Button>
              </li>
            ))}
          </ul>
        </Section>

        <Section
          title="Judges"
          description="LLM-as-judge and rule-based evaluators stacked on every test case."
          action={<Button size="sm" variant="outline">Add judge</Button>}
        >
          <ul className="divide-y divide-border border border-border rounded-lg overflow-hidden">
            {e.judges.map(j => (
              <li key={j.id} className="grid grid-cols-[auto_1fr_auto] gap-3 items-center p-3">
                <Badge variant="outline" className="text-[9.5px]">{j.kind}</Badge>
                <div className="min-w-0">
                  {j.kind === 'llm-as-judge' ? (
                    <>
                      <div className="text-[12.5px] font-mono">{j.model}</div>
                      <div className="text-[11px] text-muted-foreground">{j.criteria}</div>
                    </>
                  ) : (
                    <>
                      <div className="text-[12.5px] font-medium">Rule</div>
                      <code className="text-[11.5px] font-mono text-muted-foreground">{j.rule}</code>
                    </>
                  )}
                </div>
                <Button size="sm" variant="ghost">Edit</Button>
              </li>
            ))}
          </ul>
        </Section>

        <Section title="Regression guard">
          <div className="flex items-center justify-between p-3 rounded-lg border border-border">
            <div>
              <div className="text-[13px] font-medium">Run evals on every version change</div>
              <div className="text-[11.5px] text-muted-foreground">Block promotion if any suite drops more than a threshold.</div>
            </div>
            <Switch checked={e.regressions.onVersionChange} onCheckedChange={v => patch('evals.regressions.onVersionChange', v)} />
          </div>
        </Section>

        <Section title="A/B test" description="Compare the current version against a challenger in production.">
          <div className="flex items-center justify-between p-3 rounded-lg border border-border">
            <div>
              <div className="text-[13px] font-medium">A/B active</div>
              <div className="text-[11.5px] text-muted-foreground">Split live traffic between versions.</div>
            </div>
            <Switch checked={e.ab.active} onCheckedChange={v => patch('evals.ab.active', v)} />
          </div>
          {e.ab.active && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FieldRow label="Challenger version">
                <Select value={e.ab.challengerVersion || ''} onValueChange={v => patch('evals.ab.challengerVersion', v)}>
                  <SelectTrigger><SelectValue placeholder="pick a version" /></SelectTrigger>
                  <SelectContent>
                    {agent.deploy.versions.map(v => (
                      <SelectItem key={v.version} value={v.version}>{v.version}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </FieldRow>
              <FieldRow label={`Split · ${Math.round(e.ab.split * 100)}% to challenger`}>
                <Slider min={0.05} max={0.5} step={0.05} value={[e.ab.split]} onValueChange={([v]) => patch('evals.ab.split', v)} />
              </FieldRow>
            </div>
          )}
        </Section>
      </div>

      <aside className="space-y-5">
        <Section title="Last regression run">
          <div className="space-y-2">
            <div className="flex items-baseline justify-between">
              <div className="text-[13px] font-medium">Overall</div>
              <Badge className="bg-(--brand-teal)/15 text-brand-teal border border-(--brand-teal)/35">PASS</Badge>
            </div>
            <div className="space-y-1.5 text-[12px]">
              <RegBar label="Smoke" score={0.92} />
              <RegBar label="Golden" score={0.87} />
              <RegBar label="Safety" score={0.99} />
            </div>
            <div className="pt-3 text-[11px] text-muted-foreground flex items-center gap-1.5">
              <Gauge className="h-3.5 w-3.5" /> Threshold: no suite drops more than 3%.
            </div>
          </div>
        </Section>
      </aside>
    </div>
  );
}

function RegBar({ label, score }) {
  return (
    <div>
      <div className="flex justify-between">
        <span className="text-muted-foreground">{label}</span>
        <span className="font-mono tabular-nums">{Math.round(score * 100)}%</span>
      </div>
      <div className="mt-1 h-1 rounded-full bg-muted overflow-hidden">
        <div className="h-full bg-brand-teal" style={{ width: `${score * 100}%` }} />
      </div>
    </div>
  );
}

