'use client';

import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Search, ShieldAlert } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { DataTable } from '@/components/tables/DataTable';
import { FacetFilterBar } from '@/components/tables/FacetFilter';
import { GovernHeader } from '../../_shared';
import { useDlpRules, toggleDlpRule } from '../../_store';

const ACTION_OPTIONS = [
  { value: 'block',  label: 'Block',  color: 'var(--destructive)' },
  { value: 'redact', label: 'Redact', color: 'var(--accent)' },
  { value: 'warn',   label: 'Warn',   color: 'var(--accent)' },
  { value: 'log',    label: 'Log',    color: 'var(--muted-foreground)' },
];
const SEVERITY_OPTIONS = [
  { value: 'critical', label: 'Critical', color: 'var(--destructive)' },
  { value: 'high',     label: 'High',     color: 'var(--primary)' },
  { value: 'medium',   label: 'Medium',   color: 'var(--accent)' },
  { value: 'low',      label: 'Low' },
];
const CATEGORY_OPTIONS = [
  { value: 'customer-pii',      label: 'Customer PII' },
  { value: 'credentials',       label: 'Credentials' },
  { value: 'source-code',       label: 'Source code' },
  { value: 'financial',         label: 'Financial' },
  { value: 'legal',             label: 'Legal' },
  { value: 'contracts',         label: 'Contracts' },
  { value: 'business-strategy', label: 'Business strategy' },
  { value: 'health-phi',        label: 'PHI' },
  { value: 'prompt-injection',  label: 'Prompt injection' },
];

