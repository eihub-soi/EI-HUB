import React, { useState } from 'react';
import { mockEngine } from '../../services/mockEngine';
import { generateEnterpriseReportPdf } from '../../utils/pdfGenerator';
import { formatTimestamp } from '../../utils/timestamp';
import { sendBrevoReportEmail } from '../../utils/brevoService';
import { useAuth } from '../../contexts/AuthContext';
import { toast } from 'sonner';
import { 
  FileText, 
  Download, 
  Calendar, 
  Sparkles, 
  QrCode, 
  BarChart3, 
  Boxes, 
  RotateCcw, 
  CheckCircle2, 
  AlertTriangle,
  Mail
} from 'lucide-react';
import { ResponsiveContainer, PieChart, Pie, Cell, Tooltip as ChartTooltip } from 'recharts';

export const ReportsAnalytics: React.FC = () => {
  const { user } = useAuth();
  const [reportType, setReportType] = useState('Inventory Report');

  const components = mockEngine.getComponents();
  const requests = mockEngine.getRequests();
  const stats = mockEngine.getSystemStats();

  const totalCategories = new Set(components.map((c) => c.category)).size;
  const totalUnits = components.reduce((acc, c) => acc + c.total_stock, 0);
  const availableUnits = components.reduce((acc, c) => acc + c.available_stock, 0);
  const borrowedUnits = components.reduce((acc, c) => acc + c.borrowed_stock, 0);
  const lowStockCount = components.filter((c) => c.available_stock > 0 && c.available_stock <= 5).length;
  const outOfStockCount = components.filter((c) => c.available_stock === 0).length;

  const handleExportPdf = () => {
    try {
      generateEnterpriseReportPdf(reportType, components, requests, stats);
      toast.success(`Generated & downloaded ${reportType} PDF!`);
    } catch (err: any) {
      toast.error('Failed to generate PDF report.');
    }
  };

  const handleEmailPdf = async () => {
    if (!user) {
      toast.error('You must be logged in to email reports.');
      return;
    }
    const targetEmail = user.email || 'faculty-01@kgkite.ac.in';
    toast.info(`Generating ${reportType} and preparing email dispatch...`);
    try {
      const doc = generateEnterpriseReportPdf(reportType, components, requests, stats, false);
      const base64Pdf = doc.output('datauristring').split(',')[1];

      await sendBrevoReportEmail(targetEmail, reportType, base64Pdf);
      toast.success(`Official PDF report successfully emailed to ${targetEmail}!`);
    } catch (err: any) {
      console.error('[Email Report Error]', err);
      toast.error(`Failed to email report: ${err.message || err}`);
    }
  };

  // Calculate category distribution dynamically
  const categoryMap: { [key: string]: number } = {};
  components.forEach((c) => {
    categoryMap[c.category] = (categoryMap[c.category] || 0) + c.total_stock;
  });

  const totalCategoryStock = Object.values(categoryMap).reduce((acc, val) => acc + val, 0);
  const COLORS = ['#6366F1', '#10B981', '#F59E0B', '#EF4444', '#EC4899', '#8B5CF6', '#06B6D4'];

  const categoryChartData = Object.entries(categoryMap).map(([name, value], index) => {
    const percentage = totalCategoryStock > 0 ? ((value / totalCategoryStock) * 100).toFixed(1) : '0.0';
    return {
      name,
      value,
      percentage,
      color: COLORS[index % COLORS.length],
    };
  });

  const handleExportCsv = () => {
    try {
      let csvContent = "";
      
      if (reportType === 'Inventory Report') {
        csvContent += "ID,SKU,Name,Category,Description,Total Stock,Available Stock,Borrowed Stock,Cabinet,Shelf,Location Details,Unit Cost\n";
        components.forEach((c) => {
          const row = [
            c.id,
            `"${c.sku}"`,
            `"${c.name.replace(/"/g, '""')}"`,
            `"${c.category.replace(/"/g, '""')}"`,
            `"${c.description.replace(/"/g, '""')}"`,
            c.total_stock,
            c.available_stock,
            c.borrowed_stock,
            `"${c.cabinet.replace(/"/g, '""')}"`,
            `"${c.shelf.replace(/"/g, '""')}"`,
            `"${c.location_details?.replace(/"/g, '""') || ''}"`,
            c.unit_cost
          ].join(",");
          csvContent += row + "\n";
        });
      } else if (reportType === 'Borrow Report') {
        csvContent += "ID,Request Code,Student Email,Student Name,Register Number,Component Name,Category,Quantity,Purpose,Status,Requested At,Expected Return At\n";
        requests.forEach((r) => {
          const row = [
            r.id,
            `"${r.request_code || ''}"`,
            `"${r.student_email || ''}"`,
            `"${(r.student_name || '').replace(/"/g, '""')}"`,
            `"${r.student_register_no || ''}"`,
            `"${(r.component_name || '').replace(/"/g, '""')}"`,
            `"${r.component_category || ''}"`,
            r.quantity,
            `"${r.purpose.replace(/"/g, '""')}"`,
            r.status,
            r.requested_at,
            r.expected_return_at
          ].join(",");
          csvContent += row + "\n";
        });
      } else {
        csvContent += "Metric,Value\n";
        csvContent += `Report Type,${reportType}\n`;
        csvContent += `Total Categories,${totalCategories}\n`;
        csvContent += `Total Components,${totalUnits}\n`;
        csvContent += `Available Stock,${availableUnits}\n`;
        csvContent += `Borrowed Stock,${borrowedUnits}\n`;
        csvContent += `Low Stock Items,${lowStockCount}\n`;
        csvContent += `Out of Stock Items,${outOfStockCount}\n`;
      }

      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.setAttribute("href", url);
      link.setAttribute("download", `${reportType.toLowerCase().replace(/\s+/g, '_')}_${new Date().toISOString().slice(0,10)}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      toast.success(`Exported ${reportType} CSV successfully!`);
    } catch (err: any) {
      toast.error('Failed to export CSV.');
    }
  };

  const handleExportSql = () => {
    try {
      let sqlContent = `-- EI HUB ENTERPRISE SYSTEM EXPORT\n`;
      sqlContent += `-- Generated On: ${formatTimestamp(new Date())}\n`;
      sqlContent += `-- Report Type: ${reportType}\n\n`;

      if (reportType === 'Inventory Report') {
        sqlContent += `CREATE TABLE IF NOT EXISTS components (\n`;
        sqlContent += `  id VARCHAR(255) PRIMARY KEY,\n`;
        sqlContent += `  sku VARCHAR(255),\n`;
        sqlContent += `  name VARCHAR(255),\n`;
        sqlContent += `  category VARCHAR(255),\n`;
        sqlContent += `  description TEXT,\n`;
        sqlContent += `  total_stock INT,\n`;
        sqlContent += `  available_stock INT,\n`;
        sqlContent += `  borrowed_stock INT,\n`;
        sqlContent += `  cabinet VARCHAR(255),\n`;
        sqlContent += `  shelf VARCHAR(255),\n`;
        sqlContent += `  location_details VARCHAR(255),\n`;
        sqlContent += `  unit_cost DECIMAL(10, 2)\n`;
        sqlContent += `);\n\n`;

        components.forEach((c) => {
          const esc = (str: string) => str ? str.replace(/'/g, "''") : '';
          sqlContent += `INSERT INTO components (id, sku, name, category, description, total_stock, available_stock, borrowed_stock, cabinet, shelf, location_details, unit_cost) VALUES (\n`;
          sqlContent += `  '${esc(c.id)}', '${esc(c.sku)}', '${esc(c.name)}', '${esc(c.category)}', '${esc(c.description)}', \n`;
          sqlContent += `  ${c.total_stock}, ${c.available_stock}, ${c.borrowed_stock}, '${esc(c.cabinet)}', '${esc(c.shelf)}', '${esc(c.location_details || '')}', ${c.unit_cost}\n`;
          sqlContent += `);\n`;
        });
      } else if (reportType === 'Borrow Report') {
        sqlContent += `CREATE TABLE IF NOT EXISTS borrow_requests (\n`;
        sqlContent += `  id VARCHAR(255) PRIMARY KEY,\n`;
        sqlContent += `  request_code VARCHAR(255),\n`;
        sqlContent += `  student_email VARCHAR(255),\n`;
        sqlContent += `  student_name VARCHAR(255),\n`;
        sqlContent += `  student_register_no VARCHAR(255),\n`;
        sqlContent += `  component_name VARCHAR(255),\n`;
        sqlContent += `  component_category VARCHAR(255),\n`;
        sqlContent += `  quantity INT,\n`;
        sqlContent += `  purpose TEXT,\n`;
        sqlContent += `  status VARCHAR(255),\n`;
        sqlContent += `  requested_at TIMESTAMP,\n`;
        sqlContent += `  expected_return_at TIMESTAMP\n`;
        sqlContent += `);\n\n`;

        requests.forEach((r) => {
          const esc = (str: string) => str ? str.replace(/'/g, "''") : '';
          sqlContent += `INSERT INTO borrow_requests (id, request_code, student_email, student_name, student_register_no, component_name, component_category, quantity, purpose, status, requested_at, expected_return_at) VALUES (\n`;
          sqlContent += `  '${esc(r.id)}', '${esc(r.request_code || '')}', '${esc(r.student_email || '')}', '${esc(r.student_name || '')}', '${esc(r.student_register_no || '')}', '${esc(r.component_name || '')}', '${esc(r.component_category || '')}', ${r.quantity}, '${esc(r.purpose)}', '${esc(r.status)}', '${esc(r.requested_at)}', '${esc(r.expected_return_at)}'\n`;
          sqlContent += `);\n`;
        });
      } else {
        sqlContent += `CREATE TABLE IF NOT EXISTS report_summary (\n`;
        sqlContent += `  metric VARCHAR(255),\n`;
        sqlContent += `  val VARCHAR(255)\n`;
        sqlContent += `);\n\n`;
        sqlContent += `INSERT INTO report_summary (metric, val) VALUES ('Report Type', '${reportType}');\n`;
        sqlContent += `INSERT INTO report_summary (metric, val) VALUES ('Total Categories', '${totalCategories}');\n`;
        sqlContent += `INSERT INTO report_summary (metric, val) VALUES ('Total Components', '${totalUnits}');\n`;
        sqlContent += `INSERT INTO report_summary (metric, val) VALUES ('Available Stock', '${availableUnits}');\n`;
        sqlContent += `INSERT INTO report_summary (metric, val) VALUES ('Borrowed Stock', '${borrowedUnits}');\n`;
      }

      const blob = new Blob([sqlContent], { type: 'text/sql;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.setAttribute("href", url);
      link.setAttribute("download", `${reportType.toLowerCase().replace(/\s+/g, '_')}_${new Date().toISOString().slice(0,10)}.sql`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      toast.success(`Exported ${reportType} SQL successfully!`);
    } catch (err: any) {
      toast.error('Failed to export SQL.');
    }
  };

  return (
    <div className="space-y-6">
      
      {/* Header */}
      <div>
        <h1 className="text-2xl font-extrabold text-white tracking-tight">Reports & Analytics</h1>
        <p className="text-xs text-slate-400 mt-0.5">Generate formal institutional inventory reports and QR-verified documentation</p>
      </div>

      {/* Report Filter Controls */}
      <div className="p-4 rounded-3xl glass-card border border-white/10 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <label className="block text-[10px] text-slate-400 font-bold uppercase mb-1">Select Report Type</label>
          <select
            value={reportType}
            onChange={(e) => setReportType(e.target.value)}
            className="px-3.5 py-2.5 rounded-2xl glass-input text-xs font-semibold text-white min-w-[220px]"
          >
            <option value="Inventory Report">Inventory Report</option>
            <option value="Borrow Report">Borrow Report</option>
            <option value="Department Report">Department Report</option>
            <option value="Faculty Report">Faculty Report</option>
            <option value="Usage Report">Usage Report</option>
          </select>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={handleExportCsv}
            className="flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-400 border border-emerald-500/30 font-extrabold text-xs transition-all hover:scale-105"
          >
            <Download className="w-3.5 h-3.5" /> Export CSV Report
          </button>
          
          <button
            onClick={handleExportSql}
            className="flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-amber-600/20 hover:bg-amber-600/30 text-amber-400 border border-amber-500/30 font-extrabold text-xs transition-all hover:scale-105"
          >
            <Download className="w-3.5 h-3.5" /> Export SQL Report
          </button>

          <button
            onClick={handleExportPdf}
            className="flex items-center gap-2 px-5 py-2.5 rounded-2xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border border-white/10 font-extrabold text-xs transition-all hover:scale-105"
          >
            <Download className="w-4 h-4" /> Export PDF Report
          </button>

          <button
            onClick={handleEmailPdf}
            className="flex items-center gap-2 px-5 py-2.5 rounded-2xl bg-indigo-600 hover:bg-indigo-500 text-white font-extrabold text-xs shadow-indigo-glow transition-all hover:scale-105"
          >
            <Mail className="w-4 h-4 text-white" /> Email PDF Report
          </button>
        </div>
      </div>

      {/* Styled PDF Preview Card */}
      <div className="p-8 rounded-3xl glass-card border border-white/15 shadow-glass space-y-8 max-w-5xl mx-auto bg-gradient-to-b from-slate-900/90 to-slate-950/90">
        
        {/* PDF Header Branding */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-white/10 pb-6 gap-4">
          <div className="flex items-center gap-4">
            <img src="/logo.png" alt="EI HUB Logo" className="w-14 h-14 rounded-2xl object-contain ring-2 ring-indigo-500/40 shadow-indigo-glow bg-slate-950 p-1" />
            <div>
              <h2 className="text-xl font-black tracking-tight text-white">EI HUB</h2>
              <p className="text-xs text-indigo-300 font-bold">KGISL Institute of Technology - Innovation SOI</p>
              <p className="text-[11px] text-slate-400 font-semibold uppercase tracking-wider mt-0.5">
                {reportType.toUpperCase()}
              </p>
            </div>
          </div>

          <div className="text-right">
            <span className="px-3 py-1 rounded-full text-xs font-bold bg-gold-500/20 text-gold-300 border border-gold-500/30">
              OFFICIAL DOCUMENT
            </span>
          </div>
        </div>

        {/* Realtime KPI Boxes Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          <div className="p-4 rounded-2xl bg-slate-900/60 border border-white/10 text-center space-y-1">
            <p className="text-[10px] text-slate-400 font-bold uppercase">Total Categories</p>
            <h4 className="text-xl font-extrabold text-white">{totalCategories}</h4>
          </div>

          <div className="p-4 rounded-2xl bg-slate-900/60 border border-white/10 text-center space-y-1">
            <p className="text-[10px] text-slate-400 font-bold uppercase">Total Components</p>
            <h4 className="text-xl font-extrabold text-white">{totalUnits}</h4>
          </div>

          <div className="p-4 rounded-2xl bg-slate-900/60 border border-emerald-500/20 text-center space-y-1">
            <p className="text-[10px] text-slate-400 font-bold uppercase">Available Stock</p>
            <h4 className="text-xl font-extrabold text-emerald-400">{availableUnits}</h4>
          </div>

          <div className="p-4 rounded-2xl bg-slate-900/60 border border-indigo-500/20 text-center space-y-1">
            <p className="text-[10px] text-slate-400 font-bold uppercase">Borrowed Stock</p>
            <h4 className="text-xl font-extrabold text-indigo-300">{borrowedUnits}</h4>
          </div>

          <div className="p-4 rounded-2xl bg-slate-900/60 border border-amber-500/20 text-center space-y-1">
            <p className="text-[10px] text-slate-400 font-bold uppercase">Low Stock Items</p>
            <h4 className="text-xl font-extrabold text-amber-400">{lowStockCount}</h4>
          </div>

          <div className="p-4 rounded-2xl bg-slate-900/60 border border-rose-500/20 text-center space-y-1">
            <p className="text-[10px] text-slate-400 font-bold uppercase">Out of Stock Items</p>
            <h4 className="text-xl font-extrabold text-rose-400">{outOfStockCount}</h4>
          </div>
        </div>

        {/* Category Distribution Chart Section */}
        <div className="border-t border-white/10 pt-6 space-y-4">
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Category Stock Distribution</p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-center">
            {/* Doughnut Chart */}
            <div className="h-56 w-full flex items-center justify-center">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={categoryChartData}
                    cx="50%"
                    cy="50%"
                    innerRadius={55}
                    outerRadius={85}
                    paddingAngle={3}
                    dataKey="value"
                  >
                    {categoryChartData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <ChartTooltip
                    contentStyle={{ backgroundColor: '#0B132B', borderColor: 'rgba(255,255,255,0.1)', borderRadius: '12px', fontSize: '12px', color: '#FFF' }}
                    formatter={(value: any, name: any, props: any) => [`${value} units (${props.payload.percentage}%)`, name]}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>

            {/* Chart Legend with Percentages */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              {categoryChartData.map((item, index) => (
                <div key={index} className="p-3 rounded-2xl bg-slate-900/40 border border-white/5 flex flex-col justify-between">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: item.color }} />
                    <span className="font-bold text-white truncate">{item.name}</span>
                  </div>
                  <div className="flex justify-between items-baseline mt-1">
                    <span className="text-[10px] text-slate-400 font-semibold">{item.value} units</span>
                    <span className="text-xs font-extrabold text-white">{item.percentage}%</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Footer Metadata & Embedded QR verification */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between border-t border-white/10 pt-6 text-xs text-slate-400 gap-4">
          <div>
            <p><span className="font-bold text-slate-200">Generated By:</span> EI HUB Institutional Engine</p>
            <p><span className="font-bold text-slate-200">Generated On:</span> {formatTimestamp(new Date())}</p>
          </div>

          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-white p-1 flex items-center justify-center shrink-0">
              <QrCode className="w-10 h-10 text-slate-950" />
            </div>
            <div>
              <p className="text-[10px] font-bold text-slate-200">QR VERIFIED</p>
              <p className="text-[9px] text-slate-400">Scan to verify institutional authenticity</p>
            </div>
          </div>
        </div>

      </div>

    </div>
  );
};
