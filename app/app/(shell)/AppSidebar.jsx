'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';
import { useAuth } from '../../auth/AuthProvider';
import { useWorkspaces } from './_workspaceStore';
import WorkspaceSwitcher from './WorkspaceSwitcher';
import { usePendingCount } from './approvals/_store';

/* The sidebar runs in three modes.

   - Build  — the builder surface: Studio, Agents, Knowledge, Tools, Vault,
              MCP, Runs, Approvals.
   - Govern — the control plane (Phase 1: discovery, AI inventory,
              connectors, exec dashboard).
   - Suites — productized verticals (GRC, Context Engine, etc).

   Mode is derived from the pathname; we also persist the user's last
   manual choice in localStorage so a tab click on /app/govern stays in
   Govern mode even if they navigate to a builder route briefly.

   Settings + Home are mode-agnostic and pinned at the top. */

const BUILD_NAV = [
  { href: '/app',            label: 'Home',         icon: 'home' },
  { href: '/app/studio',     label: 'Agent Studio', icon: 'studio', badge: 'Beta' },
  { href: '/app/agents',     label: 'Agents',       icon: 'agent' },
  { href: '/app/knowledge',  label: 'Knowledge',    icon: 'knowledge' },
  { href: '/app/tools',      label: 'Tools',        icon: 'tools' },
  { href: '/app/vault',      label: 'Vault',        icon: 'vault' },
  { href: '/app/mcp',        label: 'MCP Servers',  icon: 'mcp' },
  { href: '/app/runs',       label: 'Runs',         icon: 'runs' },
  { href: '/app/approvals',  label: 'Approvals',    icon: 'approvals' },
];

const GOVERN_NAV = [
  { href: '/app/govern',             label: 'Overview',     icon: 'eye' },
  { href: '/app/govern/discovery',   label: 'Discovery',    icon: 'activity' },
  { href: '/app/govern/inventory',   label: 'AI Inventory', icon: 'layers' },
  {
    href: '/app/govern/runtime',
    label: 'Runtime',
    icon: 'gauge',
    children: [
      { href: '/app/govern/runtime',           label: 'Overview' },
      { href: '/app/govern/runtime/dlp',       label: 'DLP rules' },
      { href: '/app/govern/runtime/inspector', label: 'Prompt inspector' },
      { href: '/app/govern/runtime/gateway',   label: 'AI gateway' },
    ],
  },
  { href: '/app/govern/connectors',  label: 'Connectors',   icon: 'cable' },
];

const SUITES_NAV = [
  { href: '/app/grc',     label: 'GRC Suite',      icon: 'grc',       enabled: true },
  { href: '/app/context', label: 'Context Engine', icon: 'context',   enabled: true  },
  { href: '/app/kyc',     label: 'KYC Intel',      icon: 'kyc',       enabled: false },
  { href: '/app/workforce', label: 'Workforce',    icon: 'workforce', enabled: false },
];

const SETTINGS = {
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
};

const MODES = [
  { id: 'build',  label: 'Build',  hint: 'Build agents, tools, knowledge.' },
  { id: 'govern', label: 'Govern', hint: 'Discover, govern, audit AI usage.' },
  { id: 'suites', label: 'Suites', hint: 'Productized vertical packs.' },
];

const MODE_KEY = 'agentvault.sidebar.mode';

function modeFromPath(pathname) {
  if (pathname.startsWith('/app/govern')) return 'govern';
  if (pathname.startsWith('/app/grc') ||
      pathname.startsWith('/app/context') ||
      pathname.startsWith('/app/kyc') ||
      pathname.startsWith('/app/workforce')) return 'suites';
  return 'build';
}

