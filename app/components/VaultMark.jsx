export default function VaultMark({ size = 22 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 22 22" fill="none" aria-hidden>
      <rect x="1" y="1" width="20" height="20" stroke="var(--primary)" strokeWidth="1.5" />
      <rect x="5" y="5" width="12" height="12" stroke="var(--brand-teal)" strokeWidth="1" />
      <circle cx="11" cy="11" r="2.5" fill="var(--primary)" />
    </svg>
  );
}
