import { type InputHTMLAttributes, type Ref, useId } from 'react';

interface TextFieldProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'id'> {
  label: string;
  hint?: string;
  error?: string;
  ref?: Ref<HTMLInputElement>;
}

/**
 * Labelled text input that links its hint and error through aria-describedby and flags aria-invalid.
 */
export function TextField({ label, hint, error, ref, ...inputProps }: TextFieldProps) {
  const id = useId();
  const hintId = `${id}-hint`;
  const errorId = `${id}-error`;
  const describedBy = [hint ? hintId : null, error ? errorId : null].filter(Boolean).join(' ');
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={id} className="font-bold">
        {label}
      </label>
      <input
        {...inputProps}
        id={id}
        ref={ref}
        aria-invalid={error ? true : undefined}
        aria-describedby={describedBy || undefined}
        className="border-muted bg-surface text-ink aria-invalid:border-alert focus-visible:outline-focus w-full rounded-sm border-2 px-3 py-2.5 text-base focus-visible:outline-3 focus-visible:outline-offset-2"
      />
      {hint ? (
        <p id={hintId} className="text-muted text-sm">
          {hint}
        </p>
      ) : null}
      {error ? (
        <p id={errorId} className="text-alert text-sm font-bold">
          {error}
        </p>
      ) : null}
    </div>
  );
}
