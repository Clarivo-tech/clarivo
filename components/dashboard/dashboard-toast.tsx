export function DashboardToast({
  message,
  onDismiss,
}: {
  message: string;
  onDismiss: () => void;
}) {
  return (
    <div
      role="status"
      className="fixed top-6 right-6 z-[100] flex max-w-sm items-start gap-3 rounded-xl border border-orange-200 bg-white px-4 py-3 shadow-lg shadow-orange-500/10"
    >
      <p className="flex-1 text-sm text-zinc-800">{message}</p>
      <button
        type="button"
        onClick={onDismiss}
        className="shrink-0 text-xs font-medium text-[#F97316] hover:text-[#111827]"
      >
        Dismiss
      </button>
    </div>
  );
}
