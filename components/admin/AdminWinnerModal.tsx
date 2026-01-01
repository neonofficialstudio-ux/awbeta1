
import React, { useState, useEffect } from 'react';
import type { FeaturedWinner, User, Event, StoreItem, UsableItem } from '../../types';
import { ModalPortal } from '../ui/overlays/ModalPortal';
import { CoinIcon, XPIcon, StoreIcon, TrophyIcon, CheckIcon } from '../../constants';
import { AdminEngine } from '../../api/admin/AdminEngine'; // Updated import
import { useAppContext } from '../../constants';

// We reuse this component but significantly overhaul it. 
// Ideally would be renamed to AdminManualAwardModal.tsx, but keeping name per prompt constraints.

interface AdminWinnerModalProps {
  winner: FeaturedWinner | null;
  allUsers: User[];
  onClose: () => void;
  onSave: (winner: FeaturedWinner) => void; // Legacy Prop (used for close mostly now)
  
  // New Props for Full Functionality
  events?: Event[];
  storeItems?: (StoreItem | UsableItem)[];
}

type Step = 'user' | 'type' | 'details' | 'confirm';
type AwardType = 'coins' | 'xp' | 'item' | 'text';

const AdminWinnerModal: React.FC<AdminWinnerModalProps> = ({ winner, allUsers, onClose, onSave, events = [], storeItems = [] }) => {
    const { state } = useAppContext();
    const adminId = state.activeUser?.id || 'admin';

    // Wizard State
    const [step, setStep] = useState<Step>('user');
    const [isLoading, setIsLoading] = useState(false);

    // Form Data
    const [selectedUserId, setSelectedUserId] = useState<string>('');
    const [selectedEventId, setSelectedEventId] = useState<string>(''); // Optional
    const [awardType, setAwardType] = useState<AwardType>('coins');
    
    // Details
    const [amount, setAmount] = useState<number>(100);
    const [selectedItemId, setSelectedItemId] = useState<string>('');
    const [customTitle, setCustomTitle] = useState<string>('');
    
    const userList = allUsers.filter(u => u.role === 'user');
    const selectedUser = userList.find(u => u.id === selectedUserId);
    const selectedItem = storeItems.find(i => i.id === selectedItemId);
    const selectedEvent = events.find(e => e.id === selectedEventId);

    // Reset on Open
    useEffect(() => {
        if (winner) {
            // Pre-fill if editing legacy (limited support)
            setSelectedUserId(winner.userId);
            setCustomTitle(winner.prizeTitle);
            setAwardType('text');
            setStep('details');
        }
    }, [winner]);

    const handleNext = () => {
        if (step === 'user' && selectedUserId) setStep('type');
        else if (step === 'type') setStep('details');
        else if (step === 'details') {
            // Validation
            if (awardType === 'item' && !selectedItemId) return alert('Selecione um item');
            if ((awardType === 'coins' || awardType === 'xp') && amount <= 0) return alert('Valor inválido');
            if (awardType === 'text' && !customTitle) return alert('Digite o texto do prêmio');
            setStep('confirm');
        }
    };

    const handleBack = () => {
        if (step === 'type') setStep('user');
        else if (step === 'details') setStep('type');
        else if (step === 'confirm') setStep('details');
    };

    const handleExecute = async () => {
        setIsLoading(true);
        try {
            // Use AdminEngine
            AdminEngine.createManualAward({
                userId: selectedUserId,
                adminId,
                eventId: selectedEventId || null,
                type: awardType,
                amount: (awardType === 'coins' || awardType === 'xp') ? amount : undefined,
                itemId: awardType === 'item' ? selectedItemId : undefined,
                customTitle: customTitle,
            });
            
            // Legacy Callback to trigger refresh in parent if needed
            onSave({ id: 'temp', userId: selectedUserId, prizeTitle: 'Updated', date: '' }); 
            onClose();
        } catch (e: any) {
            alert("Erro: " + e.message);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <ModalPortal>
            <div className="fixed inset-0 bg-black/90 backdrop-blur-sm flex items-center justify-center z-[9999] p-4">
                <div className="bg-[#121212] w-full max-w-2xl rounded-[24px] border border-[#FFD86B]/30 flex flex-col max-h-[90vh] shadow-2xl relative overflow-hidden animate-pop-in">
                    
                    {/* Header */}
                    <div className="p-6 border-b border-[#333] bg-[#181818] flex justify-between items-center">
                        <div>
                            <h2 className="text-2xl font-black text-white font-chakra uppercase tracking-wide">
                                Premiação Manual
                            </h2>
                            <p className="text-xs text-gray-400 mt-1 uppercase tracking-widest font-bold">
                                {step === 'user' ? 'Selecione o Artista' : step === 'type' ? 'Escolha o Tipo' : step === 'details' ? 'Defina os Detalhes' : 'Confirmação'}
                            </p>
                        </div>
                        <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-full bg-[#222] text-gray-400 hover:text-white">✕</button>
                    </div>

                    {/* Body */}
                    <div className="p-8 overflow-y-auto custom-scrollbar bg-[#0E0E0E] flex-1">
                        
                        {/* STEP 1: USER & EVENT */}
                        {step === 'user' && (
                            <div className="space-y-6">
                                <div>
                                    <label className="block text-xs font-bold text-gray-400 uppercase mb-2">Usuário</label>
                                    <select 
                                        value={selectedUserId} 
                                        onChange={e => setSelectedUserId(e.target.value)} 
                                        className="w-full bg-[#1A1A1A] border border-[#333] rounded-xl p-4 text-white focus:border-[#FFD86B] outline-none"
                                    >
                                        <option value="">Selecione...</option>
                                        {userList.map(u => (
                                            <option key={u.id} value={u.id}>{u.name} ({u.artisticName})</option>
                                        ))}
                                    </select>
                                </div>

                                <div>
                                    <label className="block text-xs font-bold text-gray-400 uppercase mb-2">Evento Vinculado (Opcional)</label>
                                    <select 
                                        value={selectedEventId} 
                                        onChange={e => setSelectedEventId(e.target.value)} 
                                        className="w-full bg-[#1A1A1A] border border-[#333] rounded-xl p-4 text-white focus:border-[#FFD86B] outline-none"
                                    >
                                        <option value="">Nenhum (Premiação Avulsa)</option>
                                        {events.map(e => (
                                            <option key={e.id} value={e.id}>{e.title} ({e.status})</option>
                                        ))}
                                    </select>
                                </div>
                            </div>
                        )}

                        {/* STEP 2: AWARD TYPE */}
                        {step === 'type' && (
                            <div className="grid grid-cols-2 gap-4">
                                <button 
                                    onClick={() => setAwardType('coins')} 
                                    className={`p-6 rounded-xl border-2 flex flex-col items-center gap-3 transition-all ${awardType === 'coins' ? 'bg-[#FFD86B]/10 border-[#FFD86B] text-[#FFD86B]' : 'bg-[#1A1A1A] border-[#333] text-gray-500 hover:border-gray-500'}`}
                                >
                                    <CoinIcon className="w-10 h-10" />
                                    <span className="font-bold uppercase text-sm">Lummi Coins</span>
                                </button>
                                <button 
                                    onClick={() => setAwardType('xp')} 
                                    className={`p-6 rounded-xl border-2 flex flex-col items-center gap-3 transition-all ${awardType === 'xp' ? 'bg-[#3CFFF8]/10 border-[#3CFFF8] text-[#3CFFF8]' : 'bg-[#1A1A1A] border-[#333] text-gray-500 hover:border-gray-500'}`}
                                >
                                    <XPIcon className="w-10 h-10" />
                                    <span className="font-bold uppercase text-sm">Experiência (XP)</span>
                                </button>
                                <button 
                                    onClick={() => setAwardType('item')} 
                                    className={`p-6 rounded-xl border-2 flex flex-col items-center gap-3 transition-all ${awardType === 'item' ? 'bg-[#A66BFF]/10 border-[#A66BFF] text-[#A66BFF]' : 'bg-[#1A1A1A] border-[#333] text-gray-500 hover:border-gray-500'}`}
                                >
                                    <StoreIcon className="w-10 h-10" />
                                    <span className="font-bold uppercase text-sm">Item da Loja</span>
                                </button>
                                <button 
                                    onClick={() => setAwardType('text')} 
                                    className={`p-6 rounded-xl border-2 flex flex-col items-center gap-3 transition-all ${awardType === 'text' ? 'bg-white/10 border-white text-white' : 'bg-[#1A1A1A] border-[#333] text-gray-500 hover:border-gray-500'}`}
                                >
                                    <TrophyIcon className="w-10 h-10" />
                                    <span className="font-bold uppercase text-sm">Título / Texto</span>
                                </button>
                            </div>
                        )}

                        {/* STEP 3: DETAILS */}
                        {step === 'details' && (
                            <div className="space-y-6">
                                {(awardType === 'coins' || awardType === 'xp') && (
                                    <div>
                                        <label className="block text-xs font-bold text-gray-400 uppercase mb-2">Quantidade</label>
                                        <input 
                                            type="number" 
                                            value={amount} 
                                            onChange={e => setAmount(Math.max(1, Number(e.target.value)))} 
                                            className="w-full bg-[#1A1A1A] border border-[#333] rounded-xl p-4 text-white text-2xl font-mono text-center focus:border-[#FFD86B] outline-none"
                                        />
                                    </div>
                                )}

                                {awardType === 'item' && (
                                    <div>
                                        <label className="block text-xs font-bold text-gray-400 uppercase mb-2">Selecione o Item</label>
                                        <select 
                                            value={selectedItemId} 
                                            onChange={e => setSelectedItemId(e.target.value)} 
                                            className="w-full bg-[#1A1A1A] border border-[#333] rounded-xl p-4 text-white focus:border-[#FFD86B] outline-none"
                                        >
                                            <option value="">Selecione...</option>
                                            {storeItems.map(i => (
                                                <option key={i.id} value={i.id}>{i.name} ({i.price} LC)</option>
                                            ))}
                                        </select>
                                    </div>
                                )}

                                <div className="pt-4 border-t border-[#333]">
                                    <label className="block text-xs font-bold text-gray-400 uppercase mb-2">Título / Motivo (Obrigatório para Texto)</label>
                                    <input 
                                        type="text" 
                                        value={customTitle} 
                                        onChange={e => setCustomTitle(e.target.value)} 
                                        placeholder={awardType === 'text' ? "Ex: Vencedor do Desafio X" : "Opcional: Motivo da bonificação"}
                                        className="w-full bg-[#1A1A1A] border border-[#333] rounded-xl p-4 text-white focus:border-[#FFD86B] outline-none"
                                    />
                                </div>
                            </div>
                        )}

                        {/* STEP 4: CONFIRMATION */}
                        {step === 'confirm' && selectedUser && (
                            <div className="bg-[#1A1A1A] p-6 rounded-xl border border-gray-700 text-center space-y-4">
                                <h3 className="text-lg font-bold text-white">Resumo da Premiação</h3>
                                
                                <div className="flex items-center justify-center gap-3 bg-black/30 p-3 rounded-lg">
                                    <img src={selectedUser.avatarUrl} className="w-10 h-10 rounded-full" />
                                    <div className="text-left">
                                        <p className="font-bold text-white text-sm">{selectedUser.name}</p>
                                        <p className="text-xs text-gray-500">{selectedUser.artisticName}</p>
                                    </div>
                                </div>

                                <div className="h-px bg-gray-700 w-full"></div>

                                <div className="text-left space-y-2 text-sm">
                                    <div className="flex justify-between"><span className="text-gray-400">Tipo:</span> <span className="text-white font-bold uppercase">{awardType}</span></div>
                                    
                                    {(awardType === 'coins' || awardType === 'xp') && (
                                        <div className="flex justify-between"><span className="text-gray-400">Valor:</span> <span className="text-[#FFD86B] font-mono font-bold">{amount}</span></div>
                                    )}
                                    
                                    {awardType === 'item' && selectedItem && (
                                        <div className="flex justify-between"><span className="text-gray-400">Item:</span> <span className="text-[#A66BFF] font-bold">{selectedItem.name}</span></div>
                                    )}

                                    {selectedEvent && (
                                        <div className="flex justify-between"><span className="text-gray-400">Evento:</span> <span className="text-blue-400">{selectedEvent.title}</span></div>
                                    )}

                                    {customTitle && (
                                        <div className="flex justify-between"><span className="text-gray-400">Nota:</span> <span className="text-white italic">"{customTitle}"</span></div>
                                    )}
                                </div>
                            </div>
                        )}

                    </div>

                    {/* Footer */}
                    <div className="p-6 border-t border-[#333] bg-[#181818] flex justify-between items-center">
                        {step !== 'user' && (
                            <button onClick={handleBack} disabled={isLoading} className="px-6 py-3 rounded-xl bg-[#222] text-gray-300 font-bold hover:bg-[#333] transition-colors">
                                Voltar
                            </button>
                        )}
                        <div className="flex-grow"></div>
                        {step === 'confirm' ? (
                            <button onClick={handleExecute} disabled={isLoading} className="px-8 py-3 rounded-xl bg-gradient-to-r from-[#FFD86B] to-[#F6C560] text-black font-black uppercase tracking-wider hover:scale-105 transition-all flex items-center gap-2">
                                {isLoading ? 'Processando...' : <><CheckIcon className="w-5 h-5"/> Confirmar Entrega</>}
                            </button>
                        ) : (
                            <button onClick={handleNext} disabled={!selectedUserId} className="px-8 py-3 rounded-xl bg-[#333] text-white font-bold hover:bg-[#444] transition-all border border-gray-600">
                                Próximo ➜
                            </button>
                        )}
                    </div>

                </div>
            </div>
        </ModalPortal>
    );
};

export default AdminWinnerModal;