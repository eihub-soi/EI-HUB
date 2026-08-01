import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { client as tursoClient, isTursoConfigured } from '../turso/client';
import { sendBrevoPasswordResetLink } from '../utils/brevoService';
import { toast } from 'sonner';
import { Mail, ArrowLeft, KeyRound, CheckCircle, RefreshCw } from 'lucide-react';
import { sendPasswordResetEmail } from 'firebase/auth';
import { auth as firebaseAuth, isFirebaseConfigured, firebaseConfig } from '../firebase/client';

export const ForgotPasswordPage: React.FC = () => {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSent, setIsSent] = useState(false);


  const handleSendLink = async (e: React.FormEvent) => {
    e.preventDefault();
    const normalizedEmail = email.toLowerCase().trim();
    if (!normalizedEmail) {
      toast.error('Please enter your Email ID.');
      return;
    }

    // Email format validation check
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(normalizedEmail)) {
      toast.error('Please enter a valid email address format.');
      return;
    }

    // Institutional domain constraint
    const isBrevoOwner = normalizedEmail === 'eihubsoi@gmail.com';
    if (!normalizedEmail.endsWith('@kgkite.ac.in') && !isBrevoOwner) {
      toast.error('Please use only your authorized @kgkite.ac.in email ID.');
      return;
    }

    setIsLoading(true);
    try {
      if (!isTursoConfigured) {
        throw new Error('Database connection is not configured.');
      }

      // 1. Check if the user exists in our Turso profiles database
      const profileRes = await tursoClient.execute({
        sql: 'SELECT full_name FROM profiles WHERE email = ?',
        args: [normalizedEmail]
      });

      const profile = profileRes.rows && profileRes.rows.length > 0 ? profileRes.rows[0] : null;

      if (profile) {
        if (isFirebaseConfigured && firebaseConfig.apiKey) {
          // 2. Request the password reset link from our backend API programmatically
          const res = await fetch('/api/auth/reset-link', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              email: normalizedEmail,
            }),
          });

          const data = await res.json();
          if (!res.ok) {
            throw new Error(data.detail || 'Failed to generate Firebase password reset link.');
          }

          const firebaseResetLink = data.oobLink;
          const fullName = (profile.full_name as string) || 'User';

          // 3. Send the raw Firebase reset link directly using our Brevo custom email template
          await sendBrevoPasswordResetLink(normalizedEmail, fullName, firebaseResetLink);
        } else {
          // Fallback custom token flow via Brevo
          const fullName = (profile.full_name as string) || 'User';

          // 2. Generate a secure, unique reset token
          const token = Math.random().toString(36).substring(2, 15) + Date.now().toString(36);
          const expiresAt = new Date(Date.now() + 15 * 60 * 1000).toISOString(); // 15 mins expiry

          // 3. Store the token in Turso password_resets table
          await tursoClient.execute({
            sql: 'INSERT OR REPLACE INTO password_resets (email, token, expires_at) VALUES (?, ?, ?)',
            args: [normalizedEmail, token, expiresAt]
          });

          // 4. Construct custom reset landing URL pointing to our custom reset-password route
          const resetLink = `${window.location.origin}/reset-password?email=${encodeURIComponent(normalizedEmail)}&token=${token}`;

          // 5. Send custom reset link email via Brevo
          await sendBrevoPasswordResetLink(normalizedEmail, fullName, resetLink);
        }
      }

      // Display success message (always show success to prevent email enumeration)
      setIsSent(true);
      toast.success(`If the email exists, a password reset link has been sent successfully.`);
    } catch (err: any) {
      console.error('[ForgotPassword] Failed to generate custom reset link:', err);
      toast.error(err.message || 'Failed to dispatch reset email. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-950 p-4 relative overflow-hidden select-none">
      {/* Background Gradients */}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-indigo-600/10 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-emerald-600/10 rounded-full blur-[120px] pointer-events-none" />

      <div className="w-full max-w-md glass-card border border-white/10 rounded-[32px] p-8 shadow-2xl space-y-6 relative z-10">
        <div className="text-center space-y-2">
          <div className="inline-flex p-3 rounded-2xl bg-indigo-500/15 border border-indigo-500/25 text-indigo-400 mb-2">
            <KeyRound className="w-6 h-6 animate-pulse" />
          </div>
          <h1 className="text-xl sm:text-2xl font-black text-white tracking-tight">Forgot Password?</h1>
          <p className="text-xs text-slate-400">Request a secure credential sync link via Brevo Email</p>
        </div>

        {!isSent ? (
          <form onSubmit={handleSendLink} className="space-y-5 text-xs">
            <div className="space-y-1.5">
              <label className="block text-slate-300 font-semibold mb-1">Email Address</label>
              <div className="relative">
                <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="yourname@kgkite.ac.in"
                  className="w-full pl-10 pr-4 py-2.5 rounded-2xl glass-input text-white text-xs font-medium"
                  required
                  disabled={isLoading}
                  autoFocus
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-3 rounded-2xl bg-indigo-600 hover:bg-indigo-500 text-white font-extrabold text-xs shadow-indigo-glow flex items-center justify-center gap-2 transition-all hover:scale-[1.02] disabled:opacity-50"
            >
              {isLoading ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>Processing...</span>
                </>
              ) : (
                <span>Send Reset Link</span>
              )}
            </button>
          </form>
        ) : (
          <div className="space-y-6 text-center">
            <div className="flex flex-col items-center p-5 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 space-y-3">
              <CheckCircle className="w-8 h-8 text-emerald-400" />
              <div className="space-y-1">
                <p className="text-xs text-emerald-300 font-semibold leading-relaxed">
                  A password reset link has been sent to your email.
                </p>
                <p className="text-[10px] text-slate-400 leading-normal">
                  Please check your inbox and spam folder. Click the link in the email to set a new password.
                </p>
              </div>
            </div>

            <div className="space-y-2">
              <button
                onClick={handleSendLink}
                disabled={isLoading}
                className="w-full py-3 rounded-2xl bg-slate-900 border border-slate-700 hover:border-slate-500 disabled:border-slate-800 disabled:text-slate-600 text-white font-bold text-xs flex items-center justify-center gap-2 transition-all"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
                <span>Resend Reset Link</span>
              </button>
            </div>
          </div>
        )}

        <button
          onClick={() => navigate('/')}
          className="w-full py-3 rounded-2xl bg-white/5 border border-white/10 hover:bg-white/10 text-slate-300 hover:text-white font-bold text-xs flex items-center justify-center gap-2 transition-all"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Login</span>
        </button>
      </div>
    </div>
  );
};
