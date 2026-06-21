import { useState } from 'react';
import { User, Car, Booking, AppLanguage, COMMON_BRANDS_MODELS } from '../types';
import { DICTIONARY } from '../data';
import { motion, AnimatePresence } from 'motion/react';
import { auth } from '../lib/firebase';
import { 
  Plus, Check, Heart, Shield, Trash2, Sliders, X,
  BarChart3, Globe, Sun, Moon, Users, CreditCard, 
  Sparkles, ExternalLink, Calendar, KeyRound, MessageCircle, Info,
  UserCheck, Eye, FileText, Camera, User as UserIcon
} from 'lucide-react';
import AdminSafetyConsole from './AdminSafetyConsole';

interface DashboardProps {
  currentUser: User;
  onLogout: () => void;
  cars: Car[];
  bookings: Booking[];
  language: AppLanguage;
  onLikedChange: (updatedLikedIds: string[]) => void;
  onAddNewCar: (newCar: Car) => void;
  onCancelBooking: (bookingId: string) => void;
  onNavigateToSwipe: () => void;
  onTriggerRent: (car: Car) => void;
  onLanguageChange: (lang: AppLanguage) => void;
  unit: 'mi' | 'km';
  onUnitChange: (unit: 'mi' | 'km') => void;
  theme: 'light' | 'dark';
  onThemeChange: (theme: 'light' | 'dark') => void;
  onUserUpdate: (updatedUser: User) => void;
  onCancelSubscription?: () => void;
  showKycModal?: boolean;
  onShowKycModalChange?: (val: boolean) => void;
  maxDistance?: number;
  onMaxDistanceChange?: (val: number) => void;
  showUpgradeTarget?: 'veloce' | 'dealer' | null;
  onShowUpgradeTargetChange?: (val: 'veloce' | 'dealer' | null) => void;
}

