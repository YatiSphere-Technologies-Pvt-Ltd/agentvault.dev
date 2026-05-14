'use client';

import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { useMemo } from 'react';
import { ArrowLeft } from 'lucide-react';
import { GovernHeader } from '../../../_shared';
import { useAssets, updateAsset } from '../../../_store';
import AssetForm from '../../_AssetForm';

export default function EditAssetPage() {
  const { id } = useParams();
  const router = useRouter();
  const assets = useAssets();
  const asset = useMemo(() => assets.find(a => a.id === id) || null, [assets, id]);

  if (!asset) {
    return (
      <>
        <GovernHeader title="AI Inventory" />
        <div className="max-w-[1680px] mx-auto px-4 sm:px-6 lg:px-8 py-7">
          <div className="rounded-lg border border-dashed border-border bg-card px-6 py-10 text-center">
            <div className="text-[13px] font-medium text-foreground">Asset not found</div>
            <Link href="/app/govern/inventory" className="mt-4 inline-block text-[12px] text-primary hover:underline">All assets →</Link>
          </div>
        </div>
      </>
    );
  }

  const onSubmit = (values) => {
    updateAsset(asset.id, values);
    router.push(`/app/govern/inventory/${asset.id}`);
  };

  // Only the fields the form actually edits. Other fields (traffic
  // counts, first/last_seen, policy_refs) are preserved by updateAsset's
  // patch semantics.
  const initial = {
    name: asset.name,
    type: asset.type,
    vendor: asset.vendor || '',
    model_family: asset.model_family || '',
    owner: asset.owner || '',
    department: asset.department || '',
    risk_class: asset.risk_class,
    approval_state: asset.approval_state,
    destination_class: asset.destination_class,
    data_categories: asset.data_categories || [],
    notes: asset.notes || '',
  };

  return (
    <>
      <GovernHeader title="AI Inventory" />
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-7 space-y-5">
        <Link
          href={`/app/govern/inventory/${asset.id}`}
          className="text-[12px] text-muted-foreground hover:text-foreground inline-flex items-center gap-1.5"
        >
          <ArrowLeft className="h-3.5 w-3.5" /> Back to asset
        </Link>

        <div>
          <div className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground font-mono">Edit</div>
          <h2 className="text-[18px] font-semibold text-foreground mt-0.5">{asset.name}</h2>
          <p className="text-[12.5px] text-muted-foreground mt-0.5">
            Update classification, ownership, and observed data categories. Traffic counts and
            discovery metadata stay intact.
          </p>
        </div>

        <AssetForm
          mode="edit"
          initial={initial}
          onSubmit={onSubmit}
          onCancel={() => router.push(`/app/govern/inventory/${asset.id}`)}
        />
      </div>
    </>
  );
}
