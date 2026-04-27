import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { getPlatformStats, getAllNGOs, updateNGOStatus, getGlobalAuditLogs } from "../services/admin";
import { notify } from "../utils/notify";

type Tab = "ngos" | "logs";
type StatusFilter = "all" | "pending" | "approved" | "suspended";

export default function AdminConsole() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [tab, setTab] = useState<Tab>("ngos");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("pending");
  const [expandedNgoId, setExpandedNgoId] = useState<string | null>(null);

  const { data: stats } = useQuery({
    queryKey: ["admin-stats"],
    queryFn: getPlatformStats,
    refetchInterval: 30000,
  });

  const { data: ngos, isLoading: ngosLoading } = useQuery({
    queryKey: ["admin-ngos", statusFilter],
    queryFn: () => getAllNGOs(statusFilter === "all" ? undefined : statusFilter),
  });

  const { data: logs, isLoading: logsLoading } = useQuery({
    queryKey: ["admin-audit-logs"],
    queryFn: () => getGlobalAuditLogs(100),
    enabled: tab === "logs",
  });

  const statusMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) =>
      updateNGOStatus(id, status),
    onSuccess: (_, vars) => {
      queryClient.invalidateQueries({ queryKey: ["admin-ngos"] });
      queryClient.invalidateQueries({ queryKey: ["admin-stats"] });
      notify.success(
        vars.status === "approved"
          ? "NGO approved! They can now login."
          : vars.status === "suspended"
          ? "NGO has been suspended."
          : "NGO status updated."
      );
    },
    onError: (err: any) => notify.error(err.message || "Failed to update status"),
  });

  const handleLogout = () => {
    localStorage.clear();
    navigate("/admin/login");
  };

  const statusColors: Record<string, { bg: string; text: string; border: string }> = {
    pending:  { bg: "rgba(251,191,36,0.1)",  text: "#fbbf24", border: "rgba(251,191,36,0.3)" },
    approved: { bg: "rgba(34,197,94,0.1)",   text: "#22c55e", border: "rgba(34,197,94,0.3)" },
    suspended:{ bg: "rgba(239,68,68,0.1)",   text: "#ef4444", border: "rgba(239,68,68,0.3)" },
  };

  return (
    <div style={{ minHeight: "100vh", background: "var(--saffron-pale)", fontFamily: "'DM Sans', sans-serif", color: "var(--charcoal)" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;700&family=Instrument+Serif:ital,wght@0,400;1,400&display=swap');
        * { box-sizing: border-box; }

        .admin-sidebar {
          position: fixed; top: 0; left: 0; bottom: 0; width: 260px;
          background: white;
          border-right: 1px solid var(--border);
          display: flex; flex-direction: column;
          padding: 32px 20px;
          z-index: 100;
        }
        .sidebar-logo {
          display: flex; align-items: center; gap: 10px;
          margin-bottom: 48px; padding: 0 8px;
        }
        .logo-icon {
          width: 36px; height: 36px; border-radius: 10px;
          background: var(--forest);
          display: flex; align-items: center; justify-content: center;
          font-size: 16px;
        }
        .logo-text { font-size: 16px; font-weight: 800; color: var(--forest); letter-spacing: -0.01em; }
        .logo-sub { font-size: 10px; color: var(--slate); font-weight: 600; text-transform: uppercase; letter-spacing: 0.1em; }
        
        .nav-item {
          display: flex; align-items: center; gap: 12px;
          padding: 12px 16px; border-radius: 14px;
          font-size: 14px; font-weight: 600; color: var(--slate);
          cursor: pointer; transition: all 0.2s; margin-bottom: 4px;
          border: none; background: transparent; width: 100%; text-align: left;
        }
        .nav-item:hover { background: var(--forest-pale); color: var(--forest); }
        .nav-item.active { background: var(--forest); color: white; }
        .nav-item .icon { font-size: 16px; width: 20px; text-align: center; }

        .main-content {
          margin-left: 260px; padding: 40px 48px; min-height: 100vh;
        }
        .page-header { margin-bottom: 36px; }
        .page-title { font-family: 'Instrument Serif', serif; font-size: 36px; font-weight: 400; color: var(--forest); letter-spacing: -0.01em; }
        .page-sub { font-size: 15px; color: var(--slate); font-weight: 500; margin-top: 4px; }

        .stats-grid {
          display: grid; grid-template-columns: repeat(4, 1fr);
          gap: 16px; margin-bottom: 36px;
        }
        .stat-card {
          background: white;
          border: 1px solid var(--border);
          border-radius: 24px; padding: 24px;
          transition: all 0.2s;
          box-shadow: 0 4px 20px rgba(26,60,46,0.02);
        }
        .stat-card:hover { transform: translateY(-2px); box-shadow: 0 12px 30px rgba(26,60,46,0.06); }
        .stat-value { font-family: 'Instrument Serif', serif; font-size: 42px; font-weight: 400; color: var(--forest); line-height: 1; margin-bottom: 6px; }
        .stat-label { font-size: 12px; font-weight: 700; color: var(--slate); text-transform: uppercase; letter-spacing: 0.08em; }
        .stat-accent { color: var(--saffron); }
        .stat-green { color: var(--forest-light); }

        .filter-bar { display: flex; gap: 8px; margin-bottom: 24px; }
        .filter-btn {
          padding: 10px 20px; border-radius: 100px;
          font-size: 13px; font-weight: 700;
          border: 1px solid var(--border);
          cursor: pointer; transition: all 0.2s;
          background: white; color: var(--slate);
        }
        .filter-btn.active { background: var(--forest); border-color: var(--forest); color: white; }
        .filter-btn:hover:not(.active) { background: var(--forest-pale); color: var(--forest); }

        .ngo-table { width: 100%; border-collapse: separate; border-spacing: 0 8px; }
        .ngo-table th {
          font-size: 11px; font-weight: 800; letter-spacing: 0.1em;
          text-transform: uppercase; color: var(--slate);
          padding: 0 24px 12px; text-align: left;
        }
        .ngo-row {
          background: white;
          border-radius: 20px; cursor: pointer; transition: all 0.2s;
          box-shadow: 0 2px 10px rgba(26,60,46,0.02);
        }
        .ngo-row:hover { transform: scale(1.005); box-shadow: 0 8px 25px rgba(26,60,46,0.06); }
        .ngo-row td {
          padding: 20px 24px; font-size: 14px;
          border-top: 1px solid var(--border);
          border-bottom: 1px solid var(--border);
        }
        .ngo-row td:first-child { border-left: 1px solid var(--border); border-radius: 20px 0 0 20px; }
        .ngo-row td:last-child { border-right: 1px solid var(--border); border-radius: 0 20px 20px 0; }
        .ngo-name { font-weight: 700; color: var(--forest); font-size: 16px; }
        .ngo-email { font-size: 13px; color: var(--slate); margin-top: 2px; }
        .status-pill {
          display: inline-flex; align-items: center; gap: 6px;
          padding: 6px 14px; border-radius: 100px;
          font-size: 11px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.06em;
        }
        .status-dot { width: 6px; height: 6px; border-radius: 50%; }

        .action-btns { display: flex; gap: 8px; }
        .btn-approve {
          padding: 10px 20px; border-radius: 12px;
          background: var(--forest-pale); color: var(--forest);
          border: 1px solid rgba(26,60,46,0.1);
          font-size: 13px; font-weight: 700; cursor: pointer;
          transition: all 0.2s;
        }
        .btn-approve:hover { background: var(--forest); color: white; transform: translateY(-2px); }
        .btn-suspend {
          padding: 10px 20px; border-radius: 12px;
          background: #FEF2F2; color: #DC2626;
          border: 1px solid rgba(220,38,38,0.1);
          font-size: 13px; font-weight: 700; cursor: pointer;
          transition: all 0.2s;
        }
        .btn-suspend:hover { background: #DC2626; color: white; transform: translateY(-2px); }
        .btn-restore {
          padding: 10px 20px; border-radius: 12px;
          background: #FFFBEB; color: #D97706;
          border: 1px solid rgba(217,119,6,0.1);
          font-size: 13px; font-weight: 700; cursor: pointer;
          transition: all 0.2s;
        }
        .btn-restore:hover { background: #D97706; color: white; }

        .log-item {
          background: white;
          border: 1px solid var(--border);
          border-radius: 18px; padding: 20px 24px;
          margin-bottom: 12px;
          box-shadow: 0 2px 10px rgba(26,60,46,0.02);
        }
        .log-action { font-size: 11px; font-weight: 800; color: var(--saffron); text-transform: uppercase; letter-spacing: 0.08em; margin-bottom: 6px; }
        .log-desc { font-size: 15px; color: var(--forest); font-weight: 600; }
        .log-meta { font-size: 12px; color: var(--slate); margin-top: 8px; font-weight: 500; }

        .empty-state {
          text-align: center; padding: 100px 0;
          color: var(--slate); font-size: 16px; font-weight: 600;
        }
        .empty-icon { font-size: 56px; margin-bottom: 20px; opacity: 0.3; }

        .logout-btn {
          margin-top: auto; padding: 14px 18px; border-radius: 14px;
          background: var(--warm-white); border: 1px solid var(--border);
          color: var(--slate); font-size: 14px; font-weight: 700;
          cursor: pointer; transition: all 0.2s; width: 100%; text-align: left;
          display: flex; align-items: center; gap: 10px;
        }
        .logout-btn:hover { background: #FEF2F2; color: #DC2626; border-color: rgba(220,38,38,0.1); }

        .expanded-row { background: transparent !important; }
        .expanded-row td { padding: 0 24px 16px !important; border: none !important; }
        .details-card {
          background: #FDFCFB;
          border: 1px solid var(--border);
          border-radius: 24px; padding: 32px;
          animation: slideDown 0.3s ease-out;
        }
        @keyframes slideDown {
          from { opacity: 0; transform: translateY(-10px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .details-grid {
          display: grid; grid-template-columns: 1fr 1fr; gap: 24px;
        }
        .detail-item label {
          display: block; font-size: 10px; font-weight: 800;
          color: var(--slate); text-transform: uppercase;
          letter-spacing: 0.1em; margin-bottom: 6px;
        }
        .detail-item .value {
          font-size: 14px; font-weight: 600; color: var(--forest);
        }
      `}</style>

      {/* Sidebar */}
      <div className="admin-sidebar">
        <div className="sidebar-logo">
          <div className="logo-icon">🛡️</div>
          <div>
            <div className="logo-text">Admin Console</div>
            <div className="logo-sub">Namma Connect</div>
          </div>
        </div>

        <button className={`nav-item ${tab === "ngos" ? "active" : ""}`} onClick={() => setTab("ngos")}>
          <span className="icon">🏢</span> NGO Management
          {(stats?.pending_ngos ?? 0) > 0 && (
            <span style={{ marginLeft: "auto", background: "rgba(251,191,36,0.2)", color: "#fbbf24", fontSize: "11px", fontWeight: 800, padding: "2px 8px", borderRadius: "100px" }}>
              {stats?.pending_ngos}
            </span>
          )}
        </button>
        <button className={`nav-item ${tab === "logs" ? "active" : ""}`} onClick={() => setTab("logs")}>
          <span className="icon">📋</span> Audit Logs
        </button>

        <button className="logout-btn" onClick={handleLogout}>
          <span>🚪</span> Sign Out
        </button>
      </div>

      {/* Main Content */}
      <div className="main-content">
        {/* Header */}
        <div className="page-header">
          <div className="page-title">
            {tab === "ngos" ? "NGO Management" : "Platform Audit Logs"}
          </div>
          <div className="page-sub">
            {tab === "ngos"
              ? "Review, approve, and manage all registered NGOs on the platform."
              : "Real-time log of all significant actions taken across the platform."}
          </div>
        </div>

        {/* Stats */}
        <div className="stats-grid">
          <div className="stat-card">
            <div className="stat-value">{stats?.total_ngos ?? "—"}</div>
            <div className="stat-label">Total NGOs</div>
          </div>
          <div className="stat-card">
            <div className="stat-value stat-accent">{stats?.pending_ngos ?? "—"}</div>
            <div className="stat-label">Awaiting Approval</div>
          </div>
          <div className="stat-card">
            <div className="stat-value stat-green">{stats?.approved_ngos ?? "—"}</div>
            <div className="stat-label">Approved NGOs</div>
          </div>
          <div className="stat-card">
            <div className="stat-value">{stats?.total_volunteers ?? "—"}</div>
            <div className="stat-label">Total Volunteers</div>
          </div>
        </div>

        {tab === "ngos" && (
          <>
            {/* Filter Bar */}
            <div className="filter-bar">
              {(["pending", "approved", "suspended", "all"] as StatusFilter[]).map((s) => (
                <button
                  key={s}
                  className={`filter-btn ${statusFilter === s ? "active" : ""}`}
                  onClick={() => setStatusFilter(s)}
                >
                  {s === "all" ? "All NGOs" : s.charAt(0).toUpperCase() + s.slice(1)}
                </button>
              ))}
            </div>

            {/* NGO Table */}
            {ngosLoading ? (
              <div className="empty-state"><div>Loading NGOs...</div></div>
            ) : !ngos || ngos.length === 0 ? (
              <div className="empty-state">
                <div className="empty-icon">🏢</div>
                <div>No NGOs match this filter.</div>
              </div>
            ) : (
              <table className="ngo-table">
                <thead>
                  <tr>
                    <th>NGO Details</th>
                    <th>Status</th>
                    <th>Registered</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {ngos.map((ngo) => {
                    const sc = statusColors[ngo.status] || statusColors.pending;
                    const isExpanded = expandedNgoId === ngo.id;
                    return (
                      <React.Fragment key={ngo.id}>
                        <tr className="ngo-row" onClick={() => setExpandedNgoId(isExpanded ? null : ngo.id)}>
                          <td>
                            <div className="ngo-name">{ngo.name}</div>
                            <div className="ngo-email">{ngo.email}</div>
                          </td>
                          <td>
                            <span className="status-pill" style={{ background: sc.bg, color: sc.text, border: `1px solid ${sc.border}` }}>
                              <span className="status-dot" style={{ background: sc.text }} />
                              {ngo.status}
                            </span>
                          </td>
                          <td style={{ color: "var(--slate)", fontSize: "13px", fontWeight: 500 }}>
                            {new Date(ngo.created_at).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}
                          </td>
                          <td onClick={(e) => e.stopPropagation()}>
                            <div className="action-btns">
                              {ngo.status !== "approved" && (
                                <button
                                  className="btn-approve"
                                  onClick={() => statusMutation.mutate({ id: ngo.id, status: "approved" })}
                                  disabled={statusMutation.isPending}
                                >
                                  ✓ Approve
                                </button>
                              )}
                              {ngo.status === "approved" && (
                                <button
                                  className="btn-suspend"
                                  onClick={() => statusMutation.mutate({ id: ngo.id, status: "suspended" })}
                                  disabled={statusMutation.isPending}
                                >
                                  ✕ Suspend
                                </button>
                              )}
                              {ngo.status === "suspended" && (
                                <button
                                  className="btn-restore"
                                  onClick={() => statusMutation.mutate({ id: ngo.id, status: "pending" })}
                                  disabled={statusMutation.isPending}
                                >
                                  ↺ Restore
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                        {isExpanded && (
                          <tr className="expanded-row">
                            <td colSpan={4}>
                              <div className="details-card">
                                <div className="details-grid">
                                  <div className="detail-item">
                                    <label>Registration Number</label>
                                    <div className="value">{ngo.registration_number || "Not Provided"}</div>
                                  </div>
                                  <div className="detail-item">
                                    <label>Organization Type</label>
                                    <div className="value">{ngo.org_type || "Not Provided"}</div>
                                  </div>
                                  <div className="detail-item">
                                    <label>Phone Number</label>
                                    <div className="value">{ngo.phone || "Not Provided"}</div>
                                  </div>
                                  <div className="detail-item">
                                    <label>Website</label>
                                    <div className="value">
                                      {ngo.website ? (
                                        <a href={ngo.website.startsWith('http') ? ngo.website : `https://${ngo.website}`} target="_blank" rel="noreferrer" style={{ color: 'var(--forest)', textDecoration: 'underline' }}>
                                          {ngo.website}
                                        </a>
                                      ) : "Not Provided"}
                                    </div>
                                  </div>
                                  <div className="detail-item" style={{ gridColumn: 'span 2' }}>
                                    <label>Full Address</label>
                                    <div className="value">{ngo.address}, {ngo.district}, {ngo.state}</div>
                                  </div>
                                  <div className="detail-item" style={{ gridColumn: 'span 2' }}>
                                    <label>Organization Description</label>
                                    <div className="value" style={{ lineHeight: 1.6 }}>{ngo.description || "No description provided."}</div>
                                  </div>
                                </div>
                              </div>
                            </td>
                          </tr>
                        )}
                      </React.Fragment>
                    );
                  })}
                </tbody>
              </table>
            )}
          </>
        )}

        {tab === "logs" && (
          <>
            {logsLoading ? (
              <div className="empty-state">Loading audit logs...</div>
            ) : !logs || logs.length === 0 ? (
              <div className="empty-state">
                <div className="empty-icon">📋</div>
                <div>No audit logs yet.</div>
              </div>
            ) : (
              <div>
                {logs.map((log) => (
                  <div key={log.id} className="log-item">
                    <div className="log-action">{log.action_type.replace(/_/g, " ")}</div>
                    <div className="log-desc">{log.description}</div>
                    <div className="log-meta">
                      {log.entity_type} • {log.user_role || "system"} •{" "}
                      {new Date(log.created_at).toLocaleString("en-IN")}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
