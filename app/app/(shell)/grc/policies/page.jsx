'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { Search, Plus, Download, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from '@/components/ui/tooltip';
import { DataTable } from '@/components/tables/DataTable';
import { FacetFilterBar } from '@/components/tables/FacetFilter';
import { CONTROLS, FRAMEWORKS, frameworkBySlug } from '../_data';
import { usePolicies, effectiveAgentCount } from '../_policyStore';
import GrcHeader from '../_GrcHeader';
import PolicyDetailSheet from '../_PolicyDetailSheet';

const ORIGIN_OPTIONS = [
  { value: 'seeded',      label: 'Seeded' },
  { value: 'user',        label: 'Custom' },
  { value: 'edited-seed', label: 'Edited' },
];

const ATTACHMENT_OPTIONS = [
  { value: 'attached',   label: 'Attached',   color: 'var(--brand-teal)' },
  { value: 'unattached', label: 'Unattached', color: 'var(--muted-foreground)' },
];

function totalAttachedCount(p) {
  return (p.attached?.workspaces || 0) + effectiveAgentCount(p) + (p.attached?.tools || 0);
}

function originValue(p) {
  if (p.origin === 'user') return 'user';
  if (p.origin === 'edited-seed') return 'edited-seed';
  return 'seeded';
}

