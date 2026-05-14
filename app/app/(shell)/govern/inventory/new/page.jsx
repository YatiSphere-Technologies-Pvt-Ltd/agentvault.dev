'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';
import { GovernHeader } from '../../_shared';
import { createAsset, newAssetId } from '../../_store';
import AssetForm from '../_AssetForm';

export default function NewAssetPage() {
  const router = useRouter();

  const onSubmit = (values) => {
    const now = Date.now();
    const record = {
      ...values,
      id: newAssetId(),
      // Marker so the detail page can offer Delete (auto-discovered rows
      // are kept for audit trail).
      discovered_via: 'manual',
      first_seen_at: now,
      last_seen_at:  now,
      user_count_7d: 0,
      traffic_events_7d: 0,
      runs_7d: 0,
      cost_7d_usd: 0,
      policy_refs: [],
    };
    createAsset(record);
    router.push(`/app/govern/inventory/${record.id}`);
  };

  return (
    <>
      <GovernHeader title="AI Inventory" />
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-7 space-y-5">
        <Link
          href="/app/govern/inventory"
          className="text-[12px] text-muted-foreground hover:text-foreground inline-flex items-center gap-1.5"
        >
          <ArrowLeft className="h-3.5 w-3.5" /> All assets
        </Link>

        <div>
          <div className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground font-mono">Register</div>
          <h2 className="text-[18px] font-semibold text-foreground mt-0.5">Add an AI asset to inventory</h2>
          <p className="text-[12.5px] text-muted-foreground mt-0.5 max-w-[68ch]">
            Use this for AI tools you know about but a connector hasn’t discovered yet — pilots,
            sanctioned SaaS, or anything you want to govern explicitly.
          </p>
        </div>

        <AssetForm
          mode="create"
          onSubmit={onSubmit}
          onCancel={() => router.push('/app/govern/inventory')}
        />
      </div>
    </>
  );
}
