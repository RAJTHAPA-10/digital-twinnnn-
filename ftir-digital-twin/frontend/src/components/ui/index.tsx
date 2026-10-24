import { clsx } from "clsx";
import { AlertTriangle, Inbox, Loader2, RotateCw, X } from "lucide-react";
import { useEffect, type ButtonHTMLAttributes, type ReactNode } from "react";
import { SEVERITY_LABEL, SEVERITY_VAR } from "../../lib/labels";
import type { Severity } from "../../types/api";

export const cx = clsx;

// ---------- Card ----------
export function Card({ title, action, children, className, bodyClass }: {
  title?: ReactNode; action?: ReactNode; children: ReactNode; className?: string; bodyClass?: string;
}) {
  return (
    <section className={cx("card flex flex-col min-w-0", className)}>
      {(title || action) && (
        <header className="flex flex-wrap items-center justify-between gap-3 px-4 pt-4">
          {title && <h2 className="text-[13px] font-medium text-fg whitespace-nowrap">{title}</h2>}
          {action}
        </header>
      )}
      <div className={cx("p-4 flex-1 min-h-0", bodyClass)}>{children}</div>
    </section>
  );
}

// ---------- Buttons ----------
type BtnProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "ghost" | "quiet";
  size?: "sm" | "md";
  loading?: boolean;
  icon?: ReactNode;
};

export function Button({ variant = "ghost", size = "md", loading, icon, className, children, disabled, ...rest }: BtnProps) {
  return (
    <button
      {...rest}
      disabled={disabled || loading}
      className={cx(
        "inline-flex items-center justify-center gap-2 rounded-full font-medium transition-colors whitespace-nowrap",
        "disabled:opacity-50 disabled:cursor-not-allowed",
        size === "sm" ? "h-8 px-3 text-xs" : "h-9 px-4 text-[13px]",
        variant === "primary" && "bg-accent text-accent-on hover:bg-accent/90",
        variant === "ghost" && "border border-line text-fg hover:bg-raised",
        variant === "quiet" && "text-muted hover:text-fg hover:bg-raised",
        className,
      )}
    >
      {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : icon}
      {children}
    </button>
  );
}

// ---------- Pills ----------
type Tone = "neutral" | "accent" | "indigo" | "safe" | "danger" | "warn";

const TONE: Record<Tone, string> = {
  neutral: "bg-raised text-muted",
  accent: "bg-accent-soft text-accent-ink",
  indigo: "bg-indigo-soft text-indigo-ink",
  safe: "bg-safe-soft text-safe",
  danger: "bg-danger-soft text-danger",
  warn: "bg-sev-medium/15 text-sev-medium",
};

export function Pill({ tone = "neutral", children, className, dot }: { tone?: Tone; children: ReactNode; className?: string; dot?: boolean }) {
  return (
    <span className={cx("inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[11px] font-medium whitespace-nowrap", TONE[tone], className)}>
      {dot && <span className="h-1.5 w-1.5 rounded-full bg-current" />}
      {children}
    </span>
  );
}

export function SeverityPill({ severity, score }: { severity: Severity; score?: number }) {
  const v = SEVERITY_VAR[severity];
  return (
    <span
      className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[11px] font-medium"
      style={{ color: `rgb(var(${v}))`, background: `rgb(var(${v}) / 0.15)` }}
    >
      {SEVERITY_LABEL[severity]}
      {score !== undefined && <span className="num opacity-80">{score}/10</span>}
    </span>
  );
}

// ---------- Confidence bar ----------
export function ConfidenceBar({ value, tone = "accent" }: { value: number | null; tone?: "accent" | "danger" | "safe" }) {
  const pctValue = value === null ? 0 : Math.round(value * 100);
  const color = tone === "danger" ? "bg-danger" : tone === "safe" ? "bg-safe" : "bg-accent";
  return (
    <div className="flex items-center gap-2 min-w-[96px]">
      <div className="h-1.5 flex-1 rounded-full bg-raised overflow-hidden">
        <div className={cx("h-full rounded-full transition-all", color)} style={{ width: `${pctValue}%` }} />
      </div>
      <span className="num text-[11px] text-muted w-8 text-right">{value === null ? "—" : `${pctValue}%`}</span>
    </div>
  );
}

// ---------- KPI ----------
export function Kpi({ label, value, hint, loading, tone }: { label: string; value: ReactNode; hint?: ReactNode; loading?: boolean; tone?: "accent" | "danger" | "safe" }) {
  return (
    <div className="card p-4 flex flex-col gap-2 min-w-0">
      <span className="text-xs text-muted">{label}</span>
      {loading ? (
        <div className="skeleton h-8 w-20" />
      ) : (
        <span className={cx("num text-[28px] leading-none font-medium tracking-[-0.03em]",
          tone === "accent" && "text-accent", tone === "danger" && "text-danger", tone === "safe" && "text-safe")}>
          {value}
        </span>
      )}
      {hint && <span className="text-[11px] text-faint">{hint}</span>}
    </div>
  );
}

// ---------- States ----------
export function Skeleton({ className }: { className?: string }) {
  return <div className={cx("skeleton", className)} />;
}

