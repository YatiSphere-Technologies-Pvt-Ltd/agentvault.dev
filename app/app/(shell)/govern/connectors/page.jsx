'use client';

import { useMemo, useState } from 'react';
import { Plus, Search, Cable } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { DataTable } from '@/components/tables/DataTable';
import { FacetFilterBar } from '@/components/tables/FacetFilter';
import { GovernHeader, ConnectorIcon, fmtAgo, fmtNum } from '../_shared';
import { useConnectors, disconnect } from '../_store';
import { CONNECTOR_CATALOG, CONNECTOR_FAMILIES, connectorById } from '../_connectorCatalog';
import AddConnectorSheet from './AddConnectorSheet';

const STATUS_OPTIONS = [
  { value: 'connected',    label: 'Connected',    color: 'var(--brand-teal)' },
  { value: 'disconnected', label: 'Disconnected', color: 'var(--muted-foreground)' },
];
const HEALTH_OPTIONS = [
  { value: 'green',  label: 'Healthy', color: 'var(--brand-teal)' },
  { value: 'yellow', label: 'Warning', color: 'var(--primary)' },
  { value: 'red',    label: 'Failing', color: 'var(--destructive)' },
];
const FAMILY_OPTIONS = Object.entries(CONNECTOR_FAMILIES).map(([id, m]) => ({ value: id, label: m.label, color: m.accent }));

