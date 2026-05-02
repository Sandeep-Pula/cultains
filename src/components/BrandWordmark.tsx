import clsx from 'clsx';

type BrandWordmarkProps = {
  className?: string;
  pulaClassName?: string;
  labsClassName?: string;
  showDotCom?: boolean;
};

export const BrandWordmark = ({
  className,
  pulaClassName,
  labsClassName,
  showDotCom = false,
}: BrandWordmarkProps) => (
  <span className={clsx('inline-flex items-baseline', className)} style={{ fontFamily: 'Verdana, Arial, Helvetica, sans-serif' }}>
    <span className={clsx(pulaClassName)} style={{ color: 'var(--color-logo-red)', marginRight: '0.25em' }}>
      PULA
    </span>
    <span className={clsx(labsClassName)} style={{ color: 'var(--color-logo-blue)' }}>
      labs
    </span>
    {showDotCom ? (
      <span style={{ color: 'var(--color-brand-dark)' }}>.com</span>
    ) : null}
  </span>
);

type ProductWordmarkProps = {
  className?: string;
  pulaClassName?: string;
  productClassName?: string;
};

export const ProductWordmark = ({
  className,
  pulaClassName,
  productClassName,
}: ProductWordmarkProps) => (
  <span className={clsx('inline-flex items-baseline', className)}>
    <span className={clsx(pulaClassName)} style={{ color: 'var(--color-logo-red)', marginRight: '0.25em' }}>
      PULA
    </span>
    <span className={clsx(productClassName)} style={{ color: 'var(--color-logo-blue)', fontSize: '0.78em', fontWeight: 700 }}>
      Biz
    </span>
  </span>
);
