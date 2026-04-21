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
import { KIND_CATALOG, kindById } from './_catalog';
import { useSources } from './_store';
import { KindIcon, StatusPill, fmtAgo, fmtBytes } from './_shared';

export default function KnowledgePage() {
  const router = useRouter();
  const { sources, hydrated } = useSources();
  const [q, setQ]         = useState('');
  const [kind, setKind]   = useState('all');
  const [status, setStat] = useState('all');

  const data = useMemo(() => sources.filter(s =>
    (kind   === 'all' || s.kind   === kind) &&
    (status === 'all' || s.status === status)
  ), [sources, kind, status]);

  const columns = useMemo(() => ([
    {
      id: 'source',
      accessorFn: (s) => s.name,
      header: 'Source',
      filterFn: (row, _c, query) => {
        if (!query) return true;
        const s = String(query).toLowerCase();
        const r = row.original;
        return r.name.toLowerCase().includes(s) ||
               r.description.toLowerCase().includes(s) ||
               r.team.toLowerCase().includes(s) ||
               r.kind.toLowerCase().includes(s);
      },
      cell: ({ row }) => {
        const s = row.original;
        const k = kindById(s.kind);
        return (
          <div className="flex items-center gap-3">
            <div className="h-8 w-8 rounded-md bg-primary/10 text-primary flex items-center justify-center shrink-0">
              <KindIcon name={k?.icon || 'docs'} size={14} />
            </div>
            <div className="min-w-0">
              <div className="font-medium truncate">{s.name}</div>
              <div className="text-[11px] text-muted-foreground font-mono truncate">
                {s.id} · {k?.label || s.kind}
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
      id: 'docs',
      accessorFn: (s) => s.docs,
      header: 'Docs',
      meta: { align: 'right' },
      cell: ({ getValue }) => <span className="tabular-nums font-mono text-[12px]">{getValue().toLocaleString()}</span>,
    },
    {
      id: 'chunks',
      accessorFn: (s) => s.chunks,
      header: 'Chunks',
      meta: { align: 'right' },
      cell: ({ getValue }) => <span className="tabular-nums font-mono text-[12px] text-muted-foreground">{getValue().toLocaleString()}</span>,
    },
    {
      id: 'size',
      accessorFn: (s) => s.indexBytes,
      header: 'Size',
      meta: { align: 'right' },
      cell: ({ getValue }) => <span className="tabular-nums font-mono text-[12px] text-muted-foreground">{fmtBytes(getValue())}</span>,
    },
    {
      id: 'attached',
      accessorFn: (s) => s.attachedAgents.length,
      header: 'Agents',
      meta: { align: 'right' },
      cell: ({ getValue }) => <span className="tabular-nums font-mono text-[12px] text-muted-foreground">{getValue()}</span>,
    },
    {
      id: 'lastIndexed',
      accessorFn: (s) => s.lastIndexedAt ? new Date(s.lastIndexedAt).getTime() : 0,
      header: 'Last indexed',
      meta: { align: 'right' },
      cell: ({ row }) => <span className="tabular-nums font-mono text-[12px] text-muted-foreground">{fmtAgo(row.original.lastIndexedAt)}</span>,
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
          <div className="text-[10.5px] uppercase tracking-[0.2em] text-muted-foreground font-mono">Data layer</div>
          <h1 className="mt-1 text-[28px] font-semibold tracking-tight">Knowledge</h1>
          <p className="mt-1 text-[13.5px] text-muted-foreground">
            Configured data sources agents can retrieve from. Attach one to any agent from its Knowledge tab.
          </p>
        </div>
        <Button render={<Link href="/app/knowledge/new" />}>
          <Plus className="h-4 w-4" />
          New source
        </Button>
      </div>

      <Card className="mt-6">
        <CardContent className="p-4 sm:p-5">
          <DataTable
            columns={columns}
            data={hydrated ? data : []}
            globalFilter={q}
            onGlobalFilterChange={setQ}
            onRowClick={(s) => router.push(`/app/knowledge/${s.id}`)}
            minWidth="min-w-[920px]"
            emptyMessage={hydrated ? 'No sources match these filters.' : 'Loading…'}
            initialSorting={[{ id: 'lastIndexed', desc: true }]}
            toolbar={
              <>
                <div className="relative w-full sm:w-80">
                  <Search className="h-3.5 w-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    value={q}
                    onChange={(e) => setQ(e.target.value)}
                    placeholder="Search sources, teams, kinds…"
                    className="pl-9 h-8 text-[12.5px]"
                  />
                </div>
                <Select value={kind} onValueChange={setKind}>
                  <SelectTrigger className="h-8 w-36 text-[12px]"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All kinds</SelectItem>
                    {KIND_CATALOG.map(k => (
                      <SelectItem key={k.id} value={k.id}>{k.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Select value={status} onValueChange={setStat}>
                  <SelectTrigger className="h-8 w-32 text-[12px]"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All statuses</SelectItem>
                    <SelectItem value="ready">ready</SelectItem>
                    <SelectItem value="indexing">indexing</SelectItem>
                    <SelectItem value="paused">paused</SelectItem>
                    <SelectItem value="failed">failed</SelectItem>
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
