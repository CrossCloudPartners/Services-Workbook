import { ResourcePlanEntry, RateCardEntry } from '../types';

export const calculateTotalHours = (entry: ResourcePlanEntry) => {
  const dailySum = Object.values(entry.dailyAllocation || {}).reduce((sum, h) => sum + (h || 0), 0);
  const weeklySum = Object.values(entry.weeklyAllocation || {}).reduce((sum, h) => sum + (h || 0), 0);
  
  // Return the sum of allocations. If both are empty or zero, it returns 0.
  // We prioritize daily if it has any non-zero values, otherwise weekly.
  return dailySum > 0 ? dailySum : weeklySum;
};

export const recalculateEntry = (entry: ResourcePlanEntry, rateCard: RateCardEntry[]) => {
  const rate = (entry.currency 
                 ? rateCard.find(r => r.role === entry.role && r.country === entry.country && r.currency === entry.currency)
                 : null)
             || rateCard.find(r => r.role === entry.role && r.country === entry.country)
             || rateCard.find(r => r.role === entry.role)
             || { costRate: 0, billRate: 0, currency: 'USD' };
  
  const totalHours = calculateTotalHours(entry);

  return {
    ...entry,
    totalCost: totalHours * rate.costRate,
    totalPrice: totalHours * rate.billRate
  };
};
