'use client';

import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Search, Layers } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { DataTable } from '@/components/tables/DataTable';
import { FacetFilterBar } from '@/components/tables/FacetFilter';
import { GovernHeader, RiskPill, ApprovalPill, AssetTypePill, DestinationPill, fmtAgo, fmtNum } from '../_shared';
import { useAssets, approveAsset, quarantineAsset, blockAsset } from '../_store';
import { ASSET_TYPES, RISK_CLASSES, APPROVAL_STATES, DESTINATION_CLASSES } from '../_connectorCatalog';

const TYPE_OPTIONS = Object.entries(ASSET_TYPES).map(([v, m]) => ({ value: v, label: m.label, color: m.accent }));
const RISK_OPTIONS = Object.entries(RISK_CLASSES).map(([v, m]) => ({ value: v, label: m.label, color: m.accent }));
const APPROVAL_OPTIONS = Object.entries(APPROVAL_STATES).map(([v, m]) => ({ value: v, label: m.label, color: m.accent }));
const DEST_OPTIONS = Object.entries(DESTINATION_CLASSES).map(([v, m]) => ({ value: v, label: m.label, color: m.accent }));

export default function InventoryPage() {
  const router = useRouter();
  const assets = useAssets();
  const [globalFilter, setGlobalFilter] = useState('');
  const [typeSel, setTypeSel] = useState(new Set());
  const [riskSel, setRiskSel] = useState(new Set());
  const [approvalSel, setApprovalSel] = useState(new Set());
  const [destSel, setDestSel] = useState(new Set());

  // Department facet — derive from data
  const deptOptions = useMemo(() => {
    const seen = new Set();
    assets.forEach(a => seen.add(a.department || 'Unattributed'));
    return Array.from(seen).map(d => ({ value: d, label: d }));
  }, [assets]);
  const [deptSel, setDeptSel] = useState(new Set());

  const data = useMemo(() => assets.filter(a => {
    if (typeSel.size     > 0 && !typeSel.has(a.type))                return false;
    if (riskSel.size     > 0 && !riskSel.has(a.risk_class))         return false;
    if (approvalSel.size > 0 && !approvalSel.has(a.approval_state)) return false;
    if (destSel.size     > 0 && !destSel.has(a.destination_class)) return false;
    if (deptSel.size     > 0 && !deptSel.has(a.department || 'Unattributed')) return false;
    return true;
  }), [assets, typeSel, riskSel, approvalSel, destSel, deptSel]);

  const stats = useMemo(() => {
    const totalUsers = data.reduce((s, a) => s + (a.user_count_7d || 0), 0);
    const totalEvents = data.reduce((s, a) => s + (a.traffic_events_7d || 0), 0);
    const restricted = data.filter(a => a.risk_class === 'restricted').length;
    return { totalUsers, totalEvents, restricted };
  }, [data]);

  const columns = useMemo(() => ([
    {
      id: 'sno',
      header: '#',
      cell: ({ row, table }) => {
        const ps = table.getState().pagination;
        const idx = ps ? ps.pageIndex * ps.pageSize + row.index + 1 : row.index + 1;
        return <span className="font-mono tabular-nums text-muted-foreground text-[11.5px]">{idx}</span>;
      },
      enableSorting: false,
      enableGlobalFilter: false,
      enableHiding: false,
      size: 44,
    },
    {
      id: 'name',
      accessorFn: (a) => a.name,
      header: 'Asset',
      cell: ({ row }) => (
        <div className="min-w-0">
          <div className="text-[12.5px] font-medium text-foreground truncate">{row.original.name}</div>
          <div className="text-[10.5px] font-mono text-muted-foreground truncate">{row.original.vendor} · {row.original.model_family || '—'}</div>
        </div>
      ),
      filterFn: (row, _id, q) => {
        if (!q) return true;
        const s = String(q).toLowerCase();
        const r = row.original;
        return r.name.toLowerCase().includes(s) || r.vendor.toLowerCase().includes(s) || (r.model_family || '').toLowerCase().includes(s);
      },
    },
    {
      id: 'type',
      accessorFn: (a) => a.type,
      header: 'Type',
      cell: ({ row }) => <AssetTypePill type={row.original.type} />,
      enableGlobalFilter: false,
    },
    {
      id: 'risk',
      accessorFn: (a) => a.risk_class,
      header: 'Risk',
      cell: ({ row }) => <RiskPill risk={row.original.risk_class} />,
      enableGlobalFilter: false,
    },
    {
      id: 'approval',
      accessorFn: (a) => a.approval_state,
      header: 'Approval',
      cell: ({ row }) => <ApprovalPill state={row.original.approval_state} />,
      enableGlobalFilter: false,
    },
    {
      id: 'destination',
      accessorFn: (a) => a.destination_class,
      header: 'Destination',
      cell: ({ row }) => <DestinationPill destination={row.original.destination_class} />,
      enableGlobalFilter: false,
    },
    {
      id: 'department',
      accessorFn: (a) => a.department || 'Unattributed',
      header: 'Department',
      cell: ({ getValue }) => (
        <span className="font-mono text-[11.5px] text-foreground truncate block max-w-32">{getValue()}</span>
      ),
      enableGlobalFilter: false,
    },
    {
      id: 'users',
      accessorFn: (a) => a.user_count_7d ?? 0,
      header: 'Users · 7d',
      meta: { align: 'right' },
      cell: ({ getValue }) => <span className="font-mono tabular-nums text-[12px] text-foreground">{fmtNum(getValue())}</span>,
      enableGlobalFilter: false,
    },
    {
      id: 'events',
      accessorFn: (a) => a.traffic_events_7d ?? 0,
      header: 'Events · 7d',
      meta: { align: 'right' },
      cell: ({ getValue }) => <span className="font-mono tabular-nums text-[12px] text-foreground">{fmtNum(getValue())}</span>,
      enableGlobalFilter: false,
    },
    {
      id: 'lastSeen',
      accessorFn: (a) => a.last_seen_at ?? 0,
      header: 'Last seen',
      meta: { align: 'right' },
      cell: ({ row }) => <span className="font-mono tabular-nums text-[11.5px] text-muted-foreground">{fmtAgo(row.original.last_seen_at)}</span>,
      enableGlobalFilter: false,
    },
  ]), []);

  const clearAll = () => {
    setTypeSel(new Set());
    setRiskSel(new Set());
    setApprovalSel(new Set());
    setDestSel(new Set());
    setDeptSel(new Set());
  };

  return (
    <>
      <GovernHeader />
      <div className="max-w-[1680px] mx-auto px-4 sm:px-6 lg:px-8 py-7 space-y-5">
        <div className="flex items-end justify-between gap-3 flex-wrap">
          <div>
            <div className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground font-mono">Catalog</div>
            <h2 className="text-[16px] font-semibold text-foreground mt-0.5">AI Inventory</h2>
            <p className="text-[12.5px] text-muted-foreground mt-0.5 max-w-[80ch]">
              Every AI asset, internal or external. Click any row to triage —
              approve, quarantine, block, or set risk class. The same record is the
              join key for events, policies, and audit reports.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          <Stat label="Assets"          value={String(assets.length)} icon={<Layers className="h-3.5 w-3.5" />} />
          <Stat label="Users · 7d"      value={fmtNum(stats.totalUsers)} sub="across filtered" />
          <Stat label="Events · 7d"     value={fmtNum(stats.totalEvents)} />
          <Stat label="Restricted-class" value={String(stats.restricted)} tone={stats.restricted ? 'bad' : 'default'} />
        </div>

        <DataTable
          columns={columns}
          data={data}
          globalFilter={globalFilter}
          onGlobalFilterChange={setGlobalFilter}
          onRowClick={(a) => router.push(`/app/govern/inventory/${a.id}`)}
          minWidth="min-w-[1280px]"
          emptyMessage="No assets match these filters."
          initialSorting={[{ id: 'risk', desc: true }]}
          pageSize={25}
          toolbar={
            <div className="relative w-full max-w-xs">
              <Search className="h-3.5 w-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={globalFilter}
                onChange={(e) => setGlobalFilter(e.target.value)}
                placeholder="Search by name, vendor, model…"
                className="pl-8 h-8 text-[12.5px]"
              />
            </div>
          }
          filters={
            <FacetFilterBar
              filters={[
                { title: 'Type',        options: TYPE_OPTIONS,     selected: typeSel,     onChange: setTypeSel },
                { title: 'Risk',        options: RISK_OPTIONS,     selected: riskSel,     onChange: setRiskSel },
                { title: 'Approval',    options: APPROVAL_OPTIONS, selected: approvalSel, onChange: setApprovalSel },
                { title: 'Destination', options: DEST_OPTIONS,     selected: destSel,     onChange: setDestSel },
                { title: 'Department',  options: deptOptions,      selected: deptSel,     onChange: setDeptSel },
              ]}
              onClearAll={clearAll}
            />
          }
        />
      </div>
    </>
  );
}

function Stat({ label, value, sub, tone = 'default', icon }) {
  const color = tone === 'bad'  ? 'text-destructive'
              : tone === 'warn' ? 'text-primary'
              : tone === 'ok'   ? 'text-brand-teal'
              :                   'text-foreground';
  return (
    <div className="rounded-lg border border-border bg-card px-3 py-2">
      <div className="text-[10.5px] font-medium uppercase tracking-[0.1em] text-muted-foreground inline-flex items-center gap-1.5">
        {icon}
        {label}
      </div>
      <div className="mt-0.5 flex items-baseline gap-1.5">
        <div className={`text-[17px] font-semibold tabular-nums ${color} truncate`}>{value}</div>
        {sub && <div className="text-[10.5px] font-mono text-muted-foreground truncate">{sub}</div>}
      </div>
    </div>
  );
}
