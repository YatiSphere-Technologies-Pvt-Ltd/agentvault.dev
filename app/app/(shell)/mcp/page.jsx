'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useMemo, useState } from 'react';
import { Plus, Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { DataTable } from '@/components/tables/DataTable';
import { vendorById, VENDORS } from './_catalog';
import { useServers } from './_store';
import { StatusPill, VendorIcon, authSummary, fmtAgo } from './_shared';

export default function MCPListPage() {
  const router = useRouter();
  const { servers, hydrated } = useServers();
  const [q, setQ]           = useState('');
  const [vendor, setVendor] = useState('all');
  const [status, setStat]   = useState('all');

  const data = useMemo(() => servers.filter(s =>
    (vendor === 'all' || s.vendorId === vendor) &&
    (status === 'all' || s.status === status)
  ), [servers, vendor, status]);

  const columns = useMemo(() => ([
    {
      id: 'server',
      accessorFn: (s) => s.name,
      header: 'Server',
      filterFn: (row, _c, query) => {
        if (!query) return true;
        const q = String(query).toLowerCase();
        const s = row.original;
        return s.name.toLowerCase().includes(q) ||
               s.description.toLowerCase().includes(q) ||
               s.endpoint.toLowerCase().includes(q) ||
               s.team.toLowerCase().includes(q);
      },
      cell: ({ row }) => {
        const s = row.original;
        return (
          <div className="flex items-center gap-3">
            <div className="h-8 w-8 rounded-md bg-primary/10 text-primary flex items-center justify-center shrink-0">
              <VendorIcon vendorId={s.vendorId} size={14} />
            </div>
            <div className="min-w-0">
              <div className="font-medium truncate">{s.name}</div>
              <div className="text-[11px] text-muted-foreground font-mono truncate">
                {vendorById(s.vendorId).label} · {s.endpoint || '—'}
              </div>
            </div>
          </div>
        );
      },
    },
    {
      id: 'owner',
      accessorFn: (s) => s.owner,
      header: 'Owner',
      cell: ({ row }) => (
        <div className="text-[12px]">
          <div className="font-mono truncate">{row.original.owner}</div>
          <div className="text-[10.5px] text-muted-foreground">{row.original.team}</div>
        </div>
      ),
    },
    {
      id: 'auth',
      accessorFn: (s) => s.auth?.kind,
      header: 'Auth',
      cell: ({ row }) => <span className="text-[12px] font-mono text-muted-foreground">{authSummary(row.original.auth)}</span>,
    },
    {
      id: 'tools',
      accessorFn: (s) => s.tools.length,
      header: 'Tools',
      meta: { align: 'right' },
      cell: ({ row }) => {
        const enabled = row.original.tools.filter(t => t.enabled).length;
        const total = row.original.tools.length;
        return <span className="tabular-nums font-mono text-[12px]">{enabled}/{total}</span>;
      },
    },
    {
      id: 'calls30d',
      accessorFn: (s) => s.toolCalls30d,
      header: 'Calls (30d)',
      meta: { align: 'right' },
      cell: ({ getValue }) => <span className="tabular-nums font-mono text-[12px] text-muted-foreground">{getValue().toLocaleString()}</span>,
    },
    {
      id: 'p50',
      accessorFn: (s) => s.p50,
      header: 'p50',
      meta: { align: 'right' },
      cell: ({ getValue }) => <span className="tabular-nums font-mono text-[12px] text-muted-foreground">{getValue() ? `${getValue()} ms` : '—'}</span>,
    },
    {
      id: 'errorRate',
      accessorFn: (s) => s.errorRate7d,
      header: 'Error 7d',
      meta: { align: 'right' },
      cell: ({ getValue }) => {
        const v = getValue();
        const pct = (v * 100).toFixed(2);
        return <span className={`tabular-nums font-mono text-[12px] ${v > 0.05 ? 'text-destructive' : 'text-muted-foreground'}`}>{pct}%</span>;
      },
    },
    {
      id: 'lastUsed',
      accessorFn: (s) => s.lastUsedAt ? new Date(s.lastUsedAt).getTime() : 0,
      header: 'Last used',
      meta: { align: 'right' },
      cell: ({ row }) => <span className="tabular-nums font-mono text-[12px] text-muted-foreground">{fmtAgo(row.original.lastUsedAt)}</span>,
    },
    {
      id: 'status',
      accessorFn: (s) => s.status,
      header: 'Status',
      cell: ({ getValue }) => <StatusPill status={getValue()} />,
    },
  ]), []);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-10 py-6 sm:py-8">
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
        <div>
          <div className="text-[10.5px] uppercase tracking-[0.2em] text-muted-foreground font-mono">Integrations</div>
          <h1 className="mt-1 text-[28px] font-semibold tracking-tight">MCP Servers</h1>
          <p className="mt-1 text-[13.5px] text-muted-foreground">
            Model Context Protocol endpoints your agents can call. Credentials live in the workspace vault; agents attach specific tools, not whole servers.
          </p>
        </div>
        <Button render={<Link href="/app/mcp/new" />}>
          <Plus className="h-4 w-4" />
          Add server
        </Button>
      </div>

      <Card className="mt-6">
        <CardContent className="p-4 sm:p-5">
          <DataTable
            columns={columns}
            data={hydrated ? data : []}
            globalFilter={q}
            onGlobalFilterChange={setQ}
            onRowClick={(s) => router.push(`/app/mcp/${s.id}`)}
            minWidth="min-w-[980px]"
            emptyMessage={hydrated ? 'No servers match these filters.' : 'Loading…'}
            initialSorting={[{ id: 'lastUsed', desc: true }]}
            toolbar={
              <>
                <div className="relative w-full sm:w-80">
                  <Search className="h-3.5 w-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    value={q}
                    onChange={(e) => setQ(e.target.value)}
                    placeholder="Search servers, endpoints, teams…"
                    className="pl-9 h-8 text-[12.5px]"
                  />
                </div>
                <Select value={vendor} onValueChange={setVendor}>
                  <SelectTrigger className="h-8 w-36 text-[12px]"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All vendors</SelectItem>
                    {VENDORS.map(v => <SelectItem key={v.id} value={v.id}>{v.label}</SelectItem>)}
                  </SelectContent>
                </Select>
                <Select value={status} onValueChange={setStat}>
                  <SelectTrigger className="h-8 w-32 text-[12px]"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All statuses</SelectItem>
                    <SelectItem value="connected">connected</SelectItem>
                    <SelectItem value="degraded">degraded</SelectItem>
                    <SelectItem value="paused">paused</SelectItem>
                    <SelectItem value="failed">failed</SelectItem>
                    <SelectItem value="disconnected">disconnected</SelectItem>
                  </SelectContent>
                </Select>
              </>
            }
          />
        </CardContent>
      </Card>
    </div>
  );
}
