
import React, { useState, useEffect } from 'react';
import type { SubscriptionPlan, IconComponent } from '../../types';
import { 
    StarIcon, CheckIcon, CrownIcon, VipIcon, ShieldIcon, 
    TrendingUpIcon, QueueIcon, StoreIcon, CoinIcon, TrophyIcon, 
    DeleteIcon 
} from '../../constants';

interface AdminSubscriptionModalProps {
  plan: SubscriptionPlan;
  onClose: () => void;
  onSave: (plan: SubscriptionPlan) => void;
}

// Mapa de Ícones Disponíveis para Seleção
const ICON_OPTIONS: Record<string, { label: string, component: IconComponent }> = {
    'star': { label: 'Estrela (Padrão)', component: StarIcon },
    'check': { label: 'Check (V)', component: CheckIcon },
    'crown': { label: 'Coroa (Rei)', component: CrownIcon },
    'vip': { label: 'VIP (Diamante)', component: VipIcon },
    'shield': { label: 'Escudo', component: ShieldIcon },
    'fire': { label: 'Fogo (Boost)', component: TrendingUpIcon },
    'queue': { label: 'Fila / Relógio', component: QueueIcon },
    'store': { label: 'Loja / Sacola', component: StoreIcon },
    'coin': { label: 'Moeda', component: CoinIcon },
    'trophy': { label: 'Troféu', component: TrophyIcon },
};

