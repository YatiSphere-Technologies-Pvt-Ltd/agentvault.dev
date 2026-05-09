'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

const TABS = [
  { href: '/app/grc',            label: 'Overview'    },
  { href: '/app/grc/frameworks', label: 'Frameworks'  },
  { href: '/app/grc/controls',   label: 'Controls'    },
  { href: '/app/grc/policies',   label: 'Policies'    },
];

export default function GrcHeader() {
  const pathname = usePathname();
  const active = (href) =>
    href === '/app/grc' ? pathname === '/app/grc' : pathname.startsWith(href);

  return (
    <div className="border-b border-border bg-panel/40">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-10 pt-6 pb-0">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <div className="text-[10.5px] uppercase tracking-[0.2em] text-muted-foreground font-mono">
              Suite · GRC
            </div>
            <h1 className="mt-1 text-[22px] sm:text-[26px] font-semibold tracking-tight text-foreground">
              AgentVault GRC
            </h1>
            <p className="mt-1 text-[13px] text-muted-foreground max-w-150">
              Continuous AI governance — frameworks, controls, and policies that bind to every agent run.
            </p>
          </div>
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-md border border-accent/30 bg-accent/5 text-[10.5px] font-mono text-accent">
            <span className="h-1.5 w-1.5 rounded-full bg-accent animate-pulse-dot" />
            <span>Enforcement: live</span>
          </div>
        </div>

        <nav className="mt-5 -mb-px flex items-center gap-1 overflow-x-auto">
          {TABS.map(t => (
            <Link
              key={t.href}
              href={t.href}
              className={`px-3 py-2 text-[12.5px] border-b-2 transition-colors whitespace-nowrap ${
                active(t.href)
                  ? 'border-primary text-foreground font-medium'
                  : 'border-transparent text-muted-foreground hover:text-foreground'
              }`}
            >
              {t.label}
            </Link>
          ))}
        </nav>
      </div>
    </div>
  );
}
