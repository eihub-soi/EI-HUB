import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { mockEngine } from '../../services/mockEngine';
import { useAuth } from '../../contexts/AuthContext';
import { BorrowRequest, RequestStatus } from '../../types';
import { generateStudentReceiptPdf } from '../../utils/pdfGenerator';
import { toast } from 'sonner';
import { 
  ClipboardList, 
  Download, 
  Eye, 
  CheckCircle2, 
  Clock, 
  AlertTriangle, 
  RotateCcw, 
  X,
  FileText
} from 'lucide-react';

const parsePurpose = (purposeStr: string) => {
  if (!purposeStr) return {
    purpose: '',
    fromDate: '',
    toDate: '',
    projectGuide: '',
    description: ''
  };

  if (purposeStr.includes("Project Purpose:") || purposeStr.includes("From Date:")) {
    const lines = purposeStr.split('\n');
    const result = {
      purpose: '',
      fromDate: '',
      toDate: '',
      projectGuide: '',
      description: ''
    };
    lines.forEach(line => {
      if (line.startsWith("Project Purpose:")) result.purpose = line.replace("Project Purpose:", "").trim();
      else if (line.startsWith("From Date:")) result.fromDate = line.replace("From Date:", "").trim();
      else if (line.startsWith("To Date:")) result.toDate = line.replace("To Date:", "").trim();
      else if (line.startsWith("Project Guide:")) result.projectGuide = line.replace("Project Guide:", "").trim();
      else if (line.startsWith("Description:")) result.description = line.replace("Description:", "").trim();
    });
    return result;
  }

  // Fallback parser for old format: "Purpose (Guide: XYZ) - Notes: ABC"
  const guideMatch = purposeStr.match(/\(Guide:\s*(.*?)\)/);
  const notesMatch = purposeStr.match(/-\s*Notes:\s*(.*)/);
  
  let guide = guideMatch ? guideMatch[1] : '';
  let notes = notesMatch ? notesMatch[1] : '';
  let mainPurpose = purposeStr;
  
  if (guideMatch) {
    mainPurpose = mainPurpose.replace(guideMatch[0], '');
  }
  if (notesMatch) {
    mainPurpose = mainPurpose.replace(notesMatch[0], '');
  }
  
  return {
    purpose: mainPurpose.trim(),
    fromDate: '',
    toDate: '',
    projectGuide: guide.trim(),
    description: notes.trim()
  };
};

const formatDateDMY = (dateStr: string) => {
  if (!dateStr) return '';
  const dateOnly = dateStr.includes('T') ? dateStr.split('T')[0] : dateStr;
  const parts = dateOnly.split('-');
  if (parts.length === 3) {
    if (parts[0].length === 4) {
      return `${parts[2]}-${parts[1]}-${parts[0]}`;
    }
  }
  return dateStr;
};

