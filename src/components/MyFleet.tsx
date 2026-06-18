import React, { useState } from 'react';
import { User, Car, AppLanguage, Booking } from '../types';
import { DICTIONARY } from '../data';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Calendar, TrendingUp, Coins, Eye, Heart, Percent,
  Lock, Shield, Plus, FileText, Sparkles, Clock, 
  ArrowUpRight, ChevronRight, Info, Users, Sliders, Check, MessageSquare, ChevronLeft
} from 'lucide-react';

interface MyFleetProps {
  currentUser: User;
  cars: Car[];
  bookings: Booking[];
  language: AppLanguage;
  onUpdateCar: (updatedCar: Car) => void;
  onAddNewCar: (newCar: Car) => void;
  onNavigateToExplore: () => void;
  onOpenChat: (car: Car) => void;
}

export default function MyFleet({
  currentUser,
  cars,
  bookings,
  language,
  onUpdateCar,
  onAddNewCar,
  onNavigateToExplore,
  onOpenChat
}: MyFleetProps) {
  const t = DICTIONARY[language];
  const myCars = cars.filter(c => c.dealerId === currentUser.id);

  // Active sub-navigation inside My Fleet
  const [activeTab, setActiveTab] = useState<'inventory' | 'analytics'>('inventory');

  // Currently editing car for availability range
  const [selectedCarId, setSelectedCarId] = useState<string | null>(null);
  const [startDateStr, setStartDateStr] = useState('');
  const [endDateStr, setEndDateStr] = useState('');

  // Form states for adding a quick car from My Fleet
  const [showQuickAdd, setShowQuickAdd] = useState(false);
  const [quickBrand, setQuickBrand] = useState('');
  const [quickModel, setQuickModel] = useState('');
  const [quickYear, setQuickYear] = useState('2025');
  const [quickPrice, setQuickPrice] = useState('150');
  const [quickType, setQuickType] = useState<'rent' | 'buy' | 'both'>('rent');
  const [quickDesc, setQuickDesc] = useState('');
  const [quickMileage, setQuickMileage] = useState('');
  const [quickEngineSize, setQuickEngineSize] = useState('');
  const [quickEngineShape, setQuickEngineShape] = useState('');
  const [quickImages, setQuickImages] = useState<string[]>([]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;
    
    Array.from(files).forEach(file => {
      const reader = new FileReader();
      reader.onloadend = () => {
        if (typeof reader.result === 'string') {
          // Add newly uploaded file
          setQuickImages(prev => [...prev, reader.result as string]);
        }
      };
      reader.readAsDataURL(file as any);
    });
  };

  const removeUploadedImage = (index: number) => {
    setQuickImages(prev => prev.filter((_, i) => i !== index));
  };

  const prefillSampleImages = () => {
    const stock = [
      'https://images.unsplash.com/photo-1503376780353-7e6692767b70?q=80&w=800',
      'https://images.unsplash.com/photo-1552519507-da3b142c6e3d?q=80&w=800',
      'https://images.unsplash.com/photo-1580273916550-e323be2ae537?q=80&w=800',
      'https://images.unsplash.com/photo-1617788138017-80ad40651399?q=80&w=800',
      'https://images.unsplash.com/photo-1542282088-fe8426682b8f?q=80&w=800',
      'https://images.unsplash.com/photo-1618843479313-40f8afb4b4d8?q=80&w=800'
    ];
    setQuickImages(stock);
  };

  // Has analytics access? Dealers have it automatically, users must be veloce_gt
  const hasAnalyticsAccess = currentUser.role === 'dealer' || currentUser.subscriptionTier === 'veloce_gt';

  const handleSetAvailability = (carId: string) => {
    const targetCar = cars.find(c => c.id === carId);
    if (!targetCar) return;

    const updated = {
      ...targetCar,
      rentAvailableStart: startDateStr || undefined,
      rentAvailableEnd: endDateStr || undefined
    };

    onUpdateCar(updated);
    setSelectedCarId(null);
    setStartDateStr('');
    setEndDateStr('');
  };

  const handleClearAvailability = (carId: string) => {
    const targetCar = cars.find(c => c.id === carId);
    if (!targetCar) return;

    const updated = {
      ...targetCar,
      rentAvailableStart: undefined,
      rentAvailableEnd: undefined
    };

    onUpdateCar(updated);
  };

  const handleQuickAddSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!quickBrand || !quickModel) return;

    if (quickImages.length < 6) {
      alert("Error: You must upload or select a minimum of 6 pictures to post a vehicle.");
      return;
    }

    const isFree = (!currentUser.subscriptionTier || currentUser.subscriptionTier === 'free') && currentUser.role !== 'dealer';
    if (isFree && myCars.length >= 2) {
      alert("Standard Free accounts can list up to 2 vehicles. Please upgrade your tier in the Profile tab to list more.");
      return;
    }

    const newCar: Car = {
      id: `car_fleet_${Date.now()}`,
      brand: quickBrand,
      model: quickModel,
      year: parseInt(quickYear) || 2025,
      images: quickImages,
      price: parseFloat(quickPrice) || 150,
      type: quickType,
      transmission: 'Dual-Clutch automatic',
      engine: quickEngineSize || '4.0L',
      power: 580,
      acceleration: '3.2s',
      topSpeed: 315,
      location: 'Culver City, CA',
      distance: 2.1,
      rating: 5.0,
      description: quickDesc || 'High performance premium luxury automobile, perfect for open highway drives.',
      features: ['Apple CarPlay Enabled', 'Premium Alcantara sport seating', 'Comprehensive telemetry dashboard'],
      dealerId: currentUser.id,
      dealerName: currentUser.name,
      dealerAvatar: currentUser.avatar,
      insuranceLevel: 'basic',
      reviews: [],
      mileage: parseInt(quickMileage) || 12000,
      engineSize: quickEngineSize || '4.0L',
      engineShape: ''
    };

    onAddNewCar(newCar);
    setShowQuickAdd(false);
    setQuickBrand('');
    setQuickModel('');
    setQuickYear('2025');
    setQuickPrice('150');
    setQuickDesc('');
    setQuickMileage('');
    setQuickEngineSize('');
    setQuickEngineShape('');
    setQuickImages([]);
  };

  // Simulated Analytics Datasets (Pure CSS SVG Line graphs for top performance feel)
  const lineChartData = [24, 38, 30, 48, 42, 60, 52]; // Weekly Page Impressions
  const chartDays = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

  // Simulated Dealer Leads
  const simulatedLeads = [
    {
      id: "lead_1",
      clientName: "Alexander Hayes",
      clientAvatar: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?q=80&w=120",
      carTarget: "Porsche 911 GT3 RS",
      time: "12 minutes ago",
      message: "Is the titanium exhaust upgrade active? Looking to schedule a test match for next week.",
      status: "unreplied",
    },
    {
      id: "lead_2",
      clientName: "Isabella Martinez",
      clientAvatar: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?q=80&w=120",
      carTarget: "Ferrari SF90 Stradale",
      time: "2 hours ago",
      message: "Do you offer hotel drop-offs near Beverly Hills for renting?",
      status: "unreplied",
    },
    {
      id: "lead_3",
      clientName: "Marcus Vance",
      clientAvatar: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?q=80&w=120",
      carTarget: "McLaren 720S",
      time: "Yesterday",
      message: "Ready to proceed with buying if we can secure shipment terms.",
      status: "responded",
    }
  ];

  return (
    <div className="w-full max-w-6xl mx-auto px-1 py-4 space-y-6">
      
      <button 
        onClick={onNavigateToExplore}
        className="flex items-center text-stone-500 hover:text-stone-300 transition-colors cursor-pointer self-start mb-1"
        title="Back"
      >
        <ChevronLeft className="w-5 h-5" />
      </button>

      {/* Header and statistics */}
      <div className="flex flex-col items-center text-center pb-4 border-b border-stone-900 gap-4">
        <div className="flex flex-col items-center">
          <h2 className="text-xl tracking-wider font-light uppercase text-stone-105 flex items-center justify-center gap-2 font-mono">
            <Sliders className="w-5 h-5 text-amber-500 animate-pulse" />
            <span>My Fleet</span>
          </h2>
          <p className="text-xs text-stone-500 font-mono mt-1">
            Monitor listings, manage rentals calendar blockouts, and view active performance indexes.
          </p>
        </div>

        {/* Tab Selection Navigation */}
        <div className="flex bg-stone-950 p-1 rounded-xl border border-stone-850/80 w-full max-w-[285px] justify-center mx-auto">
          <button
            type="button"
            onClick={() => setActiveTab('inventory')}
            className={`flex-1 text-center py-1.5 text-[9.5px] font-mono uppercase font-bold tracking-wider rounded-lg transition-all cursor-pointer ${
              activeTab === 'inventory' ? 'bg-stone-900 text-stone-100 border border-stone-800' : 'text-stone-500 hover:text-stone-300'
            }`}
          >
            My Listings ({myCars.length})
          </button>
          
          <button
            type="button"
            onClick={() => setActiveTab('analytics')}
            className={`flex-1 text-center py-1.5 text-[9.5px] font-mono uppercase font-bold tracking-wider rounded-lg transition-all cursor-pointer ${
              activeTab === 'analytics' ? 'bg-stone-900 text-stone-100 border border-stone-800' : 'text-stone-500 hover:text-stone-300'
            }`}
          >
            Analytics Hub
          </button>
        </div>
      </div>

      {/* QUICK INVENTORY CONTAINER */}
      {activeTab === 'inventory' && (
        <div className="space-y-6">
          <div className="flex items-center justify-between pb-1">
            <h3 className="text-xs font-mono uppercase text-stone-400 tracking-wider">Current Fleet</h3>
            <button
              type="button"
              onClick={() => setShowQuickAdd(!showQuickAdd)}
              className="py-1.5 px-3 bg-amber-500 hover:bg-amber-450 text-stone-950 rounded-lg text-[9px] font-mono font-extrabold uppercase tracking-wider flex items-center gap-1 cursor-pointer transition-colors"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add a Vehicle</span>
            </button>
          </div>

          {/* Quick Add Form drawer */}
          <AnimatePresence>
            {showQuickAdd && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="overflow-hidden"
              >
                <form onSubmit={handleQuickAddSubmit} className="p-5 bg-stone-900/60 border border-stone-800 rounded-2xl grid grid-cols-1 md:grid-cols-6 gap-4">
                  <div className="md:col-span-2 space-y-1">
                    <label className="block text-[8.5px] font-mono uppercase font-bold text-stone-400">Brand Name</label>
                    <input
                      type="text"
                      placeholder="e.g. Porsche"
                      value={quickBrand}
                      onChange={e => setQuickBrand(e.target.value)}
                      className="w-full text-xs p-2.5 bg-stone-950 border border-stone-800 rounded-lg text-stone-100 focus:outline-none focus:border-stone-700 font-sans"
                      required
                    />
                  </div>
                  <div className="md:col-span-2 space-y-1">
                    <label className="block text-[8.5px] font-mono uppercase font-bold text-stone-405">Model Name</label>
                    <input
                      type="text"
                      placeholder="e.g. 911 GT3"
                      value={quickModel}
                      onChange={e => setQuickModel(e.target.value)}
                      className="w-full text-xs p-2.5 bg-stone-950 border border-stone-800 rounded-lg text-stone-100 focus:outline-none focus:border-stone-700 font-sans"
                      required
                    />
                  </div>
                  <div className="md:col-span-1 space-y-1">
                    <label className="block text-[8.5px] font-mono uppercase font-bold text-stone-405">Year</label>
                    <input
                      type="text"
                      placeholder="e.g. 2025"
                      value={quickYear}
                      onChange={e => setQuickYear(e.target.value)}
                      className="w-full text-xs p-2.5 bg-stone-950 border border-stone-800 rounded-lg text-stone-100 focus:outline-none focus:border-stone-700 font-mono"
                      required
                    />
                  </div>
                  <div className="md:col-span-1 space-y-1">
                    <label className="block text-[8.5px] font-mono uppercase font-bold text-stone-405">Listing Price</label>
                    <input
                      type="text"
                      placeholder="e.g. 150"
                      value={quickPrice}
                      onChange={e => setQuickPrice(e.target.value)}
                      className="w-full text-xs p-2.5 bg-stone-950 border border-stone-800 rounded-lg text-stone-100 focus:outline-none focus:border-stone-700 font-mono"
                      required
                    />
                  </div>

                  <div className="md:col-span-2 space-y-1">
                    <label className="block text-[8.5px] font-mono uppercase font-bold text-stone-405">Purpose</label>
                    <select
                      value={quickType}
                      onChange={e => setQuickType(e.target.value as any)}
                      className="w-full text-xs p-2.5 bg-stone-950 border border-stone-800 rounded-lg text-stone-100 focus:outline-none focus:border-stone-700 font-mono"
                    >
                      <option value="rent">Rent / Lease</option>
                      <option value="buy">Sell / Outright</option>
                      <option value="both">Both Options</option>
                    </select>
                  </div>

                  {/* Mileage, Engine Size, Engine Shape inputs */}
                  <div className="md:col-span-1 space-y-1">
                    <label className="block text-[8.5px] font-mono uppercase font-bold text-stone-405">Mileage (mi)</label>
                    <input
                      type="number"
                      placeholder="e.g. 12000"
                      value={quickMileage}
                      onChange={e => setQuickMileage(e.target.value)}
                      className="w-full text-xs p-2.5 bg-stone-950 border border-stone-800 rounded-lg text-stone-100 focus:outline-none focus:border-stone-700 font-mono"
                      required
                    />
                  </div>
                  <div className="md:col-span-3 space-y-1">
                    <label className="block text-[8.5px] font-mono uppercase font-bold text-stone-405">Engine Displacement (L/cc)</label>
                    <input
                      type="text"
                      placeholder="e.g. 4.0L or 1103cc"
                      value={quickEngineSize}
                      onChange={e => setQuickEngineSize(e.target.value)}
                      className="w-full text-xs p-2.5 bg-stone-950 border border-stone-800 rounded-lg text-stone-100 focus:outline-none focus:border-stone-700 font-sans"
                      required
                    />
                  </div>

                  <div className="md:col-span-6 space-y-1">
                    <label className="block text-[8.5px] font-mono uppercase font-bold text-stone-405">Short Description</label>
                    <input
                      type="text"
                      placeholder="Provide special features or specs details here."
                      value={quickDesc}
                      onChange={e => setQuickDesc(e.target.value)}
                      className="w-full text-xs p-2.5 bg-stone-950 border border-stone-800 rounded-lg text-stone-100 focus:outline-none focus:border-stone-700 font-sans"
                    />
                  </div>

                  {/* Pictures Upload Section */}
                  <div className="md:col-span-6 space-y-3.5 border-t border-stone-805 pt-4">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                      <div>
                        <span className="block text-[9.5px] font-mono uppercase font-extrabold text-stone-300">Vehicle Photos (Required: Min 6)</span>
                        <span className="block text-[9px] text-stone-500 font-sans">Upload your custom hi-res images. Add minimum 6 photos.</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={prefillSampleImages}
                          className="py-1 px-2.5 bg-stone-850 hover:bg-stone-800 text-stone-305 rounded border border-stone-800 text-[8.5px] font-mono uppercase font-bold tracking-wider transition-colors"
                        >
                          Prefill 6 Premium Stock Photos
                        </button>
                        <label className="py-1 px-2.5 bg-amber-500 hover:bg-amber-450 text-stone-950 rounded text-[8.5px] font-mono uppercase font-extrabold tracking-wider cursor-pointer transition-colors flex items-center gap-1">
                          <Plus className="w-3 h-3" />
                          <span>Choose Files</span>
                          <input
                            type="file"
                            multiple
                            accept="image/*"
                            onChange={handleFileChange}
                            className="hidden"
                          />
                        </label>
                      </div>
                    </div>

                    {/* Image Previews list */}
                    <div className="grid grid-cols-3 sm:grid-cols-6 gap-2 bg-stone-950 p-3 rounded-xl border border-stone-900 min-h-[90px]">
                      {quickImages.map((img, idx) => (
                        <div key={idx} className="relative group aspect-square bg-stone-900 rounded-lg overflow-hidden border border-stone-850 shadow">
                          <img
                            referrerPolicy="no-referrer"
                            src={img}
                            alt={`Upload ${idx + 1}`}
                            className="w-full h-full object-cover"
                          />
                          <button
                            type="button"
                            onClick={() => removeUploadedImage(idx)}
                            className="absolute top-1 right-1 p-1 bg-stone-950/85 hover:bg-rose-950 text-stone-400 hover:text-white rounded-full transition-colors opacity-100 sm:opacity-0 sm:group-hover:opacity-100"
                            title="Remove photo"
                          >
                            <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                          </button>
                          <div className="absolute bottom-0 right-0 left-0 bg-black/60 text-[7px] font-mono text-center text-stone-300 py-0.5">
                            Photo {idx + 1}
                          </div>
                        </div>
                      ))}
                      {quickImages.length === 0 && (
                        <div className="col-span-full flex flex-col items-center justify-center py-4 text-stone-605 font-mono text-[9px] uppercase tracking-widest">
                          <span>No photos uploaded yet</span>
                          <span className="text-amber-500/50 mt-1 font-sans text-[8.5px] lowercase italic font-normal">choose local files or click prefill above</span>
                        </div>
                      )}
                    </div>

                    {/* Status check / alerts */}
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between pt-1 gap-2">
                      <span className={`text-[9px] font-mono uppercase font-bold ${quickImages.length < 6 ? 'text-rose-500' : 'text-emerald-500'}`}>
                        {quickImages.length < 6 
                          ? `⚠️ Status: Uploaded ${quickImages.length}/6 required photos` 
                          : `✅ Status: Ready to publish (${quickImages.length} photos uploaded)`
                        }
                      </span>
                      <button
                        type="submit"
                        disabled={quickImages.length < 6}
                        className={`py-2 px-6 rounded-lg text-[10px] font-mono uppercase font-extrabold tracking-widest transition-all ${
                          quickImages.length < 6 
                            ? 'bg-stone-800 text-stone-600 border border-stone-850 cursor-not-allowed'
                            : 'bg-amber-500 hover:bg-amber-450 text-stone-950 cursor-pointer shadow-lg shadow-amber-500/10'
                        }`}
                      >
                        Publish Listing
                      </button>
                    </div>
                  </div>
                </form>
              </motion.div>
            )}
          </AnimatePresence>

          {myCars.length === 0 ? (
            <div className="bg-stone-950/45 p-12 rounded-3xl border border-stone-900 text-center space-y-4">
              <div className="mx-auto w-12 h-12 rounded-full border border-stone-805 flex items-center justify-center text-stone-605">
                <Info className="w-5 h-5 text-stone-500" />
              </div>
              <div className="max-w-sm mx-auto space-y-2">
                <p className="text-xs text-stone-300 font-sans">You don't have any vehicles added to your fleet right now.</p>
                <p className="text-[10px] text-stone-500 font-mono">List cars you have for sale or rent to monitor clicks and interest.</p>
              </div>
              <button
                type="button"
                onClick={() => setShowQuickAdd(true)}
                className="py-2 px-5 bg-stone-200 hover:bg-white text-stone-950 text-[10px] uppercase font-mono tracking-wider font-extrabold rounded-lg transition"
              >
                Add Your First Car
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              {myCars.map(car => (
                <div key={car.id} className="bg-stone-900/40 border border-stone-850 rounded-2xl p-5 flex flex-col justify-between space-y-5">
                  <div className="flex gap-4">
                    <div className="w-24 h-16 rounded-xl overflow-hidden border border-stone-800 shrink-0 bg-stone-950">
                      <img referrerPolicy="no-referrer" src={car.images[0]} alt={car.model} className="w-full h-full object-cover" />
                    </div>
                    <div className="space-y-1">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className={`text-[8px] font-mono uppercase tracking-widest font-extrabold px-1.5 py-0.5 rounded border ${
                          car.type === 'rent' 
                            ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400' 
                            : car.type === 'buy'
                              ? 'bg-amber-500/10 border-amber-500/25 text-amber-500'
                              : 'bg-indigo-500/10 border-indigo-500/20 text-indigo-400'
                        }`}>
                          {car.type === 'rent' ? 'For Rent' : car.type === 'buy' ? 'For Sale' : 'Rent & Sale'}
                        </span>
                        
                        {car.rentAvailableStart && car.rentAvailableEnd && (
                          <span className="text-[8px] font-mono uppercase tracking-wider text-emerald-400 flex items-center gap-1 bg-zinc-900/60 leading-none py-0.5 px-1.5 rounded border border-zinc-800">
                            Available window configured
                          </span>
                        )}
                      </div>

                      <h4 className="text-sm font-semibold text-stone-200 font-sans tracking-tight">
                        {car.brand} {car.model}
                      </h4>
                      <p className="text-[10px] text-stone-500 font-mono">
                        {car.year} &bull; {car.location} &bull; ${car.price.toLocaleString()}{car.type === 'rent' ? '/day' : ''}
                      </p>
                    </div>
                  </div>

                  {/* Availability Range Status Block */}
                  <div className="p-3 bg-stone-950/60 rounded-xl border border-stone-850/40 space-y-2">
                    <div className="flex items-center justify-between text-[10px] font-mono text-stone-400">
                      <span className="flex items-center gap-1 text-stone-500 uppercase text-[8.5px] font-bold">
                        <Calendar className="w-3.5 h-3.5 text-amber-500" />
                        Availability Window (Rentals)
                      </span>
                      {car.rentAvailableStart && (
                        <button
                          type="button"
                          onClick={() => handleClearAvailability(car.id)}
                          className="text-[8px] hover:text-red-400 uppercase tracking-widest font-bold cursor-pointer transition-colors"
                        >
                          Clear
                        </button>
                      )}
                    </div>

                    {car.rentAvailableStart && car.rentAvailableEnd ? (
                      <p className="text-xs text-stone-300 font-mono font-medium">
                        Enabled from <span className="text-amber-500">{car.rentAvailableStart}</span> through <span className="text-amber-500">{car.rentAvailableEnd}</span>
                      </p>
                    ) : (
                      <p className="text-[10px] text-stone-500 italic">
                        No restriction active. Car is currently listable anytime.
                      </p>
                    )}

                    {selectedCarId === car.id ? (
                      <div className="grid grid-cols-2 gap-2 pt-2 border-t border-stone-900">
                        <div className="space-y-1">
                          <span className="text-[8px] text-stone-500 block uppercase font-bold">Inception</span>
                          <input
                            type="date"
                            value={startDateStr}
                            onChange={e => setStartDateStr(e.target.value)}
                            className="w-full text-[10.5px] p-1.5 bg-stone-900 border border-stone-850 rounded text-stone-300 font-mono focus:outline-none"
                          />
                        </div>
                        <div className="space-y-1">
                          <span className="text-[8px] text-stone-500 block uppercase font-bold">Expiration</span>
                          <input
                            type="date"
                            value={endDateStr}
                            onChange={e => setEndDateStr(e.target.value)}
                            className="w-full text-[10.5px] p-1.5 bg-stone-900 border border-stone-850 rounded text-stone-300 font-mono focus:outline-none"
                          />
                        </div>
                        <div className="col-span-2 flex gap-1.5 pt-1.5">
                          <button
                            type="button"
                            onClick={() => handleSetAvailability(car.id)}
                            className="flex-1 py-1 bg-amber-500 hover:bg-amber-450 text-stone-950 font-mono font-bold uppercase rounded text-[8.5px] tracking-wider cursor-pointer"
                          >
                            Save Window
                          </button>
                          <button
                            type="button"
                            onClick={() => setSelectedCarId(null)}
                            className="px-2 py-1 bg-stone-850 hover:bg-stone-800 text-stone-400 font-mono rounded text-[8.5px] uppercase cursor-pointer"
                          >
                            Cancel
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="pt-1.5">
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedCarId(car.id);
                            setStartDateStr(car.rentAvailableStart || '2026-06-15');
                            setEndDateStr(car.rentAvailableEnd || '2026-06-25');
                          }}
                          className="py-1 px-3 bg-stone-850 hover:bg-stone-800 text-stone-300 rounded border border-stone-800 text-[8.5px] font-mono uppercase font-bold cursor-pointer transition-colors"
                        >
                          Configure Availability Range
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ANALYTICS SECTION */}
      {activeTab === 'analytics' && (
        <div className="space-y-6">
          {!hasAnalyticsAccess ? (
            /* Locked overlay prompt for free tiers */
            <div className="bg-stone-950 border border-stone-850 rounded-3xl p-10 text-center relative overflow-hidden flex flex-col items-center justify-center space-y-4 shadow-xl">
              <div className="absolute inset-0 bg-stone-900/10 backdrop-blur-sm z-0" />
              <div className="relative z-10 mx-auto w-12 h-12 bg-amber-500/10 border border-amber-500/20 text-amber-500 rounded-2xl flex items-center justify-center">
                <Lock className="w-5 h-5" />
              </div>
              <div className="relative z-10 max-w-sm space-y-2">
                <h4 className="text-sm font-semibold uppercase font-mono text-stone-200 tracking-wider">Fleet Analytics Terminal Locked</h4>
                <p className="text-xs text-stone-400 font-sans leading-relaxed">
                  Real-time swipe indices, weekly listing impressions, and detailed dealer dashboard metrics are reserved for Veloce GT members and registered dealers.
                </p>
              </div>
              <p className="text-[10px] text-stone-500 font-mono max-w-xs relative z-10 italic">
                * Upgrade standard accounts in the Profile tab to unlock advanced analytics instantly.
              </p>
            </div>
          ) : (
            /* Premium Performance telemetry Hub */
            <div className="space-y-6">
              
              {/* Telemetry Metrics Row */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="p-4 bg-stone-900/60 border border-stone-850 rounded-2xl space-y-1">
                  <span className="text-[8px] text-stone-500 uppercase tracking-widest font-mono font-bold block">Telemetry Impressions</span>
                  <div className="text-xl font-bold font-mono text-stone-100">42,910</div>
                  <span className="text-[8.5px] font-mono text-emerald-400 flex items-center gap-0.5 leading-none">
                    <TrendingUp className="w-3 h-3 inline" /> +14.2% weekly
                  </span>
                </div>

                <div className="p-4 bg-stone-900/60 border border-stone-850 rounded-2xl space-y-1">
                  <span className="text-[8px] text-stone-505 uppercase tracking-widest font-mono font-bold block">Swipe Match Rate</span>
                  <div className="text-xl font-bold font-mono text-stone-100">71.4%</div>
                  <span className="text-[8.5px] font-mono text-emerald-305 flex items-center gap-0.5 leading-none">
                    <TrendingUp className="w-3 h-3 inline" /> Optimal exposure
                  </span>
                </div>

                <div className="p-4 bg-stone-900/60 border border-stone-850 rounded-2xl space-y-1">
                  <span className="text-[8px] text-stone-505 uppercase tracking-widest font-mono font-bold block">Active Match Sessions</span>
                  <div className="text-xl font-bold font-mono text-stone-100">18 Inquiries</div>
                  <span className="text-[8.5px] font-mono text-amber-500 flex items-center gap-0.5 leading-none">
                    <Clock className="w-3 h-3 inline" /> 4 pending action
                  </span>
                </div>

                <div className="p-4 bg-stone-900/60 border border-stone-850 rounded-2xl space-y-1">
                  <span className="text-[8px] text-stone-505 uppercase tracking-widest font-mono font-bold block">Averaged Yield</span>
                  <div className="text-xl font-bold font-mono text-stone-100">$8,450 / wk</div>
                  <span className="text-[8.5px] font-mono text-[#BFA46F] flex items-center gap-0.5 leading-none">
                    <Coins className="w-3 h-3 inline animate-bounce" /> Verified payouts
                  </span>
                </div>
              </div>

              {/* Weekly Performance Graph Block (Gorgeous Custom CSS-SVG Line Chart) */}
              <div className="p-5 bg-stone-900/50 border border-stone-850 rounded-2xl space-y-4">
                <div className="flex items-center justify-between pb-2 border-b border-stone-850/60">
                  <div>
                    <h4 className="text-xs font-mono uppercase text-stone-200 tracking-wider font-bold">Impression Volume Telemetry</h4>
                    <p className="text-[9.5px] text-stone-500 font-sans">Swipe indexes registered across the platform for your collection over the last 7 days.</p>
                  </div>
                  <div className="text-right">
                    <span className="text-xs font-mono font-bold text-amber-500">Peak Sat: 60 swipes</span>
                  </div>
                </div>

                {/* SVG Graph wrapper */}
                <div className="h-44 w-full relative">
                  <svg viewBox="0 0 700 180" className="w-full h-full text-stone-800">
                    {/* Grid lines */}
                    <line x1="50" y1="20" x2="650" y2="20" stroke="#1c1c24" strokeWidth="1" strokeDasharray="4 4" />
                    <line x1="50" y1="65" x2="650" y2="65" stroke="#1c1c24" strokeWidth="1" strokeDasharray="4 4" />
                    <line x1="50" y1="110" x2="650" y2="110" stroke="#1c1c24" strokeWidth="1" strokeDasharray="4 4" />
                    <line x1="50" y1="150" x2="650" y2="150" stroke="#2a2a35" strokeWidth="1" />

                    {/* Gradient under the line */}
                    <defs>
                      <linearGradient id="glow_grad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#f59e0b" stopOpacity="0.25" />
                        <stop offset="100%" stopColor="#f59e0b" stopOpacity="0.0" />
                      </linearGradient>
                    </defs>

                    {/* Gradient Fill Path */}
                    <path
                      d="M 50,150 L 50,110 L 150,75 L 250,95 L 350,55 L 450,65 L 550,25 L 650,45 L 650,150 Z"
                      fill="url(#glow_grad)"
                    />

                    {/* Glowing Core Line */}
                    <path
                      d="M 50,110 L 150,75 L 250,95 L 350,55 L 450,65 L 550,25 L 650,45"
                      fill="none"
                      stroke="#f59e0b"
                      strokeWidth="2.5"
                    />

                    {/* Dots on points */}
                    <circle cx="50" cy="110" r="4.5" fill="#f59e0b" className="animate-ping" stroke="#121216" strokeWidth="1.5" />
                    <circle cx="150" cy="75" r="4.5" fill="#f59e0b" stroke="#121216" strokeWidth="1.5" />
                    <circle cx="250" cy="95" r="4.5" fill="#f59e0b" stroke="#121216" strokeWidth="1.5" />
                    <circle cx="350" cy="55" r="4.5" fill="#f59e0b" stroke="#121216" strokeWidth="1.5" />
                    <circle cx="450" cy="65" r="4.5" fill="#f59e0b" stroke="#121216" strokeWidth="1.5" />
                    <circle cx="550" cy="25" r="4.5" fill="#f59e0b" stroke="#121216" strokeWidth="1.5" />
                    <circle cx="650" cy="45" r="4.5" fill="#f59e0b" stroke="#121216" strokeWidth="1.5" />
                  </svg>
                </div>

                {/* Days labels row */}
                <div className="flex justify-between px-6 text-[9.5px] font-mono text-stone-500">
                  {chartDays.map((day, idx) => (
                    <span key={idx}>{day}</span>
                  ))}
                </div>
              </div>

              {/* Top Performer Items Breakout Row */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5 pt-1">
                <div className="p-5 bg-stone-900/50 border border-stone-850 rounded-2xl space-y-3">
                  <h5 className="text-xs font-mono uppercase text-stone-450 tracking-wider">Most Synced Inventory</h5>
                  
                  {myCars.length === 0 ? (
                    <p className="text-[10px] text-stone-505 italic">List a car to start collecting swipe data.</p>
                  ) : (
                    <div className="space-y-3">
                      {myCars.slice(0, 2).map((item, idx) => (
                        <div key={item.id} className="flex items-center justify-between p-2.5 bg-stone-950/60 rounded-xl border border-stone-850/60 font-sans text-xs">
                          <div className="flex items-center gap-3">
                            <span className="w-5 text-center font-mono text-[10px] text-stone-500 font-bold">0{idx + 1}</span>
                            <div>
                              <p className="font-semibold text-stone-200">{item.brand} {item.model}</p>
                              <p className="text-[9.5px] text-stone-500 font-mono">Exposure Index: High</p>
                            </div>
                          </div>
                          <div className="text-right">
                            <span className="text-amber-500 font-mono font-bold block">+82 swipes</span>
                            <span className="text-[9px] text-stone-500 font-mono">92% Match score</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div className="p-5 bg-stone-900/50 border border-stone-850 rounded-2xl space-y-3">
                  <h5 className="text-xs font-mono uppercase text-stone-450 tracking-wider">Performance Metrics</h5>
                  <div className="space-y-2.5 font-mono text-[10.5px] text-stone-300">
                    <div className="flex justify-between py-1.5 border-b border-stone-850/50">
                      <span>Inquiry Conversion Ratio</span>
                      <span className="text-stone-105 font-bold">48%</span>
                    </div>
                    <div className="flex justify-between py-1.5 border-b border-stone-850/50">
                      <span>Response Speed Rating</span>
                      <span className="text-emerald-400 font-bold">&lt; 15 mins</span>
                    </div>
                    <div className="flex justify-between py-1.5 border-b border-stone-850/50">
                      <span>Fleet Availability Ratio</span>
                      <span className="text-stone-105 font-bold">100% compliant</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

    </div>
  );
}
