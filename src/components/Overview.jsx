
import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Bot, Users, Activity, Server, ArrowUp, ArrowDown, Clock } from 'lucide-react';
import { supabase } from '@/lib/customSupabaseClient';
import { useAuth } from '@/contexts/SupabaseAuthContext';
import { format } from 'date-fns';
import { de } from 'date-fns/locale';

const StatCard = ({ title, value, subtext, icon: Icon, trend, color }) => (
  <motion.div 
    initial={{ opacity: 0, y: 20 }}
    animate={{ opacity: 1, y: 0 }}
    className="p-6 rounded-xl bg-[#1a1a2e]/60 backdrop-blur-xl border border-violet-500/20 relative overflow-hidden group"
  >
    <div className={`absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity ${color}`}>
      <Icon className="w-24 h-24 transform translate-x-4 -translate-y-4" />
    </div>
    <div className="relative z-10">
      <div className="flex justify-between items-start mb-4">
        <div className={`p-3 rounded-lg bg-white/5 ${color} bg-opacity-10`}>
          <Icon className={`w-6 h-6 ${color.replace('bg-', 'text-')}`} />
        </div>
        {trend && (
          <div className={`flex items-center gap-1 text-xs font-medium ${trend > 0 ? 'text-green-400' : 'text-red-400'}`}>
            {trend > 0 ? <ArrowUp className="w-3 h-3" /> : <ArrowDown className="w-3 h-3" />}
            {Math.abs(trend)}%
          </div>
        )}
      </div>
      <h3 className="text-3xl font-bold text-white mb-1">{value}</h3>
      <p className="text-sm text-gray-400 font-medium">{title}</p>
      {subtext && <p className="text-xs text-gray-500 mt-2">{subtext}</p>}
    </div>
  </motion.div>
);

const ActivityItem = ({ log }) => (
  <div className="flex items-start gap-4 p-4 rounded-lg bg-white/5 border border-white/5 hover:border-violet-500/30 transition-all">
    <div className="mt-1 w-2 h-2 rounded-full bg-violet-500 shadow-lg shadow-violet-500/50" />
    <div className="flex-1">
      <p className="text-sm text-gray-200">
        <span className="font-semibold text-violet-400">
          {log.profiles?.full_name || log.profiles?.email || 'System'}
        </span>{' '}
        {log.action}
      </p>
      <p className="text-xs text-gray-500 mt-1">{format(new Date(log.created_at), 'd. MMM, HH:mm', { locale: de })}</p>
    </div>
  </div>
);

const Overview = () => {
  const { user } = useAuth();
  const [stats, setStats] = useState({
    totalBots: 0,
    activeBots: 0,
    totalUsers: 0,
    uptime: '99.9%'
  });
  const [recentActivity, setRecentActivity] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDashboardData();
    
    // Realtime subscription for stats updates
    const subscription = supabase
      .channel('dashboard_changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'bots' }, () => fetchStats())
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'activity_logs' }, payload => {
        setRecentActivity(prev => [payload.new, ...prev].slice(0, 5));
      })
      .subscribe();

    return () => subscription.unsubscribe();
  }, []);

  const fetchStats = async () => {
    try {
      // Fetch bots count
      const { data: bots } = await supabase.from('bots').select('status');
      const totalBots = bots?.length || 0;
      const activeBots = bots?.filter(b => b.status === 'online').length || 0;

      // Fetch users count (profiles)
      const { count: userCount } = await supabase.from('profiles').select('*', { count: 'exact', head: true });

      setStats(prev => ({
        ...prev,
        totalBots,
        activeBots,
        totalUsers: userCount || 0
      }));
    } catch (error) {
      console.error('Error fetching stats:', error);
    }
  };

  const fetchDashboardData = async () => {
    setLoading(true);
    await Promise.all([
      fetchStats(),
      (async () => {
        const { data } = await supabase
          .from('activity_logs')
          .select(`*, profiles:user_id(email, full_name)`)
          .order('created_at', { ascending: false })
          .limit(5);
        if (data) setRecentActivity(data);
      })()
    ]);
    setLoading(false);
  };

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold bg-gradient-to-r from-violet-400 to-blue-400 bg-clip-text text-transparent mb-2">
          Dashboard Übersicht
        </h1>
        <p className="text-gray-400">Willkommen zurück! Hier ist ein Überblick über Ihre Bots.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard 
          title="Gesamt Bots" 
          value={stats.totalBots} 
          icon={Bot} 
          trend={12} 
          color="text-violet-400"
          subtext={`${stats.activeBots} derzeit aktiv`}
        />
        <StatCard 
          title="Benutzer" 
          value={stats.totalUsers} 
          icon={Users} 
          trend={5} 
          color="text-blue-400"
          subtext="Registrierte Nutzer"
        />
        <StatCard 
          title="Systemlaufzeit" 
          value={stats.uptime} 
          icon={Activity} 
          color="text-green-400"
          subtext="Letzte 30 Tage"
        />
        <StatCard 
          title="Serverauslastung" 
          value="34%" 
          icon={Server} 
          trend={-2} 
          color="text-orange-400"
          subtext="Normale Leistung"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-6">
          <div className="p-6 rounded-xl bg-[#1a1a2e]/60 backdrop-blur-xl border border-violet-500/20">
            <h3 className="text-xl font-bold mb-6 flex items-center gap-2">
              <Activity className="w-5 h-5 text-violet-400" />
              Systemleistung
            </h3>
            <div className="h-64 flex items-end justify-between gap-2">
              {[...Array(12)].map((_, i) => (
                <div key={i} className="w-full bg-white/5 rounded-t-lg relative group overflow-hidden">
                  <motion.div 
                    initial={{ height: 0 }}
                    animate={{ height: `${Math.random() * 60 + 20}%` }}
                    transition={{ duration: 1, delay: i * 0.1 }}
                    className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-violet-600 to-blue-500 opacity-60 group-hover:opacity-100 transition-opacity"
                  />
                </div>
              ))}
            </div>
            <div className="flex justify-between mt-4 text-xs text-gray-500">
              <span>00:00</span>
              <span>06:00</span>
              <span>12:00</span>
              <span>18:00</span>
              <span>23:59</span>
            </div>
          </div>
        </div>

        <div className="p-6 rounded-xl bg-[#1a1a2e]/60 backdrop-blur-xl border border-violet-500/20 h-fit">
          <h3 className="text-xl font-bold mb-6 flex items-center gap-2">
            <Clock className="w-5 h-5 text-violet-400" />
            Aktuelle Aktivitäten
          </h3>
          <div className="space-y-4">
            {loading ? (
              <div className="text-center py-8 text-gray-500">Lade Aktivitäten...</div>
            ) : recentActivity.length > 0 ? (
              recentActivity.map((log) => <ActivityItem key={log.id} log={log} />)
            ) : (
              <div className="text-center py-8 text-gray-500">Keine Aktivitäten</div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Overview;
