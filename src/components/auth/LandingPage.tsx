import { Calculator, ArrowRight, Zap, ChartBar as BarChart3, ShieldCheck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { motion } from 'motion/react';

interface Props {
  onSignIn: () => void;
  onRegister: () => void;
}

export default function LandingPage({ onSignIn, onRegister }: Props) {
  return (
    <div className="min-h-screen bg-[#0A0A0A] text-white flex flex-col">
      {/* Nav */}
      <nav className="border-b border-white/10 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="bg-blue-600 p-2 rounded-xl">
            <Calculator className="w-5 h-5 text-white" />
          </div>
          <span className="font-bold text-lg">SPW</span>
        </div>
        <div className="flex items-center gap-3">
          <Button variant="ghost" onClick={onSignIn} className="text-white hover:text-white hover:bg-white/10">
            Sign In
          </Button>
          <Button onClick={onRegister} className="bg-white text-black hover:bg-gray-100 font-semibold">
            Create Account
          </Button>
        </div>
      </nav>

      {/* Hero */}
      <div className="flex-1 flex flex-col items-center justify-center text-center px-6 pt-24 pb-20 max-w-5xl mx-auto w-full">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
        >
          <div className="inline-flex items-center gap-2 bg-white/10 border border-white/20 rounded-full px-4 py-1.5 text-sm text-white/80 mb-8">
            Stop guessing, start pricing profitably.
          </div>

          <h1 className="text-7xl md:text-8xl font-extrabold tracking-tighter leading-[0.9] mb-6">
            The Precision
            <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-blue-600">
              Estimation Engine.
            </span>
          </h1>

          <p className="text-xl text-gray-400 max-w-2xl mx-auto mb-10 leading-relaxed">
            SPW replaces fragmented spreadsheets with a centralized, automated powerhouse
            for professional services teams. Deliver projects profitably, every single time.
          </p>

          <Button
            onClick={onRegister}
            size="lg"
            className="bg-blue-600 hover:bg-blue-700 text-white rounded-lg px-8 py-3 text-base font-semibold gap-2"
          >
            Get Started Free <ArrowRight className="w-4 h-4" />
          </Button>
        </motion.div>
      </div>

      {/* Features */}
      <div className="pb-28 px-6">
        <div className="max-w-5xl mx-auto grid md:grid-cols-3 gap-6">
          {[
            {
              icon: Zap,
              title: 'Automated Speed',
              description:
                'Cut estimation time by 70% with automated rate lookups, live margin calculation, and one-click scenario modeling.',
              iconBg: 'bg-blue-900/30',
              iconColor: 'text-blue-400',
            },
            {
              icon: BarChart3,
              title: 'Profit Guardrails',
              description:
                'Built-in risk scoring, contingency buffers, and margin targets prevent under-pricing before it happens.',
              iconBg: 'bg-green-900/30',
              iconColor: 'text-green-400',
            },
            {
              icon: ShieldCheck,
              title: 'Global Harmony',
              description:
                'Multi-currency support with exchange rates keeps international projects profitable across every region.',
              iconBg: 'bg-amber-900/30',
              iconColor: 'text-amber-400',
            },
          ].map((feature, i) => (
            <motion.div
              key={feature.title}
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.2 + i * 0.1 }}
              className="rounded-3xl bg-neutral-900 border border-white/5 hover:border-white/10 transition-colors p-8"
            >
              <div className={`w-14 h-14 ${feature.iconBg} rounded-2xl flex items-center justify-center mb-5`}>
                <feature.icon className={`w-6 h-6 ${feature.iconColor}`} />
              </div>
              <h3 className="text-lg font-semibold mb-2">{feature.title}</h3>
              <p className="text-gray-400 text-sm leading-relaxed">{feature.description}</p>
            </motion.div>
          ))}
        </div>
      </div>

      {/* Footer */}
      <footer className="border-t border-white/10 py-6 text-center text-gray-500 text-sm">
        © {new Date().getFullYear()} Services Pricing Workbook. All rights reserved.
      </footer>
    </div>
  );
}
