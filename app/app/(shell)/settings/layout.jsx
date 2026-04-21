export default function SettingsLayout({ children }) {
  // Sub-navigation lives in the sidebar's expandable Settings group,
  // so this layout is intentionally just a page shell.
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-10 py-6 sm:py-8">
      <header>
        <div className="text-[10.5px] uppercase tracking-[0.2em] text-muted-foreground font-mono">
          Configuration
        </div>
        <h1 className="mt-1 text-[26px] sm:text-[28px] font-semibold tracking-tight text-foreground">Settings</h1>
      </header>

      <div className="mt-6 sm:mt-7 space-y-5 sm:space-y-6 min-w-0">{children}</div>
    </div>
  );
}
