import React, { useState, useEffect } from 'react';
import type { CoinPack } from '../../types';

interface AdminCoinPackModalProps {
  pack: CoinPack | null;
  onClose: () => void;
  onSave: (pack: CoinPack) => void;
}

const InputField: React.FC<{
  label: string;
  name: string;
  value: any;
  type?: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  step?: string;
}> = ({ label, name, value, type = "text", onChange, step }) => (
    <div>
      <label htmlFor={name} className="block text-sm font-medium text-gray-300 mb-1">{label}</label>
      <input 
        type={type} 
        name={name} 
        id={name} 
        value={String(value)} 
        onChange={onChange}
        step={step}
        className="w-full bg-gray-800 rounded-md border-gray-700 text-white p-2"
      />
    </div>
);

const AdminCoinPackModal: React.FC<AdminCoinPackModalProps> = ({ pack, onClose, onSave }) => {
  const [formData, setFormData] = useState<Omit<CoinPack, 'id'>>({
    name: '',
    coins: 10,
    price: 5,
    paymentLink: '',
    isOutOfStock: false,
    imageUrl: '',
  });

  useEffect(() => {
    if (pack) {
      setFormData(pack);
    } else {
      setFormData({
        name: '',
        coins: 10,
        price: 5,
        paymentLink: '',
        isOutOfStock: false,
        imageUrl: '',
      });
    }
  }, [pack]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    const isNumeric = ['coins', 'price'].includes(name);
    setFormData(prev => ({ ...prev, [name]: isNumeric ? Number(value) : value }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave({ 
      ...formData,
      id: pack?.id || '',
    });
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4">
      <div className="bg-[#121212] rounded-xl border border-gray-800 p-6 md:p-8 max-w-lg w-full">
        <h2 className="text-2xl font-bold text-goldenYellow-400 mb-6">{pack ? 'Editar Pacote de Moedas' : 'Adicionar Pacote de Moedas'}</h2>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <InputField label="Nome do Pacote" name="name" value={formData.name || ''} onChange={handleChange} />
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <InputField label="Quantidade de Moedas" name="coins" value={formData.coins} type="number" onChange={handleChange} />
            <InputField label="Preço (R$)" name="price" value={formData.price} type="number" step="0.01" onChange={handleChange} />
          </div>

          <InputField label="Link de Pagamento" name="paymentLink" value={formData.paymentLink || ''} type="url" onChange={handleChange} />
          <InputField label="URL da Imagem do Pacote (Opcional)" name="imageUrl" value={formData.imageUrl || ''} type="url" onChange={handleChange} />

          <div className="mt-6 flex justify-end space-x-4 pt-4 border-t border-gray-800">
            <button type="button" onClick={onClose} className="py-2 px-4 rounded-lg bg-gray-700 hover:bg-gray-600 transition-colors">Cancelar</button>
            <button type="submit" className="py-2 px-6 rounded-lg bg-goldenYellow-500 text-black font-bold hover:bg-goldenYellow-400 transition-colors">Salvar</button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AdminCoinPackModal;