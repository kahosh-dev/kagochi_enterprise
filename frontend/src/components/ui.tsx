import { useEffect, useRef } from "react";
import type { ReactNode } from "react";
import { AlertCircle, CheckCircle2, ChevronRight, Loader2, X } from "lucide-react";

/* =====================================================
   PAGE HEADER
   ===================================================== */

interface PageHeaderProps {
  eyebrow?: string;
  title: string;
  description?: string;
  actions?: ReactNode;
  children?: ReactNode;
}

export function PageHeader({ eyebrow, title, description, actions, children }: PageHeaderProps) {
  return (
    <header className="kf-page-header">
      <div className="kf-page-header-copy">
        {eyebrow && <p className="kf-eyebrow">{eyebrow}</p>}
        <h1 className="kf-page-title">{title}</h1>
        {description && <p className="kf-page-description">{description}</p>}
        {children}
      </div>
      {actions && <div className="kf-page-actions">{actions}</div>}
    </header>
  );
}

/* =====================================================
   STAT CARD
   ===================================================== */

type StatTone = "forest" | "green" | "amber" | "red" | "blue" | "slate" | "plum";

interface StatCardProps {
  label: string;
  value: ReactNode;
  hint?: string;
  icon?: ReactNode;
  image?: string;
  imageAlt?: string;
  layout?: "standard" | "image-right";
  tone?: StatTone;
  onClick?: () => void;
  active?: boolean;
  trend?: { value: string; direction: "up" | "down" | "flat"; good?: boolean };
}

export function StatCard({
  label,
  value,
  hint,
  icon,
  image,
  imageAlt,
  layout = "standard",
  tone = "green",
  onClick,
  active,
  trend,
}: StatCardProps) {
  const isImageRight = layout === "image-right" && Boolean(image);

  const visualElement = image ? (
    <span className={`kf-stat-media${isImageRight ? " kf-stat-media--right" : ""}`}>
      <img
        src={image}
        alt={imageAlt || label}
        className="kf-stat-img"
        loading="lazy"
        onError={(e) => {
          (e.currentTarget as HTMLElement).style.display = "none";
        }}
      />
    </span>
  ) : icon ? (
    <span className="kf-stat-icon">{icon}</span>
  ) : null;

  const content = isImageRight ? (
    <>
      <span className="kf-stat-body">
        <span className="kf-stat-label">{label}</span>
        <span className="kf-stat-value">{value}</span>
        {hint && <span className="kf-stat-hint">{hint}</span>}
        {trend && (
          <span className={`kf-trend kf-trend--${trend.direction}${trend.good === false ? " kf-trend--bad" : ""}`}>
            {trend.direction === "up" ? "▲" : trend.direction === "down" ? "▼" : "•"} {trend.value}
          </span>
        )}
      </span>
      {visualElement}
    </>
  ) : (
    <>
      {visualElement}
      <span className="kf-stat-body">
        <span className="kf-stat-label">{label}</span>
        <span className="kf-stat-value">{value}</span>
        {hint && <span className="kf-stat-hint">{hint}</span>}
        {trend && (
          <span className={`kf-trend kf-trend--${trend.direction}${trend.good === false ? " kf-trend--bad" : ""}`}>
            {trend.direction === "up" ? "▲" : trend.direction === "down" ? "▼" : "•"} {trend.value}
          </span>
        )}
      </span>
      {onClick && <ChevronRight className="kf-stat-chevron" size={16} aria-hidden="true" />}
    </>
  );

  const classes = `kf-stat kf-stat--${tone}${image ? " kf-stat--has-image" : ""}${
    isImageRight ? " kf-stat--image-right" : ""
  }${onClick ? " kf-stat--interactive" : ""}${active ? " is-active" : ""}`;

  if (onClick) {
    return (
      <button type="button" className={classes} onClick={onClick}>
        {content}
      </button>
    );
  }

  return <div className={classes}>{content}</div>;
}

/* =====================================================
   PANEL
   ===================================================== */

interface PanelProps {
  title?: string;
  subtitle?: string;
  actions?: ReactNode;
  children: ReactNode;
  className?: string;
  id?: string;
}

export function Panel({ title, subtitle, actions, children, className = "", id }: PanelProps) {
  return (
    <section className={`kf-panel ${className}`} id={id}>
      {(title || actions) && (
        <div className="kf-panel-header">
          <div>
            {title && <h2 className="kf-panel-title">{title}</h2>}
            {subtitle && <p className="kf-panel-subtitle">{subtitle}</p>}
          </div>
          {actions && <div className="kf-panel-actions">{actions}</div>}
        </div>
      )}
      <div className="kf-panel-body">{children}</div>
    </section>
  );
}

