import { ResourcePlanEntry, RateCardEntry } from '../types/index';

export function calcResourceEntry(
  entry: ResourcePlanEntry,
  rateCard: RateCardEntry[]
): ResourcePlanEntry {
  const rate =
    rateCard.find((r) => r.role === entry.role && r.country === entry.country) ||
    rateCard.find((r) => r.role === entry.role) || {
      cost_rate: 0,
      bill_rate: 0,
      currency: 'USD',
    };

  const totalHours = entry.weeks * entry.hours_per_week;

  return {
    ...entry,
    total_cost: totalHours * rate.cost_rate,
    total_price: totalHours * rate.bill_rate,
  };
}

export function calcScenario(
  basePrice: number,
  baseCost: number,
  contingencyPercent: number | null,
  discountPercent: number | null,
  targetMarginPercent: number | null
): { price: number; cost: number; margin: number } {
  const adjustedCost = contingencyPercent
    ? baseCost * (1 + contingencyPercent / 100)
    : baseCost;

  let finalPrice: number;
  if (targetMarginPercent !== null && targetMarginPercent !== undefined) {
    const tm = targetMarginPercent / 100;
    finalPrice = tm >= 1 ? adjustedCost : adjustedCost / (1 - tm);
  } else if (discountPercent !== null && discountPercent !== undefined) {
    finalPrice = basePrice * (1 - discountPercent / 100);
  } else {
    finalPrice = basePrice;
  }

  const margin =
    finalPrice > 0 ? ((finalPrice - adjustedCost) / finalPrice) * 100 : 0;

  return { price: finalPrice, cost: adjustedCost, margin };
}

export function calcMilestoneAmount(
  milestone: { type: 'percentage' | 'fixed'; value: number },
  totalPrice: number
): number {
  if (milestone.type === 'percentage') {
    return (milestone.value / 100) * totalPrice;
  }
  return milestone.value;
}

// Legacy compat export
export const recalculateEntry = calcResourceEntry;
