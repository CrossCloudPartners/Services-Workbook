import { useState, useEffect } from 'react';
import { Plus, Trash2, Lock, Clock as Unlock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { PricingScenario } from '../../types/index';
import { formatCurrency, formatPercent, calcMarginPercent } from '../../lib/formatting';
import { calcScenario } from '../../lib/calculations';

function uid() { return Math.random().toString(36).slice(2, 10); }

interface Props {
  scenarios: PricingScenario[];
  projectId: string;
  currency: string;
  basePrice: number;
  baseCost: number;
  onSave: (scenarios: PricingScenario[]) => Promise<void>;
}

export default function PricingScenariosTab({ scenarios, projectId, currency, basePrice, baseCost, onSave }: Props) {
  const [items, setItems] = useState<PricingScenario[]>(scenarios);

  useEffect(() => {
    // Ensure there's always a baseline scenario
    if (scenarios.length === 0) {
      const baseline: PricingScenario = {
        id: uid(),
        project_id: projectId,
        is_used: true,
        adjustment: 'Baseline',
        price: basePrice,
        cost: baseCost,
        margin: calcMarginPercent(basePrice, baseCost),
        discount_percent: null,
        contingency_percent: null,
        target_margin_percent: null,
        is_locked: true,
        sort_order: 0,
      };
      setItems([baseline]);
      onSave([baseline]);
    } else {
      setItems(scenarios);
    }
  }, [scenarios]);

  function recalculate(scenario: PricingScenario): PricingScenario {
    if (scenario.is_locked) {
      return { ...scenario, price: basePrice, cost: baseCost, margin: calcMarginPercent(basePrice, baseCost) };
    }
    const { price, cost, margin } = calcScenario(
      basePrice,
      baseCost,
      scenario.contingency_percent,
      scenario.discount_percent,
      scenario.target_margin_percent
    );
    return { ...scenario, price, cost, margin };
  }

  function updateScenario(id: string, field: keyof PricingScenario, value: unknown) {
    setItems((prev) => {
      const updated = prev.map((s) => {
        if (s.id !== id) return s;
        const next = recalculate({ ...s, [field]: value });
        return next;
      });
      onSave(updated);
      return updated;
    });
  }

  function addScenario() {
    const s: PricingScenario = {
      id: uid(),
      project_id: projectId,
      is_used: false,
      adjustment: `Scenario ${items.length}`,
      price: basePrice,
      cost: baseCost,
      margin: calcMarginPercent(basePrice, baseCost),
      discount_percent: null,
      contingency_percent: null,
      target_margin_percent: null,
      is_locked: false,
      sort_order: items.length,
    };
    const updated = [...items, s];
    setItems(updated);
    onSave(updated);
  }

  function removeScenario(id: string) {
    const updated = items.filter((s) => s.id !== id);
    setItems(updated);
    onSave(updated);
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-gray-900">Pricing Scenarios</h2>
        <Button variant="outline" size="sm" onClick={addScenario} className="gap-1.5">
          <Plus className="w-3.5 h-3.5" /> Add Scenario
        </Button>
      </div>

      <Card className="border border-gray-200 rounded-2xl shadow-sm">
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100">
                  <th className="px-4 py-3 text-xs font-bold text-gray-400 uppercase tracking-wider">Use</th>
                  <th className="text-left px-3 py-3 text-xs font-bold text-gray-400 uppercase tracking-wider">Scenario</th>
                  <th className="text-right px-3 py-3 text-xs font-bold text-gray-400 uppercase tracking-wider">Contingency %</th>
                  <th className="text-right px-3 py-3 text-xs font-bold text-gray-400 uppercase tracking-wider">Discount %</th>
                  <th className="text-right px-3 py-3 text-xs font-bold text-gray-400 uppercase tracking-wider">Target Margin %</th>
                  <th className="text-right px-3 py-3 text-xs font-bold text-gray-400 uppercase tracking-wider">Price</th>
                  <th className="text-right px-3 py-3 text-xs font-bold text-gray-400 uppercase tracking-wider">Cost</th>
                  <th className="text-right px-3 py-3 text-xs font-bold text-gray-400 uppercase tracking-wider">Margin %</th>
                  <th className="w-16" />
                </tr>
              </thead>
              <tbody>
                {items.map((s) => (
                  <tr
                    key={s.id}
                    className={`border-b border-gray-50 ${s.is_locked ? 'bg-gray-50/50' : s.is_used ? 'bg-blue-50/30' : 'hover:bg-gray-50/50'}`}
                  >
                    <td className="px-4 py-3 text-center">
                      <Checkbox
                        checked={s.is_used}
                        onCheckedChange={(v) => updateScenario(s.id, 'is_used', !!v)}
                        disabled={s.is_locked}
                        className="border-gray-300 data-[state=checked]:bg-blue-600 data-[state=checked]:border-blue-600"
                      />
                    </td>
                    <td className="px-3 py-3">
                      <div className="flex items-center gap-2">
                        {s.is_locked && <Lock className="w-3 h-3 text-gray-400 flex-shrink-0" />}
                        <Input
                          value={s.adjustment}
                          onChange={(e) => updateScenario(s.id, 'adjustment', e.target.value)}
                          disabled={s.is_locked}
                          className="h-7 border-transparent hover:border-gray-200 focus:border-blue-400 bg-transparent text-sm min-w-[120px]"
                        />
                        {s.is_locked && <Badge className="text-[10px] bg-gray-100 text-gray-600 border-gray-200">Locked</Badge>}
                      </div>
                    </td>
                    <td className="px-3 py-3">
                      <Input
                        type="number"
                        value={s.contingency_percent ?? ''}
                        placeholder="—"
                        onChange={(e) => updateScenario(s.id, 'contingency_percent', e.target.value ? parseFloat(e.target.value) : null)}
                        disabled={s.is_locked}
                        className="h-7 border-transparent hover:border-gray-200 focus:border-blue-400 bg-transparent text-sm text-right w-20"
                      />
                    </td>
                    <td className="px-3 py-3">
                      <Input
                        type="number"
                        value={s.discount_percent ?? ''}
                        placeholder="—"
                        onChange={(e) => updateScenario(s.id, 'discount_percent', e.target.value ? parseFloat(e.target.value) : null)}
                        disabled={s.is_locked}
                        className="h-7 border-transparent hover:border-gray-200 focus:border-blue-400 bg-transparent text-sm text-right w-20"
                      />
                    </td>
                    <td className="px-3 py-3">
                      <Input
                        type="number"
                        value={s.target_margin_percent ?? ''}
                        placeholder="—"
                        onChange={(e) => updateScenario(s.id, 'target_margin_percent', e.target.value ? parseFloat(e.target.value) : null)}
                        disabled={s.is_locked}
                        className="h-7 border-transparent hover:border-gray-200 focus:border-blue-400 bg-transparent text-sm text-right w-20"
                      />
                    </td>
                    <td className="px-3 py-3 text-right font-medium text-gray-900">{formatCurrency(s.price, currency)}</td>
                    <td className="px-3 py-3 text-right text-gray-600">{formatCurrency(s.cost, currency)}</td>
                    <td className="px-3 py-3 text-right font-medium">
                      <span className={s.margin >= 30 ? 'text-green-600' : s.margin >= 15 ? 'text-amber-600' : 'text-red-600'}>
                        {formatPercent(s.margin)}
                      </span>
                    </td>
                    <td className="px-2 py-3">
                      <div className="flex items-center gap-1">
                        {!s.is_locked && (
                          <button
                            onClick={() => updateScenario(s.id, 'is_locked', true)}
                            className="text-gray-300 hover:text-amber-500 transition-colors"
                            title="Lock scenario"
                          >
                            <Lock className="w-3.5 h-3.5" />
                          </button>
                        )}
                        {s.is_locked && s.adjustment !== 'Baseline' && (
                          <button
                            onClick={() => updateScenario(s.id, 'is_locked', false)}
                            className="text-amber-500 hover:text-gray-600 transition-colors"
                            title="Unlock scenario"
                          >
                            <Unlock className="w-3.5 h-3.5" />
                          </button>
                        )}
                        {s.adjustment !== 'Baseline' && (
                          <button onClick={() => removeScenario(s.id)} className="text-gray-300 hover:text-red-500 transition-colors">
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="border border-gray-200 rounded-2xl shadow-sm p-4">
          <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">Base Price</p>
          <p className="text-2xl font-bold text-gray-900">{formatCurrency(basePrice, currency)}</p>
        </Card>
        <Card className="border border-gray-200 rounded-2xl shadow-sm p-4">
          <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">Base Cost</p>
          <p className="text-2xl font-bold text-gray-900">{formatCurrency(baseCost, currency)}</p>
        </Card>
        <Card className="border border-gray-200 rounded-2xl shadow-sm p-4">
          <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">Base Margin</p>
          <p className={`text-2xl font-bold ${calcMarginPercent(basePrice, baseCost) >= 30 ? 'text-green-600' : 'text-amber-600'}`}>
            {formatPercent(calcMarginPercent(basePrice, baseCost))}
          </p>
        </Card>
      </div>
    </div>
  );
}
