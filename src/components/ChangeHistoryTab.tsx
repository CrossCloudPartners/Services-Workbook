import { useState, useEffect } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ChangeHistoryEntry, SPWData } from '../types';
import { History, Plus, User, Calendar, MessageSquare, TrendingUp, DollarSign, Calculator } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

interface Props {
  data: ChangeHistoryEntry[];
  onAddEntry: (entry: ChangeHistoryEntry) => void;
  currentProjectData: SPWData;
  currency: string;
}

export default function ChangeHistoryTab({ data, onAddEntry, currentProjectData, currency }: Props) {
  const [newEntry, setNewEntry] = useState<Partial<ChangeHistoryEntry>>({
    author: '',
    date: new Date().toISOString().split('T')[0],
    price: 0,
    cost: 0,
    margin: 0,
    revision: 'A',
    pricingStage: '',
    pricingType: '',
    notes: '',
  });

  // Sync with current project data when it changes
  useEffect(() => {
    const totals = currentProjectData.resourcePlan.reduce((acc, curr) => ({
      price: acc.price + (curr.totalPrice || 0),
      cost: acc.cost + (curr.totalCost || 0)
    }), { price: 0, cost: 0 });

    const margin = totals.price > 0 ? ((totals.price - totals.cost) / totals.price) * 100 : 0;

    // Auto-increment revision
    let nextRevision = 'A';
    if (data.length > 0) {
      const lastRev = data[data.length - 1].revision;
      if (/^[A-Z]+$/.test(lastRev)) {
        // Simple A -> B logic
        nextRevision = String.fromCharCode(lastRev.charCodeAt(0) + 1);
      } else if (!isNaN(parseInt(lastRev))) {
        nextRevision = (parseInt(lastRev) + 1).toString();
      }
    }

    setNewEntry(prev => ({
      ...prev,
      price: totals.price,
      cost: totals.cost,
      margin: margin,
      pricingStage: currentProjectData.projectSummary.pricingStage,
      pricingType: currentProjectData.projectSummary.pricingType,
      revision: nextRevision
    }));
  }, [currentProjectData, data.length]);

  const handleAdd = () => {
    if (!newEntry.author) return;
    onAddEntry({
      ...newEntry as ChangeHistoryEntry,
      id: Math.random().toString(36).substr(2, 9),
    });
    setNewEntry(prev => ({
      ...prev,
      author: '',
      notes: '',
    }));
  };

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency,
      maximumFractionDigits: 0
    }).format(Math.ceil(val));
  };

  return (
    <div className="space-y-6">
      <Card className="border-gray-200 shadow-sm">
        <CardHeader className="pb-3">
          <CardTitle className="text-lg font-semibold flex items-center gap-2">
            <Plus className="w-5 h-5 text-blue-600" />
            Record Current State as Revision
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="grid gap-2">
              <Label htmlFor="author" className="text-xs font-bold uppercase text-gray-500">Author</Label>
              <Input
                id="author"
                value={newEntry.author}
                onChange={(e) => setNewEntry({ ...newEntry, author: e.target.value })}
                placeholder="Your Name"
                className="border-gray-300"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="revDate" className="text-xs font-bold uppercase text-gray-500">Date</Label>
              <Input
                id="revDate"
                type="date"
                value={newEntry.date}
                onChange={(e) => setNewEntry({ ...newEntry, date: e.target.value })}
                className="border-gray-300"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="revision" className="text-xs font-bold uppercase text-gray-500">Revision</Label>
              <Input
                id="revision"
                value={newEntry.revision}
                onChange={(e) => setNewEntry({ ...newEntry, revision: e.target.value })}
                className="border-gray-300"
              />
            </div>
            <div className="grid gap-2">
              <Label className="text-xs font-bold uppercase text-gray-500">Current Snapshot</Label>
              <div className="h-10 px-3 flex items-center bg-gray-50 border border-gray-200 rounded-md text-sm font-mono">
                <span className="text-blue-600 font-bold">{formatCurrency(newEntry.price || 0)}</span>
                <span className="mx-2 text-gray-300">|</span>
                <span className="text-gray-500">{newEntry.margin?.toFixed(1)}% Margin</span>
              </div>
            </div>
            <div className="lg:col-span-3 grid gap-2">
              <Label htmlFor="notes" className="text-xs font-bold uppercase text-gray-500">Notes</Label>
              <Input
                id="notes"
                value={newEntry.notes}
                onChange={(e) => setNewEntry({ ...newEntry, notes: e.target.value })}
                placeholder="Describe the changes in this revision..."
                className="border-gray-300"
              />
            </div>
            <div className="flex items-end">
              <Button onClick={handleAdd} className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold uppercase tracking-wider text-xs h-10">
                Record Revision
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="border-gray-200 shadow-sm overflow-hidden">
        <CardHeader className="bg-gray-50 border-b border-gray-200 py-4">
          <CardTitle className="text-lg font-semibold flex items-center gap-2">
            <History className="w-5 h-5 text-blue-600" />
            Revision History
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader className="bg-gray-50/50">
              <TableRow>
                <TableHead className="text-xs font-bold uppercase text-gray-500">Rev</TableHead>
                <TableHead className="text-xs font-bold uppercase text-gray-500">Author</TableHead>
                <TableHead className="text-xs font-bold uppercase text-gray-500">Date</TableHead>
                <TableHead className="text-xs font-bold uppercase text-gray-500">Stage</TableHead>
                <TableHead className="text-right text-xs font-bold uppercase text-gray-500">Price</TableHead>
                <TableHead className="text-right text-xs font-bold uppercase text-gray-500">Margin</TableHead>
                <TableHead className="text-xs font-bold uppercase text-gray-500">Notes</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.map((entry) => (
                <TableRow key={entry.id} className="hover:bg-gray-50/50 transition-colors">
                  <TableCell className="font-bold text-blue-600">{entry.revision}</TableCell>
                  <TableCell className="font-medium">
                    <div className="flex items-center gap-2">
                      <div className="w-6 h-6 rounded-full bg-gray-100 flex items-center justify-center">
                        <User className="w-3 h-3 text-gray-400" />
                      </div>
                      {entry.author}
                    </div>
                  </TableCell>
                  <TableCell className="text-gray-500 text-xs">
                    <div className="flex items-center gap-1">
                      <Calendar className="w-3 h-3" />
                      {entry.date}
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline" className="text-[10px] font-bold uppercase tracking-wider">
                      {entry.pricingStage || 'N/A'}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right font-mono font-bold text-blue-600">
                    {formatCurrency(entry.price)}
                  </TableCell>
                  <TableCell className="text-right font-mono text-xs">
                    <span className={cn(
                      "px-1.5 py-0.5 rounded-sm",
                      entry.margin >= 35 ? "bg-green-100 text-green-700" :
                      entry.margin >= 25 ? "bg-yellow-100 text-yellow-700" :
                      "bg-red-100 text-red-700"
                    )}>
                      {entry.margin?.toFixed(1)}%
                    </span>
                  </TableCell>
                  <TableCell className="text-gray-600 text-sm max-w-xs truncate">
                    <div className="flex items-start gap-2">
                      <MessageSquare className="w-3 h-3 mt-1 flex-shrink-0 text-gray-300" />
                      {entry.notes || <span className="text-gray-300 italic">No notes provided</span>}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
              {data.length === 0 && (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-12 text-gray-400 italic">
                    No revision history recorded yet.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