export default function ConnectorsPage() {
  const connectors = useConnectors();
  const [globalFilter, setGlobalFilter] = useState('');
  const [statusSel, setStatusSel] = useState(new Set());
  const [healthSel, setHealthSel] = useState(new Set());
  const [familySel, setFamilySel] = useState(new Set());
  const [sheetOpen, setSheetOpen] = useState(false);

  // Merge live connectors with all catalog entries so users see "available
  // to add" as well. Live ones come first; available ones are dimmer.
  const liveById = useMemo(() => new Map(connectors.map(c => [c.kind, c])), [connectors]);
  const merged = useMemo(() => {
    const live = connectors.map(c => ({ ...c, isLive: true }));
    const available = CONNECTOR_CATALOG
      .filter(c => !liveById.has(c.id))
      .map(c => ({
        id: `avail_${c.id}`,
        kind: c.id,
        name: c.label,
        status: 'available',
        health: null,
        events_24h: 0,
        last_event_at: null,
        auth_summary: c.blurb,
        isLive: false,
      }));
    return [...live, ...available];
  }, [connectors, liveById]);

  const data = useMemo(() => merged.filter(c => {
    const family = connectorById(c.kind)?.family;
    if (familySel.size > 0 && !familySel.has(family))   return false;
    if (statusSel.size > 0 && !statusSel.has(c.status)) return false;
    if (healthSel.size > 0 && !healthSel.has(c.health)) return false;
    return true;
  }), [merged, familySel, statusSel, healthSel]);

  const stats = useMemo(() => {
    const live = connectors.filter(c => c.status === 'connected').length;
    const warn = connectors.filter(c => c.health === 'yellow' || c.health === 'red').length;
    const events24 = connectors.reduce((s, c) => s + (c.events_24h || 0), 0);
    const available = CONNECTOR_CATALOG.length - liveById.size;
    return { live, warn, events24, available };
  }, [connectors, liveById]);

  const columns = useMemo(() => ([
    {
      id: 'name',
      header: 'Connector',
      accessorFn: (c) => c.name,
      cell: ({ row }) => {
        const c = row.original;
        const cat = connectorById(c.kind);
        return (
          <div className="flex items-center gap-2.5 min-w-0">
            <ConnectorIcon kind={c.kind} size={28} />
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <div className={`text-[12.5px] font-medium truncate ${c.isLive ? 'text-foreground' : 'text-muted-foreground'}`}>{c.name}</div>
                {!c.isLive && <span className="text-[9.5px] font-mono px-1.5 py-0.5 rounded border border-border text-muted-foreground bg-muted/40">available</span>}
              </div>
              <div className="text-[10.5px] font-mono text-muted-foreground truncate">{cat?.label || c.kind}</div>
            </div>
          </div>
        );
      },
      filterFn: (row, _id, q) => {
        if (!q) return true;
        const s = String(q).toLowerCase();
        return row.original.name.toLowerCase().includes(s) || row.original.kind.toLowerCase().includes(s);
      },
    },
    {
      id: 'family',
      accessorFn: (c) => connectorById(c.kind)?.family || '—',
      header: 'Family',
      cell: ({ row }) => {
        const fam = connectorById(row.original.kind)?.family;
        const meta = CONNECTOR_FAMILIES[fam];
        if (!meta) return <span className="text-muted-foreground">—</span>;
        return (
          <span
            className="inline-flex items-center px-1.5 py-0.5 rounded border text-[10.5px] font-medium"
            style={{
              borderColor: `color-mix(in oklab, ${meta.accent} 40%, transparent)`,
              background: `color-mix(in oklab, ${meta.accent} 10%, transparent)`,
              color: meta.accent,
            }}
          >
            {meta.label}
          </span>
        );
      },
      enableGlobalFilter: false,
    },
    {
      id: 'status',
      accessorFn: (c) => c.status,
      header: 'Status',
      cell: ({ row }) => {
        const c = row.original;
        if (!c.isLive) {
          return <span className="text-[10.5px] font-mono text-muted-foreground">—</span>;
        }
        const dot = c.health === 'red'    ? 'var(--destructive)'
                  : c.health === 'yellow' ? '#F59E0B'
                  : 'var(--brand-teal)';
        const pulse = c.health === 'yellow' ? 'animate-pulse-dot' : '';
        return (
          <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded border border-border bg-muted/60 text-[10px] font-mono uppercase tracking-[0.12em] text-foreground">
            <span className={`h-1.5 w-1.5 rounded-full shrink-0 ${pulse}`} style={{ background: dot }} />
            {c.status}
          </span>
        );
      },
      enableGlobalFilter: false,
    },
    {
      id: 'events',
      accessorFn: (c) => c.events_24h ?? 0,
      header: 'Events · 24h',
      meta: { align: 'right' },
      cell: ({ row }) => (
        <span className="font-mono tabular-nums text-[12px] text-foreground">{row.original.isLive ? fmtNum(row.original.events_24h) : '—'}</span>
      ),
      enableGlobalFilter: false,
    },
    {
      id: 'lastEvent',
      accessorFn: (c) => c.last_event_at ?? 0,
      header: 'Last event',
      meta: { align: 'right' },
      cell: ({ row }) => (
        <span className="font-mono tabular-nums text-[11.5px] text-muted-foreground">{row.original.isLive ? fmtAgo(row.original.last_event_at) : '—'}</span>
      ),
      enableGlobalFilter: false,
    },
    {
      id: 'actions',
      header: '',
      cell: ({ row }) => {
        const c = row.original;
        if (!c.isLive) {
          return (
            <Button size="sm" variant="outline" onClick={(e) => { e.stopPropagation(); /* opens sheet at right kind via prop */ }}>
              Connect
            </Button>
          );
        }
        return (
          <Button size="sm" variant="ghost" onClick={(e) => { e.stopPropagation(); disconnect(c.id); }}
                  className="text-muted-foreground hover:text-destructive">
            Disconnect
          </Button>
        );
      },
      enableSorting: false,
      enableGlobalFilter: false,
      enableHiding: false,
      size: 100,
    },
  ]), []);

  const clearAll = () => {
    setStatusSel(new Set());
    setHealthSel(new Set());
    setFamilySel(new Set());
  };

  return (
    <>
      <GovernHeader
        title="Connectors"
        subtitle="Plug AgentVault into the systems where AI activity lives — identity, egress, SaaS, model providers. Each connector hydrates discovery, inventory, and the runtime gateway."
      />
      <div className="max-w-[1680px] mx-auto px-4 sm:px-6 lg:px-8 py-7 space-y-5">
        <div className="flex items-end justify-between gap-3 flex-wrap">
          <div>
            <div className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground font-mono">Catalog</div>
            <h2 className="text-[16px] font-semibold text-foreground mt-0.5">Connectors</h2>
            <p className="text-[12.5px] text-muted-foreground mt-0.5 max-w-[80ch]">
              Upstream signal sources that feed the discovery engine. Each connector is a vault-backed
              integration with proxy, CASB, browser, IDE, SaaS, or cloud audit logs.
            </p>
          </div>
          <Button onClick={() => setSheetOpen(true)} size="sm">
            <Plus className="h-3.5 w-3.5" /> Add a connector
          </Button>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          <Stat label="Live"           value={String(stats.live)} icon={<Cable className="h-3.5 w-3.5" />} tone="ok" />
          <Stat label="Available"      value={String(stats.available)} sub="not yet connected" />
          <Stat label="Health warnings" value={String(stats.warn)} tone={stats.warn ? 'warn' : 'default'} />
          <Stat label="Events · 24h"   value={fmtNum(stats.events24)} />
        </div>

        <DataTable
          columns={columns}
          data={data}
          globalFilter={globalFilter}
          onGlobalFilterChange={setGlobalFilter}
          minWidth="min-w-[1100px]"
          emptyMessage="No connectors match these filters."
          initialSorting={[{ id: 'events', desc: true }]}
          pageSize={25}
          toolbar={
            <div className="relative w-full max-w-xs">
              <Search className="h-3.5 w-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={globalFilter}
                onChange={(e) => setGlobalFilter(e.target.value)}
                placeholder="Search connectors…"
                className="pl-8 h-8 text-[12.5px]"
              />
            </div>
          }
          filters={
            <FacetFilterBar
              filters={[
                { title: 'Family', options: FAMILY_OPTIONS, selected: familySel, onChange: setFamilySel },
                { title: 'Status', options: STATUS_OPTIONS, selected: statusSel, onChange: setStatusSel },
                { title: 'Health', options: HEALTH_OPTIONS, selected: healthSel, onChange: setHealthSel },
              ]}
              onClearAll={clearAll}
            />
          }
        />
      </div>

      <AddConnectorSheet open={sheetOpen} onClose={() => setSheetOpen(false)} />
    </>
  );
}

function Stat({ label, value, sub, tone = 'default', icon }) {
  const color = tone === 'bad'  ? 'text-destructive'
              : tone === 'warn' ? 'text-(--chart-3)'
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
