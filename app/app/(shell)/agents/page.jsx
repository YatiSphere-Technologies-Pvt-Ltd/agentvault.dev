'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useMemo, useState } from 'react';
import { ArrowRight, Plus, Search, Sparkles } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { DataTable } from '@/components/tables/DataTable';
import { useAgents } from './_store';
import { AgentIcon } from './_Icon';
import { TEMPLATES } from './_templates';

const STATUS_VARIANT = {
  published: 'default',
  draft: 'secondary',
  deprecated: 'outline',
};

const ENV_TONE = {
  prod:    'bg-(--brand-teal)/10 text-brand-teal border-(--brand-teal)/35',
  staging: 'bg-primary/10 text-primary border-primary/35',
  dev:     'bg-muted text-muted-foreground border-border',
};

export default function AgentsPage() {
  const router = useRouter();
  const { agents, hydrated } = useAgents();
  const [globalFilter, setGlobalFilter] = useState('');
  const [envFilter, setEnvFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');

  const data = useMemo(() => {
    return agents.filter(a =>
      (envFilter === 'all' || a.environment === envFilter) &&
      (statusFilter === 'all' || a.version.status === statusFilter)
    );
  }, [agents, envFilter, statusFilter]);

  const columns = useMemo(() => ([
    {
      id: 'agent',
      accessorFn: (row) => row.name,
      header: 'Agent',
      cell: ({ row }) => {
        const a = row.original;
        return (
          <div className="flex items-center gap-3">
            <div className="h-8 w-8 rounded-md bg-primary/10 text-primary flex items-center justify-center shrink-0">
              <AgentIcon name={a.icon} size={14} />
            </div>
            <div className="min-w-0">
              <div className="font-medium truncate">{a.name}</div>
              <div className="text-[11px] text-muted-foreground font-mono truncate">
                {a.id} · v{a.version.current} · {a.category}
              </div>
            </div>
          </div>
        );
      },
      // Global filter hits agent name / id / tags / category / team
      filterFn: (row, _colId, query) => {
        if (!query) return true;
        const q = String(query).toLowerCase();
        const a = row.original;
        return (
          a.name.toLowerCase().includes(q) ||
          a.id.toLowerCase().includes(q) ||
          a.category?.toLowerCase().includes(q) ||
          a.team?.toLowerCase().includes(q) ||
          a.tags?.some(t => t.toLowerCase().includes(q))
        );
      },
    },
    {
      id: 'owner',
      accessorFn: (row) => row.owner,
      header: 'Owner',
      enableSorting: true,
      cell: ({ row }) => (
        <div className="text-[12px]">
          <div className="font-mono truncate">{row.original.owner}</div>
          <div className="text-[10.5px] text-muted-foreground">{row.original.team}</div>
        </div>
      ),
    },
    {
      id: 'environment',
      accessorFn: (row) => row.environment,
      header: 'Env',
      cell: ({ getValue }) => (
        <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded border text-[10.5px] font-mono ${ENV_TONE[getValue()]}`}>
          {getValue()}
        </span>
      ),
    },
    {
      id: 'tokens',
      accessorFn: (row) => row.observability?.tokensMTD ?? 0,
      header: 'Tokens (MTD)',
      meta: { align: 'right' },
      cell: ({ getValue }) => (
        <span className="tabular-nums font-mono text-[12px]">{getValue().toLocaleString()}</span>
      ),
    },
    {
      id: 'cost',
      accessorFn: (row) => row.observability?.costMTD ?? 0,
      header: 'Cost (MTD)',
      meta: { align: 'right' },
      cell: ({ getValue }) => (
        <span className="tabular-nums font-mono text-[12px] text-muted-foreground">${getValue().toFixed(2)}</span>
      ),
    },
    {
      id: 'p50',
      accessorFn: (row) => row.observability?.p50MS ?? 0,
      header: 'p50',
      meta: { align: 'right' },
      cell: ({ getValue }) => (
        <span className="tabular-nums font-mono text-[12px] text-muted-foreground">{getValue()}ms</span>
      ),
    },
    {
      id: 'status',
      accessorFn: (row) => row.version.status,
      header: 'Status',
      cell: ({ getValue }) => (
        <Badge variant={STATUS_VARIANT[getValue()] || 'secondary'}>
          {getValue()}
        </Badge>
      ),
    },
  ]), []);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-10 py-6 sm:py-8">
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
        <div>
          <div className="text-[10.5px] uppercase tracking-[0.2em] text-muted-foreground font-mono">Registry</div>
          <h1 className="mt-1 text-[28px] font-semibold tracking-tight">Agents</h1>
          <p className="mt-1 text-[13.5px] text-muted-foreground">
            Your production agents — versioned, governed, ready to be wired into any workflow.
          </p>
        </div>
        <Button render={<Link href="/app/agents/new" />}>
          <Plus className="h-4 w-4" />
          New agent
        </Button>
      </div>

      {/* Templates band — pre-configured starting points */}
      <section className="mt-7">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Sparkles className="h-3.5 w-3.5 text-primary" />
            <span className="text-[10.5px] uppercase tracking-[0.18em] font-mono text-muted-foreground">Start from a template</span>
          </div>
          <Link href="/app/agents/new" className="text-[11.5px] text-primary hover:underline underline-offset-2">
            Start from scratch →
          </Link>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {TEMPLATES.map(t => (
            <Link
              key={t.id}
              href={`/app/agents/new?template=${t.id}`}
              className="group relative rounded-xl border bg-card p-4 transition-all hover:border-primary/40 hover:shadow-sm"
            >
              <div className="flex items-start justify-between gap-2">
                <div
                  className="h-9 w-9 rounded-md flex items-center justify-center text-white"
                  style={{ background: t.accent }}
                >
                  <AgentIcon name={t.icon} size={16} />
                </div>
                <ArrowRight className="h-4 w-4 text-muted-foreground group-hover:text-primary group-hover:translate-x-0.5 transition-all" />
              </div>
              <div className="mt-3 flex items-baseline gap-2 flex-wrap">
                <h3 className="text-[14.5px] font-semibold tracking-tight">{t.name}</h3>
                <Badge variant="outline" className="text-[9.5px] capitalize">{t.mode}</Badge>
              </div>
              <div className="mt-0.5 text-[11.5px] font-mono text-muted-foreground">{t.tagline}</div>
              <p className="mt-2 text-[12px] text-muted-foreground leading-snug">{t.blurb}</p>
            </Link>
          ))}
        </div>
      </section>

      <Card className="mt-6">
        <CardContent className="p-4 sm:p-5">
          <DataTable
            columns={columns}
            data={hydrated ? data : []}
            globalFilter={globalFilter}
            onGlobalFilterChange={setGlobalFilter}
            onRowClick={(a) => router.push(`/app/agents/${a.id}`)}
            minWidth="min-w-[820px]"
            emptyMessage={hydrated ? 'No agents match these filters.' : 'Loading agents…'}
            initialSorting={[{ id: 'tokens', desc: true }]}
            toolbar={
              <>
                <div className="relative w-full sm:w-80">
                  <Search className="h-3.5 w-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    value={globalFilter}
                    onChange={(e) => setGlobalFilter(e.target.value)}
                    placeholder="Search agents, tags, teams…"
                    className="pl-9 h-8 text-[12.5px]"
                  />
                </div>
                <Select value={envFilter} onValueChange={setEnvFilter}>
                  <SelectTrigger className="h-8 w-28 text-[12px]"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All envs</SelectItem>
                    <SelectItem value="dev">dev</SelectItem>
                    <SelectItem value="staging">staging</SelectItem>
                    <SelectItem value="prod">prod</SelectItem>
                  </SelectContent>
                </Select>
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="h-8 w-32 text-[12px]"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All statuses</SelectItem>
                    <SelectItem value="published">published</SelectItem>
                    <SelectItem value="draft">draft</SelectItem>
                    <SelectItem value="deprecated">deprecated</SelectItem>
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