/* =====================================================
   EMPTY / LOADING / ALERTS
   ===================================================== */

interface EmptyStateProps {
  icon?: ReactNode;
  title: string;
  description?: string;
  action?: ReactNode;
  compact?: boolean;
}

export function EmptyState({ icon, title, description, action, compact }: EmptyStateProps) {
  return (
    <div className={`kf-empty${compact ? " kf-empty--compact" : ""}`}>
      {icon && <div className="kf-empty-icon">{icon}</div>}
      <h3>{title}</h3>
      {description && <p>{description}</p>}
      {action && <div className="kf-empty-action">{action}</div>}
    </div>
  );
}

export function LoadingBlock({ label = "Loading…" }: { label?: string }) {
  return (
    <div className="kf-loading" role="status" aria-live="polite">
      <Loader2 size={20} className="kf-spin" />
      <span>{label}</span>
    </div>
  );
}

export function ErrorBanner({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <div className="kf-alert kf-alert--error" role="alert">
      <AlertCircle size={18} />
      <span>{message}</span>
      {onRetry && (
        <button type="button" className="kf-alert-action" onClick={onRetry}>
          Try again
        </button>
      )}
    </div>
  );
}

export function Notice({
  children,
  tone = "success",
}: {
  children: ReactNode;
  tone?: "success" | "warning" | "info";
}) {
  return (
    <div className={`kf-alert kf-alert--${tone}`} role="status">
      {tone === "success" ? <CheckCircle2 size={18} /> : <AlertCircle size={18} />}
      <span>{children}</span>
    </div>
  );
}

/* =====================================================
   BADGE
   ===================================================== */

type BadgeTone = "green" | "amber" | "red" | "blue" | "slate" | "plum" | "forest";

export function Badge({
  children,
  tone = "slate",
  dot,
}: {
  children: ReactNode;
  tone?: BadgeTone;
  dot?: boolean;
}) {
  return (
    <span className={`kf-badge kf-badge--${tone}`}>
      {dot && <span className="kf-badge-dot" />}
      {children}
    </span>
  );
}

/* =====================================================
   BUTTONS
   ===================================================== */

type ButtonVariant = "primary" | "secondary" | "ghost" | "danger" | "soft";

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: "sm" | "md" | "lg";
  icon?: ReactNode;
  loading?: boolean;
  block?: boolean;
}

export function Button({
  variant = "primary",
  size,
  icon,
  loading,
  block,
  className = "",
  children,
  disabled,
  ...rest
}: ButtonProps) {
  return (
    <button
      type="button"
      className={`kf-btn kf-btn--${variant}${block ? " kf-btn--block" : ""}${size && size !== "md" ? " kf-btn--" + size : ""} ${className}`}
      disabled={disabled || loading}
      {...rest}
    >
      {loading ? <Loader2 size={16} className="kf-spin" /> : icon}
      {children && <span>{children}</span>}
    </button>
  );
}

export function IconButton({
  label,
  icon,
  onClick,
  tone = "neutral",
  disabled,
}: {
  label: string;
  icon: ReactNode;
  onClick: () => void;
  tone?: "neutral" | "danger";
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      className={`kf-icon-btn kf-icon-btn--${tone}`}
      onClick={onClick}
      aria-label={label}
      title={label}
      disabled={disabled}
    >
      {icon}
    </button>
  );
}

/* =====================================================
   FIELDS
   ===================================================== */

interface FieldProps {
  label: string;
  htmlFor?: string;
  hint?: ReactNode;
  error?: string;
  required?: boolean;
  children: ReactNode;
  className?: string;
}

export function Field({ label, htmlFor, hint, error, required, children, className = "" }: FieldProps) {
  return (
    <div className={`kf-field ${className}`}>
      <label htmlFor={htmlFor} className="kf-label">
        {label}
        {required && <span className="kf-required">*</span>}
      </label>
      {children}
      {error ? <p className="kf-field-error">{error}</p> : hint ? <p className="kf-field-hint">{hint}</p> : null}
    </div>
  );
}

/* =====================================================
   SEGMENTED CONTROL
   ===================================================== */

interface SegmentedOption {
  value: string;
  label: string;
  count?: number;
  icon?: ReactNode;
}

