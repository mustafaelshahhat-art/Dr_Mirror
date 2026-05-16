interface QueryErrorStateProps {
  message: string;
  retryLabel: string;
  onRetry: () => void;
}

export function QueryErrorState({ message, retryLabel, onRetry }: QueryErrorStateProps) {
  return (
    <div
      role="alert"
      className="flex items-start justify-between gap-3 rounded-large border border-danger/30 bg-danger/10 p-4 text-sm text-danger"
    >
      <span>{message}</span>
      <button
        type="button"
        onClick={onRetry}
        className="shrink-0 font-medium underline underline-offset-2 hover:no-underline"
      >
        {retryLabel}
      </button>
    </div>
  );
}
