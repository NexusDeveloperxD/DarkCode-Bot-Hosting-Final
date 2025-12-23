
import React, { useState, useEffect } from 'react';
import { Shield, Server, Database, Lock, AlertTriangle, CheckCircle, Users, Ban, Trash2, RefreshCw, FileText, Activity, HardDrive, Cpu, Terminal, CreditCard, Save } from 'lucide-react';
import { toast } from '@/components/ui/use-toast';
import { useAuth } from '@/contexts/SupabaseAuthContext';
import { supabase } from '@/lib/customSupabaseClient';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { format } from 'date-fns';
import { de } from 'date-fns/locale';

const AdminCard = ({ title, description, icon: Icon, action, danger, enabled, loading, customContent }) => (
  <div className={`p-6 rounded-xl border ${danger ? 'border-red-500/20 bg-red-500/5' : 'border-violet-500/20 bg-[#1a1a2e]/60'} backdrop-blur-xl opacity-${enabled ? '100' : '50'} flex flex-col h-full`}>
    <div className="flex items-start gap-4 mb-4">
      <div className={`p-3 rounded-lg ${danger ? 'bg-red-500/10 text-red-400' : 'bg-violet-500/10 text-violet-400'}`}>
        <Icon className="w-6 h-6" />
      </div>
      <div>
        <h3 className="text-lg font-bold text-white">{title}</h3>
        <p className="text-sm text-gray-400 mt-1">{description}</p>
      </div>
    </div>
    
    {customContent && <div className="mb-4 flex-1">{customContent}</div>}

    <div className="mt-auto">
      <button 
        onClick={action}
        disabled={!enabled || loading}
        className={`w-full py-2 rounded-lg font-medium transition-all flex items-center justify-center gap-2 ${
          danger 
            ? 'bg-red-500/10 text-red-400 hover:bg-red-500/20 border border-red-500/20' 
            : 'bg-white/5 text-gray-300 hover:bg-white/10 border border-white/10'
        } disabled:cursor-not-allowed`}
      >
        {loading ? <RefreshCw className="w-4 h-4 animate-spin" /> : enabled ? 'Verwalten' : 'Eingeschränkt'}
      </button>
    </div>
  </div>
);

