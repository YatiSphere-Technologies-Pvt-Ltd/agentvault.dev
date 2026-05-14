'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';
import { RedTeamHeader } from '../../_shared';
import { createTarget, newTargetId } from '../../_store';
import TargetForm from '../_TargetForm';

export default function NewTargetPage() {
  const router = useRouter();

  const onSubmit = (values) => {
    const now = Date.now();
    const record = {
      ...values,
      id: newTargetId(),
      // Manually-created targets land in `draft` until an operator
      // explicitly Activates them from the detail page.
      status: 'draft',
      last_tested_at: null,
      posture_score: null,
      consent_record: {
        ...values.consent_record,
        granted_at: now,
      },
      created_at: now,
    };
    createTarget(record);
    router.push(`/app/redteam/targets/${record.id}`);
  };

  return (
    <>
      <RedTeamHeader title="Targets" />
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-7 space-y-5">
        <Link
          href="/app/redteam/targets"
          className="text-[12px] text-muted-foreground hover:text-foreground inline-flex items-center gap-1.5"
        >
          <ArrowLeft className="h-3.5 w-3.5" /> All targets
        </Link>

        <div>
          <div className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground font-mono">Register</div>
          <h2 className="text-[18px] font-semibold text-foreground mt-0.5">Add a red-team target</h2>
          <p className="text-[12.5px] text-muted-foreground mt-0.5 max-w-[68ch]">
            Register an agent, chat endpoint, RAG pipeline, MCP server, or browser-chat so
            attack suites can be bound to it. The target starts in <span className="font-mono">draft</span> —
            no runs execute until you Activate it from the detail page.
          </p>
        </div>

        <TargetForm
          mode="create"
          onSubmit={onSubmit}
          onCancel={() => router.push('/app/redteam/targets')}
        />
      </div>
    </>
  );
}
