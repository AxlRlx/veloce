import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Calendar, 
  PlusCircle, 
  Sparkles, 
  Heart, 
  MessageSquare, 
  Youtube, 
  Instagram, 
  Tv, 
  CheckCircle, 
  MapPin, 
  Users, 
  Award, 
  ExternalLink, 
  X, 
  Check, 
  Tv as TikTokIcon, 
  Flame, 
  Globe,
  Shield
} from 'lucide-react';
import { CommunityEvent, CreatorPost, AppLanguage, User } from '../types';
import { auth } from '../lib/firebase';

interface CommunityProps {
  currentUser: User | null;
  language: AppLanguage;
  theme: 'light' | 'dark';
  onUserUpdate: (updatedUser: User) => void;
}

// Initial mock community events
const INITIAL_EVENTS: CommunityEvent[] = [
  {
    id: 'evt_1',
    title: 'Malibu Canyon Elite Rally',
    description: 'A morning canyon sprint down Mulholland and Latigo Canyon. Open to GT3, SF90, and equivalent-tier supercars only. Standard helmet rules apply.',
    type: 'ride',
    date: '2026-06-21 at 07:00 AM',
    location: 'Malibu Overlook Point, CA',
    participantsCount: 42,
    hostName: 'Apex Cavallino Club',
    hostAvatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?q=80&w=120',
    isHostGtrs: true,
    isPremium: false,
    onlyPremiumVisible: false,
    feeType: 'free',
    feeAmount: 0,
    sponsoredBy: 'private_sponsor'
  },
  {
    id: 'evt_2',
    title: 'Maranello Track Day Elite',
    description: 'Exclusive lap time trials on the legendary Fiorano circuit. Private racing instructors and telemetry analytics are available on site.',
    type: 'track_day',
    date: '2026-07-04 at 09:30 AM',
    location: 'Fiorano Circuit, Italy',
    participantsCount: 18,
    hostName: 'Scuderia Club Importers',
    hostAvatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?q=80&w=120',
    isHostGtrs: true,
    isPremium: true,
    onlyPremiumVisible: false, // Visible to all but only available to register for Premium (locked otherwise)
    feeType: 'paid',
    feeAmount: 180,
    sponsoredBy: 'dealer'
  },
  {
    id: 'evt_3',
    title: 'Tokyo Midnight Highway Loop',
    description: 'A midnight cruise around the iconic metropolitan C1 expressway loop. Experience the neon lights and deep tunnels in disciplined convoy formations.',
    type: 'meetup',
    date: '2026-07-15 at 11:00 PM',
    location: 'Daikoku Parking Area, Yokohama',
    participantsCount: 89,
    hostName: 'Midnight Shuto Syndicate',
    hostAvatar: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?q=80&w=120',
    isHostGtrs: false,
    isPremium: false,
    onlyPremiumVisible: false,
    feeType: 'free',
    feeAmount: 0,
    sponsoredBy: 'private_sponsor'
  },
  {
    id: 'evt_4',
    title: 'Veloce Monaco Private Grid Rendezvous',
    description: 'Ultra-exclusive private yacht deck social gathering and closed-street hypercar track parade laps in Monaco. VIP pass credentials required.',
    type: 'track_day',
    date: '2026-08-12 at 06:00 PM',
    location: 'Monaco Harbour Grid',
    participantsCount: 12,
    hostName: 'Veloce GT Club President',
    hostAvatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?q=80&w=120',
    isHostGtrs: true,
    isPremium: true,
    onlyPremiumVisible: true, // Only visible to Veloce GT premium users
    feeType: 'paid',
    feeAmount: 1250,
    sponsoredBy: 'dealer'
  }
];

// Initial mock creator profiles
interface ContentCreator {
  id: string;
  name: string;
  username: string;
  platform: 'youtube' | 'instagram' | 'tiktok' | 'twitch';
  followers: string;
  avatar: string;
  niche: string;
  recentVideoTitle: string;
  recentVideoThumb: string;
  recentVideoDuration: string;
  likesCount: number;
  hasLikedVideo?: boolean;
}

const INITIAL_CREATORS: ContentCreator[] = [
  {
    id: 'cre_1',
    name: 'Shmee150',
    username: '@shmee150',
    platform: 'youtube',
    followers: '2.6M subscribers',
    avatar: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?q=80&w=120',
    niche: 'Supercar Garage Reviews & Road Trips',
    recentVideoTitle: 'My FIRST DRIVE in the Ferrari SF90 XX Stradale on Public Streets!',
    recentVideoThumb: 'https://images.unsplash.com/photo-1583121274602-3e2820c69888?q=80&w=600',
    recentVideoDuration: '18:45',
    likesCount: 1420
  },
  {
    id: 'cre_2',
    name: 'Supercar Blondie',
    username: '@supercarblondie',
    platform: 'tiktok',
    followers: '10.5M followers',
    avatar: 'https://images.unsplash.com/photo-1508214751196-bcfd4ca60f91?q=80&w=120',
    niche: 'Concept Cars & Extreme Space Age Vehicles',
    recentVideoTitle: 'What it is like to drive the futuristic Koenigsegg Jesko Absolut.',
    recentVideoThumb: 'https://images.unsplash.com/photo-1614162692292-7ac56d7f7f1e?q=80&w=600',
    recentVideoDuration: '09:12',
    likesCount: 2894
  },
  {
    id: 'cre_3',
    name: 'Keno Photography',
    username: '@kenophoto',
    platform: 'instagram',
    followers: '450K followers',
    avatar: 'https://images.unsplash.com/photo-1492562080023-ab3db95bfbce?q=80&w=120',
    niche: 'Sartorial Car Culture & Vintage Motorsports',
    recentVideoTitle: 'Sunset reflections of Porsche 911 GT3 RS in the Alps.',
    recentVideoThumb: 'https://images.unsplash.com/photo-1702677945037-336df77d853e?q=80&w=600',
    recentVideoDuration: '04:20',
    likesCount: 940
  },
  {
    id: 'cre_4',
    name: 'Supercar Driver',
    username: '@supercardriver',
    platform: 'youtube',
    followers: '1.2M subscribers',
    avatar: 'https://images.unsplash.com/photo-1570295999919-56ceb5ecca61?q=80&w=120',
    niche: 'High speed runway drag races and sound battles',
    recentVideoTitle: 'Sound Check: Dodge Demon vs Shelby GT500 vs Corvette Z06',
    recentVideoThumb: 'https://images.unsplash.com/photo-1563720223185-11003d516935?q=80&w=600',
    recentVideoDuration: '12:30',
    likesCount: 610
  }
];

