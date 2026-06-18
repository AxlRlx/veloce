import { useState, useEffect, FormEvent } from 'react';
import { ChatSession, ChatMessage, AppLanguage } from '../types';
import { DICTIONARY, AUTO_REPLIES } from '../data';
import { motion, AnimatePresence } from 'motion/react';
import { MessageSquare, Send, ShieldCheck, UserCheck, Sparkles, ChevronLeft, Volume2, X } from 'lucide-react';

interface ChatProps {
  language: AppLanguage;
  currentUser: any; // Allow user object fields (e.g. tier, role)
  chatSessions: ChatSession[];
  onSendMessage: (sessionId: string, text: string) => void;
  onReceiveSystemReply: (sessionId: string, text: string) => void;
  selectedSessionId: string | null;
  onSelectSession: (id: string | null) => void;
  onNavigateToExplore?: () => void;
}

export default function Chat({
  language,
  currentUser,
  chatSessions,
  onSendMessage,
  onReceiveSystemReply,
  selectedSessionId,
  onSelectSession,
  onNavigateToExplore
}: ChatProps) {
  const t = DICTIONARY[language];
  const [typedText, setTypedText] = useState('');

  // Check if current user is Premium (GT or Importer/Dealer)
  const isPremium = currentUser && (
    currentUser.subscriptionTier === 'veloce_gt' || 
    currentUser.subscriptionTier === 'dealer_paid' || 
    currentUser.role === 'dealer'
  );

  // VIP Group messages state with local storage sync
  const [groupMessages, setGroupMessages] = useState<ChatMessage[]>(() => {
    const cached = localStorage.getItem('veloce_vip_group_messages');
    if (cached) return JSON.parse(cached);
    return [
      {
        id: 'gm_1',
        senderId: 'dealer_maranello',
        senderName: '🇮🇹 Scuderia_Modena',
        text: 'Ferrari SF90 Spider allocation just opened! DM for specs and custom option lists.',
        timestamp: '11:15 AM'
      },
      {
        id: 'gm_2',
        senderId: 'dealer_stuttgart',
        senderName: '🇩🇪 StuttgartSpeculator',
        text: 'I spec\'d a PTS Slate Grey 911 GT3 RS with Weissach package! Direct air transport can be cleared for next week.',
        timestamp: '11:18 AM'
      },
      {
        id: 'gm_3',
        senderId: 'user_beverly',
        senderName: '🇺🇸 Beverly_Hills_Rider (GT)',
        text: 'Crazy spec! Drop photos in my DM, StuttgartSpeculator. I might purchase it directly.',
        timestamp: '11:22 AM'
      }
    ];
  });

  useEffect(() => {
    localStorage.setItem('veloce_vip_group_messages', JSON.stringify(groupMessages));
  }, [groupMessages]);

  const activeSession = selectedSessionId && selectedSessionId !== 'group_vip_session' 
    ? (chatSessions.find(s => s.id === selectedSessionId) || null) 
    : null;

  useEffect(() => {
    if (activeSession) {
      activeSession.unread = false;
    }
  }, [activeSession]);

  const handleSend = (e: FormEvent) => {
    e.preventDefault();
    if (!typedText.trim()) return;

    const messageContent = typedText;
    setTypedText('');

    if (selectedSessionId === 'group_vip_session') {
      const suffix = currentUser.role === 'dealer' ? 'Dealer' : 'GT';
      const newMsg: ChatMessage = {
        id: `msg_g_${Date.now()}`,
        senderId: currentUser.id,
        senderName: `🇺🇸 ${currentUser.name} (${suffix})`,
        text: messageContent,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        status: 'sent'
      };

      const updated = [...groupMessages, newMsg];
      setGroupMessages(updated);

      // Trigger premium interactive replies after brief interval
      setTimeout(() => {
        const vipReplies = [
          { senderId: 'dealer_monaco', senderName: '🇲🇨 MonacoSpeedClub', text: 'Splendid specs! Direct logistics path holds clear.' },
          { senderId: 'dealer_stuttgart', senderName: '🇩🇪 StuttgartSpeculator', text: 'Outstanding addition! Check custom option details in direct messaging.' },
          { senderId: 'dealer_maranello', senderName: '🇮🇹 Scuderia_Modena', text: 'Wonderful, let us coordinate matching dates for our track day convoys.' },
          { senderId: 'user_milan', senderName: '🇮🇹 Milan_V12 (GT)', text: 'Agreed, perfect selection. This lounge provides magnificent inventory access.' }
        ];

        const pick = vipReplies[Math.floor(Math.random() * vipReplies.length)];
        const replyMsg: ChatMessage = {
          id: `msg_g_reply_${Date.now()}`,
          senderId: pick.senderId,
          senderName: pick.senderName,
          text: pick.text,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          status: 'delivered'
        };

        setGroupMessages(prev => [...prev, replyMsg]);
      }, 1200 + Math.random() * 800);

      return;
    }

    if (!activeSession) return;
    onSendMessage(activeSession.id, messageContent);

    setTimeout(() => {
      const answers = AUTO_REPLIES;
      const randomAnswer = answers[Math.floor(Math.random() * answers.length)];
      onReceiveSystemReply(activeSession.id, randomAnswer);
    }, 1500 + Math.random() * 1500);
  };

  return (
    <div id="chat_component" className="w-full h-full flex-1 flex flex-col md:grid md:grid-cols-12 md:gap-6 min-h-0 overflow-hidden select-text">
      
      {/* LEFT PANE: Conversations list */}
      <div 
        id="chat_sessions_column" 
        className={`md:col-span-4 bg-[#070709]/90 border border-stone-850/80 rounded-3xl p-4 flex flex-col space-y-4 h-full min-h-0 overflow-hidden ${
          activeSession || selectedSessionId === 'group_vip_session' ? 'hidden md:flex' : 'flex'
        }`}
      >
        {onNavigateToExplore && (
          <button 
            type="button"
            onClick={onNavigateToExplore}
            className="flex items-center text-stone-500 hover:text-stone-300 transition-colors cursor-pointer shrink-0 pb-1 self-start"
            title="Back"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
        )}

        <div className="flex items-center justify-between pb-3 border-b border-stone-900/80 shrink-0">
          <h3 className="text-xs font-mono uppercase tracking-widest text-[#d97706] flex items-center gap-1.5 font-bold">
            <MessageSquare className="w-4 h-4 text-amber-500 fill-amber-500/10" />
            <span>{t.inbox}</span>
          </h3>
          <span className="text-[9px] font-mono tracking-wider text-stone-400 bg-stone-900/60 px-2.5 py-0.5 rounded-full border border-stone-850/40 font-bold">
            {chatSessions.length + 1} Channels
          </span>
        </div>

        <div className="space-y-1.5 flex-1 overflow-y-auto pr-1 scrollbar-thin">
          
          {/* Pinned VIP Lounge Group Room Card */}
          <div
            id="chat_session_item_group_vip"
            onClick={() => {
              onSelectSession('group_vip_session');
            }}
            className={`p-3 rounded-2xl cursor-pointer transition-all duration-250 flex items-center justify-between gap-3 border ${
              selectedSessionId === 'group_vip_session' 
                ? 'bg-gradient-to-r from-red-950/40 to-red-900/30 text-stone-105 border-[#ff2800] shadow-lg shadow-red-500/15' 
                : 'bg-[#151212]/50 border-red-950/40 hover:bg-[#201515]/70 hover:border-red-900/40'
            } relative mb-2.5`}
          >
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-8.5 h-8.5 rounded-full shrink-0 relative bg-stone-950 flex items-center justify-center text-xs ring-2 ring-[#ff2800] ring-offset-2 ring-offset-stone-950 animate-pulse">
                🔥
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-1.5 flex-wrap">
                  <h4 className="text-xs font-bold text-stone-100 uppercase tracking-wider">
                    VIP Group Lounge
                  </h4>
                  <span className="text-[7px] bg-red-500/10 text-red-500 border border-red-500/20 px-1 py-0.25 rounded font-mono uppercase font-black">
                    Lounge
                  </span>
                </div>
                <p className="text-[9.5px] truncate font-mono mt-0.5 text-stone-400">
                  Global Importer Chatroom
                </p>
                <p className="text-[9.5px] truncate mt-1 text-stone-500">
                  {groupMessages[groupMessages.length - 1]?.text || 'No updates'}
                </p>
              </div>
            </div>
            <span className="text-[8px] font-mono self-start shrink-0 text-red-400 font-bold uppercase tracking-widest">
              Live
            </span>
          </div>

          {/* Individual dealer matches */}
          {chatSessions.length === 0 ? (
            <p className="text-[10px] text-stone-500 italic text-center py-6 font-mono">
              Like a supercar in standard explore to start a direct 1-on-1 dialogue with dealers.
            </p>
          ) : (
            chatSessions.map(sess => {
              const isActive = sess.id === selectedSessionId;
              return (
                <div
                  key={sess.id}
                  id={`chat_session_item_${sess.id}`}
                  onClick={() => {
                    onSelectSession(sess.id);
                  }}
                  className={`p-3 rounded-2xl cursor-pointer transition-all duration-250 flex items-center justify-between gap-3 border ${
                    isActive 
                      ? 'bg-gradient-to-r from-amber-500/10 to-amber-600/5 text-[#f59e0b] border-amber-500/40 shadow shadow-amber-500/5' 
                      : 'bg-[#0f0f13]/40 border-stone-900/45 hover:bg-[#141418]/60 hover:border-stone-800/50'
                  }`}
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    {/* Ferrari Red Circle Border around Dealer Profile Picture */}
                    <div className="w-8.5 h-8.5 rounded-full shrink-0 relative bg-stone-900 p-0.5 ring-2 ring-[#ff2800]/80 ring-offset-2 ring-offset-stone-950">
                      <img referrerPolicy="no-referrer" src={sess.dealerAvatar || sess.carImage} alt={sess.dealerName} className="w-full h-full rounded-full object-cover" />
                      {sess.unread && (
                        <span className="absolute top-0 right-0 w-2 h-2 bg-emerald-500 rounded-full ring-2 ring-stone-950 animate-pulse" />
                      )}
                    </div>
                    <div className="min-w-0">
                      <h4 className="text-xs font-bold text-stone-200">
                        {sess.dealerName}
                      </h4>
                      <p className="text-[9.5px] truncate font-mono mt-0.5 text-stone-400">
                        {sess.carName}
                      </p>
                      <p className="text-[9.5px] truncate mt-1 text-stone-500">
                        {sess.lastMessage}
                      </p>
                    </div>
                  </div>

                  <span className="text-[8px] font-mono self-start shrink-0 text-stone-500">
                    {sess.timestamp}
                  </span>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* RIGHT PANE: Chat window */}
      <div 
        id="chat_main_column" 
        className={`bg-[#070709]/90 border border-stone-850/80 rounded-3xl flex flex-col justify-between overflow-hidden h-full min-h-0 md:col-span-8 ${
          activeSession || selectedSessionId === 'group_vip_session' ? 'flex' : 'hidden md:flex'
        }`}
      >
        {selectedSessionId === 'group_vip_session' ? (
          // GROUP CHAT OUTCOMES
          !isPremium ? (
            // LOCK CARD PAYWALL SCREEN FOR FREE USERS
            <div className="flex-1 overflow-y-auto p-6 md:p-12 bg-gradient-to-b from-[#1f0b0b] to-[#040406] relative scrollbar-thin">
              {/* Close Button X */}
              <button
                type="button"
                onClick={() => onSelectSession(null)}
                className="absolute top-4 right-4 p-2 rounded-full bg-stone-900 border border-stone-800 text-stone-405 hover:text-stone-200 hover:bg-stone-850 cursor-pointer transition-all z-20"
                aria-label="Close"
              >
                <X className="w-4 h-4" />
              </button>

              <div className="flex flex-col items-center justify-center min-h-full space-y-6 py-6 text-center">
                <div className="w-16 h-16 rounded-full bg-red-950/45 border border-red-500/20 text-[#ef4444] flex items-center justify-center mx-auto text-2xl animate-pulse">
                  🔒
                </div>
                <div className="space-y-2 max-w-sm">
                  <h3 className="text-base font-mono font-bold uppercase tracking-widest text-red-500">VIP Group Lounge Locked</h3>
                  <p className="text-xs text-stone-400 font-sans leading-relaxed">
                    The Veloce Importer Live Round-Table is reserved exclusively for GT Members and registered Importer Dealers. Please upgrade your tier in the Profile tab to join the circle.
                  </p>
                </div>
                <div className="p-5 bg-stone-950 border border-stone-900 rounded-3xl max-w-xs space-y-2 mx-auto text-left w-full">
                  <span className="text-[9.5px] font-mono text-amber-500 font-black block uppercase tracking-wider">Premium Access Includes:</span>
                  <span className="text-[10.5px] text-stone-300 block font-sans">✓ Live group chats with global car collectors</span>
                  <span className="text-[10.5px] text-stone-300 block font-sans">✓ Unlimited catalog matched vehicle likes</span>
                  <span className="text-[10.5px] text-stone-300 block font-sans">✓ Exclusive canyon convoys & VIP RSVP track events</span>
                </div>
                <p className="text-[9.5px] text-stone-550 font-mono uppercase tracking-widest leading-normal">
                  Upgrade your status inside the PROFILE tab to unlock instantly.
                </p>
              </div>
            </div>
          ) : (
            // INTERACTIVE LIVE GROUP CHAT FOR PREMIUM USERS
            <>
              {/* Header */}
              <div className="p-4 bg-gradient-to-r from-stone-950 to-[#120a0a]/90 border-b border-stone-900 flex items-center justify-between shrink-0">
                <div className="flex items-center gap-2.5 min-w-0">
                  <button
                    type="button"
                    onClick={() => onSelectSession(null)}
                    className="mr-1 md:hidden p-1.5 bg-stone-900 hover:bg-stone-850 border border-stone-800 text-stone-350 rounded-xl transition cursor-pointer"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>

                  <div className="w-10 h-10 rounded-full bg-[#1b0909] border border-red-500/30 flex items-center justify-center text-sm shrink-0">
                    🔥
                  </div>
                  <div className="min-w-0">
                    <h4 className="text-xs font-extrabold text-stone-105 truncate uppercase tracking-widest">
                      GT & Importer Club Lounge
                    </h4>
                    <p className="text-[9px] font-mono text-red-500 uppercase tracking-widest truncate font-black animate-pulse">
                      ● Live Roundtable (54 dealers active)
                    </p>
                  </div>
                </div>

                <div className="hidden sm:flex items-center gap-1.5 text-[9px] font-mono text-red-400 font-bold shrink-0">
                  <ShieldCheck className="w-3.5 h-3.5 text-red-500" />
                  <span>VIP DECRYPTED CONNECTION</span>
                </div>
              </div>

              {/* Message history */}
              <div className="flex-1 p-4 md:p-5 space-y-3.5 overflow-y-auto min-h-0 relative scrollbar-thin bg-gradient-to-b from-[#0b0707] to-transparent">
                {groupMessages.map(msg => {
                  const isMe = msg.senderId === currentUser.id;
                  return (
                    <div
                      key={msg.id}
                      className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}
                    >
                      <div
                        className={`max-w-[85%] md:max-w-md p-3.5 px-4 rounded-2xl text-[11.5px] leading-relaxed space-y-1 shadow-md ${
                          isMe
                            ? 'bg-gradient-to-r from-red-600 to-amber-600 text-stone-950 font-extrabold rounded-tr-none'
                            : 'bg-stone-900/90 border border-stone-850/60 text-stone-200 rounded-tl-none'
                        }`}
                      >
                        <span className={`text-[8.5px] font-mono font-black uppercase tracking-wider block mb-1 ${isMe ? 'text-stone-950/70' : 'text-red-400'}`}>
                          {msg.senderName}
                        </span>
                        <p className={isMe ? 'text-stone-950' : 'text-stone-100'}>{msg.text}</p>
                        <div className={`flex items-center justify-end text-[7px] font-mono opacity-60`}>
                          <span>{msg.timestamp}</span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Input keyboard tray */}
              <form onSubmit={handleSend} className="p-4 border-t border-stone-900 bg-stone-950 flex items-center gap-3 shrink-0">
                <input
                  id="message_text_input_group"
                  type="text"
                  placeholder="Broadcast message to VIP roundtable..."
                  value={typedText}
                  onChange={(e) => setTypedText(e.target.value)}
                  className="flex-1 py-2.5 px-4 bg-[#0c0808] rounded-xl border border-red-950/20 text-stone-200 text-xs focus:outline-none focus:border-red-900/60 transition placeholder:text-stone-605"
                  required
                />
                <button
                  id="send_message_button_group"
                  type="submit"
                  className="p-2.5 bg-[#ff2800] hover:bg-red-500 text-white rounded-xl transition-all shadow-md flex items-center justify-center shrink-0 cursor-pointer"
                >
                  <Send className="w-4 h-4 fill-white text-white border-none" />
                </button>
              </form>
            </>
          )
        ) : activeSession ? (
          // STANDARD ACTIVE SESSION ON-ON-ONE
          <>
            {/* Header */}
            <div className="p-4 bg-[#0a0a0d]/90 border-b border-stone-900/80 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-2.5 min-w-0">
                <button
                  type="button"
                  id="mobile_back_to_chats_btn"
                  onClick={() => onSelectSession(null)}
                  className="mr-1 md:hidden p-1.5 bg-stone-900 hover:bg-stone-850 border border-stone-800 text-stone-350 rounded-xl transition"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>

                {/* Ferrari Red Circle Border around Dealer Profile Picture */}
                <div className="w-10 h-10 rounded-full relative bg-stone-900 shrink-0 p-0.5 ring-2 ring-[#ff2800] ring-offset-2 ring-offset-stone-950">
                  <img
                    referrerPolicy="no-referrer"
                    src={activeSession.dealerAvatar || activeSession.carImage}
                    alt={activeSession.dealerName}
                    className="w-full h-full rounded-full object-cover"
                  />
                </div>
                <div className="min-w-0">
                  <h4 className="text-xs font-bold text-stone-100 truncate">
                    {activeSession.dealerName}
                  </h4>
                  <p className="text-[9px] font-mono text-[#d97706] uppercase tracking-wider truncate font-semibold">
                    {activeSession.carName}
                  </p>
                </div>
              </div>

              {/* Secure tag */}
              <div className="hidden sm:flex items-center gap-1 text-[9.5px] font-mono text-stone-500 shrink-0 select-none">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
                <span>SECURE CONNECTION</span>
              </div>
            </div>

            {/* Message room history */}
            <div className="flex-1 p-4 md:p-5 space-y-3.5 overflow-y-auto min-h-0 relative scrollbar-thin bg-gradient-to-b from-[#050507] to-transparent">
              {activeSession.messages.map(msg => {
                const isMe = msg.senderId === currentUser.id;
                return (
                  <div
                    key={msg.id}
                    className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}
                  >
                    <div
                      className={`max-w-[85%] md:max-w-md p-3.5 px-4 rounded-2xl text-[11.5px] leading-relaxed space-y-1 shadow-md ${
                        isMe
                          ? 'bg-amber-500 text-stone-950 font-medium rounded-tr-none'
                          : 'bg-[#15151a] text-stone-200 rounded-tl-none border-none'
                      }`}
                    >
                      <p>{msg.text}</p>
                      <div className="flex items-center justify-between gap-3 text-[8px] font-mono opacity-80 pt-0.5">
                        <span className="font-semibold">{msg.senderName}</span>
                        <div className="flex items-center gap-1 shrink-0">
                          <span>{msg.timestamp}</span>
                          {isMe && (
                            <span className="inline-flex items-center ml-0.5">
                              {msg.status === 'seen' && (
                                <span className="text-stone-950 font-bold flex items-center" title="Read by recipient">
                                  ✓✓
                                </span>
                              )}
                              {msg.status === 'delivered' && (
                                <span className="text-stone-900 font-bold flex items-center" title="Delivered successfully">
                                  ✓✓
                                </span>
                              )}
                              {(msg.status === 'sent' || !msg.status) && (
                                <span className="text-stone-800 flex items-center" title="Sent from device">
                                  ✓
                                </span>
                              )}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Input keyboard tray */}
            <form onSubmit={handleSend} className="p-4 border-t border-stone-900 bg-stone-950/80 flex items-center gap-3 shrink-0">
              <input
                id="message_text_input"
                type="text"
                placeholder="Type your message here..."
                value={typedText}
                onChange={(e) => setTypedText(e.target.value)}
                className="flex-1 py-2.5 px-4 bg-[#0a0a0e] rounded-xl border border-stone-850 text-stone-250 text-xs focus:outline-none focus:border-amber-500 transition"
                required
              />
              <button
                id="send_message_button"
                type="submit"
                className="p-2.5 bg-amber-500 hover:bg-amber-450 text-stone-950 rounded-xl transition-all shadow-md flex items-center justify-center shrink-0 cursor-pointer"
              >
                <Send className="w-4 h-4 fill-stone-950" />
              </button>
            </form>
          </>
        ) : (
          <div id="no_active_chat_state" className="flex-1 flex flex-col items-center justify-center p-10 text-center space-y-3 bg-[#0a0a0d]/40">
            <Sparkles className="w-10 h-10 text-stone-800 animate-pulse" />
            <h4 className="text-sm font-semibold text-stone-300 font-mono uppercase tracking-wider">
              No Conversation Selected
            </h4>
            <p className="text-xs text-stone-500 max-w-xs">
              Pick a chat session or enter the VIP Roundtable Lounge on the left pane to begin communication.
            </p>
          </div>
        )}
      </div>

    </div>
  );
}
