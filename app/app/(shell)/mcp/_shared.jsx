import { AUTH_KINDS, vendorById } from './_catalog';

export const STATUS_TONE = {
  connected:    'border-(--brand-teal)/40 text-brand-teal bg-(--brand-teal)/10',
  disconnected: 'border-border text-muted-foreground bg-muted',
  degraded:     'border-amber-400/40 text-amber-700 bg-amber-400/10 dark:text-amber-400',
  paused:       'border-border text-muted-foreground bg-muted',
  failed:       'border-destructive/40 text-destructive bg-destructive/10',
};

export function StatusPill({ status }) {
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded border text-[10.5px] font-mono ${STATUS_TONE[status] || STATUS_TONE.disconnected}`}>
      <span className={`h-1.5 w-1.5 rounded-full ${
        status === 'connected' ? 'bg-brand-teal animate-pulse-dot' :
        status === 'degraded'  ? 'bg-amber-500' :
        status === 'failed'    ? 'bg-destructive' :
        'bg-muted-foreground'
      }`} />
      {status}
    </span>
  );
}

export const RISK_TONE = {
  low:  'border-(--brand-teal)/35 text-brand-teal bg-(--brand-teal)/10',
  med:  'border-amber-400/40 text-amber-700 bg-amber-400/10 dark:text-amber-400',
  high: 'border-destructive/40 text-destructive bg-destructive/10',
};

export function RiskPill({ level }) {
  return <span className={`inline-flex items-center px-1.5 py-0.5 rounded border text-[9.5px] font-mono ${RISK_TONE[level] || RISK_TONE.med}`}>{level} risk</span>;
}

export function VendorIcon({ vendorId, size = 14 }) {
  const v = vendorById(vendorId);
  const p = { width: size, height: size, viewBox: '0 0 20 20', fill: 'none', stroke: 'currentColor', strokeWidth: 1.7, strokeLinecap: 'round', strokeLinejoin: 'round' };
  switch (v.icon) {
    case 'plug': return <svg {...p}><path d="M7 3v4M13 3v4M5 7h10v4a5 5 0 01-10 0V7zM10 16v2"/></svg>;
    case 'docs': return <svg {...p}><path d="M5 3h7l4 4v10H5V3z"/><path d="M12 3v4h4M8 9h5M8 12h5M8 15h3"/></svg>;
    default:     return <svg {...p}><rect x="4" y="4" width="12" height="12" rx="2"/></svg>;
  }
}

export function fmtAgo(iso) {
  if (!iso) return '—';
  const delta = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(delta / 60000);
  if (mins < 1)   return 'just now';
  if (mins < 60)  return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24)   return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

export function authSummary(auth) {
  const k = AUTH_KINDS.find(a => a.id === auth?.kind);
  return k?.label || auth?.kind || '—';
}

export function maskedRef(ref) {
  if (!ref) return '—';
  // vault://mcp/<id>/token → vault://mcp/<id>/•••• token
  const last = ref.split('/').pop();
  return `${ref.slice(0, -last.length)}•••• ${last}`;
}
