'use client';

import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';
import AppSidebar from './AppSidebar';
import UserMenu from './UserMenu';

export default function ShellLayout({ children }) {
  const pathname = usePathname();
  // Desktop: collapsed rail vs. expanded sidebar
  const [collapsed, setCollapsed] = useState(false);
  // Mobile: slide-in drawer
  const [mobileOpen, setMobileOpen] = useState(false);
  // Mobile: inline search sheet
  const [searchOpen, setSearchOpen] = useState(false);

  // Close the mobile drawer on route change so users never land on a new page with an open overlay.
  useEffect(() => { setMobileOpen(false); }, [pathname]);

  return (
    <div className="min-h-screen bg-hero-bg flex">
      {/* Sidebar — hidden on mobile unless drawer is open */}
      <div className="hidden md:contents">
        <AppSidebar collapsed={collapsed} onToggle={() => setCollapsed(v => !v)} />
      </div>

      {/* Mobile drawer */}
      {mobileOpen && (
        <>
          <button
            aria-label="Close menu"
            onClick={() => setMobileOpen(false)}
            className="md:hidden fixed inset-0 z-40 bg-black/35 backdrop-blur-[2px] animate-fade-in"
          />
          <div className="md:hidden fixed inset-y-0 left-0 z-50 w-65 shadow-xl animate-fade-in">
            <AppSidebar collapsed={false} onToggle={() => setMobileOpen(false)} />
          </div>
        </>
      )}

      <main className="flex-1 min-w-0 flex flex-col">
        {/* Top bar */}
        <header className="h-14 shrink-0 border-b border-border bg-panel/85 backdrop-blur sticky top-0 z-20 flex items-center justify-between gap-2 px-3 sm:px-4 lg:px-6">
          <div className="flex items-center gap-2 min-w-0">
            {/* Hamburger — mobile only */}
            <button
              aria-label="Open menu"
              onClick={() => setMobileOpen(true)}
              className="md:hidden h-8 w-8 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted inline-flex items-center justify-center"
            >
              <svg width="18" height="18" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
                <path d="M3 6h14M3 10h14M3 14h14"/>
              </svg>
            </button>

            {/* Desktop search */}
            <div className="relative hidden md:block">
              <input
                type="search"
                placeholder="Search workflows, agents, runs…"
                className="w-64 lg:w-80 pl-8 pr-3 py-1.5 bg-hero-bg border border-border rounded-md text-[12.5px] focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/15 transition-all"
              />
              <svg width="13" height="13" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.8" className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground">
                <circle cx="9" cy="9" r="6"/><path d="M14 14l4 4"/>
              </svg>
            </div>
            <kbd className="hidden lg:inline text-[10px] font-mono text-muted-foreground border border-border rounded px-1.5 py-0.5">⌘K</kbd>

            {/* Mobile search icon */}
            <button
              aria-label="Search"
              onClick={() => setSearchOpen(o => !o)}
              className="md:hidden h-8 w-8 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted inline-flex items-center justify-center"
            >
              <svg width="15" height="15" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.8">
                <circle cx="9" cy="9" r="6"/><path d="M14 14l4 4"/>
              </svg>
            </button>
          </div>

          <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
            <div className="hidden lg:flex items-center gap-1.5 px-2.5 py-1 rounded-md border border-accent/35 bg-accent/5 text-[10.5px] font-mono text-accent">
              <span className="h-1.5 w-1.5 rounded-full bg-accent animate-pulse-dot" />
              <span>14-day trial · 12 left</span>
            </div>
            <button className="hidden md:inline-flex text-[12.5px] px-3 py-1.5 rounded-md border border-border hover:bg-muted transition-colors">
              Invite
            </button>
            <button className="text-[12px] sm:text-[12.5px] px-2.5 sm:px-3 py-1.5 rounded-md bg-primary text-primary-foreground hover:brightness-110 font-medium whitespace-nowrap">
              Upgrade
            </button>
            <div className="mx-1 h-5 w-px bg-border hidden md:block" />
            <UserMenu />
          </div>
        </header>

        {/* Mobile search sheet — appears below header */}
        {searchOpen && (
          <div className="md:hidden px-3 pb-3 pt-1 border-b border-border bg-panel/80 backdrop-blur animate-fade-in">
            <div className="relative">
              <input
                type="search"
                autoFocus
                placeholder="Search workflows, agents, runs…"
                className="w-full pl-8 pr-3 py-2 bg-hero-bg border border-border rounded-md text-[13px] focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/15"
              />
              <svg width="13" height="13" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.8" className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground">
                <circle cx="9" cy="9" r="6"/><path d="M14 14l4 4"/>
              </svg>
            </div>
          </div>
        )}

        <div className="flex-1 min-w-0">{children}</div>
      </main>
    </div>
  );
}
