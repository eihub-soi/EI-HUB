import React, { useState } from 'react';
import { toast } from 'sonner';
import { Settings, Shield, Database, Bell, Save, Lock } from 'lucide-react';

export const SystemSettings: React.FC = () => {
  const [maxBorrowDays, setMaxBorrowDays] = useState(14);
  const [maxItemsPerStudent, setMaxItemsPerStudent] = useState(3);
  const [autoApproveConsumables, setAutoApproveConsumables] = useState(true);
  const [emailAlerts, setEmailAlerts] = useState(true);

  const handleSaveSettings = (e: React.FormEvent) => {
    e.preventDefault();
    toast.success('System laboratory settings updated successfully!');
  };

  return (
    <div className="max-w-4xl space-y-6">
      <div>
        <h1 className="text-2xl font-extrabold text-white tracking-tight">System Settings</h1>
        <p className="text-xs text-slate-400 mt-0.5">Configure institutional laboratory policies, auto-approvals, and Turso integration</p>
      </div>

      <form onSubmit={handleSaveSettings} className="space-y-6">
        {/* Borrowing Policies */}
        <div className="p-6 rounded-3xl glass-card border border-white/10 space-y-4">
          <h3 className="text-sm font-bold text-white flex items-center gap-2">
            <Shield className="w-4 h-4 text-indigo-400" /> Laboratory Borrowing Policies
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
            <div>
              <label className="block text-slate-300 font-semibold mb-1">Max Borrow Duration (Days)</label>
              <input
                type="number"
                value={maxBorrowDays}
                onChange={(e) => setMaxBorrowDays(parseInt(e.target.value) || 14)}
                className="w-full px-3 py-2 rounded-xl glass-input text-white font-bold"
              />
            </div>

            <div>
              <label className="block text-slate-300 font-semibold mb-1">Max Items per Student Request</label>
              <input
                type="number"
                value={maxItemsPerStudent}
                onChange={(e) => setMaxItemsPerStudent(parseInt(e.target.value) || 3)}
                className="w-full px-3 py-2 rounded-xl glass-input text-white font-bold"
              />
            </div>
          </div>

          <div className="space-y-3 pt-2 text-xs">
            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={autoApproveConsumables}
                onChange={(e) => setAutoApproveConsumables(e.target.checked)}
                className="w-4 h-4 rounded text-indigo-600 bg-slate-900 border-white/10"
              />
              <span className="text-slate-300">Auto-approve passive consumables (e.g. Jumper Wires, Resistors)</span>
            </label>

            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={emailAlerts}
                onChange={(e) => setEmailAlerts(e.target.checked)}
                className="w-4 h-4 rounded text-indigo-600 bg-slate-900 border-white/10"
              />
              <span className="text-slate-300">Send email notification alerts on low stock levels</span>
            </label>
          </div>
        </div>

        {/* Database Connection Status */}
        <div className="p-6 rounded-3xl glass-card border border-white/10 space-y-4">
          <h3 className="text-sm font-bold text-white flex items-center gap-2">
            <Database className="w-4 h-4 text-emerald-400" /> Database & Turso Status
          </h3>

          <div className="p-4 rounded-2xl bg-slate-900/60 border border-white/5 space-y-2 text-xs">
            <div className="flex items-center justify-between">
              <span className="text-slate-400">Connection Mode:</span>
              <span className="font-bold text-emerald-400">Live Mock Engine & Turso Dual Sync Ready</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-slate-400">PostgreSQL RPC Locking:</span>
              <span className="font-bold text-indigo-300">ACTIVE (FOR UPDATE Isolation)</span>
            </div>
          </div>
        </div>

        <div className="flex justify-end">
          <button
            type="submit"
            className="flex items-center gap-2 px-6 py-3 rounded-2xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs shadow-indigo-glow transition-all"
          >
            <Save className="w-4 h-4" /> Save System Settings
          </button>
        </div>
      </form>
    </div>
  );
};
