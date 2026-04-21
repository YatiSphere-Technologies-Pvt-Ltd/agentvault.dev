// Shared form primitives for the settings pages.
// Not a route — plain module, imported by each sub-page.

export function Field({ label, hint, children }) {
  return (
    <label className="block">
      <div className="flex items-center justify-between mb-1.5">
        <span className="text-[10.5px] uppercase tracking-[0.15em] text-muted-foreground font-medium">{label}</span>
        {hint && <span className="text-[10.5px] text-muted-foreground font-mono">{hint}</span>}
      </div>
      {children}
    </label>
  );
}

export function TextInput(props) {
  return (
    <input
      {...props}
      className="w-full px-3 py-2 bg-panel border border-border rounded-md text-[13px] text-foreground placeholder:text-muted-foreground/60 focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/15 transition-all"
    />
  );
}

export function SettingsCard({ title, desc, children, footer }) {
  return (
    <section className="bg-panel border border-border rounded-xl p-6">
      <h2 className="text-[15px] font-semibold text-foreground">{title}</h2>
      {desc && <p className="text-[12.5px] text-muted-foreground mt-1">{desc}</p>}
      <div className="mt-5">{children}</div>
      {footer && <div className="mt-5">{footer}</div>}
    </section>
  );
}
