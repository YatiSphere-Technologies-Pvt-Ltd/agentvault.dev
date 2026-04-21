'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';
import { useAuth } from '../../auth/AuthProvider';
import { useWorkspaces } from './_workspaceStore';
import WorkspaceSwitcher from './WorkspaceSwitcher';

const NAV = [
  { href: '/app',            label: 'Home',         icon: 'home' },
  { href: '/app/studio',     label: 'Agent Studio', icon: 'studio', badge: 'Beta' },
  { href: '/app/agents',     label: 'Agents',       icon: 'agent' },
  { href: '/app/knowledge',  label: 'Knowledge',    icon: 'knowledge' },
  { href: '/app/mcp',        label: 'MCP Servers',  icon: 'mcp' },
  { href: '/app/runs',       label: 'Runs',         icon: 'runs' },
  {
    href: '/app/settings',
    label: 'Settings',
    icon: 'settings',
    children: [
      { href: '/app/settings/profile',   label: 'Profile'   },
      { href: '/app/settings/workspace', label: 'Workspace' },
      { href: '/app/settings/team',      label: 'Team'      },
      { href: '/app/settings/billing',   label: 'Billing'   },
      { href: '/app/settings/security',  label: 'Security'  },
      { href: '/app/settings/api',       label: 'API keys'  },
    ],
  },
];

function Icon({ name, size = 16 }) {
  const p = { width: size, height: size, viewBox: '0 0 20 20', fill: 'none', stroke: 'currentColor', strokeWidth: 1.7, strokeLinecap: 'round', strokeLinejoin: 'round' };
  switch (name) {
    case 'home':     return <svg {...p}><path d="M3 10l7-6 7 6v8H3z"/><path d="M8 18v-5h4v5"/></svg>;
    case 'studio':   return <svg {...p}><circle cx="5" cy="5" r="2"/><circle cx="15" cy="5" r="2"/><circle cx="5" cy="15" r="2"/><circle cx="15" cy="15" r="2"/><path d="M7 5h6M5 7v6M15 7v6M7 15h6"/></svg>;
    case 'agent':    return <svg {...p}><circle cx="10" cy="8" r="3"/><path d="M4 17c1-3 3.5-4 6-4s5 1 6 4"/></svg>;
    case 'runs':     return <svg {...p}><path d="M5 10h10M12 6l4 4-4 4"/><circle cx="3" cy="10" r="0.5" fill="currentColor"/></svg>;
    case 'knowledge': return <svg {...p}><path d="M4 5h12v3H4zM4 10h12v3H4zM4 15h12"/></svg>;
    case 'mcp':       return <svg {...p}><circle cx="10" cy="10" r="2"/><circle cx="4" cy="6" r="1.5"/><circle cx="16" cy="6" r="1.5"/><circle cx="4" cy="14" r="1.5"/><circle cx="16" cy="14" r="1.5"/><path d="M5.3 6.8L8.7 9.2M14.7 6.8L11.3 9.2M5.3 13.2L8.7 10.8M14.7 13.2L11.3 10.8"/></svg>;
    case 'settings': return <svg {...p}><circle cx="10" cy="10" r="2.5"/><path d="M10 2v2M10 16v2M18 10h-2M4 10H2M15.7 4.3l-1.4 1.4M5.7 14.3l-1.4 1.4M15.7 15.7l-1.4-1.4M5.7 5.7L4.3 4.3"/></svg>;
    default:         return null;
  }
}

