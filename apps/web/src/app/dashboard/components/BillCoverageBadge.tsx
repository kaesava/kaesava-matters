import { t } from '@money-matters/i18n';
import { Badge, useCurrencyLocale } from '@money-matters/ui/web';
import { formatCurrency } from '@money-matters/ui/format';

export interface BillCoverageBadgeProps {
  status: 'COVERED' | 'SHORT_BY' | 'NO_SCHEDULE';
  shortfallAmount?: string | number | null;
  className?: string;
}

export function BillCoverageBadge({
  status,
  shortfallAmount,
  className = '',
}: BillCoverageBadgeProps) {
  const { locale, currency } = useCurrencyLocale();

  if (status === 'COVERED') {
    return (
      <Badge variant="success" className={className}>
        {t('billCoverage.covered')}
      </Badge>
    );
  }

  if (status === 'SHORT_BY') {
    const numericShortfall = typeof shortfallAmount === 'number'
      ? shortfallAmount
      : parseFloat(String(shortfallAmount ?? 0).replace(/[^0-9.-]/g, ''));
    if (!Number.isFinite(numericShortfall) || numericShortfall < 0.01) {
      return (
        <Badge variant="success" className={className}>
          {t('billCoverage.covered')}
        </Badge>
      );
    }
    const formatted = formatCurrency(numericShortfall, locale, currency);
    return (
      <Badge variant="danger" className={className}>
        {t('billCoverage.shortBy', { amount: formatted })}
      </Badge>
    );
  }

  return (
    <Badge variant="warning" className={className}>
      {t('billCoverage.noSchedule')}
    </Badge>
  );
}
