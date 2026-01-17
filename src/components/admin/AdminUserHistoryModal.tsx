import React, { useState, useMemo } from 'react';
import type { User, MissionSubmission, CoinTransaction, RedeemedItem, SubmissionStatus, RedemptionStatus, Punishment, PunishmentType } from '../../types';
import AvatarWithFrame from '../AvatarWithFrame';
import { getDisplayName } from '../../api/core/getDisplayName';

interface AdminUserHistoryModalProps {
  user: User;
  onClose: () => void;
  missionSubmissions: MissionSubmission[];
  coinTransactions: CoinTransaction[];
  redeemedItems: RedeemedItem[];
  punishments: Punishment[];
}

type HistoryTab = 'missions' | 'transactions' | 'redemptions' | 'subscriptions' | 'punishments';

const SubTabButton: React.FC<{ active: boolean; onClick: () => void; children: React.ReactNode }> = ({ active, onClick, children }) => (
    <button
        onClick={onClick}
        className={`px-4 py-2 font-semibold transition-colors text-sm rounded-t-lg ${
            active ? 'bg-[#181818] text-goldenYellow-400 border-t border-x border-gray-700' : 'text-gray-400 hover:text-white'
        }`}
    >
        {children}
    </button>
);

const StatusBadge: React.FC<{ status: SubmissionStatus | RedemptionStatus }> = ({ status }) => {
    const styles: Record<string, string> = {
        pending: 'bg-yellow-500/20 text-yellow-400',
        approved: 'bg-green-500/20 text-green-400',
        rejected: 'bg-red-500/20 text-red-400',
        Redeemed: 'bg-blue-500/20 text-blue-300',
        InProgress: 'bg-purple-500/20 text-purple-300',
        Used: 'bg-green-500/20 text-green-400',
        Refunded: 'bg-gray-500/20 text-gray-400',
    };
    const text: Record<string, string> = {
        pending: 'Pendente',
        approved: 'Aprovada',
        rejected: 'Rejeitada',
        Redeemed: 'Resgatado',
        InProgress: 'Em Andamento',
        Used: 'Concluído',
        Refunded: 'Reembolsado',
    };
    return <span className={`px-2 py-1 text-xs font-semibold rounded-full ${styles[status]}`}>{text[status]}</span>;
}

const PunishmentTypeBadge: React.FC<{ type: PunishmentType }> = ({ type }) => {
    const styles: Record<PunishmentType, string> = {
        warn: 'bg-yellow-500/20 text-yellow-400',
        deduct: 'bg-orange-500/20 text-orange-400',
        temp_ban: 'bg-red-500/20 text-red-400',
        perm_ban: 'bg-red-700/50 text-red-300',
    };
     const text: Record<PunishmentType, string> = {
        warn: 'Aviso',
        deduct: 'Dedução',
        temp_ban: 'Ban Temp.',
        perm_ban: 'Ban Perm.',
    };
    return <span className={`px-2 py-1 text-xs font-semibold rounded-full ${styles[type]}`}>{text[type]}</span>
};

