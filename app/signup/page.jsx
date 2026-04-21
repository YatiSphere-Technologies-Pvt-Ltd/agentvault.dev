'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import AuthShell from '../auth/AuthShell';
import { useAuth } from '../auth/AuthProvider';

function SsoButton({ provider, onClick }) {
  const icons = {
    google: (
      <svg width="16" height="16" viewBox="0 0 20 20" aria-hidden>
        <path fill="#4285F4" d="M19.6 10.23c0-.7-.06-1.37-.18-2H10v3.79h5.39c-.24 1.25-.95 2.3-2.02 3.01v2.5h3.27c1.91-1.76 3-4.35 3-7.3z"/>
        <path fill="#34A853" d="M10 20c2.7 0 4.97-.9 6.63-2.44l-3.23-2.5c-.9.6-2.05.95-3.4.95-2.6 0-4.8-1.75-5.59-4.12H1.06v2.58A10 10 0 0010 20z"/>
        <path fill="#FBBC05" d="M4.41 11.9A5.95 5.95 0 014.1 10c0-.66.12-1.3.32-1.9V5.51H1.06a10 10 0 000 8.97l3.35-2.58z"/>
        <path fill="#EA4335" d="M10 3.98c1.47 0 2.79.5 3.83 1.5l2.87-2.87C14.97 1 12.7 0 10 0 6.14 0 2.81 2.22 1.06 5.5l3.35 2.6C5.2 5.73 7.4 3.98 10 3.98z"/>
      </svg>
    ),
    microsoft: (
      <svg width="16" height="16" viewBox="0 0 20 20" aria-hidden>
        <rect x="1"  y="1"  width="8.5" height="8.5" fill="#F25022"/>
        <rect x="10.5" y="1" width="8.5" height="8.5" fill="#7FBA00"/>
        <rect x="1"  y="10.5" width="8.5" height="8.5" fill="#00A4EF"/>
        <rect x="10.5" y="10.5" width="8.5" height="8.5" fill="#FFB900"/>
      </svg>
    ),
  };
  const labels = { google: 'Sign up with Google', microsoft: 'Sign up with Microsoft' };
  return (
    <button
      type="button"
      onClick={onClick}
      className="w-full inline-flex items-center justify-center gap-2.5 px-4 py-2.5 rounded-md border border-border bg-panel text-[13px] font-medium text-foreground hover:bg-muted transition-colors"
    >
      {icons[provider]}
      <span>{labels[provider]}</span>
    </button>
  );
}

function strengthOf(pw) {
  let s = 0;
  if (pw.length >= 6) s++;
  if (pw.length >= 10) s++;
  if (/[A-Z]/.test(pw) && /[a-z]/.test(pw)) s++;
  if (/\d/.test(pw) || /[^A-Za-z0-9]/.test(pw)) s++;
  return Math.min(s, 4);
}