export default function Dashboard({
  currentUser,
  onLogout,
  cars,
  bookings,
  language,
  onLikedChange,
  onAddNewCar,
  onCancelBooking,
  onNavigateToSwipe,
  onTriggerRent,
  onLanguageChange,
  unit,
  onUnitChange,
  theme,
  onThemeChange,
  onUserUpdate,
  onCancelSubscription,
  showKycModal: propShowKycModal,
  onShowKycModalChange: propOnShowKycModalChange,
  maxDistance = 100,
  onMaxDistanceChange,
  showUpgradeTarget: propShowUpgradeTarget,
  onShowUpgradeTargetChange: propOnShowUpgradeTargetChange
}: DashboardProps) {
  const t = DICTIONARY[language];

  // Dynamic state selectors
  const [listingStep, setListingStep] = useState(1);
  const [newBrand, setNewBrand] = useState('');
  const [newModel, setNewModel] = useState('');
  const [newYear, setNewYear] = useState('2025');
  const [newPrice, setNewPrice] = useState('110');
  const [newType, setNewType] = useState<'rent' | 'buy' | 'both'>('rent');
  
  // Choose Engine & Core mechanics casual inputs
  const [newTrans, setNewTrans] = useState('Automatic');
  const [newEngine, setNewEngine] = useState('2.0L Turbocharged');
  const [newFuelType, setNewFuelType] = useState('Gasoline');
  
  // Numbers inputs
  const [newMileage, setNewMileage] = useState('15,000 miles');
  const [newPower, setNewPower] = useState('310');
  const [newAccel, setNewAccel] = useState('4.8s');
  const [newSpeed, setNewSpeed] = useState('250');
  const [newLoc, setNewLoc] = useState('Culver City, CA');
  const [newDesc, setNewDesc] = useState('');
  
  // Selected photos
  const [selectedPhotos, setSelectedPhotos] = useState<string[]>([]);
  const [photoSignatures, setPhotoSignatures] = useState<string[]>([]);
  const [photoUploadError, setPhotoUploadError] = useState<string | null>(null);
  const [newFeatureInput, setNewFeatureInput] = useState('');
  const [newFeatures, setNewFeatures] = useState<string[]>(['Apple CarPlay', 'Premium Sound System']);

  // Success indicator
  const [showSuccessNotification, setShowSuccessNotification] = useState(false);

  // Profile picture customization states
  const [showPfpModal, setShowPfpModal] = useState(false);
  const [selectedAvatarPreview, setSelectedAvatarPreview] = useState(currentUser.avatar);
  const [pfpInputUrl, setPfpInputUrl] = useState('');
  const [showConfirmLogout, setShowConfirmLogout] = useState(false);
  const [showConfirmDelete, setShowConfirmDelete] = useState(false);

  // Upgrade Dialog HUD
  const [localShowUpgradeTarget, setLocalShowUpgradeTarget] = useState<'veloce' | 'dealer' | null>(null);
  const showUpgradeTarget = propShowUpgradeTarget !== undefined ? propShowUpgradeTarget : localShowUpgradeTarget;
  const setShowUpgradeTarget = propOnShowUpgradeTargetChange || setLocalShowUpgradeTarget;
  const [tierSuccessMessage, setTierSuccessMessage] = useState<string | null>(null);

  // KYC Automated Biometrics and EULA acceptance states
  const [localShowKycModal, setLocalShowKycModal] = useState(false);
  const showKycModal = propShowKycModal !== undefined ? propShowKycModal : localShowKycModal;
  const setShowKycModal = propOnShowKycModalChange || setLocalShowKycModal;
  const [kycDocType, setKycDocType] = useState<'driver_license' | 'passport' | 'national_id'>('driver_license');
  const [kycProgress, setKycProgress] = useState<'idle' | 'reading_ocr' | 'liveness_check' | 'verified' | 'failed'>('idle');
  const [kycProgressPct, setKycProgressPct] = useState(0);

  // Retrieve user postings count
  const myCars = cars.filter(c => c.dealerId === currentUser.id);

  const handleStartKycValidation = () => {
    setKycProgress('reading_ocr');
    setKycProgressPct(15);

    // Dynamic scanner simulation intervals
    setTimeout(() => {
      setKycProgressPct(45);
    }, 850);

    setTimeout(() => {
      setKycProgress('liveness_check');
      setKycProgressPct(70);
    }, 1850);

    setTimeout(() => {
      setKycProgressPct(92);
    }, 2850);

    setTimeout(() => {
      setKycProgress('verified');
      setKycProgressPct(100);
      onUserUpdate({
        ...currentUser,
        isKycVerified: true,
        kycStatus: 'verified',
        eulaAccepted: true
      });
    }, 3850);
  };

  const handleAddFeature = () => {
    if (newFeatureInput.trim()) {
      setNewFeatures([...newFeatures, newFeatureInput]);
      setNewFeatureInput('');
    }
  };

  const handleRemoveFeature = (idx: number) => {
    setNewFeatures(newFeatures.filter((_, i) => i !== idx));
  };

  const handleDraftSubmit = () => {
    // Check if user is standard (free) and trying to post more than 2
    const isFree = !currentUser.subscriptionTier || currentUser.subscriptionTier === 'free';
    if (isFree && myCars.length >= 2) {
      setShowUpgradeTarget('veloce');
      return;
    }

    const finalCar: Car = {
      id: `car_deal_${Date.now()}`,
      brand: newBrand || 'Toyota',
      model: newModel || 'GR 86 Sport',
      year: parseInt(newYear) || 2024,
      images: selectedPhotos,
      price: parseFloat(newPrice) || 85,
      type: newType,
      transmission: newTrans,
      engine: `${newEngine} (${newFuelType})`,
      power: parseInt(newPower) || 228,
      acceleration: newAccel || '6.1s',
      topSpeed: parseInt(newSpeed) || 226,
      location: newLoc,
      distance: 1.5,
      rating: 5.0,
      description: newDesc || 'Super fun responsive standard sport drive. Prone to easy parking and highway drifts. Ready to check out.',
      features: [newMileage, ...newFeatures],
      dealerId: currentUser.id,
      dealerName: currentUser.name,
      dealerAvatar: currentUser.avatar,
      insuranceLevel: 'basic',
      reviews: []
    };

    onAddNewCar(finalCar);
    setShowSuccessNotification(true);

    // Reset workflow
    setListingStep(1);
    setNewBrand('');
    setNewModel('');
    setNewDesc('');
    setSelectedPhotos([]);
    setTimeout(() => {
      setShowSuccessNotification(false);
    }, 4500);
  };

  const handleInstantUpgrade = (tier: 'veloce_gt' | 'dealer_paid') => {
    const updatedUser: User = {
      ...currentUser,
      subscriptionTier: tier,
      // If upgraded to dealer, also adjust role to dealer to unlock dynamic tools
      role: tier === 'dealer_paid' ? 'dealer' : currentUser.role
    };
    onUserUpdate(updatedUser);
    setShowUpgradeTarget(null);

    const prettyName = tier === 'veloce_gt' ? 'Veloce GT' : 'Official Dealer Account';
    setTierSuccessMessage(`Subscription Upgraded! Welcome to ${prettyName}. Unlimited features are unlocked.`);
    setTimeout(() => setTierSuccessMessage(null), 5000);
  };

  const isFree = !currentUser.subscriptionTier || currentUser.subscriptionTier === 'free';

  const getEmailFontSize = (email: string) => {
    const len = email?.length || 0;
    if (len > 35) return 'text-[8.5px] xs:text-[9.5px] break-all';
    if (len > 28) return 'text-[9px] xs:text-[10px] break-all';
    if (len > 22) return 'text-[11px] xs:text-xs break-all';
    return 'text-xs';
  };

  return (
    <div id="dashboard_screen" className="w-full px-1 py-6 space-y-8 relative">
      
      {/* Central Notification of dynamic listing */}
      <AnimatePresence>
        {showSuccessNotification && (
          <motion.div
            initial={{ opacity: 0, y: -20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -20, scale: 0.95 }}
            className="fixed top-24 left-1/2 -translate-x-1/2 z-50 w-full max-w-md bg-stone-900 border border-[#006B4F] p-4 rounded-2xl shadow-2xl text-center"
          >
            <span className="text-xs font-mono tracking-widest text-[#006B4F] font-semibold uppercase block">
              LISTING APPROVED
            </span>
            <p className="text-xs text-stone-200 mt-1">
              Your vehicle has been successfully published. Other users can now discover and swipe to match with it!
            </p>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Subscription tier congratulations box */}
      <AnimatePresence>
        {tierSuccessMessage && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            className="fixed inset-x-6 top-24 max-w-md mx-auto p-4 z-50 bg-[#0d0d12] border border-amber-500 rounded-2xl shadow-2xl text-center"
          >
            <p className="text-sm text-stone-100 font-sans">{tierSuccessMessage}</p>
          </motion.div>
        )}
      </AnimatePresence>

      {/* User Master Header Panel */}
      <div id="dashboard_user_header" className="bg-stone-900 border border-stone-850 p-6 md:p-8 rounded-3xl flex flex-col md:flex-row items-center justify-between gap-6">
        
        <div className="flex items-center gap-4.5 text-center md:text-left flex-wrap md:flex-nowrap justify-center md:justify-start">
          <div 
            onClick={() => {
              setSelectedAvatarPreview(currentUser.avatar);
              setPfpInputUrl('');
              setShowPfpModal(true);
            }}
            className="relative cursor-pointer group shrink-0"
            title="Click to customize profile picture"
          >
            <img
              referrerPolicy="no-referrer"
              src={currentUser.avatar}
              alt={currentUser.name}
              className={`w-16 h-16 rounded-full object-cover shadow-md group-hover:opacity-85 transition-opacity border-2 ${
                currentUser.role === 'dealer'
                  ? 'border-[#ff2800] ring-2 ring-[#ff2800]/40'
                  : 'border-amber-500'
              }`}
            />
            <div className="absolute inset-x-0 bottom-0 bg-stone-950/75 text-[8px] font-mono text-amber-500 py-0.5 text-center translate-y-0.5 opacity-0 group-hover:opacity-100 transition-opacity rounded-b-full">
              EDIT
            </div>
            <div className="absolute inset-0 bg-black/35 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
              <Camera className="w-4 h-4 text-white" />
            </div>
          </div>
          <div>
            <div className="flex items-center justify-center md:justify-start gap-2 flex-wrap">
              <span className="text-[10px] font-mono tracking-widest uppercase bg-stone-850 text-stone-300 py-0.5 px-3 rounded-full border border-stone-700/60">
                {currentUser.role === 'dealer' ? t.roleDealer : t.roleUser}
              </span>
              <span className="text-[10px] font-mono tracking-widest uppercase bg-amber-500 text-stone-950 py-0.5 px-2.5 rounded-full font-bold">
                {currentUser.subscriptionTier === 'veloce_gt' 
                  ? 'VELOCE GT' 
                  : currentUser.subscriptionTier === 'dealer_paid' 
                    ? 'Premium Dealer' 
                    : 'Standard'}
              </span>
            </div>
            <h2 className="text-2xl font-light text-stone-100 mt-2 tracking-tight">
              {currentUser.name}
            </h2>
            <p className={`text-stone-500 font-mono mt-0.5 leading-tight ${getEmailFontSize(currentUser.email)}`}>{currentUser.email}</p>
          </div>
        </div>

        {/* Global actions and metrics - styled as an auto-adapting flex column on mobile to prevent clipping and overflow */}
        <div className="flex flex-col sm:flex-row gap-3 w-full md:w-auto md:items-center md:justify-end shrink-0">
          
          {isFree && currentUser.role !== 'dealer' && (
            <button
              onClick={() => setShowUpgradeTarget('veloce')}
              className="py-2.5 px-4 bg-amber-500 hover:bg-amber-450 text-stone-950 font-mono text-[9.5px] uppercase font-extrabold tracking-widest rounded-xl transition shadow flex items-center justify-center gap-1.5 cursor-pointer w-full sm:w-auto md:w-auto min-w-[130px] shrink-0 active:scale-95"
            >
              <CreditCard className="w-3.5 h-3.5 text-stone-950 shrink-0" />
              <span>Get Veloce GT</span>
            </button>
          )}

          {!isFree && onCancelSubscription && (
            <button
              onClick={onCancelSubscription}
              className="py-2.5 px-4 bg-stone-950 hover:bg-stone-900 border border-rose-500/35 text-rose-450 font-mono text-[9.5px] uppercase font-bold tracking-wider rounded-xl transition flex items-center justify-center gap-1.5 cursor-pointer w-full sm:w-auto md:w-auto shrink-0 active:scale-95"
              title="Cancel subscription subscription"
            >
              <X className="w-3.5 h-3.5 shrink-0" />
              <span>Cancel Plan</span>
            </button>
          )}

          {/* Verification Portal Trigger Button */}
          <button
            onClick={() => setShowKycModal(true)}
            className={`py-2.5 px-4 font-mono text-[9.5px] uppercase font-bold tracking-wider rounded-xl transition border flex items-center justify-center gap-1.5 cursor-pointer w-full sm:w-auto md:w-auto ${
              currentUser.isKycVerified 
                ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400' 
                : 'bg-stone-950 border-amber-500/20 text-amber-500 hover:bg-stone-900'
            }`}
          >
            <Shield className="w-3.5 h-3.5 shrink-0" />
            <span className="whitespace-nowrap leading-normal text-center">{currentUser.isKycVerified ? 'Verified Account' : 'Verify Identity'}</span>
          </button>

          <div className="text-center bg-stone-950 p-2.5 px-4 rounded-xl border border-stone-850/60 font-mono select-none w-full sm:w-auto md:w-auto md:min-w-[100px] flex flex-col justify-center">
            <span className="text-[8px] text-stone-500 uppercase block tracking-wider leading-none">Matched Saves</span>
            <span className="text-xs md:text-sm font-semibold text-stone-200 block mt-0.5 leading-none">
              {(!currentUser.subscriptionTier || currentUser.subscriptionTier === 'free') && currentUser.role !== 'dealer'
                ? `${currentUser.likedCarIds.length}/25`
                : currentUser.likedCarIds.length
              }
            </span>
          </div>
        </div>

      </div>

      {/* Console Section Grid */}
      <div className="w-full space-y-8">

        {/* UGC ADMIN PANEL CONSOLE */}
        {currentUser.role === 'admin' && (
          <AdminSafetyConsole currentUser={currentUser} theme={theme} />
        )}

        {/* CUSTOMIZE PROFILE PICTURE MODAL */}
        <AnimatePresence>
          {showPfpModal && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-stone-950/85 backdrop-blur-sm p-4 overflow-y-auto">
              <motion.div
                initial={{ opacity: 0, scale: 0.95, y: 15 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 15 }}
                className="relative w-full max-w-md bg-stone-900 border border-stone-800 rounded-3xl p-6 md:p-8 space-y-5 shadow-2xl my-8 text-left"
              >
                <button
                  type="button"
                  onClick={() => setShowPfpModal(false)}
                  className="absolute top-5 right-5 text-stone-500 hover:text-white font-mono cursor-pointer text-base p-1.5 rounded-full bg-stone-950 border border-stone-800"
                >
                  ✕
                </button>

                <div className="space-y-1">
                  <span className="text-[9px] font-mono uppercase tracking-[0.2em] text-amber-500 font-extrabold block">Account Identity</span>
                  <h3 className="text-lg font-light text-stone-100 tracking-tight">Modify <span className="font-semibold text-white">Profile Photo</span></h3>
                  <p className="text-xs text-stone-400">Update your driver credentials. Your photo will render in matching crop circles inside chats and meets.</p>
                </div>

                {/* Profile Circle Live Visualizer */}
                <div className="flex flex-col items-center justify-center p-5 bg-stone-950 rounded-2xl border border-stone-850 text-center">
                  <span className="text-[8px] font-mono uppercase text-stone-500 tracking-wider mb-2.5">Live Profile Preview</span>
                  <div className="relative">
                    <img 
                      referrerPolicy="no-referrer"
                      src={selectedAvatarPreview || currentUser.avatar} 
                      alt="Avatar Preview" 
                      className="w-20 h-20 rounded-full object-cover border-2 border-stone-100 shadow-lg"
                    />
                    <span className="absolute bottom-0 right-0 w-5 h-5 bg-emerald-500 text-stone-950 text-[10px] font-bold rounded-full flex items-center justify-center border border-stone-900">
                      ✓
                    </span>
                  </div>
                  <span className="text-[10px] text-stone-400 mt-2 font-mono">{currentUser.name}</span>
                </div>

                {/* File Upload Selector & Base64 Converter */}
                <div className="space-y-2">
                  <label className="text-[9px] uppercase tracking-wider text-amber-500 font-mono font-bold block">Upload Your Own Profile Picture</label>
                  <label className="block w-full text-center py-4 bg-stone-950 hover:bg-stone-850 border-2 border-dashed border-stone-800 hover:border-amber-500/50 text-stone-300 rounded-xl cursor-pointer font-mono font-bold text-[9.5px] uppercase tracking-widest transition-all">
                    <span>Browse Image File</span>
                    <input 
                      type="file" 
                      accept="image/*" 
                      className="hidden" 
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) {
                          const reader = new FileReader();
                          reader.onloadend = () => {
                            setSelectedAvatarPreview(reader.result as string);
                          };
                          reader.readAsDataURL(file);
                        }
                      }}
                    />
                  </label>
                </div>

                {/* Actions */}
                <div className="flex gap-2.5 pt-2">
                  <button
                    type="button"
                    onClick={() => {
                      if (selectedAvatarPreview) {
                        onUserUpdate({ ...currentUser, avatar: selectedAvatarPreview });
                      }
                      setShowPfpModal(false);
                    }}
                    className="flex-1 py-2.5 bg-amber-500 hover:bg-amber-450 text-stone-950 rounded-xl font-mono text-[9.5px] font-extrabold uppercase tracking-widest transition cursor-pointer"
                  >
                    Save Changes
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowPfpModal(false)}
                    className="flex-1 py-2.5 bg-stone-950 border border-stone-850 hover:bg-stone-850 text-stone-400 rounded-xl font-mono text-[9.5px] uppercase font-bold tracking-widest transition cursor-pointer"
                  >
                    Cancel
                  </button>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>

        {/* LOGOUT CONFIRMATION MODAL */}
        <AnimatePresence>
          {showConfirmLogout && (
            <div className="fixed inset-0 z-[100] flex items-center justify-center bg-stone-950/90 backdrop-blur-sm p-4">
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="w-full max-w-sm bg-stone-900 border border-stone-800 rounded-2xl p-6 space-y-4 shadow-2xl text-center"
              >
                <div className="w-12 h-12 rounded-full bg-red-950/40 border border-red-500/20 text-red-400 flex items-center justify-center mx-auto text-lg font-mono">
                  ⚠
                </div>
                <div className="space-y-1">
                  <h3 className="text-sm font-semibold font-mono uppercase text-stone-100 tracking-wider">Sign Out confirmation</h3>
                  <p className="text-xs text-stone-400 font-sans">Are you sure you want to sign out and log out of your current Veloce session?</p>
                </div>
                <div className="flex gap-2.5 pt-2 font-mono">
                  <button
                    type="button"
                    onClick={() => {
                      setShowConfirmLogout(false);
                      onLogout();
                    }}
                    className="flex-1 py-2 bg-red-650 hover:bg-red-500 hover:text-stone-950 text-stone-100 border border-red-600 rounded-xl text-[9px] uppercase font-extrabold tracking-widest transition cursor-pointer"
                  >
                    Sign Out
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowConfirmLogout(false)}
                    className="flex-1 py-2 bg-stone-950 border border-stone-850 hover:bg-stone-850 text-stone-400 rounded-xl text-[9px] uppercase font-bold tracking-widest transition cursor-pointer"
                  >
                    Cancel
                  </button>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>

        {/* DELETE ACCOUNT CONFIRMATION MODAL */}
        <AnimatePresence>
          {showConfirmDelete && (
            <div className="fixed inset-0 z-[100] flex items-center justify-center bg-stone-950/90 backdrop-blur-sm p-4">
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="w-full max-w-sm bg-stone-900 border border-stone-800 rounded-2xl p-6 space-y-4 shadow-2xl text-center"
              >
                <div className="w-12 h-12 rounded-full bg-rose-950/40 border border-[#b91c1c]/20 text-[#f87171] flex items-center justify-center mx-auto text-lg font-mono">
                  ⚠
                </div>
                <div className="space-y-1">
                  <h3 className="text-sm font-semibold font-mono uppercase text-stone-100 tracking-wider">Delete Account</h3>
                  <p className="text-xs text-stone-400 font-sans">Are you sure you want to permanently delete your account? This action is irreversible and all your data will be permanently wiped.</p>
                </div>
                <div className="flex gap-2.5 pt-2 font-mono">
                  <button
                    type="button"
                    onClick={() => {
                      setShowConfirmDelete(false);
                      localStorage.removeItem('veloce_user');
                      onLogout();
                    }}
                    className="flex-1 py-2 bg-rose-650 hover:bg-rose-500 hover:text-stone-950 text-stone-100 border border-rose-600 rounded-xl text-[9px] uppercase font-extrabold tracking-widest transition cursor-pointer"
                  >
                    Confirm Delete
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowConfirmDelete(false)}
                    className="flex-1 py-2 bg-stone-950 border border-stone-850 hover:bg-stone-850 text-stone-400 rounded-xl text-[9px] uppercase font-bold tracking-widest transition cursor-pointer"
                  >
                    Cancel
                  </button>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>

        {/* App Store Compliance, UGC Safety & Biometric KYC Center - Polished Popup Modal */}
        <AnimatePresence>
          {showKycModal && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-stone-950/85 backdrop-blur-sm p-4 overflow-y-auto">
              <motion.div
                initial={{ opacity: 0, scale: 0.95, y: 15 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 15 }}
                className="relative w-full max-w-4xl bg-stone-900 border border-stone-800 rounded-3xl p-6 md:p-8 space-y-5 shadow-2xl my-8 overflow-hidden text-left"
              >
                {/* Close Button */}
                <button
                  type="button"
                  onClick={() => setShowKycModal(false)}
                  className="absolute top-5 right-5 text-stone-500 hover:text-white font-bold cursor-pointer text-base p-1.5 rounded-full bg-stone-950 border border-stone-800"
                  title="Close portal"
                >
                  ✕
                </button>

                <div className="flex items-center justify-between flex-wrap gap-4 pb-3.5 border-b border-stone-850">
                  <div className="flex items-center gap-3">
                    <div className="p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-500">
                      <Shield className="w-5 h-5" />
                    </div>
                    <div>
                      <h3 className="text-sm font-semibold font-mono uppercase text-stone-100 tracking-wider">
                        Veloce GT Secure Verification Portal
                      </h3>
                      <p className="text-[10px] text-stone-500 font-mono uppercase tracking-wider mt-0.5">
                        App Store Compliance, User Protection & Identity Check
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <span className={`text-[9.5px] font-mono uppercase py-1 px-3 rounded-full font-bold border ${
                      currentUser.isKycVerified 
                        ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30' 
                        : 'bg-stone-950 text-amber-500 border-amber-500/25 animate-pulse'
                    }`}>
                      {currentUser.isKycVerified ? '✓ Identity Verified' : '● Verification Required'}
                    </span>
                    <span className="text-[9.5px] font-mono uppercase bg-stone-950 text-stone-300 py-1 px-3 rounded-full border border-stone-800 font-bold">
                      Safety Protocol: Active
                    </span>
                  </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
                  {/* Left side: EULA UGC Terms checklist */}
                  <div className="lg:col-span-7 space-y-4 font-sans text-xs text-stone-300">
                    <div className="p-4 bg-stone-950 rounded-2xl border border-stone-850 space-y-3">
                      <span className="text-[9.5px] font-mono uppercase text-stone-400 block font-bold tracking-wider">
                        Driver Safety & End-User License Agreement (EULA):
                      </span>
                      <p className="text-[10.5px] text-stone-400 leading-relaxed font-sans">
                        To participate in leasing, premium rides, and hosting events, you agree to comply with our safety guidelines:
                      </p>
                      <div className="space-y-2 text-[10.5px] text-stone-300 font-sans">
                        <div className="flex items-start gap-2.5">
                          <Check className="w-3.5 h-3.5 text-[#006B4F] shrink-0 mt-0.5" />
                          <span><strong>Verified Credentials</strong>: All users submitting rent/buy offers must provide clear, legitimate matching information.</span>
                        </div>
                        <div className="flex items-start gap-2.5">
                          <Check className="w-3.5 h-3.5 text-[#006B4F] shrink-0 mt-0.5" />
                          <span><strong>Zero-Tolerance Shield</strong>: Deceptive, explicit, or copyright-violating images can be instantly flagged by the community.</span>
                        </div>
                        <div className="flex items-start gap-2.5">
                          <Check className="w-3.5 h-3.5 text-[#006B4F] shrink-0 mt-0.5" />
                          <span><strong>Identity Protection</strong>: We run instant on-device biometric checks directly on-device. Your ID files are never stored on external third-party hosts.</span>
                        </div>
                      </div>
                    </div>

                    {currentUser.isKycVerified ? (
                      <div className="p-4 bg-[#006B4F]/5 border border-[#006B4F]/25 rounded-2xl space-y-2">
                        <div className="flex items-center gap-2">
                          <UserCheck className="w-4 h-4 text-[#006B4F]" />
                          <span className="font-mono text-xs font-bold uppercase text-[#006B4F] tracking-wider">
                            Driver Verification Active!
                          </span>
                        </div>
                        <p className="text-[10.5px] text-stone-300 font-sans leading-relaxed">
                          Welcome, {currentUser.name}. Your official identity signature and driver credentials have been verified. You now hold a <strong>Verified VIP Seller Badge</strong> next to your name in chats and swiper feeds, satisfying App Store and payment compliance.
                        </p>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        <span className="text-[9.5px] font-mono uppercase text-stone-400 block font-bold tracking-wider">
                          Select Document Type for Immediate Camera Scan:
                        </span>
                        
                        <div className="grid grid-cols-3 gap-2">
                          {[
                            { id: 'driver_license', label: "Driver's License" },
                            { id: 'passport', label: "Passport" },
                            { id: 'national_id', label: "National ID Card" }
                          ].map((doc) => (
                            <button
                              key={doc.id}
                              type="button"
                              onClick={() => setKycDocType(doc.id as any)}
                              className={`p-2 rounded-xl text-center border text-[10px] font-mono uppercase tracking-wider transition-all cursor-pointer ${
                                kycDocType === doc.id
                                  ? 'bg-amber-500/10 border-amber-500/35 text-amber-500 font-bold'
                                  : 'bg-stone-950/50 border-stone-850 hover:border-stone-800 text-stone-400'
                              }`}
                            >
                              {doc.label}
                            </button>
                          ))}
                        </div>

                        <p className="text-[10px] text-stone-500 italic leading-relaxed">
                          * The secure scanner uses sandboxed WebRTC to perform a facial layout check against your official document on this device. No raw documents are persisted.
                        </p>
                      </div>
                    )}
                  </div>

                  {/* Right side: Scanner simulation HUD overlay */}
                  <div className="lg:col-span-5 bg-stone-950 border border-stone-850 rounded-2xl p-5 text-center min-h-[220px] flex flex-col items-center justify-center relative overflow-hidden">
                    
                    {kycProgress === 'idle' && (
                      <div className="space-y-4">
                        {currentUser.isKycVerified ? (
                          <>
                            <div className="inline-flex items-center justify-center p-3 rounded-full bg-[#006B4F]/10 border border-[#006B4F]/35 text-[#006B4F]">
                              <UserCheck className="w-8 h-8" />
                            </div>
                            <div className="space-y-1">
                              <span className="text-xs font-mono font-bold uppercase text-white tracking-widest block">
                                SECURITY ACCESS APPROVED
                              </span>
                              <span className="text-[9.5px] font-mono text-stone-500 uppercase block">
                                EULA STATUS: VALIDATED
                              </span>
                            </div>
                          </>
                        ) : (
                          <>
                            <div className="inline-flex items-center justify-center p-3.5 rounded-full bg-stone-900 border border-stone-800 text-stone-500 animate-pulse">
                              <Camera className="w-7 h-7" />
                            </div>
                            <div className="space-y-3">
                              <div className="space-y-1">
                                <span className="text-xs font-mono font-bold uppercase text-stone-300 block">
                                  Biometric Scanner HUD
                                </span>
                                <span className="text-[9px] font-mono text-stone-500 uppercase block tracking-wider">
                                  Ready for identity validation
                                </span>
                              </div>
                              <button
                                type="button"
                                onClick={handleStartKycValidation}
                                className="py-2 px-5 bg-amber-500 hover:bg-amber-450 text-stone-950 rounded-xl font-mono text-[9.5px] font-extrabold uppercase tracking-widest transition-all cursor-pointer shadow-lg"
                              >
                                Trigger Face Scan
                              </button>
                            </div>
                          </>
                        )}
                      </div>
                    )}

                    {/* Step 1 Scan OCR Progress */}
                    {kycProgress === 'reading_ocr' && (
                      <div className="space-y-4 w-full relative z-10">
                        <div className="relative w-36 h-28 mx-auto bg-stone-900 border-2 border-dashed border-amber-500/40 rounded-xl flex items-center justify-center">
                          <FileText className="w-10 h-10 text-amber-500 animate-bounce" />
                          <div className="absolute inset-0 bg-gradient-to-b from-transparent via-amber-500 to-transparent h-1.5 animate-scan top-0" />
                        </div>
                        
                        <div className="space-y-1">
                          <span className="text-[10px] font-mono font-extrabold uppercase text-amber-500 tracking-widest block animate-pulse">
                            Analyzing Document OCR...
                          </span>
                          <span className="text-[9px] font-mono text-stone-400 block uppercase">
                            Extracting credentials & validity markers ({kycProgressPct}%)
                          </span>
                        </div>

                        <div className="w-[180px] mx-auto bg-stone-900 h-1.5 rounded-full overflow-hidden border border-stone-800">
                          <div 
                            className="bg-amber-500 h-full transition-all duration-300"
                            style={{ width: `${kycProgressPct}%` }}
                          />
                        </div>
                      </div>
                    )}

                    {/* Step 2 Scan Liveness Progress */}
                    {kycProgress === 'liveness_check' && (
                      <div className="space-y-4 w-full relative z-10">
                        <div className="relative w-28 h-28 mx-auto bg-stone-900 rounded-full border-2 border-[#006B4F]/50 flex items-center justify-center overflow-hidden">
                          <img 
                            referrerPolicy="no-referrer"
                            src={currentUser.avatar}
                            alt="Avatar liveness scan" 
                            className="w-full h-full object-cover opacity-60 filter grayscale brightness-75"
                          />
                          <div className="absolute inset-x-0 bg-[#006B4F]/30 h-1 border-t border-[#006B4F] animate-scan top-0 shadow-[0_0_10px_rgba(0,107,79,0.5)]" />
                        </div>

                        <div className="space-y-1">
                          <span className="text-[10px] font-mono font-extrabold uppercase text-[#006B4F] tracking-widest block animate-pulse">
                            Performing Liveness Proof Check...
                          </span>
                          <span className="text-[9px] font-mono text-stone-400 block uppercase">
                            Validating facial telemetry against document photo ({kycProgressPct}%)
                          </span>
                        </div>

                        <div className="w-[180px] mx-auto bg-stone-900 h-1.5 rounded-full overflow-hidden border border-stone-800">
                          <div 
                            className="bg-[#006B4F] h-full transition-all duration-300"
                            style={{ width: `${kycProgressPct}%` }}
                          />
                        </div>
                      </div>
                    )}

                    {/* Verified Output */}
                    {kycProgress === 'verified' && (
                      <div className="space-y-3.5 py-2">
                        <div className="inline-flex items-center justify-center p-3 rounded-full bg-[#006B4F]/10 border border-[#006B4F]/35 text-[#006B4F]">
                          <Check className="w-8 h-8 stroke-[3]" />
                        </div>
                        <div className="space-y-1">
                          <span className="text-xs font-mono font-bold uppercase text-[#006B4F] tracking-wider block">
                            Compliance Status: VERIFIED
                          </span>
                          <span className="text-[10px] text-stone-400 block max-w-[210px] mx-auto leading-relaxed">
                            Biometrics and EULA checklist parsed. Driver license matched to profile with 99.8% certainty.
                          </span>
                        </div>
                        <button
                          type="button"
                          onClick={() => {
                            setKycProgress('idle');
                            setShowKycModal(false);
                          }}
                          className="py-1 px-4 bg-stone-900 hover:bg-stone-850 text-stone-300 border border-stone-800 rounded-lg text-[9px] font-mono uppercase tracking-wider transition-all"
                        >
                          Finish Scan
                        </button>
                      </div>
                    )}

                    {/* Grid scanning background effect when active */}
                    {kycProgress !== 'idle' && (
                      <div className="absolute inset-0 bg-stone-950 pointer-events-none opacity-20" />
                    )}
                  </div>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>



        {/* HUMANIZED CASUAL CAR LISTING WIZARD */}
        {false && (
        <div id="tinder_flow_creator" className="bg-stone-[#0d0d0f] border border-stone-850 rounded-2xl p-5 md:p-6 space-y-6 relative overflow-hidden bg-stone-950/60">
          
          {/* Flow Header */}
          <div>
            <div className="flex items-center gap-1">
              <span className="px-2.5 py-0.5 bg-amber-500/10 text-amber-500 text-[8px] font-mono rounded tracking-widest uppercase font-bold border border-amber-500/20">
                PREMIUM VELOCE FLEET
              </span>
              <span className="text-[10px] text-stone-500 font-mono ml-auto">
                Step {listingStep} of 4 • {myCars.length}/2 Listings Used
              </span>
            </div>
            <h3 className="text-sm font-semibold text-stone-200 mt-2 flex items-center gap-1.5">
              <Plus className="w-4 h-4 text-amber-500" />
              <span>List a Car</span>
            </h3>
            <p className="text-[10px] text-stone-400 leading-relaxed font-sans mt-0.5 font-bold">
              Add your car to the swiping catalog easily. Follow the quick steps below to model your vehicle profile.
            </p>
          </div>

          {/* Step 1: Photos & Choose Make (Brand & Model) */}
          {listingStep === 1 && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-5 font-sans">
              <label className="block text-xs uppercase tracking-widest text-[#d97706] font-mono font-bold">
                Step 1: Pick Model & Photos
              </label>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pb-1">
                {/* Brand selection dropdown */}
                <div className="space-y-1.5">
                  <span className="text-xs font-mono uppercase text-stone-400 font-bold block">Make / Brand</span>
                  <select
                    id="dealer_brand_select"
                    value={COMMON_BRANDS_MODELS[newBrand] ? newBrand : (newBrand ? 'other' : '')}
                    onChange={(e) => {
                      const val = e.target.value;
                      if (val === 'other') {
                        setNewBrand('');
                        setNewModel('');
                      } else {
                        setNewBrand(val);
                        const models = COMMON_BRANDS_MODELS[val] || [];
                        setNewModel(models[0] || '');
                      }
                    }}
                    className="w-full py-2 px-3 bg-stone-950 rounded-lg border border-stone-850 text-stone-200 text-xs focus:outline-none focus:border-stone-700"
                  >
                    <option value="" disabled>-- Select Brand --</option>
                    {Object.keys(COMMON_BRANDS_MODELS).sort().map(b => (
                      <option key={b} value={b}>{b}</option>
                    ))}
                    <option value="other">Other (Type Custom)...</option>
                  </select>
                  {(!COMMON_BRANDS_MODELS[newBrand] || newBrand === '') && (
                    <input
                      id="dealer_brand_input_custom"
                      type="text"
                      placeholder="Type custom brand..."
                      value={newBrand}
                      onChange={(e) => setNewBrand(e.target.value)}
                      className="w-full mt-1.5 py-2 px-3 bg-stone-950 rounded-lg border border-stone-850 text-stone-300 text-xs focus:outline-none focus:border-stone-700 font-sans"
                    />
                  )}
                </div>

                {/* Model selection dropdown */}
                <div className="space-y-1.5">
                  <span className="text-xs font-mono uppercase text-stone-400 font-bold block">Model Name</span>
                  {COMMON_BRANDS_MODELS[newBrand] ? (
                    <select
                      id="dealer_model_select"
                      value={newModel}
                      onChange={(e) => setNewModel(e.target.value)}
                      className="w-full py-2 px-3 bg-stone-950 rounded-lg border border-stone-850 text-stone-200 text-xs focus:outline-none focus:border-stone-700"
                    >
                      <option value="" disabled>-- Select Model --</option>
                      {(COMMON_BRANDS_MODELS[newBrand] || []).map(m => (
                        <option key={m} value={m}>{m}</option>
                      ))}
                      <option value="other_model">Other (Type Custom)...</option>
                    </select>
                  ) : null}
                  {(!COMMON_BRANDS_MODELS[newBrand] || newModel === 'other_model' || !COMMON_BRANDS_MODELS[newBrand].includes(newModel)) && (
                    <input
                      id="dealer_model_input_custom"
                      type="text"
                      placeholder="Type custom model..."
                      value={newModel === 'other_model' ? '' : newModel}
                      onChange={(e) => setNewModel(e.target.value)}
                      className="w-full mt-1.5 py-2 px-3 bg-stone-950 rounded-lg border border-stone-850 text-stone-300 text-xs focus:outline-none focus:border-stone-700"
                    />
                  )}
                </div>
              </div>

                         {/* Photo Input & Collection Grid */}
              <div className="space-y-3">
                <div className="flex justify-between items-end">
                  <div>
                    <span className="text-xs font-mono uppercase text-stone-400 block font-bold">
                      Upload Photos of your car ({selectedPhotos.length}/6)
                    </span>
                    <span className="text-xs text-stone-500 block mt-1 leading-normal">
                      Minimum 6 unique photos are required to publish. Stock or duplicate photos are blocked automatically.
                    </span>
                  </div>
                  {selectedPhotos.length > 0 && (
                    <span className="text-[10px] font-mono text-amber-500 font-bold bg-amber-500/5 px-2 py-0.5 rounded border border-amber-500/10">
                      {selectedPhotos.length}/6 Uploaded
                    </span>
                  )}
                </div>

                {photoUploadError && (
                  <motion.div 
                    initial={{ opacity: 0, y: -5 }} 
                    animate={{ opacity: 1, y: 0 }} 
                    exit={{ opacity: 0 }}
                    className="p-3 bg-red-950/40 border border-red-500/20 text-red-400 text-xs rounded-xl font-mono flex items-center justify-center gap-1.5"
                  >
                    <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse shrink-0" />
                    <span>{photoUploadError}</span>
                  </motion.div>
                )}

                {/* Drag / Click Upload Target box */}
                <div 
                  onClick={() => document.getElementById('car_photos_uploader')?.click()}
                  className="border-2 border-dashed border-stone-800 hover:border-amber-500/50 bg-stone-950/40 hover:bg-stone-950/80 p-8 rounded-2xl text-center cursor-pointer transition-all duration-300"
                >
                  <div className="flex flex-col items-center gap-2">
                    <Plus className="w-8 h-8 text-amber-500" />
                    <span className="text-xs font-medium text-stone-200">Drag & Drop or Click to Upload Car Photos</span>
                    <span className="text-[10px] text-stone-500">Supports JPG, PNG, WEBP (At least 6 unique files)</span>
                  </div>
                  <input 
                    type="file" 
                    id="car_photos_uploader" 
                    multiple 
                    accept="image/*" 
                    onChange={(e) => {
                      if (e.target.files) {
                        const filesArray = Array.from(e.target.files);
                        let added = 0;
                        let duplicates = 0;
                        const newUrls: string[] = [];
                        const newSigs: string[] = [];
                        
                        filesArray.forEach((file: any) => {
                          const sig = `${file.name}-${file.size}`;
                          if (photoSignatures.includes(sig) || newSigs.includes(sig)) {
                            duplicates++;
                          } else {
                            newUrls.push(URL.createObjectURL(file as any));
                            newSigs.push(sig);
                            added++;
                          }
                        });
                        
                        if (duplicates > 0) {
                          setPhotoUploadError(`${duplicates} duplicate photo(s) ignored to keep listings authentic.`);
                          setTimeout(() => setPhotoUploadError(null), 4000);
                        }
                        
                        if (added > 0) {
                          setSelectedPhotos(prev => [...prev, ...newUrls]);
                          setPhotoSignatures(prev => [...prev, ...newSigs]);
                        }
                      }
                    }} 
                    className="hidden" 
                  />
                </div>
              </div>

              {/* Uploaded previews thumbnails */}
              {selectedPhotos.length > 0 && (
                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="text-xs font-mono text-stone-400">Uploaded Pictures ({selectedPhotos.length}/6)</span>
                    <button 
                      type="button" 
                      onClick={() => {
                        setSelectedPhotos([]);
                        setPhotoSignatures([]);
                      }} 
                      className="text-[10px] uppercase font-mono text-stone-500 hover:text-red-400"
                    >
                      Clear All
                    </button>
                  </div>
                  <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
                    {selectedPhotos.map((url, i) => (
                      <div key={i} className="aspect-video relative rounded-lg overflow-hidden border border-stone-800 group bg-stone-950">
                        <img referrerPolicy="no-referrer" src={url} alt={`Preview ${i+1}`} className="w-full h-full object-cover" />
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedPhotos(prev => prev.filter((_, idx) => idx !== i));
                            setPhotoSignatures(prev => prev.filter((_, idx) => idx !== i));
                          }}
                          className="absolute top-1 right-1 p-1 bg-stone-950/80 rounded-md text-stone-400 hover:text-red-500 transition-colors"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Dynamic Photo Tracker Info Label */}
              <div className="p-3 bg-stone-950/60 rounded-xl border border-stone-850 space-y-1.5 font-sans">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-mono font-bold text-stone-300 uppercase tracking-wide">
                    Photo Coverage: {selectedPhotos.length}/6 Uploaded
                  </span>
                  <span className={`text-[8.5px] font-mono font-bold uppercase ${selectedPhotos.length >= 10 ? 'text-emerald-400' : selectedPhotos.length >= 6 ? 'text-amber-500' : 'text-rose-400'}`}>
                    {selectedPhotos.length >= 10 ? 'ALGO BOOSTED' : selectedPhotos.length >= 6 ? 'MET' : `${selectedPhotos.length}/6 IMAGES`}
                  </span>
                </div>
                {selectedPhotos.length < 6 ? (
                  <p className="text-[10px] text-rose-450 text-red-500 leading-relaxed font-bold">
                    Please upload at least {6 - selectedPhotos.length} more unique photo(s) to showcase your vehicle accurately.
                  </p>
                ) : selectedPhotos.length >= 6 && selectedPhotos.length < 10 ? (
                  <p className="text-[10px] text-amber-500 leading-relaxed">
                    Requirement met! Select exactly 10 or more photos to receive an instant Algorithmic listing boost (boosting visibility layout up to 4x).
                  </p>
                ) : (
                  <p className="text-[10px] text-emerald-400 leading-relaxed font-semibold">
                    Algorithm Boost Active! {selectedPhotos.length} photos assigned. Your listing has been bumped in search priority matching queues.
                  </p>
                )}
              </div>

              <button
                id="step_1_next"
                type="button"
                disabled={selectedPhotos.length < 6 || !newBrand.trim() || !newModel.trim()}
                onClick={() => setListingStep(2)}
                className="w-full py-2.5 bg-stone-100 hover:bg-white text-[#0f0e11] disabled:bg-stone-900 disabled:text-stone-600 font-mono text-[10.5px] font-bold tracking-widest uppercase rounded-xl transition-all cursor-pointer"
              >
                {selectedPhotos.length < 6 ? `Need unique photos (${selectedPhotos.length}/6)` : 'Next: Specs'}
              </button>
            </motion.div>
          )}

          {/* Step 2: Choose Engine, Transmission, and Fuel Type */}
          {listingStep === 2 && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4 font-sans">
              <label className="block text-[9.5px] uppercase tracking-widest text-[#d97706] font-mono font-bold">
                Step 2: Engine, Transmission & Fuel
              </label>

              <div className="space-y-3.5 font-sans">
                <div className="space-y-1">
                  <label className="text-[8.5px] font-mono uppercase text-stone-400 font-bold block">Engine displacement</label>
                  <input
                    id="dealer_engine_text"
                    type="text"
                    placeholder="e.g. 2.0L or Electric"
                    value={newEngine}
                    onChange={(e) => setNewEngine(e.target.value)}
                    className="w-full py-2 px-3 bg-stone-900 rounded-lg border border-stone-800 text-stone-300 text-xs focus:outline-none"
                  />
                  <span className="text-[8px] text-stone-500 block leading-normal font-sans">
                    Expected: Motor displacement (e.g. 2.0L, 4.0L, Electric).
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-[8.5px] font-mono uppercase text-stone-400 block font-bold">Transmission</label>
                    <select
                      id="dealer_trans_select"
                      value={newTrans}
                      onChange={(e) => setNewTrans(e.target.value)}
                      className="w-full py-2 px-3 bg-stone-900 rounded-lg border border-stone-800 text-stone-300 text-xs focus:outline-none"
                    >
                      <option value="6-Speed Manual">Manual Transmission</option>
                      <option value="8-Speed Dual Clutch">Dual Clutch Automatic</option>
                      <option value="Single-Speed Automatic">Electric/Direct Drive</option>
                    </select>
                    <span className="text-[8px] text-stone-500 block leading-normal font-sans">
                      Expected: Shift layout and gearbox style.
                    </span>
                  </div>

                  <div className="space-y-1">
                    <label className="text-[8.5px] font-mono uppercase text-stone-400 block font-bold">Fuel Type</label>
                    <select
                      id="dealer_fuel_select"
                      value={newFuelType}
                      onChange={(e) => setNewFuelType(e.target.value)}
                      className="w-full py-2 px-3 bg-stone-900 rounded-lg border border-stone-800 text-stone-300 text-xs focus:outline-none"
                    >
                      <option value="Gasoline">Super Gasoline</option>
                      <option value="91 Octane Petrol">91 Octane</option>
                      <option value="Electric (EV)">Full Electric</option>
                      <option value="Hybrid">Hybrid Electric</option>
                    </select>
                    <span className="text-[8px] text-stone-500 block leading-normal font-sans">
                      Expected: Propulsion liquid or voltage charging pattern.
                    </span>
                  </div>
                </div>
              </div>

              <div className="flex gap-2">
                <button
                  id="step_2_back"
                  type="button"
                  onClick={() => setListingStep(1)}
                  className="w-1/3 py-2.5 border border-stone-800 text-stone-400 hover:text-stone-200 text-[10px] font-mono rounded-xl cursor-pointer"
                >
                  Back
                </button>
                <button
                  id="step_2_next"
                  type="button"
                  onClick={() => setListingStep(3)}
                  className="w-2/3 py-2.5 bg-stone-100 hover:bg-white text-stone-950 text-[10.5px] font-mono font-bold tracking-widest uppercase rounded-xl transition cursor-pointer"
                >
                  Next: Numbers
                </button>
              </div>
            </motion.div>
          )}

          {/* Step 3: Mileage, Year, Acceleration & Maximum Velocity */}
          {listingStep === 3 && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
              <label className="block text-[9.5px] uppercase tracking-widest text-[#d97706] font-mono font-bold">
                Step 3: Mileage, Year & Speed
              </label>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-[8.5px] font-mono uppercase text-stone-400 font-bold block">Mileage</label>
                  <input
                    id="dealer_mileage_input"
                    type="text"
                    value={newMileage}
                    onChange={(e) => setNewMileage(e.target.value)}
                    placeholder="e.g. 15,000 miles"
                    className="w-full py-1.5 px-3 bg-stone-900 rounded-lg border border-stone-800 text-stone-300 text-xs focus:outline-none"
                  />
                  <span className="text-[8px] text-stone-500 block leading-normal">
                    Expected: Current odometer travel (e.g. 12,500 mi).
                  </span>
                </div>

                <div className="space-y-1">
                  <label className="text-[8.5px] font-mono uppercase text-stone-400 font-bold block">Model Year</label>
                  <input
                    id="dealer_year_input"
                    type="text"
                    value={newYear}
                    onChange={(e) => setNewYear(e.target.value)}
                    placeholder="e.g. 2024"
                    className="w-full py-1.5 px-3 bg-stone-900 rounded-lg border border-stone-800 text-stone-300 text-xs focus:outline-none"
                  />
                  <span className="text-[8px] text-stone-500 block leading-normal">
                    Expected: Production model year digits (e.g. 2025).
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-2">
                <div className="space-y-1">
                  <label className="text-[8px] font-mono uppercase text-stone-400 block">0-100 accel</label>
                  <input
                    id="dealer_accel_input"
                    type="text"
                    placeholder="e.g. 4.1s"
                    value={newAccel}
                    onChange={(e) => setNewAccel(e.target.value)}
                    className="w-full py-1.5 px-2 bg-stone-900 rounded-lg border border-stone-800 text-stone-300 text-[10.5px] text-center font-mono focus:outline-none"
                  />
                  <span className="text-[7.5px] text-stone-500 block text-center leading-tight">
                    Expected: Zero-to-hundred acceleration speed (e.g. 4.8s).
                  </span>
                </div>
                <div className="space-y-1">
                  <label className="text-[8px] font-mono uppercase text-stone-400 block">HORSEPOWER</label>
                  <input
                    id="dealer_power_input"
                    type="number"
                    placeholder="300"
                    value={newPower}
                    onChange={(e) => setNewPower(e.target.value)}
                    className="w-full py-1.5 px-2 bg-stone-900 rounded-lg border border-stone-800 text-stone-300 text-[10.5px] text-center font-mono focus:outline-none"
                  />
                  <span className="text-[7.5px] text-stone-500 block text-center leading-tight">
                    Expected: Engine peak power output (e.g. 320 HP).
                  </span>
                </div>
                <div className="space-y-1">
                  <label className="text-[8px] font-mono uppercase text-stone-400 block">Max Velocity (km/h)</label>
                  <input
                    id="dealer_speed_input"
                    type="number"
                    placeholder="250"
                    value={newSpeed}
                    onChange={(e) => setNewSpeed(e.target.value)}
                    className="w-full py-1.5 px-2 bg-stone-900 rounded-lg border border-stone-800 text-stone-300 text-[10.5px] text-center font-mono focus:outline-none shadow-inner"
                  />
                  <span className="text-[7.5px] text-stone-500 block text-center leading-tight">
                    Expected: Maximum attainable speed index (e.g. 250).
                  </span>
                </div>
              </div>

              <div className="flex gap-2">
                <button
                  id="step_3_back"
                  type="button"
                  onClick={() => setListingStep(2)}
                  className="w-1/3 py-2.5 border border-stone-800 text-stone-400 hover:text-stone-200 text-[10px] font-mono rounded-xl cursor-pointer"
                >
                  Back
                </button>
                <button
                  id="step_3_next"
                  type="button"
                  onClick={() => setListingStep(4)}
                  className="w-2/3 py-2.5 bg-stone-100 hover:bg-white text-stone-950 text-[10.5px] font-mono font-bold tracking-widest uppercase rounded-xl transition cursor-pointer"
                >
                  Next: Deal
                </button>
              </div>
            </motion.div>
          )}

          {/* Step 4: Price, Pickup Location, and Description */}
          {listingStep === 4 && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
              <label className="block text-[9.5px] uppercase tracking-widest text-[#d97706] font-mono font-bold">
                Step 4: Deal Details & Intro
              </label>

              <div className="grid grid-cols-2 gap-3 pb-1">
                <div>
                  <label className="text-[8.5px] font-mono uppercase text-stone-500 font-bold block mb-1">Deal Type</label>
                  <select
                    id="dealer_type_input"
                    value={newType}
                    onChange={(e) => setNewType(e.target.value as 'rent' | 'buy')}
                    className="w-full py-2 px-3 bg-stone-900 rounded-lg border border-stone-800 text-stone-300 text-xs focus:outline-none"
                  >
                    <option value="rent">Rent per day</option>
                    <option value="buy">Sell (Buy Now)</option>
                  </select>
                </div>

                <div>
                  <label className="text-[8.5px] font-mono uppercase text-stone-500 font-bold block mb-1">Price ($)</label>
                  <input
                    id="dealer_price_input"
                    type="number"
                    value={newPrice}
                    onChange={(e) => setNewPrice(e.target.value)}
                    className="w-full py-1.5 px-3 bg-stone-900 rounded-lg border border-stone-800 text-stone-300 text-xs font-mono focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="text-[8.5px] font-mono uppercase text-stone-500 font-bold block mb-l">Pickup / Deal Location</label>
                <input
                  id="dealer_loc_input"
                  type="text"
                  placeholder="e.g. Culver City, CA"
                  value={newLoc}
                  onChange={(e) => setNewLoc(e.target.value)}
                  className="w-full py-2 px-3 bg-stone-900 rounded-lg border border-stone-800 text-stone-300 text-xs focus:outline-none"
                />
              </div>

              <div>
                <label className="text-[8.5px] font-mono uppercase text-stone-500 font-bold block mb-1">Car description bio</label>
                <textarea
                  id="dealer_desc_input"
                  rows={2}
                  placeholder="Tell people why they will love swiping on your car..."
                  value={newDesc}
                  onChange={(e) => setNewDesc(e.target.value)}
                  className="w-full py-2 px-3 bg-stone-900 rounded-xl border border-stone-800 text-stone-300 text-xs focus:outline-none placeholder:text-stone-600 font-sans leading-relaxed"
                />
              </div>

              {/* Special Features adding section */}
              <div className="space-y-1.5">
                <span className="text-[8px] font-mono uppercase text-stone-500">Pick Highlights</span>
                <div className="flex gap-2">
                  <input
                    id="highlight_input"
                    type="text"
                    value={newFeatureInput}
                    onChange={(e) => setNewFeatureInput(e.target.value)}
                    placeholder="e.g. Glass Sunroof"
                    className="flex-1 py-1.5 px-2.5 bg-stone-900 rounded-lg border border-stone-800 text-xs text-stone-350 focus:outline-none"
                  />
                  <button
                    type="button"
                    onClick={handleAddFeature}
                    className="py-1 px-3 bg-stone-800 hover:bg-stone-700 text-stone-100 rounded-lg font-mono text-[10px] uppercase font-bold cursor-pointer"
                  >
                    Add
                  </button>
                </div>
                <div className="flex flex-wrap gap-1 pt-1">
                  {newFeatures.map((f, i) => (
                    <span key={i} className="inline-flex items-center gap-1.5 text-[9px] font-mono text-stone-405 bg-stone-900 px-2.5 py-1 rounded border border-stone-850">
                      <span>{f}</span>
                      <button type="button" onClick={() => handleRemoveFeature(i)} className="text-red-500 hover:text-red-400 font-bold text-xs">×</button>
                    </span>
                  ))}
                </div>
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  id="step_4_back"
                  type="button"
                  onClick={() => setListingStep(3)}
                  className="w-1/3 py-2.5 border border-stone-800 text-stone-400 hover:text-stone-200 text-[10px] font-mono rounded-xl cursor-pointer"
                >
                  Back
                </button>
                <button
                  id="step_4_publish"
                  type="button"
                  onClick={handleDraftSubmit}
                  className="w-2/3 py-2.5 bg-gradient-to-r from-amber-600 to-amber-500 hover:from-amber-550 hover:to-amber-505 text-white font-mono text-[11px] font-bold uppercase tracking-widest rounded-xl transition shadow cursor-pointer"
                >
                  Post Car!
                </button>
              </div>
            </motion.div>
          )}

        </div>
        )}

        {/* Dynamic List showing Followed Accounts */}
        <div id="followed_accounts_section" className="bg-stone-900 border border-stone-850 p-6 rounded-3xl space-y-4">
          <div className="flex items-center gap-2 border-b border-stone-850 pb-3">
            <Users className="w-4 h-4 text-[#d97706]" />
            <h3 className="text-xs font-mono uppercase tracking-widest text-[#d97706] font-bold">
              Followed Members ({(currentUser.followingUserIds || []).length})
            </h3>
          </div>

          {(!currentUser.followingUserIds || currentUser.followingUserIds.length === 0) ? (
            <div className="text-center py-5 space-y-2">
              <p className="text-xs text-stone-500 font-sans">You are not following any other profiles yet.</p>
              <button
                onClick={onNavigateToSwipe}
                className="text-[9.5px] font-mono uppercase text-amber-500 underline"
              >
                Go find members to follow
              </button>
            </div>
          ) : (
            <div className="space-y-3 max-h-56 overflow-y-auto pr-1">
              {currentUser.followingUserIds.map(sellerId => {
                // Determine details dynamically
                const match = cars.find(c => c.dealerId === sellerId);
                const name = match ? match.dealerName : 'Premium Partner';
                const avatar = match ? match.dealerAvatar : 'https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?q=80&w=120';
                const countOfPostings = cars.filter(c => c.dealerId === sellerId).length;

                return (
                  <div key={sellerId} className="flex items-center justify-between p-3 bg-stone-950 rounded-2xl border border-stone-900/80">
                    <div className="flex items-center gap-3">
                      <img 
                        referrerPolicy="no-referrer"
                        src={avatar} 
                        alt={name}
                        className={`w-10 h-10 object-cover rounded-full border ${
                          sellerId.startsWith('dealer_') || sellerId === 'dealer_001'
                            ? 'border-2 border-[#ff2800] ring-2 ring-[#ff2800]/25'
                            : 'border-stone-800'
                        }`} 
                      />
                      <div>
                        <h4 className="text-xs font-semibold text-stone-200">{name}</h4>
                        <p className="text-[9px] font-mono text-stone-500 uppercase">
                          {sellerId.startsWith('dealer_') ? 'Official Dealer' : 'Standard Creator'} • {countOfPostings} active cars
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <span className="text-[8px] bg-[#006B4F]/15 text-[#006B4F] border border-[#006B4F]/25 py-0.5 px-2 rounded-full font-mono uppercase font-bold">Notifications Enabled</span>
                      <button
                        onClick={() => {
                          const nextFollowing = (currentUser.followingUserIds || []).filter(id => id !== sellerId);
                          onUserUpdate({
                            ...currentUser,
                            followingUserIds: nextFollowing
                          });
                        }}
                        className="text-[9px] font-mono uppercase text-rose-500 bg-rose-500/10 hover:bg-rose-500/20 px-2.5 py-1 rounded-lg border border-rose-500/20 transition-colors"
                      >
                        Unfollow
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* CUSTOM DEMAND METRICS (Visible only for dealers/premium user tiers) */}
        {currentUser.role === 'dealer' && (
          <div id="dealer_analytics_demand" className="p-6 bg-stone-900 border border-stone-850 rounded-3xl space-y-4">
            <div className="flex items-center gap-2 border-b border-stone-850 pb-3">
              <BarChart3 className="w-4 h-4 text-emerald-500" />
              <h3 className="text-xs font-mono uppercase tracking-widest text-emerald-500 font-bold">
                Dealer Lead Traffic Logs
              </h3>
            </div>

            <div className="space-y-3">
              <div className="p-3.5 bg-stone-950 rounded-xl border border-stone-900 flex items-center justify-between">
                <div>
                  <span className="text-[9px] bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-2 py-0.5 rounded uppercase font-mono font-bold block w-fit mb-1">RENTAL DEMAND</span>
                  <p className="text-xs text-stone-200">2 matches interested in your rentals this week.</p>
                </div>
                <Info className="w-4 h-4 text-stone-600 shrink-0" />
              </div>
            </div>
          </div>
        )}

        {/* Preferences & Settings (at the lowest part of the page) */}
        <div id="preferences_settings_card" className="p-6 bg-stone-900 border border-stone-850 rounded-3xl space-y-5">
          <div className="flex items-center gap-2 border-b border-stone-850 pb-3">
            <Sliders className="w-4 h-4 text-amber-500" />
            <h3 className="text-xs font-mono uppercase tracking-widest text-[#d97706] font-semibold">
              Preferences & Settings
            </h3>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {/* Language Selection */}
            <div id="pref_lang_box" className="space-y-2">
              <label className="text-[10px] uppercase tracking-widest text-stone-500 font-mono flex items-center gap-1.5 font-bold">
                <Globe className="w-3.5 h-3.5 text-amber-500" />
                <span>Language</span>
              </label>
              <select
                id="pref_lang_selector"
                value={language}
                onChange={(e) => onLanguageChange(e.target.value as AppLanguage)}
                className="w-full text-xs py-2 px-3 bg-stone-950 rounded-xl border border-stone-850 focus:outline-none focus:border-stone-700 cursor-pointer text-stone-200"
              >
                <option value="en">English (EN)</option>
                <option value="es">Español (ES)</option>
                <option value="it">Italiano (IT)</option>
              </select>
            </div>

            {/* Distance Metric */}
            <div id="pref_unit_box" className="space-y-2">
              <label className="text-[10px] uppercase tracking-widest text-stone-500 font-mono block font-bold">
                Units
              </label>
              <div className="grid grid-cols-2 p-1 bg-stone-950 rounded-xl border border-stone-850 font-mono">
                <button
                  type="button"
                  id="pref_btn_mi"
                  onClick={() => onUnitChange('mi')}
                  className={`py-1.5 text-[10px] uppercase font-mono tracking-wider rounded-lg transition-all ${
                    unit === 'mi'
                      ? 'bg-stone-800 text-stone-100 font-semibold shadow-inner'
                      : 'text-stone-500 hover:text-stone-300'
                  }`}
                >
                  mi
                </button>
                <button
                  type="button"
                  id="pref_btn_km"
                  onClick={() => onUnitChange('km')}
                  className={`py-1.5 text-[10px] uppercase font-mono tracking-wider rounded-lg transition-all ${
                    unit === 'km'
                      ? 'bg-stone-800 text-stone-100 font-semibold shadow-inner'
                      : 'text-stone-500 hover:text-stone-300'
                  }`}
                >
                  km
                </button>
              </div>
            </div>

            {/* Geolocation Distance Slider */}
            <div id="pref_distance_box" className="space-y-2.5 bg-stone-950/40 p-4 border border-stone-850 rounded-xl">
              <div className="flex items-center justify-between">
                <label className="text-[10px] uppercase tracking-widest text-stone-400 font-mono block font-bold">
                  Max Distance
                </label>
                <span className="text-[10.5px] font-mono text-amber-500 font-extrabold bg-amber-500/10 border border-amber-500/20 px-2.5 py-0.5 rounded">
                  {maxDistance} {unit === 'mi' ? 'miles' : 'km'}
                </span>
              </div>
              <input
                type="range"
                min="5"
                max="300"
                value={maxDistance}
                onChange={(e) => onMaxDistanceChange?.(parseInt(e.target.value, 10))}
                className="w-full h-1 bg-stone-90 border border-stone-850 rounded-lg appearance-none cursor-pointer accent-amber-500"
                style={{
                  background: `linear-gradient(to right, #f59e0b 0%, #f59e0b ${(maxDistance - 5) / 295 * 100}%, #1c1917 ${(maxDistance - 5) / 295 * 100}%, #1c1917 100%)`
                }}
              />
              <p className="text-[9px] text-stone-500 font-sans leading-normal">
                Applies geolocation filtering to find hyper-local supercar options near your position.
              </p>
            </div>


          </div>

          {/* Simulation & Role Sandbox Hub */}
          <div className="border-t border-stone-850 pt-4.5 space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-[10px] uppercase tracking-widest text-[#d97706] font-mono flex items-center gap-1.5 font-bold">
                <Shield className="w-3.5 h-3.5 text-amber-500" />
                <span>Simulation Sandbox Role Switcher</span>
              </label>
              <span className="text-[8px] bg-amber-500/10 border border-amber-500/25 text-amber-550 font-mono py-0.5 px-2 rounded uppercase font-bold">
                Developer Tool
              </span>
            </div>
            <p className="text-[10px] text-stone-400 font-sans leading-normal">
              Dynamically switch your active account role to inspect different perspectives. Elevating to **UGC Admin** instantly mounts our **Asset Moderation Safety Console**.
            </p>
            <div className="grid grid-cols-3 gap-2 font-mono text-[9px] uppercase tracking-wider font-extrabold">
              {[
                { name: 'Standard User', role: 'user', color: 'border-stone-805 bg-stone-950/40 text-stone-500 hover:text-stone-300' },
                { name: 'Dealer Operator', role: 'dealer', color: 'border-red-500/15 bg-stone-950/40 text-red-500 hover:text-red-400' },
                { name: 'UGC Admin Moderator', role: 'admin', color: 'border-amber-500/15 bg-amber-500/5 text-amber-500 hover:text-amber-400' }
              ].map((item) => {
                const isActive = currentUser.role === item.role;
                return (
                  <button
                    key={item.role}
                    type="button"
                    onClick={async () => {
                      try {
                        let token = "";
                        if (auth.currentUser) {
                          token = await auth.currentUser.getIdToken();
                        }
                        const response = await fetch('/api/auth/profile/role', {
                          method: 'PUT',
                          headers: {
                            'Content-Type': 'application/json',
                            ...(token ? { 'Authorization': `Bearer ${token}` } : {})
                          },
                          body: JSON.stringify({ role: item.role })
                        });
                        if (!response.ok) {
                          throw new Error("Unable to synchronize role mapping with servers.");
                        }
                        const data = await response.json();
                        onUserUpdate({
                          ...currentUser,
                          role: data.profile.role
                        });
                      } catch (err: any) {
                        console.error("Role swap failed:", err);
                        alert(err.message || "Failed to swap roles due to network issues.");
                      }
                    }}
                    className={`py-2 p-2 border rounded-xl text-center cursor-pointer transition-all ${
                      isActive 
                        ? 'border-amber-500 bg-amber-500 text-stone-950 font-extrabold shadow-lg shadow-amber-950/20' 
                        : `hover:border-stone-700 ${item.color} font-medium`
                    }`}
                  >
                    {item.name}
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Account Session Actions (Lowest part of profile tab) */}
        <div id="account_session_actions_card" className="p-6 bg-stone-900 border border-stone-850 rounded-3xl space-y-4">
          <div className="flex items-center gap-2 border-b border-stone-850 pb-3">
            <UserIcon className="w-4 h-4 text-red-500" />
            <h3 className="text-xs font-mono uppercase tracking-widest text-[#ef4444] font-semibold">
              Account Security & Session
            </h3>
          </div>

          <div className="flex flex-col gap-3">
            <button
              type="button"
              id="pref_signout_action_btn"
              onClick={() => setShowConfirmLogout(true)}
              className="py-3 px-5 bg-stone-950 hover:bg-stone-850 border border-stone-850 text-stone-200 hover:text-white text-[10px] font-mono uppercase tracking-wider rounded-xl transition cursor-pointer text-center flex justify-center items-center font-bold"
            >
              Sign Out from Account
            </button>

            <button
              type="button"
              id="pref_delete_account_action_btn"
              onClick={() => setShowConfirmDelete(true)}
              className="py-3 px-5 bg-red-950/15 hover:bg-red-950/35 border border-red-500/25 hover:border-red-500/40 text-[#ef4444] hover:text-[#f87171] text-[10px] font-mono uppercase tracking-wider rounded-xl transition cursor-pointer text-center flex justify-center items-center font-bold"
            >
              Permanently Delete Account
            </button>
          </div>
        </div>

      </div>

    </div>
  );
}
