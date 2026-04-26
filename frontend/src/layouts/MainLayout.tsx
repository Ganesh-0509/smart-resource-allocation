import React from "react";
import { NavLink, Outlet, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { checkBackendHealth } from "../services/health";
import logo from "../assets/logo.png";

interface NavItem {
  to: string;
  label: string;
  icon: React.ReactNode;
}

const NGO_NAV: NavItem[] = [
  { 
    to: "/ngo/dashboard", 
    label: "Dashboard", 
    icon: <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" /></svg>
  },
  { 
    to: "/ngo/triage", 
    label: "Triage Queue", 
    icon: <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" /></svg>
  },
  { 
    to: "/ngo/tasks", 
    label: "Missions", 
    icon: <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
  },
  { 
    to: "/ngo/volunteers", 
    label: "Volunteer Force", 
    icon: <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" /></svg>
  },
];

const VOLUNTEER_NAV: NavItem[] = [
  { 
    to: "/volunteer/dashboard", 
    label: "My Assignments", 
    icon: <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>
  },
];

const FIELD_NAV: NavItem[] = [
  { 
    to: "/field/report", 
    label: "Submit Report", 
    icon: <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
  },
];

export default function MainLayout() {
  const navigate = useNavigate();
  const role = localStorage.getItem("role") || "ngo"; // Fallback to ngo for demo safety
  
  const healthQuery = useQuery({
    queryKey: ["health"],
    queryFn: checkBackendHealth,
    refetchInterval: 60000,
  });

  const navItems = role === "ngo" ? NGO_NAV : role === "volunteer" ? VOLUNTEER_NAV : FIELD_NAV;

  const handleLogout = () => {
    localStorage.clear();
    navigate("/");
  };

  return (
    <div className="flex min-h-screen bg-[#F9F7F2]">
      {/* Sidebar */}
      <aside className="w-64 bg-[#1A3C2E] text-white flex flex-col fixed inset-y-0 shadow-xl z-20">
        <div className="p-6 flex items-center gap-3 border-b border-white/5 mb-4">
          <img src={logo} alt="Namma Connect Logo" className="w-12 h-12 rounded-xl shadow-lg border border-white/10" />
          <h1 className="text-xl font-black font-['Instrument_Serif'] tracking-tight">Namma Connect</h1>
        </div>

        <nav className="flex-1 px-4 py-4 space-y-2">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                `flex items-center gap-4 px-4 py-3 rounded-xl text-sm font-bold transition-all ${
                  isActive 
                    ? "bg-[#E8712A] text-white shadow-lg shadow-[#E8712A]/20" 
                    : "text-slate-300 hover:bg-white/5 hover:text-white"
                }`
              }
            >
              {item.icon}
              {item.label}
            </NavLink>
          ))}
        </nav>

        <div className="p-6 border-t border-white/10 space-y-6">
          <div className="flex items-center gap-3 px-2">
             <div className={`w-2 h-2 rounded-full ${healthQuery.data ? 'bg-emerald-400' : 'bg-red-400'} animate-pulse`} />
             <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">
               {healthQuery.data ? 'Network Active' : 'Offline Mode'}
             </span>
          </div>

          <button
            onClick={handleLogout}
            className="flex items-center gap-4 w-full px-4 py-3 rounded-xl text-sm font-bold text-red-300 hover:bg-red-500/10 hover:text-red-400 transition-all"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" /></svg>
            Sign Out
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 ml-64 p-10">
        <div className="mx-auto max-w-[1200px]">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
