import { getT } from '@/app/lib/lang';
import type { StockAlert } from '../lib/stock';

const styles: Record<StockAlert['kind'], string> = {
  expired: 'border-red-200 bg-red-50 text-red-700',
  expiring: 'border-amber-200 bg-amber-50 text-amber-800',
  low: 'border-sky-200 bg-sky-50 text-sky-800',
};

export default async function StockAlerts({ alerts }: { alerts: StockAlert[] }) {
  const { t } = await getT();
  const labels = {
    expired: t('stock.expired'),
    expiring: t('stock.expiring'),
    low: t('stock.low'),
  } as const;

  return (
    <section
      aria-label={t('stock.title')}
      className="rounded-2xl border border-[#e9eaf0] bg-white p-5"
    >
      <h2 className="font-semibold">{t('stock.title')}</h2>
      {alerts.length === 0 ? (
        <p className="mt-2 text-sm text-[#727a90]">{t('stock.ok')}</p>
      ) : (
        <ul className="mt-3 grid gap-2 sm:grid-cols-2">
          {alerts.map((alert, index) => (
            <li
              className={`rounded-xl border px-3 py-2 text-sm ${styles[alert.kind]}`}
              key={`${alert.kind}-${alert.itemName}-${index}`}
            >
              <span className="block text-xs font-semibold uppercase tracking-wide">
                {labels[alert.kind]}
              </span>
              <span className="font-medium">{alert.itemName}</span>: {alert.detail}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
