
import React, { useState, useEffect } from 'react';
import type { StoreItem } from '../../types';

interface AdminStoreItemModalProps {
  item: StoreItem | null;
  onClose: () => void;
  onSave: (item: StoreItem) => void;
}

// Moved outside the main component to prevent re-creation on every render
const InputField: React.FC<any> = ({ label, ...props }) => (
    <div>
        <label htmlFor={props.name} className="block text-sm font-medium text-gray-300 mb-1">{label}</label>
        <input {...props} id={props.name} className="w-full bg-gray-800 rounded-md border-gray-700 text-white p-2"/>
    </div>
);

const AdminStoreItemModal: React.FC<AdminStoreItemModalProps> = ({ item, onClose, onSave }) => {
  const [formData, setFormData] = useState<Omit<StoreItem, 'id' | 'exchanges'>>({
    name: '',
    description: '',
    price: 0,
    rarity: 'Regular',
    imageUrl: '',
    previewUrl: '',
  });

  useEffect(() => {
    if (item) {
      setFormData(item);
    }
  }, [item]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: name === 'price' ? parseInt(value) : value }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave({ 
        ...formData, 
        id: item?.id || '',
        exchanges: item?.exchanges || 0,
    });
  };
  
  return (
    <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4">
      <div className="bg-[#121212] rounded-xl border border-gray-800 p-6 md:p-8 max-w-lg w-full">
        <h2 className="text-2xl font-bold text-goldenYellow-400 mb-6">{item ? 'Editar Item da Loja' : 'Adicionar Novo Item'}</h2>
        <form onSubmit={handleSubmit} className="space-y-4 max-h-[80vh] overflow-y-auto pr-2">
          <InputField label="Nome do Item" name="name" value={formData.name} onChange={handleChange} required />
          <div>
            <label htmlFor="description" className="block text-sm font-medium text-gray-300 mb-1">Descrição</label>
            <textarea name="description" id="description" value={formData.description} onChange={handleChange} required rows={3} className="w-full bg-gray-800 rounded-md border-gray-700 text-white p-2"></textarea>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <InputField label="Preço (Coins)" name="price" type="number" value={formData.price} onChange={handleChange} required />
            <div>
              <label htmlFor="rarity" className="block text-sm font-medium text-gray-300 mb-1">Raridade</label>
              <select name="rarity" id="rarity" value={formData.rarity} onChange={handleChange} className="w-full bg-gray-800 rounded-md border-gray-700 text-white p-2">
                <option value="Regular">Regular</option>
                <option value="Raro">Raro</option>
                <option value="Épico">Épico</option>
                <option value="Lendário">Lendário</option>
              </select>
            </div>
          </div>
          <InputField label="URL da Imagem de Capa" name="imageUrl" value={formData.imageUrl} onChange={handleChange} placeholder="https://..." required />
          <InputField label="Link do Preview (Opcional)" name="previewUrl" value={formData.previewUrl || ''} onChange={handleChange} placeholder="https://youtube.com/..." />
          
          <div className="mt-6 flex justify-end space-x-4 pt-4 border-t border-gray-800">
            <button type="button" onClick={onClose} className="py-2 px-4 rounded-lg bg-gray-700 hover:bg-gray-600 transition-colors">Cancelar</button>
            <button type="submit" className="py-2 px-6 rounded-lg bg-goldenYellow-500 text-black font-bold hover:bg-goldenYellow-400 transition-colors">Salvar</button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AdminStoreItemModal;
