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
    className="rounded-3xl border border-[#e8dccf] bg-white/85 p-5 shadow-[0_20px_45px_rgba(93,68,37,0.08)] backdrop-blur"
  >
    <div className="flex items-center justify-between">
      <div className="rounded-2xl bg-[#f6ede1] p-3 text-[#6f5438]">
        <Icon size={18} />
      </div>
      <span className="text-xs font-semibold uppercase tracking-[0.2em] text-[#9b8570]">{label}</span>
    </div>
    <div className="mt-6 text-3xl font-semibold tracking-tight text-[#201812]">{value}</div>
    <p className="mt-2 text-sm text-[#6f604f]">{hint}</p>
  </motion.div>
);
