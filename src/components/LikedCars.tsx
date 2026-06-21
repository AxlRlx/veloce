import React from 'react';
import { ChevronLeft, Heart, MessageSquare, X } from 'lucide-react';
import { Car, User, AppLanguage } from '../types';

interface LikedCarsProps {
  user: User;
  cars: Car[];
  language: AppLanguage;
  unit: 'mi' | 'km';
  setCurrentSection: (section: any) => void;
  AppSection: any;
  handleOpenChat: (car: Car) => void;
  setCheckoutCar: (car: Car) => void;
  handleLikedChange: (updatedLikedIds: string[]) => void;
}

export default function LikedCars({
  user,
  cars,
  language,
  unit,
  setCurrentSection,
  AppSection,
  handleOpenChat,
  setCheckoutCar,
  handleLikedChange,
}: LikedCarsProps) {
  const likedCars = cars.filter(c => user.likedCarIds.includes(c.id));

  return (
    <div className="flex-1 overflow-y-auto h-full w-full pr-1 scrollbar-thin">
      <div id="liked_portfolio_tab" className="max-w-4xl mx-auto px-4 py-4 space-y-6 flex flex-col">
        
        <button 
          onClick={() => setCurrentSection(AppSection.EXPLORE)}
          className="flex items-center text-stone-500 hover:text-stone-300 transition-colors cursor-pointer self-start mb-2"
          title="Back"
        >
          <ChevronLeft className="w-4 h-4" />
        </button>

        <div className="flex flex-col gap-1 border-b border-stone-900 pb-5 w-full">
          <h2 className="text-xl tracking-wider font-light uppercase text-stone-100 flex items-center gap-2">
            <Heart className="w-5 h-5 text-rose-500 fill-rose-500" />
            <span>Liked Cars ({user.likedCarIds.length})</span>
          </h2>
          <p className="text-xs text-stone-500 font-mono">
            Cars you swiped right on.
          </p>
        </div>

        {likedCars.length === 0 ? (
          <div className="bg-stone-950/40 border border-stone-900 p-12 rounded-3xl text-center w-full max-w-lg mx-auto">
            <Heart className="w-10 h-10 text-stone-700 mx-auto opacity-40 mb-3" />
            <p className="text-xs text-stone-500 max-w-sm mx-auto leading-relaxed">
              Your favorites list is empty. Go back to the swipe feed to find cars you like!
            </p>
            <button
              onClick={() => setCurrentSection(AppSection.EXPLORE)}
              className="mt-5 text-xs font-mono uppercase bg-stone-200 hover:bg-white text-stone-950 px-5 py-2.5 rounded-xl transition cursor-pointer"
            >
              Start Swiping
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 justify-center justify-items-center max-w-3xl mx-auto w-full">
            {likedCars.map(car => (
              <div
                key={car.id}
                id={`liked_portfolio_${car.id}`}
                className="w-full bg-[#0c0c0e] border border-stone-850 rounded-2xl overflow-hidden shadow-xl hover:border-stone-800 transition duration-300 animate-fade-in"
              >
                <div className="aspect-video w-full relative overflow-hidden group">
                  <img 
                    referrerPolicy="no-referrer" 
                    src={car.images[0]} 
                    alt={car.model} 
                    className="w-full h-full object-cover group-hover:scale-105 transition duration-500" 
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-stone-950 via-stone-950/25 to-transparent flex items-end p-4">
                    <div>
                      <span className="text-[9px] font-mono uppercase text-amber-500 tracking-wider">
                        {car.year} Specifications
                      </span>
                      <h3 className="text-base font-medium text-stone-100">{car.brand} {car.model}</h3>
                    </div>
                  </div>
                </div>

                <div className="p-4 space-y-3">
                  <div className="grid grid-cols-3 text-center gap-2 py-2 bg-stone-950 border border-stone-900 rounded-xl text-[10px] font-mono">
                    <div>
                      <span className="text-[8px] text-stone-500 block">POWER</span>
                      <span className="text-stone-300">{car.power} HP</span>
                    </div>
                    <div>
                      <span className="text-[8px] text-stone-500 block">0-100</span>
                      <span className="text-stone-300">{car.acceleration}</span>
                    </div>
                    <div>
                      <span className="text-[8px] text-stone-500 block">VELOCITY</span>
                      <span className="text-stone-300">
                        {unit === 'mi' ? `${Math.round(car.topSpeed * 0.621)} mph` : `${car.topSpeed} km/h`}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-1">
                    <div>
                      <span className="text-[8px] font-mono text-stone-500 block uppercase">Estimated Cost</span>
                      <span className="text-sm font-semibold font-mono text-stone-200">
                        ${car.price.toLocaleString()}
                        <span className="text-[10px] text-stone-500">{car.type === 'rent' ? '/day' : ''}</span>
                      </span>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleOpenChat(car)}
                        className="p-2.5 bg-stone-900 hover:bg-stone-850 text-stone-400 hover:text-stone-200 border border-stone-850 rounded-xl transition cursor-pointer"
                        title="Chat with Seller"
                      >
                        <MessageSquare className="w-4 h-4 text-blue-500" />
                      </button>

                      <button
                        onClick={() => setCheckoutCar(car)}
                        className="py-2.5 px-4 bg-stone-100 hover:bg-white text-stone-950 text-xs font-mono font-medium uppercase tracking-wider rounded-xl transition cursor-pointer"
                      >
                        {car.type === 'rent' ? 'Rent Now' : 'Buy Now'}
                      </button>

                      <button
                        onClick={() => {
                          const updated = user.likedCarIds.filter(id => id !== car.id);
                          handleLikedChange(updated);
                        }}
                        className="p-2.5 bg-stone-950 hover:bg-stone-900 border border-stone-900 hover:border-stone-800 rounded-xl text-stone-500 hover:text-rose-500 transition-colors cursor-pointer"
                        title="Dislike match"
                      >
                        <X className="w-4 h-4 text-stone-500" />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
