import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useRole, type Role } from "../context/RoleContext";

export default function LoginPage() {
  const navigate = useNavigate();
  const { setRole, roleConfig } = useRole();
  const [selectedRole, setSelectedRole] = useState<Role>("volunteer");
  const [isLoading, setIsLoading] = useState(false);

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    
    // Simulate a brief "checking" state for realism
    setTimeout(() => {
      setRole(selectedRole);
      navigate(roleConfig[selectedRole].homeRoute);
    }, 800);
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-[80vh] px-4 sm:px-6 lg:px-8">
      <div className="w-full max-w-md space-y-10">
        <div className="text-center">
          <div 
            className="flex items-center justify-center gap-3 text-[26px] font-black text-[#1A3C2E] font-['Instrument_Serif'] cursor-pointer mb-8"
            onClick={() => navigate("/")}
          >
            <div className="w-2.5 h-2.5 rounded-full bg-[#E8712A] animate-pulse"></div>
            <span>Namma Connect</span>
          </div>
          <h2 className="text-3xl font-extrabold text-[#1A3C2E] font-['Instrument_Serif']">
            Welcome Back
          </h2>
          <p className="mt-3 text-sm text-slate-500 font-medium">
            Smart infrastructure for Bharat's social good
          </p>
        </div>

        <div className="mt-8 rounded-[2rem] bg-white p-10 shadow-[0_40px_100px_rgba(26,60,46,0.06)] border border-[#114B3B]/5">
          <form className="space-y-8" onSubmit={handleLogin}>
            <div className="space-y-2">
              <label htmlFor="email" className="block text-xs font-bold uppercase tracking-widest text-slate-400">
                Email address
              </label>
              <input
                id="email"
                name="email"
                type="email"
                placeholder="demo@nammaconnect.org"
                className="block w-full rounded-xl border border-slate-200 bg-slate-50/50 px-4 py-3 text-slate-900 placeholder-slate-400 focus:border-[#1A3C2E] focus:outline-none transition-all"
                defaultValue="demo@nammaconnect.org"
              />
            </div>

            <div className="space-y-2">
              <label htmlFor="role" className="block text-xs font-bold uppercase tracking-widest text-slate-400">
                Sign in as
              </label>
              <select
                id="role"
                value={selectedRole}
                onChange={(e) => setSelectedRole(e.target.value as Role)}
                className="block w-full rounded-xl border border-slate-200 bg-slate-50/50 px-4 py-3 text-slate-900 focus:border-[#1A3C2E] focus:outline-none transition-all font-semibold"
              >
                <option value="volunteer">Volunteer (🤝)</option>
                <option value="fieldworker">Field Worker (📱)</option>
                <option value="coordinator">Coordinator (📋)</option>
                <option value="admin">System Admin (🔒)</option>
              </select>
            </div>

            <div>
              <button
                type="submit"
                disabled={isLoading}
                className="flex w-full justify-center rounded-2xl bg-[#1A3C2E] px-6 py-4 text-base font-bold text-white shadow-xl shadow-[#1A3C2E]/10 transition-all hover:bg-[#2D5E47] hover:-translate-y-1 active:scale-95 disabled:opacity-70"
              >
                {isLoading ? (
                  <span className="flex items-center gap-3">
                    <svg className="h-5 w-5 animate-spin text-white" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                    Signing in...
                  </span>
                ) : (
                  "Sign In to Dashboard"
                )}
              </button>
            </div>
            
            <div className="relative">
              <div className="absolute inset-0 flex items-center" aria-hidden="true">
                <div className="w-full border-t border-slate-100"></div>
              </div>
              <div className="relative flex justify-center text-xs">
                <span className="bg-white px-3 text-slate-400 font-bold uppercase tracking-widest">Demo Vault</span>
              </div>
            </div>
            
            <p className="text-center text-[11px] text-slate-400 font-medium leading-relaxed uppercase tracking-tighter">
              Explore the role-specific dashboards with guest credentials.
            </p>
          </form>
        </div>
        
        <div className="text-center">
          <button 
            onClick={() => navigate("/")}
            className="text-sm font-bold text-slate-400 hover:text-[#E8712A] transition-colors"
          >
            ← Back to Home
          </button>
        </div>
      </div>
    </div>
  );
}
