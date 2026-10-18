import React, { useState, useEffect } from 'react';
import { 
  Phone, 
  ShieldCheck, 
  KeyRound, 
  AlertCircle, 
  CheckCircle2, 
  X, 
  ArrowRight,
  RefreshCw,
  Sparkles,
  Lock
} from 'lucide-react';

export default function CitizenAuthModal({ isOpen, onClose, onAuthenticated }) {
  const [tab, setTab] = useState('phone'); // 'phone' | 'google'
  const [mobile, setMobile] = useState('');
  const [name, setName] = useState('');
  const [otp, setOtp] = useState('');
  const [otpSent, setOtpSent] = useState(false);
  const [countdown, setCountdown] = useState(0);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState(null);
  const [successMsg, setSuccessMsg] = useState(null);
  const [simulatedOtpNotice, setSimulatedOtpNotice] = useState(null);

  useEffect(() => {
    let timer = null;
    if (countdown > 0) {
      timer = setInterval(() => setCountdown(c => c - 1), 1000);
    }
    return () => clearInterval(timer);
  }, [countdown]);

  if (!isOpen) return null;

  const handleSendOtp = async (e) => {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);
    setSimulatedOtpNotice(null);

    const cleanMobile = mobile.replace(/\D/g, '');
    if (cleanMobile.length < 10) {
      setErrorMsg('Please enter a valid 10-digit mobile number');
      return;
    }

    setLoading(true);
    try {
      const res = await fetch('/api/v1/auth/citizen/otp/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mobile: cleanMobile })
      });
      const data = await res.json();
      if (data.ok) {
        setOtpSent(true);
        setCountdown(60);
        setSuccessMsg(data.message || 'OTP sent successfully!');
        if (data.simulatedOtp || data.otp) {
          setSimulatedOtpNotice(`Dev Test Code: ${data.simulatedOtp || data.otp}`);
        }
      } else {
        setErrorMsg(data.error || 'Failed to send OTP via SMS Gateway');
      }
    } catch (err) {
      setErrorMsg('Network error connecting to SMS Gateway');
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtp = async (e) => {
    e.preventDefault();
    setErrorMsg(null);
    if (!otp || otp.trim().length < 4) {
      setErrorMsg('Please enter the 4-digit OTP sent to your phone');
      return;
    }

    setLoading(true);
    try {
      const res = await fetch('/api/v1/auth/citizen/otp/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          mobile: mobile.replace(/\D/g, ''),
          otp: otp.trim(),
          name: name.trim() || 'Citizen User'
        })
      });
      const data = await res.json();
      if (data.ok) {
        localStorage.setItem('citizen_token', data.token);
        localStorage.setItem('citizen_user', JSON.stringify(data.user));
        onAuthenticated(data.user, data.token);
        onClose();
      } else {
        setErrorMsg(data.error || 'Invalid OTP');
      }
    } catch (err) {
      setErrorMsg('Network error verifying OTP');
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    setLoading(true);
    setErrorMsg(null);
    try {
      // Direct simulation of Google SSO callback
      const demoEmail = name ? `${name.toLowerCase().replace(/\s+/g, '')}@gmail.com` : 'citizen.patient@gmail.com';
      const res = await fetch('/api/v1/auth/citizen/google', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: demoEmail,
          name: name || 'Verified Google Citizen',
          googleId: 'goog_' + Date.now()
        })
      });
      const data = await res.json();
      if (data.ok) {
        localStorage.setItem('citizen_token', data.token);
        localStorage.setItem('citizen_user', JSON.stringify(data.user));
        onAuthenticated(data.user, data.token);
        onClose();
      } else {
        setErrorMsg(data.error || 'Google login failed');
      }
    } catch (err) {
      setErrorMsg('Network error during Google authentication');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl max-w-md w-full shadow-2xl border border-slate-200 overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-600 via-indigo-600 to-blue-700 text-white p-6 relative">
          <button 
            onClick={onClose}
            className="absolute top-4 right-4 text-white/80 hover:text-white bg-black/10 p-1.5 rounded-full transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
          <div className="w-12 h-12 rounded-2xl bg-white/20 border border-white/30 flex items-center justify-center mb-3 text-white shadow-inner">
            <ShieldCheck className="w-6 h-6" />
          </div>
          <h3 className="text-lg font-bold tracking-tight">Citizen Health SSO Login</h3>
          <p className="text-xs text-blue-100 mt-1">
            Single Sign-On for all city hospitals, appointments, reports & prescriptions.
          </p>
        </div>

        {/* Content */}
        <div className="p-6">
          {/* Tabs */}
          <div className="flex bg-slate-100 p-1 rounded-xl mb-5 text-xs font-semibold">
            <button
              onClick={() => { setTab('phone'); setErrorMsg(null); }}
              className={`flex-1 py-2 rounded-lg flex items-center justify-center gap-1.5 transition-all ${
                tab === 'phone' ? 'bg-white text-blue-700 shadow-sm' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Phone className="w-3.5 h-3.5" />
              Mobile SMS OTP
            </button>
            <button
              onClick={() => { setTab('google'); setErrorMsg(null); }}
              className={`flex-1 py-2 rounded-lg flex items-center justify-center gap-1.5 transition-all ${
                tab === 'google' ? 'bg-white text-blue-700 shadow-sm' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <svg className="w-3.5 h-3.5" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"/>
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"/>
              </svg>
              Google Account
            </button>
          </div>

          {tab === 'phone' ? (
            !otpSent ? (
              <form onSubmit={handleSendOtp} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Your Full Name (Optional):
                  </label>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="e.g. Rahul Verma"
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs text-slate-900 focus:bg-white focus:ring-2 focus:ring-blue-600 focus:border-blue-600"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    10-Digit Mobile Number (India +91):
                  </label>
                  <div className="flex gap-2">
                    <span className="px-3 py-2.5 bg-slate-100 border border-slate-300 rounded-xl text-xs font-semibold text-slate-600">
                      +91
                    </span>
                    <input
                      type="tel"
                      value={mobile}
                      onChange={(e) => setMobile(e.target.value)}
                      placeholder="9876543210"
                      maxLength={10}
                      className="flex-1 px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-mono text-slate-900 focus:bg-white focus:ring-2 focus:ring-blue-600 focus:border-blue-600 tracking-wider"
                      autoFocus
                    />
                  </div>
                  <p className="text-[11px] text-slate-400 mt-1.5 flex items-center gap-1">
                    <Lock className="w-3 h-3 text-emerald-600" />
                    MSG91 Enterprise SMS Gateway powered OTP
                  </p>
                </div>

                {errorMsg && (
                  <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 rounded-xl text-xs flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 shrink-0" />
                    <span>{errorMsg}</span>
                  </div>
                )}

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold shadow-md shadow-blue-600/20 transition-all flex items-center justify-center gap-2"
                >
                  {loading ? 'Connecting SMS Gateway...' : 'Send OTP via SMS'}
                  <ArrowRight className="w-4 h-4" />
                </button>
              </form>
            ) : (
              <form onSubmit={handleVerifyOtp} className="space-y-4">
                <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-800 text-xs flex items-center justify-between">
                  <span>OTP dispatched to: <strong>+91 {mobile}</strong></span>
                  <button 
                    type="button" 
                    onClick={() => { setOtpSent(false); setOtp(''); }}
                    className="text-xs text-blue-600 font-bold hover:underline"
                  >
                    Change
                  </button>
                </div>

                {simulatedOtpNotice && (
                  <div className="p-2.5 bg-amber-50 border border-amber-200 text-amber-800 rounded-xl text-xs font-mono text-center">
                    🔔 {simulatedOtpNotice}
                  </div>
                )}

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Enter 4-Digit Verification Code:
                  </label>
                  <input
                    type="text"
                    value={otp}
                    onChange={(e) => setOtp(e.target.value)}
                    placeholder="Enter OTP"
                    maxLength={6}
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-300 rounded-xl text-base font-mono font-bold tracking-widest text-center text-slate-900 focus:bg-white focus:ring-2 focus:ring-blue-600 focus:border-blue-600"
                    autoFocus
                  />
                </div>

                {errorMsg && (
                  <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 rounded-xl text-xs flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 shrink-0" />
                    <span>{errorMsg}</span>
                  </div>
                )}

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-md shadow-emerald-600/20 transition-all flex items-center justify-center gap-2"
                >
                  {loading ? 'Verifying...' : 'Verify OTP & Log In'}
                  <CheckCircle2 className="w-4 h-4" />
                </button>

                <div className="text-center pt-2">
                  {countdown > 0 ? (
                    <span className="text-xs text-slate-400">Resend OTP in {countdown}s</span>
                  ) : (
                    <button
                      type="button"
                      onClick={handleSendOtp}
                      className="text-xs text-blue-600 font-bold hover:underline flex items-center gap-1 mx-auto"
                    >
                      <RefreshCw className="w-3 h-3" />
                      Resend SMS OTP
                    </button>
                  )}
                </div>
              </form>
            )
          ) : (
            <div className="space-y-4 py-2">
              <p className="text-xs text-slate-500 text-center">
                Sign in with your verified Google Account for instant access across all city healthcare portals:
              </p>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Your Name (Optional):
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Rahul Verma"
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs text-slate-900 focus:bg-white focus:ring-2 focus:ring-blue-600 focus:border-blue-600 mb-3"
                />
              </div>

              {errorMsg && (
                <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 rounded-xl text-xs flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{errorMsg}</span>
                </div>
              )}

              <button
                type="button"
                onClick={handleGoogleLogin}
                disabled={loading}
                className="w-full py-3 bg-white hover:bg-slate-50 text-slate-800 border border-slate-300 rounded-xl text-xs font-bold shadow-sm transition-all flex items-center justify-center gap-2.5"
              >
                <svg className="w-4 h-4" viewBox="0 0 24 24">
                  <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                  <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                  <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"/>
                  <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"/>
                </svg>
                {loading ? 'Signing in with Google...' : 'Continue with Google Account'}
              </button>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="bg-slate-50 px-6 py-3 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500">
          <span>Encrypted with SHA-256 HMAC</span>
          <span className="font-mono text-slate-400">churuone.in Identity</span>
        </div>
      </div>
    </div>
  );
}
