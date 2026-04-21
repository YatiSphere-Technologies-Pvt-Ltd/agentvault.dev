import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';

export function Section({ title, description, action, children }) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-start justify-between gap-4">
        <div className="min-w-0">
          <CardTitle className="text-[15px]">{title}</CardTitle>
          {description && <CardDescription className="mt-1 text-[12.5px]">{description}</CardDescription>}
        </div>
        {action}
      </CardHeader>
      <CardContent className="space-y-4">{children}</CardContent>
    </Card>
  );
}

export function FieldRow({ label, hint, children }) {
  return (
    <div>
      <div className="flex items-center justify-between mb-1.5">
        <Label className="text-[10.5px] uppercase tracking-[0.15em] text-muted-foreground font-medium">{label}</Label>
        {hint && <span className="text-[10.5px] text-muted-foreground font-mono">{hint}</span>}
      </div>
      {children}
    </div>
  );
}

export function Kv({ k, v, mono }) {
  return (
    <div className="flex items-baseline justify-between gap-6 py-2 border-b border-border/60 last:border-none">
      <span className="text-[10.5px] uppercase tracking-[0.14em] font-mono text-muted-foreground">{k}</span>
      <span className={`text-[12.5px] ${mono ? 'font-mono' : ''} text-foreground text-right truncate`}>{v}</span>
    </div>
  );
}
