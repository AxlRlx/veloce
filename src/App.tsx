import { useState, useEffect } from 'react';
import { User, Car, Booking, ChatSession, ChatMessage, AppLanguage, AppSection } from './types';
import { CARS_DATA, DICTIONARY } from './data';
import Auth from './components/Auth';
import Swiper from './components/Swiper';
import Dashboard from './components/Dashboard';
import Chat from './components/Chat';
import PaymentModal from './components/PaymentModal';
import Community from './components/Community';
import { motion, AnimatePresence } from 'motion/react';
import { Globe, Compass, MessageSquare, Heart, ShieldAlert, Award, Grid, Menu, X, Landmark, Shield, User as UserIcon, Calendar, Users, Sliders, ChevronLeft, Check, Sparkles, CreditCard } from 'lucide-react';
import MyFleet from './components/MyFleet';
import SubscriptionCheckout from './components/SubscriptionCheckout';
import { auth } from './lib/firebase.ts';

export default function App() {
  // Current logged in user context
  const [user, setUser] = useState<User | null>(() => {
    const cached = localStorage.getItem('veloce_user');
    return cached ? JSON.parse(cached) : null;
  });

  // Track real-time Firebase Auth session and synchronize profile details
  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged(async (firebaseUser) => {
      if (firebaseUser) {
        try {
          const token = await firebaseUser.getIdToken();
          const response = await fetch('/api/auth/profile', {
            headers: {
              'Authorization': `Bearer ${token}`
            }
          });
          if (response.ok) {
            const syncedProfile = await response.json();
            setUser({
              id: syncedProfile.id,
              name: syncedProfile.fullName || 'Anonymous Driver',
              email: syncedProfile.email,
              avatar: syncedProfile.avatarUrl || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?q=80&w=150',
              role: syncedProfile.role,
              likedCarIds: [],
              savedCarIds: [],
              subscriptionTier: syncedProfile.subscriptionTier,
              kycStatus: syncedProfile.kycStatus,
              isKycVerified: syncedProfile.kycStatus === 'verified'
            });
          }
        } catch (err) {
          console.error("Failed to restore synchronized profile from backend:", err);
        }
      } else {
        setUser(null);
      }
    });

    return () => unsubscribe();
  }, []);

  // Master cars list
  const [cars, setCars] = useState<Car[]>(() => {
    const cached = localStorage.getItem('veloce_cars');
    return cached ? JSON.parse(cached) : CARS_DATA;
  });

  // Language selectors
  const [language, setLanguage] = useState<AppLanguage>(() => {
    const cached = localStorage.getItem('veloce_lang');
    return (cached as AppLanguage) || AppLanguage.EN;
  });

  // Metric Preference Setting (mi or km)
  const [unit, setUnit] = useState<'mi' | 'km'>(() => {
    const cached = localStorage.getItem('veloce_unit');
    return (cached as 'mi' | 'km') || 'mi';
  });

  // Geolocation maximum distance filter preference in miles/km
  const [maxDistance, setMaxDistance] = useState<number>(() => {
    const cached = localStorage.getItem('veloce_max_distance');
    return cached ? parseInt(cached, 10) : 50;
  });

  const handleMaxDistanceChange = (val: number) => {
    setMaxDistance(val);
    localStorage.setItem('veloce_max_distance', val.toString());
  };

  // Visual Theme Style Mode (Hardcoded to dark as requested)
  const [theme] = useState<'light' | 'dark'>('dark');

  // Current screen segment view
  const [currentSection, setCurrentSection] = useState<AppSection>(AppSection.EXPLORE);

  // Rentals active subsegment slider state (Active Bookings vs Leaderboard)
  const [rentalsTabPart, setRentalsTabPart] = useState<'bookings' | 'leaderboard'>('bookings');

  // Users active bookings
  const [bookings, setBookings] = useState<Booking[]>(() => {
    const cached = localStorage.getItem('veloce_bookings');
    return cached ? JSON.parse(cached) : [];
  });

  // Chat Sessions
  const [chatSessions, setChatSessions] = useState<ChatSession[]>([]);
  const [selectedSessionId, setSelectedSessionId] = useState<string | null>(null);

  // Open Checkout Drawer Trigger
  const [checkoutCar, setCheckoutCar] = useState<Car | null>(null);
  const [showKycRequiredModal, setShowKycRequiredModal] = useState(false);
  const [pendingRentCar, setPendingRentCar] = useState<Car | null>(null);
  const [showKycModal, setShowKycModal] = useState(false);
  const [showUpgradeTarget, setShowUpgradeTarget] = useState<'veloce' | 'dealer' | null>(null);
  const [checkoutSessionId, setCheckoutSessionId] = useState<string | null>(null);

  // Sidebar active toggle on mobile layout
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Fetch registered vehicle listings from database node backend endpoint
  const [isLoadingVehicles, setIsLoadingVehicles] = useState(false);
  const [vehiclesError, setVehiclesError] = useState<string | null>(null);

  const fetchVehicles = async () => {
    setIsLoadingVehicles(true);
    setVehiclesError(null);
    try {
      const headersKey: Record<string, string> = {};
      if (auth.currentUser) {
        const token = await auth.currentUser.getIdToken();
        headersKey['Authorization'] = `Bearer ${token}`;
      }
      const response = await fetch('/api/vehicles', {
        headers: headersKey
      });
      if (!response.ok) {
        throw new Error('Could not retrieve vehicle list from Veloce cloud database.');
      }
      const data = await response.json();
      setCars(data);
    } catch (err: any) {
      console.error("Veloce DB connection issue:", err);
      setVehiclesError(err.message || 'Unable to communicate with the database.');
    } finally {
      setIsLoadingVehicles(false);
    }
  };

  const fetchBookings = async () => {
    if (!user) {
      setBookings([]);
      return;
    }
    try {
      let token = "";
      if (auth.currentUser) {
        token = await auth.currentUser.getIdToken();
      }
      const response = await fetch('/api/bookings', {
        headers: token ? { 'Authorization': `Bearer ${token}` } : {}
      });
      if (response.ok) {
        const data = await response.json();
        setBookings(data);
      }
    } catch (err) {
      console.error("Failed to fetch user bookings:", err);
    }
  };

  useEffect(() => {
    fetchVehicles();
    fetchBookings();
  }, [user]);

  // Retrieve user chats dynamically from PostgreSQL backend server
  useEffect(() => {
    const fetchChats = async () => {
      if (!user) return;
      try {
        let token = "";
        if (auth.currentUser) {
          token = await auth.currentUser.getIdToken();
        }
        const response = await fetch('/api/chats', {
          headers: {
            ...(token ? { 'Authorization': `Bearer ${token}` } : {})
          }
        });
        if (response.ok) {
          const chatsList = await response.json();
          setChatSessions(chatsList);
        }
      } catch (err) {
        console.error("Failed to fetch conversations from server:", err);
      }
    };

    fetchChats();
    // Poll for updates to simulate real-time replies
    const pollInterval = setInterval(fetchChats, 7500);
    return () => clearInterval(pollInterval);
  }, [user]);

  // Persist storage whenever collections shift
  useEffect(() => {
    localStorage.setItem('veloce_cars', JSON.stringify(cars));
  }, [cars]);

  useEffect(() => {
    localStorage.setItem('veloce_bookings', JSON.stringify(bookings));
  }, [bookings]);

  useEffect(() => {
    if (user) {
      localStorage.setItem('veloce_user', JSON.stringify(user));
    } else {
      localStorage.removeItem('veloce_user');
    }
  }, [user]);

  useEffect(() => {
    localStorage.setItem('veloce_lang', language);
  }, [language]);

  useEffect(() => {
    localStorage.setItem('veloce_unit', unit);
  }, [unit]);

  const handleLogin = (newUser: User) => {
    setUser(newUser);
    setCurrentSection(AppSection.EXPLORE);
  };

  const handleLogout = async () => {
    try {
      await auth.signOut();
    } catch (err) {
      console.error("Firebase signOut failed:", err);
    }
    setUser(null);
    setCurrentSection(AppSection.EXPLORE);
  };

  const handleUserUpdate = async (updatedUser: User) => {
    setUser(updatedUser);
    localStorage.setItem('veloce_user', JSON.stringify(updatedUser));
    try {
      if (auth.currentUser) {
        const token = await auth.currentUser.getIdToken();
        await fetch('/api/auth/profile', {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({
            name: updatedUser.name,
            avatar: updatedUser.avatar,
            role: updatedUser.role,
            subscriptionTier: updatedUser.subscriptionTier,
            kycStatus: updatedUser.kycStatus
          })
        });
      }
    } catch (err) {
      console.error("Failed to sync profile update on backend server:", err);
    }
  };

  const handleInstantUpgrade = async (tier: 'veloce_gt' | 'dealer_paid') => {
    if (!user) {
      alert("Please login first to upgrade your subscription.");
      return;
    }

    try {
      let token = "";
      if (auth.currentUser) {
        token = await auth.currentUser.getIdToken();
      }

      const response = await fetch('/api/billing/create-checkout-session', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { 'Authorization': `Bearer ${token}` } : {})
        },
        body: JSON.stringify({ tier })
      });

      if (!response.ok) {
        throw new Error("Failed to initialize secure billing session with Stripe Sandbox.");
      }

      const resData = await response.json();
      if (resData.success && resData.sessionId) {
        setCheckoutSessionId(resData.sessionId);
        setShowUpgradeTarget(null);
      }
    } catch (err: any) {
      console.error("Billing checkout initiation failed:", err);
      alert(err.message || "Unable to open billing portal. Please check connection.");
    }
  };

  const handleCheckoutSuccess = (updatedProfile: any) => {
    // update current local user state
    const updatedUser: User = {
      ...user!,
      subscriptionTier: updatedProfile.subscriptionTier,
      role: updatedProfile.role
    };
    setUser(updatedUser);
    localStorage.setItem('veloce_user', JSON.stringify(updatedUser));

    // update accounts database in localStorage
    const dbStr = localStorage.getItem('veloce_accounts_db');
    if (dbStr) {
      const db = JSON.parse(dbStr);
      const index = db.findIndex((u: any) => u.email === user!.email);
      if (index !== -1) {
        db[index].subscriptionTier = updatedProfile.subscriptionTier;
        db[index].role = updatedProfile.role;
        localStorage.setItem('veloce_accounts_db', JSON.stringify(db));
      }
    }

    setCheckoutSessionId(null);
  };

  const handleCancelSubscription = async () => {
    if (!user) return;
    if (!window.confirm("Are you sure you want to cancel your active subscription? This will immediately reset your limits back to standard free tiers.")) {
      return;
    }

    try {
      let token = "";
      if (auth.currentUser) {
        token = await auth.currentUser.getIdToken();
      }

      const response = await fetch('/api/billing/cancel-subscription', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { 'Authorization': `Bearer ${token}` } : {})
        }
      });

      if (!response.ok) {
        throw new Error("Failed to process subscription cancellation on the server.");
      }

      const data = await response.json();
      
      // Update local states
      const updatedUser: User = {
        ...user!,
        subscriptionTier: data.profile.subscriptionTier,
        role: data.profile.role
      };
      setUser(updatedUser);
      localStorage.setItem('veloce_user', JSON.stringify(updatedUser));

      // Backup localStorage sync
      const dbStr = localStorage.getItem('veloce_accounts_db');
      if (dbStr) {
        const db = JSON.parse(dbStr);
        const index = db.findIndex((u: any) => u.email === user!.email);
        if (index !== -1) {
          db[index].subscriptionTier = data.profile.subscriptionTier;
          db[index].role = data.profile.role;
          localStorage.setItem('veloce_accounts_db', JSON.stringify(db));
        }
      }

      alert("Your subscription has been safely cancelled. Welcome back to our standard free tier!");
    } catch (err: any) {
      console.error("Cancel plan failed:", err);
      alert(err.message || "Unable to cancel active subscription right now. Try again later.");
    }
  };

  const handleLikedChange = (updatedLikedIds: string[]) => {
    if (!user) return;
    
    // Limit free user saved/liked cars to 25 (Exempt dealers since they have premium perks)
    const isFree = (!user.subscriptionTier || user.subscriptionTier === 'free') && user.role !== 'dealer';
    if (isFree && updatedLikedIds.length > 25) {
      alert("Match Save Limit Reached! Free plans can standardly save up to 25 cars. Upgrade to Veloce GT to unlock unlimited saves.");
      setCurrentSection(AppSection.PROFILE);
      return;
    }

    const updatedUser = { ...user, likedCarIds: updatedLikedIds };
    setUser(updatedUser);
  };

  const handleFollowToggle = (sellerId: string) => {
    if (!user) return;
    const currentFollowing = user.followingUserIds || [];
    const updatedFollowing = currentFollowing.includes(sellerId)
      ? currentFollowing.filter(id => id !== sellerId)
      : [...currentFollowing, sellerId];
    
    setUser({
      ...user,
      followingUserIds: updatedFollowing
    });
  };

  const handleAddNewCar = async (newCar: Car) => {
    try {
      let token = "";
      if (auth.currentUser) {
        token = await auth.currentUser.getIdToken();
      }
      const response = await fetch('/api/vehicles', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { 'Authorization': `Bearer ${token}` } : {})
        },
        body: JSON.stringify({
          brand: newCar.brand,
          make: newCar.brand,
          model: newCar.model,
          year: newCar.year,
          price: newCar.type === 'rent' ? 0 : newCar.price,
          rentalPriceDaily: newCar.price, // or whichever was set
          type: newCar.type,
          location: newCar.location || 'Beverly Hills, CA',
          description: newCar.description,
          mileage: newCar.mileage || 500,
          transmission: newCar.transmission || 'Automatic',
          displacement: newCar.displacement || 'Petrol',
          power: newCar.power || 400,
          category: newCar.category || 'car',
          images: newCar.images,
          status: newCar.status || 'draft'
        })
      });
      if (!response.ok) {
        throw new Error('Database registry server execution failed.');
      }
      const savedCar = await response.json();
      setCars(prev => [savedCar, ...prev]);
    } catch (err: any) {
      console.error("Failed to add car dynamically:", err);
      alert("Error adding vehicle to database: " + err.message);
    }
  };

  const handleUpdateCar = async (updatedCar: Car) => {
    try {
      let token = "";
      if (auth.currentUser) {
        token = await auth.currentUser.getIdToken();
      }
      const response = await fetch(`/api/vehicles/${updatedCar.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { 'Authorization': `Bearer ${token}` } : {})
        },
        body: JSON.stringify({
          brand: updatedCar.brand,
          model: updatedCar.model,
          year: updatedCar.year,
          price: updatedCar.type === 'rent' ? 0 : updatedCar.price,
          rentalPriceDaily: updatedCar.price,
          type: updatedCar.type,
          location: updatedCar.location,
          description: updatedCar.description,
          mileage: updatedCar.mileage,
          transmission: updatedCar.transmission,
          displacement: updatedCar.displacement,
          power: updatedCar.power,
          category: updatedCar.category,
          images: updatedCar.images,
          status: updatedCar.status
        })
      });
      if (!response.ok) {
        throw new Error('Database update server execution failed.');
      }
      const saved = await response.json();
      setCars(prev => prev.map(c => c.id === saved.id ? saved : c));
    } catch (err: any) {
      console.error("Failed to update car:", err);
      alert("Error updating vehicle: " + err.message);
    }
  };

  const handleDeleteCar = async (carId: string) => {
    if (!window.confirm("Are you sure you want to permanently delete this listing from your fleet database?")) {
      return;
    }
    try {
      let token = "";
      if (auth.currentUser) {
        token = await auth.currentUser.getIdToken();
      }
      const response = await fetch(`/api/vehicles/${carId}`, {
        method: 'DELETE',
        headers: {
          ...(token ? { 'Authorization': `Bearer ${token}` } : {})
        }
      });
      if (!response.ok) {
        throw new Error('Database removal server execution failed.');
      }
      setCars(prev => prev.filter(c => c.id !== carId));
    } catch (err: any) {
      console.error("Failed to delete car:", err);
      alert("Error deleting vehicle: " + err.message);
    }
  };

  const handleCancelBooking = async (bookingId: string) => {
    if (!window.confirm("Are you sure you want to cancel this booking and delete it from your records?")) {
      return;
    }
    try {
      let token = "";
      if (auth.currentUser) {
        token = await auth.currentUser.getIdToken();
      }
      const response = await fetch(`/api/bookings/${bookingId}/cancel`, {
        method: 'PUT',
        headers: {
          ...(token ? { 'Authorization': `Bearer ${token}` } : {})
        }
      });
      if (!response.ok) {
        throw new Error('Database booking update failed.');
      }
      setBookings(prev => prev.filter(b => b.id !== bookingId));
    } catch (err: any) {
      console.error("Cancel booking error:", err);
      alert("Failed to cancel trip: " + err.message);
    }
  };

  const handleExtendBooking = async (bookingId: string) => {
    try {
      let token = "";
      if (auth.currentUser) {
        token = await auth.currentUser.getIdToken();
      }
      const response = await fetch(`/api/bookings/${bookingId}/extend`, {
        method: 'PUT',
        headers: {
          ...(token ? { 'Authorization': `Bearer ${token}` } : {})
        }
      });
      if (!response.ok) {
        throw new Error('Database extension update failed.');
      }
      const updated = await response.json();
      setBookings(prev => prev.map(b => b.id === bookingId ? updated : b));
    } catch (err: any) {
      console.error("Extend booking error:", err);
      alert("Failed to extend trip: " + err.message);
    }
  };

  const handleBookingSuccess = async (newBooking: Booking) => {
    try {
      let token = "";
      if (auth.currentUser) {
        token = await auth.currentUser.getIdToken();
      }
      const response = await fetch('/api/bookings', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { 'Authorization': `Bearer ${token}` } : {})
        },
        body: JSON.stringify(newBooking)
      });
      if (!response.ok) {
        throw new Error('Database was unable to persist reservation details.');
      }
      const saved = await response.json();
      setBookings(prev => [saved, ...prev]);
    } catch (err: any) {
      console.error("Failed to persist booking, fallback to local state:", err);
      setBookings(prev => [newBooking, ...prev]);
    }
    setCurrentSection(AppSection.RENTALS);
  };

  // Launch direct Messenger workflow
  const handleOpenChat = async (car: Car) => {
    if (!user) return;

    const existingSession = chatSessions.find(s => s.carId === car.id);
    if (existingSession) {
      setSelectedSessionId(existingSession.id);
      setCurrentSection(AppSection.INBOX);
    } else {
      try {
        let token = "";
        if (auth.currentUser) {
          token = await auth.currentUser.getIdToken();
        }
        const response = await fetch('/api/chats', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...(token ? { 'Authorization': `Bearer ${token}` } : {})
          },
          body: JSON.stringify({
            vehicleId: car.id,
            dealerId: car.dealerId
          })
        });

        if (response.ok) {
          const resData = await response.json();
          const chatRes = await fetch('/api/chats', {
            headers: {
              ...(token ? { 'Authorization': `Bearer ${token}` } : {})
            }
          });
          if (chatRes.ok) {
            const list = await chatRes.json();
            setChatSessions(list);
            setSelectedSessionId(resData.id);
          }
        }
      } catch (err) {
        console.error("Failed to start server conversation:", err);
      }
      setCurrentSection(AppSection.INBOX);
    }
  };

  const handleSendMessage = async (sessionId: string, text: string) => {
    if (!user) return;

    try {
      let token = "";
      if (auth.currentUser) {
        token = await auth.currentUser.getIdToken();
      }

      const response = await fetch(`/api/chats/${sessionId}/messages`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { 'Authorization': `Bearer ${token}` } : {})
        },
        body: JSON.stringify({ text })
      });

      if (response.ok) {
        const newMsg = await response.json();
        setChatSessions(prev =>
          prev.map(sess => {
            if (sess.id === sessionId) {
              return {
                ...sess,
                lastMessage: text,
                timestamp: 'Just Now',
                messages: [...sess.messages, newMsg]
              };
            }
            return sess;
          })
        );
      }
    } catch (err) {
      console.error("Failed to deliver message to server:", err);
    }
  };

  const handleReceiveSystemReply = async (sessionId: string, text: string) => {
    if (!user) return;

    try {
      let token = "";
      if (auth.currentUser) {
        token = await auth.currentUser.getIdToken();
      }

      const response = await fetch(`/api/chats/${sessionId}/simulate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { 'Authorization': `Bearer ${token}` } : {})
        },
        body: JSON.stringify({ text })
      });

      if (response.ok) {
        const incomingMsg = await response.json();
        setChatSessions(prev =>
          prev.map(sess => {
            if (sess.id === sessionId) {
              return {
                ...sess,
                lastMessage: text,
                unread: true,
                timestamp: 'Just Now',
                messages: [...sess.messages, incomingMsg]
              };
            }
            return sess;
          })
        );
      }
    } catch (err) {
      console.error("Failed to simulate dealer auto reply on server:", err);
    }
  };

  const handleSelectSession = async (id: string | null) => {
    setSelectedSessionId(id);
    if (!id) return;
    const updated = chatSessions.map(sess => {
      if (sess.id === id) {
        return { ...sess, unread: false };
      }
      return sess;
    });
    setChatSessions(updated);

    try {
      let token = "";
      if (auth.currentUser) {
        token = await auth.currentUser.getIdToken();
      }
      await fetch(`/api/chats/${id}/read`, {
        method: 'PUT',
        headers: {
          ...(token ? { 'Authorization': `Bearer ${token}` } : {})
        }
      });
    } catch (err) {
      console.error("Failed to mark session as read on server:", err);
    }
  };

  const handleTriggerRentCheck = (car: Car) => {
    const isFree = (!user || !user.subscriptionTier || user.subscriptionTier === 'free') && user?.role !== 'dealer';
    if (isFree && bookings.length >= 1) {
      alert("Standard Free accounts are limited to a single (1) active rental booking. Upgrade your tier in the Profile tab to unlock unlimited rides!");
      setCurrentSection(AppSection.PROFILE);
      return;
    }
    if (car.type === 'rent' && !user?.isKycVerified) {
      setPendingRentCar(car);
      setShowKycRequiredModal(true);
    } else {
      setCheckoutCar(car);
    }
  };

  const t = DICTIONARY[language];

  // If user is not authenticated, render login panel
  if (!user) {
    return <Auth onLogin={handleLogin} language={language} />;
  }

  return (
    <div id="veloce_root_element" className="h-screen w-screen flex flex-col font-sans overflow-hidden bg-[#050507] text-stone-100 select-none">

      {/* Application Screens Core Router layout - Full viewport on Explore, typical padding elsewhere */}
      <main id="app_main_container" className={`flex-1 w-full overflow-hidden relative z-10 flex flex-col ${
        currentSection === AppSection.EXPLORE ? 'p-0 max-w-none' : 
        currentSection === AppSection.MY_FLEET ? 'max-w-7xl mx-auto pt-1 px-4 pb-4' : 'max-w-7xl mx-auto p-4'
      }`}>
        <AnimatePresence mode="wait">
          <motion.div
            key={currentSection}
            initial={{ opacity: 0, y: 5 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -5 }}
            transition={{ duration: 0.25 }}
            className="w-full h-full"
          >
            {currentSection === AppSection.EXPLORE && (
              <Swiper
                cars={cars}
                likedCarIds={user.likedCarIds}
                language={language}
                onLikedChange={handleLikedChange}
                onRequestRent={handleTriggerRentCheck}
                onOpenChat={handleOpenChat}
                unit={unit}
                onUnitChange={setUnit}
                onLanguageChange={setLanguage}
                currentUser={user}
                onFollowToggle={handleFollowToggle}
                theme={theme}
              />
            )}

            {currentSection === AppSection.RENTALS && (
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
                          className="mt-5 text-xs font-mono uppercase bg-stone-200 hover:bg-white text-stone-950 px-5 py-2.5 rounded-xl transition"
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
                              {/* Car Details inside order */}
                              <div className="md:col-span-4 space-y-2.5">
                                <div className="aspect-video w-full rounded-xl overflow-hidden border border-stone-850">
                                  <img referrerPolicy="no-referrer" src={correlatedCar.images[0]} alt={correlatedCar.model} className="w-full h-full object-cover" />
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
                                    onClick={() => handleExtendBooking(book.id)}
                                    className="w-full text-center text-[9.5px] font-mono uppercase bg-stone-900 hover:bg-stone-850 hover:text-amber-500 border border-stone-800 text-stone-300 py-1.5 px-3 rounded-lg transition cursor-pointer"
                                  >
                                    Extend Rental (+3 Days)
                                  </button>
                                  
                                  <button
                                    id={`cancel_booking_${book.id}`}
                                    onClick={() => handleCancelBooking(book.id)}
                                    className="text-[9px] font-mono uppercase text-red-400 hover:text-red-300 transition cursor-pointer"
                                  >
                                    Cancel Booking
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
            )}

            {currentSection === AppSection.LIKED && (
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

                {user.likedCarIds.length === 0 ? (
                  <div className="bg-stone-950/40 border border-stone-900 p-12 rounded-3xl text-center">
                    <Heart className="w-10 h-10 text-stone-700 mx-auto opacity-40 mb-3" />
                    <p className="text-xs text-stone-500 max-w-sm mx-auto leading-relaxed">
                      Your favorites list is empty. Go back to the swipe feed to find cars you like!
                    </p>
                    <button
                      onClick={() => setCurrentSection(AppSection.EXPLORE)}
                      className="mt-5 text-xs font-mono uppercase bg-stone-200 hover:bg-white text-stone-950 px-5 py-2.5 rounded-xl transition"
                    >
                      Start Swiping
                    </button>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6 justify-center justify-items-center max-w-3xl mx-auto w-full">
                    {cars
                      .filter(c => user.likedCarIds.includes(c.id))
                      .map(car => (
                        <div
                          key={car.id}
                          id={`liked_portfolio_${car.id}`}
                          className="w-full bg-[#0c0c0e] border border-stone-850 rounded-2xl overflow-hidden shadow-xl hover:border-stone-800 transition duration-300"
                        >
                          <div className="aspect-video w-full relative overflow-hidden group">
                            <img referrerPolicy="no-referrer" src={car.images[0]} alt={car.model} className="w-full h-full object-cover group-hover:scale-105 transition duration-500" />
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
                                  className="p-2.5 bg-stone-900 hover:bg-stone-800 text-stone-400 hover:text-stone-200 border border-stone-850 rounded-xl transition"
                                  title="Chat with Seller"
                                >
                                  <MessageSquare className="w-4 h-4 text-blue-500" />
                                </button>

                                <button
                                  onClick={() => setCheckoutCar(car)}
                                  className="py-2.5 px-4 bg-stone-100 hover:bg-white text-stone-950 text-xs font-mono font-medium uppercase tracking-wider rounded-xl transition"
                                >
                                  {car.type === 'rent' ? 'Rent Now' : 'Buy Now'}
                                </button>

                                <button
                                  onClick={() => {
                                    const updated = user.likedCarIds.filter(id => id !== car.id);
                                    handleLikedChange(updated);
                                  }}
                                  className="p-2.5 bg-stone-950 hover:bg-stone-900 border border-stone-900 hover:border-stone-800 rounded-xl text-stone-500 hover:text-rose-500 transition-colors"
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
            )}

            {currentSection === AppSection.INBOX && (
              <Chat
                language={language}
                currentUser={user}
                chatSessions={chatSessions}
                onSendMessage={handleSendMessage}
                onReceiveSystemReply={handleReceiveSystemReply}
                selectedSessionId={selectedSessionId}
                onSelectSession={handleSelectSession}
                onNavigateToExplore={() => setCurrentSection(AppSection.EXPLORE)}
              />
            )}

            {currentSection === AppSection.COMMUNITY && (
              <div className="flex-1 overflow-y-auto h-full w-full pr-1 scrollbar-thin">
                <div className="max-w-4xl mx-auto px-4 py-4 space-y-4 flex flex-col">
                  <button 
                    onClick={() => setCurrentSection(AppSection.EXPLORE)}
                    className="flex items-center text-stone-500 hover:text-stone-300 transition-colors cursor-pointer self-start mb-1"
                    title="Back"
                  >
                    <ChevronLeft className="w-5 h-5" />
                  </button>
                  <Community
                    currentUser={user}
                    language={language}
                    theme={theme}
                    onUserUpdate={handleUserUpdate}
                  />
                </div>
              </div>
            )}

            {currentSection === AppSection.MY_FLEET && (
              <div className="flex-1 overflow-y-auto h-full w-full pr-1 scrollbar-thin">
                <MyFleet
                  currentUser={user}
                  cars={cars}
                  bookings={bookings}
                  language={language}
                  onUpdateCar={handleUpdateCar}
                  onAddNewCar={handleAddNewCar}
                  onDeleteCar={handleDeleteCar}
                  onNavigateToExplore={() => setCurrentSection(AppSection.EXPLORE)}
                  onOpenChat={handleOpenChat}
                />
              </div>
            )}

            {currentSection === AppSection.PROFILE && (
              <div className="flex-1 overflow-y-auto h-full w-full pr-1 scrollbar-thin">
                <div className="w-full px-4 py-4 flex flex-col space-y-4">
                  <button 
                    onClick={() => setCurrentSection(AppSection.EXPLORE)}
                    className="flex items-center text-stone-500 hover:text-stone-300 transition-colors cursor-pointer self-start mb-1"
                    title="Back"
                  >
                    <ChevronLeft className="w-5 h-5" />
                  </button>
                  <Dashboard
                    currentUser={user}
                    onLogout={handleLogout}
                    cars={cars}
                    bookings={bookings}
                    language={language}
                    onLikedChange={handleLikedChange}
                    onAddNewCar={(newCar) => handleAddNewCar(newCar)}
                    onCancelBooking={handleCancelBooking}
                    onNavigateToSwipe={() => setCurrentSection(AppSection.EXPLORE)}
                    onTriggerRent={handleTriggerRentCheck}
                    onLanguageChange={setLanguage}
                    unit={unit}
                    onUnitChange={setUnit}
                    theme={theme}
                    onThemeChange={() => {}}
                    onUserUpdate={handleUserUpdate}
                    onCancelSubscription={handleCancelSubscription}
                    showKycModal={showKycModal}
                    onShowKycModalChange={setShowKycModal}
                    maxDistance={maxDistance}
                    onMaxDistanceChange={handleMaxDistanceChange}
                    showUpgradeTarget={showUpgradeTarget}
                    onShowUpgradeTargetChange={setShowUpgradeTarget}
                  />
                </div>
              </div>
            )}
          </motion.div>
        </AnimatePresence>
      </main>

      {/* Transaction Sign checking Overlay drawer */}
      <AnimatePresence>
        {checkoutCar && (
          <PaymentModal
            car={checkoutCar}
            currentUser={user}
            language={language}
            onClose={() => setCheckoutCar(null)}
            onSuccess={handleBookingSuccess}
          />
        )}
      </AnimatePresence>

      {/* KYC Rental Privilege Gate Modal */}
      <AnimatePresence>
        {showKycRequiredModal && pendingRentCar && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-stone-950/85 backdrop-blur-sm p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 15 }}
              className="relative w-full max-w-md bg-stone-900 border border-stone-800 rounded-3xl p-6 md:p-8 space-y-6 shadow-2xl text-center"
            >
              {/* Close pin */}
              <button
                type="button"
                onClick={() => {
                  setShowKycRequiredModal(false);
                  setPendingRentCar(null);
                }}
                className="absolute top-5 right-5 text-stone-500 hover:text-white font-bold cursor-pointer text-base p-1.5 rounded-full bg-stone-950 border border-stone-800"
              >
                ✕
              </button>

              <div className="mx-auto w-14 h-14 bg-amber-500/10 border border-amber-500/25 rounded-2xl flex items-center justify-center text-amber-500">
                <Shield className="w-7 h-7" />
              </div>

              <div className="space-y-2">
                <h3 className="text-base font-semibold text-stone-100 font-mono uppercase tracking-wider">
                  Driver Verification Required
                </h3>
                <p className="text-xs text-stone-350 leading-relaxed font-sans px-2">
                  Veloce GT requires a simple identity matching check prior to renting luxury performance vehicles like the <strong className="text-amber-400">{pendingRentCar.brand} {pendingRentCar.model}</strong>. This satisfies our premium leasing compliance standards.
                </p>
              </div>

              <p className="text-[10px] text-stone-500 italic max-w-[280px] mx-auto">
                * Check takes less than 60 seconds using sandboxed biometric data on your local device.
              </p>

              <div className="flex flex-col gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    // Navigate to Dashboard, open KYC scanner immediately
                    setCurrentSection(AppSection.PROFILE);
                    setShowKycModal(true);
                    setShowKycRequiredModal(false);
                  }}
                  className="w-full py-3 bg-amber-500 hover:bg-amber-450 text-stone-950 rounded-xl font-mono text-[10px] font-extrabold uppercase tracking-widest transition-all cursor-pointer shadow-lg"
                >
                  Verify My Identity Now
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowKycRequiredModal(false);
                    setPendingRentCar(null);
                  }}
                  className="w-full py-2 bg-stone-950 hover:bg-stone-900 border border-stone-850 text-stone-400 hover:text-stone-300 rounded-xl font-mono text-[9px] uppercase tracking-wider transition-all cursor-pointer"
                >
                  Maybe Later
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Real Dynamic Monetization Upgrade Module Card - Fixed Overlay Popup Modal */}
      <AnimatePresence>
        {showUpgradeTarget && (
          <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-stone-950/85 backdrop-blur-sm p-4 overflow-y-auto">
            <motion.div 
               initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="relative w-full max-w-3xl bg-stone-900 border border-stone-800 rounded-3xl p-6 md:p-8 space-y-5 shadow-2xl my-8 overflow-hidden text-left"
            >
              {/* Close Button */}
              <button 
                type="button"
                onClick={() => setShowUpgradeTarget(null)}
                className="absolute top-5 right-5 z-[10000] text-stone-400 hover:text-white font-mono cursor-pointer text-base p-2 w-8 h-8 rounded-full bg-stone-950 border border-stone-800 flex items-center justify-center transition-all shadow-md active:scale-95"
                title="Close upgrade portal"
              >
                ✕
              </button>

              <div className="flex items-center gap-2 pb-3 border-b border-stone-850">
                <Sparkles className="w-5 h-5 text-amber-500" />
                <h4 className="text-sm font-semibold text-stone-100 font-mono uppercase tracking-wider">
                  Upgrade to Veloce GT or Partner Level
                </h4>
              </div>

              <p className="text-xs text-stone-350 leading-relaxed font-sans">
                Standard accounts are limited to saving up to <strong className="text-stone-105">25 saved cars</strong> and publishing up to <strong className="text-stone-105">2 custom listings</strong> in the feed. Elevate your status below to unlock direct, unlimited capabilities instantly.
              </p>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-5 pt-1">
                {/* Premium Plan 1 */}
                <div className="p-5 bg-stone-950 rounded-2xl border border-stone-850 flex flex-col justify-between space-y-4 hover:border-amber-500/20 transition-all">
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <h5 className="text-xs font-mono uppercase text-amber-500 font-extrabold tracking-wider">Veloce GT</h5>
                      <span className="text-[9px] bg-amber-500/10 text-amber-500 px-2 py-0.5 rounded-full border border-amber-500/20 font-mono uppercase font-bold">Recommended</span>
                    </div>
                    <p className="text-[10.5px] text-stone-400 font-sans">For car enthusiasts who want to discover, like, and list without limit.</p>
                    <span className="text-2xl font-semibold text-white block font-mono">$19 <span className="text-xs text-stone-500 font-sans font-light">/ month</span></span>
                    
                    {/* Benefits */}
                    <div className="space-y-2 pt-2 border-t border-stone-900">
                      <span className="text-[9px] font-mono uppercase text-stone-500 block font-bold">Premium Benefits:</span>
                      <ul className="space-y-1.5 text-[10.5px] text-stone-300">
                        <li className="flex items-center gap-2">
                          <Check className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                          <span>Unlimited matches & favorites saves</span>
                        </li>
                        <li className="flex items-center gap-2">
                          <Check className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                          <span>List unlimited vehicles in swiper catalog</span>
                        </li>
                        <li className="flex items-center gap-2">
                          <Check className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                          <span>Priority model algorithm visibility boost</span>
                        </li>
                        <li className="flex items-center gap-2">
                          <Check className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                          <span>Ad-free navigation feed experience</span>
                        </li>
                      </ul>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleInstantUpgrade('veloce_gt')}
                    className="w-full py-2.5 bg-amber-500 hover:bg-amber-450 text-stone-950 rounded-xl font-mono text-[10.5px] font-bold uppercase tracking-widest transition-all cursor-pointer shadow-lg shadow-amber-500/15"
                  >
                    Get Veloce GT
                  </button>
                </div>

                {/* Premium Plan 2 */}
                <div className="p-5 bg-stone-950 rounded-2xl border border-stone-850 flex flex-col justify-between space-y-4 hover:border-[#006B4F]/20 transition-all">
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <h5 className="text-xs font-mono uppercase text-[#006B4F] font-extrabold tracking-wider">Official Dealer Partner</h5>
                      <span className="text-[9px] bg-[#006B4F]/10 text-[#006B4F] px-2 py-0.5 rounded-full border border-[#006B4F]/20 font-mono uppercase font-bold">Partner</span>
                    </div>
                    <p className="text-[10.5px] text-stone-400 font-sans">For agencies, custom importers, and prestigious car collectors.</p>
                    <span className="text-2xl font-semibold text-white block font-mono">$49 <span className="text-xs text-stone-500 font-sans font-light">/ month</span></span>
                    
                    {/* Benefits */}
                    <div className="space-y-2 pt-2 border-t border-stone-900">
                      <span className="text-[9px] font-mono uppercase text-stone-500 block font-bold">Importer Benefits:</span>
                      <ul className="space-y-1.5 text-[10.5px] text-stone-200">
                        <li className="flex items-center gap-2">
                          <Check className="w-3.5 h-3.5 text-[#006B4F] shrink-0" />
                          <span>Verified Gold Star Importer status badge</span>
                        </li>
                        <li className="flex items-center gap-2">
                          <Check className="w-3.5 h-3.5 text-[#006B4F] shrink-0" />
                          <span>Real-time Buyer Demand & Analytics board</span>
                        </li>
                        <li className="flex items-center gap-2">
                          <Check className="w-3.5 h-3.5 text-[#006B4F] shrink-0" />
                          <span>Sync custom external stock databases</span>
                        </li>
                        <li className="flex items-center gap-2">
                          <Check className="w-3.5 h-3.5 text-[#006B4F] shrink-0" />
                          <span>Instant notification odds via chat triggers</span>
                        </li>
                      </ul>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleInstantUpgrade('dealer_paid')}
                    className="w-full py-2.5 bg-[#006B4F] hover:bg-[#00523C] text-white rounded-xl font-mono text-[10.5px] font-extrabold uppercase tracking-widest transition-all cursor-pointer shadow-lg shadow-[#006B4F]/15"
                  >
                    Get Dealer License
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Real-time Simulated Stripe Subscription Billing Portal */}
      <AnimatePresence>
        {checkoutSessionId && (
          <SubscriptionCheckout
            sessionId={checkoutSessionId}
            language={language}
            onSuccess={handleCheckoutSuccess}
            onCancel={() => setCheckoutSessionId(null)}
          />
        )}
      </AnimatePresence>

      {/* Bottom Navigation Bar stretching fully across the bottom of the screen */}
      <div className="h-16 shrink-0 border-t bg-[#09090b]/95 border-stone-900 text-stone-100 shadow-[0_-8px_30px_rgba(0,0,0,0.4)] backdrop-blur-2xl transition-colors duration-200">
        <nav
          id="veloce_bottom_navbar"
          className="w-full max-w-5xl mx-auto h-16 grid grid-cols-7 items-center justify-items-center px-2 py-1"
        >
          {/* Rentals */}
          <button
            id="tab_rentals"
            onClick={() => setCurrentSection(AppSection.RENTALS)}
            className={`flex flex-col items-center justify-center w-full h-full py-1 transition-all duration-300 ${
              currentSection === AppSection.RENTALS ? 'text-emerald-500 scale-105 font-bold' : 'text-stone-500 hover:text-stone-355'
            }`}
          >
            <Calendar className="w-4.5 h-4.5 md:w-5 h-5" />
            <span className="text-[7.2px] xs:text-[8px] md:text-[9.5px] font-mono uppercase tracking-wide mt-1 text-center line-clamp-1">Rentals</span>
          </button>          {/* Liked Cars */}
          <button
            id="tab_liked"
            onClick={() => setCurrentSection(AppSection.LIKED)}
            className={`flex flex-col items-center justify-center w-full h-full py-1 transition-all duration-300 relative ${
              currentSection === AppSection.LIKED ? 'text-rose-500 scale-105 font-bold' : 'text-stone-500 hover:text-stone-350'
            }`}
          >
            <div className="relative inline-block">
              <Heart className={`w-4.5 h-4.5 md:w-5 h-5 ${currentSection === AppSection.LIKED ? 'fill-rose-500' : ''}`} />
              {user.likedCarIds.length > 0 && (
                <span className="absolute -top-1 -right-1.5 bg-[#C8102E] text-white font-mono font-bold text-[6.5px] min-w-[11.5px] h-[11.5px] rounded-full flex items-center justify-center px-0.5 shadow-sm border border-stone-950 animate-bounce">
                  {user.likedCarIds.length}
                </span>
              )}
            </div>
            <span className="text-[7.2px] xs:text-[8px] md:text-[9.5px] font-mono uppercase tracking-wide mt-1 text-center line-clamp-1">Liked</span>
          </button>

          {/* My Fleet */}
          <button
            id="tab_my_fleet"
            onClick={() => setCurrentSection(AppSection.MY_FLEET)}
            className={`flex flex-col items-center justify-center w-full h-full py-1 transition-all duration-300 ${
              currentSection === AppSection.MY_FLEET ? 'text-amber-500 scale-105 font-bold' : 'text-stone-500 hover:text-stone-355'
            }`}
          >
            <Sliders className="w-4.5 h-4.5 md:w-5 h-5" />
            <span className="text-[7.2px] xs:text-[8px] md:text-[9.5px] font-mono uppercase tracking-wide mt-1 text-center line-clamp-1">My Fleet</span>
          </button>

          {/* Explore (THE CENTERPIECE MAIN FEATURE!) */}
          <button
            id="tab_explore"
            onClick={() => setCurrentSection(AppSection.EXPLORE)}
            className={`flex flex-col items-center justify-center w-full h-full py-1 transition-all duration-300 ${
              currentSection === AppSection.EXPLORE ? 'text-amber-500 scale-105 font-bold' : 'text-stone-500 hover:text-stone-350'
            }`}
          >
            <Compass className={`w-4.5 h-4.5 md:w-5 h-5 transition-transform ${currentSection === AppSection.EXPLORE ? 'rotate-45' : 'animate-spin-slow'}`} />
            <span className="text-[7.2px] xs:text-[8px] md:text-[9.5px] font-mono uppercase tracking-wide mt-1 text-center line-clamp-1">Explore</span>
          </button>

          {/* Community */}
          <button
            id="tab_community"
            onClick={() => setCurrentSection(AppSection.COMMUNITY)}
            className={`flex flex-col items-center justify-center w-full h-full py-1 transition-all duration-300 ${
              currentSection === AppSection.COMMUNITY ? 'text-amber-500 scale-105 font-bold' : 'text-stone-500 hover:text-stone-350'
            }`}
          >
            <Users className="w-4.5 h-4.5 md:w-5 h-5" />
            <span className="text-[7.2px] xs:text-[8px] md:text-[9.5px] font-mono uppercase tracking-wide mt-1 text-center line-clamp-1">Community</span>
          </button>

          {/* Inbox */}
          <button
            id="tab_inbox"
            onClick={() => setCurrentSection(AppSection.INBOX)}
            className={`flex flex-col items-center justify-center w-full h-full py-1 transition-all duration-300 relative ${
              currentSection === AppSection.INBOX ? 'text-blue-500 scale-105 font-bold' : 'text-stone-500 hover:text-stone-355'
            }`}
          >
            <div className="relative inline-block">
              <MessageSquare className="w-4.5 h-4.5 md:w-5 h-5" />
              {chatSessions.some(c => c.unread) && (
                <span className="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 bg-blue-500 rounded-full animate-pulse border border-stone-950" />
              )}
            </div>
            <span className="text-[7.2px] xs:text-[8px] md:text-[9.5px] font-mono uppercase tracking-wide mt-1 text-center line-clamp-1">Inbox</span>
          </button>

          {/* Profile */}
          <button
            id="tab_profile"
            onClick={() => setCurrentSection(AppSection.PROFILE)}
            className={`flex flex-col items-center justify-center w-full h-full py-1 transition-all duration-300 ${
              currentSection === AppSection.PROFILE ? 'text-stone-100 scale-105 font-bold' : 'text-stone-500 hover:text-stone-350'
            }`}
          >
            <UserIcon className="w-4.5 h-4.5 md:w-5 h-5" />
            <span className="text-[7.2px] xs:text-[8px] md:text-[9.5px] font-mono uppercase tracking-wide mt-1 text-center line-clamp-1">Profile</span>
          </button>
        </nav>
      </div>

    </div>
  );
}
