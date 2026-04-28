import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { notify } from '../utils/notify';
import api from '../services/api';

const AdminRegister: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [secretToken, setSecretToken] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const toastId = notify.loading('Creating admin account...');

    try {
      // Assuming we have an endpoint for this, or simulate for now
      // In a real app, this would be a POST to /api/admin/register
      await api.post('/api/admin/register', { email, password, secret_token: secretToken });
      
      notify.dismiss(toastId);
      notify.success('Admin account created! Please log in.');
      navigate('/login');
    } catch (err: any) {
      notify.dismiss(toastId);
      notify.error(err.message || 'Admin registration failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[var(--forest-pale)] p-4">
      <div className="w-full max-w-md bg-white rounded-[2.5rem] p-10 shadow-2xl border border-[var(--forest)]/5">
        <div className="text-center mb-10">
          <div className="inline-flex items-center gap-2 bg-[var(--forest-pale)] text-[var(--forest)] px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest mb-4">
            <span className="w-1.5 h-1.5 rounded-full bg-[var(--saffron)] animate-pulse"></span>
            Super Admin Registration
          </div>
          <h1 className="text-3xl font-bold text-[var(--forest)] font-['Instrument_Serif']">Initialize Control Centre</h1>
          <p className="text-slate-500 text-sm mt-2 font-medium">Restricted to authorized platform owners</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-2">
            <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400">Admin Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full rounded-2xl border border-slate-200 bg-slate-50/50 px-5 py-4 text-slate-900 focus:border-[var(--forest)] outline-none transition-all font-bold"
              placeholder="admin@nammaconnect.org"
              required
            />
          </div>

          <div className="space-y-2">
            <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400">Master Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full rounded-2xl border border-slate-200 bg-slate-50/50 px-5 py-4 text-slate-900 focus:border-[var(--forest)] outline-none transition-all font-bold"
              placeholder="••••••••••••"
              required
            />
          </div>

          <div className="space-y-2">
            <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400">Platform Secret Token</label>
            <input
              type="password"
              value={secretToken}
              onChange={(e) => setSecretToken(e.target.value)}
              className="w-full rounded-2xl border border-slate-200 bg-slate-50/50 px-5 py-4 text-slate-900 focus:border-[var(--forest)] outline-none transition-all font-bold"
              placeholder="Enter registration token"
              required
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-[var(--forest)] hover:bg-[var(--forest-mid)] text-white font-bold py-5 rounded-2xl shadow-xl transition-all hover:-translate-y-1"
          >
            {loading ? 'Authorizing...' : 'Create Admin Account →'}
          </button>
        </form>

        <div className="mt-8 text-center">
          <Link to="/login" className="text-slate-500 text-sm font-medium hover:text-[var(--forest)] transition-all">
            Already have an account? <span className="font-bold">Sign In</span>
          </Link>
        </div>
      </div>
    </div>
  );
};

export default AdminRegister;
