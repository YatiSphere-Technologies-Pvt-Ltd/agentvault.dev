'use client';

import { SettingsCard } from '../Fields';

const KEYS = [
  { name: 'prod · netsuite-poster', key: 'av_live_•••• 8f3a', created: '2026-03-12', lastUsed: '2m ago',   scope: 'write:runs · read:workflows' },
  { name: 'ci · staging',           key: 'av_live_•••• 12de', created: '2026-02-28', lastUsed: '1h ago',   scope: 'read:*' },
  { name: 'legacy · airflow',       key: 'av_live_•••• 44aa', created: '2025-11-04', lastUsed: '31d ago',  scope: 'read:runs' },
];

export default function ApiKeysSettingsPage() {
  return (
    <>
      <SettingsCard
        title="API keys"
        desc="Programmatic access to your vault. Treat keys like passwords — rotate them regularly."
        footer={
          <div className="flex justify-end gap-2">
            <button className="text-[12.5px] px-3 py-1.5 rounded-md border border-border hover:bg-muted">Rotate all</button>
            <button className="text-[12.5px] px-3 py-1.5 rounded-md bg-primary text-primary-foreground hover:brightness-110 font-medium">New key</button>
          </div>
        }
      >
        <div className="border border-border rounded-lg overflow-x-auto">
          <table className="w-full min-w-200 text-[12.5px]">
            <thead className="bg-hero-bg border-b border-border">
              <tr className="text-[10px] uppercase tracking-[0.15em] text-muted-foreground font-mono">
                <th className="text-left  px-4 py-2.5 font-medium">Name</th>
                <th className="text-left  px-4 py-2.5 font-medium">Key</th>
                <th className="text-left  px-4 py-2.5 font-medium">Scope</th>
                <th className="text-left  px-4 py-2.5 font-medium">Created</th>
                <th className="text-left  px-4 py-2.5 font-medium">Last used</th>
                <th className="text-right px-4 py-2.5 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {KEYS.map(k => (
                <tr key={k.name} className="border-b border-border/60 last:border-none hover:bg-muted/40">
                  <td className="px-4 py-3 text-foreground">{k.name}</td>
                  <td className="px-4 py-3 font-mono text-muted-foreground">
                    <span className="text-accent">{k.key.split('••••')[0]}</span>••••{k.key.split('••••')[1]}
                  </td>
                  <td className="px-4 py-3 font-mono text-muted-foreground">{k.scope}</td>
                  <td className="px-4 py-3 font-mono text-muted-foreground">{k.created}</td>
                  <td className="px-4 py-3 font-mono text-muted-foreground">{k.lastUsed}</td>
                  <td className="px-4 py-3 text-right">
                    <button className="text-[11.5px] text-muted-foreground hover:text-foreground mr-2">Rotate</button>
                    <button className="text-[11.5px] text-destructive hover:brightness-110">Revoke</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </SettingsCard>

      <SettingsCard
        title="Webhooks"
        desc="Fire events from your workspace to your endpoints."
      >
        <div className="flex items-center justify-between p-4 border border-dashed border-border rounded-lg">
          <div className="text-[12.5px] text-muted-foreground">No webhooks configured.</div>
          <button className="text-[12.5px] px-3 py-1.5 rounded-md border border-border hover:bg-muted">Add webhook</button>
        </div>
      </SettingsCard>
    </>
  );
}
