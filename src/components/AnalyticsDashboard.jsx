
import React, { useEffect, useState } from 'react';
import { 
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, 
  AreaChart, Area, BarChart, Bar 
} from 'recharts';
import { motion } from 'framer-motion';
import { Activity, Server, Users, Cpu, Clock, Zap, ArrowUp, ArrowDown } from 'lucide-react';

const MetricCard = ({ title, value, change, icon: Icon, color }) => (
  <motion.div 
    whileHover={{ y: -5 }}
    className="p-6 rounded-xl bg-[#1a1a2e]/60 border border-violet-500/20 backdrop-blur-xl"
  >
    <div className="flex justify-between items-start mb-4">
      <div className={`p-3 rounded-lg ${color} bg-opacity-20`}>
        <Icon className={`w-6 h-6 ${color.replace('bg-', 'text-')}`} />
      </div>
      {change && (
        <span className={`flex items-center text-sm font-medium ${
          change >= 0 ? 'text-green-400' : 'text-red-400'
        }`}>
          {change >= 0 ? <ArrowUp className="w-4 h-4 mr-1" /> : <ArrowDown className="w-4 h-4 mr-1" />}
          {Math.abs(change)}%
        </span>
      )}
    </div>
    <h3 className="text-gray-400 text-sm font-medium">{title}</h3>
    <p className="text-2xl font-bold text-white mt-1">{value}</p>
  </motion.div>
);

const AnalyticsDashboard = () => {
  // Mock Data (In a real app, this would come from Supabase or an external monitoring API)
  const [performanceData, setPerformanceData] = useState([]);
  const [resourceData, setResourceData] = useState([]);
  
  useEffect(() => {
    // Generate dummy data for charts
    const perf = [];
    const res = [];
    const now = new Date();
    for (let i = 0; i < 24; i++) {
        const time = new Date(now.getTime() - (23 - i) * 3600000).getHours() + ':00';
        perf.push({
            time,
            uptime: 99 + Math.random(),
            latency: 20 + Math.random() * 50
        });
        res.push({
            time,
            cpu: 30 + Math.random() * 40,
            memory: 40 + Math.random() * 30,
            storage: 20 + Math.random() * 5
        });
    }
    setPerformanceData(perf);
    setResourceData(res);
  }, []);

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <MetricCard title="Bot Uptime" value="99.98%" change={0.4} icon={Activity} color="bg-green-500" />
        <MetricCard title="API Requests" value="1.2M" change={12.5} icon={Zap} color="bg-blue-500" />
        <MetricCard title="Avg Response" value="45ms" change={-5.2} icon={Clock} color="bg-violet-500" />
        <MetricCard title="Active Users" value="842" change={8.1} icon={Users} color="bg-pink-500" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Performance Chart */}
        <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="p-6 rounded-xl bg-[#1a1a2e]/60 border border-violet-500/20 backdrop-blur-xl"
        >
          <h3 className="text-lg font-bold text-white mb-6 flex items-center gap-2">
            <Activity className="w-5 h-5 text-violet-400" /> System Performance
          </h3>
          <div className="h-[300px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={performanceData}>
                <defs>
                  <linearGradient id="colorUptime" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#ffffff10" vertical={false} />
                <XAxis dataKey="time" stroke="#6b7280" fontSize={12} tickLine={false} axisLine={false} />
                <YAxis stroke="#6b7280" fontSize={12} tickLine={false} axisLine={false} domain={[90, 100]} />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#1a1a2e', borderColor: '#8b5cf6', borderRadius: '8px' }}
                  itemStyle={{ color: '#fff' }}
                />
                <Area type="monotone" dataKey="uptime" stroke="#8b5cf6" strokeWidth={2} fillOpacity={1} fill="url(#colorUptime)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </motion.div>

        {/* Resource Usage Chart */}
        <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="p-6 rounded-xl bg-[#1a1a2e]/60 border border-violet-500/20 backdrop-blur-xl"
        >
          <h3 className="text-lg font-bold text-white mb-6 flex items-center gap-2">
            <Server className="w-5 h-5 text-blue-400" /> Resource Consumption
          </h3>
          <div className="h-[300px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={resourceData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#ffffff10" vertical={false} />
                <XAxis dataKey="time" stroke="#6b7280" fontSize={12} tickLine={false} axisLine={false} />
                <YAxis stroke="#6b7280" fontSize={12} tickLine={false} axisLine={false} />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#1a1a2e', borderColor: '#3b82f6', borderRadius: '8px' }}
                  itemStyle={{ color: '#fff' }}
                />
                <Line type="monotone" dataKey="cpu" stroke="#3b82f6" strokeWidth={2} dot={false} name="CPU %" />
                <Line type="monotone" dataKey="memory" stroke="#ec4899" strokeWidth={2} dot={false} name="RAM %" />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </motion.div>
      </div>

      {/* Global Stats Table */}
      <div className="p-6 rounded-xl bg-[#1a1a2e]/60 border border-violet-500/20 backdrop-blur-xl overflow-hidden">
        <h3 className="text-lg font-bold text-white mb-4">Regional Distribution</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="border-b border-white/10 text-gray-400 text-sm">
                <th className="pb-3 font-medium">Region</th>
                <th className="pb-3 font-medium">Active Nodes</th>
                <th className="pb-3 font-medium">Latency</th>
                <th className="pb-3 font-medium">Status</th>
              </tr>
            </thead>
            <tbody className="text-sm">
              {[
                { region: 'EU Central (Frankfurt)', nodes: 12, latency: '24ms', status: 'Operational' },
                { region: 'US East (N. Virginia)', nodes: 8, latency: '89ms', status: 'Operational' },
                { region: 'Asia Pacific (Singapore)', nodes: 6, latency: '142ms', status: 'Degraded' },
              ].map((row, i) => (
                <tr key={i} className="border-b border-white/5 last:border-0 hover:bg-white/5 transition-colors">
                  <td className="py-3 text-white">{row.region}</td>
                  <td className="py-3 text-gray-300">{row.nodes}</td>
                  <td className="py-3 text-gray-300">{row.latency}</td>
                  <td className="py-3">
                    <span className={`px-2 py-1 rounded text-xs font-medium ${
                      row.status === 'Operational' ? 'bg-green-500/20 text-green-400' : 'bg-yellow-500/20 text-yellow-400'
                    }`}>
                      {row.status}
                    </span>
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

export default AnalyticsDashboard;
