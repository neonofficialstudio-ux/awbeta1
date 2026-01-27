import React, { useState, useEffect } from 'react';
import type { User } from '../../types';

interface AdminUserEditModalProps {
  user: User;
  onClose: () => void;
  onSave: (user: User) => void;
}

const extractUsername = (url: string | undefined): string => {
    if (!url) return '';
    try {
        const path = new URL(url).pathname;
        const parts = path.split('/').filter(p => p);
        if (url.includes('tiktok.com')) {
            return parts.find(p => p.startsWith('@'))?.replace('@', '') || parts[0] || '';
        }
        return parts[0] || '';
    } catch (e) {
        return '';
    }
};

const formatPhoneNumber = (value: string): string => {
  const cleaned = ('' + value).replace(/\D/g, '');
  const match = cleaned.match(/^(\d{0,2})(\d{0,2})(\d{0,5})(\d{0,4})$/);
  if (!match) return value;
  
  let formatted = '';
  if (match[1]) {
    formatted += '+' + match[1];
  }
  if (match[2]) {
    formatted += ' (' + match[2] + ')';
  }
  if (match[3]) {
    formatted += ' ' + match[3];
  }
  if (match[4]) {
    formatted += '-' + match[4];
  }
  return formatted;
};

const InputField: React.FC<{
  label: string;
  name: string;
  value: any;
  type?: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => void;
  disabled?: boolean;
  placeholder?: string;
}> = ({ label, name, value, type = "text", onChange, disabled, placeholder }) => (
    <div>
      <label htmlFor={name} className="block text-sm font-medium text-gray-300 mb-1">{label}</label>
      <input 
        type={type} 
        name={name} 
        id={name} 
        value={String(value)} 
        onChange={onChange}
        disabled={disabled}
        placeholder={placeholder}
        className="w-full bg-gray-800 rounded-md border-gray-700 text-white p-2 disabled:bg-gray-900/50 disabled:text-gray-500 disabled:cursor-not-allowed"
      />
    </div>
);

const AdminUserEditModal: React.FC<AdminUserEditModalProps> = ({ user, onClose, onSave }) => {
  const [formData, setFormData] = useState<User>(user);
  const [instagramUsername, setInstagramUsername] = useState('');
  const [tiktokUsername, setTiktokUsername] = useState('');

  useEffect(() => {
    setFormData(user);
    setInstagramUsername(extractUsername(user.instagramUrl));
    setTiktokUsername(extractUsername(user.tiktokUrl));
  }, [user]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => {
        const isNumeric = ['level', 'xp', 'coins', 'monthlyMissionsCompleted'].includes(name);
        let updatedValue: string | number = value;

        if (name === 'phone') {
            updatedValue = formatPhoneNumber(value);
        } else if (isNumeric) {
            updatedValue = parseInt(value) || 0;
        }
        
        return { ...prev, [name]: updatedValue };
    });
  };

  const handleUsernameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    const sanitizedValue = value.replace(/[^a-zA-Z0-9_.]/g, '').replace('@','');
    if (name === 'instagramUsername') {
        setInstagramUsername(sanitizedValue);
    } else if (name === 'tiktokUsername') {
        setTiktokUsername(sanitizedValue);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const dataToSave = {
        ...formData,
        instagramUrl: `https://www.instagram.com/${instagramUsername}`,
        tiktokUrl: tiktokUsername ? `https://www.tiktok.com/@${tiktokUsername}` : '',
    };
    onSave(dataToSave);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4">
      <div className="bg-[#121212] rounded-xl border border-gray-800 p-6 md:p-8 max-w-lg w-full">
        <div className="flex items-center mb-6">
            <img src={user.avatarUrl} alt={user.name} className="w-12 h-12 rounded-full mr-4" />
            <div>
                <h2 className="text-2xl font-bold text-goldenYellow-400">Editar Usuário</h2>
                <p className="text-gray-400">{user.name}</p>
            </div>
        </div>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <InputField label="Nome Artístico" name="artisticName" value={formData.artisticName || ''} onChange={handleChange} />
            <InputField label="Telefone" name="phone" value={formData.phone || ''} onChange={handleChange} placeholder="+55 (11) 99999-9999"/>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <InputField label="Nível" name="level" value={formData.level} type="number" onChange={handleChange} disabled />
            <InputField label="XP" name="xp" value={formData.xp} type="number" onChange={handleChange} />
            <InputField label="Coins" name="coins" value={formData.coins} type="number" onChange={handleChange} />
          </div>
           <div>
            <label htmlFor="plan" className="block text-sm font-medium text-gray-300 mb-1">Plano</label>
            <select name="plan" id="plan" value={formData.plan} onChange={handleChange} className="w-full bg-gray-800 rounded-md border-gray-700 text-white p-2">
              <option value="Free Flow">Free Flow</option>
              <option value="Artista em Ascensão">Artista em Ascensão</option>
              <option value="Artista Profissional">Artista Profissional</option>
              <option value="Hitmaker">Hitmaker</option>
            </select>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <InputField label="Instagram" name="instagramUsername" value={instagramUsername} onChange={handleUsernameChange} />
            <InputField label="TikTok" name="tiktokUsername" value={tiktokUsername} onChange={handleUsernameChange} />
          </div>
          <div className="mt-6 flex justify-end space-x-4 pt-4 border-t border-gray-800">
            <button type="button" onClick={onClose} className="py-2 px-4 rounded-lg bg-gray-700 hover:bg-gray-600 transition-colors">Cancelar</button>
            <button type="submit" className="py-2 px-6 rounded-lg bg-goldenYellow-500 text-black font-bold hover:bg-goldenYellow-400 transition-colors">Salvar Alterações</button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AdminUserEditModal;
