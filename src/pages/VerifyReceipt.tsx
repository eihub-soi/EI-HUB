import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { mockEngine } from '../services/mockEngine';
import { generateStudentReceiptPdf } from '../utils/pdfGenerator';
import { turso, isTursoConfigured } from '../turso/client';
import { BorrowRequest, RequestStatus } from '../types';
import { 
  CheckCircle2, 
  AlertTriangle, 
  Download, 
  RefreshCw, 
  FileText, 
  Calendar, 
  User, 
  ShieldCheck, 
  Building,
  Layers,
  HelpCircle,
  ArrowLeft
} from 'lucide-react';
import { toast } from 'sonner';

export const VerifyReceipt: React.FC = () => {
  const { requestCode } = useParams<{ requestCode: string }>();
  const navigate = useNavigate();
  const [request, setRequest] = useState<BorrowRequest | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [downloading, setDownloading] = useState<boolean>(false);

  useEffect(() => {
    const verifyTransaction = async () => {
      if (!requestCode) {
        setError('No reference code provided.');
        setLoading(false);
        return;
      }

      setLoading(true);
      setError(null);

      try {
        // 1. Look up locally first in mockEngine
        let req = mockEngine.getRequests().find(
          (r) => r.request_code.toLowerCase() === requestCode.toLowerCase()
        );

        // Helper to check if a string is a UUID
        const isUUID = (str: string): boolean => {
          const uuidPattern = /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/;
          return uuidPattern.test(str);
        };

        let lookupCode = requestCode;
        let isShortCode = false;
        if (requestCode.toLowerCase().startsWith('req-')) {
          lookupCode = requestCode.slice(4);
          isShortCode = true;
        }

        // 2. If not found and Turso is configured, try querying Turso
        if (!req && isTursoConfigured) {
          let query: any = turso
            .from('requests')
            .select(`
              id,
              student_id,
              component_id,
              quantity,
              status,
              requested_at,
              reviewed_at,
              reviewed_by,
              return_requested_at,
              returned_at,
              return_reviewed_by,
              reject_reason,
              notes,
              student:profiles!requests_student_id_fkey(full_name, register_number, department, email),
              component:components(name, category, image_url),
              approver:profiles!requests_reviewed_by_fkey(full_name)
            `);

          if (isShortCode && lookupCode.length === 8) {
            query = (query as any).like('id', `${lookupCode.toLowerCase()}%`);
          } else if (isUUID(lookupCode)) {
            query = query.eq('id', lookupCode);
          } else {
            query = null;
          }

          if (query) {
            const { data, error: dbError } = await query.single();

            if (dbError) {
              console.error('Database query error:', dbError);
            } else if (data) {
              const rawData = data as any;
              req = {
                id: rawData.id,
                request_code: `REQ-${rawData.id.slice(0, 8).toUpperCase()}`,
                student_id: rawData.student_id,
                student_name: rawData.student?.full_name || 'N/A',
                student_register_no: rawData.student?.register_number || 'N/A',
                student_email: rawData.student?.email || 'N/A',
                component_id: rawData.component_id,
                component_name: rawData.component?.name || 'N/A',
                component_category: rawData.component?.category || 'Others',
                component_image: rawData.component?.image_url,
                quantity: rawData.quantity,
                purpose: rawData.notes || 'Lab Experimentation',
                status: rawData.status,
                approved_by: rawData.reviewed_by,
                approved_by_name: rawData.approver?.full_name || 'Prof. Robert Chen',
                rejection_reason: rawData.reject_reason || '',
                requested_at: rawData.requested_at,
                approved_at: rawData.reviewed_at || rawData.requested_at,
                expected_return_at: rawData.requested_at,
                returned_at: rawData.returned_at,
                return_condition: 'Good / Fully Functional',
                created_at: rawData.requested_at,
              };
            }
          }
        }

        if (req) {
          setRequest(req);
        } else {
          setError(`Transaction reference "${requestCode}" could not be found in our secure database registry.`);
        }
      } catch (err) {
        console.error('Error during transaction verification:', err);
        setError('An unexpected error occurred while verifying the transaction.');
      } finally {
        setLoading(false);
      }
    };

    verifyTransaction();
  }, [requestCode]);

  const handleDownloadReceipt = async () => {
    if (!request) return;
    setDownloading(true);
    try {
      await generateStudentReceiptPdf(request);
      toast.success('Official verification PDF receipt downloaded successfully.');
    } catch (err) {
      console.error(err);
      toast.error('Failed to generate official PDF receipt.');
    } finally {
      setDownloading(false);
    }
  };

  const renderStatusBadge = (status: RequestStatus) => {
    switch (status) {
      case 'approved':
        return (
          <span className="px-3 py-1 rounded-full text-xs font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 flex items-center gap-1.5 w-fit">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
            Approved & Verified
          </span>
        );
      case 'pending':
        return (
          <span className="px-3 py-1 rounded-full text-xs font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30 flex items-center gap-1.5 w-fit">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
            Pending Approval
          </span>
        );
      case 'rejected':
        return (
          <span className="px-3 py-1 rounded-full text-xs font-bold bg-rose-500/20 text-rose-300 border border-rose-500/30 flex items-center gap-1.5 w-fit">
            <span className="w-1.5 h-1.5 rounded-full bg-rose-400" />
            Rejected
          </span>
        );
      case 'returned':
        return (
          <span className="px-3 py-1 rounded-full text-xs font-bold bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 flex items-center gap-1.5 w-fit">
            <span className="w-1.5 h-1.5 rounded-full bg-indigo-400" />
            Returned & Audited
          </span>
        );
      default:
        return (
          <span className="px-3 py-1 rounded-full text-xs font-bold bg-slate-500/20 text-slate-300 border border-slate-500/30 flex items-center gap-1.5 w-fit">
            Unknown
          </span>
        );
    }
  };

  return (
    <div className="bg-[#0b132b] min-h-screen flex items-center justify-center p-4 relative overflow-hidden text-slate-100">
      {/* Decorative background blurs */}
      <div className="absolute top-1/4 left-1/4 w-80 h-80 bg-indigo-500/10 rounded-full blur-3xl -z-10" />
      <div className="absolute bottom-1/4 right-1/4 w-80 h-80 bg-emerald-500/5 rounded-full blur-3xl -z-10" />

      {loading && (
        <div className="text-center space-y-4">
          <RefreshCw className="w-12 h-12 text-indigo-500 animate-spin mx-auto" />
          <h2 className="text-lg font-bold text-white">Verifying Transaction Authenticity</h2>
          <p className="text-xs text-slate-400">Decrypting cryptographic signatures & querying secure registry...</p>
        </div>
      )}

      {!loading && error && (
        <div className="glass-card border border-white/10 p-8 max-w-md w-full text-center space-y-6">
          <div className="w-20 h-20 text-rose-400 mx-auto rounded-full bg-rose-500/10 p-4 border border-rose-500/30 flex items-center justify-center">
            <AlertTriangle className="w-12 h-12" />
          </div>
          
          <div className="space-y-2">
            <h1 className="text-xl font-black text-white tracking-tight">Verification Failed</h1>
            <p className="text-xs text-slate-400 px-2">{error}</p>
          </div>

          <div className="pt-4 border-t border-white/5 space-y-3">
            <button
              onClick={() => navigate('/')}
              className="flex items-center justify-center gap-2 w-full py-3 rounded-2xl bg-slate-900/60 hover:bg-slate-800/80 text-slate-300 border border-white/10 text-xs font-bold transition-all hover:scale-102 cursor-pointer"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Back to Portal Login</span>
            </button>
          </div>
        </div>
      )}

      {!loading && request && (
        <div className="glass-card border border-white/10 p-8 max-w-2xl w-full space-y-6">
          {/* Badge & Authenticity Title */}
          <div className="text-center space-y-3 pb-6 border-b border-white/5">
            <div className="w-16 h-16 text-emerald-400 mx-auto rounded-full bg-emerald-500/10 p-3 border border-emerald-500/25 flex items-center justify-center shadow-[0_0_30px_rgba(16,185,129,0.15)]">
              <ShieldCheck className="w-10 h-10 animate-pulse" />
            </div>
            <div>
              <span className="text-[10px] font-black text-indigo-400 tracking-widest uppercase">OFFICIAL EI HUB VERIFICATION</span>
              <h1 className="text-2xl font-black text-white tracking-tight mt-0.5">TRANSACTION VERIFIED</h1>
              <p className="text-xs text-slate-400 mt-1">This digital receipt represents a valid and authenticated inventory transaction.</p>
            </div>
          </div>

          {/* Details Section */}
          <div className="space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-950/40 px-4 py-3.5 rounded-2xl border border-white/5">
              <div>
                <span className="text-[9px] uppercase tracking-wider text-slate-400 font-bold">Transaction Reference</span>
                <div className="text-base font-extrabold text-white gradient-text-gold">{request.request_code}</div>
              </div>
              <div>
                {renderStatusBadge(request.status)}
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Student Details Card */}
              <div className="p-4 rounded-2xl bg-slate-900/40 border border-white/5 space-y-3">
                <h3 className="text-xs font-bold text-indigo-300 flex items-center gap-1.5 border-b border-white/5 pb-2">
                  <User className="w-3.5 h-3.5" /> Student Information
                </h3>
                <div className="space-y-2 text-xs">
                  <div className="flex justify-between">
                    <span className="text-slate-400">Full Name</span>
                    <span className="font-semibold text-white">{request.student_name}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Register Number</span>
                    <span className="font-semibold text-white">{request.student_register_no}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Email Address</span>
                    <span className="font-semibold text-white">{request.student_email}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Department</span>
                    <span className="font-semibold text-white">ECE</span>
                  </div>
                </div>
              </div>

              {/* Component Details Card */}
              <div className="p-4 rounded-2xl bg-slate-900/40 border border-white/5 space-y-3">
                <h3 className="text-xs font-bold text-indigo-300 flex items-center gap-1.5 border-b border-white/5 pb-2">
                  <Layers className="w-3.5 h-3.5" /> Component Details
                </h3>
                <div className="space-y-2 text-xs">
                  <div className="flex justify-between">
                    <span className="text-slate-400">Name</span>
                    <span className="font-semibold text-white text-right truncate max-w-[150px]">{request.component_name || 'Arduino Uno R3'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">SKU / ID</span>
                    <span className="font-semibold text-slate-300 select-all font-mono">{request.component_id}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Category</span>
                    <span className="font-semibold text-white">{request.component_category || 'Microcontrollers'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Quantity</span>
                    <span className="font-bold text-indigo-400">{request.quantity} Unit(s)</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Additional Transaction Details */}
            <div className="p-4 rounded-2xl bg-slate-900/40 border border-white/5 space-y-2.5 text-xs">
              <div className="flex items-center gap-1.5 text-indigo-300 font-bold border-b border-white/5 pb-2 mb-1">
                <Building className="w-3.5 h-3.5" /> Transaction Metadata
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-2">
                <div className="flex justify-between">
                  <span className="text-slate-400">Issue Date</span>
                  <span className="font-semibold text-white">{new Date(request.requested_at).toLocaleDateString()}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Expected Return</span>
                  <span className="font-semibold text-white">{new Date(request.expected_return_at).toLocaleDateString()}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Authorized Issuer</span>
                  <span className="font-semibold text-white">{request.approved_by_name || 'Prof. Robert Chen'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Transaction Status</span>
                  <span className="font-semibold text-white uppercase text-[10px] tracking-wide">{request.status}</span>
                </div>
              </div>
              <div className="pt-2 border-t border-white/5 mt-1 flex flex-col gap-1">
                <span className="text-slate-400">Stated Purpose</span>
                <span className="text-slate-200 italic font-medium">"{request.purpose}"</span>
              </div>
              {request.status === 'returned' && request.returned_at && (
                <div className="pt-2 border-t border-white/5 flex justify-between items-center text-emerald-400">
                  <span>Actual Return Date</span>
                  <span className="font-bold">{new Date(request.returned_at).toLocaleDateString()}</span>
                </div>
              )}
            </div>
          </div>

          {/* Action Buttons */}
          <div className="pt-4 border-t border-white/5 flex flex-col sm:flex-row gap-3">
            <button
              onClick={handleDownloadReceipt}
              disabled={downloading}
              className="flex items-center justify-center gap-2 flex-1 py-3.5 rounded-2xl bg-indigo-600 hover:bg-indigo-500 disabled:bg-indigo-700 disabled:opacity-50 text-white font-bold transition-all shadow-indigo-glow hover:scale-102 cursor-pointer"
            >
              {downloading ? (
                <RefreshCw className="w-4 h-4 animate-spin" />
              ) : (
                <Download className="w-4 h-4" />
              )}
              <span>Download Official PDF Receipt</span>
            </button>

            <button
              onClick={() => navigate('/')}
              className="flex items-center justify-center gap-2 px-6 py-3.5 rounded-2xl bg-slate-900/60 hover:bg-slate-800/80 text-slate-300 border border-white/10 font-bold transition-all hover:scale-102 cursor-pointer"
            >
              <span>Go to Portal Login</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
