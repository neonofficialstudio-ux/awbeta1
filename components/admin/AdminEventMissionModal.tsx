
import React, { useState, useEffect } from 'react';
import type { EventMission, Event } from '../../types';

interface AdminEventMissionModalProps {
  mission: EventMission | null;
  events: Event[];
  onClose: () => void;
  onSave: (mission: EventMission) => void;
  preSelectedEventId?: string;
}

const AdminEventMissionModal: React.FC<AdminEventMissionModalProps> = ({ mission, events, onClose, onSave, preSelectedEventId }) => {
  const [formData, setFormData] = useState<Omit<EventMission, 'id'>>({
    eventId: '',
    title: '',
    description: '',
    points: 100,
    xp: 50,
    actionUrl: '',
  });

  useEffect(() => {
    if (mission) {
      setFormData(mission);
    } else {
        // Pre-select first event if creating a new mission
        if (preSelectedEventId) {
            setFormData(prev => ({ ...prev, eventId: preSelectedEventId }));
        } else if (events.length > 0) {
            setFormData(prev => ({ ...prev, eventId: events[0].id }));
        }
    }
  }, [mission, events, preSelectedEventId]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: name === 'points' || name === 'xp' ? parseInt(value) : value }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.eventId) {
        alert('Por favor, selecione um evento.');
        return;
    }
    onSave({ 
        ...formData, 
        id: mission?.id || '',
    });
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4">
      <div className="bg-[#121212] rounded-xl border border-gray-800 p-6 md:p-8 max-w-lg w-full">
        <h2 className="text-2xl font-bold text-goldenYellow-400 mb-6">{mission ? 'Editar Missão de Evento' : 'Nova Missão de Evento'}</h2>
        <form onSubmit={handleSubmit} className="space-y-4 max-h-[70vh] overflow-y-auto pr-2">
          
          <div>
            <label htmlFor="eventId" className="block text-sm font-medium text-gray-300 mb-1">Evento</label>
            <select 
                name="eventId" 
                id="eventId" 
                value={formData.eventId} 
                onChange={handleChange} 
                required 
                className="w-full bg-gray-800 rounded-md border-gray-700 text-white p-2"
                disabled={!!mission} // Lock event if editing
            >
              <option value="" disabled>Selecione um evento</option>
              {events.filter(e => e.status !== 'past').map(event => (
                <option key={event.id} value={event.id}>{event.title}</option>
              ))}
            </select>
          </div>

          <div>
            <label htmlFor="title" className="block text-sm font-medium text-gray-300 mb-1">Título da Missão</label>
            <input type="text" name="title" id="title" value={formData.title} onChange={handleChange} required className="w-full bg-gray-800 rounded-md border-gray-700 text-white p-2"/>
          </div>

          <div>
            <label htmlFor="description" className="block text-sm font-medium text-gray-300 mb-1">Descrição</label>
            <textarea name="description" id="description" value={formData.description} onChange={handleChange} required rows={3} className="w-full bg-gray-800 rounded-md border-gray-700 text-white p-2"></textarea>
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label htmlFor="points" className="block text-sm font-medium text-gray-300 mb-1">Pontos de Ranking</label>
              <input type="number" name="points" id="points" value={formData.points} onChange={handleChange} required min="0" className="w-full bg-gray-800 rounded-md border-gray-700 text-white p-2"/>
            </div>
            <div>
              <label htmlFor="xp" className="block text-sm font-medium text-gray-300 mb-1">XP de Recompensa</label>
              <input type="number" name="xp" id="xp" value={formData.xp} onChange={handleChange} required min="0" className="w-full bg-gray-800 rounded-md border-gray-700 text-white p-2"/>
            </div>
          </div>
          
          <div>
            <label htmlFor="actionUrl" className="block text-sm font-medium text-gray-300 mb-1">URL da Ação (Opcional)</label>
            <input type="url" name="actionUrl" id="actionUrl" value={formData.actionUrl || ''} onChange={handleChange} placeholder="https://..." className="w-full bg-gray-800 rounded-md border-gray-700 text-white p-2"/>
          </div>

          <div className="mt-6 flex justify-end space-x-4 pt-4 border-t border-gray-800">
            <button type="button" onClick={onClose} className="py-2 px-4 rounded-lg bg-gray-700 hover:bg-gray-600 transition-colors">Cancelar</button>
            <button type="submit" className="py-2 px-6 rounded-lg bg-goldenYellow-500 text-black font-bold hover:bg-goldenYellow-400 transition-colors">Salvar Missão</button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AdminEventMissionModal;
