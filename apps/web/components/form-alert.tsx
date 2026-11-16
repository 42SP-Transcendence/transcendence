interface FormAlertProps {
  message?: string;
}

/**
 * Live region that announces server errors; it stays mounted so screen readers catch every change.
 */
export function FormAlert({ message }: FormAlertProps) {
  return (
    <div
      role="alert"
      className={
        message ? 'border-alert bg-alert-soft text-ink rounded-sm border-l-4 px-4 py-3' : undefined
      }
    >
      {message}
    </div>
  );
}
