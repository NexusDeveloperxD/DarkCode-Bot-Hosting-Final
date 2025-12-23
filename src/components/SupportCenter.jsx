
import React, { useState, useEffect, useRef } from 'react';
import { MessageSquare, LifeBuoy, Send, Book, Plus, ArrowLeft, ChevronRight, Loader2 } from 'lucide-react';
import { supabase } from '@/lib/customSupabaseClient';
import { useAuth } from '@/contexts/SupabaseAuthContext';
import { toast } from '@/components/ui/use-toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';

const SupportCenter = () => {
  const { user } = useAuth();
  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // Create Ticket State
  const [newTicket, setNewTicket] = useState({ subject: '', message: '', priority: 'medium' });
  const [isTicketOpen, setIsTicketOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // View Ticket State
  const [activeTicket, setActiveTicket] = useState(null);
  const [activeReplies, setActiveReplies] = useState([]);
  const [replyMessage, setReplyMessage] = useState('');
  const [replying, setReplying] = useState(false);
  const repliesEndRef = useRef(null);

  // Feedback State
  const [feedback, setFeedback] = useState({ title: '', description: '', type: 'feature' });
  const [isFeedbackOpen, setIsFeedbackOpen] = useState(false);

  // Helper for safe data access
  const getProfileData = (data) => Array.isArray(data) ? data[0] : data;

  useEffect(() => {
    let mounted = true;

    if (user) {
      fetchTickets().then(() => {
        if (mounted) setLoading(false);
      });

      const channel = supabase
        .channel('user_tickets_updates')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'support_tickets', filter: `user_id=eq.${user.id}` }, 
          () => fetchTickets()
        )
        .subscribe();
      
      return () => {
        mounted = false;
        supabase.removeChannel(channel);
      }
    }
  }, [user]);

  useEffect(() => {
    let channel;
    if (activeTicket) {
      fetchReplies(activeTicket.id);
      
      channel = supabase
        .channel(`ticket_replies_${activeTicket.id}`)
        .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'ticket_replies', filter: `ticket_id=eq.${activeTicket.id}` }, 
          (payload) => {
             fetchReplies(activeTicket.id);
          }
        )
        .subscribe();
    }
    return () => {
      if (channel) supabase.removeChannel(channel);
    }
  }, [activeTicket?.id]);

  useEffect(() => {
     if(activeReplies.length > 0) {
       setTimeout(() => {
         repliesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
       }, 100);
     }
  }, [activeReplies]);

  const fetchTickets = async () => {
    try {
      const { data, error } = await supabase
        .from('support_tickets')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });
        
      if (error) throw error;
      
      // Update local state tickets
      setTickets(data || []);
      
      // If we have an active ticket, verify its status hasn't changed abruptly (optional sync)
      if (activeTicket) {
        const updatedActive = data?.find(t => t.id === activeTicket.id);
        if (updatedActive && updatedActive.status !== activeTicket.status) {
           setActiveTicket(updatedActive);
        }
      }
    } catch (e) {
      console.error(e);
      toast({ title: "Fehler", description: "Tickets konnten nicht geladen werden.", variant: "destructive" });
    }
  };

  const fetchReplies = async (ticketId) => {
    try {
       const { data, error } = await supabase
         .from('ticket_replies')
         .select('*, profiles:user_id(full_name, role, avatar_url)')
         .eq('ticket_id', ticketId)
         .order('created_at', { ascending: true });
         
       if (error) throw error;
       setActiveReplies(data || []);
    } catch (e) { console.error(e); }
  };

  const submitTicket = async () => {
    if (!newTicket.subject || !newTicket.message || submitting) return;
    setSubmitting(true);
    
    try {
      const { data, error } = await supabase.from('support_tickets').insert({
        user_id: user.id,
        ...newTicket,
        status: 'open'
      }).select().single();

      if (error) throw error;
      toast({ title: "Ticket erstellt", description: "Wir werden uns bald bei Ihnen melden." });
      setNewTicket({ subject: '', message: '', priority: 'medium' });
      setIsTicketOpen(false);
      
      // Notify team owners (Simulated via notifications table insert for this demo env)
      const { data: owners } = await supabase.from('profiles').select('id').eq('role', 'owner');
      if (owners && owners.length > 0) {
        const notifications = owners.map(o => ({
           user_id: o.id,
           title: 'Neues Support Ticket',
           message: `Neues Ticket von User: ${newTicket.subject}`,
           type: 'new_ticket'
        }));
        await supabase.from('notifications').insert(notifications);
      }
      
    } catch (e) {
      toast({ title: "Fehler", description: e.message, variant: "destructive" });
    } finally {
      setSubmitting(false);
    }
  };

  const sendReply = async () => {
    if (!replyMessage.trim() || !activeTicket || replying) return;
    setReplying(true);
    try {
       const { error } = await supabase.from('ticket_replies').insert({
         ticket_id: activeTicket.id,
         user_id: user.id,
         message: replyMessage
       });
       if (error) throw error;
       setReplyMessage('');
       // Fetch happens via realtime or explicit call
       fetchReplies(activeTicket.id);
    } catch (e) {
       toast({ title: "Fehler", description: "Nachricht konnte nicht gesendet werden", variant: "destructive" });
    } finally {
      setReplying(false);
    }
  };
  
  const submitFeedback = async () => {
    if (!feedback.title) return;
    try {
      const { error } = await supabase.from('feedback').insert({
        user_id: user.id,
        ...feedback
      });
      if (error) throw error;
      toast({ title: "Feedback gesendet", description: "Danke für Ihren Vorschlag!" });
      setFeedback({ title: '', description: '', type: 'feature' });
      setIsFeedbackOpen(false);
    } catch (e) {
      toast({ title: "Fehler", description: e.message, variant: "destructive" });
    }
  };

  // If a ticket is active, show the detail view
  if (activeTicket) {
    return (
      <div className="h-[calc(100vh-8rem)] flex flex-col bg-[#1a1a2e]/60 backdrop-blur-xl rounded-xl border border-violet-500/20 overflow-hidden">
         {/* Header */}
         <div className="p-4 border-b border-violet-500/20 flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={() => setActiveTicket(null)} className="hover:bg-white/5">
               <ArrowLeft className="w-5 h-5 text-gray-300" />
            </Button>
            <div>
               <h2 className="font-bold text-white text-lg">{activeTicket.subject}</h2>
               <div className="flex items-center gap-3 text-sm text-gray-400">
                  <span className={`capitalize px-2 py-0.5 rounded-full text-xs font-medium border
                    ${activeTicket.status === 'open' ? 'bg-blue-500/20 text-blue-300 border-blue-500/30' : 
                      activeTicket.status === 'resolved' ? 'bg-green-500/20 text-green-300 border-green-500/30' : 
                      activeTicket.status === 'in_progress' ? 'bg-yellow-500/20 text-yellow-300 border-yellow-500/30' :
                      'bg-gray-500/20 text-gray-300 border-gray-500/30'}`}>
                    {activeTicket.status.replace('_', ' ')}
                  </span>
                  <span>#{activeTicket.id.slice(0,8)}</span>
               </div>
            </div>
         </div>
         
         {/* Conversation */}
         <div className="flex-1 overflow-y-auto p-4 space-y-4 scrollbar-thin scrollbar-thumb-violet-500/20">
            {/* Original Issue */}
            <div className="flex gap-4 p-4 bg-white/5 rounded-lg border border-white/10">
               <Avatar><AvatarFallback>ICH</AvatarFallback></Avatar>
               <div>
                  <div className="font-medium text-white mb-1">Deine Anfrage</div>
                  <p className="text-gray-300 whitespace-pre-wrap">{activeTicket.message}</p>
               </div>
            </div>
            
            {/* Replies */}
            {activeReplies.map(reply => {
               const isMe = reply.user_id === user.id;
               const profile = getProfileData(reply.profiles);
               const isStaff = ['owner', 'admin', 'developer'].includes(profile?.role);
               
               return (
                  <div key={reply.id} className={`flex gap-3 ${isMe ? 'flex-row-reverse' : ''}`}>
                     <Avatar className="w-8 h-8">
                       <AvatarImage src={profile?.avatar_url} />
                       <AvatarFallback className={isStaff ? 'bg-violet-600' : ''}>{isMe ? 'ICH' : profile?.full_name?.[0]}</AvatarFallback>
                     </Avatar>
                     <div className={`max-w-[80%] rounded-lg p-3 ${isMe ? 'bg-blue-600/20 border border-blue-500/30' : isStaff ? 'bg-violet-600/20 border border-violet-500/30' : 'bg-white/5'}`}>
                        <div className={`text-xs font-medium mb-1 ${isStaff ? 'text-violet-300' : 'text-gray-300'}`}>
                           {isMe ? 'Du' : profile?.full_name} {isStaff && '(Support)'}
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
         
         {/* Reply Box */}
         <div className="p-4 bg-[#141422] border-t border-violet-500/20 flex gap-2">
            <Input 
               placeholder="Antworten..." 
               value={replyMessage}
               onChange={e => setReplyMessage(e.target.value)}
               onKeyDown={e => { if(e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendReply(); }}} 
            />
            <Button onClick={sendReply} disabled={!replyMessage.trim() || replying}>
              {replying ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
            </Button>
         </div>
      </div>
    );
  }

  if (loading) return <div className="flex h-64 items-center justify-center"><Loader2 className="w-8 h-8 animate-spin text-violet-500" /></div>;

  // Dashboard View
  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row gap-6">
        {/* Help Resources Card */}
        <div className="flex-1 p-6 rounded-xl bg-[#1a1a2e]/60 border border-violet-500/20">
          <h2 className="text-xl font-bold mb-4 flex items-center gap-2 text-white">
            <Book className="w-5 h-5 text-violet-400" /> Dokumentation
          </h2>
          <div className="space-y-2">
            <a href="#" className="block p-3 rounded-lg bg-white/5 hover:bg-white/10 transition-colors text-sm text-gray-300">
              🚀 Erste Schritte mit DarkCode
            </a>
            <a href="#" className="block p-3 rounded-lg bg-white/5 hover:bg-white/10 transition-colors text-sm text-gray-300">
              🤖 Bot Hosting Anleitung
            </a>
            <a href="#" className="block p-3 rounded-lg bg-white/5 hover:bg-white/10 transition-colors text-sm text-gray-300">
              🔑 API Dokumentation
            </a>
          </div>
        </div>

        {/* Actions Card */}
        <div className="flex-1 p-6 rounded-xl bg-[#1a1a2e]/60 border border-violet-500/20 flex flex-col justify-center gap-4">
          <Dialog open={isTicketOpen} onOpenChange={setIsTicketOpen}>
            <DialogTrigger asChild>
              <Button className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium">
                <LifeBuoy className="w-4 h-4 mr-2" /> Support Ticket eröffnen
              </Button>
            </DialogTrigger>
            <DialogContent className="bg-[#1a1a2e] border-violet-500/20 text-white">
              <DialogHeader><DialogTitle>Neues Ticket</DialogTitle></DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label>Betreff</Label>
                  <Input value={newTicket.subject} onChange={e => setNewTicket({...newTicket, subject: e.target.value})} placeholder="Kurze Beschreibung des Problems" />
                </div>
                <div className="space-y-2">
                  <Label>Priorität</Label>
                  <select 
                    className="w-full h-10 px-3 rounded-md bg-black/20 border border-violet-500/20 text-white focus:outline-none focus:ring-2 focus:ring-violet-500/50"
                    value={newTicket.priority} onChange={e => setNewTicket({...newTicket, priority: e.target.value})}
                  >
                    <option value="low">Niedrig</option>
                    <option value="medium">Mittel</option>
                    <option value="high">Hoch</option>
                  </select>
                </div>
                <div className="space-y-2">
                  <Label>Nachricht</Label>
                  <textarea 
                    className="w-full h-32 px-3 py-2 rounded-md bg-black/20 border border-violet-500/20 text-white resize-none focus:outline-none focus:ring-2 focus:ring-violet-500/50"
                    value={newTicket.message} onChange={e => setNewTicket({...newTicket, message: e.target.value})}
                    placeholder="Beschreiben Sie Ihr Problem so genau wie möglich..."
                  />
                </div>
                <Button onClick={submitTicket} className="w-full" disabled={submitting}>
                    {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : "Ticket senden"}
                </Button>
              </div>
            </DialogContent>
          </Dialog>

          <Dialog open={isFeedbackOpen} onOpenChange={setIsFeedbackOpen}>
            <DialogTrigger asChild>
              <Button variant="outline" className="w-full border-violet-500/20 hover:bg-violet-500/10 text-white">
                <MessageSquare className="w-4 h-4 mr-2" /> Feedback & Vorschläge
              </Button>
            </DialogTrigger>
            <DialogContent className="bg-[#1a1a2e] border-violet-500/20 text-white">
              <DialogHeader><DialogTitle>Feedback senden</DialogTitle></DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label>Titel</Label>
                  <Input value={feedback.title} onChange={e => setFeedback({...feedback, title: e.target.value})} placeholder="Titel Ihres Feedbacks" />
                </div>
                <div className="space-y-2">
                  <Label>Typ</Label>
                  <select 
                    className="w-full h-10 px-3 rounded-md bg-black/20 border border-violet-500/20 text-white focus:outline-none focus:ring-2 focus:ring-violet-500/50"
                    value={feedback.type} onChange={e => setFeedback({...feedback, type: e.target.value})}
                  >
                    <option value="feature">Feature Wunsch</option>
                    <option value="bug">Bug Report</option>
                    <option value="general">Allgemein</option>
                  </select>
                </div>
                <div className="space-y-2">
                  <Label>Beschreibung</Label>
                  <textarea 
                    className="w-full h-32 px-3 py-2 rounded-md bg-black/20 border border-violet-500/20 text-white resize-none focus:outline-none focus:ring-2 focus:ring-violet-500/50"
                    value={feedback.description} onChange={e => setFeedback({...feedback, description: e.target.value})}
                    placeholder="Ihre Ideen oder gefundene Fehler..."
                  />
                </div>
                <Button onClick={submitFeedback} className="w-full">Senden</Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Ticket History */}
      <div className="rounded-xl bg-[#1a1a2e]/60 border border-violet-500/20 overflow-hidden">
        <div className="p-4 border-b border-white/5">
          <h3 className="font-semibold text-white">Meine Tickets</h3>
        </div>
        <div className="divide-y divide-white/5">
          {tickets.length === 0 ? (
            <div className="p-8 text-center text-gray-500">Keine Tickets vorhanden</div>
          ) : (
            tickets.map(ticket => (
              <div 
                key={ticket.id} 
                onClick={() => setActiveTicket(ticket)}
                className="p-4 flex items-center justify-between hover:bg-white/5 transition-colors cursor-pointer group"
              >
                <div>
                  <div className="font-medium text-white group-hover:text-violet-400 transition-colors">{ticket.subject}</div>
                  <div className="text-xs text-gray-400">ID: {ticket.id.slice(0,8)} • {new Date(ticket.created_at).toLocaleDateString()}</div>
                </div>
                <div className="flex items-center gap-4">
                  <span className={`px-2 py-1 rounded text-xs uppercase ${
                    ticket.priority === 'high' ? 'bg-red-500/20 text-red-300' : 'bg-blue-500/20 text-blue-300'
                  }`}>
                    {ticket.priority}
                  </span>
                  <span className={`px-2 py-1 rounded text-xs uppercase ${
                    ticket.status === 'open' ? 'bg-green-500/20 text-green-300' : 
                    ticket.status === 'in_progress' ? 'bg-yellow-500/20 text-yellow-300' :
                    'bg-gray-500/20 text-gray-300'
                  }`}>
                    {ticket.status.replace('_', ' ')}
                  </span>
                  <ChevronRight className="w-4 h-4 text-gray-500 group-hover:text-white" />
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};

export default SupportCenter;
