import React, { useState } from 'react';
import { mockEngine } from '../../services/mockEngine';
import { useAuth } from '../../contexts/AuthContext';
import { NotificationItem } from '../../types';
import { toast } from 'sonner';
import { 
  Bell, 
  CheckCircle2, 
  AlertTriangle, 
  Info, 
  Check, 
  Search, 
  Filter 
} from 'lucide-react';

export const StudentNotifications: React.FC = () => {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState<NotificationItem[]>(
    user ? mockEngine.getNotifications(user.id) : []
  );
  const [filter, setFilter] = useState<'All' | 'Unread'>('All');

  const filteredNotifs = notifications.filter(
    (n) => filter === 'All' || !n.is_read
  );

  const handleMarkAsRead = (id: string) => {
    mockEngine.markNotificationAsRead(id);
    if (user) {
      setNotifications(mockEngine.getNotifications(user.id));
    }
    toast.success('Notification marked as read');
  };

  const handleMarkAllRead = () => {
    notifications.forEach((n) => mockEngine.markNotificationAsRead(n.id));
    if (user) {
      setNotifications(mockEngine.getNotifications(user.id));
    }
    toast.success('All notifications marked as read');
  };

  return (
    <div className="space-y-6 max-w-4xl">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-white tracking-tight">Notifications</h1>
          <p className="text-xs text-slate-400 mt-0.5">Stay updated on your request approvals, return confirmations, and lab alerts</p>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1 bg-slate-900/60 p-1 rounded-2xl border border-white/10">
            <button
              onClick={() => setFilter('All')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                filter === 'All'
                  ? 'bg-indigo-600 text-white shadow-md'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              All ({notifications.length})
            </button>
            <button
              onClick={() => setFilter('Unread')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                filter === 'Unread'
                  ? 'bg-indigo-600 text-white shadow-md'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Unread ({notifications.filter((n) => !n.is_read).length})
            </button>
          </div>

          <button
            onClick={handleMarkAllRead}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-2xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white text-xs font-semibold border border-white/10 transition-all"
          >
            <Check className="w-4 h-4 text-emerald-400" /> Mark all as read
          </button>
        </div>
      </div>

      {/* Notifications List */}
      <div className="space-y-3">
        {filteredNotifs.length === 0 ? (
          <div className="p-12 text-center glass-card rounded-3xl border border-white/10 space-y-2">
            <Bell className="w-10 h-10 text-slate-500 mx-auto" />
            <h3 className="text-sm font-bold text-white">No Notifications</h3>
            <p className="text-xs text-slate-400">You are all caught up!</p>
          </div>
        ) : (
          filteredNotifs.map((n) => (
            <div
              key={n.id}
              className={`p-4 rounded-3xl border transition-all flex items-start justify-between gap-4 ${
                n.is_read
                  ? 'glass-card opacity-60 border-white/5'
                  : 'glass-card border-indigo-500/30 bg-indigo-950/20 shadow-glass-sm'
              }`}
            >
              <div className="flex items-start gap-3.5">
                <div className="mt-0.5">
                  {n.type === 'success' && (
                    <div className="w-9 h-9 rounded-2xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center border border-emerald-500/30">
                      <CheckCircle2 className="w-5 h-5" />
                    </div>
                  )}
                  {n.type === 'warning' && (
                    <div className="w-9 h-9 rounded-2xl bg-amber-500/20 text-amber-400 flex items-center justify-center border border-amber-500/30">
                      <AlertTriangle className="w-5 h-5" />
                    </div>
                  )}
                  {n.type === 'info' && (
                    <div className="w-9 h-9 rounded-2xl bg-indigo-500/20 text-indigo-400 flex items-center justify-center border border-indigo-500/30">
                      <Info className="w-5 h-5" />
                    </div>
                  )}
                </div>

                <div>
                  <h4 className="text-sm font-bold text-white">{n.title}</h4>
                  <p className="text-xs text-slate-300 mt-0.5 leading-relaxed">{n.message}</p>
                  <span className="text-[10px] text-slate-500 block mt-2 font-mono">
                    {new Date(n.created_at).toLocaleString()}
                  </span>
                </div>
              </div>

              {!n.is_read && (
                <button
                  onClick={() => handleMarkAsRead(n.id)}
                  className="px-3 py-1.5 rounded-xl bg-indigo-600/30 hover:bg-indigo-600 text-indigo-300 hover:text-white font-semibold text-xs border border-indigo-500/30 shrink-0 transition-all"
                >
                  Mark as read
                </button>
              )}
            </div>
          ))
        )}
      </div>

    </div>
  );
};
