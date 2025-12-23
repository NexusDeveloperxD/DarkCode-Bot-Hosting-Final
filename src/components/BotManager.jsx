
import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Bot, Plus, Search, Play, Square, RefreshCw, Trash2, Edit, Cpu, Zap, Code, Terminal, Save, X } from 'lucide-react';
import { supabase } from '@/lib/customSupabaseClient';
import { useAuth } from '@/contexts/SupabaseAuthContext';
import { toast } from '@/components/ui/use-toast';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const BotStatus = ({ status }) => {
  const colors = {
    online: 'bg-green-500/10 text-green-400 border-green-500/20',
    offline: 'bg-red-500/10 text-red-400 border-red-500/20',
    maintenance: 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20',
    starting: 'bg-blue-500/10 text-blue-400 border-blue-500/20'
  };

  const labels = {
    online: 'Online',
    offline: 'Offline',
    maintenance: 'Wartung',
    starting: 'Startet'
  };

  return (
    <span className={`px-3 py-1 rounded-full text-xs font-medium border ${colors[status.toLowerCase()] || colors.offline} flex items-center gap-1.5 w-fit whitespace-nowrap`}>
      <span className={`w-1.5 h-1.5 rounded-full ${status.toLowerCase() === 'online' ? 'bg-green-400 animate-pulse' : 'bg-current'}`} />
      {labels[status.toLowerCase()] || status}
    </span>
  );
};

