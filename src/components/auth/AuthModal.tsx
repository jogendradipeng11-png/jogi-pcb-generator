import React, { useState, useEffect, useRef } from 'react';
import {
  X,
  Mail,
  Lock,
  User,
  Phone,
  CheckCircle,
  AlertCircle,
  ArrowRight,
  Sparkles,
  ShieldCheck,
  RefreshCw,
  ExternalLink,
  MessageSquare,
  KeyRound,
  Eye,
  EyeOff,
} from 'lucide-react';
import {
  UserProfile,
  requestWhatsappOtp,
  verifyWhatsappOtp,
  loginWithPassword,
  registerUser,
  resetPasswordWithWhatsappOtp,
  getActiveOtpChallenge,
  normalizeWhatsappNumber,
} from '../../utils/authService';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (user: UserProfile) => void;
  initialMode?: 'signin' | 'signup' | 'whatsapp_otp' | 'forgot_password';
}

const COUNTRY_CODES = [
  { code: '+1', country: 'US/CA' },
  { code: '+44', country: 'UK' },
  { code: '+91', country: 'IN' },
  { code: '+49', country: 'DE' },
  { code: '+33', country: 'FR' },
  { code: '+61', country: 'AU' },
  { code: '+81', country: 'JP' },
  { code: '+86', country: 'CN' },
  { code: '+55', country: 'BR' },
  { code: '+971', country: 'UAE' },
];

