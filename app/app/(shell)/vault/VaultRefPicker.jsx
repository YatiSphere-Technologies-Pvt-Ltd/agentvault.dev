'use client';

/* VaultRefPicker
   ──────────────
   Drop-in replacement for free-text `vault://...` inputs across the app.
   Behavior:
     • Shows the current value as a badge if it matches a known ref
     • Click → popover with searchable list of all references
     • Includes "+ Create new" link to /app/vault/new (with the entered path
       pre-filled via query param)

   Falls back to a plain text input when used in form contexts that aren't
   wired through the popover — so existing code keeps working until call
   sites are upgraded.
*/

import { useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { ChevronDown, Search, Plus, KeyRound, ExternalLink, AlertTriangle } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { useVault } from './_vaultStore';
import { backendKindById, backendTone } from './_backendCatalog';

export default function VaultRefPicker({
  value,
  onChange,
  placeholder = 'vault://service/credential',
  filterByType,           // optional — restricts the list, e.g. 'api-key'
}) {
  const { backends, refs, hydrated } = useVault();
  const backendsById = useMemo(() => new Map(backends.map(b => [b.id, b])), [backends]);

  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const wrapRef = useRef(null);

  // Resolve the current value against the index
  const matched = useMemo(
    () => refs.find(r => r.path === value),
    [refs, value],
  );

  // Close popover on outside click + Escape
  useEffect(() => {
    if (!open) return;
    const onDoc = (e) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target)) setOpen(false);
    };
    const onKey = (e) => { if (e.key === 'Escape') setOpen(false); };
    window.addEventListener('mousedown', onDoc);
    window.addEventListener('keydown', onKey);
    return () => {
      window.removeEventListener('mousedown', onDoc);
      window.removeEventListener('keydown', onKey);
    };
  }, [open]);

  const filtered = useMemo(() => {
    let list = refs;
    if (filterByType) list = list.filter(r => r.type === filterByType);
    const q = query.trim().toLowerCase();
    if (q) {
      list = list.filter(r =>
        `${r.path} ${r.description || ''} ${r.backendPath || ''}`.toLowerCase().includes(q)
      );
    }
    return list.slice(0, 12);
  }, [refs, query, filterByType]);

  const onPick = (r) => {
    onChange(r.path);
    setOpen(false);
  };

  const backend = matched ? backendsById.get(matched.backendId) : null;
  const color = backend ? backendTone(backend.kind) : 'var(--muted-foreground)';

  return (
    <div className="relative" ref={wrapRef}>
      {/* Trigger row: text input on the left, picker chevron on the right */}
      <div className="flex items-stretch gap-1.5">
        <div className="relative flex-1 min-w-0">
          <Input
            value={value || ''}
            onChange={(e) => onChange(e.target.value)}
            onFocus={() => setOpen(true)}
            placeholder={placeholder}
            className="h-8 text-[12.5px] font-mono pr-7"
          />
          <button
            type="button"
            onClick={() => setOpen(o => !o)}
            className="absolute right-1.5 top-1/2 -translate-y-1/2 h-6 w-6 rounded text-muted-foreground hover:text-foreground hover:bg-muted/50 flex items-center justify-center"
            aria-label="Pick from vault"
          >
            <ChevronDown className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      {/* Resolution badge — shown only when value matches a known ref */}
      {matched && backend && (
        <div className="mt-1 flex items-center gap-2 text-[10.5px] font-mono">
          <span className="inline-flex items-center gap-1.5 px-1.5 py-0.5 rounded border"
                style={{ borderColor: color + '55', color, background: color + '12' }}>
            <span className="h-1.5 w-1.5 rounded-full" style={{ background: color }} />
            {backend.name}
          </span>
          <span className="text-muted-foreground">v{matched.version}</span>
          <Link href={`/app/vault/${matched.id}`}
                className="text-primary hover:brightness-110 inline-flex items-center gap-1">
            Open <ExternalLink className="h-3 w-3" />
          </Link>
        </div>
      )}

      {/* Resolution warning when value looks like a vault ref but isn't in the index */}
      {value && value.startsWith('vault://') && !matched && hydrated && (
        <div className="mt-1 flex items-center gap-1.5 text-[10.5px] text-accent">
          <AlertTriangle className="h-3 w-3" />
          <span>Reference not in vault index. <Link href={`/app/vault/new?path=${encodeURIComponent(value)}`} className="underline hover:brightness-110">Register it</Link>.</span>
        </div>
      )}

      {/* Popover */}
      {open && (
        <div className="absolute z-30 mt-1 w-full min-w-80 rounded-lg border border-border bg-popover shadow-lg ring-1 ring-foreground/10 overflow-hidden">
          <div className="p-2 border-b border-border">
            <div className="relative">
              <Search className="h-3.5 w-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <Input
                autoFocus
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search references…"
                className="pl-8 h-7 text-[12px] font-mono"
              />
            </div>
          </div>
          <ul className="max-h-72 overflow-y-auto py-1">
            {filtered.length === 0 ? (
              <li className="px-3 py-4 text-center text-[11.5px] text-muted-foreground">No matches.</li>
            ) : filtered.map(r => {
              const b = backendsById.get(r.backendId);
              const c = b ? backendTone(b.kind) : 'var(--muted-foreground)';
              return (
                <li key={r.id}>
                  <button
                    type="button"
                    onClick={() => onPick(r)}
                    className="w-full text-left px-3 py-2 hover:bg-muted/40 transition-colors"
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <KeyRound className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                      <span className="text-[12px] font-mono text-foreground truncate">{r.path}</span>
                    </div>
                    <div className="mt-0.5 ml-5 flex items-center gap-2 text-[10.5px] font-mono text-muted-foreground">
                      <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded border"
                            style={{ borderColor: c + '55', color: c, background: c + '12' }}>
                        <span className="h-1 w-1 rounded-full" style={{ background: c }} />
                        {b?.name || r.backendId}
                      </span>
                      <span>v{r.version}</span>
                      {r.status !== 'active' && (
                        <span className="text-accent">· {r.status}</span>
                      )}
                    </div>
                  </button>
                </li>
              );
            })}
          </ul>
          <div className="border-t border-border p-1">
            <Link
              href={value && value.startsWith('vault://') ? `/app/vault/new?path=${encodeURIComponent(value)}` : '/app/vault/new'}
              onClick={() => setOpen(false)}
              className="flex items-center gap-2 px-3 py-2 rounded text-[12px] text-primary hover:bg-muted/40"
            >
              <Plus className="h-3.5 w-3.5" />
              Register a new reference
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