const BotManager = () => {
  const { user } = useAuth();
  const [bots, setBots] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  
  // Bot Form State
  const initialBotState = { name: '', description: '', language: 'Node.js', framework: 'Discord.js', code: '' };
  const [formData, setFormData] = useState(initialBotState);
  const [editingBotId, setEditingBotId] = useState(null);

  useEffect(() => {
    fetchBots();
    
    // Robust Real-time subscription with error handling
    const channel = supabase.channel('bot_manager_realtime');
    
    channel
      .on('postgres_changes', { event: '*', schema: 'public', table: 'bots' }, (payload) => {
        // Handle changes immediately without refetching everything for better performance
        if (payload.eventType === 'INSERT') {
           setBots(current => [payload.new, ...current]);
        } else if (payload.eventType === 'UPDATE') {
           setBots(current => current.map(bot => bot.id === payload.new.id ? payload.new : bot));
        } else if (payload.eventType === 'DELETE') {
           setBots(current => current.filter(bot => bot.id !== payload.old.id));
        }
      })
      .subscribe((status) => {
        if (status === 'CHANNEL_ERROR') {
          console.error('Realtime bot subscription error, retrying...');
          setTimeout(() => channel.subscribe(), 5000);
        }
      });

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user]);

  const fetchBots = async () => {
    try {
      const { data, error } = await supabase
        .from('bots')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      setBots(data || []);
    } catch (error) {
      console.error('Error:', error);
      toast({ title: "Fehler", description: "Bots konnten nicht geladen werden", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const handleSaveBot = async () => {
    if (!formData.name) return;
    
    try {
      if (editingBotId) {
        // Update
        const { error } = await supabase
          .from('bots')
          .update({
            name: formData.name,
            description: formData.description,
            language: formData.language,
            framework: formData.framework,
            code: formData.code
          })
          .eq('id', editingBotId);
          
        if (error) throw error;
        toast({ title: "Erfolg", description: "Bot erfolgreich aktualisiert" });
      } else {
        // Create
        const { error } = await supabase.from('bots').insert({
          ...formData,
          status: 'offline',
          owner_id: user.id,
          memory_usage: '0MB',
          uptime: '0Std',
          users_count: 0
        });
        
        if (error) throw error;
        toast({ title: "Erfolg", description: "Bot erfolgreich erstellt" });
        await supabase.from('activity_logs').insert({
          user_id: user.id,
          action: 'create_bot',
          entity_type: 'bot',
          details: { bot_name: formData.name }
        });
      }

      closeModal();
    } catch (error) {
      toast({ title: "Fehler", description: error.message, variant: "destructive" });
    }
  };

  const openEditModal = (bot) => {
    setEditingBotId(bot.id);
    setFormData({
      name: bot.name,
      description: bot.description || '',
      language: bot.language,
      framework: bot.framework,
      code: bot.code || ''
    });
    setIsEditOpen(true);
  };

  const closeModal = () => {
    setIsCreateOpen(false);
    setIsEditOpen(false);
    setEditingBotId(null);
    setFormData(initialBotState);
  };

  const handleDeleteBot = async (id, name) => {
    if (!window.confirm(`Sind Sie sicher, dass Sie ${name} löschen möchten?`)) return;

    try {
      const { error } = await supabase.from('bots').delete().eq('id', id);
      if (error) throw error;
      
      toast({ title: "Gelöscht", description: "Bot erfolgreich gelöscht" });
      await supabase.from('activity_logs').insert({
        user_id: user.id,
        action: 'delete_bot',
        entity_type: 'bot',
        entity_id: id,
        details: { bot_name: name }
      });
    } catch (error) {
      toast({ title: "Fehler", description: "Bot konnte nicht gelöscht werden", variant: "destructive" });
    }
  };

  const toggleBotStatus = async (bot) => {
    const isOnline = bot.status === 'online';
    const newStatus = isOnline ? 'offline' : 'online';
    
    // Optimistic update
    setBots(bots.map(b => b.id === bot.id ? { ...b, status: isOnline ? 'offline' : 'starting' } : b));

    try {
      // Simulate startup delay
      if (!isOnline) {
        await new Promise(r => setTimeout(r, 1500));
      }

      const { error } = await supabase
        .from('bots')
        .update({ 
          status: newStatus,
          uptime: newStatus === 'online' ? '0Std 1m' : '0Std'
        })
        .eq('id', bot.id);

      if (error) throw error;
      
      toast({ title: newStatus === 'online' ? "Bot Gestartet" : "Bot Gestoppt", description: `${bot.name} ist jetzt ${newStatus === 'online' ? 'Online' : 'Offline'}` });
    } catch (error) {
      fetchBots(); // Revert on error
      toast({ title: "Fehler", description: "Statusänderung fehlgeschlagen", variant: "destructive" });
    }
  };
  
  const restartBot = async (bot) => {
    if (bot.status !== 'online') return;
    
    try {
      toast({ title: "Neustart...", description: `${bot.name} wird neu gestartet` });
      
      // Set to maintenance/restarting
      await supabase.from('bots').update({ status: 'maintenance' }).eq('id', bot.id);
      
      // Simulate restart time
      setTimeout(async () => {
        await supabase.from('bots').update({ status: 'online', uptime: '0Std 1m' }).eq('id', bot.id);
        toast({ title: "Neugestartet", description: `${bot.name} erfolgreich neu gestartet` });
      }, 2000);
      
    } catch (error) {
      toast({ title: "Fehler", description: "Neustart fehlgeschlagen", variant: "destructive" });
    }
  };

  const filteredBots = bots.filter(bot => 
    bot.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const BotForm = ({ title, isOpen, onOpenChange }) => (
    <Dialog open={isOpen} onOpenChange={(val) => !val && closeModal()}>
      <DialogContent className="bg-[#1a1a2e] border-violet-500/20 text-white max-w-2xl w-[95vw] sm:w-full max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Bot Name</Label>
              <Input 
                value={formData.name} 
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="Mein Super Bot"
              />
            </div>
            <div className="space-y-2">
              <Label>Framework</Label>
              <select 
                className="w-full px-3 py-2 rounded-md bg-black/20 border border-violet-500/20 text-white text-sm focus:outline-none focus:ring-2 focus:ring-violet-500/50"
                value={formData.framework}
                onChange={(e) => setFormData({ ...formData, framework: e.target.value })}
              >
                <option value="Discord.js">Discord.js</option>
                <option value="Discord.py">Discord.py</option>
                <option value="JDA">JDA</option>
              </select>
            </div>
          </div>
          
          <div className="space-y-2">
            <Label>Beschreibung</Label>
            <Input 
              value={formData.description} 
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="Was macht dieser Bot?"
            />
          </div>

          <div className="space-y-2">
            <Label className="flex items-center gap-2">
              <Code className="w-4 h-4" /> Bot Code
            </Label>
            <div className="relative">
              <textarea 
                className="w-full h-48 md:h-64 px-4 py-3 rounded-md bg-[#0d0d15] border border-violet-500/20 text-gray-300 font-mono text-sm focus:outline-none focus:ring-2 focus:ring-violet-500/50 resize-none"
                value={formData.code}
                onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                placeholder="// Fügen Sie hier Ihren Bot-Code ein..."
              />
              <div className="absolute top-2 right-2 text-xs text-gray-600 bg-black/40 px-2 py-1 rounded pointer-events-none">
                {formData.language}
              </div>
            </div>
          </div>
        </div>
        <DialogFooter className="gap-2 sm:gap-0">
          <Button variant="ghost" onClick={closeModal}>Abbrechen</Button>
          <Button onClick={handleSaveBot} disabled={!formData.name}>
            {editingBotId ? 'Änderungen speichern' : 'Bot erstellen'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );

  return (
    <div className="space-y-6 pb-20 md:pb-0">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold bg-gradient-to-r from-violet-400 to-blue-400 bg-clip-text text-transparent mb-2">
            Bot Manager
          </h1>
          <p className="text-gray-400 text-sm md:text-base">Verwalten und überwachen Sie Ihre Discord-Bots</p>
        </div>
        
        <Button 
          onClick={() => setIsCreateOpen(true)}
          className="w-full md:w-auto bg-violet-600 hover:bg-violet-700 text-white font-medium flex items-center justify-center gap-2 transition-all shadow-lg shadow-violet-500/20"
        >
          <Plus className="w-5 h-5" />
          Neuen Bot hinzufügen
        </Button>

        {/* Create/Edit Modals */}
        <BotForm title={isEditOpen ? "Bot bearbeiten" : "Neuen Bot erstellen"} isOpen={isCreateOpen || isEditOpen} />
      </div>

      <div className="flex flex-col md:flex-row gap-4 p-4 rounded-xl bg-[#1a1a2e]/60 backdrop-blur-xl border border-violet-500/20">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="Bots suchen..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 rounded-lg bg-[#0a0a0f] border border-violet-500/20 text-white placeholder-gray-500 focus:outline-none focus:border-violet-500/50 transition-all"
          />
        </div>
        <button 
          onClick={fetchBots}
          className="p-2 rounded-lg bg-[#0a0a0f] border border-violet-500/20 text-gray-400 hover:text-white transition-all hidden md:block"
        >
          <RefreshCw className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {loading && bots.length === 0 ? (
        <div className="flex justify-center py-12">
          <RefreshCw className="w-8 h-8 animate-spin text-violet-500" />
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <AnimatePresence>
            {filteredBots.map((bot) => (
              <motion.div
                key={bot.id}
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="group rounded-xl bg-[#1a1a2e]/60 backdrop-blur-xl border border-violet-500/20 overflow-hidden hover:border-violet-500/50 transition-all"
              >
                <div className="p-6 space-y-4">
                  <div className="flex justify-between items-start">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-violet-600 to-blue-500 flex items-center justify-center text-white shadow-lg shrink-0">
                        <Bot className="w-6 h-6" />
                      </div>
                      <div className="min-w-0">
                        <h3 className="font-bold text-white text-lg leading-tight truncate">{bot.name}</h3>
                        <div className="text-xs text-gray-400 mt-1">{bot.language} • {bot.framework}</div>
                      </div>
                    </div>
                    <div className="relative">
                      <BotStatus status={bot.status} />
                    </div>
                  </div>
                  
                  {bot.description && (
                    <p className="text-sm text-gray-400 line-clamp-2 min-h-[2.5em]">{bot.description}</p>
                  )}

                  <div className="grid grid-cols-2 gap-4 py-4 border-t border-white/5 border-b">
                    <div>
                      <div className="text-xs text-gray-500 flex items-center gap-1 mb-1">
                        <Cpu className="w-3 h-3" /> Speicher
                      </div>
                      <div className="font-mono text-sm">{bot.memory_usage || '0MB'}</div>
                    </div>
                    <div>
                      <div className="text-xs text-gray-500 flex items-center gap-1 mb-1">
                        <Zap className="w-3 h-3" /> Laufzeit
                      </div>
                      <div className="font-mono text-sm">{bot.uptime || '0Std'}</div>
                    </div>
                  </div>

                  <div className="flex flex-col gap-2">
                    <div className="flex items-center gap-2">
                       <button
                        onClick={() => toggleBotStatus(bot)}
                        disabled={bot.status === 'starting'}
                        className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-sm font-medium transition-all ${
                          bot.status === 'online'
                            ? 'bg-red-500/10 text-red-400 hover:bg-red-500/20'
                            : 'bg-green-500/10 text-green-400 hover:bg-green-500/20'
                        }`}
                      >
                        {bot.status === 'online' ? <Square className="w-4 h-4 fill-current" /> : <Play className="w-4 h-4 fill-current" />}
                        {bot.status === 'online' ? 'Stoppen' : 'Starten'}
                      </button>
                      
                      {bot.status === 'online' && (
                        <button 
                          onClick={() => restartBot(bot)}
                          className="p-2 rounded-lg bg-blue-500/10 hover:bg-blue-500/20 text-blue-400 transition-all"
                          title="Neustarten"
                        >
                          <RefreshCw className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                    
                    <div className="flex gap-2">
                       <button 
                        onClick={() => openEditModal(bot)}
                        className="flex-1 py-2 rounded-lg bg-white/5 hover:bg-white/10 text-gray-300 text-sm font-medium transition-all flex items-center justify-center gap-2"
                      >
                        <Edit className="w-4 h-4" /> Code
                      </button>
                      <button 
                        onClick={() => handleDeleteBot(bot.id, bot.name)}
                        className="p-2 rounded-lg bg-white/5 hover:bg-red-500/10 text-gray-400 hover:text-red-400"
                        title="Bot löschen"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
          {filteredBots.length === 0 && (
            <div className="col-span-full py-12 text-center text-gray-500 bg-[#1a1a2e]/30 rounded-xl border border-dashed border-white/10">
              Keine Bots gefunden. Erstellen Sie einen, um zu beginnen!
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default BotManager;
