import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { formatTimeOnly } from '../../utils/timestamp';
import { mockEngine } from '../../services/mockEngine';
import { StatCard } from '../../components/common/StatCard';
import { 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  Tooltip, 
  ResponsiveContainer, 
  PieChart, 
  Pie, 
  Cell 
} from 'recharts';
import { 
  Users, 
  GraduationCap, 
  Briefcase, 
  Shield, 
  Activity, 
  Boxes, 
  ArrowRight, 
  CheckCircle2, 
  Clock, 
  PlusCircle 
} from 'lucide-react';

const systemOverviewData = [
  { day: 'May 21', users: 1120, requests: 45 },
  { day: 'May 22', users: 1150, requests: 62 },
  { day: 'May 23', users: 1180, requests: 58 },
  { day: 'May 24', users: 1210, requests: 85 },
  { day: 'May 25', users: 1230, requests: 70 },
  { day: 'May 26', users: 1245, requests: 92 },
  { day: 'May 27', users: 1256, requests: 88 },
];

export const AdminDashboard: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  const stats = mockEngine.getSystemStats();
  const logs = mockEngine.getLogs();
  const components = mockEngine.getComponents();
  const totalCategories = new Set(components.map((c) => c.category)).size;

  const inventorySummaryDonut = [
    { name: 'Available', value: stats.availableStock, color: '#10B981' },
    { name: 'Borrowed', value: stats.borrowedStock, color: '#6366F1' },
    { name: 'Low Stock', value: stats.lowStockItemsCount, color: '#F59E0B' },
    { name: 'Out of Stock', value: stats.outOfStockItemsCount, color: '#EF4444' },
  ];

  return (
    <div className="space-y-6">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-6 rounded-3xl glass-card border border-white/10">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-extrabold text-white tracking-tight">Admin Dashboard</h1>
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold bg-amber-500/20 text-gold-300 border border-gold-500/30">
              System Admin Console
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-1">Master system health, user permissions, audit trail, and global inventory analytics.</p>
        </div>
      </div>

      {/* Stock Metrics Panel */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        <div className="p-4 rounded-2xl bg-slate-900/60 border border-white/10 text-center space-y-1">
          <p className="text-[10px] text-slate-400 font-bold uppercase">Total Categories</p>
          <h4 className="text-xl font-extrabold text-white">{totalCategories}</h4>
        </div>

        <div className="p-4 rounded-2xl bg-slate-900/60 border border-white/10 text-center space-y-1">
          <p className="text-[10px] text-slate-400 font-bold uppercase">Total Components</p>
          <h4 className="text-xl font-extrabold text-white">{stats.totalComponents}</h4>
        </div>

        <div className="p-4 rounded-2xl bg-slate-900/60 border border-white/10 text-center space-y-1">
          <p className="text-[10px] text-slate-400 font-bold uppercase">Available Stock</p>
          <h4 className="text-xl font-extrabold text-emerald-400">{stats.availableStock}</h4>
        </div>

        <div className="p-4 rounded-2xl bg-slate-900/60 border border-white/10 text-center space-y-1">
          <p className="text-[10px] text-slate-400 font-bold uppercase">Borrowed Stock</p>
          <h4 className="text-xl font-extrabold text-indigo-400">{stats.borrowedStock}</h4>
        </div>

        <div className="p-4 rounded-2xl bg-slate-900/60 border border-white/10 text-center space-y-1">
          <p className="text-[10px] text-slate-400 font-bold uppercase">Low Stock Items</p>
          <h4 className="text-xl font-extrabold text-amber-400">{stats.lowStockItemsCount}</h4>
        </div>

        <div className="p-4 rounded-2xl bg-slate-900/60 border border-white/10 text-center space-y-1">
          <p className="text-[10px] text-slate-400 font-bold uppercase">Out of Stock Items</p>
          <h4 className="text-xl font-extrabold text-rose-400">{stats.outOfStockItemsCount}</h4>
        </div>
      </div>

      {/* KPI Cards Grid matching reference UI preview */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Total Users"
          value={stats.totalUsers}
          subtitle="Registered accounts"
          icon={Users}
          colorVariant="indigo"
        />
        <StatCard
          title="Students"
          value={stats.totalStudents}
          subtitle="Active student access"
          icon={GraduationCap}
          colorVariant="emerald"
        />
        <StatCard
          title="Faculty"
          value={stats.totalFaculty}
          subtitle="Approved lab supervisors"
          icon={Briefcase}
          colorVariant="amber"
        />
        <StatCard
          title="Admins"
          value={stats.totalAdmins}
          subtitle="Full access administrators"
          icon={Shield}
          colorVariant="gold"
        />
      </div>

      {/* Main Charts Section matching reference preview UI */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* System Overview Multi-Line Chart */}
        <div className="lg:col-span-2 p-6 rounded-3xl glass-card border border-white/10 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-white">System Overview</h3>
              <p className="text-[11px] text-slate-400">Total active users & component requests growth</p>
            </div>
            <div className="flex items-center gap-3 text-[10px] font-bold">
              <span className="flex items-center gap-1 text-indigo-400"><span className="w-2 h-2 rounded-full bg-indigo-500" /> Users</span>
              <span className="flex items-center gap-1 text-gold-400"><span className="w-2 h-2 rounded-full bg-gold-400" /> Requests</span>
            </div>
          </div>

          <div className="h-64 w-full pt-4">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={systemOverviewData}>
                <XAxis dataKey="day" stroke="#64748B" fontSize={11} tickLine={false} />
                <YAxis stroke="#64748B" fontSize={11} tickLine={false} />
                <Tooltip
                  contentStyle={{ backgroundColor: '#0B132B', borderColor: 'rgba(255,255,255,0.1)', borderRadius: '12px', fontSize: '12px', color: '#FFF' }}
                />
                <Line type="monotone" dataKey="users" stroke="#6366F1" strokeWidth={3} dot={{ r: 4 }} />
                <Line type="monotone" dataKey="requests" stroke="#D4AF37" strokeWidth={3} dot={{ r: 4 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Inventory Summary Donut Chart */}
        <div className="p-6 rounded-3xl glass-card border border-white/10 space-y-4">
          <div>
            <h3 className="text-sm font-bold text-white">Inventory Summary</h3>
            <p className="text-[11px] text-slate-400">Stock health status distribution</p>
          </div>

          <div className="h-44 w-full flex items-center justify-center">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={inventorySummaryDonut}
                  cx="50%"
                  cy="50%"
                  innerRadius={45}
                  outerRadius={70}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {inventorySummaryDonut.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{ backgroundColor: '#0B132B', borderColor: 'rgba(255,255,255,0.1)', borderRadius: '12px', fontSize: '12px', color: '#FFF' }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>

          <div className="space-y-1.5 text-xs pt-2">
            <div className="flex items-center justify-between text-[11px] text-slate-300">
              <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-emerald-500" /> Total Components</span>
              <span className="font-bold text-white">{stats.totalComponents}</span>
            </div>
            <div className="flex items-center justify-between text-[11px] text-slate-300">
              <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-emerald-400" /> Available</span>
              <span className="font-bold text-emerald-400">{stats.availableStock}</span>
            </div>
            <div className="flex items-center justify-between text-[11px] text-slate-300">
              <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-indigo-500" /> Borrowed</span>
              <span className="font-bold text-indigo-300">{stats.borrowedStock}</span>
            </div>
            <div className="flex items-center justify-between text-[11px] text-slate-300">
              <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-amber-500" /> Low Stock</span>
              <span className="font-bold text-amber-400">{stats.lowStockItemsCount}</span>
            </div>
            <div className="flex items-center justify-between text-[11px] text-slate-300">
              <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-rose-500" /> Out of Stock</span>
              <span className="font-bold text-rose-400">{stats.outOfStockItemsCount}</span>
            </div>
          </div>
        </div>

      </div>

      {/* Recent Activities Timeline Feed matching preview UI */}
      <div className="p-6 rounded-3xl glass-card border border-white/10 space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <Activity className="w-4 h-4 text-indigo-400" /> Recent Activities
            </h3>
            <p className="text-[11px] text-slate-400">Realtime audit events log across the institution</p>
          </div>
          <button
            onClick={() => navigate('/admin/audit-logs')}
            className="text-xs font-bold text-indigo-400 hover:text-indigo-300 flex items-center gap-1"
          >
            View all activities <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="space-y-3 pt-2">
          {logs.slice(0, 4).map((log) => (
            <div key={log.id} className="p-3.5 rounded-2xl bg-slate-900/40 border border-white/5 flex items-center justify-between text-xs">
              <div className="flex items-center gap-3">
                <div className="w-2 h-2 rounded-full bg-indigo-500" />
                <div>
                  <p className="font-semibold text-white">
                    <span className="text-indigo-300 font-bold">{log.user_name || 'System User'}</span> {log.action.replace('_', ' ').toLowerCase()} ({JSON.stringify(log.details || {})})
                  </p>
                  <p className="text-[10px] text-slate-500 mt-0.5">IP: {log.ip_address || '192.168.1.100'} • Severity: {log.severity}</p>
                </div>
              </div>
              <span className="text-[10px] text-slate-400 font-mono">
                {formatTimeOnly(log.created_at)}
              </span>
            </div>
          ))}
        </div>
      </div>

    </div>
  );
};
