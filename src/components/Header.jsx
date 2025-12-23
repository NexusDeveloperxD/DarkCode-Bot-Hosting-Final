
import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Bot, Home, Settings, Users, Activity, FileText, ChevronDown, LogOut, User, Bell, Menu, X } from 'lucide-react';
import { useAuth } from '@/contexts/SupabaseAuthContext';
import { supabase } from '@/lib/customSupabaseClient';
import { toast } from '@/components/ui/use-toast';

const NotificationItem = ({ notification, onRead }) => (
  <div className={`p-3 border-b border-white/5 hover:bg-white/5 transition-colors ${notification.is_read ? 'opacity-60' : 'bg-violet-500/5'}`}>
    <div className="flex justify-between items-start gap-2">
      <div className="flex-1">
        <h4 className="text-sm font-medium text-white">{notification.title}</h4>
        <p className="text-xs text-gray-400 mt-1">{notification.message}</p>
        <span className="text-[10px] text-gray-500 mt-2 block">{new Date(notification.created_at).toLocaleString('de-DE')}</span>
      </div>
      {!notification.is_read && (
        <button 
          onClick={() => onRead(notification.id)}
          className="p-1 hover:bg-white/10 rounded-full text-violet-400"
          title="Als gelesen markieren"
        >
          <div className="w-2 h-2 bg-violet-500 rounded-full" />
        </button>
      )}
    </div>
  </div>
);

