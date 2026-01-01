
import React, { useState, useEffect } from 'react';
import type { Event, User } from '../../types';
import { ModalPortal } from '../ui/overlays/ModalPortal';

interface AdminEventModalProps {
  event: Event | null;
  onClose: () => void;
  onSave: (event: Event) => void;
}

const ALL_PLANS: User['plan'][] = ['Free Flow', 'Artista em Ascensão', 'Artista Profissional', 'Hitmaker'];

// Helper components for form fields to reduce repetition
const InputField: React.FC<any> = ({ label, ...props }) => (
    <div>
        <label htmlFor={props.name} className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">{label}</label>
        <input {...props} id={props.name} className="w-full bg-gray-900 rounded-md border-gray-700 text-white p-2 focus:border-goldenYellow-500 outline-none transition-colors"/>
    </div>
);

const TextAreaField: React.FC<any> = ({ label, ...props }) => (
    <div>
        <label htmlFor={props.name} className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">{label}</label>
        <textarea {...props} id={props.name} rows={3} className="w-full bg-gray-900 rounded-md border-gray-700 text-white p-2 focus:border-goldenYellow-500 outline-none transition-colors"></textarea>
    </div>
);

const SelectField: React.FC<any> = ({ label, children, ...props }) => (
    <div>
        <label htmlFor={props.name} className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">{label}</label>
        <select {...props} id={props.name} className="w-full bg-gray-900 rounded-md border-gray-700 text-white p-2 focus:border-goldenYellow-500 outline-none transition-colors">
            {children}
        </select>
    </div>
);

const SectionHeader: React.FC<{ title: string }> = ({ title }) => (
    <div className="border-b border-gray-700 pb-2 mb-4 mt-6 first:mt-0">
        <h4 className="text-sm font-bold text-goldenYellow-400 uppercase tracking-widest">{title}</h4>
    </div>
);

