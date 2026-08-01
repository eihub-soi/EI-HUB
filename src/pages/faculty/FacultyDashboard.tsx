import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { mockEngine } from '../../services/mockEngine';
import { StatCard } from '../../components/common/StatCard';
import { BorrowRequest } from '../../types';
import { toast } from 'sonner';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  Tooltip, 
  ResponsiveContainer, 
  PieChart, 
  Pie, 
  Cell 
} from 'recharts';
import { 
  Clock, 
  RotateCcw, 
  Boxes, 
  AlertTriangle, 
  Check, 
  X, 
  ArrowRight, 
  Sparkles 
} from 'lucide-react';

const requestsOverviewData = [
  { day: 'May 21', pending: 6, approved: 12, rejected: 2 },
  { day: 'May 22', pending: 8, approved: 15, rejected: 1 },
  { day: 'May 23', pending: 4, approved: 18, rejected: 3 },
  { day: 'May 24', pending: 10, approved: 22, rejected: 2 },
  { day: 'May 25', pending: 7, approved: 19, rejected: 1 },
  { day: 'May 26', pending: 5, approved: 25, rejected: 4 },
  { day: 'May 27', pending: 9, approved: 20, rejected: 2 },
];

const topComponentsData = [
  { name: 'Arduino Uno R3', value: 35, color: '#6366F1' },
  { name: 'ESP32 Dev Module', value: 25, color: '#10B981' },
  { name: 'Ultrasonic Sensor', value: 20, color: '#F59E0B' },
  { name: 'Jumper Wires', value: 10, color: '#3B82F6' },
  { name: 'Others', value: 10, color: '#EC4899' },
];

export const FacultyDashboard: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [requests, setRequests] = useState<BorrowRequest[]>(mockEngine.getRequests());
  const pendingRequests = requests.filter((r) => r.status === 'pending');

  const stats = mockEngine.getSystemStats();
  const components = mockEngine.getComponents();
  const totalCategories = new Set(components.map((c) => c.category)).size;

  const handleApprove = (reqId: string) => {
    const remark = prompt('Enter approval remark/notes (optional):', 'Approved for project use');
    if (remark === null) return;
    try {
      mockEngine.approveBorrowRequest(reqId, user?.id || 'usr-faculty-1', remark);
      toast.success('Request approved successfully!');
      setRequests(mockEngine.getRequests());
    } catch (err: any) {
      toast.error(err.message || 'Failed to approve request');
    }
  };

  const handleReject = (reqId: string) => {
    const reason = prompt('Enter rejection reason for student:', 'Stock allocated for advanced lab session');
    if (reason !== null) {
      try {
        mockEngine.rejectBorrowRequest(reqId, user?.id || 'usr-faculty-1', reason);
        toast.success('Request rejected.');
        setRequests(mockEngine.getRequests());
      } catch (err: any) {
        toast.error(err.message || 'Failed to reject request');
      }
    }
  };

  return (
    <div className="space-y-6">
      
      {/* Faculty Welcome Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-6 rounded-3xl glass-card border border-white/10">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-extrabold text-white tracking-tight">Faculty Dashboard</h1>
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
              Executive Mode
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-1">Review student component requests, inventory levels, and return queues.</p>
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
          title="Pending Requests"
          value={pendingRequests.length}
          subtitle="Approval queue"
          icon={Clock}
          colorVariant="amber"
        />
        <StatCard
          title="Return Requests"
          value={stats.pendingReturnsCount}
          subtitle="Awaiting inspection"
          icon={RotateCcw}
          colorVariant="indigo"
        />
        <StatCard
          title="Active Loans"
          value={stats.activeLoansCount}
          subtitle="Issued to students"
          icon={Boxes}
          colorVariant="emerald"
        />
        <StatCard
          title="Low Stock Items"
          value={stats.lowStockItemsCount}
          subtitle="Restock required"
          icon={AlertTriangle}
          colorVariant="rose"
        />
      </div>

      {/* Analytics Charts Grid matching preview UI */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Requests Overview Bar Chart */}
        <div className="lg:col-span-2 p-6 rounded-3xl glass-card border border-white/10 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-white">Requests Overview</h3>
              <p className="text-[11px] text-slate-400">Daily breakdown of student requests by status</p>
            </div>
            <div className="flex items-center gap-3 text-[10px] font-bold">
              <span className="flex items-center gap-1 text-amber-400"><span className="w-2 h-2 rounded-full bg-amber-400" /> Pending</span>
              <span className="flex items-center gap-1 text-emerald-400"><span className="w-2 h-2 rounded-full bg-emerald-400" /> Approved</span>
              <span className="flex items-center gap-1 text-rose-400"><span className="w-2 h-2 rounded-full bg-rose-400" /> Rejected</span>
            </div>
          </div>

          <div className="h-64 w-full pt-4">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={requestsOverviewData}>
                <XAxis dataKey="day" stroke="#64748B" fontSize={11} tickLine={false} />
                <YAxis stroke="#64748B" fontSize={11} tickLine={false} />
                <Tooltip
                  contentStyle={{ backgroundColor: '#0B132B', borderColor: 'rgba(255,255,255,0.1)', borderRadius: '12px', fontSize: '12px', color: '#FFF' }}
                />
                <Bar dataKey="pending" fill="#F59E0B" radius={[4, 4, 0, 0]} />
                <Bar dataKey="approved" fill="#10B981" radius={[4, 4, 0, 0]} />
                <Bar dataKey="rejected" fill="#EF4444" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Top Requested Components Pie Chart */}
        <div className="p-6 rounded-3xl glass-card border border-white/10 space-y-4">
          <div>
            <h3 className="text-sm font-bold text-white">Top Requested Components</h3>
            <p className="text-[11px] text-slate-400">Distribution by hardware type</p>
          </div>

          <div className="h-48 w-full flex items-center justify-center">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={topComponentsData}
                  cx="50%"
                  cy="50%"
                  innerRadius={50}
                  outerRadius={75}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {topComponentsData.map((entry, index) => (
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
            {topComponentsData.map((c) => (
              <div key={c.name} className="flex items-center justify-between text-[11px]">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: c.color }} />
                  <span className="text-slate-300 font-medium">{c.name}</span>
                </div>
                <span className="font-bold text-white">{c.value}%</span>
              </div>
            ))}
          </div>
        </div>

      </div>

    </div>
  );
};
