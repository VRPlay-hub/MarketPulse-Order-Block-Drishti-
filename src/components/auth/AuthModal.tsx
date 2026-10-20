import React, { useState } from 'react';
import {
  X,
  User as UserIcon,
  LogIn,
  UserPlus,
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  Database,
  ArrowRightLeft
} from 'lucide-react';
import {
  signInWithGoogle,
  registerSecureAccount,
  loginSecureAccount,
  switchTestTrader,
  signOutUser,
  type AppUser
} from '../../services/authService.ts';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: AppUser | null;
  isCloudConnected: boolean;
  onUserChanged: (user: AppUser | null) => void;
}

export const AuthModal: React.FC<AuthModalProps> = ({
  isOpen,
  onClose,
  currentUser,
  isCloudConnected,
  onUserChanged
}) => {
  const [mode, setMode] = useState<'signin' | 'register'>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleGoogleSignIn = async () => {
    setIsLoading(true);
    setErrorMsg(null);
    setSuccessMsg(null);
    try {
      const user = await signInWithGoogle();
      onUserChanged(user);
      setSuccessMsg(`Welcome back, ${user.displayName}! Signed in with Google.`);
      setTimeout(() => {
        onClose();
      }, 1200);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Google authentication failed';
      setErrorMsg(`Google Sign-In: ${msg}`);
    } finally {
      setIsLoading(false);
    }
  };

  const handleEmailAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setErrorMsg(null);
    setSuccessMsg(null);

    try {
      if (mode === 'register') {
        const user = await registerSecureAccount(email, password, displayName);
        onUserChanged(user);
        setSuccessMsg(`Account created securely! Logged in as ${user.displayName}.`);
      } else {
        const user = await loginSecureAccount(email, password);
        onUserChanged(user);
        setSuccessMsg(`Welcome back, ${user.displayName}!`);
      }
      setTimeout(() => {
        onClose();
      }, 1200);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Authentication failed';
      setErrorMsg(msg);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSwitchTrader = async (trader: 'Alice' | 'Bob') => {
    setIsLoading(true);
    setErrorMsg(null);
    try {
      const user = await switchTestTrader(trader);
      onUserChanged(user);
      setSuccessMsg(`Switched to test profile: ${user.displayName}. Data is completely isolated.`);
      setTimeout(() => {
        onClose();
      }, 1200);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Switch failed';
      setErrorMsg(msg);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSignOut = async () => {
    setIsLoading(true);
    try {
      await signOutUser();
      onUserChanged(null);
      setSuccessMsg('Signed out successfully.');
      setTimeout(() => {
        onClose();
      }, 900);
    } catch (err: unknown) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-xs">
      <div className="relative w-full max-w-lg bg-slate-900 border border-slate-800 rounded-xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between bg-slate-900/90 shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-semibold text-white">
                {currentUser ? 'Trader Account & Profile' : 'Trader Sign In & Persistence'}
              </h3>
              <p className="text-xs text-slate-400">
                Secure Authentication & Zero-Trust Private Storage
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Cloud Connection Strip */}
        <div className="px-6 py-2.5 bg-slate-950 border-b border-slate-800/80 flex items-center justify-between text-xs shrink-0">
          <div className="flex items-center gap-2">
            <Database className="w-3.5 h-3.5 text-emerald-400" />
            <span className="text-slate-300 font-medium">Firestore Engine:</span>
            <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-950 text-emerald-300 border border-emerald-800/50">
              {isCloudConnected ? 'Cloud Active (Provisioned)' : 'Verified Local Store'}
            </span>
          </div>
          <span className="text-[11px] text-slate-400">Zero-Trust Rules Enforced</span>
        </div>

        {/* Content Body */}
        <div className="p-6 overflow-y-auto space-y-6">
          {errorMsg && (
            <div className="p-3.5 rounded-lg bg-red-950/40 border border-red-800/60 text-red-300 text-xs flex items-start gap-2.5">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{errorMsg}</span>
            </div>
          )}

          {successMsg && (
            <div className="p-3.5 rounded-lg bg-emerald-950/40 border border-emerald-800/60 text-emerald-300 text-xs flex items-start gap-2.5">
              <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{successMsg}</span>
            </div>
          )}

          {currentUser ? (
            /* Logged in view */
            <div className="space-y-4">
              <div className="p-4 rounded-xl bg-slate-800/40 border border-slate-700/60 space-y-3">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-full bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center text-emerald-400 font-bold text-lg">
                    {currentUser.photoURL ? (
                      <img
                        src={currentUser.photoURL}
                        alt="Profile"
                        className="w-full h-full rounded-full object-cover"
                      />
                    ) : (
                      currentUser.displayName.charAt(0).toUpperCase()
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h4 className="text-sm font-semibold text-white truncate">
                      {currentUser.displayName}
                    </h4>
                    <p className="text-xs text-slate-400 truncate">{currentUser.email}</p>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="px-2 py-0.5 rounded text-[10px] font-medium bg-slate-800 text-slate-300 border border-slate-700">
                        {currentUser.provider === 'firebase-google' ? 'Google Auth' : 'Verified Secure Account'}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="pt-3 border-t border-slate-700/60 grid grid-cols-2 gap-2 text-xs">
                  <div>
                    <span className="text-slate-400 block text-[11px]">User UID</span>
                    <span className="font-mono text-slate-200 text-[11px] truncate block" title={currentUser.uid}>
                      {currentUser.uid.slice(0, 16)}...
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[11px]">Data Partition</span>
                    <span className="text-emerald-400 font-medium text-[11px] flex items-center gap-1">
                      <CheckCircle2 className="w-3 h-3" /> Isolated Space
                    </span>
                  </div>
                </div>
              </div>

              {/* Profile actions */}
              <div className="space-y-2">
                <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                  Switch Active Test Trader (Isolate Data)
                </p>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    disabled={isLoading}
                    onClick={() => handleSwitchTrader('Alice')}
                    className="p-2.5 rounded-lg bg-slate-800/80 hover:bg-slate-700 border border-slate-700 text-left transition flex items-center justify-between"
                  >
                    <div>
                      <div className="text-xs font-medium text-white">Alice Trader</div>
                      <div className="text-[10px] text-slate-400">Nifty Scalper (Private)</div>
                    </div>
                    <ArrowRightLeft className="w-3.5 h-3.5 text-slate-400" />
                  </button>
                  <button
                    type="button"
                    disabled={isLoading}
                    onClick={() => handleSwitchTrader('Bob')}
                    className="p-2.5 rounded-lg bg-slate-800/80 hover:bg-slate-700 border border-slate-700 text-left transition flex items-center justify-between"
                  >
                    <div>
                      <div className="text-xs font-medium text-white">Bob Swing</div>
                      <div className="text-[10px] text-slate-400">BankNifty (Private)</div>
                    </div>
                    <ArrowRightLeft className="w-3.5 h-3.5 text-slate-400" />
                  </button>
                </div>
              </div>

              <button
                type="button"
                disabled={isLoading}
                onClick={handleSignOut}
                className="w-full py-2.5 px-4 rounded-lg bg-red-950/40 hover:bg-red-900/50 text-red-300 border border-red-800/50 text-xs font-medium transition"
              >
                Sign Out of Terminal
              </button>
            </div>
          ) : (
            /* Logged out: Sign in or Register form */
            <div className="space-y-5">
              {/* Google Button */}
              <button
                type="button"
                disabled={isLoading}
                onClick={handleGoogleSignIn}
                className="w-full flex items-center justify-center gap-3 py-2.5 px-4 rounded-lg bg-white hover:bg-slate-100 text-slate-900 text-xs font-semibold transition shadow-sm"
              >
                <svg className="w-4 h-4" viewBox="0 0 24 24">
                  <path
                    fill="#4285F4"
                    d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                  />
                  <path
                    fill="#34A853"
                    d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                  />
                  <path
                    fill="#FBBC05"
                    d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                  />
                  <path
                    fill="#EA4335"
                    d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                  />
                </svg>
                Continue with Google (Firebase Auth)
              </button>

              <div className="relative flex items-center justify-center">
                <div className="border-t border-slate-800 w-full"></div>
                <span className="bg-slate-900 px-3 text-[11px] text-slate-500 uppercase tracking-wider">
                  or secure password login
                </span>
              </div>

              {/* Mode Toggle */}
              <div className="flex rounded-lg bg-slate-950 p-1 border border-slate-800">
                <button
                  type="button"
                  onClick={() => setMode('signin')}
                  className={`flex-1 py-1.5 text-xs font-medium rounded-md transition ${
                    mode === 'signin'
                      ? 'bg-slate-800 text-white shadow-xs'
                      : 'text-slate-400 hover:text-slate-300'
                  }`}
                >
                  Sign In
                </button>
                <button
                  type="button"
                  onClick={() => setMode('register')}
                  className={`flex-1 py-1.5 text-xs font-medium rounded-md transition ${
                    mode === 'register'
                      ? 'bg-slate-800 text-white shadow-xs'
                      : 'text-slate-400 hover:text-slate-300'
                  }`}
                >
                  Create Account
                </button>
              </div>

              {/* Email/Password Form */}
              <form onSubmit={handleEmailAuth} className="space-y-3.5">
                {mode === 'register' && (
                  <div>
                    <label className="block text-xs font-medium text-slate-300 mb-1">
                      Trader Display Name
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Vikram Sharma"
                      value={displayName}
                      onChange={(e) => setDisplayName(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-xs text-white placeholder-slate-500 focus:outline-hidden focus:border-emerald-500 transition"
                    />
                  </div>
                )}

                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">
                    Email Address
                  </label>
                  <input
                    type="email"
                    required
                    placeholder="trader@nse-market.in"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-xs text-white placeholder-slate-500 focus:outline-hidden focus:border-emerald-500 transition"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">
                    Password (SHA-256 Cryptographically Salted)
                  </label>
                  <input
                    type="password"
                    required
                    minLength={6}
                    placeholder="••••••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-xs text-white placeholder-slate-500 focus:outline-hidden focus:border-emerald-500 transition"
                  />
                  <p className="text-[10px] text-slate-500 mt-1">
                    Zero-plaintext storage: Passwords are salted and hashed on the client.
                  </p>
                </div>

                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold transition shadow-xs disabled:opacity-50"
                >
                  {mode === 'signin' ? (
                    <>
                      <LogIn className="w-4 h-4" /> Sign In to Terminal
                    </>
                  ) : (
                    <>
                      <UserPlus className="w-4 h-4" /> Create Private Account
                    </>
                  )}
                </button>
              </form>

              {/* Fast Test Trader Switcher */}
              <div className="pt-2 border-t border-slate-800/80 space-y-2">
                <span className="text-[11px] text-slate-400 block font-medium">
                  Instant Test Profile (Verify User Isolation):
                </span>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    disabled={isLoading}
                    onClick={() => handleSwitchTrader('Alice')}
                    className="p-2 rounded-lg bg-slate-950 hover:bg-slate-800 border border-slate-800 text-left transition flex items-center justify-between"
                  >
                    <div>
                      <div className="text-xs font-medium text-slate-200">Trader Alice</div>
                      <div className="text-[10px] text-emerald-400">Isolated Space A</div>
                    </div>
                    <UserIcon className="w-3.5 h-3.5 text-slate-500" />
                  </button>
                  <button
                    type="button"
                    disabled={isLoading}
                    onClick={() => handleSwitchTrader('Bob')}
                    className="p-2 rounded-lg bg-slate-950 hover:bg-slate-800 border border-slate-800 text-left transition flex items-center justify-between"
                  >
                    <div>
                      <div className="text-xs font-medium text-slate-200">Trader Bob</div>
                      <div className="text-[10px] text-cyan-400">Isolated Space B</div>
                    </div>
                    <UserIcon className="w-3.5 h-3.5 text-slate-500" />
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Privacy & Authorization Assurance */}
          <div className="p-3 rounded-lg bg-slate-950/60 border border-slate-800 text-[11px] text-slate-400 space-y-1">
            <div className="flex items-center gap-1.5 text-slate-300 font-medium">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
              <span>Strict Zero-Trust Rules & Authorization</span>
            </div>
            <p>
              User watchlists, trade records, PnL calculations, notes, and chart preferences are strictly partitioned. Users can never view or modify another trader&apos;s private data.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
