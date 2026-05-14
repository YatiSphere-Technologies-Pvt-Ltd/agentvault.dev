'use client';

/* SpanDrawer — right-side overlay that wraps SpanDetail.
   ──────────────────────────────────────────────────────
   In the LangSmith-style layout the trace itself takes the full content
   width. Span detail surfaces as a drawer over the right edge instead of
   a permanent third column. Same pattern we use for the approvals
   DecisionSheet — body-scroll lock, Escape to close, fade backdrop. */

import { useEffect } from 'react';
import { X } from 'lucide-react';
import SpanDetail from './SpanDetail';

export default function SpanDrawer({ open, span, currentMs, onCriticalPath, onClose }) {
  // Body scroll lock + Escape to close.
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const onKey = (e) => { if (e.key === 'Escape') onClose?.(); };
    window.addEventListener('keydown', onKey);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener('keydown', onKey);
    };
  }, [open, onClose]);

  if (!open || !span) return null;

  return (
    <>
      <button
        type="button"
        aria-label="Close span detail"
        onClick={onClose}
        className="fixed inset-0 z-40 bg-black/35 backdrop-blur-[2px] animate-fade-in"
      />
      <aside
        role="dialog"
        aria-modal="true"
        className="fixed top-0 right-0 z-50 h-full w-full max-w-[560px] bg-card border-l border-border shadow-2xl flex flex-col animate-slide-in-right"
      >
        <div className="flex items-center justify-end px-2 py-2 border-b border-border">
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="h-7 w-7 rounded text-muted-foreground hover:text-foreground hover:bg-muted flex items-center justify-center"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="flex-1 min-h-0 overflow-y-auto">
          <SpanDetail span={span} currentMs={currentMs} onCriticalPath={onCriticalPath} />
        </div>
      </aside>
    </>
  );
}
