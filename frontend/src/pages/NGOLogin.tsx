import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { loginNGO } from '../services/auth';
import { notify } from '../utils/notify';

const NGOLogin: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const toastId = notify.loading('Signing you in...');
    try {
      const data = await loginNGO(email, password);
      localStorage.setItem('access_token', data.access_token);
      localStorage.setItem('ngo_id', data.ngo_id);
      localStorage.setItem('name', data.name);
      localStorage.setItem('role', 'ngo');
      
      notify.dismiss(toastId);
      notify.success(`Welcome back, ${data.name}!`);
      navigate('/ngo/dashboard');
    } catch (err: any) {
      notify.dismiss(toastId);
      const msg = err.message || 'Login failed';
      setError(msg);
      notify.error(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[var(--saffron-pale)] p-4 font-inter">
      <div className="w-full max-w-md bg-white rounded-3xl border border-slate-100 p-10 shadow-[0_40px_100px_rgba(0,0,0,0.04)]">
        <div className="text-center mb-10">
          <div 
            className="flex items-center justify-center gap-3 text-[22px] font-black text-[#1A3C2E] font-['Instrument_Serif'] cursor-pointer mb-6"
            onClick={() => navigate("/")}
          >
            <div className="w-2.5 h-2.5 rounded-full bg-[#E8712A]"></div>
            <span>Namma Connect</span>
          </div>
          <h1 className="text-3xl font-bold text-[#1A3C2E] mb-2 font-['Instrument_Serif']">NGO Login</h1>
          <p className="text-slate-500 text-sm font-medium">Access your coordination dashboard</p>
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
              autoComplete="username"
              onChange={(e) => setEmail(e.target.value)}
              className="w-full rounded-xl border border-slate-200 bg-slate-50/50 px-4 py-3 text-slate-900 placeholder-slate-400 focus:border-[#1A3C2E] focus:outline-none transition-all"
              placeholder="admin@ngo.org"
              required
            />
          </div>

          <div className="space-y-2">
            <label className="block text-xs font-bold uppercase tracking-widest text-slate-400">Password</label>
            <input
              type="password"
              value={password}
              autoComplete="current-password"
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
            {loading ? 'Logging in...' : 'Sign In'}
          </button>
        </form>

        <div className="mt-8 text-center text-slate-500 text-sm font-medium">
          Don't have an NGO account?{' '}
          <Link to="/ngo/register" className="text-[#E8712A] hover:underline font-bold">
            Register your NGO
          </Link>
        </div>
      </div>
    </div>
  );
};

export default NGOLogin;
