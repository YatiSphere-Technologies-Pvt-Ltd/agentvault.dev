import { Badge } from '@/components/ui/badge';

export const STATUS_TONE = {
  ready:    'border-(--brand-teal)/40 text-brand-teal bg-(--brand-teal)/10',
  indexing: 'border-primary/40 text-primary bg-primary/10',
  draft:    'border-border text-muted-foreground bg-muted',
  paused:   'border-amber-400/40 text-amber-700 bg-amber-400/10 dark:text-amber-400',
  failed:   'border-destructive/40 text-destructive bg-destructive/10',
};

export function StatusPill({ status }) {
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded border text-[10.5px] font-mono ${STATUS_TONE[status] || STATUS_TONE.draft}`}>
      <span className={`h-1.5 w-1.5 rounded-full ${
        status === 'ready'    ? 'bg-brand-teal' :
        status === 'indexing' ? 'bg-primary animate-pulse-dot' :
        status === 'failed'   ? 'bg-destructive' :
        status === 'paused'   ? 'bg-amber-500' :
        'bg-muted-foreground'
      }`} />
      {status}
    </span>
  );
}

export function KindIcon({ name, size = 14 }) {
  const p = { width: size, height: size, viewBox: '0 0 20 20', fill: 'none', stroke: 'currentColor', strokeWidth: 1.7, strokeLinecap: 'round', strokeLinejoin: 'round' };
  switch (name) {
    case 'docs':  return <svg {...p}><path d="M5 3h7l4 4v10H5V3z"/><path d="M12 3v4h4M8 9h5M8 12h5M8 15h3"/></svg>;
    case 'globe': return <svg {...p}><circle cx="10" cy="10" r="7"/><path d="M3 10h14M10 3c2 2 3 4.5 3 7s-1 5-3 7c-2-2-3-4.5-3-7s1-5 3-7z"/></svg>;
    case 'plug':  return <svg {...p}><path d="M7 3v4M13 3v4M5 7h10v4a5 5 0 01-10 0V7zM10 16v2"/></svg>;
    case 'db':    return <svg {...p}><ellipse cx="10" cy="5" rx="6" ry="2"/><path d="M4 5v5c0 1 3 2 6 2s6-1 6-2V5M4 10v5c0 1 3 2 6 2s6-1 6-2v-5"/></svg>;
    default:      return <svg {...p}><rect x="4" y="4" width="12" height="12" rx="2"/></svg>;
  }
}

export function fmtBytes(bytes) {
  if (!bytes) return '—';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
  return `${(bytes / 1024 / 1024 / 1024).toFixed(1)} GB`;
}

export function fmtAgo(iso) {
  if (!iso) return '—';
  const delta = Date.now() - new Date(iso).getTime();
  if (delta < 0) {
    // Future: show "in Xm"
    const mins = Math.floor(Math.abs(delta) / 60000);
    if (mins < 60) return `in ${mins}m`;
    const hrs = Math.floor(mins / 60);
    return hrs < 24 ? `in ${hrs}h` : `in ${Math.floor(hrs / 24)}d`;
  }
  const mins = Math.floor(delta / 60000);
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  return hrs < 24 ? `${hrs}h ago` : `${Math.floor(hrs / 24)}d ago`;
}

export { Badge };
