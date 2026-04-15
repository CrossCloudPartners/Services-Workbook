import { useState } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ProjectPO } from '../types';
import { Briefcase, Plus, Trash2, Link as LinkIcon, DollarSign, TrendingUp } from 'lucide-react';

interface Props {
  data: ProjectPO[];
  updateData: (pos: ProjectPO[]) => void;
}

export default function ProjectsAndPOsTab({ data, updateData }: Props) {
  const [newPO, setNewPO] = useState<Partial<ProjectPO>>({
    name: '',
    date: new Date().toISOString().split('T')[0],
    price: 0,
    cost: 0,
    margin: 0,
    poNumber: '',
    opportunityLink: '',
  });

  const handleAdd = () => {
    if (!newPO.name || !newPO.poNumber) return;
    const p = newPO.price || 0;
    const c = newPO.cost || 0;
    const margin = p > 0 ? ((p - c) / p) * 100 : 0;
    
    updateData([
      ...data,
      {
        ...newPO as ProjectPO,
        id: Math.random().toString(36).substr(2, 9),
        margin,
      }
    ]);
    setNewPO({
      name: '',
      date: new Date().toISOString().split('T')[0],
      price: 0,
      cost: 0,
      margin: 0,
      poNumber: '',
      opportunityLink: '',
    });
  };

  const handleRemove = (id: string) => {
    updateData(data.filter(po => po.id !== id));
  };

  return (
    <div className="space-y-6">
      <Card className="border-gray-200 shadow-sm">
        <CardHeader className="pb-3">
          <CardTitle className="text-lg font-semibold flex items-center gap-2">
            <Plus className="w-5 h-5 text-blue-600" />
            Add Project / PO
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="grid gap-2">
              <Label htmlFor="poName" className="text-xs font-bold uppercase text-gray-500">Project / CO Name</Label>
              <Input
                id="poName"
                value={newPO.name}
                onChange={(e) => setNewPO({ ...newPO, name: e.target.value })}
                placeholder="e.g. Phase 1 Implementation"
                className="border-gray-300"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="poNumber" className="text-xs font-bold uppercase text-gray-500">PO Number</Label>
              <Input
                id="poNumber"
                value={newPO.poNumber}
                onChange={(e) => setNewPO({ ...newPO, poNumber: e.target.value })}
                placeholder="PO-123456"
                className="border-gray-300"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="poDate" className="text-xs font-bold uppercase text-gray-500">Date</Label>
              <Input
                id="poDate"
                type="date"
                value={newPO.date}
                onChange={(e) => setNewPO({ ...newPO, date: e.target.value })}
                className="border-gray-300"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="poPrice" className="text-xs font-bold uppercase text-gray-500">Price</Label>
              <Input
                id="poPrice"
                type="number"
                value={newPO.price === 0 ? '' : newPO.price}
                onChange={(e) => setNewPO({ ...newPO, price: parseFloat(e.target.value) || 0 })}
                onFocus={(e) => e.target.select()}
                placeholder="0"
                className="border-gray-300 focus:placeholder:text-transparent"
              />
            </div>
            <div className="lg:col-span-3 grid gap-2">
              <Label htmlFor="poLink" className="text-xs font-bold uppercase text-gray-500">Opportunity Link</Label>
              <Input
                id="poLink"
                value={newPO.opportunityLink}
                onChange={(e) => setNewPO({ ...newPO, opportunityLink: e.target.value })}
                placeholder="https://..."
                className="border-gray-300"
              />
            </div>
            <div className="flex items-end">
              <Button onClick={handleAdd} className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold uppercase tracking-wider text-xs h-10">
                Add Record
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="border-gray-200 shadow-sm overflow-hidden">
        <CardHeader className="bg-gray-50 border-b border-gray-200 py-4">
          <CardTitle className="text-lg font-semibold flex items-center gap-2">
            <Briefcase className="w-5 h-5 text-blue-600" />
            Projects & POs Registry
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader className="bg-gray-50/50">
              <TableRow>
                <TableHead className="text-xs font-bold uppercase text-gray-500">Project / CO Name</TableHead>
                <TableHead className="text-xs font-bold uppercase text-gray-500">PO Number</TableHead>
                <TableHead className="text-xs font-bold uppercase text-gray-500">Date</TableHead>
                <TableHead className="text-right text-xs font-bold uppercase text-gray-500">Price</TableHead>
                <TableHead className="text-right text-xs font-bold uppercase text-gray-500">Margin %</TableHead>
                <TableHead className="w-[50px]"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.map((po) => (
                <TableRow key={po.id} className="hover:bg-gray-50/50 transition-colors group">
                  <TableCell className="font-medium">
                    <div className="flex flex-col">
                      <span>{po.name}</span>
                      {po.opportunityLink && (
                        <a href={po.opportunityLink} target="_blank" rel="noopener noreferrer" className="text-[10px] text-blue-500 flex items-center gap-0.5 hover:underline">
                          <LinkIcon className="w-2 h-2" /> View Opportunity
                        </a>
                      )}
                    </div>
                  </TableCell>
                  <TableCell className="font-mono text-sm text-gray-600">{po.poNumber}</TableCell>
                  <TableCell className="text-gray-500 text-sm">{po.date}</TableCell>
                  <TableCell className="text-right font-bold">
                    {new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(Math.ceil(po.price))}
                  </TableCell>
                  <TableCell className="text-right font-mono text-sm">
                    <span className={po.margin >= 30 ? 'text-green-600' : 'text-amber-600'}>
                      {po.margin.toFixed(1)}%
                    </span>
                  </TableCell>
                  <TableCell>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleRemove(po.id)}
                      className="text-gray-300 hover:text-red-600 opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
              {data.length === 0 && (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-12 text-gray-400 italic">
                    No projects or POs recorded yet.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {data.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
          <Card className="bg-gray-900 text-white border-none shadow-lg">
            <CardContent className="p-6 flex items-center justify-between">
              <div>
                <p className="text-gray-400 text-xs font-bold uppercase tracking-wider mb-1">Total PO Value</p>
                <p className="text-3xl font-bold">
                  {new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(
                    Math.ceil(data.reduce((acc, po) => acc + po.price, 0))
                  )}
                </p>
              </div>
              <div className="bg-white/10 p-3 rounded-full">
                <DollarSign className="w-8 h-8 text-blue-400" />
              </div>
            </CardContent>
          </Card>
          <Card className="bg-white border-gray-200 shadow-sm">
            <CardContent className="p-6 flex items-center justify-between">
              <div>
                <p className="text-gray-500 text-xs font-bold uppercase tracking-wider mb-1">Average Margin</p>
                <p className="text-3xl font-bold text-blue-600">
                  {(data.reduce((acc, po) => acc + po.margin, 0) / data.length).toFixed(1)}%
                </p>
              </div>
              <div className="bg-blue-50 p-3 rounded-full">
                <TrendingUp className="w-8 h-8 text-blue-600" />
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
