'use client';

import Link from 'next/link';

/* 50/50 split auth layout.
   - Left pane: form, centered, capped width for readability.
   - Right pane: brand + social proof + product glimpse. Hidden under lg.
   - Mobile: brand pane drops away; a compact brand strip sits above the form.

   Best-practice choices baked in:
   - Equal panes on lg+ so neither side feels like an afterthought.
   - Persistent top bar on the form side with logo + "switch to other mode"
     link (reduces friction for users on the wrong screen).
   - Right pane carries trust signals (compliance badges, usage stats,
     customer logos) and a single, short testimonial — not a wall of copy.
   - Right pane is scroll-safe: content is centered, overflow hidden, so
     long brand content doesn't push the form out of view. */

export default function AuthShell({ side = 'signin', children }) {
  return (
    <div className="min-h-screen w-full bg-hero-bg grid grid-cols-1 lg:grid-cols-2">
      {/* ─── Left pane: form ─── */}
      <div className="flex flex-col min-h-screen">
        {/* Top bar */}
        <div className="px-6 sm:px-10 lg:px-12 py-6 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2.5 text-foreground text-[17px] font-semibold tracking-tight">
            <svg width="22" height="22" viewBox="0 0 22 22" fill="none" aria-hidden>
              <rect x="1" y="1" width="20" height="20" stroke="var(--primary)" strokeWidth="1.5" />
              <rect x="5" y="5" width="12" height="12" stroke="var(--brand-teal)" strokeWidth="1" />
              <circle cx="11" cy="11" r="2.5" fill="var(--primary)" />
            </svg>
            <span>AgentVault</span>
          </Link>
          <div className="text-[12.5px] text-muted-foreground">
            {side === 'signin' ? (
              <>New to AgentVault? <Link href="/signup" className="text-primary hover:brightness-110 font-medium">Create an account</Link></>
            ) : (
              <>Already a member? <Link href="/signin" className="text-primary hover:brightness-110 font-medium">Sign in</Link></>
            )}
          </div>
        </div>

        {/* Form */}
        <div className="flex-1 flex items-center justify-center px-6 sm:px-10 lg:px-12 py-4">
          <div className="w-full max-w-[440px]">{children}</div>
        </div>

        {/* Footer */}
        <div className="px-6 sm:px-10 lg:px-12 py-5 text-[11px] text-muted-foreground flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 border-t border-border/60">
          <span>© 2026 AgentVault · Enterprise agents, governed.</span>
          <div className="flex items-center gap-4">
            <a href="#" className="hover:text-foreground transition-colors">Terms</a>
            <a href="#" className="hover:text-foreground transition-colors">Privacy</a>
            <a href="#" className="hover:text-foreground transition-colors">Security</a>
          </div>
        </div>
      </div>

      {/* ─── Right pane: brand ─── */}
      <aside
        className="hidden lg:flex relative overflow-hidden"
        style={{
          background:
            'radial-gradient(900px 600px at 80% 20%, hsl(195 55% 55% / 0.22), transparent 65%), linear-gradient(150deg, hsl(232 45% 28%) 0%, hsl(232 45% 22%) 55%, hsl(222 40% 14%) 100%)',
        }}
      >
        {/* Grid overlay */}
        <div
          aria-hidden
          className="absolute inset-0 opacity-[0.10]"
          style={{
            backgroundImage: 'linear-gradient(to right, white 1px, transparent 1px), linear-gradient(to bottom, white 1px, transparent 1px)',
            backgroundSize: '48px 48px',
            maskImage: 'radial-gradient(ellipse at 60% 40%, black 45%, transparent 85%)',
            WebkitMaskImage: 'radial-gradient(ellipse at 60% 40%, black 45%, transparent 85%)',
          }}
        />

        <div className="relative z-10 flex flex-col justify-center gap-6 px-12 xl:px-16 py-12 text-white w-full max-w-[560px] mx-auto">
          <svg width="88" height="88" viewBox="0 0 112 112" fill="none" aria-hidden>
            <circle cx="56" cy="56" r="54" stroke="white" strokeOpacity="0.18" strokeWidth="1"/>
            <circle cx="56" cy="56" r="40" stroke="white" strokeOpacity="0.28" strokeWidth="1"/>
            <rect x="26" y="26" width="60" height="60" stroke="white" strokeOpacity="0.5" strokeWidth="1.2"/>
            <rect x="38" y="38" width="36" height="36" stroke="white" strokeOpacity="0.8" strokeWidth="1.4"/>
            <circle cx="56" cy="56" r="6" fill="white"/>
          </svg>

          <h2 className="text-[30px] xl:text-[34px] leading-[1.12] font-semibold tracking-tight max-w-[440px]">
            {side === 'signup'
              ? 'Enterprise AI agents, governed.'
              : 'Welcome back.'}
          </h2>

          <p className="text-[14px] text-white/70 leading-relaxed max-w-[420px]">
            {side === 'signup'
              ? 'Compose, govern, and ship agents in one vault.'
              : 'Your vault is ready.'}
          </p>
        </div>
      </aside>
    </div>
  );
}