export default function SignUpPage() {
  const router = useRouter();
  const { user, ready, signUp } = useAuth();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [accepted, setAccepted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (ready && user) router.replace('/app');
  }, [ready, user, router]);

  const onSubmit = async (e) => {
    e.preventDefault();
    if (submitting) return;
    setError(null);
    if (!accepted) { setError('Please accept the Terms to continue.'); return; }
    setSubmitting(true);
    try {
      await signUp({ name, email, password });
      router.replace('/app');
    } catch (err) {
      setError(err.message);
      setSubmitting(false);
    }
  };

  const strength = strengthOf(password);
  const strengthLabels = ['', 'Weak', 'Fair', 'Good', 'Strong'];
  const strengthTones = ['bg-border', 'bg-destructive', 'bg-amber-500', 'bg-accent', 'bg-accent'];

  return (
    <AuthShell side="signup">
      <div className="mb-7">
        <div className="text-[10.5px] uppercase tracking-[0.2em] text-muted-foreground font-mono">Start free</div>
        <h1 className="mt-2 text-[28px] font-semibold tracking-tight text-foreground leading-[1.15]">Create your AgentVault workspace.</h1>
        <p className="mt-2 text-[13.5px] text-muted-foreground">Free for 14 days — no card required. Invite your team when you're ready.</p>
      </div>

      <div className="space-y-2.5">
        <SsoButton provider="google" onClick={() => setError('SSO is stubbed in this demo. Use the form below.')} />
        <SsoButton provider="microsoft" onClick={() => setError('SSO is stubbed in this demo. Use the form below.')} />
      </div>

      <div className="relative my-5">
        <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-border" /></div>
        <div className="relative flex justify-center"><span className="bg-hero-bg px-2 text-[10.5px] uppercase tracking-[0.2em] text-muted-foreground font-mono">or</span></div>
      </div>

      <form onSubmit={onSubmit} className="space-y-4" noValidate>
        <label className="block">
          <div className="text-[10.5px] uppercase tracking-[0.15em] text-muted-foreground font-medium mb-1.5">Full name</div>
          <input
            type="text"
            autoComplete="name"
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Ada Lovelace"
            className="w-full px-3 py-2.5 bg-panel border border-border rounded-md text-[13px] text-foreground placeholder:text-muted-foreground/60 focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/15 transition-all"
          />
        </label>

        <label className="block">
          <div className="text-[10.5px] uppercase tracking-[0.15em] text-muted-foreground font-medium mb-1.5">Work email</div>
          <input
            type="email"
            autoComplete="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@company.com"
            className="w-full px-3 py-2.5 bg-panel border border-border rounded-md text-[13px] text-foreground placeholder:text-muted-foreground/60 focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/15 transition-all"
          />
        </label>

        <label className="block">
          <div className="text-[10.5px] uppercase tracking-[0.15em] text-muted-foreground font-medium mb-1.5">Password</div>
          <input
            type="password"
            autoComplete="new-password"
            required
            minLength={6}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="6+ characters"
            className="w-full px-3 py-2.5 bg-panel border border-border rounded-md text-[13px] text-foreground placeholder:text-muted-foreground/60 focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/15 transition-all"
          />
          <div className="mt-2 flex items-center gap-1.5">
            {[1,2,3,4].map(i => (
              <div key={i} className={`h-1 flex-1 rounded-full ${i <= strength ? strengthTones[strength] : 'bg-border'}`} />
            ))}
            <span className="text-[10.5px] text-muted-foreground font-mono tabular-nums ml-1 w-10 text-right">
              {password ? strengthLabels[strength] : ''}
            </span>
          </div>
        </label>

        <label className="flex items-start gap-2 text-[12.5px] text-muted-foreground select-none cursor-pointer">
          <input type="checkbox" checked={accepted} onChange={(e) => setAccepted(e.target.checked)} className="mt-0.5 h-3.5 w-3.5 rounded border-border accent-primary" />
          <span>
            I agree to the <a href="#" className="text-primary hover:brightness-110">Terms of Service</a> and <a href="#" className="text-primary hover:brightness-110">Privacy Policy</a>.
          </span>
        </label>

        {error && (
          <div className="text-[12px] text-destructive bg-destructive/8 border border-destructive/30 rounded-md px-3 py-2">
            {error}
          </div>
        )}

        <button
          type="submit"
          disabled={submitting}
          className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-md bg-primary text-primary-foreground text-[13px] font-medium hover:brightness-110 active:scale-[0.99] transition-all disabled:opacity-70 disabled:cursor-not-allowed"
        >
          {submitting ? (
            <><svg width="14" height="14" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" className="animate-spin"><path d="M10 3a7 7 0 017 7"/></svg> Creating workspace…</>
          ) : 'Create workspace'}
        </button>
      </form>

      <p className="mt-6 text-[11px] text-muted-foreground font-mono">
        Demo: any valid-looking email + password with 6+ characters.
      </p>
    </AuthShell>
  );
}
