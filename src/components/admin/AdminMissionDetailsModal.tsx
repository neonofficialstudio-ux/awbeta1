import React, { useMemo, useState } from 'react';
import type { Mission, MissionSubmission, User } from '../../types';

interface AdminMissionDetailsModalProps {
  mission: Mission;
  submissions: MissionSubmission[];
  users: User[];
  onClose: () => void;
}

const SubmissionList: React.FC<{ title: string; submissions: MissionSubmission[]; users: User[]; onShowProof: (url: string) => void; }> = ({ title, submissions, users, onShowProof }) => (
    <div>
        <h4 className="text-lg font-bold mb-2">{title} ({submissions.length})</h4>
        {submissions.length > 0 ? (
            <ul className="space-y-3">
                {submissions.map(sub => {
                    const user = users.find(u => u.id === sub.userId);
                    return (
                        <li key={sub.id} className="flex items-center bg-gray-800/50 p-2 rounded-lg">
                            <img src={user?.avatarUrl} alt={user?.name} className="w-10 h-10 rounded-full mr-3" />
                            <div className="flex-grow">
                                <p className="font-semibold text-white">{user?.name}</p>
                                <p className="text-xs text-gray-400">Enviado em: {new Date(sub.submittedAtISO).toLocaleString('pt-BR')}</p>
                            </div>
                            <button
                                onClick={() => onShowProof(sub.proofUrl)}
                                className="ml-4 text-xs font-semibold text-goldenYellow-400 hover:underline bg-gray-700/50 px-2 py-1 rounded-md transition-colors hover:bg-gray-700"
                            >
                                Ver Prova
                            </button>
                        </li>
                    )
                })}
            </ul>
        ) : (
            <p className="text-sm text-gray-500">Nenhum envio nesta categoria.</p>
        )}
    </div>
);

const AdminMissionDetailsModal: React.FC<AdminMissionDetailsModalProps> = ({ mission, submissions, users, onClose }) => {
  const [proofModalUrl, setProofModalUrl] = useState<string | null>(null);

  const submissionsForMission = useMemo(() => submissions.filter(s => s.missionId === mission.id), [mission, submissions]);
  
  const approvedSubmissions = useMemo(() => submissionsForMission.filter(s => s.status === 'approved'), [submissionsForMission]);
  const rejectedSubmissions = useMemo(() => submissionsForMission.filter(s => s.status === 'rejected'), [submissionsForMission]);

  return (
    <>
      <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4">
        <div className="bg-[#121212] rounded-xl border border-gray-800 p-6 md:p-8 max-w-2xl w-full">
          <div className="flex justify-between items-start mb-6">
            <div>
              <h2 className="text-2xl font-bold text-goldenYellow-400">Detalhes da Missão</h2>
              <p className="text-gray-400">{mission.title}</p>
            </div>
            <button onClick={onClose} className="text-gray-500 hover:text-white text-3xl font-bold">&times;</button>
          </div>
          
          <div className="max-h-[60vh] overflow-y-auto pr-2 space-y-6">
              <SubmissionList title="Aprovados" submissions={approvedSubmissions} users={users} onShowProof={setProofModalUrl} />
              <SubmissionList title="Rejeitados" submissions={rejectedSubmissions} users={users} onShowProof={setProofModalUrl} />
          </div>
        </div>
      </div>
      {proofModalUrl && (
          <div className="fixed inset-0 bg-black bg-opacity-80 flex items-center justify-center z-[60]" onClick={() => setProofModalUrl(null)}>
              <div className="p-4 bg-gray-900 rounded-lg max-w-2xl max-h-[90vh]">
                  <img src={proofModalUrl} alt="Prova da missão" className="max-w-full max-h-full object-contain" />
              </div>
          </div>
      )}
    </>
  );
};

export default AdminMissionDetailsModal;