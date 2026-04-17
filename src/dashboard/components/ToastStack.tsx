import { AnimatePresence, motion } from 'framer-motion';
import { CheckCircle2 } from 'lucide-react';
import type { ToastItem } from '../types';

type ToastStackProps = {
  toasts: ToastItem[];
};

export const ToastStack = ({ toasts }: ToastStackProps) => (
  <div className="pointer-events-none fixed right-4 top-4 z-[130] flex w-full max-w-sm flex-col gap-3">
    <AnimatePresence>
      {toasts.map((toast) => (
        <motion.div
          key={toast.id}
          initial={{ opacity: 0, y: -12 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -12 }}
          className="pointer-events-auto rounded-2xl border border-[#e4d7c7] bg-white px-4 py-3 shadow-lg"
        >
          <div className="flex items-start gap-3">
            <div className="rounded-full bg-emerald-50 p-2 text-emerald-600">
              <CheckCircle2 size={16} />
            </div>
            <div>
              <div className="font-medium text-brand-dark">{toast.title}</div>
              {toast.description ? <div className="mt-1 text-sm text-brand-dark/80">{toast.description}</div> : null}
            </div>
          </div>
        </motion.div>
      ))}
    </AnimatePresence>
  </div>
);
