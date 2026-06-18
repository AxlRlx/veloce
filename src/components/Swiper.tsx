import { useState, useEffect, MouseEvent, FormEvent } from 'react';
import { Car, AppLanguage, Review, User, COMMON_BRANDS_MODELS } from '../types';
import { DICTIONARY, PHOTO_PLACEHOLDERS } from '../data';
import { motion, AnimatePresence, useMotionValue, useTransform } from 'motion/react';
import { 
  Heart, X, Search, MapPin, Compass, Shield, Award, 
  MessageCircle, Star, Sparkles, Filter, ChevronRight, 
  Zap, Check, Users, ExternalLink, ChevronLeft, Maximize2, Flag,
  Calendar
} from 'lucide-react';

interface SwiperProps {
  cars: Car[];
  likedCarIds: string[];
  language: AppLanguage;
  onLikedChange: (updatedLikedIds: string[]) => void;
  onRequestRent: (car: Car) => void;
  onOpenChat: (car: Car) => void;
  unit: 'mi' | 'km';
  onUnitChange: (unit: 'mi' | 'km') => void;
  onLanguageChange: (language: AppLanguage) => void;
  currentUser: User;
  onFollowToggle: (sellerId: string) => void;
  theme: 'light' | 'dark';
}

export default function Swiper({
  cars,
  likedCarIds,
  language,
  onLikedChange,
  onRequestRent,
  onOpenChat,
  unit,
  onUnitChange,
  onLanguageChange,
  currentUser,
  onFollowToggle,
  theme
}: SwiperProps) {
  const t = DICTIONARY[language];

  // Search and Filter States
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedType, setSelectedType] = useState<'all' | 'rent' | 'buy'>('all');
  const [maxDistance, setMaxDistance] = useState(15);
  const [selectedBrand, setSelectedBrand] = useState<string | null>(null);
  const [selectedModel, setSelectedModel] = useState<string>('all');
  const [selectedCategory, setSelectedCategory] = useState<'all' | 'car' | 'motorcycle'>('all');
  const [selectedDrivetrain, setSelectedDrivetrain] = useState<'all' | 'AWD' | 'RWD' | 'FWD'>('all');
  const [selectedDisplacement, setSelectedDisplacement] = useState<string>('all');
  const [showFilters, setShowFilters] = useState(false);
  
  // Custom Feed Categorization Switch
  const [feedType, setFeedType] = useState<'luxury' | 'normal' | 'mixed'>('mixed');

  // Swipe states
  const [currentIndex, setCurrentIndex] = useState(0);
  const [expandDetails, setExpandDetails] = useState(false);
  const [swipeTriggerEffect, setSwipeTriggerEffect] = useState<'left' | 'right' | null>(null);
  const [activePhotoIndex, setActivePhotoIndex] = useState(0);
  const [showFullscreenGallery, setShowFullscreenGallery] = useState(false);
  const [luxuryAlerts, setLuxuryAlerts] = useState<{ id: string; text: string }[]>([]);

  // Intercepting Promo Banner / Match Alert
  const [promoMessage, setPromoMessage] = useState<string | null>(null);

  // UGC safety moderation and reporting controls (App Store compliance)
  const [showReportModal, setShowReportModal] = useState(false);
  const [reportReason, setReportReason] = useState('');
  const [reportSuccess, setReportSuccess] = useState<string | null>(null);
  const [blockedUserIds, setBlockedUserIds] = useState<string[]>([]);

  // Seller profile overlay popup modal
  const [selectedSellerId, setSelectedSellerId] = useState<string | null>(null);

  // Drag physics motion values for desktop Tinder-Style drag mechanics
  const x = useMotionValue(0);
  const rotate = useTransform(x, [-200, 200], [-10, 10]);
  const opacity = useTransform(x, [-250, -150, 0, 150, 250], [0.5, 1, 1, 1, 0.5]);

  // Dynamic sponsor advertisements to inject into the deck
  const ads = [
    {
      id: 'ad_1',
      brand: 'SPONSORED AD',
      model: 'Apex Energy Drink',
      year: 2026,
      images: ['https://images.unsplash.com/photo-1542841791-1926673bf69b?q=80&w=800'],
      price: 0,
      description: 'Apex Energy delivers ultra-focused racing electrolytes & B-vitamins for rapid track-time reflexes and clean energy. Swipe right to claim 20% off at checkout!',
      features: ['Electrolyte Booster', 'No Crash Formula', 'B-Vitamins Complex'],
      isAd: true,
      adLinkText: 'GET PROMO CODE',
      adTitle: 'Fuel Your Performance',
      dealerName: 'Apex Muscle & Fuel',
      dealerAvatar: 'https://images.unsplash.com/photo-1542841791-1926673bf69b?q=80&w=120'
    },
    {
      id: 'ad_2',
      brand: 'SPONSORED AD',
      model: 'Veloce Chronosport Watch',
      year: 2026,
      images: ['https://images.unsplash.com/photo-1522335789203-aabd1fc54bc9?q=80&w=800'],
      price: 180,
      description: 'Built for precision lap times. Crafted in grade-5 sandblasted titanium with carbon weave details. Claim an exclusive brochure with your match.',
      features: ['Grade-5 Titanium', 'Automatic caliber', 'Saphire Lens Shield'],
      isAd: true,
      adLinkText: 'EXPLORE WATCHES',
      adTitle: 'Precision On Your Wrist',
      dealerName: 'Veloce Horology Group',
      dealerAvatar: 'https://images.unsplash.com/photo-1522335789203-aabd1fc54bc9?q=80&w=120'
    },
    {
      id: 'ad_3',
      brand: 'SPONSORED AD',
      model: 'Michelin Pilot Asphalt Trial',
      year: 2026,
      images: ['https://images.unsplash.com/photo-1517404212738-15261e9f917d?q=80&w=800'],
      price: 220,
      description: 'Claim your morning track slot. Complete with pro performance coaching, telemetry analysis, and VIP paddock entry. Save with Veloce coupon!',
      features: ['Telemetry Coach', 'Asphalt Drift Trial', 'Paddock Catering'],
      isAd: true,
      adLinkText: 'BOOK TRACK SLOT',
      adTitle: 'Maximum Asphalt Grip',
      dealerName: 'Michelin Line Team',
      dealerAvatar: 'https://images.unsplash.com/photo-1517404212738-15261e9f917d?q=80&w=120'
    }
  ];

  // Filtering Logic
  const filteredCars = cars.filter(c => {
    // Hide reported or blocked user generated content
    const isBlocked = blockedUserIds.includes(c.dealerId);
    if (isBlocked) return false;

    const matchesSearch = c.brand.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          c.model.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesType = selectedType === 'all' ? true : (c.type === selectedType || c.type === 'both');
    const matchesDistance = c.distance <= maxDistance;
    const matchesBrand = selectedBrand ? c.brand === selectedBrand : true;
    
    // Intelligent advanced filters
    const matchesModel = selectedModel === 'all' ? true : c.model === selectedModel;
    const carCategory = c.category || 'car';
    const matchesCategory = selectedCategory === 'all' ? true : carCategory === selectedCategory;
    
    const carDrivetrain = c.drivetrain || 'RWD';
    const matchesDrivetrain = selectedDrivetrain === 'all' ? true : carDrivetrain === selectedDrivetrain;
    
    const carDisplacement = c.displacement || '3.0L';
    const matchesDisplacement = selectedDisplacement === 'all' 
      ? true 
      : carDisplacement.toLowerCase().includes(selectedDisplacement.toLowerCase());
    
    // Luxury Feed limits: Rent price >= 250 OR Sale price >= 75000 OR Brand is highly luxury.
    const isLuxury = c.price >= 250 || (c.type === 'buy' && c.price >= 70000);
    const matchesFeed = feedType === 'mixed' 
      ? true 
      : feedType === 'luxury' 
        ? isLuxury 
        : !isLuxury;

    return matchesSearch && matchesType && matchesDistance && matchesBrand && matchesModel && matchesCategory && matchesDrivetrain && matchesDisplacement && matchesFeed;
  });

  // Inject Ads after every 4th car
  const getFeedWithAds = (carList: Car[]) => {
    const combined: any[] = [];
    let adCounter = 0;
    for (let i = 0; i < carList.length; i++) {
      combined.push(carList[i]);
      if ((combined.length) % 5 === 4) {
        const adTemplate = ads[adCounter % ads.length];
        combined.push({
          ...adTemplate,
          id: `ad_${combined.length}_${adTemplate.id}`,
        });
        adCounter++;
      }
    }
    return combined;
  };

  const feedItems = getFeedWithAds(filteredCars);
  const activeCar = feedItems[currentIndex];

  useEffect(() => {
    setActivePhotoIndex(0);
    x.set(0);
    setSwipeTriggerEffect(null);
  }, [currentIndex, feedItems.length]);

  // Dynamic status notifications ticker for direct followed accounts
  useEffect(() => {
    // Disabled random followed account notifications ticker
    return () => {};
  }, [currentUser?.followingUserIds, cars]);

  const handleSwipe = (direction: 'left' | 'right') => {
    if (!activeCar) return;

    setSwipeTriggerEffect(direction);

    if (direction === 'right') {
      if (activeCar.isAd) {
        // Sponsor card swiped right - no promo code popup alerts
      } else {
        if (!likedCarIds.includes(activeCar.id)) {
          onLikedChange([...likedCarIds, activeCar.id]);
        }
      }
    }

    setTimeout(() => {
      setSwipeTriggerEffect(null);
      setCurrentIndex(prev => (prev + 1) % feedItems.length);
    }, 450);
  };

  const nextPhoto = (len: number, e: MouseEvent) => {
    e.stopPropagation();
    setActivePhotoIndex(prev => (prev + 1) % len);
  };

  const prevPhoto = (len: number, e: MouseEvent) => {
    e.stopPropagation();
    setActivePhotoIndex(prev => (prev - 1 + len) % len);
  };

  const handleCreateReview = (carId: string, comment: string, rating: number) => {
    const freshReview: Review = {
      id: `rev_${Date.now()}`,
      carId,
      userName: currentUser.name || 'Anonymous User',
      userAvatar: currentUser.avatar || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?q=80&w=120',
      rating,
      comment,
      date: new Date().toISOString().split('T')[0]
    };
    if (activeCar && !activeCar.isAd) {
      activeCar.reviews.unshift(freshReview);
    }
  };

  const brands = Array.from(new Set(cars.map(c => c.brand)));

  // Retrieve matching profile data for seller window modal
  const getSellerProfileData = (sellerId: string) => {
    if (sellerId === currentUser.id) {
      return {
        name: currentUser.name,
        avatar: currentUser.avatar,
        email: currentUser.email,
        role: currentUser.role,
        isVeloceGT: currentUser.subscriptionTier === 'veloce_gt',
        isDealerPaid: currentUser.subscriptionTier === 'dealer_paid'
      };
    }

    // Lookup across existing vehicles database
    const match = cars.find(c => c.dealerId === sellerId);
    if (match) {
      return {
        name: match.dealerName,
        avatar: match.dealerAvatar,
        email: `${match.dealerName.toLowerCase().replace(/\s+/g, '')}@veloce-partner.io`,
        role: sellerId.startsWith('dealer_') ? 'dealer' : 'user',
        isVeloceGT: true, // Partner seed sellers act as premium accounts
        isDealerPaid: sellerId.startsWith('dealer_')
      };
    }

    return {
      name: 'Veloce Partner',
      avatar: 'https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?q=80&w=120',
      email: 'support@veloce-partner.io',
      role: 'dealer',
      isVeloceGT: true,
      isDealerPaid: true
    };
  };

  const isFollowingSeller = (sellerId: string) => {
    return (currentUser.followingUserIds || []).includes(sellerId);
  };

  return (
    <div id="swiper_panel" className="w-full h-full flex-1 flex flex-col min-h-0 overflow-hidden relative">
      
      {/* Dynamic Activity/Alerts Display Banner - Disabled to prevent random notifications */}

      {/* Exquisite Top Trigger Button - Positioned in the topmost right corner overlay */}
      <div className="absolute top-2 right-2 sm:right-4 z-40">
        <button
          id="reveal_filters_btn"
          onClick={() => setShowFilters(!showFilters)}
          className={`group flex items-center gap-1.5 px-3.5 py-1.5 rounded-full border text-[10px] sm:text-xs font-mono tracking-wider uppercase transition-all duration-300 ${
            showFilters
              ? 'bg-stone-100 text-stone-950 border-white font-medium shadow'
              : theme === 'light'
                ? 'bg-white text-stone-800 border-stone-200 hover:bg-stone-50 shadow-sm'
                : 'bg-stone-950/90 text-stone-300 border-stone-850 hover:text-stone-100 hover:border-stone-700 backdrop-blur-md shadow-lg shadow-black/45'
          }`}
        >
          <Filter className={`w-3.5 h-3.5 transition-transform duration-300 ${showFilters ? 'rotate-180 text-stone-950' : 'text-amber-500 group-hover:scale-110'}`} />
          <span>{showFilters ? 'Hide Filters' : 'Filters'}</span>
          {(searchTerm || selectedType !== 'all' || selectedBrand !== null || selectedModel !== 'all' || selectedCategory !== 'all' || selectedDrivetrain !== 'all' || selectedDisplacement !== 'all' || maxDistance < 30) && (
            <span className="w-1.5 h-1.5 rounded-full bg-amber-500 ml-1 animate-pulse" />
          )}
        </button>
      </div>

      {/* Hidden Fold-Down Preferences Panel */}
      <AnimatePresence>
        {showFilters && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: -10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: -10 }}
            className={`absolute top-12 left-0 right-0 z-50 max-h-[75vh] overflow-y-auto overflow-x-hidden p-5 rounded-3xl border backdrop-blur-xl scrollbar-thin ${
              theme === 'light'
                ? 'bg-white/95 border-stone-200 text-stone-950 shadow-md'
                : 'bg-stone-950/95 border-stone-800/80 text-stone-100 shadow-[0_20px_50px_rgba(0,0,0,0.9)]'
            }`}
          >
            {/* Header with clear minimize buttons */}
            <div className={`flex items-center justify-between pb-3.5 mb-4 border-b ${
              theme === 'light' ? 'border-stone-100' : 'border-stone-850'
            }`}>
              <h4 className={`text-xs font-mono uppercase tracking-wider font-extrabold ${
                theme === 'light' ? 'text-stone-500' : 'text-stone-400'
              }`}>
                Filter Settings
              </h4>
              <button
                type="button"
                onClick={() => setShowFilters(false)}
                className={`flex items-center gap-1.5 px-3 py-1.5 text-[10px] font-mono uppercase border rounded-xl transition-all cursor-pointer ${
                  theme === 'light'
                    ? 'bg-stone-50 hover:bg-stone-100 text-stone-650 border-stone-200'
                    : 'bg-stone-900/60 hover:bg-stone-850 text-stone-400 hover:text-white border-stone-800'
                }`}
                title="Minimize Filters"
              >
                <X className="w-3.5 h-3.5 text-amber-500" />
                <span>Minimize</span>
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-5 items-start">
              
              {/* Category, Core Text Query & Transaction segmented tabs */}
              <div className="space-y-4">
                <div id="filter_category" className="space-y-1.5">
                  <label className={`text-[9.5px] uppercase tracking-widest font-extrabold font-mono block ${
                    theme === 'light' ? 'text-stone-600' : 'text-stone-400'
                  }`}>
                    Section / Type Selection
                  </label>
                  <div className={`grid grid-cols-3 p-1 rounded-xl border font-mono ${
                    theme === 'light' ? 'bg-stone-100 border-stone-200' : 'bg-stone-900/60 border-stone-800'
                  }`}>
                    {(['all', 'car', 'motorcycle'] as const).map(catOpts => (
                      <button
                        key={catOpts}
                        type="button"
                        onClick={() => { setSelectedCategory(catOpts); setCurrentIndex(0); }}
                        className={`py-1 text-[9px] uppercase font-mono tracking-wider rounded-lg transition-all ${
                          selectedCategory === catOpts
                            ? 'bg-amber-500 text-stone-950 font-extrabold shadow-md'
                            : theme === 'light'
                              ? 'text-stone-600 hover:text-stone-950 hover:bg-stone-250/55'
                              : 'text-stone-400 hover:text-stone-200 hover:bg-stone-800/50'
                        }`}
                      >
                        {catOpts === 'all' ? 'All Vehicles' : catOpts === 'car' ? 'Cars' : 'Motorcycles'}
                      </button>
                    ))}
                  </div>
                </div>

                <div id="filter_search" className="relative">
                  <span className={`text-[9.5px] uppercase tracking-widest font-extrabold font-mono block mb-1.5 ${
                    theme === 'light' ? 'text-stone-600' : 'text-stone-400'
                  }`}>
                    Search Keyword
                  </span>
                  <div className="relative">
                    <input
                      id="filter_search_input"
                      type="text"
                      placeholder={t.searchPlaceholder}
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className={`w-full text-xs py-2.5 pl-9 pr-4 rounded-xl border focus:outline-none focus:border-amber-500 font-sans transition-all ${
                        theme === 'light'
                          ? 'bg-stone-100 border-stone-200 text-stone-950 placeholder:text-stone-400'
                          : 'bg-stone-900 border-stone-800 text-stone-200 placeholder:text-stone-500'
                      }`}
                    />
                    <Search className={`absolute left-3 top-3 w-3.5 h-3.5 ${theme === 'light' ? 'text-stone-450' : 'text-stone-600'}`} />
                  </div>
                </div>

                <div id="filter_type" className="space-y-1.5">
                  <label className={`text-[9.5px] uppercase tracking-widest font-extrabold font-mono block ${
                    theme === 'light' ? 'text-stone-600' : 'text-stone-400'
                  }`}>
                    Rent or Buy
                  </label>
                  <div className={`grid grid-cols-3 p-1 rounded-xl border font-mono ${
                    theme === 'light' ? 'bg-stone-100 border-stone-200' : 'bg-stone-900/60 border-stone-800'
                  }`}>
                    {(['all', 'rent', 'buy'] as const).map(type => (
                      <button
                        key={type}
                        id={`filter_type_${type}`}
                        type="button"
                        onClick={() => { setSelectedType(type); setCurrentIndex(0); }}
                        className={`py-1 text-[9px] uppercase font-mono tracking-wider rounded-lg transition-all ${
                          selectedType === type
                            ? 'bg-amber-500 text-stone-950 font-extrabold shadow-md'
                            : theme === 'light'
                              ? 'text-stone-600 hover:text-stone-950 hover:bg-stone-250/55'
                              : 'text-stone-400 hover:text-stone-200 hover:bg-stone-800/50'
                        }`}
                      >
                        {type === 'all' ? 'All' : type === 'rent' ? 'For Rent' : 'For Sale'}
                      </button>
                    ))}
                  </div>
                </div>

                <div id="filter_drivetrain" className="space-y-1.5">
                  <label className={`text-[9.5px] uppercase tracking-widest font-extrabold font-mono block ${
                    theme === 'light' ? 'text-stone-600' : 'text-stone-400'
                  }`}>
                    Drivetrain
                  </label>
                  <div className={`grid grid-cols-4 p-1 rounded-xl border font-mono ${
                    theme === 'light' ? 'bg-stone-100 border-stone-200' : 'bg-stone-900/60 border-stone-800'
                  }`}>
                    {(['all', 'AWD', 'RWD', 'FWD'] as const).map(dt => (
                      <button
                        key={dt}
                        type="button"
                        onClick={() => { setSelectedDrivetrain(dt); setCurrentIndex(0); }}
                        className={`py-1 text-[9px] font-mono tracking-wider rounded-lg transition-all ${
                          selectedDrivetrain === dt
                            ? 'bg-amber-500 text-stone-950 font-bold'
                            : 'text-stone-400 hover:text-stone-200'
                        }`}
                      >
                        {dt}
                      </button>
                    ))}
                  </div>
                </div>

                <div id="filter_displacement" className="space-y-1.5">
                  <label className={`text-[9.5px] uppercase tracking-widest font-extrabold font-mono block ${
                    theme === 'light' ? 'text-stone-600' : 'text-stone-400'
                  }`}>
                    Engine Displacement
                  </label>
                  <select
                    value={selectedDisplacement}
                    onChange={(e) => { setSelectedDisplacement(e.target.value); setCurrentIndex(0); }}
                    className="w-full text-xs py-2 px-3 rounded-xl border bg-stone-900 border-stone-800 text-stone-350 focus:outline-none focus:border-amber-500 cursor-pointer"
                  >
                    <option value="all">Any Displacement</option>
                    <option value="1.">1.0L - 2.0L range</option>
                    <option value="2.">2.1L - 3.0L range</option>
                    <option value="3.">3.1L - 4.0L range</option>
                    <option value="4.">4.1L - 5.0L range</option>
                    <option value="V8">V8 Engines</option>
                    <option value="V10">V10 / V12 Engines</option>
                    <option value="Electric">Electric / EV motors</option>
                    <option value="Hybrid">Hybrid Powertrains</option>
                  </select>
                </div>

                <div id="filter_feed_tier" className="space-y-1.5">
                  <span className={`text-[9.5px] uppercase tracking-widest font-extrabold font-mono block ${
                    theme === 'light' ? 'text-stone-600' : 'text-stone-400'
                  }`}>
                    Catalog Class
                  </span>
                  <div className={`grid grid-cols-3 p-1 rounded-xl border font-mono ${
                    theme === 'light' ? 'bg-stone-100 border-stone-200' : 'bg-stone-900/60 border-stone-800'
                  }`}>
                    {(['mixed', 'luxury', 'normal'] as const).map(feedOpt => {
                      let label = 'Mixed';
                      if (feedOpt === 'luxury') label = 'Luxury Only';
                      if (feedOpt === 'normal') label = 'Standard';
                      const isActive = feedType === feedOpt;
                      return (
                        <button
                          key={feedOpt}
                          id={`filter_feed_tier_${feedOpt}`}
                          type="button"
                          onClick={() => { setFeedType(feedOpt); setCurrentIndex(0); }}
                          className={`py-1 text-[9px] uppercase font-mono tracking-wider rounded-lg transition-all ${
                            isActive
                              ? 'bg-amber-500 text-stone-950 font-extrabold shadow-md'
                              : theme === 'light'
                                ? 'text-stone-600 hover:text-stone-950 hover:bg-stone-250/55'
                                : 'text-stone-400 hover:text-stone-200 hover:bg-stone-800/50'
                          }`}
                        >
                          {label}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* Range miles/km & Brands quick select grid */}
              <div className="space-y-4">
                <div id="filter_range" className={`p-4 border rounded-xl space-y-2.5 ${
                  theme === 'light' ? 'bg-stone-50 border-stone-200' : 'bg-stone-900/40 border-stone-850'
                }`}>
                  <div className="flex items-center justify-between text-[10px] uppercase font-mono font-extrabold">
                    <span className="flex items-center gap-1">
                      <Compass className="w-3.5 h-3.5 text-amber-500 animate-spin-slow" />
                      <span className={theme === 'light' ? 'text-stone-700' : 'text-stone-300'}>Search Distance</span>
                    </span>
                    <span className="text-amber-500 text-xs font-bold font-mono">
                      {unit === 'mi' ? `${maxDistance} Miles` : `${Math.round(maxDistance * 1.6)} km`}
                    </span>
                  </div>
                  <div className="relative pt-1">
                    <input
                      id="distance_slider"
                      type="range"
                      min={1}
                      max={30}
                      value={maxDistance}
                      onChange={(e) => { setMaxDistance(Number(e.target.value)); setCurrentIndex(0); }}
                      className="w-full h-1.5 rounded-lg appearance-none cursor-pointer focus:outline-none accent-amber-500 bg-stone-800"
                      style={{
                        background: `linear-gradient(to right, #f59e0b 0%, #f59e0b ${(maxDistance / 30) * 100}%, #1c1917 ${(maxDistance / 30) * 105}%, #1c1917 100%)`
                      }}
                    />
                  </div>
                </div>

                <div id="filter_brand" className="space-y-1.5">
                  <label className={`text-[9.5px] uppercase tracking-widest font-extrabold font-mono block ${
                    theme === 'light' ? 'text-stone-600' : 'text-stone-400'
                  }`}>
                    Filter by Brand
                  </label>
                  <div className="flex flex-wrap gap-1.5 max-h-32 overflow-y-auto border border-stone-900 bg-stone-950 p-2.5 rounded-xl pr-1">
                    <button
                      id="filter_brand_all"
                      type="button"
                      onClick={() => { setSelectedBrand(null); setSelectedModel('all'); setCurrentIndex(0); }}
                      className={`px-2.5 py-1 rounded-full text-[9px] font-mono transition-all ${
                        selectedBrand === null
                          ? 'bg-amber-500 text-stone-950 font-bold shadow-md'
                          : theme === 'light'
                            ? 'bg-stone-100 border border-stone-200 text-stone-650 hover:bg-stone-200'
                            : 'bg-stone-900 border border-stone-850 text-stone-400 hover:bg-stone-800'
                      }`}
                    >
                      All Brands
                    </button>
                    {brands.map(b => (
                      <button
                        key={b}
                        id={`filter_brand_${b}`}
                        type="button"
                        onClick={() => { setSelectedBrand(b); setSelectedModel('all'); setCurrentIndex(0); }}
                        className={`px-2.5 py-1 rounded-full text-[9px] font-mono transition-all ${
                          selectedBrand === b
                            ? 'bg-amber-500 text-stone-950 font-bold shadow-md'
                            : theme === 'light'
                              ? 'bg-stone-100 border border-stone-200 text-stone-655 hover:bg-stone-200'
                              : 'bg-stone-900 border border-stone-850 text-stone-400 hover:bg-stone-800'
                        }`}
                      >
                        {b}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Cascading dynamic models dropdown */}
                <div id="filter_models_cascading" className="space-y-1.5">
                  <label className={`text-[9.5px] uppercase tracking-widest font-extrabold font-mono block ${
                    theme === 'light' ? 'text-stone-600' : 'text-stone-400'
                  }`}>
                    Filter by Model ({selectedBrand ? selectedBrand : 'All Brands'})
                  </label>
                  <select
                    id="cascading_model_selector"
                    value={selectedModel}
                    onChange={(e) => { setSelectedModel(e.target.value); setCurrentIndex(0); }}
                    className={`w-full text-xs py-2 px-3 rounded-xl border focus:outline-none focus:border-amber-500 cursor-pointer ${
                      theme === 'light'
                        ? 'bg-stone-50 border-stone-200 text-stone-800 font-medium'
                        : 'bg-stone-900 border-stone-850 text-stone-300'
                    }`}
                  >
                    <option value="all">All Models</option>
                    {selectedBrand ? (
                      // Only show actual unique models of the selected brand from COMMON_BRANDS_MODELS
                      (COMMON_BRANDS_MODELS[selectedBrand] || [])
                        .sort()
                        .map(mil => (
                          <option key={mil} value={mil}>{mil}</option>
                        ))
                    ) : (
                      // If no brand selected, list actual models with manufacturer prefixes from COMMON_BRANDS_MODELS
                      Object.keys(COMMON_BRANDS_MODELS)
                        .flatMap(brand => (COMMON_BRANDS_MODELS[brand] || []).map(model => ({ brand, model })))
                        .sort((a, b) => `${a.brand} - ${a.model}`.localeCompare(`${b.brand} - ${b.model}`))
                        .map(item => (
                          <option key={`${item.brand}-${item.model}`} value={item.model}>
                            {item.brand} - {item.model}
                          </option>
                        ))
                    )}
                  </select>
                </div>
              </div>

            </div>

            {/* Subtle bottom reset */}
            <div className={`mt-4 pt-4 border-t flex justify-between items-center text-[8px] font-mono ${
              theme === 'light' ? 'border-stone-200 text-stone-500' : 'border-stone-900 text-stone-500'
            }`}>
              <span className="inline-flex items-center gap-1.5">
                <Zap className="w-3 h-3 text-[#006B4F]" />
                {t.offlineNotice}
              </span>
              <div className="flex items-center gap-4">
                <button
                  type="button"
                  id="reset_filters_label_btn"
                  onClick={() => {
                    setSearchTerm('');
                    setSelectedType('all');
                    setMaxDistance(30);
                    setSelectedBrand(null);
                    setSelectedModel('all');
                    setSelectedCategory('all');
                    setSelectedDrivetrain('all');
                    setSelectedDisplacement('all');
                    setFeedType('mixed');
                    setCurrentIndex(0);
                  }}
                  className="text-amber-550 hover:text-amber-605 hover:underline uppercase tracking-widest font-extrabold cursor-pointer"
                >
                  Reset Filters
                </button>
                <button
                  type="button"
                  onClick={() => setShowFilters(false)}
                  className={`px-3 py-1.5 uppercase font-bold tracking-wider rounded-xl border text-[9px] cursor-pointer transition-all ${
                    theme === 'light'
                      ? 'bg-stone-100 hover:bg-stone-200 text-stone-850 border-stone-305'
                      : 'bg-stone-900 hover:bg-stone-850 text-stone-300 border-stone-800'
                  }`}
                >
                  Apply & Close
                </button>
              </div>
            </div>

          </motion.div>
        )}
      </AnimatePresence>

      {/* Floating Match Promo Alerts overlay removed */}

      {/* Primary Swiper Stage - Full screen viewport height */}
      <div id="swiper_stage" className="flex-1 flex flex-col justify-center items-center h-full w-full relative">
        
        {feedItems.length === 0 ? (
          <div id="empty_search_state" className="flex flex-col items-center justify-center bg-stone-950/40 border border-stone-800 min-h-[450px] rounded-3xl p-10 text-center">
            <Compass className="w-12 h-12 text-stone-600 mb-4 animate-spin" />
            <h2 className="text-md text-stone-200 font-sans font-light tracking-wide font-medium">
              No matching postings in {feedType === 'mixed' ? 'Mixed' : feedType === 'luxury' ? 'Luxury Only' : 'Standard Only'} catalog
            </h2>
            <p className="text-stone-500 text-xs mt-2 max-w-xs leading-relaxed font-sans">
              Try changing your search terms or expand your Search Distance.
            </p>
            <button
              id="clear_filters_btn"
              onClick={() => {
                setSearchTerm('');
                setSelectedType('all');
                setMaxDistance(30);
                setSelectedBrand(null);
                setFeedType('mixed');
                setCurrentIndex(0);
              }}
              className="mt-6 text-xs text-stone-950 bg-stone-100 hover:bg-white px-5 py-2.5 rounded-full uppercase tracking-wider font-mono font-medium"
            >
              Reset Filters
            </button>
          </div>
        ) : !activeCar ? (
          <div id="end_catalog_state" className="flex flex-col items-center justify-center bg-stone-950/40 border border-stone-800 min-h-[450px] rounded-3xl p-10 text-center">
            <Award className="w-12 h-12 text-yellow-600 mb-4 animate-bounce" />
            <h2 className="text-md text-stone-100 font-sans font-light tracking-wide uppercase">
              No more cars left!
            </h2>
            <p className="text-stone-400 text-xs mt-2 max-w-sm leading-relaxed">
              You has swiped through all available postings. Reset your filters to browse index again or list your own vehicle in profile.
            </p>
            <button
              id="restart_swiper_btn"
              onClick={() => setCurrentIndex(0)}
              className="mt-6 text-xs text-stone-950 bg-stone-100 hover:bg-white px-6 py-2 rounded-full uppercase tracking-wider font-mono font-medium"
            >
              Browse Again
            </button>
          </div>
        ) : (
          /* Tinder styled card framework */
          <div className="relative flex flex-col items-center w-full h-full justify-center md:py-4 lg:py-6">
            
            {/* Swiper feedback stamp overlays */}
            <AnimatePresence>
              {swipeTriggerEffect && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.8, rotate: swipeTriggerEffect === 'right' ? 12 : -12 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0 }}
                  className={`absolute top-20 z-30 uppercase font-mono tracking-widest font-extrabold text-2xl border-4 px-6 py-2.5 rounded-2xl ${
                    swipeTriggerEffect === 'right'
                      ? 'border-emerald-500 text-emerald-400 bg-stone-950/95 -rotate-12 left-10'
                      : 'border-rose-500 text-rose-400 bg-stone-950/95 rotate-12 right-10'
                  }`}
                >
                  {swipeTriggerEffect === 'right' ? 'LIKE!' : 'PASS'}
                </motion.div>
              )}
            </AnimatePresence>

            {/* Dynamic Swiper Card content block - Immersive Full viewport representation */}
            <motion.div
              key={activeCar.id}
              id={`car_card_${activeCar.id}`}
              className={`w-full h-full md:h-[82vh] md:max-h-[72vh] lg:max-h-[76vh] md:max-w-2xl bg-[#050507] md:bg-[#0d0d0f] border-0 md:border rounded-none md:rounded-3xl overflow-hidden md:shadow-2xl relative cursor-grab active:cursor-grabbing touch-none select-none flex flex-col ${
                activeCar.isAd ? 'border-amber-500/40 shadow-[0_0_15px_rgba(245,158,11,0.1)]' : 'border-stone-800/80'
              }`}
              layout
              drag={true}
              dragConstraints={{ left: 0, right: 0, top: 0, bottom: 0 }}
              dragElastic={{ left: 0.6, right: 0.6, top: 0.6, bottom: 0.15 }}
              style={{ x, rotate, opacity }}
              onDrag={(event, info) => {
                const dragOffsetX = info.offset.x;
                if (dragOffsetX > 80) {
                  setSwipeTriggerEffect('right');
                } else if (dragOffsetX < -80) {
                  setSwipeTriggerEffect('left');
                } else {
                  setSwipeTriggerEffect(null);
                }
              }}
              onDragEnd={(event, info) => {
                const dragOffsetX = info.offset.x;
                const dragOffsetY = info.offset.y;
                const swipeThreshold = 130;
                
                // If the user swiped up (y is negative) we reveal specification specs panel
                if (dragOffsetY < -100 && !activeCar.isAd) {
                  setExpandDetails(true);
                  setSwipeTriggerEffect(null);
                  return;
                }

                if (dragOffsetX > swipeThreshold) {
                  handleSwipe('right');
                } else if (dragOffsetX < -swipeThreshold) {
                  handleSwipe('left');
                } else {
                  setSwipeTriggerEffect(null);
                }
              }}
            >
              {/* Featured photo backdrop Carousel - Height stretched to top of page */}
              <div 
                onClick={() => setShowFullscreenGallery(true)}
                className="relative w-full h-[52vh] sm:h-[58vh] md:h-[400px] overflow-hidden group cursor-zoom-in active:scale-[0.99] transition-transform duration-200 shrink-0"
                title="Tap image to view fullscreen gallery"
              >
                <img
                  referrerPolicy="no-referrer"
                  src={activeCar.images[activePhotoIndex] || PHOTO_PLACEHOLDERS[0]}
                  alt={activeCar.model}
                  className="w-full h-full object-cover select-none transition-transform duration-700 ease-out group-hover:scale-105"
                />

                {/* Highly intuitive small edge parts for navigation between photos (15% width each) */}
                {activeCar.images.length > 1 && (
                  <>
                    <button
                      type="button"
                      id="carousel_prev_overlay_btn"
                      onClick={(e) => {
                        e.stopPropagation();
                        prevPhoto(activeCar.images.length, e);
                      }}
                      className="absolute left-0 top-0 w-[15%] h-full z-25 cursor-w-resize flex items-center justify-start pl-3 pointer-events-auto group/prev"
                      title="Previous Photo"
                    >
                      <div className="p-1.5 rounded-full bg-stone-950/50 text-stone-300 border border-stone-800 opacity-0 group-hover:opacity-100 transition-opacity duration-200 shadow-lg hover:bg-stone-900">
                        <ChevronRight className="w-3.5 h-3.5 rotate-180" />
                      </div>
                    </button>
                    <button
                      type="button"
                      id="carousel_next_overlay_btn"
                      onClick={(e) => {
                        e.stopPropagation();
                        nextPhoto(activeCar.images.length, e);
                      }}
                      className="absolute right-0 top-0 w-[15%] h-full z-25 cursor-e-resize flex items-center justify-end pr-3 pointer-events-auto group/next"
                      title="Next Photo"
                    >
                      <div className="p-1.5 rounded-full bg-stone-950/50 text-stone-300 border border-stone-800 opacity-0 group-hover:opacity-100 transition-opacity duration-200 shadow-lg hover:bg-stone-900">
                        <ChevronRight className="w-3.5 h-3.5" />
                      </div>
                    </button>
                  </>
                )}

                 {/* Overlay floating zoom button to trigger high-end full screen gallery */}




                {/* Left/Right Photo Gradients & HUD shadows */}
                <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-stone-950 via-stone-950/20 to-transparent h-40 pointer-events-none" />

                {/* Sponsored badge outline */}
                {activeCar.isAd && (
                  <div className="absolute top-4 left-4 z-10 bg-amber-500 text-stone-950 text-[10px] uppercase font-mono px-3 py-1 rounded-full font-bold shadow-lg flex items-center gap-1.5 border border-amber-600">
                    <Sparkles className="w-3.5 h-3.5 text-stone-920 fill-stone-920" />
                    <span>SPONSORED PROMO</span>
                  </div>
                )}

                {/* Photo indices dots */}
                {activeCar.images.length > 1 && (
                  <div className="absolute top-4 inset-x-0 flex justify-center gap-1.5 px-6 z-10 pointer-events-none">
                    {activeCar.images.map((_img: string, i: number) => (
                      <span
                        key={i}
                        className={`block h-1 rounded-full transition-all ${
                          activePhotoIndex === i ? 'w-8 bg-stone-100' : 'w-2 bg-stone-600/65'
                        }`}
                      />
                    ))}
                  </div>
                )}
              </div>

              {/* Black Gradients covering context - Fades out completely in Expanded specs sheet */}
                {!expandDetails && (
                  <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-stone-950 via-stone-950/60 to-transparent h-[400px] z-10 pointer-events-none transition-opacity duration-300" />
                )}

                {/* Sponsored badge outline */}
                {activeCar.isAd && (
                  <div className="absolute top-12 left-4 z-20 bg-amber-500 text-stone-950 text-[10.5px] uppercase font-mono px-3.5 py-1.5 rounded-full font-extrabold shadow-lg flex items-center gap-1.5 border border-amber-600">
                    <Sparkles className="w-3.5 h-3.5 text-stone-950 fill-stone-950" />
                    <span>Sponsor Promo</span>
                  </div>
                )}

                {/* Tinder-style floating Bio Container overlay */}
                {!expandDetails && (
                  <div className="absolute inset-x-3 bottom-20 md:bottom-24 z-20 text-left pointer-events-none select-none">
                    <div 
                      onClick={(e) => { e.stopPropagation(); setExpandDetails(true); }}
                      className="pointer-events-auto bg-stone-950/95 backdrop-blur-md border-[1.5px] border-stone-700/80 rounded-2xl p-2.5 sm:p-3 space-y-1.5 h-auto shadow-2xl shadow-black/90 transition-all duration-300 relative cursor-pointer hover:border-amber-500 hover:ring-1 hover:ring-amber-500/20"
                    >
                      <div className="flex items-start justify-between gap-1">
                        <div>
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className="text-[9px] font-mono tracking-widest bg-stone-900 border border-stone-800 text-amber-550 py-0.5 px-1.5 rounded uppercase font-bold flex items-center gap-1 text-amber-500">
                              <Calendar className="w-2.5 h-2.5 text-amber-550" />
                              {activeCar.year}
                            </span>
                            {!activeCar.isAd && (
                              <>
                                <span className="text-[9px] font-mono tracking-widest bg-stone-900 border border-stone-800 text-amber-550 py-0.5 px-1.5 rounded uppercase font-bold flex items-center gap-1 text-amber-500">
                                  <MapPin className="w-2.5 h-2.5 text-amber-550" />
                                  {unit === 'mi' ? `${activeCar.distance} mi` : `${Math.round(activeCar.distance * 1.6)} km`}
                                </span>
                                <span className={`text-[9px] font-mono tracking-widest py-0.5 px-1.5 rounded uppercase font-extrabold text-white ${
                                  activeCar.type === 'rent' ? 'bg-[#059669]' : 'bg-[#d97706]'
                                }`}>
                                  {activeCar.type === 'rent' ? 'Rent' : 'Buy'}
                                </span>
                              </>
                            )}
                          </div>
                          <h2 className="text-base font-bold text-white mt-0.5 uppercase tracking-tight">
                            {activeCar.brand} <span className="font-light text-stone-300">{activeCar.model}</span>
                          </h2>
                        </div>

                        {!activeCar.isAd && (
                          <div className="text-right shrink-0">
                            <span className="text-[8px] font-mono text-stone-550 uppercase tracking-widest block font-bold">Price</span>
                            <span className="text-base font-mono text-amber-500 font-extrabold block">
                              ${activeCar.price.toLocaleString()}
                              <span className="text-[9px] text-stone-400 font-light">
                                {(activeCar.type === 'rent' || activeCar.type === 'both') ? '/d' : ''}
                              </span>
                            </span>
                          </div>
                        )}
                      </div>

                      {/* Clickable Description - Tucked in to prevent covering image on mobile */}
                      <p className="text-[11px] text-stone-350 leading-relaxed font-sans line-clamp-1 sm:line-clamp-2">
                        {activeCar.description}
                      </p>

                      <div className="flex flex-wrap gap-1 items-center justify-between">
                        <div className="flex flex-wrap gap-1">
                          {(activeCar.features || []).slice(0, 2).map((f: string, i: number) => (
                            <span key={i} className="text-[8px] font-mono text-stone-400 bg-stone-900/95 border border-stone-850 px-2.5 py-0.5 rounded-md uppercase font-bold">
                              {f}
                            </span>
                          ))}
                          {(activeCar.features || []).length > 2 && (
                            <span className="text-[8px] font-mono text-stone-550 px-2 py-0.5 bg-stone-900/60 rounded-md font-bold text-stone-400">
                              +{(activeCar.features || []).length - 2} Specs
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Dynamic slide-up Specifications Spec Drawer overlaying 75% of card */}
                <AnimatePresence>
                  {expandDetails && !activeCar.isAd && (
                    <motion.div
                      initial={{ y: '100%' }}
                      animate={{ y: 0 }}
                      exit={{ y: '100%' }}
                      transition={{ type: 'spring', damping: 26, stiffness: 210 }}
                      className="absolute inset-x-0 bottom-0 h-[75%] bg-[#08080a]/98 backdrop-blur-xl border-t border-stone-850 rounded-t-3xl z-40 flex flex-col overflow-hidden pointer-events-auto shadow-2xl"
                    >
                      {/* Drawer head header line */}
                      <div className="p-4 bg-[#0a0a0c]/90 border-b border-stone-900 flex items-center justify-between shrink-0">
                        <div className="flex items-center gap-2">
                          <span className="text-[9.5px] font-mono tracking-widest bg-amber-500 text-stone-950 py-0.5 px-2 rounded-md uppercase font-extrabold">
                            Specifications
                          </span>
                          <span className="text-xs font-semibold text-stone-300">
                            {activeCar.brand} {activeCar.model}
                          </span>
                        </div>
                        <button
                          type="button"
                          onClick={(e) => { e.stopPropagation(); setExpandDetails(false); }}
                          className="text-stone-400 hover:text-white p-2 text-lg hover:scale-110 transition-all cursor-pointer font-bold"
                          title="Close panel"
                        >
                          ✕
                        </button>
                      </div>

                      {/* Drawer scroll container */}
                      <div className="flex-1 overflow-y-auto p-5 space-y-6 scrollbar-thin text-left select-text">
                        
                        {/* Interactive Seller profile link */}
                        <div 
                          onClick={(e) => { 
                            e.stopPropagation(); 
                            setSelectedSellerId(activeCar.dealerId); 
                          }}
                          className="flex flex-col gap-3 p-3.5 bg-stone-950/80 rounded-2xl border border-stone-900 cursor-pointer hover:border-amber-500/30 transition-all pointer-events-auto"
                        >
                          {/* Row 1: Seller avatar and name */}
                          <div className="flex items-center gap-3">
                            <img 
                              referrerPolicy="no-referrer"
                              src={activeCar.dealerAvatar} 
                              alt={activeCar.dealerName}
                              className="w-10 h-10 rounded-full object-cover border-2 border-[#ff2800] ring-2 ring-[#ff2800]/45"
                            />
                            <div>
                              <span className="text-[8px] font-mono text-stone-500 uppercase tracking-wider block">Seller Profile</span>
                              <span className="text-xs font-semibold text-stone-100">{activeCar.dealerName}</span>
                            </div>
                          </div>
                          
                          {/* Row 2: Chat & Fleet Action buttons */}
                          <div className="flex items-center gap-2 pt-2 border-t border-stone-900">
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                onOpenChat(activeCar);
                              }}
                              className="flex-1 py-1.5 px-3 bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/30 text-amber-500 rounded-lg text-[9.5px] font-mono uppercase font-bold flex items-center justify-center gap-1 transition-colors cursor-pointer"
                              title="Chat with Seller"
                            >
                              <MessageCircle className="w-3.5 h-3.5" />
                              <span>Chat</span>
                            </button>

                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                setSelectedSellerId(activeCar.dealerId);
                              }}
                              className="flex-1 py-1.5 px-2 bg-stone-900 hover:bg-stone-850 hover:text-stone-100 border border-stone-800 text-stone-400 rounded-lg text-[9.5px] font-mono uppercase font-bold flex items-center justify-center gap-0.5 transition-colors cursor-pointer"
                            >
                              <span>Fleet</span>
                              <ChevronRight className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>

                        {/* Technical specifications grid */}
                        <div className="grid grid-cols-2 gap-3">
                          {activeCar.type === 'buy' && activeCar.mileage !== undefined && (
                            <div className="p-3 bg-stone-900/40 rounded-xl border border-stone-850 text-left col-span-2 flex items-center justify-between">
                              <div>
                                <span className="text-[8.5px] font-mono uppercase text-[#BFA46F] font-bold block mb-0.5">Odometer Reading</span>
                                <span className="text-xs font-mono font-bold text-stone-100">{activeCar.mileage.toLocaleString()} miles</span>
                              </div>
                              <span className="text-[8px] font-mono uppercase bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 py-0.5 px-1.5 rounded">
                                Car For Sale
                              </span>
                            </div>
                          )}
                          <div className="p-3 bg-stone-900/40 rounded-xl border border-stone-850 text-left">
                            <span className="text-[8.5px] font-mono uppercase text-stone-500 block mb-0.5 font-bold">Acceleration</span>
                            <span className="text-xs font-mono font-bold text-stone-100">{activeCar.acceleration}</span>
                          </div>
                          <div className="p-3 bg-stone-900/40 rounded-xl border border-stone-850 text-left">
                            <span className="text-[8.5px] font-mono uppercase text-stone-500 block mb-0.5 font-bold">Power output</span>
                            <span className="text-xs font-mono font-bold text-stone-100">{activeCar.power} HP</span>
                          </div>
                          <div className="p-3 bg-stone-900/40 rounded-xl border border-stone-850 text-left">
                            <span className="text-[8.5px] font-mono uppercase text-stone-500 block mb-0.5 font-bold">Maximum velocity</span>
                            <span className="text-xs font-mono font-bold text-stone-100">
                              {unit === 'mi' ? `${Math.round(activeCar.topSpeed * 0.621)} mph` : `${activeCar.topSpeed} km/h`}
                            </span>
                          </div>
                          <div className="p-3 bg-stone-900/40 rounded-xl border border-stone-850 text-left">
                            <span className="text-[8.5px] font-mono uppercase text-stone-500 block mb-0.5 font-bold">Engine Specs</span>
                            <span className="text-xs font-mono font-bold text-[#BFA46F] truncate block">
                              {(() => {
                                const eng = activeCar.engine || '';
                                const match = eng.match(/^(\d+(?:\.\d+)?\s*(?:L|cc|kW))/i);
                                if (match) return match[1].toUpperCase();
                                if (eng.toLowerCase().includes('electric') || eng.toLowerCase().includes('motor') || eng.toLowerCase().includes('ev')) {
                                  return 'Electric';
                                }
                                return eng.split(' ')[0] || eng;
                              })()}
                            </span>
                          </div>
                        </div>

                        {/* Insurance Information Block */}
                        <div className="p-4 bg-[#0a0a0c]/85 border border-[#161619] rounded-2xl flex items-start gap-3">
                          <Shield className="w-5 h-5 text-emerald-500 shrink-0 mt-0.5" />
                          <div>
                            <span className="text-[9.5px] font-mono uppercase text-stone-300 font-extrabold block">All Liabilities Covered</span>
                            <p className="text-[11px] text-stone-400 mt-1 leading-relaxed">
                              Full roadside, property, and physical damage insurance included with a standardized $2,500 maximum deductible. Zero-stress track hour liability plans are optional during booking reservation.
                            </p>
                          </div>
                        </div>

                        {/* Chat with Seller inline trigger */}
                        <button
                          type="button"
                          onClick={() => onOpenChat(activeCar)}
                          className="w-full py-2.5 bg-stone-900 hover:bg-stone-850 border border-stone-800 text-stone-100 text-xs font-mono uppercase rounded-xl tracking-wider transition-all cursor-pointer flex items-center justify-center gap-2 font-bold pointer-events-auto"
                        >
                          <MessageCircle className="w-4 h-4 text-amber-500" />
                          <span>Chat with Seller</span>
                        </button>

                        {/* User Reviews subdivision */}
                        <div className="space-y-4 pt-2">
                          <div className="flex items-center justify-between">
                            <h4 className="text-[10px] font-mono uppercase tracking-widest text-[#d97706] font-semibold flex items-center gap-1.5">
                              <Star className="w-4 h-4 fill-amber-500 text-amber-500" />
                              Reviews Count ({(activeCar.reviews || []).length})
                            </h4>
                            <span className="text-xs font-mono text-stone-300 font-semibold">{activeCar.rating} ★ Rating</span>
                          </div>

                          {/* Interactive customer review inputs */}
                          <ReviewForm carId={activeCar.id} onSubmitReview={handleCreateReview} />

                          {/* Active Reviews lists */}
                          <div className="space-y-3 max-h-64 overflow-y-auto pr-1">
                            {(!activeCar.reviews || activeCar.reviews.length === 0) ? (
                              <p className="text-[10px] text-stone-500 font-mono italic p-4 text-center">
                                No reviews yet for this vehicle. Be the first to share your experience!
                              </p>
                            ) : (
                              activeCar.reviews.map((rev: Review) => (
                                <div key={rev.id} className="p-3 bg-stone-950/40 rounded-xl border border-stone-800/80 space-y-2">
                                  <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-2">
                                      <img
                                        referrerPolicy="no-referrer"
                                        src={rev.userAvatar}
                                        alt={rev.userName}
                                        className="w-6 h-6 rounded-full object-cover border border-stone-800"
                                      />
                                      <span className="text-[10px] text-stone-300 font-semibold">{rev.userName}</span>
                                    </div>
                                    <span className="text-[9px] text-[#d97706] font-mono">{rev.rating} ★</span>
                                  </div>
                                  <p className="text-xs text-stone-400 font-sans leading-relaxed">
                                    {rev.comment}
                                  </p>
                                  <div className="text-[8px] text-stone-550 font-mono text-right">{rev.date}</div>
                                </div>
                              ))
                            )}
                          </div>
                        </div>

                        {/* UGC App Store Compliance discrete report block */}
                        <div className="pt-6 pb-2 border-t border-stone-900 flex flex-col items-center gap-2">
                          <p className="text-[9px] text-stone-500 font-mono text-center leading-normal">
                            Inappropriate content, dealer misconduct, or fraudulent seller detail?
                          </p>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setShowReportModal(true);
                            }}
                            className="text-[9.5px] text-stone-400 hover:text-red-400 font-mono uppercase tracking-widest flex items-center gap-1.5 underline decoration-stone-850 hover:decoration-red-500/50 transition-all pointer-events-auto cursor-pointer"
                          >
                            <Flag className="w-3 h-3 text-red-500" />
                            <span>Report Listing, Seller or Dealer</span>
                          </button>
                        </div>

                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* Persistent Bottom Action buttons Tray ALWAYS overlaying on top of the listing card */}
                <div className="absolute bottom-3 md:bottom-6 lg:bottom-8 inset-x-0 z-30 flex items-center justify-center gap-4 pointer-events-auto">
                  {/* Swipe Left Button (Pass) */}
                  <button
                    id="swipe_pass_btn"
                    type="button"
                    onClick={(e) => { e.stopPropagation(); handleSwipe('left'); }}
                    className="w-12 h-12 rounded-full bg-stone-950/95 border border-[#C8102E]/25 hover:border-[#C8102E] flex items-center justify-center text-[#C8102E] hover:bg-[#C8102E] hover:text-white shadow-xl shadow-[#C8102E]/10 hover:scale-110 active:scale-95 transition-all cursor-pointer"
                    title="Pass"
                  >
                    <X className="w-5 h-5" />
                  </button>

                  {/* Buy / Rent trigger in center */}
                  {activeCar.isAd ? (
                    <button
                      id="ad_promo_action"
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        // Sponsor discount action (no random notification popup displays)
                        try {
                          const couponCode = `VELOCE_${activeCar.model.replace(/\s+/g, '_').toUpperCase()}_20`;
                          navigator.clipboard.writeText(couponCode);
                        } catch (err) {}
                      }}
                      className="px-6 h-12 rounded-full bg-amber-500 hover:bg-amber-450 text-stone-950 flex items-center justify-center gap-1.5 shadow-xl hover:scale-105 active:scale-95 transition-all font-mono font-extrabold tracking-wider text-[10px] uppercase cursor-pointer"
                    >
                      <Sparkles className="w-3.5 h-3.5 text-stone-950 fill-stone-950" />
                      <span>{activeCar.adLinkText || 'CLAIM DISCOUNT'}</span>
                    </button>
                  ) : (
                    <button
                      id="swipe_rent_btn"
                      type="button"
                      onClick={(e) => { e.stopPropagation(); onRequestRent(activeCar); }}
                      className="px-6 h-12 rounded-full bg-amber-500 hover:bg-amber-450 text-stone-950 flex items-center justify-center gap-1.5 shadow-xl hover:scale-105 active:scale-95 transition-all font-mono font-extrabold tracking-widest text-[10px] uppercase cursor-pointer"
                    >
                      <Zap className="w-3.5 h-3.5 text-stone-950 fill-stone-950" />
                      <span>
                        {activeCar.type === 'rent' ? 'Rent Now' : activeCar.type === 'buy' ? 'Buy Now' : 'Rent or Buy'}
                      </span>
                    </button>
                  )}

                  {/* Swipe Right Button (Favorite) */}
                  <button
                    id="swipe_match_btn"
                    type="button"
                    onClick={(e) => { e.stopPropagation(); handleSwipe('right'); }}
                    className={`w-12 h-12 rounded-full bg-stone-950/95 border flex items-center justify-center shadow-xl hover:scale-110 active:scale-95 transition-all cursor-pointer ${
                      likedCarIds.includes(activeCar.id)
                        ? 'border-emerald-500 text-emerald-400 bg-emerald-500/15'
                        : 'border-stone-850 hover:border-emerald-500/45 text-stone-400 hover:text-emerald-450'
                    }`}
                    title="Favorite"
                  >
                    <Heart className={`w-5 h-5 ${likedCarIds.includes(activeCar.id) ? 'fill-emerald-400 text-emerald-400' : ''}`} />
                  </button>
                </div>

            </motion.div>

          </div>
        )}

      </div>

      {/* FULLSCREEN PHOTOS ONLY GALLERY */}
      <AnimatePresence>
        {showFullscreenGallery && activeCar && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-[#000000]/95 backdrop-blur-2xl z-50 flex flex-col justify-between p-4 md:p-6"
          >
            {/* Header: Photo Counter & Close button */}
            <div className="flex items-center justify-between w-full h-14 shrink-0 transition-opacity">
              <span className="text-stone-400 font-mono text-[11px] uppercase tracking-wider font-semibold">
                {activeCar.brand} {activeCar.model}
              </span>
              <button
                type="button"
                id="close_fullscreen_gallery_btn"
                onClick={() => setShowFullscreenGallery(false)}
                className="p-3 rounded-full bg-stone-900/80 hover:bg-stone-800 text-stone-300 hover:text-white border border-stone-800 transition-all cursor-pointer"
                title="Close"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Core Display: Big Photo + Left/Right floating chevrons */}
            <div className="flex-1 w-full flex items-center justify-center relative min-h-0">
              {/* Left back arrow */}
              {activeCar.images.length > 1 && (
                <button
                  type="button"
                  id="fullscreen_prev_photo_btn"
                  onClick={() => {
                    const prevIdx = (activePhotoIndex - 1 + activeCar.images.length) % activeCar.images.length;
                    setActivePhotoIndex(prevIdx);
                  }}
                  className="absolute left-4 z-10 p-3.5 rounded-full bg-stone-900/70 hover:bg-[#121214] text-stone-300 hover:text-white border border-stone-800/65 opacity-80 hover:opacity-100 transition-all cursor-pointer"
                  title="Previous Photo"
                >
                  <ChevronLeft className="w-6 h-6" />
                </button>
              )}

              {/* Main Image */}
              <motion.img
                key={activePhotoIndex}
                initial={{ opacity: 0, scale: 0.97 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.97 }}
                referrerPolicy="no-referrer"
                src={activeCar.images[activePhotoIndex]}
                alt={`${activeCar.brand} ${activeCar.model}`}
                className="max-w-full max-h-[75vh] object-contain rounded-xl shadow-2xl select-none"
              />

              {/* Right forward arrow */}
              {activeCar.images.length > 1 && (
                <button
                  type="button"
                  id="fullscreen_next_photo_btn"
                  onClick={() => {
                    const nextIdx = (activePhotoIndex + 1) % activeCar.images.length;
                    setActivePhotoIndex(nextIdx);
                  }}
                  className="absolute right-4 z-10 p-3.5 rounded-full bg-stone-900/70 hover:bg-[#121214] text-stone-300 hover:text-white border border-stone-800/65 opacity-80 hover:opacity-100 transition-all cursor-pointer"
                  title="Next Photo"
                >
                  <ChevronRight className="w-6 h-6" />
                </button>
              )}
            </div>

            {/* Bottom: Thumbnail Strip Indicator */}
            <div className="w-full h-16 shrink-0 flex items-center justify-center gap-2 mt-2">
              {activeCar.images.map((imgUrl, idx) => (
                <button
                  key={idx}
                  type="button"
                  id={`fullscreen_thumb_${idx}`}
                  onClick={() => setActivePhotoIndex(idx)}
                  className={`relative w-12 h-12 rounded-lg overflow-hidden border transition-all cursor-pointer ${
                    activePhotoIndex === idx
                      ? 'border-amber-500 ring-2 ring-amber-500/30 ring-offset-2 ring-offset-black scale-105'
                      : 'border-stone-800 hover:border-stone-600 opacity-60 hover:opacity-100'
                  }`}
                >
                  <img referrerPolicy="no-referrer" src={imgUrl} className="w-full h-full object-cover" alt={`Thumb ${idx + 1}`} />
                </button>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Exquisite full popup modal to inspect Seller profile detail page directly */}
      <AnimatePresence>
        {selectedSellerId && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-stone-950/80 backdrop-blur-xl z-50 flex items-center justify-center p-4"
          >
            {(() => {
              const profData = getSellerProfileData(selectedSellerId);
              const following = isFollowingSeller(selectedSellerId);
              const baseFollowers = selectedSellerId.startsWith('user_') ? 12 : 248;
              const finalFollowers = baseFollowers + (following ? 1 : 0);

              // Get all lists of vehicles listed by this vendor
              const sellerCars = cars.filter(c => c.dealerId === selectedSellerId);

              return (
                <motion.div
                  initial={{ scale: 0.9, y: 20 }}
                  animate={{ scale: 1, y: 0 }}
                  exit={{ scale: 0.9, y: 20 }}
                  className="w-full max-w-md bg-[#0c0c0e] border border-stone-800/80 rounded-3xl overflow-hidden shadow-2xl flex flex-col max-h-[90vh]"
                >
                  {/* Custom modal header bar */}
                  <div className="flex items-center justify-between p-5 border-b border-stone-900 bg-stone-950">
                    <button
                      type="button"
                      onClick={() => setSelectedSellerId(null)}
                      className="flex items-center gap-1.5 text-xs text-stone-400 hover:text-white font-mono uppercase bg-stone-900 border border-stone-800 py-1.5 px-3 rounded-lg"
                    >
                      <ChevronLeft className="w-4 h-4 text-amber-500" />
                      <span>Back</span>
                    </button>
                    <span className="text-[10px] font-mono uppercase tracking-widest text-[#d97706] font-extrabold bg-amber-500/10 px-2.5 py-1 rounded border border-amber-500/20">
                      Seller Card Hub
                    </span>
                  </div>

                  <div className="p-6 overflow-y-auto space-y-6 flex-1">
                    {/* Seller core details card */}
                    <div className="flex flex-col items-center text-center space-y-3">
                      <div className="relative">
                        <img 
                          referrerPolicy="no-referrer"
                          src={profData.avatar} 
                          alt={profData.name} 
                          className="w-20 h-20 rounded-full object-cover border-2 border-amber-500"
                        />
                        {(profData.isVeloceGT || profData.isDealerPaid) && (
                          <div className="absolute -bottom-1 -right-1 bg-amber-500 rounded-full p-1" title="Veloce Verified Member">
                            <Check className="w-3.5 h-3.5 text-stone-950 stroke-[3]" />
                          </div>
                        )}
                      </div>

                      <div>
                        <h3 className="text-xl font-semibold text-white tracking-tight flex items-center justify-center gap-1.5">
                          {profData.name}
                        </h3>
                        <p className="text-[10px] font-mono text-stone-500 uppercase mt-0.5 tracking-wider">
                          {profData.isDealerPaid 
                            ? 'Official Verified Dealer' 
                            : profData.isVeloceGT 
                              ? 'Veloce GT Member' 
                              : 'Standard Member Account'}
                        </p>
                      </div>

                      {/* Followers HUD stats bar */}
                      <div className="flex items-center gap-6 py-2 px-5 bg-stone-950 rounded-xl border border-stone-900/85">
                        <div className="text-center">
                          <span className="text-xs font-mono font-bold text-white block">{sellerCars.length}</span>
                          <span className="text-[8px] font-mono text-stone-500 uppercase tracking-widest">Listings</span>
                        </div>
                        <div className="w-[1px] h-6 bg-stone-800" />
                        <div className="text-center">
                          <span className="text-xs font-mono font-bold text-white block">{finalFollowers}</span>
                          <span className="text-[8px] font-mono text-stone-500 uppercase tracking-widest">Followers</span>
                        </div>
                      </div>

                      {/* Follow interaction button */}
                      {selectedSellerId !== currentUser.id && (
                        <button
                          type="button"
                          onClick={() => onFollowToggle(selectedSellerId)}
                          className={`flex items-center justify-center gap-2 w-full py-2.5 rounded-xl font-mono text-[10.5px] uppercase font-bold tracking-wider cursor-pointer border transition-all ${
                            following 
                              ? 'bg-amber-500/10 border-amber-500/30 text-amber-500 hover:bg-amber-500/20' 
                              : 'bg-amber-505 bg-amber-500 hover:bg-amber-400 text-stone-950 border-amber-500'
                          }`}
                        >
                          <Users className="w-4 h-4 shrink-0" />
                          <span>{following ? '✓ Member Followed' : 'Follow Member'}</span>
                        </button>
                      )}
                    </div>

                    {/* Member's garage listings grid */}
                    <div className="space-y-3">
                      <div className="flex items-center justify-between text-[11px] font-mono uppercase tracking-widest text-[#d97706] font-bold border-b border-stone-900 pb-1.5">
                        <span>Garage List</span>
                        <span className="text-stone-500 lowercase font-medium text-[10px]">{sellerCars.length} vehicles</span>
                      </div>

                      {sellerCars.length === 0 ? (
                        <p className="text-[10px] text-stone-500 font-mono italic text-center p-4">
                          This member has zero standard active listings right now.
                        </p>
                      ) : (
                        <div className="space-y-2.5 max-h-56 overflow-y-auto pr-1">
                          {sellerCars.map(c => {
                            // Find corresponding combined feed index to warp directly to it!
                            const feedIdx = feedItems.findIndex(f => f.id === c.id);

                            return (
                              <div 
                                key={c.id} 
                                className="flex items-center justify-between p-2.5 bg-stone-950 hover:bg-stone-900 rounded-xl border border-stone-900 transition-colors"
                              >
                                <div className="flex items-center gap-2.5">
                                  <img 
                                    referrerPolicy="no-referrer"
                                    src={c.images[0]} 
                                    className="w-12 h-9 object-cover rounded-lg border border-stone-800"
                                    alt={c.model}
                                  />
                                  <div>
                                    <h4 className="text-xs font-semibold text-stone-200">
                                      {c.brand} {c.model}
                                    </h4>
                                    <p className="text-[9px] font-mono text-stone-500 uppercase mt-0.5">
                                      {c.year} • {c.type === 'rent' ? `$${c.price}/day` : c.type === 'both' ? `$${c.price}/day or Buy` : `$${c.price.toLocaleString()}`}
                                    </p>
                                  </div>
                                </div>

                                {feedIdx !== -1 && (
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setCurrentIndex(feedIdx);
                                      setSelectedSellerId(null);
                                    }}
                                    className="flex items-center gap-1 py-1 px-2.5 rounded bg-stone-900/80 hover:bg-stone-850 border border-stone-800 text-[9.5px] text-amber-500 uppercase font-mono tracking-wider cursor-pointer"
                                    title="View this car on stage"
                                  >
                                    <span>Swipe</span>
                                    <ExternalLink className="w-3 h-3" />
                                  </button>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>

                  </div>
                </motion.div>
              );
            })()}
          </motion.div>
        )}
      </AnimatePresence>

      {/* App Store Review Compilant UGC Content Moderation Modal */}
      <AnimatePresence>
        {showReportModal && activeCar && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md select-none font-sans">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 15 }}
              className="w-full max-w-md bg-stone-900 border border-stone-800 rounded-3xl p-6 space-y-5 shadow-2xl relative"
            >
              <div className="flex items-center gap-2.5 pb-3 border-b border-stone-850">
                <Shield className="w-5 h-5 text-red-500 fill-red-550/10" />
                <div>
                  <h3 className="text-sm font-semibold font-mono uppercase text-stone-100 tracking-wider">
                    UGC Moderation Shield
                  </h3>
                  <p className="text-[9px] text-stone-500 uppercase tracking-widest mt-0.5 font-mono">
                    App Store Content Protection
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setShowReportModal(false);
                    setReportSuccess(null);
                    setReportReason('');
                  }}
                  className="ml-auto text-stone-500 hover:text-white font-bold cursor-pointer text-base p-1"
                >
                  ×
                </button>
              </div>

              {reportSuccess ? (
                <div className="py-6 text-center space-y-4">
                  <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400">
                    <Check className="w-6 h-6 stroke-[2.5]" />
                  </div>
                  <div className="space-y-1.5">
                    <h4 className="text-xs font-semibold uppercase font-mono text-stone-100 tracking-wider">
                      UGC Safe Environment Action Applied
                    </h4>
                    <p className="text-[11px] text-stone-300 leading-relaxed max-w-sm mx-auto">
                      {reportSuccess}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setShowReportModal(false);
                      setReportSuccess(null);
                      setReportReason('');
                      // Automatic skip listing if reported/blocked
                      if (currentIndex < feedItems.length - 1) {
                        setCurrentIndex(prev => prev + 1);
                      } else {
                        setCurrentIndex(0);
                      }
                    }}
                    className="py-2.5 px-6 bg-stone-100 hover:bg-white text-stone-950 font-mono text-[10px] font-bold uppercase tracking-wider rounded-xl cursor-pointer transition-all"
                  >
                    Continue Browsing
                  </button>
                </div>
              ) : (
                <div className="space-y-4">
                  <p className="text-[11px] text-stone-400 leading-relaxed font-sans">
                    Veloce values premium safety guidelines. You have initiated actions for listing <strong className="text-white">#{activeCar.id} ({activeCar.brand} {activeCar.model})</strong> published by <strong className="text-white">{activeCar.dealerName}</strong>.
                  </p>

                  {/* Flag Content Portion */}
                  <div className="space-y-2.5">
                    <label className="block text-[9.5px] uppercase tracking-widest text-stone-400 font-mono font-bold">
                      Option A: Report / Flag Inappropriate Content
                    </label>
                    <div className="grid grid-cols-2 gap-2">
                      {[
                        'Fake/Inconsistent Photos',
                        'Offensive Descriptions',
                        'Fraudulent/Scam Offer',
                        'Spam/Incorrect Model Details'
                      ].map((reason) => (
                        <button
                          key={reason}
                          type="button"
                          onClick={() => setReportReason(reason)}
                          className={`p-2.5 text-left rounded-xl border text-[10.5px] transition-all cursor-pointer ${
                            reportReason === reason
                              ? 'bg-red-500/10 border-red-500/40 text-red-400 font-medium'
                              : 'bg-stone-950/40 border-stone-850 hover:border-stone-800 text-stone-300'
                          }`}
                        >
                          {reason}
                        </button>
                      ))}
                    </div>

                    <button
                      type="button"
                      disabled={!reportReason}
                      onClick={() => {
                        setReportSuccess(
                          `Listing reported under justification: "${reportReason}". This item has been immediately hidden from your view queue, and our UGC moderation console has queued the asset for standard rapid review removal.`
                        );
                      }}
                      className="w-full py-2.5 bg-red-650 hover:bg-red-600 border border-red-500/20 text-white disabled:opacity-35 disabled:cursor-not-allowed rounded-xl font-mono text-[10px] font-bold uppercase tracking-widest transition-all cursor-pointer shadow-lg shadow-red-950/20"
                    >
                      Report User Content
                    </button>
                  </div>

                  {/* Block Seller Portion */}
                  <div className="pt-4 border-t border-stone-850 space-y-2.5">
                    <label className="block text-[9.5px] uppercase tracking-widest text-stone-400 font-mono  font-bold">
                      Option B: Force Block & Mute Seller
                    </label>
                    <p className="text-[10px] text-stone-500 leading-normal">
                      Permanently hide all existing and future vehicles published by <strong>{activeCar.dealerName}</strong>. You will also lock communication in messages.
                    </p>
                    <button
                      type="button"
                      onClick={() => {
                        // Add dealer ID to blocked
                        setBlockedUserIds(prev => [...prev, activeCar.dealerId]);
                        setReportSuccess(
                          `Seller "${activeCar.dealerName}" is permanently blocked. Their listings have been hidden and standard communication routes have been shut.`
                        );
                      }}
                      className="w-full py-2.5 bg-stone-950 hover:bg-stone-900 border border-stone-800 hover:border-stone-750 text-stone-300 rounded-xl font-mono text-[10px] font-bold uppercase tracking-widest transition-all cursor-pointer"
                    >
                      Block & Mute Seller
                    </button>
                  </div>
                </div>
              )}
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
}

/* Review composer */
interface ReviewFormProps {
  carId: string;
  onSubmitReview: (carId: string, comment: string, rating: number) => void;
}

function ReviewForm({ carId, onSubmitReview }: ReviewFormProps) {
  const [rating, setRating] = useState<number>(5);
  const [comment, setComment] = useState('');

  const submitClick = (e: FormEvent) => {
    e.preventDefault();
    if (!comment.trim()) return;
    onSubmitReview(carId, comment, rating);
    setComment('');
  };

  return (
    <form onSubmit={submitClick} id="review_composer" className="space-y-2 pb-2">
      <input
        id="review_comment"
        type="text"
        placeholder="Share your experience..."
        value={comment}
        onChange={(e) => setComment(e.target.value)}
        className="w-full text-xs py-2 px-3 bg-stone-950 rounded-xl border border-stone-800 text-stone-300 focus:outline-none focus:border-stone-700 placeholder:text-stone-650 font-sans"
        required
      />
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          <span className="text-[9px] uppercase font-mono text-stone-500">Rating</span>
          <div className="flex gap-1">
            {[1, 2, 3, 4, 5].map(st => (
              <button
                key={st}
                type="button"
                id={`star_rate_${st}`}
                onClick={() => setRating(st)}
                className="focus:outline-none cursor-pointer"
              >
                <Star className={`w-3.5 h-3.5 ${st <= rating ? 'fill-amber-500 text-amber-500' : 'text-stone-700'}`} />
              </button>
            ))}
          </div>
        </div>
        <button
          id="review_submit_btn"
          type="submit"
          className="text-[9.5px] font-mono tracking-wider uppercase text-stone-950 bg-stone-105 bg-amber-500 px-3.5 py-1.5 rounded-lg font-bold hover:bg-amber-400 transition cursor-pointer"
        >
          Post Review
        </button>
      </div>
    </form>
  );
}
