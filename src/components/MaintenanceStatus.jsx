
import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Activity, AlertTriangle, CheckCircle, Clock, Plus, Calendar, AlertCircle, Edit2, Trash2, X, FileCheck } from 'lucide-react';
import { supabase } from '@/lib/customSupabaseClient';
import { useAuth } from '@/contexts/SupabaseAuthContext';
import { toast } from '@/components/ui/use-toast';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { format } from 'date-fns';
import { de } from 'date-fns/locale';

const StatusBadge = ({ status }) => {
  const styles = {
    scheduled: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
    'in_progress': 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20',
    completed: 'bg-green-500/10 text-green-400 border-green-500/20',
    resolved: 'bg-green-500/10 text-green-400 border-green-500/20',
  };
  
  const labels = {
    scheduled: 'Geplant',
    'in_progress': 'In Bearbeitung',
    completed: 'Abgeschlossen',
    resolved: 'Gelöst'
  };

  return (
    <span className={`px-2 py-1 rounded-md text-xs font-medium border ${styles[status?.toLowerCase()] || styles.scheduled} uppercase tracking-wider whitespace-nowrap`}>
      {labels[status] || status?.replace('_', ' ')}
    </span>
  );
};

const MaintenanceStatus = () => {
  const { user } = useAuth();
  const [incidents, setIncidents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingIncident, setEditingIncident] = useState(null);
  
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    status: 'scheduled',
    impact: 'minor',
    scheduled_at: '',
    completion_notes: ''
  });

  useEffect(() => {
    fetchIncidents();
    
    // Robust Real-time subscription with error handling
    const channel = supabase.channel('maintenance_status_realtime');
    
    channel
      .on('postgres_changes', { event: '*', schema: 'public', table: 'maintenance_logs' }, (payload) => {
        // Handle different events
        if (payload.eventType === 'INSERT') {
           toast({ 
             title: "Neuer Wartungshinweis", 
             description: `${payload.new.title} wurde erstellt.` 
           });
           fetchIncidents();
        } else if (payload.eventType === 'UPDATE') {
           // Optimistically update the list
           setIncidents(current => current.map(item => 
             item.id === payload.new.id ? { ...item, ...payload.new } : item
           ));
           
           toast({ 
             title: "Wartung aktualisiert", 
             description: `Status für "${payload.new.title}" geändert.` 
           });
        } else if (payload.eventType === 'DELETE') {
           setIncidents(current => current.filter(item => item.id !== payload.old.id));
           toast({ title: "Wartung entfernt", description: "Ein Wartungsprotokoll wurde gelöscht." });
        }
      })
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          // console.log('Connected to maintenance updates');
        } else if (status === 'CHANNEL_ERROR') {
          console.error('Realtime subscription error, retrying...');
          setTimeout(() => {
            channel.subscribe();
          }, 5000);
        }
      });

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user]);

  const fetchIncidents = async () => {
    try {
      const { data, error } = await supabase
        .from('maintenance_logs')
        .select(`*, profiles:created_by(full_name)`)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setIncidents(data || []);
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async () => {
    if (!formData.title) return;

    try {
      const maintenanceData = {
        title: formData.title,
        description: formData.description,
        status: formData.status,
        impact: formData.impact,
        start_time: formData.scheduled_at ? new Date(formData.scheduled_at).toISOString() : new Date().toISOString(),
        completion_notes: (formData.status === 'completed' || formData.status === 'resolved') ? formData.completion_notes : null,
        end_time: (formData.status === 'completed' || formData.status === 'resolved') ? new Date().toISOString() : null
      };

      if (editingIncident) {
        // Update
        const { error } = await supabase
          .from('maintenance_logs')
          .update(maintenanceData)
          .eq('id', editingIncident.id);
        
        if (error) throw error;
      } else {
        // Create
        const { error } = await supabase.from('maintenance_logs').insert({
          ...maintenanceData,
          created_by: user.id
        });
        
        if (error) throw error;
      }

      setIsModalOpen(false);
      resetForm();
    } catch (error) {
      toast({ title: "Fehler", description: error.message, variant: "destructive" });
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Möchten Sie diesen Eintrag wirklich löschen?")) return;
    try {
      const { error } = await supabase.from('maintenance_logs').delete().eq('id', id);
      if (error) throw error;
    } catch (error) {
      toast({ title: "Fehler", description: "Vorfall konnte nicht gelöscht werden", variant: "destructive" });
    }
  };

  const openEditModal = (incident) => {
    setEditingIncident(incident);
    setFormData({
      title: incident.title,
      description: incident.description || '',
      status: incident.status,
      impact: incident.impact,
      scheduled_at: incident.start_time ? new Date(incident.start_time).toISOString().slice(0, 16) : '',
      completion_notes: incident.completion_notes || ''
    });
    setIsModalOpen(true);
  };

  const resetForm = () => {
    setEditingIncident(null);
    setFormData({ 
      title: '', 
      description: '', 
      status: 'scheduled', 
      impact: 'minor',
      scheduled_at: '',
      completion_notes: ''
    });
  };

  const showCompletionNotes = (status) => {
    return status === 'completed' || status === 'resolved';
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8 pb-20 md:pb-0">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold bg-gradient-to-r from-violet-400 to-blue-400 bg-clip-text text-transparent mb-2">
            Systemstatus
          </h1>
          <p className="text-gray-400 text-sm md:text-base">Aktueller Systemstatus und Wartungsverlauf</p>
        </div>
        
        <Dialog open={isModalOpen} onOpenChange={(open) => { setIsModalOpen(open); if(!open) resetForm(); }}>
          <DialogTrigger asChild>
            <button className="w-full md:w-auto px-4 py-2 rounded-lg bg-white/5 hover:bg-white/10 border border-violet-500/20 text-white text-sm font-medium flex items-center justify-center gap-2 transition-colors">
              <Plus className="w-4 h-4" />
              Vorfall melden
            </button>
          </DialogTrigger>
          <DialogContent className="bg-[#1a1a2e] border-violet-500/20 text-white max-h-[90vh] overflow-y-auto w-[95vw] md:w-full">
            <DialogHeader>
              <DialogTitle>{editingIncident ? 'Vorfall bearbeiten' : 'Vorfall melden'}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label>Titel</Label>
                <Input 
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  placeholder="z.B. Datenbankverbindungsprobleme"
                />
              </div>
              <div className="space-y-2">
                <Label>Beschreibung</Label>
                <textarea 
                  className="w-full h-24 px-3 py-2 rounded-md bg-black/20 border border-violet-500/20 text-white text-sm focus:outline-none focus:ring-2 focus:ring-violet-500/50 resize-none"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Beschreiben Sie das Problem..."
                />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Status</Label>
                  <select 
                    className="w-full px-3 py-2 rounded-md bg-black/20 border border-violet-500/20 text-white text-sm focus:outline-none focus:ring-2 focus:ring-violet-500/50"
                    value={formData.status}
                    onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                  >
                    <option value="scheduled">Geplant</option>
                    <option value="in_progress">In Bearbeitung</option>
                    <option value="resolved">Gelöst</option>
                    <option value="completed">Abgeschlossen</option>
                  </select>
                </div>
                <div className="space-y-2">
                  <Label>Auswirkung</Label>
                  <select 
                    className="w-full px-3 py-2 rounded-md bg-black/20 border border-violet-500/20 text-white text-sm focus:outline-none focus:ring-2 focus:ring-violet-500/50"
                    value={formData.impact}
                    onChange={(e) => setFormData({ ...formData, impact: e.target.value })}
                  >
                    <option value="minor">Gering</option>
                    <option value="major">Mittel</option>
                    <option value="critical">Kritisch</option>
                  </select>
                </div>
              </div>
              
              <div className="space-y-2">
                <Label>Geplanter Zeitpunkt</Label>
                <input
                  type="datetime-local"
                  className="w-full px-3 py-2 rounded-md bg-black/20 border border-violet-500/20 text-white text-sm focus:outline-none focus:ring-2 focus:ring-violet-500/50 [color-scheme:dark]"
                  value={formData.scheduled_at}
                  onChange={(e) => setFormData({ ...formData, scheduled_at: e.target.value })}
                />
              </div>

              {/* Completion Notes Field - Shows only when completed/resolved */}
              <AnimatePresence>
                {showCompletionNotes(formData.status) && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    className="space-y-2 overflow-hidden"
                  >
                    <Label className="text-green-400">Abschlussbericht / Notizen</Label>
                    <textarea 
                      className="w-full h-24 px-3 py-2 rounded-md bg-green-500/5 border border-green-500/20 text-white text-sm focus:outline-none focus:ring-2 focus:ring-green-500/50 resize-none"
                      value={formData.completion_notes}
                      onChange={(e) => setFormData({ ...formData, completion_notes: e.target.value })}
                      placeholder="Was wurde gemacht um das Problem zu lösen? (Wird gespeichert)"
                    />
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
            <DialogFooter className="gap-2 sm:gap-0">
              <Button variant="ghost" onClick={() => setIsModalOpen(false)}>Abbrechen</Button>
              <Button onClick={handleSubmit} disabled={!formData.title}>{editingIncident ? 'Änderungen speichern' : 'Bericht senden'}</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* Current System Status Banner */}
      <div className="p-4 md:p-6 rounded-xl bg-gradient-to-r from-green-500/10 to-emerald-500/10 border border-green-500/20 flex flex-col md:flex-row md:items-center gap-4">
        <div className="flex items-center gap-4">
          <div className="p-3 rounded-full bg-green-500/20 text-green-400">
            <CheckCircle className="w-8 h-8" />
          </div>
          <div className="md:hidden">
            <h2 className="text-lg font-bold text-white">Systeme OK</h2>
          </div>
        </div>
        <div>
          <h2 className="hidden md:block text-xl font-bold text-white">Alle Systeme betriebsbereit</h2>
          <p className="text-sm md:text-base text-green-200/60">Keine aktiven Vorfälle in den letzten 24 Stunden.</p>
        </div>
      </div>

      {/* Incident History */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold flex items-center gap-2">
          <Clock className="w-5 h-5 text-violet-400" />
          Vorfall-Verlauf
        </h3>

        {loading ? (
          <div className="text-center py-8 text-gray-500">Lade Verlauf...</div>
        ) : (
          <div className="space-y-4">
            {incidents.map((incident) => (
              <motion.div
                key={incident.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="p-4 rounded-xl bg-[#1a1a2e]/60 border border-violet-500/20 hover:border-violet-500/40 transition-all group"
              >
                <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
                  <div className="flex items-start gap-4 flex-1">
                    <div className={`mt-1 p-2 rounded-lg flex-shrink-0 ${incident.impact === 'critical' ? 'bg-red-500/10 text-red-400' : 'bg-blue-500/10 text-blue-400'}`}>
                      {incident.impact === 'critical' ? <AlertCircle className="w-5 h-5" /> : <Activity className="w-5 h-5" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3 mb-1">
                        <h4 className="font-bold text-white truncate">{incident.title}</h4>
                        <StatusBadge status={incident.status} />
                      </div>
                      <p className="text-sm text-gray-400 mb-2 break-words">{incident.description || 'Keine Beschreibung vorhanden.'}</p>
                      
                      {incident.completion_notes && (
                        <div className="mt-2 mb-3 p-3 bg-green-500/5 border border-green-500/10 rounded-lg">
                          <div className="flex items-center gap-2 text-xs font-semibold text-green-400 mb-1">
                            <FileCheck className="w-3 h-3" /> Abschlussbericht
                          </div>
                          <p className="text-xs text-gray-300 italic">{incident.completion_notes}</p>
                        </div>
                      )}

                      <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4 text-xs text-gray-500">
                        <span className="flex items-center gap-1">
                          <Calendar className="w-3 h-3" />
                          {incident.start_time 
                            ? format(new Date(incident.start_time), 'd. MMM yyyy - HH:mm', { locale: de })
                            : format(new Date(incident.created_at), 'd. MMM yyyy - HH:mm', { locale: de })}
                        </span>
                        <span>Von: {incident.profiles?.full_name || 'System'}</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center justify-end gap-2 md:opacity-0 md:group-hover:opacity-100 transition-opacity">
                    <Button variant="ghost" size="icon" onClick={() => openEditModal(incident)} className="text-gray-400 hover:text-white">
                      <Edit2 className="w-4 h-4" />
                    </Button>
                    <Button variant="ghost" size="icon" onClick={() => handleDelete(incident.id)} className="text-gray-400 hover:text-red-400 hover:bg-red-400/10">
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </motion.div>
            ))}
            {incidents.length === 0 && (
              <div className="text-center py-8 text-gray-500 bg-[#1a1a2e]/30 rounded-xl border border-dashed border-white/10">
                Kein Wartungsverlauf gefunden
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default MaintenanceStatus;
