'use client';

import { useCallback, useEffect, useState } from 'react';
import { MAPPINGS as SEEDED_MAPPINGS, FRAMEWORKS } from './_data';

/* Clause mapping store
   --------------------
   The seeded MAPPINGS are: control_id -> [[framework_slug, clause_id], ...].
   Operators must be able to (a) add a control to a clause that's currently
   unmapped, and (b) remove a seeded mapping they disagree with.

   Two storage keys:
     av-grc-mappings-add-v1     additions  — array of { control, framework, clause }
     av-grc-mappings-remove-v1  removals   — array of { control, framework, clause }

   Resolution: start with seeds, drop everything in `removals`, append
   `additions`. Additions are deduped against existing seeds + each other.
*/

const ADD_KEY    = 'av-grc-mappings-add-v1';
const REMOVE_KEY = 'av-grc-mappings-remove-v1';

function readJson(key, fallback) {
  if (typeof window === 'undefined') return fallback;
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
}

function writeJson(key, value) {
  if (typeof window === 'undefined') return;
  try { localStorage.setItem(key, JSON.stringify(value)); } catch {}
}

function key(control, framework, clause) {
  return `${control}|${framework}|${clause}`;
}

/* Compute the effective mapping graph.
   Returns the same shape as MAPPINGS: control_id -> array of [fw, clause]. */
export function resolveMappings(adds, removes) {
  const removeSet = new Set(removes.map(r => key(r.control, r.framework, r.clause)));
  const result = {};

  for (const [controlId, pairs] of Object.entries(SEEDED_MAPPINGS)) {
    const kept = pairs.filter(([fw, cl]) => !removeSet.has(key(controlId, fw, cl)));
    if (kept.length > 0) result[controlId] = kept;
  }

  for (const a of adds) {
    const k = key(a.control, a.framework, a.clause);
    if (removeSet.has(k)) continue;
    const arr = result[a.control] || [];
    if (!arr.some(([fw, cl]) => fw === a.framework && cl === a.clause)) {
      arr.push([a.framework, a.clause]);
      result[a.control] = arr;
    }
  }

  return result;
}

export function readEffectiveMappings() {
  const adds    = readJson(ADD_KEY, []);
  const removes = readJson(REMOVE_KEY, []);
  return resolveMappings(adds, removes);
}

/* Hook: reactive view of mappings + mutators that scope to a single clause.
   The framework-detail page binds to a specific (framework, clause) and asks
   the store: "which controls discharge this clause? attach or detach." */
export function useClauseMappings() {
  const [mappings, setMappings] = useState(SEEDED_MAPPINGS);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    setMappings(readEffectiveMappings());
    setHydrated(true);
  }, []);

  const persist = useCallback(() => {
    setMappings(readEffectiveMappings());
  }, []);

  /* Controls currently discharging a (framework, clause) pair — and a flag
     per control telling the UI whether the mapping comes from a seed or
     from a user addition. */
  const controlsForClause = useCallback((frameworkSlug, clauseId) => {
    const adds    = readJson(ADD_KEY, []);
    const removes = readJson(REMOVE_KEY, []);
    const removeSet = new Set(removes.map(r => key(r.control, r.framework, r.clause)));
    const out = [];

    for (const [controlId, pairs] of Object.entries(SEEDED_MAPPINGS)) {
      for (const [fw, cl] of pairs) {
        if (fw !== frameworkSlug || cl !== clauseId) continue;
        if (removeSet.has(key(controlId, fw, cl))) continue;
        out.push({ controlId, origin: 'seed' });
      }
    }
    for (const a of adds) {
      if (a.framework !== frameworkSlug || a.clause !== clauseId) continue;
      if (out.some(o => o.controlId === a.control)) continue;
      out.push({ controlId: a.control, origin: 'user' });
    }
    return out;
  }, [mappings]);

  const attach = useCallback((controlId, frameworkSlug, clauseId) => {
    const adds    = readJson(ADD_KEY, []);
    const removes = readJson(REMOVE_KEY, []);
    const k = key(controlId, frameworkSlug, clauseId);

    // If a removal exists, undo it instead of writing a new addition
    const nextRemoves = removes.filter(r => key(r.control, r.framework, r.clause) !== k);
    if (nextRemoves.length !== removes.length) {
      writeJson(REMOVE_KEY, nextRemoves);
      persist();
      return;
    }

    // Already in seeds? no-op
    const seedHas = (SEEDED_MAPPINGS[controlId] || [])
      .some(([fw, cl]) => fw === frameworkSlug && cl === clauseId);
    if (seedHas) return;

    // Already in adds? no-op
    if (adds.some(a => a.control === controlId && a.framework === frameworkSlug && a.clause === clauseId)) {
      return;
    }
    writeJson(ADD_KEY, [...adds, { control: controlId, framework: frameworkSlug, clause: clauseId }]);
    persist();
  }, [persist]);

  const detach = useCallback((controlId, frameworkSlug, clauseId) => {
    const adds    = readJson(ADD_KEY, []);
    const removes = readJson(REMOVE_KEY, []);
    const k = key(controlId, frameworkSlug, clauseId);

    const seedHas = (SEEDED_MAPPINGS[controlId] || [])
      .some(([fw, cl]) => fw === frameworkSlug && cl === clauseId);

    // If it came from an addition, drop the addition
    const nextAdds = adds.filter(a => key(a.control, a.framework, a.clause) !== k);
    if (nextAdds.length !== adds.length) {
      writeJson(ADD_KEY, nextAdds);
      persist();
      return;
    }

    // Otherwise it's a seed — write a tombstone
    if (seedHas && !removes.some(r => key(r.control, r.framework, r.clause) === k)) {
      writeJson(REMOVE_KEY, [...removes, { control: controlId, framework: frameworkSlug, clause: clauseId }]);
      persist();
    }
  }, [persist]);

  const reset = useCallback(() => {
    writeJson(ADD_KEY, []);
    writeJson(REMOVE_KEY, []);
    persist();
  }, [persist]);

  return { mappings, hydrated, controlsForClause, attach, detach, reset };
}

