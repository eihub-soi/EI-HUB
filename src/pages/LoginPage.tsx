import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { mockEngine } from '../services/mockEngine';
import { UserRole } from '../types';
import { toast } from 'sonner';
import { turso, isTursoConfigured } from '../turso/client';
import { auth as firebaseAuth, db as firestoreDb, isFirebaseConfigured, firebaseConfig } from '../firebase/client';
import { initializeApp, deleteApp } from 'firebase/app';
import { createUserWithEmailAndPassword, sendPasswordResetEmail, getAuth } from 'firebase/auth';
import { doc, setDoc } from 'firebase/firestore';
import { sendBrevoOtp } from '../utils/brevoService';
import { 
  Sparkles, 
  GraduationCap, 
  Briefcase, 
  Shield, 
  Mail, 
  ArrowRight, 
  Eye, 
  EyeOff,
  KeyRound,
  User,
  Building2,
  BookOpen,
  Calendar,
  ShieldCheck,
  X,
  CheckCircle2,
  Phone,
  Hash
} from 'lucide-react';

export const LoginPage: React.FC = () => {
  const { switchRole, loginWithEmail, loginWithGoogle } = useAuth();
  const navigate = useNavigate();

  // Mode: 'login' or 'register'
  const [authMode, setAuthMode] = useState<'login' | 'register'>('login');

  // Login Form State
  const [activeTab, setActiveTab] = useState<UserRole>('student');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [googleError, setGoogleError] = useState('');
  const [loginError, setLoginError] = useState('');

  // Student Registration Form State
  const [regFullName, setRegFullName] = useState('');
  const [regInstitution, setRegInstitution] = useState('KGISL Institute of Technology');
  const [regDepartment, setRegDepartment] = useState('Electronics & Instrumentation Engineering (EIE)');
  const [regYear, setRegYear] = useState('3rd Year');
  const [regEmail, setRegEmail] = useState('');
  const [regPassword, setRegPassword] = useState('');
  const [regConfirmPassword, setRegConfirmPassword] = useState('');
  const [showRegPassword, setShowRegPassword] = useState(false);
  const [regPhone, setRegPhone] = useState('');
  const [regRegisterNumber, setRegRegisterNumber] = useState('');
  const [regRollNumber, setRegRollNumber] = useState('');

  // OTP Verification Modal State
  const [showOtpModal, setShowOtpModal] = useState(false);
  const [generatedOtp, setGeneratedOtp] = useState('');
  const [inputOtp, setInputOtp] = useState('');
  const [otpTimer, setOtpTimer] = useState(60);

  // Clear credentials when switching login tabs
  const handleTabChange = (role: UserRole) => {
    setActiveTab(role);
    setGoogleError('');
    setLoginError('');
    setEmail('');
    setPassword('');
  };

  const handleForgotPassword = () => {
    navigate('/forgot-password');
  };

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !password.trim()) {
      toast.error('Please enter email and password');
      return;
    }

    const isBrevoOwner = email.toLowerCase() === 'eihubsoi@gmail.com';
    if (!email.toLowerCase().endsWith('@kgkite.ac.in') && !isBrevoOwner) {
      toast.error('use only @kgkite.ac.in mail id');
      return;
    }

    setIsLoading(true);
    setLoginError('');
    try {
      await loginWithEmail(email, password, activeTab);
      toast.success(`Successfully logged in as ${activeTab.toUpperCase()}!`);
      
      // Redirect to respective dashboard
      if (activeTab === 'student') navigate('/student/dashboard');
      else if (activeTab === 'faculty') navigate('/faculty/dashboard');
      else navigate('/admin/dashboard');
    } catch (err: any) {
      // Suppress logging login failures to the console to comply with user's console hygiene requirement
      setLoginError('Invalid Email ID/Password');
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setIsLoading(true);
    setGoogleError('');
    try {
      const targetRole = authMode === 'login' ? activeTab : 'student';
      await loginWithGoogle(targetRole);
      toast.success(`Successfully authenticated via Google as ${targetRole.toUpperCase()}!`);
      if (targetRole === 'student') navigate('/student/dashboard');
      else if (targetRole === 'faculty') navigate('/faculty/dashboard');
      else navigate('/admin/dashboard');
    } catch (err: any) {
      toast.error(err.message || 'Google Sign-In failed');
      if (err.message?.includes('use only @kgkite.ac.in')) {
        setGoogleError('use only @kgkite.ac.in');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleRegisterSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!regFullName.trim() || !regEmail.trim() || !regPassword.trim() || !regPhone.trim()) {
      toast.error('Please fill in all required fields');
      return;
    }
    const isBrevoOwner = regEmail.toLowerCase() === 'eihubsoi@gmail.com';
    if (!regEmail.toLowerCase().endsWith('@kgkite.ac.in') && !isBrevoOwner) {
      toast.error('use only @kgkite.ac.in mail id');
      return;
    }
    if (regRegisterNumber.trim().length < 4) {
      toast.error('Please enter a valid registration number (at least 4 characters)');
      return;
    }
    if (regPhone.length !== 10) {
      toast.error('Please enter a valid 10-digit mobile number');
      return;
    }
    if (regPassword !== regConfirmPassword) {
      toast.error('Passwords do not match. Please re-enter your password.');
      return;
    }
    if (regPassword.length < 6) {
      toast.error('Password must be at least 6 characters long.');
      return;
    }

    // Generate random 6-digit OTP
    const code = Math.floor(100000 + Math.random() * 900000).toString();
    setGeneratedOtp(code);
    setInputOtp('');
    setShowOtpModal(true);

    const sendOtpEmail = async () => {
      try {
        await sendBrevoOtp(regEmail, code);
        toast.success(`🔑 Verification OTP successfully sent to ${regEmail}!`);
      } catch (err: any) {
        console.warn('[Brevo API Error] Failed sending via Brevo API. Error details:', err);
        console.log('[Brevo Fallback Dev Mode] Generated OTP is:', code);
        toast.error(`❌ Brevo failed to send email: ${err.message || err}. (Dev: check console log for OTP)`);
      }
    };

    sendOtpEmail();
  };

  const handleVerifyOtpSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (inputOtp.trim() !== generatedOtp) {
      toast.error('Invalid OTP verification code. Please check and try again.');
      return;
    }

    setIsLoading(true);
    try {
      if (isFirebaseConfigured && firebaseAuth) {
        // Sign up with Firebase Auth
        const userCredential = await createUserWithEmailAndPassword(firebaseAuth, regEmail, regPassword);
        if (userCredential.user) {
          const profileId = crypto.randomUUID();

          // 1. Insert profile record in Firebase Firestore if configured
          if (firestoreDb) {
            try {
              await setDoc(doc(firestoreDb, 'profiles', profileId), {
                id: profileId,
                firebase_uid: userCredential.user.uid,
                email: regEmail.toLowerCase(),
                full_name: regFullName,
                role: 'student',
                department: regDepartment,
                phone: regPhone,
                register_number: regRegisterNumber,
                roll_number: regRollNumber,
                institution: regInstitution,
                is_active: true,
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString()
              });
              console.log('[LoginPage] Successfully saved profile to Firebase Firestore');
            } catch (firestoreErr) {
              console.error('[LoginPage] Error writing profile to Firebase Firestore:', firestoreErr);
            }
          }

          // 1.5. If Turso Database is configured, insert credentials into the local credentials store
          if (isTursoConfigured) {
            try {
              const { error: signUpError } = await turso.auth.signUp({
                email: regEmail,
                password: regPassword
              });
              if (signUpError && signUpError.message !== 'User already exists') {
                console.error('[LoginPage] Turso auth creation warning:', signUpError.message);
              }
            } catch (tursoErr) {
              console.warn('[LoginPage] Turso auth signUp failed:', tursoErr);
            }
          }

          // 2. Insert profile record in Turso profiles if configured
          if (isTursoConfigured) {
            const { error: profileError } = await turso
              .from('profiles')
              .insert({
                id: profileId,
                firebase_uid: userCredential.user.uid,
                email: regEmail.toLowerCase(),
                full_name: regFullName,
                role: 'student',
                department: regDepartment,
                phone: regPhone,
                register_number: regRegisterNumber,
                roll_number: regRollNumber,
                institution: regInstitution,
                password: regPassword,
                year_of_study: regYear,
              });
            if (profileError) {
              console.error('Error inserting profiles record directly in Turso:', profileError);
              throw new Error(profileError.message);
            }
          }
        }
      } else if (isTursoConfigured) {
        // Sign up with Turso Auth
        const { data: authData, error: authError } = await turso.auth.signUp({
          email: regEmail,
          password: regPassword,
          options: {
            data: {
              full_name: regFullName,
              role: 'student',
              department: regDepartment,
              year_of_study: regYear,
              institution: regInstitution,
              phone: regPhone,
              register_number: regRegisterNumber,
              roll_number: regRollNumber,
            }
          }
        });
        if (authError) throw authError;

        // Manually insert profile record in case DB trigger is not set up
        if (authData?.user) {
          const { error: profileError } = await turso
            .from('profiles')
            .insert({
              id: authData.user.id,
              email: regEmail.toLowerCase(),
              full_name: regFullName,
              role: 'student',
              department: regDepartment,
              phone: regPhone,
              register_number: regRegisterNumber,
              roll_number: regRollNumber,
              institution: regInstitution,
              password: regPassword,
              year_of_study: regYear,
            });
          if (profileError) {
            console.error('Error inserting profiles record directly:', profileError);
          }
        }
      } else {
        // Create new student profile in mockEngine
        const newStudent = mockEngine.addProfile({
          email: regEmail,
          full_name: regFullName,
          role: 'student',
          department: regDepartment,
          year_of_study: regYear,
          institution: regInstitution,
          register_number: regRegisterNumber,
          roll_number: regRollNumber,
          phone: regPhone,
          is_active: true,
        });

        // Store registration password in localStorage credentials registry
        const credentials = JSON.parse(localStorage.getItem('ei_hub_mock_credentials') || '{}');
        credentials[regEmail.toLowerCase()] = regPassword;
        localStorage.setItem('ei_hub_mock_credentials', JSON.stringify(credentials));
      }

      await loginWithEmail(regEmail, regPassword, 'student');
      toast.success('Email Verified & Account Registered Successfully!');
      setShowOtpModal(false);
      navigate('/student/dashboard');
    } catch (err: any) {
      console.error('Registration error:', err);
      const errCode = err.code || (err.firebaseError && err.firebaseError.code) || '';
      const errMsg = err.message || 'Registration failed';
      toast.error(errCode ? `Error (${errCode}): ${errMsg}` : errMsg);
    } finally {
      setIsLoading(false);
    }
  };



  return (
    <div className="min-h-screen bg-[#0B132B] text-slate-100 flex items-center justify-center p-4 relative overflow-hidden font-['Plus_Jakarta_Sans',sans-serif]">
      
      {/* Background Ambient Glows */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-gradient-to-tr from-indigo-600/20 via-purple-600/10 to-gold-500/10 rounded-full blur-3xl pointer-events-none" />

      <div className="w-full max-w-lg space-y-5 relative z-10 my-8">
        
        {/* Brand Logo & Header */}
        <div className="text-center space-y-2">
          <div className="w-16 h-16 mx-auto rounded-3xl bg-slate-950 p-1 border border-white/20 shadow-2xl ring-4 ring-indigo-500/30 flex items-center justify-center">
            <img src="/logo.png" alt="EI HUB Logo" className="w-full h-full object-contain rounded-2xl" />
          </div>

          <div>
            <h1 className="text-3xl font-extrabold text-white tracking-widest">EI HUB</h1>
            <p className="text-[11px] font-extrabold text-indigo-400 uppercase tracking-widest mt-1">
              Innovate • Invent • Inspire
            </p>
            <p className="text-[11px] text-slate-400 mt-1">KGISL Institute of Technology • Innovation SOI</p>
          </div>
        </div>

        {/* Main Card */}
        <div className="glass-card p-6 sm:p-8 border border-white/15 shadow-2xl rounded-3xl space-y-5 bg-slate-900/80 backdrop-blur-xl">
          
          {/* Main Auth Mode Selector: Sign In vs Student Register */}
          <div className="grid grid-cols-2 gap-1.5 p-1 rounded-2xl bg-slate-950/80 border border-white/10">
            <button
              type="button"
              onClick={() => setAuthMode('login')}
              className={`py-2.5 rounded-xl text-xs font-bold transition-all ${
                authMode === 'login'
                  ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Sign In
            </button>
            <button
              type="button"
              onClick={() => setAuthMode('register')}
              className={`py-2.5 rounded-xl text-xs font-bold transition-all ${
                authMode === 'register'
                  ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Student Register
            </button>
          </div>

          {/* MODE 1: LOGIN FORM */}
          {authMode === 'login' && (
            <div className="space-y-4">
              
              {/* Role Cards Grid matching design */}
              <div className="grid grid-cols-3 gap-3.5 py-1">
                {/* Student Card */}
                <button
                  type="button"
                  onClick={() => handleTabChange('student')}
                  className={`flex flex-col items-center p-3.5 rounded-2xl border transition-all duration-300 ${
                    activeTab === 'student'
                      ? 'border-blue-500 bg-blue-500/10 scale-105 shadow-[0_0_15px_rgba(59,130,246,0.15)] ring-1 ring-blue-500/20'
                      : 'border-white/5 bg-slate-950/20 opacity-50 hover:opacity-85 hover:scale-102'
                  }`}
                >
                  <div className={`w-16 h-16 rounded-full flex items-center justify-center overflow-hidden transition-all duration-300 ${
                    activeTab === 'student' ? 'ring-2 ring-blue-500 bg-blue-50' : 'bg-blue-50/10'
                  }`}>
                    <img src="/avatars/student.png" alt="Student Avatar" className="w-full h-full object-cover" />
                  </div>
                  <span className={`text-[13px] font-extrabold mt-2.5 transition-colors ${
                    activeTab === 'student' ? 'text-blue-400' : 'text-slate-400'
                  }`}>
                    Student
                  </span>
                  <div className={`mt-2 flex items-center gap-1.5 px-3 py-1 rounded-xl text-[9px] font-extrabold tracking-wider uppercase border transition-all ${
                    activeTab === 'student'
                      ? 'bg-blue-500/10 text-blue-300 border-blue-500/20'
                      : 'bg-slate-950/40 text-slate-500 border-white/5'
                  }`}>
                    <GraduationCap className="w-3.5 h-3.5" />
                    <span>Student</span>
                  </div>
                </button>

                {/* Faculty Card */}
                <button
                  type="button"
                  onClick={() => handleTabChange('faculty')}
                  className={`flex flex-col items-center p-3.5 rounded-2xl border transition-all duration-300 ${
                    activeTab === 'faculty'
                      ? 'border-emerald-500 bg-emerald-500/10 scale-105 shadow-[0_0_15px_rgba(16,185,129,0.15)] ring-1 ring-emerald-500/20'
                      : 'border-white/5 bg-slate-950/20 opacity-50 hover:opacity-85 hover:scale-102'
                  }`}
                >
                  <div className={`w-16 h-16 rounded-full flex items-center justify-center overflow-hidden transition-all duration-300 ${
                    activeTab === 'faculty' ? 'ring-2 ring-emerald-500 bg-emerald-50' : 'bg-emerald-50/10'
                  }`}>
                    <img src="/avatars/faculty.png" alt="Faculty Avatar" className="w-full h-full object-cover" />
                  </div>
                  <span className={`text-[13px] font-extrabold mt-2.5 transition-colors ${
                    activeTab === 'faculty' ? 'text-emerald-400' : 'text-slate-400'
                  }`}>
                    Faculty
                  </span>
                  <div className={`mt-2 flex items-center gap-1.5 px-3 py-1 rounded-xl text-[9px] font-extrabold tracking-wider uppercase border transition-all ${
                    activeTab === 'faculty'
                      ? 'bg-emerald-500/10 text-emerald-300 border-emerald-500/20'
                      : 'bg-slate-950/40 text-slate-500 border-white/5'
                  }`}>
                    <Briefcase className="w-3.5 h-3.5" />
                    <span>Faculty</span>
                  </div>
                </button>

                {/* Admin Card */}
                <button
                  type="button"
                  onClick={() => handleTabChange('admin')}
                  className={`flex flex-col items-center p-3.5 rounded-2xl border transition-all duration-300 ${
                    activeTab === 'admin'
                      ? 'border-purple-500 bg-purple-500/10 scale-105 shadow-[0_0_15px_rgba(168,85,247,0.15)] ring-1 ring-purple-500/20'
                      : 'border-white/5 bg-slate-950/20 opacity-50 hover:opacity-85 hover:scale-102'
                  }`}
                >
                  <div className={`w-16 h-16 rounded-full flex items-center justify-center overflow-hidden transition-all duration-300 ${
                    activeTab === 'admin' ? 'ring-2 ring-purple-500 bg-purple-50' : 'bg-purple-50/10'
                  }`}>
                    <img src="/avatars/admin.png" alt="Admin Avatar" className="w-full h-full object-cover" />
                  </div>
                  <span className={`text-[13px] font-extrabold mt-2.5 transition-colors ${
                    activeTab === 'admin' ? 'text-purple-400' : 'text-slate-400'
                  }`}>
                    Admin
                  </span>
                  <div className={`mt-2 flex items-center gap-1.5 px-3 py-1 rounded-xl text-[9px] font-extrabold tracking-wider uppercase border transition-all ${
                    activeTab === 'admin'
                      ? 'bg-purple-500/10 text-purple-300 border-purple-500/20'
                      : 'bg-slate-950/40 text-slate-500 border-white/5'
                  }`}>
                    <Shield className="w-3.5 h-3.5" />
                    <span>Admin</span>
                  </div>
                </button>
              </div>

              {loginError && (
                <div className="p-3.5 rounded-2xl bg-rose-500/15 border border-rose-500/30 text-rose-400 text-[11px] font-bold text-center leading-normal animate-in fade-in slide-in-from-top-2 duration-200">
                  {loginError}
                </div>
              )}

              {/* Login Form */}
              <form onSubmit={handleLoginSubmit} className="space-y-3.5 text-xs">
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">
                    {activeTab === 'student' ? 'Student Email / Reg No' : activeTab === 'faculty' ? 'Faculty Email / ID' : 'Admin Email'}
                  </label>
                  <div className="relative">
                    <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      value={email}
                      onChange={(e) => {
                        setEmail(e.target.value);
                        setGoogleError('');
                        setLoginError('');
                      }}
                      placeholder={activeTab === 'student' ? 'studentname@kgkite.ac.in' : activeTab === 'faculty' ? 'Facultyname@kgkite.ac.in' : 'Adminname@kgkite.ac.in'}
                      className="w-full pl-10 pr-4 py-2.5 rounded-2xl glass-input text-white text-xs font-medium"
                      required
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Password</label>
                  <div className="relative">
                    <KeyRound className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                    <input
                      type={showPassword ? 'text' : 'password'}
                      value={password}
                      onChange={(e) => {
                        setPassword(e.target.value);
                        setLoginError('');
                      }}
                      placeholder="••••••••••••"
                      className="w-full pl-10 pr-10 py-2.5 rounded-2xl glass-input text-white text-xs font-medium"
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                <div className="flex justify-end -mt-1 pb-1">
                  <button
                    type="button"
                    onClick={handleForgotPassword}
                    className="text-[10px] text-indigo-400 hover:text-indigo-300 font-bold transition-all hover:underline"
                  >
                    Forgot Password?
                  </button>
                </div>

                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-full py-3 rounded-2xl bg-indigo-600 hover:bg-indigo-500 text-white font-extrabold text-xs shadow-indigo-glow flex items-center justify-center gap-2 transition-all hover:scale-[1.02]"
                >
                  <span>{isLoading ? 'Signing In...' : `Sign In to ${activeTab.toUpperCase()} Portal`}</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </form>



            </div>
          )}

          {/* MODE 2: STUDENT REGISTRATION FORM */}
          {authMode === 'register' && (
            <div className="space-y-4">
              
              <div className="p-3 rounded-2xl bg-indigo-950/40 border border-indigo-500/30 text-indigo-300 text-[11px]">
                <p className="font-bold flex items-center gap-1.5">
                  <ShieldCheck className="w-4 h-4 text-indigo-400 shrink-0" /> Student Self-Registration
                </p>
                <p className="text-slate-400 mt-0.5">Faculty and Admin accounts are provisioned exclusively by Institutional System Administrators.</p>
              </div>

              <form onSubmit={handleRegisterSubmit} className="space-y-3 text-xs">
                
                {/* Full Name & Institution */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-slate-300 font-semibold mb-1">Full Name</label>
                    <div className="relative">
                      <User className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                      <input
                        type="text"
                        value={regFullName}
                        onChange={(e) => setRegFullName(e.target.value)}
                        placeholder="E.g. Aravind R"
                        className="w-full pl-9 pr-3 py-2 rounded-xl glass-input text-white font-medium"
                        required
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-slate-300 font-semibold mb-1">Institution</label>
                    <div className="relative">
                      <Building2 className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                      <input
                        type="text"
                        value={regInstitution}
                        onChange={(e) => setRegInstitution(e.target.value)}
                        className="w-full pl-9 pr-3 py-2 rounded-xl glass-input text-white font-medium"
                        required
                      />
                    </div>
                  </div>
                </div>

                {/* Department & Year of Study */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-slate-300 font-semibold mb-1">Department</label>
                    <select
                      value={regDepartment}
                      onChange={(e) => setRegDepartment(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl glass-input text-white font-medium"
                    >
                      <option value="Electronics & Instrumentation Engineering (EIE)">Electronics & Instrumentation (EIE)</option>
                      <option value="Electronics & Communication Engineering (ECE)">Electronics & Communication (ECE)</option>
                      <option value="Computer Science Engineering (CSE)">Computer Science (CSE)</option>
                      <option value="Information Technology (IT)">Information Technology (IT)</option>
                      <option value="Electrical & Electronics Engineering (EEE)">Electrical & Electronics (EEE)</option>
                      <option value="Mechanical Engineering">Mechanical Engineering</option>
                      <option value="Artificial Intelligence & Data Science (AIMDS)">Artificial Intelligence & Data Science (AIMDS)</option>
                      <option value="Artificial Intelligence & Machine Learning (AIML)">Artificial Intelligence & Machine Learning (AIML)</option>
                      <option value="Computer Science & Business Systems (CSBS)">Computer Science & Business Systems (CSBS)</option>
                      <option value="Robotics & Automation (R&A)">Robotics & Automation (R&A)</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-slate-300 font-semibold mb-1">Year of Study</label>
                    <select
                      value={regYear}
                      onChange={(e) => setRegYear(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl glass-input text-white font-medium"
                    >
                      <option value="1st Year">1st Year</option>
                      <option value="2nd Year">2nd Year</option>
                      <option value="3rd Year">3rd Year</option>
                      <option value="4th Year">4th Year</option>
                    </select>
                  </div>
                </div>

                {/* Email & Mobile Number */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-slate-300 font-semibold mb-1">Student Email ID</label>
                    <div className="relative">
                      <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                      <input
                        type="email"
                        value={regEmail}
                        onChange={(e) => {
                          setRegEmail(e.target.value);
                          setGoogleError('');
                        }}
                        placeholder="studentname@kgkite.ac.in"
                        className="w-full pl-9 pr-3 py-2 rounded-xl glass-input text-white font-medium"
                        required
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-slate-300 font-semibold mb-1">Mobile Number</label>
                    <div className="relative">
                      <Phone className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                      <input
                        type="tel"
                        value={regPhone}
                        onChange={(e) => setRegPhone(e.target.value.replace(/\D/g, '').slice(0, 10))}
                        placeholder="9876543210"
                        className="w-full pl-9 pr-3 py-2 rounded-xl glass-input text-white font-medium"
                        required
                      />
                    </div>
                  </div>
                </div>

                {/* Registration Number & Roll Number */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-slate-300 font-semibold mb-1">Registration Number</label>
                    <div className="relative">
                      <GraduationCap className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                      <input
                        type="text"
                        maxLength={15}
                        value={regRegisterNumber}
                        onChange={(e) => setRegRegisterNumber(e.target.value.toUpperCase().slice(0, 15))}
                        placeholder="E.g. 711721106001"
                        className="w-full pl-9 pr-3 py-2 rounded-xl glass-input text-white font-medium"
                        required
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-slate-300 font-semibold mb-1">Roll Number</label>
                    <div className="relative">
                      <Hash className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                      <input
                        type="text"
                        maxLength={10}
                        value={regRollNumber}
                        onChange={(e) => setRegRollNumber(e.target.value.toUpperCase().slice(0, 10))}
                        placeholder="E.g. 21EC005"
                        className="w-full pl-9 pr-3 py-2 rounded-xl glass-input text-white font-medium"
                        required
                      />
                    </div>
                  </div>
                </div>

                {/* Password & Confirm Password */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-slate-300 font-semibold mb-1">Password</label>
                    <div className="relative">
                      <KeyRound className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                      <input
                        type={showRegPassword ? 'text' : 'password'}
                        value={regPassword}
                        onChange={(e) => setRegPassword(e.target.value)}
                        placeholder="••••••••"
                        className="w-full pl-9 pr-8 py-2 rounded-xl glass-input text-white font-medium"
                        required
                      />
                      <button
                        type="button"
                        onClick={() => setShowRegPassword(!showRegPassword)}
                        className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
                      >
                        {showRegPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                      </button>
                    </div>
                  </div>

                  <div>
                    <label className="block text-slate-300 font-semibold mb-1">Re-enter Password</label>
                    <div className="relative">
                      <KeyRound className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                      <input
                        type={showRegPassword ? 'text' : 'password'}
                        value={regConfirmPassword}
                        onChange={(e) => setRegConfirmPassword(e.target.value)}
                        placeholder="••••••••"
                        className="w-full pl-9 pr-3 py-2 rounded-xl glass-input text-white font-medium"
                        required
                      />
                    </div>
                  </div>
                </div>

                <button
                  type="submit"
                  className="w-full py-3 rounded-2xl bg-indigo-600 hover:bg-indigo-500 text-white font-extrabold text-xs shadow-indigo-glow flex items-center justify-center gap-2 transition-all hover:scale-[1.02] mt-2"
                >
                  <span>Register & Send Verification OTP</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </form>



            </div>
          )}

        </div>

        {/* Footer */}
        <p className="text-[11px] text-center text-slate-500">
          © 2026 KGISL Institute of Technology • Innovation SOI Laboratory Systems
        </p>

      </div>

      {/* OTP Email Verification Modal */}
      {showOtpModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-md animate-in fade-in">
          <div className="w-full max-w-md glass-card p-6 border border-white/20 shadow-2xl rounded-3xl space-y-5 bg-slate-900/90 text-center max-h-[90vh] overflow-y-auto">
            
            <div className="w-12 h-12 mx-auto rounded-2xl bg-indigo-600/20 text-indigo-400 flex items-center justify-center border border-indigo-500/30">
              <Mail className="w-6 h-6" />
            </div>

            <div>
              <h3 className="text-base font-extrabold text-white">Enter OTP Verification Code</h3>
              <p className="text-xs text-slate-400 mt-1">We sent a 6-digit OTP code to <span className="font-bold text-indigo-300">{regEmail}</span></p>
            </div>

            <form onSubmit={handleVerifyOtpSubmit} className="space-y-4">
              <div>
                <input
                  type="text"
                  maxLength={6}
                  value={inputOtp}
                  onChange={(e) => setInputOtp(e.target.value)}
                  placeholder="ENTER 6 DIGIT OTP"
                  className="w-full text-center tracking-[1em] placeholder:tracking-normal text-xl font-mono py-3 rounded-2xl glass-input text-indigo-300 font-extrabold placeholder:text-xs placeholder:text-slate-500 placeholder:font-sans"
                  autoFocus
                  required
                />
              </div>

              {/* Visual OTP box removed for production secure dispatch */}

              <div className="flex items-center justify-between gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowOtpModal(false)}
                  className="px-4 py-2 text-slate-400 hover:text-white text-xs font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isLoading}
                  className="px-6 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-extrabold text-xs shadow-indigo-glow"
                >
                  {isLoading ? 'Verifying...' : 'Verify OTP & Complete Registration'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};
