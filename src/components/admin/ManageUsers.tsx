import React, { useState, useMemo } from 'react';
import type { User, MissionSubmission, PunishmentType } from '../../types';
import AdminUserEditModal from './AdminUserEditModal';
import AdminPunishmentModal from './AdminPunishmentModal';
import ConfirmationModal from './ConfirmationModal';
import { ModalPortal } from '../ui/overlays/ModalPortal';
import { toast } from 'react-hot-toast';
import { getSupabase } from '../../api/supabase/client';
import { SearchIcon, EditIcon, HistoryIcon, UsersIcon, CrownIcon, ShieldIcon } from '../../constants';
import AvatarWithFrame from '../AvatarWithFrame';
import UserListModal from './UserListModal';
import { xpForLevelStart } from '../../api/economy/economy';

// UI Components
import Card from '../ui/base/Card';
import Button from '../ui/base/Button';
import Input from '../ui/base/Input';
import Select from '../ui/base/Select';
import Badge from '../ui/base/Badge';
import TableResponsiveWrapper from '../ui/patterns/TableResponsiveWrapper';
import MetricCard from '../ui/patterns/MetricCard';
import Tabs from '../ui/navigation/Tabs';
import Toolbar from '../ui/advanced/Toolbar';
import { getDisplayName } from '../../api/core/getDisplayName';

interface ManageUsersProps {
  allUsers: User[];
  missionSubmissions: MissionSubmission[];
  onUpdateUser: (user: User) => void;
  onPunishUser: (payload: { userId: string; type: PunishmentType; reason: string; durationDays?: number; deduction?: { coins?: number; xp?: number; } }) => Promise<void>;
  onUnbanUser: (userId: string) => Promise<void>;
  onResetMonthlyRanking: () => Promise<void>;
  onViewUserHistory: (user: User) => void;
}

const getUserDisplayName = (user: User) => getDisplayName({ ...user, artistic_name: user.artisticName });

const KpiCard: React.FC<{ title: string, value: string | number, icon?: React.ElementType, onClick?: () => void }> = ({ title, value, icon: Icon, onClick }) => (
    <div onClick={onClick} className={`cursor-pointer h-full`}>
        <div className="bg-slate-dark border border-white/5 p-6 rounded-xl flex flex-col items-center justify-between group hover:border-gold-cinematic/30 hover:shadow-[0_0_15px_rgba(246,197,96,0.1)] transition-all duration-300 h-full">
             <div className="flex items-center justify-between w-full mb-4">
                <p className="text-xs font-bold text-gray-500 uppercase tracking-wider">{title}</p>
                {Icon && <Icon className="w-5 h-5 text-gold-cinematic group-hover:text-white transition-colors" />}
             </div>
             <p className="text-3xl font-black font-chakra text-white text-shadow-glow">{value}</p>
        </div>
    </div>
);