export function Segmented({
  options,
  value,
  onChange,
  label,
}: {
  options: SegmentedOption[];
  value: string;
  onChange: (value: string) => void;
  label?: string;
}) {
  return (
    <div className="kf-segmented" role="tablist" aria-label={label}>
      {options.map((option) => (
        <button
          key={option.value}
          type="button"
          role="tab"
          aria-selected={option.value === value}
          className={`kf-segment${option.value === value ? " is-active" : ""}`}
          onClick={() => onChange(option.value)}
        >
          {option.icon}
          <span>{option.label}</span>
          {option.count !== undefined && <span className="kf-segment-count">{option.count}</span>}
        </button>
      ))}
    </div>
  );
}

/* =====================================================
   MODAL
   ===================================================== */

interface ModalProps {
  open: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string;
  children: ReactNode;
  footer?: ReactNode;
  size?: "sm" | "md" | "lg";
}

export function Modal({ open, onClose, title, subtitle, children, footer, size = "md" }: ModalProps) {
  const dialogRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function handleKey(event: KeyboardEvent) {
      if (event.key === "Escape") {
        onClose();
        return;
      }
      if (event.key === "Tab" && dialogRef.current) {
        const focusable = Array.from(
          dialogRef.current.querySelectorAll<HTMLElement>(
            'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
          )
        ).filter((el) => !el.closest("[aria-hidden]"));
        if (focusable.length === 0) return;
        const first = focusable[0];
        const last = focusable[focusable.length - 1];
        if (event.shiftKey) {
          if (document.activeElement === first) {
            event.preventDefault();
            last.focus();
          }
        } else {
          if (document.activeElement === last) {
            event.preventDefault();
            first.focus();
          }
        }
      }
    }
    document.addEventListener("keydown", handleKey);
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", handleKey);
      document.body.style.overflow = previous;
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="kf-modal-overlay" role="dialog" aria-modal="true" aria-label={title} onMouseDown={onClose}>
      <div
        ref={dialogRef}
        className={`kf-modal kf-modal--${size}`}
        onMouseDown={(event) => event.stopPropagation()}
      >
        <div className="kf-modal-header">
          <div>
            <h2>{title}</h2>
            {subtitle && <p>{subtitle}</p>}
          </div>
          <IconButton label="Close dialog" icon={<X size={18} />} onClick={onClose} />
        </div>
        <div className="kf-modal-body">{children}</div>
        {footer && <div className="kf-modal-footer">{footer}</div>}
      </div>
    </div>
  );
}

/* =====================================================
   HELPERS
   ===================================================== */

export function InlineMeta({ children }: { children: ReactNode }) {
  return <p className="kf-inline-meta">{children}</p>;
}

export function Divider() {
  return <div className="kf-divider" role="separator" />;
}

export function KeyValue({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="kf-keyvalue">
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

/* =====================================================
   SPINNER
   ===================================================== */

export function Spinner({ size = "md" }: { size?: "sm" | "md" | "lg" }) {
  const px = size === "sm" ? 16 : size === "lg" ? 28 : 20;
  return <Loader2 size={px} className="kf-spin" aria-hidden="true" />;
}

/* =====================================================
   CSS BAR
   ===================================================== */

interface CssBarProps {
  label: string;
  value: number;
  max: number;
  formatted: string;
  tone?: "green" | "red" | "amber" | "blue";
}

export function CssBar({ label, value, max, formatted, tone = "green" }: CssBarProps) {
  const pct = max > 0 ? Math.min(100, (value / max) * 100) : 0;
  const fillClass = `kf-bar-fill${tone !== "green" ? " kf-bar-fill--" + tone : ""}`;
  return (
    <div className="kf-bar-row">
      <span className="kf-bar-label" title={label}>{label}</span>
      <div className="kf-bar-track">
        <div className={fillClass} style={{ width: `${pct}%` }} />
      </div>
      <span className="kf-bar-value">{formatted}</span>
    </div>
  );
}

/* =====================================================
   CARD
   ===================================================== */

interface CardProps {
  title?: ReactNode;
  subtitle?: ReactNode;
  actions?: ReactNode;
  footer?: ReactNode;
  children: ReactNode;
  className?: string;
}

export function Card({ title, subtitle, actions, footer, children, className = "" }: CardProps) {
  return (
    <div className={`kf-panel ${className}`}>
      {(title || actions) && (
        <div className="kf-panel-header">
          <div>
            {title && <h2 className="kf-panel-title">{title}</h2>}
            {subtitle && <p className="kf-panel-subtitle">{subtitle}</p>}
          </div>
          {actions && <div className="kf-panel-actions">{actions}</div>}
        </div>
      )}
      <div className="kf-panel-body">{children}</div>
      {footer && <div className="kf-panel-footer">{footer}</div>}
    </div>
  );
}
