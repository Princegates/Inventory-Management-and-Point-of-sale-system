import { useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useSettings } from '../context/SettingsContext';
import useReveal from '../hooks/useReveal';

const FEATURES = [
  {
    title: 'Real-Time Inventory',
    desc: 'Every case, charger, screen protector and power bank tracked live across your shop and warehouse - never guess what\'s on the shelf again.',
    color: 'from-indigo-500 to-violet-500',
    // A literal phone/device outline - the thing actually being tracked - rather than a generic box.
    icon: (
      <>
        <rect x="7" y="2.5" width="10" height="19" rx="2.2" strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} />
        <circle cx="12" cy="18.4" r="0.9" fill="currentColor" stroke="none" />
        <line x1="10" y1="5" x2="14" y2="5" strokeLinecap="round" strokeWidth={1.8} />
      </>
    ),
  },
  {
    title: 'Fast Point of Sale',
    desc: 'Scan or search, cart, split cash and mobile money payments, print a receipt - built for a busy counter, not a boardroom.',
    color: 'from-emerald-500 to-teal-500',
    // A printed receipt - literal to "print a receipt" at checkout.
    icon: (
      <>
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M6 3h12v16.5l-1.8-1.2-1.8 1.2-1.8-1.2-1.8 1.2-1.8-1.2-1.8 1.2V3z" />
        <line x1="8.5" y1="7" x2="15.5" y2="7" strokeLinecap="round" strokeWidth={1.5} />
        <line x1="8.5" y1="10" x2="15.5" y2="10" strokeLinecap="round" strokeWidth={1.5} />
        <line x1="8.5" y1="13" x2="12.5" y2="13" strokeLinecap="round" strokeWidth={1.5} />
      </>
    ),
  },
  {
    title: 'Purchasing & Transfers',
    desc: 'Receive stock - chargers, cables, power banks - from suppliers, move it warehouse-to-shop with a full approval trail.',
    color: 'from-amber-500 to-orange-500',
    // A charging bolt - literal to "charger", the accessory category itself.
    icon: (
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M13.5 2.25L4.5 13.5h6.75l-1.5 8.25 9-11.25h-6.75l1.5-8.25z" />
    ),
  },
  {
    title: 'Reports & Insights',
    desc: 'Know what\'s selling, what\'s running low, and what\'s actually making you money - not just what\'s in the till.',
    color: 'from-rose-500 to-pink-500',
    icon: (
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z" />
    ),
  },
];

// Small phone-shaped mark used in the navbar and hero badge, in place of a plain letter monogram.
function PhoneMark({ className }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" className={className}>
      <rect x="7" y="2.5" width="10" height="19" rx="2.2" strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} />
      <circle cx="12" cy="18.4" r="1" fill="currentColor" stroke="none" />
      <line x1="10" y1="5" x2="14" y2="5" strokeLinecap="round" strokeWidth={2} />
    </svg>
  );
}

const STEPS = [
  { n: '01', title: 'Stock In', desc: 'Receive from your supplier straight into the warehouse, or bring stock in directly.' },
  { n: '02', title: 'Sell at the Till', desc: 'Cashiers scan, ring up, and take payment - stock updates the instant a sale completes.' },
  { n: '03', title: 'Track & Grow', desc: 'Dashboards and reports show what to reorder and what\'s actually profitable.' },
];

