import React, { useState, useEffect } from 'react';
import { mockEngine } from '../../services/mockEngine';
import { ActivityLog } from '../../types';
import { ShieldCheck, Search, Filter, AlertCircle, Info, Lock } from 'lucide-react';

export const AuditLogs: React.FC = () => {
  const [logs, setLogs] = useState<ActivityLog[]>(mockEngine.getLogs());
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    // Sync initial logs on mount
    mockEngine.syncWithTurso().then(() => {
      setLogs(mockEngine.getLogs());
    }).catch(err => console.error('[AuditLogs] Initial sync failed:', err));

    // Subscribe to engine changes to keep React state in sync
    const unsubscribe = mockEngine.subscribe(() => {
      setLogs(mockEngine.getLogs());
    });

    // Poll the Turso database every 1 second (1000ms)
    const interval = setInterval(() => {
      mockEngine.syncWithTurso().catch(err =>
        console.error('[AuditLogs] Periodic sync failed:', err)
      );
    }, 1000);

    return () => {
      unsubscribe();
      clearInterval(interval);
    };
  }, []);

  const filteredLogs = logs.filter(
    (l) =>
      l.action.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (l.user_name && l.user_name.toLowerCase().includes(searchQuery.toLowerCase())) ||
      l.entity_type.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-extrabold text-white tracking-tight">Audit Logs</h1>
        <p className="text-xs text-slate-400 mt-0.5">Immutable audit trail of inventory mutations, role actions, and system events</p>
      </div>

      <div className="p-4 rounded-3xl glass-card border border-white/10 flex items-center gap-3">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Filter audit logs by action, user, or entity..."
            className="w-full pl-10 pr-4 py-2 rounded-2xl glass-input text-xs"
          />
        </div>
      </div>

      <div className="glass-card rounded-3xl border border-white/10 overflow-hidden shadow-glass">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-white/10 bg-slate-900/60 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                <th className="py-3.5 px-6">Timestamp</th>
                <th className="py-3.5 px-6">User</th>
                <th className="py-3.5 px-6">Action</th>
                <th className="py-3.5 px-6">Entity</th>
                <th className="py-3.5 px-6">Details</th>
                <th className="py-3.5 px-6">Severity</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5 text-xs">
              {filteredLogs.map((log) => (
                <tr key={log.id} className="hover:bg-slate-900/40 transition-colors">
                  <td className="py-3.5 px-6 font-mono text-[11px] text-slate-400">
                    {new Date(log.created_at).toLocaleString()}
                  </td>
                  <td className="py-3.5 px-6 font-bold text-white">{log.user_name || 'System User'}</td>
                  <td className="py-3.5 px-6 font-mono font-bold text-indigo-300">{log.action}</td>
                  <td className="py-3.5 px-6 text-slate-300 font-medium">{log.entity_type}</td>
                  <td className="py-3.5 px-6 text-slate-400 max-w-xs truncate">{JSON.stringify(log.details || {})}</td>
                  <td className="py-3.5 px-6">
                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                      log.severity === 'critical' ? 'bg-rose-500/20 text-rose-300' : 'bg-indigo-500/20 text-indigo-300'
                    }`}>
                      {log.severity}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
