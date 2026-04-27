import { useState, useEffect } from 'react';
import { Plus, Camera, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent } from '@/components/ui/card';
import { ChangeHistoryEntry } from '../../types/index';
import { formatCurrency, formatPercent } from '../../lib/formatting';

function uid() { return Math.random().toString(36).slice(2, 10); }
function nextRevision(entries: ChangeHistoryEntry[]) {
  const used = new Set(entries.map((e) => e.revision));
  let code = 65; // 'A'
  while (used.has(String.fromCharCode(code))) code++;
  return String.fromCharCode(code);
}

interface Props {
  projectId: string;
  history: ChangeHistoryEntry[];
  currency: string;
  currentPrice: number;
  currentCost: number;
  currentMargin: number;
  currentPricingStage: string;
  currentPricingType: string;
  authorName: string;
  onSave: (history: ChangeHistoryEntry[]) => Promise<void>;
}

export default function ChangeHistoryTab({
  projectId, history, currency, currentPrice, currentCost, currentMargin,
  currentPricingStage, currentPricingType, authorName, onSave,
}: Props) {
  const [entries, setEntries] = useState<ChangeHistoryEntry[]>(history);

  useEffect(() => { setEntries(history); }, [history]);

  function snapshot() {
    const entry: ChangeHistoryEntry = {
      id: uid(),
      project_id: projectId,
      author: authorName,
      change_date: new Date().toISOString(),
      price: currentPrice,
      cost: currentCost,
      margin: currentMargin,
      revision: nextRevision(entries),
      pricing_stage: currentPricingStage,
      pricing_type: currentPricingType,
      notes: '',
    };
    const updated = [entry, ...entries];
    setEntries(updated);
    onSave(updated);
  }

  function updateNotes(id: string, notes: string) {
    const updated = entries.map((e) => (e.id === id ? { ...e, notes } : e));
    setEntries(updated);
    onSave(updated);
  }

  function deleteEntry(id: string) {
    const updated = entries.filter((e) => e.id !== id);
    setEntries(updated);
    onSave(updated);
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-gray-900">Change History</h2>
        <Button size="sm" onClick={snapshot} className="bg-blue-600 hover:bg-blue-700 gap-1.5">
          <Camera className="w-3.5 h-3.5" />
          Snapshot Current State
        </Button>
      </div>

      {entries.length === 0 ? (
        <Card className="border border-gray-200 rounded-2xl shadow-sm">
          <CardContent className="py-16 text-center text-gray-400 text-sm">
            No revisions yet. Click &quot;Snapshot Current State&quot; to record the first revision.
          </CardContent>
        </Card>
      ) : (
        <Card className="border border-gray-200 rounded-2xl shadow-sm">
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-100 bg-gray-50/50">
                    <th className="text-left px-4 py-3 text-xs font-bold text-gray-400 uppercase tracking-wider">Rev.</th>
                    <th className="text-left px-3 py-3 text-xs font-bold text-gray-400 uppercase tracking-wider">Author</th>
                    <th className="text-left px-3 py-3 text-xs font-bold text-gray-400 uppercase tracking-wider">Date</th>
                    <th className="text-left px-3 py-3 text-xs font-bold text-gray-400 uppercase tracking-wider">Stage</th>
                    <th className="text-left px-3 py-3 text-xs font-bold text-gray-400 uppercase tracking-wider">Type</th>
                    <th className="text-right px-3 py-3 text-xs font-bold text-gray-400 uppercase tracking-wider">Price</th>
                    <th className="text-right px-3 py-3 text-xs font-bold text-gray-400 uppercase tracking-wider">Cost</th>
                    <th className="text-right px-3 py-3 text-xs font-bold text-gray-400 uppercase tracking-wider">Margin</th>
                    <th className="text-left px-3 py-3 text-xs font-bold text-gray-400 uppercase tracking-wider">Notes</th>
                    <th className="w-8" />
                  </tr>
                </thead>
                <tbody>
                  {entries.map((entry) => (
                    <tr key={entry.id} className="border-b border-gray-50 hover:bg-gray-50/50">
                      <td className="px-4 py-3">
                        <span className="inline-flex items-center justify-center w-7 h-7 bg-blue-100 text-blue-700 rounded-full text-xs font-bold">
                          {entry.revision}
                        </span>
                      </td>
                      <td className="px-3 py-3 text-gray-700">{entry.author}</td>
                      <td className="px-3 py-3 text-gray-500 whitespace-nowrap text-xs">
                        {new Date(entry.change_date).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })}
                      </td>
                      <td className="px-3 py-3 text-gray-600 text-xs">{entry.pricing_stage || '—'}</td>
                      <td className="px-3 py-3 text-gray-600 text-xs">{entry.pricing_type || '—'}</td>
                      <td className="px-3 py-3 text-right font-medium text-gray-900">{formatCurrency(entry.price, currency)}</td>
                      <td className="px-3 py-3 text-right text-gray-600">{formatCurrency(entry.cost, currency)}</td>
                      <td className="px-3 py-3 text-right">
                        <span className={entry.margin >= 30 ? 'text-green-600 font-medium' : entry.margin >= 15 ? 'text-amber-600 font-medium' : 'text-red-600 font-medium'}>
                          {formatPercent(entry.margin)}
                        </span>
                      </td>
                      <td className="px-3 py-3 min-w-[200px]">
                        <Textarea
                          value={entry.notes}
                          onChange={(e) => updateNotes(entry.id, e.target.value)}
                          placeholder="Add notes..."
                          className="h-8 min-h-0 text-xs border-transparent hover:border-gray-200 focus:border-blue-400 bg-transparent resize-none"
                          rows={1}
                        />
                      </td>
                      <td className="px-2 py-3">
                        <button onClick={() => deleteEntry(entry.id)} className="text-gray-300 hover:text-red-500 transition-colors">
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
