import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { loginNGO, loginFieldWorker } from '../services/auth';
import { adminLogin } from '../services/admin';
import { notify } from '../utils/notify';

type Role = 'ngo' | 'volunteer' | 'field' | 'admin';

const UnifiedLogin: React.FC = () => {
  const [role, setRole] = useState<Role>('ngo');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [pin, setPin] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();

  const handleRoleChange = (newRole: Role) => {
    setRole(newRole);
    setError(null);
    // Clear passwords/pins when switching roles for security
    setPassword('');
    setPin('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const toastId = notify.loading(`Signing you in as ${role.toUpperCase()}...`);

    try {
      if (role === 'ngo') {
        const data = await loginNGO(email, password);
        localStorage.setItem('access_token', data.access_token);
        localStorage.setItem('ngo_id', data.ngo_id);
        localStorage.setItem('name', data.name);
        localStorage.setItem('role', 'ngo');
        notify.dismiss(toastId);
        notify.success(`Welcome back, ${data.name}!`);
        navigate('/ngo/dashboard');
      } else if (role === 'admin') {
        const data = await adminLogin(email, password);
        localStorage.setItem('access_token', data.access_token);
        localStorage.setItem('role', 'admin');
        localStorage.setItem('admin_id', data.admin_id);
        notify.dismiss(toastId);
        notify.success("Welcome, Super Admin!");
        navigate('/admin/console');
      } else if (role === 'volunteer') {
        // Simulation for now
        setTimeout(() => {
          localStorage.setItem('access_token', 'fake-volunteer-token');
          localStorage.setItem('role', 'volunteer');
          notify.dismiss(toastId);
          notify.success('Volunteer login successful!');
          navigate('/volunteer/dashboard');
          setLoading(false);
        }, 800);
        return; // Exit early as we have async simulation
      } else if (role === 'field') {
        const data = await loginFieldWorker(phone, pin);
        localStorage.setItem('access_token', data.access_token);
        localStorage.setItem('field_worker_id', data.field_worker_id);
        localStorage.setItem('name', data.name);
        localStorage.setItem('role', 'field');
        localStorage.setItem('ngo_id', data.ngo_id);
        notify.dismiss(toastId);
        notify.success(`Welcome back, Agent ${data.name}!`);
        navigate('/field/report');
      }
    } catch (err: any) {
      notify.dismiss(toastId);
      const msg = err.message || 'Login failed';
      setError(msg);
      notify.error(msg);
    } finally {
      if (role === 'ngo' || role === 'admin') {
        setLoading(false);
      }
    }
  };

  const roleConfigs: Record<Role, { title: string; sub: string; icon: string; color: string }> = {
    ngo: { title: 'NGO Portal', sub: 'Coordinate missions & resources', icon: '🏢', color: 'var(--forest)' },
    volunteer: { title: 'Volunteer Hub', sub: 'Make an impact in your community', icon: '🤝', color: 'var(--forest)' },
    field: { title: 'Field Agent', sub: 'Submit reports from the ground', icon: '📍', color: 'var(--saffron)' },
    admin: { title: 'Super Admin', sub: 'Platform control & audit', icon: '🛡️', color: '#111' },
  };

  const currentConfig = roleConfigs[role];

  return (
    <div className="min-h-screen flex items-center justify-center bg-[var(--saffron-pale)] p-4 font-inter">
      <div className="w-full max-w-md bg-white rounded-[2.5rem] border border-slate-100 p-8 md:p-12 shadow-[0_40px_100px_rgba(26,60,46,0.06)]">
        
        {/* Logo & Header */}
        <div className="text-center mb-10">
          <div 
            className="flex items-center justify-center gap-3 text-[22px] font-black text-[#1A3C2E] font-['Instrument_Serif'] cursor-pointer mb-8"
            onClick={() => navigate("/")}
          >
            <div className="w-2.5 h-2.5 rounded-full bg-[#E8712A]"></div>
            <span>Namma Connect</span>
          </div>
          
          <h1 className="text-4xl font-black text-[#1A3C2E] mb-2 font-['Instrument_Serif'] tracking-tight">
            {currentConfig.title}
          </h1>
          <p className="text-slate-500 text-sm font-medium">{currentConfig.sub}</p>
        </div>

        {/* Role Selector */}
        <div className="grid grid-cols-4 gap-2 mb-10 bg-slate-50 p-1.5 rounded-2xl border border-slate-100">
          {(['ngo', 'volunteer', 'field', 'admin'] as Role[]).map((r) => (
            <button
              key={r}
              onClick={() => handleRoleChange(r)}
              className={`py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${
                role === r 
                  ? 'bg-white text-[#1A3C2E] shadow-sm border border-slate-100' 
                  : 'text-slate-400 hover:text-slate-600'
              }`}
            >
              {r === 'field' ? 'Field' : r}
            </button>
          ))}
        </div>

        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-100 rounded-2xl text-red-600 text-xs font-bold uppercase tracking-wide">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          {role === 'field' ? (
            <div className="space-y-2">
              <label className="block text-xs font-bold uppercase tracking-widest text-slate-400">Phone Number</label>
              <input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="w-full rounded-2xl border border-slate-200 bg-slate-50/50 px-5 py-4 text-slate-900 placeholder-slate-400 focus:border-[#1A3C2E] focus:outline-none transition-all font-bold"
                placeholder="+91..."
                required
              />
            </div>
          ) : (
            <div className="space-y-2">
              <label className="block text-xs font-bold uppercase tracking-widest text-slate-400">
                {role === 'admin' ? 'Admin Email' : 'Email Address'}
              </label>
              <input
                type="email"
                value={email}
                autoComplete="email"
                onChange={(e) => setEmail(e.target.value)}
                className="w-full rounded-2xl border border-slate-200 bg-slate-50/50 px-5 py-4 text-slate-900 placeholder-slate-400 focus:border-[#1A3C2E] focus:outline-none transition-all font-bold"
                placeholder="you@example.com"
                required
              />
            </div>
          )}

          <div className="space-y-2">
            <label className="block text-xs font-bold uppercase tracking-widest text-slate-400">
              {role === 'field' ? 'Access PIN' : 'Password'}
            </label>
            <input
              type="password"
              value={role === 'field' ? pin : password}
              maxLength={role === 'field' ? 6 : undefined}
              onChange={(e) => role === 'field' ? setPin(e.target.value) : setPassword(e.target.value)}
              className={`w-full rounded-2xl border border-slate-200 bg-slate-50/50 px-5 py-4 text-slate-900 placeholder-slate-400 focus:border-[#1A3C2E] focus:outline-none transition-all font-bold ${
                role === 'field' ? 'tracking-[0.5em] text-center text-2xl font-mono' : ''
              }`}
              placeholder={role === 'field' ? '••••••' : '••••••••'}
              required
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            style={{ backgroundColor: currentConfig.color }}
            className="w-full text-white font-bold py-5 rounded-[1.5rem] shadow-2xl shadow-slate-200 transition-all hover:-translate-y-1 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed text-lg"
          >
            {loading ? 'Verifying...' : `Enter ${role.charAt(0).toUpperCase() + role.slice(1)} Portal →`}
          </button>
        </form>

        <div className="mt-10 text-center space-y-4">
          {role === 'ngo' && (
            <p className="text-slate-500 text-sm font-medium">
              New NGO? <Link to="/ngo/register" className="text-[#E8712A] hover:underline font-bold">Register here</Link>
            </p>
          )}
          {role === 'volunteer' && (
            <p className="text-slate-500 text-sm font-medium">
              Not a volunteer yet? <Link to="/volunteer/register" className="text-[#E8712A] hover:underline font-bold">Sign up now</Link>
            </p>
          )}
          {role === 'field' && (
            <div className="space-y-4">
              <p className="text-slate-500 text-sm font-medium">
                New field worker? <Link to="/field/register" className="text-[#E8712A] hover:underline font-bold">Register here</Link>
              </p>
              <p className="text-xs text-slate-400 font-medium italic">
                Authorized field workers only. Contact your NGO for access.
              </p>
            </div>
          )}
          {role === 'admin' && (
            <div className="space-y-4">
              <p className="text-slate-500 text-sm font-medium">
                New admin? <Link to="/admin/register" className="text-[#E8712A] hover:underline font-bold">Initialize Portal</Link>
              </p>
              <p className="text-xs text-red-500 font-bold uppercase tracking-widest">
                ⚠️ Restricted System Access
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default UnifiedLogin;
