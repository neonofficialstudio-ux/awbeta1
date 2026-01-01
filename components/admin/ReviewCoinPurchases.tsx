
import React, { useState, useMemo } from 'react';
import type { CoinPurchaseRequest, CoinPurchaseStatus, User } from '../../types';
import AvatarWithFrame from '../AvatarWithFrame';
import { CoinIcon } from '../../constants';
import { safeString } from '../../api/helpers';

// Icons for Stat Cards
const DollarSignIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
    <svg {...props} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8v1m0 6v1m6-1a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
);

const ClockIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
    <svg {...props} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
);

const StatCard: React.FC<{ title: string; value: string; icon: React.ElementType }> = ({ title, value, icon: Icon }) => (
    <div className="bg-[#181818] p-5 rounded-xl border border-gray-700 flex items-center">
        <div className="p-3 bg-gray-800 rounded-lg mr-4">
            <Icon className="w-6 h-6 text-goldenYellow-400" />
        </div>
        <div>
            <p className="text-sm text-gray-400">{title}</p>
            <p className="text-2xl font-bold text-white">{value}</p>
        </div>
    </div>
);


interface ReviewCoinPurchasesProps {
    requests: CoinPurchaseRequest[];
    onReview: (requestId: string, status: 'approved' | 'rejected') => void;
    allUsers: User[];
    onAdminSubmitPaymentLink: (requestId: string, paymentLink: string) => void;
}

const Pagination: React.FC<{
    totalItems: number;
    itemsPerPage: number;
    currentPage: number;
    onPageChange: (page: number) => void;
}> = ({ totalItems, itemsPerPage, currentPage, onPageChange }) => {
    const totalPages = Math.ceil(totalItems / itemsPerPage);
    if (totalPages <= 1) return null;

    const pageNumbers = [];
    const pagesToShow = 5;
    let startPage = Math.max(1, currentPage - Math.floor(pagesToShow / 2));
    let endPage = Math.min(totalPages, startPage + pagesToShow - 1);
    
    if (endPage - startPage + 1 < pagesToShow) {
        startPage = Math.max(1, endPage - pagesToShow + 1);
    }

    for (let i = startPage; i <= endPage; i++) {
        pageNumbers.push(i);
    }

    return (
        <div className="flex justify-center items-center space-x-2 mt-4">
            <button
                onClick={() => onPageChange(currentPage - 1)}
                disabled={currentPage === 1}
                className="px-3 py-1 bg-gray-700 rounded-md disabled:opacity-50"
            >
                Anterior
            </button>
            {startPage > 1 && (
                <>
                    <button onClick={() => onPageChange(1)} className="px-3 py-1 bg-gray-700 rounded-md">1</button>
                    {startPage > 2 && <span className="text-gray-500">...</span>}
                </>
            )}
            {pageNumbers.map(number => (
                <button
                    key={number}
                    onClick={() => onPageChange(number)}
                    className={`px-3 py-1 rounded-md ${currentPage === number ? 'bg-goldenYellow-500 text-black' : 'bg-gray-700'}`}
                >
                    {number}
                </button>
            ))}
            {endPage < totalPages && (
                <>
                    {endPage < totalPages - 1 && <span className="text-gray-500">...</span>}
                    <button onClick={() => onPageChange(totalPages)} className="px-3 py-1 bg-gray-700 rounded-md">{totalPages}</button>
                </>
            )}
            <button
                onClick={() => onPageChange(currentPage + 1)}
                disabled={currentPage === totalPages}
                className="px-3 py-1 bg-gray-700 rounded-md disabled:opacity-50"
            >
                Próximo
            </button>
        </div>
    );
};


