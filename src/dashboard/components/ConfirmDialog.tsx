type ConfirmDialogProps = {
  open: boolean;
  title: string;
  description: string;
  confirmLabel?: string;
  onCancel: () => void;
  onConfirm: () => void;
};

export const ConfirmDialog = ({
  open,
  title,
  description,
  confirmLabel = 'Confirm',
  onCancel,
  onConfirm,
}: ConfirmDialogProps) => {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[120] flex items-center justify-center bg-brand-dark/25 p-4 backdrop-blur-sm">
      <div className="w-full max-w-md rounded-3xl border border-brand-30 bg-brand-60 p-6 shadow-2xl">
        <h3 className="text-xl font-semibold text-brand-dark">{title}</h3>
        <p className="mt-2 text-sm leading-6 text-brand-dark/80">{description}</p>
        <div className="mt-6 flex justify-end gap-3">
          <button onClick={onCancel} className="rounded-2xl border border-brand-30 px-4 py-2 text-sm font-medium text-brand-dark">
            Cancel
          </button>
          <button onClick={onConfirm} className="rounded-2xl bg-brand-10 px-4 py-2 text-sm font-medium text-brand-60 hover:opacity-90 transition">
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
};
