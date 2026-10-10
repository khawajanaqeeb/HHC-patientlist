export const DEFAULT_USD_TO_PKR_RATE = 278.5;

export function formatCurrency(
  amountPkr: number,
  currency: 'PKR' | 'USD' = 'PKR',
  usdToPkrRate: number = DEFAULT_USD_TO_PKR_RATE
): string {
  const safePkr = Number(amountPkr) || 0;
  if (currency === 'USD') {
    const val = (usdToPkrRate && usdToPkrRate > 0) ? safePkr / usdToPkrRate : 0;
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(val);
  }
  return new Intl.NumberFormat('en-PK', {
    style: 'currency',
    currency: 'PKR',
    maximumFractionDigits: 0,
  }).format(safePkr);
}

export function formatDualCurrency(
  amountPkr: number,
  usdToPkrRate: number = DEFAULT_USD_TO_PKR_RATE
): { pkr: string; usd: string } {
  const safePkr = Number(amountPkr) || 0;
  const pkr = new Intl.NumberFormat('en-PK', {
    style: 'currency',
    currency: 'PKR',
    maximumFractionDigits: 0,
  }).format(safePkr);

  const valUsd = (usdToPkrRate && usdToPkrRate > 0) ? safePkr / usdToPkrRate : 0;
  const usd = new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(valUsd);

  return { pkr, usd };
}
