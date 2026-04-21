'use client';

import { useCallback, useEffect, useState } from 'react';

/* Storage model
   -------------
   av-workspaces-v1   list of { id, name, region, defaultLLM, policyFile, createdAt, updatedAt }
   av-workspace-current-v1  current workspace id

   Why in localStorage: demo app, no backend. Mirrors the workflow switcher
   pattern in studio/_workflowStore.js.

   Bootstrap: on first access we seed one workspace from the signed-in user's
   session (user.workspace) if present, else "Personal workspace". The legacy
   single-workspace model stored nothing here — it read user.workspace directly
   from the auth session. We leave that field on the session so sign-out still
   works, but the switcher is now the source of truth. */

const LIST_KEY    = 'av-workspaces-v1';
const CURRENT_KEY = 'av-workspace-current-v1';

function makeId() { return 'ws_' + Math.random().toString(36).slice(2, 10); }

function readList() {
  try { return JSON.parse(localStorage.getItem(LIST_KEY) || '[]'); } catch { return []; }
}
function writeList(list) {
  try { localStorage.setItem(LIST_KEY, JSON.stringify(list)); } catch {}
}

function defaultEntry(name) {
  const now = new Date().toISOString();
  return {
    id: makeId(),
    name: name || 'Personal workspace',
    region: 'ap-south-1',
    defaultLLM: 'gpt-4o-mini',
    policyFile: 'policies/default.cedar',
    createdAt: now,
    updatedAt: now,
  };
}

function ensureBootstrapped(seedName) {
  const existing = readList();
  if (existing.length > 0) return existing;
  const entry = defaultEntry(seedName);
  const list = [entry];
  writeList(list);
  try { localStorage.setItem(CURRENT_KEY, entry.id); } catch {}
  return list;
}

/* ---------------- hook ---------------- */

export function useWorkspaces(seedName) {
  const [list, setList]           = useState([]);
  const [currentId, setCurrentId] = useState(null);
  const [ready, setReady]         = useState(false);

  useEffect(() => {
    const seeded = ensureBootstrapped(seedName);
    setList(seeded);
    let cur = null;
    try { cur = localStorage.getItem(CURRENT_KEY); } catch {}
    if (!cur || !seeded.some(w => w.id === cur)) cur = seeded[0]?.id || null;
    setCurrentId(cur);
    if (cur) { try { localStorage.setItem(CURRENT_KEY, cur); } catch {} }
    setReady(true);
    // Intentionally ignore seedName changes after first mount — re-seeding would
    // silently clobber switches made in the current session.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const switchTo = useCallback((id) => {
    if (!list.some(w => w.id === id)) return;
    try { localStorage.setItem(CURRENT_KEY, id); } catch {}
    setCurrentId(id);
  }, [list]);

  const create = useCallback(({ name, region, defaultLLM, policyFile } = {}) => {
    const entry = defaultEntry(name);
    if (region)     entry.region     = region;
    if (defaultLLM) entry.defaultLLM = defaultLLM;
    if (policyFile) entry.policyFile = policyFile;
    const nextList = [entry, ...readList()];
    writeList(nextList);
    setList(nextList);
    try { localStorage.setItem(CURRENT_KEY, entry.id); } catch {}
    setCurrentId(entry.id);
    return entry.id;
  }, []);

  const rename = useCallback((id, name) => {
    const now = new Date().toISOString();
    const nextList = readList().map(w => w.id === id ? { ...w, name, updatedAt: now } : w);
    writeList(nextList);
    setList(nextList);
  }, []);

  const update = useCallback((id, patch) => {
    const now = new Date().toISOString();
    const nextList = readList().map(w => w.id === id ? { ...w, ...patch, updatedAt: now } : w);
    writeList(nextList);
    setList(nextList);
  }, []);

  const remove = useCallback((id) => {
    const nextList = readList().filter(w => w.id !== id);
    if (nextList.length === 0) return false;   // never remove the last one
    writeList(nextList);
    setList(nextList);
    if (currentId === id) {
      const nextCur = nextList[0].id;
      try { localStorage.setItem(CURRENT_KEY, nextCur); } catch {}
      setCurrentId(nextCur);
    }
    return true;
  }, [currentId]);

  const current = list.find(w => w.id === currentId) || null;

  return { list, current, currentId, ready, switchTo, create, rename, update, remove };
}
