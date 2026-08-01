import React, { useState } from 'react';
import { mockEngine } from '../../services/mockEngine';
import { BorrowRequest } from '../../types';
import { 
  ClipboardList, 
  Search, 
  Clock, 
  AlertCircle, 
  CheckCircle2,
  XCircle,
  RotateCcw,
  Eye,
  X
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

export const ApprovalHistory: React.FC = () => {
  const [requests] = useState<BorrowRequest[]>(mockEngine.getRequests());
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('all');
  const [selectedGuide, setSelectedGuide] = useState('all');
  const [selectedReq, setSelectedReq] = useState<BorrowRequest | null>(null);

  // Dynamically extract unique guides from history requests
  const uniqueGuides = Array.from(
    new Set(
      requests
        .filter((r) => r.status !== 'pending')
        .map((r) => parsePurpose(r.purpose).projectGuide)
        .filter((g) => g && g.trim() !== '')
    )
  ).sort();

  const historyRequests = requests.filter((r) => {
    if (r.status === 'pending') return false;

    const rowDetails = parsePurpose(r.purpose);

    // Status Filter
    if (selectedStatus !== 'all' && r.status !== selectedStatus) return false;

    // Guide Filter
    if (selectedGuide !== 'all' && rowDetails.projectGuide !== selectedGuide) return false;

    // Search Query Filter
    if (searchQuery.trim() !== '') {
      const query = searchQuery.toLowerCase();
      const matchesCode = r.request_code.toLowerCase().includes(query);
      const matchesStudent = r.student_name && r.student_name.toLowerCase().includes(query);
      const matchesReg = r.student_register_no && r.student_register_no.toLowerCase().includes(query);
      const matchesComponent = r.component_name && r.component_name.toLowerCase().includes(query);
      const matchesGuide = rowDetails.projectGuide && rowDetails.projectGuide.toLowerCase().includes(query);
      const matchesPurpose = rowDetails.purpose && rowDetails.purpose.toLowerCase().includes(query);
      const matchesStatus = r.status.toLowerCase().includes(query);

      return (
        matchesCode ||
        matchesStudent ||
        matchesReg ||
        matchesComponent ||
        matchesGuide ||
        matchesPurpose ||
        matchesStatus
      );
    }

    return true;
  });

  const details = selectedReq ? parsePurpose(selectedReq.purpose) : null;

  return (
    <div className="space-y-6">
      
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-white tracking-tight flex items-center gap-2.5">
            <ClipboardList className="w-6 h-6 text-indigo-400" /> Approval & Return History
          </h1>
          <p className="text-xs text-slate-400 mt-1">View past approvals, rejections and processed returns</p>
        </div>
      </div>

      {/* Help Guide Banner */}
      <div className="p-4 rounded-3xl bg-indigo-500/10 border border-indigo-500/20 text-xs text-indigo-200 flex items-start gap-3">
        <AlertCircle className="w-5 h-5 text-indigo-400 shrink-0 mt-0.5" />
        <div>
          <span className="font-bold text-white block mb-0.5">Approval History Guide</span>
          <p className="text-[11px] leading-relaxed text-slate-350">
            Use this dashboard to track all resolved component transactions. You can search by request code, student details, components, or guides. Use the filters to isolate records by status (Approved, Rejected, Returned) or specific Project Guides.
          </p>
        </div>
      </div>

      {/* Filters Toolbar */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-4 rounded-3xl glass-card border border-white/10">
        {/* Search */}
        <div className="relative">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by student, component, guide, status..."
            className="w-full pl-10 pr-4 py-2.5 rounded-2xl glass-input text-xs text-white"
          />
        </div>

        {/* Status Filter */}
        <div className="relative">
          <select
            value={selectedStatus}
            onChange={(e) => setSelectedStatus(e.target.value)}
            className="w-full px-4 py-2.5 rounded-2xl glass-input text-xs text-white cursor-pointer appearance-none bg-[#0B132B]/80 border border-white/5 focus:outline-none"
          >
            <option value="all">All Statuses</option>
            <option value="approved">Approved</option>
            <option value="rejected">Rejected</option>
            <option value="returned">Returned</option>
          </select>
          <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-4 text-slate-400">
            <svg className="fill-current h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20">
              <path d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z"/>
            </svg>
          </div>
        </div>

        {/* Guide Filter */}
        <div className="relative">
          <select
            value={selectedGuide}
            onChange={(e) => setSelectedGuide(e.target.value)}
            className="w-full px-4 py-2.5 rounded-2xl glass-input text-xs text-white cursor-pointer appearance-none bg-[#0B132B]/80 border border-white/5 focus:outline-none"
          >
            <option value="all">All Project Guides</option>
            {uniqueGuides.map((guide) => (
              <option key={guide} value={guide}>
                {guide}
              </option>
            ))}
          </select>
          <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-4 text-slate-400">
            <svg className="fill-current h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20">
              <path d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z"/>
            </svg>
          </div>
        </div>
      </div>

      {/* History Table */}
      <div className="glass-card rounded-3xl border border-white/10 overflow-hidden shadow-glass">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-white/10 bg-slate-900/60 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                <th className="py-3.5 px-6">Req Code</th>
                <th className="py-3.5 px-6">Student Details</th>
                <th className="py-3.5 px-6">Component</th>
                <th className="py-3.5 px-6">Qty</th>
                <th className="py-3.5 px-6">Project Purpose</th>
                <th className="py-3.5 px-6">Project Guide</th>
                <th className="py-3.5 px-6">Borrowing Period</th>
                <th className="py-3.5 px-6">Status</th>
                <th className="py-3.5 px-6 text-center">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5 text-xs">
              {historyRequests.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-12 text-center text-slate-400">
                    <CheckCircle2 className="w-10 h-10 text-slate-500 mx-auto mb-2 opacity-40" />
                    <p className="font-bold text-white text-sm">No History Records</p>
                    <p className="text-xs text-slate-500 mt-1">No completed component transactions found.</p>
                  </td>
                </tr>
              ) : (
                historyRequests.map((req) => {
                  const rowDetails = parsePurpose(req.purpose);
                  return (
                    <tr key={req.id} className="hover:bg-slate-900/40 transition-colors">
                      <td className="py-4 px-6 font-mono font-bold text-indigo-300">{req.request_code}</td>
                      <td className="py-4 px-6">
                        <p className="font-bold text-white">{req.student_name}</p>
                        <p className="text-[10px] text-slate-400 font-mono">Reg: {req.student_register_no}</p>
                      </td>
                      <td className="py-4 px-6 font-semibold text-slate-200">{req.component_name}</td>
                      <td className="py-4 px-6 font-extrabold text-indigo-300">{req.quantity}</td>
                      <td className="py-4 px-6 text-slate-300 max-w-xs truncate">{rowDetails.purpose || req.purpose}</td>
                      <td className="py-4 px-6 text-slate-300 font-semibold">{rowDetails.projectGuide || 'N/A'}</td>
                      <td className="py-4 px-6 text-slate-400 text-[10px]">
                        <div>Requested: {new Date(req.requested_at).toLocaleDateString()}</div>
                        <div className="text-indigo-300 mt-0.5 font-semibold">
                          {rowDetails.fromDate && rowDetails.toDate ? `${formatDateDMY(rowDetails.fromDate)} to ${formatDateDMY(rowDetails.toDate)}` : 'N/A'}
                        </div>
                      </td>
                      <td className="py-4 px-6">
                        {req.status === 'approved' && (
                          <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-emerald-500/15 border border-emerald-500/20 text-emerald-350">
                            Approved
                          </span>
                        )}
                        {req.status === 'rejected' && (
                          <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-rose-500/15 border border-rose-500/20 text-rose-350">
                            Rejected
                          </span>
                        )}
                        {req.status === 'returned' && (
                          <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-indigo-500/15 border border-indigo-500/20 text-indigo-350">
                            Returned
                          </span>
                        )}
                      </td>
                      <td className="py-4 px-6 text-center">
                        <button
                          onClick={() => setSelectedReq(req)}
                          className="p-2 rounded-xl bg-slate-900 border border-white/10 hover:border-slate-500 text-slate-450 hover:text-white transition-all"
                          title="View workflow history"
                        >
                          <Eye className="w-3.5 h-3.5" />
                        </button>
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
                  <ClipboardList className="w-4 h-4 text-indigo-400" /> Request Details ({selectedReq.request_code})
                </h3>
                <p className="text-[11px] text-slate-400">Transaction log and resolution details</p>
              </div>
              <button onClick={() => setSelectedReq(null)} className="p-1 rounded-xl text-slate-400 hover:text-white">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-4 p-4 rounded-2xl bg-slate-900/60 border border-white/5">
                <div>
                  <p className="text-slate-400 text-[10px]">Student Name</p>
                  <p className="font-bold text-white">{selectedReq.student_name}</p>
                  <p className="text-[10px] text-slate-400 font-mono">Reg: {selectedReq.student_register_no}</p>
                </div>
                <div>
                  <p className="text-slate-400 text-[10px]">Component Name</p>
                  <p className="font-bold text-white">{selectedReq.component_name}</p>
                  <p className="text-[10px] text-slate-400">{selectedReq.component_category}</p>
                </div>
                <div>
                  <p className="text-slate-400 text-[10px]">Quantity</p>
                  <p className="font-bold text-white">{selectedReq.quantity} units</p>
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

              {/* Resolution details timeline */}
              <div className="space-y-3 pt-2">
                <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Resolution History</p>
                
                <div className="flex items-start gap-3">
                  <div className="w-6 h-6 rounded-full bg-indigo-500/20 text-indigo-400 flex items-center justify-center shrink-0 border border-indigo-500/30 text-[10px] font-bold animate-pulse">
                    1
                  </div>
                  <div>
                    <p className="font-bold text-white">Submitted by Student</p>
                    <p className="text-[10px] text-slate-400">{new Date(selectedReq.requested_at).toLocaleString()}</p>
                  </div>
                </div>

                {selectedReq.approved_at && (
                  <div className="flex items-start gap-3">
                    <div className="w-6 h-6 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0 border border-emerald-500/30 text-[10px] font-bold">
                      2
                    </div>
                    <div>
                      <p className="font-bold text-white">Approved by Faculty ({selectedReq.approved_by_name || 'Prof. Robert Chen'})</p>
                      <p className="text-[10px] text-slate-400">{new Date(selectedReq.approved_at).toLocaleString()}</p>
                      {selectedReq.rejection_reason && selectedReq.status === 'approved' && (
                        <p className="text-[10px] text-emerald-300 mt-0.5">Remark: <span className="italic">"{selectedReq.rejection_reason}"</span></p>
                      )}
                    </div>
                  </div>
                )}

                {selectedReq.status === 'rejected' && (
                  <div className="flex items-start gap-3">
                    <div className="w-6 h-6 rounded-full bg-rose-500/20 text-rose-400 flex items-center justify-center shrink-0 border border-rose-500/30 text-[10px] font-bold">
                      2
                    </div>
                    <div>
                      <p className="font-bold text-white">Rejected by Faculty ({selectedReq.approved_by_name || 'Prof. Robert Chen'})</p>
                      <p className="text-[10px] text-slate-400">Reason: <span className="text-rose-300 italic">"{selectedReq.rejection_reason || 'Stock limitations'}"</span></p>
                    </div>
                  </div>
                )}

                {selectedReq.return_requested_at && (
                  <div className="flex items-start gap-3">
                    <div className="w-6 h-6 rounded-full bg-amber-500/20 text-amber-400 flex items-center justify-center shrink-0 border border-amber-500/30 text-[10px] font-bold">
                      3
                    </div>
                    <div>
                      <p className="font-bold text-white">Return Requested by Student</p>
                      <p className="text-[10px] text-slate-400">{new Date(selectedReq.return_requested_at).toLocaleString()}</p>
                    </div>
                  </div>
                )}

                {selectedReq.returned_at && (
                  <div className="flex items-start gap-3">
                    <div className="w-6 h-6 rounded-full bg-indigo-500/20 text-indigo-400 flex items-center justify-center shrink-0 border border-indigo-500/30 text-[10px] font-bold">
                      4
                    </div>
                    <div>
                      <p className="font-bold text-white">Returned & Verified</p>
                      <p className="text-[10px] text-slate-400">{new Date(selectedReq.returned_at).toLocaleString()}</p>
                      <div className="mt-1 space-y-0.5 p-2 rounded-xl bg-slate-950/60 border border-white/5 text-[10px]">
                        <p className="text-slate-400">Missing Accessories: <span className="text-rose-300 font-semibold">{selectedReq.return_missing_details || 'None'}</span></p>
                        <p className="text-slate-400">Damaged Parts: <span className="text-rose-300 font-semibold">{selectedReq.return_damaged_details || 'None'}</span></p>
                        <p className="text-slate-400">Remarks: <span className="text-slate-300 font-semibold">{selectedReq.return_remarks || 'None'}</span></p>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>

            <div className="pt-3 border-t border-white/10 flex items-center justify-end">
              <button onClick={() => setSelectedReq(null)} className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 hover:text-white text-xs">
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
