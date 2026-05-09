'use client';

/* Cross-link card from a run page into the approvals inbox.
   Surfaces any approval tasks tied to this run. Open tasks render as
   action chips that open the same DecisionSheet the inbox uses, so an
   on-screen approver decides without leaving the run. Decided tasks
   render as audit summaries.

   Hidden entirely when there are no tasks — keeps the run page clean for
   fully autonomous runs that never paused. */

import Link from 'next/link';
import { useMemo, useState } from 'react';
import { Inbox, ExternalLink, Hand, ShieldAlert, FileLock2, Bot, Hourglass, Check, Ban, Clock, Forward, Compass, Wand2 } from 'lucide-react';
import { useApprovals, TRIGGER_KIND, TRIGGER_TOOL, isOpen, deadlineState } from '../../approvals/_store';
import DecisionSheet from '../../approvals/_DecisionSheet';

const TRIGGER_ICON = {
  before_run:  ShieldAlert,
  before_tool: Hand,
  after_run:   FileLock2,
  on_demand:   Bot,
};

const STATUS_TONE = {
  pending:    'border-primary/40 text-primary bg-primary/10',
  claimed:    'border-accent/50 text-accent bg-accent/10',
  approved:   'border-(--brand-teal)/40 text-brand-teal bg-(--brand-teal)/10',
  rejected:   'border-destructive/40 text-destructive bg-destructive/10',
  expired:    'border-muted-foreground/40 text-muted-foreground bg-muted/40',
  escalated:  'border-destructive/40 text-destructive bg-destructive/10',
  redirected: 'border-accent/50 text-accent bg-accent/10',
};

const STATUS_ICON = {
  pending:    Hourglass,
  claimed:    Hand,
  approved:   Check,
  rejected:   Ban,
  expired:    Clock,
  escalated:  Forward,
  redirected: Compass,
};

export default function ApprovalsForRun({ runId }) {
  const tasks = useApprovals();
  const runTasks = useMemo(() => tasks.filter(t => t.run_id === runId), [tasks, runId]);
  const [openId, setOpenId] = useState(null);

  if (runTasks.length === 0) return null;

  const open = runTasks.filter(isOpen);
  const decided = runTasks.filter(t => !isOpen(t));

  return (
    <>
      <div className="rounded-xl border border-primary/30 bg-primary/[0.03] overflow-hidden">
        <div className="px-4 py-2.5 border-b border-primary/20 bg-primary/[0.05] flex items-center gap-2">
          <Inbox className="h-3.5 w-3.5 text-primary" />
          <span className="text-[12px] font-medium text-foreground">Human approvals on this run</span>
          <span className="text-[10.5px] font-mono text-muted-foreground">
            · {open.length} open · {decided.length} decided
          </span>
          <Link
            href="/app/approvals"
            className="ml-auto inline-flex items-center gap-1 text-[11.5px] text-primary hover:underline"
          >
            Inbox <ExternalLink className="h-3 w-3" />
          </Link>
        </div>

        <div className="divide-y divide-border">
          {[...open, ...decided].map(t => {
            const kind = TRIGGER_KIND(t);
            const Icon = TRIGGER_ICON[kind] || ShieldAlert;
            const StatusIcon = STATUS_ICON[t.status] || Hourglass;
            const dl = deadlineState(t);
            const dlMs = t.deadline_at - Date.now();
            return (
              <button
                key={t.id}
                type="button"
                onClick={() => setOpenId(t.id)}
                className="w-full text-left px-4 py-3 flex items-start gap-3 hover:bg-primary/[0.04] transition-colors"
              >
                <Icon className="h-3.5 w-3.5 text-muted-foreground mt-0.5 shrink-0" />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded border text-[10.5px] font-medium ${STATUS_TONE[t.status]}`}>
                      <StatusIcon className="h-3 w-3" />
                      {t.status}
                    </span>
                    {kind === 'before_tool' && (
                      <span className="text-[10.5px] font-mono text-accent">{TRIGGER_TOOL(t)}</span>
                    )}
                    {isOpen(t) && (dl === 'breaching' || dl === 'expired') && (
                      <span className="text-[10px] font-mono text-destructive">
                        {dl === 'expired' ? 'past deadline' : 'breaching SLA'}
                      </span>
                    )}
                  </div>
                  <div className="mt-1 text-[12.5px] text-foreground line-clamp-2">{t.preview}</div>
                  {(t.guidance || t.redirect) && (
                    <div className="mt-1.5 flex items-center gap-1.5 flex-wrap">
                      {t.guidance && (
                        <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded border border-primary/40 bg-primary/10 text-primary text-[10px] font-mono">
                          <Wand2 className="h-2.5 w-2.5" /> guidance
                        </span>
                      )}
                      {t.redirect && (
                        <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded border border-accent/40 bg-accent/10 text-accent text-[10px] font-mono">
                          <Compass className="h-2.5 w-2.5" />
                          redirect{t.redirect.kind ? ` · ${t.redirect.kind}` : ''}
                        </span>
                      )}
                    </div>
                  )}
                  <div className="mt-1 text-[10.5px] font-mono text-muted-foreground">
                    {t.approvers}
                    {isOpen(t) && t.deadline_at && ` · deadline in ${fmtRel(dlMs)}`}
                    {!isOpen(t) && t.decided_at && ` · ${t.decision} by ${t.decided_by}`}
                  </div>
                </div>
                <span className="text-[11px] text-primary shrink-0 mt-1">Open →</span>
              </button>
            );
          })}
        </div>
      </div>

      <DecisionSheet open={openId != null} taskId={openId} onClose={() => setOpenId(null)} />
    </>
  );
}

function fmtRel(ms) {
  const abs = Math.abs(ms);
  const mins = Math.round(abs / 60_000);
  if (mins < 1) return ms >= 0 ? '< 1m' : 'past';
  if (mins < 60) return `${mins}m`;
  const hrs = Math.floor(mins / 60);
  const remM = mins % 60;
  if (hrs < 24) return remM ? `${hrs}h ${remM}m` : `${hrs}h`;
  return `${Math.floor(hrs / 24)}d`;
}
