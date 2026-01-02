
import React, { useState, useEffect } from 'react';
import type { Mission, MissionFormat } from '../../types';
import { ModalPortal } from '../ui/overlays/ModalPortal';
import { safeDate } from '../../api/utils/dateSafe';

interface AdminMissionModalProps {
  mission: Mission | null;
  onClose: () => void;
  onSave: (mission: Mission) => void;
}

const TEMPLATES = {
  custom: { label: 'Personalizado (Editar Livremente)', xp: 0, coins: 0 },
  curta: { label: 'Curta (1 LC / 15 XP)', xp: 15, coins: 1 },
  media: { label: 'Média (3 LC / 30 XP)', xp: 30, coins: 3 },
  longa: { label: 'Longa (6 LC / 60 XP)', xp: 60, coins: 6 },
};

// NEW STRICT TYPES
const VERIFICATION_TYPES: { label: string; value: MissionFormat }[] = [
    { label: 'Link (URL)', value: 'link' },
    { label: 'Upload de Foto (Print)', value: 'photo' },
    { label: 'Apenas Confirmação (Botão)', value: 'confirmation' },
];

const AdminMissionModal: React.FC<AdminMissionModalProps> = ({ mission, onClose, onSave }) => {
  const [formData, setFormData] = useState<Omit<Mission, 'id' | 'createdAt' | 'status'>>({
    title: '',
    description: '',
    xp: 0,
    coins: 0,
    type: 'instagram',
    actionUrl: '',
    deadline: new Date().toISOString().split('T')[0],
    format: 'link', // Default
    platform: 'Instagram',
    scheduledFor: '',
  });

  const [selectedTemplate, setSelectedTemplate] = useState<string>('custom');

  useEffect(() => {
    if (mission) {
      const safeDeadline = safeDate(mission.deadline);
      const safeScheduled = safeDate(mission.scheduledFor);
      const defaultDeadline = new Date();
      defaultDeadline.setDate(defaultDeadline.getDate() + 1);

      setFormData({
        ...mission,
        deadline: (safeDeadline || defaultDeadline).toISOString().split('T')[0],
        scheduledFor: safeScheduled ? safeScheduled.toISOString().slice(0, 16) : '',
        // Ensure format matches strict types (migration fallback for UI)
        format: ['link', 'photo', 'confirmation'].includes(mission.format as string) ? mission.format : 'link',
        platform: mission.platform || 'Instagram',
      });
      
      // Detect template logic
      if (mission.xp === 15 && mission.coins === 1) setSelectedTemplate('curta');
      else if (mission.xp === 30 && mission.coins === 3) setSelectedTemplate('media');
      else if (mission.xp === 60 && mission.coins === 6) setSelectedTemplate('longa');
      else setSelectedTemplate('custom');

    } else {
       const tomorrow = new Date();
       tomorrow.setDate(tomorrow.getDate() + 1);
       setFormData({ 
           title: '', 
           description: '', 
           xp: 15, 
           coins: 1, 
           type: 'instagram', 
           actionUrl: '', 
           deadline: tomorrow.toISOString().split('T')[0],
           format: 'link',
           platform: 'Instagram',
           scheduledFor: ''
       });
       setSelectedTemplate('curta');
    }
  }, [mission]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: name === 'xp' || name === 'coins' ? parseInt(value) : value }));
    
    if (name === 'xp' || name === 'coins') {
        setSelectedTemplate('custom');
    }
  };

  const handleTemplateChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
      const tmpl = e.target.value;
      setSelectedTemplate(tmpl);
      if (tmpl !== 'custom') {
          // @ts-ignore
          const values = TEMPLATES[tmpl];
          setFormData(prev => ({ ...prev, xp: values.xp, coins: values.coins }));
      }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (formData.xp < 0 || formData.coins < 0) {
        alert('XP e Coins não podem ser negativos.');
        return;
    }
    if (formData.title.length < 3) {
        alert('O título da missão é muito curto.');
        return;
    }

    let finalDeadlineISO = new Date().toISOString();
    const safeDeadline = safeDate(formData.deadline);
    if (safeDeadline) {
         finalDeadlineISO = safeDeadline.toISOString().replace('T00:00:00.000Z', 'T23:59:59.999Z');
    }

    let finalScheduledFor: string | undefined = undefined;
    const safeScheduled = safeDate(formData.scheduledFor);
    if (safeScheduled) {
        finalScheduledFor = safeScheduled.toISOString();
    }

    onSave({ 
        ...formData, 
        id: mission?.id || '',
        createdAt: mission?.createdAt || new Date().toISOString(),
        status: mission?.status || 'active',
        deadline: finalDeadlineISO,
        scheduledFor: finalScheduledFor,
    });
  };

  return (
    <ModalPortal>
        <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-[9999] p-4">
        <div className="bg-[#121212] rounded-xl border border-gray-800 p-6 md:p-8 max-w-lg w-full flex flex-col max-h-[90vh]">
            <h2 className="text-2xl font-bold text-goldenYellow-400 mb-6">{mission ? 'Editar Missão' : 'Adicionar Nova Missão'}</h2>
            <form onSubmit={handleSubmit} className="space-y-4 overflow-y-auto pr-2 custom-scrollbar">
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-gray-900/50 p-3 rounded-lg border border-gray-700">
                    <label htmlFor="format" className="block text-xs font-bold text-gray-400 mb-1 uppercase">Tipo de Comprovação</label>
                    <select 
                        name="format"
                        id="format" 
                        value={formData.format} 
                        onChange={handleChange} 
                        className="w-full bg-gray-800 rounded-md border-gray-600 text-white p-2 text-sm focus:border-goldenYellow-500"
                    >
                        {VERIFICATION_TYPES.map((type) => (
                            <option key={type.value} value={type.value}>{type.label}</option>
                        ))}
                    </select>
                </div>
                
                <div className="bg-gray-900/50 p-3 rounded-lg border border-gray-700">
                    <label htmlFor="template" className="block text-xs font-bold text-gray-400 mb-1 uppercase">Recompensas (Preset)</label>
                    <select 
                        id="template" 
                        value={selectedTemplate} 
                        onChange={handleTemplateChange} 
                        className="w-full bg-gray-800 rounded-md border-gray-600 text-white p-2 text-sm focus:border-goldenYellow-500"
                    >
                        {Object.entries(TEMPLATES).map(([key, val]) => (
                            <option key={key} value={key}>{val.label}</option>
                        ))}
                    </select>
                </div>
            </div>

            <div>
                <label htmlFor="title" className="block text-sm font-medium text-gray-300 mb-1">Título</label>
                <input type="text" name="title" id="title" value={formData.title} onChange={handleChange} required className="w-full bg-gray-800 rounded-md border-gray-700 text-white p-2"/>
            </div>
            <div>
                <label htmlFor="description" className="block text-sm font-medium text-gray-300 mb-1">Descrição</label>
                <textarea name="description" id="description" value={formData.description} onChange={handleChange} required rows={3} className="w-full bg-gray-800 rounded-md border-gray-700 text-white p-2"></textarea>
            </div>
            <div>
                <label htmlFor="actionUrl" className="block text-sm font-medium text-gray-300 mb-1">URL da Ação (Opcional - Botão)</label>
                <input type="url" name="actionUrl" id="actionUrl" value={formData.actionUrl} onChange={handleChange} placeholder="https://..." className="w-full bg-gray-800 rounded-md border-gray-700 text-white p-2"/>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
                <div>
                    <label htmlFor="deadline" className="block text-sm font-medium text-gray-300 mb-1">Prazo Final</label>
                    <input type="date" name="deadline" id="deadline" value={formData.deadline} onChange={handleChange} required className="w-full bg-gray-800 rounded-md border-gray-700 text-white p-2"/>
                </div>
                <div>
                    <label htmlFor="scheduledFor" className="block text-sm font-medium text-goldenYellow-300 mb-1">Agendar (Opcional)</label>
                    <input type="datetime-local" name="scheduledFor" id="scheduledFor" value={formData.scheduledFor} onChange={handleChange} className="w-full bg-gray-800 rounded-md border-goldenYellow-600 text-white p-2"/>
                </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
                <div>
                <label htmlFor="xp" className="block text-sm font-medium text-gray-300 mb-1">XP</label>
                <input type="number" name="xp" id="xp" value={formData.xp} onChange={handleChange} required className="w-full bg-gray-800 rounded-md border-gray-700 text-white p-2"/>
                </div>
                <div>
                <label htmlFor="coins" className="block text-sm font-medium text-gray-300 mb-1">Coins</label>
                <input type="number" name="coins" id="coins" value={formData.coins} onChange={handleChange} required className="w-full bg-gray-800 rounded-md border-gray-700 text-white p-2"/>
                </div>
            </div>
            
            <div className="grid grid-cols-2 gap-4 p-3 border border-dashed border-gray-700 rounded-lg">
                <div>
                    <label htmlFor="platform" className="block text-xs font-medium text-gray-400 mb-1">Plataforma (Tag)</label>
                    <input type="text" name="platform" id="platform" value={formData.platform} onChange={handleChange} className="w-full bg-gray-800 rounded-md border-gray-700 text-white p-2 text-sm"/>
                </div>
                <div>
                    <label htmlFor="type" className="block text-xs font-medium text-gray-400 mb-1">Ícone</label>
                    <select name="type" id="type" value={formData.type} onChange={handleChange} className="w-full bg-gray-800 rounded-md border-gray-700 text-white p-2 text-sm">
                    <option value="instagram">Instagram</option>
                    <option value="tiktok">TikTok</option>
                    <option value="youtube">YouTube</option>
                    <option value="creative">Criativa (Estrela)</option>
                    <option value="special">Especial (Coroa)</option>
                    </select>
                </div>
            </div>

            <div className="mt-6 flex justify-end space-x-4 pt-4 border-t border-gray-800">
                <button type="button" onClick={onClose} className="py-2 px-4 rounded-lg bg-gray-700 hover:bg-gray-600 transition-colors">Cancelar</button>
                <button type="submit" className="py-2 px-6 rounded-lg bg-goldenYellow-500 text-black font-bold hover:bg-goldenYellow-400 transition-colors">Salvar</button>
            </div>
            </form>
        </div>
        </div>
    </ModalPortal>
  );
};

export default AdminMissionModal;
