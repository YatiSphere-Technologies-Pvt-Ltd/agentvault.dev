'use client';

import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { useMemo } from 'react';
import { ArrowLeft } from 'lucide-react';
import { RedTeamHeader } from '../../../_shared';
import { useTargets, updateTarget } from '../../../_store';
import TargetForm from '../../_TargetForm';

export default function EditTargetPage() {
  const { id } = useParams();
  const router = useRouter();
  const targets = useTargets();
  const target = useMemo(() => targets.find(t => t.id === id) || null, [targets, id]);

  if (!target) {
    return (
      <>
        <RedTeamHeader title="Targets" />
        <div className="max-w-[1680px] mx-auto px-4 sm:px-6 lg:px-8 py-7">
          <div className="rounded-lg border border-dashed border-border bg-card px-6 py-10 text-center">
            <div className="text-[13px] font-medium text-foreground">Target not found</div>
            <Link href="/app/redteam/targets" className="mt-4 inline-block text-[12px] text-primary hover:underline">All targets →</Link>
          </div>
        </div>
      </>
    );
  }

  const onSubmit = (values) => {
    // Status is not edited in the form (lifecycle moves through dedicated
    // buttons on the detail page); preserve whatever it was.
    const { status: _ignore, ...patch } = values;
    updateTarget(target.id, patch);
    router.push(`/app/redteam/targets/${target.id}`);
  };

  return (
    <>
      <RedTeamHeader title="Targets" />
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-7 space-y-5">
        <Link
          href={`/app/redteam/targets/${target.id}`}
          className="text-[12px] text-muted-foreground hover:text-foreground inline-flex items-center gap-1.5"
        >
          <ArrowLeft className="h-3.5 w-3.5" /> Back to target
        </Link>

        <div>
          <div className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground font-mono">Edit</div>
          <h2 className="text-[18px] font-semibold text-foreground mt-0.5">{target.name}</h2>
          <p className="text-[12.5px] text-muted-foreground mt-0.5">
            Update adapter config, scope, and the consent record. Lifecycle status is changed
            from the Activate / Pause / Archive buttons on the detail page.
          </p>
        </div>

        <TargetForm
          mode="edit"
          initial={target}
          onSubmit={onSubmit}
          onCancel={() => router.push(`/app/redteam/targets/${target.id}`)}
        />
      </div>
    </>
  );
}
