
import React, { useState, useEffect } from 'react';
import { Helmet, HelmetProvider } from 'react-helmet-async';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Toaster } from '@/components/ui/toaster';
import { AuthProvider, useAuth } from '@/contexts/SupabaseAuthContext';
import Header from '@/components/Header';
import Sidebar from '@/components/Sidebar';
import Overview from '@/components/Overview';
import BotManager from '@/components/BotManager';
import MaintenanceStatus from '@/components/MaintenanceStatus';
import TeamRoles from '@/components/TeamRoles';
import Administration from '@/components/Administration';
import AnalyticsDashboard from '@/components/AnalyticsDashboard';
import SupportCenter from '@/components/SupportCenter';
import TeamSupportDashboard from '@/components/TeamSupportDashboard'; // New Import
import Logs from '@/components/Logs';
import Settings from '@/components/Settings';
import Footer from '@/components/Footer';
import AnimatedBackground from '@/components/AnimatedBackground';
import Login from '@/components/Login';
import { Loader2, Home, Bot, Activity, Users, FileText, Settings as SettingsIcon, Shield, BarChart3, HelpCircle, LifeBuoy } from 'lucide-react';
import { supabase } from '@/lib/customSupabaseClient';

const ProtectedRoute = ({ children }) => {
  const { user, loading } = useAuth();
  
  if (loading) {
    return (
      <div className="min-h-screen bg-[#0a0a0f] flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-violet-500" />
      </div>
    );
  }
  
  if (!user) {
    return <Navigate to="/login" replace />;
  }

  return children;
};

// Component to handle auto-promotion for dev environment
const AutoPromoteOwner = () => {
  const { user } = useAuth();
  useEffect(() => {
    const promoteToOwner = async () => {
      if (!user) return;
      try {
        const { error } = await supabase.rpc('make_me_owner');
        if (error) console.error('Failed to promote user:', error);
      } catch (err) { console.error('Auto-promotion error:', err); }
    };
    promoteToOwner();
  }, [user]);
  return null;
};

// Component to handle global theme application
const ThemeController = () => {
  const { user } = useAuth();
  useEffect(() => {
    const applyTheme = async () => {
      if (!user) return;
      try {
        const { data } = await supabase.from('profiles').select('preferences').eq('id', user.id).single();
        const theme = data?.preferences?.theme || 'dark';
        const root = document.documentElement;
        root.classList.remove('light', 'dark');
        if (theme === 'system') {
          const systemTheme = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
          root.classList.add(systemTheme);
        } else {
          root.classList.add(theme);
        }
      } catch (error) { console.error('Error applying theme:', error); }
    };
    applyTheme();
  }, [user]);
  return null;
};

const DashboardLayout = () => {
  const [activeSection, setActiveSection] = useState('overview');
  const [settingsTab, setSettingsTab] = useState('profile');
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [userRole, setUserRole] = useState('viewer');

  const { user } = useAuth();

  useEffect(() => {
     if (user) {
       supabase.from('profiles').select('role').eq('id', user.id).single().then(({ data }) => {
         if (data) setUserRole(data.role);
       });
     }
  }, [user]);

  const renderContent = () => {
    switch (activeSection) {
      case 'overview': return <Overview />;
      case 'analytics': return <AnalyticsDashboard />;
      case 'bot-manager': return <BotManager />;
      case 'maintenance': return <MaintenanceStatus />;
      case 'team': return <TeamRoles />;
      case 'logs': return <Logs />;
      case 'support': return <SupportCenter />;
      case 'team-support': return <TeamSupportDashboard />;
      case 'settings': return <Settings initialTab={settingsTab} />;
      case 'administration': return <Administration setActiveSection={setActiveSection} />;
      default: return <Overview />;
    }
  };

  const isStaff = ['owner', 'admin', 'developer'].includes(userRole);

  // Mobile Navigation Menu Item
  const MobileMenuItem = ({ id, label, icon: Icon }) => (
    <button
      onClick={() => {
        setActiveSection(id);
        setIsMobileMenuOpen(false);
      }}
      className={`w-full p-4 flex items-center gap-3 text-sm font-medium transition-colors ${
        activeSection === id 
          ? 'bg-violet-600/10 text-violet-400 border-l-2 border-violet-500' 
          : 'text-gray-400 hover:bg-white/5 hover:text-white'
      }`}
    >
      <Icon className="w-5 h-5" />
      {label}
    </button>
  );

  return (
    <>
      <AutoPromoteOwner />
      <ThemeController />
      <AnimatedBackground />
      <div className="relative z-10 flex flex-col min-h-screen">
        <Header 
          activeSection={activeSection} 
          setActiveSection={setActiveSection} 
          setSettingsTab={setSettingsTab}
          isMobileMenuOpen={isMobileMenuOpen}
          setIsMobileMenuOpen={setIsMobileMenuOpen}
        />
        
        <AnimatePresence>
          {isMobileMenuOpen && (
            <motion.div
              initial={{ opacity: 0, x: -100 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -100 }}
              className="fixed inset-0 top-16 z-40 bg-[#0a0a0f]/95 backdrop-blur-xl md:hidden overflow-y-auto"
            >
              <div className="flex flex-col py-4">
                <MobileMenuItem id="overview" label="Übersicht" icon={Home} />
                <MobileMenuItem id="analytics" label="Analytics" icon={BarChart3} />
                <MobileMenuItem id="bot-manager" label="Bot Manager" icon={Bot} />
                <MobileMenuItem id="maintenance" label="Wartungsstatus" icon={Activity} />
                <MobileMenuItem id="team" label="Team & Rollen" icon={Users} />
                <MobileMenuItem id="logs" label="Systemprotokolle" icon={FileText} />
                <MobileMenuItem id="support" label="Hilfe & Support" icon={HelpCircle} />
                {isStaff && <MobileMenuItem id="team-support" label="Ticket System" icon={LifeBuoy} />}
                <MobileMenuItem id="administration" label="Verwaltung" icon={Shield} />
                <MobileMenuItem id="settings" label="Einstellungen" icon={SettingsIcon} />
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <div className="flex flex-1 pt-16">
          <div className="hidden md:block">
            <Sidebar activeSection={activeSection} setActiveSection={setActiveSection} userRole={userRole} />
          </div>
          
          <main className="flex-1 md:ml-64 p-4 md:p-8 min-h-[calc(100vh-4rem)] overflow-x-hidden">
            <motion.div
              key={activeSection}
              initial={{ opacity: 0, x: 10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.3, ease: 'easeOut' }}
            >
              {renderContent()}
            </motion.div>
          </main>
        </div>
        <Footer />
      </div>
    </>
  );
};

function App() {
  return (
    <HelmetProvider>
      <Helmet>
        <title>DarkCode Bot Hosting - Dashboard</title>
        <meta name="description" content="Professionelle Discord Bot Hosting Plattform" />
      </Helmet>
      
      <Router>
        <AuthProvider>
          <div className="min-h-screen bg-[#0a0a0f] text-white relative overflow-hidden font-sans selection:bg-violet-500/30">
            <Routes>
              <Route path="/login" element={<Login />} />
              <Route path="/*" element={<ProtectedRoute><DashboardLayout /></ProtectedRoute>} />
            </Routes>
            <Toaster />
          </div>
        </AuthProvider>
      </Router>
    </HelmetProvider>
  );
}

export default App;
