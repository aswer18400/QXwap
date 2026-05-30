import type { InputHTMLAttributes, ReactNode, SelectHTMLAttributes, TextareaHTMLAttributes } from "react";

function FieldShell({
  label,
  hint,
  error,
  required,
  children
}: {
  label?: string;
  hint?: string;
  error?: string;
  required?: boolean;
  children: ReactNode;
}) {
  return (
    <label className="form-stack app-field">
      {label ? (
        <span>
          {label}
          {required ? <b className="field-required"> *</b> : null}
        </span>
      ) : null}
      {children}
      {hint ? <small className="app-field-hint">{hint}</small> : null}
      {error ? <small className="field-error">{error}</small> : null}
    </label>
  );
}

export function InputField({
  label,
  hint,
  error,
  required,
  ...props
}: InputHTMLAttributes<HTMLInputElement> & {
  label?: string;
  hint?: string;
  error?: string;
  required?: boolean;
}) {
  return (
    <FieldShell label={label} hint={hint} error={error} required={required}>
      <input {...props} />
    </FieldShell>
  );
}

export function SelectField({
  label,
  hint,
  error,
  required,
  children,
  ...props
}: SelectHTMLAttributes<HTMLSelectElement> & {
  label?: string;
  hint?: string;
  error?: string;
  required?: boolean;
  children: ReactNode;
}) {
  return (
    <FieldShell label={label} hint={hint} error={error} required={required}>
      <select {...props}>{children}</select>
    </FieldShell>
  );
}

export function TextareaField({
  label,
  hint,
  error,
  required,
  ...props
}: TextareaHTMLAttributes<HTMLTextAreaElement> & {
  label?: string;
  hint?: string;
  error?: string;
  required?: boolean;
}) {
  return (
    <FieldShell label={label} hint={hint} error={error} required={required}>
      <textarea {...props} />
    </FieldShell>
  );
}