export default function DlpRulesPage() {
  const router = useRouter();
  const rules = useDlpRules();
  const [globalFilter, setGlobalFilter] = useState('');
  const [actionSel, setActionSel] = useState(new Set());
  const [sevSel, setSevSel] = useState(new Set());
  const [catSel, setCatSel] = useState(new Set());

  const data = useMemo(() => rules.filter(r => {
    if (actionSel.size > 0 && !actionSel.has(r.action)) return false;
    if (sevSel.size    > 0 && !sevSel.has(r.severity)) return false;
    if (catSel.size    > 0) {
      const cats = Array.isArray(r.match) ? r.match : [r.match];
      if (!cats.some(c => catSel.has(c))) return false;
    }
    return true;
  }), [rules, actionSel, sevSel, catSel]);

  const stats = useMemo(() => {
    const enabled = rules.filter(r => r.enabled !== false).length;
    const hits = rules.reduce((s, r) => s + (r.hits_7d || 0), 0);
    const critical = rules.filter(r => r.severity === 'critical' && r.enabled !== false).length;
    return { enabled, hits, critical, total: rules.length };
  }, [rules]);

  const columns = useMemo(() => ([
    {
      id: 'enabled',
      header: '',
      cell: ({ row }) => (
        <input
          type="checkbox"
          checked={row.original.enabled !== false}
          onChange={(e) => { e.stopPropagation(); toggleDlpRule(row.original.id, e.target.checked); }}
          onClick={(e) => e.stopPropagation()}
          className="h-3.5 w-3.5 accent-primary cursor-pointer"
        />
      ),
      enableSorting: false,
      enableGlobalFilter: false,
      enableHiding: false,
      size: 40,
    },
    {
      id: 'name',
      accessorFn: (r) => r.name,
      header: 'Rule',
      cell: ({ row }) => (
        <div className="min-w-0">
          <div className={`text-[12.5px] font-medium truncate ${row.original.enabled === false ? 'text-muted-foreground line-through' : 'text-foreground'}`}>
            {row.original.name}
          </div>
          <div className="text-[10.5px] text-muted-foreground truncate">{row.original.description}</div>
        </div>
      ),
      filterFn: (row, _id, q) => {
        if (!q) return true;
        const t = String(q).toLowerCase();
        return row.original.name.toLowerCase().includes(t) || row.original.description.toLowerCase().includes(t);
      },
    },
    {
      id: 'action',
      accessorFn: (r) => r.action,
      header: 'Action',
      cell: ({ getValue }) => <ActionPill action={getValue()} />,
      enableGlobalFilter: false,
    },
    {
      id: 'severity',
      accessorFn: (r) => r.severity,
      header: 'Severity',
      cell: ({ getValue }) => <SeverityPill severity={getValue()} />,
      enableGlobalFilter: false,
    },
    {
      id: 'match',
      header: 'Match categories',
      accessorFn: (r) => (Array.isArray(r.match) ? r.match : [r.match]).join(','),
      cell: ({ row }) => {
        const cats = Array.isArray(row.original.match) ? row.original.match : [row.original.match];
        return (
          <div className="flex items-center gap-1 flex-wrap">
            {cats.map(c => (
              <span key={c} className="text-[10px] font-mono px-1.5 py-0.5 rounded border border-border bg-muted/40 text-foreground">
                {c}
              </span>
            ))}
          </div>
        );
      },
      enableGlobalFilter: false,
    },
    {
      id: 'controls',
      header: 'GRC control',
      accessorFn: (r) => r.controls_ref,
      cell: ({ getValue }) => (
        <code className="text-[10.5px] font-mono text-primary">{getValue() || '—'}</code>
      ),
      enableGlobalFilter: false,
    },
    {
      id: 'hits',
      accessorFn: (r) => r.hits_7d ?? 0,
      header: 'Hits · 7d',
      meta: { align: 'right' },
      cell: ({ getValue }) => (
        <span className="font-mono tabular-nums text-[12px] text-foreground">{Number(getValue()).toLocaleString()}</span>
      ),
      enableGlobalFilter: false,
    },
  ]), []);

  const clearAll = () => {
    setActionSel(new Set());
    setSevSel(new Set());
    setCatSel(new Set());
  };

  return (
    <>
      <GovernHeader
        title="DLP rules"
        subtitle="Pattern, classifier, and prompt-injection rules applied to every request the AI gateway sees. Tune severity, action, and scope per workspace."
      />
      <div className="max-w-[1680px] mx-auto px-4 sm:px-6 lg:px-8 py-7 space-y-5">
        <div className="flex items-end justify-between gap-3 flex-wrap">
          <div>
            <div className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground font-mono">Runtime</div>
            <h2 className="text-[16px] font-semibold text-foreground mt-0.5">DLP rules</h2>
            <p className="text-[12.5px] text-muted-foreground mt-0.5 max-w-[80ch]">
              Compiled into the gateway bundle. Each rule maps to a GRC control so violations
              roll up into the same compliance reports. Toggle a rule to enable / disable
              without changing its config.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          <Stat label="Enabled"   value={`${stats.enabled} / ${stats.total}`} icon={<ShieldAlert className="h-3.5 w-3.5" />} />
          <Stat label="Critical"  value={String(stats.critical)} tone={stats.critical ? 'bad' : 'default'} />
          <Stat label="Hits · 7d" value={stats.hits.toLocaleString()} />
          <Stat label="Bundle status" value="compiled" tone="ok" sub="deploys to gateway" />
        </div>

        <DataTable
          columns={columns}
          data={data}
          globalFilter={globalFilter}
          onGlobalFilterChange={setGlobalFilter}
          onRowClick={(r) => router.push(`/app/govern/runtime/dlp/${r.id}`)}
          minWidth="min-w-[1140px]"
          emptyMessage="No DLP rules match these filters."
          initialSorting={[{ id: 'hits', desc: true }]}
          pageSize={25}
          toolbar={
            <div className="relative w-full max-w-xs">
              <Search className="h-3.5 w-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={globalFilter}
                onChange={(e) => setGlobalFilter(e.target.value)}
                placeholder="Search rules…"
                className="pl-8 h-8 text-[12.5px]"
              />
            </div>
          }
          filters={
            <FacetFilterBar
              filters={[
                { title: 'Action',   options: ACTION_OPTIONS,   selected: actionSel, onChange: setActionSel },
                { title: 'Severity', options: SEVERITY_OPTIONS, selected: sevSel,    onChange: setSevSel },
                { title: 'Category', options: CATEGORY_OPTIONS, selected: catSel,    onChange: setCatSel },
              ]}
              onClearAll={clearAll}
            />
          }
        />
      </div>
    </>
  );
}

function ActionPill({ action }) {
  const dot = action === 'block'  ? 'var(--destructive)'
            : action === 'redact' ? '#D97706'
            : action === 'warn'   ? '#F59E0B'
            : 'var(--muted-foreground)';
  return (
    <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded border border-border bg-muted/60 text-[10px] font-mono uppercase tracking-[0.12em] text-foreground">
      <span className="h-1.5 w-1.5 rounded-full shrink-0" style={{ background: dot }} />
      {action}
    </span>
  );
}
function SeverityPill({ severity }) {
  if (!severity) return null;
  const dot = severity === 'critical' ? 'var(--destructive)'
            : severity === 'high'     ? '#F59E0B'
            : severity === 'medium'   ? 'var(--primary)'
            : 'var(--muted-foreground)';
  return (
    <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded border border-border bg-muted/60 text-[10px] font-mono uppercase tracking-[0.12em] text-foreground">
      <span className="h-1.5 w-1.5 rounded-full shrink-0" style={{ background: dot }} />
      {severity}
    </span>
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
