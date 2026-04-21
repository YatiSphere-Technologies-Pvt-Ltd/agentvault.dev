'use client';

import { SettingsCard } from '../Fields';

const INVOICES = [
  { id: 'inv_2026_04', period: 'Apr 2026', amount: '$0.00',    status: 'trial', paidOn: '—' },
  { id: 'inv_2026_03', period: 'Mar 2026', amount: '$0.00',    status: 'trial', paidOn: '—' },
];

export default function BillingSettingsPage() {
  return (
    <>
      <SettingsCard
        title="Current plan"
        desc="You're on the free 14-day trial — 12 days left."
      >
        <div className="flex items-center justify-between gap-4 p-4 border border-border rounded-lg bg-hero-bg">
          <div>
            <div className="text-[13.5px] font-semibold text-foreground">Team plan</div>
            <div className="text-[11.5px] text-muted-foreground mt-0.5 font-mono">
              $149 / seat / month · billed annually · unlimited runs
            </div>
          </div>
          <button className="text-[12.5px] px-3 py-1.5 rounded-md bg-primary text-primary-foreground hover:brightness-110 font-medium">
            Upgrade
          </button>
        </div>
        <div className="mt-5 grid grid-cols-3 gap-4">
          {[
            ['Seats',       '3 / 5'],
            ['Monthly runs','2,412'],
            ['Spend · MTD', '$0.00'],
          ].map(([k, v]) => (
            <div key={k} className="border border-border rounded-lg p-3">
              <div className="text-[10px] uppercase tracking-[0.15em] font-mono text-muted-foreground">{k}</div>
              <div className="mt-1 text-[16px] font-semibold tabular-nums text-foreground">{v}</div>
            </div>
          ))}
        </div>
      </SettingsCard>

      <SettingsCard
        title="Payment method"
        desc="Add a card to avoid interruption when your trial ends."
      >
        <div className="flex items-center justify-between p-4 border border-dashed border-border rounded-lg">
          <div className="text-[12.5px] text-muted-foreground">No payment method on file.</div>
          <button className="text-[12.5px] px-3 py-1.5 rounded-md border border-border hover:bg-muted">Add card</button>
        </div>
      </SettingsCard>

      <SettingsCard
        title="Invoices"
        desc="Downloadable receipts for your records."
      >
        <div className="-mx-6 -mb-6 border-t border-border overflow-x-auto">
          <table className="w-full min-w-160 text-[12.5px]">
            <thead className="bg-hero-bg border-b border-border">
              <tr className="text-[10px] uppercase tracking-[0.15em] text-muted-foreground font-mono">
                <th className="text-left  px-6 py-2.5 font-medium">Invoice</th>
                <th className="text-left  px-4 py-2.5 font-medium">Period</th>
                <th className="text-right px-4 py-2.5 font-medium">Amount</th>
                <th className="text-left  px-4 py-2.5 font-medium">Status</th>
                <th className="text-right px-6 py-2.5 font-medium">Download</th>
              </tr>
            </thead>
            <tbody>
              {INVOICES.map(inv => (
                <tr key={inv.id} className="border-b border-border/60 last:border-none">
                  <td className="px-6 py-3 font-mono text-foreground">{inv.id}</td>
                  <td className="px-4 py-3 text-muted-foreground">{inv.period}</td>
                  <td className="px-4 py-3 text-right tabular-nums text-foreground font-mono">{inv.amount}</td>
                  <td className="px-4 py-3 text-muted-foreground">{inv.status}</td>
                  <td className="px-6 py-3 text-right">
                    <button className="text-[11.5px] text-primary hover:brightness-110">PDF</button>
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
