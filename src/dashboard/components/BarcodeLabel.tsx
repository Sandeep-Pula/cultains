import { useEffect, useRef } from 'react';
import JsBarcode from 'jsbarcode';

type BarcodeLabelProps = {
  value: string;
  title: string;
  subtitle?: string;
  compact?: boolean;
};

export const BarcodeLabel = ({ value, title, subtitle, compact = false }: BarcodeLabelProps) => {
  const svgRef = useRef<SVGSVGElement | null>(null);

  useEffect(() => {
    if (!svgRef.current) return;

    JsBarcode(svgRef.current, value, {
      format: 'CODE128',
      displayValue: true,
      height: compact ? 42 : 58,
      margin: 0,
      width: compact ? 1.6 : 2,
      fontOptions: 'bold',
      fontSize: compact ? 11 : 13,
      textMargin: 5,
    });
  }, [compact, value]);

  return (
    <div className={`rounded-[24px] border border-brand-30 bg-white ${compact ? 'p-4' : 'p-5'} shadow-sm`}>
      <div className="min-w-0">
        <div className="truncate text-sm font-semibold text-brand-dark">{title}</div>
        {subtitle ? <div className="mt-1 truncate text-xs text-brand-dark/55">{subtitle}</div> : null}
      </div>
      <div className="mt-4 overflow-hidden rounded-2xl border border-brand-30 bg-brand-60/30 px-3 py-3">
        <svg ref={svgRef} className="h-auto w-full" role="img" aria-label={`Barcode for ${title}`} />
      </div>
      <div className="mt-3 text-[11px] font-semibold uppercase tracking-[0.12em] text-brand-dark/55">{value}</div>
    </div>
  );
};
