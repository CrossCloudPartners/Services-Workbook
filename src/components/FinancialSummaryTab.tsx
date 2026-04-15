import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { FinancialSummary, FinancialItem, ProjectSummary, ResourcePlanEntry, RateCardEntry, Phase } from '../types';
import { Badge } from '@/components/ui/badge';
import { TrendingDown, TrendingUp, AlertCircle, DollarSign, Calculator, Copy, Check, Plus, Trash2, Calendar, CreditCard } from 'lucide-react';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { PaymentMilestone } from '../types';
import { cn } from '@/lib/utils';

interface Props {
  data: FinancialSummary;
  currency: string;
  updateData: (summary: Partial<FinancialSummary>) => void;
  projectSummary: ProjectSummary;
  updateProjectSummary: (summary: Partial<ProjectSummary>) => void;
  resourcePlan: ResourcePlanEntry[];
  rateCard: RateCardEntry[];
  phases: Phase[];
  phaseAllocation: Record<string, string>;
}

export default function FinancialSummaryTab({ 
  data, 
  currency, 
  updateData,
  projectSummary,
  updateProjectSummary,
  resourcePlan,
  rateCard,
  phases,
  phaseAllocation
}: Props) {
  const [copied, setCopied] = useState(false);

  const handleItemChange = (id: string, field: keyof FinancialItem, value: number) => {
    const newItems = data.items.map(item => {
      if (item.id === id) {
        const updatedItem = { ...item, [field]: value };
        // Recalculate margin
        if (field === 'price' || field === 'cost') {
          updatedItem.margin = updatedItem.price > 0 
            ? ((updatedItem.price - updatedItem.cost) / updatedItem.price) * 100 
            : 0;
        }
        return updatedItem;
      }
      return item;
    });
    updateData({ items: newItems });
  };

  const totals = data.items.reduce((acc, item) => ({
    price: acc.price + item.price,
    cost: acc.cost + item.cost,
  }), { price: 0, cost: 0 });

  const totalMargin = totals.price > 0 ? ((totals.price - totals.cost) / totals.price) * 100 : 0;

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency,
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(Math.ceil(val));
  };

  const getCurrencyPrefix = (code: string) => {
    const symbols: Record<string, string> = {
      'USD': '$',
      'GBP': '£',
      'EUR': '€',
      'INR': '₹',
      'AUD': '$',
      'SGD': '$',
      'VND': '₫',
    };
    return `${code} ${symbols[code] || ''}`;
  };

  const calculatePhaseData = () => {
    const phasePrices: Record<string, number> = {};
    const phaseHours: Record<string, number> = {};
    let unassignedPrice = 0;
    let unassignedHours = 0;
    
    resourcePlan.forEach(entry => {
      const rate = (entry.currency 
                     ? rateCard.find(r => r.role === entry.role && r.country === entry.country && r.currency === entry.currency)
                     : null)
                 || rateCard.find(r => r.role === entry.role && r.country === entry.country)
                 || rateCard.find(r => r.role === entry.role)
                 || { billRate: 0 };
      
      const hourlyRate = rate.billRate;

      const dailyEntries = Object.entries(entry.dailyAllocation || {});
      const hasDaily = dailyEntries.some(([_, hours]) => hours > 0);

      if (hasDaily && entry.dailyAllocation) {
        dailyEntries.forEach(([date, hours]) => {
          if (hours <= 0) return;
          
          let phaseId = phaseAllocation[date];
          
          if (!phaseId || phaseId === 'none') {
            const dateObj = new Date(date);
            while (dateObj.getDay() !== 1) dateObj.setDate(dateObj.getDate() - 1);
            const weekStart = dateObj.toISOString().split('T')[0];
            phaseId = phaseAllocation[`week_${weekStart}`];
          }

          if (phaseId && phaseId !== 'none') {
            phasePrices[phaseId] = (phasePrices[phaseId] || 0) + (hours * hourlyRate);
            phaseHours[phaseId] = (phaseHours[phaseId] || 0) + hours;
          } else {
            unassignedPrice += hours * hourlyRate;
            unassignedHours += hours;
          }
        });
      } else if (entry.weeklyAllocation) {
        Object.entries(entry.weeklyAllocation).forEach(([weekStart, hours]) => {
          if (hours <= 0) return;
          const phaseId = phaseAllocation[`week_${weekStart}`];
          if (phaseId && phaseId !== 'none') {
            phasePrices[phaseId] = (phasePrices[phaseId] || 0) + (hours * hourlyRate);
            phaseHours[phaseId] = (phaseHours[phaseId] || 0) + hours;
          } else {
            unassignedPrice += hours * hourlyRate;
            unassignedHours += hours;
          }
        });
      }
    });

    return { phasePrices, phaseHours, unassignedPrice, unassignedHours };
  };

  const { phasePrices, phaseHours, unassignedPrice, unassignedHours } = calculatePhaseData();

  const milestones = data.milestones || [];

  const handleAddMilestone = () => {
    const newMilestone: PaymentMilestone = {
      id: Math.random().toString(36).substr(2, 9),
      description: '',
      type: 'percentage',
      value: 0,
      amount: 0,
      date: new Date().toISOString().split('T')[0]
    };
    updateData({ milestones: [...milestones, newMilestone] });
  };

  const handleUpdateMilestone = (id: string, field: keyof PaymentMilestone, value: any) => {
    const updatedMilestones = milestones.map(m => {
      if (m.id === id) {
        const updated = { ...m, [field]: value };
        if (field === 'type') {
          // When switching type, reset value to 0 to avoid confusion
          updated.value = 0;
          updated.amount = 0;
        } else if (field === 'value') {
          if (updated.type === 'percentage') {
            updated.amount = (totals.price * (parseFloat(value) || 0)) / 100;
          } else {
            updated.amount = parseFloat(value) || 0;
          }
        }
        return updated;
      }
      return m;
    });
    updateData({ milestones: updatedMilestones });
  };

  const handleRemoveMilestone = (id: string) => {
    updateData({ milestones: milestones.filter(m => m.id !== id) });
  };

  const totalMilestoneAmount = milestones.reduce((sum, m) => sum + m.amount, 0);
  const milestoneDifference = totals.price - totalMilestoneAmount;

  const handleGlobalEstimateChange = (type: 'globalOptimistic' | 'globalPessimistic', value: number) => {
    updateProjectSummary({ [type]: value });
  };

  const globalOptimistic = projectSummary.globalOptimistic ?? -10;
  const globalPessimistic = projectSummary.globalPessimistic ?? 10;

  const visiblePhases = phases.filter(p => !p.isSystemOnly);
  const systemPhases = phases.filter(p => p.isSystemOnly);

  const totalMostLikely = Object.values(phasePrices).reduce((a, b) => a + b, 0) + unassignedPrice;
  const totalPhaseHours = Object.values(phaseHours).reduce((a, b) => a + b, 0) + unassignedHours;

  const copyTableToClipboard = async () => {
    const tableHtml = `
      <table border="1" style="border-collapse: collapse; width: 100%; font-family: sans-serif; font-size: 12px;">
        <thead>
          <tr style="background-color: #f3f4f6;">
            <th style="padding: 8px; border: 1px solid #e5e7eb; text-align: left;">Phase</th>
            <th style="padding: 8px; border: 1px solid #e5e7eb; text-align: right;">Hours</th>
            <th style="padding: 8px; border: 1px solid #e5e7eb; text-align: right;">Optimistic (${globalOptimistic}%)</th>
            <th style="padding: 8px; border: 1px solid #e5e7eb; text-align: right;">Most Likely</th>
            <th style="padding: 8px; border: 1px solid #e5e7eb; text-align: right;">Pessimistic (${globalPessimistic}%)</th>
          </tr>
        </thead>
        <tbody>
          ${visiblePhases.map(phase => {
            const mostLikely = phasePrices[phase.id] || 0;
            const hours = phaseHours[phase.id] || 0;
            if (hours === 0 && mostLikely === 0) return '';
            return `
              <tr>
                <td style="padding: 8px; border: 1px solid #e5e7eb;">${phase.name}</td>
                <td style="padding: 8px; border: 1px solid #e5e7eb; text-align: right;">${hours.toLocaleString()}</td>
                <td style="padding: 8px; border: 1px solid #e5e7eb; text-align: right; color: #111827;">${getCurrencyPrefix(currency)} ${(mostLikely * (1 + globalOptimistic / 100)).toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}</td>
                <td style="padding: 8px; border: 1px solid #e5e7eb; text-align: right; color: #111827; font-weight: bold;">${getCurrencyPrefix(currency)} ${mostLikely.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}</td>
                <td style="padding: 8px; border: 1px solid #e5e7eb; text-align: right; color: #111827;">${getCurrencyPrefix(currency)} ${(mostLikely * (1 + globalPessimistic / 100)).toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}</td>
              </tr>
            `;
          }).join('')}
          ${systemPhases.some(p => (phaseHours[p.id] || 0) > 0) ? `
            <tr style="background-color: #f9fafb; font-style: italic; color: #111827;">
              <td style="padding: 8px; border: 1px solid #e5e7eb; padding-left: 20px;">System Phases (Weekend, etc.)</td>
              <td style="padding: 8px; border: 1px solid #e5e7eb; text-align: right;">${systemPhases.reduce((sum, p) => sum + (phaseHours[p.id] || 0), 0).toLocaleString()}</td>
              <td style="padding: 8px; border: 1px solid #e5e7eb; text-align: right;">${getCurrencyPrefix(currency)} ${systemPhases.reduce((sum, p) => sum + ((phasePrices[p.id] || 0) * (1 + globalOptimistic / 100)), 0).toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}</td>
              <td style="padding: 8px; border: 1px solid #e5e7eb; text-align: right;">${getCurrencyPrefix(currency)} ${systemPhases.reduce((sum, p) => sum + (phasePrices[p.id] || 0), 0).toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}</td>
              <td style="padding: 8px; border: 1px solid #e5e7eb; text-align: right;">${getCurrencyPrefix(currency)} ${systemPhases.reduce((sum, p) => sum + ((phasePrices[p.id] || 0) * (1 + globalPessimistic / 100)), 0).toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}</td>
            </tr>
          ` : ''}
          ${unassignedHours > 0 ? `
            <tr style="background-color: #fffbeb; font-style: italic; color: #111827;">
              <td style="padding: 8px; border: 1px solid #e5e7eb; padding-left: 20px;">Unassigned Hours</td>
              <td style="padding: 8px; border: 1px solid #e5e7eb; text-align: right;">${unassignedHours.toLocaleString()}</td>
              <td style="padding: 8px; border: 1px solid #e5e7eb; text-align: right;">${getCurrencyPrefix(currency)} ${(unassignedPrice * (1 + globalOptimistic / 100)).toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}</td>
              <td style="padding: 8px; border: 1px solid #e5e7eb; text-align: right;">${getCurrencyPrefix(currency)} ${unassignedPrice.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}</td>
              <td style="padding: 8px; border: 1px solid #e5e7eb; text-align: right;">${getCurrencyPrefix(currency)} ${(unassignedPrice * (1 + globalPessimistic / 100)).toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}</td>
            </tr>
          ` : ''}
          <tr style="background-color: #e5e7eb; font-weight: bold;">
            <td style="padding: 8px; border: 1px solid #e5e7eb;">Grand Total</td>
            <td style="padding: 8px; border: 1px solid #e5e7eb; text-align: right;">${totalPhaseHours.toLocaleString()}</td>
            <td style="padding: 8px; border: 1px solid #e5e7eb; text-align: right; color: #111827;">${getCurrencyPrefix(currency)} ${(totalMostLikely * (1 + globalOptimistic / 100)).toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}</td>
            <td style="padding: 8px; border: 1px solid #e5e7eb; text-align: right; color: #111827;">${getCurrencyPrefix(currency)} ${totalMostLikely.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}</td>
            <td style="padding: 8px; border: 1px solid #e5e7eb; text-align: right; color: #111827;">${getCurrencyPrefix(currency)} ${(totalMostLikely * (1 + globalPessimistic / 100)).toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}</td>
          </tr>
        </tbody>
      </table>
    `;

    try {
      const blob = new Blob([tableHtml], { type: 'text/html' });
      const dataItem = new ClipboardItem({ 'text/html': blob });
      await navigator.clipboard.write([dataItem]);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy table: ', err);
      const text = `Phase\tHours\tOptimistic\tMost Likely\tPessimistic\n` + 
        visiblePhases.map(p => `${p.name}\t${phaseHours[p.id] || 0}\t${(phasePrices[p.id] || 0) * (1 + globalOptimistic / 100)}\t${phasePrices[p.id] || 0}\t${(phasePrices[p.id] || 0) * (1 + globalPessimistic / 100)}`).join('\n');
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div id="financial-summary-tab" className="space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card id="card-financial-breakdown" className="lg:col-span-2 border-gray-200 shadow-sm overflow-hidden">
          <CardHeader id="financial-breakdown-header" className="bg-gray-50 border-b border-gray-200 py-4 flex flex-row items-center justify-between">
            <CardTitle id="financial-breakdown-title" className="text-lg font-semibold flex items-center gap-2">
              <DollarSign className="w-5 h-5 text-blue-600" />
              Financial Breakdown
            </CardTitle>
            <Badge id="badge-synced" variant="outline" className="text-[10px] font-bold text-blue-600 border-blue-200 bg-blue-50">
              <Calculator className="w-3 h-3 mr-1" /> SYNCED FROM PLANNING
            </Badge>
          </CardHeader>
          <CardContent id="financial-breakdown-content" className="p-0 overflow-x-auto">
            <Table id="table-financial-items" className="min-w-[600px] lg:min-w-full">
              <TableHeader className="bg-gray-50/50">
                <TableRow>
                  <TableHead className="w-[300px] text-xs font-bold uppercase text-gray-500">Description</TableHead>
                  <TableHead className="text-right text-xs font-bold uppercase text-gray-500">Price ({currency})</TableHead>
                  <TableHead className="text-right text-xs font-bold uppercase text-gray-500">Cost ({currency})</TableHead>
                  <TableHead className="text-right text-xs font-bold uppercase text-gray-500">Margin %</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.items.map((item) => (
                  <TableRow key={item.id} className="hover:bg-gray-50/50 transition-colors">
                    <TableCell className="font-medium py-4">{item.description}</TableCell>
                    <TableCell className="text-right">
                      <Input
                        id={`input-price-${item.id}`}
                        type="number"
                        value={item.price === 0 ? '' : item.price}
                        onChange={(e) => handleItemChange(item.id, 'price', parseFloat(e.target.value) || 0)}
                        onFocus={(e) => e.target.select()}
                        placeholder="0"
                        className="w-32 ml-auto text-right border-gray-200 focus:ring-blue-500 focus:placeholder:text-transparent"
                      />
                    </TableCell>
                    <TableCell className="text-right">
                      <Input
                        id={`input-cost-${item.id}`}
                        type="number"
                        value={item.cost === 0 ? '' : item.cost}
                        onChange={(e) => handleItemChange(item.id, 'cost', parseFloat(e.target.value) || 0)}
                        onFocus={(e) => e.target.select()}
                        placeholder="0"
                        className="w-32 ml-auto text-right border-gray-200 focus:ring-blue-500 focus:placeholder:text-transparent"
                      />
                    </TableCell>
                    <TableCell className="text-right font-mono text-sm">
                      <span className={item.margin >= 30 ? 'text-green-600' : item.margin >= 15 ? 'text-amber-600' : 'text-red-600'}>
                        {item.margin.toFixed(1)}%
                      </span>
                    </TableCell>
                  </TableRow>
                ))}
                <TableRow id="row-financial-totals" className="bg-gray-50 font-bold">
                  <TableCell className="py-4">Total</TableCell>
                  <TableCell className="text-right">{formatCurrency(totals.price)}</TableCell>
                  <TableCell className="text-right">{formatCurrency(totals.cost)}</TableCell>
                  <TableCell className="text-right font-mono">
                    <span className={totalMargin >= 30 ? 'text-green-700' : totalMargin >= 15 ? 'text-amber-700' : 'text-red-700'}>
                      {totalMargin.toFixed(1)}%
                    </span>
                  </TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        <div className="space-y-6">
          <Card id="card-financial-health" className="border-gray-200 shadow-sm">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-bold uppercase text-gray-500">Financial Health</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div id="health-summary-metrics" className="flex justify-between items-end">
                <div>
                  <p className="text-xs text-gray-500 uppercase font-semibold mb-1">Total Price</p>
                  <p className="text-3xl font-bold tracking-tight">{formatCurrency(totals.price)}</p>
                </div>
                <div className="text-right">
                  <p className="text-xs text-gray-500 uppercase font-semibold mb-1">Overall Margin</p>
                  <div className="flex items-center gap-2 justify-end">
                    {totalMargin >= 30 ? <TrendingUp className="w-4 h-4 text-green-500" /> : <TrendingDown className="w-4 h-4 text-red-500" />}
                    <p className={`text-2xl font-bold ${totalMargin >= 30 ? 'text-green-600' : 'text-red-600'}`}>
                      {totalMargin.toFixed(1)}%
                    </p>
                  </div>
                </div>
              </div>

              <div id="health-adjustments" className="pt-4 border-t border-gray-100 space-y-4">
                <div className="grid gap-2">
                  <div className="flex justify-between items-center">
                    <Label htmlFor="riskScore" className="text-xs font-bold uppercase text-gray-500">Risk Score</Label>
                    <Badge id="badge-risk-level" variant={data.riskLevel === 'Low' ? 'outline' : data.riskLevel === 'Medium' ? 'secondary' : 'destructive'} className="text-[10px] uppercase">
                      {data.riskLevel} Risk
                    </Badge>
                  </div>
                  <Input
                    id="riskScore"
                    type="number"
                    value={data.riskScore === 0 ? '' : data.riskScore}
                    onChange={(e) => {
                      const score = parseInt(e.target.value) || 0;
                      const level = score < 3 ? 'Low' : score < 7 ? 'Medium' : 'High';
                      updateData({ riskScore: score, riskLevel: level });
                    }}
                    onFocus={(e) => e.target.select()}
                    placeholder="0"
                    className="border-gray-300 focus:placeholder:text-transparent"
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="fyAdjustment" className="text-xs font-bold uppercase text-gray-500">FY Cost Adjustment</Label>
                  <Input
                    id="fyAdjustment"
                    type="number"
                    value={data.fyCostAdjustment === 0 ? '' : data.fyCostAdjustment}
                    onChange={(e) => updateData({ fyCostAdjustment: parseFloat(e.target.value) || 0 })}
                    onFocus={(e) => e.target.select()}
                    placeholder="0"
                    className="border-gray-300 focus:placeholder:text-transparent"
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card id="card-quick-insight" className="bg-blue-600 text-white border-none shadow-lg">
            <CardContent className="p-6">
              <div className="flex items-start gap-4">
                <div className="bg-white/20 p-2 rounded-lg">
                  <AlertCircle className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h4 className="font-bold text-lg mb-1">Quick Insight</h4>
                  <p className="text-blue-100 text-sm leading-relaxed">
                    {totalMargin < 30 
                      ? "Your current margin is below the target 30%. Consider adjusting resource mix or pricing strategy."
                      : "Great! Your margin is healthy and meets the organizational targets."}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      <Card id="card-phase-price-summary" className="border-gray-200 shadow-sm">
        <CardHeader className="pb-3 flex flex-row items-center justify-between space-y-0">
          <CardTitle className="text-lg font-semibold flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-blue-600" />
            Phase Price Summary
          </CardTitle>
          <Button 
            variant="outline" 
            size="sm" 
            onClick={copyTableToClipboard}
            className="h-8 gap-2 text-xs"
          >
            {copied ? (
              <>
                <Check className="w-3.5 h-3.5 text-green-600" />
                Copied
              </>
            ) : (
              <>
                <Copy className="w-3.5 h-3.5" />
                Copy Table
              </>
            )}
          </Button>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-gray-100/80">
                  <TableHead className="font-bold text-gray-700">Phase</TableHead>
                  <TableHead className="text-right font-bold text-gray-700">Hours</TableHead>
                  <TableHead className="text-right font-bold text-gray-700 w-[220px]">
                    <div className="flex items-center justify-end gap-2">
                      <span>Optimistic</span>
                      <div className="flex items-center gap-1">
                        <Input 
                          type="number"
                          value={globalOptimistic}
                          onChange={(e) => handleGlobalEstimateChange('globalOptimistic', parseFloat(e.target.value) || 0)}
                          className="w-14 h-7 text-right text-xs bg-white"
                        />
                        <span className="text-[10px] text-gray-400">%</span>
                      </div>
                    </div>
                  </TableHead>
                  <TableHead className="text-right font-bold text-gray-700">Most Likely</TableHead>
                  <TableHead className="text-right font-bold text-gray-700 w-[220px]">
                    <div className="flex items-center justify-end gap-2">
                      <span>Pessimistic</span>
                      <div className="flex items-center gap-1">
                        <Input 
                          type="number"
                          value={globalPessimistic}
                          onChange={(e) => handleGlobalEstimateChange('globalPessimistic', parseFloat(e.target.value) || 0)}
                          className="w-14 h-7 text-right text-xs bg-white"
                        />
                        <span className="text-[10px] text-gray-400">%</span>
                      </div>
                    </div>
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {visiblePhases.map(phase => {
                  const mostLikely = phasePrices[phase.id] || 0;
                  const hours = phaseHours[phase.id] || 0;
                  const optimisticValue = mostLikely * (1 + globalOptimistic / 100);
                  const pessimisticValue = mostLikely * (1 + globalPessimistic / 100);

                  if (hours === 0 && mostLikely === 0) return null;

                  return (
                    <TableRow key={phase.id} className="hover:bg-gray-50/50 transition-colors">
                      <TableCell className="font-medium">
                        <div className="flex items-center gap-2">
                          <div className="w-2 h-2 rounded-full" style={{ backgroundColor: phase.color }} />
                          {phase.name}
                        </div>
                      </TableCell>
                      <TableCell className="text-right font-mono text-gray-600">
                        {hours.toLocaleString()}
                      </TableCell>
                      <TableCell className="text-right font-medium text-gray-900">
                        {getCurrencyPrefix(currency)} {optimisticValue.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                      </TableCell>
                      <TableCell className="text-right font-bold text-gray-900">
                        {getCurrencyPrefix(currency)} {mostLikely.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                      </TableCell>
                      <TableCell className="text-right font-medium text-gray-900">
                        {getCurrencyPrefix(currency)} {pessimisticValue.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                      </TableCell>
                    </TableRow>
                  );
                })}

                {/* System Only Phases Summary */}
                {systemPhases.some(p => (phaseHours[p.id] || 0) > 0) && (
                  <TableRow className="bg-gray-50/20 text-gray-900 italic">
                    <TableCell className="pl-6">System Phases (Weekend, etc.)</TableCell>
                    <TableCell className="text-right font-mono">
                      {systemPhases.reduce((sum, p) => sum + (phaseHours[p.id] || 0), 0).toLocaleString()}
                    </TableCell>
                    <TableCell className="text-right">
                      {getCurrencyPrefix(currency)} {systemPhases.reduce((sum, p) => sum + ((phasePrices[p.id] || 0) * (1 + globalOptimistic / 100)), 0).toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                    </TableCell>
                    <TableCell className="text-right">
                      {getCurrencyPrefix(currency)} {systemPhases.reduce((sum, p) => sum + (phasePrices[p.id] || 0), 0).toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                    </TableCell>
                    <TableCell className="text-right">
                      {getCurrencyPrefix(currency)} {systemPhases.reduce((sum, p) => sum + ((phasePrices[p.id] || 0) * (1 + globalPessimistic / 100)), 0).toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                    </TableCell>
                  </TableRow>
                )}

                {/* Unassigned Hours */}
                {unassignedHours > 0 && (
                  <TableRow className="bg-yellow-50/30 text-gray-900 italic">
                    <TableCell className="pl-6">Unassigned Hours</TableCell>
                    <TableCell className="text-right font-mono">
                      {unassignedHours.toLocaleString()}
                    </TableCell>
                    <TableCell className="text-right">
                      {getCurrencyPrefix(currency)} {(unassignedPrice * (1 + globalOptimistic / 100)).toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                    </TableCell>
                    <TableCell className="text-right">
                      {getCurrencyPrefix(currency)} {unassignedPrice.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                    </TableCell>
                    <TableCell className="text-right">
                      {getCurrencyPrefix(currency)} {(unassignedPrice * (1 + globalPessimistic / 100)).toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                    </TableCell>
                  </TableRow>
                )}

                <TableRow className="bg-gray-200 font-bold text-gray-900 border-t-2 border-gray-300">
                  <TableCell>Grand Total</TableCell>
                  <TableCell className="text-right font-mono">
                    {totalPhaseHours.toLocaleString()}
                  </TableCell>
                  <TableCell className="text-right text-gray-900">
                    {getCurrencyPrefix(currency)} {(totalMostLikely * (1 + globalOptimistic / 100)).toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                  </TableCell>
                  <TableCell className="text-right text-gray-900">
                    {getCurrencyPrefix(currency)} {totalMostLikely.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                  </TableCell>
                  <TableCell className="text-right text-gray-900">
                    {getCurrencyPrefix(currency)} {(totalMostLikely * (1 + globalPessimistic / 100)).toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                  </TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      <Card id="card-payment-milestones" className="border-gray-200 shadow-sm">
        <CardHeader className="pb-3 flex flex-row items-center justify-between space-y-0">
          <div>
            <CardTitle className="text-lg font-semibold flex items-center gap-2">
              <CreditCard className="w-5 h-5 text-blue-600" />
              Payment Milestones
            </CardTitle>
            <p className="text-xs text-gray-500 mt-1">Define the billing schedule. Total must equal {formatCurrency(totals.price)}.</p>
          </div>
          <Button 
            onClick={handleAddMilestone}
            size="sm" 
            className="h-8 gap-2 bg-blue-600 hover:bg-blue-700 text-white"
          >
            <Plus className="w-3.5 h-3.5" />
            Add Milestone
          </Button>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-gray-50/50">
                  <TableHead className="text-xs font-bold uppercase text-gray-500">Description</TableHead>
                  <TableHead className="text-xs font-bold uppercase text-gray-500 w-[150px]">Date</TableHead>
                  <TableHead className="text-xs font-bold uppercase text-gray-500 w-[150px]">Type</TableHead>
                  <TableHead className="text-right text-xs font-bold uppercase text-gray-500 w-[150px]">Value</TableHead>
                  <TableHead className="text-right text-xs font-bold uppercase text-gray-500 w-[180px]">Amount ({currency})</TableHead>
                  <TableHead className="w-[50px]"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {milestones.map((milestone) => (
                  <TableRow key={milestone.id} className="hover:bg-gray-50/50 transition-colors">
                    <TableCell>
                      <Input 
                        value={milestone.description}
                        onChange={(e) => handleUpdateMilestone(milestone.id, 'description', e.target.value)}
                        placeholder="e.g. Project Kickoff"
                        className="border-gray-200 h-9"
                      />
                    </TableCell>
                    <TableCell>
                      <div className="relative">
                        <Calendar className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-400 pointer-events-none" />
                        <Input 
                          type="date"
                          value={milestone.date}
                          onChange={(e) => handleUpdateMilestone(milestone.id, 'date', e.target.value)}
                          className="pl-9 border-gray-200 h-9 text-xs"
                        />
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex bg-gray-100 p-1 rounded-md">
                        <button
                          onClick={() => handleUpdateMilestone(milestone.id, 'type', 'percentage')}
                          className={cn(
                            "flex-1 text-[10px] font-bold uppercase py-1 px-2 rounded transition-all",
                            milestone.type === 'percentage' ? "bg-white text-blue-600 shadow-sm" : "text-gray-500 hover:text-gray-700"
                          )}
                        >
                          %
                        </button>
                        <button
                          onClick={() => handleUpdateMilestone(milestone.id, 'type', 'fixed')}
                          className={cn(
                            "flex-1 text-[10px] font-bold uppercase py-1 px-2 rounded transition-all",
                            milestone.type === 'fixed' ? "bg-white text-blue-600 shadow-sm" : "text-gray-500 hover:text-gray-700"
                          )}
                        >
                          Fixed
                        </button>
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="relative">
                        <Input 
                          type="number"
                          value={milestone.value === 0 ? '' : milestone.value}
                          onChange={(e) => handleUpdateMilestone(milestone.id, 'value', e.target.value)}
                          onFocus={(e) => e.target.select()}
                          placeholder="0"
                          className="text-right border-gray-200 h-9 pr-7 focus:placeholder:text-transparent"
                        />
                        <span className="absolute right-2.5 top-2.5 text-[10px] font-bold text-gray-400 uppercase">
                          {milestone.type === 'percentage' ? '%' : currency}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell className="text-right font-bold text-gray-900">
                      {formatCurrency(milestone.amount)}
                    </TableCell>
                    <TableCell>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleRemoveMilestone(milestone.id)}
                        className="text-gray-300 hover:text-red-600"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
                {milestones.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-8 text-gray-400 italic">
                      No payment milestones defined.
                    </TableCell>
                  </TableRow>
                )}
                <TableRow className="bg-gray-50 border-t-2 border-gray-200">
                  <TableCell colSpan={4} className="text-right font-bold text-gray-700">Total Milestones</TableCell>
                  <TableCell className="text-right font-bold text-lg text-blue-600">
                    {formatCurrency(totalMilestoneAmount)}
                  </TableCell>
                  <TableCell></TableCell>
                </TableRow>
                {Math.abs(milestoneDifference) > 0.01 && (
                  <TableRow className="bg-red-50 border-none">
                    <TableCell colSpan={4} className="text-right text-xs font-bold text-red-600 uppercase tracking-wider">
                      {milestoneDifference > 0 ? 'Remaining to allocate' : 'Over-allocated'}
                    </TableCell>
                    <TableCell className="text-right font-bold text-red-600">
                      {formatCurrency(Math.abs(milestoneDifference))}
                    </TableCell>
                    <TableCell></TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
          {Math.abs(milestoneDifference) <= 0.01 && milestones.length > 0 && (
            <div className="mt-4 flex items-center gap-2 text-green-600 bg-green-50 p-3 rounded-lg border border-green-100">
              <Check className="w-4 h-4" />
              <span className="text-xs font-bold uppercase tracking-wider">Payment schedule fully allocated</span>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