function FeatureCard({ f, i }) {
  const ref = useReveal();
  return (
    <div
      ref={ref}
      className="reveal group card p-6 hover:-translate-y-1.5 hover:shadow-xl transition-all duration-300"
      style={{ animationDelay: `${i * 120}ms` }}
    >
      <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${f.color} flex items-center justify-center text-white mb-4 shadow-md group-hover:scale-110 transition-transform duration-300`}>
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" className="w-6 h-6">
          {f.icon}
        </svg>
      </div>
      <h3 className="font-semibold text-slate-900 mb-1.5">{f.title}</h3>
      <p className="text-sm text-slate-500 leading-relaxed">{f.desc}</p>
    </div>
  );
}

function Step({ s, i }) {
  const ref = useReveal();
  return (
    <div ref={ref} className="reveal relative flex-1" style={{ animationDelay: `${i * 150}ms` }}>
      <div className="text-5xl font-black bg-gradient-to-br from-indigo-200 to-violet-200 bg-clip-text text-transparent select-none">{s.n}</div>
      <h4 className="font-semibold text-slate-900 mt-1 mb-1.5">{s.title}</h4>
      <p className="text-sm text-slate-500 leading-relaxed">{s.desc}</p>
    </div>
  );
}

export default function Landing() {
  const { user, loading } = useAuth();
  const { business_name: businessName, business_tagline: businessTagline } = useSettings();
  const navigate = useNavigate();
  const stepsRef = useReveal();
  const ctaRef = useReveal();

  useEffect(() => {
    if (!loading && user) navigate('/dashboard', { replace: true });
  }, [loading, user, navigate]);

  return (
    <div className="min-h-screen bg-white overflow-x-hidden">
      {/* Navbar */}
      <header className="fixed top-0 inset-x-0 z-50 bg-white/70 backdrop-blur-md border-b border-slate-100">
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-indigo-600 to-violet-600 flex items-center justify-center text-white shadow-md">
              <PhoneMark className="w-5 h-5" />
            </div>
            <span className="font-bold text-slate-900 tracking-tight">{businessName}</span>
          </div>
          <Link to="/login" className="btn-primary shadow-sm hover:shadow-md transition-shadow">Sign In</Link>
        </div>
      </header>

      {/* Hero */}
      <section className="relative pt-40 pb-28 px-6">
        <div
          aria-hidden="true"
          className="absolute inset-0 -z-10 bg-gradient-to-br from-indigo-50 via-violet-50 to-rose-50 animate-gradient-shift"
        />
        <div aria-hidden="true" className="absolute top-24 left-[8%] w-24 h-24 rounded-3xl bg-gradient-to-br from-indigo-400 to-violet-400 opacity-20 blur-sm animate-float" />
        <div aria-hidden="true" className="absolute top-48 right-[12%] w-16 h-16 rounded-2xl bg-gradient-to-br from-emerald-400 to-teal-400 opacity-20 blur-sm animate-float-delayed" />
        <div aria-hidden="true" className="absolute bottom-16 left-[18%] w-20 h-20 rounded-full bg-gradient-to-br from-rose-400 to-pink-400 opacity-20 blur-sm animate-float-slow" />

        <div className="max-w-4xl mx-auto text-center relative">
          <div className="animate-fade-in-up inline-flex items-center gap-1.5 rounded-full bg-white/80 border border-indigo-100 px-3 py-1 text-xs font-medium text-indigo-700 shadow-sm mb-6">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
            {businessTagline}
          </div>

          <h1 className="animate-fade-in-up text-5xl sm:text-6xl font-extrabold tracking-tight text-slate-900 leading-[1.1]" style={{ animationDelay: '80ms' }}>
            Run <span className="bg-gradient-to-r from-indigo-600 via-violet-600 to-rose-500 bg-clip-text text-transparent">{businessName}</span>
            <br />from one screen.
          </h1>

          <p className="animate-fade-in-up mt-6 text-lg text-slate-600 max-w-xl mx-auto leading-relaxed" style={{ animationDelay: '160ms' }}>
            Every case, cable and charger tracked from the moment it arrives to the moment it's sold -
            stock, sales, and reports, all in one connected system.
          </p>

          <div className="animate-fade-in-up mt-9 flex items-center justify-center gap-4" style={{ animationDelay: '240ms' }}>
            <Link to="/login" className="animate-glow-pulse inline-flex items-center gap-2 rounded-lg bg-indigo-600 text-white px-6 py-3 text-sm font-semibold shadow-lg hover:bg-indigo-700 hover:shadow-xl hover:-translate-y-0.5 transition-all duration-300">
              Sign In to Your Account
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
                <path fillRule="evenodd" d="M3 10a.75.75 0 01.75-.75h10.638L10.23 5.29a.75.75 0 111.04-1.08l5.5 5.25a.75.75 0 010 1.08l-5.5 5.25a.75.75 0 11-1.04-1.08l4.158-3.96H3.75A.75.75 0 013 10z" clipRule="evenodd" />
              </svg>
            </Link>
            <a href="#features" className="text-sm font-semibold text-slate-600 hover:text-slate-900 transition-colors">
              See what it does &darr;
            </a>
          </div>
        </div>
      </section>

      {/* Features */}
      <section id="features" className="py-24 px-6 bg-slate-50">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-14">
            <h2 className="text-3xl font-bold text-slate-900">Everything the shop needs, connected</h2>
            <p className="text-slate-500 mt-3 max-w-lg mx-auto">No spreadsheets, no guesswork - one system for the counter and the back room.</p>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {FEATURES.map((f, i) => <FeatureCard key={f.title} f={f} i={i} />)}
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="py-24 px-6">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-14">
            <h2 className="text-3xl font-bold text-slate-900">How stock moves through {businessName}</h2>
          </div>
          <div ref={stepsRef} className="reveal flex flex-col sm:flex-row gap-10 sm:gap-6">
            {STEPS.map((s, i) => <Step key={s.n} s={s} i={i} />)}
          </div>
        </div>
      </section>

      {/* CTA band */}
      <section ref={ctaRef} className="reveal relative py-20 px-6 overflow-hidden">
        <div aria-hidden="true" className="absolute inset-0 -z-10 bg-gradient-to-r from-indigo-600 via-violet-600 to-rose-500 animate-gradient-shift" />
        <div aria-hidden="true" className="absolute inset-0 -z-10 opacity-[0.07] bg-[radial-gradient(circle_at_1px_1px,white_1px,transparent_0)] [background-size:24px_24px]" />
        <div className="max-w-2xl mx-auto text-center">
          <h2 className="text-3xl font-bold text-white">Ready to run the shop smarter?</h2>
          <p className="text-indigo-100 mt-3">Sign in to open a till, check stock, or see today's sales.</p>
          <Link to="/login" className="mt-7 inline-flex items-center gap-2 rounded-lg bg-white text-indigo-700 px-6 py-3 text-sm font-semibold shadow-lg hover:shadow-xl hover:-translate-y-0.5 transition-all duration-300">
            Sign In
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-8 px-6 border-t border-slate-100">
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-2 text-sm text-slate-400">
          <span>&copy; {new Date().getFullYear()} {businessName}</span>
          <span>
            Powered by{' '}
            <a href="https://anknovate.com" target="_blank" rel="noopener noreferrer" className="font-medium text-slate-600 hover:text-indigo-600 transition-colors">
              Anknovate IT Services
            </a>
          </span>
        </div>
      </footer>
    </div>
  );
}
