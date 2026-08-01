import React, { useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { turso, isTursoConfigured } from '../../turso/client';
import { mockEngine } from '../../services/mockEngine';
import { isFirebaseConfigured } from '../../firebase/client';
import { Mail, GraduationCap, ShieldCheck, Phone, Edit2, Check, X, ShieldAlert } from 'lucide-react';
import { toast } from 'sonner';

export const StudentProfile: React.FC = () => {
  const { user, setUser } = useAuth();
  const [isEditing, setIsEditing] = useState(false);
  const [phoneInput, setPhoneInput] = useState(user?.phone ? user.phone.replace(/\D/g, '').slice(-10) : '');
  const [isSaving, setIsSaving] = useState(false);

  if (!user) return null;

  const handleSavePhone = async (e: React.FormEvent) => {
    e.preventDefault();
    const sanitized = phoneInput.replace(/\D/g, '');
    if (sanitized.length !== 10) {
      toast.error('Please enter a valid 10-digit mobile number');
      return;
    }

    const formattedPhone = `+91 ${sanitized.slice(0, 5)} ${sanitized.slice(5)}`;
    setIsSaving(true);

    try {
      await mockEngine.updateProfile(user.id, { phone: formattedPhone });

      setUser({
        ...user,
        phone: formattedPhone
      });
      
      toast.success('Mobile number updated successfully!');
      setIsEditing(false);
    } catch (err: any) {
      console.error('Error updating phone number:', err);
      toast.error(err.message || 'Failed to update mobile number');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="max-w-3xl space-y-6">
      <div>
        <h1 className="text-2xl font-extrabold text-white tracking-tight">
          {user.role === 'student' ? 'Student Profile' : user.role === 'faculty' ? 'Faculty Profile' : 'Administrator Profile'}
        </h1>
        <p className="text-xs text-slate-400 mt-0.5">Manage your lab identification credentials and contact details</p>
      </div>

      <div className="p-6 rounded-3xl glass-card border border-white/10 space-y-6">
        <div className="flex flex-col sm:flex-row items-center sm:items-start gap-4 border-b border-white/10 pb-6 text-center sm:text-left">
          <img
            src={user.avatar_url || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80'}
            alt={user.full_name}
            className="w-20 h-20 rounded-3xl object-cover ring-4 ring-indigo-500/30"
          />
          <div>
            <h2 className="text-xl font-bold text-white">{user.full_name}</h2>
            {user.role === 'student' && (
              <p className="text-xs text-slate-400 font-mono mt-0.5">Reg No: {user.register_number || 'N/A'}</p>
            )}
            {user.role === 'faculty' && (
              <p className="text-xs text-slate-400 font-mono mt-0.5">Faculty ID: {user.id.slice(0, 8).toUpperCase()}</p>
            )}
            <span className="mt-2 inline-block px-3 py-0.5 rounded-full text-[10px] font-bold bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
              Department of {user.department || 'Electronics & Instrumentation (EIE)'}
            </span>
          </div>
        </div>

        <div className="p-3 rounded-2xl bg-indigo-950/20 border border-indigo-500/20 text-[10px] text-slate-400 flex items-start gap-2">
          <ShieldAlert className="w-4 h-4 text-indigo-400 shrink-0 mt-0.5" />
          <p>
            For security, core identification details (Name, Department, Role, and ID) are synchronized with institutional directories and cannot be modified. You may only manage your contact mobile number.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
          {/* Email Address - Static */}
          <div className="p-4 rounded-2xl bg-slate-900/60 border border-white/5 space-y-1">
            <p className="text-slate-400 text-[10px] flex items-center gap-1.5">
              <Mail className="w-3.5 h-3.5 text-indigo-400" /> Email Address
            </p>
            <p className="font-semibold text-white">{user.email || 'N/A'}</p>
          </div>

          {/* Mobile Number - Editable */}
          <div className="p-4 rounded-2xl bg-slate-900/60 border border-white/5 space-y-1 relative group">
            <p className="text-slate-400 text-[10px] flex items-center gap-1.5">
              <Phone className="w-3.5 h-3.5 text-indigo-400" /> Mobile Number
            </p>
            
            {isEditing ? (
              <form onSubmit={handleSavePhone} className="flex items-center gap-2 pt-1">
                <input
                  type="tel"
                  maxLength={10}
                  value={phoneInput}
                  onChange={(e) => setPhoneInput(e.target.value.replace(/\D/g, '').slice(0, 10))}
                  placeholder="9876543210"
                  className="bg-slate-950/80 border border-indigo-500/30 rounded-xl px-2 py-1 text-white font-semibold w-full max-w-[150px] outline-none focus:border-indigo-500 text-xs"
                  autoFocus
                  required
                />
                <button
                  type="submit"
                  disabled={isSaving}
                  className="p-1 rounded-lg bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30 border border-emerald-500/30"
                  title="Save"
                >
                  <Check className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setPhoneInput(user?.phone ? user.phone.replace(/\D/g, '').slice(-10) : '');
                    setIsEditing(false);
                  }}
                  className="p-1 rounded-lg bg-rose-500/20 text-rose-400 hover:bg-rose-500/30 border border-rose-500/30"
                  title="Cancel"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </form>
            ) : (
              <div className="flex items-center justify-between pt-0.5">
                <p className="font-semibold text-white">{user.phone || 'No mobile number added'}</p>
                <button
                  onClick={() => setIsEditing(true)}
                  className="text-slate-400 hover:text-indigo-400 p-1 rounded-lg hover:bg-slate-800/60 transition-all"
                  title="Edit Mobile Number"
                >
                  <Edit2 className="w-3.5 h-3.5" />
                </button>
              </div>
            )}
          </div>

          {/* Role Privilege */}
          <div className="p-4 rounded-2xl bg-slate-900/60 border border-white/5 space-y-1">
            <p className="text-slate-400 text-[10px] flex items-center gap-1.5">
              <ShieldCheck className="w-3.5 h-3.5 text-indigo-400" /> Role Privilege
            </p>
            <p className="font-semibold text-white capitalize">{user.role}</p>
          </div>

          {/* Department */}
          <div className="p-4 rounded-2xl bg-slate-900/60 border border-white/5 space-y-1">
            <p className="text-slate-400 text-[10px] flex items-center gap-1.5">
              <GraduationCap className="w-3.5 h-3.5 text-indigo-400" /> Department
            </p>
            <p className="font-semibold text-white">{user.department || 'Electronics & Instrumentation (EIE)'}</p>
          </div>

          {/* Institution */}
          <div className="p-4 rounded-2xl bg-slate-900/60 border border-white/5 space-y-1">
            <p className="text-slate-400 text-[10px] flex items-center gap-1.5">
              <GraduationCap className="w-3.5 h-3.5 text-indigo-400" /> Institution / College
            </p>
            <p className="font-semibold text-white">{user.institution || 'KGISL Institute of Technology'}</p>
          </div>

          {/* Account Status */}
          <div className="p-4 rounded-2xl bg-slate-900/60 border border-white/5 space-y-1">
            <p className="text-slate-400 text-[10px] flex items-center gap-1.5">
              <ShieldCheck className={`w-3.5 h-3.5 ${user.is_active ? 'text-emerald-400' : 'text-rose-400'}`} /> Account Status
            </p>
            <p className={`font-semibold ${user.is_active ? 'text-emerald-400' : 'text-rose-400'}`}>
              {user.is_active ? 'Verified & Active' : 'Suspended'}
            </p>
          </div>

          {user.role === 'student' && (
            <>
              {/* Register Number */}
              <div className="p-4 rounded-2xl bg-slate-900/60 border border-white/5 space-y-1">
                <p className="text-slate-400 text-[10px] flex items-center gap-1.5">
                  <GraduationCap className="w-3.5 h-3.5 text-indigo-400" /> Register Number
                </p>
                <p className="font-semibold text-white font-mono">{user.register_number || 'N/A'}</p>
              </div>

              {/* Roll Number */}
              <div className="p-4 rounded-2xl bg-slate-900/60 border border-white/5 space-y-1">
                <p className="text-slate-400 text-[10px] flex items-center gap-1.5">
                  <GraduationCap className="w-3.5 h-3.5 text-indigo-400" /> Roll Number
                </p>
                <p className="font-semibold text-white font-mono">{user.roll_number || 'N/A'}</p>
              </div>
            </>
          )}

          {user.role === 'faculty' && (
            <div className="p-4 rounded-2xl bg-slate-900/60 border border-white/5 space-y-1">
              <p className="text-slate-400 text-[10px] flex items-center gap-1.5">
                <GraduationCap className="w-3.5 h-3.5 text-indigo-400" /> Faculty ID
              </p>
              <p className="font-semibold text-white font-mono">{user.faculty_id || 'N/A'}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
