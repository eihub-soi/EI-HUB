import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { formatTimeOnly, parseUTCDate } from '../../utils/timestamp';
import { mockEngine } from '../../services/mockEngine';
import { StatCard } from '../../components/common/StatCard';
import { generateStudentReceiptPdf } from '../../utils/pdfGenerator';
import { toast } from 'sonner';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import { 
  Boxes, 
  Clock, 
  CheckCircle2, 
  RotateCcw, 
  Bell, 
  ArrowRight, 
  Download, 
  PlusCircle, 
  AlertCircle,
  Sparkles,
  Search,
  Info
} from 'lucide-react';

const chartData = [
  { day: 'May 01', borrowings: 12 },
  { day: 'May 07', borrowings: 19 },
  { day: 'May 14', borrowings: 35 },
  { day: 'May 21', borrowings: 22 },
  { day: 'May 28', borrowings: 28 },
  { day: 'May 31', borrowings: 40 },
];

export const StudentDashboard: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  const requests = mockEngine.getRequests().filter((r) => r.student_id === user?.id || r.student_id === 'usr-student-1');
  const rawNotifications = user ? mockEngine.getNotifications(user.id) : [];
  const notifications = [...rawNotifications].sort((a, b) => {
    return parseUTCDate(b.created_at).getTime() - parseUTCDate(a.created_at).getTime();
  });

  const borrowedCount = requests.filter((r) => r.status === 'approved' && !r.return_requested_at).length;
  const pendingCount = requests.filter((r) => r.status === 'pending').length;
  const approvedCount = requests.filter((r) => r.status === 'approved').length;
  const returnPendingCount = requests.filter((r) => r.return_requested_at && r.status !== 'returned').length;

  const handleDownloadLatestReceipt = async () => {
    const approvedReq = requests.find((r) => r.status === 'approved') || requests[0];
    if (approvedReq) {
      toast.info('Generating official PDF receipt...');
      try {
        await generateStudentReceiptPdf(approvedReq);
        toast.success('Receipt downloaded successfully.');
      } catch (err) {
        console.error(err);
        toast.error('Failed to generate PDF receipt.');
      }
    } else {
      toast.error('No borrow requests found to download receipt.');
    }
  };

  return (
    <div className="space-y-6">
      
      {/* Welcome Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-6 rounded-3xl glass-card border border-white/10 bg-gradient-to-r from-slate-900/90 via-indigo-950/40 to-slate-900/90">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-extrabold text-white tracking-tight">
              Welcome back, {user?.full_name || 'Aravind R'}! 👋
            </h1>
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
              Student Mode
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-1">Here's what's happening in your lab workspace today.</p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate('/student/browse')}
            className="flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold shadow-indigo-glow transition-all hover:scale-105"
          >
            <PlusCircle className="w-4 h-4" />
            <span>Request Component</span>
          </button>
        </div>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Borrowed Items"
          value={borrowedCount}
          subtitle="Currently borrowed"
          icon={Boxes}
          colorVariant="indigo"
        />
        <StatCard
          title="Pending Requests"
          value={pendingCount}
          subtitle="Awaiting approval"
          icon={Clock}
          colorVariant="amber"
        />
        <StatCard
          title="Approved Requests"
          value={approvedCount}
          subtitle="Approved by faculty"
          icon={CheckCircle2}
          colorVariant="emerald"
        />
        <StatCard
          title="Return Pending"
          value={returnPendingCount}
          subtitle="Awaiting return"
          icon={RotateCcw}
          colorVariant="rose"
        />
      </div>

      {/* Main Grid: Borrowing Chart & Notifications */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Borrowing Overview Chart */}
        <div className="lg:col-span-2 p-6 rounded-3xl glass-card border border-white/10 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-white">Borrowing Overview (This Month)</h3>
              <p className="text-[11px] text-slate-400">Total component transactions activity</p>
            </div>
            <span className="text-[11px] text-slate-400 font-medium">May 01 - May 31</span>
          </div>

          <div className="h-64 w-full pt-4">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData}>
                <defs>
                  <linearGradient id="colorBorrow" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#6366F1" stopOpacity={0.4} />
                    <stop offset="95%" stopColor="#6366F1" stopOpacity={0.0} />
                  </linearGradient>
                </defs>
                <XAxis dataKey="day" stroke="#64748B" fontSize={11} tickLine={false} />
                <YAxis stroke="#64748B" fontSize={11} tickLine={false} />
                <Tooltip
                  contentStyle={{ backgroundColor: '#0B132B', borderColor: 'rgba(255,255,255,0.1)', borderRadius: '12px', fontSize: '12px', color: '#FFF' }}
                />
                <Area type="monotone" dataKey="borrowings" stroke="#6366F1" strokeWidth={3} fillOpacity={1} fill="url(#colorBorrow)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Recent Notifications List */}
        <div className="p-6 rounded-3xl glass-card border border-white/10 space-y-4">
          <div className="flex items-center justify-between pb-2 border-b border-white/10">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <Bell className="w-4 h-4 text-indigo-400" /> Recent Notifications
            </h3>
            <button onClick={() => navigate('/student/notifications')} className="text-[11px] text-indigo-400 hover:text-indigo-300 font-semibold">
              View All
            </button>
          </div>

          <div className="space-y-3">
            {notifications.length === 0 ? (
              <p className="text-xs text-slate-400 text-center py-6">No recent notifications</p>
            ) : (
              notifications.slice(0, 3).map((n) => {
                let borderClass = 'border-indigo-500/20';
                let textClass = 'text-indigo-400';
                let Icon = Info;
                if (n.type === 'success') {
                  borderClass = 'border-emerald-500/20';
                  textClass = 'text-emerald-400';
                  Icon = CheckCircle2;
                } else if (n.type === 'warning') {
                  borderClass = 'border-rose-500/20';
                  textClass = 'text-rose-450'; // standard text color
                  Icon = AlertCircle;
                }
                
                return (
                  <div key={n.id} className={`p-3 rounded-2xl bg-slate-900/40 border ${borderClass} text-xs space-y-1`}>
                    <div className={`flex items-center justify-between ${textClass} font-bold`}>
                      <span className="flex items-center gap-1.5">
                        <Icon className="w-3.5 h-3.5" />
                        <span className="capitalize">{n.title}</span>
                      </span>
                      <span className="text-[10px] text-slate-500 font-mono">
                        {formatTimeOnly(n.created_at)}
                      </span>
                    </div>
                    <p className="text-slate-300 text-[11px]">{n.message}</p>
                  </div>
                );
              })
            )}
          </div>
        </div>

      </div>



    </div>
  );
};