const PieChart: React.FC<{
  data: { name: string; value: number }[];
  title: string;
  period?: 7 | 30 | 90;
  onPeriodChange?: (p: 7 | 30 | 90) => void;
}> = ({ data, title, period, onPeriodChange }) => {
  const colors = ['#F6C560', '#FF1CF7', '#00E8FF', '#FBBF24', '#A855F7', '#EC4899'];
  const total = data.reduce((acc, item) => acc + (item.value || 0), 0);
  const [hoveredSegment, setHoveredSegment] = useState<string | null>(null);

  let cumulativePercent = 0;
  const segments = data.map((item, index) => {
    const val = item.value || 0;
    const percent = total > 0 ? (val / total) * 100 : 0;
    const segment = {
      ...item,
      percent,
      color: colors[index % colors.length],
      offset: cumulativePercent,
    };
    cumulativePercent = cumulativePercent + percent;
    return segment;
  });

  return (
    <Card className="h-96 flex flex-col bg-slate-dark border-white/5">
      <div className="flex justify-between items-center mb-4 border-b border-white/5 pb-2">
        <h4 className="font-bold text-white truncate pr-2 font-chakra tracking-wide">{title}</h4>
        {onPeriodChange && (
          <div className="flex items-center space-x-1 bg-black/30 p-1 rounded-lg flex-shrink-0">
            {([7, 30, 90] as const).map(p => (
              <button
                key={p}
                onClick={() => onPeriodChange(p)}
                className={`px-2 py-1 text-[10px] font-bold rounded-md transition-colors ${
                  period === p ? 'bg-gold-cinematic text-black' : 'text-gray-500 hover:text-white'
                }`}
              >
                {p}D
              </button>
            ))}
          </div>
        )}
      </div>
      
      {total > 0 ? (
        <div className="flex-grow flex items-center justify-around gap-4">
          <div
            className="relative w-40 h-40 flex-shrink-0"
            onMouseLeave={() => setHoveredSegment(null)}
          >
            <svg viewBox="0 0 42 42" className="w-full h-full drop-shadow-lg">
              <circle cx="21" cy="21" r="15.91549430918954" fill="transparent" stroke="#0B0F17" strokeWidth="6"></circle>
              {segments.map(segment => (
                <circle
                  key={segment.name}
                  cx="21" cy="21" r="15.91549430918954"
                  fill="transparent"
                  stroke={segment.color}
                  strokeWidth={segment.name === hoveredSegment ? 6.5 : 6}
                  strokeDasharray={`${segment.percent} ${100 - segment.percent}`}
                  strokeDashoffset={25 - segment.offset}
                  className="transition-all duration-300 transform -rotate-90 origin-center"
                  onMouseEnter={() => setHoveredSegment(segment.name)}
                />
              ))}
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
              {hoveredSegment ? (
                <>
                  <span className="text-2xl font-bold text-white">
                    {segments.find(s => s.name === hoveredSegment)?.value.toLocaleString('pt-br')}
                  </span>
                  <span className="text-xs text-gray-400 truncate max-w-[80px]">
                    {hoveredSegment}
                  </span>
                </>
              ) : (
                <>
                  <span className="text-2xl font-bold text-white">{total.toLocaleString('pt-br')}</span>
                  <span className="text-xs text-gray-400">Total</span>
                </>
              )}
            </div>
          </div>
          <ul className="text-sm space-y-2 overflow-y-auto max-h-48 pr-2 w-full custom-scrollbar">
            {segments.map(segment => (
              <li
                key={segment.name}
                className={`flex items-center justify-between p-2 rounded-md transition-colors border border-transparent ${hoveredSegment === segment.name ? 'bg-white/5 border-white/10' : ''}`}
                onMouseEnter={() => setHoveredSegment(segment.name)}
              >
                <div className="flex items-center">
                    <span className="w-2 h-2 rounded-full mr-2 flex-shrink-0 shadow-[0_0_5px]" style={{ backgroundColor: segment.color, boxShadow: `0 0 5px ${segment.color}` }}></span>
                    <span className="text-gray-300 truncate max-w-[120px] text-xs">{segment.name}</span>
                </div>
                <span className="font-bold text-white ml-2 text-xs">{segment.value}</span>
              </li>
            ))}
          </ul>
        </div>
      ) : (
        <div className="flex-grow flex items-center justify-center text-gray-600 text-sm">
          Nenhum dado.
        </div>
      )}
    </Card>
  );
};

