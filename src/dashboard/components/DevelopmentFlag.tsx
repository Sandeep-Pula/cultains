import { AlertTriangle } from 'lucide-react';

type DevelopmentFlagProps = {
  pageLabel: string;
};

export const DevelopmentFlag = ({ pageLabel }: DevelopmentFlagProps) => (
  <div className="rounded-[24px] border border-red-200 bg-red-50 px-4 py-3 shadow-sm">
    <div className="flex items-start gap-3">
      <div className="mt-0.5 rounded-full bg-red-100 p-2 text-red-600">
        <AlertTriangle size={16} />
      </div>
      <div>
        <div className="text-sm font-semibold uppercase tracking-[0.16em] text-red-700">Under Development</div>
        <p className="mt-1 text-sm text-red-900">
          {pageLabel} is still under development and is not ready for live use yet.
        </p>
      </div>
    </div>
  </div>
);
