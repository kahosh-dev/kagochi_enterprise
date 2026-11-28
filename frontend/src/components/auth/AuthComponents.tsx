import { useState, type ReactNode, type RefObject, type KeyboardEvent } from "react";
import { AlertCircle, ArrowLeft, CheckCircle2, Eye, EyeOff } from "lucide-react";

interface TextFieldProps {
  id: string;
  label: string;
  value: string;
  placeholder: string;
  autoComplete: string;
  onChange: (value: string) => void;
  onBlur?: () => void;
  type?: "text" | "email";
  autoFocus?: boolean;
  required?: boolean;
  maxLength?: number;
  error?: ReactNode;
  errorText?: string;
}

export function TextField({
  id,
  label,
  value,
  placeholder,
  autoComplete,
  onChange,
  onBlur,
  type = "text",
  autoFocus,
  required = true,
  maxLength,
  error,
  errorText,
}: TextFieldProps) {
  const hasError = Boolean(errorText || error);
  const describedBy = hasError ? `${id}-error` : undefined;
  return (
    <div className="kf-field">
      <label htmlFor={id} className="kf-label">
        {label}<span className="kf-required" aria-hidden="true">*</span>
      </label>
      <input
        id={id}
        type={type}
        className={`kf-input${hasError ? " kf-input--error" : ""}`}
        placeholder={placeholder}
        value={value}
        autoComplete={autoComplete}
        autoFocus={autoFocus}
        onChange={(event) => onChange(event.target.value)}
        onBlur={onBlur}
        required={required}
        maxLength={maxLength}
        aria-invalid={hasError}
        aria-describedby={describedBy}
      />
      <div
        className={`kf-field-error kf-field-error-slot${hasError ? "" : " is-empty"}`}
        id={`${id}-error`}
        role={hasError ? "alert" : undefined}
        aria-hidden={!hasError}
      >
        {hasError && <><AlertCircle size={13} aria-hidden="true" />{error ?? errorText}</>}
      </div>
    </div>
  );
}

interface PasswordFieldProps {
  id: string;
  label: string;
  value: string;
  placeholder: string;
  autoComplete: string;
  onChange: (value: string) => void;
  onBlur?: () => void;
  onKeyDown?: (event: KeyboardEvent<HTMLInputElement>) => void;
  autoFocus?: boolean;
  error?: string;
  validMessage?: string;
  valid?: boolean;
  hint?: ReactNode;
}

export function PasswordField({
  id,
  label,
  value,
  placeholder,
  autoComplete,
  onChange,
  onBlur,
  onKeyDown,
  autoFocus,
  error,
  validMessage,
  valid,
  hint,
}: PasswordFieldProps) {
  const [visible, setVisible] = useState(false);
  const hasError = Boolean(error);
  const errorId = `${id}-error`;
  const hintId = `${id}-hint`;
  const describedBy = [hint !== undefined ? hintId : "", hasError ? errorId : "", validMessage ? `${id}-validation` : ""]
    .filter(Boolean)
    .join(" ") || undefined;

  return (
    <div className="kf-field">
      <label htmlFor={id} className="kf-label">
        {label}<span className="kf-required" aria-hidden="true">*</span>
      </label>
      <div className="kf-pw-wrap">
        <input
          id={id}
          type={visible ? "text" : "password"}
          className={`kf-input kf-input--pw${hasError ? " kf-input--error" : valid ? " kf-input--ok" : ""}`}
          placeholder={placeholder}
          value={value}
          autoComplete={autoComplete}
          autoFocus={autoFocus}
          onChange={(event) => onChange(event.target.value)}
          onBlur={onBlur}
          onKeyDown={onKeyDown}
          required
          maxLength={128}
          aria-invalid={hasError}
          aria-describedby={describedBy}
        />
        <button
          type="button"
          className="kf-pw-toggle"
          onClick={() => setVisible((previous) => !previous)}
          aria-label={visible ? `Hide ${label.toLowerCase()}` : `Show ${label.toLowerCase()}`}
          aria-pressed={visible}
        >
          {visible ? <EyeOff size={17} aria-hidden="true" /> : <Eye size={17} aria-hidden="true" />}
        </button>
      </div>
      {hint !== undefined && <div className="kf-password-hint-wrap" id={hintId}>{hint}</div>}
      <div
        className={`kf-auth-field-feedback${hasError ? " kf-field-error" : validMessage ? " kf-field-match" : " is-empty"}`}
        id={hasError ? errorId : validMessage ? `${id}-validation` : undefined}
        role={hasError ? "alert" : validMessage ? "status" : undefined}
        aria-hidden={!hasError && !validMessage}
      >
        {hasError ? <><AlertCircle size={13} aria-hidden="true" /> {error}</> : validMessage ? <><CheckCircle2 size={12} aria-hidden="true" /> {validMessage}</> : null}
      </div>
    </div>
  );
}

