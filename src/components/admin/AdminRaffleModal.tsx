
import React, { useState, useEffect } from 'react';
import type { Raffle, StoreItem, UsableItem, RafflePrizeType } from '../../types';
import { parseLocalDate, toLocalInputValue } from '../../api/utils/localDate';
import { CoinIcon, StoreIcon, TrophyIcon, EditIcon } from '../../constants';

interface AdminRaffleModalProps {
  raffle: Raffle | null;
  allItems: (StoreItem | UsableItem)[];
  onClose: () => void;
  onSave: (raffleData: any) => void;
}

const PrizeTypeButton: React.FC<{ 
    active: boolean; 
    onClick: () => void; 
    icon: React.ElementType; 
    label: string;
}> = ({ active, onClick, icon: Icon, label }) => (
    <button
        type="button"
        onClick={onClick}
        className={`
            flex flex-col items-center justify-center p-4 rounded-xl border-2 transition-all
            ${active ? 'bg-goldenYellow-500/20 border-goldenYellow-500 text-goldenYellow-400' : 'bg-[#181818] border-gray-700 text-gray-400 hover:border-gray-500'}
        `}
    >
        <Icon className="w-6 h-6 mb-2" />
        <span className="text-xs font-bold uppercase">{label}</span>
    </button>
);

