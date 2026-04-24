import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { LogIn, Calculator, Chrome, ArrowLeft } from 'lucide-react';
import { motion } from 'motion/react';

interface SignInProps {
  onSignIn: (email: string, pass: string) => void;
  onGoogleSignIn: () => void;
  onSwitchToRegister: () => void;
  onBackToLanding: () => void;
}

export default function SignIn({ onSignIn, onGoogleSignIn, onSwitchToRegister, onBackToLanding }: SignInProps) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!email || !password) {
      setError('Please enter both email and password');
      return;
    }
    onSignIn(email, password);
  };

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="w-full max-w-md"
      >
        <div className="text-center mb-8">
          <button 
             onClick={onBackToLanding}
             className="flex items-center gap-2 text-gray-500 hover:text-gray-900 mb-6 mx-auto text-sm"
          >
            <ArrowLeft className="w-4 h-4" /> Back to Landing Page
          </button>
          <div className="bg-blue-600 w-12 h-12 rounded-xl flex items-center justify-center mx-auto mb-4 shadow-lg shadow-blue-200">
            <Calculator className="w-7 h-7 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900">Welcome Back</h1>
          <p className="text-gray-500 mt-2">Sign in to access your pricing workbooks</p>
        </div>

        <Card className="border-gray-200 shadow-xl">
          <form onSubmit={handleSubmit}>
            <CardHeader>
              <CardTitle className="text-xl">Sign In</CardTitle>
              <CardDescription>Enter your credentials to access your account</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {error && (
                <div className="p-3 bg-red-50 border border-red-100 text-red-600 text-sm rounded-lg">
                  {error}
                </div>
              )}
              <div className="space-y-2">
                <Label htmlFor="email">Email Address</Label>
                <Input 
                  id="email" 
                  type="email" 
                  placeholder="john@example.com" 
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="password">Password</Label>
                  <button type="button" className="text-xs text-blue-600 hover:underline">Forgot password?</button>
                </div>
                <Input 
                  id="password" 
                  type="password" 
                  placeholder="••••••••" 
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
              </div>
            </CardContent>
            <CardFooter className="flex flex-col space-y-4">
              <Button type="submit" className="w-full bg-blue-600 hover:bg-blue-700 h-11">
                <LogIn className="w-4 h-4 mr-2" />
                Sign In
              </Button>
              
              <div className="relative w-full">
                <div className="absolute inset-0 flex items-center">
                  <span className="w-full border-t border-gray-200" />
                </div>
                <div className="relative flex justify-center text-xs uppercase">
                  <span className="bg-white px-2 text-gray-500">Or continue with</span>
                </div>
              </div>

              <Button 
                type="button" 
                variant="outline" 
                className="w-full h-11 border-gray-200 hover:bg-gray-50"
                onClick={onGoogleSignIn}
              >
                <Chrome className="w-4 h-4 mr-2 text-red-500" />
                Google
              </Button>

              <div className="text-center text-sm">
                <span className="text-gray-500">Don't have an account? </span>
                <button 
                  type="button"
                  onClick={onSwitchToRegister}
                  className="text-blue-600 font-bold hover:underline"
                >
                  Create Account
                </button>
              </div>
            </CardFooter>
          </form>
        </Card>
      </motion.div>
    </div>
  );
}
