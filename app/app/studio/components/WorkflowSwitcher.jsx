'use client';

import { useEffect, useRef, useState } from 'react';
import { WORKFLOW_TEMPLATES } from './_workflowStore';

/* Top-bar dropdown that shows the current workflow and lets the user:
    - Switch to another workflow
    - Create a new one (blank or from a template)
    - Duplicate / rename / delete the current one
   All presentation only — handlers are passed in from StudioApp. */
export default function WorkflowSwitcher({
  list, currentId, onSwitch, onCreate, onDuplicate, onRename, onRemove,
}) {
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState('list');  // 'list' | 'new' | 'rename'
  const [draftName, setDraftName] = useState('');
  const [draftTemplate, setDraftTemplate] = useState('blank');
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

  const startNew = () => { setDraftName(''); setDraftTemplate('blank'); setMode('new'); };
  const startRename = () => { setDraftName(current?.name || ''); setMode('rename'); };

  const submitNew = () => {
    if (!draftName.trim()) return;
    onCreate({ name: draftName.trim(), template: draftTemplate });
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
    if (typeof window !== 'undefined' && !window.confirm(`Delete "${current.name}"? This can't be undone.`)) return;
    onRemove(current.id);
    setOpen(false);
    setMode('list');
  };

  return (
    <div className="relative" ref={ref}>
      {/* Trigger */}
      <button
        onClick={() => setOpen(o => !o)}
        className="flex items-center gap-1.5 hover:bg-muted rounded px-1.5 py-0.5 transition-colors"
        aria-haspopup="menu"
        aria-expanded={open}
      >
        <span className="text-[14px] font-semibold text-foreground truncate max-w-[260px]">{current?.name || 'Select workflow'}</span>
        <svg width="10" height="10" viewBox="0 0 12 12" fill="currentColor" className={`text-muted-foreground transition-transform ${open ? 'rotate-180' : ''}`}>
          <path d="M6 8L2 4h8z"/>
        </svg>
      </button>
      <div className="text-[10.5px] text-muted-foreground font-mono px-1.5 flex items-center gap-1.5 whitespace-nowrap">
        <span>{list.length} workflow{list.length === 1 ? '' : 's'}</span>
        <span className="text-accent">● autosaved</span>
      </div>

      {/* Menu */}
      {open && (
        <div
          role="menu"
          className="absolute top-full left-0 mt-2 w-80 rounded-md border border-border bg-panel shadow-lg py-1 z-50"
        >
          {mode === 'list' && (
            <>
              <div className="px-3 pt-2 pb-1 text-[9.5px] uppercase tracking-[0.18em] font-mono text-muted-foreground">Workflows</div>
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
                          {w.id} · updated {new Date(w.updatedAt).toLocaleDateString()}
                        </div>
                      </div>
                      {active && <span className="text-[10px] text-primary font-mono">current</span>}
                    </button>
                  );
                })}
              </div>
              <div className="my-1 h-px bg-border" />
              <button onClick={startNew} className="w-full flex items-center gap-2 px-3 py-2 text-[12.5px] text-foreground hover:bg-muted transition-colors">
                <span className="text-primary">+</span> New workflow
              </button>
              <button onClick={() => { onDuplicate(currentId); setOpen(false); }} disabled={!current} className="w-full flex items-center gap-2 px-3 py-2 text-[12.5px] text-foreground hover:bg-muted transition-colors disabled:opacity-40 disabled:cursor-not-allowed">
                <span className="text-muted-foreground">⎘</span> Duplicate current
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
                  placeholder="e.g. Claims triage"
                  className="w-full px-2.5 py-1.5 bg-background border border-border rounded-md text-[12.5px] focus:outline-none focus:border-primary"
                />
              </div>
              <div>
                <div className="text-[9.5px] uppercase tracking-[0.18em] font-mono text-muted-foreground mb-1">Start from</div>
                <div className="space-y-1.5">
                  {WORKFLOW_TEMPLATES.map(t => (
                    <button
                      key={t.id}
                      type="button"
                      onClick={() => setDraftTemplate(t.id)}
                      className={`w-full text-left p-2 rounded-md border transition-colors ${
                        draftTemplate === t.id ? 'border-primary bg-primary/5' : 'border-border hover:bg-muted/50'
                      }`}
                    >
                      <div className="text-[12.5px] font-medium text-foreground">{t.label}</div>
                      <div className="text-[10.5px] text-muted-foreground">{t.desc}</div>
                    </button>
                  ))}
                </div>
              </div>
              <div className="flex items-center justify-between pt-1">
                <button onClick={() => setMode('list')} className="text-[11.5px] text-muted-foreground hover:text-foreground">Back</button>
                <button
                  onClick={submitNew}
                  disabled={!draftName.trim()}
                  className="btn-primary text-[11.5px] px-3 py-1 rounded-md font-medium disabled:opacity-50 disabled:cursor-not-allowed"
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
                  className="btn-primary text-[11.5px] px-3 py-1 rounded-md font-medium disabled:opacity-50 disabled:cursor-not-allowed"
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
