import { Trash2, FileText } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { ProjectTemplate } from '../../types/index';
import { supabase } from '../../lib/supabase';

interface Props {
  templates: ProjectTemplate[];
  onUpdated: () => void;
}

export default function TemplatesManager({ templates, onUpdated }: Props) {
  async function deleteTemplate(id: string) {
    if (!window.confirm('Delete this template?')) return;
    await supabase.from('project_templates').delete().eq('id', id);
    onUpdated();
  }

  return (
    <div className="space-y-5">
      <h2 className="text-lg font-semibold text-gray-900">Project Templates</h2>

      {templates.length === 0 ? (
        <Card className="border border-gray-200 rounded-2xl shadow-sm">
          <CardContent className="py-16 text-center text-sm text-gray-400">
            No templates saved yet. Save a project as a template from the Project Summary tab.
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {templates.map((t) => (
            <Card key={t.id} className="border border-gray-200 rounded-2xl shadow-sm hover:shadow-md transition-shadow">
              <CardContent className="p-5">
                <div className="flex items-start gap-3">
                  <div className="bg-blue-50 p-2 rounded-lg flex-shrink-0">
                    <FileText className="w-4 h-4 text-blue-600" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-gray-900 text-sm truncate">{t.name}</h3>
                    {t.description && <p className="text-xs text-gray-500 mt-0.5 truncate">{t.description}</p>}
                    <p className="text-[10px] text-gray-400 mt-1">
                      {new Date(t.created_at).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })}
                    </p>
                  </div>
                  <button onClick={() => deleteTemplate(t.id)} className="text-gray-300 hover:text-red-500 transition-colors flex-shrink-0">
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