const UserMetricsDashboard: React.FC<{ allUsers: User[], missionSubmissions: MissionSubmission[] }> = ({ allUsers, missionSubmissions }) => {
    const [isUserListModalOpen, setIsUserListModalOpen] = useState(false);
    const [modalUsers, setModalUsers] = useState<User[]>([]);
    const [modalTitle, setModalTitle] = useState('');
    
    const [planFilter, setPlanFilter] = useState<7 | 30 | 90>(30);
    const [activityFilter, setActivityFilter] = useState<7 | 30 | 90>(30);
    const [levelFilter, setLevelFilter] = useState<7 | 30 | 90>(30);

    const kpis = useMemo(() => {
        const now = new Date();
        const thirtyDaysAgoTimestamp = now.getTime() - (30 * 24 * 60 * 60 * 1000);
        const thirtyDaysAgo = new Date(thirtyDaysAgoTimestamp);
        const todayStart = new Date();
        todayStart.setHours(0, 0, 0, 0);

        const totalArtists = allUsers.filter(u => u.role === 'user');
        const newLast30Days = totalArtists.filter(u => u.joinedISO && new Date(u.joinedISO) >= thirtyDaysAgo);
        const activeToday = totalArtists.filter(u => u.lastCheckIn && new Date(u.lastCheckIn).getTime() >= todayStart.getTime());
        
        const planCounts = totalArtists.reduce((acc, user) => {
            acc[user.plan] = (acc[user.plan] || 0) + 1;
            return acc;
        }, {} as Record<string, number>);

        const mostPopularPlanEntry = Object.entries(planCounts).sort((a, b) => (b[1] as number) - (a[1] as number))[0];
        const mostPopularPlan = mostPopularPlanEntry ? mostPopularPlanEntry[0] : 'N/A';
        const mostPopularPlanUsers = totalArtists.filter(u => u.plan === mostPopularPlan);
        
        return { 
            totalArtists, 
            newLast30Days, 
            activeToday, 
            mostPopularPlan,
            mostPopularPlanUsers,
        };
    }, [allUsers]);

    const handleKpiClick = (users: User[], title: string) => {
        setModalUsers(users);
        setModalTitle(title);
        setIsUserListModalOpen(true);
    };

    const filterUsersByJoinDate = (users: User[], period: number) => {
        const now = new Date();
        const periodAgo = new Date(now.getTime() - period * 24 * 60 * 60 * 1000);
        return users.filter(user => user.joinedISO && new Date(user.joinedISO) >= periodAgo);
    };

    const userGrowthData = useMemo(() => {
        const now = new Date().getTime();
        const counts: Record<string, number> = {
            'Últimos 7 dias': 0,
            '8-30 dias': 0,
            '31-90 dias': 0,
            '> 90 dias': 0,
        };
        allUsers.filter(u => u.role === 'user').forEach(user => {
            if (user.joinedISO) {
                const joinedTime = new Date(user.joinedISO).getTime();
                const diffDays = (now - joinedTime) / (1000 * 3600 * 24);
                if (diffDays <= 7) counts['Últimos 7 dias']++;
                else if (diffDays <= 30) counts['8-30 dias']++;
                else if (diffDays <= 90) counts['31-90 dias']++;
                else counts['> 90 dias']++;
            }
        });
        return Object.entries(counts).map(([name, value]) => ({ name, value }));
    }, [allUsers]);

    const planData = useMemo(() => {
        const filtered = filterUsersByJoinDate(allUsers, planFilter);
        const planCounts = filtered.reduce((acc, user) => {
            if (user.role === 'user') {
                acc[user.plan] = (acc[user.plan] || 0) + 1;
            }
            return acc;
        }, {} as Record<string, number>);
        return Object.entries(planCounts).map(([name, value]) => ({ name, value }));
    }, [allUsers, planFilter]);

    const activityDistributionData = useMemo(() => {
        const filtered = filterUsersByJoinDate(allUsers, activityFilter);
        const now = new Date().getTime();
        const day = 24 * 60 * 60 * 1000;
        const counts: Record<string, number> = { 'Ativo hoje': 0, 'Últimos 7d': 0, 'Últimos 30d': 0, 'Inativo (>30d)': 0 };
        filtered.filter(u => u.role === 'user').forEach(user => {
            if (user.lastCheckIn) {
                const lastCheckInTime = new Date(user.lastCheckIn).getTime();
                const diff = now - lastCheckInTime;
                if (diff <= day) counts['Ativo hoje']++;
                else if (diff <= 7 * day) counts['Últimos 7d']++;
                else if (diff <= 30 * day) counts['Últimos 30d']++;
                else counts['Inativo (>30d)']++;
            } else {
                counts['Inativo (>30d)']++;
            }
        });
        return Object.entries(counts).map(([name, value]) => ({ name, value }));
    }, [allUsers, activityFilter]);

    const levelData = useMemo(() => {
        const filtered = filterUsersByJoinDate(allUsers, levelFilter);
        const brackets: Record<string, number> = { 'Nível 1-5': 0, 'Nível 6-10': 0, 'Nível 11-20': 0, 'Nível 21+': 0 };
        filtered.forEach(user => {
            if (user.role === 'user') {
                if (user.level <= 5) brackets['Nível 1-5']++;
                else if (user.level <= 10) brackets['Nível 6-10']++;
                else if (user.level <= 20) brackets['Nível 11-20']++;
                else brackets['Nível 21+']++;
            }
        });
        return Object.entries(brackets).map(([name, value]) => ({ name, value }));
    }, [allUsers, levelFilter]);


    const topEngagedTotal = useMemo(() => [...allUsers]
        .filter(u => u.role === 'user')
        .sort((a,b) => b.totalMissionsCompleted - a.totalMissionsCompleted)
        .slice(0, 5), [allUsers]);

    const topEngagedMonth = useMemo(() => {
        const now = new Date();
        const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
        
        const monthlySubmissions = missionSubmissions.filter(s => new Date(s.submittedAtISO) >= startOfMonth && s.status === 'approved');
        
        const counts = monthlySubmissions.reduce((acc, sub) => {
            acc[sub.userId] = (acc[sub.userId] || 0) + 1;
            return acc;
        }, {} as Record<string, number>);

        return Object.entries(counts)
            .map(([userId, count]) => {
                const user = allUsers.find(u => u.id === userId);
                return user ? { ...user, monthlySubmissions: count } : null;
            })
            .filter(u => u)
            .sort((a, b) => (b!.monthlySubmissions as number) - (a!.monthlySubmissions as number))
            .slice(0, 5);

    }, [allUsers, missionSubmissions]);

    return (
        <div className="space-y-8">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <KpiCard title="Total de Artistas" value={kpis.totalArtists.length} icon={UsersIcon} onClick={() => handleKpiClick(kpis.totalArtists, 'Todos os Artistas')} />
                <KpiCard title="Novos (30d)" value={kpis.newLast30Days.length} icon={UsersIcon} onClick={() => handleKpiClick(kpis.newLast30Days, 'Novos Artistas')} />
                <KpiCard title="Ativos Hoje" value={kpis.activeToday.length} icon={UsersIcon} onClick={() => handleKpiClick(kpis.activeToday, 'Artistas Ativos Hoje')} />
                <KpiCard title="Plano Top" value={kpis.mostPopularPlan.split(' ')[0]} icon={CrownIcon} onClick={() => handleKpiClick(kpis.mostPopularPlanUsers, `Plano ${kpis.mostPopularPlan}`)} />
            </div>

             <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                 <Card className="bg-slate-dark border-white/5 shadow-lg">
                     <Card.Header className="border-white/5"><h4 className="text-lg font-bold text-white font-chakra">Top 5 Engajados (Total)</h4></Card.Header>
                     <Card.Body>
                        <ul className="space-y-2">
                            {topEngagedTotal.map(user => (
                                <li key={user.id} className="flex items-center p-3 hover:bg-white/5 rounded-lg transition-colors border border-transparent hover:border-white/5">
                                    <AvatarWithFrame user={user} sizeClass="w-10 h-10" className="mr-3" />
                                    <div className="flex-grow"><span className="font-semibold text-white block">{user.name}</span> <span className="text-xs text-gray-500 font-mono uppercase">{getUserDisplayName(user)}</span></div>
                                    <span className="font-bold text-lg text-gold-cinematic">{user.totalMissionsCompleted}</span>
                                </li>
                            ))}
                        </ul>
                     </Card.Body>
                 </Card>

                 <Card className="bg-slate-dark border-white/5 shadow-lg">
                     <Card.Header className="border-white/5"><h4 className="text-lg font-bold text-white font-chakra">Top 5 Engajados (Mês)</h4></Card.Header>
                     <Card.Body>
                        <ul className="space-y-2">
                         {topEngagedMonth.map(user => user && (
                                <li key={user.id} className="flex items-center p-3 hover:bg-white/5 rounded-lg transition-colors border border-transparent hover:border-white/5">
                                    <AvatarWithFrame user={user} sizeClass="w-10 h-10" className="mr-3" />
                                    <div className="flex-grow"><span className="font-semibold text-white block">{user.name}</span> <span className="text-xs text-gray-500 font-mono uppercase">{getUserDisplayName(user)}</span></div>
                                    <span className="font-bold text-lg text-neon-cyan">{user.monthlySubmissions}</span>
                                </li>
                            ))}
                        </ul>
                     </Card.Body>
                 </Card>
             </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <PieChart data={userGrowthData} title="Crescimento" />
                <PieChart data={planData} title="Planos (Novos)" period={planFilter} onPeriodChange={setPlanFilter} />
                <PieChart data={activityDistributionData} title="Atividade (Novos)" period={activityFilter} onPeriodChange={setActivityFilter} />
                <PieChart data={levelData} title="Níveis (Novos)" period={levelFilter} onPeriodChange={setLevelFilter} />
            </div>
             <UserListModal 
                isOpen={isUserListModalOpen}
                onClose={() => setIsUserListModalOpen(false)}
                users={modalUsers}
                title={modalTitle}
            />
        </div>
    );
}

