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
    <div className="fixed inset-0 z-[120] flex items-center justify-center bg-[#1f1711]/25 p-4 backdrop-blur-sm">
      <div className="w-full max-w-md rounded-3xl border border-[#eadfd2] bg-white p-6 shadow-2xl">
        <h3 className="text-xl font-semibold text-[#1f1711]">{title}</h3>
        <p className="mt-2 text-sm leading-6 text-[#6f604f]">{description}</p>
        <div className="mt-6 flex justify-end gap-3">
          <button onClick={onCancel} className="rounded-2xl border border-[#eadfd2] px-4 py-2 text-sm font-medium text-[#6f604f]">
            Cancel
          </button>
          <button onClick={onConfirm} className="rounded-2xl bg-[#8f473f] px-4 py-2 text-sm font-medium text-white">
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
};