/* Effective coverage stats — same shape as the original `coverageFor` /
   `clausesCovered` / `frameworksFor` in _data.js, but reading the resolved
   mapping graph instead of the static seed. The framework-detail page and
   any other live view should use these. */

export function effectiveClausesCovered(mappings, frameworkSlug) {
  const covered = new Set();
  for (const cId of Object.keys(mappings)) {
    for (const [fw, clause] of mappings[cId]) {
      if (fw === frameworkSlug) covered.add(clause);
    }
  }
  return covered;
}

export function effectiveCoverageFor(mappings, frameworkSlug) {
  const fw = FRAMEWORKS.find(f => f.slug === frameworkSlug);
  if (!fw) return { covered: 0, total: 0, pct: 0 };
  const covered = effectiveClausesCovered(mappings, frameworkSlug);
  return {
    covered: covered.size,
    total: fw.clauses.length,
    pct: fw.clauses.length === 0 ? 0 : covered.size / fw.clauses.length,
  };
}

export function effectiveControlsByFramework(mappings, frameworkSlug, allControls) {
  const out = [];
  for (const c of allControls) {
    const m = mappings[c.id] || [];
    if (m.some(([fw]) => fw === frameworkSlug)) out.push(c);
  }
  return out;
}

export function effectiveFrameworksFor(mappings, controlId) {
  const m = mappings[controlId] || [];
  return Array.from(new Set(m.map(([fw]) => fw)));
}

/* Per-clause status: how many controls discharge each clause. Mirrors
   clauseStatusFor() in _data.js but reads from the effective graph. */
export function effectiveClauseStatusFor(mappings, frameworkSlug) {
  const fw = FRAMEWORKS.find(f => f.slug === frameworkSlug);
  if (!fw) return [];
  const counts = new Map();
  for (const cId of Object.keys(mappings)) {
    for (const [fwSlug, clauseId] of mappings[cId]) {
      if (fwSlug !== frameworkSlug) continue;
      counts.set(clauseId, (counts.get(clauseId) || 0) + 1);
    }
  }
  return fw.clauses.map(cl => ({
    id: cl.id,
    label: cl.label,
    controls: counts.get(cl.id) || 0,
  }));
}

/* Health snapshot: contributing controls + their 7-day violations.
   Same shape as healthFor() in _data.js but on the effective graph. */
export function effectiveHealthFor(mappings, frameworkSlug, allControls) {
  const contributing = effectiveControlsByFramework(mappings, frameworkSlug, allControls);
  const violations7d = contributing.reduce((s, c) => s + (c.violations7d || 0), 0);
  return {
    controls: contributing.length,
    violations7d,
  };
}