const LeadsTable: React.FC<{ users: User[] }> = ({ users }) => {
    const [dateFilter, setDateFilter] = useState('all');
    const [planFilter, setPlanFilter] = useState('all');
    const [copySuccess, setCopySuccess] = useState(false);

    const filteredUsers = useMemo(() => {
        const now = new Date().getTime();
        return users
            .filter(u => u.role === 'user')
            .filter(user => {
                if (dateFilter === 'all') return true;
                if (!user.joinedISO) return false;
                const joinedDate = new Date(user.joinedISO);
                const daysAgo = (now - joinedDate.getTime()) / (1000 * 3600 * 24);
                return daysAgo <= Number(dateFilter);
            })
            .filter(user => {
                return planFilter === 'all' || user.plan === planFilter;
            })
            .sort((a,b) => {
                const timeA = new Date(a.joinedISO || 0).getTime();
                const timeB = new Date(b.joinedISO || 0).getTime();
                return timeB - timeA;
            });
    }, [users, dateFilter, planFilter]);

    const handleCopyLeads = () => {
        const headers = "Nome\tNome Artístico\tEmail\tTelefone\tInstagram\tTikTok\tPlano\tData de Cadastro";
        const rows = filteredUsers.map(u => [
            u.name,
            getUserDisplayName(u),
            u.email,
            u.phone,
            u.instagramUrl.replace('https://www.instagram.com/', '@'),
            u.tiktokUrl?.replace('https://www.tiktok.com/', ''),
            u.plan,
            u.joined,
        ].join('\t'));
        
        const tsv = [headers, ...rows].join('\n');
        navigator.clipboard.writeText(tsv).then(() => {
            setCopySuccess(true);
            setTimeout(() => setCopySuccess(false), 2000);
        });
    };

    return (
        <Card className="bg-slate-dark border-white/5 shadow-lg">
            <Card.Header className="border-white/5">
                <Toolbar 
                    start={
                        <div className="flex flex-col sm:flex-row gap-4 w-full md:w-auto">
                            <Select
                                options={[
                                    { value: 'all', label: 'Todo o Período' },
                                    { value: '7', label: 'Últimos 7 dias' },
                                    { value: '30', label: 'Últimos 30 dias' },
                                ]}
                                value={dateFilter}
                                onChange={(v) => setDateFilter(String(v))}
                                fullWidth
                                className="w-full sm:w-48 bg-navy-deep border-white/10 text-gray-300"
                            />
                            <Select
                                options={[
                                    { value: 'all', label: 'Todos os Planos' },
                                    { value: 'Free Flow', label: 'Free Flow' },
                                    { value: 'Artista em Ascensão', label: 'Ascensão' },
                                    { value: 'Artista Profissional', label: 'Profissional' },
                                    { value: 'Hitmaker', label: 'Hitmaker' },
                                ]}
                                value={planFilter}
                                onChange={(v) => setPlanFilter(String(v))}
                                fullWidth
                                className="w-full sm:w-48 bg-navy-deep border-white/10 text-gray-300"
                            />
                        </div>
                    }
                    end={
                        <Button onClick={handleCopyLeads} variant="primary" className="bg-neon-cyan/15 border border-neon-cyan/40 text-neon-cyan hover:bg-neon-cyan/25 hover:border-neon-cyan/50 font-bold">
                              {copySuccess ? 'Copiado!' : 'Copiar Leads'}
                        </Button>
                    }
                />
            </Card.Header>
            
            <Card.Body noPadding>
                <TableResponsiveWrapper className="border border-white/5 rounded-xl overflow-hidden">
                    <table className="w-full text-sm text-left text-gray-300">
                        <thead className="text-xs text-gray-500 uppercase bg-navy-deep/80 border-b border-white/5">
                            <tr>
                                <th className="px-6 py-4">Nome</th>
                                <th className="px-6 py-4">Contatos</th>
                                <th className="px-6 py-4">Redes</th>
                                <th className="px-6 py-4">Plano</th>
                                <th className="px-6 py-4">Cadastro</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-white/5 bg-navy-deep">
                            {filteredUsers.map(user => (
                                <tr key={user.id} className="hover:bg-white/5 transition-colors">
                                    <td className="px-6 py-4">
                                        <p className="font-medium text-white">{user.name}</p>
                                        <p className="text-xs text-gray-500">{getUserDisplayName(user)}</p>
                                    </td>
                                    <td className="px-6 py-4">
                                        <p className="truncate max-w-[150px]">{user.email}</p>
                                        <p className="text-xs text-gray-500">{user.phone}</p>
                                    </td>
                                    <td className="px-6 py-4">
                                        {user.instagramUrl && <div className="truncate max-w-[120px] text-xs text-gray-400">IG: {user.instagramUrl.split('.com/')[1]}</div>}
                                        {user.tiktokUrl && <div className="truncate max-w-[120px] text-xs text-gray-400">TT: {user.tiktokUrl.split('.com/')[1]}</div>}
                                    </td>
                                    <td className="px-6 py-4"><Badge label={user.plan} tier={user.plan === 'Hitmaker' ? 'gold' : 'silver'} /></td>
                                    <td className="px-6 py-4 text-xs text-gray-500 font-mono">{user.joined}</td>
                                </tr>
                            ))}
                             {filteredUsers.length === 0 && (
                                <tr><td colSpan={5} className="text-center py-8 text-gray-500 italic">Nenhum lead encontrado.</td></tr>
                            )}
                        </tbody>
                    </table>
                </TableResponsiveWrapper>
            </Card.Body>
        </Card>
    );
};