const AdminUserHistoryModal: React.FC<AdminUserHistoryModalProps> = ({ user, onClose, missionSubmissions, coinTransactions, redeemedItems, punishments }) => {
  const [activeTab, setActiveTab] = useState<HistoryTab>('missions');

  const userMissions = useMemo(() => missionSubmissions.filter(s => s.userId === user.id).sort((a,b) => new Date(b.submittedAtISO).getTime() - new Date(a.submittedAtISO).getTime()), [missionSubmissions, user.id]);
  const userTransactions = useMemo(() => coinTransactions.filter(t => t.userId === user.id).sort((a,b) => new Date(b.dateISO).getTime() - new Date(a.dateISO).getTime()), [coinTransactions, user.id]);
  const userRedemptions = useMemo(() => redeemedItems.filter(r => r.userId === user.id).sort((a,b) => new Date(b.redeemedAt).getTime() - new Date(a.redeemedAt).getTime()), [redeemedItems, user.id]);
  const userSubscriptionHistory = useMemo(() => [...(user.subscriptionHistory || [])].sort((a,b) => new Date(b.changedAt).getTime() - new Date(a.changedAt).getTime()), [user.subscriptionHistory]);
  const userPunishments = useMemo(() => punishments.sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime()), [punishments]);

  const renderContent = () => {
    switch (activeTab) {
        case 'missions': return (
            <table className="w-full text-sm text-left text-gray-400">
                <thead className="text-xs text-gray-300 uppercase bg-gray-700/50"><tr><th className="px-4 py-2">Missão</th><th className="px-4 py-2">Data</th><th className="px-4 py-2">Status</th></tr></thead>
                <tbody>{userMissions.map(s => <tr key={s.id}><td className="px-4 py-2">{s.missionTitle}</td><td className="px-4 py-2">{new Date(s.submittedAtISO).toLocaleString('pt-BR')}</td><td className="px-4 py-2"><StatusBadge status={s.status}/></td></tr>)}</tbody>
            </table>
        );
        case 'transactions': return (
            <table className="w-full text-sm text-left text-gray-400">
                <thead className="text-xs text-gray-300 uppercase bg-gray-700/50"><tr><th className="px-4 py-2">Descrição</th><th className="px-4 py-2">Data</th><th className="px-4 py-2 text-right">Valor</th></tr></thead>
                <tbody>{userTransactions.map(t => <tr key={t.id}><td className="px-4 py-2">{t.description}</td><td className="px-4 py-2">{new Date(t.dateISO).toLocaleString('pt-BR')}</td><td className={`px-4 py-2 text-right font-bold ${t.amount >= 0 ? 'text-green-400' : 'text-red-400'}`}>{t.amount >= 0 ? '+' : ''}{t.amount.toLocaleString('pt-BR')}</td></tr>)}</tbody>
            </table>
        );
        case 'redemptions': return (
            <table className="w-full text-sm text-left text-gray-400">
                <thead className="text-xs text-gray-300 uppercase bg-gray-700/50"><tr><th className="px-4 py-2">Item</th><th className="px-4 py-2">Data</th><th className="px-4 py-2">Status</th></tr></thead>
                <tbody>{userRedemptions.map(r => <tr key={r.id}><td className="px-4 py-2">{r.itemName}</td><td className="px-4 py-2">{r.redeemedAt}</td><td className="px-4 py-2"><StatusBadge status={r.status}/></td></tr>)}</tbody>
            </table>
        );
        case 'subscriptions': return (
            <table className="w-full text-sm text-left text-gray-400">
                <thead className="text-xs text-gray-300 uppercase bg-gray-700/50"><tr><th className="px-4 py-2">Data</th><th className="px-4 py-2">Tipo</th><th className="px-4 py-2">De</th><th className="px-4 py-2">Para</th></tr></thead>
                <tbody>{userSubscriptionHistory.map(s => <tr key={s.id}><td className="px-4 py-2">{new Date(s.changedAt).toLocaleString('pt-BR')}</td><td className="px-4 py-2">{s.eventType}</td><td className="px-4 py-2">{s.oldPlan || 'Nenhum'}</td><td className="px-4 py-2 font-bold">{s.newPlan}</td></tr>)}</tbody>
            </table>
        );
        case 'punishments': return (
            <table className="w-full text-sm text-left text-gray-400">
                <thead className="text-xs text-gray-300 uppercase bg-gray-700/50"><tr><th className="px-4 py-2">Data</th><th className="px-4 py-2">Tipo</th><th className="px-4 py-2">Detalhes</th><th className="px-4 py-2">Motivo</th></tr></thead>
                <tbody>
                    {userPunishments.map(p => (
                        <tr key={p.id}>
                            <td className="px-4 py-2">{new Date(p.date).toLocaleString('pt-BR')}</td>
                            <td className="px-4 py-2"><PunishmentTypeBadge type={p.type}/></td>
                            <td className="px-4 py-2">
                                {p.type === 'deduct' && `-${p.deduction?.coins || 0} Coins, -${p.deduction?.xp || 0} XP`}
                                {p.type === 'temp_ban' && `${p.durationDays} dia(s)`}
                            </td>
                            <td className="px-4 py-2">{p.reason}</td>
                        </tr>
                    ))}
                </tbody>
            </table>
        );
        default: return null;
    }
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div 
        className="bg-[#121212] rounded-xl border border-gray-800 p-6 md:p-8 max-w-4xl w-full"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-6">
            <div className="flex items-center">
                <AvatarWithFrame user={user} sizeClass="w-16 h-16" className="mr-4" />
                <div>
                    <h2 className="text-2xl font-bold text-goldenYellow-400">{user.name}</h2>
                    <p className="text-gray-400">{getDisplayName({ ...user, artistic_name: user.artisticName })} • {user.plan}</p>
                </div>
            </div>
          <button onClick={onClose} className="text-gray-500 hover:text-white text-3xl font-bold">&times;</button>
        </div>
        
        <div>
            <div className="flex border-b border-gray-700">
                <SubTabButton active={activeTab === 'missions'} onClick={() => setActiveTab('missions')}>Missões</SubTabButton>
                <SubTabButton active={activeTab === 'transactions'} onClick={() => setActiveTab('transactions')}>Transações</SubTabButton>
                <SubTabButton active={activeTab === 'redemptions'} onClick={() => setActiveTab('redemptions')}>Resgates</SubTabButton>
                <SubTabButton active={activeTab === 'subscriptions'} onClick={() => setActiveTab('subscriptions')}>Assinaturas</SubTabButton>
                <SubTabButton active={activeTab === 'punishments'} onClick={() => setActiveTab('punishments')}>Punições</SubTabButton>
            </div>
            <div className="bg-[#181818] p-4 rounded-b-xl rounded-r-xl border-x border-b border-gray-700 max-h-[60vh] overflow-y-auto">
                {renderContent()}
            </div>
        </div>
      </div>
    </div>
  );
};

export default AdminUserHistoryModal;
