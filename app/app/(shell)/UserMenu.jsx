'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import { useAuth } from '../../auth/AuthProvider';

export default function UserMenu() {
  const { user, signOut } = useAuth();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    if (!open) return;
    const onClick = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    const onKey = (e) => { if (e.key === 'Escape') setOpen(false); };
    document.addEventListener('mousedown', onClick);
    document.addEventListener('keydown', onKey);
    return () => { document.removeEventListener('mousedown', onClick); document.removeEventListener('keydown', onKey); };
  }, [open]);

  if (!user) return null;

  const initials =
    (user.name || user.email || 'U').split(/[\s@.]/).filter(Boolean).slice(0, 2).map(s => s[0]?.toUpperCase()).join('') || 'U';

  return (
    <div className="flex items-center gap-1" ref={ref}>
      {/* Notifications bell */}
      <button
        aria-label="Notifications"
        className="relative h-8 w-8 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted flex items-center justify-center transition-colors"
      >
        <svg width="15" height="15" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
          <path d="M4 14V9a6 6 0 1112 0v5l1.5 2H2.5L4 14z"/>
          <path d="M8 17a2 2 0 004 0"/>
        </svg>
        <span className="absolute top-1 right-1 h-1.5 w-1.5 rounded-full bg-destructive" />
      </button>

      {/* Help */}
      <button
        aria-label="Help"
        className="hidden md:inline-flex h-8 w-8 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted items-center justify-center transition-colors"
      >
        <svg width="15" height="15" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round">
          <circle cx="10" cy="10" r="7"/>
          <path d="M7.8 7.5a2.2 2.2 0 114.2 1c0 1-1 1.4-1.5 1.7-.4.3-.5.6-.5 1.1"/>
          <circle cx="10" cy="14.5" r="0.6" fill="currentColor"/>
        </svg>
      </button>

      <div className="mx-1 h-5 w-px bg-border hidden md:block" />

      {/* Profile trigger */}
      <button
        onClick={() => setOpen(o => !o)}
        className="flex items-center gap-2 pl-1 pr-1.5 py-1 rounded-md hover:bg-muted transition-colors"
        aria-haspopup="menu"
        aria-expanded={open}
      >
        <div className="h-8 w-8 rounded-full bg-primary/15 border border-primary/30 flex items-center justify-center text-[11px] font-semibold text-primary">
          {initials}
        </div>
        <div className="hidden lg:block text-left min-w-0">
          <div className="text-[12.5px] font-medium text-foreground truncate leading-tight max-w-40">
            {user.name || 'Account'}
          </div>
          <div className="text-[10.5px] text-muted-foreground truncate font-mono leading-tight max-w-40">
            {user.email}
          </div>
        </div>
        <svg width="10" height="10" viewBox="0 0 12 12" fill="currentColor" className={`text-muted-foreground transition-transform shrink-0 ${open ? 'rotate-180' : ''}`}>
          <path d="M6 8L2 4h8z"/>
        </svg>
      </button>

      {/* Dropdown */}
      {open && (
        <div
          role="menu"
          className="fixed sm:absolute top-13 right-2 sm:right-4 lg:right-6 w-[min(calc(100vw-1rem),16rem)] rounded-md border border-border bg-panel shadow-lg py-1 z-40"
        >
          {/* Header card */}
          <div className="px-3 py-3 border-b border-border">
            <div className="flex items-center gap-2.5">
              <div className="h-9 w-9 rounded-full bg-primary/15 border border-primary/30 flex items-center justify-center text-[12px] font-semibold text-primary shrink-0">
                {initials}
              </div>
              <div className="min-w-0">
                <div className="text-[13px] font-medium text-foreground truncate">{user.name || 'Account'}</div>
                <div className="text-[11px] text-muted-foreground font-mono truncate">{user.email}</div>
              </div>
            </div>
            <div className="mt-2.5 pt-2.5 border-t border-border/60 text-[10.5px] font-mono text-muted-foreground flex items-center justify-between">
              <span>Workspace</span>
              <span className="text-foreground truncate ml-2">{user.workspace || 'Personal'}</span>
            </div>
          </div>

          {/* Menu items */}
          <div className="py-1">
            <MenuItem href="/app/settings/profile"   onClose={() => setOpen(false)} icon="user">Profile &amp; account</MenuItem>
            <MenuItem href="/app/settings/workspace" onClose={() => setOpen(false)} icon="workspace">Workspace settings</MenuItem>
            <MenuItem href="/app/settings/billing"   onClose={() => setOpen(false)} icon="billing">Billing</MenuItem>
            <MenuItem href="/app/settings/api"       onClose={() => setOpen(false)} icon="key">API keys</MenuItem>
          </div>

          <div className="my-1 h-px bg-border" />

          <div className="py-1">
            <MenuItem href="/"                       onClose={() => setOpen(false)} icon="external">View landing</MenuItem>
            <MenuItem href="/developers"             onClose={() => setOpen(false)} icon="docs">Documentation</MenuItem>
          </div>

          <div className="my-1 h-px bg-border" />

          <button
            onClick={() => { signOut(); setOpen(false); router.replace('/'); }}
            className="w-full flex items-center gap-2.5 px-3 py-2 text-[12.5px] text-destructive hover:bg-muted transition-colors"
          >
            <MenuIcon name="signout" />
            <span>Sign out</span>
          </button>
        </div>
      )}
    </div>
  );
}

function MenuItem({ href, icon, children, onClose }) {
  return (
    <Link
      href={href}
      onClick={onClose}
      className="flex items-center gap-2.5 px-3 py-2 text-[12.5px] text-foreground hover:bg-muted transition-colors"
    >
      <MenuIcon name={icon} />
      <span>{children}</span>
    </Link>
  );
}

function MenuIcon({ name }) {
  const p = { width: 14, height: 14, viewBox: '0 0 20 20', fill: 'none', stroke: 'currentColor', strokeWidth: 1.6, strokeLinecap: 'round', strokeLinejoin: 'round' };
  switch (name) {
    case 'user':      return <svg {...p}><circle cx="10" cy="7" r="3"/><path d="M4 17c0-3 3-5 6-5s6 2 6 5"/></svg>;
    case 'workspace': return <svg {...p}><rect x="3" y="4" width="14" height="12" rx="1.5"/><path d="M3 8h14M7 4v4"/></svg>;
    case 'billing':   return <svg {...p}><rect x="3" y="5" width="14" height="10" rx="1.5"/><path d="M3 8h14M6 12h3"/></svg>;
    case 'key':       return <svg {...p}><circle cx="7" cy="11" r="3"/><path d="M10 10l7-2M14 8.5l1 1.5M16 8l1 1.5"/></svg>;
    case 'external':  return <svg {...p}><path d="M11 4h5v5M16 4l-7 7M14 11v5H4V6h5"/></svg>;
    case 'docs':      return <svg {...p}><path d="M5 3h7l4 4v10H5V3z"/><path d="M12 3v4h4M8 9h5M8 12h5M8 15h3"/></svg>;
    case 'signout':   return <svg {...p}><path d="M8 4H4v12h4M13 10H5M10 7l3 3-3 3"/></svg>;
    default:          return null;
  }
}