function toCsv(rows) {
  const header = ['id', 'name', 'origin', 'frameworks', 'controls', 'workspaces', 'agents', 'tools', 'updated_at'];
  const body = rows.map(r => [
    r.id, r.name, originValue(r), r.frameworks.join('|'), r.controls.length,
    r.attached?.workspaces || 0, effectiveAgentCount(r), r.attached?.tools || 0,
    r.updatedAt || '',
  ]);
  return [header, ...body].map(cols => cols.map(c => {
    const s = String(c ?? '');
    return /[,"\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  }).join(',')).join('\n');
}

function downloadCsv(filename, csv) {
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

export default function PoliciesPage() {
  const { list: POLICIES } = usePolicies();
  const [globalFilter, setGlobalFilter] = useState('');
  const [originSel, setOriginSel] = useState(new Set());
  const [attachmentSel, setAttachmentSel] = useState(new Set());
  const [frameworkSel, setFrameworkSel] = useState(new Set());
  const [openId, setOpenId] = useState(null);

  // If a hash like #pol_xxx is present on first load, open that policy.
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const hash = window.location.hash?.slice(1);
    if (hash && POLICIES.some(p => p.id === hash)) setOpenId(hash);
  }, [POLICIES]);

  const filteredRows = useMemo(() => POLICIES.filter(p => {
    if (originSel.size > 0 && !originSel.has(originValue(p))) return false;
    if (attachmentSel.size > 0) {
      const isAttached = totalAttachedCount(p) > 0;
      const wantAttached = attachmentSel.has('attached');
      const wantUnattached = attachmentSel.has('unattached');
      if (isAttached && !wantAttached && wantUnattached) return false;
      if (!isAttached && wantAttached && !wantUnattached) return false;
    }
    if (frameworkSel.size > 0 && !p.frameworks.some(f => frameworkSel.has(f))) return false;
    return true;
  }), [POLICIES, originSel, attachmentSel, frameworkSel]);

  const totalControls = useMemo(
    () => filteredRows.reduce((s, p) => s + (p.controls?.length || 0), 0),
    [filteredRows],
  );
  const attachedCount = useMemo(
    () => filteredRows.filter(p => totalAttachedCount(p) > 0).length,
    [filteredRows],
  );
  const customCount = useMemo(
    () => filteredRows.filter(p => p.origin === 'user' || p.origin === 'edited-seed').length,
    [filteredRows],
  );

  const columns = useMemo(() => [
    {
      accessorKey: 'name',
      header: 'Policy',
      cell: ({ row }) => {
        const p = row.original;
        return (
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-[13px] font-semibold text-foreground truncate">{p.name}</span>
              <OriginBadge policy={p} />
            </div>
            {p.summary && (
              <p className="mt-1 text-[12px] text-muted-foreground/95 leading-relaxed line-clamp-2 max-w-200">
                {p.summary}
              </p>
            )}
            {p.updatedAt && (
              <div className="mt-1 text-[11px] text-muted-foreground">
                Updated {new Date(p.updatedAt).toLocaleDateString()}
              </div>
            )}
          </div>
        );
      },
      sortingFn: (a, b) => a.original.name.localeCompare(b.original.name),
    },
    {
      accessorKey: 'frameworks',
      header: 'Frameworks',
      cell: ({ row }) => <FrameworksCell slugs={row.original.frameworks} />,
      sortingFn: (a, b) => a.original.frameworks.length - b.original.frameworks.length,
      enableGlobalFilter: false,
    },
    {
      accessorKey: 'controls',
      header: 'Controls',
      cell: ({ row }) => (
        <span className="font-mono tabular-nums text-foreground text-[12px]">
          {row.original.controls.length}
        </span>
      ),
      sortingFn: (a, b) => a.original.controls.length - b.original.controls.length,
      meta: { align: 'right' },
      enableGlobalFilter: false,
    },
    {
      id: 'attached',
      header: 'Attached',
      cell: ({ row }) => <AttachedCell policy={row.original} />,
      sortingFn: (a, b) => totalAttachedCount(a.original) - totalAttachedCount(b.original),
      enableGlobalFilter: false,
    },
  ], []);

  const frameworkOptions = useMemo(
    () => FRAMEWORKS.map(f => ({ value: f.slug, label: f.name, color: f.color })),
    [],
  );

  const isEmpty = POLICIES.length === 0;

  return (
    <>
      <GrcHeader />
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-10 py-7">
        {/* Title row */}
        <div className="flex items-end justify-between mb-5 flex-wrap gap-3">
          <div>
            <h2 className="text-[18px] font-semibold text-foreground">Policy bundles</h2>
            <p className="mt-1 text-[13px] text-muted-foreground max-w-160 leading-relaxed">
              A policy bundles controls and attaches them to a workspace, agent, or tool. Attached policies are evaluated by the run engine at the hooks declared by each control.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => downloadCsv('policies.csv', toCsv(filteredRows))}>
              <Download className="h-3.5 w-3.5" /> Export
            </Button>
            <Button size="sm" render={<Link href="/app/grc/policies/new" />}>
              <Plus className="h-3.5 w-3.5" /> New policy
            </Button>
          </div>
        </div>

        {/* Triage strip */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-5">
          <Stat label="Policies"      value={filteredRows.length} sub={`of ${POLICIES.length}`} />
          <Stat label="Attached"      value={attachedCount}      tone={attachedCount > 0 ? 'ok' : 'default'} />
          <Stat label="Custom"        value={customCount} />
          <Stat label="Controls bundled" value={totalControls} />
        </div>

        {isEmpty ? (
          <div className="rounded-xl border border-dashed border-border bg-card p-10 text-center">
            <div className="mx-auto h-10 w-10 rounded-full bg-primary/10 text-primary flex items-center justify-center mb-3">
              <Sparkles className="h-5 w-5" />
            </div>
            <div className="text-[14px] font-semibold text-foreground">No policies yet</div>
            <p className="mt-1 text-[12.5px] text-muted-foreground max-w-100 mx-auto">
              Describe the policy in plain language and let AgentVault draft a structured bundle, or build one from scratch.
            </p>
            <Button size="sm" className="mt-4" render={<Link href="/app/grc/policies/new" />}>
              <Plus className="h-3.5 w-3.5" /> New policy
            </Button>
          </div>
        ) : (
          <DataTable
            columns={columns}
            data={filteredRows}
            globalFilter={globalFilter}
            onGlobalFilterChange={setGlobalFilter}
            onRowClick={(row) => setOpenId(row.id)}
            emptyMessage="No policies match the current filters."
            pageSize={25}
            minWidth="min-w-[860px]"
            initialSorting={[{ id: 'attached', desc: true }]}
            toolbar={
              <div className="relative w-full max-w-xs">
                <Search className="h-3.5 w-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <Input
                  value={globalFilter}
                  onChange={(e) => setGlobalFilter(e.target.value)}
                  placeholder="Search policies…"
                  className="pl-8 h-8 text-[12.5px]"
                />
              </div>
            }
            filters={
              <FacetFilterBar
                filters={[
                  { title: 'Origin',     options: ORIGIN_OPTIONS,     selected: originSel,     onChange: setOriginSel     },
                  { title: 'Attachment', options: ATTACHMENT_OPTIONS, selected: attachmentSel, onChange: setAttachmentSel },
                  { title: 'Framework',  options: frameworkOptions,   selected: frameworkSel,  onChange: setFrameworkSel  },
                ]}
                onClearAll={() => {
                  setOriginSel(new Set());
                  setAttachmentSel(new Set());
                  setFrameworkSel(new Set());
                }}
              />
            }
          />
        )}
      </div>

      <PolicyDetailSheet
        open={!!openId}
        policyId={openId}
        onClose={() => setOpenId(null)}
      />
    </>
  );
}

/* ───────────────────── Cells ───────────────────── */

function FrameworksCell({ slugs }) {
  if (!slugs || slugs.length === 0) {
    return <span className="text-[12px] text-muted-foreground">—</span>;
  }
  const SHOW = 3;
  const visible = slugs.slice(0, SHOW);
  const overflow = slugs.slice(SHOW);
  return (
    <TooltipProvider>
      <div className="flex flex-wrap items-center gap-1">
        {visible.map(slug => {
          const fw = frameworkBySlug(slug);
          if (!fw) return null;
          return (
            <span
              key={slug}
              className="inline-flex items-center gap-1.5 px-1.5 py-0.5 rounded-md border text-[10.5px] font-medium"
              style={{ borderColor: fw.color + '55', color: fw.color, background: fw.color + '12' }}
            >
              <span className="h-1.5 w-1.5 rounded-full" style={{ background: fw.color }} />
              {fw.name.split(' ').slice(0, 2).join(' ')}
            </span>
          );
        })}
        {overflow.length > 0 && (
          <Tooltip>
            <TooltipTrigger
              render={
                <span className="inline-flex items-center px-1.5 py-0.5 rounded-md border border-border bg-muted/40 text-[10.5px] font-medium text-muted-foreground cursor-help">
                  +{overflow.length}
                </span>
              }
            />
            <TooltipContent>
              <div className="text-[11.5px] space-y-1">
                {overflow.map(s => {
                  const fw = frameworkBySlug(s);
                  if (!fw) return null;
                  return (
                    <div key={s} className="flex items-center gap-2">
                      <span className="h-1.5 w-1.5 rounded-full" style={{ background: fw.color }} />
                      {fw.name}
                    </div>
                  );
                })}
              </div>
            </TooltipContent>
          </Tooltip>
        )}
      </div>
    </TooltipProvider>
  );
}

function AttachedCell({ policy }) {
  const ws = policy.attached?.workspaces || 0;
  const ag = effectiveAgentCount(policy);
  const tl = policy.attached?.tools || 0;
  const total = ws + ag + tl;

  if (total === 0) {
    return (
      <span className="inline-flex items-center px-1.5 py-0.5 rounded-md border border-border bg-muted/40 text-[10.5px] font-medium text-muted-foreground">
        Unattached
      </span>
    );
  }

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger
          render={
            <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md border border-(--brand-teal)/40 bg-(--brand-teal)/10 text-[11px] font-medium text-brand-teal cursor-help">
              <span className="h-1.5 w-1.5 rounded-full bg-brand-teal" />
              {total} attached
            </span>
          }
        />
        <TooltipContent>
          <div className="text-[11.5px] space-y-0.5 font-mono tabular-nums">
            <div>Workspaces: {ws}</div>
            <div>Agents: {ag}</div>
            <div>Tools: {tl}</div>
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

function OriginBadge({ policy }) {
  const tone =
    policy.origin === 'user'        ? 'bg-primary/10 text-primary border-primary/40'
  : policy.origin === 'edited-seed' ? 'bg-accent/10 text-accent border-accent/40'
  :                                   'bg-muted text-muted-foreground border-border';
  const label =
    policy.origin === 'user'        ? 'Custom'
  : policy.origin === 'edited-seed' ? 'Edited'
  :                                   'Seeded';
  return (
    <span className={`inline-flex items-center px-1.5 py-0.5 rounded-md border text-[10px] font-medium ${tone}`}>
      {label}
    </span>
  );
}

function Stat({ label, value, sub, tone = 'default' }) {
  const color = tone === 'bad' ? 'text-destructive'
              : tone === 'warn' ? 'text-primary'
              : tone === 'ok' ? 'text-brand-teal'
              : 'text-foreground';
  return (
    <div className="rounded-lg border border-border bg-card p-3">
      <div className="text-[11.5px] font-medium text-muted-foreground">{label}</div>
      <div className="mt-1 flex items-baseline gap-1.5">
        <div className={`text-[22px] font-semibold tabular-nums ${color}`}>{value}</div>
        {sub && <div className="text-[11.5px] text-muted-foreground">{sub}</div>}
      </div>
    </div>
  );
}