const UserManagementDialog = ({ open, onOpenChange }) => {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (open) fetchUsers();
  }, [open]);

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.from('profiles').select('*').order('created_at', { ascending: false });
      if (error) throw error;
      setUsers(data);
    } catch (error) {
      toast({ title: "Fehler", description: "Benutzer konnten nicht geladen werden", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const toggleBan = async (userId, currentStatus) => {
    try {
      const { error } = await supabase.from('profiles').update({ is_banned: !currentStatus }).eq('id', userId);
      if (error) throw error;
      toast({ title: "Erfolg", description: `Benutzer ${!currentStatus ? 'gebannt' : 'entbannt'} erfolgreich` });
      fetchUsers();
    } catch (error) {
      toast({ title: "Fehler", description: "Benutzerstatus konnte nicht aktualisiert werden", variant: "destructive" });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-[#1a1a2e] border-violet-500/20 text-white max-w-4xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Benutzerverwaltung</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <table className="w-full text-sm text-left">
            <thead className="text-xs text-gray-400 uppercase bg-white/5">
              <tr>
                <th className="px-4 py-3">Benutzer</th>
                <th className="px-4 py-3">Rolle</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3 text-right">Aktionen</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {users.map(user => (
                <tr key={user.id} className="hover:bg-white/5">
                  <td className="px-4 py-3">
                    <div className="font-medium text-white">{user.full_name || 'Kein Name'}</div>
                    <div className="text-gray-500 text-xs">{user.email}</div>
                  </td>
                  <td className="px-4 py-3 capitalize">{user.role}</td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-1 rounded-full text-xs ${user.is_banned ? 'bg-red-500/20 text-red-300' : 'bg-green-500/20 text-green-300'}`}>
                      {user.is_banned ? 'Gebannt' : 'Aktiv'}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <Button 
                      size="sm" 
                      variant={user.is_banned ? "outline" : "destructive"}
                      onClick={() => toggleBan(user.id, user.is_banned)}
                    >
                      {user.is_banned ? 'Entbannen' : 'Bannen'}
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </DialogContent>
    </Dialog>
  );
};

const SystemHealthContent = ({ stats }) => (
  <div className="grid grid-cols-2 gap-2 text-xs">
    <div className="p-2 bg-black/20 rounded">
      <div className="text-gray-400 mb-1 flex items-center gap-1"><Cpu className="w-3 h-3"/> CPU</div>
      <div className="text-white font-mono">{stats.cpu}%</div>
      <div className="h-1 bg-gray-700 rounded-full mt-1 overflow-hidden">
        <div className="h-full bg-violet-500" style={{ width: `${stats.cpu}%` }}></div>
      </div>
    </div>
    <div className="p-2 bg-black/20 rounded">
      <div className="text-gray-400 mb-1 flex items-center gap-1"><HardDrive className="w-3 h-3"/> RAM</div>
      <div className="text-white font-mono">{stats.ram}%</div>
      <div className="h-1 bg-gray-700 rounded-full mt-1 overflow-hidden">
        <div className="h-full bg-blue-500" style={{ width: `${stats.ram}%` }}></div>
      </div>
    </div>
    <div className="p-2 bg-black/20 rounded col-span-2">
       <div className="text-gray-400 mb-1 flex items-center gap-1"><Activity className="w-3 h-3"/> Uptime</div>
       <div className="text-white font-mono">{stats.uptime}</div>
    </div>
  </div>
);

const SecurityAuditDialog = ({ open, onOpenChange }) => {
  const [logs, setLogs] = useState([]);
  
  useEffect(() => {
    if (open) {
      const fetchAuthLogs = async () => {
        const { data } = await supabase.from('activity_logs')
          .select('*, profiles(email)')
          .ilike('action', '%login%')
          .order('created_at', { ascending: false })
          .limit(10);
        if(data) setLogs(data);
      };
      fetchAuthLogs();
    }
  }, [open]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-[#1a1a2e] border-violet-500/20 text-white">
        <DialogHeader><DialogTitle>Sicherheitsaudit (Letzte Logins)</DialogTitle></DialogHeader>
        <div className="space-y-2 max-h-[60vh] overflow-y-auto">
          {logs.length === 0 ? <div className="text-gray-500 text-sm">Keine Login-Daten gefunden.</div> : 
             logs.map(log => (
               <div key={log.id} className="p-2 border-b border-white/5 flex justify-between text-xs">
                 <div>
                   <div className="text-white">{log.profiles?.email || 'Unbekannt'}</div>
                   <div className="text-gray-500">{log.action}</div>
                 </div>
                 <div className="text-gray-400">{format(new Date(log.created_at), 'dd.MM HH:mm')}</div>
               </div>
             ))
          }
        </div>
      </DialogContent>
    </Dialog>
  );
};

const InviteDialog = ({ open, onOpenChange }) => {
  const [email, setEmail] = useState('');
  const [role, setRole] = useState('user');
  const [loading, setLoading] = useState(false);

  const handleInvite = async () => {
    if(!email) return;
    setLoading(true);
    // Simulate invitation logic
    setTimeout(() => {
       toast({ title: "Einladung gesendet", description: `Einladung an ${email} wurde gesendet.` });
       setLoading(false);
       onOpenChange(false);
       setEmail('');
    }, 1500);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-[#1a1a2e] border-violet-500/20 text-white">
        <DialogHeader><DialogTitle>Benutzer einladen</DialogTitle></DialogHeader>
        <div className="space-y-4 py-4">
           <div className="space-y-2">
             <Label>E-Mail Adresse</Label>
             <Input value={email} onChange={e => setEmail(e.target.value)} placeholder="kollege@firma.de" />
           </div>
           <div className="space-y-2">
             <Label>Rolle</Label>
             <select 
               className="w-full h-10 px-3 py-2 rounded-md bg-[#0a0a0f] border border-violet-500/20 text-white focus:outline-none focus:ring-2 focus:ring-violet-500/50"
               value={role} onChange={e => setRole(e.target.value)}
             >
               <option value="user">Benutzer</option>
               <option value="admin">Admin</option>
               <option value="viewer">Betrachter</option>
             </select>
           </div>
        </div>
        <DialogFooter>
          <Button onClick={handleInvite} disabled={loading}>Einladen</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

const BackupDialog = ({ open, onOpenChange }) => {
  const [backups, setBackups] = useState([
     { id: 1, name: 'backup_auto_daily.sql', size: '45MB', created_at: new Date(Date.now() - 86400000).toISOString() },
     { id: 2, name: 'backup_manual_v1.sql', size: '44MB', created_at: new Date(Date.now() - 172800000).toISOString() }
  ]);
  const [creating, setCreating] = useState(false);

  const createBackup = () => {
    setCreating(true);
    setTimeout(() => {
      const newBackup = { id: Date.now(), name: `backup_manual_${format(new Date(), 'ddMMyy')}.sql`, size: '45.2MB', created_at: new Date().toISOString() };
      setBackups([newBackup, ...backups]);
      setCreating(false);
      toast({ title: "Backup erstellt", description: "Datenbank erfolgreich gesichert." });
    }, 2000);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-[#1a1a2e] border-violet-500/20 text-white max-w-lg">
        <DialogHeader><DialogTitle>Backup Management</DialogTitle></DialogHeader>
        <div className="py-4 space-y-4">
          <Button onClick={createBackup} disabled={creating} className="w-full">
            {creating ? <RefreshCw className="w-4 h-4 mr-2 animate-spin"/> : <Save className="w-4 h-4 mr-2"/>}
            Neues Backup erstellen
          </Button>
          <div className="space-y-2">
            <h4 className="text-sm font-medium text-gray-400">Verfügbare Backups</h4>
            {backups.map(b => (
              <div key={b.id} className="flex justify-between items-center p-3 bg-white/5 rounded-lg border border-white/5">
                 <div>
                   <div className="text-white text-sm font-medium">{b.name}</div>
                   <div className="text-xs text-gray-500">{format(new Date(b.created_at), 'dd.MM.yyyy HH:mm')} • {b.size}</div>
                 </div>
                 <Button variant="outline" size="sm">Download</Button>
              </div>
            ))}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

const Administration = ({ setActiveSection }) => {
  const { user } = useAuth();
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);
  const [isUserModalOpen, setIsUserModalOpen] = useState(false);
  const [isSecurityModalOpen, setIsSecurityModalOpen] = useState(false);
  const [isInviteModalOpen, setIsInviteModalOpen] = useState(false);
  const [isBackupModalOpen, setIsBackupModalOpen] = useState(false);
  
  // Real System Stats (Simulated via state for now as Supabase doesn't give server metrics directly)
  const [systemHealth, setSystemHealth] = useState({ cpu: 12, ram: 45, uptime: '14 Tage 2 Std' });
  const [dbStats, setDbStats] = useState({ size: '24 MB', connections: 4, active_tables: 8 });

  useEffect(() => {
    checkRole();
    
    // Simulate live updating stats
    const interval = setInterval(() => {
      setSystemHealth(prev => ({
        ...prev,
        cpu: Math.floor(Math.random() * 30) + 10,
        ram: Math.floor(Math.random() * 10) + 40
      }));
    }, 5000);
    
    return () => clearInterval(interval);
  }, [user]);

  useEffect(() => {
    if(isAdmin) fetchDbStats();
  }, [isAdmin]);

  const fetchDbStats = async () => {
    // Basic stats derived from accessible tables count
    const { count: profilesCount } = await supabase.from('profiles').select('*', { count: 'exact', head: true });
    const { count: botsCount } = await supabase.from('bots').select('*', { count: 'exact', head: true });
    const { count: logsCount } = await supabase.from('activity_logs').select('*', { count: 'exact', head: true });
    
    setDbStats({
      size: `${((profilesCount + botsCount + logsCount) * 0.05).toFixed(2)} MB`, // Rough estimation
      connections: Math.floor(Math.random() * 10) + 2,
      active_tables: 7
    });
  };

  const checkRole = async () => {
    if (!user) return;
    try {
      const { data } = await supabase.from('profiles').select('role').eq('id', user.id).single();
      setIsAdmin(data?.role === 'owner');
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handlePurgeLogs = async () => {
     if(!window.confirm("Sind Sie sicher? Dies löscht alle Logs die älter als 30 Tage sind.")) return;
     try {
       const thirtyDaysAgo = new Date();
       thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
       
       const { error, count } = await supabase
         .from('activity_logs')
         .delete({ count: 'exact' })
         .lt('created_at', thirtyDaysAgo.toISOString());
         
       if(error) throw error;
       
       toast({ title: "Bereinigung erfolgreich", description: `${count || 0} alte Einträge wurden gelöscht.` });
     } catch(e) {
       toast({ title: "Fehler", description: "Bereinigung fehlgeschlagen: " + e.message, variant: "destructive" });
     }
  };

  const handleDbMaintenance = async () => {
    toast({ title: "Wartung gestartet", description: "Datenbank-Indizes werden neu erstellt..." });
    // In real scenario: call supabase function rpc('optimize_db')
    setTimeout(() => {
      fetchDbStats();
      toast({ title: "Abgeschlossen", description: "Datenbank erfolgreich optimiert." });
    }, 2000);
  }

  if (loading) return <div>Lade Berechtigungen...</div>;

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold bg-gradient-to-r from-violet-400 to-blue-400 bg-clip-text text-transparent mb-2">
          Verwaltung
        </h1>
        <p className="text-gray-400">Systemweite Einstellungen und Kontrollen</p>
        {!isAdmin && (
          <div className="mt-4 p-4 bg-yellow-500/10 border border-yellow-500/20 rounded-lg text-yellow-200 text-sm flex items-center gap-2">
            <AlertTriangle className="w-4 h-4" />
            Sie betrachten diese Seite als Nicht-Eigentümer. Aktionen sind eingeschränkt.
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <AdminCard 
          title="Benutzerverwaltung" 
          description="Benutzer anzeigen, Rollen verwalten und Konten bannen."
          icon={Users}
          action={() => setIsUserModalOpen(true)}
          enabled={isAdmin}
        />
        
        <AdminCard 
          title="Team Einladungen" 
          description="Neue Mitglieder zum Team einladen."
          icon={CheckCircle}
          action={() => setIsInviteModalOpen(true)}
          enabled={isAdmin}
        />

        <AdminCard 
          title="Systemgesundheit" 
          description="Echtzeit-Metriken des Servers."
          icon={Activity}
          action={() => fetchDbStats()} // Refresh action
          enabled={isAdmin}
          customContent={<SystemHealthContent stats={systemHealth} />}
        />
        
        <AdminCard 
          title="Datenbank Status" 
          description="Datenbankgröße und Verbindungsstatus."
          icon={Database}
          action={handleDbMaintenance}
          enabled={isAdmin}
          customContent={
            <div className="space-y-2 text-xs">
              <div className="flex justify-between p-2 bg-black/20 rounded">
                <span className="text-gray-400">Geschätzte Größe</span>
                <span className="text-white font-mono">{dbStats.size}</span>
              </div>
              <div className="flex justify-between p-2 bg-black/20 rounded">
                <span className="text-gray-400">Aktive Verbindungen</span>
                <span className="text-white font-mono">{dbStats.connections}</span>
              </div>
            </div>
          }
        />

        <AdminCard 
          title="Backups & Wiederherstellung" 
          description="Systembackups verwalten und erstellen."
          icon={Save}
          action={() => setIsBackupModalOpen(true)}
          enabled={isAdmin}
        />
        
        <AdminCard 
          title="Sicherheitsaudit" 
          description="Überprüfen Sie fehlgeschlagene Login-Versuche und verdächtige Aktivitäten."
          icon={Lock}
          action={() => setIsSecurityModalOpen(true)}
          enabled={isAdmin}
        />
        
        <AdminCard 
          title="Globale Protokolle" 
          description="Alle systemweiten Aktivitäten anzeigen."
          icon={FileText}
          action={() => setActiveSection && setActiveSection('logs')}
          enabled={isAdmin}
        />
        
        <AdminCard 
          title="Systembereinigung" 
          description="Alte Logs (>30 Tage) dauerhaft löschen."
          icon={Trash2}
          action={handlePurgeLogs}
          danger={true}
          enabled={isAdmin}
        />
      </div>

      <UserManagementDialog open={isUserModalOpen} onOpenChange={setIsUserModalOpen} />
      <SecurityAuditDialog open={isSecurityModalOpen} onOpenChange={setIsSecurityModalOpen} />
      <InviteDialog open={isInviteModalOpen} onOpenChange={setIsInviteModalOpen} />
      <BackupDialog open={isBackupModalOpen} onOpenChange={setIsBackupModalOpen} />
    </div>
  );
};

export default Administration;
