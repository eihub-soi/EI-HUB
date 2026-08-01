import React, { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { UserRole } from '../types';
import { 
  Sparkles, 
  Cpu, 
  ShieldCheck, 
  Zap, 
  ArrowRight, 
  BarChart3, 
  Layers, 
  CheckCircle2, 
  FileText, 
  GraduationCap, 
  Briefcase, 
  Shield, 
  Lock,
  ChevronRight,
  Database
} from 'lucide-react';

export const LandingPage: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const { switchRole } = useAuth();
  const navigate = useNavigate();
  const [showLoginModal, setShowLoginModal] = useState(false);

  // Floating hardware particles on canvas
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationFrameId: number;
    let width = (canvas.width = canvas.parentElement?.clientWidth || window.innerWidth);
    let height = (canvas.height = canvas.parentElement?.clientHeight || 600);

    const handleResize = () => {
      if (!canvas) return;
      width = canvas.width = canvas.parentElement?.clientWidth || window.innerWidth;
      height = canvas.height = canvas.parentElement?.clientHeight || 600;
    };
    window.addEventListener('resize', handleResize);

    // Particle hardware chips
    const labels = ['ARDUINO UNO R3', 'ESP32 WROOM', 'RASPBERRY PI 4', 'HC-SR04', 'DHT22', 'ATmega328P', 'SG90 SERVO', '5V RELAY'];
    const particles = Array.from({ length: 24 }).map((_, i) => ({
      x: Math.random() * width,
      y: Math.random() * height,
      vx: (Math.random() - 0.5) * 0.4,
      vy: (Math.random() - 0.5) * 0.4,
      radius: Math.random() * 4 + 2,
      label: labels[i % labels.length],
      alpha: Math.random() * 0.5 + 0.3,
      pulse: Math.random() * Math.PI,
    }));

    let mouseX = width / 2;
    let mouseY = height / 2;

    const handleMouseMove = (e: MouseEvent) => {
      const rect = canvas.getBoundingClientRect();
      mouseX = e.clientX - rect.left;
      mouseY = e.clientY - rect.top;
    };
    window.addEventListener('mousemove', handleMouseMove);

    const render = () => {
      ctx.clearRect(0, 0, width, height);

      // Draw subtle connections
      for (let i = 0; i < particles.length; i++) {
        for (let j = i + 1; j < particles.length; j++) {
          const dx = particles[i].x - particles[j].x;
          const dy = particles[i].y - particles[j].y;
          const dist = Math.sqrt(dx * dx + dy * dy);

          if (dist < 140) {
            ctx.beginPath();
            ctx.moveTo(particles[i].x, particles[i].y);
            ctx.lineTo(particles[j].x, particles[j].y);
            ctx.strokeStyle = `rgba(99, 102, 241, ${0.15 * (1 - dist / 140)})`;
            ctx.lineWidth = 1;
            ctx.stroke();
          }
        }
      }

      // Draw particles & hardware chip cards
      particles.forEach((p) => {
        p.x += p.vx;
        p.y += p.vy;

        if (p.x < 0 || p.x > width) p.vx *= -1;
        if (p.y < 0 || p.y > height) p.vy *= -1;

        // Parallax influence from mouse
        const pdx = mouseX - p.x;
        const pdy = mouseY - p.y;
        const pdist = Math.sqrt(pdx * pdx + pdy * pdy);
        if (pdist < 180) {
          p.x -= (pdx / pdist) * 0.3;
          p.y -= (pdy / pdist) * 0.3;
        }

        p.pulse += 0.02;
        const currentAlpha = p.alpha + Math.sin(p.pulse) * 0.15;

        // Draw node
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(212, 175, 55, ${currentAlpha})`;
        ctx.shadowColor = '#D4AF37';
        ctx.shadowBlur = 10;
        ctx.fill();
        ctx.shadowBlur = 0;

        // Draw micro chip badge label
        ctx.fillStyle = `rgba(255, 255, 255, ${currentAlpha * 0.8})`;
        ctx.font = '10px Plus Jakarta Sans, sans-serif';
        ctx.fillText(p.label, p.x + 10, p.y + 3);
      });

      animationFrameId = requestAnimationFrame(render);
    };

    render();

    return () => {
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('mousemove', handleMouseMove);
      cancelAnimationFrame(animationFrameId);
    };
  }, []);

  const handleLaunchRole = (role: UserRole) => {
    switchRole(role);
    if (role === 'student') navigate('/student/dashboard');
    else if (role === 'faculty') navigate('/faculty/dashboard');
    else navigate('/admin/dashboard');
  };

  return (
    <div className="min-h-screen bg-[#0B132B] text-slate-100 overflow-hidden relative">
      
      {/* Top Floating Glass Header */}
      <header className="sticky top-0 z-50 glass-panel border-b border-white/10 px-6 py-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-indigo-700 via-indigo-600 to-gold-500 p-0.5 shadow-indigo-glow flex items-center justify-center">
              <div className="w-full h-full bg-[#0B132B] rounded-[14px] flex items-center justify-center">
                <Sparkles className="w-5 h-5 text-gold-400" />
              </div>
            </div>
            <div>
              <span className="font-extrabold text-xl tracking-tight text-white">EI HUB</span>
              <span className="ml-2 text-xs font-semibold text-gold-400 bg-gold-500/10 border border-gold-500/20 px-2 py-0.5 rounded-full">
                KGISL Institute of Technology
              </span>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <button
              onClick={() => handleLaunchRole('student')}
              className="hidden md:inline-flex text-xs font-semibold text-slate-300 hover:text-white px-4 py-2 rounded-xl hover:bg-white/5 transition-all"
            >
              Student Portal
            </button>
            <button
              onClick={() => handleLaunchRole('faculty')}
              className="hidden md:inline-flex text-xs font-semibold text-slate-300 hover:text-white px-4 py-2 rounded-xl hover:bg-white/5 transition-all"
            >
              Faculty Portal
            </button>
            <button
              onClick={() => setShowLoginModal(true)}
              className="px-5 py-2.5 rounded-2xl bg-gradient-to-r from-indigo-600 to-indigo-700 hover:from-indigo-500 hover:to-indigo-600 text-white text-xs font-bold shadow-indigo-glow transition-all hover:scale-105"
            >
              Launch Live App
            </button>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative pt-16 pb-24 px-6 max-w-7xl mx-auto">
        <div className="absolute inset-0 -z-10 opacity-70">
          <canvas ref={canvasRef} className="w-full h-full" />
        </div>

        {/* Ambient Gradient Glows */}
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-gradient-to-tr from-indigo-600/20 via-purple-600/10 to-gold-500/10 rounded-full blur-3xl pointer-events-none -z-10" />

        <div className="text-center max-w-4xl mx-auto space-y-6">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full glass-panel border border-gold-500/30 text-gold-300 text-xs font-semibold shadow-gold-glow animate-pulse">
            <Sparkles className="w-4 h-4 text-gold-400" />
            <span>Innovation SOI Enterprise Component Inventory & Lab Platform</span>
          </div>

          <h1 className="text-4xl sm:text-6xl lg:text-7xl font-extrabold tracking-tight text-white leading-tight">
            Next-Gen Laboratory Component Management for <br />
            <span className="bg-clip-text text-transparent bg-gradient-to-r from-white via-indigo-200 to-gold-400">
              KGISL Institute of Technology
            </span>
          </h1>

          <p className="text-base sm:text-lg text-slate-300 max-w-2xl mx-auto leading-relaxed">
            Manage microcontrollers, sensors, actuators, and IC hardware with real-time Turso tracking, instant student borrow requests, faculty approvals, and QR-verified PDF transaction receipts.
          </p>

          {/* Interactive Role Switch CTAs */}
          <div className="pt-6 flex flex-wrap items-center justify-center gap-4">
            <button
              onClick={() => handleLaunchRole('student')}
              className="flex items-center gap-2 px-6 py-3.5 rounded-2xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-sm shadow-indigo-glow transition-all hover:scale-105"
            >
              <GraduationCap className="w-4 h-4" />
              <span>Student Experience</span>
              <ArrowRight className="w-4 h-4" />
            </button>

            <button
              onClick={() => handleLaunchRole('faculty')}
              className="flex items-center gap-2 px-6 py-3.5 rounded-2xl glass-card hover:bg-slate-800 text-white font-bold text-sm border border-white/20 transition-all hover:scale-105"
            >
              <Briefcase className="w-4 h-4 text-indigo-400" />
              <span>Faculty Dashboard</span>
            </button>

            <button
              onClick={() => handleLaunchRole('admin')}
              className="flex items-center gap-2 px-6 py-3.5 rounded-2xl bg-gradient-to-r from-amber-500 to-gold-600 hover:from-amber-400 hover:to-gold-500 text-slate-950 font-extrabold text-sm shadow-gold-glow transition-all hover:scale-105"
            >
              <Shield className="w-4 h-4" />
              <span>Admin Console</span>
            </button>
          </div>

          {/* Floating Key Metrics */}
          <div className="pt-16 grid grid-cols-2 md:grid-cols-4 gap-4 max-w-4xl mx-auto">
            <div className="p-4 rounded-3xl glass-card text-center border border-white/10">
              <h4 className="text-2xl font-extrabold text-white">295+</h4>
              <p className="text-xs text-slate-400 font-medium">Total Components</p>
            </div>
            <div className="p-4 rounded-3xl glass-card text-center border border-white/10">
              <h4 className="text-2xl font-extrabold text-emerald-400">99.8%</h4>
              <p className="text-xs text-slate-400 font-medium">Inventory Availability</p>
            </div>
            <div className="p-4 rounded-3xl glass-card text-center border border-white/10">
              <h4 className="text-2xl font-extrabold text-indigo-400">1,256</h4>
              <p className="text-xs text-slate-400 font-medium">Active Lab Users</p>
            </div>
            <div className="p-4 rounded-3xl glass-card text-center border border-white/10">
              <h4 className="text-2xl font-extrabold text-gold-400">&lt; 2s</h4>
              <p className="text-xs text-slate-400 font-medium">Realtime Sync Speed</p>
            </div>
          </div>

        </div>
      </section>

      {/* Feature Highlights Grid */}
      <section className="py-20 px-6 max-w-7xl mx-auto border-t border-white/10">
        <div className="text-center max-w-2xl mx-auto mb-16 space-y-3">
          <h2 className="text-3xl font-extrabold text-white">Architected for Enterprise Laboratory Operations</h2>
          <p className="text-sm text-slate-400">
            Powered by PostgreSQL RPC concurrency locking, Turso Row Level Security, and Framer Motion micro-interactions.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="p-6 rounded-3xl glass-card-hover glass-card space-y-4">
            <div className="w-12 h-12 rounded-2xl bg-indigo-500/20 text-indigo-400 flex items-center justify-center border border-indigo-500/30">
              <Zap className="w-6 h-6" />
            </div>
            <h3 className="text-lg font-bold text-white">Real-Time Inventory Sync</h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              Instant live stock updates across cabinet racks, shelf locations, and active student borrowing sessions without page reloads.
            </p>
          </div>

          <div className="p-6 rounded-3xl glass-card-hover glass-card space-y-4">
            <div className="w-12 h-12 rounded-2xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center border border-emerald-500/30">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <h3 className="text-lg font-bold text-white">PostgreSQL RPC Concurrency</h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              Atomic row locking (`FOR UPDATE`) prevents stock drift and race conditions during simultaneous student requests.
            </p>
          </div>

          <div className="p-6 rounded-3xl glass-card-hover glass-card space-y-4">
            <div className="w-12 h-12 rounded-2xl bg-gold-500/20 text-gold-400 flex items-center justify-center border border-gold-500/30">
              <FileText className="w-6 h-6" />
            </div>
            <h3 className="text-lg font-bold text-white">QR-Verified PDF Receipts</h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              Generate official KGISL Institute transaction receipts and administrative inventory reports with embedded verification QR codes.
            </p>
          </div>
        </div>
      </section>

      {/* Role Quick Switch Launcher Modal */}
      {showLoginModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-in fade-in">
          <div className="w-full max-w-md glass-card p-6 border border-white/20 shadow-2xl rounded-3xl space-y-6 max-h-[90vh] overflow-y-auto">
            <div className="text-center space-y-2">
              <div className="w-12 h-12 mx-auto rounded-2xl bg-indigo-600/20 text-indigo-400 flex items-center justify-center border border-indigo-500/30">
                <Sparkles className="w-6 h-6" />
              </div>
              <h3 className="text-xl font-extrabold text-white">Select Experience Role</h3>
              <p className="text-xs text-slate-400">Choose a pre-configured profile to test the application instantly.</p>
            </div>

            <div className="space-y-3">
              <button
                onClick={() => { setShowLoginModal(false); handleLaunchRole('student'); }}
                className="w-full flex items-center justify-between p-4 rounded-2xl bg-slate-900/60 border border-white/10 hover:border-indigo-500/50 hover:bg-indigo-950/30 transition-all text-left group"
              >
                <div className="flex items-center gap-3">
                  <GraduationCap className="w-6 h-6 text-indigo-400" />
                  <div>
                    <h4 className="text-xs font-bold text-white">Student Experience</h4>
                    <p className="text-[10px] text-slate-400">Aravind R (711721106001)</p>
                  </div>
                </div>
                <ChevronRight className="w-4 h-4 text-slate-400 group-hover:translate-x-1 transition-transform" />
              </button>

              <button
                onClick={() => { setShowLoginModal(false); handleLaunchRole('faculty'); }}
                className="w-full flex items-center justify-between p-4 rounded-2xl bg-slate-900/60 border border-white/10 hover:border-indigo-500/50 hover:bg-indigo-950/30 transition-all text-left group"
              >
                <div className="flex items-center gap-3">
                  <Briefcase className="w-6 h-6 text-emerald-400" />
                  <div>
                    <h4 className="text-xs font-bold text-white">Faculty Experience</h4>
                    <p className="text-[10px] text-slate-400">Prof. Robert Chen (FAC-ECE-102)</p>
                  </div>
                </div>
                <ChevronRight className="w-4 h-4 text-slate-400 group-hover:translate-x-1 transition-transform" />
              </button>

              <button
                onClick={() => { setShowLoginModal(false); handleLaunchRole('admin'); }}
                className="w-full flex items-center justify-between p-4 rounded-2xl bg-slate-900/60 border border-white/10 hover:border-gold-500/50 hover:bg-amber-950/30 transition-all text-left group"
              >
                <div className="flex items-center gap-3">
                  <Shield className="w-6 h-6 text-gold-400" />
                  <div>
                    <h4 className="text-xs font-bold text-white">Admin Experience</h4>
                    <p className="text-[10px] text-slate-400">Admin User (Innovation SOI System Administrator)</p>
                  </div>
                </div>
                <ChevronRight className="w-4 h-4 text-slate-400 group-hover:translate-x-1 transition-transform" />
              </button>
            </div>

            <button
              onClick={() => setShowLoginModal(false)}
              className="w-full py-2.5 text-xs text-slate-400 hover:text-white transition-all text-center"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Footer */}
      <footer className="py-8 border-t border-white/10 text-center text-xs text-slate-500">
        <p>© 2026 EI HUB | KGISL Institute of Technology - Innovation SOI. Enterprise Laboratory SaaS Platform.</p>
      </footer>
    </div>
  );
};
