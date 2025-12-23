
import React from 'react';
import { motion } from 'framer-motion';
import { Home, Bot, Activity, Users, Shield, BarChart3, Settings, FileText, HelpCircle, LifeBuoy } from 'lucide-react';

const Sidebar = ({ activeSection, setActiveSection, userRole }) => {
  const isStaff = ['owner', 'admin', 'developer'].includes(userRole);

  const menuItems = [
    { id: 'overview', label: 'Übersicht', icon: Home },
    { id: 'analytics', label: 'Analytics', icon: BarChart3 },
    { id: 'bot-manager', label: 'Bot Manager', icon: Bot },
    { id: 'maintenance', label: 'Wartungsstatus', icon: Activity },
    { id: 'team', label: 'Team & Rollen', icon: Users },
    { id: 'logs', label: 'Systemprotokolle', icon: FileText },
    { id: 'support', label: 'Hilfe & Support', icon: HelpCircle },
    // Only show Team Support Dashboard for staff
    ...(isStaff ? [{ id: 'team-support', label: 'Ticket System', icon: LifeBuoy }] : []),
    { id: 'settings', label: 'Einstellungen', icon: Settings },
    { id: 'administration', label: 'Verwaltung', icon: Shield },
  ];

  return (
    <aside className="fixed left-0 top-16 w-64 h-[calc(100vh-4rem)] bg-[#0a0a0f]/60 backdrop-blur-xl border-r border-violet-500/20 p-4 z-40 overflow-y-auto no-scrollbar">
      <nav className="space-y-2 mb-8">
        {menuItems.map((item) => (
          <motion.button
            key={item.id}
            onClick={() => setActiveSection(item.id)}
            className={`w-full px-4 py-3 rounded-lg flex items-center gap-3 text-sm font-medium transition-all ${
              activeSection === item.id
                ? 'bg-gradient-to-r from-violet-600/30 to-blue-600/30 text-white shadow-lg shadow-violet-500/20 border border-violet-500/30'
                : 'text-gray-400 hover:text-white hover:bg-white/5'
            }`}
            whileHover={{ x: 4 }}
            whileTap={{ scale: 0.98 }}
          >
            <item.icon className="w-5 h-5" />
            <span>{item.label}</span>
            {activeSection === item.id && (
              <motion.div
                layoutId="activeIndicator"
                className="ml-auto w-2 h-2 rounded-full bg-violet-500 shadow-lg shadow-violet-500/50"
              />
            )}
          </motion.button>
        ))}
      </nav>

      <div className="absolute bottom-4 left-4 right-4">
        <div className="p-4 rounded-lg bg-gradient-to-br from-violet-600/20 to-blue-600/20 border border-violet-500/30">
          <div className="flex items-center gap-3 mb-2">
            <Activity className="w-5 h-5 text-violet-400" />
            <span className="text-sm font-medium">Status</span>
          </div>
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="text-gray-400">CPU</span>
              <span className="text-white font-medium">34%</span>
            </div>
            <div className="h-1.5 bg-black/30 rounded-full overflow-hidden">
              <motion.div
                className="h-full bg-gradient-to-r from-violet-500 to-blue-500"
                initial={{ width: 0 }}
                animate={{ width: '34%' }}
                transition={{ duration: 1, ease: 'easeOut' }}
              />
            </div>
            <div className="flex items-center justify-between text-xs">
              <span className="text-gray-400">RAM</span>
              <span className="text-white font-medium">68%</span>
            </div>
            <div className="h-1.5 bg-black/30 rounded-full overflow-hidden">
              <motion.div
                className="h-full bg-gradient-to-r from-blue-500 to-violet-500"
                initial={{ width: 0 }}
                animate={{ width: '68%' }}
                transition={{ duration: 1, ease: 'easeOut', delay: 0.2 }}
              />
            </div>
          </div>
        </div>
      </div>
    </aside>
  );
};

export default Sidebar;