function Icon({ name, size = 16 }) {
  const p = { width: size, height: size, viewBox: '0 0 20 20', fill: 'none', stroke: 'currentColor', strokeWidth: 1.7, strokeLinecap: 'round', strokeLinejoin: 'round' };
  switch (name) {
    case 'home':     return <svg {...p}><path d="M3 10l7-6 7 6v8H3z"/><path d="M8 18v-5h4v5"/></svg>;
    case 'studio':   return <svg {...p}><circle cx="5" cy="5" r="2"/><circle cx="15" cy="5" r="2"/><circle cx="5" cy="15" r="2"/><circle cx="15" cy="15" r="2"/><path d="M7 5h6M5 7v6M15 7v6M7 15h6"/></svg>;
    case 'agent':    return <svg {...p}><circle cx="10" cy="8" r="3"/><path d="M4 17c1-3 3.5-4 6-4s5 1 6 4"/></svg>;
    case 'runs':     return <svg {...p}><path d="M5 10h10M12 6l4 4-4 4"/><circle cx="3" cy="10" r="0.5" fill="currentColor"/></svg>;
    case 'knowledge': return <svg {...p}><path d="M4 5h12v3H4zM4 10h12v3H4zM4 15h12"/></svg>;
    case 'tools':     return <svg {...p}><path d="M14.7 5.3a3 3 0 1 1 0 4.2l-1.5 1.5 4.5 4.5-1.4 1.4-4.5-4.5-1.5 1.5a3 3 0 1 1-4.2-4.2l1.5-1.5L4.4 6.4 5.8 5l3.5 3.5 1.5-1.5a3 3 0 0 1 4-1.7Z"/></svg>;
    case 'vault':     return <svg {...p}><rect x="3" y="4" width="14" height="13" rx="2"/><circle cx="10" cy="10" r="2.5"/><path d="M10 12.5v1.5M5 8h1M14 8h1"/></svg>;
    case 'mcp':       return <svg {...p}><circle cx="10" cy="10" r="2"/><circle cx="4" cy="6" r="1.5"/><circle cx="16" cy="6" r="1.5"/><circle cx="4" cy="14" r="1.5"/><circle cx="16" cy="14" r="1.5"/><path d="M5.3 6.8L8.7 9.2M14.7 6.8L11.3 9.2M5.3 13.2L8.7 10.8M14.7 13.2L11.3 10.8"/></svg>;
    case 'approvals': return <svg {...p}><path d="M3 5h14v8a2 2 0 0 1-2 2H7l-3 3v-3a2 2 0 0 1-1-2V5z"/><path d="M7.5 9.5l2 2 3-3"/></svg>;
    case 'settings': return <svg {...p}><circle cx="10" cy="10" r="2.5"/><path d="M10 2v2M10 16v2M18 10h-2M4 10H2M15.7 4.3l-1.4 1.4M5.7 14.3l-1.4 1.4M15.7 15.7l-1.4-1.4M5.7 5.7L4.3 4.3"/></svg>;
    case 'grc':       return <svg {...p}><path d="M10 3l6 2v5c0 4-3 6-6 7-3-1-6-3-6-7V5l6-2z"/><path d="M7.5 10l2 2 3-3.5"/></svg>;
    case 'kyc':       return <svg {...p}><circle cx="10" cy="8" r="3"/><path d="M4 17c1-3 3.5-4 6-4s5 1 6 4"/><path d="M14 4l2 2-2 2"/></svg>;
    case 'workforce': return <svg {...p}><circle cx="6" cy="7" r="2"/><circle cx="14" cy="7" r="2"/><path d="M2 16c0-2.5 2-4 4-4s4 1.5 4 4M10 16c0-2.5 2-4 4-4s4 1.5 4 4"/></svg>;
    case 'context':   return <svg {...p}><path d="M3 5h14v10H3z"/><path d="M3 9h14M7 5v10"/></svg>;
    case 'eye':       return <svg {...p}><path d="M2 10c2-4 5-6 8-6s6 2 8 6c-2 4-5 6-8 6s-6-2-8-6z"/><circle cx="10" cy="10" r="2.5"/></svg>;
    case 'activity':  return <svg {...p}><path d="M2 10h3l2-6 4 12 2-6h5"/></svg>;
    case 'layers':    return <svg {...p}><path d="M10 3l7 4-7 4-7-4 7-4z"/><path d="M3 11l7 4 7-4"/><path d="M3 15l7 4 7-4"/></svg>;
    case 'cable':     return <svg {...p}><path d="M5 14a3 3 0 0 0 0-6V4M15 6a3 3 0 0 0 0 6v4"/><circle cx="5" cy="3" r="1"/><circle cx="15" cy="17" r="1"/></svg>;
    case 'gauge':     return <svg {...p}><path d="M3 14a7 7 0 0 1 14 0"/><path d="M10 14l4-3"/><circle cx="10" cy="14" r="0.8" fill="currentColor"/></svg>;
    default:         return null;
  }
}

