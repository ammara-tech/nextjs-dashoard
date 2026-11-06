export type StockItem = { id: string; name: string };
export type StockBatch = {
  item_id: string;
  quantity: number;
  expires_on: string | null;
  available: boolean;
};

export type StockAlert = {
  kind: 'low' | 'expiring' | 'expired';
  itemName: string;
  detail: string;
};

export const LOW_STOCK_AT = 10;
export const EXPIRY_WARNING_DAYS = 30;

const DAY = 24 * 60 * 60 * 1000;

/** Pure function so it can be tested: what needs attention in the stock room today. */
export function computeStockAlerts(
  items: StockItem[],
  batches: StockBatch[],
  today: Date = new Date(),
): StockAlert[] {
  const start = Date.UTC(today.getFullYear(), today.getMonth(), today.getDate());
  const alerts: StockAlert[] = [];

  for (const item of items) {
    const own = batches.filter((batch) => batch.item_id === item.id);
    const usable = own.filter(
      (batch) =>
        batch.available &&
        batch.quantity > 0 &&
        (batch.expires_on === null || Date.parse(`${batch.expires_on}T00:00:00Z`) >= start),
    );
    const total = usable.reduce((sum, batch) => sum + batch.quantity, 0);
    if (total <= LOW_STOCK_AT) {
      alerts.push({
        kind: 'low',
        itemName: item.name,
        detail: total === 0 ? 'None left' : `${total} left`,
      });
    }
    for (const batch of own) {
      if (!batch.expires_on || batch.quantity <= 0) continue;
      const days = Math.floor((Date.parse(`${batch.expires_on}T00:00:00Z`) - start) / DAY);
      if (days < 0) {
        alerts.push({
          kind: 'expired',
          itemName: item.name,
          detail: `${batch.quantity} expired ${batch.expires_on}`,
        });
      } else if (days <= EXPIRY_WARNING_DAYS) {
        alerts.push({
          kind: 'expiring',
          itemName: item.name,
          detail: `${batch.quantity} expire in ${days} day${days === 1 ? '' : 's'} (${batch.expires_on})`,
        });
      }
    }
  }
  const order = { expired: 0, expiring: 1, low: 2 } as const;
  return alerts.sort((a, b) => order[a.kind] - order[b.kind] || a.itemName.localeCompare(b.itemName));
}
