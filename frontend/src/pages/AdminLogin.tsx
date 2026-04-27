import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { adminLogin } from "../services/admin";
import { notify } from "../utils/notify";

export default function AdminLogin() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const toastId = notify.loading("Authenticating...");
    setLoading(true);
    try {
      const data = await adminLogin(email, password);
      localStorage.setItem("access_token", data.access_token);
      localStorage.setItem("role", "admin");
      localStorage.setItem("admin_id", data.admin_id);
      notify.dismiss(toastId);
      notify.success("Welcome, Super Admin!");
      navigate("/admin/console");
    } catch (err: any) {
      notify.dismiss(toastId);
      notify.error(err.message || "Login failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ minHeight: "100vh", background: "var(--saffron-pale)", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "'DM Sans', sans-serif" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;700&family=Instrument+Serif:ital,wght@0,400;1,400&display=swap');

        .admin-card {
          background: white;
          border: 1px solid var(--border);
          border-radius: 32px;
          padding: 56px 48px;
          width: 100%;
          max-width: 440px;
          box-shadow: 0 40px 100px rgba(26,60,46,0.08);
        }
        .admin-badge {
          display: inline-flex; align-items: center; gap: 8px;
          background: var(--forest-pale);
          border: 1px solid rgba(26,60,46,0.1);
          color: var(--forest);
          font-size: 11px; font-weight: 800;
          letter-spacing: 0.12em; text-transform: uppercase;
          padding: 6px 14px; border-radius: 100px;
          margin-bottom: 32px;
        }
        .admin-badge .dot {
          width: 6px; height: 6px; border-radius: 50%;
          background: var(--saffron);
          animation: blink 1.5s ease-in-out infinite;
        }
        @keyframes blink {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.3; }
        }
        .admin-title {
          font-family: 'Instrument Serif', serif;
          font-size: 42px; font-weight: 400;
          color: var(--forest); line-height: 1.05;
          margin-bottom: 8px; letter-spacing: -0.02em;
        }
        .admin-sub {
          font-size: 15px; color: var(--slate);
          font-weight: 500; margin-bottom: 40px; line-height: 1.6;
        }
        .form-group { margin-bottom: 20px; }
        .form-label {
          display: block; font-size: 11px; font-weight: 800;
          letter-spacing: 0.1em; text-transform: uppercase;
          color: var(--slate); margin-bottom: 8px;
        }
        .form-input {
          width: 100%; padding: 14px 18px;
          background: var(--warm-white);
          border: 1px solid var(--border);
          border-radius: 16px; color: var(--forest);
          font-size: 15px; font-weight: 500;
          outline: none; transition: all 0.2s;
          box-sizing: border-box;
        }
        .form-input::placeholder { color: rgba(26,60,46,0.25); }
        .form-input:focus {
          border-color: var(--forest);
          background: white;
          box-shadow: 0 0 0 4px var(--forest-pale);
        }
        .btn-admin {
          width: 100%; padding: 18px;
          background: var(--forest);
          color: white; font-size: 16px; font-weight: 700;
          border: none; border-radius: 16px; cursor: pointer;
          transition: all 0.25s; margin-top: 8px;
          display: flex; align-items: center; justify-content: center; gap: 10px;
        }
        .btn-admin:hover:not(:disabled) {
          background: var(--forest-mid);
          transform: translateY(-2px);
          box-shadow: 0 16px 40px rgba(26,60,46,0.15);
        }
        .btn-admin:disabled { opacity: 0.5; cursor: not-allowed; }
        .divider {
          border: none; border-top: 1px solid var(--border);
          margin: 32px 0;
        }
        .back-link {
          display: block; text-align: center;
          font-size: 14px; color: var(--slate);
          text-decoration: none; font-weight: 600;
          transition: color 0.2s; cursor: pointer;
        }
        .back-link:hover { color: var(--forest); }
        .warning-box {
          background: #FFFBEB;
          border: 1px solid #FEF3C7;
          border-radius: 16px; padding: 16px;
          margin-bottom: 32px;
        }
        .warning-box p {
          font-size: 12px; color: #92400E;
          font-weight: 600; margin: 0; line-height: 1.5;
        }
      `}</style>


      <div className="admin-card" style={{ position: "relative" }}>
        <div className="admin-badge">
          <div className="dot" />
          Super Admin Portal
        </div>
        <div className="admin-title">Platform Control<br />Centre</div>
        <div className="admin-sub">
          Restricted access. Only authorized Super Admins may login.
        </div>

        <div className="warning-box">
          <p>⚠️ This portal manages NGO approvals, platform health, and all audit logs. Unauthorized access is prohibited.</p>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label">Admin Email</label>
            <input
              id="admin-email"
              type="email"
              className="form-input"
              placeholder="superadmin@nammaconnect.org"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>
          <div className="form-group">
            <label className="form-label">Password</label>
            <input
              id="admin-password"
              type="password"
              className="form-input"
              placeholder="••••••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>
          <button id="admin-login-btn" type="submit" className="btn-admin" disabled={loading}>
            {loading ? "Authenticating..." : "Access Admin Console →"}
          </button>
        </form>

        <hr className="divider" />
        <span className="back-link" onClick={() => navigate("/")}>← Back to Landing Page</span>
      </div>
    </div>
  );
}
