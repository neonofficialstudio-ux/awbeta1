import React, { useState } from 'react';
import type { User, PunishmentType } from '../../types';

interface AdminPunishmentModalProps {
  user: User;
  onClose: () => void;
  onSave: (payload: { userId: string; type: PunishmentType; reason: string; durationDays?: number; deduction?: { coins?: number; xp?: number; } }) => Promise<void>;
}

const AdminPunishmentModal: React.FC<AdminPunishmentModalProps> = ({ user, onClose, onSave }) => {
  const [type, setType] = useState<PunishmentType>('warn');
  const [reason, setReason] = useState('');
  const [durationDays, setDurationDays] = useState(1);
  const [deductCoins, setDeductCoins] = useState(0);
  const [deductXp, setDeductXp] = useState(0);
  const [isSaving, setIsSaving] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reason.trim()) {
        alert("O motivo é obrigatório.");
        return;
    }
    
    setIsSaving(true);
    await onSave({
        userId: user.id,
        type,
        reason,
        durationDays: type === 'temp_ban' ? durationDays : undefined,
        deduction: type === 'deduct' ? { coins: deductCoins, xp: deductXp } : undefined,
    });
    // onClose is called by the parent component after the API call finishes.
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4">
      <div className="bg-[#121212] rounded-xl border border-gray-800 p-6 md:p-8 max-w-lg w-full">
        <div className="flex items-center mb-6">
            <img src={user.avatarUrl} alt={user.name} className="w-12 h-12 rounded-full mr-4" />
            <div>
                <h2 className="text-2xl font-bold text-goldenYellow-400">Punir Usuário</h2>
                <p className="text-gray-400">{user.name}</p>
            </div>
        </div>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="type" className="block text-sm font-medium text-gray-300 mb-1">Tipo de Punição</label>
            <select name="type" id="type" value={type} onChange={(e) => setType(e.target.value as PunishmentType)} className="w-full bg-gray-800 rounded-md border-gray-700 text-white p-2">
              <option value="warn">Aviso (Envia uma notificação)</option>
              <option value="deduct">Dedução de Pontos</option>
              <option value="temp_ban">Banimento Temporário</option>
              <option value="perm_ban">Banimento Permanente</option>
            </select>
          </div>
          
          {type === 'temp_ban' && (
            <div>
                <label htmlFor="durationDays" className="block text-sm font-medium text-gray-300 mb-1">Duração do Ban (em dias)</label>
                <input type="number" id="durationDays" value={durationDays} onChange={e => setDurationDays(Math.max(1, parseInt(e.target.value, 10)))} min="1" className="w-full bg-gray-800 rounded-md border-gray-700 text-white p-2" />
            </div>
          )}

          {type === 'deduct' && (
             <div className="grid grid-cols-2 gap-4">
                 <div>
                    <label htmlFor="deductCoins" className="block text-sm font-medium text-gray-300 mb-1">Deduzir Coins</label>
                    <input type="number" id="deductCoins" value={deductCoins} onChange={e => setDeductCoins(parseInt(e.target.value, 10))} min="0" className="w-full bg-gray-800 rounded-md border-gray-700 text-white p-2" />
                </div>
                 <div>
                    <label htmlFor="deductXp" className="block text-sm font-medium text-gray-300 mb-1">Deduzir XP</label>
                    <input type="number" id="deductXp" value={deductXp} onChange={e => setDeductXp(parseInt(e.target.value, 10))} min="0" className="w-full bg-gray-800 rounded-md border-gray-700 text-white p-2" />
                </div>
             </div>
          )}
          
          <div>
            <label htmlFor="reason" className="block text-sm font-medium text-gray-300 mb-1">Motivo (Obrigatório)</label>
            <textarea name="reason" id="reason" value={reason} onChange={(e) => setReason(e.target.value)} required rows={3} className="w-full bg-gray-800 rounded-md border-gray-700 text-white p-2"></textarea>
          </div>

          <div className="mt-6 flex justify-end space-x-4 pt-4 border-t border-gray-800">
            <button type="button" onClick={onClose} className="py-2 px-4 rounded-lg bg-gray-700 hover:bg-gray-600 transition-colors">Cancelar</button>
            <button type="submit" disabled={isSaving} className="py-2 px-6 rounded-lg bg-red-600 text-white font-bold hover:bg-red-500 transition-colors flex items-center justify-center h-10 w-40 disabled:bg-gray-600">
                {isSaving ? <div className="w-5 h-5 border-2 border-t-transparent border-white rounded-full animate-spin"></div> : 'Aplicar Punição'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AdminPunishmentModal;