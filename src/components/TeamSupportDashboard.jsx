
import React, { useState, useEffect, useRef } from 'react';
import { 
  MessageSquare, Search, Filter, CheckCircle, Clock, AlertCircle, 
  User, Send, MoreHorizontal, FileText, ChevronRight, X, Loader2, Trash2
} from 'lucide-react';
import { supabase } from '@/lib/customSupabaseClient';
import { useAuth } from '@/contexts/SupabaseAuthContext';
import { toast } from '@/components/ui/use-toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

const StatusBadge = ({ status }) => {
  const styles = {
    open: "bg-blue-500/20 text-blue-300 border-blue-500/30",
    in_progress: "bg-yellow-500/20 text-yellow-300 border-yellow-500/30",
    resolved: "bg-green-500/20 text-green-300 border-green-500/30",
    closed: "bg-gray-500/20 text-gray-300 border-gray-500/30",
  };
  
  const labels = {
    open: "Offen",
    in_progress: "In Bearbeitung",
    resolved: "Gelöst",
    closed: "Geschlossen"
  };

  return (
    <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium border ${styles[status] || styles.closed} uppercase tracking-wider`}>
      {labels[status] || status}
    </span>
  );
};

const PriorityBadge = ({ priority }) => {
  const styles = {
    low: "text-gray-400 bg-gray-500/10",
    medium: "text-blue-400 bg-blue-500/10",
    high: "text-red-400 bg-red-500/10",
  };
  return (
    <span className={`px-2 py-0.5 rounded text-xs font-medium ${styles[priority] || styles.medium} capitalize`}>
      {priority}
    </span>
  );
};

const TeamSupportDashboard = () => {
  const { user } = useAuth();
  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedTicket, setSelectedTicket] = useState(null);
  const [filter, setFilter] = useState('all');
  const [search, setSearch] = useState('');
  
  // Detail View State
  const [replies, setReplies] = useState([]);
  const [newReply, setNewReply] = useState('');
  const [internalNote, setInternalNote] = useState('');
  const [teamMembers, setTeamMembers] = useState([]);
  const [sending, setSending] = useState(false);
  
  const repliesEndRef = useRef(null);

  // Helper to safely access profile data regardless of join structure (array or object)
  const getProfileData = (data) => {
    if (!data) return null;
    return Array.isArray(data) ? data[0] : data;
  };

  const getProfileName = (ticketOrReply) => {
    // Check if we are looking at a ticket (uses 'profiles') or something else
    const profile = getProfileData(ticketOrReply?.profiles);
    return profile?.full_name || 'Unbekannt';
  };

  const getProfileAvatar = (ticketOrReply) => {
    const profile = getProfileData(ticketOrReply?.profiles);
    return profile?.avatar_url;
  };

  const getAssigneeName = (ticket) => {
    const assignee = getProfileData(ticket?.assignee);
    return assignee?.full_name || 'Niemand';
  };

  useEffect(() => {
    let mounted = true;

    const loadData = async () => {
        if (!mounted) return;
        setLoading(true);
        await Promise.all([fetchTickets(), fetchTeamMembers()]);
        if (mounted) setLoading(false);
    };

    loadData();
    
    // Realtime subscription deaktiviert, um Probleme mit dem Löschen zu beheben
    /*
    const channel = supabase
      .channel('support_dashboard_main')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'support_tickets' }, (payload) => {
        // Nur neue Tickets laden, keine Updates oder Löschungen
        if (payload.eventType === 'INSERT') {
          fetchTickets();
        }
      })
      .subscribe();
      
    return () => {
        mounted = false;
        supabase.removeChannel(channel);
    };
    */
    
    return () => {
      mounted = false;
    };
  }, []); // Only run once on mount

  // Sync selectedTicket with tickets list updates
  useEffect(() => {
    if (selectedTicket) {
      const updated = tickets.find(t => t.id === selectedTicket.id);
      if (updated) {
        // Only update if critical fields changed to avoid loop/flicker
        if (updated.status !== selectedTicket.status || updated.assigned_to !== selectedTicket.assigned_to) {
          setSelectedTicket(updated);
        }
      }
    }
  }, [tickets]);

  useEffect(() => {
    if (selectedTicket) {
      fetchReplies(selectedTicket.id);
      setInternalNote(selectedTicket.internal_notes || '');
      
      const replyChannel = supabase
        .channel(`ticket_replies_${selectedTicket.id}`)
        .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'ticket_replies', filter: `ticket_id=eq.${selectedTicket.id}` }, 
          () => {
            fetchReplies(selectedTicket.id);
          }
        )
        .subscribe();
        
      return () => {
          supabase.removeChannel(replyChannel);
      };
    }
  }, [selectedTicket?.id]); // Depend on ID to avoid re-subscribing on every ticket update

  useEffect(() => {
    scrollToBottom();
  }, [replies]);

  const scrollToBottom = () => {
    setTimeout(() => {
        repliesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, 100);
  };

  const fetchTickets = async () => {
    try {
      // Fetch tickets with joined profile data
      // Note: 'profiles:user_id' maps the user_id FK to profiles table
      // 'assignee:assigned_to' maps the assigned_to FK to profiles table
      const { data, error } = await supabase
        .from('support_tickets')
        .select(`
          *,
          profiles:user_id (email, full_name, avatar_url),
          assignee:assigned_to (email, full_name, avatar_url)
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setTickets(data || []);
    } catch (error) {
      console.error('Error fetching tickets:', error);
      toast({ 
        title: "Fehler beim Laden", 
        description: "Tickets konnten nicht geladen werden. Bitte Datenbank-Verbindung prüfen.",
        variant: "destructive" 
      });
    }
  };

  const fetchTeamMembers = async () => {
    try {
        const { data, error } = await supabase
        .from('profiles')
        .select('id, full_name, email')
        .in('role', ['owner', 'admin', 'developer']);
        
        if (error) throw error;
        setTeamMembers(data || []);
    } catch (error) {
        console.error("Error fetching team:", error);
    }
  };

  const fetchReplies = async (ticketId) => {
    try {
        const { data, error } = await supabase
        .from('ticket_replies')
        .select(`
            *,
            profiles:user_id (full_name, avatar_url, role)
        `)
        .eq('ticket_id', ticketId)
        .order('created_at', { ascending: true });
        
        if (error) throw error;
        setReplies(data || []);
    } catch (error) {
        console.error("Error fetching replies:", error);
    }
  };

  const handleStatusChange = async (newStatus) => {
    if (!selectedTicket) return;
    try {
      const { error } = await supabase
        .from('support_tickets')
        .update({ status: newStatus })
        .eq('id', selectedTicket.id);

      if (error) throw error;
      
      toast({ title: "Status aktualisiert", description: `Ticket ist nun ${newStatus}` });
      
      // Notify user
      if (['resolved', 'in_progress', 'closed'].includes(newStatus)) {
        await supabase.from('notifications').insert({
          user_id: selectedTicket.user_id,
          title: 'Ticket Update',
          message: `Dein Ticket "${selectedTicket.subject}" Status wurde zu "${newStatus}" geändert.`,
          type: 'support_update'
        });
      }
      // fetchTickets will be triggered by realtime, but we can optimistically update too if needed
    } catch (e) {
      toast({ title: "Fehler", description: e.message, variant: "destructive" });
    }
  };

  const handleDeleteTicket = async (ticketId) => {
    console.log('handleDeleteTicket aufgerufen mit ID:', ticketId);
    
    if (!ticketId) {
      console.error('Keine Ticket-ID zum Löschen angegeben');
      return false;
    }
    
    try {
      if (!window.confirm('Möchtest du dieses Ticket wirklich dauerhaft löschen?')) {
        console.log('Löschen vom Benutzer abgebrochen');
        return false;
      }

      console.log('Starte Löschvorgang...');
      setLoading(true);

      // 1. Lösche das Ticket direkt aus dem State
      setTickets(prevTickets => {
        const updatedTickets = prevTickets.filter(t => t.id !== ticketId);
        console.log('Ticket aus dem lokalen State entfernt. Verbleibende Tickets:', updatedTickets.length);
        return updatedTickets;
      });

      // 2. Lösche zuerst die Antworten in der Datenbank
      console.log('Lösche Antworten für Ticket:', ticketId);
      const { error: repliesError } = await supabase
        .from('ticket_replies')
        .delete()
        .eq('ticket_id', ticketId);
      
      if (repliesError) {
        console.error('Fehler beim Löschen der Antworten:', repliesError);
        // Bei Fehler die Tickets neu laden, um Konsistenz zu gewährleisten
        await fetchTickets();
        throw repliesError;
      }
      console.log('Antworten erfolgreich gelöscht');

      // 3. Lösche das Ticket in der Datenbank
      console.log('Lösche Ticket:', ticketId);
      const { error: ticketError } = await supabase
        .from('support_tickets')
        .delete()
        .eq('id', ticketId);

      if (ticketError) {
        console.error('Fehler beim Löschen des Tickets:', ticketError);
        // Bei Fehler die Tickets neu laden, um Konsistenz zu gewährleisten
        await fetchTickets();
        throw ticketError;
      }
      console.log('Ticket erfolgreich gelöscht');
      
      // 4. Schließe die Detailansicht, falls das gelöschte Ticket ausgewählt war
      if (selectedTicket && selectedTicket.id === ticketId) {
        console.log('Schließe Detailansicht');
        setSelectedTicket(null);
      }

      // 5. Zeige Erfolgsmeldung
      toast({ 
        title: "Ticket gelöscht", 
        description: "Das Ticket wurde erfolgreich gelöscht." 
      });

      return true;
    } catch (error) {
      console.error('Fehler beim Löschen des Tickets:', {
        error,
        message: error.message,
        code: error.code,
        details: error.details,
        hint: error.hint
      });
      
      toast({ 
        title: "Fehler", 
        description: `Das Ticket konnte nicht gelöscht werden: ${error.message}`,
        variant: "destructive" 
      });
      return false;
    } finally {
      console.log('Löschvorgang abgeschlossen');
      setLoading(false);
    }
  };

  const handleAssign = async (userId) => {
    if (!selectedTicket) return;
    try {
      const { error } = await supabase
        .from('support_tickets')
        .update({ assigned_to: userId })
        .eq('id', selectedTicket.id);

      if (error) throw error;
      
      const member = teamMembers.find(m => m.id === userId);
      
      // Update local state immediately for responsiveness
      const updatedTicket = { 
        ...selectedTicket, 
        assigned_to: userId, 
        assignee: member // Manually set the assignee object for UI
      };
      
      setSelectedTicket(updatedTicket);
      setTickets(prev => prev.map(t => t.id === updatedTicket.id ? updatedTicket : t));

      toast({ title: "Zugewiesen", description: `Ticket zugewiesen an ${member?.full_name || 'Niemand'}` });
    } catch (e) {
      toast({ title: "Fehler", description: e.message, variant: "destructive" });
    }
  };

  const saveInternalNote = async () => {
    if (!selectedTicket) return;
    try {
      const { error } = await supabase
        .from('support_tickets')
        .update({ internal_notes: internalNote })
        .eq('id', selectedTicket.id);
      
      if (error) throw error;
      
      // Update local state
      const updatedTicket = { ...selectedTicket, internal_notes: internalNote };
      setSelectedTicket(updatedTicket);
      // Also update in main list so it persists if we switch back and forth
      setTickets(prev => prev.map(t => t.id === updatedTicket.id ? updatedTicket : t));

      toast({ title: "Gespeichert", description: "Interne Notiz aktualisiert" });
    } catch (e) {
      toast({ title: "Fehler", description: e.message, variant: "destructive" });
    }
  };

  const sendReply = async () => {
    if (!newReply.trim() || !selectedTicket || sending) return;
    setSending(true);
    try {
      const { error } = await supabase.from('ticket_replies').insert({
        ticket_id: selectedTicket.id,
        user_id: user.id,
        message: newReply
      });

      if (error) throw error;

      setNewReply('');
      await fetchReplies(selectedTicket.id);
      
      // Notify User
      await supabase.from('notifications').insert({
        user_id: selectedTicket.user_id,
        title: 'Neue Antwort',
        message: `Neue Antwort zu Ticket: ${selectedTicket.subject}`,
        type: 'support_reply'
      });

    } catch (e) {
      toast({ title: "Fehler", description: e.message, variant: "destructive" });
    } finally {
        setSending(false);
    }
  };

  const filteredTickets = tickets.filter(t => {
    const matchesFilter = filter === 'all' || t.status === filter;
    
    const profileName = getProfileName(t).toLowerCase();
    const subject = (t.subject || '').toLowerCase();
    const id = (t.id || '').toLowerCase();
    const searchTerm = search.toLowerCase();

    const matchesSearch = subject.includes(searchTerm) || 
                          profileName.includes(searchTerm) ||
                          id.includes(searchTerm);
    return matchesFilter && matchesSearch;
  });

  if (loading) {
      return (
          <div className="flex h-full items-center justify-center">
              <Loader2 className="w-8 h-8 animate-spin text-violet-500" />
          </div>
      );
  }

  return (
    <div className="h-[calc(100vh-8rem)] flex flex-col md:flex-row gap-6">
      {/* Ticket List - Left Sidebar */}
      <div className={`w-full md:w-1/3 flex flex-col bg-[#1a1a2e]/60 backdrop-blur-xl rounded-xl border border-violet-500/20 overflow-hidden ${selectedTicket ? 'hidden md:flex' : 'flex'}`}>
        <div className="p-4 border-b border-violet-500/20 space-y-4">
          <div className="relative">
            <Search className="absolute left-3 top-2.5 w-4 h-4 text-gray-500" />
            <Input 
              id="ticket-search-input"
              placeholder="Suche Tickets..." 
              className="pl-9 bg-black/20 border-violet-500/10"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <div className="flex gap-2 overflow-x-auto no-scrollbar pb-1">
            {['all', 'open', 'in_progress', 'resolved'].map(status => (
              <button
                key={status}
                onClick={() => setFilter(status)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-colors ${
                  filter === status 
                    ? 'bg-violet-600 text-white' 
                    : 'bg-white/5 text-gray-400 hover:bg-white/10'
                }`}
              >
                {status === 'all' ? 'Alle' : status === 'in_progress' ? 'In Arbeit' : status === 'open' ? 'Offen' : 'Gelöst'}
              </button>
            ))}
          </div>
        </div>
        
        <div className="flex-1 overflow-y-auto">
          {filteredTickets.length === 0 ? (
            <div className="p-8 text-center text-gray-500">Keine Tickets gefunden</div>
          ) : (
            filteredTickets.map(ticket => (
              <div
                key={ticket.id}
                onClick={() => setSelectedTicket(ticket)}
                className={`p-4 border-b border-white/5 cursor-pointer hover:bg-white/5 transition-colors ${
                  selectedTicket?.id === ticket.id ? 'bg-violet-600/10 border-l-2 border-l-violet-500' : ''
                }`}
              >
                <div className="flex justify-between items-start mb-2">
                  <StatusBadge status={ticket.status} />
                  <span className="text-xs text-gray-500">{new Date(ticket.created_at).toLocaleDateString()}</span>
                </div>
                <h4 className="font-medium text-white mb-1 line-clamp-1">{ticket.subject}</h4>
                <div className="flex items-center gap-2 mt-2">
                  <Avatar className="w-5 h-5">
                    <AvatarImage src={getProfileAvatar(ticket)} />
                    <AvatarFallback className="text-[10px]">{getProfileName(ticket)[0]}</AvatarFallback>
                  </Avatar>
                  <span className="text-xs text-gray-400">{getProfileName(ticket)}</span>
                  {ticket.assigned_to && (
                     <span className="ml-auto text-[10px] px-1.5 py-0.5 rounded bg-white/10 text-gray-400">
                       {getAssigneeName(ticket).split(' ')[0]}
                     </span>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Ticket Details - Main Area */}
      <div className={`flex-1 flex flex-col bg-[#1a1a2e]/60 backdrop-blur-xl rounded-xl border border-violet-500/20 overflow-hidden ${!selectedTicket ? 'hidden md:flex items-center justify-center' : 'flex'}`}>
        {!selectedTicket ? (
          <div className="text-center text-gray-500">
            <MessageSquare className="w-12 h-12 mx-auto mb-4 opacity-50" />
            <p>Wählen Sie ein Ticket aus, um Details zu sehen</p>
          </div>
        ) : (
          <>
            {/* Header */}
            <div className="p-6 border-b border-violet-500/20 flex flex-col gap-4">
              <div className="flex justify-between items-start w-full">
                <div className="flex items-start gap-2 flex-1">
                  <button className="md:hidden text-gray-400 hover:text-white mt-1" onClick={() => setSelectedTicket(null)}>
                    <ChevronRight className="w-6 h-6 rotate-180" />
                  </button>
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h2 className="text-xl font-bold text-white">{selectedTicket.subject}</h2>
                      <PriorityBadge priority={selectedTicket.priority} />
                    </div>
                    <div className="flex items-center gap-2 text-sm text-gray-400">
                      <span>Ticket #{selectedTicket.id.slice(0, 8)}</span>
                      <span>•</span>
                      <span>von {getProfileName(selectedTicket)}</span>
                    </div>
                  </div>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  className="text-red-500 border-red-500/30 hover:bg-red-500/10 hover:text-red-400 ml-2"
                  onClick={() => handleDeleteTicket(selectedTicket.id)}
                  disabled={loading}
                >
                  <Trash2 className="w-4 h-4" />
                  <span className="hidden sm:inline ml-2">Ticket löschen</span>
                </Button>
              </div>

              <div className="flex flex-wrap gap-3">
                 <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="outline" size="sm" className="border-violet-500/30 text-gray-300 hover:bg-white/5">
                        Status: <span className="ml-1 text-white capitalize">{selectedTicket.status.replace('_', ' ')}</span>
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent className="bg-[#1a1a2e] border-violet-500/20 text-white">
                      {['open', 'in_progress', 'resolved', 'closed'].map(s => (
                        <DropdownMenuItem key={s} onClick={() => handleStatusChange(s)} className="capitalize hover:bg-white/10 cursor-pointer">
                          {s.replace('_', ' ')}
                        </DropdownMenuItem>
                      ))}
                    </DropdownMenuContent>
                 </DropdownMenu>

                 <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="outline" size="sm" className="border-violet-500/30 text-gray-300 hover:bg-white/5">
                        Zugewiesen: <span className="ml-1 text-white">
                            {getAssigneeName(selectedTicket)}
                        </span>
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent className="bg-[#1a1a2e] border-violet-500/20 text-white">
                      <DropdownMenuItem onClick={() => handleAssign(null)} className="hover:bg-white/10 cursor-pointer">Niemand</DropdownMenuItem>
                      {teamMembers.map(m => (
                        <DropdownMenuItem key={m.id} onClick={() => handleAssign(m.id)} className="hover:bg-white/10 cursor-pointer">
                          {m.full_name}
                        </DropdownMenuItem>
                      ))}
                    </DropdownMenuContent>
                 </DropdownMenu>
              </div>
            </div>

            {/* Content Area */}
            <div className="flex-1 overflow-y-auto p-6 space-y-6 scrollbar-thin scrollbar-thumb-violet-500/20">
              {/* Original Message */}
              <div className="bg-white/5 rounded-lg p-4 border border-white/10">
                <div className="flex items-center gap-3 mb-3">
                  <Avatar>
                    <AvatarImage src={getProfileAvatar(selectedTicket)} />
                    <AvatarFallback>{getProfileName(selectedTicket)[0]}</AvatarFallback>
                  </Avatar>
                  <div>
                    <div className="font-medium text-white">{getProfileName(selectedTicket)}</div>
                    <div className="text-xs text-gray-500">{new Date(selectedTicket.created_at).toLocaleString()}</div>
                  </div>
                </div>
                <p className="text-gray-300 whitespace-pre-wrap">{selectedTicket.message}</p>
              </div>

              {/* Internal Notes */}
              <div className="bg-yellow-500/5 rounded-lg p-4 border border-yellow-500/20">
                <div className="flex items-center gap-2 mb-2 text-yellow-500/80 font-medium text-sm">
                  <FileText className="w-4 h-4" /> Interne Notizen (Nur Team)
                </div>
                <textarea 
                  className="w-full bg-transparent text-sm text-gray-300 resize-none focus:outline-none h-20 placeholder:text-gray-600"
                  placeholder="Notizen hier tippen..."
                  value={internalNote}
                  onChange={(e) => setInternalNote(e.target.value)}
                  onBlur={saveInternalNote}
                />
              </div>

              {/* Discussion / Replies */}
              <div className="space-y-4">
                 <h3 className="text-sm font-medium text-gray-400 uppercase tracking-wider">Verlauf</h3>
                 {replies.map(reply => {
                   const profileName = getProfileName(reply);
                   const profileAvatar = getProfileAvatar(reply);
                   const profileData = getProfileData(reply.profiles);
                   const isStaff = ['owner', 'admin', 'developer'].includes(profileData?.role);
                   
                   return (
                     <div key={reply.id} className={`flex gap-3 ${isStaff ? 'flex-row-reverse' : ''}`}>
                        <Avatar className="w-8 h-8">
                          <AvatarImage src={profileAvatar} />
                          <AvatarFallback className={isStaff ? 'bg-violet-600' : ''}>{profileName[0]}</AvatarFallback>
                        </Avatar>
                        <div className={`max-w-[80%] rounded-lg p-3 ${isStaff ? 'bg-violet-600/20 border border-violet-500/30' : 'bg-white/5 border border-white/10'}`}>
                           <div className={`text-xs font-medium mb-1 ${isStaff ? 'text-violet-300' : 'text-gray-300'}`}>
                             {profileName} {isStaff && '(Team)'}
                           </div>
                           <p className="text-sm text-gray-200 whitespace-pre-wrap">{reply.message}</p>
                           <div className="text-[10px] text-gray-500 mt-2 text-right">
                             {new Date(reply.created_at).toLocaleString()}
                           </div>
                        </div>
                     </div>
                   );
                 })}
                 <div ref={repliesEndRef} />
              </div>
            </div>

            {/* Reply Input */}
            <div className="p-4 bg-[#141422] border-t border-violet-500/20">
               <div className="flex gap-2">
                 <Input 
                   id="ticket-reply-input"
                   placeholder="Antwort schreiben..." 
                   className="flex-1"
                   value={newReply}
                   onChange={(e) => setNewReply(e.target.value)}
                   onKeyDown={(e) => {
                     if (e.key === 'Enter' && !e.shiftKey) {
                       e.preventDefault();
                       sendReply();
                     }
                   }}
                 />
                 <Button onClick={sendReply} disabled={!newReply.trim() || sending}>
                    {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                 </Button>
               </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default TeamSupportDashboard;
