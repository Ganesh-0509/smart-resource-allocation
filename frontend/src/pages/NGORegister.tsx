import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { registerNGO } from '../services/auth';
import { notify } from '../utils/notify';

const NGORegister: React.FC = () => {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [phone, setPhone] = useState('');
  const [registration_number, setRegistrationNumber] = useState('');
  const [org_type, setOrgType] = useState('Trust');
  const [district, setDistrict] = useState('');
  const [state, setState] = useState('');
  const [address, setAddress] = useState('');
  const [description, setDescription] = useState('');
  const [website, setWebsite] = useState('');
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const toastId = notify.loading('Creating your account...');
    try {
      await registerNGO({
        name, email, password, phone, registration_number, org_type, 
        district, state, address, description, website
      });
      notify.dismiss(toastId);
      notify.success('Account created successfully! Please log in.');
      navigate('/ngo/login');
    } catch (err: any) {
      notify.dismiss(toastId);
      const msg = err.message || 'Registration failed';
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
          <h1 className="text-3xl font-bold text-[#1A3C2E] mb-2 font-['Instrument_Serif']">Join Namma Connect</h1>
          <p className="text-slate-500 text-sm font-medium">Register your NGO to start coordinating missions</p>
        </div>

        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-100 rounded-xl text-red-600 text-sm font-medium">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-2">
            <label className="block text-xs font-bold uppercase tracking-widest text-slate-400">NGO Name</label>
            <input
              type="text"
              value={name}
              autoComplete="organization"
              onChange={(e) => setName(e.target.value)}
              className="w-full rounded-xl border border-slate-200 bg-slate-50/50 px-4 py-3 text-slate-900 placeholder-slate-400 focus:border-[#1A3C2E] focus:outline-none transition-all"
              placeholder="e.g. Relief Foundation"
              required
            />
          </div>

          <div className="space-y-2">
            <label className="block text-xs font-bold uppercase tracking-widest text-slate-400">Official Email</label>
            <input
              type="email"
              value={email}
              autoComplete="email"
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
              autoComplete="new-password"
              onChange={(e) => setPassword(e.target.value)}
              className="w-full rounded-xl border border-slate-200 bg-slate-50/50 px-4 py-3 text-slate-900 placeholder-slate-400 focus:border-[#1A3C2E] focus:outline-none transition-all"
              placeholder="••••••••"
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="block text-xs font-bold uppercase tracking-widest text-slate-400">Phone</label>
              <input
                type="text"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="w-full rounded-xl border border-slate-200 bg-slate-50/50 px-4 py-3 text-slate-900 placeholder-slate-400 focus:border-[#1A3C2E] focus:outline-none transition-all"
                placeholder="+91..."
                required
              />
            </div>
            <div className="space-y-2">
              <label className="block text-xs font-bold uppercase tracking-widest text-slate-400">Registration Number</label>
              <input
                type="text"
                value={registration_number}
                onChange={(e) => setRegistrationNumber(e.target.value)}
                className="w-full rounded-xl border border-slate-200 bg-slate-50/50 px-4 py-3 text-slate-900 placeholder-slate-400 focus:border-[#1A3C2E] focus:outline-none transition-all"
                placeholder="Reg No."
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="block text-xs font-bold uppercase tracking-widest text-slate-400">Org Type</label>
              <select
                value={org_type}
                onChange={(e) => setOrgType(e.target.value)}
                className="w-full rounded-xl border border-slate-200 bg-slate-50/50 px-4 py-3 text-slate-900 focus:border-[#1A3C2E] focus:outline-none transition-all"
              >
                <option value="Trust">Trust</option>
                <option value="Society">Society</option>
                <option value="Section 8 Company">Section 8 Company</option>
                <option value="Other">Other</option>
              </select>
            </div>
            <div className="space-y-2">
              <label className="block text-xs font-bold uppercase tracking-widest text-slate-400">Website (Optional)</label>
              <input
                type="url"
                value={website}
                onChange={(e) => setWebsite(e.target.value)}
                className="w-full rounded-xl border border-slate-200 bg-slate-50/50 px-4 py-3 text-slate-900 placeholder-slate-400 focus:border-[#1A3C2E] focus:outline-none transition-all"
                placeholder="https://"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="block text-xs font-bold uppercase tracking-widest text-slate-400">State</label>
              <input
                type="text"
                value={state}
                onChange={(e) => setState(e.target.value)}
                className="w-full rounded-xl border border-slate-200 bg-slate-50/50 px-4 py-3 text-slate-900 placeholder-slate-400 focus:border-[#1A3C2E] focus:outline-none transition-all"
                placeholder="State"
                required
              />
            </div>
            <div className="space-y-2">
              <label className="block text-xs font-bold uppercase tracking-widest text-slate-400">District</label>
              <input
                type="text"
                value={district}
                onChange={(e) => setDistrict(e.target.value)}
                className="w-full rounded-xl border border-slate-200 bg-slate-50/50 px-4 py-3 text-slate-900 placeholder-slate-400 focus:border-[#1A3C2E] focus:outline-none transition-all"
                placeholder="District"
                required
              />
            </div>
          </div>

          <div className="space-y-2">
            <label className="block text-xs font-bold uppercase tracking-widest text-slate-400">Address</label>
            <input
              type="text"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              className="w-full rounded-xl border border-slate-200 bg-slate-50/50 px-4 py-3 text-slate-900 placeholder-slate-400 focus:border-[#1A3C2E] focus:outline-none transition-all"
              placeholder="Full Address"
              required
            />
          </div>

          <div className="space-y-2">
            <label className="block text-xs font-bold uppercase tracking-widest text-slate-400">Description</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full rounded-xl border border-slate-200 bg-slate-50/50 px-4 py-3 text-slate-900 placeholder-slate-400 focus:border-[#1A3C2E] focus:outline-none transition-all"
              placeholder="Brief description of the NGO's work..."
              required
              rows={3}
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-[#E8712A] hover:bg-[#D55F1B] text-white font-bold py-4 rounded-2xl shadow-xl shadow-[#E8712A]/10 transition-all hover:-translate-y-1 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? 'Creating Account...' : 'Register NGO'}
          </button>
        </form>

        <div className="mt-8 text-center text-slate-500 text-sm font-medium">
          Already have an account?{' '}
          <Link to="/ngo/login" className="text-[#1A3C2E] hover:underline font-bold">
            Log in here
          </Link>
        </div>
      </div>
    </div>
  );
};

export default NGORegister;
