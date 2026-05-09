'use client';

/* Standalone deep-link page for a single approval task.
   Slack DMs and email pings link straight here so the human can act
   without first navigating the inbox. Renders the same DecisionContent
   the right-side sheet does, just full-bleed. */

import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useMemo } from 'react';
import { ArrowLeft } from 'lucide-react';
import { useApprovals, useTimeoutSweep } from '../_store';
import { DecisionContent } from '../_DecisionSheet';

export default function ApprovalDeepLinkPage() {
  const { id } = useParams();
  useTimeoutSweep();
  const tasks = useApprovals();
  const task = useMemo(() => tasks.find(t => t.id === id) || null, [tasks, id]);

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-7">
      <Link
        href="/app/approvals"
        className="text-[12px] text-muted-foreground hover:text-foreground inline-flex items-center gap-1.5"
      >
        <ArrowLeft className="h-3.5 w-3.5" /> All approvals
      </Link>

      {!task ? (
        <div className="mt-8 rounded-lg border border-dashed border-border bg-card px-6 py-10 text-center">
          <div className="text-[13px] font-medium text-foreground">Task not found</div>
          <div className="text-[12px] text-muted-foreground mt-1">
            It may have been removed, or the id is wrong. Try the inbox.
          </div>
        </div>
      ) : (
        <div className="mt-4 rounded-xl border border-border bg-card overflow-hidden">
          <DecisionContent task={task} asPage />
        </div>
      )}
    </div>
  );
}
