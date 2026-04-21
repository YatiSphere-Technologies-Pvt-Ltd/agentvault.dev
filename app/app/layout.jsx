'use client';

import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { useAuth } from '../auth/AuthProvider';

export default function AppGuard({ children }) {
  const router = useRouter();
  const { ready, user } = useAuth();

  useEffect(() => {
    if (ready && !user) router.replace('/signin');
  }, [ready, user, router]);

  // Hold the render until we know — avoids flash of protected content
  if (!ready) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-hero-bg text-muted-foreground text-[12px] font-mono">
        <div className="flex items-center gap-2">
          <svg width="14" height="14" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="2.2" className="animate-spin" aria-hidden>
            <path d="M10 3a7 7 0 017 7" strokeLinecap="round"/>
          </svg>
          Loading your vault…
        </div>
      </div>
    );
  }
  if (!user) return null;

  return children;
}
