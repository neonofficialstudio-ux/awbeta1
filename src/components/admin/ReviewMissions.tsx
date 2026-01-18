
import React, { useState } from 'react';
import type { MissionSubmission, SubmissionStatus, User } from '../../types';
import AvatarWithFrame from '../AvatarWithFrame';
import { CheckIcon, DeleteIcon } from '../../constants';
import ConfirmationModal from './ConfirmationModal';
import { fetchMissionSubmissionProofUrl } from '../../api/supabase/missionsProof';
import { config } from '../../core/config';


interface ReviewMissionsProps {
    missionSubmissions: MissionSubmission[];
    onReview: (submissionId: string, status: 'approved' | 'rejected') => Promise<void>;
    onEditStatus: (submissionId: string, newStatus: SubmissionStatus) => Promise<void>;
    allUsers: User[];
    onBatchApprove: () => Promise<void>;
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


const StatusBadge: React.FC<{ status: SubmissionStatus }> = ({ status }) => {
    const styles = {
        pending: 'bg-yellow-500/20 text-yellow-400',
        approved: 'bg-green-500/20 text-green-400',
        rejected: 'bg-red-500/20 text-red-400',
    };
    const text = {
        pending: 'Pendente',
        approved: 'Aprovada',
        rejected: 'Rejeitada',
    }
    return <span className={`px-2 py-1 text-xs font-semibold rounded-full ${styles[status]}`}>{text[status]}</span>
}

const ActionButton: React.FC<{ onClick: () => void; title: string; children: React.ReactNode; className?: string; disabled?: boolean; }> = ({ onClick, title, children, className = '', disabled }) => (
    <button
        onClick={onClick}
        title={title}
        disabled={disabled}
        className={`p-2 rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${className}`}
    >
        {children}
    </button>
);

const ReviewMissions: React.FC<ReviewMissionsProps> = ({ missionSubmissions, onReview, onEditStatus, allUsers, onBatchApprove }) => {
    const [proofModalUrl, setProofModalUrl] = useState<string | null>(null);
    const [processingId, setProcessingId] = useState<string | null>(null);
    const [isBatchApproving, setIsBatchApproving] = useState(false);
    const [isConfirmBatchOpen, setIsConfirmBatchOpen] = useState(false);
    const [isProofLoading, setIsProofLoading] = useState(false);

    const [pendingPage, setPendingPage] = useState(1);
    const [historyPage, setHistoryPage] = useState(1);
    const ITEMS_PER_PAGE = 5;

    const handleReview = async (submissionId: string, status: 'approved' | 'rejected') => {
        setProcessingId(submissionId);
        await onReview(submissionId, status);
        setProcessingId(null);
    };

    const handleEditStatus = async (submissionId: string, status: SubmissionStatus) => {
        setProcessingId(submissionId);
        await onEditStatus(submissionId, status);
        setProcessingId(null);
    };

    const handleBatchApprove = async () => {
        setIsConfirmBatchOpen(false);
        setIsBatchApproving(true);
        await onBatchApprove();
        setIsBatchApproving(false);
    };

    const handleShowProof = async (submission: MissionSubmission) => {
        if (config.backendProvider !== 'supabase') {
            setProofModalUrl(submission.proofUrl);
            return;
        }

        setIsProofLoading(true);
        try {
            const proofUrl = await fetchMissionSubmissionProofUrl(submission.id);
            if (proofUrl) {
                setProofModalUrl(proofUrl);
            } else {
                console.warn('[ReviewMissions] Proof URL not found for submission', submission.id);
            }
        } catch (err) {
            console.error('[ReviewMissions] Failed to fetch proof URL', err);
        } finally {
            setIsProofLoading(false);
        }
    };

    const pendingSubmissions = missionSubmissions.filter(s => s.status === 'pending');
    const reviewedSubmissions = missionSubmissions.filter(s => s.status !== 'pending').sort((a,b) => a.submittedAt < b.submittedAt ? 1 : -1);

    const paginatedPending = pendingSubmissions.slice((pendingPage - 1) * ITEMS_PER_PAGE, pendingPage * ITEMS_PER_PAGE);
    const paginatedHistory = reviewedSubmissions.slice((historyPage - 1) * ITEMS_PER_PAGE, historyPage * ITEMS_PER_PAGE);


    const SubmissionRow: React.FC<{ submission: MissionSubmission; isHistory?: boolean }> = ({ submission, isHistory = false }) => {
        const user = allUsers.find(u => u.id === submission.userId);
        const isProcessing = processingId === submission.id;

        return (
            <tr className="bg-[#181818] border-b border-gray-800 hover:bg-gray-800/50">
                <td className="px-6 py-4">
                    {user ? (
                        <div className="flex items-center">
                            <AvatarWithFrame user={user} sizeClass="w-10 h-10" className="mr-3" />
                            <div>
                                <div className="font-medium text-white">{submission.userName}</div>
                                <div className="text-xs text-gray-500">ID: {submission.userId}</div>
                            </div>
                        </div>
                    ) : (
                        <div className="font-medium text-white">{submission.userName}</div>
                    )}
                </td>
                <td className="px-6 py-4">{submission.missionTitle}</td>
                <td className="px-6 py-4">{submission.submittedAt}</td>
                <td className="px-6 py-4">
                    <button
                        onClick={() => handleShowProof(submission)}
                        disabled={isProofLoading}
                        className="text-goldenYellow-400 hover:underline disabled:opacity-60"
                    >
                        {isProofLoading ? 'Carregando...' : 'Ver Prova'}
                    </button>
                </td>
                <td className="px-6 py-4">
                    <StatusBadge status={submission.status} />
                </td>
                <td className="px-6 py-4">
                    {isHistory ? (
                        <div className="flex space-x-1">
                            {submission.status !== 'approved' && 
                                <ActionButton onClick={() => handleEditStatus(submission.id, 'approved')} disabled={isProcessing} title="Aprovar" className="text-green-400 hover:bg-green-500/20">
                                    {isProcessing ? <div className="w-5 h-5 border-2 border-t-transparent rounded-full animate-spin"></div> : <CheckIcon className="w-5 h-5" />}
                                </ActionButton>
                            }
                            {submission.status !== 'rejected' && 
                                <ActionButton onClick={() => handleEditStatus(submission.id, 'rejected')} disabled={isProcessing} title="Rejeitar" className="text-red-500 hover:bg-red-500/20">
                                     {isProcessing ? <div className="w-5 h-5 border-2 border-t-transparent rounded-full animate-spin"></div> : <DeleteIcon className="w-5 h-5" />}
                                </ActionButton>
                            }
                        </div>
                    ) : (
                        <div className="flex space-x-2">
                            <button onClick={() => handleReview(submission.id, 'approved')} disabled={isProcessing} className="bg-green-500/80 text-white font-bold py-1 px-3 rounded-md text-sm hover:bg-green-500 w-24 h-8 flex justify-center items-center">
                                {isProcessing ? <div className="w-5 h-5 border-2 border-t-transparent border-white rounded-full animate-spin"></div> : 'Aprovar'}
                            </button>
                            <button onClick={() => handleReview(submission.id, 'rejected')} disabled={isProcessing} className="bg-red-500/80 text-white font-bold py-1 px-3 rounded-md text-sm hover:bg-red-500 w-24 h-8 flex justify-center items-center">
                                {isProcessing ? <div className="w-5 h-5 border-2 border-t-transparent border-white rounded-full animate-spin"></div> : 'Rejeitar'}
                            </button>
                        </div>
                    )}
                </td>
            </tr>
        );
    }

    return (
        <div className="space-y-8">
            <div className="bg-[#121212] p-6 rounded-xl border border-gray-800">
                <div className="flex justify-between items-center mb-6">
                    <h3 className="text-xl font-bold">Submissões Pendentes ({pendingSubmissions.length})</h3>
                    <button 
                        onClick={() => setIsConfirmBatchOpen(true)}
                        disabled={pendingSubmissions.length === 0 || isBatchApproving}
                        className="bg-green-600 text-white font-bold py-2 px-4 rounded-lg hover:bg-green-500 transition-colors disabled:bg-gray-700 disabled:cursor-not-allowed flex items-center"
                    >
                        {isBatchApproving && <div className="w-5 h-5 border-2 border-t-transparent border-white rounded-full animate-spin mr-2"></div>}
                        Aprovar Todas
                    </button>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left text-gray-400">
                        <thead className="text-xs text-gray-300 uppercase bg-gray-800/50">
                            <tr>
                                <th scope="col" className="px-6 py-3">Usuário</th>
                                <th scope="col" className="px-6 py-3">Missão</th>
                                <th scope="col" className="px-6 py-3">Enviado em</th>
                                <th scope="col" className="px-6 py-3">Prova</th>
                                <th scope="col" className="px-6 py-3">Status</th>
                                <th scope="col" className="px-6 py-3">Ações</th>
                            </tr>
                        </thead>
                        <tbody>
                            {paginatedPending.length > 0 ? (
                                paginatedPending.map(sub => <SubmissionRow key={sub.id} submission={sub} />)
                            ) : (
                                <tr><td colSpan={6} className="text-center py-8">Nenhuma submissão pendente.</td></tr>
                            )}
                        </tbody>
                    </table>
                </div>
                <Pagination 
                    totalItems={pendingSubmissions.length}
                    itemsPerPage={ITEMS_PER_PAGE}
                    currentPage={pendingPage}
                    onPageChange={setPendingPage}
                />
            </div>

            <div className="bg-[#121212] p-6 rounded-xl border border-gray-800">
                <h3 className="text-xl font-bold mb-6">Histórico de Revisões</h3>
                <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left text-gray-400">
                        <thead className="text-xs text-gray-300 uppercase bg-gray-800/50">
                            <tr>
                                <th scope="col" className="px-6 py-3">Usuário</th>
                                <th scope="col" className="px-6 py-3">Missão</th>
                                <th scope="col" className="px-6 py-3">Enviado em</th>
                                <th scope="col" className="px-6 py-3">Prova</th>
                                <th scope="col" className="px-6 py-3">Status</th>
                                <th scope="col" className="px-6 py-3">Ações</th>
                            </tr>
                        </thead>
                        <tbody>
                             {paginatedHistory.length > 0 ? (
                                paginatedHistory.map(sub => <SubmissionRow key={sub.id} submission={sub} isHistory />)
                            ) : (
                                <tr><td colSpan={6} className="text-center py-8">Nenhuma submissão revisada.</td></tr>
                            )}
                        </tbody>
                    </table>
                </div>
                 <Pagination 
                    totalItems={reviewedSubmissions.length}
                    itemsPerPage={ITEMS_PER_PAGE}
                    currentPage={historyPage}
                    onPageChange={setHistoryPage}
                />
            </div>

            {proofModalUrl && (
                <div className="fixed inset-0 bg-black bg-opacity-80 flex items-center justify-center z-50" onClick={() => setProofModalUrl(null)}>
                    <div className="p-4 bg-gray-900 rounded-lg max-w-2xl max-h-[90vh]">
                        <img src={proofModalUrl} alt="Prova da missão" className="max-w-full max-h-full object-contain" />
                    </div>
                </div>
            )}

            <ConfirmationModal
                isOpen={isConfirmBatchOpen}
                onClose={() => setIsConfirmBatchOpen(false)}
                onConfirm={handleBatchApprove}
                title="Confirmar Aprovação em Lote"
                message={`Você tem certeza que deseja aprovar TODAS as ${pendingSubmissions.length} missões pendentes? Esta ação não pode ser desfeita.`}
                confirmButtonText={isBatchApproving ? "Aprovando..." : "Sim, Aprovar Todas"}
                confirmButtonClass="bg-green-600 hover:bg-green-500"
            />
        </div>
    );
};

export default ReviewMissions;
