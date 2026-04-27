import { useState } from 'react';
import { Calculator, UserPlus, ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';

interface Props {
  onRegister: (email: string, password: string, firstName: string, lastName: string, company: string) => Promise<void>;
  onGoogleSignIn: () => Promise<void>;
  onSignIn: () => void;
  onBack: () => void;
}

export default function Register({ onRegister, onGoogleSignIn, onSignIn, onBack }: Props) {
  const [form, setForm] = useState({
    firstName: '',
    lastName: '',
    company: '',
    email: '',
    password: '',
    confirmPassword: '',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  function update(field: keyof typeof form, value: string) {
    setForm((f) => ({ ...f, [field]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    if (form.password !== form.confirmPassword) {
      setError('Passwords do not match');
      return;
    }
    if (form.password.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }
    setLoading(true);
    try {
      await onRegister(form.email, form.password, form.firstName, form.lastName, form.company);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Registration failed');
    } finally {
      setLoading(false);
    }
  }

  async function handleGoogle() {
    setError('');
    setLoading(true);
    try {
      await onGoogleSignIn();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Google sign in failed');
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-[#F8F9FA] flex items-center justify-center px-4 py-8">
      <div className="w-full max-w-md">
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-8">
          <div className="flex items-center gap-3 mb-8">
            <div className="bg-blue-600 p-2 rounded-lg">
              <Calculator className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-gray-900">Services Pricing Workbook</h1>
              <p className="text-xs text-gray-500 uppercase tracking-wider">Create Account</p>
            </div>
          </div>

          {error && (
            <Alert className="mb-5 border-red-200 bg-red-50">
              <AlertDescription className="text-red-700 text-sm">{error}</AlertDescription>
            </Alert>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label htmlFor="firstName" className="text-sm font-medium text-gray-700">First Name</Label>
                <Input
                  id="firstName"
                  value={form.firstName}
                  onChange={(e) => update('firstName', e.target.value)}
                  placeholder="Jane"
                  required
                  className="mt-1 border-gray-200 focus:border-blue-400"
                />
              </div>
              <div>
                <Label htmlFor="lastName" className="text-sm font-medium text-gray-700">Last Name</Label>
                <Input
                  id="lastName"
                  value={form.lastName}
                  onChange={(e) => update('lastName', e.target.value)}
                  placeholder="Smith"
                  required
                  className="mt-1 border-gray-200 focus:border-blue-400"
                />
              </div>
            </div>

            <div>
              <Label htmlFor="company" className="text-sm font-medium text-gray-700">Company Name</Label>
              <Input
                id="company"
                value={form.company}
                onChange={(e) => update('company', e.target.value)}
                placeholder="Acme Corp"
                required
                className="mt-1 border-gray-200 focus:border-blue-400"
              />
              <p className="text-xs text-gray-400 mt-1">Creates or joins your company workspace</p>
            </div>

            <div>
              <Label htmlFor="reg-email" className="text-sm font-medium text-gray-700">Email</Label>
              <Input
                id="reg-email"
                type="email"
                value={form.email}
                onChange={(e) => update('email', e.target.value)}
                placeholder="you@company.com"
                required
                className="mt-1 border-gray-200 focus:border-blue-400"
              />
            </div>

            <div>
              <Label htmlFor="reg-password" className="text-sm font-medium text-gray-700">Password</Label>
              <Input
                id="reg-password"
                type="password"
                value={form.password}
                onChange={(e) => update('password', e.target.value)}
                placeholder="Min 6 characters"
                required
                className="mt-1 border-gray-200 focus:border-blue-400"
              />
            </div>

            <div>
              <Label htmlFor="confirm-password" className="text-sm font-medium text-gray-700">Confirm Password</Label>
              <Input
                id="confirm-password"
                type="password"
                value={form.confirmPassword}
                onChange={(e) => update('confirmPassword', e.target.value)}
                placeholder="••••••••"
                required
                className="mt-1 border-gray-200 focus:border-blue-400"
              />
            </div>

            <Button type="submit" disabled={loading} className="w-full bg-blue-600 hover:bg-blue-700 gap-2 mt-2">
              <UserPlus className="w-4 h-4" />
              {loading ? 'Creating Account...' : 'Create Account'}
            </Button>
          </form>

          <div className="relative my-5">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-gray-200" />
            </div>
            <div className="relative flex justify-center">
              <span className="bg-white px-3 text-xs text-gray-400">or continue with</span>
            </div>
          </div>

          <Button
            type="button"
            variant="outline"
            onClick={handleGoogle}
            disabled={loading}
            className="w-full border-gray-200 hover:bg-gray-50 gap-2"
          >
            <svg className="w-4 h-4" viewBox="0 0 24 24">
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
            </svg>
            Continue with Google
          </Button>

          <div className="mt-6 text-center text-sm text-gray-500">
            Already have an account?{' '}
            <button onClick={onSignIn} className="text-blue-600 hover:underline font-medium">
              Sign in
            </button>
          </div>

          <div className="mt-4 text-center">
            <button onClick={onBack} className="text-xs text-gray-400 hover:text-gray-600 flex items-center gap-1 mx-auto">
              <ArrowLeft className="w-3 h-3" /> Back to home
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
