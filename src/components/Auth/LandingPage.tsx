import React from 'react';
import { Button } from '@/components/ui/button';
import { motion } from 'motion/react';
import { Calculator, ShieldCheck, Zap, BarChart3, ChevronRight, ArrowRight } from 'lucide-react';

interface LandingPageProps {
  onSignIn: () => void;
  onRegister: () => void;
}

export default function LandingPage({ onSignIn, onRegister }: LandingPageProps) {
  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white">
      {/* Navigation */}
      <nav className="flex items-center justify-between px-8 py-6 border-b border-white/10">
        <div className="flex items-center gap-2">
          <div className="bg-white p-2 rounded-xl">
            <Calculator className="w-6 h-6 text-black" />
          </div>
          <span className="text-xl font-bold tracking-tight">SPW</span>
        </div>
        <div className="flex items-center gap-4">
          <Button variant="ghost" className="text-white hover:text-white hover:bg-white/10" onClick={onSignIn}>Sign In</Button>
          <Button className="bg-white text-black hover:bg-gray-200 font-semibold" onClick={onRegister}>Create Account</Button>
        </div>
      </nav>

      {/* Hero Section */}
      <main className="max-w-5xl mx-auto px-6 pt-32 pb-32">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center"
        >
          <div className="inline-block px-4 py-1.5 rounded-full bg-white/10 border border-white/20 text-sm font-medium text-white/80 mb-8">
            Stop guessing, start pricing profitably.
          </div>
          <h1 className="text-7xl md:text-8xl font-extrabold tracking-tighter text-white mb-8 leading-[0.9]">
            The Precision <br/><span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-blue-600">Estimation Engine.</span>
          </h1>
          <p className="text-xl text-gray-400 mb-12 leading-relaxed max-w-2xl mx-auto">
            SPW replaces fragmented spreadsheets with a centralized, automated powerhouse for professional services teams. Deliver projects profitably, every single time.
          </p>
          <div className="flex gap-4 justify-center">
            <Button size="lg" className="bg-blue-600 hover:bg-blue-700 h-14 px-10 text-lg font-semibold" onClick={onRegister}>
              Start Estimating <ArrowRight className="ml-2 w-5 h-5" />
            </Button>
          </div>
        </motion.div>

        {/* Features */}
        <div className="grid md:grid-cols-3 gap-8 mt-32">
          {[
            { icon: Zap, title: "Automated Speed", desc: "Slash estimation time by 70% with intelligent, reusable pricing templates." },
            { icon: BarChart3, title: "Profit Guardrails", desc: "Built-in intelligence to detect margin risks before you commit." },
            { icon: ShieldCheck, title: "Global Harmony", desc: "Enforce consistent organizational rate cards across all project teams." }
          ].map((feature, i) => (
            <motion.div 
              key={i}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 + (i * 0.1) }}
              className="p-8 rounded-3xl bg-neutral-900 border border-white/5 hover:border-white/10 transition-colors"
            >
              <div className="bg-blue-900/30 text-blue-400 w-14 h-14 rounded-2xl flex items-center justify-center mb-6">
                <feature.icon className="w-7 h-7" />
              </div>
              <h3 className="text-xl font-bold text-white mb-3 tracking-tight">{feature.title}</h3>
              <p className="text-gray-400 leading-relaxed">{feature.desc}</p>
            </motion.div>
          ))}
        </div>
      </main>
    </div>
  );
}
