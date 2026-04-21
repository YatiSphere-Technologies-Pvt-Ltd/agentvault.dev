'use client';

import { createContext, useCallback, useContext, useEffect, useState } from 'react';

const STORAGE_KEY = 'av-auth-session-v1';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) setUser(JSON.parse(raw));
    } catch {}
    setReady(true);
  }, []);

  const persist = useCallback((next) => {
    setUser(next);
    try {
      if (next) localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      else localStorage.removeItem(STORAGE_KEY);
    } catch {}
  }, []);

  // Demo-only: any non-empty email + password ≥ 6 chars succeeds.
  const signIn = useCallback(async ({ email, password }) => {
    await new Promise(r => setTimeout(r, 400));
    if (!email?.trim()) throw new Error('Email is required.');
    if (!password || password.length < 6) throw new Error('Password must be at least 6 characters.');
    const session = {
      email: email.trim(),
      name: email.split('@')[0] || 'there',
      workspace: 'AgentVault · demo',
      signedInAt: Date.now(),
    };
    persist(session);
    return session;
  }, [persist]);

  const signUp = useCallback(async ({ name, email, password }) => {
    await new Promise(r => setTimeout(r, 500));
    if (!name?.trim()) throw new Error('Full name is required.');
    if (!email?.trim() || !email.includes('@')) throw new Error('Enter a valid email.');
    if (!password || password.length < 6) throw new Error('Password must be at least 6 characters.');
    const session = {
      email: email.trim(),
      name: name.trim(),
      workspace: `${name.split(' ')[0]}'s workspace`,
      signedInAt: Date.now(),
    };
    persist(session);
    return session;
  }, [persist]);

  const signOut = useCallback(() => {
    persist(null);
  }, [persist]);

  return (
    <AuthContext.Provider value={{ user, ready, signIn, signUp, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside <AuthProvider>');
  return ctx;
}