export const MyRequests: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [requests, setRequests] = useState<BorrowRequest[]>(
    mockEngine.getRequests().filter((r) => r.student_id === user?.id || r.student_id === 'usr-student-1')
  );
  const [statusFilter, setStatusFilter] = useState<RequestStatus | 'All'>('All');
  const [selectedReq, setSelectedReq] = useState<BorrowRequest | null>(null);

  const filteredRequests = requests.filter((r) => statusFilter === 'All' || r.status === statusFilter);

  const details = selectedReq ? parsePurpose(selectedReq.purpose) : null;

  const handleDownloadReceipt = async (req: BorrowRequest) => {
    toast.info('Generating official PDF receipt...');
    try {
      await generateStudentReceiptPdf(req);
      toast.success('Receipt downloaded successfully.');
    } catch (err) {
      console.error(err);
      toast.error('Failed to generate PDF receipt.');
    }
  };

  const renderStatusBadge = (req: BorrowRequest) => {
    const status = req.status;
    switch (status) {
      case 'approved':
        if (req.return_requested_at) {
          return (
            <span className="px-2.5 py-1 rounded-xl text-[10px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30 flex items-center gap-1 w-fit">
              <Clock className="w-3 h-3 text-amber-400" /> Return Pending
            </span>
          );
        }
        return (
          <span className="px-2.5 py-1 rounded-xl text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 flex items-center gap-1 w-fit">
            <CheckCircle2 className="w-3 h-3" /> Approved
          </span>
        );
      case 'pending':
        return (
          <span className="px-2.5 py-1 rounded-xl text-[10px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30 flex items-center gap-1 w-fit">
            <Clock className="w-3 h-3" /> Pending
          </span>
        );
      case 'rejected':
        return (
          <span className="px-2.5 py-1 rounded-xl text-[10px] font-bold bg-rose-500/20 text-rose-300 border border-rose-500/30 flex items-center gap-1 w-fit">
            <AlertTriangle className="w-3 h-3" /> Rejected
          </span>
        );
      case 'returned':
        return (
          <span className="px-2.5 py-1 rounded-xl text-[10px] font-bold bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 flex items-center gap-1 w-fit">
            <RotateCcw className="w-3 h-3" /> Returned
          </span>
        );
      default:
        return null;
    }
  };



  return (
    <div className="space-y-6">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-white tracking-tight">My Requests</h1>
          <p className="text-xs text-slate-400 mt-0.5">Track borrowing requests and download transaction receipts</p>
        </div>

        <div className="flex items-center gap-3">
          {/* Status Filter Tabs */}
          <div className="flex items-center gap-2 overflow-x-auto pb-1">
            {['All', 'pending', 'approved', 'returned', 'rejected'].map((st) => (
              <button
                key={st}
                onClick={() => setStatusFilter(st as any)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold capitalize transition-all ${
                  statusFilter === st
                    ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30'
                    : 'bg-slate-900/40 text-slate-400 hover:text-white border border-white/5'
                }`}
              >
                {st}
              </button>
            ))}
          </div>

          <button
            onClick={() => navigate('/student/browse')}
            className="flex items-center gap-2 px-4 py-2 rounded-2xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs shadow-indigo-glow transition-all hover:scale-105 shrink-0"
          >
            + New Request
          </button>
        </div>
      </div>

      {/* Data Table matching preview UI */}
      <div className="glass-card rounded-3xl border border-white/10 overflow-hidden shadow-glass">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-white/10 bg-slate-900/60 text-[11px] font-bold uppercase tracking-wider text-slate-400">
                <th className="py-4 px-6">Req ID</th>
                <th className="py-4 px-6">Component</th>
                <th className="py-4 px-6">Quantity</th>
                <th className="py-4 px-6">Requested At</th>
                <th className="py-4 px-6">Status</th>
                <th className="py-4 px-6 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5 text-xs">
              {filteredRequests.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-slate-400">
                    No requests found matching criteria.
                  </td>
                </tr>
              ) : (
                filteredRequests.map((req) => {
                  const rowDetails = parsePurpose(req.purpose);
                  return (
                    <tr key={req.id} className="hover:bg-slate-900/40 transition-colors">
                      <td className="py-4 px-6 font-mono font-bold text-indigo-300">{req.request_code}</td>
                      <td className="py-4 px-6">
                        <div className="flex items-center gap-3">
                          <img
                            src={req.component_image || 'https://images.unsplash.com/photo-1608564697071-ddf911d81370?w=100&auto=format&fit=crop&q=80'}
                            alt={req.component_name}
                            className="w-8 h-8 rounded-xl object-cover"
                          />
                          <div>
                            <p className="font-bold text-white">{req.component_name}</p>
                            <p className="text-[10px] text-slate-400">{req.component_category}</p>
                          </div>
                        </div>
                      </td>
                      <td className="py-4 px-6 font-semibold text-slate-200">{req.quantity}</td>
                      <td className="py-4 px-6 text-slate-400">
                        <div>{new Date(req.requested_at).toLocaleDateString()} {new Date(req.requested_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</div>
                        <div className="text-[10px] text-indigo-300 mt-0.5 font-semibold">
                          Period: {rowDetails.fromDate && rowDetails.toDate ? `${formatDateDMY(rowDetails.fromDate)} to ${formatDateDMY(rowDetails.toDate)}` : 'N/A'}
                        </div>
                      </td>
                      <td className="py-4 px-6">{renderStatusBadge(req)}</td>
                      <td className="py-4 px-6 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => setSelectedReq(req)}
                            className="px-2.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white font-semibold text-[11px] flex items-center gap-1 transition-all"
                          >
                            <Eye className="w-3.5 h-3.5" /> View
                          </button>
                          {req.status === 'approved' && (
                            <button
                              onClick={() => handleDownloadReceipt(req)}
                              className="px-2.5 py-1.5 rounded-xl bg-indigo-600/30 hover:bg-indigo-600 text-indigo-300 hover:text-white font-semibold text-[11px] flex items-center gap-1 border border-indigo-500/30 transition-all"
                              title="Download Receipt"
                            >
                              <Download className="w-3.5 h-3.5" /> Download
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Request Details Timeline Modal */}
      {selectedReq && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-in fade-in">
          <div className="w-full max-w-lg glass-card p-6 border border-white/20 shadow-2xl rounded-3xl space-y-5 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <div>
                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                  <FileText className="w-4 h-4 text-indigo-400" /> Request Details ({selectedReq.request_code})
                </h3>
                <p className="text-[11px] text-slate-400">Transaction log and approval timeline</p>
              </div>
              <button onClick={() => setSelectedReq(null)} className="p-1 rounded-xl text-slate-400 hover:text-white">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-4 p-4 rounded-2xl bg-slate-900/60 border border-white/5">
                <div>
                  <p className="text-slate-400 text-[10px]">Component Name</p>
                  <p className="font-bold text-white">{selectedReq.component_name}</p>
                </div>
                <div>
                  <p className="text-slate-400 text-[10px]">Quantity</p>
                  <p className="font-bold text-white">{selectedReq.quantity} units</p>
                </div>
                <div>
                  <p className="text-slate-400 text-[10px]">Status</p>
                  <div className="mt-1">{renderStatusBadge(selectedReq)}</div>
                </div>
                <div>
                  <p className="text-slate-400 text-[10px]">Project Guide</p>
                  <p className="font-bold text-white">{details?.projectGuide || 'N/A'}</p>
                </div>
                <div className="col-span-2">
                  <p className="text-slate-400 text-[10px]">Project Purpose / Topic</p>
                  <p className="font-bold text-white">{details?.purpose || selectedReq.purpose}</p>
                </div>
                <div>
                  <p className="text-slate-400 text-[10px]">From Date</p>
                  <p className="font-bold text-white">{details?.fromDate ? formatDateDMY(details.fromDate) : 'N/A'}</p>
                </div>
                <div>
                  <p className="text-slate-400 text-[10px]">To Date</p>
                  <p className="font-bold text-white">{details?.toDate ? formatDateDMY(details.toDate) : 'N/A'}</p>
                </div>
                <div className="col-span-2">
                  <p className="text-slate-400 text-[10px]">Description & Hardware Notes</p>
                  <p className="font-bold text-white whitespace-pre-wrap">{details?.description || 'N/A'}</p>
                </div>
              </div>

              {/* Workflow timeline */}
              <div className="space-y-3 pt-2">
                <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Workflow Timeline</p>
                
                <div className="flex items-start gap-3">
                  <div className="w-6 h-6 rounded-full bg-indigo-500/20 text-indigo-400 flex items-center justify-center shrink-0 border border-indigo-500/30">
                    1
                  </div>
                  <div>
                    <p className="font-bold text-white">Submitted by Student</p>
                    <p className="text-[10px] text-slate-400">{new Date(selectedReq.requested_at).toLocaleString()}</p>
                  </div>
                </div>

                {selectedReq.approved_at && (
                  <div className="flex items-start gap-3">
                    <div className="w-6 h-6 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0 border border-emerald-500/30">
                      2
                    </div>
                    <div>
                      <p className="font-bold text-white">Approved by Faculty ({selectedReq.approved_by_name || 'Prof. Robert Chen'})</p>
                      <p className="text-[10px] text-slate-400">{new Date(selectedReq.approved_at).toLocaleString()}</p>
                      {selectedReq.rejection_reason && (
                        <p className="text-[10px] text-emerald-300 mt-0.5">Remark: <span className="italic">"{selectedReq.rejection_reason}"</span></p>
                      )}
                    </div>
                  </div>
                )}

                {selectedReq.return_requested_at && (
                  <div className="flex items-start gap-3">
                    <div className="w-6 h-6 rounded-full bg-amber-500/20 text-amber-400 flex items-center justify-center shrink-0 border border-amber-500/30">
                      3
                    </div>
                    <div>
                      <p className="font-bold text-white">Return Requested by Student</p>
                      <p className="text-[10px] text-slate-400">{new Date(selectedReq.return_requested_at).toLocaleString()}</p>
                      {selectedReq.return_condition && (
                        <p className="text-[10px] text-slate-300 mt-0.5">Reported Condition: <span className="text-amber-300 font-semibold">{selectedReq.return_condition}</span></p>
                      )}
                      {selectedReq.return_description && (
                        <p className="text-[10px] text-slate-400 mt-0.5">Description: <span className="text-slate-300 italic">"{selectedReq.return_description}"</span></p>
                      )}
                    </div>
                  </div>
                )}

                {selectedReq.returned_at && (
                  <div className="flex items-start gap-3">
                    <div className="w-6 h-6 rounded-full bg-indigo-500/20 text-indigo-400 flex items-center justify-center shrink-0 border border-indigo-500/30">
                      4
                    </div>
                    <div>
                      <p className="font-bold text-white">Returned & Inspected ({selectedReq.return_condition})</p>
                      <p className="text-[10px] text-slate-400">{new Date(selectedReq.returned_at).toLocaleString()}</p>
                      <div className="mt-1 space-y-0.5 p-2 rounded-xl bg-slate-950/60 border border-white/5 text-[10px]">
                        <p className="text-slate-400">Missing Accessories/Parts: <span className="text-rose-300 font-semibold">{selectedReq.return_missing_details || 'None'}</span></p>
                        <p className="text-slate-400">Damaged Parts/Pins: <span className="text-rose-300 font-semibold">{selectedReq.return_damaged_details || 'None'}</span></p>
                        <p className="text-slate-400">Remarks: <span className="text-slate-300 font-semibold">{selectedReq.return_remarks || 'None'}</span></p>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>

            <div className="pt-3 border-t border-white/10 flex items-center justify-end gap-3">
              {selectedReq.status === 'approved' && (
                <button
                  onClick={() => handleDownloadReceipt(selectedReq)}
                  className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs shadow-indigo-glow flex items-center gap-1.5"
                >
                  <Download className="w-3.5 h-3.5" /> Download PDF Receipt
                </button>
              )}
              <button onClick={() => setSelectedReq(null)} className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 text-xs">
                Close
              </button>
            </div>
          </div>
        </div>
      )}



    </div>
  );
};
