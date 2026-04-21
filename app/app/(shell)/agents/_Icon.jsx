export function AgentIcon({ name, size = 14, className = '' }) {
  const p = {
    width: size, height: size, viewBox: '0 0 20 20', fill: 'none',
    stroke: 'currentColor', strokeWidth: 1.7, strokeLinecap: 'round', strokeLinejoin: 'round',
    className,
  };
  switch (name) {
    case 'sparkles':  return <svg {...p}><path d="M10 3v4M10 13v4M3 10h4M13 10h4M5.5 5.5l2.5 2.5M12 12l2.5 2.5M14.5 5.5L12 8M8 12l-2.5 2.5"/></svg>;
    case 'shield':    return <svg {...p}><path d="M10 3l6 2v5c0 4-3 6-6 7-3-1-6-3-6-7V5l6-2z"/><path d="M7.5 10l2 2 3-3.5"/></svg>;
    case 'docs':      return <svg {...p}><path d="M5 3h7l4 4v10H5V3z"/><path d="M12 3v4h4M8 9h5M8 12h5M8 15h3"/></svg>;
    case 'braces':    return <svg {...p}><path d="M7 3c-2 0-2 2-2 3s0 2-2 2c2 0 2 2 2 3s0 3 2 3"/><path d="M13 3c2 0 2 2 2 3s0 2 2 2c-2 0-2 2-2 3s0 3-2 3"/></svg>;
    case 'globe':     return <svg {...p}><circle cx="10" cy="10" r="7"/><path d="M3 10h14M10 3c2 2 3 4.5 3 7s-1 5-3 7c-2-2-3-4.5-3-7s1-5 3-7z"/></svg>;
    case 'clock':     return <svg {...p}><circle cx="10" cy="10" r="7"/><path d="M10 6v4l2.5 2.5"/></svg>;
    case 'plug':      return <svg {...p}><path d="M7 3v4M13 3v4M5 7h10v4a5 5 0 01-10 0V7zM10 16v2"/></svg>;
    case 'db':        return <svg {...p}><ellipse cx="10" cy="5" rx="6" ry="2"/><path d="M4 5v5c0 1 3 2 6 2s6-1 6-2V5M4 10v5c0 1 3 2 6 2s6-1 6-2v-5"/></svg>;
    case 'code':      return <svg {...p}><path d="M7 6l-4 4 4 4M13 6l4 4-4 4"/></svg>;
    case 'chat':      return <svg {...p}><path d="M4 5h12v9H9l-3 3v-3H4V5z"/></svg>;
    case 'mail':      return <svg {...p}><rect x="3" y="5" width="14" height="10" rx="1"/><path d="M3 6l7 5 7-5"/></svg>;
    case 'calc':      return <svg {...p}><rect x="4" y="3" width="12" height="14" rx="1.5"/><path d="M7 7h6M7 11h2M11 11h2M7 14h2M11 14h2"/></svg>;
    default:          return <svg {...p}><rect x="4" y="4" width="12" height="12" rx="2"/></svg>;
  }
}