const Header = ({ activeSection, setActiveSection, setSettingsTab, isMobileMenuOpen, setIsMobileMenuOpen }) => {
  const { user, signOut } = useAuth();
  const [profile, setProfile] = useState(null);
  const [showUserDropdown, setShowUserDropdown] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    if (user) {
      getProfile();
      fetchNotifications();
      
      const channel = supabase.channel('header_notifications_realtime');
      
      channel
        .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'notifications', filter: `user_id=eq.${user.id}` }, 
          (payload) => {
            setNotifications(prev => [payload.new, ...prev]);
            setUnreadCount(prev => prev + 1);
            toast({
              title: payload.new.title,
              description: payload.new.message,
            });
          }
        )
        .subscribe((status) => {
          if (status === 'CHANNEL_ERROR') {
            console.error('Realtime notification subscription error, retrying...');
            setTimeout(() => channel.subscribe(), 5000);
          }
        });
      
      return () => supabase.removeChannel(channel);
    }
  }, [user]);

  const getProfile = async () => {
    try {
      const { data } = await supabase.from('profiles').select('*').eq('id', user.id).single();
      if (data) setProfile(data);
    } catch (error) {
      console.error('Fehler beim Abrufen des Profils:', error);
    }
  };

  const fetchNotifications = async () => {
    try {
      const { data } = await supabase
        .from('notifications')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(20);
      
      if (data) {
        setNotifications(data);
        setUnreadCount(data.filter(n => !n.is_read).length);
      }
    } catch (error) {
      console.error('Fehler beim Abrufen der Benachrichtigungen:', error);
    }
  };

  const markRead = async (id) => {
    try {
      await supabase.from('notifications').update({ is_read: true }).eq('id', id);
      setNotifications(prev => prev.map(n => n.id === id ? { ...n, is_read: true } : n));
      setUnreadCount(prev => Math.max(0, prev - 1));
    } catch (error) {
      console.error('Fehler beim Markieren als gelesen:', error);
    }
  };

  const markAllRead = async () => {
    try {
      await supabase.from('notifications').update({ is_read: true }).eq('user_id', user.id);
      setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
      setUnreadCount(0);
    } catch (error) {
      console.error('Fehler beim Markieren aller als gelesen:', error);
    }
  };

  const navItems = [
    { id: 'overview', label: 'Übersicht', icon: Home },
    { id: 'bot-manager', label: 'Bots', icon: Bot },
    { id: 'maintenance', label: 'Wartung', icon: Activity },
    { id: 'team', label: 'Team', icon: Users },
    { id: 'logs', label: 'Protokolle', icon: FileText },
    { id: 'settings', label: 'Einstellungen', icon: Settings },
  ];

  const handleNavClick = (id) => {
    setActiveSection(id);
  };

  const handleProfileClick = () => {
    setSettingsTab('profile');
    setActiveSection('settings');
    setShowUserDropdown(false);
  };

  const handleSettingsClick = () => {
    setSettingsTab('preferences');
    setActiveSection('settings');
    setShowUserDropdown(false);
  };

  const handleSignOut = async () => {
    await signOut();
    setShowUserDropdown(false);
  };

  return (
    <header className="fixed top-0 left-0 right-0 h-16 bg-[#0a0a0f]/80 backdrop-blur-xl border-b border-violet-500/20 z-50">
      <div className="h-full px-4 md:px-6 flex items-center justify-between">
        <div className="flex items-center gap-4 md:gap-8">
          {/* Mobile Menu Button */}
          <button 
            className="md:hidden p-2 text-gray-400 hover:text-white"
            onClick={() => setIsMobileMenuOpen && setIsMobileMenuOpen(!isMobileMenuOpen)}
          >
            {isMobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>

          <motion.div
            className="flex items-center gap-3 cursor-pointer"
            whileHover={{ scale: 1.05 }}
            onClick={() => setActiveSection('overview')}
          >
            <div className="w-8 h-8 md:w-10 md:h-10 rounded-lg bg-gradient-to-br from-violet-600 to-blue-500 flex items-center justify-center shadow-lg shadow-violet-500/50">
              <Bot className="w-5 h-5 md:w-6 md:h-6 text-white" />
            </div>
            <span className="text-lg md:text-xl font-bold bg-gradient-to-r from-violet-400 to-blue-400 bg-clip-text text-transparent block">
              DarkCode
            </span>
          </motion.div>

          <nav className="hidden lg:flex items-center gap-1">
            {navItems.map((item) => (
              <motion.button
                key={item.id}
                onClick={() => handleNavClick(item.id)}
                className={`px-4 py-2 rounded-lg flex items-center gap-2 text-sm font-medium transition-all ${
                  activeSection === item.id
                    ? 'bg-violet-600/20 text-violet-400 shadow-lg shadow-violet-500/20'
                    : 'text-gray-400 hover:text-white hover:bg-white/5'
                }`}
                whileHover={{ y: -2 }}
                whileTap={{ scale: 0.95 }}
              >
                <item.icon className="w-4 h-4" />
                {item.label}
              </motion.button>
            ))}
          </nav>
        </div>

        <div className="flex items-center gap-2 md:gap-4">
          {/* Notification Bell */}
          <div className="relative">
            <motion.button
              className="w-8 h-8 md:w-10 md:h-10 rounded-lg bg-white/5 hover:bg-white/10 flex items-center justify-center transition-all relative"
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => setShowNotifications(!showNotifications)}
            >
              <Bell className="w-4 h-4 md:w-5 md:h-5 text-gray-400" />
              {unreadCount > 0 && (
                <span className="absolute top-2 right-2 w-2 h-2 md:w-2.5 md:h-2.5 bg-red-500 rounded-full border-2 border-[#0a0a0f]"></span>
              )}
            </motion.button>

            <AnimatePresence>
              {showNotifications && (
                <motion.div
                  initial={{ opacity: 0, y: 10, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: 10, scale: 0.95 }}
                  className="absolute top-full right-0 mt-2 w-80 max-h-[400px] flex flex-col bg-[#1a1a2e] border border-violet-500/20 rounded-xl shadow-2xl z-50 overflow-hidden"
                >
                  <div className="p-3 border-b border-white/5 flex justify-between items-center bg-[#1a1a2e]">
                    <h3 className="font-semibold text-white">Benachrichtigungen</h3>
                    {unreadCount > 0 && (
                      <button onClick={markAllRead} className="text-xs text-violet-400 hover:text-violet-300">
                        Alle gelesen
                      </button>
                    )}
                  </div>
                  <div className="overflow-y-auto flex-1">
                    {notifications.length === 0 ? (
                      <div className="p-8 text-center text-gray-500 text-sm">
                        Keine Benachrichtigungen
                      </div>
                    ) : (
                      notifications.map(n => (
                        <NotificationItem key={n.id} notification={n} onRead={markRead} />
                      ))
                    )}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* User Profile */}
          <div className="relative">
            <motion.button
              className="flex items-center gap-2 md:gap-3 px-2 py-1 md:px-3 md:py-2 rounded-lg bg-white/5 hover:bg-white/10 transition-all"
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => setShowUserDropdown(!showUserDropdown)}
            >
              <div className="w-7 h-7 md:w-8 md:h-8 rounded-full bg-gradient-to-br from-violet-500 to-blue-500 flex items-center justify-center text-xs md:text-sm font-bold uppercase text-white">
                {profile?.full_name?.[0] || user?.email?.[0] || 'U'}
              </div>
              <div className="hidden sm:block text-left">
                <div className="text-sm font-medium text-white max-w-[100px] truncate">{profile?.full_name || 'Benutzer'}</div>
                <div className="text-xs text-gray-400 capitalize">{profile?.role || 'Benutzer'}</div>
              </div>
              <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform ${showUserDropdown ? 'rotate-180' : ''}`} />
            </motion.button>

            {showUserDropdown && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="absolute top-full right-0 mt-2 w-56 bg-[#1a1a2e]/95 backdrop-blur-xl rounded-lg border border-violet-500/20 shadow-2xl overflow-hidden z-50"
              >
                <div className="p-3 border-b border-violet-500/20">
                  <div className="text-sm font-medium text-white truncate">{user?.email}</div>
                </div>
                <div className="p-2">
                  <button 
                    onClick={handleProfileClick}
                    className="w-full px-3 py-2 rounded-lg hover:bg-white/5 flex items-center gap-3 text-sm text-gray-300 transition-colors"
                  >
                    <User className="w-4 h-4" />
                    Profil
                  </button>
                  <button 
                    onClick={handleSettingsClick}
                    className="w-full px-3 py-2 rounded-lg hover:bg-white/5 flex items-center gap-3 text-sm text-gray-300 transition-colors"
                  >
                    <Settings className="w-4 h-4" />
                    Einstellungen
                  </button>
                  <button
                    onClick={handleSignOut}
                    className="w-full px-3 py-2 rounded-lg hover:bg-red-500/10 flex items-center gap-3 text-sm text-red-400 transition-colors"
                  >
                    <LogOut className="w-4 h-4" />
                    Abmelden
                  </button>
                </div>
              </motion.div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header;
