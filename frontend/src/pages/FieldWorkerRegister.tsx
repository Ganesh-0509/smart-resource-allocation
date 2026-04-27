import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { notify } from '../utils/notify';
import api from '../services/api';

const FieldWorkerRegister: React.FC = () => {
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [designation, setDesignation] = useState('');
  const [baseLocation, setBaseLocation] = useState('');
  const [ngoId, setNgoId] = useState('');
  const [pin, setPin] = useState('');
  const [ngos, setNgos] = useState<{ id: string; name: string }[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    async function fetchNgos() {
      try {
        const response = await api.get("/api/auth/ngos/public");
        setNgos(response.data || []);
      } catch (err) {
        console.error("Failed to fetch NGOs", err);
      }
    }
    fetchNgos();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const toastId = notify.loading('Creating field worker account...');
    try {
      await api.post("/api/auth/field/register", {
        name,
        phone,
        email,
        designation,
        base_location: baseLocation,
        ngo_id: ngoId,
        pin
      });
      notify.dismiss(toastId);
      notify.success('Field Worker registered successfully! You can now log in.');
      navigate('/field/login');
    } catch (err: any) {
      notify.dismiss(toastId);
      const msg = err.response?.data?.detail || 'Registration failed';
      setError(msg);
      notify.error(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#FDFCF6] p-4 font-dm-sans">
      <div className="w-full max-w-xl bg-white rounded-[2.5rem] border border-slate-100 p-10 shadow-[0_40px_100px_rgba(0,0,0,0.03)]">
        <div className="text-center mb-10">
          <div 
            className="flex items-center justify-center gap-3 text-[22px] font-black text-[#1A3C2E] font-['Instrument_Serif'] cursor-pointer mb-6"
            onClick={() => navigate("/")}
          >
            <div className="w-2.5 h-2.5 rounded-full bg-[#E8712A]"></div>
            <span>Namma Connect</span>
          </div>
          <h1 className="text-4xl font-bold text-[#1A3C2E] mb-2 font-['Instrument_Serif']">Field Worker Access</h1>
          <p className="text-slate-500 text-sm font-medium">Join an NGO to capture community needs on the ground</p>
        </div>

        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-100 rounded-2xl text-red-600 text-sm font-medium">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <label className="block text-xs font-bold uppercase tracking-widest text-slate-400">Full Name</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full rounded-xl border border-slate-200 bg-slate-50/50 px-4 py-3 text-slate-900 placeholder-slate-400 focus:border-[#1A3C2E] focus:outline-none transition-all"
                placeholder="Full Name"
                required
              />
            </div>
            <div className="space-y-2">
              <label className="block text-xs font-bold uppercase tracking-widest text-slate-400">Phone Number</label>
              <input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="w-full rounded-xl border border-slate-200 bg-slate-50/50 px-4 py-3 text-slate-900 placeholder-slate-400 focus:border-[#1A3C2E] focus:outline-none transition-all"
                placeholder="+91..."
                required
              />
            </div>
          </div>

          <div className="space-y-2">
            <label className="block text-xs font-bold uppercase tracking-widest text-slate-400">Email Address</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full rounded-xl border border-slate-200 bg-slate-50/50 px-4 py-3 text-slate-900 placeholder-slate-400 focus:border-[#1A3C2E] focus:outline-none transition-all"
              placeholder="email@example.com"
              required
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <label className="block text-xs font-bold uppercase tracking-widest text-slate-400">Designation</label>
              <input
                type="text"
                value={designation}
                onChange={(e) => setDesignation(e.target.value)}
                className="w-full rounded-xl border border-slate-200 bg-slate-50/50 px-4 py-3 text-slate-900 placeholder-slate-400 focus:border-[#1A3C2E] focus:outline-none transition-all"
                placeholder="e.g. Health Assessor"
                required
              />
            </div>
            <div className="space-y-2">
              <label className="block text-xs font-bold uppercase tracking-widest text-slate-400">Base Location</label>
              <input
                type="text"
                value={baseLocation}
                onChange={(e) => setBaseLocation(e.target.value)}
                className="w-full rounded-xl border border-slate-200 bg-slate-50/50 px-4 py-3 text-slate-900 placeholder-slate-400 focus:border-[#1A3C2E] focus:outline-none transition-all"
                placeholder="e.g. Madurai South"
                required
              />
            </div>
          </div>

          <div className="space-y-2">
            <label className="block text-xs font-bold uppercase tracking-widest text-slate-400">Select NGO</label>
            <select
              value={ngoId}
              onChange={(e) => setNgoId(e.target.value)}
              className="w-full rounded-xl border border-slate-200 bg-slate-50/50 px-4 py-3 text-slate-900 focus:border-[#1A3C2E] focus:outline-none transition-all font-bold"
              required
            >
              <option value="">Choose your organization</option>
              {ngos.map(ngo => (
                <option key={ngo.id} value={ngo.id}>{ngo.name}</option>
              ))}
            </select>
          </div>

          <div className="space-y-2">
            <label className="block text-xs font-bold uppercase tracking-widest text-slate-400">Set Access PIN (6 digits)</label>
            <input
              type="password"
              maxLength={6}
              value={pin}
              onChange={(e) => setPin(e.target.value)}
              className="w-full rounded-xl border border-slate-200 bg-slate-50/50 px-4 py-3 text-slate-900 placeholder-slate-400 focus:border-[#1A3C2E] focus:outline-none transition-all tracking-[0.5em] font-mono text-center text-xl"
              placeholder="••••••"
              required
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-[#1A3C2E] hover:bg-[#2D5E47] text-white font-bold py-5 rounded-3xl shadow-2xl shadow-[#1A3C2E]/10 transition-all hover:-translate-y-1 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed text-lg"
          >
            {loading ? 'Creating Account...' : 'Register as Field Worker'}
          </button>
        </form>

        <div className="mt-8 text-center text-slate-500 text-sm font-medium">
          Already have access?{' '}
          <Link to="/field/login" className="text-[#1A3C2E] hover:underline font-bold">
            Log in here
          </Link>
        </div>
      </div>
    </div>
  );
};

export default FieldWorkerRegister;
