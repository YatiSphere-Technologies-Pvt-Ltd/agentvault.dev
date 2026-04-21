'use client';

import { SettingsCard, TextInput } from '../Fields';

const MEMBERS = [
  { name: 'Prashant Singh',   email: 'prashant@agentvault.io', role: 'Owner',    invitedBy: '—',                  status: 'active' },
  { name: 'Meera Raman',      email: 'meera@agentvault.io',    role: 'Admin',    invitedBy: 'prashant@agentvault', status: 'active' },
  { name: 'Sam Kenji',        email: 'sam@agentvault.io',      role: 'Member',   invitedBy: 'meera@agentvault',    status: 'active' },
  { name: '—',                email: 'ops@contractor.io',      role: 'Viewer',   invitedBy: 'prashant@agentvault', status: 'pending' },
];

export default function TeamSettingsPage() {
  return (
    <>
      <SettingsCard
        title="Invite teammates"
        desc="Send an invite by email. New members join as Members by default."
      >
        <div className="flex flex-col md:flex-row gap-2">
          <TextInput placeholder="teammate@company.com" />
          <select
            className="md:w-32 px-3 py-2 bg-panel border border-border rounded-md text-[13px] text-foreground focus:outline-none focus:border-primary"
            defaultValue="Member"
          >
            <option>Owner</option>
            <option>Admin</option>
            <option>Member</option>
            <option>Viewer</option>
          </select>
          <button className="text-[12.5px] px-4 py-2 rounded-md bg-primary text-primary-foreground hover:brightness-110 font-medium whitespace-nowrap">
            Send invite
          </button>
        </div>
      </SettingsCard>

      <SettingsCard title="Members" desc={`${MEMBERS.length} people have access to this workspace.`}>
        <div className="-mx-6 -mb-6 border-t border-border overflow-x-auto">
          <table className="w-full min-w-160 text-[12.5px]">
            <thead className="bg-hero-bg border-b border-border">
              <tr className="text-[10px] uppercase tracking-[0.15em] text-muted-foreground font-mono">
                <th className="text-left  px-6 py-2.5 font-medium">Member</th>
                <th className="text-left  px-4 py-2.5 font-medium">Role</th>
                <th className="text-left  px-4 py-2.5 font-medium">Invited by</th>
                <th className="text-left  px-4 py-2.5 font-medium">Status</th>
                <th className="text-right px-6 py-2.5 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {MEMBERS.map(m => (
                <tr key={m.email} className="border-b border-border/60 last:border-none hover:bg-muted/40">
                  <td className="px-6 py-3">
                    <div className="text-foreground">{m.name}</div>
                    <div className="text-[10.5px] text-muted-foreground font-mono">{m.email}</div>
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">{m.role}</td>
                  <td className="px-4 py-3 text-muted-foreground font-mono">{m.invitedBy}</td>
                  <td className="px-4 py-3">
                    {m.status === 'active' ? (
                      <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded border border-accent/40 bg-accent/10 text-accent text-[10.5px] font-mono">
                        <span className="h-1.5 w-1.5 rounded-full bg-accent" /> active
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded border border-border bg-muted text-muted-foreground text-[10.5px] font-mono">
                        pending
                      </span>
                    )}
                  </td>
                  <td className="px-6 py-3 text-right">
                    <button className="text-[11.5px] text-muted-foreground hover:text-foreground">···</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </SettingsCard>
    </>
  );
}
