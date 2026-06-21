import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Shield, AlertTriangle, Check, Trash2, Scale, RefreshCw, 
  BarChart3, Users, Car, Calendar, DollarSign, Eye, EyeOff, 
  UserCheck, ShieldCheck, FileCheck, CircleAlert, Sparkles, Sliders
} from 'lucide-react';
import { User, Car as CarType } from '../types';
import { auth } from '../lib/firebase';

interface AdminSafetyConsoleProps {
  currentUser: User;
  theme: 'light' | 'dark';
}

interface ReportTicket {
  id: string;
  reporterId: string;
  targetType: 'vehicle' | 'event';
  targetId: string;
  reason: string;
  status: 'pending' | 'resolved';
  createdAt: string;
}

export default function AdminSafetyConsole({ currentUser, theme }: AdminSafetyConsoleProps) {
  const [activeTab, setActiveTab] = useState<'overview' | 'reports' | 'vehicles' | 'users' | 'bookings'>('overview');
  const [reports, setReports] = useState<ReportTicket[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterType, setFilterType] = useState<'all' | 'vehicle' | 'event'>('all');
  const [filterStatus, setFilterStatus] = useState<'pending' | 'resolved'>('pending');
  const [message, setMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  // Big Dashboard Entities State
  const [metrics, setMetrics] = useState<any>(null);
  const [allUsers, setAllUsers] = useState<any[]>([]);
  const [allBookings, setAllBookings] = useState<any[]>([]);
  const [allVehicles, setAllVehicles] = useState<any[]>([]);

  // Individual loaders
  const fetchReports = async () => {
    setLoading(true);
    try {
      let token = "";
      if (auth.currentUser) {
        token = await auth.currentUser.getIdToken();
      }
      const response = await fetch('/api/reports', {
        headers: {
          ...(token ? { 'Authorization': `Bearer ${token}` } : {})
        }
      });
      if (!response.ok) {
        throw new Error("Failed to load UGC safety reports from server.");
      }
      const data = await response.json();
      setReports(data);
    } catch (err: any) {
      console.error(err);
      setMessage({ text: err.message || "Error communicating with UGC shield server.", type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  const loadActiveTabData = async () => {
    setLoading(true);
    try {
      let token = "";
      if (auth.currentUser) {
        token = await auth.currentUser.getIdToken();
      }
      const headers = {
        ...(token ? { 'Authorization': `Bearer ${token}` } : {})
      };

      if (activeTab === 'overview') {
        const res = await fetch('/api/admin/metrics', { headers });
        if (res.ok) {
          setMetrics(await res.json());
        } else {
          throw new Error("Unable to retrieve marketplace metrics summary.");
        }
      } else if (activeTab === 'reports') {
        await fetchReports();
      } else if (activeTab === 'users') {
        const res = await fetch('/api/admin/users', { headers });
        if (res.ok) {
          setAllUsers(await res.json());
        } else {
          throw new Error("Unable to retrieve user account directory.");
        }
      } else if (activeTab === 'bookings') {
        const res = await fetch('/api/admin/bookings', { headers });
        if (res.ok) {
          setAllBookings(await res.json());
        } else {
          throw new Error("Unable to retrieve global system bookings.");
        }
      } else if (activeTab === 'vehicles') {
        const res = await fetch('/api/admin/vehicles', { headers });
        if (res.ok) {
          setAllVehicles(await res.json());
        } else {
          throw new Error("Unable to retrieve overall vehicles fleet.");
        }
      }
    } catch (err: any) {
      console.error(err);
      setMessage({ text: err.message || "Failed to load directory details.", type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (currentUser.role === 'admin') {
      loadActiveTabData();
    }
  }, [currentUser.role, activeTab]);

  // Keep asset - dismiss tickets
  const handleResolveTicket = async (reportId: string) => {
    try {
      let token = "";
      if (auth.currentUser) {
        token = await auth.currentUser.getIdToken();
      }
      const response = await fetch(`/api/reports/${reportId}/resolve`, {
        method: 'PUT',
        headers: {
          ...(token ? { 'Authorization': `Bearer ${token}` } : {})
        }
      });
      if (!response.ok) {
        throw new Error("Unable to archive moderation ticket.");
      }
      
      setMessage({ text: "Report ticket resolved and archived successfully.", type: 'success' });
      setTimeout(() => setMessage(null), 4000);
      fetchReports(); // Refresh
    } catch (err: any) {
      alert(err.message || "Action failed.");
    }
  };

  // Delete violating asset & resolve report
  const handleSanctionAsset = async (reportId: string, targetType: 'vehicle' | 'event', targetId: string) => {
    if (!window.confirm(`Are you absolutely sure you want to sanitize and purge this ${targetType}? This is an irreversible UGC moderator command.`)) {
      return;
    }

    try {
      let token = "";
      if (auth.currentUser) {
        token = await auth.currentUser.getIdToken();
      }

      const sanctionUrl = targetType === 'vehicle' 
        ? `/api/admin/vehicles/${targetId}`
        : `/api/admin/community/events/${targetId}`;

      // 1. Delete asset
      const delResponse = await fetch(sanctionUrl, {
        method: 'DELETE',
        headers: {
          ...(token ? { 'Authorization': `Bearer ${token}` } : {})
        }
      });

      if (!delResponse.ok) {
        throw new Error(`Failed to delete target asset ${targetId}.`);
      }

      // 2. Resolve ticket
      const resolveResponse = await fetch(`/api/reports/${reportId}/resolve`, {
        method: 'PUT',
        headers: {
          ...(token ? { 'Authorization': `Bearer ${token}` } : {})
        }
      });

      if (!resolveResponse.ok) {
        throw new Error("Asset purged, but moderation ticket resolution status update failed.");
      }

      setMessage({ text: `Irreversibly purged reported ${targetType} and closed audit ticket perfectly.`, type: 'success' });
      setTimeout(() => setMessage(null), 5000);
      fetchReports(); // Refresh list
    } catch (err: any) {
      alert(err.message || "Failed to purge UGC violation asset.");
    }
  };

  // Approve or Reject vehicles status
  const handleUpdateVehicleStatus = async (vehicleId: string, newStatus: string) => {
    try {
      let token = "";
      if (auth.currentUser) {
        token = await auth.currentUser.getIdToken();
      }
      const response = await fetch(`/api/admin/vehicles/${vehicleId}/status`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { 'Authorization': `Bearer ${token}` } : {})
        },
        body: JSON.stringify({ status: newStatus })
      });
      if (!response.ok) {
        throw new Error("Unable to change vehicle listing status.");
      }
      setMessage({ text: `Listing status successfully transformed to "${newStatus}".`, type: 'success' });
      setTimeout(() => setMessage(null), 4000);
      
      // Update local state smoothly
      setAllVehicles(prev => prev.map(v => v.id === vehicleId ? { ...v, status: newStatus } : v));
    } catch (err: any) {
      alert(err.message || "Failed to update listing status.");
    }
  };

  const filtered = reports.filter(rep => {
    if (filterType !== 'all' && rep.targetType !== filterType) return false;
    return rep.status === filterStatus;
  });

  return (
    <div id="ugc_moderation_panel" className="bg-stone-900 border border-stone-850 p-6 md:p-8 rounded-3xl space-y-6">
      
      {/* Moderation header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-stone-850 pb-5">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <Shield className="w-5 h-5 text-[#d97706] fill-[#d97706]/10 shrink-0" />
            <h3 className="text-sm font-mono uppercase tracking-[0.2em] text-[#d97706] font-extrabold flex items-center gap-1.5">
              <span>Veloce Administration Authority</span>
              <span className="text-[8px] bg-amber-500/15 text-[#d97706] border border-amber-500/20 px-2 py-0.5 rounded font-mono font-bold tracking-widest">
                SYSTEM ADMINISTRATOR
              </span>
            </h3>
          </div>
          <p className="text-xs text-stone-400">
            Secure command center to regulate listings, manage system transactions, view user directories, and enforce community safety.
          </p>
        </div>

        {/* Global actions */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={loadActiveTabData}
            className="p-2 bg-stone-950 hover:bg-stone-850 border border-stone-850 text-stone-400 hover:text-white rounded-xl transition cursor-pointer"
            title="Refresh active directory data"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {message && (
        <div className={`p-4 rounded-xl border text-xs font-mono font-bold ${
          message.type === 'success' 
            ? 'bg-emerald-500/10 border-emerald-505/20 text-emerald-400' 
            : 'bg-red-500/10 border-red-505/25 text-red-400'
        }`}>
          {message.type === 'success' ? '✓ ' : '✕ '} {message.text}
        </div>
      )}

      {/* Main Tab Controls */}
      <div className="flex flex-wrap items-center gap-2 border-b border-stone-850 pb-3">
        {[
          { id: 'overview', label: 'Overview Metrics', icon: BarChart3 },
          { id: 'reports', label: 'Safety Flags', icon: CircleAlert },
          { id: 'vehicles', label: 'Oversee Fleet', icon: Car },
          { id: 'users', label: 'User Registry', icon: Users },
          { id: 'bookings', label: 'Bookings Ledger', icon: Calendar }
        ].map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => {
                setActiveTab(tab.id as any);
                setMessage(null);
              }}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-mono text-[10px] uppercase font-bold tracking-wider transition-all cursor-pointer ${
                isActive 
                  ? 'bg-amber-500 text-stone-950 shadow-md shadow-amber-950/20' 
                  : 'bg-stone-950 hover:bg-stone-850 border border-stone-850 text-stone-400 hover:text-stone-200'
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* Content wrapper with loading boundaries */}
      <div className="space-y-4">
        {loading ? (
          <div className="py-20 text-center font-mono text-xs text-stone-500 animate-pulse flex flex-col items-center justify-center space-y-3">
            <RefreshCw className="w-6 h-6 text-amber-500 animate-spin" />
            <span>Establishing secure database payload pipeline...</span>
          </div>
        ) : (
          <AnimatePresence mode="wait">
            
            {/* OVERVIEW METRICS TAB */}
            {activeTab === 'overview' && metrics && (
              <motion.div
                key="tab_overview"
                initial={{ opacity: 0, y: 5 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -5 }}
                className="space-y-6"
              >
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                  {/* Total users */}
                  <div className="bg-stone-950 border border-stone-850 p-5 rounded-2xl space-y-2.5">
                    <div className="flex items-center justify-between">
                      <span className="text-[9px] font-mono uppercase tracking-widest text-stone-500 font-bold">Total Accounts</span>
                      <Users className="w-4 h-4 text-sky-400" />
                    </div>
                    <div>
                      <h4 className="text-2xl font-mono font-extrabold text-[#d97706]">{metrics.totalUsers}</h4>
                      <div className="text-[10px] font-mono text-stone-500 mt-1">
                        Dealers: <strong className="text-stone-300">{metrics.totalDealers}</strong>
                      </div>
                    </div>
                  </div>

                  {/* Listings metrics */}
                  <div className="bg-stone-950 border border-stone-850 p-5 rounded-2xl space-y-2.5">
                    <div className="flex items-center justify-between">
                      <span className="text-[9px] font-mono uppercase tracking-widest text-stone-500 font-bold">Vehicles Catalog</span>
                      <Car className="w-4 h-4 text-amber-500" />
                    </div>
                    <div>
                      <h4 className="text-2xl font-mono font-extrabold text-stone-100">{metrics.activeListings + metrics.pendingReviewListings}</h4>
                      <div className="text-[10px] font-mono text-stone-500 mt-1 flex gap-2">
                        <span>Active: <strong className="text-emerald-400">{metrics.activeListings}</strong></span>
                        <span>Pending Review: <strong className="text-amber-500">{metrics.pendingReviewListings}</strong></span>
                      </div>
                    </div>
                  </div>

                  {/* Booking ledger metrics */}
                  <div className="bg-stone-950 border border-stone-850 p-5 rounded-2xl space-y-2.5">
                    <div className="flex items-center justify-between">
                      <span className="text-[9px] font-mono uppercase tracking-widest text-stone-500 font-bold">Reservations Value</span>
                      <DollarSign className="w-4 h-4 text-emerald-400" />
                    </div>
                    <div>
                      <h4 className="text-2xl font-mono font-extrabold text-emerald-400">
                        ${metrics.totalVolumeUSD?.toLocaleString() || "0"} <span className="text-[9px] font-mono text-stone-550 font-normal">USD</span>
                      </h4>
                      <div className="text-[10px] font-mono text-stone-500 mt-1">
                        Active: <strong className="text-stone-300">{metrics.activeBookingsCount}</strong> | Pending: <strong className="text-stone-400">{metrics.pendingBookingsCount}</strong>
                      </div>
                    </div>
                  </div>

                  {/* UGC Safety pending metrics */}
                  <div className="bg-stone-950 border border-stone-850 p-5 rounded-2xl space-y-2.5">
                    <div className="flex items-center justify-between">
                      <span className="text-[9px] font-mono uppercase tracking-widest text-stone-500 font-bold">Moderation Backlog</span>
                      <Shield className="w-4 h-4 text-red-500" />
                    </div>
                    <div>
                      <h4 className={`text-2xl font-mono font-extrabold ${metrics.pendingReportsCount > 0 ? 'text-red-400 animate-pulse' : 'text-emerald-500'}`}>
                        {metrics.pendingReportsCount}
                      </h4>
                      <div className="text-[10px] font-mono text-stone-500 mt-1">
                        {metrics.pendingReportsCount > 0 ? "REQUIRES IMMEDIATE ACTION" : "Veloce is clear of safety issues"}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Dashboard helper highlights */}
                <div className="p-5 bg-gradient-to-r from-stone-950 to-stone-900 border border-stone-850 rounded-2xl flex flex-col md:flex-row items-start md:items-center gap-4">
                  <div className="p-3 bg-amber-500/10 border border-amber-500/20 rounded-xl">
                    <Sparkles className="w-5 h-5 text-amber-500" />
                  </div>
                  <div className="space-y-0.5">
                    <h5 className="text-xs font-mono font-bold text-stone-200 uppercase tracking-wider">Operational Guidelines & Compliance</h5>
                    <p className="text-[11px] text-stone-400 leading-relaxed font-sans">
                      All dealer listing updates undergo instant row level sanitization. Admins are empowered with override permissions to Purge abusive accounts and reject unverified assets. Use the tabs above to manage core platform tables.
                    </p>
                  </div>
                </div>
              </motion.div>
            )}

            {/* SAFETY FLAGS (REPORTS TICKET CONSOLE) */}
            {activeTab === 'reports' && (
              <motion.div
                key="tab_reports"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="space-y-4"
              >
                {/* Control Tab filters */}
                <div className="flex flex-wrap items-center justify-between gap-3 font-mono text-[10px] pb-2">
                  <div className="flex items-center gap-1 bg-stone-950 p-1 border border-stone-850 rounded-xl">
                    {[
                      { id: 'all', label: 'All Items' },
                      { id: 'vehicle', label: 'Vehicles' },
                      { id: 'event', label: 'Events' }
                    ].map(it => (
                      <button
                        key={it.id}
                        type="button"
                        onClick={() => setFilterType(it.id as any)}
                        className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                          filterType === it.id 
                            ? 'bg-stone-850 text-white font-extrabold' 
                            : 'text-stone-500 hover:text-stone-300'
                        }`}
                      >
                        {it.label}
                      </button>
                    ))}
                  </div>

                  <div className="flex items-center gap-1 bg-stone-950 p-1 border border-stone-850 rounded-xl">
                    {[
                      { id: 'pending', label: 'Unresolved' },
                      { id: 'resolved', label: 'Archived Logs' }
                    ].map(st => (
                      <button
                        key={st.id}
                        type="button"
                        onClick={() => setFilterStatus(st.id as any)}
                        className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                          filterStatus === st.id 
                            ? 'bg-red-500/15 border border-red-500/20 text-red-100 font-extrabold shadow-sm' 
                            : 'text-stone-500 hover:text-stone-300'
                        }`}
                      >
                        {st.label}
                      </button>
                    ))}
                  </div>
                </div>

                {filtered.length === 0 ? (
                  <div className="py-20 text-center border border-dashed border-stone-850 bg-stone-950/20 rounded-2xl flex flex-col items-center justify-center space-y-2">
                    <Scale className="w-8 h-8 text-stone-600 opacity-40" />
                    <p className="font-mono text-[10px] text-stone-500 uppercase font-bold tracking-wider">No tickets matches active parameters</p>
                    <p className="text-xs text-stone-400 max-w-xs font-sans">
                      All reported issues have been clean-resolved. Safe marketplace rules are strictly active.
                    </p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 gap-4">
                    {filtered.map(ticket => (
                      <div
                        key={ticket.id}
                        className="bg-stone-950 border border-stone-850 rounded-2xl p-5 flex flex-col md:flex-row justify-between gap-6"
                      >
                        <div className="space-y-3 flex-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className={`text-[8px] font-mono uppercase tracking-widest px-2.5 py-0.5 rounded border ${
                              ticket.targetType === 'vehicle' 
                                ? 'bg-amber-500/10 border-amber-505/25 text-amber-500' 
                                : 'bg-indigo-500/10 border-indigo-505/25 text-indigo-400'
                            }`}>
                              {ticket.targetType === 'vehicle' ? 'Vehicle Listing' : 'Community Event'}
                            </span>
                            <span className="text-[9px] font-mono text-stone-500">
                              Target Asset ID: <strong className="text-stone-400">{ticket.targetId}</strong>
                            </span>
                          </div>

                          <div className="space-y-1">
                            <div className="flex items-center gap-2">
                              <span className="w-1.5 h-1.5 rounded-full bg-red-500 shrink-0" />
                              <p className="text-xs font-mono font-bold text-stone-200">
                                Reason: <span className="text-red-400 uppercase tracking-widest text-[11px]">{ticket.reason}</span>
                              </p>
                            </div>
                            <div className="text-[10px] space-y-0.5 text-stone-550 font-mono">
                              <p>Reporter ID: <span className="text-stone-400">{ticket.reporterId || 'Anonymous user'}</span></p>
                              <p>Filing Date: <span className="text-stone-300">{new Date(ticket.createdAt).toLocaleString()}</span></p>
                            </div>
                          </div>
                        </div>

                        {ticket.status === 'pending' && (
                          <div className="flex flex-row md:flex-col justify-end gap-2 shrink-0 md:min-w-[170px]">
                            <button
                              type="button"
                              onClick={() => handleResolveTicket(ticket.id)}
                              className="flex-1 py-2 px-3 border border-stone-850 hover:border-emerald-500/40 bg-stone-900 text-emerald-400 text-[9px] font-mono uppercase font-bold tracking-wider rounded-xl transition cursor-pointer flex items-center justify-center gap-1.5"
                            >
                              <Check className="w-3.5 h-3.5" />
                              <span>Dismiss Flag</span>
                            </button>
                            
                            <button
                              type="button"
                              onClick={() => handleSanctionAsset(ticket.id, ticket.targetType, ticket.targetId)}
                              className="flex-1 py-2 px-3 bg-red-650 hover:bg-red-600 border border-red-500/20 text-white text-[9px] font-mono uppercase font-bold tracking-wider rounded-xl transition cursor-pointer flex items-center justify-center gap-1.5 shadow-lg shadow-red-950/20"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                              <span>Purge Asset</span>
                            </button>
                          </div>
                        )}

                        {ticket.status === 'resolved' && (
                          <div className="flex items-center gap-1.5 text-stone-500 font-mono text-[9px] uppercase tracking-wider font-extrabold shrink-0">
                            <Check className="w-4 h-4 text-emerald-500" />
                            <span>Audit Ticket Closed</span>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </motion.div>
            )}

            {/* VEHICLE FLEET MANAGEMENT TAB (APPROVE / REJECT LISTINGS) */}
            {activeTab === 'vehicles' && (
              <motion.div
                key="tab_vehicles"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="space-y-4"
              >
                {allVehicles.length === 0 ? (
                  <div className="py-20 text-center border border-dashed border-stone-850 bg-stone-950/20 rounded-2xl">
                    <p className="font-mono text-xs text-stone-500 uppercase tracking-widest">No listings found in Veloce schema</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 gap-4">
                    {allVehicles.map((car) => (
                      <div
                        key={car.id}
                        className="bg-stone-950 border border-stone-850 rounded-2xl p-4 flex flex-col md:flex-row items-start md:items-center justify-between gap-6"
                      >
                        {/* Car details with optional preview image */}
                        <div className="flex items-center gap-4 flex-1">
                          <div className="w-16 h-16 rounded-xl bg-stone-900 border border-stone-800 flex-shrink-0 overflow-hidden">
                            {car.images?.[0] ? (
                              <img referrerPolicy="no-referrer" src={car.images[0]} alt={car.title} className="w-full h-full object-cover" />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center text-[10px] font-mono text-stone-600 font-bold uppercase">No image</div>
                            )}
                          </div>
                          
                          <div className="space-y-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap text-[10px] font-mono font-bold uppercase">
                              <span className="text-stone-100 truncate max-w-[200px]">{car.year} {car.make} {car.model}</span>
                              <span className={`px-2 py-0.5 rounded border text-[8px] tracking-widest ${
                                car.status === 'active' 
                                  ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400' 
                                  : car.status === 'pending_review'
                                  ? 'bg-amber-500/10 border-amber-500/20 text-amber-500 animate-pulse'
                                  : car.status === 'rejected'
                                  ? 'bg-red-500/10 border-red-505/20 text-red-500'
                                  : 'bg-stone-800 border-stone-700 text-stone-400'
                              }`}>
                                {car.status}
                              </span>
                            </div>
                            
                            <p className="text-[10px] font-sans text-stone-450 leading-relaxed max-w-md truncate">
                              {car.description || 'No descriptive details available.'}
                            </p>
                            
                            <div className="text-[9px] font-mono text-stone-500 flex flex-wrap gap-x-3 gap-y-1">
                              <span>Pricing: <strong className="text-emerald-400">${car.price?.toLocaleString()} USD</strong></span>
                              <span>Daily: <strong className="text-[#d97706]">${car.rentalPriceDaily?.toLocaleString()}</strong></span>
                              <span>Location: <strong className="text-stone-300">{car.location}</strong></span>
                              <span>Owner UUID: <strong className="text-stone-400 text-[8px]">{car.ownerId}</strong></span>
                            </div>
                          </div>
                        </div>

                        {/* Status override modifiers */}
                        <div className="flex flex-wrap items-center gap-1.5 shrink-0 w-full md:w-auto">
                          {car.status !== 'active' && (
                            <button
                              type="button"
                              onClick={() => handleUpdateVehicleStatus(car.id, 'active')}
                              className="px-3.5 py-2 bg-emerald-700/20 hover:bg-emerald-600 border border-emerald-500/30 hover:border-emerald-500 text-emerald-400 hover:text-white rounded-xl text-[9px] font-mono uppercase font-bold tracking-widest transition cursor-pointer flex-1 md:flex-none text-center"
                            >
                              Approve Listing
                            </button>
                          )}

                          {car.status !== 'rejected' && (
                            <button
                              type="button"
                              onClick={() => handleUpdateVehicleStatus(car.id, 'rejected')}
                              className="px-3.5 py-2 bg-red-950/20 hover:bg-red-650 border border-red-500/25 hover:border-red-500 text-red-400 hover:text-white rounded-xl text-[9px] font-mono uppercase font-bold tracking-widest transition cursor-pointer flex-1 md:flex-none text-center"
                            >
                              Reject & Flag
                            </button>
                          )}

                          {car.status !== 'draft' && (
                            <button
                              type="button"
                              onClick={() => handleUpdateVehicleStatus(car.id, 'draft')}
                              className="px-3.5 py-2 hover:bg-stone-850 border border-stone-800 hover:border-stone-700 text-stone-400 hover:text-[#d97706] rounded-xl text-[9px] font-mono uppercase font-bold tracking-widest transition cursor-pointer flex-1 md:flex-none text-center"
                            >
                              Revert to Draft
                            </button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </motion.div>
            )}

            {/* USERS & MEMBER DIRECTORY TAB */}
            {activeTab === 'users' && (
              <motion.div
                key="tab_users"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="space-y-4"
              >
                <div className="bg-stone-950 border border-stone-850 rounded-2xl overflow-hidden font-mono text-[10px] text-stone-300">
                  <div className="p-4 bg-stone-900 border-b border-stone-850 text-stone-400 font-bold uppercase tracking-wider grid grid-cols-1 md:grid-cols-4 gap-3">
                    <span>Member details</span>
                    <span>Role Hierarchy</span>
                    <span>Subscription Tier</span>
                    <span>Identity KYC Status</span>
                  </div>

                  <div className="divide-y divide-stone-850">
                    {allUsers.map((usr) => (
                      <div key={usr.id} className="p-4 grid grid-cols-1 md:grid-cols-4 gap-3 items-center hover:bg-stone-900/40 transition">
                        {/* Member brief info */}
                        <div className="flex items-center gap-3">
                          <img referrerPolicy="no-referrer" src={usr.avatarUrl || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=100'} alt={usr.fullName} className="w-7 h-7 rounded-full object-cover border border-stone-800" />
                          <div className="min-w-0">
                            <span className="font-sans font-bold text-stone-200 block truncate leading-tight">{usr.fullName || 'Anonymous Veloce Member'}</span>
                            <span className="text-[9px] text-stone-500 block truncate leading-none mt-1">{usr.email}</span>
                          </div>
                        </div>

                        {/* Role display */}
                        <div>
                          <span className={`px-2.5 py-0.5 rounded border text-[8.5px] uppercase font-extrabold tracking-widest ${
                            usr.role === 'admin' 
                              ? 'bg-[#d97706]/10 border-amber-500/25 text-[#d97706]' 
                              : usr.role === 'dealer'
                              ? 'bg-rose-500/10 border-rose-500/25 text-rose-400'
                              : 'bg-stone-800 border-stone-750 text-stone-400'
                          }`}>
                            {usr.role}
                          </span>
                        </div>

                        {/* Subscription Tier display */}
                        <div>
                          <span className={`text-[9px] font-extrabold tracking-widest uppercase ${
                            usr.subscriptionTier === 'veloce_gt' 
                              ? 'text-amber-400 font-extrabold flex items-center gap-1' 
                              : usr.subscriptionTier === 'dealer_paid'
                              ? 'text-rose-400 font-extrabold'
                              : 'text-stone-500'
                          }`}>
                            {usr.subscriptionTier?.replace('_', ' ') || 'Free Tier'}
                          </span>
                        </div>

                        {/* KYC verification display */}
                        <div>
                          <span className={`px-2.5 py-0.5 rounded border text-[8.5px] uppercase tracking-wider ${
                            usr.kycStatus === 'verified'
                              ? 'bg-emerald-500/10 border-emerald-505/20 text-emerald-400 font-extrabold'
                              : usr.kycStatus === 'pending'
                              ? 'bg-amber-500/10 border-amber-505/25 text-amber-500 animate-pulse'
                              : usr.kycStatus === 'rejected'
                              ? 'bg-red-500/10 border-red-505/20 text-red-400'
                              : 'bg-stone-800/40 border-stone-850 text-stone-500'
                          }`}>
                            KYC: {usr.kycStatus || 'Unverified'}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </motion.div>
            )}

            {/* RESERVATIONS DESK (BOOKINGS LEDGER) */}
            {activeTab === 'bookings' && (
              <motion.div
                key="tab_bookings"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="space-y-4"
              >
                {allBookings.length === 0 ? (
                  <div className="py-20 text-center border border-dashed border-stone-850 bg-stone-950/20 rounded-2xl">
                    <p className="font-mono text-xs text-stone-500 uppercase tracking-widest">No reservations logged in system</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 gap-4">
                    {allBookings.map((b) => (
                      <div
                        key={b.id}
                        className="bg-stone-950 border border-stone-850 rounded-2xl p-5 flex flex-col md:flex-row justify-between gap-6"
                      >
                        {/* Booking Details & status */}
                        <div className="space-y-3.5 flex-1 select-none">
                          <div className="flex items-center gap-3">
                            <div className="p-2 bg-stone-900 border border-stone-850 rounded-xl">
                              <Calendar className="w-5 h-5 text-[#d97706]" />
                            </div>
                            <div>
                              <p className="text-xs font-mono font-bold text-stone-200">
                                {b.vehicleTitle || 'Luxury Supercar Rental'}
                              </p>
                              <p className="text-[10px] font-sans text-stone-500 leading-normal mt-0.5">
                                Renter: <strong className="text-stone-300 font-mono text-[9px]">{b.renterName} ({b.renterEmail})</strong>
                              </p>
                            </div>
                          </div>

                          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 border-t border-stone-900 pt-3 text-[10px] font-mono leading-normal">
                            <div>
                              <span className="text-stone-550 block text-[8px] uppercase tracking-wider">Rental Dates</span>
                              <span className="text-stone-300 block mt-0.5">{b.startDate} to {b.endDate}</span>
                            </div>
                            <div>
                              <span className="text-stone-550 block text-[8px] uppercase tracking-wider">Pricing Contract</span>
                              <span className="text-emerald-400 font-bold block mt-0.5">${b.totalPrice?.toLocaleString()} USD</span>
                            </div>
                            <div>
                              <span className="text-stone-550 block text-[8px] uppercase tracking-wider">Payment Status</span>
                              <span className={`font-bold block mt-0.5 ${
                                b.paymentStatus === 'paid' ? 'text-emerald-400' : 'text-amber-500'
                              }`}>
                                {b.paymentStatus || 'unpaid'}
                              </span>
                            </div>
                          </div>
                        </div>

                        {/* Status Display badges only */}
                        <div className="flex flex-col items-end justify-center shrink-0 min-w-[150px] font-mono text-[9px] uppercase tracking-widest gap-2">
                          <span className="text-stone-550 leading-none select-none text-[8px]">CONTRACT STATE</span>
                          <span className={`px-3 py-1.5 rounded-xl border text-center font-extrabold w-full ${
                            b.status === 'confirmed' 
                              ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400' 
                              : b.status === 'pending'
                              ? 'bg-amber-500/10 border-amber-500/20 text-amber-550 pulse'
                              : 'bg-stone-900 border-stone-850 text-stone-500'
                          }`}>
                            {b.status}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </motion.div>
            )}

          </AnimatePresence>
        )}
      </div>

    </div>
  );
}
