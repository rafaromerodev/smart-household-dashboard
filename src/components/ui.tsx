import Link from "next/link";
import type { ReactNode } from "react";
import { ChevronRight } from "lucide-react";

export function PageHeader({ title, subtitle, action }: { title: string; subtitle?: ReactNode; action?: ReactNode }) {
  return (
    <header className="mb-4 flex items-end justify-between gap-3">
      <div className="min-w-0">
        <h1 className="text-3xl font-semibold tracking-tight md:text-4xl">{title}</h1>
        {subtitle && <p className="mt-0.5 text-sm text-muted">{subtitle}</p>}
      </div>
      {action}
    </header>
  );
}

export function Section({ title, action, children }: { title: string; action?: ReactNode; children: ReactNode }) {
  return (
    <section className="mb-6">
      <div className="mb-2 flex items-center justify-between">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-muted">{title}</h2>
        {action}
      </div>
      {children}
    </section>
  );
}

export function Card({ href, children, className = "" }: { href?: string; children: ReactNode; className?: string }) {
  if (href)
    return (
      <Link href={href} className={`card lift block ${className}`}>
        {children}
      </Link>
    );
  return <div className={`card ${className}`}>{children}</div>;
}

export function StatCard({
  href, label, value, hint, icon, tone = "default", children,
}: {
  href: string; label: string; value: ReactNode; hint?: ReactNode; icon?: ReactNode;
  tone?: "default" | "warn" | "danger" | "ok"; children?: ReactNode;
}) {
  const toneCls = { default: "text-ink", warn: "text-warn", danger: "text-danger", ok: "text-ok" }[tone];
  return (
    <Card href={href} className="flex flex-col gap-1">
      <div className="flex items-center justify-between text-xs font-medium text-muted">
        <span className="flex items-center gap-1.5">{icon}{label}</span>
        <ChevronRight size={14} className="opacity-50" />
      </div>
      <div className={`text-xl font-semibold tracking-tight ${toneCls}`}>{value}</div>
      {hint && <div className="text-xs text-muted">{hint}</div>}
      {children}
    </Card>
  );
}

export function Progress({ value, marker, tone = "accent", label }: { value: number; marker?: number; tone?: "accent" | "warn" | "danger" | "ok"; label?: string }) {
  const pct = Math.max(0, Math.min(1, value)) * 100;
  const bar = { accent: "bg-accent", warn: "bg-warn", danger: "bg-danger", ok: "bg-ok" }[tone];
  return (
    <div className="relative mt-2 h-2 w-full overflow-hidden rounded-full bg-surface-2" role="progressbar" aria-valuenow={Math.round(pct)} aria-valuemin={0} aria-valuemax={100} aria-label={label}>
      <div className={`h-full rounded-full ${bar} transition-all`} style={{ width: `${pct}%` }} />
      {marker != null && marker > 0 && marker < 1 && (
        <div className="absolute top-0 h-full w-0.5 bg-ink/40" style={{ left: `${marker * 100}%` }} title="Mínimo" />
      )}
    </div>
  );
}

export function Empty({ icon, title, children, action }: { icon?: ReactNode; title: string; children?: ReactNode; action?: ReactNode }) {
  return (
    <div className="card flex flex-col items-center gap-2 py-8 text-center">
      {icon && <div className="text-muted">{icon}</div>}
      <p className="font-medium">{title}</p>
      {children && <p className="max-w-xs text-sm text-muted">{children}</p>}
      {action && <div className="mt-2">{action}</div>}
    </div>
  );
}

export function Badge({ children, tone = "default" }: { children: ReactNode; tone?: "default" | "warn" | "danger" | "ok" | "accent" }) {
  const cls = {
    default: "bg-surface-2 text-muted",
    warn: "bg-warn-soft text-warn",
    danger: "bg-danger-soft text-danger",
    ok: "bg-ok-soft text-ok",
    accent: "bg-accent-soft text-accent",
  }[tone];
  return <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${cls}`}>{children}</span>;
}

export function MemberDot({ color, name }: { color: string; name?: string }) {
  return (
    <span className="inline-flex items-center gap-1 text-xs text-muted">
      <span className="inline-block size-2.5 rounded-full" style={{ background: color }} />
      {name}
    </span>
  );
}

export function Field({ label, children, hint }: { label: string; children: ReactNode; hint?: ReactNode }) {
  return (
    <label className="block">
      <span className="label">{label}</span>
      {children}
      {hint && <span className="mt-1 block text-xs text-muted">{hint}</span>}
    </label>
  );
}
