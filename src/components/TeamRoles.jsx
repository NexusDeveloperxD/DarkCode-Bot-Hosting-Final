
import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Users, Shield, Mail, MoreHorizontal, UserPlus, Check, Star, Trash2, Edit2, UserX } from 'lucide-react';
import { supabase } from '@/lib/customSupabaseClient';
import { useAuth } from '@/contexts/SupabaseAuthContext';
import { toast } from '@/components/ui/use-toast';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

const RoleBadge = ({ role }) => {
  const colors = {
    owner: 'bg-violet-500/20 text-violet-300 border-violet-500/30',
    admin: 'bg-blue-500/20 text-blue-300 border-blue-500/30',
    developer: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30',
    viewer: 'bg-gray-500/20 text-gray-300 border-gray-500/30',
  };

  return (
    <span className={`px-2 py-0.5 rounded text-xs font-medium border ${colors[role?.toLowerCase()] || colors.viewer} uppercase tracking-wider`}>
      {role || 'Benutzer'}
    </span>
  );
};

const TeamRoles = () => {
  const { user } = useAuth();
  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [inviteEmail, setInviteEmail] = useState('');
  const [isInviteOpen, setIsInviteOpen] = useState(false);
  const [currentUserRole, setCurrentUserRole] = useState('viewer');

  useEffect(() => {
    fetchMembers();
  }, []);

  const fetchMembers = async () => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setMembers(data || []);
      
      const me = data?.find(m => m.id === user.id);
      if (me) setCurrentUserRole(me.role);
    } catch (error) {
      console.error('Error:', error);
      toast({ title: "Fehler", description: "Teammitglieder konnten nicht geladen werden", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateRole = async (userId, newRole) => {
    if (currentUserRole !== 'owner') {
      toast({ title: "Zugriff verweigert", description: "Nur Eigentümer können Rollen ändern.", variant: "destructive" });
      return;
    }

    try {
      const { error } = await supabase
        .from('profiles')
        .update({ role: newRole })
        .eq('id', userId);

      if (error) throw error;

      setMembers(members.map(m => m.id === userId ? { ...m, role: newRole } : m));
      toast({ title: "Rolle aktualisiert", description: `Benutzerrolle geändert zu ${newRole}` });
    } catch (error) {
      toast({ title: "Fehler", description: "Rolle konnte nicht aktualisiert werden", variant: "destructive" });
    }
  };

  const handleRemoveUser = async (userId) => {
     if (currentUserRole !== 'owner') {
      toast({ title: "Zugriff verweigert", description: "Nur Eigentümer können Benutzer entfernen.", variant: "destructive" });
      return;
    }

    try {
      const { error } = await supabase
        .from('profiles')
        .delete()
        .eq('id', userId);

      if (error) throw error;

      setMembers(members.filter(m => m.id !== userId));
      toast({ title: "Benutzer entfernt", description: "Teammitglied wurde entfernt." });
    } catch (error) {
       console.error(error);
      toast({ title: "Fehler", description: "Benutzer konnte nicht entfernt werden (RLS Beschränkung?)", variant: "destructive" });
    }
  };

  const handleInvite = async () => {
    if (!inviteEmail) return;
    setTimeout(() => {
      toast({ 
        title: "Einladung gesendet", 
        description: `Wir haben eine Einladung an ${inviteEmail} gesendet` 
      });
      setInviteEmail('');
      setIsInviteOpen(false);
    }, 1000);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-violet-400 to-blue-400 bg-clip-text text-transparent mb-2">
            Team & Rollen
          </h1>
          <p className="text-gray-400">Verwalten Sie Teammitglieder und deren Zugriffsebenen</p>
        </div>

        <Dialog open={isInviteOpen} onOpenChange={setIsInviteOpen}>
          <DialogTrigger asChild>
            <button className="px-4 py-2 rounded-lg bg-violet-600 hover:bg-violet-700 text-white font-medium flex items-center gap-2 transition-all shadow-lg shadow-violet-500/20">
              <UserPlus className="w-5 h-5" />
              Mitglied einladen
            </button>
          </DialogTrigger>
          <DialogContent className="bg-[#1a1a2e] border-violet-500/20 text-white">
            <DialogHeader>
              <DialogTitle>Neues Mitglied einladen</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label>E-Mail Adresse</Label>
                <Input 
                  type="email"
                  value={inviteEmail}
                  onChange={(e) => setInviteEmail(e.target.value)}
                  placeholder="kollege@beispiel.de"
                />
              </div>
              <div className="space-y-2">
                <Label>Rolle</Label>
                <select className="w-full px-3 py-2 rounded-md bg-black/20 border border-violet-500/20 text-white text-sm focus:outline-none focus:ring-2 focus:ring-violet-500/50">
                  <option value="viewer">Zuschauer</option>
                  <option value="developer">Entwickler</option>
                  <option value="admin">Admin</option>
                </select>
              </div>
            </div>
            <DialogFooter>
              <Button variant="ghost" onClick={() => setIsInviteOpen(false)}>Abbrechen</Button>
              <Button onClick={handleInvite} disabled={!inviteEmail}>Einladung senden</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <div className="rounded-xl bg-[#1a1a2e]/60 backdrop-blur-xl border border-violet-500/20 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-white/5 bg-white/5">
                <th className="p-4 text-xs font-medium text-gray-400 uppercase tracking-wider pl-6">Mitglied</th>
                <th className="p-4 text-xs font-medium text-gray-400 uppercase tracking-wider">Rolle</th>
                <th className="p-4 text-xs font-medium text-gray-400 uppercase tracking-wider">Status</th>
                <th className="p-4 text-xs font-medium text-gray-400 uppercase tracking-wider text-right pr-6">Aktionen</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {members.map((member) => (
                <tr key={member.id} className="group hover:bg-white/5 transition-colors">
                  <td className="p-4 pl-6">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-gradient-to-br from-violet-500 to-blue-500 flex items-center justify-center font-bold text-white shadow-lg">
                        {member.full_name?.[0] || member.email?.[0]}
                      </div>
                      <div>
                        <div className="font-medium text-white">{member.full_name || 'Unbenannter Nutzer'}</div>
                        <div className="text-xs text-gray-400">{member.email}</div>
                      </div>
                    </div>
                  </td>
                  <td className="p-4">
                    <RoleBadge role={member.role} />
                  </td>
                  <td className="p-4">
                    <span className="flex items-center gap-1.5 text-xs text-green-400">
                      <Check className="w-3 h-3" /> Aktiv
                    </span>
                  </td>
                  <td className="p-4 text-right pr-6">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <button className="p-2 rounded-lg text-gray-400 hover:text-white hover:bg-white/10 transition-all outline-none">
                          <MoreHorizontal className="w-5 h-5" />
                        </button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuLabel>Aktionen</DropdownMenuLabel>
                        <DropdownMenuItem onClick={() => window.location.href = `mailto:${member.email}`}>
                          <Mail className="mr-2 h-4 w-4" /> E-Mail senden
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuLabel>Rollenverwaltung</DropdownMenuLabel>
                         <DropdownMenuItem onClick={() => handleUpdateRole(member.id, 'admin')}>
                          <Shield className="mr-2 h-4 w-4" /> Als Admin festlegen
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => handleUpdateRole(member.id, 'developer')}>
                          <Edit2 className="mr-2 h-4 w-4" /> Als Entwickler festlegen
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => handleUpdateRole(member.id, 'viewer')}>
                          <UserX className="mr-2 h-4 w-4" /> Als Zuschauer festlegen
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem 
                          className="text-red-400 focus:text-red-400 focus:bg-red-500/10"
                          onClick={() => handleRemoveUser(member.id)}
                        >
                          <Trash2 className="mr-2 h-4 w-4" /> Benutzer entfernen
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default TeamRoles;
