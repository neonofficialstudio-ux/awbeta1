import React, { useState, useEffect } from 'react';
import type { Advertisement } from '../../types';

interface AdminAdvertisementModalProps {
  ad: Advertisement | null;
  onClose: () => void;
  onSave: (ad: Advertisement) => void;
}

const AdminAdvertisementModal: React.FC<AdminAdvertisementModalProps> = ({ ad, onClose, onSave }) => {
  const [formData, setFormData] = useState<Omit<Advertisement, 'id'>>({
    title: '',
    description: '',
    imageUrl: '',
    linkUrl: '',
    isActive: true,
    duration: 5, // Default duration
  });

  useEffect(() => {
    if (ad) {
      setFormData(ad);
    } else {
      // Reset to default for a new ad form
      setFormData({
        title: '',
        description: '',
        imageUrl: '',
        linkUrl: '',
        isActive: true,
        duration: 5,
      });
    }
  }, [ad]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target;
    if (type === 'checkbox') {
        const { checked } = e.target as HTMLInputElement;
        setFormData(prev => ({ ...prev, [name]: checked }));
    } else if (type === 'number') {
        setFormData(prev => ({ ...prev, [name]: Math.max(1, parseInt(value, 10) || 1) }));
    } else {
        setFormData(prev => ({ ...prev, [name]: value }));
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave({ ...formData, id: ad?.id || '' });
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4">
      <div className="bg-[#121212] rounded-xl border border-gray-800 p-6 md:p-8 max-w-lg w-full">
        <h2 className="text-2xl font-bold text-goldenYellow-400 mb-6">{ad ? 'Editar Anúncio' : 'Adicionar Anúncio'}</h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="title" className="block text-sm font-medium text-gray-300 mb-1">Título</label>
            <input type="text" name="title" id="title" value={formData.title} onChange={handleChange} required className="w-full bg-gray-800 rounded-md border-gray-700 text-white p-2"/>
          </div>
          <div>
            <label htmlFor="description" className="block text-sm font-medium text-gray-300 mb-1">Descrição</label>
            <textarea name="description" id="description" value={formData.description} onChange={handleChange} required rows={2} className="w-full bg-gray-800 rounded-md border-gray-700 text-white p-2"></textarea>
          </div>
          <div>
            <label htmlFor="imageUrl" className="block text-sm font-medium text-gray-300 mb-1">URL da Imagem</label>
            <input type="url" name="imageUrl" id="imageUrl" value={formData.imageUrl} onChange={handleChange} placeholder="https://..." required className="w-full bg-gray-800 rounded-md border-gray-700 text-white p-2"/>
          </div>
          <div>
            <label htmlFor="linkUrl" className="block text-sm font-medium text-gray-300 mb-1">URL do Link</label>
            <input type="url" name="linkUrl" id="linkUrl" value={formData.linkUrl} onChange={handleChange} placeholder="https://..." required className="w-full bg-gray-800 rounded-md border-gray-700 text-white p-2"/>
          </div>
          <div>
            <label htmlFor="duration" className="block text-sm font-medium text-gray-300 mb-1">Duração da Transição (segundos)</label>
            <input type="number" name="duration" id="duration" value={formData.duration} onChange={handleChange} min="1" required className="w-full bg-gray-800 rounded-md border-gray-700 text-white p-2"/>
          </div>
          <div className="flex items-center">
            <input type="checkbox" name="isActive" id="isActive" checked={formData.isActive} onChange={handleChange} className="h-4 w-4 text-goldenYellow-600 bg-gray-700 border-gray-600 focus:ring-goldenYellow-500 rounded" />
            <label htmlFor="isActive" className="ml-2 block text-sm text-gray-300">Ativo (visível no dashboard)</label>
          </div>
          <div className="mt-6 flex justify-end space-x-4 pt-4 border-t border-gray-800">
            <button type="button" onClick={onClose} className="py-2 px-4 rounded-lg bg-gray-700 hover:bg-gray-600 transition-colors">Cancelar</button>
            <button type="submit" className="py-2 px-6 rounded-lg bg-goldenYellow-500 text-black font-bold hover:bg-goldenYellow-400 transition-colors">Salvar</button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AdminAdvertisementModal;