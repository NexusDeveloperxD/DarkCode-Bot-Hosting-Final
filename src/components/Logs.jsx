
import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FileText, Search, Filter, RefreshCw, Clock, User, Shield, Terminal, AlertCircle, Download, Trash2, Calendar } from 'lucide-react';
import { supabase } from '@/lib/customSupabaseClient';
import { format } from 'date-fns';
import { de } from 'date-fns/locale';
import { toast } from '@/components/ui/use-toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

const Logs = () => {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState('all');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [selectedLogs, setSelectedLogs] = useState([]);

  const fetchLogs = async () => {
    setLoading(true);
    try {
      let query = supabase
        .from('activity_logs')
        .select(`
          *,
          profiles:user_id (email, full_name, role)
        `)
        .order('created_at', { ascending: false });
      
      if (dateFrom) query = query.gte('created_at', new Date(dateFrom).toISOString());
      if (dateTo) query = query.lte('created_at', new Date(dateTo).toISOString());

      const { data, error } = await query.limit(100); // Limit to 100 for performance

      if (error) throw error;
      setLogs(data || []);
    } catch (error) {
      console.error('Error fetching logs:', error);
      toast({ title: "Fehler", description: "Logs konnten nicht geladen werden.", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
    
    const channel = supabase.channel('activity_logs_realtime_enhanced');
    
    channel
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'activity_logs' }, async (payload) => {
        try {
          const { data, error } = await supabase
            .from('activity_logs')
            .select(`*, profiles:user_id (email, full_name, role)`)
            .eq('id', payload.new.id)
            .single();
            
          if (data && !error) {
            setLogs(prev => [data, ...prev].slice(0, 100));
          }
        } catch (e) {
          console.error("Error fetching new log details", e);
        }
      })
      .subscribe();

    return () => supabase.removeChannel(channel);
  }, []);

  const handleExport = () => {
    if (logs.length === 0) return;

    const headers = ['ID', 'Zeit', 'Aktion', 'Benutzer', 'Details'];
    const csvContent = [
      headers.join(','),
      ...filteredLogs.map(log => [
        log.id,
        new Date(log.created_at).toISOString(),
        log.action,
        log.profiles?.email || 'System',
        `"${JSON.stringify(log.details || {}).replace(/"/g, '""')}"`
      ].join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `logs_export_${format(new Date(), 'yyyy-MM-dd')}.csv`;
    link.click();
    
    toast({ title: "Export erfolgreich", description: `${filteredLogs.length} Einträge exportiert.` });
  };

  const handleDeleteSelected = async () => {
    if (!window.confirm(`Sind Sie sicher, dass Sie ${selectedLogs.length} Einträge löschen möchten?`)) return;
    
    try {
      const { error } = await supabase
        .from('activity_logs')
        .delete()
        .in('id', selectedLogs);

      if (error) throw error;

      setLogs(logs.filter(log => !selectedLogs.includes(log.id)));
      setSelectedLogs([]);
      toast({ title: "Gelöscht", description: "Ausgewählte Logs wurden entfernt." });
    } catch (error) {
      toast({ title: "Fehler", description: "Löschen fehlgeschlagen", variant: "destructive" });
    }
  };

  const getActionIcon = (action) => {
    if (action.includes('login') || action.includes('auth')) return User;
    if (action.includes('bot')) return Terminal;
    if (action.includes('security') || action.includes('update')) return Shield;
    if (action.includes('error') || action.includes('fail')) return AlertCircle;
    return FileText;
  };

  const getActionColor = (action) => {
    if (action.includes('login')) return 'text-green-400 bg-green-400/10';
    if (action.includes('bot')) return 'text-blue-400 bg-blue-400/10';
    if (action.includes('error')) return 'text-red-400 bg-red-400/10';
    return 'text-violet-400 bg-violet-400/10';
  };

  const filteredLogs = logs.filter(log => {
    const matchesSearch = 
      log.action.toLowerCase().includes(searchTerm.toLowerCase()) ||
      log.details?.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      log.profiles?.email?.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesFilter = filterType === 'all' || log.entity_type === filterType;

    return matchesSearch && matchesFilter;
  });

  const toggleSelectAll = () => {
    if (selectedLogs.length === filteredLogs.length) {
      setSelectedLogs([]);
    } else {
      setSelectedLogs(filteredLogs.map(l => l.id));
    }
  };

  const toggleSelect = (id) => {
    if (selectedLogs.includes(id)) {
      setSelectedLogs(selectedLogs.filter(lid => lid !== id));
    } else {
      setSelectedLogs([...selectedLogs, id]);
    }
  };

  return (
    <div className="space-y-6 pb-20 md:pb-0">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold bg-gradient-to-r from-violet-400 to-blue-400 bg-clip-text text-transparent mb-2">
            Systemprotokolle
          </h1>
          <p className="text-gray-400 text-sm md:text-base">Verwaltung und Analyse von Systemereignissen</p>
        </div>
        <div className="flex gap-2">
          {selectedLogs.length > 0 && (
            <Button variant="destructive" size="sm" onClick={handleDeleteSelected}>
              <Trash2 className="w-4 h-4 mr-2" /> {selectedLogs.length} Löschen
            </Button>
          )}
          <Button variant="outline" size="sm" onClick={handleExport}>
            <Download className="w-4 h-4 mr-2" /> Exportieren
          </Button>
          <Button variant="outline" size="icon" onClick={fetchLogs}>
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </Button>
        </div>
      </div>

      {/* Filters & Search */}
      <div className="flex flex-col gap-4 p-4 rounded-xl bg-[#1a1a2e]/60 backdrop-blur-xl border border-violet-500/20">
        <div className="flex flex-col md:flex-row gap-4">
           <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <Input
              type="text"
              placeholder="Suchen..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
          <div className="flex gap-2">
            <div className="relative">
              <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input 
                type="date" 
                value={dateFrom}
                onChange={e => setDateFrom(e.target.value)}
                className="pl-10 h-10 rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 [color-scheme:dark]" 
              />
            </div>
            <div className="relative">
              <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input 
                type="date" 
                value={dateTo}
                onChange={e => setDateTo(e.target.value)}
                className="pl-10 h-10 rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 [color-scheme:dark]" 
              />
            </div>
          </div>
        </div>
        
        <div className="flex gap-2 overflow-x-auto pb-2 md:pb-0 no-scrollbar">
          {['all', 'auth', 'bot', 'system', 'user'].map((type) => (
            <button
              key={type}
              onClick={() => setFilterType(type)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-all whitespace-nowrap flex-shrink-0 ${
                filterType === type
                  ? 'bg-violet-600 text-white shadow-lg shadow-violet-500/20'
                  : 'bg-[#0a0a0f] text-gray-400 hover:text-white border border-violet-500/20'
              }`}
            >
              {type === 'all' ? 'Alle' : type.charAt(0).toUpperCase() + type.slice(1)}
            </button>
          ))}
        </div>
      </div>

      {/* Logs List */}
      <div className="rounded-xl bg-[#1a1a2e]/60 backdrop-blur-xl border border-violet-500/20 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse min-w-[700px]">
            <thead>
              <tr className="border-b border-white/5 bg-white/5">
                <th className="p-4 w-10">
                  <input type="checkbox" checked={selectedLogs.length === filteredLogs.length && filteredLogs.length > 0} onChange={toggleSelectAll} className="rounded border-gray-600 bg-transparent" />
                </th>
                <th className="p-4 text-xs font-medium text-gray-400 uppercase tracking-wider">Ereignis</th>
                <th className="p-4 text-xs font-medium text-gray-400 uppercase tracking-wider">Benutzer</th>
                <th className="p-4 text-xs font-medium text-gray-400 uppercase tracking-wider">Details</th>
                <th className="p-4 text-xs font-medium text-gray-400 uppercase tracking-wider">Zeit</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              <AnimatePresence>
                {filteredLogs.map((log, index) => {
                  const Icon = getActionIcon(log.action);
                  const colorClass = getActionColor(log.action);
                  
                  return (
                    <motion.tr
                      key={log.id}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0 }}
                      transition={{ delay: index * 0.05 }}
                      className={`group hover:bg-white/5 transition-colors ${selectedLogs.includes(log.id) ? 'bg-violet-500/10' : ''}`}
                    >
                      <td className="p-4">
                        <input type="checkbox" checked={selectedLogs.includes(log.id)} onChange={() => toggleSelect(log.id)} className="rounded border-gray-600 bg-transparent" />
                      </td>
                      <td className="p-4">
                        <div className="flex items-center gap-3">
                          <div className={`p-2 rounded-lg ${colorClass}`}>
                            <Icon className="w-4 h-4" />
                          </div>
                          <span className="font-medium text-white">{log.action}</span>
                        </div>
                      </td>
                      <td className="p-4">
                        <div className="flex items-center gap-2">
                          <div className="w-6 h-6 rounded-full bg-gradient-to-br from-violet-500 to-blue-500 flex items-center justify-center text-[10px] font-bold shrink-0">
                            {log.profiles?.email?.[0]?.toUpperCase() || 'S'}
                          </div>
                          <span className="text-sm text-gray-300 truncate max-w-[150px] block">
                            {log.profiles?.full_name || log.profiles?.email || 'System'}
                          </span>
                        </div>
                      </td>
                      <td className="p-4">
                        <span className="text-sm text-gray-400 line-clamp-1 block max-w-[200px]">
                          {log.details ? JSON.stringify(log.details) : 'Keine Details'}
                        </span>
                      </td>
                      <td className="p-4">
                        <div className="flex items-center gap-2 text-sm text-gray-500 whitespace-nowrap">
                          <Clock className="w-3 h-3" />
                          {format(new Date(log.created_at), 'd. MMM, HH:mm', { locale: de })}
                        </div>
                      </td>
                    </motion.tr>
                  );
                })}
              </AnimatePresence>
              
              {filteredLogs.length === 0 && !loading && (
                <tr>
                  <td colSpan="5" className="p-8 text-center text-gray-500">
                    Keine Protokolle gefunden.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default Logs;
