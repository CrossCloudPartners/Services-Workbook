import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { LogIn, UserPlus, Calculator, ArrowRight, Eye, EyeOff, ArrowLeft } from 'lucide-react';
import { motion } from 'motion/react';

interface RegisterProps {
  onRegister: (data: any) => void;
  onSwitchToSignIn: () => void;
  onBackToLanding: () => void;
}

export default function Register({ onRegister, onSwitchToSignIn, onBackToLanding }: RegisterProps) {
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    companyName: '',
    password: '',
    confirmPassword: '',
    acceptTerms: false
  });

  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { id, value } = e.target;
    setFormData(prev => ({ ...prev, [id]: value }));
  };

  const handleCheckboxChange = (checked: boolean) => {
    setFormData(prev => ({ ...prev, acceptTerms: checked }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!formData.firstName || !formData.lastName || !formData.email || !formData.companyName || !formData.password) {
      setError('Please fill in all fields');
      return;
    }

    if (formData.password !== formData.confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    if (!formData.acceptTerms) {
      setError('You must accept the terms and conditions');
      return;
    }

    onRegister(formData);
  };

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
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
          <h1 className="text-2xl font-bold text-gray-900">Create your account</h1>
          <p className="text-gray-500 mt-2">Start building your pricing workbooks today</p>
        </div>

        <Card className="border-gray-200 shadow-xl">
          <form onSubmit={handleSubmit}>
            <CardHeader>
              <CardTitle className="text-xl">Registration</CardTitle>
              <CardDescription>Enter your details to create a new account</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {error && (
                <div className="p-3 bg-red-50 border border-red-100 text-red-600 text-sm rounded-lg">
                  {error}
                </div>
              )}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="firstName">First Name</Label>
                  <Input id="firstName" placeholder="John" value={formData.firstName} onChange={handleChange} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="lastName">Last Name</Label>
                  <Input id="lastName" placeholder="Doe" value={formData.lastName} onChange={handleChange} />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">Email Address</Label>
                <Input id="email" type="email" placeholder="john@example.com" value={formData.email} onChange={handleChange} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="companyName">Company Name</Label>
                <Input id="companyName" placeholder="Acme Corp" value={formData.companyName} onChange={handleChange} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <div className="relative">
                  <Input 
                    id="password" 
                    type={showPassword ? "text" : "password"} 
                    placeholder="••••••••" 
                    value={formData.password} 
                    onChange={handleChange} 
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-2.5 text-gray-400 hover:text-gray-600"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="confirmPassword">Confirm Password</Label>
                <div className="relative">
                  <Input 
                    id="confirmPassword" 
                    type={showConfirmPassword ? "text" : "password"} 
                    placeholder="••••••••" 
                    value={formData.confirmPassword} 
                    onChange={handleChange} 
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute right-3 top-2.5 text-gray-400 hover:text-gray-600"
                  >
                    {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>
              <div className="flex items-start space-x-2 pt-2">
                <Checkbox 
                  id="terms" 
                  checked={formData.acceptTerms} 
                  onCheckedChange={handleCheckboxChange}
                  className="mt-1"
                />
                <div className="grid gap-1.5 leading-none">
                  <label
                    htmlFor="terms"
                    className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                  >
                    I accept the <a href="#" className="text-blue-600 hover:underline">Terms and Conditions</a>
                  </label>
                </div>
              </div>
            </CardContent>
            <CardFooter className="flex flex-col space-y-4">
              <Button type="submit" className="w-full bg-blue-600 hover:bg-blue-700 h-11">
                <UserPlus className="w-4 h-4 mr-2" />
                Create Account
              </Button>
              <div className="text-center text-sm">
                <span className="text-gray-500">Already have an account? </span>
                <button 
                  type="button"
                  onClick={onSwitchToSignIn}
                  className="text-blue-600 font-bold hover:underline"
                >
                  Sign In
                </button>
              </div>
            </CardFooter>
          </form>
        </Card>
      </motion.div>
    </div>
  );
}
