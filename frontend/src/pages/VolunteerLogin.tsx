import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';

const VolunteerLogin: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    
    // Simulate login for now as per requirements (no backend logic yet)
    setTimeout(() => {
      localStorage.setItem('access_token', 'fake-volunteer-token');
      // TODO: Replace with real backend authentication and role validation
      navigate('/volunteer/dashboard');
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
          <h1 className="text-3xl font-bold text-[#1A3C2E] mb-2 font-['Instrument_Serif']">Volunteer Login</h1>
          <p className="text-slate-500 text-sm font-medium">Join the community and make an impact</p>
        </div>

        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-100 rounded-xl text-red-600 text-sm font-medium">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-2">
            <label className="block text-xs font-bold uppercase tracking-widest text-slate-400">Email Address</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full rounded-xl border border-slate-200 bg-slate-50/50 px-4 py-3 text-slate-900 placeholder-slate-400 focus:border-[#1A3C2E] focus:outline-none transition-all"
              placeholder="volunteer@example.org"
              required
            />
          </div>

          <div className="space-y-2">
            <label className="block text-xs font-bold uppercase tracking-widest text-slate-400">Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full rounded-xl border border-slate-200 bg-slate-50/50 px-4 py-3 text-slate-900 placeholder-slate-400 focus:border-[#1A3C2E] focus:outline-none transition-all"
              placeholder="••••••••"
              required
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-[#1A3C2E] hover:bg-[#2D5E47] text-white font-bold py-4 rounded-2xl shadow-xl shadow-[#1A3C2E]/10 transition-all hover:-translate-y-1 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? 'Signing in...' : 'Sign In'}
          </button>
        </form>

        <div className="mt-8 text-center text-slate-500 text-sm font-medium">
          New to Namma Connect?{' '}
          <Link to="/volunteer/register" className="text-[#E8712A] hover:underline font-bold">
            Create an account
          </Link>
        </div>
      </div>
    </div>
  );
};

export default VolunteerLogin;
