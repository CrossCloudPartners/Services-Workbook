import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { PricingScenario } from '../types';
import { Checkbox } from '@/components/ui/checkbox';
import { Layers, Percent, ArrowRightLeft, Calculator, Info, TrendingUp, ShieldAlert, Target } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

interface Props {
  data: PricingScenario[];
  currency: string;
  updateData: (scenarios: PricingScenario[]) => void;
}

export default function PricingScenariosTab({ data, currency, updateData }: Props) {
  const baseline = data.find(s => s.adjustment === 'Original Price' || s.adjustment === 'Baseline Plan' || s.isLocked) || data[0];

  const calculateScenario = (scenario: PricingScenario, base: PricingScenario) => {
    const updated = { ...scenario };
    
    // 1. Start with baseline cost and price
    let cost = base.cost;
    let price = base.price;

    // 2. Apply Contingency (Risk Buffer) to Cost
    if (updated.contingencyPercent) {
      cost = base.cost * (1 + updated.contingencyPercent / 100);
    }

    // 3. Apply Discount to Price
    if (updated.discountPercent) {
      price = base.price * (1 - updated.discountPercent / 100);
    }

    // 4. If Target Margin is set, it overrides the Price calculation
    if (updated.targetMarginPercent && updated.targetMarginPercent > 0) {
      // Price = Cost / (1 - Margin)
      price = cost / (1 - updated.targetMarginPercent / 100);
      // Back-calculate the effective discount relative to baseline price
      updated.discountPercent = base.price > 0 ? ((base.price - price) / base.price) * 100 : 0;
    }

    updated.cost = cost;
    updated.price = price;
    updated.margin = price > 0 ? ((price - cost) / price) * 100 : 0;

    return updated;
  };

  const handleScenarioChange = (index: number, field: keyof PricingScenario, value: any) => {
    const newScenarios = [...data];
    const updated = { ...newScenarios[index], [field]: value };
    
    // If we're changing a lever, clear the conflicting lever
    if (field === 'targetMarginPercent') {
      updated.discountPercent = 0;
    } else if (field === 'discountPercent') {
      updated.targetMarginPercent = 0;
    }

    // Recalculate this scenario based on baseline
    if (index === 0 || updated.isLocked) {
      // If baseline itself changed (should be locked, but just in case)
      newScenarios[index] = updated;
      // Recalculate all other scenarios that depend on it
      for (let i = 0; i < newScenarios.length; i++) {
        if (i !== index) {
          newScenarios[i] = calculateScenario(newScenarios[i], updated);
        }
      }
    } else {
      newScenarios[index] = calculateScenario(updated, baseline);
    }
    
    updateData(newScenarios);
  };

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency,
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(Math.ceil(val));
  };

  return (
    <div className="space-y-6">
      <Card className="border-gray-200 shadow-sm overflow-hidden">
        <CardHeader className="bg-gray-50 border-b border-gray-200 py-4">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div>
              <CardTitle className="text-lg font-semibold flex items-center gap-2">
                <Layers className="w-5 h-5 text-blue-600" />
                Strategic Pricing Scenarios
              </CardTitle>
              <CardDescription>Apply industry-standard levers like contingency, discounting, and target margins to model your deal.</CardDescription>
            </div>
            <div className="bg-white border border-gray-200 px-3 py-1 rounded-full flex items-center gap-2 shadow-sm">
              <span className="text-xs font-bold text-gray-400 uppercase tracking-tighter">Currency:</span>
              <span className="text-sm font-bold text-blue-600">{currency}</span>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0 overflow-x-auto">
          <TooltipProvider>
            <Table className="min-w-[800px] lg:min-w-full">
              <TableHeader className="bg-gray-50/50">
                <TableRow>
                  <TableHead className="w-[60px] text-center text-xs font-bold uppercase text-gray-500">Use</TableHead>
                  <TableHead className="text-xs font-bold uppercase text-gray-500">Scenario Strategy</TableHead>
                  <TableHead className="text-right text-xs font-bold uppercase text-gray-500">
                    <div className="flex items-center justify-end gap-1">
                      Contingency %
                      <Tooltip>
                        <TooltipTrigger><Info className="w-3 h-3" /></TooltipTrigger>
                        <TooltipContent>Risk buffer added to baseline cost.</TooltipContent>
                      </Tooltip>
                    </div>
                  </TableHead>
                  <TableHead className="text-right text-xs font-bold uppercase text-gray-500">
                    <div className="flex items-center justify-end gap-1">
                      Discount %
                      <Tooltip>
                        <TooltipTrigger><Info className="w-3 h-3" /></TooltipTrigger>
                        <TooltipContent>Price reduction applied to baseline bill rates.</TooltipContent>
                      </Tooltip>
                    </div>
                  </TableHead>
                  <TableHead className="text-right text-xs font-bold uppercase text-gray-500">
                    <div className="flex items-center justify-end gap-1">
                      Target Margin %
                      <Tooltip>
                        <TooltipTrigger><Info className="w-3 h-3" /></TooltipTrigger>
                        <TooltipContent>Back-calculate price to hit a specific margin goal.</TooltipContent>
                      </Tooltip>
                    </div>
                  </TableHead>
                  <TableHead className="text-right text-xs font-bold uppercase text-gray-500">Original Price</TableHead>
                  <TableHead className="text-right text-xs font-bold uppercase text-gray-500">Resulting Price</TableHead>
                  <TableHead className="text-right text-xs font-bold uppercase text-gray-500">Resulting Margin</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.map((scenario, idx) => (
                  <TableRow key={idx} className={scenario.use ? 'bg-blue-50/30' : 'opacity-60'}>
                    <TableCell className="text-center">
                      <Checkbox
                        checked={scenario.use}
                        onCheckedChange={(checked) => handleScenarioChange(idx, 'use', !!checked)}
                        className="border-gray-300 data-[state=checked]:bg-blue-600"
                      />
                    </TableCell>
                    <TableCell className="font-medium py-4">
                      <div className="flex items-center gap-2">
                        {scenario.adjustment}
                        {(idx === 0 || scenario.isLocked) && (
                          <Badge variant="outline" className="text-[10px] font-bold text-blue-600 border-blue-200 bg-blue-50">
                            <Calculator className="w-3 h-3 mr-1" /> BASELINE
                          </Badge>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      <Input
                        type="number"
                        value={scenario.contingencyPercent === 0 ? '' : (scenario.contingencyPercent || 0)}
                        onChange={(e) => handleScenarioChange(idx, 'contingencyPercent', parseFloat(e.target.value) || 0)}
                        onFocus={(e) => e.target.select()}
                        placeholder="0"
                        className="w-20 ml-auto text-right border-gray-200 focus:ring-blue-500 h-8 focus:placeholder:text-transparent"
                        disabled={!scenario.use || idx === 0 || scenario.isLocked}
                      />
                    </TableCell>
                    <TableCell className="text-right">
                      <Input
                        type="number"
                        value={scenario.discountPercent === 0 ? '' : (scenario.discountPercent || 0)}
                        onChange={(e) => handleScenarioChange(idx, 'discountPercent', parseFloat(e.target.value) || 0)}
                        onFocus={(e) => e.target.select()}
                        placeholder="0"
                        className="w-20 ml-auto text-right border-gray-200 focus:ring-blue-500 h-8 focus:placeholder:text-transparent"
                        disabled={!scenario.use || idx === 0 || scenario.isLocked || (scenario.targetMarginPercent || 0) > 0}
                      />
                    </TableCell>
                    <TableCell className="text-right">
                      <Input
                        type="number"
                        value={scenario.targetMarginPercent === 0 ? '' : (scenario.targetMarginPercent || 0)}
                        onChange={(e) => handleScenarioChange(idx, 'targetMarginPercent', parseFloat(e.target.value) || 0)}
                        onFocus={(e) => e.target.select()}
                        placeholder="0"
                        className="w-20 ml-auto text-right border-gray-200 focus:ring-blue-500 h-8 font-bold text-blue-600 focus:placeholder:text-transparent"
                        disabled={!scenario.use || idx === 0 || scenario.isLocked}
                      />
                    </TableCell>
                    <TableCell className="text-right text-gray-400 text-xs font-mono">
                      {formatCurrency(baseline.price)}
                    </TableCell>
                    <TableCell className="text-right font-bold text-gray-900">
                      {formatCurrency(scenario.price)}
                    </TableCell>
                    <TableCell className="text-right font-mono text-sm">
                      <div className="flex items-center justify-end gap-2">
                        <span className={scenario.margin >= 35 ? 'text-green-600 font-bold' : scenario.margin >= 25 ? 'text-amber-600' : 'text-red-600'}>
                          {scenario.margin.toFixed(1)}%
                        </span>
                        {scenario.margin >= 35 && <TrendingUp className="w-3 h-3 text-green-500" />}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TooltipProvider>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="border-gray-200 shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-bold uppercase text-gray-500 flex items-center gap-2">
              <ShieldAlert className="w-4 h-4 text-amber-500" />
              Risk Contingency
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-gray-600 mb-4">
              Contingency protects your margin against delivery risks. It increases the estimated cost without necessarily increasing the price.
            </p>
            <div className="p-3 bg-amber-50 rounded-lg border border-amber-100">
              <p className="text-xs text-amber-800 leading-relaxed italic">
                Pro Tip: Use 10-15% contingency for complex integration projects or new technology stacks.
              </p>
            </div>
          </CardContent>
        </Card>

        <Card className="border-gray-200 shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-bold uppercase text-gray-500 flex items-center gap-2">
              <Target className="w-4 h-4 text-blue-600" />
              Margin Targeting
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-gray-600 mb-4">
              Enter a target margin to find the required price. The system will automatically calculate the necessary discount or premium.
            </p>
            <div className="p-3 bg-blue-50 rounded-lg border border-blue-100">
              <p className="text-xs text-blue-800 leading-relaxed italic">
                Standard target for professional services is typically 35-45% gross margin.
              </p>
            </div>
          </CardContent>
        </Card>

        <Card className="border-gray-200 shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-bold uppercase text-gray-500 flex items-center gap-2">
              <ArrowRightLeft className="w-4 h-4 text-gray-600" />
              Scenario Comparison
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {data.filter(s => s.use).map((s, i) => (
                <div key={i} className="flex justify-between items-center p-2 rounded border border-gray-100 bg-white">
                  <div className="flex flex-col">
                    <span className="text-xs font-bold text-gray-400 uppercase tracking-tighter">{s.adjustment}</span>
                    <span className="text-sm font-bold text-gray-900">{formatCurrency(s.price)}</span>
                  </div>
                  <div className="text-right">
                    <p className={`text-sm font-bold ${s.margin >= 35 ? 'text-green-600' : 'text-amber-600'}`}>{s.margin.toFixed(1)}%</p>
                    <p className="text-[10px] text-gray-400 uppercase font-bold">Margin</p>
                  </div>
                </div>
              ))}
              {data.filter(s => s.use).length === 0 && (
                <p className="text-sm text-gray-400 text-center py-4 italic">No scenarios selected for comparison.</p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