export function SkeletonRows({ rows = 6 }: { rows?: number }) {
  return (
    <div className="flex flex-col gap-2">
      {Array.from({ length: rows }).map((_, i) => (
        <Skeleton key={i} className="h-9 w-full" />
      ))}
    </div>
  );
}

export function EmptyState({ icon, title, body, action }: { icon?: ReactNode; title: string; body?: string; action?: ReactNode }) {
  return (
    <div className="flex flex-col items-center justify-center text-center gap-3 py-10 px-6">
      <div className="h-10 w-10 rounded-full bg-raised grid place-items-center text-muted">{icon ?? <Inbox className="h-5 w-5" />}</div>
      <div className="flex flex-col gap-1">
        <p className="text-sm font-medium">{title}</p>
        {body && <p className="text-xs text-muted max-w-sm">{body}</p>}
      </div>
      {action}
    </div>
  );
}

export function ErrorState({ error, onRetry }: { error: unknown; onRetry?: () => void }) {
  const message = error instanceof Error ? error.message : "Something went wrong.";
  return (
    <div className="flex flex-col items-center justify-center text-center gap-3 py-10 px-6">
      <div className="h-10 w-10 rounded-full bg-danger-soft grid place-items-center text-danger">
        <AlertTriangle className="h-5 w-5" />
      </div>
      <div className="flex flex-col gap-1">
        <p className="text-sm font-medium">Couldn't load this</p>
        <p className="text-xs text-muted max-w-sm">{message}</p>
      </div>
      {onRetry && (
        <Button size="sm" onClick={onRetry} icon={<RotateCw className="h-3.5 w-3.5" />}>
          Retry
        </Button>
      )}
    </div>
  );
}

// ---------- Segmented control ----------
export function Segmented<T extends string>({ value, options, onChange }: { value: T; options: { value: T; label: string }[]; onChange: (v: T) => void }) {
  return (
    <div className="inline-flex rounded-full bg-raised p-0.5">
      {options.map((o) => (
        <button
          key={o.value}
          onClick={() => onChange(o.value)}
          className={cx(
            "h-7 px-3 rounded-full text-xs transition-colors",
            value === o.value ? "bg-card text-fg border border-line" : "text-muted hover:text-fg",
          )}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

// ---------- Overlay primitives ----------
function useEscape(open: boolean, onClose: () => void) {
  useEffect(() => {
    if (!open) return;
    const h = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, [open, onClose]);
}

export function Drawer({ open, onClose, title, children, footer }: { open: boolean; onClose: () => void; title: ReactNode; children: ReactNode; footer?: ReactNode }) {
  useEscape(open, onClose);
  return (
    <div className={cx("fixed inset-0 z-40 no-print", open ? "pointer-events-auto" : "pointer-events-none")} aria-hidden={!open}>
      <div className={cx("absolute inset-0 bg-black/40 transition-opacity", open ? "opacity-100" : "opacity-0")} onClick={onClose} />
      <aside
        className={cx(
          "absolute right-0 top-0 h-full w-full max-w-[460px] bg-card border-l border-line flex flex-col transition-transform duration-200",
          open ? "translate-x-0" : "translate-x-full",
        )}
      >
        <header className="flex items-center justify-between px-5 h-14 border-b border-divider">
          <div className="text-sm font-medium">{title}</div>
          <button onClick={onClose} className="h-8 w-8 grid place-items-center rounded-full hover:bg-raised text-muted" aria-label="Close">
            <X className="h-4 w-4" />
          </button>
        </header>
        <div className="flex-1 overflow-y-auto p-5">{children}</div>
        {footer && <footer className="px-5 py-4 border-t border-divider">{footer}</footer>}
      </aside>
    </div>
  );
}

export function ConfirmDialog({ open, title, body, confirmLabel, onConfirm, onCancel }: {
  open: boolean; title: string; body: string; confirmLabel: string; onConfirm: () => void; onCancel: () => void;
}) {
  useEscape(open, onCancel);
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 grid place-items-center p-4">
      <div className="absolute inset-0 bg-black/50" onClick={onCancel} />
      <div className="card relative w-full max-w-sm p-5 flex flex-col gap-4">
        <div className="flex flex-col gap-1.5">
          <h3 className="text-sm font-medium">{title}</h3>
          <p className="text-xs text-muted leading-relaxed">{body}</p>
        </div>
        <div className="flex justify-end gap-2">
          <Button size="sm" variant="quiet" onClick={onCancel}>Cancel</Button>
          <Button size="sm" variant="primary" onClick={onConfirm}>{confirmLabel}</Button>
        </div>
      </div>
    </div>
  );
}

// ---------- Small helpers ----------
export function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex flex-col gap-1 min-w-0">
      <span className="text-[11px] text-muted">{label}</span>
      <span className="text-[13px] break-words">{children}</span>
    </div>
  );
}

export function FtirId({ id, className }: { id: string; className?: string }) {
  return <span className={cx("ftir-id text-[12px] whitespace-nowrap", className)}>{id}</span>;
}
