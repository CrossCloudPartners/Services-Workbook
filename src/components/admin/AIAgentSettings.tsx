import { useState, useEffect } from 'react';
import { Eye, EyeOff, Save, Zap } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AIAgentSettings as AISettings } from '../../types/index';
import { supabase } from '../../lib/supabase';

interface Props {
  tenantId: string;
  settings: AISettings | null;
  onUpdated: () => void;
}

export default function AIAgentSettingsTab({ tenantId, settings, onUpdated }: Props) {
  const [form, setForm] = useState<Partial<AISettings>>({
    api_key: '',
    persona_prompt: '',
    personality: '',
    profile_image_url: '',
    ...settings,
  });
  const [showKey, setShowKey] = useState(false);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<'success' | 'error' | null>(null);

  useEffect(() => {
    if (settings) setForm({ ...settings });
  }, [settings]);

  async function handleSave() {
    setSaving(true);
    const { error } = await supabase.from('ai_agent_settings').upsert({
      tenant_id: tenantId,
      api_key: form.api_key ?? null,
      persona_prompt: form.persona_prompt ?? null,
      personality: form.personality ?? null,
      profile_image_url: form.profile_image_url ?? null,
    }, { onConflict: 'tenant_id' });
    setSaving(false);
    if (!error) onUpdated();
  }

  async function handleTest() {
    if (!form.api_key) {
      setTestResult('error');
      return;
    }
    setTesting(true);
    setTestResult(null);
    try {
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string;
      const { data: { session } } = await supabase.auth.getSession();
      const response = await fetch(`${supabaseUrl}/functions/v1/ai-chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session?.access_token}`,
        },
        body: JSON.stringify({ prompt: 'Say "Connected successfully" and nothing else.', projectData: {} }),
      });
      if (response.ok) {
        setTestResult('success');
      } else {
        setTestResult('error');
      }
    } catch {
      setTestResult('error');
    } finally {
      setTesting(false);
    }
  }

  return (
    <div className="space-y-5">
      <h2 className="text-lg font-semibold text-gray-900">AI Agent Settings</h2>

      <Card className="border border-gray-200 rounded-2xl shadow-sm">
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-semibold text-gray-900">Gemini API Configuration</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label className="text-sm font-medium text-gray-700">Gemini API Key</Label>
            <div className="relative mt-1">
              <Input
                type={showKey ? 'text' : 'password'}
                value={form.api_key ?? ''}
                onChange={(e) => setForm((f) => ({ ...f, api_key: e.target.value }))}
                placeholder="AIza..."
                className="border-gray-200 pr-10"
              />
              <button
                onClick={() => setShowKey(!showKey)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                {showKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
            <p className="text-xs text-gray-400 mt-1">Get your API key from Google AI Studio (aistudio.google.com)</p>
          </div>

          {testResult && (
            <Alert className={testResult === 'success' ? 'border-green-200 bg-green-50' : 'border-red-200 bg-red-50'}>
              <AlertDescription className={testResult === 'success' ? 'text-green-700' : 'text-red-700'}>
                {testResult === 'success' ? 'Connected successfully!' : 'Connection failed. Check your API key.'}
              </AlertDescription>
            </Alert>
          )}

          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={handleTest} disabled={testing || !form.api_key} className="gap-1.5">
              <Zap className="w-3.5 h-3.5" />
              {testing ? 'Testing...' : 'Test Connection'}
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card className="border border-gray-200 rounded-2xl shadow-sm">
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-semibold text-gray-900">Persona Configuration</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label className="text-sm font-medium text-gray-700">Persona Prompt</Label>
            <Textarea
              value={form.persona_prompt ?? ''}
              onChange={(e) => setForm((f) => ({ ...f, persona_prompt: e.target.value }))}
              placeholder="You are a professional services pricing assistant..."
              rows={4}
              className="mt-1 border-gray-200 resize-none"
            />
          </div>
          <div>
            <Label className="text-sm font-medium text-gray-700">Personality</Label>
            <Input
              value={form.personality ?? ''}
              onChange={(e) => setForm((f) => ({ ...f, personality: e.target.value }))}
              placeholder="Professional, analytical, concise"
              className="mt-1 border-gray-200"
            />
          </div>
          <div>
            <Label className="text-sm font-medium text-gray-700">Profile Image URL</Label>
            <Input
              value={form.profile_image_url ?? ''}
              onChange={(e) => setForm((f) => ({ ...f, profile_image_url: e.target.value }))}
              placeholder="https://..."
              className="mt-1 border-gray-200"
            />
          </div>
        </CardContent>
      </Card>

      <Button onClick={handleSave} disabled={saving} className="bg-blue-600 hover:bg-blue-700 gap-1.5">
        <Save className="w-4 h-4" />
        {saving ? 'Saving...' : 'Save Settings'}
      </Button>
    </div>
  );
}
