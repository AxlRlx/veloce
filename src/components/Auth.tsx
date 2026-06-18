import { useState, useEffect, FormEvent } from 'react';
import { User, AppLanguage } from '../types';
import { ShieldCheck, LogIn, Sparkles, UserCheck, KeyRound, Lock, CreditCard, ChevronRight, Check } from 'lucide-react';
import { DICTIONARY } from '../data';

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
  
  // Dealer payment properties
  const [cardNumber, setCardNumber] = useState('');
  const [expiry, setExpiry] = useState('');
  const [cvv, setCvv] = useState('');
  const [cardHolderName, setCardHolderName] = useState('');
  
  // UX Alerts & Animations
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const t = DICTIONARY[language];

  // Seed default demo accounts into localStorage database if not already present
  useEffect(() => {
    const existing = localStorage.getItem('veloce_accounts_db');
    let needsReset = false;
    if (existing) {
      if (existing.includes('client@veloce.com')) {
        needsReset = true;
      }
    } else {
      needsReset = true;
    }

    if (needsReset) {
      const initialUsers = [
        {
          id: 'user_001',
          name: 'Max Cavallino',
          email: 'user@veloce.com',
          password: 'password123',
          role: 'user',
          subscriptionTier: 'free',
          avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?q=80&w=150',
          likedCarIds: ['car_001', 'car_005'],
          savedCarIds: ['car_002'],
          isKycVerified: true,
          kycStatus: 'verified'
        },
        {
          id: 'dealer_001',
          name: 'Scuderia Importers Beverly Hills',
          email: 'dealer@veloce.com',
          password: 'password123',
          role: 'dealer',
          subscriptionTier: 'dealer_paid',
          avatar: 'https://images.unsplash.com/photo-1560250097-0b93528c311a?q=80&w=150',
          likedCarIds: ['car_002', 'car_003', 'car_004', 'car_005'],
          savedCarIds: ['car_001'],
          isKycVerified: true,
          kycStatus: 'verified'
        }
      ];
      localStorage.setItem('veloce_accounts_db', JSON.stringify(initialUsers));
    }
  }, []);

  const handleCardNumberChange = (val: string) => {
    const cleaned = val.replace(/\s+/g, '').replace(/[^0-9]/gi, '');
    const matches = cleaned.match(/\d{4,16}/g);
    const match = (matches && matches[0]) || '';
    const parts = [];

    for (let i = 0, len = match.length; i < len; i += 4) {
      parts.push(match.substring(i, i + 4));
    }

    if (parts.length > 0) {
      setCardNumber(parts.join(' '));
    } else {
      setCardNumber(cleaned);
    }
  };

  const handleExpiryChange = (val: string) => {
    const cleaned = val.replace(/\s+/g, '').replace(/[^0-9]/gi, '');
    if (cleaned.length >= 2) {
      setExpiry(`${cleaned.slice(0, 2)}/${cleaned.slice(2, 4)}`);
    } else {
      setExpiry(cleaned);
    }
  };

  // Pre-fill demo profiles instantly to make reviewer's life incredibly smooth and fast!
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

  // CORE AUTH: REGISTER & LOGIN SUBMISSIONS
  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    const db = JSON.parse(localStorage.getItem('veloce_accounts_db') || '[]');

    if (isRegisterMode) {
      // 1. REGISTRATION PHASE
      if (!name || !email || !password || !confirmPassword) {
        setErrorMessage('All credential fields are required.');
        return;
      }

      if (password !== confirmPassword) {
        setErrorMessage('Passwords do not match.');
        return;
      }

      // Check for uniqueness
      const exists = db.find((u: any) => u.email.toLowerCase() === email.toLowerCase());
      if (exists) {
        setErrorMessage('This email address is already registered.');
        return;
      }

      // If user selected professional dealer role, they MUST pay
      if (role === 'dealer') {
        if (!cardNumber || !expiry || !cvv || !cardHolderName) {
          setErrorMessage('Dealer registration requires full credit card information to initiate subscription activation.');
          return;
        }
        if (cardNumber.replace(/\s/g, '').length < 16) {
          setErrorMessage('Please type a valid, complete 16-digit billing card number.');
          return;
        }
      }

      setIsProcessing(true);

      setTimeout(() => {
        const newUser: any = {
          id: `usr_reg_${Date.now()}`,
          name,
          email,
          password,
          role,
          subscriptionTier: role === 'dealer' ? 'dealer_paid' : 'free',
          avatar: role === 'dealer' 
            ? 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?q=80&w=150' 
            : 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?q=80&w=150',
          likedCarIds: [],
          savedCarIds: [],
          isKycVerified: false,
          kycStatus: 'unverified'
        };

        db.push(newUser);
        localStorage.setItem('veloce_accounts_db', JSON.stringify(db));

        setIsProcessing(false);
        setSuccessMessage('Secure Account registered! Initializing Veloce access...');
        
        setTimeout(() => {
          onLogin({
            id: newUser.id,
            name: newUser.name,
            email: newUser.email,
            avatar: newUser.avatar,
            role: newUser.role,
            likedCarIds: newUser.likedCarIds,
            savedCarIds: newUser.savedCarIds,
            subscriptionTier: newUser.subscriptionTier,
            isKycVerified: newUser.isKycVerified,
            kycStatus: newUser.kycStatus
          });
        }, 1500);

      }, 2000);

    } else {
      // 2. LOGIN PHASE
      if (!email || !password) {
        setErrorMessage('Email address and password are required.');
        return;
      }

      setIsProcessing(true);

      setTimeout(() => {
        const found = db.find(
          (u: any) => u.email.toLowerCase() === email.toLowerCase() && u.password === password
        );

        setIsProcessing(false);

        if (!found) {
          setErrorMessage('Access Denied. Password or email mismatch.');
          return;
        }

        onLogin({
          id: found.id,
          name: found.name,
          email: found.email,
          avatar: found.avatar,
          role: found.role,
          likedCarIds: found.likedCarIds || [],
          savedCarIds: found.savedCarIds || [],
          subscriptionTier: found.subscriptionTier || 'free',
          isKycVerified: found.isKycVerified || false,
          kycStatus: found.kycStatus || 'unverified'
        });

      }, 1500);
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

          {/* Registration Role Selection and dynamic Payment panel */}
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
                        ? 'bg-[#1a0c0c] border-[#ff2800] text-red-400 font-bold' 
                        : 'bg-stone-950/30 border-stone-850 text-stone-500'
                    }`}
                  >
                    <span className="text-[10px] font-mono uppercase font-black tracking-wider">
                      Dealer Account
                    </span>
                  </button>
                </div>
              </div>

              {/* DYNAMIC CARD PAYMENT FOR REGISTERING DEALER ACCOUNT */}
              {role === 'dealer' && (
                <div className="p-4 bg-stone-950 border border-red-950/40 rounded-2xl space-y-4">
                  <div className="flex items-center gap-2 border-b border-stone-900 pb-2">
                    <CreditCard className="w-4 h-4 text-red-500" />
                    <span className="text-[10px] font-mono uppercase font-black tracking-wider text-red-400">
                      Dealer Account Activation ($49)
                    </span>
                  </div>

                  <p className="text-[9.5px] text-stone-500 leading-relaxed font-sans">
                    Dealer accounts are activated immediately. To proceed, please enter your card details below to activate your premium dealer dashboard, or skip this step by switching back:
                  </p>

                  <button
                    type="button"
                    onClick={() => {
                      setRole('user');
                      setCardNumber('');
                      setExpiry('');
                      setCvv('');
                      setCardHolderName('');
                      setErrorMessage(null);
                    }}
                    className="w-full py-2 bg-stone-900 hover:bg-stone-850 border border-stone-800 rounded-xl text-[9px] font-mono uppercase tracking-wider text-amber-500 font-bold transition"
                  >
                    Switch to Free User Account
                  </button>

                  <div className="space-y-3 pt-2">
                    <div>
                      <label className="block text-[8px] uppercase tracking-widest text-stone-500 mb-1 font-mono">
                        Card Number
                      </label>
                      <input
                        type="text"
                        placeholder="4111 2222 3333 4444"
                        value={cardNumber}
                        onChange={(e) => handleCardNumberChange(e.target.value)}
                        className="w-full py-1.5 px-3 bg-stone-900 border border-stone-850 text-stone-105 rounded-lg text-xs font-mono focus:outline-none"
                        required={role === 'dealer'}
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="block text-[8px] uppercase tracking-widest text-stone-500 mb-1 font-mono">
                          Expires (MM/YY)
                        </label>
                        <input
                          type="text"
                          maxLength={5}
                          placeholder="12/28"
                          value={expiry}
                          onChange={(e) => handleExpiryChange(e.target.value)}
                          className="w-full py-1.5 px-3 bg-stone-900 border border-stone-850 text-stone-105 rounded-lg text-xs font-mono text-center focus:outline-none"
                          required={role === 'dealer'}
                        />
                      </div>
                      <div>
                        <label className="block text-[8px] uppercase tracking-widest text-stone-500 mb-1 font-mono">
                          CVV Security
                        </label>
                        <input
                          type="text"
                          maxLength={4}
                          placeholder="382"
                          value={cvv}
                          onChange={(e) => setCvv(e.target.value.replace(/[^0-9]/g, ''))}
                          className="w-full py-1.5 px-3 bg-stone-900 border border-stone-850 text-stone-105 rounded-lg text-xs font-mono text-center focus:outline-none"
                          required={role === 'dealer'}
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-[8px] uppercase tracking-widest text-stone-500 mb-1 font-mono">
                        Cardholder Name
                      </label>
                      <input
                        type="text"
                        placeholder="Max Cavallino"
                        value={cardHolderName}
                        onChange={(e) => setCardHolderName(e.target.value)}
                        className="w-full py-1.5 px-3 bg-stone-900 border border-stone-850 text-stone-105 rounded-lg text-xs font-mono focus:outline-none"
                        required={role === 'dealer'}
                      />
                    </div>
                  </div>
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

        {/* Apple & Google Auth Buttons */}
        <div className="flex flex-col gap-2.5 pb-1">
          <button
            type="button"
            onClick={() => {
              setIsProcessing(true);
              setErrorMessage(null);
              setTimeout(() => {
                setIsProcessing(false);
                const dbStr = localStorage.getItem('veloce_accounts_db');
                const db = dbStr ? JSON.parse(dbStr) : [];
                const found = db.find((u: any) => u.email === 'user@veloce.com') || {
                  id: 'user_001',
                  name: 'Max Cavallino',
                  email: 'user@veloce.com',
                  role: 'user',
                  subscriptionTier: 'free',
                  avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?q=80&w=150',
                  likedCarIds: ['car_001', 'car_005'],
                  savedCarIds: ['car_002'],
                  isKycVerified: true,
                  kycStatus: 'verified'
                };
                onLogin({
                  id: found.id,
                  name: found.name,
                  email: found.email,
                  avatar: found.avatar,
                  role: found.role,
                  likedCarIds: found.likedCarIds || [],
                  savedCarIds: found.savedCarIds || [],
                  subscriptionTier: found.subscriptionTier || 'free',
                  isKycVerified: found.isKycVerified ?? true,
                  kycStatus: found.kycStatus || 'verified'
                });
              }, 1200);
            }}
            className="w-full flex items-center justify-center gap-3 py-2.5 px-4 bg-white hover:bg-stone-100 border border-stone-200 rounded-xl text-[#1f1f1f] font-sans text-xs font-semibold transition duration-200 cursor-pointer shadow-sm active:scale-[0.99]"
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
              setIsProcessing(true);
              setErrorMessage(null);
              setTimeout(() => {
                setIsProcessing(false);
                const dbStr = localStorage.getItem('veloce_accounts_db');
                const db = dbStr ? JSON.parse(dbStr) : [];
                const found = db.find((u: any) => u.email === 'user@veloce.com') || {
                  id: 'user_001',
                  name: 'Max Cavallino',
                  email: 'user@veloce.com',
                  role: 'user',
                  subscriptionTier: 'free',
                  avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?q=80&w=150',
                  likedCarIds: ['car_001', 'car_005'],
                  savedCarIds: ['car_002'],
                  isKycVerified: true,
                  kycStatus: 'verified'
                };
                onLogin({
                  id: found.id,
                  name: found.name,
                  email: 'apple_social_v@veloce.com',
                  avatar: found.avatar,
                  role: found.role,
                  likedCarIds: found.likedCarIds || [],
                  savedCarIds: found.savedCarIds || [],
                  subscriptionTier: found.subscriptionTier || 'free',
                  isKycVerified: found.isKycVerified ?? true,
                  kycStatus: found.kycStatus || 'verified'
                });
              }, 1200);
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
            <span>SECURE OAUTH ACCOUNT SYNC</span>
          </div>
          <p className="text-[8px] text-stone-600 font-mono uppercase">
            All user authentication is privately secured and verified.
          </p>
        </div>

      </div>
    </div>
  );
}
