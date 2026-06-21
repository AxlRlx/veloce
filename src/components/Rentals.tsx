import React, { useState } from 'react';
import { motion } from 'motion/react';
import { ChevronLeft, Calendar, Compass, Landmark, X } from 'lucide-react';
import { Car, Booking, AppLanguage } from '../types';
import { DICTIONARY } from '../data';

interface RentalsProps {
  bookings: Booking[];
  cars: Car[];
  language: AppLanguage;
  unit: 'mi' | 'km';
  rentalsTabPart: 'bookings' | 'leaderboard';
  setRentalsTabPart: (tab: 'bookings' | 'leaderboard') => void;
  setCurrentSection: (section: any) => void;
  AppSection: any;
  handleExtendBooking: (bookingId: string) => Promise<void>;
  handleCancelBooking: (bookingId: string) => Promise<void>;
}

export default function Rentals({
  bookings,
  cars,
  language,
  rentalsTabPart,
  setRentalsTabPart,
  setCurrentSection,
  AppSection,
  handleExtendBooking,
  handleCancelBooking,
}: RentalsProps) {
  const [isProcessingId, setIsProcessingId] = useState<string | null>(null);

  const onExtend = async (bookingId: string) => {
    setIsProcessingId(bookingId);
    try {
      await handleExtendBooking(bookingId);
    } finally {
      setIsProcessingId(null);
    }
  };

  const onCancel = async (bookingId: string) => {
    setIsProcessingId(bookingId);
    try {
      await handleCancelBooking(bookingId);
    } finally {
      setIsProcessingId(null);
    }
  };

  return (
    <div className="flex-1 overflow-y-auto h-full w-full pr-1 scrollbar-thin">
      <div id="itineraries_list_tab" className="max-w-4xl mx-auto px-4 py-4 space-y-6 animate-fade-in flex flex-col">
        
        <button 
          onClick={() => setCurrentSection(AppSection.EXPLORE)}
          className="flex items-center text-stone-500 hover:text-stone-300 transition-colors cursor-pointer self-start mb-2"
          title="Back"
        >
          <ChevronLeft className="w-4 h-4" />
        </button>

        <div className="flex flex-col gap-1 border-b border-stone-900 pb-5">
          <h2 className="text-xl tracking-wider font-light uppercase text-stone-100 flex items-center gap-2">
            <Calendar className="w-5 h-5 text-emerald-500" />
            <span>Your Rentals</span>
          </h2>
          <p className="text-xs text-stone-500 font-mono">
            Slide between your active bookings and top performer platform leaderboards below.
          </p>
        </div>

        {/* Sliding segment selector */}
        <div className="flex justify-center pb-2">
          <div className="relative flex p-1 bg-stone-950 rounded-2xl border border-stone-850/80 w-full max-w-md">
            {/* Active Background Pill slide effect */}
            <div
              className="absolute top-1 bottom-1 rounded-xl bg-stone-900 border border-stone-800 transition-all duration-300 ease-out"
              style={{
                left: rentalsTabPart === 'bookings' ? '4px' : 'calc(50% + 2px)',
                width: 'calc(50% - 6px)',
              }}
            />
            <button
              type="button"
              id="view_bookings_part_btn"
              onClick={() => setRentalsTabPart('bookings')}
              className={`relative z-10 w-1/2 py-2.5 text-center text-[9px] xs:text-[10px] sm:text-[10.5px] font-mono font-bold uppercase tracking-tight xs:tracking-wider transition-colors duration-200 cursor-pointer ${
                rentalsTabPart === 'bookings' ? 'text-emerald-400' : 'text-stone-500 hover:text-stone-300'
              }`}
            >
              Active Bookings ({bookings.length})
            </button>
            <button
              type="button"
              id="view_leaderboard_part_btn"
              onClick={() => setRentalsTabPart('leaderboard')}
              className={`relative z-10 w-1/2 py-2.5 text-center text-[9px] xs:text-[10px] sm:text-[10.5px] font-mono font-bold uppercase tracking-tight xs:tracking-wider transition-colors duration-200 cursor-pointer ${
                rentalsTabPart === 'leaderboard' ? 'text-amber-400' : 'text-stone-500 hover:text-stone-300'
              }`}
            >
              Leaderboards
            </button>
          </div>
        </div>

        {rentalsTabPart === 'bookings' ? (
          <>
            {bookings.length === 0 ? (
              <div id="no_trips_state" className="bg-stone-950/40 p-12 rounded-3xl border border-stone-900 text-center">
                <Compass className="w-10 h-10 text-stone-700 mx-auto opacity-40 mb-3" />
                <p className="text-xs text-stone-500 max-w-sm mx-auto leading-relaxed">
                  You do not have any active bookings at the moment. Swipe right on the Explore tab to find and reserve your next ride!
                </p>
                <button
                  onClick={() => setCurrentSection(AppSection.EXPLORE)}
                  className="mt-5 text-xs font-mono uppercase bg-stone-200 hover:bg-white text-stone-950 px-5 py-2.5 rounded-xl transition cursor-pointer"
                >
                  Browse Cars
                </button>
              </div>
            ) : (
              <div className="space-y-4">
                {bookings.map(book => {
                  const correlatedCar = cars.find(c => c.id === book.carId);
                  if (!correlatedCar) return null;

                  return (
                    <div
                      key={book.id}
                      id={`booking_card_${book.id}`}
                      className="bg-[#0c0c0e] border border-stone-850 rounded-2xl p-6 md:p-8 grid grid-cols-1 md:grid-cols-12 gap-6"
                    >
                      {/* Car Details */}
                      <div className="md:col-span-4 space-y-2.5">
                        <div className="aspect-video w-full rounded-xl overflow-hidden border border-stone-850">
                          <img 
                            referrerPolicy="no-referrer" 
                            src={correlatedCar.images[0]} 
                            alt={correlatedCar.model} 
                            className="w-full h-full object-cover" 
                          />
                        </div>
                        <div>
                          <h4 className="text-sm font-semibold text-stone-200">
                            {correlatedCar.brand} {correlatedCar.model}
                          </h4>
                          <p className="text-[10px] text-stone-500 font-mono flex items-center gap-1 mt-0.5">
                            <Landmark className="w-2.5 h-2.5 text-amber-550" />
                            {book.pickupLocation}
                          </p>
                        </div>
                      </div>

                      {/* Itinerary tracking progress */}
                      <div className="md:col-span-5 space-y-4">
                        <div className="space-y-1">
                          <span className="text-[8px] font-mono uppercase text-stone-500 tracking-wider font-bold">
                            Lease Engagement Term
                          </span>
                          <p className="text-xs text-stone-300 font-medium font-mono">
                            {book.startDate} <span className="text-stone-600 font-sans">to</span> {book.endDate}
                          </p>
                        </div>

                        {/* High-end luxury GPS waypoint detail */}
                        <div className="p-3 bg-stone-950 border border-stone-900/60 rounded-xl space-y-1 text-[10px] font-mono leading-tight text-stone-400">
                          <div className="flex items-center gap-1.5 text-stone-500">
                            <Compass className="w-3.5 h-3.5 text-amber-500" />
                            <span className="uppercase text-[9px] font-bold">BOOKING DETAILS</span>
                          </div>
                          <p className="mt-1">Seller: <span className="text-stone-300">{correlatedCar.dealerName}</span></p>
                          <p>Mileage: <span className="text-stone-300">Unlimited miles included</span></p>
                          <p>Status: <span className="text-stone-300">Serviced & clean</span></p>
                        </div>
                      </div>

                      {/* Operations and costs */}
                      <div className="md:col-span-3 flex flex-col justify-between items-end text-right">
                        <div className="space-y-1.5">
                          <span className="inline-flex items-center gap-1 text-[8px] font-mono tracking-widest text-[#006B4F] bg-[#006B4F]/10 border border-[#006B4F]/20 px-2 py-0.5 rounded uppercase font-semibold">
                            Liability: {book.insuranceType.toUpperCase()}
                          </span>
                          <span className="text-lg font-mono font-bold text-stone-200 block">
                            ${book.totalPrice.toLocaleString()}
                          </span>
                        </div>

                        <div className="flex flex-col gap-2 items-end w-full">
                          <button
                            id={`extend_booking_trigger_${book.id}`}
                            onClick={() => onExtend(book.id)}
                            disabled={isProcessingId === book.id}
                            className="w-full text-center text-[9.5px] font-mono uppercase bg-stone-900 hover:bg-stone-850 hover:text-amber-500 border border-stone-800 text-stone-300 py-1.5 px-3 rounded-lg transition cursor-pointer disabled:opacity-50"
                          >
                            {isProcessingId === book.id ? 'Processing...' : 'Extend Rental (+3 Days)'}
                          </button>
                          
                          <button
                            id={`cancel_booking_${book.id}`}
                            onClick={() => onCancel(book.id)}
                            disabled={isProcessingId === book.id}
                            className="text-[9px] font-mono uppercase text-red-400 hover:text-red-300 transition cursor-pointer disabled:opacity-50"
                          >
                            {isProcessingId === book.id ? 'Ending...' : 'Cancel Booking'}
                          </button>
                        </div>
                      </div>

                    </div>
                  );
                })}
              </div>
            )}
          </>
        ) : (
          /* Modern Apple-style leaderboards (placed second) */
          <div id="leaderboards_bento_grid" className="grid grid-cols-1 md:grid-cols-2 gap-8 bg-stone-950/40 p-8 md:p-10 rounded-3xl border border-stone-900 animate-fade-in">
            {/* Column 1: Most Popular Rentals (Vehicles) */}
            <div className="space-y-4">
              <div className="border-b border-stone-850 pb-2">
                <h3 className="text-xs font-mono uppercase tracking-widest text-amber-500 font-bold">
                  Most Rented Vehicles
                </h3>
                <p className="text-[10px] text-stone-500 font-sans mt-0.5">
                  Top active listings by overall lease volume.
                </p>
              </div>
              <div className="space-y-2">
                {[
                  { rank: 1, name: 'Porsche 911 GT3 RS', count: 184, img: 'https://images.unsplash.com/photo-1614162692292-7ac56d7f7f1e?q=80&w=120' },
                  { rank: 2, name: 'Ferrari 296 GTB', count: 142, img: 'https://images.unsplash.com/photo-1583121274602-3e2820c69888?q=80&w=120' },
                  { rank: 3, name: 'Toyota GR Supra', count: 119, img: 'https://images.unsplash.com/photo-1617814076367-b759c7d7e738?q=80&w=120' }
                ].map(item => (
                  <div key={item.rank} className="flex items-center justify-between gap-3 p-3 sm:p-3.5 md:p-4 bg-stone-900/30 rounded-xl border border-stone-850/60 font-sans min-w-0">
                    <div className="flex items-center gap-2 sm:gap-3 min-w-0">
                      <span className="text-[10px] sm:text-xs font-mono font-bold text-stone-500 w-4 shrink-0">{item.rank}</span>
                      <img referrerPolicy="no-referrer" src={item.img} className="w-10 h-7 object-cover rounded border border-stone-800 shrink-0" alt={item.name} />
                      <span className="text-[11px] sm:text-xs font-medium text-stone-200 truncate pr-1">{item.name}</span>
                    </div>
                    <span className="text-[10px] sm:text-xs font-mono text-stone-400 font-semibold shrink-0 whitespace-nowrap text-right">{item.count} sessions</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Column 2: Top Rented Out (Sellers) */}
            <div className="space-y-4">
              <div className="border-b border-stone-850 pb-2">
                <h3 className="text-xs font-mono uppercase tracking-widest text-stone-300 font-bold">
                  Top Performing Sellers
                </h3>
                <p className="text-[10px] text-stone-500 font-sans mt-0.5">
                  Top dealer and standard profiles with completed rentals.
                </p>
              </div>
              <div className="space-y-2">
                {[
                  { rank: 1, name: 'Official Veloce Importers', count: 294, avatar: 'https://images.unsplash.com/photo-1560250097-0b93528c311a?q=80&w=120' },
                  { rank: 2, name: 'Scuderia Club West', count: 215, avatar: 'https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?q=80&w=120' },
                  { rank: 3, name: 'Alex\'s Track Prep', count: 168, avatar: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?q=80&w=120' }
                ].map(item => (
                  <div key={item.rank} className="flex items-center justify-between gap-3 p-3 sm:p-3.5 md:p-4 bg-stone-900/30 rounded-xl border border-stone-850/60 font-sans min-w-0">
                    <div className="flex items-center gap-2 sm:gap-3 min-w-0">
                      <span className="text-[10px] sm:text-xs font-mono font-bold text-stone-500 w-4 shrink-0">{item.rank}</span>
                      <img referrerPolicy="no-referrer" src={item.avatar} className="w-7 h-7 object-cover rounded-full border border-stone-800 shrink-0" alt={item.name} />
                      <span className="text-[11px] sm:text-xs font-medium text-stone-200 truncate pr-1">{item.name}</span>
                    </div>
                    <span className="text-[10px] sm:text-xs font-mono text-stone-400 font-semibold shrink-0 whitespace-nowrap text-right">{item.count} deals</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
