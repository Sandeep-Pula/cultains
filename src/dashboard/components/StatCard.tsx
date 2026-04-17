import { motion } from 'framer-motion';
import type { LucideIcon } from 'lucide-react';

type StatCardProps = {
  label: string;
  value: string | number;
  hint: string;
  icon: LucideIcon;
  delay?: number;
};

export const StatCard = ({ label, value, hint, icon: Icon, delay = 0 }: StatCardProps) => (
  <motion.div
    initial={{ opacity: 0, y: 18 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ duration: 0.45, delay }}
    className="rounded-3xl border border-brand-30 bg-brand-60/85 p-5 shadow-[0_20px_45px_rgba(61,65,39,0.08)] backdrop-blur"
  >
    <div className="flex items-center justify-between">
      <div className="rounded-2xl bg-brand-30 p-3 text-brand-10">
        <Icon size={18} />
      </div>
      <span className="text-xs font-semibold uppercase tracking-[0.2em] text-brand-dark/70">{label}</span>
    </div>
    <div className="mt-6 text-3xl font-semibold tracking-tight text-brand-dark">{value}</div>
    <p className="mt-2 text-sm text-brand-dark/80">{hint}</p>
  </motion.div>
);