const ManageUsers: React.FC<ManageUsersProps> = ({ allUsers, missionSubmissions, onUpdateUser, onPunishUser, onUnbanUser, onResetMonthlyRanking, onViewUserHistory }) => {
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [punishingUser, setPunishingUser] = useState<User | null>(null);
  const [isResetModalOpen, setIsResetModalOpen] = useState(false);
  const [isClosingMonthly, setIsClosingMonthly] = useState(false);
  const [monthlyTop, setMonthlyTop] = useState<any[]>([]);
  const [award1, setAward1] = useState<number>(5000);
  const [award2, setAward2] = useState<number>(3000);
  const [award3, setAward3] = useState<number>(1500);
  const [searchTerm, setSearchTerm] = useState('');
  const [subscriptionFilter, setSubscriptionFilter] = useState('all');
  const [activeTab, setActiveTab] = useState<'list' | 'metrics' | 'leads'>('list');
  const [userToUnban, setUserToUnban] = useState<User | null>(null);

  const loadMonthlyPreview = async () => {
    const supabase = getSupabase();
    if (!supabase) {
      toast.error('Supabase não disponível.');
      return;
    }
    try {
      const { data, error } = await supabase.rpc('admin_preview_monthly_ranking', { p_top_n: 3 });
      if (error) throw error;
      const top = Array.isArray((data as any)?.top) ? (data as any).top : [];
      setMonthlyTop(top);
    } catch (e: any) {
      toast.error(e?.message || 'Falha ao carregar Top 3 mensal.');
      setMonthlyTop([]);
    }
  };

  const openMonthlyResetModal = async () => {
    setIsResetModalOpen(true);
    setMonthlyTop([]);
    await loadMonthlyPreview();
  };

  const confirmCloseMonthly = async () => {
    const supabase = getSupabase();
    if (!supabase) {
      toast.error('Supabase não disponível.');
      return;
    }
    setIsClosingMonthly(true);
    try {
      const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
      if (sessionError) throw sessionError;
      if (!sessionData?.session?.access_token) {
        throw new Error('Admin não autenticado');
      }
      const awards = [
        { position: 1, coins: Number(award1) || 0 },
        { position: 2, coins: Number(award2) || 0 },
        { position: 3, coins: Number(award3) || 0 },
      ];
      const { data, error } = await supabase.rpc(
        'admin_close_monthly_ranking_and_award',
        {
          p_awards: awards,
          p_ref_id: crypto.randomUUID(),
        },
        {
          headers: {
            Authorization: `Bearer ${sessionData.session.access_token}`,
          },
        },
      );
      if (error) {
        console.error('[admin_close_monthly_ranking_and_award] error:', error);
        throw error;
      }

      toast.success('Ciclo mensal fechado e premiação registrada!');
      setIsResetModalOpen(false);
      // ✅ apenas refresh do adminData (não chama lógica antiga)
      await onResetMonthlyRanking();
    } catch (e: any) {
      // Mostra erro completo do PostgREST/Supabase
      const msg = e?.message ?? 'Falha ao fechar ranking mensal.';
      const details = e?.details ? ` • ${e.details}` : '';
      const hint = e?.hint ? ` • hint: ${e.hint}` : '';
      const code = e?.code ? ` • code: ${e.code}` : '';
      toast.error(`${msg}${details}${hint}${code}`);
      console.error('[confirmCloseMonthly] full error:', e);
    } finally {
      setIsClosingMonthly(false);
    }
  };

  const filteredUsers = useMemo(() => {
    return allUsers.filter(user => {
      const lowercasedFilter = searchTerm.toLowerCase();
      const matchesSearch = !searchTerm ||
        user.name.toLowerCase().includes(lowercasedFilter) ||
        getUserDisplayName(user).toLowerCase().includes(lowercasedFilter) ||
        user.email.toLowerCase().includes(lowercasedFilter);

      const matchesPlan = subscriptionFilter === 'all' || user.plan === subscriptionFilter;

      return matchesSearch && matchesPlan;
    });
  }, [allUsers, searchTerm, subscriptionFilter]);
  
  const handleSaveAndClose = (user: User) => {
    onUpdateUser(user);
    setEditingUser(null);
  }

  const handleSavePunishment = async (payload: { userId: string; type: PunishmentType; reason: string; durationDays?: number; deduction?: { coins?: number; xp?: number; } }) => {
    await onPunishUser(payload);
    setPunishingUser(null);
  };

  const handleConfirmUnban = async () => {
    if (userToUnban) {
      await onUnbanUser(userToUnban.id);
      setUserToUnban(null);
    }
  };

  return (
    <>
      <Tabs 
        items={[
            { id: 'list', label: 'Lista de Usuários' },
            { id: 'metrics', label: 'Métricas' },
            { id: 'leads', label: 'Leads Captados' }
        ]}
        activeTab={activeTab}
        onChange={(id) => setActiveTab(id as any)}
        variant="solid"
        className="mb-6"
      />
      
      {activeTab === 'list' && (
        <Card className="bg-slate-dark border-white/5 shadow-lg">
            <Card.Header className="border-white/5">
                <Toolbar 
                    start={
                        <div className="flex flex-col sm:flex-row gap-4 w-full md:w-auto items-center">
                             <Input 
                                placeholder="Buscar usuário..." 
                                icon={<SearchIcon className="w-4 h-4" />} 
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="w-full sm:w-64 bg-navy-deep border-white/10 text-white"
                             />
                             <Select 
                                options={[
                                    { value: 'all', label: 'Todos os Planos' },
                                    { value: 'Free Flow', label: 'Free Flow' },
                                    { value: 'Artista em Ascensão', label: 'Ascensão' },
                                    { value: 'Artista Profissional', label: 'Profissional' },
                                    { value: 'Hitmaker', label: 'Hitmaker' },
                                ]}
                                value={subscriptionFilter}
                                onChange={(v) => setSubscriptionFilter(String(v))}
                                className="w-full sm:w-48 bg-navy-deep border-white/10 text-white"
                             />
                        </div>
                    }
                    end={
                        <Button variant="danger" size="sm" onClick={openMonthlyResetModal} className="bg-red-900/20 border border-red-500/30 text-red-400 hover:bg-red-900/40">
                            Zerar Ranking Mensal
                        </Button>
                    }
                />
            </Card.Header>

            <Card.Body noPadding>
                <TableResponsiveWrapper className="border border-white/5 rounded-xl overflow-hidden">
                    <table className="w-full text-sm text-left text-gray-300">
                        <thead className="text-xs text-gray-500 uppercase bg-navy-deep/80 border-b border-white/5">
                            <tr>
                                <th className="px-6 py-4">Usuário</th>
                                <th className="px-6 py-4">Plano</th>
                                <th className="px-6 py-4">Progresso</th>
                                <th className="px-6 py-4">Saldo</th>
                                <th className="px-6 py-4">Missões</th>
                                <th className="px-6 py-4 text-right">Ações</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-white/5 bg-navy-deep">
                            {filteredUsers.map(user => (
                                <tr key={user.id} className={`hover:bg-white/5 transition-colors ${user.isBanned ? 'bg-red-900/10 border-l-2 border-red-500' : ''}`}>
                                    <td className="px-6 py-4">
                                        <div className="flex items-center">
                                            <AvatarWithFrame user={user} sizeClass="w-10 h-10" className="mr-3" />
                                            <div>
                                                <div className="font-medium text-white">{user.name}</div>
                                                <div className="text-xs text-gray-500 truncate max-w-[150px]">{user.email}</div>
                                                {user.isBanned && <span className="text-[10px] font-bold text-red-500 uppercase tracking-widest mt-1 block">BANIDO</span>}
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4">
                                        <Badge 
                                            label={user.plan} 
                                            tier={user.plan === 'Hitmaker' ? 'gold' : user.plan.includes('Profissional') ? 'silver' : 'bronze'} 
                                        />
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="flex flex-col">
                                            <span className="font-bold text-white font-chakra">Lvl {user.level}</span>
                                            <span className="text-xs text-gray-500 font-mono">{ (user.xp - xpForLevelStart(user.level)).toLocaleString('pt-BR') } XP</span>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="font-bold text-gold-cinematic font-mono">{user.coins.toLocaleString('pt-BR')} LC</div>
                                    </td>
                                    <td className="px-6 py-4 text-gray-400">
                                        <span className="text-white font-bold">{user.monthlyMissionsCompleted}</span>
                                        <span className="text-gray-600 mx-1">/</span>
                                        <span className="text-gray-500">{user.totalMissionsCompleted}</span>
                                    </td>
                                    <td className="px-6 py-4 text-right">
                                        <div className="flex justify-end gap-2 opacity-70 group-hover:opacity-100 transition-opacity">
                                            <Button variant="ghost" size="sm" onClick={() => setEditingUser(user)} className="text-gold-cinematic hover:bg-gold-cinematic/10 border border-transparent hover:border-gold-cinematic/30">
                                                <EditIcon className="w-4 h-4" />
                                            </Button>
                                            <Button variant="ghost" size="sm" onClick={() => onViewUserHistory(user)} className="text-neon-cyan hover:bg-neon-cyan/10 border border-transparent hover:border-neon-cyan/30">
                                                <HistoryIcon className="w-4 h-4" />
                                            </Button>
                                            {user.isBanned ? (
                                                <Button variant="ghost" size="sm" onClick={() => setUserToUnban(user)} className="text-green-400 hover:bg-green-500/10 border border-transparent">
                                                    <ShieldIcon className="w-4 h-4" />
                                                </Button>
                                            ) : (
                                                <Button variant="ghost" size="sm" onClick={() => setPunishingUser(user)} className="text-red-500 hover:bg-red-500/10 border border-transparent">
                                                    <ShieldIcon className="w-4 h-4" />
                                                </Button>
                                            )}
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </TableResponsiveWrapper>
            </Card.Body>
        </Card>
      )}
      
      {activeTab === 'metrics' && (
        <div className="animate-fade-in-up">
            <UserMetricsDashboard allUsers={allUsers} missionSubmissions={missionSubmissions} />
        </div>
      )}

      {activeTab === 'leads' && (
        <div className="animate-fade-in-up">
            <LeadsTable users={allUsers} />
        </div>
      )}
      
      {editingUser && (
        <AdminUserEditModal 
            user={editingUser}
            onClose={() => setEditingUser(null)}
            onSave={handleSaveAndClose}
        />
      )}
      {punishingUser && (
        <AdminPunishmentModal
            user={punishingUser}
            onClose={() => setPunishingUser(null)}
            onSave={handleSavePunishment}
        />
      )}
      {isResetModalOpen && (
        <ModalPortal>
          <div
            className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/90 backdrop-blur-sm"
            onClick={() => !isClosingMonthly && setIsResetModalOpen(false)}
          >
            <div
              className="bg-[#0E0E0E] rounded-2xl border border-gold-cinematic/30 w-full max-w-2xl p-6 shadow-[0_0_60px_rgba(246,197,96,0.12)]"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-xl font-black text-white uppercase tracking-wide">Fechar Ranking Mensal</h3>
                <button
                  onClick={() => !isClosingMonthly && setIsResetModalOpen(false)}
                  className="text-gray-400 hover:text-white px-2 py-1 rounded hover:bg-white/10"
                >
                  ✕
                </button>
              </div>

              <p className="text-sm text-white/60">
                Confira o Top 3 do mês e defina a premiação em coins. Ao confirmar, o ciclo mensal é fechado e o mês reinicia.
              </p>

              <div className="mt-5 grid grid-cols-1 md:grid-cols-3 gap-3">
                {[0, 1, 2].map((idx) => {
                  const t = monthlyTop?.[idx];
                  const pos = idx + 1;
                  const fallbackName = t?.display_name || `Top ${pos}`;
                  const avatar = t?.avatar_url || '';
                  const xp = Number(t?.monthly_xp ?? 0);
                  const level = Number(t?.monthly_level ?? 1);
                  const value = pos === 1 ? award1 : pos === 2 ? award2 : award3;
                  const setValue = pos === 1 ? setAward1 : pos === 2 ? setAward2 : setAward3;

                  return (
                    <div key={pos} className="rounded-xl border border-white/10 bg-black/30 p-4">
                      <p className="text-[10px] text-white/40 uppercase font-black tracking-[0.35em] mb-2">
                        TOP {pos}
                      </p>
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg overflow-hidden border border-white/10 bg-white/5">
                          {avatar ? <img src={avatar} className="w-full h-full object-cover" /> : null}
                        </div>
                        <div className="min-w-0">
                          <p className="text-white font-black truncate">{fallbackName}</p>
                          <p className="text-xs text-white/50 font-mono">
                            Lvl {level} • {xp} XP
                          </p>
                        </div>
                      </div>
                      <div className="mt-3">
                        <label className="text-[10px] text-white/40 uppercase font-bold tracking-widest">Premiar (LC)</label>
                        <input
                          type="number"
                          min={0}
                          value={value}
                          onChange={(e) => setValue(Number(e.target.value))}
                          className="mt-2 w-full bg-[#0F1115] border border-[#2A2D33] rounded-lg px-3 py-2 text-white outline-none"
                        />
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className="flex justify-end gap-3 mt-6 pt-4 border-t border-white/10">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => !isClosingMonthly && setIsResetModalOpen(false)}
                  className="bg-gray-800 hover:bg-gray-700 text-white"
                  disabled={isClosingMonthly}
                >
                  Cancelar
                </Button>
                <Button
                  variant="primary"
                  size="sm"
                  onClick={confirmCloseMonthly}
                  className="bg-gold-cinematic text-black hover:shadow-[0_0_30px_rgba(246,197,96,0.25)]"
                  disabled={isClosingMonthly}
                >
                  {isClosingMonthly ? 'Processando...' : 'Confirmar e Premiar'}
                </Button>
              </div>
            </div>
          </div>
        </ModalPortal>
      )}
      <ConfirmationModal
        isOpen={!!userToUnban}
        onClose={() => setUserToUnban(null)}
        onConfirm={handleConfirmUnban}
        title="Confirmar Desbanimento"
        message={<>Você tem certeza que deseja remover o banimento de <span className="font-bold text-white">{userToUnban?.name}</span>? O acesso do usuário será restaurado imediatamente.</>}
        confirmButtonText="Sim, Desbanir"
        confirmButtonClass="bg-green-600 hover:bg-green-500"
      />
    </>
  );
};

export default ManageUsers;
