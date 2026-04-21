'use client';

import { useCallback, useEffect, useState } from 'react';
import { SEED_WORKFLOW } from './seed';

/* Storage model
   -------------
   av-studio-workflows-v1   list of { id, name, description, updatedAt, createdAt }
   av-studio-workflow::<id> per-workflow body { name, description, nodes, edges }
   av-studio-current-v1     last-opened workflow id

   The Studio prior to this used a single key, `av-studio-workflow-v2`, for
   the body of a single workflow. First-run migration copies that body into
   `av-studio-workflow::wf_default` and registers it in the list. After
   migration the old key is left in place (harmless) so we don't lose data
   if the user reverts the app. */

const LIST_KEY    = 'av-studio-workflows-v1';
const CURRENT_KEY = 'av-studio-current-v1';
const BODY_PREFIX = 'av-studio-workflow::';
const LEGACY_KEY  = 'av-studio-workflow-v2';
const DEFAULT_ID  = 'wf_default';

export function bodyKey(id) { return `${BODY_PREFIX}${id}`; }

function makeId() { return 'wf_' + Math.random().toString(36).slice(2, 10); }

function writeList(list) {
  try { localStorage.setItem(LIST_KEY, JSON.stringify(list)); } catch {}
}
function readList() {
  try { return JSON.parse(localStorage.getItem(LIST_KEY) || '[]'); } catch { return []; }
}
export function readBody(id) {
  try { return JSON.parse(localStorage.getItem(bodyKey(id)) || 'null'); } catch { return null; }
}
export function writeBody(id, body) {
  try { localStorage.setItem(bodyKey(id), JSON.stringify(body)); } catch {}
}

/* One-shot bootstrap — runs on first access.
   - If nothing exists yet, seed a "Default workflow" (from SEED_WORKFLOW) and
     a "Blank" so the user sees >1 entry and can switch.
   - If the legacy v2 key exists, migrate it to wf_default. */
function ensureBootstrapped() {
  const existing = readList();
  if (existing.length > 0) return existing;

  const now = new Date().toISOString();
  const list = [];

  // Legacy migration — reuse whatever body the user had.
  let defaultBody = null;
  try {
    const legacy = localStorage.getItem(LEGACY_KEY);
    if (legacy) defaultBody = JSON.parse(legacy);
  } catch {}
  if (!defaultBody) defaultBody = SEED_WORKFLOW;

  list.push({
    id: DEFAULT_ID,
    name: defaultBody.name || 'Invoice processor',
    description: defaultBody.description || '',
    createdAt: now,
    updatedAt: now,
  });
  writeBody(DEFAULT_ID, {
    name:        defaultBody.name || 'Invoice processor',
    description: defaultBody.description || '',
    nodes:       defaultBody.nodes || [],
    edges:       defaultBody.edges || [],
  });

  // Ship a second "Blank" entry so users discover the switcher.
  const blankId = 'wf_blank';
  list.push({
    id: blankId,
    name: 'Blank canvas',
    description: 'Start from scratch.',
    createdAt: now,
    updatedAt: now,
  });
  writeBody(blankId, { name: 'Blank canvas', description: 'Start from scratch.', nodes: [], edges: [] });

  writeList(list);
  // Point current at whichever was already on screen (legacy default).
  try { localStorage.setItem(CURRENT_KEY, DEFAULT_ID); } catch {}
  return list;
}

/* ---------------- TEMPLATES ---------------- */

export const WORKFLOW_TEMPLATES = [
  {
    id: 'blank',
    label: 'Blank canvas',
    desc: 'Start from scratch.',
    body: () => ({ name: 'Untitled workflow', description: '', nodes: [], edges: [] }),
  },
  {
    id: 'invoice',
    label: 'Invoice processor',
    desc: 'The classic AP flow — parallel extraction, policy gate, approvals, audit.',
    body: () => ({
      name: 'Invoice processor',
      description: SEED_WORKFLOW.description,
      nodes: JSON.parse(JSON.stringify(SEED_WORKFLOW.nodes)),
      edges: JSON.parse(JSON.stringify(SEED_WORKFLOW.edges)),
    }),
  },
];

/* ---------------- hook ---------------- */

export function useWorkflows() {
  const [list, setList] = useState([]);
  const [currentId, setCurrentId] = useState(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const seeded = ensureBootstrapped();
    setList(seeded);
    let cur = null;
    try { cur = localStorage.getItem(CURRENT_KEY); } catch {}
    if (!cur || !seeded.some(w => w.id === cur)) cur = seeded[0]?.id || null;
    setCurrentId(cur);
    if (cur) { try { localStorage.setItem(CURRENT_KEY, cur); } catch {} }
    setReady(true);
  }, []);

  const refresh = useCallback(() => {
    setList(readList());
  }, []);

  const switchTo = useCallback((id) => {
    if (!list.some(w => w.id === id)) return;
    try { localStorage.setItem(CURRENT_KEY, id); } catch {}
    setCurrentId(id);
  }, [list]);

  const create = useCallback(({ name, template }) => {
    const tpl = WORKFLOW_TEMPLATES.find(t => t.id === template) || WORKFLOW_TEMPLATES[0];
    const body = tpl.body();
    const id = makeId();
    const now = new Date().toISOString();
    body.name = name || body.name || 'Untitled workflow';
    writeBody(id, body);
    const entry = { id, name: body.name, description: body.description || '', createdAt: now, updatedAt: now };
    const nextList = [entry, ...readList()];
    writeList(nextList);
    setList(nextList);
    try { localStorage.setItem(CURRENT_KEY, id); } catch {}
    setCurrentId(id);
    return id;
  }, []);

  const rename = useCallback((id, name) => {
    const now = new Date().toISOString();
    const nextList = readList().map(w => w.id === id ? { ...w, name, updatedAt: now } : w);
    writeList(nextList);
    setList(nextList);
    const body = readBody(id);
    if (body) writeBody(id, { ...body, name });
  }, []);

  const duplicate = useCallback((srcId) => {
    const src = readBody(srcId);
    if (!src) return null;
    const id = makeId();
    const now = new Date().toISOString();
    const name = `${src.name} (copy)`;
    writeBody(id, { ...src, name });
    const entry = { id, name, description: src.description || '', createdAt: now, updatedAt: now };
    const nextList = [entry, ...readList()];
    writeList(nextList);
    setList(nextList);
    try { localStorage.setItem(CURRENT_KEY, id); } catch {}
    setCurrentId(id);
    return id;
  }, []);

  const remove = useCallback((id) => {
    const nextList = readList().filter(w => w.id !== id);
    if (nextList.length === 0) return false;    // never remove the last one
    writeList(nextList);
    try { localStorage.removeItem(bodyKey(id)); } catch {}
    setList(nextList);
    if (currentId === id) {
      const nextCur = nextList[0].id;
      try { localStorage.setItem(CURRENT_KEY, nextCur); } catch {}
      setCurrentId(nextCur);
    }
    return true;
  }, [currentId]);

  /* touch(id) — update updatedAt for the list entry after a save.
     Called by the app after it persists the body. */
  const touch = useCallback((id, updates = {}) => {
    const now = new Date().toISOString();
    const nextList = readList().map(w => w.id === id ? { ...w, ...updates, updatedAt: now } : w);
    writeList(nextList);
    setList(nextList);
  }, []);

  return { list, currentId, ready, switchTo, create, rename, duplicate, remove, refresh, touch };
}