export default function Community({ currentUser, language, theme, onUserUpdate }: CommunityProps) {
  // Events list loaded from server, and Creators from localstorage
  const [events, setEvents] = useState<CommunityEvent[]>([]);
  const [loadingEvents, setLoadingEvents] = useState(true);
  const [showEventReportForm, setShowEventReportForm] = useState(false);
  const [eventReportReason, setEventReportReason] = useState("");
  const [eventReportSuccess, setEventReportSuccess] = useState<string | null>(null);

  const loadEvents = async () => {
    try {
      let token = "";
      if (auth.currentUser) {
        token = await auth.currentUser.getIdToken();
      }
      const res = await fetch('/api/community/events', {
        headers: {
          ...(token ? { 'Authorization': `Bearer ${token}` } : {})
        }
      });
      if (res.ok) {
        const data = await res.json();
        setEvents(data);
      }
    } catch (e) {
      console.error("Failed to fetch community events:", e);
    } finally {
      setLoadingEvents(false);
    }
  };

  useEffect(() => {
    loadEvents();
  }, [currentUser]);

  const [creators, setCreators] = useState<ContentCreator[]>(() => {
    const cached = localStorage.getItem('veloce_community_creators');
    return cached ? JSON.parse(cached) : INITIAL_CREATORS;
  });

  // Schedule subsegment tabs
  const [activeTab, setActiveTab] = useState<'events' | 'creators'>('events');

  // Modal flow states
  const [showEventModal, setShowEventModal] = useState(false);
  const [showCreatorModal, setShowCreatorModal] = useState(false);

  // New Event Forms
  const [eventTitle, setEventTitle] = useState('');
  const [eventDesc, setEventDesc] = useState('');
  const [eventType, setEventType] = useState<'ride' | 'meetup' | 'track_day'>('meetup');
  const [eventDate, setEventDate] = useState('');
  const [eventLocation, setEventLocation] = useState('');
  const [eventFeeType, setEventFeeType] = useState<'free' | 'paid'>('free');
  const [eventFeeAmount, setEventFeeAmount] = useState('25');
  const [eventSponsorType, setEventSponsorType] = useState<'dealer' | 'private_sponsor'>('private_sponsor');
  const [eventFilter, setEventFilter] = useState<'all' | 'premium_only'>('all');
  const [selectedEventForDetails, setSelectedEventForDetails] = useState<CommunityEvent | null>(null);

  // New Creator Submission Forms
  const [creatorName, setCreatorName] = useState('');
  const [creatorUser, setCreatorUser] = useState('');
  const [creatorPlatform, setCreatorPlatform] = useState<'youtube' | 'instagram' | 'tiktok' | 'twitch'>('youtube');
  const [creatorFol, setCreatorFol] = useState('');
  const [creatorNiche, setCreatorNiche] = useState('');

  // Notifications
  const [bannerAlert, setBannerAlert] = useState<string | null>(null);

  // Sync state
  useEffect(() => {
    localStorage.setItem('veloce_community_creators', JSON.stringify(creators));
  }, [creators]);

  // Join/RSVP event handler
  const handleToggleEventRSVP = async (evtId: string) => {
    const targeted = events.find(e => e.id === evtId);
    if (!targeted) return;

    const isUserPremium = currentUser?.subscriptionTier === 'veloce_gt' || currentUser?.subscriptionTier === 'dealer_paid' || currentUser?.role === 'dealer';
    if (targeted.isPremium && !isUserPremium) {
      setBannerAlert("Registration Restricted: This exclusive event is locked. Please upgrade to Veloce GT in the Profile tab to attend.");
      setTimeout(() => setBannerAlert(null), 6000);
      return;
    }

    try {
      let token = "";
      if (auth.currentUser) {
        token = await auth.currentUser.getIdToken();
      }
      const response = await fetch(`/api/community/events/${evtId}/rsvp`, {
        method: 'POST',
        headers: {
          ...(token ? { 'Authorization': `Bearer ${token}` } : {})
        }
      });

      if (response.ok) {
        const resData = await response.json();
        setEvents(prev => prev.map(evt => {
          if (evt.id === evtId) {
            return {
              ...evt,
              joined: resData.joined,
              participantsCount: resData.participantsCount
            };
          }
          return evt;
        }));

        const textNotice = resData.joined 
          ? `Success! RSVP approved. You have registered for: ${targeted.title}. See you near the starting grid!` 
          : `Removed registration for: ${targeted.title}.`;
        
        setBannerAlert(textNotice);
        setTimeout(() => setBannerAlert(null), 4500);
      }
    } catch (err) {
      console.error("Failed to toggle RSVP on server:", err);
    }
  };

  // Creator Video Like handler
  const handleToggleCreatorLike = (creatorId: string) => {
    setCreators(prev => prev.map(cre => {
      if (cre.id === creatorId) {
        const likedState = !cre.hasLikedVideo;
        return {
          ...cre,
          hasLikedVideo: likedState,
          likesCount: likedState ? cre.likesCount + 1 : cre.likesCount - 1
        };
      }
      return cre;
    }));
  };

  // Form check state for Premium Event creation
  const [eventIsPremium, setEventIsPremium] = useState(false);

  // Create customized user event list
  const handleCreateNewEvent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!eventTitle || !eventDesc || !eventDate || !eventLocation) {
      alert("Please check all required inputs!");
      return;
    }

    try {
      let token = "";
      if (auth.currentUser) {
        token = await auth.currentUser.getIdToken();
      }

      const response = await fetch('/api/community/events', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { 'Authorization': `Bearer ${token}` } : {})
        },
        body: JSON.stringify({
          title: eventTitle,
          description: eventDesc,
          type: eventType,
          date: eventDate,
          location: eventLocation,
          isPremium: eventIsPremium,
          feeType: eventFeeType,
          feeAmount: eventFeeType === 'paid' ? parseFloat(eventFeeAmount) || 0 : 0,
          sponsoredBy: eventSponsorType
        })
      });

      if (response.ok) {
        await loadEvents();
        setShowEventModal(false);

        // Reset Form
        setEventTitle('');
        setEventDesc('');
        setEventType('meetup');
        setEventDate('');
        setEventLocation('');
        setEventIsPremium(false);
        setEventFeeType('free');
        setEventFeeAmount('25');
        setEventSponsorType('private_sponsor');

        setBannerAlert("Club Event successfully hosted and published in Veloce! Your peer network can now view and RSVP.");
        setTimeout(() => setBannerAlert(null), 5000);
      }
    } catch (err) {
      console.error("Failed to upload event to server:", err);
    }
  };

  // Create custom Creator promotion profile
  const handleSubmitCreator = (e: React.FormEvent) => {
    e.preventDefault();
    if (!creatorName || !creatorUser || !creatorFol || !creatorNiche) {
      alert("Please fulfill all content creator promotion attributes!");
      return;
    }

    const brandNewCreator: ContentCreator = {
      id: `cre_user_${Math.floor(Math.random() * 90000 + 10000)}`,
      name: creatorName,
      username: creatorUser.startsWith('@') ? creatorUser : `@${creatorUser}`,
      platform: creatorPlatform,
      followers: creatorFol,
      avatar: currentUser?.avatar || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?q=80&w=120',
      niche: creatorNiche,
      recentVideoTitle: `Latest Supercars Tour and Cinematic Cruise`,
      recentVideoThumb: 'https://images.unsplash.com/photo-1702677945037-336df77d853e?q=80&w=600',
      recentVideoDuration: '05:00',
      likesCount: 1
    };

    setCreators(prev => [brandNewCreator, ...prev]);
    setShowCreatorModal(false);

    // Reset Form
    setCreatorName('');
    setCreatorUser('');
    setCreatorPlatform('youtube');
    setCreatorFol('');
    setCreatorNiche('');

    setBannerAlert("Creator channel listed successfully. Promoting your channel to our high-net-worth supercar community!");
    setTimeout(() => setBannerAlert(null), 5000);
  };

  const getPlatformIcon = (platform: 'youtube' | 'instagram' | 'tiktok' | 'twitch') => {
    switch (platform) {
      case 'youtube':
        return <Youtube className="w-4 h-4 text-rose-500 fill-rose-500" />;
      case 'instagram':
        return <Instagram className="w-4 h-4 text-pink-500" />;
      case 'tiktok':
        return <Tv className="w-4 h-4 text-emerald-400" />; // representing tech-based platform icon
      case 'twitch':
        return <Globe className="w-4 h-4 text-purple-400" />;
    }
  };

  return (
    <div id="community_screen" className="w-full max-w-6xl mx-auto px-4 py-6 space-y-8 relative">
      
      {/* Banner Notifications Alert */}
      <AnimatePresence>
        {bannerAlert && (
          <motion.div
            initial={{ opacity: 0, y: -20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -20 }}
            className="fixed top-24 left-1/2 -translate-x-1/2 z-50 w-full max-w-md bg-stone-900 border border-amber-500 p-4 rounded-2xl shadow-2xl text-center"
          >
            <p className="text-xs text-stone-200 mt-0.5 leading-relaxed">
              {bannerAlert}
            </p>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Header and Title block */}
      <div className="flex flex-col md:flex-row items-center justify-between gap-4 border-b border-stone-850 pb-6">
        <div>
          <span className="text-[10px] font-mono tracking-[0.25em] text-amber-500 uppercase font-extrabold flex items-center gap-1.5">
            <Flame className="w-3.5 h-3.5 text-amber-500" />
            Veloce GT Society
          </span>
          <h1 className="text-3xl font-light text-white tracking-tight mt-1.5">
            Community <span className="font-semibold text-white">Hub</span>
          </h1>
          <p className="text-xs text-stone-400 mt-1.5 max-w-xl">
            Register for premium supercar track events, canyon convoy cruises, and discover high-impact visual content creators from globally recognized automotive media channels.
          </p>
        </div>

        {/* Form Promoters triggers */}
        <div className="flex items-center gap-3 w-full md:w-auto">
          {activeTab === 'creators' && (
            <button
              onClick={() => {
                const isFree = (!currentUser?.subscriptionTier || currentUser?.subscriptionTier === 'free') && currentUser?.role !== 'dealer';
                if (isFree) {
                  alert("Promotion Restriction! Free Standard accounts cannot list content channels. Upgrade to Veloce GT or Partner tier in the Profile tab to promote your channel to 50k+ luxury collectors!");
                } else {
                  setShowCreatorModal(true);
                }
              }}
              className="flex-1 md:flex-initial py-2.5 px-4 bg-amber-500 hover:bg-amber-450 text-stone-950 text-[10px] uppercase font-mono font-extrabold tracking-widest rounded-xl transition cursor-pointer flex items-center justify-center gap-2 shadow"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>Submit My Channel</span>
            </button>
          )}
        </div>
      </div>

      {/* Segmented control bar */}
      <div className="flex justify-center md:justify-start">
        <div className="bg-stone-950 p-1 rounded-2xl border border-stone-850 flex items-center gap-1.5 w-full md:w-auto max-w-none md:max-w-md">
          <button
            onClick={() => setActiveTab('events')}
            className={`flex-1 md:flex-initial px-3 md:px-5 py-2 md:py-2.5 font-mono text-[8.5px] xs:text-[9px] md:text-[9.5px] uppercase font-extrabold tracking-wider rounded-xl transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
              activeTab === 'events'
                ? 'bg-stone-900 border border-stone-800 text-stone-105 shadow-sm'
                : 'text-stone-500 hover:text-stone-300'
            }`}
          >
            <Calendar className="w-3.5 h-3.5 shrink-0" />
            <span className="whitespace-nowrap">Events Schedule</span>
          </button>
          
          <button
            onClick={() => setActiveTab('creators')}
            className={`flex-1 md:flex-initial px-3 md:px-5 py-2 md:py-2.5 font-mono text-[8.5px] xs:text-[9px] md:text-[9.5px] uppercase font-extrabold tracking-wider rounded-xl transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
              activeTab === 'creators'
                ? 'bg-stone-900 border border-stone-800 text-stone-105 shadow-sm'
                : 'text-stone-500 hover:text-stone-300'
            }`}
          >
            <Tv className="w-3.5 h-3.5 shrink-0" />
            <span className="whitespace-nowrap">Automotive Creators</span>
          </button>
        </div>
      </div>

      {/* Primary Section Canvas */}
      {activeTab === 'events' ? (
        <div className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3 pb-1">
            <div className="flex items-center gap-2">
              <button
                onClick={() => setShowEventModal(true)}
                className="py-1.5 px-3 bg-stone-900 hover:bg-stone-850 border border-stone-800 hover:border-amber-500 text-amber-500 text-[9px] uppercase font-mono font-extrabold tracking-wider rounded-lg transition cursor-pointer flex items-center gap-1.5 shadow"
                title="Host Club Event"
              >
                <PlusCircle className="w-3.5 h-3.5" />
                <span>Host Club Event</span>
              </button>

              {/* Premium filter slider tabs */}
              <div className="flex bg-stone-950 p-0.5 rounded-lg border border-stone-850">
                <button
                  type="button"
                  onClick={() => setEventFilter('all')}
                  className={`px-3 py-1 text-[8.5px] font-mono uppercase tracking-wider rounded transition-colors cursor-pointer ${
                    eventFilter === 'all' ? 'bg-stone-900 text-amber-500 font-extrabold shadow' : 'text-stone-500 hover:text-stone-300'
                  }`}
                >
                  All Meets
                </button>
                <button
                  type="button"
                  onClick={() => {
                    const isPremium = currentUser?.subscriptionTier === 'veloce_gt' || currentUser?.subscriptionTier === 'dealer_paid' || currentUser?.role === 'dealer';
                    if (isPremium) {
                      setEventFilter('premium_only');
                    } else {
                      alert("Veloce GT Member Exclusive! Please upgrade your account in the Profile tab to view premium-only listings.");
                    }
                  }}
                  className={`px-3 py-1 text-[8.5px] font-mono uppercase tracking-wider rounded transition-colors cursor-pointer flex items-center gap-1 ${
                    eventFilter === 'premium_only' ? 'bg-[#BFA46F]/10 border border-[#BFA46F]/20 text-amber-500 font-extrabold shadow' : 'text-stone-550 hover:text-stone-300'
                  }`}
                >
                  <span>GT Exclusives</span>
                </button>
              </div>
            </div>

            <span className="text-[9px] font-mono text-stone-500 uppercase tracking-widest">
              Event Listings ({events.filter(evt => {
                const isFree = (!currentUser?.subscriptionTier || currentUser?.subscriptionTier === 'free') && currentUser?.role !== 'dealer';
                if (isFree && evt.isPremium) {
                  return false;
                }
                if (eventFilter === 'premium_only') {
                  return evt.isPremium === true;
                }
                if (evt.onlyPremiumVisible) {
                  return currentUser?.subscriptionTier === 'veloce_gt' || currentUser?.subscriptionTier === 'dealer_paid';
                }
                return true;
              }).length})
            </span>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {events
              .filter(evt => {
                const isFree = (!currentUser?.subscriptionTier || currentUser?.subscriptionTier === 'free') && currentUser?.role !== 'dealer';
                if (isFree && evt.isPremium) {
                  return false;
                }
                if (eventFilter === 'premium_only') {
                  return evt.isPremium === true;
                }
                if (evt.onlyPremiumVisible) {
                  return currentUser?.subscriptionTier === 'veloce_gt' || currentUser?.subscriptionTier === 'dealer_paid';
                }
                return true;
              })
              .map((evt) => (
                <div 
                  key={evt.id}
                  onClick={() => setSelectedEventForDetails(evt)}
                  className="bg-stone-950/80 border border-stone-850 rounded-2xl p-6 flex flex-col justify-between space-y-5 hover:border-amber-500/35 transition-all shadow-xl group relative overflow-hidden cursor-pointer hover:bg-stone-900/10"
                >
                  {/* Type & Tier badges */}
                  <div className="flex flex-col gap-2">
                    <div className="flex items-center justify-between flex-wrap gap-1.5">
                      <span className={`text-[8.5px] font-mono uppercase tracking-widest px-2.5 py-1 rounded-full border ${
                        evt.type === 'track_day' 
                          ? 'bg-red-500/10 border-red-500/20 text-red-400' 
                          : evt.type === 'ride' 
                            ? 'bg-amber-500/10 border-amber-505/20 text-amber-500' 
                            : 'bg-indigo-505/10 border-indigo-500/25 text-indigo-400'
                      }`}>
                        {evt.type === 'track_day' ? 'Track Day' : evt.type === 'ride' ? 'Scenic Rally' : 'Group Meet'}
                      </span>

                      <div className="flex gap-1.5 flex-wrap">
                        {evt.sponsoredBy === 'dealer' ? (
                          <span className="text-[8.5px] font-mono uppercase tracking-widest px-2 py-0.5 rounded border border-amber-500/30 text-amber-500 bg-amber-500/5 font-bold">
                            Dealer
                          </span>
                        ) : (
                          <span className="text-[8.5px] font-mono uppercase tracking-widest px-2 py-0.5 rounded border border-stone-800 text-stone-500 bg-stone-900/40">
                            Private
                          </span>
                        )}

                        {evt.isPremium ? (
                          <span className="text-[8.5px] font-mono uppercase tracking-widest px-2 py-0.5 rounded border bg-amber-500/15 border-amber-500/35 text-amber-500 font-extrabold shadow-sm">
                            GT Premium
                          </span>
                        ) : evt.feeType === 'paid' ? (
                          <span className="text-[8.5px] font-mono uppercase tracking-widest px-2 py-0.5 rounded border bg-emerald-500/10 border-emerald-500/25 text-emerald-400 font-bold">
                            ${evt.feeAmount} Meet
                          </span>
                        ) : (
                          <span className="text-[8.5px] font-mono uppercase tracking-widest px-2 py-0.5 rounded border bg-stone-900 border-stone-850 text-stone-400">
                            Free
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center justify-end gap-1.5 text-[10px] text-stone-550 font-mono mt-1">
                      <Users className="w-3.5 h-3.5" />
                      <span>{evt.participantsCount} Registered</span>
                    </div>
                  </div>

                  {/* Title & description */}
                  <div className="space-y-2.5">
                    <h3 className="text-sm font-semibold tracking-wide text-stone-100 uppercase font-mono group-hover:text-amber-400 transition-colors">
                      {evt.title}
                    </h3>
                    <p className="text-xs text-stone-400 leading-relaxed font-sans line-clamp-3">
                      {evt.description}
                    </p>
                  </div>

                  {/* Event Coordinates */}
                  <div className="space-y-2 border-t border-stone-900/60 pt-4 font-mono text-[9.5px]">
                    <div className="flex items-center gap-2 text-stone-300">
                      <Calendar className="w-3.5 h-3.5 text-amber-550" />
                      <span>{evt.date}</span>
                    </div>
                    <div className="flex items-center gap-2 text-stone-300">
                      <MapPin className="w-3.5 h-3.5 text-amber-550 shrink-0" />
                      <span className="truncate" title={evt.location}>{evt.location}</span>
                    </div>
                  </div>

                  {/* Hosting details */}
                  <div className="flex items-center justify-between pt-4 border-t border-stone-900">
                    <div className="flex items-center gap-2">
                      <img referrerPolicy="no-referrer" src={evt.hostAvatar} alt={evt.hostName} className="w-7 h-7 rounded-xl object-cover border border-stone-800" />
                      <div>
                        <span className="text-[9px] text-stone-500 uppercase font-mono block leading-none">Organizer</span>
                        <span className="text-[10px] text-stone-300 font-sans font-medium">{evt.hostName}</span>
                      </div>
                    </div>

                    {evt.isHostGtrs && (
                      <span className="text-[8px] bg-amber-500/10 border border-amber-500/25 text-amber-500 font-mono px-1.5 py-0.5 rounded uppercase font-bold">
                        Sponsor
                      </span>
                    )}
                  </div>

                  {/* RSVP Action */}
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleToggleEventRSVP(evt.id);
                    }}
                    className={`w-full py-2.5 rounded-xl font-mono text-[10px] uppercase font-extrabold tracking-widest mt-2 cursor-pointer transition-all border ${
                      evt.joined
                        ? 'bg-emerald-500/10 border-emerald-500/35 text-emerald-400 font-bold'
                        : evt.isPremium && currentUser?.subscriptionTier !== 'veloce_gt' && currentUser?.subscriptionTier !== 'dealer_paid'
                          ? 'bg-stone-950/40 border-stone-900 text-stone-600 cursor-not-allowed hover:bg-stone-950/40'
                          : 'bg-stone-900 hover:bg-stone-850 text-stone-300 border-stone-800 hover:border-amber-500'
                    }`}
                  >
                    {evt.joined 
                      ? '✓ Attending' 
                      : evt.isPremium && currentUser?.subscriptionTier !== 'veloce_gt' && currentUser?.subscriptionTier !== 'dealer_paid'
                        ? 'Premium Required'
                        : 'Join the Meet'}
                  </button>
                </div>
            ))}
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {creators.map((cre) => (
            <div 
              key={cre.id} 
              className="bg-stone-950/80 border border-stone-850 rounded-2xl p-6 hover:border-amber-505/20 transition-all flex flex-col justify-between space-y-6"
            >
              {/* Creator Metadata Header */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <img referrerPolicy="no-referrer" src={cre.avatar} alt={cre.name} className="w-11 h-11 rounded-2xl object-cover border border-stone-800" />
                  <div>
                    <div className="flex items-center gap-1.5">
                      <h4 className="text-xs font-semibold text-stone-200">{cre.name}</h4>
                      <CheckCircle className="w-3.5 h-3.5 text-blue-500 fill-blue-500/10" />
                    </div>
                    <span className="text-[10px] font-mono text-stone-400 block">{cre.username}</span>
                  </div>
                </div>

                {/* Social Channel badges */}
                <div className="flex flex-col items-end text-right font-mono">
                  <div className="flex items-center gap-1">
                    {getPlatformIcon(cre.platform)}
                    <span className="text-[10.5px] uppercase font-extrabold text-stone-300">{cre.platform}</span>
                  </div>
                  <span className="text-[8px] text-stone-500 uppercase tracking-widest mt-0.5">{cre.followers}</span>
                </div>
              </div>

              {/* Niche Summary description text */}
              <p className="text-[11px] text-stone-400 font-sans italic leading-relaxed">
                Niche Focus: &quot;{cre.niche}&quot;
              </p>

              {/* Video Mockup card block */}
              <div className="relative aspect-video w-full rounded-2xl overflow-hidden border border-stone-850 bg-stone-900 group/video">
                <img referrerPolicy="no-referrer" src={cre.recentVideoThumb} alt={cre.recentVideoTitle} className="w-full h-full object-cover group-hover/video:scale-[1.03] transition-all duration-500 opacity-80" />
                
                {/* Duration Tag */}
                <span className="absolute bottom-3 right-3 bg-stone-950/80 font-mono text-[8px] px-2 py-0.5 rounded text-stone-300 border border-stone-850 shadow">
                  {cre.recentVideoDuration}
                </span>

                {/* Play Button Overlay */}
                <div className="absolute inset-0 z-10 bg-gradient-to-t from-stone-950/85 via-stone-950/20 to-transparent flex flex-col justify-end p-4">
                  <div className="flex items-center justify-between">
                    <p className="text-[10px] md:text-[10.5px] text-stone-100 font-sans font-medium line-clamp-1 leading-normal max-w-[85%]">
                      {cre.recentVideoTitle}
                    </p>
                    <a
                      href={`https://${cre.platform}.com`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="p-1.5 rounded-full bg-stone-950 hover:bg-stone-900 text-stone-300 hover:text-amber-500 border border-stone-800 shrink-0 select-none cursor-pointer"
                      title={`Open on ${cre.platform}`}
                    >
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  </div>
                </div>
              </div>

              {/* Creator engagement likes block */}
              <div className="flex items-center justify-between border-t border-stone-900 pt-4">
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => handleToggleCreatorLike(cre.id)}
                    className={`p-2 rounded-xl transition-all cursor-pointer ${
                      cre.hasLikedVideo 
                        ? 'bg-rose-500/10 text-rose-500 border border-rose-500/25' 
                        : 'bg-stone-900 text-stone-500 hover:text-rose-450 hover:scale-105 border border-transparent'
                    }`}
                  >
                    <Heart className={`w-3.5 h-3.5 ${cre.hasLikedVideo ? 'fill-rose-500' : ''}`} />
                  </button>
                  <span className="text-[10.5px] font-mono text-stone-400">{cre.likesCount} Enthusiasts Liked</span>
                </div>

                <a
                  href={`https://${cre.platform}.com`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-4 py-2 bg-stone-900 hover:bg-[#121214] border border-stone-850 text-stone-300 hover:text-white rounded-xl font-mono text-[9px] uppercase tracking-widest transition-all cursor-pointer flex items-center gap-1.5"
                >
                  <span>Visit channel</span>
                  <ExternalLink className="w-2.5 h-2.5" />
                </a>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* MODAL 1: HOST CLUB EVENT */}
      <AnimatePresence>
        {showEventModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-stone-950/85 backdrop-blur-sm p-4 overflow-y-auto">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="relative w-full max-w-lg bg-stone-900 border border-stone-800 rounded-3xl p-6 md:p-8 space-y-6 shadow-2xl my-8 text-left"
            >
              {/* Close pin */}
              <button
                type="button"
                onClick={() => setShowEventModal(false)}
                className="absolute top-5 right-5 text-stone-550 hover:text-white font-mono cursor-pointer text-base p-1.5 rounded-full bg-stone-950 border border-stone-800"
              >
                ✕
              </button>

              <div className="space-y-1.5">
                <span className="text-[9px] font-mono uppercase tracking-[0.2em] text-amber-500 font-extrabold block">Organize Gathering</span>
                <h3 className="text-lg font-light text-stone-100 tracking-tight">Host an Automotive <span className="font-semibold text-white">Event</span></h3>
                <p className="text-xs text-stone-450 font-sans leading-relaxed">
                  Arrange a canyon convoy, track sprint, or coffee meetup. Normal accounts are verified as active attendees. Official dealers feature a highlight badge.
                </p>
              </div>

              <form onSubmit={handleCreateNewEvent} className="space-y-4 pt-1 font-mono text-[10px]">
                {/* Event Title */}
                <div className="space-y-1.5">
                  <label className="text-[9px] uppercase tracking-wider text-stone-500 font-bold block">Event Name *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Sunset Boulevard Midnight Loop"
                    value={eventTitle}
                    onChange={(e) => setEventTitle(e.target.value)}
                    className="w-full bg-stone-950 border border-stone-850 rounded-xl py-3 px-4 text-stone-200 placeholder-stone-700 font-sans text-xs focus:outline-none focus:border-amber-500"
                  />
                </div>

                {/* Event Description */}
                <div className="space-y-1.5">
                  <label className="text-[9px] uppercase tracking-wider text-stone-500 font-bold block">Description Details *</label>
                  <textarea
                    required
                    rows={3}
                    placeholder="Provide route plans, vehicle level standards, staging grids, or requirements."
                    value={eventDesc}
                    onChange={(e) => setEventDesc(e.target.value)}
                    className="w-full bg-stone-950 border border-stone-850 rounded-xl py-3 px-4 text-stone-200 placeholder-stone-700 font-sans text-xs focus:outline-none focus:border-amber-500"
                  />
                </div>

                {/* Grid inputs for Type & Date */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-[9px] uppercase tracking-wider text-stone-500 font-bold block">Event Type</label>
                    <select
                      value={eventType}
                      onChange={(e: any) => setEventType(e.target.value)}
                      className="w-full bg-stone-950 border border-stone-850 rounded-xl py-3 px-4 text-stone-200 text-xs focus:outline-none focus:border-amber-500"
                    >
                      <option value="meetup">Group Coffee Meetup</option>
                      <option value="ride">Scenic Convoy Sprint</option>
                      <option value="track_day">Track Trials Competition</option>
                    </select>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[9px] uppercase tracking-wider text-stone-500 font-bold block">Staging Date & Time *</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. June 28 at 08:30 AM"
                      value={eventDate}
                      onChange={(e) => setEventDate(e.target.value)}
                      className="w-full bg-stone-950 border border-stone-850 rounded-xl py-3 px-4 text-stone-200 placeholder-stone-700 text-xs focus:outline-none focus:border-amber-500"
                    />
                  </div>
                </div>

                {/* Location & Premium Switch */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-[9px] uppercase tracking-wider text-stone-500 font-bold block">Starting Coordinates / Location *</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Angeles Crest Highway Staging Area"
                      value={eventLocation}
                      onChange={(e) => setEventLocation(e.target.value)}
                      className="w-full bg-stone-950 border border-stone-850 rounded-xl py-3 px-4 text-stone-200 placeholder-stone-700 font-sans text-xs focus:outline-none focus:border-amber-500"
                    />
                  </div>

                  <div className="space-y-1.5 flex flex-col justify-center">
                    <label className="text-[9px] uppercase tracking-wider text-stone-500 font-bold block mb-1">Access Level</label>
                    <label className="flex items-center gap-2 bg-stone-950 border border-stone-850 rounded-xl p-3 cursor-pointer hover:border-amber-500 transition-colors">
                      <input
                        type="checkbox"
                        checked={eventIsPremium}
                        onChange={(e) => setEventIsPremium(e.target.checked)}
                        className="rounded border-stone-800 bg-stone-900 text-amber-500 focus:ring-amber-500 focus:ring-offset-stone-950"
                      />
                      <span className="text-[10px] text-stone-300 font-medium font-mono uppercase">Veloce GT Member Exclusive</span>
                    </label>
                  </div>
                </div>

                {/* Sponsor Type Selection & Price/Attendance Fee layout */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-[9px] uppercase tracking-wider text-stone-500 font-bold block">Sponsor Classification</label>
                    <select
                      value={eventSponsorType}
                      onChange={(e: any) => setEventSponsorType(e.target.value)}
                      className="w-full bg-stone-950 border border-stone-850 rounded-xl py-3 px-4 text-stone-200 text-xs focus:outline-none focus:border-amber-500"
                    >
                      <option value="private_sponsor">Enthusiast Private Sponsor</option>
                      <option value="dealer">Official Authorized Dealer Sponsor</option>
                    </select>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[9px] uppercase tracking-wider text-stone-500 font-bold block">Entry Fee Mechanism</label>
                    <div className="grid grid-cols-2 gap-2 bg-stone-950 border border-stone-850 rounded-xl p-1">
                      <button
                        type="button"
                        onClick={() => setEventFeeType('free')}
                        className={`py-1.5 rounded-lg text-[9px] font-mono uppercase tracking-wider transition cursor-pointer ${
                          eventFeeType === 'free' ? 'bg-stone-900 text-amber-500' : 'text-stone-500'
                        }`}
                      >
                        Free Meet
                      </button>
                      <button
                        type="button"
                        onClick={() => setEventFeeType('paid')}
                        className={`py-1.5 rounded-lg text-[9px] font-mono uppercase tracking-wider transition cursor-pointer ${
                          eventFeeType === 'paid' ? 'bg-stone-900 text-amber-500' : 'text-stone-500'
                        }`}
                      >
                        Paid Fee
                      </button>
                    </div>
                  </div>
                </div>

                {/* Show attendance fee input block conditionally */}
                {eventFeeType === 'paid' && (
                  <motion.div 
                    initial={{ opacity: 0, y: -5 }} 
                    animate={{ opacity: 1, y: 0 }} 
                    className="space-y-1.5"
                  >
                    <label className="text-[9px] uppercase tracking-wider text-stone-500 font-bold block">Attendance Fee Amount (USD) *</label>
                    <input
                      type="number"
                      required
                      min="1"
                      placeholder="e.g. 50"
                      value={eventFeeAmount}
                      onChange={(e) => setEventFeeAmount(e.target.value)}
                      className="w-full bg-stone-950 border border-stone-850 rounded-xl py-3 px-4 text-stone-200 placeholder-stone-700 text-xs focus:outline-none focus:border-amber-500"
                    />
                  </motion.div>
                )}

                <div className="flex gap-3 pt-4">
                  <button
                    type="submit"
                    className="flex-1 py-3 bg-amber-500 hover:bg-amber-450 text-stone-950 rounded-xl font-mono text-[9.5px] font-extrabold uppercase tracking-widest transition-all cursor-pointer shadow-lg"
                  >
                    Publish Club Meeting
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowEventModal(false)}
                    className="px-5 py-3 bg-stone-950 hover:bg-stone-900 border border-stone-850 text-stone-400 hover:text-white rounded-xl transition cursor-pointer"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* MODAL 2: SUBMIT CHANNEL */}
      <AnimatePresence>
        {showCreatorModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-stone-950/85 backdrop-blur-sm p-4 overflow-y-auto">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="relative w-full max-w-lg bg-stone-900 border border-stone-800 rounded-3xl p-6 md:p-8 space-y-6 shadow-2xl my-8 text-left"
            >
              {/* Close pin */}
              <button
                type="button"
                onClick={() => setShowCreatorModal(false)}
                className="absolute top-5 right-5 text-stone-555 hover:text-white font-mono cursor-pointer text-base p-1.5 rounded-full bg-stone-950 border border-stone-800"
              >
                ✕
              </button>

              <div className="space-y-1.5">
                <span className="text-[9px] font-mono uppercase tracking-[0.2em] text-amber-500 font-extrabold block">Cross Promotion</span>
                <h3 className="text-lg font-light text-stone-100 tracking-tight">Submit Your Social <span className="font-semibold text-white">Channel</span></h3>
                <p className="text-xs text-stone-450 font-sans leading-relaxed">
                  Promote your automotive social pages (YouTube, Instagram, TikTok, Twitch) to over 50k luxury collectors. Increase clicks, likes, and followers instantly.
                </p>
              </div>

              <form onSubmit={handleSubmitCreator} className="space-y-4 pt-1 font-mono text-[10px]">
                {/* Creator Name */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-[9px] uppercase tracking-wider text-stone-500 font-bold block">Creator/Brand Name *</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Apex Drift Club"
                      value={creatorName}
                      onChange={(e) => setCreatorName(e.target.value)}
                      className="w-full bg-stone-950 border border-stone-850 rounded-xl py-3 px-4 text-stone-200 placeholder-stone-700 font-sans text-xs focus:outline-none focus:border-amber-500"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[9px] uppercase tracking-wider text-stone-500 font-bold block">Social Hook/Username *</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. @apexdrift"
                      value={creatorUser}
                      onChange={(e) => setCreatorUser(e.target.value)}
                      className="w-full bg-stone-950 border border-stone-850 rounded-xl py-3 px-4 text-stone-200 placeholder-stone-700 text-xs focus:outline-none focus:border-amber-500"
                    />
                  </div>
                </div>

                {/* Platform and metrics */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-[9px] uppercase tracking-wider text-stone-500 font-bold block">Social Platform</label>
                    <select
                      value={creatorPlatform}
                      onChange={(e: any) => setCreatorPlatform(e.target.value)}
                      className="w-full bg-stone-950 border border-stone-850 rounded-xl py-3 px-4 text-stone-200 text-xs focus:outline-none focus:border-amber-500"
                    >
                      <option value="youtube">YouTube Channel</option>
                      <option value="instagram">Instagram Portfolio</option>
                      <option value="tiktok">TikTok Short Form</option>
                      <option value="twitch">Twitch Live Streams</option>
                    </select>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[9px] uppercase tracking-wider text-stone-500 font-bold block">Follower Metrics *</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. 240K subscribers"
                      value={creatorFol}
                      onChange={(e) => setCreatorFol(e.target.value)}
                      className="w-full bg-stone-950 border border-stone-850 rounded-xl py-3 px-4 text-stone-200 placeholder-stone-700 text-xs focus:outline-none focus:border-amber-500"
                    />
                  </div>
                </div>

                {/* Creator Niche */}
                <div className="space-y-1.5">
                  <label className="text-[9px] uppercase tracking-wider text-stone-500 font-bold block">Channel Niche / Content Focus *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Cine-vlogs of supercar tuning, canyon drifting & sound exhausts"
                    value={creatorNiche}
                    onChange={(e) => setCreatorNiche(e.target.value)}
                    className="w-full bg-stone-950 border border-stone-850 rounded-xl py-3 px-4 text-stone-200 placeholder-stone-700 font-sans text-xs focus:outline-none focus:border-amber-500"
                  />
                </div>

                <div className="flex gap-3 pt-4">
                  <button
                    type="submit"
                    className="flex-1 py-3 bg-amber-500 hover:bg-amber-450 text-stone-950 rounded-xl font-mono text-[9.5px] font-extrabold uppercase tracking-widest transition-all cursor-pointer shadow-lg"
                  >
                    Submit Creator Profile
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowCreatorModal(false)}
                    className="px-5 py-3 bg-stone-950 hover:bg-stone-900 border border-stone-850 text-stone-400 hover:text-white rounded-xl transition cursor-pointer"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* MODAL 3: EVENT SPEC DETAILS POPUP */}
      <AnimatePresence>
        {selectedEventForDetails && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-stone-950/85 backdrop-blur-sm p-4 overflow-y-auto">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="relative w-full max-w-lg bg-stone-900 border border-stone-800 rounded-3xl p-6 md:p-8 space-y-6 shadow-2xl my-8 text-left"
            >
              {/* Close pin */}
              <button
                type="button"
                onClick={() => {
                  setSelectedEventForDetails(null);
                  setShowEventReportForm(false);
                  setEventReportReason("");
                  setEventReportSuccess(null);
                }}
                className="absolute top-5 right-5 text-stone-500 hover:text-white font-mono cursor-pointer text-base p-1.5 rounded-full bg-stone-950 border border-stone-800"
              >
                ✕
              </button>

              <div className="space-y-1.5">
                <div className="flex items-center gap-1.5 flex-wrap">
                  <span className={`text-[8.5px] font-mono uppercase tracking-widest px-2.5 py-1 rounded-full border ${
                    selectedEventForDetails.type === 'track_day' 
                      ? 'bg-red-500/10 border-red-500/20 text-red-400' 
                      : selectedEventForDetails.type === 'ride' 
                        ? 'bg-amber-500/10 border-amber-505/20 text-amber-500' 
                        : 'bg-indigo-505/10 border-indigo-500/25 text-indigo-400'
                  }`}>
                    {selectedEventForDetails.type === 'track_day' ? 'Track Day' : selectedEventForDetails.type === 'ride' ? 'Scenic Rally' : 'Group Meet'}
                  </span>

                  {selectedEventForDetails.isPremium && (
                    <span className="text-[8.5px] font-mono uppercase tracking-widest px-2.5 py-1 rounded-full border bg-amber-500/10 border-amber-500/35 text-amber-500 font-extrabold shadow-sm">
                      GT Member Exclusive
                    </span>
                  )}
                </div>
                <h3 className="text-xl font-semibold text-white tracking-wide uppercase font-mono mt-1">
                  {selectedEventForDetails.title}
                </h3>
              </div>

              {/* Specs parameters table */}
              <div className="grid grid-cols-2 gap-3 bg-stone-950 border border-stone-850 rounded-2xl p-4 font-mono text-[10px]">
                <div>
                  <span className="text-[8px] text-stone-500 uppercase block tracking-wider leading-none">Starting Coordinates / Location</span>
                  <span className="text-stone-200 mt-1 block font-sans truncate" title={selectedEventForDetails.location}>{selectedEventForDetails.location}</span>
                </div>
                <div>
                  <span className="text-[8px] text-stone-500 uppercase block tracking-wider leading-none">Schedule Date & Time</span>
                  <span className="text-stone-200 mt-1 block font-sans">{selectedEventForDetails.date}</span>
                </div>
                <div>
                  <span className="text-[8px] text-stone-500 uppercase block tracking-wider leading-none">Sponsor Classification</span>
                  <span className={`mt-0.5 inline-block text-[8.5px] px-1.5 py-0.5 rounded font-extrabold tracking-wider ${
                    selectedEventForDetails.sponsoredBy === 'dealer'
                      ? 'bg-amber-500/10 border border-amber-550/25 text-amber-500'
                      : 'bg-stone-900 border border-stone-800 text-stone-400'
                  }`}>
                    {selectedEventForDetails.sponsoredBy === 'dealer' ? 'Official Dealer Sponsor' : 'Private Enthusiast Sponsor'}
                  </span>
                </div>
                <div>
                  <span className="text-[8px] text-stone-500 uppercase block tracking-wider leading-none">Entry Mechanism</span>
                  <span className={`mt-0.5 inline-block text-[8.5px] px-1.5 py-0.5 rounded font-extrabold tracking-wider ${
                    selectedEventForDetails.feeType === 'paid'
                      ? 'bg-emerald-500/10 border border-emerald-500/35 text-emerald-400'
                      : 'bg-stone-900 border border-stone-850 text-stone-400'
                  }`}>
                    {selectedEventForDetails.feeType === 'paid' ? `Attendance Fee: $${selectedEventForDetails.feeAmount} USD` : 'Complimentary Free Event'}
                  </span>
                </div>
              </div>

              {/* Long Details Description */}
              <div className="space-y-1.5">
                <span className="text-[9px] font-mono uppercase tracking-wider text-stone-500 font-bold block">Event Details</span>
                <p className="text-xs text-stone-300 font-sans leading-relaxed bg-stone-950/40 p-4 border border-stone-850 rounded-xl">
                  {selectedEventForDetails.description}
                </p>
              </div>

              {/* Host organizer metadata */}
              <div className="flex items-center justify-between p-3.5 bg-stone-950 rounded-2xl border border-stone-850">
                <div className="flex items-center gap-2.5">
                  <img referrerPolicy="no-referrer" src={selectedEventForDetails.hostAvatar} alt={selectedEventForDetails.hostName} className="w-8 h-8 rounded-full object-cover border border-stone-800 shadow" />
                  <div>
                    <span className="text-[8px] text-stone-550 uppercase font-mono block leading-none">Convoy Host</span>
                    <span className="text-xs text-stone-100 font-sans font-medium">{selectedEventForDetails.hostName}</span>
                  </div>
                </div>
                <div className="text-right font-mono text-[9.5px] text-stone-500">
                  <span>{selectedEventForDetails.participantsCount} Registered</span>
                </div>
              </div>

              {/* UGC Shield & Reporting Center */}
              <div className="border-t border-stone-850 pt-4 space-y-3">
                {!showEventReportForm ? (
                  <button
                    type="button"
                    onClick={() => setShowEventReportForm(true)}
                    className="flex items-center gap-1.5 text-[9.5px] font-mono uppercase tracking-widest text-stone-550 hover:text-red-400 transition cursor-pointer"
                  >
                    <Shield className="w-3.5 h-3.5" />
                    <span>Report this Event to UGC Moderation</span>
                  </button>
                ) : eventReportSuccess ? (
                  <div className="p-3 bg-semibold bg-emerald-500/15 border border-emerald-500/30 rounded-xl space-y-1 text-center font-mono text-[9px]">
                    <p className="text-emerald-400 font-bold uppercase tracking-wider">✓ Event Successfully Reported</p>
                    <p className="text-stone-300 font-sans leading-relaxed text-[11px]">{eventReportSuccess}</p>
                  </div>
                ) : (
                  <div className="bg-stone-950 p-4 border border-stone-850 rounded-2xl space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-[9.5px] font-mono font-bold uppercase tracking-widest text-stone-400">Specify Violation Details</span>
                      <button 
                        type="button" 
                        onClick={() => setShowEventReportForm(false)} 
                        className="text-[9.5px] font-mono uppercase text-stone-500 hover:text-white"
                      >
                        Cancel
                      </button>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-2">
                      {[
                        'Inappropriate/Offensive Details',
                        'Spam/Misrepresented Gathering',
                        'Commercial Solicitation',
                        'Unsafe Driving/Illegal Activities'
                      ].map((reason) => (
                        <button
                          key={reason}
                          type="button"
                          onClick={() => setEventReportReason(reason)}
                          className={`p-2 rounded-xl text-left border text-[10px] font-sans transition-all cursor-pointer ${
                            eventReportReason === reason
                              ? 'bg-red-500/10 border-red-500/40 text-red-400 font-medium'
                              : 'bg-stone-900 border-stone-850 text-stone-300 font-normal shadow-sm'
                          }`}
                        >
                          {reason}
                        </button>
                      ))}
                    </div>

                    <button
                      type="button"
                      disabled={!eventReportReason}
                      onClick={async () => {
                        try {
                          let token = "";
                          if (auth.currentUser) {
                            token = await auth.currentUser.getIdToken();
                          }
                          const response = await fetch('/api/reports', {
                            method: 'POST',
                            headers: {
                              'Content-Type': 'application/json',
                              ...(token ? { 'Authorization': `Bearer ${token}` } : {})
                            },
                            body: JSON.stringify({
                              targetType: 'event',
                              targetId: selectedEventForDetails.id,
                              reason: eventReportReason
                            })
                          });
                          if (!response.ok) {
                            throw new Error("Failed to file UGC event audit ticket.");
                          }
                          setEventReportSuccess(`UGC safety report saved. Our moderation team has queued "${eventReportReason}" for inspection.`);
                        } catch (err: any) {
                          console.error("Event report failed:", err);
                          alert(err.message || "UGC network issue. Please try again.");
                        }
                      }}
                      className="w-full py-2 bg-red-650 hover:bg-red-600 disabled:opacity-30 disabled:cursor-not-allowed border border-red-500/20 text-white rounded-xl font-mono text-[9px] font-bold uppercase tracking-wider transition-all cursor-pointer"
                    >
                      Submit Flag Report
                    </button>
                  </div>
                )}
              </div>

              {/* Modal footer with RSVP and close buttons */}
              <div className="flex gap-2.5 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    handleToggleEventRSVP(selectedEventForDetails.id);
                    // Update state to match toggled registration
                    setSelectedEventForDetails(prev => prev ? { 
                      ...prev, 
                      joined: !prev.joined, 
                      participantsCount: prev.joined ? prev.participantsCount - 1 : prev.participantsCount + 1 
                    } : null);
                  }}
                  className={`flex-1 py-3 items-center justify-center text-center font-mono text-[10px] uppercase font-extrabold tracking-widest rounded-xl transition cursor-pointer border ${
                    selectedEventForDetails.joined
                      ? 'bg-emerald-500/10 border-emerald-500/35 text-emerald-400 font-bold'
                      : selectedEventForDetails.isPremium && currentUser?.subscriptionTier !== 'veloce_gt' && currentUser?.subscriptionTier !== 'dealer_paid'
                        ? 'bg-stone-955 border-stone-900 text-stone-600 cursor-not-allowed hover:bg-stone-955'
                        : 'bg-amber-500 hover:bg-amber-450 hover:scale-[1.01] text-stone-950'
                  }`}
                >
                  {selectedEventForDetails.joined 
                    ? '✓ Registered (Cancel)' 
                    : selectedEventForDetails.isPremium && currentUser?.subscriptionTier !== 'veloce_gt' && currentUser?.subscriptionTier !== 'dealer_paid'
                      ? 'Premium Required'
                      : 'Join the Meet now'}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setSelectedEventForDetails(null);
                    setShowEventReportForm(false);
                    setEventReportReason("");
                    setEventReportSuccess(null);
                  }}
                  className="px-5 py-3 bg-stone-950 border border-stone-850 hover:bg-stone-850 text-stone-400 rounded-xl font-mono text-[9.5px] uppercase font-bold tracking-widest transition cursor-pointer"
                >
                  Dismiss
                </button>
              </div>

            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
}
