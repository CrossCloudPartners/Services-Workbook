import { useState, useEffect } from 'react';
import { Plus, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { FinancialSummary, FinancialItem, PaymentMilestone } from '../../types/index';
import { formatCurrency, formatPercent, calcMarginPercent, getRiskLevel } from '../../lib/formatting';
import { v4 as uuidv4 } from 'uuid';

// minimal uuid for IDs
function uid() { return Math.random().toString(36).slice(2, 10); }

interface Props {
  financialSummary: FinancialSummary | null;
  financialItems: FinancialItem[];
  paymentMilestones: PaymentMilestone[];
  projectId: string;
  currency: string;
  onSaveFinancialSummary: (s: Partial<FinancialSummary>) => Promise<void>;
  onSaveFinancialItems: (items: FinancialItem[]) => Promise<void>;
  onSavePaymentMilestones: (milestones: PaymentMilestone[]) => Promise<void>;
}

export default function FinancialSummaryTab({
  financialSummary,
  financialItems,
  paymentMilestones,
  projectId,
  currency,
  onSaveFinancialSummary,
  onSaveFinancialItems,
  onSavePaymentMilestones,
}: Props) {
  const [items, setItems] = useState<FinancialItem[]>(financialItems);
  const [milestones, setMilestones] = useState<PaymentMilestone[]>(paymentMilestones);
  const [riskScore, setRiskScore] = useState(financialSummary?.risk_score ?? 0);
  const [fyCost, setFyCost] = useState(financialSummary?.fy_cost_adjustment ?? 0);

  useEffect(() => { setItems(financialItems); }, [financialItems]);
  useEffect(() => { setMilestones(paymentMilestones); }, [paymentMilestones]);
  useEffect(() => {
    setRiskScore(financialSummary?.risk_score ?? 0);
    setFyCost(financialSummary?.fy_cost_adjustment ?? 0);
  }, [financialSummary]);

  const totalPrice = items.reduce((s, i) => s + (i.price || 0), 0);
  const totalCost = items.reduce((s, i) => s + (i.cost || 0), 0);
  const totalMargin = calcMarginPercent(totalPrice, totalCost);
  const riskLevel = getRiskLevel(riskScore);

  function updateItem(id: string, field: keyof FinancialItem, value: string | number) {
    setItems((prev) => {
      const updated = prev.map((item) => {
        if (item.id !== id) return item;
        const next = { ...item, [field]: typeof value === 'string' ? parseFloat(value) || 0 : value };
        if (field === 'price' || field === 'cost') {
          next.margin = calcMarginPercent(
            field === 'price' ? (value as number) : item.price,
            field === 'cost' ? (value as number) : item.cost
          );
        }
        return next;
      });
      onSaveFinancialItems(updated);
      return updated;
    });
  }

  function addItem() {
    const item: FinancialItem = { id: uid(), project_id: projectId, description: 'New Item', price: 0, cost: 0, margin: 0, discount: 0, sort_order: items.length };
    const updated = [...items, item];
    setItems(updated);
    onSaveFinancialItems(updated);
  }

  function removeItem(id: string) {
    const updated = items.filter((i) => i.id !== id);
    setItems(updated);
    onSaveFinancialItems(updated);
  }

  function updateMilestone(id: string, field: keyof PaymentMilestone, value: string | number) {
    setMilestones((prev) => {
      const updated = prev.map((m) => {
        if (m.id !== id) return m;
        const next = { ...m, [field]: value };
        if (field === 'value' || field === 'type') {
          next.amount = next.type === 'percentage'
            ? (parseFloat(String(next.value)) / 100) * totalPrice
            : parseFloat(String(next.value)) || 0;
        }
        return next;
      });
      onSavePaymentMilestones(updated);
      return updated;
    });
  }

  function addMilestone() {
    const m: PaymentMilestone = { id: uid(), project_id: projectId, description: 'Milestone', type: 'percentage', value: 25, amount: totalPrice * 0.25, target_date: null, sort_order: milestones.length };
    const updated = [...milestones, m];
    setMilestones(updated);
    onSavePaymentMilestones(updated);
  }

  function removeMilestone(id: string) {
    const updated = milestones.filter((m) => m.id !== id);
    setMilestones(updated);
    onSavePaymentMilestones(updated);
  }

  const milestonesTotal = milestones.reduce((s, m) => s + (m.amount || 0), 0);
  const milestoneWarning = Math.abs(milestonesTotal - totalPrice) > 1;

  return (
    <div className="space-y-5">
      <h2 className="text-lg font-semibold text-gray-900">Financial Summary</h2>

      {/* Financial Items */}
      <Card className="border border-gray-200 rounded-2xl shadow-sm">
        <CardHeader className="pb-3 flex flex-row items-center justify-between">
          <CardTitle className="text-base font-semibold text-gray-900">Financial Items</CardTitle>
          <Button variant="outline" size="sm" onClick={addItem} className="gap-1.5 h-7 text-xs">
            <Plus className="w-3.5 h-3.5" /> Add Item
          </Button>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100">
                  <th className="text-left px-4 py-2.5 text-xs font-bold text-gray-400 uppercase tracking-wider">Description</th>
                  <th className="text-right px-3 py-2.5 text-xs font-bold text-gray-400 uppercase tracking-wider">Price</th>
                  <th className="text-right px-3 py-2.5 text-xs font-bold text-gray-400 uppercase tracking-wider">Cost</th>
                  <th className="text-right px-3 py-2.5 text-xs font-bold text-gray-400 uppercase tracking-wider">Margin %</th>
                  <th className="text-right px-3 py-2.5 text-xs font-bold text-gray-400 uppercase tracking-wider">Discount</th>
                  <th className="w-8" />
                </tr>
              </thead>
              <tbody>
                {items.map((item) => (
                  <tr key={item.id} className="border-b border-gray-50 hover:bg-gray-50/50">
                    <td className="px-4 py-2">
                      <Input
                        value={item.description}
                        onChange={(e) => updateItem(item.id, 'description', e.target.value)}
                        className="h-7 border-transparent hover:border-gray-200 focus:border-blue-400 bg-transparent text-sm"
                      />
                    </td>
                    <td className="px-3 py-2">
                      <Input
                        type="number"
                        value={item.price}
                        onChange={(e) => updateItem(item.id, 'price', parseFloat(e.target.value) || 0)}
                        className="h-7 border-transparent hover:border-gray-200 focus:border-blue-400 bg-transparent text-sm text-right w-28"
                      />
                    </td>
                    <td className="px-3 py-2">
                      <Input
                        type="number"
                        value={item.cost}
                        onChange={(e) => updateItem(item.id, 'cost', parseFloat(e.target.value) || 0)}
                        className="h-7 border-transparent hover:border-gray-200 focus:border-blue-400 bg-transparent text-sm text-right w-28"
                      />
                    </td>
                    <td className="px-3 py-2 text-right text-sm font-medium">
                      <span className={item.margin >= 30 ? 'text-green-600' : item.margin >= 15 ? 'text-amber-600' : 'text-red-600'}>
                        {formatPercent(item.margin)}
                      </span>
                    </td>
                    <td className="px-3 py-2">
                      <Input
                        type="number"
                        value={item.discount}
                        onChange={(e) => updateItem(item.id, 'discount', parseFloat(e.target.value) || 0)}
                        className="h-7 border-transparent hover:border-gray-200 focus:border-blue-400 bg-transparent text-sm text-right w-24"
                      />
                    </td>
                    <td className="px-2 py-2">
                      <button onClick={() => removeItem(item.id)} className="text-gray-300 hover:text-red-500 transition-colors">
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="bg-gray-50 font-semibold">
                  <td className="px-4 py-3 text-sm font-bold text-gray-900">Total</td>
                  <td className="px-3 py-3 text-sm text-right text-gray-900">{formatCurrency(totalPrice, currency)}</td>
                  <td className="px-3 py-3 text-sm text-right text-gray-900">{formatCurrency(totalCost, currency)}</td>
                  <td className="px-3 py-3 text-sm text-right">
                    <span className={totalMargin >= 30 ? 'text-green-600' : totalMargin >= 15 ? 'text-amber-600' : 'text-red-600'}>
                      {formatPercent(totalMargin)}
                    </span>
                  </td>
                  <td colSpan={2} />
                </tr>
              </tfoot>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Risk & FY Cost */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card className="border border-gray-200 rounded-2xl shadow-sm">
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-semibold text-gray-900">Risk Assessment</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center gap-3">
              <Input
                type="number"
                min={0} max={100}
                value={riskScore}
                onChange={(e) => {
                  const v = Math.min(100, Math.max(0, parseFloat(e.target.value) || 0));
                  setRiskScore(v);
                  onSaveFinancialSummary({ risk_score: v, risk_level: getRiskLevel(v), fy_cost_adjustment: fyCost });
                }}
                className="border-gray-200 w-24"
              />
              <Badge className={
                riskLevel === 'Low' ? 'bg-green-100 text-green-700 border-green-200' :
                riskLevel === 'Medium' ? 'bg-amber-100 text-amber-700 border-amber-200' :
                'bg-red-100 text-red-700 border-red-200'
              }>
                {riskLevel} Risk
              </Badge>
            </div>
            <div className="w-full bg-gray-100 rounded-full h-2">
              <div
                className={`h-2 rounded-full transition-all ${riskLevel === 'Low' ? 'bg-green-500' : riskLevel === 'Medium' ? 'bg-amber-500' : 'bg-red-500'}`}
                style={{ width: `${riskScore}%` }}
              />
            </div>
            <p className="text-xs text-gray-400">0–33: Low · 34–66: Medium · 67–100: High</p>
          </CardContent>
        </Card>

        <Card className="border border-gray-200 rounded-2xl shadow-sm">
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-semibold text-gray-900">FY Cost Adjustment</CardTitle>
          </CardHeader>
          <CardContent>
            <Input
              type="number"
              value={fyCost}
              onChange={(e) => {
                const v = parseFloat(e.target.value) || 0;
                setFyCost(v);
                onSaveFinancialSummary({ risk_score: riskScore, risk_level: riskLevel, fy_cost_adjustment: v });
              }}
              className="border-gray-200"
              placeholder="0.00"
            />
            <p className="text-xs text-gray-400 mt-2">Additional cost adjustment for fiscal year alignment</p>
          </CardContent>
        </Card>
      </div>

      {/* Payment Milestones */}
      <Card className="border border-gray-200 rounded-2xl shadow-sm">
        <CardHeader className="pb-3 flex flex-row items-center justify-between">
          <div>
            <CardTitle className="text-base font-semibold text-gray-900">Payment Milestones</CardTitle>
            {milestoneWarning && milestones.length > 0 && (
              <p className="text-xs text-amber-600 mt-0.5">
                Milestones total {formatCurrency(milestonesTotal, currency)} — expected {formatCurrency(totalPrice, currency)}
              </p>
            )}
          </div>
          <Button variant="outline" size="sm" onClick={addMilestone} className="gap-1.5 h-7 text-xs">
            <Plus className="w-3.5 h-3.5" /> Add Milestone
          </Button>
        </CardHeader>
        <CardContent className="p-0">
          {milestones.length === 0 ? (
            <p className="text-sm text-gray-400 text-center py-8">No milestones yet. Add one to create a payment schedule.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-100">
                    <th className="text-left px-4 py-2.5 text-xs font-bold text-gray-400 uppercase tracking-wider">Description</th>
                    <th className="px-3 py-2.5 text-xs font-bold text-gray-400 uppercase tracking-wider">Type</th>
                    <th className="text-right px-3 py-2.5 text-xs font-bold text-gray-400 uppercase tracking-wider">Value</th>
                    <th className="text-right px-3 py-2.5 text-xs font-bold text-gray-400 uppercase tracking-wider">Amount</th>
                    <th className="px-3 py-2.5 text-xs font-bold text-gray-400 uppercase tracking-wider">Target Date</th>
                    <th className="w-8" />
                  </tr>
                </thead>
                <tbody>
                  {milestones.map((m) => (
                    <tr key={m.id} className="border-b border-gray-50 hover:bg-gray-50/50">
                      <td className="px-4 py-2">
                        <Input value={m.description} onChange={(e) => updateMilestone(m.id, 'description', e.target.value)} className="h-7 border-transparent hover:border-gray-200 focus:border-blue-400 bg-transparent text-sm" />
                      </td>
                      <td className="px-3 py-2">
                        <Select value={m.type} onValueChange={(v) => updateMilestone(m.id, 'type', v)}>
                          <SelectTrigger className="h-7 text-xs border-gray-200 w-28">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="percentage">%</SelectItem>
                            <SelectItem value="fixed">Fixed</SelectItem>
                          </SelectContent>
                        </Select>
                      </td>
                      <td className="px-3 py-2">
                        <Input type="number" value={m.value} onChange={(e) => updateMilestone(m.id, 'value', parseFloat(e.target.value) || 0)} className="h-7 border-transparent hover:border-gray-200 focus:border-blue-400 bg-transparent text-sm text-right w-24" />
                      </td>
                      <td className="px-3 py-2 text-right text-sm font-medium text-gray-700">
                        {formatCurrency(m.amount, currency)}
                      </td>
                      <td className="px-3 py-2">
                        <Input type="date" value={m.target_date ?? ''} onChange={(e) => updateMilestone(m.id, 'target_date', e.target.value)} className="h-7 border-transparent hover:border-gray-200 focus:border-blue-400 bg-transparent text-xs" />
                      </td>
                      <td className="px-2 py-2">
                        <button onClick={() => removeMilestone(m.id)} className="text-gray-300 hover:text-red-500 transition-colors">
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="bg-gray-50 font-semibold border-t border-gray-100">
                    <td colSpan={3} className="px-4 py-3 text-sm font-bold text-gray-900">Total</td>
                    <td className="px-3 py-3 text-sm text-right font-bold text-gray-900">{formatCurrency(milestonesTotal, currency)}</td>
                    <td colSpan={2} />
                  </tr>
                </tfoot>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