function NavGroup({ item, pathname }) {
  const inside = pathname.startsWith(item.href);
  // Auto-open when any child route is active; allow manual toggle otherwise.
  const [open, setOpen] = useState(inside);
  useEffect(() => { if (inside) setOpen(true); }, [inside]);

  const parentActive = inside; // highlight parent whenever we're anywhere inside

  return (
    <div>
      {/* Parent row — acts as a disclosure button. Still navigates on explicit click of the label area via Enter? Keep it as a button; the first click opens, second click on the highlighted parent does nothing useful. Simpler: button toggles, separate arrow icon for visual cue, and children carry navigation. */}
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        aria-expanded={open}
        className={`w-full flex items-center gap-2.5 px-2.5 py-2 rounded-md text-[13px] transition-colors ${
          parentActive
            ? 'bg-primary/10 text-primary font-medium'
            : 'text-foreground/80 hover:bg-muted hover:text-foreground'
        }`}
      >
        <Icon name={item.icon} />
        <span className="flex-1 text-left truncate">{item.label}</span>
        <svg
          width="10" height="10" viewBox="0 0 12 12" fill="currentColor"
          className={`text-muted-foreground transition-transform shrink-0 ${open ? 'rotate-90' : ''}`}
          aria-hidden
        >
          <path d="M4 2l5 4-5 4V2z"/>
        </svg>
      </button>

      {open && (
        <ul className="mt-0.5 ml-4 pl-3 border-l border-border/70 space-y-0.5">
          {item.children.map(c => {
            const active = pathname === c.href;
            return (
              <li key={c.href}>
                <Link
                  href={c.href}
                  className={`block px-2.5 py-1.5 rounded-md text-[12.5px] transition-colors ${
                    active
                      ? 'bg-primary/10 text-primary font-medium'
                      : 'text-muted-foreground hover:text-foreground hover:bg-muted'
                  }`}
                >
                  {c.label}
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

export default function AppSidebar({ collapsed, onToggle }) {
  const pathname = usePathname();
  const { user } = useAuth();
  const { list, current, currentId, switchTo, create, rename, remove } = useWorkspaces(user?.workspace);

  const isActive = (href) => href === '/app' ? pathname === '/app' : pathname.startsWith(href);

  if (collapsed) {
    return (
      <aside className="w-14 shrink-0 h-screen border-r border-border bg-panel flex flex-col items-center py-3 sticky top-0">
        <button onClick={onToggle} className="h-8 w-8 rounded flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted" title="Expand sidebar">
          <svg width="14" height="14" viewBox="0 0 12 12" fill="currentColor"><path d="M4 2l5 4-5 4V2z"/></svg>
        </button>
        <div className="mt-3 mb-1 h-px w-8 bg-border" />
        <nav className="flex-1 flex flex-col gap-1 items-center mt-2">
          {NAV.map(n => (
            <Link key={n.href} href={n.href} title={n.label}
              className={`h-9 w-9 rounded flex items-center justify-center transition-colors ${
                isActive(n.href) ? 'bg-primary/10 text-primary' : 'text-muted-foreground hover:text-foreground hover:bg-muted'
              }`}>
              <Icon name={n.icon} />
            </Link>
          ))}
        </nav>
      </aside>
    );
  }

  return (
    <aside className="w-60 shrink-0 h-screen border-r border-border bg-panel flex flex-col sticky top-0">
      {/* Brand + collapse */}
      <div className="px-4 py-4 border-b border-border flex items-center justify-between">
        <Link href="/app" className="flex items-center gap-2 text-foreground text-[15px] font-semibold tracking-tight">
          <svg width="20" height="20" viewBox="0 0 22 22" fill="none" aria-hidden>
            <rect x="1" y="1" width="20" height="20" stroke="var(--primary)" strokeWidth="1.5" />
            <rect x="5" y="5" width="12" height="12" stroke="var(--brand-teal)" strokeWidth="1" />
            <circle cx="11" cy="11" r="2.5" fill="var(--primary)" />
          </svg>
          <span>AgentVault</span>
        </Link>
        <button onClick={onToggle} className="h-7 w-7 rounded text-muted-foreground hover:text-foreground hover:bg-muted flex items-center justify-center" title="Collapse sidebar">
          <svg width="12" height="12" viewBox="0 0 12 12" fill="currentColor"><path d="M8 2L3 6l5 4V2z"/></svg>
        </button>
      </div>

      {/* Workspace chip — opens switcher dropdown */}
      <div className="px-3 pt-3 pb-2">
        <WorkspaceSwitcher
          list={list}
          currentId={currentId}
          onSwitch={switchTo}
          onCreate={create}
          onRename={rename}
          onRemove={remove}
        />
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto px-2 py-2 space-y-0.5">
        <div className="px-2 pt-2 pb-1 text-[10px] uppercase tracking-[0.2em] text-muted-foreground font-mono">Build</div>
        {NAV.map(n =>
          n.children ? (
            <NavGroup key={n.href} item={n} pathname={pathname} />
          ) : (
            <Link key={n.href} href={n.href}
              className={`flex items-center gap-2.5 px-2.5 py-2 rounded-md text-[13px] transition-colors ${
                isActive(n.href)
                  ? 'bg-primary/10 text-primary font-medium'
                  : 'text-foreground/80 hover:bg-muted hover:text-foreground'
              }`}>
              <Icon name={n.icon} />
              <span className="flex-1 truncate">{n.label}</span>
              {n.badge && (
                <span className="text-[9.5px] font-mono px-1.5 py-0.5 rounded border border-accent/40 text-accent bg-accent/10">
                  {n.badge}
                </span>
              )}
            </Link>
          )
        )}
      </nav>

      {/* Workspace status footer */}
      <div className="border-t border-border px-4 py-3">
        <div className="flex items-center justify-between text-[10.5px] font-mono text-muted-foreground">
          <span className="flex items-center gap-1.5">
            <span className="h-1.5 w-1.5 rounded-full bg-accent animate-pulse-dot" />
            <span className="truncate">{current?.name || user?.workspace || 'Workspace'}</span>
          </span>
          <span className="text-[10px] text-muted-foreground/80">v1</span>
        </div>
      </div>
    </aside>
  );
}
