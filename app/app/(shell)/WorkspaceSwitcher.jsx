'use client';

import { useEffect, useRef, useState } from 'react';

/* Sidebar workspace chip + dropdown.
   Drives the useWorkspaces() hook from the parent — this component is purely
   presentational and close-on-outside-click. Same shape as the Studio
   WorkflowSwitcher. */
export default function WorkspaceSwitcher({
  list, currentId, onSwitch, onCreate, onRename, onRemove,
}) {
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState('list');   // 'list' | 'new' | 'rename'
  const [draftName, setDraftName] = useState('');
  const [draftRegion, setDraftRegion] = useState('ap-south-1');
  const ref = useRef(null);

  const current = list.find(w => w.id === currentId);

  useEffect(() => {
    if (!open) return;
    const onClick = (e) => { if (ref.current && !ref.current.contains(e.target)) { setOpen(false); setMode('list'); } };
    const onKey   = (e) => { if (e.key === 'Escape') { setOpen(false); setMode('list'); } };
    document.addEventListener('mousedown', onClick);
    document.addEventListener('keydown',   onKey);
    return () => { document.removeEventListener('mousedown', onClick); document.removeEventListener('keydown', onKey); };
  }, [open]);

  const startNew = () => { setDraftName(''); setDraftRegion('ap-south-1'); setMode('new'); };
  const startRename = () => { setDraftName(current?.name || ''); setMode('rename'); };

  const submitNew = () => {
    if (!draftName.trim()) return;
    onCreate({ name: draftName.trim(), region: draftRegion });
    setOpen(false);
    setMode('list');
  };
  const submitRename = () => {
    if (!draftName.trim() || !current) return;
    onRename(current.id, draftName.trim());
    setOpen(false);
    setMode('list');
  };
  const handleDelete = () => {
    if (!current) return;
    if (list.length <= 1) return;
    if (typeof window !== 'undefined' && !window.confirm(`Delete "${current.name}"? Agents and runs are stored per browser — this can't be undone.`)) return;
    onRemove(current.id);
    setOpen(false);
    setMode('list');
  };

  return (
    <div className="relative" ref={ref}>
      {/* Trigger — matches the old sidebar chip styling. */}
      <button
        onClick={() => setOpen(o => !o)}
        aria-haspopup="menu"
        aria-expanded={open}
        className="w-full px-2.5 py-2 rounded-md border border-border bg-hero-bg hover:border-primary/40 transition-colors text-left group"
      >
        <div className="text-[9.5px] uppercase tracking-[0.18em] text-muted-foreground font-mono">Workspace</div>
        <div className="flex items-center justify-between mt-0.5">
          <span className="text-[12.5px] font-medium text-foreground truncate">{current?.name || 'Personal'}</span>
          <svg
            width="11" height="11" viewBox="0 0 12 12" fill="currentColor"
            className={`text-muted-foreground group-hover:text-foreground transition-transform ${open ? 'rotate-180' : ''}`}
          >
            <path d="M6 8L2 4h8z"/>
          </svg>
        </div>
      </button>

      {/* Menu */}
      {open && (
        <div
          role="menu"
          className="absolute top-full left-0 right-0 mt-2 w-[280px] rounded-md border border-border bg-panel shadow-lg py-1 z-50"
        >
          {mode === 'list' && (
            <>
              <div className="px-3 pt-2 pb-1 text-[9.5px] uppercase tracking-[0.18em] font-mono text-muted-foreground">Workspaces</div>
              <div className="max-h-[50vh] overflow-y-auto">
                {list.map(w => {
                  const active = w.id === currentId;
                  return (
                    <button
                      key={w.id}
                      onClick={() => { onSwitch(w.id); setOpen(false); }}
                      className={`w-full flex items-start gap-2 px-3 py-2 text-left hover:bg-muted transition-colors ${active ? 'bg-primary/5' : ''}`}
                    >
                      <span className={`mt-1 h-1.5 w-1.5 rounded-full ${active ? 'bg-primary' : 'bg-border'}`} />
                      <div className="min-w-0 flex-1">
                        <div className="text-[12.5px] font-medium text-foreground truncate">{w.name}</div>
                        <div className="text-[10.5px] text-muted-foreground font-mono truncate">
                          {w.region} · {w.defaultLLM}
                        </div>
                      </div>
                      {active && <span className="text-[10px] text-primary font-mono">current</span>}
                    </button>
                  );
                })}
              </div>
              <div className="my-1 h-px bg-border" />
              <button onClick={startNew} className="w-full flex items-center gap-2 px-3 py-2 text-[12.5px] text-foreground hover:bg-muted transition-colors">
                <span className="text-primary">+</span> New workspace
              </button>
              <button onClick={startRename} disabled={!current} className="w-full flex items-center gap-2 px-3 py-2 text-[12.5px] text-foreground hover:bg-muted transition-colors disabled:opacity-40 disabled:cursor-not-allowed">
                <span className="text-muted-foreground">✎</span> Rename current
              </button>
              <div className="my-1 h-px bg-border" />
              <button onClick={handleDelete} disabled={!current || list.length <= 1} className="w-full flex items-center gap-2 px-3 py-2 text-[12.5px] text-destructive hover:bg-muted transition-colors disabled:opacity-40 disabled:cursor-not-allowed">
                <span>×</span> Delete current
              </button>
            </>
          )}

          {mode === 'new' && (
            <div className="p-3 space-y-3">
              <div>
                <div className="text-[9.5px] uppercase tracking-[0.18em] font-mono text-muted-foreground mb-1">Name</div>
                <input
                  autoFocus
                  value={draftName}
                  onChange={e => setDraftName(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter') submitNew(); }}
                  placeholder="e.g. Finance ops"
                  className="w-full px-2.5 py-1.5 bg-background border border-border rounded-md text-[12.5px] focus:outline-none focus:border-primary"
                />
              </div>
              <div>
                <div className="text-[9.5px] uppercase tracking-[0.18em] font-mono text-muted-foreground mb-1">Region</div>
                <select
                  value={draftRegion}
                  onChange={e => setDraftRegion(e.target.value)}
                  className="w-full px-2.5 py-1.5 bg-background border border-border rounded-md text-[12.5px] focus:outline-none focus:border-primary"
                >
                  <option value="ap-south-1">ap-south-1 · Mumbai</option>
                  <option value="us-east-1">us-east-1 · Virginia</option>
                  <option value="eu-west-1">eu-west-1 · Ireland</option>
                  <option value="eu-central-1">eu-central-1 · Frankfurt</option>
                  <option value="ap-southeast-1">ap-southeast-1 · Singapore</option>
                </select>
              </div>
              <div className="flex items-center justify-between pt-1">
                <button onClick={() => setMode('list')} className="text-[11.5px] text-muted-foreground hover:text-foreground">Back</button>
                <button
                  onClick={submitNew}
                  disabled={!draftName.trim()}
                  className="text-[11.5px] px-3 py-1 rounded-md font-medium bg-primary text-primary-foreground hover:brightness-110 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Create
                </button>
              </div>
            </div>
          )}

          {mode === 'rename' && (
            <div className="p-3 space-y-3">
              <div>
                <div className="text-[9.5px] uppercase tracking-[0.18em] font-mono text-muted-foreground mb-1">New name</div>
                <input
                  autoFocus
                  value={draftName}
                  onChange={e => setDraftName(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter') submitRename(); }}
                  className="w-full px-2.5 py-1.5 bg-background border border-border rounded-md text-[12.5px] focus:outline-none focus:border-primary"
                />
              </div>
              <div className="flex items-center justify-between">
                <button onClick={() => setMode('list')} className="text-[11.5px] text-muted-foreground hover:text-foreground">Back</button>
                <button
                  onClick={submitRename}
                  disabled={!draftName.trim()}
                  className="text-[11.5px] px-3 py-1 rounded-md font-medium bg-primary text-primary-foreground hover:brightness-110 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Rename
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
