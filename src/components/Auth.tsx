import { useState, useEffect, FormEvent } from 'react';
import { User, AppLanguage } from '../types';
import { ShieldCheck, LogIn, Sparkles, UserCheck, KeyRound, Lock, CreditCard, ChevronRight, Check } from 'lucide-react';
import { DICTIONARY } from '../data';
import { auth, googleAuthProvider } from '../lib/firebase.ts';
import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signInWithPopup
} from 'firebase/auth';

interface AuthProps {
  onLogin: (user: User) => void;
  language: AppLanguage;
}

export default function Auth({ onLogin, language }: AuthProps) {
  const [isRegisterMode, setIsRegisterMode] = useState(false);
  const [role, setRole] = useState<'user' | 'dealer'>('user');
  
  // Registration / LogIn state variables
  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  
  // UX Alerts & Animations
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const t = DICTIONARY[language];

  // Pre-fill demo profiles instantly to make developer review/testing incredibly smooth!
  const prefillDemo = (type: 'standard' | 'dealer') => {
    if (type === 'standard') {
      setEmail('user@veloce.com');
      setPassword('password123');
      setConfirmPassword('password123');
      setRole('user');
      setIsRegisterMode(false);
      setErrorMessage(null);
    } else {
      setEmail('dealer@veloce.com');
      setPassword('password123');
      setConfirmPassword('password123');
      setRole('dealer');
      setIsRegisterMode(false);
      setErrorMessage(null);
    }
  };

  // Helper: Call the synced route
  const syncProfileOnServer = async (firebaseUser: any, selectedName?: string, selectedRole?: string) => {
    const token = await firebaseUser.getIdToken();
    const response = await fetch('/api/auth/sync', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({
        name: selectedName || firebaseUser.displayName,
        role: selectedRole || 'user',
        avatar: firebaseUser.photoURL
      })
    });
    if (!response.ok) {
      throw new Error('Could not synchronize profile with Cloud SQL backend.');
    }
    return await response.json();
  };

  // Helper: Fetch standard logged in profile from table
  const fetchProfileFromServer = async (firebaseUser: any) => {
    const token = await firebaseUser.getIdToken();
    const response = await fetch('/api/auth/profile', {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
    if (!response.ok) {
      throw new Error('Retrieving backend profile failed.');
    }
    return await response.json();
  };

  // CORE AUTH: REGISTER & LOGIN SUBMISSIONS
  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setSuccessMessage(null);

    if (isRegisterMode) {
      // 1. REGISTRATION PHASE
      if (!name || !email || !password || !confirmPassword) {
        setErrorMessage('All credential fields are required.');
        return;
      }

      if (password.length < 6) {
        setErrorMessage('Under security guidelines, path passwords must contain at least 6 characters.');
        return;
      }

      if (password !== confirmPassword) {
        setErrorMessage('Passwords do not match.');
        return;
      }

      setIsProcessing(true);

      try {
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        setSuccessMessage('Secure account registered! Synchronizing Veloce access...');
        
        // Sync profile inside the Postgres DB
        const syncedProfile = await syncProfileOnServer(userCredential.user, name, role);

        setTimeout(() => {
          setIsProcessing(false);
          onLogin({
            id: syncedProfile.id,
            name: syncedProfile.fullName || name,
            email: syncedProfile.email,
            avatar: syncedProfile.avatarUrl || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?q=80&w=150',
            role: syncedProfile.role,
            likedCarIds: [],
            savedCarIds: [],
            subscriptionTier: syncedProfile.subscriptionTier,
            kycStatus: syncedProfile.kycStatus,
            isKycVerified: syncedProfile.kycStatus === 'verified'
          });
        }, 1200);
      } catch (err: any) {
        console.error('Registration failed:', err);
        setIsProcessing(false);
        if (err.code === 'auth/email-already-in-use') {
          setErrorMessage('This email address is already registered in Firebase.');
        } else {
          setErrorMessage(err.message || 'An error occurred during secure registration.');
        }
      }
    } else {
      // 2. LOGIN PHASE
      if (!email || !password) {
        setErrorMessage('Email address and password are required.');
        return;
      }

      setIsProcessing(true);

      // Self-healing attempt function for demo credentials to make first run seamless
      const attemptLogin = async () => {
        try {
          const userCredential = await signInWithEmailAndPassword(auth, email, password);
          const syncedProfile = await fetchProfileFromServer(userCredential.user);
          
          setSuccessMessage('Authentication verified! Loading console...');
          setTimeout(() => {
            setIsProcessing(false);
            onLogin({
              id: syncedProfile.id,
              name: syncedProfile.fullName,
              email: syncedProfile.email,
              avatar: syncedProfile.avatarUrl,
              role: syncedProfile.role,
              likedCarIds: [],
              savedCarIds: [],
              subscriptionTier: syncedProfile.subscriptionTier,
              kycStatus: syncedProfile.kycStatus,
              isKycVerified: syncedProfile.kycStatus === 'verified'
            });
          }, 1200);
          return true;
        } catch (err: any) {
          return err;
        }
      };

      const result = await attemptLogin();
      if (result === true) return;

      // Self healing check: If it was the standard test demo and was not in Firebase yet, let's auto-register them!
      const isDemoUser = email === 'user@veloce.com' && password === 'password123';
      const isDemoDealer = email === 'dealer@veloce.com' && password === 'password123';

      if ((isDemoUser || isDemoDealer) && (result.code === 'auth/invalid-credential' || result.code === 'auth/user-not-found' || result.code === 'auth/wrong-password')) {
        try {
          setSuccessMessage('First-time demo profile auto-provisioning initiated on Cloud SQL...');
          const promoRole = isDemoDealer ? 'dealer' : 'user';
          const promoName = isDemoDealer ? 'Scuderia Importers Beverly Hills' : 'Max Cavallino';
          
          await createUserWithEmailAndPassword(auth, email, password);
          const userCredential = await signInWithEmailAndPassword(auth, email, password);
          const syncedProfile = await syncProfileOnServer(userCredential.user, promoName, promoRole);
          
          setSuccessMessage('Demo sandbox synchronized beautifully! Logging in...');
          setTimeout(() => {
            setIsProcessing(false);
            onLogin({
              id: syncedProfile.id,
              name: syncedProfile.fullName,
              email: syncedProfile.email,
              avatar: syncedProfile.avatarUrl,
              role: syncedProfile.role,
              likedCarIds: [],
              savedCarIds: [],
              subscriptionTier: syncedProfile.subscriptionTier,
              kycStatus: syncedProfile.kycStatus,
              isKycVerified: syncedProfile.kycStatus === 'verified'
            });
          }, 1200);
        } catch (healErr: any) {
          console.error('Self healing failed:', healErr);
          setIsProcessing(false);
          setErrorMessage('Secure login failed. Please cross-verify your credentials.');
        }
      } else {
        setIsProcessing(false);
        if (result.code === 'auth/invalid-credential' || result.code === 'auth/user-not-found' || result.code === 'auth/wrong-password') {
          setErrorMessage('Access Denied. Password or email mismatch.');
        } else {
          setErrorMessage(result.message || 'An error occurred during authentication.');
        }
      }
    }
  };

  // Google OAuth Signin Flow
  const handleGoogleSignIn = async () => {
    setIsProcessing(true);
    setErrorMessage(null);
    setSuccessMessage(null);
    try {
      const result = await signInWithPopup(auth, googleAuthProvider);
      setSuccessMessage('Google Account authenticated! Syncing credentials...');
      const syncedProfile = await fetchProfileFromServer(result.user);
      
      setTimeout(() => {
        setIsProcessing(false);
        onLogin({
          id: syncedProfile.id,
          name: syncedProfile.fullName,
          email: syncedProfile.email,
          avatar: syncedProfile.avatarUrl,
          role: syncedProfile.role,
          likedCarIds: [],
          savedCarIds: [],
          subscriptionTier: syncedProfile.subscriptionTier,
          kycStatus: syncedProfile.kycStatus,
          isKycVerified: syncedProfile.kycStatus === 'verified'
        });
      }, 1200);
    } catch (err: any) {
      console.error('Google login failed:', err);
      setIsProcessing(false);
      setErrorMessage(err.message || 'Google Auth flow was cancelled or interrupted.');
    }
  };

  return (
    <div 
      id="auth_container" 
      className={`relative w-full bg-[#0A0A0A] px-4 select-text flex flex-col items-center border-t-0 border-0 ${
        isRegisterMode 
          ? 'min-h-screen py-8 overflow-y-auto justify-start' 
          : 'h-screen h-[100dvh] overflow-hidden justify-start pt-10 xs:pt-16 sm:justify-center sm:pt-0'
      }`}
    >
      
      {/* Central Solid Console Card */}
      <div 
        id="auth_card" 
        className={`w-full max-w-md bg-[#0A0A0A] rounded-3xl p-6 sm:p-8 shadow-xl relative z-10 transition-all duration-300 ${
          isRegisterMode ? 'space-y-4 my-2' : 'space-y-4 my-auto'
        }`}
      >
        
        {/* Branding header */}
        <div className="text-center">
          <h1 className="text-2xl sm:text-3xl tracking-[0.2em] font-light text-stone-100 uppercase font-sans">
            Veloce
          </h1>
          <p className="text-[8.5px] tracking-[0.35em] text-stone-400 uppercase mt-1 leading-none">
            {t.tagline}
          </p>
        </div>

        {/* Dynamic Preset Prefill Banner */}
        <div className="p-3 bg-stone-950 border border-amber-500/10 rounded-2xl flex flex-col gap-1.5">
          <span className="text-[8.5px] font-mono uppercase tracking-wider text-amber-500/80 font-black">
            Testing Sandbox Controls (Auto-Heal)
          </span>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => prefillDemo('standard')}
              className="flex-1 py-1 px-2 border border-stone-800 hover:border-stone-700 bg-stone-900/40 text-[9px] font-mono text-stone-300 uppercase rounded-lg transition"
            >
              Demo User
            </button>
            <button
              type="button"
              onClick={() => prefillDemo('dealer')}
              className="flex-1 py-1 px-2 border border-stone-800 hover:border-stone-700 bg-stone-900/40 text-[9px] font-mono text-stone-300 uppercase rounded-lg transition"
            >
              Demo Dealer
            </button>
          </div>
        </div>

        {/* Action Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          
          {/* Mode Switch header */}
          <div className="grid grid-cols-2 p-1 bg-stone-950 rounded-xl">
            <button
              type="button"
              onClick={() => {
                setIsRegisterMode(false);
                setErrorMessage(null);
              }}
              className={`py-2 text-[10px] tracking-widest font-mono uppercase rounded-lg transition ${
                !isRegisterMode ? 'bg-stone-900 text-amber-500 font-black' : 'text-stone-500 hover:text-stone-300'
              }`}
            >
              Login
            </button>
            <button
              type="button"
              onClick={() => {
                setIsRegisterMode(true);
                setErrorMessage(null);
              }}
              className={`py-2 text-[10px] tracking-widest font-mono uppercase rounded-lg transition ${
                isRegisterMode ? 'bg-stone-900 text-amber-500 font-black' : 'text-stone-500 hover:text-stone-300'
              }`}
            >
              Register
            </button>
          </div>

          {/* Core Credentials Input fields */}
          <div className="space-y-3.5">
            {isRegisterMode && (
              <div>
                <label className="block text-[9.5px] uppercase tracking-widest text-stone-500 mb-1 font-mono font-semibold">
                  Full Name
                </label>
                <input
                  id="auth_input_name"
                  type="text"
                  placeholder="e.g. Max Stirling"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full py-2.5 px-4 bg-stone-950/60 rounded-xl border border-stone-850 text-stone-200 text-xs focus:outline-none focus:border-stone-700 focus:ring-1 focus:ring-stone-700 transition"
                  required
                />
              </div>
            )}

            <div>
              <label className="block text-[9.5px] uppercase tracking-widest text-stone-500 mb-1 font-mono font-semibold">
                Email Address
              </label>
              <input
                id="auth_input_email"
                type="email"
                placeholder="user@veloce.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full py-2.5 px-4 bg-stone-950/60 rounded-xl border border-stone-850 text-stone-200 text-xs focus:outline-none focus:border-stone-700 focus:ring-1 focus:ring-stone-700 transition"
                required
              />
            </div>

            <div>
              <label className="block text-[9.5px] uppercase tracking-widest text-stone-500 mb-1 font-mono font-semibold">
                Password
              </label>
              <input
                id="auth_input_password"
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full py-2.5 px-4 bg-stone-950/60 rounded-xl border border-stone-850 text-stone-200 text-xs focus:outline-none focus:border-stone-700 focus:ring-1 focus:ring-stone-700 transition"
                required
              />
            </div>

            {isRegisterMode && (
              <div>
                <label className="block text-[9.5px] uppercase tracking-widest text-stone-500 mb-1 font-mono font-semibold">
                  Confirm Password
                </label>
                <input
                  id="auth_input_confirm_password"
                  type="password"
                  placeholder="••••••••"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="w-full py-2.5 px-4 bg-stone-950/60 rounded-xl border border-stone-850 text-stone-200 text-xs focus:outline-none focus:border-stone-700 focus:ring-1 focus:ring-stone-700 transition"
                  required={isRegisterMode}
                />
              </div>
            )}
          </div>

          {/* Registration Role Selection which has replaced local dealer signup forms */}
          {isRegisterMode && (
            <div className="space-y-4 pt-2 border-t border-stone-850/60">
              <div>
                <label className="block text-[9.5px] uppercase tracking-widest text-stone-500 mb-2 font-mono font-semibold">
                  Account Type:
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setRole('user')}
                    className={`py-3 px-2 flex flex-col justify-center items-center text-center rounded-xl border transition ${
                      role === 'user' 
                        ? 'bg-stone-950 border-amber-500 text-stone-105 font-bold' 
                        : 'bg-stone-950/30 border-stone-850 text-stone-500'
                    }`}
                  >
                    <span className="text-[10px] font-mono uppercase font-black tracking-wider">User Account</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setRole('dealer')}
                    className={`py-3 px-2 flex flex-col justify-center items-center text-center rounded-xl border transition relative ${
                      role === 'dealer' 
                        ? 'bg-[#1a0c0c] border-[#ff2800] text-red-00' 
                        : 'bg-stone-950/30 border-stone-850 text-stone-500'
                    }`}
                  >
                    <span className="text-[10px] font-mono uppercase font-black tracking-wider text-red-400">
                      Dealer Account
                    </span>
                  </button>
                </div>
              </div>

              {role === 'dealer' && (
                <div className="p-4 bg-stone-950 border border-red-950/40 rounded-2xl space-y-2">
                  <div className="flex items-center gap-2 pb-1 text-red-400 font-mono text-[9px] uppercase tracking-wider font-extrabold">
                    <ShieldCheck className="w-3.5 h-3.5" />
                    <span>Compliance Notice (PCI-DSS)</span>
                  </div>
                  <p className="text-[9px] text-stone-500 leading-relaxed font-sans">
                    Veloce enforces zero raw card transmission. Your dealer license will register instantly, and premium subscription payment checkout will be securely processed outside our app via Stripe Checkout in the upcoming phase.
                  </p>
                </div>
              )}
            </div>
          )}

          {/* Errors, Processing or Success visual states */}
          {errorMessage && (
            <div className="p-3 bg-red-950/15 border border-red-500/30 text-[#f87171] text-[10.5px] rounded-xl text-center leading-relaxed">
              {errorMessage}
            </div>
          )}

          {successMessage && (
            <div className="p-3 bg-[#006B4F]/10 border border-[#006B4F]/30 text-emerald-400 text-[10.5px] rounded-xl text-center leading-relaxed">
              {successMessage}
            </div>
          )}

          {/* Submit Trigger Button */}
          <button
            id="auth_submit_main_btn"
            type="submit"
            disabled={isProcessing}
            className="w-full flex items-center justify-center gap-2 py-3 px-4 bg-amber-500 hover:bg-amber-450 disabled:bg-stone-800 disabled:text-stone-550 text-[#070708] rounded-xl font-mono text-xs font-extrabold uppercase tracking-widest transition shadow-lg shadow-amber-500/10 cursor-pointer"
          >
            {isProcessing ? (
              <span className="animate-pulse">{isRegisterMode ? 'Creating Account...' : 'Signing In...'}</span>
            ) : (
              <>
                <LogIn className="w-4 h-4" />
                <span>{isRegisterMode ? 'Create Account' : 'Sign In'}</span>
              </>
            )}
          </button>
        </form>

        {/* OR divider */}
        <div className="flex items-center justify-center my-2 text-stone-600 font-mono text-[9px] uppercase tracking-wider">
          <div className="flex-1 h-[1px] bg-stone-850" />
          <span className="px-3">or continue with</span>
          <div className="flex-1 h-[1px] bg-stone-850" />
        </div>

        {/* Social Buttons */}
        <div className="flex flex-col gap-2.5 pb-1">
          <button
            type="button"
            onClick={handleGoogleSignIn}
            disabled={isProcessing}
            className="w-full flex items-center justify-center gap-3 py-2.5 px-4 bg-white hover:bg-stone-100 border border-stone-200 rounded-xl text-[#1f1f1f] font-sans text-xs font-semibold transition duration-200 cursor-pointer shadow-sm active:scale-[0.99] disabled:opacity-50"
          >
            <svg className="w-4 h-4 flex-shrink-0" viewBox="0 0 24 24" fill="none">
              <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
              <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
              <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l3.66-2.85z" fill="#FBBC05" />
              <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.85c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
            </svg>
            <span className="font-sans font-bold">Continue with Google</span>
          </button>
          
          <button
            type="button"
            onClick={() => {
              alert('Apple Sign In is standardly supported inside our iOS App Store build. For web environment testing features, please leverage the Google Sign-in or prefilled sandbox accounts.');
            }}
            className="w-full flex items-center justify-center gap-3 py-2.5 px-4 bg-black hover:bg-stone-900 border border-stone-850 rounded-xl text-white font-sans text-xs font-semibold transition duration-200 cursor-pointer shadow-sm active:scale-[0.99]"
          >
            <svg className="w-4 h-4 fill-current text-white flex-shrink-0" viewBox="0 0 24 24">
              <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.81-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M15.97 4.17c.66-.81 1.11-1.93.99-3.06-1 .04-2.15.65-2.87 1.49-.62.71-1.16 1.85-1.01 2.96 1.09.08 2.22-.58 2.89-1.39z" />
            </svg>
            <span className="font-sans font-bold">Continue with Apple</span>
          </button>
        </div>

        {/* Security verification footer */}
        <div className="pt-4 text-center space-y-1.5">
          <div className="flex items-center justify-center gap-1.5 text-[9.5px] text-stone-500 font-mono tracking-wider">
            <ShieldCheck className="w-3.5 h-3.5 text-stone-400" />
            <span>SECURE CLOUD OAUTH SYNC</span>
          </div>
          <p className="text-[8px] text-stone-600 font-mono uppercase">
            All user authentication is privately secured and verified.
          </p>
        </div>

      </div>
    </div>
  );
}