const StatusBadge: React.FC<{ status: CoinPurchaseStatus }> = ({ status }) => {
    const styles: Record<CoinPurchaseStatus, string> = {
        pending_link_generation: 'bg-blue-500/20 text-blue-300',
        pending_payment: 'bg-yellow-500/20 text-yellow-400',
        awaiting_proof: 'bg-yellow-500/20 text-yellow-400',
        pending_approval: 'bg-orange-500/20 text-orange-400',
        approved: 'bg-green-500/20 text-green-400',
        rejected: 'bg-red-500/20 text-red-400',
        cancelled: 'bg-gray-500/20 text-gray-400',
    };
    const text: Record<CoinPurchaseStatus, string> = {
        pending_link_generation: 'Aguardando Link',
        pending_payment: 'Aguardando Pagamento',
        awaiting_proof: 'Aguardando Comprovante',
        pending_approval: 'Aguardando Aprovação',
        approved: 'Aprovado',
        rejected: 'Rejeitado',
        cancelled: 'Cancelado',
    };
    // @ts-ignore
    return <span className={`px-2 py-1 text-xs font-semibold rounded-full ${styles[status] || 'bg-gray-500/20 text-gray-400'}`}>{text[status] || status}</span>
};

const ReviewCoinPurchases: React.FC<ReviewCoinPurchasesProps> = ({ requests, onReview, allUsers, onAdminSubmitPaymentLink }) => {
    const [proofModalUrl, setProofModalUrl] = useState<string | null>(null);
    const [paymentLinks, setPaymentLinks] = useState<Record<string, string>>({});
    const [currentPage, setCurrentPage] = useState(1);
    const ITEMS_PER_PAGE = 10;

    const customRequests = useMemo(() => requests
        .filter(s => safeString(s.packId).startsWith('custom-') && !['approved', 'rejected', 'cancelled'].includes(s.status))
        .sort((a,b) => new Date(b.requestedAt).getTime() - new Date(a.requestedAt).getTime()), [requests]);

    // FIX-PACK LOJA V1.0: Filter for pending approvals OR proof_submitted alias
    const pendingApproval = useMemo(() => requests.filter(s => 
        s.status === 'pending_approval' || s.status === 'proof_submitted' as any
    ), [requests]);
    
    const history = useMemo(() => requests
        .filter(s => {
            const isCustom = safeString(s.packId).startsWith('custom-');
            const isComplete = ['approved', 'rejected', 'cancelled'].includes(s.status);
            // Include if it's a completed request (custom or not)
            // OR if it's a standard pack request that is not pending final approval
            return isComplete || (!isCustom && s.status !== 'pending_approval');
        })
        .sort((a,b) => new Date(b.requestedAt).getTime() - new Date(a.requestedAt).getTime()), [requests]);

    const paginatedHistory = history.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE);
    
    const stats = useMemo(() => {
        const approved = requests.filter(r => r.status === 'approved');
        const pending = requests.filter(r => r.status === 'pending_approval' || r.status === 'proof_submitted' as any);

        const totalRevenue = approved.reduce((sum, r) => sum + r.price, 0);
        const totalCoinsDistributed = approved.reduce((sum, r) => sum + r.coins, 0);
        const pendingRevenue = pending.reduce((sum, r) => sum + r.price, 0);

        return {
            totalRevenue,
            totalCoinsDistributed,
            pendingRequestsCount: pending.length,
            pendingRevenue,
        };
    }, [requests]);

    const handleLinkChange = (requestId: string, value: string) => {
        setPaymentLinks(prev => ({ ...prev, [requestId]: value }));
    };

    const handleSubmitLink = (requestId: string) => {
        const link = paymentLinks[requestId];
        if (link && link.trim() !== '') {
            onAdminSubmitPaymentLink(requestId, link.trim());
        }
    };


    return (
        <div className="space-y-8">
            <div className="mb-8">
                <h3 className="text-xl font-bold mb-4">Estatísticas de Compra</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    <StatCard title="Faturamento Total" value={`R$ ${stats.totalRevenue.toFixed(2).replace('.', ',')}`} icon={DollarSignIcon} />
                    <StatCard title="Moedas Distribuidas" value={stats.totalCoinsDistributed.toLocaleString('pt-BR')} icon={CoinIcon} />
                    <StatCard title="Pedidos Pendentes" value={stats.pendingRequestsCount.toString()} icon={ClockIcon} />
                    <StatCard title="Receita Pendente" value={`R$ ${stats.pendingRevenue.toFixed(2).replace('.', ',')}`} icon={DollarSignIcon} />
                </div>
            </div>

            {customRequests.length > 0 && (
                 <div className="bg-[#121212] p-6 rounded-xl border border-blue-500/50">
                    <h3 className="text-xl font-bold mb-6 text-blue-300">Pedidos Personalizados Ativos ({customRequests.length})</h3>
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm text-left text-gray-400">
                             <thead className="text-xs text-gray-300 uppercase bg-gray-800/50">
                                <tr>
                                    <th scope="col" className="px-6 py-3">Usuário</th>
                                    <th scope="col" className="px-6 py-3">Moedas / Preço</th>
                                    <th scope="col" className="px-6 py-3">Data</th>
                                    <th scope="col" className="px-6 py-3">Status</th>
                                    <th scope="col" className="px-6 py-3">Link/Ação</th>
                                </tr>
                            </thead>
                             <tbody>
                                {customRequests.map(req => (
                                    <tr key={req.id} className="bg-[#181818] border-b border-gray-800 hover:bg-gray-800/50">
                                        <td className="px-6 py-4 font-medium text-white">{req.userName}</td>
                                        <td className="px-6 py-4">
                                            <div>{req.coins.toLocaleString('pt-BR')} moedas</div>
                                            <div className="font-bold text-goldenYellow-400">R$ {req.price.toFixed(2).replace('.',',')}</div>
                                        </td>
                                        <td className="px-6 py-4">{new Date(req.requestedAt).toLocaleString('pt-BR')}</td>
                                        <td className="px-6 py-4"><StatusBadge status={req.status}/></td>
                                        <td className="px-6 py-4">
                                            {req.status === 'pending_link_generation' ? (
                                                <div className="flex items-center gap-2">
                                                    <input
                                                        type="url"
                                                        placeholder="Cole o link de pagamento aqui"
                                                        value={paymentLinks[req.id] || ''}
                                                        onChange={(e) => handleLinkChange(req.id, e.target.value)}
                                                        className="w-full bg-gray-900 border border-gray-700 rounded-lg py-1 px-2 text-white focus:outline-none focus:ring-1 focus:ring-goldenYellow-500"
                                                    />
                                                    <button 
                                                        onClick={() => handleSubmitLink(req.id)}
                                                        disabled={!paymentLinks[req.id]?.trim()}
                                                        className="bg-blue-600 text-white font-bold py-1 px-3 rounded-md text-sm hover:bg-blue-500 disabled:bg-gray-600 disabled:cursor-not-allowed whitespace-nowrap"
                                                    >
                                                        Enviar
                                                    </button>
                                                </div>
                                            ) : req.paymentLink ? (
                                                <a href={req.paymentLink} target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:underline text-xs truncate block max-w-xs">{req.paymentLink}</a>
                                            ) : (
                                                <span className="text-gray-500">N/A</span>
                                            )}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            <div className="bg-[#121212] p-6 rounded-xl border border-gray-800">
                <h3 className="text-xl font-bold mb-6">Pedidos de Pacotes Pendentes ({pendingApproval.length})</h3>
                <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left text-gray-400">
                        <thead className="text-xs text-gray-300 uppercase bg-gray-800/50">
                            <tr>
                                <th scope="col" className="px-6 py-3">Usuário</th>
                                <th scope="col" className="px-6 py-3">Pacote</th>
                                <th scope="col" className="px-6 py-3">Data do Pedido</th>
                                <th scope="col" className="px-6 py-3">Comprovante</th>
                                <th scope="col" className="px-6 py-3">Ações</th>
                            </tr>
                        </thead>
                        <tbody>
                            {pendingApproval.length > 0 ? (
                                pendingApproval.map(req => (
                                     <tr key={req.id} className="bg-[#181818] border-b border-gray-800 hover:bg-gray-800/50">
                                        <td className="px-6 py-4 font-medium text-white">{req.userName}</td>
                                        <td className="px-6 py-4">{req.packName}</td>
                                        <td className="px-6 py-4">{new Date(req.requestedAt).toLocaleString('pt-BR')}</td>
                                        <td className="px-6 py-4">
                                            <button onClick={() => setProofModalUrl(req.proofUrl!)} className="text-goldenYellow-400 hover:underline">Ver Prova</button>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex space-x-2">
                                                <button onClick={() => onReview(req.id, 'approved')} className="bg-green-500/80 text-white font-bold py-1 px-3 rounded-md text-sm hover:bg-green-500">Aprovar</button>
                                                <button onClick={() => onReview(req.id, 'rejected')} className="bg-red-500/80 text-white font-bold py-1 px-3 rounded-md text-sm hover:bg-red-500">Rejeitar</button>
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            ) : (
                                <tr><td colSpan={5} className="text-center py-8">Nenhum pedido pendente de aprovação.</td></tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            <div className="bg-[#121212] p-6 rounded-xl border border-gray-800">
                <h3 className="text-xl font-bold mb-6">Histórico de Compras de Lummi Coins</h3>
                <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left text-gray-400">
                        <thead className="text-xs text-gray-300 uppercase bg-gray-800/50">
                            <tr>
                                <th scope="col" className="px-6 py-3">Usuário</th>
                                <th scope="col" className="px-6 py-3">Pacote</th>
                                <th scope="col" className="px-6 py-3">Valor</th>
                                <th scope="col" className="px-6 py-3">Data do Pedido</th>
                                <th scope="col" className="px-6 py-3">Comprovante</th>
                                <th scope="col" className="px-6 py-3">Status</th>
                            </tr>
                        </thead>
                        <tbody>
                             {paginatedHistory.length > 0 ? (
                                paginatedHistory.map(req => (
                                     <tr key={req.id} className="bg-[#181818] border-b border-gray-800 hover:bg-gray-800/50">
                                        <td className="px-6 py-4 font-medium text-white">{req.userName}</td>
                                        <td className="px-6 py-4">{req.packName}</td>
                                        <td className="px-6 py-4 font-semibold text-goldenYellow-400">R$ {req.price.toFixed(2).replace('.', ',')}</td>
                                        <td className="px-6 py-4">{new Date(req.requestedAt).toLocaleString('pt-BR')}</td>
                                        <td className="px-6 py-4">
                                            {req.proofUrl ? (
                                                <button onClick={() => setProofModalUrl(req.proofUrl)} className="text-goldenYellow-400 hover:underline">Ver Prova</button>
                                            ) : (
                                                <span className="text-gray-500">N/A</span>
                                            )}
                                        </td>
                                        <td className="px-6 py-4"><StatusBadge status={req.status} /></td>
                                    </tr>
                                ))
                            ) : (
                                <tr><td colSpan={6} className="text-center py-8">Nenhuma compra no histórico.</td></tr>
                            )}
                        </tbody>
                    </table>
                </div>
                 <Pagination 
                    totalItems={history.length}
                    itemsPerPage={ITEMS_PER_PAGE}
                    currentPage={currentPage}
                    onPageChange={setCurrentPage}
                />
            </div>

            {proofModalUrl && (
                <div className="fixed inset-0 bg-black bg-opacity-80 flex items-center justify-center z-50" onClick={() => setProofModalUrl(null)}>
                    <div className="p-4 bg-gray-900 rounded-lg max-w-2xl max-h-[90vh]">
                        <img src={proofModalUrl} alt="Comprovante de pagamento" className="max-w-full max-h-full object-contain" />
                    </div>
                </div>
            )}
        </div>
    );
};

export default ReviewCoinPurchases;