const AdminRaffleModal: React.FC<AdminRaffleModalProps> = ({ raffle, allItems, onClose, onSave }) => {
    const [prizeType, setPrizeType] = useState<RafflePrizeType>('item');
    
    // Common
    const [ticketPrice, setTicketPrice] = useState(10);
    const [ticketLimitPerUser, setTicketLimitPerUser] = useState(0);
    const [endsAt, setEndsAt] = useState('');
    const [startsAt, setStartsAt] = useState('');
    
    // Item Specific
    const [itemId, setItemId] = useState('');
    
    // Coin/Custom Specific
    const [coinReward, setCoinReward] = useState(0);
    const [customName, setCustomName] = useState('');
    const [customImage, setCustomImage] = useState('');
    const [eventTitle, setEventTitle] = useState<string>('');

    // ✅ Catalog (Supabase): usa itens reais recebidos do dashboard (storeItems + usableItems)
    const validItems = (allItems || [])
        .filter((i: any) => !i?.isOutOfStock)
        .map((i: any) => ({
            id: i.id,
            name: i.name,
            price: Number(i.price ?? 0),
            imageUrl: i.imageUrl ?? '',
        }));

    useEffect(() => {
        if (raffle) {
            // Restore V2 or Legacy V1 State
            // Restore V2 State (Manual award moved to separate flow)
            const normalizedPrizeType = (raffle.prizeType === 'custom' ? 'item' : (raffle.prizeType || 'item')) as any;
            setPrizeType(normalizedPrizeType);
            
            setTicketPrice(raffle.ticketPrice);
            setTicketLimitPerUser(raffle.ticketLimitPerUser || 0);
            
            // Dates
            setEndsAt(toLocalInputValue(raffle.endsAt));
            if (raffle.startsAt) setStartsAt(toLocalInputValue(raffle.startsAt));

            // Prize Details
            setItemId(raffle.itemId || '');
            setCoinReward(raffle.coinReward || 0);
            setCustomName(raffle.itemName); // Always populate for editing override
            setCustomImage(raffle.itemImageUrl);
            setEventTitle((raffle as any)?.meta?.title || '');
        } else {
             const now = new Date();
             const tomorrow = new Date();
             tomorrow.setDate(tomorrow.getDate() + 1);
             
             setStartsAt(toLocalInputValue(now));
             setEndsAt(toLocalInputValue(tomorrow));
             setTicketLimitPerUser(0);
             setEventTitle('');
        }
    }, [raffle]);

    // Auto-fill details when selecting an item
    useEffect(() => {
        if ((prizeType === 'item' || prizeType === 'hybrid') && itemId) {
            const item = validItems.find(i => i.id === itemId);
            if (item) {
                setCustomName(item.name);
                setCustomImage(item.imageUrl);
            }
        }
    }, [itemId, prizeType]);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        
        // Validations
        if ((prizeType === 'item' || prizeType === 'hybrid') && !itemId) return alert("Selecione um item.");
        if ((prizeType === 'coins' || prizeType === 'hybrid') && coinReward <= 0) return alert("Defina o valor em Coins.");
        if (!customName) return alert("Defina um nome para o prêmio.");
        
        const startDate = parseLocalDate(startsAt);
        const endDate = parseLocalDate(endsAt);
        
        if (endDate <= startDate) return alert("Data de término inválida.");

        let status: Raffle['status'] = 'active';
        if (startDate > new Date()) status = 'scheduled';
        if (raffle && raffle.status !== 'active' && raffle.status !== 'scheduled') status = raffle.status; // Preserve finished/drawing state

        onSave({
            id: raffle?.id,
            // Core Props
            ticketPrice,
            ticketLimitPerUser,
            startsAt: startDate.toISOString(),
            endsAt: endDate.toISOString(),
            status,
            // V2 Prize Props
            prizeType,
            itemId: (prizeType === 'item' || prizeType === 'hybrid') ? itemId : '',
            coinReward: (prizeType === 'coins' || prizeType === 'hybrid') ? coinReward : 0,
            itemName: customName,
            itemImageUrl: customImage || 'https://via.placeholder.com/300?text=Sorteio',
            meta: {
                ...(raffle as any)?.meta,
                title: eventTitle?.trim() || undefined
            },
            // Manual/Custom prize moved to Admin "Premiação Manual" flow
            customRewardText: undefined
        });
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-90 flex items-center justify-center z-[11000] p-4 backdrop-blur-sm">
            <div className="bg-[#121212] rounded-2xl border border-gray-800 w-full max-w-2xl flex flex-col max-h-[90vh] shadow-2xl">
                {/* Header */}
                <div className="p-6 border-b border-gray-800 bg-[#151515] rounded-t-2xl">
                    <h2 className="text-2xl font-bold text-goldenYellow-400">{raffle ? 'Editar Sorteio' : 'Criar Novo Sorteio'}</h2>
                </div>
                
                <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-8 space-y-6 custom-scrollbar">

                    {/* Event Title (meta.title) */}
                    <div>
                        <label className="block text-xs font-bold text-gray-400 mb-2 uppercase tracking-wider">
                            Nome do Sorteio (Evento)
                        </label>
                        <input
                            value={eventTitle}
                            onChange={(e) => setEventTitle(e.target.value)}
                            placeholder="Ex.: OPEN BETA GRAND PRIZE"
                            className="w-full bg-[#0F1115] border border-[#2A2D33] rounded-lg px-4 py-3 text-white outline-none"
                        />
                        <p className="text-[11px] text-white/40 mt-2">
                            Esse nome aparece para os usuários como “Evento” e como título principal do card.
                        </p>
                    </div>
                    
                    {/* Prize Type Selector */}
                    <div>
                        <label className="block text-xs font-bold text-gray-400 mb-3 uppercase tracking-wider">Tipo de Prêmio</label>
                        <div className="grid grid-cols-3 gap-3">
                            <PrizeTypeButton active={prizeType === 'item'} onClick={() => setPrizeType('item')} icon={StoreIcon} label="Item" />
                            <PrizeTypeButton active={prizeType === 'coins'} onClick={() => setPrizeType('coins')} icon={CoinIcon} label="Coins" />
                            <PrizeTypeButton active={prizeType === 'hybrid'} onClick={() => setPrizeType('hybrid')} icon={TrophyIcon} label="Híbrido" />
                        </div>
                    </div>

                    {/* Dynamic Fields */}
                    <div className="bg-[#181818] p-6 rounded-xl border border-gray-700 space-y-4">
                        
                        {/* Item Selection */}
                        {(prizeType === 'item' || prizeType === 'hybrid') && (
                            <div>
                                <label className="block text-sm font-bold text-white mb-2">Selecionar Item da Loja</label>
                                <select 
                                    value={itemId} 
                                    onChange={e => setItemId(e.target.value)} 
                                    className="w-full bg-black border border-gray-600 rounded-lg p-3 text-white focus:border-goldenYellow-500"
                                >
                                    <option value="">Selecione...</option>
                                    {validItems.map(i => <option key={i.id} value={i.id}>{i.name} (Valor: {i.price})</option>)}
                                </select>
                            </div>
                        )}

                        {/* Coin Reward */}
                        {(prizeType === 'coins' || prizeType === 'hybrid') && (
                             <div>
                                <label className="block text-sm font-bold text-white mb-2">Valor do Prêmio (LC)</label>
                                <input 
                                    type="number" 
                                    value={coinReward} 
                                    onChange={e => setCoinReward(Number(e.target.value))}
                                    className="w-full bg-black border border-gray-600 rounded-lg p-3 text-white focus:border-goldenYellow-500 text-lg font-mono"
                                />
                            </div>
                        )}

                        {/* Custom Details (Or Override) */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
                            <div>
                                <label className="block text-xs text-gray-400 uppercase mb-1">Nome de Exibição</label>
                                <input 
                                    type="text" 
                                    value={customName} 
                                    onChange={e => setCustomName(e.target.value)}
                                    className="w-full bg-black border border-gray-600 rounded-lg p-2 text-white text-sm"
                                />
                            </div>
                            <div>
                                <label className="block text-xs text-gray-400 uppercase mb-1">URL da Imagem (Capa)</label>
                                <input 
                                    type="text" 
                                    value={customImage} 
                                    onChange={e => setCustomImage(e.target.value)}
                                    className="w-full bg-black border border-gray-600 rounded-lg p-2 text-white text-sm"
                                    placeholder="https://..."
                                />
                            </div>
                        </div>
                    </div>

                    {/* Ticket Config */}
                    <div className="grid grid-cols-2 gap-6">
                        <div>
                            <label className="block text-sm font-medium text-gray-300 mb-1">Preço do Ticket</label>
                            <input
                                type="number"
                                value={ticketPrice}
                                onChange={(e) => setTicketPrice(Number(e.target.value))}
                                required
                                min="1"
                                className="w-full bg-gray-800 rounded-md border-gray-700 text-white p-3"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-300 mb-1">Limite por Usuário</label>
                            <input
                                type="number"
                                value={ticketLimitPerUser}
                                onChange={(e) => setTicketLimitPerUser(Number(e.target.value))}
                                required
                                min="0"
                                className="w-full bg-gray-800 rounded-md border-gray-700 text-white p-3"
                            />
                            <p className="text-xs text-gray-500 mt-1">0 = Ilimitado</p>
                        </div>
                    </div>

                    {/* Dates */}
                    <div className="grid grid-cols-2 gap-6">
                        <div>
                            <label className="block text-sm font-medium text-gray-300 mb-1">Início</label>
                            <input
                                type="datetime-local"
                                value={startsAt}
                                onChange={(e) => setStartsAt(e.target.value)}
                                required
                                className="w-full bg-gray-800 rounded-md border-gray-700 text-white p-3"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-300 mb-1">Término (Sorteio)</label>
                            <input
                                type="datetime-local"
                                value={endsAt}
                                onChange={(e) => setEndsAt(e.target.value)}
                                required
                                className="w-full bg-gray-800 rounded-md border-gray-700 text-white p-3"
                            />
                        </div>
                    </div>

                </form>

                {/* Footer */}
                <div className="p-6 border-t border-gray-800 bg-[#151515] rounded-b-2xl flex justify-end gap-3">
                    <button type="button" onClick={onClose} className="py-3 px-6 rounded-xl bg-gray-800 hover:bg-gray-700 text-gray-300 font-bold transition-colors">Cancelar</button>
                    <button onClick={handleSubmit} className="py-3 px-8 rounded-xl bg-goldenYellow-500 text-black font-black hover:bg-goldenYellow-400 transition-colors uppercase tracking-wide shadow-lg shadow-goldenYellow-500/20">
                        {raffle ? 'Salvar Alterações' : 'Criar Sorteio'}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default AdminRaffleModal;