const AdminSubscriptionModal: React.FC<AdminSubscriptionModalProps> = ({ plan, onClose, onSave }) => {
  const [formData, setFormData] = useState({
    price: plan.price,
    dailyMissions: plan.dailyMissions,
    paymentLink: plan.paymentLink || '',
    highlight: plan.highlight || false,
  });

  // State separado para a lista de features (texto + chave do ícone)
  const [featureList, setFeatureList] = useState<{ text: string; iconKey: string }[]>([]);

  useEffect(() => {
    // Inicializar features tentando mapear os ícones existentes
    const mappedFeatures = plan.features.map(f => {
        // Tenta encontrar a chave do ícone comparando a função do componente
        const foundEntry = Object.entries(ICON_OPTIONS).find(([_, val]) => val.component === f.icon);
        return {
            text: f.text,
            iconKey: foundEntry ? foundEntry[0] : 'star' // Fallback para star se não encontrar
        };
    });
    setFeatureList(mappedFeatures);
  }, [plan]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target;
     if (type === 'checkbox') {
        const { checked } = e.target as HTMLInputElement;
        setFormData(prev => ({ ...prev, [name]: checked }));
    } else {
        setFormData(prev => ({ ...prev, [name]: value }));
    }
  };

  // Manipuladores da Lista de Features
  const handleFeatureChange = (index: number, field: 'text' | 'iconKey', value: string) => {
      const newList = [...featureList];
      newList[index] = { ...newList[index], [field]: value };
      setFeatureList(newList);
  };

  const addFeature = () => {
      setFeatureList([...featureList, { text: '', iconKey: 'check' }]);
  };

  const removeFeature = (index: number) => {
      const newList = [...featureList];
      newList.splice(index, 1);
      setFeatureList(newList);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Reconstrói o array de features com os componentes de ícone reais
    const finalFeatures = featureList
        .filter(f => f.text.trim() !== '') // Remove vazios
        .map(f => ({
            text: f.text,
            icon: ICON_OPTIONS[f.iconKey].component
        }));
    
    onSave({
      ...plan,
      price: formData.price,
      dailyMissions: formData.dailyMissions,
      features: finalFeatures,
      paymentLink: formData.paymentLink,
      highlight: formData.highlight,
    });
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
      <div className="bg-[#121212] rounded-xl border border-gray-800 p-6 md:p-8 max-w-2xl w-full flex flex-col max-h-[90vh]">
        <div className="flex justify-between items-center mb-6">
            <h2 className="text-2xl font-bold text-goldenYellow-400">Editar Plano: {plan.name}</h2>
            <button onClick={onClose} className="text-gray-500 hover:text-white text-2xl">&times;</button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6 overflow-y-auto pr-2 custom-scrollbar flex-1">
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
                <label htmlFor="price" className="block text-sm font-medium text-gray-300 mb-1">Preço (Ex: R$39/mês)</label>
                <input type="text" name="price" id="price" value={formData.price} onChange={handleChange} required className="w-full bg-gray-800 rounded-md border-gray-700 text-white p-2 focus:border-goldenYellow-500 outline-none transition-colors"/>
            </div>
            
            <div>
                <label htmlFor="dailyMissions" className="block text-sm font-medium text-gray-300 mb-1">Subtítulo (Limites)</label>
                <input type="text" name="dailyMissions" id="dailyMissions" value={formData.dailyMissions} onChange={handleChange} required className="w-full bg-gray-800 rounded-md border-gray-700 text-white p-2 focus:border-goldenYellow-500 outline-none transition-colors"/>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2 flex justify-between items-center">
                <span>Benefícios & Ícones</span>
                <span className="text-xs text-gray-500">Arraste para reordenar (futuro)</span>
            </label>
            
            <div className="space-y-2 bg-[#181818] p-4 rounded-lg border border-gray-800">
                {featureList.map((feature, index) => (
                    <div key={index} className="flex gap-2 items-center group">
                        {/* Seletor de Ícone */}
                        <div className="relative shrink-0">
                            <select 
                                value={feature.iconKey}
                                onChange={(e) => handleFeatureChange(index, 'iconKey', e.target.value)}
                                className="w-32 bg-gray-900 text-white text-xs border border-gray-700 rounded-lg p-2 pl-8 appearance-none focus:border-goldenYellow-500 outline-none cursor-pointer"
                            >
                                {Object.entries(ICON_OPTIONS).map(([key, val]) => (
                                    <option key={key} value={key}>{val.label}</option>
                                ))}
                            </select>
                            <div className="absolute left-2 top-1/2 -translate-y-1/2 text-goldenYellow-400 pointer-events-none">
                                {React.createElement(ICON_OPTIONS[feature.iconKey].component, { className: "w-4 h-4" })}
                            </div>
                        </div>

                        {/* Input de Texto */}
                        <input 
                            type="text" 
                            value={feature.text} 
                            onChange={(e) => handleFeatureChange(index, 'text', e.target.value)}
                            placeholder="Descrição do benefício..."
                            className="flex-grow bg-gray-900 border border-gray-700 rounded-lg p-2 text-sm text-white focus:border-goldenYellow-500 outline-none transition-colors placeholder-gray-600"
                        />

                        {/* Botão Remover */}
                        <button 
                            type="button" 
                            onClick={() => removeFeature(index)}
                            className="p-2 text-gray-600 hover:text-red-500 hover:bg-red-900/10 rounded-lg transition-colors"
                            title="Remover benefício"
                        >
                            <DeleteIcon className="w-4 h-4" />
                        </button>
                    </div>
                ))}

                <button 
                    type="button" 
                    onClick={addFeature}
                    className="w-full py-2 border-2 border-dashed border-gray-700 rounded-lg text-gray-500 text-xs font-bold uppercase tracking-widest hover:border-gray-500 hover:text-gray-300 transition-all mt-2"
                >
                    + Adicionar Benefício
                </button>
            </div>
          </div>

          {plan.name !== 'Free Flow' && (
             <div>
                <label htmlFor="paymentLink" className="block text-sm font-medium text-gray-300 mb-1">Link de Pagamento</label>
                <input type="url" name="paymentLink" id="paymentLink" value={formData.paymentLink} onChange={handleChange} placeholder="https://..." className="w-full bg-gray-800 rounded-md border-gray-700 text-white p-2 focus:border-goldenYellow-500 outline-none transition-colors"/>
            </div>
          )}
          
          <div className="flex items-center p-3 bg-gray-900 rounded-lg border border-gray-800">
            <input type="checkbox" name="highlight" id="highlight" checked={formData.highlight} onChange={handleChange} className="h-4 w-4 text-goldenYellow-600 bg-gray-700 border-gray-600 focus:ring-goldenYellow-500 rounded accent-goldenYellow-500" />
            <label htmlFor="highlight" className="ml-3 block text-sm text-gray-300 cursor-pointer select-none">Destacar este plano como "Mais Popular"</label>
          </div>

        </form>

        <div className="mt-6 flex justify-end space-x-4 pt-4 border-t border-gray-800">
            <button type="button" onClick={onClose} className="py-3 px-6 rounded-lg bg-gray-800 hover:bg-gray-700 text-gray-300 font-bold transition-colors">Cancelar</button>
            <button onClick={handleSubmit} className="py-3 px-8 rounded-lg bg-goldenYellow-500 text-black font-bold hover:bg-goldenYellow-400 transition-colors shadow-lg shadow-goldenYellow-500/20">Salvar Alterações</button>
        </div>
      </div>
    </div>
  );
};

export default AdminSubscriptionModal;