export const AuthModal: React.FC<AuthModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  initialMode = 'signin',
}) => {
  const [mode, setMode] = useState<'signin' | 'signup' | 'whatsapp_otp' | 'forgot_password'>(
    initialMode
  );

  // Form fields
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [countryCode, setCountryCode] = useState('+1');
  const [whatsappPhone, setWhatsappPhone] = useState('');

  // OTP State
  const [otpDigits, setOtpDigits] = useState(['', '', '', '', '', '']);
  const [activeChallengeCode, setActiveChallengeCode] = useState<string | null>(null);
  const [whatsappLink, setWhatsappLink] = useState<string | null>(null);
  const [resendCooldown, setResendCooldown] = useState(0);
  const otpInputRefs = useRef<(HTMLInputElement | null)[]>([]);

  // Password reset new password
  const [newPassword, setNewPassword] = useState('');

  // Status & Error feedback
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  // Reset form when modal opens
  useEffect(() => {
    if (isOpen) {
      setMode(initialMode);
      setErrorMsg(null);
      setSuccessMsg(null);
      const challenge = getActiveOtpChallenge();
      if (challenge) {
        setActiveChallengeCode(challenge.code);
        setWhatsappPhone(challenge.whatsappNumber);
      }
    }
  }, [isOpen, initialMode]);

  // Resend cooldown timer
  useEffect(() => {
    if (resendCooldown > 0) {
      const timer = setTimeout(() => setResendCooldown((prev) => prev - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [resendCooldown]);

  if (!isOpen) return null;

  const fullWhatsappNumber = `${countryCode} ${whatsappPhone}`.trim();

  // Handle OTP digit changes
  const handleOtpChange = (index: number, value: string) => {
    if (!/^\d*$/.test(value)) return;
    const nextDigits = [...otpDigits];
    nextDigits[index] = value.slice(-1);
    setOtpDigits(nextDigits);

    // Auto-advance to next input
    if (value && index < 5) {
      otpInputRefs.current[index + 1]?.focus();
    }
  };

  const handleOtpKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace' && !otpDigits[index] && index > 0) {
      otpInputRefs.current[index - 1]?.focus();
    }
  };

  const handleOtpPaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData('text').trim().replace(/[^\d]/g, '');
    if (pasted) {
      const chars = pasted.slice(0, 6).split('');
      const next = [...otpDigits];
      chars.forEach((ch, idx) => {
        if (idx < 6) next[idx] = ch;
      });
      setOtpDigits(next);
      if (chars.length >= 6) {
        otpInputRefs.current[5]?.focus();
      }
    }
  };

  // 1. Submit Sign In (Email + Password)
  const handleSignInWithPassword = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setIsLoading(true);

    try {
      if (!email.trim() || !password) {
        throw new Error('Please enter your email and password.');
      }
      const user = loginWithPassword(email, password);
      setSuccessMsg(`Welcome back, ${user.name}!`);
      setTimeout(() => {
        onSuccess(user);
        onClose();
      }, 700);
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to sign in.');
    } finally {
      setIsLoading(false);
    }
  };

  // 2. Trigger WhatsApp OTP Sign In
  const handleTriggerWhatsappSignIn = () => {
    setErrorMsg(null);
    if (!whatsappPhone.trim()) {
      setErrorMsg('Please enter your WhatsApp phone number.');
      return;
    }

    try {
      const result = requestWhatsappOtp(fullWhatsappNumber, 'signin', { email });
      setActiveChallengeCode(result.code);
      setWhatsappLink(result.whatsappLink);
      setResendCooldown(60);
      setMode('whatsapp_otp');
      setSuccessMsg(result.message);
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to generate WhatsApp OTP.');
    }
  };

  // 3. Submit Sign Up
  const handleSignUp = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setIsLoading(true);

    try {
      if (!name.trim()) throw new Error('Please enter your full name.');
      if (!email.trim()) throw new Error('Please enter a valid email address.');
      if (!password || password.length < 6) {
        throw new Error('Password must be at least 6 characters long.');
      }
      if (!whatsappPhone.trim()) {
        throw new Error('Please enter your WhatsApp number for verification.');
      }

      // Request WhatsApp verification OTP for signup
      const result = requestWhatsappOtp(fullWhatsappNumber, 'signup', {
        name: name.trim(),
        email: email.trim(),
      });
      setActiveChallengeCode(result.code);
      setWhatsappLink(result.whatsappLink);
      setResendCooldown(60);
      setMode('whatsapp_otp');
      setSuccessMsg(
        `Account created! A 6-digit WhatsApp OTP was generated for ${fullWhatsappNumber}. Please verify to complete sign up.`
      );
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to sign up.');
    } finally {
      setIsLoading(false);
    }
  };

  // 4. Verify WhatsApp OTP Code
  const handleVerifyOtp = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setErrorMsg(null);
    setIsLoading(true);

    const enteredCode = otpDigits.join('');
    if (enteredCode.length !== 6) {
      setErrorMsg('Please enter the full 6-digit WhatsApp verification code.');
      setIsLoading(false);
      return;
    }

    try {
      const challenge = getActiveOtpChallenge();
      if (!challenge) {
        throw new Error('Verification session expired. Please request a new code.');
      }

      if (challenge.purpose === 'reset') {
        if (!newPassword || newPassword.length < 6) {
          throw new Error('Please provide a new password (min 6 characters).');
        }
        const resetRes = resetPasswordWithWhatsappOtp(
          challenge.whatsappNumber,
          enteredCode,
          newPassword
        );
        setSuccessMsg(resetRes.message);
        setTimeout(() => {
          setMode('signin');
        }, 1200);
      } else {
        const verifyRes = verifyWhatsappOtp(challenge.whatsappNumber, enteredCode);
        setSuccessMsg(verifyRes.message);
        setTimeout(() => {
          onSuccess(verifyRes.user);
          onClose();
        }, 800);
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Verification failed. Please check the code.');
    } finally {
      setIsLoading(false);
    }
  };

  // 5. Trigger Forgot Password via WhatsApp OTP
  const handleForgotPassword = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    if (!whatsappPhone.trim()) {
      setErrorMsg('Please enter your WhatsApp number to receive a password reset OTP.');
      return;
    }

    try {
      const result = requestWhatsappOtp(fullWhatsappNumber, 'reset', { email });
      setActiveChallengeCode(result.code);
      setWhatsappLink(result.whatsappLink);
      setResendCooldown(60);
      setMode('whatsapp_otp');
      setSuccessMsg(result.message);
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to request reset OTP.');
    }
  };

  // Resend OTP handler
  const handleResendOtp = () => {
    if (resendCooldown > 0) return;
    try {
      const challenge = getActiveOtpChallenge();
      const num = challenge?.whatsappNumber || fullWhatsappNumber;
      const purpose = challenge?.purpose || 'signin';
      const result = requestWhatsappOtp(num, purpose, { email, name });
      setActiveChallengeCode(result.code);
      setWhatsappLink(result.whatsappLink);
      setResendCooldown(60);
      setSuccessMsg('A fresh 6-digit WhatsApp OTP has been generated!');
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to resend code.');
    }
  };

  // One-click Auto-fill for convenience
  const handleAutoFillOtp = () => {
    if (activeChallengeCode && activeChallengeCode.length === 6) {
      setOtpDigits(activeChallengeCode.split(''));
      setErrorMsg(null);
    }
  };

  const challenge = getActiveOtpChallenge();

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-xs p-4 overflow-y-auto">
      <div className="bg-slate-900 border border-slate-700/80 rounded-2xl shadow-2xl w-full max-w-md flex flex-col overflow-hidden text-slate-100 animate-in fade-in zoom-in-95">
        {/* Modal Top Bar */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-950/70">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center shadow-md text-white">
              <ShieldCheck className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white flex items-center gap-1.5">
                <span>CircuitEDA</span>
                <span className="text-[10px] px-1.5 py-0.2 bg-emerald-950 text-emerald-400 border border-emerald-800 rounded font-mono font-medium">
                  WhatsApp OTP
                </span>
              </h3>
              <p className="text-[11px] text-slate-400">Secure Electronic Designer Account</p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 space-y-4">
          {/* Feedback banners */}
          {errorMsg && (
            <div className="p-3 bg-red-950/60 border border-red-800/80 rounded-xl text-xs text-red-200 flex items-start gap-2.5">
              <AlertCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
              <div className="flex-1 leading-relaxed">{errorMsg}</div>
            </div>
          )}

          {successMsg && (
            <div className="p-3 bg-emerald-950/60 border border-emerald-800/80 rounded-xl text-xs text-emerald-200 flex items-start gap-2.5">
              <CheckCircle className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
              <div className="flex-1 leading-relaxed">{successMsg}</div>
            </div>
          )}

          {/* VIEW 1: SIGN IN */}
          {mode === 'signin' && (
            <form onSubmit={handleSignInWithPassword} className="space-y-4">
              <div className="space-y-1">
                <h4 className="text-base font-bold text-white">Welcome Back</h4>
                <p className="text-xs text-slate-400">
                  Sign in to access your saved circuits, custom Google parts, and Gerber exports.
                </p>
              </div>

              {/* Mode Switch Pills */}
              <div className="flex p-1 bg-slate-950 rounded-xl border border-slate-800 text-xs">
                <button
                  type="button"
                  onClick={() => setMode('signin')}
                  className="flex-1 py-1.5 rounded-lg font-semibold bg-slate-800 text-white shadow-xs cursor-pointer"
                >
                  Sign In
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setMode('signup');
                    setErrorMsg(null);
                  }}
                  className="flex-1 py-1.5 rounded-lg font-medium text-slate-400 hover:text-slate-200 cursor-pointer"
                >
                  Sign Up
                </button>
              </div>

              {/* Email Input */}
              <div className="space-y-1">
                <label className="text-xs text-slate-300 font-medium flex items-center gap-1.5">
                  <Mail className="w-3.5 h-3.5 text-slate-400" />
                  <span>Email Address</span>
                </label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="engineer@domain.com"
                  className="w-full px-3.5 py-2 bg-slate-950 border border-slate-700 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-sky-500 transition-colors"
                />
              </div>

              {/* Password Input */}
              <div className="space-y-1">
                <div className="flex items-center justify-between">
                  <label className="text-xs text-slate-300 font-medium flex items-center gap-1.5">
                    <Lock className="w-3.5 h-3.5 text-slate-400" />
                    <span>Password</span>
                  </label>
                  <button
                    type="button"
                    onClick={() => {
                      setMode('forgot_password');
                      setErrorMsg(null);
                    }}
                    className="text-[11px] text-sky-400 hover:text-sky-300 hover:underline cursor-pointer"
                  >
                    Forgot Password?
                  </button>
                </div>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full px-3.5 py-2 pr-9 bg-slate-950 border border-slate-700 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-sky-500 transition-colors"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 cursor-pointer"
                  >
                    {showPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                  </button>
                </div>
              </div>

              {/* Submit Email/Password */}
              <button
                type="submit"
                disabled={isLoading}
                className="w-full py-2.5 bg-gradient-to-r from-sky-600 to-indigo-600 hover:from-sky-500 hover:to-indigo-500 text-white font-semibold text-xs rounded-xl shadow-lg shadow-sky-950/50 flex items-center justify-center gap-2 transition-all cursor-pointer"
              >
                <span>Sign In with Password</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>

              {/* Divider */}
              <div className="relative flex items-center justify-center my-3">
                <div className="border-t border-slate-800 w-full" />
                <span className="bg-slate-900 px-3 text-[11px] text-slate-500 font-medium uppercase tracking-wider">
                  OR USE WHATSAPP
                </span>
                <div className="border-t border-slate-800 w-full" />
              </div>

              {/* Direct WhatsApp OTP Sign In Section */}
              <div className="p-3.5 bg-emerald-950/30 border border-emerald-500/30 rounded-xl space-y-2.5">
                <div className="flex items-center gap-2 text-emerald-400">
                  <MessageSquare className="w-4 h-4 text-[#25D366]" />
                  <span className="text-xs font-bold text-white">
                    Sign In with WhatsApp OTP Verification
                  </span>
                </div>
                <p className="text-[11px] text-slate-400">
                  No password needed. We create an OTP code verified directly via WhatsApp.
                </p>

                <div className="flex gap-2">
                  <select
                    value={countryCode}
                    onChange={(e) => setCountryCode(e.target.value)}
                    className="px-2 py-2 bg-slate-950 border border-slate-700 rounded-xl text-xs text-slate-200 focus:outline-none focus:border-emerald-500 shrink-0 font-mono"
                  >
                    {COUNTRY_CODES.map((c) => (
                      <option key={c.code} value={c.code}>
                        {c.code} ({c.country})
                      </option>
                    ))}
                  </select>
                  <input
                    type="tel"
                    value={whatsappPhone}
                    onChange={(e) => setWhatsappPhone(e.target.value)}
                    placeholder="WhatsApp Phone Number"
                    className="flex-1 px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500 transition-colors font-mono"
                  />
                </div>

                <button
                  type="button"
                  onClick={handleTriggerWhatsappSignIn}
                  className="w-full py-2 bg-[#25D366] hover:bg-[#20bd5a] text-slate-950 font-bold text-xs rounded-xl shadow-md flex items-center justify-center gap-2 transition-all cursor-pointer"
                >
                  <MessageSquare className="w-3.5 h-3.5 fill-current" />
                  <span>Send OTP via WhatsApp</span>
                </button>
              </div>
            </form>
          )}

          {/* VIEW 2: SIGN UP */}
          {mode === 'signup' && (
            <form onSubmit={handleSignUp} className="space-y-3.5">
              <div className="space-y-1">
                <h4 className="text-base font-bold text-white">Create Your Account</h4>
                <p className="text-xs text-slate-400">
                  Join CircuitEDA to save circuit projects and verify via WhatsApp.
                </p>
              </div>

              {/* Mode Switch Pills */}
              <div className="flex p-1 bg-slate-950 rounded-xl border border-slate-800 text-xs">
                <button
                  type="button"
                  onClick={() => {
                    setMode('signin');
                    setErrorMsg(null);
                  }}
                  className="flex-1 py-1.5 rounded-lg font-medium text-slate-400 hover:text-slate-200 cursor-pointer"
                >
                  Sign In
                </button>
                <button
                  type="button"
                  onClick={() => setMode('signup')}
                  className="flex-1 py-1.5 rounded-lg font-semibold bg-slate-800 text-white shadow-xs cursor-pointer"
                >
                  Sign Up
                </button>
              </div>

              {/* Full Name */}
              <div className="space-y-1">
                <label className="text-xs text-slate-300 font-medium flex items-center gap-1.5">
                  <User className="w-3.5 h-3.5 text-slate-400" />
                  <span>Full Name</span>
                </label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Ada Lovelace"
                  className="w-full px-3.5 py-2 bg-slate-950 border border-slate-700 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-sky-500 transition-colors"
                />
              </div>

              {/* Email Address */}
              <div className="space-y-1">
                <label className="text-xs text-slate-300 font-medium flex items-center gap-1.5">
                  <Mail className="w-3.5 h-3.5 text-slate-400" />
                  <span>Email Address</span>
                </label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="engineer@domain.com"
                  className="w-full px-3.5 py-2 bg-slate-950 border border-slate-700 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-sky-500 transition-colors"
                />
              </div>

              {/* WhatsApp Phone Number */}
              <div className="space-y-1">
                <label className="text-xs text-emerald-400 font-medium flex items-center gap-1.5">
                  <MessageSquare className="w-3.5 h-3.5 text-[#25D366]" />
                  <span>WhatsApp Number (For OTP Verification)</span>
                </label>
                <div className="flex gap-2">
                  <select
                    value={countryCode}
                    onChange={(e) => setCountryCode(e.target.value)}
                    className="px-2 py-2 bg-slate-950 border border-slate-700 rounded-xl text-xs text-slate-200 focus:outline-none focus:border-emerald-500 shrink-0 font-mono"
                  >
                    {COUNTRY_CODES.map((c) => (
                      <option key={c.code} value={c.code}>
                        {c.code} ({c.country})
                      </option>
                    ))}
                  </select>
                  <input
                    type="tel"
                    required
                    value={whatsappPhone}
                    onChange={(e) => setWhatsappPhone(e.target.value)}
                    placeholder="WhatsApp Mobile Number"
                    className="flex-1 px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500 transition-colors font-mono"
                  />
                </div>
              </div>

              {/* Password */}
              <div className="space-y-1">
                <label className="text-xs text-slate-300 font-medium flex items-center gap-1.5">
                  <Lock className="w-3.5 h-3.5 text-slate-400" />
                  <span>Create Password</span>
                </label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    minLength={6}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="At least 6 characters"
                    className="w-full px-3.5 py-2 pr-9 bg-slate-950 border border-slate-700 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-sky-500 transition-colors"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 cursor-pointer"
                  >
                    {showPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                  </button>
                </div>
              </div>

              {/* Submit Sign Up */}
              <button
                type="submit"
                disabled={isLoading}
                className="w-full py-2.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold text-xs rounded-xl shadow-lg shadow-emerald-950/50 flex items-center justify-center gap-2 transition-all cursor-pointer"
              >
                <span>Continue to WhatsApp OTP Verification</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </form>
          )}

          {/* VIEW 3: WHATSAPP OTP VERIFICATION SCREEN */}
          {mode === 'whatsapp_otp' && (
            <div className="space-y-4">
              <div className="space-y-1 text-center">
                <div className="w-12 h-12 rounded-full bg-[#25D366]/20 border border-[#25D366]/40 flex items-center justify-center mx-auto text-[#25D366] mb-2 shadow-lg shadow-emerald-950/40">
                  <MessageSquare className="w-6 h-6 fill-current" />
                </div>
                <h4 className="text-base font-bold text-white">WhatsApp OTP Verification</h4>
                <p className="text-xs text-slate-300">
                  Enter the 6-digit code created for WhatsApp number{' '}
                  <span className="font-mono font-bold text-emerald-400">
                    {challenge?.whatsappNumber || fullWhatsappNumber}
                  </span>
                </p>
              </div>

              {/* Interactive WhatsApp Message Simulation Bubble */}
              <div className="p-3.5 bg-[#0b291d] border border-[#25D366]/40 rounded-xl space-y-2 shadow-md">
                <div className="flex items-center justify-between text-[11px] text-[#25D366] font-semibold">
                  <div className="flex items-center gap-1.5">
                    <MessageSquare className="w-3.5 h-3.5 fill-current" />
                    <span>WhatsApp Verified Message</span>
                  </div>
                  <span className="text-[10px] text-emerald-300/80 font-mono">Just now</span>
                </div>

                <div className="text-xs text-emerald-100 bg-[#123e2d] p-3 rounded-lg border border-[#25D366]/20 space-y-1.5 font-sans">
                  <p className="font-medium">CircuitEDA Security Alert:</p>
                  <p className="text-[11px] text-emerald-200">
                    Your single-use OTP verification code is:{' '}
                    <span className="font-mono font-bold text-base text-amber-300 tracking-wider px-1.5 py-0.5 bg-black/40 rounded">
                      {activeChallengeCode || '849201'}
                    </span>
                  </p>
                  <p className="text-[10px] text-emerald-400/80">
                    Do not share this code. Valid for 10 minutes.
                  </p>
                </div>

                <div className="flex items-center gap-2 pt-1">
                  {/* One-click Auto-fill Button */}
                  <button
                    type="button"
                    onClick={handleAutoFillOtp}
                    className="flex-1 py-1.5 bg-emerald-700/60 hover:bg-emerald-600/70 border border-emerald-500/50 text-white rounded-lg text-[11px] font-semibold flex items-center justify-center gap-1.5 cursor-pointer transition-colors"
                  >
                    <Sparkles className="w-3 h-3 text-amber-300" />
                    <span>Auto-Fill {activeChallengeCode || '849201'}</span>
                  </button>

                  {/* Open in WhatsApp Web / App */}
                  {whatsappLink && (
                    <a
                      href={whatsappLink}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="px-3 py-1.5 bg-[#25D366] hover:bg-[#20bd5a] text-slate-950 rounded-lg text-[11px] font-bold flex items-center gap-1 shadow-xs cursor-pointer transition-all"
                      title="Open WhatsApp Web or App"
                    >
                      <ExternalLink className="w-3 h-3" />
                      <span>Open in WhatsApp</span>
                    </a>
                  )}
                </div>
              </div>

              {/* 6 Digit Input Boxes */}
              <div className="space-y-2">
                <label className="text-xs text-slate-300 font-medium block text-center">
                  Enter 6-Digit OTP Code
                </label>
                <div className="flex justify-center gap-2">
                  {otpDigits.map((digit, idx) => (
                    <input
                      key={idx}
                      ref={(el) => (otpInputRefs.current[idx] = el)}
                      type="text"
                      inputMode="numeric"
                      maxLength={1}
                      value={digit}
                      onChange={(e) => handleOtpChange(idx, e.target.value)}
                      onKeyDown={(e) => handleOtpKeyDown(idx, e)}
                      onPaste={handleOtpPaste}
                      className="w-11 h-12 text-center text-lg font-bold font-mono bg-slate-950 border border-slate-700 focus:border-[#25D366] focus:ring-2 focus:ring-[#25D366]/20 rounded-xl text-white outline-none transition-all"
                    />
                  ))}
                </div>
              </div>

              {/* If Reset Password purpose, show new password input */}
              {challenge?.purpose === 'reset' && (
                <div className="space-y-1">
                  <label className="text-xs text-slate-300 font-medium flex items-center gap-1.5">
                    <KeyRound className="w-3.5 h-3.5 text-amber-400" />
                    <span>Set New Password</span>
                  </label>
                  <input
                    type="password"
                    required
                    minLength={6}
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="Enter new password (min 6 chars)"
                    className="w-full px-3.5 py-2 bg-slate-950 border border-slate-700 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-500"
                  />
                </div>
              )}

              {/* Verify Button */}
              <button
                type="button"
                onClick={() => handleVerifyOtp()}
                disabled={isLoading || otpDigits.join('').length !== 6}
                className="w-full py-2.5 bg-[#25D366] hover:bg-[#20bd5a] disabled:opacity-50 text-slate-950 font-bold text-xs rounded-xl shadow-lg shadow-emerald-950/50 flex items-center justify-center gap-2 transition-all cursor-pointer"
              >
                <CheckCircle className="w-4 h-4" />
                <span>
                  {challenge?.purpose === 'reset'
                    ? 'Verify & Reset Password'
                    : 'Verify WhatsApp OTP & Sign In'}
                </span>
              </button>

              {/* Resend & Back controls */}
              <div className="flex items-center justify-between text-xs pt-1">
                <button
                  type="button"
                  onClick={() => setMode('signin')}
                  className="text-slate-400 hover:text-slate-200 cursor-pointer"
                >
                  ← Back to Sign In
                </button>

                <button
                  type="button"
                  onClick={handleResendOtp}
                  disabled={resendCooldown > 0}
                  className="text-emerald-400 hover:text-emerald-300 disabled:text-slate-500 font-medium flex items-center gap-1 cursor-pointer"
                >
                  <RefreshCw className={`w-3 h-3 ${resendCooldown > 0 ? 'animate-spin' : ''}`} />
                  <span>
                    {resendCooldown > 0 ? `Resend code in ${resendCooldown}s` : 'Resend WhatsApp Code'}
                  </span>
                </button>
              </div>
            </div>
          )}

          {/* VIEW 4: FORGOT PASSWORD */}
          {mode === 'forgot_password' && (
            <form onSubmit={handleForgotPassword} className="space-y-4">
              <div className="space-y-1">
                <h4 className="text-base font-bold text-white">Reset Your Password</h4>
                <p className="text-xs text-slate-400">
                  Enter your WhatsApp mobile number to receive a secure password reset OTP code.
                </p>
              </div>

              {/* WhatsApp Phone Number */}
              <div className="space-y-1">
                <label className="text-xs text-emerald-400 font-medium flex items-center gap-1.5">
                  <MessageSquare className="w-3.5 h-3.5 text-[#25D366]" />
                  <span>WhatsApp Number for Reset OTP</span>
                </label>
                <div className="flex gap-2">
                  <select
                    value={countryCode}
                    onChange={(e) => setCountryCode(e.target.value)}
                    className="px-2 py-2 bg-slate-950 border border-slate-700 rounded-xl text-xs text-slate-200 focus:outline-none focus:border-emerald-500 shrink-0 font-mono"
                  >
                    {COUNTRY_CODES.map((c) => (
                      <option key={c.code} value={c.code}>
                        {c.code} ({c.country})
                      </option>
                    ))}
                  </select>
                  <input
                    type="tel"
                    required
                    value={whatsappPhone}
                    onChange={(e) => setWhatsappPhone(e.target.value)}
                    placeholder="WhatsApp Phone Number"
                    className="flex-1 px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500 transition-colors font-mono"
                  />
                </div>
              </div>

              {/* Optional Email */}
              <div className="space-y-1">
                <label className="text-xs text-slate-300 font-medium flex items-center gap-1.5">
                  <Mail className="w-3.5 h-3.5 text-slate-400" />
                  <span>Associated Email (Optional)</span>
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="engineer@domain.com"
                  className="w-full px-3.5 py-2 bg-slate-950 border border-slate-700 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-sky-500 transition-colors"
                />
              </div>

              {/* Submit Reset Request */}
              <button
                type="submit"
                disabled={isLoading}
                className="w-full py-2.5 bg-[#25D366] hover:bg-[#20bd5a] text-slate-950 font-bold text-xs rounded-xl shadow-lg shadow-emerald-950/50 flex items-center justify-center gap-2 transition-all cursor-pointer"
              >
                <MessageSquare className="w-4 h-4 fill-current" />
                <span>Send Reset OTP via WhatsApp</span>
              </button>

              <div className="text-center pt-1">
                <button
                  type="button"
                  onClick={() => setMode('signin')}
                  className="text-xs text-slate-400 hover:text-slate-200 cursor-pointer"
                >
                  ← Remember your password? Sign In
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};
