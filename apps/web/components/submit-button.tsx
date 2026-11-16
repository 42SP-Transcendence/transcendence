interface SubmitButtonProps {
  pending: boolean;
  label: string;
  pendingLabel: string;
}

/**
 * Form submit button that is disabled and relabelled while the request is in flight.
 */
export function SubmitButton({ pending, label, pendingLabel }: SubmitButtonProps) {
  return (
    <button
      type="submit"
      disabled={pending}
      className="bg-button text-button-ink hover:bg-button-hover focus-visible:outline-focus w-full rounded-sm px-4 py-3 font-bold focus-visible:outline-3 focus-visible:outline-offset-2 disabled:cursor-not-allowed disabled:opacity-70"
    >
      {pending ? pendingLabel : label}
    </button>
  );
}
