'use client';

import { SettingsCard } from '../Fields';

const CONTROLS = [
  { label: 'Two-factor authentication',   status: 'Not enabled',     cta: 'Enable' },
  { label: 'SSO (SAML / OIDC)',           status: 'Not configured',  cta: 'Configure' },
  { label: 'SCIM provisioning',           status: 'Not configured',  cta: 'Configure' },
  { label: 'Audit log retention',         status: '90 days',         cta: 'Change' },
  { label: 'Session timeout',             status: '24 hours',        cta: 'Change' },
];

const AUDIT = [
  { when: '2m ago',  who: 'prashant@agentvault.io', action: 'signed in',             ip: '103.27.8.11'   },
  { when: '1h ago',  who: 'meera@agentvault.io',    action: 'created API key',       ip: '216.3.128.12'  },
  { when: '3h ago',  who: 'prashant@agentvault.io', action: 'updated policy file',   ip: '103.27.8.11'   },
  { when: '1d ago',  who: 'sam@agentvault.io',      action: 'invited teammate',      ip: '50.118.44.201' },
];

export default function SecuritySettingsPage() {
  return (
    <>
      <SettingsCard
        title="Authentication"
        desc="How people sign in and how long sessions last."
      >
        <ul className="divide-y divide-border border border-border rounded-lg overflow-hidden">
          {CONTROLS.map(c => (
            <li key={c.label} className="flex items-center justify-between px-4 py-3">
              <div>
                <div className="text-[12.5px] text-foreground">{c.label}</div>
                <div className="text-[11px] text-muted-foreground font-mono mt-0.5">{c.status}</div>
              </div>
              <button className="text-[11.5px] px-2.5 py-1 rounded-md border border-border hover:bg-muted">{c.cta}</button>
            </li>
          ))}
        </ul>
      </SettingsCard>

      <SettingsCard
        title="Recent audit log"
        desc="Actions taken by members of this workspace. 18-month retention."
      >
        <div className="-mx-6 -mb-6 border-t border-border overflow-x-auto">
          <table className="w-full min-w-160 text-[12.5px]">
            <thead className="bg-hero-bg border-b border-border">
              <tr className="text-[10px] uppercase tracking-[0.15em] text-muted-foreground font-mono">
                <th className="text-left px-6 py-2.5 font-medium">When</th>
                <th className="text-left px-4 py-2.5 font-medium">Who</th>
                <th className="text-left px-4 py-2.5 font-medium">Action</th>
                <th className="text-left px-6 py-2.5 font-medium">IP</th>
              </tr>
            </thead>
            <tbody>
              {AUDIT.map((a, i) => (
                <tr key={i} className="border-b border-border/60 last:border-none">
                  <td className="px-6 py-3 text-muted-foreground font-mono">{a.when}</td>
                  <td className="px-4 py-3 text-foreground font-mono">{a.who}</td>
                  <td className="px-4 py-3 text-muted-foreground">{a.action}</td>
                  <td className="px-6 py-3 text-muted-foreground font-mono">{a.ip}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </SettingsCard>
    </>
  );
}
