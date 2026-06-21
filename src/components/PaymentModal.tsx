import { useState, FormEvent } from 'react';
import { Car, AppLanguage, Booking } from '../types';
import { DICTIONARY } from '../data';
import { motion } from 'motion/react';
import { Shield, Sparkles, X, CreditCard, Lock, CheckCircle, Calendar, FileText } from 'lucide-react';

interface PaymentProps {
  car: Car;
  currentUser: { id: string; name: string };
  language: AppLanguage;
  onClose: () => void;
  onSuccess: (booking: Booking) => void;
}

export default function PaymentModal({ car, currentUser, language, onClose, onSuccess }: PaymentProps) {
  const t = DICTIONARY[language];

  // Booking states
  const [startDate, setStartDate] = useState('2026-06-15');
  const [endDate, setEndDate] = useState('2026-06-18');
  const [insurance, setInsurance] = useState<'basic' | 'premium' | 'none'>('premium');
  
  // Card states
  const [cardNumber, setCardNumber] = useState('');
  const [expiry, setExpiry] = useState('');
  const [cvv, setCvv] = useState('');
  const [cardName, setCardName] = useState(currentUser.name);

  // Flow control
  const [isProcessing, setIsProcessing] = useState(false);
  const [isCompleted, setIsCompleted] = useState(false);
  const [bookingResult, setBookingResult] = useState<Booking | null>(null);

  // Calculations
  const date1 = new Date(startDate);
  const date2 = new Date(endDate);
  const diffTime = Math.abs(date2.getTime() - date1.getTime());
  const diffDays = Math.max(1, Math.ceil(diffTime / (1000 * 60 * 60 * 24)));

  const isOutOfRange = !!(
    (car.rentAvailableStart && startDate < car.rentAvailableStart) || 
    (car.rentAvailableEnd && endDate > car.rentAvailableEnd)
  );

  const basePrice = car.price * diffDays;
  const insurancePrice = insurance === 'premium' 
    ? 150 * diffDays 
    : insurance === 'basic' 
      ? 60 * diffDays 
      : 0;
  
  const totalPrice = basePrice + insurancePrice;

  const handleCardNumberChange = (val: string) => {
    // format to chunks of 4 digits
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

  const handlePay = (e: FormEvent) => {
    e.preventDefault();
    setIsProcessing(true);

    setTimeout(() => {
      const mockBooking: Booking = {
        id: `BC-${Math.floor(Math.random() * 90000 + 10000)}`,
        carId: car.id,
        userId: currentUser.id,
        startDate,
        endDate,
        totalPrice,
        insuranceType: insurance,
        status: 'upcoming',
        pickupLocation: car.location,
        paymentStatus: 'paid'
      };

      setBookingResult(mockBooking);
      setIsCompleted(true);
      setIsProcessing(false);
    }, 2200);
  };

  const handleDone = () => {
    if (bookingResult) {
      onSuccess(bookingResult);
    }
    onClose();
  };

  return (
    <div id="payment_modal" className="fixed inset-0 z-50 flex items-center justify-center bg-stone-950/80 backdrop-blur-sm p-4 overflow-y-auto">
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 15 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="w-full max-w-2xl bg-stone-900 border border-stone-800 rounded-3xl overflow-hidden shadow-2xl relative my-8"
      >
        {/* Close trigger */}
        <button
          id="close_payment_modal"
          onClick={onClose}
          className="absolute top-5 right-5 text-stone-400 hover:text-stone-200 p-1.5 rounded-full bg-stone-950/40 border border-stone-800/40"
        >
          <X className="w-4 h-4" />
        </button>

        {!isCompleted ? (
          <div className="grid grid-cols-1 md:grid-cols-12">
            
            {/* Left Column: Car specs & pricing summary */}
            <div className="md:col-span-5 bg-stone-950/40 p-6 md:p-8 border-b md:border-b-0 md:border-r border-stone-800/60">
              <div className="mb-6">
                <span className="text-[10px] font-mono uppercase tracking-widest text-[#d97706]">
                  {car.type === 'rent' ? t.rent : t.buy} SPECIFICATION
                </span>
                <h3 className="text-xl font-light text-stone-100 tracking-tight mt-1">
                  {car.brand} <span className="font-semibold text-white">{car.model}</span>
                </h3>
                <p className="text-xs text-stone-400 mt-1 font-mono">{car.location}</p>
              </div>

              {/* Little Thumbnail image */}
              <div className="aspect-video w-full rounded-xl overflow-hidden border border-stone-800 mb-6">
                <img referrerPolicy="no-referrer" src={car.images[0]} alt={car.model} className="w-full h-full object-cover" />
              </div>

              {/* Input details inside layout */}
              <div className="space-y-4 mb-6">
                <div className="flex items-center justify-between text-xs border-b border-stone-800/45 pb-1.5">
                  <span className="text-stone-500 font-sans">{t.duration}</span>
                  <span className="text-stone-200 font-mono font-medium">{diffDays} {diffDays > 1 ? 'Days' : 'Day'}</span>
                </div>
                <div className="flex items-center justify-between text-xs border-b border-stone-800/45 pb-1.5">
                  <span className="text-stone-500 font-sans">{car.type === 'rent' ? 'Daily Commitment' : 'Total Price'}</span>
                  <span className="text-stone-200 font-mono">${car.price.toLocaleString()}</span>
                </div>
                <div className="flex items-center justify-between text-xs border-b border-stone-800/45 pb-1.5">
                  <span className="text-stone-500 font-sans">Coverage Cost</span>
                  <span className="text-stone-200 font-mono">+${insurancePrice.toLocaleString()}</span>
                </div>
              </div>

              {/* Large Sum Display */}
              <div className="p-4 bg-stone-950/80 border border-stone-800 rounded-2xl">
                <p className="text-[9px] font-mono uppercase tracking-wider text-stone-500">{t.totalPrice}</p>
                <div className="text-2xl font-mono text-stone-100 font-semibold mt-1">
                  ${totalPrice.toLocaleString()}
                </div>
                <p className="text-[8px] text-stone-500 uppercase mt-1 font-mono flex items-center gap-1">
                  <Lock className="w-2.5 h-2.5 text-amber-600" /> SECURE INVOICE STAMP APPROVED
                </p>
              </div>
            </div>

            {/* Right Column: Checkout Process */}
            <form onSubmit={handlePay} className="md:col-span-7 p-6 md:p-8 space-y-6">
              <h2 className="text-lg text-stone-100 font-sans font-light tracking-wide flex items-center gap-2">
                <CreditCard className="w-4.5 h-4.5 text-amber-500/80" />
                {t.paymentSecure}
              </h2>

              {/* Modern Apple-style Booking Date Selectors */}
              <div id="booking_dates" className="bg-stone-950/40 p-5 rounded-2xl border border-stone-850/80 grid grid-cols-2 gap-4 pb-4">
                <div className="space-y-1.5 col-span-1">
                  <label className="block text-[9px] uppercase tracking-widest text-stone-400 font-mono font-bold">
                    Start Date
                  </label>
                  <div className="relative">
                    <Calendar className="absolute left-3.5 top-3.5 w-3.5 h-3.5 text-amber-500" />
                    <input
                      id="input_start_date"
                      type="date"
                      value={startDate}
                      onChange={(e) => setStartDate(e.target.value)}
                      className="w-full text-xs py-3 pl-10 pr-3.5 bg-stone-900 border border-stone-800 rounded-xl text-stone-300 focus:outline-none focus:border-stone-700 font-mono tracking-wide"
                      required
                    />
                  </div>
                  <span className="text-[8px] text-stone-500 block">Pick lease inception day.</span>
                </div>
                <div className="space-y-1.5 col-span-1">
                  <label className="block text-[9px] uppercase tracking-widest text-stone-400 font-mono font-bold">
                    End Date
                  </label>
                  <div className="relative">
                    <Calendar className="absolute left-3.5 top-3.5 w-3.5 h-3.5 text-amber-500" />
                    <input
                      id="input_end_date"
                      type="date"
                      value={endDate}
                      onChange={(e) => setEndDate(e.target.value)}
                      className="w-full text-xs py-3 pl-10 pr-3.5 bg-stone-900 border border-stone-800 rounded-xl text-stone-300 focus:outline-none focus:border-stone-700 font-mono tracking-wide"
                      required
                    />
                  </div>
                  <span className="text-[8px] text-stone-500 block">Pick return settlement day.</span>
                </div>
              </div>

              {isOutOfRange && (
                <div id="busy_dates_warning" className="p-4 bg-red-500/10 border border-red-500/20 text-red-400 rounded-xl space-y-1">
                  <div className="flex items-center gap-1.5 font-mono text-[9px] uppercase font-bold tracking-wider">
                    <X className="w-3.5 h-3.5" />
                    <span>Vehicle Busy / Booked</span>
                  </div>
                  <p className="text-[10px] text-stone-300 font-sans leading-relaxed">
                    This vehicle is busy or unavailable during your requested dates. It is configured as available from <strong className="text-amber-505 font-mono">{car.rentAvailableStart}</strong> to <strong className="text-amber-505 font-mono">{car.rentAvailableEnd}</strong>.
                  </p>
                </div>
              )}

              {/* Insurance Level Picker */}
              <div id="insurance_picker" className="space-y-2">
                <label className="block text-[9px] uppercase tracking-widest text-stone-500 font-mono">
                  Comprehensive Insurance Package
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  <button
                    id="insurance_btn_premium"
                    type="button"
                    onClick={() => setInsurance('premium')}
                    className={`p-3 rounded-xl border flex flex-col text-left transition ${
                      insurance === 'premium'
                        ? 'bg-amber-500/10 border-amber-500/50 text-stone-200'
                        : 'bg-stone-950/40 border-stone-800 hover:border-stone-700 text-stone-400'
                    }`}
                  >
                    <Shield className="w-4 h-4 text-amber-500 mb-1" />
                    <span className="text-[10px] font-sans font-medium">Premium Shield</span>
                    <span className="text-[8px] font-mono text-amber-500/80 mt-0.5">+$150/day</span>
                  </button>

                  <button
                    id="insurance_btn_basic"
                    type="button"
                    onClick={() => setInsurance('basic')}
                    className={`p-3 rounded-xl border flex flex-col text-left transition ${
                      insurance === 'basic'
                        ? 'bg-stone-100/10 border-stone-400/50 text-stone-200'
                        : 'bg-stone-950/40 border-stone-800 hover:border-stone-700 text-stone-400'
                    }`}
                  >
                    <CheckCircle className="w-4 h-4 text-stone-400 mb-1" />
                    <span className="text-[10px] font-sans font-medium">Basic Cover</span>
                    <span className="text-[8px] font-mono text-stone-400 mt-0.5">+$60/day</span>
                  </button>

                  <button
                    id="insurance_btn_none"
                    type="button"
                    onClick={() => setInsurance('none')}
                    className={`p-3 rounded-xl border flex flex-col text-left transition ${
                      insurance === 'none'
                        ? 'bg-stone-100/10 border-stone-400/50 text-stone-200'
                        : 'bg-stone-950/40 border-stone-800 hover:border-stone-700 text-stone-400'
                    }`}
                  >
                    <X className="w-4 h-4 text-stone-500 mb-1" />
                    <span className="text-[10px] font-sans font-medium">No Add-On</span>
                    <span className="text-[8px] font-mono text-stone-500/80 mt-0.5">Dealer Waiver</span>
                  </button>
                </div>
              </div>

              {/* Honest Veloce Sandbox Gateway Block */}
              <div id="sandbox_payment_notice" className="p-4 bg-stone-950/60 border border-stone-800 rounded-2xl space-y-3">
                <div className="flex items-center gap-2 text-amber-500 font-mono text-[9px] uppercase tracking-wider font-bold">
                  <Shield className="w-3.5 h-3.5" />
                  <span>Veloce Sandbox Gateway Active</span>
                </div>
                <p className="text-[10px] text-stone-300 leading-relaxed font-sans">
                  Veloce is engineered to support professional Stripe Billing and Checkout pipelines. Today, this app operates in a secure <strong>Sandbox & local Demo mode</strong>.
                </p>
                <div className="flex items-start gap-1.5 text-stone-450 border-t border-stone-900/50 pt-2 text-[9px] leading-relaxed">
                  <Lock className="w-3 h-3 text-emerald-500 mt-0.5 shrink-0" />
                  <span>
                    To ensure strict user privacy and PCI compliance, credit card collection fields are disabled. Clicking confirm will safely register your reservation in our live PostgreSQL instance without committing financial data.
                  </span>
                </div>
              </div>

              {/* Submit triggers and offline notifications */}
              <div className="pt-2">
                <button
                  id="checkout_submit_btn"
                  type="submit"
                  disabled={isProcessing || isOutOfRange}
                  className={`w-full py-3 px-4 rounded-xl text-xs font-mono font-bold tracking-widest uppercase transition-all duration-300 transform active:scale-[0.99] flex items-center justify-center gap-2 ${
                    isOutOfRange
                      ? 'bg-stone-800 text-stone-500 cursor-not-allowed opacity-50 border border-stone-850'
                      : 'bg-amber-500 hover:bg-amber-450 text-stone-950 cursor-pointer'
                  }`}
                >
                  {isProcessing ? (
                    <>
                      <div className="w-3.5 h-3.5 border-2 border-stone-950 border-t-transparent rounded-full animate-spin" />
                      <span>Authorizing Secure Payment...</span>
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-4 h-4 text-stone-950 fill-stone-950" />
                      <span>{t.payWithCard}</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        ) : (
          /* High-end luxurious reservation completion screen */
          <div id="payment_success_state" className="p-10 text-center space-y-6">
            <div className="inline-flex items-center justify-center p-4 bg-emerald-500/10 border border-emerald-500/40 rounded-full text-emerald-400 mb-2">
              <CheckCircle className="w-12 h-12" />
            </div>

            <h2 className="text-2xl font-light text-stone-100 tracking-tight">
              {t.paymentSuccess}
            </h2>

            <p className="max-w-md mx-auto text-xs text-stone-400 font-sans leading-relaxed">
              Your booking has been successfully confirmed! The dealer is preparing your car and documents for pickup.
            </p>

            <div className="max-w-sm mx-auto p-4 bg-stone-950 border border-stone-800 rounded-2xl text-left space-y-2.5 font-mono">
              <div className="flex items-center justify-between text-[10px] text-stone-500">
                <span>BOOKING ID</span>
                <span className="text-stone-300">{bookingResult?.id}</span>
              </div>
              <div className="flex items-center justify-between text-[10px] text-stone-500">
                <span>CARD HOLDER</span>
                <span className="text-stone-300">{cardName}</span>
              </div>
              <div className="flex items-center justify-between text-[10px] text-stone-500">
                <span>VEHICLE</span>
                <span className="text-stone-300">{car.brand} {car.model}</span>
              </div>
              <div className="flex items-center justify-between text-[10px] text-stone-500 border-t border-stone-900 pt-2 text-[#006B4F]">
                <span>TOTAL PRICE</span>
                <span>${totalPrice.toLocaleString()}</span>
              </div>
            </div>

            <button
              id="payment_success_done"
              onClick={handleDone}
              className="py-2.5 px-8 bg-stone-100 hover:bg-white text-stone-950 text-xs font-mono font-medium tracking-wider uppercase rounded-xl transition"
            >
              Go to Profile
            </button>
          </div>
        )}
      </motion.div>
    </div>
  );
}
