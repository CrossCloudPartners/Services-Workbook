import { useState, useEffect } from 'react';
import { Plus, Trash2, ExternalLink } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { ProjectPO } from '../../types/index';
import { formatCurrency, formatPercent, calcMarginPercent } from '../../lib/formatting';

function uid() { return Math.random().toString(36).slice(2, 10); }

interface Props {
  projectId: string;
  pos: ProjectPO[];
  currency: string;
  onSave: (pos: ProjectPO[]) => Promise<void>;
}

export default function ProjectsAndPOsTab({ projectId, pos, currency, onSave }: Props) {
  const [items, setItems] = useState<ProjectPO[]>(pos);

  useEffect(() => { setItems(pos); }, [pos]);

  function update(id: string, field: keyof ProjectPO, value: string | number) {
    setItems((prev) => {
      const updated = prev.map((p) => {
        if (p.id !== id) return p;
        const next = { ...p, [field]: value };
        if (field === 'price' || field === 'cost') {
          next.margin = calcMarginPercent(
            field === 'price' ? (value as number) : p.price,
            field === 'cost' ? (value as number) : p.cost
          );
        }
        return next;
      });
      onSave(updated);
      return updated;
    });
  }

  function addPO() {
    const po: ProjectPO = {
      id: uid(),
      project_id: projectId,
      name: 'New PO',
      po_date: null,
      price: 0,
      cost: 0,
      margin: 0,
      po_number: '',
      opportunity_link: '',
    };
    const updated = [...items, po];
    setItems(updated);
    onSave(updated);
  }

  function removePO(id: string) {
    const updated = items.filter((p) => p.id !== id);
    setItems(updated);
    onSave(updated);
  }

  const totalPrice = items.reduce((s, p) => s + p.price, 0);
  const totalCost = items.reduce((s, p) => s + p.cost, 0);
  const totalMargin = calcMarginPercent(totalPrice, totalCost);

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-gray-900">Projects &amp; Purchase Orders</h2>
        <Button variant="outline" size="sm" onClick={addPO} className="gap-1.5">
          <Plus className="w-3.5 h-3.5" /> Add PO
        </Button>
      </div>

      <Card className="border border-gray-200 rounded-2xl shadow-sm">
        <CardContent className="p-0">
          {items.length === 0 ? (
            <p className="text-sm text-gray-400 text-center py-16">No purchase orders yet.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-100 bg-gray-50/50">
                    <th className="text-left px-4 py-3 text-xs font-bold text-gray-400 uppercase tracking-wider">PO Name</th>
                    <th className="text-left px-3 py-3 text-xs font-bold text-gray-400 uppercase tracking-wider">PO Date</th>
                    <th className="text-right px-3 py-3 text-xs font-bold text-gray-400 uppercase tracking-wider">Price</th>
                    <th className="text-right px-3 py-3 text-xs font-bold text-gray-400 uppercase tracking-wider">Cost</th>
                    <th className="text-right px-3 py-3 text-xs font-bold text-gray-400 uppercase tracking-wider">Margin %</th>
                    <th className="text-left px-3 py-3 text-xs font-bold text-gray-400 uppercase tracking-wider">PO Number</th>
                    <th className="text-left px-3 py-3 text-xs font-bold text-gray-400 uppercase tracking-wider">Opportunity Link</th>
                    <th className="w-8" />
                  </tr>
                </thead>
                <tbody>
                  {items.map((po) => (
                    <tr key={po.id} className="border-b border-gray-50 hover:bg-gray-50/50">
                      <td className="px-4 py-2">
                        <Input value={po.name} onChange={(e) => update(po.id, 'name', e.target.value)} className="h-7 border-transparent hover:border-gray-200 focus:border-blue-400 bg-transparent text-sm" />
                      </td>
                      <td className="px-3 py-2">
                        <Input type="date" value={po.po_date ?? ''} onChange={(e) => update(po.id, 'po_date', e.target.value)} className="h-7 border-transparent hover:border-gray-200 focus:border-blue-400 bg-transparent text-sm" />
                      </td>
                      <td className="px-3 py-2">
                        <Input type="number" value={po.price} onChange={(e) => update(po.id, 'price', parseFloat(e.target.value) || 0)} className="h-7 border-transparent hover:border-gray-200 focus:border-blue-400 bg-transparent text-sm text-right w-28" />
                      </td>
                      <td className="px-3 py-2">
                        <Input type="number" value={po.cost} onChange={(e) => update(po.id, 'cost', parseFloat(e.target.value) || 0)} className="h-7 border-transparent hover:border-gray-200 focus:border-blue-400 bg-transparent text-sm text-right w-28" />
                      </td>
                      <td className="px-3 py-2 text-right text-sm font-medium">
                        <span className={po.margin >= 30 ? 'text-green-600' : po.margin >= 15 ? 'text-amber-600' : 'text-red-600'}>
                          {formatPercent(po.margin)}
                        </span>
                      </td>
                      <td className="px-3 py-2">
                        <Input value={po.po_number} onChange={(e) => update(po.id, 'po_number', e.target.value)} placeholder="PO-0001" className="h-7 border-transparent hover:border-gray-200 focus:border-blue-400 bg-transparent text-sm" />
                      </td>
                      <td className="px-3 py-2">
                        <div className="flex items-center gap-1">
                          <Input value={po.opportunity_link} onChange={(e) => update(po.id, 'opportunity_link', e.target.value)} placeholder="https://..." className="h-7 border-transparent hover:border-gray-200 focus:border-blue-400 bg-transparent text-sm" />
                          {po.opportunity_link && (
                            <button onClick={() => window.open(po.opportunity_link, '_blank')} className="text-blue-500 hover:text-blue-700 flex-shrink-0">
                              <ExternalLink className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </td>
                      <td className="px-2 py-2">
                        <button onClick={() => removePO(po.id)} className="text-gray-300 hover:text-red-500 transition-colors">
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="border-t border-gray-200 bg-gray-50 font-semibold">
                    <td colSpan={2} className="px-4 py-3 text-sm font-bold text-gray-900">Total</td>
                    <td className="px-3 py-3 text-sm text-right font-bold">{formatCurrency(totalPrice, currency)}</td>
                    <td className="px-3 py-3 text-sm text-right font-bold">{formatCurrency(totalCost, currency)}</td>
                    <td className="px-3 py-3 text-sm text-right font-bold">
                      <span className={totalMargin >= 30 ? 'text-green-600' : totalMargin >= 15 ? 'text-amber-600' : 'text-red-600'}>
                        {formatPercent(totalMargin)}
                      </span>
                    </td>
                    <td colSpan={3} />
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
