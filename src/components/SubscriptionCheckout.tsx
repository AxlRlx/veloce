import { useState, FormEvent, useEffect } from 'react';
import { AppLanguage } from '../types';
import { motion, AnimatePresence } from 'motion/react';
import { Shield, Sparkles, CreditCard, Lock, CheckCircle, ArrowLeft, Loader2, Globe } from 'lucide-react';
import { auth } from '../lib/firebase';

interface SubscriptionCheckoutProps {
  sessionId: string;
  language: AppLanguage;
  onSuccess: (profile: any) => void;
  onCancel: () => void;
}

export default function SubscriptionCheckout({ sessionId, language, onSuccess, onCancel }: SubscriptionCheckoutProps) {
  // Decode target plan and pricing from sessionId
  const isDealer = sessionId.includes('dealer_paid');
  const planName = isDealer ? 'Official Dealer Partner' : 'Veloce GT Member';
  const planPrice = isDealer ? 49 : 19;
  const planDescription = isDealer
    ? 'Premium features for agencies, custom importers, and prestigious car collectors.'
    : 'Unlimited favorites saves, unlimited swipes, custom community event postings.';

  // Fields
  const [email, setEmail] = useState('');
  const [cardName, setCardName] = useState('');
  const [cardNumber, setCardNumber] = useState('');
  const [expiry, setExpiry] = useState('');
  const [cvv, setCvv] = useState('');
  const [zipCode, setZipCode] = useState('');

  // States
  const [isProcessing, setIsProcessing] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Sync email on boot if auth is present
  useEffect(() => {
    if (auth.currentUser?.email) {
      setEmail(auth.currentUser.email);
    }
    if (auth.currentUser?.displayName) {
      setCardName(auth.currentUser.displayName);
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

    setCardNumber(parts.length > 0 ? parts.join(' ') : cleaned);
  };

  const handleExpiryChange = (val: string) => {
    const cleaned = val.replace(/[^0-9]/gi, '');
    if (cleaned.length >= 2) {
      setExpiry(`${cleaned.slice(0, 2)}/${cleaned.slice(2, 4)}`);
    } else {
      setExpiry(cleaned);
    }
  };

  const handleSubmitPayment = async (e: FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setIsProcessing(true);

    try {
      let token = "";
      if (auth.currentUser) {
        token = await auth.currentUser.getIdToken();
      }

      const response = await fetch('/api/billing/verify-checkout-session', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { 'Authorization': `Bearer ${token}` } : {})
        },
        body: JSON.stringify({
          sessionId,
          cardholderName: cardName,
          email,
          zipCode
        })
      });

      if (!response.ok) {
        const err = await response.json();
        throw new Error(err.error || "Failed to secure transaction confirmation.");
      }

      const data = await response.json();
      
      // Artificial delay to mimic standard card network authentication loops
      setTimeout(() => {
        setIsProcessing(false);
        setIsSuccess(true);
        setTimeout(() => {
          onSuccess(data.profile);
        }, 2200);
      }, 2500);

    } catch (err: any) {
      console.error("Billing verification failed:", err);
      setIsProcessing(false);
      setErrorMessage(err.message || "An unexpected network issue occurred. Card declined.");
    }
  };

  return (
    <div className="fixed inset-0 z-[99999] bg-stone-950 flex flex-col md:flex-row h-screen overflow-hidden text-stone-900 font-sans antialiased">
      {/* Left panel (Invoice details block) */}
      <div className="w-full md:w-[45%] bg-stone-950 p-6 md:p-12 md:max-h-screen md:overflow-y-auto border-b md:border-b-0 md:border-r border-stone-900 flex flex-col justify-between text-white">
        <div className="space-y-8">
          {/* Top Return navigation */}
          <div>
            <button
              onClick={onCancel}
              className="flex items-center gap-2 text-xs md:text-sm text-stone-400 hover:text-white transition-colors cursor-pointer group"
            >
              <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
              <span>Back to Veloce GT</span>
            </button>
          </div>

          {/* Secure Branding */}
          <div className="flex items-center gap-2 text-stone-400">
            <Shield className="w-4 h-4 text-emerald-500" />
            <span className="text-[10px] font-mono tracking-widest font-bold uppercase">SECURE STRIPE SUITE TEST</span>
          </div>

          <div className="space-y-3 pt-4">
            <span className="text-xs uppercase tracking-wider text-stone-400 font-mono">Subscribe to Plan</span>
            <h1 className="text-3xl font-bold tracking-tight text-white">{planName}</h1>
            <div className="flex items-baseline gap-2 pt-2">
              <span className="text-4xl md:text-5xl font-extrabold font-mono text-white">${planPrice}.00</span>
              <span className="text-stone-400 text-sm">/ month</span>
            </div>
            <p className="text-xs md:text-sm text-stone-400 leading-relaxed font-light">{planDescription}</p>
          </div>

          {/* Receipt simulation */}
          <div className="border-t border-stone-900 pt-6 space-y-3.5">
            <div className="flex justify-between text-xs text-stone-450">
              <span>{planName}</span>
              <span className="font-mono text-stone-200">${planPrice}.00</span>
            </div>
            <div className="flex justify-between text-xs text-stone-450 border-b border-stone-900 pb-3.5">
              <span>Promo: Mockup Active Sandbox</span>
              <span className="font-mono text-emerald-400">-$0.00</span>
            </div>
            <div className="flex justify-between text-sm font-bold pt-1.5 text-white">
              <span>Total due today</span>
              <span className="font-mono">${planPrice}.00</span>
            </div>
          </div>
        </div>

        {/* Security badges in footer */}
        <div className="pt-8 md:pt-0 space-y-4">
          <div className="flex items-center gap-2 text-stone-550 text-[10px] font-mono uppercase">
            <Lock className="w-3.5 h-3.5 text-stone-600" />
            <span>Encrypted with TLS 1.3 | PCI-DSS Compliant</span>
          </div>
          <p className="text-[9.5px] text-stone-500 leading-normal font-sans font-light">
            You are subscribing in Sandbox Mode. Subscription renews automatically. You can cancel at any time through your Profile tier management.
          </p>
        </div>
      </div>

      {/* Right panel (Payment info block) */}
      <div className="w-full md:w-[55%] bg-white p-6 md:p-16 md:max-h-screen md:overflow-y-auto overflow-y-auto flex items-center justify-center">
        <AnimatePresence mode="wait">
          {!isSuccess ? (
            <motion.div
              key="payment-form"
              initial={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="w-full max-w-md space-y-8"
            >
              <div className="space-y-1.5">
                <h2 className="text-lg font-bold tracking-tight text-stone-900">Configure Payment Method</h2>
                <p className="text-xs text-stone-500">Provide card information to initialize your mock subscription instantly.</p>
              </div>

              {errorMessage && (
                <div className="p-3 bg-rose-50 border border-rose-150 rounded-xl text-rose-705 text-xs">
                  {errorMessage}
                </div>
              )}

              <form onSubmit={handleSubmitPayment} className="space-y-5">
                {/* Email Address */}
                <div className="space-y-1.5">
                  <label className="block text-[11px] font-medium text-stone-600 font-sans">
                    Email Address
                  </label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    className="w-full text-xs py-2.5 px-3.5 bg-stone-50 border border-stone-200 rounded-lg text-stone-800 font-sans focus:outline-none focus:ring-1 focus:ring-stone-500 focus:border-stone-500 focus:bg-white transition-all shadow-sm"
                    placeholder="alex@domain.com"
                  />
                </div>

                {/* Secure Veloce Sandbox Gateway Info */}
                <div className="p-4 bg-stone-50 border border-stone-200 rounded-xl space-y-3">
                  <div className="flex items-center gap-2 text-stone-700 font-mono text-[10px] uppercase tracking-wider font-bold">
                    <Shield className="w-3.5 h-3.5 text-emerald-500" />
                    <span>Stripe Checkout Simulation Active</span>
                  </div>
                  <p className="text-xs text-stone-600 leading-relaxed font-sans">
                    You are subscribing to Veloce's premium <strong className="text-stone-900">{planName}</strong>. This application is configured to run in safe Sandbox Mode.
                  </p>
                  <p className="text-[11px] text-stone-500 leading-relaxed font-sans">
                    To maintain strict privacy standards and prevent un-tokenized credit card transmitting, raw credit card collection forms are deprecated. Your mock subscription is safely mapped and persisted inside our secure PostgreSQL instance.
                  </p>
                </div>

                {/* Country Grid picker */}
                <div className="space-y-1.5">
                  <label className="block text-[11px] font-medium text-stone-600 font-sans">
                    Country or Region
                  </label>
                  <div className="relative">
                    <select
                      className="w-full text-xs py-2.5 pl-9 pr-3.5 bg-stone-50 border border-stone-200 rounded-lg text-stone-800 font-sans focus:outline-none focus:ring-1 focus:ring-stone-500 focus:border-stone-500 focus:bg-white transition-all shadow-sm appearance-none cursor-pointer"
                      defaultValue="US"
                    >
                      <option value="US">United States (US)</option>
                      <option value="IT">Italy (IT)</option>
                      <option value="ES">Spain (ES)</option>
                      <option value="MC">Monaco (MC)</option>
                    </select>
                    <Globe className="absolute left-3.5 top-3 w-3.5 h-3.5 text-stone-450" />
                  </div>
                </div>

                {/* Pay button */}
                <div className="pt-3">
                  <button
                    type="submit"
                    disabled={isProcessing}
                    className="w-full py-3 bg-stone-900 hover:bg-stone-800 text-white rounded-lg text-xs font-mono font-bold uppercase tracking-widest cursor-pointer transition-all active:scale-[0.99] flex items-center justify-center gap-2 "
                  >
                    {isProcessing ? (
                      <>
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        <span>Verifying with Stripe...</span>
                      </>
                    ) : (
                      <>
                        <Shield className="w-3.5 h-3.5 text-emerald-400" />
                        <span>Pay ${planPrice}.00</span>
                      </>
                    )}
                  </button>
                </div>
              </form>
            </motion.div>
          ) : (
            /* Stripe Checkout Success Checkmark Animations */
            <motion.div
              key="payment-success"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="text-center space-y-6 max-w-sm"
            >
              <div className="inline-flex items-center justify-center p-3 bg-emerald-500/10 border border-emerald-500/30 rounded-full text-emerald-500 mb-2">
                <CheckCircle className="w-16 h-16 animate-bounce" />
              </div>
              <h2 className="text-2xl font-bold text-stone-900 tracking-tight">Payment Succeeded!</h2>
              <p className="text-xs text-stone-550 leading-relaxed">
                Thank you for subscribing. We have registered your subscription securely. Returning you back to Veloce GT...
              </p>
              <div className="w-8 h-1 bg-emerald-500 mx-auto rounded-full animate-pulse" />
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