function NavGroup({ item, pathname, accent }) {
  // For runtime, "inside" means pathname is exactly the parent OR starts
  // with a child href. The parent href is also a real page (Overview), so
  // we match on the parent itself too.
  const inside = pathname === item.href || pathname.startsWith(item.href + '/');
  const [open, setOpen] = useState(inside);
  useEffect(() => { if (inside) setOpen(true); }, [inside]);

  const activeCls = accent?.active || 'bg-primary/10 text-primary';

  return (
    <div>
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        aria-expanded={open}
        className={`w-full flex items-center gap-2.5 px-2.5 py-2 rounded-md text-[13px] transition-colors ${
          inside ? `${activeCls} font-medium` : 'text-foreground/80 hover:bg-muted hover:text-foreground'
        }`}
      >
        <Icon name={item.icon} />
        <span className="flex-1 text-left truncate">{item.label}</span>
        <svg width="10" height="10" viewBox="0 0 12 12" fill="currentColor"
             className={`text-muted-foreground transition-transform shrink-0 ${open ? 'rotate-90' : ''}`}>
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
                    active ? `${activeCls} font-medium`
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

/* Mode-tinted accent so each mode reads distinct without a full theme swap. */
const MODE_ACCENT = {
  build:  { active: 'bg-primary/10 text-primary',         tab: 'border-primary/40 bg-primary/10 text-primary' },
  govern: { active: 'bg-destructive/10 text-destructive', tab: 'border-destructive/40 bg-destructive/10 text-destructive' },
  suites: { active: 'bg-accent/15 text-accent',           tab: 'border-accent/50 bg-accent/15 text-accent' },
};

export default function AppSidebar({ collapsed, onToggle }) {
  const pathname = usePathname();
  const { user } = useAuth();
  const { list, current, currentId, switchTo, create, rename, remove } = useWorkspaces(user?.workspace);
  const pendingApprovals = usePendingCount(t => t.status === 'pending' || t.status === 'claimed');

  // Mode is path-derived by default. The user's last manual mode click is
  // remembered until they navigate into a different mode's root, at which
  // point we snap to that mode.
  const pathMode = modeFromPath(pathname);
  const [stickyMode, setStickyMode] = useState(null);
  useEffect(() => {
    if (typeof window === 'undefined') return;
    setStickyMode(window.localStorage.getItem(MODE_KEY) || null);
  }, []);
  // Snap sticky to path when pathname enters a different mode's territory.
  useEffect(() => {
    if (!stickyMode || stickyMode === pathMode) return;
    setStickyMode(pathMode);
    try { window.localStorage.setItem(MODE_KEY, pathMode); } catch {}
  }, [pathMode]); // eslint-disable-line react-hooks/exhaustive-deps
  const mode = stickyMode || pathMode;

  const setMode = (id) => {
    setStickyMode(id);
    try { window.localStorage.setItem(MODE_KEY, id); } catch {}
  };

  const accent = MODE_ACCENT[mode] || MODE_ACCENT.build;

  const isActive = (href) => href === '/app' ? pathname === '/app' : pathname.startsWith(href);

  /* The list rendered under "Mode → items". Build keeps the long list as
     before; Govern shows its 4 routes; Suites shows the 4 SKUs (locked +
     enabled). Settings + Home pinned at top in the build mode only. */
  const navItems = useMemo(() => {
    if (mode === 'govern') return GOVERN_NAV;
    if (mode === 'suites') return SUITES_NAV;
    return BUILD_NAV;
  }, [mode]);

  if (collapsed) {
    return (
      <aside className="w-14 shrink-0 h-screen border-r border-border bg-panel flex flex-col items-center py-3 sticky top-0">
        <button onClick={onToggle} className="h-8 w-8 rounded flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted" title="Expand sidebar">
          <svg width="14" height="14" viewBox="0 0 12 12" fill="currentColor"><path d="M4 2l5 4-5 4V2z"/></svg>
        </button>

        {/* Mode dots — three circles, one per mode, active mode filled. */}
        <div className="mt-3 flex flex-col gap-1.5">
          {MODES.map(m => (
            <button
              key={m.id}
              type="button"
              onClick={() => setMode(m.id)}
              title={m.label}
              className={`h-2 w-2 rounded-full transition-all ${
                m.id === mode
                  ? (m.id === 'govern' ? 'bg-destructive scale-125' :
                     m.id === 'suites' ? 'bg-accent scale-125' :
                                          'bg-primary scale-125')
                  : 'bg-border hover:bg-muted-foreground'
              }`}
            />
          ))}
        </div>

        <div className="mt-3 mb-1 h-px w-8 bg-border" />
        <nav className="flex-1 flex flex-col gap-1 items-center mt-2 overflow-y-auto">
          {navItems.map(n => (
            n.enabled === false ? (
              <span key={n.href} title={`${n.label} · soon`}
                className="h-9 w-9 rounded flex items-center justify-center text-muted-foreground/40 cursor-not-allowed">
                <Icon name={n.icon} />
              </span>
            ) : (
              <Link key={n.href} href={n.href} title={n.label}
                className={`relative h-9 w-9 rounded flex items-center justify-center transition-colors ${
                  isActive(n.href) ? accent.active : 'text-muted-foreground hover:text-foreground hover:bg-muted'
                }`}>
                <Icon name={n.icon} />
                {n.icon === 'approvals' && pendingApprovals > 0 && (
                  <span className="absolute -top-0.5 -right-0.5 h-4 min-w-4 px-1 rounded-full bg-primary text-primary-foreground text-[9px] font-mono font-medium tabular-nums flex items-center justify-center">
                    {pendingApprovals}
                  </span>
                )}
              </Link>
            )
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

      {/* Mode switcher — three-segment control. The active mode's accent
          color also tints the active nav row below. */}
      <div className="px-3 pt-3 pb-2">
        <div role="tablist" aria-label="Mode" className="grid grid-cols-3 gap-1 p-0.5 rounded-md border border-border bg-card">
          {MODES.map(m => {
            const active = m.id === mode;
            const tint = active
              ? (m.id === 'govern' ? 'bg-destructive/10 text-destructive border-destructive/40' :
                 m.id === 'suites' ? 'bg-accent/15 text-accent border-accent/50' :
                                       'bg-primary/10 text-primary border-primary/40')
              : 'text-muted-foreground border-transparent hover:text-foreground';
            return (
              <button
                key={m.id}
                role="tab"
                aria-selected={active}
                onClick={() => setMode(m.id)}
                title={m.hint}
                className={`px-2 py-1 rounded text-[11px] font-medium border transition-colors ${tint}`}
              >
                {m.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Workspace chip */}
      <div className="px-3 pb-2">
        <WorkspaceSwitcher
          list={list}
          currentId={currentId}
          onSwitch={switchTo}
          onCreate={create}
          onRename={rename}
          onRemove={remove}
        />
      </div>

      {/* Mode nav */}
      <nav className="flex-1 overflow-y-auto px-2 py-2 space-y-0.5">
        <div className="px-2 pt-2 pb-1 text-[10px] uppercase tracking-[0.2em] text-muted-foreground font-mono">
          {mode === 'govern' ? 'Control plane' : mode === 'suites' ? 'Suites' : 'Build'}
        </div>

        {navItems.map(n => (
          n.enabled === false ? (
            <div key={n.href}
              className="flex items-center gap-2.5 px-2.5 py-2 rounded-md text-[13px] text-muted-foreground/55 cursor-not-allowed"
              title="Coming soon">
              <Icon name={n.icon} />
              <span className="flex-1 truncate">{n.label}</span>
              <span className="text-[9.5px] font-mono px-1.5 py-0.5 rounded border border-border text-muted-foreground/70">soon</span>
            </div>
          ) : n.children ? (
            <NavGroup key={n.href} item={n} pathname={pathname} accent={accent} />
          ) : (
            <Link key={n.href} href={n.href}
              className={`flex items-center gap-2.5 px-2.5 py-2 rounded-md text-[13px] transition-colors ${
                isActive(n.href)
                  ? `${accent.active} font-medium`
                  : 'text-foreground/80 hover:bg-muted hover:text-foreground'
              }`}>
              <Icon name={n.icon} />
              <span className="flex-1 truncate">{n.label}</span>
              {n.icon === 'approvals' && pendingApprovals > 0 && (
                <span className="text-[9.5px] font-mono px-1.5 py-0.5 rounded bg-primary text-primary-foreground tabular-nums">
                  {pendingApprovals}
                </span>
              )}
              {n.badge && (
                <span className="text-[9.5px] font-mono px-1.5 py-0.5 rounded border border-accent/40 text-accent bg-accent/10">
                  {n.badge}
                </span>
              )}
            </Link>
          )
        ))}

        <div className="px-2 pt-4 pb-1 text-[10px] uppercase tracking-[0.2em] text-muted-foreground font-mono">Account</div>
        <NavGroup item={SETTINGS} pathname={pathname} />
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
