import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Shield, AlertTriangle, Check, Trash2, Scale, RefreshCw } from 'lucide-react';
import { User } from '../types';
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
  const [reports, setReports] = useState<ReportTicket[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterType, setFilterType] = useState<'all' | 'vehicle' | 'event'>('all');
  const [filterStatus, setFilterStatus] = useState<'pending' | 'resolved'>('pending');
  const [message, setMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

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
      setMessage({ text: err.message || "Error communicating with UGC shield node.", type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (currentUser.role === 'admin') {
      fetchReports();
    }
  }, [currentUser.role]);

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
            <Shield className="w-5 h-5 text-red-500 fill-red-500/10 shrink-0" />
            <h3 className="text-sm font-mono uppercase tracking-[0.2em] text-red-500 font-extrabold flex items-center gap-1.5">
              <span>UGC Shield Admin Console</span>
              <span className="text-[9px] bg-red-500/15 text-red-400 border border-red-500/20 px-2 py-0.5 rounded font-mono font-bold tracking-widest">
                LEVEL 4 MODERATOR
              </span>
            </h3>
          </div>
          <p className="text-xs text-stone-400">
            Rapid audit response center for legal, copyright, community standards, and user-reported violations.
          </p>
        </div>

        {/* Console stats & action buttons */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={fetchReports}
            className="p-2 bg-stone-950 hover:bg-stone-850 border border-stone-850 text-stone-400 hover:text-white rounded-xl transition cursor-pointer"
            title="Refresh logs"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
          
          <div className="bg-stone-950/80 border border-stone-850/60 p-2 px-3.5 rounded-xl font-mono text-[9px] text-stone-500">
            <span className="uppercase block text-[7.5px] leading-none text-stone-605">Pending Tickets</span>
            <span className="text-xs font-semibold text-stone-200 block mt-1 leading-none">
              {reports.filter(r => r.status === 'pending').length} Actionable
            </span>
          </div>
        </div>
      </div>

      {message && (
        <div className={`p-4 rounded-xl border text-xs font-mono font-bold ${
          message.type === 'success' 
            ? 'bg-emerald-500/10 border-emerald-505/20 text-emerald-400' 
            : 'bg-red-500/10 border-red-505/25 text-red-400'
        }`}>
          {message.text}
        </div>
      )}

      {/* Control Tab filters */}
      <div className="flex flex-wrap items-center justify-between gap-3 font-mono text-[10px]">
        {/* Ticket category type */}
        <div className="flex items-center gap-1 bg-stone-950 p-1 border border-stone-850 rounded-xl">
          {[
            { id: 'all', label: 'All Assets' },
            { id: 'vehicle', label: 'Vehicles / Listings' },
            { id: 'event', label: 'Community Meets' }
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

        {/* Ticket Resolution Level status */}
        <div className="flex items-center gap-1 bg-stone-950 p-1 border border-stone-850 rounded-xl">
          {[
            { id: 'pending', label: 'Action Needed' },
            { id: 'resolved', label: 'Archived Logs' }
          ].map(st => (
            <button
              key={st.id}
              type="button"
              onClick={() => setFilterStatus(st.id as any)}
              className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                filterStatus === st.id 
                  ? 'bg-red-500/15 border border-red-500/20 text-red-400 font-extrabold shadow-sm' 
                  : 'text-stone-500 hover:text-stone-300'
              }`}
            >
              {st.label}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="py-20 text-center font-mono text-xs text-stone-500 animate-pulse">
          Retrieving secure UGC registry logs...
        </div>
      ) : filtered.length === 0 ? (
        <div className="py-16 text-center border border-dashed border-stone-850 bg-stone-950/20 rounded-2xl flex flex-col items-center justify-center space-y-2.5">
          <Scale className="w-8 h-8 text-stone-701 opacity-45" />
          <p className="font-mono text-[11px] text-stone-500 uppercase font-bold">Registry clean</p>
          <p className="text-xs text-stone-400 max-w-xs font-sans leading-relaxed">
            No unresolved reports matches your active filters. Veloce neighborhood meets strict safety criteria!
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4">
          <AnimatePresence>
            {filtered.map(ticket => (
              <motion.div
                key={ticket.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="bg-stone-950/80 border border-stone-850 rounded-2xl p-5 flex flex-col md:flex-row justify-between gap-6"
              >
                {/* Content info & details */}
                <div className="space-y-3 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className={`text-[8.5px] font-mono uppercase tracking-widest px-2.5 py-0.5 rounded border ${
                      ticket.targetType === 'vehicle' 
                        ? 'bg-amber-500/10 border-amber-500/25 text-amber-520' 
                        : 'bg-indigo-500/10 border-indigo-505/25 text-indigo-400'
                    }`}>
                      {ticket.targetType === 'vehicle' ? 'Vehicle Listing' : 'Community Event'}
                    </span>
                    <span className="text-[9px] font-mono text-stone-550">
                      ID: <strong className="text-stone-400">{ticket.targetId}</strong>
                    </span>
                  </div>

                  <div className="space-y-1">
                    <div className="flex items-center gap-1.5">
                      <AlertTriangle className="w-4 h-4 text-red-420" />
                      <p className="text-xs font-mono font-bold text-stone-200">
                        Violation Reason: <span className="text-red-400 uppercase tracking-wide">{ticket.reason}</span>
                      </p>
                    </div>
                    <div className="text-[10px] space-y-1 text-stone-500 font-mono">
                      <p>Reported By: <span className="text-stone-400">{ticket.reporterId || 'Anonymous'}</span></p>
                      <p>Date Recieved: <span className="text-stone-305">{new Date(ticket.createdAt).toLocaleString()}</span></p>
                    </div>
                  </div>
                </div>

                {/* Response controls action buttons */}
                {ticket.status === 'pending' && (
                  <div className="flex flex-row md:flex-col justify-end gap-2 shrink-0 md:min-w-[170px]">
                    <button
                      type="button"
                      onClick={() => handleResolveTicket(ticket.id)}
                      className="flex-1 py-2 px-3 border border-stone-850 hover:border-emerald-500/35 bg-stone-900 hover:bg-stone-850 text-emerald-400 text-[10px] font-mono uppercase font-bold tracking-wider rounded-xl transition cursor-pointer flex items-center justify-center gap-1.5"
                    >
                      <Check className="w-3.5 h-3.5" />
                      <span>Dismiss Flag</span>
                    </button>
                    
                    <button
                      type="button"
                      onClick={() => handleSanctionAsset(ticket.id, ticket.targetType, ticket.targetId)}
                      className="flex-1 py-2 px-3 bg-red-650 hover:bg-red-600 border border-red-500/20 text-white text-[10px] font-mono uppercase font-bold tracking-wider rounded-xl transition cursor-pointer flex items-center justify-center gap-1.5 shadow-lg shadow-red-950/20"
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
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      )}

    </div>
  );
}
