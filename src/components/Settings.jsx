
import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { 
  User, Lock, Bell, Key, Shield, Trash2, Save, 
  Moon, Sun, Globe, Smartphone, Mail, Plus, Copy, Check, AlertTriangle, Loader2, CreditCard, HardDrive, Cpu, History, Laptop
} from 'lucide-react';
import { useAuth } from '@/contexts/SupabaseAuthContext';
import { supabase } from '@/lib/customSupabaseClient';
import { toast } from '@/components/ui/use-toast';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const ProgressBar = ({ value, max, color = "bg-violet-500" }) => {
  const percentage = Math.min((value / max) * 100, 100);
  return (
    <div className="h-2 bg-gray-800 rounded-full overflow-hidden w-full">
      <div 
        className={`h-full ${color} transition-all duration-500`} 
        style={{ width: `${percentage}%` }}
      />
    </div>
  );
};

const Settings = ({ initialTab = 'profile' }) => {
  const { user, signOut } = useAuth();
  const [activeTab, setActiveTab] = useState(initialTab);
  const [loading, setLoading] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  
  // Profile State
  const [profile, setProfile] = useState({ full_name: '', email: '' });
  
  // Password State
  const [passwords, setPasswords] = useState({ new: '', confirm: '' });
  
  // API Keys
  const [apiKeys, setApiKeys] = useState([]);
  const [newKeyName, setNewKeyName] = useState('');
  const [generatedKey, setGeneratedKey] = useState(null);
  const [isKeyDialogOpen, setIsKeyDialogOpen] = useState(false);

  // 2FA
  const [is2FADialogOpen, setIs2FADialogOpen] = useState(false);
  const [mfaData, setMfaData] = useState(null); 
  const [mfaVerifyCode, setMfaVerifyCode] = useState('');
  const [mfaEnabled, setMfaEnabled] = useState(false);

  // Limits
  const [limits, setLimits] = useState({
    max_bots: 5,
    max_storage_mb: 512,
    api_calls_monthly: 10000,
    current_api_calls: 0,
    current_storage_mb: 0
  });

  // Login History
  const [loginHistory, setLoginHistory] = useState([]);

  // Preferences
  const [preferences, setPreferences] = useState({
    theme: 'dark',
    email_notifications: true,
    bot_status_alerts: true,
    security_alerts: true,
    language: 'de'
  });

  const [deleteConfirmation, setDeleteConfirmation] = useState('');
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);

  useEffect(() => {
    setActiveTab(initialTab);
  }, [initialTab]);

  useEffect(() => {
    if (user) {
      fetchProfile();
      fetchApiKeys();
      checkMfaStatus();
      checkRole();
      fetchLimits();
      fetchLoginHistory();
    }
  }, [user]);

  const checkRole = async () => {
    const { data } = await supabase.from('profiles').select('role').eq('id', user.id).single();
    setIsAdmin(data?.role === 'owner');
  };

  const fetchLimits = async () => {
    try {
      // Use maybeSingle() instead of single() to avoid PGRST116 error if row doesn't exist
      const { data, error } = await supabase.from('user_limits').select('*').eq('user_id', user.id).maybeSingle();
      
      if (data) {
        setLimits(data);
      } else {
        // If no limits exist, we can either create them or just use defaults in state
        // For now, we'll stick with the defaults initialized in useState
        console.log("No user limits found, using defaults.");
      }
    } catch (err) {
      console.error("Error fetching limits:", err);
    }
  };

  const fetchLoginHistory = async () => {
    // Simulate login history since auth.audit_log_entries is not directly queryable by default users usually
    // In production, you would query a custom 'auth_logs' table triggered on login
    setLoginHistory([
      { id: 1, device: 'Chrome / Windows', ip: '192.168.1.1', date: new Date().toISOString() },
      { id: 2, device: 'Safari / iPhone', ip: '10.0.0.1', date: new Date(Date.now() - 86400000).toISOString() },
    ]);
  };

  // --- Profile Logic ---
  const fetchProfile = async () => {
    try {
      const { data } = await supabase.from('profiles').select('*').eq('id', user.id).single();
      if (data) {
        setProfile({ full_name: data.full_name || '', email: user.email });
        if (data.preferences) {
          setPreferences(data.preferences);
          applyTheme(data.preferences.theme);
        }
      }
    } catch (error) { console.error('Error fetching profile:', error); }
  };

  const handleUpdateProfile = async () => {
    if (profile.full_name.trim() === '') return;
    setLoading(true);
    try {
      const { error } = await supabase.from('profiles').update({ full_name: profile.full_name }).eq('id', user.id);
      if (error) throw error;
      toast({ title: "Erfolg", description: "Profil aktualisiert." });
    } catch (error) { toast({ title: "Fehler", description: error.message, variant: "destructive" }); } finally { setLoading(false); }
  };

  // --- Password Logic ---
  const handlePasswordChange = async () => {
    if (passwords.new.length < 6 || passwords.new !== passwords.confirm) return;
    setLoading(true);
    try {
      const { error } = await supabase.auth.updateUser({ password: passwords.new });
      if (error) throw error;
      toast({ title: "Erfolg", description: "Passwort aktualisiert." });
      setPasswords({ new: '', confirm: '' });
    } catch (error) { toast({ title: "Fehler", description: error.message, variant: "destructive" }); } finally { setLoading(false); }
  };

  // --- MFA Logic ---
  const checkMfaStatus = async () => {
    try {
      const { data: factors } = await supabase.auth.mfa.listFactors();
      if (factors && factors.totp.length > 0) setMfaEnabled(true);
    } catch (e) { console.error(e); }
  };

  const startMfaSetup = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.auth.mfa.enroll({ factorType: 'totp' });
      if (error) throw error;
      setMfaData(data);
      setIs2FADialogOpen(true);
    } catch (error) { toast({ title: "Fehler", description: "MFA Start fehlgeschlagen: " + error.message, variant: "destructive" }); } finally { setLoading(false); }
  };

  const verifyMfa = async () => {
    if (!mfaVerifyCode) return;
    setLoading(true);
    try {
      const { error } = await supabase.auth.mfa.challengeAndVerify({ factorId: mfaData.id, code: mfaVerifyCode });
      if (error) throw error;
      setIs2FADialogOpen(false);
      setMfaEnabled(true);
      setMfaData(null);
      setMfaVerifyCode('');
      toast({ title: "Erfolg", description: "2FA aktiviert" });
    } catch (error) { toast({ title: "Fehler", description: error.message, variant: "destructive" }); } finally { setLoading(false); }
  };

  const disableMfa = async () => {
    setLoading(true);
    try {
      const { data: factors } = await supabase.auth.mfa.listFactors();
      const totpFactor = factors.totp[0];
      if (totpFactor) {
        const { error } = await supabase.auth.mfa.unenroll({ factorId: totpFactor.id });
        if (error) throw error;
        setMfaEnabled(false);
        toast({ title: "Deaktiviert", description: "2FA deaktiviert" });
      }
    } catch (error) { toast({ title: "Fehler", description: error.message, variant: "destructive" }); } finally { setLoading(false); }
  };

  // --- API Keys Logic ---
  const fetchApiKeys = async () => {
    try {
      const { data } = await supabase.from('api_keys').select('*').order('created_at', { ascending: false });
      setApiKeys(data || []);
    } catch (error) { console.error('Error fetching API keys:', error); }
  };

  const generateApiKey = async () => {
    if (!newKeyName.trim()) return;
    setLoading(true);
    try {
      const rawKey = `sk_live_${Math.random().toString(36).substr(2, 9)}${Math.random().toString(36).substr(2, 9)}`;
      const { error } = await supabase.from('api_keys').insert({ user_id: user.id, name: newKeyName, key_prefix: rawKey.substring(0, 8) + '...' });
      if (error) throw error;
      setGeneratedKey(rawKey); setNewKeyName(''); fetchApiKeys();
      toast({ title: "API-Schlüssel generiert", description: "Bitte kopieren Sie den Schlüssel sofort." });
    } catch (error) { toast({ title: "Fehler", description: "Generierung fehlgeschlagen", variant: "destructive" }); } finally { setLoading(false); }
  };
  
  const deleteApiKey = async (id) => {
    try { await supabase.from('api_keys').delete().eq('id', id); setApiKeys(apiKeys.filter(k => k.id !== id)); toast({ title: "Gelöscht", description: "Schlüssel entfernt" }); } catch (e) { console.error(e); }
  };

  // --- Preferences Logic ---
  const applyTheme = (theme) => {
    const root = document.documentElement;
    root.classList.remove('light', 'dark');
    
    if (theme === 'system') {
      const systemTheme = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
      root.classList.add(systemTheme);
    } else {
      root.classList.add(theme);
    }
  };

  const savePreferences = async (newPrefs) => {
     try { 
       await supabase.from('profiles').update({ preferences: newPrefs }).eq('id', user.id); 
       setPreferences(newPrefs); 
       applyTheme(newPrefs.theme);
       toast({ title: "Gespeichert", description: "Einstellungen aktualisiert." }); 
     } catch (e) { console.error(e); }
  };
  
  const handleDeleteAccount = async () => {
     if (deleteConfirmation !== 'DELETE') return; setLoading(true); 
     try { 
       await supabase.rpc('delete_own_account'); 
       await signOut(); 
       window.location.href = '/login'; 
     } catch (e) { toast({ title: "Fehler", variant: "destructive" }); setLoading(false); }
  };

  const tabs = [
    { id: 'profile', label: 'Profil', icon: User },
    { id: 'security', label: 'Sicherheit', icon: Lock },
    { id: 'api', label: 'API-Schlüssel', icon: Key },
    { id: 'preferences', label: 'Einstellungen', icon: Bell },
    { id: 'resources', label: 'Limits & Quotas', icon: HardDrive },
  ];
  
  if (isAdmin) {
    tabs.push({ id: 'billing', label: 'Abrechnung', icon: CreditCard });
  }

  return (
    <div className="max-w-6xl mx-auto space-y-8 pb-12">
      <div>
        <h1 className="text-3xl font-bold bg-gradient-to-r from-violet-400 to-blue-400 bg-clip-text text-transparent mb-2">
          Einstellungen
        </h1>
        <p className="text-gray-400">Verwalten Sie Ihr Konto, Sicherheit und Präferenzen</p>
      </div>

      <div className="flex flex-col md:flex-row gap-8">
        <div className="w-full md:w-64 space-y-2">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-all ${
                activeTab === tab.id
                  ? 'bg-violet-600/20 text-violet-400 border border-violet-500/30 shadow-lg shadow-violet-500/10'
                  : 'text-gray-400 hover:text-white hover:bg-white/5'
              }`}
            >
              <tab.icon className="w-4 h-4" />
              {tab.label}
            </button>
          ))}
          
          <div className="pt-4 mt-4 border-t border-white/10">
            <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
              <DialogTrigger asChild>
                <button className="w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium text-red-400 hover:bg-red-500/10 transition-all border border-transparent hover:border-red-500/20">
                  <Trash2 className="w-4 h-4" /> Konto löschen
                </button>
              </DialogTrigger>
              <DialogContent className="bg-[#1a1a2e] border-red-500/20 text-white">
                <DialogHeader>
                  <DialogTitle className="text-red-400 flex items-center gap-2"><AlertTriangle className="w-5 h-5" /> Gefahrenzone</DialogTitle>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <div className="p-4 rounded-lg bg-red-500/10 border border-red-500/20 text-sm text-red-200">
                    Warnung: Diese Aktion ist unumkehrbar. Alle Daten werden gelöscht.
                  </div>
                  <Input value={deleteConfirmation} onChange={(e) => setDeleteConfirmation(e.target.value)} placeholder="Tippen Sie DELETE zur Bestätigung" />
                </div>
                <DialogFooter>
                  <Button variant="ghost" onClick={() => setIsDeleteDialogOpen(false)}>Abbrechen</Button>
                  <Button variant="destructive" onClick={handleDeleteAccount} disabled={deleteConfirmation !== 'DELETE' || loading}>Dauerhaft löschen</Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        <div className="flex-1 space-y-6">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.2 }}
            className="p-6 rounded-xl bg-[#1a1a2e]/60 backdrop-blur-xl border border-violet-500/20 min-h-[500px]"
          >
            {activeTab === 'profile' && (
              <div className="space-y-6">
                <h2 className="text-xl font-bold mb-4">Profil</h2>
                <div className="flex items-center gap-6 pb-6 border-b border-white/5">
                  <div className="w-20 h-20 rounded-full bg-gradient-to-br from-violet-500 to-blue-500 flex items-center justify-center text-3xl font-bold text-white shadow-xl">
                    {profile.full_name?.[0]?.toUpperCase() || user?.email?.[0]?.toUpperCase()}
                  </div>
                  <div>
                    <h3 className="text-lg font-medium text-white">{profile.full_name || 'Benutzer'}</h3>
                    <p className="text-sm text-gray-400">{profile.email}</p>
                    <div className="mt-2 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-violet-100 text-violet-800 dark:bg-violet-900/50 dark:text-violet-200 uppercase">
                      {isAdmin ? 'Owner' : 'User'}
                    </div>
                  </div>
                </div>
                <div className="grid gap-6 max-w-lg">
                  <div className="space-y-2">
                    <Label htmlFor="fullName">Name</Label>
                    <Input id="fullName" value={profile.full_name} onChange={(e) => setProfile({ ...profile, full_name: e.target.value })} />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="email">E-Mail</Label>
                    <Input id="email" type="email" value={profile.email} disabled className="opacity-60 cursor-not-allowed" />
                  </div>
                </div>
                <div className="pt-4">
                  <Button onClick={handleUpdateProfile} disabled={loading} className="bg-violet-600 hover:bg-violet-700 text-white">Speichern</Button>
                </div>
              </div>
            )}

            {activeTab === 'security' && (
              <div className="space-y-8">
                <div>
                  <h2 className="text-xl font-bold mb-4">Passwort ändern</h2>
                  <div className="space-y-4 max-w-md">
                    <Input type="password" placeholder="Neues Passwort" value={passwords.new} onChange={(e) => setPasswords({ ...passwords, new: e.target.value })} />
                    <Input type="password" placeholder="Passwort bestätigen" value={passwords.confirm} onChange={(e) => setPasswords({ ...passwords, confirm: e.target.value })} />
                    <Button onClick={handlePasswordChange} disabled={loading || !passwords.new} className="bg-violet-600 hover:bg-violet-700 text-white">Aktualisieren</Button>
                  </div>
                </div>
                
                <div className="pt-6 border-t border-white/5">
                  <h2 className="text-xl font-bold mb-4">Zwei-Faktor-Authentifizierung (2FA)</h2>
                  <div className="flex items-center justify-between p-4 rounded-lg bg-[#0a0a0f] border border-violet-500/20">
                    <div className="flex items-center gap-4">
                      <div className="p-2 rounded-lg bg-violet-500/10 text-violet-400"><Smartphone className="w-6 h-6" /></div>
                      <div>
                        <div className="font-medium text-white">Authenticator App</div>
                        <div className="text-sm text-gray-400">{mfaEnabled ? 'Aktiviert' : 'Schützen Sie Ihr Konto'}</div>
                      </div>
                    </div>
                    {mfaEnabled ? (
                      <Button onClick={disableMfa} variant="destructive">Deaktivieren</Button>
                    ) : (
                      <Button onClick={startMfaSetup} variant="outline" className="border-violet-500/30 text-violet-400">Aktivieren</Button>
                    )}
                  </div>
                  
                  {/* MFA Dialog */}
                  <Dialog open={is2FADialogOpen} onOpenChange={setIs2FADialogOpen}>
                    <DialogContent className="bg-[#1a1a2e] border-violet-500/20 text-white">
                      <DialogHeader><DialogTitle>2FA Setup</DialogTitle></DialogHeader>
                      <div className="space-y-4 py-4 flex flex-col items-center">
                         {mfaData?.totp?.qr_code && (
                           <div className="p-4 bg-white rounded-lg">
                             <img src={mfaData.totp.qr_code} alt="2FA QR Code" className="w-48 h-48" />
                           </div>
                         )}
                         <div className="text-center text-sm text-gray-400">Code scannen & eingeben</div>
                         <Input placeholder="123456" value={mfaVerifyCode} onChange={(e) => setMfaVerifyCode(e.target.value)} className="text-center text-lg tracking-widest" />
                      </div>
                      <DialogFooter>
                        <Button onClick={verifyMfa} disabled={!mfaVerifyCode}>Verifizieren</Button>
                      </DialogFooter>
                    </DialogContent>
                  </Dialog>
                </div>

                <div className="pt-6 border-t border-white/5">
                  <h2 className="text-xl font-bold mb-4">Login Historie</h2>
                  <div className="space-y-2">
                    {loginHistory.map(entry => (
                      <div key={entry.id} className="flex justify-between items-center p-3 bg-white/5 rounded-lg text-sm">
                        <div className="flex items-center gap-3">
                          <Laptop className="w-4 h-4 text-gray-400" />
                          <div>
                            <div className="text-white">{entry.device}</div>
                            <div className="text-xs text-gray-500">{entry.ip}</div>
                          </div>
                        </div>
                        <div className="text-gray-400">{new Date(entry.date).toLocaleString()}</div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'api' && (
              <div className="space-y-6">
                <div className="flex items-center justify-between">
                  <h2 className="text-xl font-bold">API Schlüssel</h2>
                  <Dialog open={isKeyDialogOpen} onOpenChange={(open) => { setIsKeyDialogOpen(open); if(!open) setGeneratedKey(null); }}>
                    <DialogTrigger asChild><Button className="bg-violet-600"><Plus className="w-4 h-4 mr-2" /> Neu generieren</Button></DialogTrigger>
                    <DialogContent className="bg-[#1a1a2e] border-violet-500/20 text-white">
                      <DialogHeader><DialogTitle>Neuer API Key</DialogTitle></DialogHeader>
                      <div className="py-4 space-y-4">
                        {!generatedKey ? (
                          <Input placeholder="Name (z.B. Production)" value={newKeyName} onChange={(e) => setNewKeyName(e.target.value)} />
                        ) : (
                          <div className="p-4 bg-green-900/20 border border-green-500/30 rounded-lg">
                            <code className="block break-all font-mono text-green-300 mb-2">{generatedKey}</code>
                            <Button size="sm" variant="ghost" onClick={() => navigator.clipboard.writeText(generatedKey)}><Copy className="w-4 h-4 mr-2"/> Kopieren</Button>
                          </div>
                        )}
                      </div>
                      <DialogFooter>
                        {!generatedKey ? <Button onClick={generateApiKey} disabled={!newKeyName}>Erstellen</Button> : <Button onClick={() => setIsKeyDialogOpen(false)}>Fertig</Button>}
                      </DialogFooter>
                    </DialogContent>
                  </Dialog>
                </div>
                <div className="space-y-3">
                  {apiKeys.map(key => (
                    <div key={key.id} className="flex justify-between items-center p-4 bg-[#0a0a0f] border border-violet-500/20 rounded-lg">
                      <div><div className="font-medium">{key.name}</div><div className="text-xs text-gray-500">{key.key_prefix}</div></div>
                      <Button variant="ghost" size="icon" onClick={() => deleteApiKey(key.id)}><Trash2 className="w-4 h-4"/></Button>
                    </div>
                  ))}
                  {apiKeys.length === 0 && <div className="text-gray-500 text-center py-4">Keine Keys gefunden.</div>}
                </div>
              </div>
            )}

            {activeTab === 'preferences' && (
              <div className="space-y-8">
                <div>
                   <h2 className="text-xl font-bold mb-4">Design & Sprache</h2>
                   <div className="flex gap-4 mb-6">
                     {['dark', 'light', 'system'].map(t => (
                       <button key={t} onClick={() => { const p = {...preferences, theme: t}; savePreferences(p); }} className={`px-4 py-2 border rounded capitalize ${preferences.theme === t ? 'border-violet-500 bg-violet-500/20' : 'border-gray-700'}`}>
                         {t === 'dark' ? <Moon className="w-4 h-4 inline mr-2"/> : t === 'light' ? <Sun className="w-4 h-4 inline mr-2"/> : <Globe className="w-4 h-4 inline mr-2"/>}
                         {t === 'system' ? 'System' : t === 'dark' ? 'Dunkel' : 'Hell'}
                       </button>
                     ))}
                   </div>
                   
                   <div className="max-w-xs">
                     <Label>Sprache</Label>
                     <select 
                       className="w-full mt-2 h-10 px-3 rounded-md bg-black/20 border border-violet-500/20 text-white"
                       value={preferences.language}
                       onChange={(e) => { const p = {...preferences, language: e.target.value}; savePreferences(p); }}
                     >
                       <option value="de">Deutsch</option>
                       <option value="en">English</option>
                     </select>
                   </div>
                </div>
                
                <div className="pt-6 border-t border-white/5 space-y-4">
                   <h2 className="text-xl font-bold mb-4">Benachrichtigungen</h2>
                   {[
                     { key: 'email_notifications', label: 'E-Mail Benachrichtigungen' }, 
                     { key: 'bot_status_alerts', label: 'Bot Status Alerts' }, 
                     { key: 'security_alerts', label: 'Sicherheitswarnungen' }
                   ].map(item => (
                     <div key={item.key} className="flex justify-between items-center p-4 bg-[#0a0a0f] rounded-lg border border-white/5">
                       <span>{item.label}</span>
                       <button onClick={() => { const p = {...preferences, [item.key]: !preferences[item.key]}; savePreferences(p); }} className={`w-10 h-6 rounded-full relative transition-colors ${preferences[item.key] ? 'bg-violet-600' : 'bg-gray-700'}`}>
                         <span className={`absolute top-1 left-1 w-4 h-4 bg-white rounded-full transition-transform ${preferences[item.key] ? 'translate-x-4' : ''}`} />
                       </button>
                     </div>
                   ))}
                </div>
              </div>
            )}

            {activeTab === 'resources' && (
              <div className="space-y-6">
                 <h2 className="text-xl font-bold mb-4">Nutzung & Limits</h2>
                 <div className="space-y-6">
                    <div className="p-4 bg-[#0a0a0f] rounded-lg border border-white/5 space-y-2">
                       <div className="flex justify-between items-center mb-1">
                          <span className="flex items-center gap-2 text-gray-300"><Cpu className="w-4 h-4"/> API Calls</span>
                          <span className="text-violet-400 font-mono">{limits.current_api_calls} / {limits.api_calls_monthly}</span>
                       </div>
                       <ProgressBar value={limits.current_api_calls} max={limits.api_calls_monthly} color="bg-violet-500" />
                    </div>
                    
                    <div className="p-4 bg-[#0a0a0f] rounded-lg border border-white/5 space-y-2">
                       <div className="flex justify-between items-center mb-1">
                          <span className="flex items-center gap-2 text-gray-300"><HardDrive className="w-4 h-4"/> Speicher (MB)</span>
                          <span className="text-blue-400 font-mono">{limits.current_storage_mb} / {limits.max_storage_mb}</span>
                       </div>
                       <ProgressBar value={limits.current_storage_mb} max={limits.max_storage_mb} color="bg-blue-500" />
                    </div>
                 </div>
              </div>
            )}
            
            {activeTab === 'billing' && isAdmin && (
              <div className="space-y-6">
                 <h2 className="text-xl font-bold mb-4">Abrechnung</h2>
                 <div className="p-6 bg-gradient-to-r from-violet-600/20 to-blue-600/20 border border-violet-500/30 rounded-xl flex justify-between items-center">
                    <div>
                       <h3 className="text-lg font-bold text-white">Pro Plan</h3>
                       <p className="text-gray-400">Nächste Rechnung: 01.02.2024</p>
                    </div>
                    <div className="text-right">
                       <div className="text-2xl font-bold text-white">€19.99<span className="text-sm text-gray-400 font-normal">/Mon</span></div>
                    </div>
                 </div>
                 
                 <div className="space-y-4">
                    <h3 className="font-semibold text-gray-300">Rechnungshistorie</h3>
                    <div className="space-y-2">
                       {/* Mock invoices */}
                       {[1,2,3].map(i => (
                         <div key={i} className="flex justify-between items-center p-3 bg-white/5 rounded-lg border border-white/5">
                           <div className="text-sm">Rechnung #{2024000+i} - {new Date().toLocaleDateString()}</div>
                           <div className="flex items-center gap-4">
                             <span className="text-white font-medium">€19.99</span>
                             <span className="text-xs px-2 py-1 bg-green-500/20 text-green-400 rounded">Bezahlt</span>
                           </div>
                         </div>
                       ))}
                    </div>
                 </div>
              </div>
            )}
          </motion.div>
        </div>
      </div>
    </div>
  );
};

export default Settings;
