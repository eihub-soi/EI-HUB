import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { UserRole } from '../../types';
import { mockEngine } from '../../services/mockEngine';
import { Avatar } from './Avatar';
import { 
  Bell, 
  Search, 
  User, 
  LogOut, 
  Shield, 
  GraduationCap, 
  Briefcase, 
  Sparkles,
  CheckCircle2,
  AlertTriangle,
  Info,
  Menu
} from 'lucide-react';

interface NavbarProps {
  onOpenSearch: () => void;
  onToggleSidebar: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({ onOpenSearch, onToggleSidebar }) => {
  const { user, role, switchRole, logout } = useAuth();
  const navigate = useNavigate();
  const [showNotifications, setShowNotifications] = useState(false);
  const [showProfileMenu, setShowProfileMenu] = useState(false);

  const notifications = user ? mockEngine.getNotifications(user.id) : [];
  const unreadCount = notifications.filter((n) => !n.is_read).length;

  return (
    <header className="sticky top-0 z-40 w-full glass-panel border-b border-white/10 px-4 lg:px-8 py-3 transition-all duration-300">
      <div className="flex items-center justify-between gap-4">
        
        <div className="flex items-center gap-3">
          {/* Hamburger Menu Toggle Button */}
          <button
            onClick={onToggleSidebar}
            className="p-2 rounded-xl bg-slate-900/60 border border-white/10 hover:border-indigo-500/40 text-slate-300 hover:text-white transition-all flex items-center justify-center shrink-0"
            title="Toggle Menu"
          >
            <Menu className="w-5 h-5" />
          </button>

          {/* Brand Title (Mobile/Top Bar) */}
          <div className="flex items-center gap-3 cursor-pointer" onClick={() => navigate('/')}>
            <img
              src="/logo.png"
              alt="EI HUB Logo"
              className="w-10 h-10 rounded-2xl object-contain ring-2 ring-indigo-500/40 shadow-indigo-glow bg-slate-950 p-0.5"
            />
          <div>
            <div className="flex items-center gap-2">
              <span className="font-extrabold text-lg tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-white via-slate-100 to-indigo-200">
                EI HUB
              </span>
              <span className="hidden sm:inline-block px-2 py-0.5 rounded-full text-[10px] font-semibold bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                Innovation SOI
              </span>
            </div>
            <p className="text-[9px] font-extrabold text-indigo-400 uppercase tracking-widest leading-none mt-0.5 hidden sm:block">Innovate • Invent • Inspire</p>
            <p className="text-[10px] text-slate-450 mt-0.5 hidden sm:block">KGISL Institute of Technology</p>
          </div>
        </div>
      </div>

        {/* Global Search Quick Trigger */}
        <button
          onClick={onOpenSearch}
          className="hidden md:flex items-center gap-3 px-4 py-2 rounded-2xl bg-slate-900/60 border border-white/10 text-slate-400 hover:text-white hover:border-indigo-500/40 transition-all text-xs w-64 lg:w-96 shadow-inner"
        >
          <Search className="w-4 h-4 text-slate-400" />
          <span className="flex-1 text-left">Search components, requests...</span>
          <kbd className="px-2 py-0.5 rounded bg-slate-800 text-[10px] text-slate-300 border border-white/10">⌘K</kbd>
        </button>

        {/* Right Section: Role Quick Switcher, Notifications, User Menu */}
        <div className="flex items-center gap-3">
          
          {/* Active Role Badge (Strict Isolated Role Display) */}
          <div className="flex items-center gap-2 px-2.5 py-1.5 sm:px-3 rounded-2xl bg-slate-900/80 border border-white/10 text-xs font-bold shrink-0">
            {role === 'student' && (
              <span className="flex items-center gap-1.5 text-indigo-300">
                <GraduationCap className="w-4 h-4 text-indigo-400" />
                <span className="hidden sm:inline">Student Portal</span>
              </span>
            )}
            {role === 'faculty' && (
              <span className="flex items-center gap-1.5 text-emerald-300">
                <Briefcase className="w-4 h-4 text-emerald-400" />
                <span className="hidden sm:inline">Faculty Portal</span>
              </span>
            )}
            {role === 'admin' && (
              <span className="flex items-center gap-1.5 text-gold-300">
                <Shield className="w-4 h-4 text-gold-400" />
                <span className="hidden sm:inline">Admin Console</span>
              </span>
            )}
          </div>

          {/* Notifications Drawer Toggle */}
          {unreadCount > 0 && (
            <div className="relative">
              <button
                onClick={() => setShowNotifications(!showNotifications)}
                className="relative p-2.5 rounded-2xl bg-slate-900/60 border border-white/10 hover:border-indigo-500/40 text-slate-300 hover:text-white transition-all"
              >
                <Bell className="w-4 h-4" />
                <span className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-rose-500 text-white text-[10px] font-bold flex items-center justify-center animate-pulse">
                  {unreadCount}
                </span>
              </button>

              {/* Notifications Dropdown Panel */}
              {showNotifications && (
                <div className="absolute right-0 mt-3 w-80 sm:w-96 glass-card p-4 shadow-glass z-50 animate-in fade-in slide-in-from-top-2 duration-200">
                  <div className="flex items-center justify-between pb-3 border-b border-white/10">
                    <h4 className="font-semibold text-sm text-white flex items-center gap-2">
                      <Bell className="w-4 h-4 text-indigo-400" /> Notifications
                    </h4>
                    <span className="text-[11px] text-slate-400">{notifications.length} Total</span>
                  </div>
                  <div className="mt-3 space-y-2.5 max-h-80 overflow-y-auto pr-1">
                    {notifications.length === 0 ? (
                      <p className="text-xs text-slate-400 text-center py-6">No notifications</p>
                    ) : (
                      notifications.map((n) => (
                        <div
                          key={n.id}
                          onClick={() => mockEngine.markNotificationAsRead(n.id)}
                          className={`p-3 rounded-xl border text-xs cursor-pointer transition-all ${
                            n.is_read
                              ? 'bg-slate-900/30 border-white/5 opacity-70'
                              : 'bg-indigo-950/40 border-indigo-500/30 hover:border-indigo-500/50'
                          }`}
                        >
                          <div className="flex items-start gap-2.5">
                            {n.type === 'success' && <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />}
                            {n.type === 'warning' && <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />}
                            {n.type === 'info' && <Info className="w-4 h-4 text-indigo-400 shrink-0 mt-0.5" />}
                            <div>
                              <p className="font-semibold text-slate-200">{n.title}</p>
                              <p className="text-slate-400 text-[11px] mt-0.5">{n.message}</p>
                              <span className="text-[10px] text-slate-500 block mt-1">
                                {new Date(n.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                              </span>
                            </div>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* User Profile Dropdown */}
          <div className="relative">
            <button
              onClick={() => setShowProfileMenu(!showProfileMenu)}
              className="flex items-center gap-2 p-1.5 rounded-2xl bg-slate-900/60 border border-white/10 hover:border-indigo-500/40 transition-all"
            >
              <Avatar
                user={user}
                size="sm"
                className="ring-2 ring-indigo-500/30"
                alt={user?.full_name}
              />
              <span className="text-xs font-semibold text-slate-200 hidden lg:inline">{user?.full_name}</span>
            </button>

            {showProfileMenu && (
              <div className="absolute right-0 mt-3 w-60 glass-card p-3 shadow-glass z-50">
                <div className="p-2 border-b border-white/10 mb-2">
                  <p className="text-xs font-bold text-white">{user?.full_name}</p>
                  <p className="text-[11px] text-slate-400">{user?.email}</p>
                  <span className="mt-1.5 inline-block px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wide bg-indigo-500/20 text-indigo-300">
                    {user?.role} Mode
                  </span>
                </div>
                <button
                  onClick={() => { logout(); navigate('/'); }}
                  className="w-full flex items-center gap-2 px-3 py-2 text-xs text-rose-400 hover:bg-rose-500/10 rounded-xl transition-all"
                >
                  <LogOut className="w-3.5 h-3.5" /> Sign Out
                </button>
              </div>
            )}
          </div>

        </div>
      </div>
    </header>
  );
};