const AdminEventModal: React.FC<AdminEventModalProps> = ({ event, onClose, onSave }) => {
  const [formData, setFormData] = useState<Omit<Event, 'id'>>({
    title: '',
    description: '',
    date: '',
    prize: '',
    vipPrize: '',
    prizePool: 300, // Explicit default
    imageUrl: '',
    status: 'future',
    entryCost: 50, // Explicit default
    goldenPassCost: 200, // Explicit default
    maxCapacity: 1000, // Added capacity
    allowedPlans: [],
  });

  useEffect(() => {
    if (event) {
      // Format date for datetime-local input if it exists
      const dateValue = event.date && !isNaN(Date.parse(event.date)) 
        ? new Date(event.date).toISOString().slice(0, 16) 
        : '';

      setFormData({ 
          ...event, 
          date: dateValue,
          allowedPlans: event.allowedPlans || [],
          prizePool: event.prizePool || 0,
          vipPrize: event.vipPrize || '',
          entryCost: event.entryCost || 50,
          goldenPassCost: event.goldenPassCost || 200,
          maxCapacity: event.maxCapacity || 1000
      });
    } else {
        // Reset form for new event
        const futureDate = new Date();
        futureDate.setDate(futureDate.getDate() + 30);
        setFormData({
            title: '',
            description: '',
            date: futureDate.toISOString().slice(0, 16),
            prize: '',
            vipPrize: '',
            prizePool: 300,
            imageUrl: '',
            status: 'future',
            entryCost: 50,
            goldenPassCost: 200,
            maxCapacity: 1000,
            allowedPlans: [],
        });
    }
  }, [event]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    const isNumber = ['entryCost', 'goldenPassCost', 'prizePool', 'maxCapacity'].includes(name);
    setFormData(prev => ({ ...prev, [name]: isNumber ? (parseInt(value, 10) || 0) : value }));
  };

  const handlePlanChange = (planName: User['plan']) => {
    setFormData(prev => {
        const currentPlans = prev.allowedPlans || [];
        if (currentPlans.includes(planName)) {
            return { ...prev, allowedPlans: currentPlans.filter(p => p !== planName) };
        } else {
            return { ...prev, allowedPlans: [...currentPlans, planName] };
        }
    });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // Ensure date is full ISO string for backend
    const finalDate = formData.date ? new Date(formData.date).toISOString() : new Date().toISOString();
    onSave({ ...formData, date: finalDate, id: event?.id || '' });
  };

  return (
    <ModalPortal>
        <div className="fixed inset-0 bg-black bg-opacity-90 flex items-center justify-center z-[9999] p-4 backdrop-blur-sm">
        <div className="bg-[#121212] rounded-xl border border-gray-800 p-6 md:p-8 max-w-2xl w-full flex flex-col max-h-[90vh]">
            <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-bold text-white font-chakra uppercase tracking-wider">
                    {event ? 'Editar Evento' : 'Novo Evento'}
                </h2>
                <button onClick={onClose} className="text-gray-500 hover:text-white text-2xl">&times;</button>
            </div>
            
            <form onSubmit={handleSubmit} className="space-y-4 overflow-y-auto pr-2 custom-scrollbar flex-1">
            
            <SectionHeader title="Dados Básicos" />
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <InputField label="Título do Evento" name="title" value={formData.title} onChange={handleChange} required />
                <InputField label="Data de Encerramento" name="date" type="datetime-local" value={formData.date} onChange={handleChange} required />
            </div>
            <TextAreaField label="Descrição (Storytelling)" name="description" value={formData.description} onChange={handleChange} required />
            <InputField label="URL da Imagem (Capa)" name="imageUrl" value={formData.imageUrl} onChange={handleChange} placeholder="https://..." required />
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <SelectField label="Status do Evento" name="status" value={formData.status} onChange={handleChange}>
                    <option value="future">Futuro (Agendado)</option>
                    <option value="current">Atual (Ao Vivo)</option>
                    <option value="past">Passado (Arquivado)</option>
                </SelectField>
                <InputField label="Capacidade da Arena" name="maxCapacity" type="number" value={formData.maxCapacity} onChange={handleChange} required />
            </div>

            <SectionHeader title="Economia Standard (Mercenário)" />
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 bg-gray-900/30 rounded-lg border border-gray-800">
                <InputField label="Custo do Ticket (Coins)" name="entryCost" type="number" value={formData.entryCost} onChange={handleChange} required />
                <InputField label="Prêmio em Coins (Pool)" name="prizePool" type="number" value={formData.prizePool} onChange={handleChange} />
                <div className="md:col-span-2">
                    <InputField label="Descrição do Prêmio Principal" name="prize" value={formData.prize} onChange={handleChange} required />
                </div>
            </div>

            <SectionHeader title="Economia Golden (A Lenda)" />
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 bg-yellow-900/10 rounded-lg border border-yellow-600/30">
                <InputField label="Custo Golden Pass (VIP)" name="goldenPassCost" type="number" value={formData.goldenPassCost} onChange={handleChange} required />
                <InputField label="Descrição do Prêmio VIP" name="vipPrize" value={formData.vipPrize} onChange={handleChange} placeholder="Ex: Item Lendário + Mentoria" />
            </div>
            
            <SectionHeader title="Configurações de Acesso" />
            <div>
                <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Planos Permitidos (Vazio = Todos)</label>
                <div className="grid grid-cols-2 gap-2">
                    {ALL_PLANS.map(planName => (
                        <label key={planName} className="flex items-center space-x-2 bg-gray-900 p-3 rounded-md cursor-pointer border border-gray-800 hover:border-gray-600 transition-colors">
                            <input
                                type="checkbox"
                                checked={(formData.allowedPlans || []).includes(planName)}
                                onChange={() => handlePlanChange(planName)}
                                className="h-4 w-4 rounded bg-gray-700 border-gray-600 text-goldenYellow-500 focus:ring-goldenYellow-500"
                            />
                            <span className="text-sm text-gray-300">{planName}</span>
                        </label>
                    ))}
                </div>
            </div>

            </form>
            
            <div className="mt-6 flex justify-end space-x-4 pt-4 border-t border-gray-800">
                <button type="button" onClick={onClose} className="py-3 px-6 rounded-lg bg-gray-800 hover:bg-gray-700 text-gray-300 font-bold transition-colors">Cancelar</button>
                <button onClick={handleSubmit} className="py-3 px-8 rounded-lg bg-goldenYellow-500 text-black font-bold hover:bg-goldenYellow-400 transition-colors uppercase tracking-wide shadow-lg shadow-goldenYellow-500/20">Salvar Evento</button>
            </div>
        </div>
        </div>
    </ModalPortal>
  );
};

export default AdminEventModal;
