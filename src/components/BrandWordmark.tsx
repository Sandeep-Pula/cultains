import clsx from 'clsx';

type BrandWordmarkProps = {
  className?: string;
  aiClassName?: string;
  vyapariClassName?: string;
  showDotCom?: boolean;
};

export const BrandWordmark = ({
  className,
  aiClassName,
  vyapariClassName,
  showDotCom = false,
}: BrandWordmarkProps) => (
  <span className={clsx('inline-flex items-baseline gap-0', className)}>
    <span className={clsx(aiClassName)} style={{ color: 'var(--color-logo-blue)' }}>
      AI
    </span>
    <span className={clsx(vyapariClassName)} style={{ color: 'var(--color-logo-green)' }}>
      vyapari
    </span>
    {showDotCom ? (
      <span style={{ color: 'var(--color-brand-dark)' }}>.com</span>
    ) : null}
  </span>
);
