export function formatCurrency(
  value: number,
  currency = 'USD',
  exchangeRate = 1
): string {
  const converted = value * (exchangeRate || 1);
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: currency || 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(converted);
}

export function formatNumber(value: number, decimals = 2): string {
  return new Intl.NumberFormat('en-US', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(value);
}

export function formatPercent(value: number, decimals = 1): string {
  return `${formatNumber(value, decimals)}%`;
}

export function calcMarginPercent(price: number, cost: number): number {
  if (!price || price === 0) return 0;
  return ((price - cost) / price) * 100;
}

export function getRiskLevel(score: number): 'Low' | 'Medium' | 'High' {
  if (score <= 33) return 'Low';
  if (score <= 66) return 'Medium';
  return 'High';
}

export function calcProjectDurationWeeks(startDate: string | null, endDate: string | null): number {
  if (!startDate || !endDate) return 0;
  const start = new Date(startDate);
  const end = new Date(endDate);
  const diffMs = end.getTime() - start.getTime();
  if (diffMs <= 0) return 0;
  return Math.ceil(diffMs / (1000 * 60 * 60 * 24 * 7));
}
