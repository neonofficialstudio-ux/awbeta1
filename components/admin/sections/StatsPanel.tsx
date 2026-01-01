import React from 'react';
import { UsersIcon, MissionIcon, QueueIcon, TrendingUpIcon } from '../../../constants';

const StatBox: React.FC<{ label: string; value: string | number; icon: React.ElementType; color?: string }> = ({ label, value, icon: Icon, color = "text-white" }) => (
    <div className="bg-slate-dark p-5 rounded-2xl border border-white/5 flex items-center justify-between group hover:border-neon-cyan/30 transition-all duration-300 shadow-lg hover:shadow-neon-cyan/10 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-white/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
        <div className="relative z-10">
            <p className="text-[10px] text-gray-500 uppercase tracking-widest font-bold mb-1">{label}</p>
            <p className={`text-3xl font-chakra font-bold ${color} text-shadow-glow`}>{value}</p>
        </div>
        <div className="p-3 rounded-xl bg-navy-deep border border-white/10 group-hover:border-neon-cyan/50 transition-colors relative z-10">
            <Icon className="w-6 h-6 text-gray-400 group-hover:text-white transition-colors" />
        </div>
    </div>
);

export default function StatsPanel({ data }: { data: any }) {
  if (!data) return null;

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
      <StatBox label="Usuários Totais" value={data.totals.users} icon={UsersIcon} />
      <StatBox label="Missões Ativas" value={data.totals.missions} icon={MissionIcon} color="text-blue-400" />
      <StatBox label="Fila de Produção" value={data.totals.queue} icon={QueueIcon} color="text-gold-cinematic" />
      <StatBox label="Usuários Ativos" value={data.activeUsers} icon={TrendingUpIcon} color="text-green-400" />
    </div>
  );
}