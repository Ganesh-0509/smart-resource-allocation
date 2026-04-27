import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';

const FieldLogin: React.FC = () => {
  const [phone, setPhone] = useState('');
  const [pin, setPin] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    
    // Simulate login for now
    setTimeout(() => {
      localStorage.setItem('access_token', 'fake-field-token');
      localStorage.setItem('role', 'field');
      navigate('/field/report');
      setLoading(false);
    }, 800);
  };

  return (
    <div className="min-h-[80vh] flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-white rounded-3xl border border-slate-100 p-10 shadow-[0_40px_100px_rgba(0,0,0,0.04)]">
        <div className="text-center mb-10">
          <div 
            className="flex items-center justify-center gap-3 text-[22px] font-black text-[#1A3C2E] font-['Instrument_Serif'] cursor-pointer mb-6"
            onClick={() => navigate("/")}
          >
            <div className="w-2.5 h-2.5 rounded-full bg-[#E8712A]"></div>
            <span>Namma Connect</span>
          </div>
          <h1 className="text-3xl font-bold text-[#1A3C2E] mb-2 font-['Instrument_Serif']">Field Worker Login</h1>
          <p className="text-slate-500 text-sm font-medium">Quick access for field surveys & reports</p>
        </div>

        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-100 rounded-xl text-red-600 text-sm font-medium">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-2">
            <label className="block text-xs font-bold uppercase tracking-widest text-slate-400">Phone Number</label>
            <input
              type="tel"
              value={phone}
              autoComplete="tel"
              onChange={(e) => setPhone(e.target.value)}
              className="w-full rounded-xl border border-slate-200 bg-slate-50/50 px-4 py-3 text-slate-900 placeholder-slate-400 focus:border-[#1A3C2E] focus:outline-none transition-all"
              placeholder="+91 XXXXX XXXXX"
              required
            />
          </div>

          <div className="space-y-2">
            <label className="block text-xs font-bold uppercase tracking-widest text-slate-400">Access PIN</label>
            <input
              type="password"
              maxLength={6}
              value={pin}
              autoComplete="current-password"
              onChange={(e) => setPin(e.target.value)}
              className="w-full rounded-xl border border-slate-200 bg-slate-50/50 px-4 py-3 text-slate-900 placeholder-slate-400 focus:border-[#1A3C2E] focus:outline-none transition-all tracking-[0.5em] font-mono text-center text-2xl"
              placeholder="••••••"
              required
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-[#E8712A] hover:bg-[#D55F1B] text-white font-bold py-4 rounded-2xl shadow-xl shadow-[#E8712A]/10 transition-all hover:-translate-y-1 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? 'Verifying...' : 'Access Field Portal'}
          </button>
        </form>

        <div className="mt-8 text-center space-y-4">
            <p className="text-xs text-slate-400 font-medium italic">
                Authorized field workers only. Contact your coordinator for PIN reset.
            </p>
            <div className="pt-4 border-t border-slate-50">
                <p className="text-sm text-slate-500">
                    Want to join an NGO as a field worker?{' '}
                    <Link to="/field/register" className="text-[#E8712A] font-bold hover:underline">Register here</Link>
                </p>
            </div>
        </div>
      </div>
    </div>
  );
};

export default FieldLogin;
