import React from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { mockEngine } from '../../services/mockEngine';
import { 
  LayoutDashboard, 
  Boxes, 
  ClipboardList, 
  RotateCcw, 
  History, 
  Bell, 
  User, 
  HelpCircle, 
  LogOut, 
  FileText, 
  Activity, 
  Users, 
  ShieldCheck, 
  Settings, 
  Sparkles,
  Layers,
  ShoppingBag
} from 'lucide-react';

interface SidebarProps {
  isOpen: boolean;
  onClose?: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ isOpen, onClose }) => {
  const { user, role, logout } = useAuth();
  const navigate = useNavigate();

  const requests = mockEngine.getRequests();
  const pendingRequestsCount = requests.filter((r) => r.status === 'pending').length;
  const notifications = user ? mockEngine.getNotifications(user.id) : [];
  const unreadNotifsCount = notifications.filter((n) => !n.is_read).length;

  return (
    <aside className={`glass-panel flex flex-col justify-between min-h-[calc(100vh-65px)] transition-all duration-300 shrink-0 
      ${
        isOpen 
          ? 'fixed inset-y-[65px] left-0 z-30 w-64 p-4 opacity-100 translate-x-0 bg-[#0B132B]/95 backdrop-blur-xl border-r border-white/10 lg:relative lg:inset-auto lg:z-0 lg:bg-transparent lg:translate-x-0 lg:w-64 lg:p-4 lg:opacity-100 lg:pointer-events-auto lg:border-r lg:border-white/10 lg:flex'
          : 'fixed inset-y-[65px] left-0 z-30 w-0 p-0 opacity-0 -translate-x-full pointer-events-none overflow-hidden border-r-0 lg:relative lg:inset-auto lg:z-0 lg:bg-transparent lg:-translate-x-full lg:opacity-0 lg:pointer-events-none lg:w-0 lg:p-0 lg:overflow-hidden lg:border-r-0 lg:hidden'
      }
    `}>
      <div className="space-y-6">

        {/* User Card matching UI image preview */}
        <div className="flex items-center gap-3 p-3 rounded-2xl bg-gradient-to-r from-slate-900/80 to-indigo-950/40 border border-white/10">
          <img
            src={user?.avatar_url || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80'}
            alt={user?.full_name}
            className="w-10 h-10 rounded-xl object-cover ring-2 ring-indigo-500/40"
          />
          <div className="overflow-hidden">
            <h3 className="text-xs font-bold text-white truncate">{user?.full_name}</h3>
            <p className="text-[10px] text-slate-400 capitalize font-medium">{user?.role} Mode</p>
          </div>
        </div>

        {/* Navigation Items */}
        <nav className="space-y-1" onClick={onClose}>
          {/* STUDENT MENU */}
          {role === 'student' && (
            <>
              <NavLink
                to="/student/dashboard"
                className={({ isActive }) =>
                  `flex items-center gap-3 px-3.5 py-2.5 rounded-2xl text-xs font-semibold transition-all ${
                    isActive
                      ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/30'
                      : 'text-slate-400 hover:text-white hover:bg-slate-800/40'
                  }`
                }
              >
                <LayoutDashboard className="w-4 h-4" />
                <span>Dashboard</span>
              </NavLink>

              <NavLink
                to="/student/browse"
                className={({ isActive }) =>
                  `flex items-center gap-3 px-3.5 py-2.5 rounded-2xl text-xs font-semibold transition-all ${
                    isActive
                      ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/30'
                      : 'text-slate-400 hover:text-white hover:bg-slate-800/40'
                  }`
                }
              >
                <Boxes className="w-4 h-4" />
                <span>Browse Components</span>
              </NavLink>

              <NavLink
                to="/student/cart"
                className={({ isActive }) =>
                  `flex items-center gap-3 px-3.5 py-2.5 rounded-2xl text-xs font-semibold transition-all ${
                    isActive
                      ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/30'
                      : 'text-slate-400 hover:text-white hover:bg-slate-800/40'
                  }`
                }
              >
                <ShoppingBag className="w-4 h-4" />
                <span>Requirements Cart</span>
              </NavLink>

              <NavLink
                to="/student/requests"
                className={({ isActive }) =>
                  `flex items-center justify-between px-3.5 py-2.5 rounded-2xl text-xs font-semibold transition-all ${
                    isActive
                      ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/30'
                      : 'text-slate-400 hover:text-white hover:bg-slate-800/40'
                  }`
                }
              >
                <div className="flex items-center gap-3">
                  <ClipboardList className="w-4 h-4" />
                  <span>My Requests</span>
                </div>
              </NavLink>

              <NavLink
                to="/student/return"
                className={({ isActive }) =>
                  `flex items-center gap-3 px-3.5 py-2.5 rounded-2xl text-xs font-semibold transition-all ${
                    isActive
                      ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/30'
                      : 'text-slate-400 hover:text-white hover:bg-slate-800/40'
                  }`
                }
              >
                <RotateCcw className="w-4 h-4" />
                <span>Return Portal</span>
              </NavLink>

              <NavLink
                to="/student/history"
                className={({ isActive }) =>
                  `flex items-center gap-3 px-3.5 py-2.5 rounded-2xl text-xs font-semibold transition-all ${
                    isActive
                      ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/30'
                      : 'text-slate-400 hover:text-white hover:bg-slate-800/40'
                  }`
                }
              >
                <History className="w-4 h-4" />
                <span>History</span>
              </NavLink>

              {unreadNotifsCount > 0 && (
                <NavLink
                  to="/student/notifications"
                  className={({ isActive }) =>
                    `flex items-center justify-between px-3.5 py-2.5 rounded-2xl text-xs font-semibold transition-all ${
                      isActive
                        ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/30'
                        : 'text-slate-400 hover:text-white hover:bg-slate-800/40'
                    }`
                  }
                >
                  <div className="flex items-center gap-3">
                    <Bell className="w-4 h-4" />
                    <span>Notifications</span>
                  </div>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-indigo-500 text-white">
                    {unreadNotifsCount}
                  </span>
                </NavLink>
              )}

              <NavLink
                to="/student/profile"
                className={({ isActive }) =>
                  `flex items-center gap-3 px-3.5 py-2.5 rounded-2xl text-xs font-semibold transition-all ${
                    isActive
                      ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/30'
                      : 'text-slate-400 hover:text-white hover:bg-slate-800/40'
                  }`
                }
              >
                <User className="w-4 h-4" />
                <span>Profile</span>
              </NavLink>
            </>
          )}

          {/* FACULTY MENU */}
          {role === 'faculty' && (
            <>
              <NavLink
                to="/faculty/dashboard"
                className={({ isActive }) =>
                  `flex items-center gap-3 px-3.5 py-2.5 rounded-2xl text-xs font-semibold transition-all ${
                    isActive
                      ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/30'
                      : 'text-slate-400 hover:text-white hover:bg-slate-800/40'
                  }`
                }
              >
                <LayoutDashboard className="w-4 h-4" />
                <span>Dashboard</span>
              </NavLink>

              <NavLink
                to="/faculty/pending-requests"
                className={({ isActive }) =>
                  `flex items-center justify-between px-3.5 py-2.5 rounded-2xl text-xs font-semibold transition-all ${
                    isActive
                      ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/30'
                      : 'text-slate-400 hover:text-white hover:bg-slate-800/40'
                  }`
                }
              >
                <div className="flex items-center gap-3">
                  <ClipboardList className="w-4 h-4" />
                  <span>Pending Requests</span>
                </div>
                {pendingRequestsCount > 0 && (
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500 text-slate-950">
                    {pendingRequestsCount}
                  </span>
                )}
              </NavLink>

              <NavLink
                to="/faculty/return-approvals"
                className={({ isActive }) =>
                  `flex items-center gap-3 px-3.5 py-2.5 rounded-2xl text-xs font-semibold transition-all ${
                    isActive
                      ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/30'
                      : 'text-slate-400 hover:text-white hover:bg-slate-800/40'
                  }`
                }
              >
                <RotateCcw className="w-4 h-4" />
                <span>Return Approvals</span>
              </NavLink>

              <NavLink
                to="/faculty/approval-history"
                className={({ isActive }) =>
                  `flex items-center gap-3 px-3.5 py-2.5 rounded-2xl text-xs font-semibold transition-all ${
                    isActive
                      ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/30'
                      : 'text-slate-400 hover:text-white hover:bg-slate-800/40'
                  }`
                }
              >
                <History className="w-4 h-4" />
                <span>Approval History</span>
              </NavLink>

              <NavLink
                to="/faculty/inventory"
                className={({ isActive }) =>
                  `flex items-center gap-3 px-3.5 py-2.5 rounded-2xl text-xs font-semibold transition-all ${
                    isActive
                      ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/30'
                      : 'text-slate-400 hover:text-white hover:bg-slate-800/40'
                  }`
                }
              >
                <Boxes className="w-4 h-4" />
                <span>Inventory</span>
              </NavLink>

              <NavLink
                to="/faculty/purchases"
                className={({ isActive }) =>
                  `flex items-center gap-3 px-3.5 py-2.5 rounded-2xl text-xs font-semibold transition-all ${
                    isActive
                      ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/30'
                      : 'text-slate-400 hover:text-white hover:bg-slate-800/40'
                  }`
                }
              >
                <ShoppingBag className="w-4 h-4" />
                <span>Stock Purchases</span>
              </NavLink>

              <NavLink
                to="/faculty/reports"
                className={({ isActive }) =>
                  `flex items-center gap-3 px-3.5 py-2.5 rounded-2xl text-xs font-semibold transition-all ${
                    isActive
                      ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/30'
                      : 'text-slate-400 hover:text-white hover:bg-slate-800/40'
                  }`
                }
              >
                <FileText className="w-4 h-4" />
                <span>Reports</span>
              </NavLink>

              <NavLink
                to="/faculty/activity"
                className={({ isActive }) =>
                  `flex items-center gap-3 px-3.5 py-2.5 rounded-2xl text-xs font-semibold transition-all ${
                    isActive
                      ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/30'
                      : 'text-slate-400 hover:text-white hover:bg-slate-800/40'
                  }`
                }
              >
                <Activity className="w-4 h-4" />
                <span>Activity Log</span>
              </NavLink>

              <NavLink
                to="/faculty/profile"
                className={({ isActive }) =>
                  `flex items-center gap-3 px-3.5 py-2.5 rounded-2xl text-xs font-semibold transition-all ${
                    isActive
                      ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/30'
                      : 'text-slate-400 hover:text-white hover:bg-slate-800/40'
                  }`
                }
              >
                <User className="w-4 h-4" />
                <span>Profile</span>
              </NavLink>
            </>
          )}

          {/* ADMIN MENU */}
          {role === 'admin' && (
            <>
              <NavLink
                to="/admin/dashboard"
                className={({ isActive }) =>
                  `flex items-center gap-3 px-3.5 py-2.5 rounded-2xl text-xs font-semibold transition-all ${
                    isActive
                      ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/30'
                      : 'text-slate-400 hover:text-white hover:bg-slate-800/40'
                  }`
                }
              >
                <LayoutDashboard className="w-4 h-4" />
                <span>Admin Dashboard</span>
              </NavLink>

              <NavLink
                to="/admin/users"
                className={({ isActive }) =>
                  `flex items-center gap-3 px-3.5 py-2.5 rounded-2xl text-xs font-semibold transition-all ${
                    isActive
                      ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/30'
                      : 'text-slate-400 hover:text-white hover:bg-slate-800/40'
                  }`
                }
              >
                <Users className="w-4 h-4" />
                <span>User Management</span>
              </NavLink>

              <NavLink
                to="/admin/inventory"
                className={({ isActive }) =>
                  `flex items-center gap-3 px-3.5 py-2.5 rounded-2xl text-xs font-semibold transition-all ${
                    isActive
                      ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/30'
                      : 'text-slate-400 hover:text-white hover:bg-slate-800/40'
                  }`
                }
              >
                <Boxes className="w-4 h-4" />
                <span>Inventory Management</span>
              </NavLink>

              <NavLink
                to="/admin/purchases"
                className={({ isActive }) =>
                  `flex items-center gap-3 px-3.5 py-2.5 rounded-2xl text-xs font-semibold transition-all ${
                    isActive
                      ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/30'
                      : 'text-slate-400 hover:text-white hover:bg-slate-800/40'
                  }`
                }
              >
                <ShoppingBag className="w-4 h-4" />
                <span>Stock Purchases</span>
              </NavLink>

              <NavLink
                to="/admin/pending-requests"
                className={({ isActive }) =>
                  `flex items-center justify-between px-3.5 py-2.5 rounded-2xl text-xs font-semibold transition-all ${
                    isActive
                      ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/30'
                      : 'text-slate-400 hover:text-white hover:bg-slate-800/40'
                  }`
                }
              >
                <div className="flex items-center gap-3">
                  <ClipboardList className="w-4 h-4" />
                  <span>Pending Requests</span>
                </div>
                {pendingRequestsCount > 0 && (
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500 text-slate-950">
                    {pendingRequestsCount}
                  </span>
                )}
              </NavLink>

              <NavLink
                to="/admin/return-approvals"
                className={({ isActive }) =>
                  `flex items-center gap-3 px-3.5 py-2.5 rounded-2xl text-xs font-semibold transition-all ${
                    isActive
                      ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/30'
                      : 'text-slate-400 hover:text-white hover:bg-slate-800/40'
                  }`
                }
              >
                <RotateCcw className="w-4 h-4" />
                <span>Return Approvals</span>
              </NavLink>

              <NavLink
                to="/admin/approval-history"
                className={({ isActive }) =>
                  `flex items-center gap-3 px-3.5 py-2.5 rounded-2xl text-xs font-semibold transition-all ${
                    isActive
                      ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/30'
                      : 'text-slate-400 hover:text-white hover:bg-slate-800/40'
                  }`
                }
              >
                <History className="w-4 h-4" />
                <span>Approval History</span>
              </NavLink>

              <NavLink
                to="/admin/reports"
                className={({ isActive }) =>
                  `flex items-center gap-3 px-3.5 py-2.5 rounded-2xl text-xs font-semibold transition-all ${
                    isActive
                      ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/30'
                      : 'text-slate-400 hover:text-white hover:bg-slate-800/40'
                  }`
                }
              >
                <FileText className="w-4 h-4" />
                <span>Reports & Analytics</span>
              </NavLink>

              <NavLink
                to="/admin/audit-logs"
                className={({ isActive }) =>
                  `flex items-center gap-3 px-3.5 py-2.5 rounded-2xl text-xs font-semibold transition-all ${
                    isActive
                      ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/30'
                      : 'text-slate-400 hover:text-white hover:bg-slate-800/40'
                  }`
                }
              >
                <ShieldCheck className="w-4 h-4" />
                <span>Audit Logs</span>
              </NavLink>

              <NavLink
                to="/admin/settings"
                className={({ isActive }) =>
                  `flex items-center gap-3 px-3.5 py-2.5 rounded-2xl text-xs font-semibold transition-all ${
                    isActive
                      ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/30'
                      : 'text-slate-400 hover:text-white hover:bg-slate-800/40'
                  }`
                }
              >
                <Settings className="w-4 h-4" />
                <span>System Settings</span>
              </NavLink>

              <NavLink
                to="/admin/profile"
                className={({ isActive }) =>
                  `flex items-center gap-3 px-3.5 py-2.5 rounded-2xl text-xs font-semibold transition-all ${
                    isActive
                      ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/30'
                      : 'text-slate-400 hover:text-white hover:bg-slate-800/40'
                  }`
                }
              >
                <User className="w-4 h-4" />
                <span>Profile</span>
              </NavLink>
            </>
          )}
        </nav>
      </div>

      {/* Logout Action */}
      <div className="pt-4 border-t border-white/10">
        <button
          onClick={() => { onClose?.(); logout(); navigate('/'); }}
          className="w-full flex items-center gap-3 px-3.5 py-2.5 rounded-2xl text-xs font-semibold text-rose-400 hover:bg-rose-500/10 transition-all"
        >
          <LogOut className="w-4 h-4" />
          <span>Logout</span>
        </button>
      </div>
    </aside>
  );
};