interface ButtonProps {
  children: ReactNode;
  onClick?: () => void;
  disabled?: boolean;
  busy?: boolean;
  className?: string;
  ariaLabel?: string;
}

export function PrimaryButton({ children, onClick, disabled = false, busy = false, className = "", ariaLabel }: ButtonProps) {
  return (
    <button
      type="submit"
      className={`kf-btn kf-btn--primary kf-auth-submit ${className}`.trim()}
      onClick={onClick}
      disabled={disabled}
      aria-busy={busy}
      aria-label={ariaLabel}
    >
      {children}
    </button>
  );
}

export function SecondaryButton({ children, onClick, className = "" }: ButtonProps) {
  return (
    <button type="button" className={`kf-btn kf-btn--outline kf-auth-switch-btn ${className}`.trim()} onClick={onClick}>
      {children}
    </button>
  );
}

interface GoogleButtonProps {
  clientId?: string;
  ready: boolean;
  targetRef: RefObject<HTMLDivElement | null>;
  onFallbackClick: () => void;
}

export function GoogleButton({ clientId, ready, targetRef, onFallbackClick }: GoogleButtonProps) {
  return (
    <>
      {clientId && <div ref={targetRef} className="kf-google-wrapper" aria-label="Sign in with Google" />}
      {!ready && (
        <button type="button" className="kf-google-fallback" onClick={onFallbackClick} aria-label="Continue with Google">
          <svg className="kf-google-svg" viewBox="0 0 24 24" aria-hidden="true" width="18" height="18">
            <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
            <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
            <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" />
            <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
          </svg>
          <span>Continue with Google</span>
        </button>
      )}
    </>
  );
}

interface BackLinkProps {
  onClick: () => void;
}

export function BackLink({ onClick }: BackLinkProps) {
  return (
    <button type="button" className="kf-auth-back" onClick={onClick} aria-label="Back to website">
      <ArrowLeft size={14} className="kf-auth-back-arrow" aria-hidden="true" />
      Back to website
    </button>
  );
}

interface StrengthMeterProps {
  value: string;
}

export function StrengthMeter({ value }: StrengthMeterProps) {
  const strength = value.length === 0 ? 0 : value.length < 6 ? 1 : value.length < 10 ? 2 : 3;
  const label = strength === 0 ? "" : strength === 1 ? "Weak" : strength === 2 ? "Fair" : "Strong";
  return (
    <div className="kf-strength" role={value ? "status" : undefined} aria-live={value ? "polite" : undefined} aria-label={value ? `Password strength: ${label}` : undefined} aria-hidden={!value}>
      <div className="kf-strength-bars">
        {[1, 2, 3].map((level) => (
          <div
            key={level}
            className={`kf-strength-bar${strength >= level ? " is-filled" : ""}${strength === 1 && level === 1 ? " is-weak" : ""}${strength === 2 && level <= 2 ? " is-fair" : ""}`}
          />
        ))}
      </div>
      <span className="kf-strength-label">{label}</span>
    </div>
  );
}
