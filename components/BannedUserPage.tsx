import React from 'react';
import type { User } from '../types';
import { ShieldIcon } from '../constants';
import { useAppContext } from '../constants';

interface BannedUserPageProps {
  user: User;
}

const BannedUserPage: React.FC<BannedUserPageProps> = ({ user }) => {
  const { dispatch } = useAppContext();

  const handleLogout = () => {
    dispatch({ type: 'LOGOUT' });
  };

  const isPermanent = !user.banExpiresAt;
  const expiryDate = user.banExpiresAt ? new Date(user.banExpiresAt).toLocaleString('pt-BR', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  }) : null;

  return (
    <div className="min-h-screen bg-cinematicBlack flex items-center justify-center p-4 font-sans text-white">
      <div className="max-w-lg w-full bg-[#121212] p-8 rounded-2xl border border-red-500/50 shadow-2xl shadow-red-500/10 text-center">
        <ShieldIcon className="w-20 h-20 mx-auto text-red-500 mb-4" />
        
        <h1 className="text-3xl font-bold text-red-400">
          {isPermanent ? 'Conta Permanentemente Banida' : 'Sua Conta está Suspensa'}
        </h1>

        <p className="text-gray-300 mt-4">Olá, {user.name}. Sua conta foi {isPermanent ? 'banida' : 'suspensa'} por violar nossas diretrizes da comunidade.</p>
        
        <div className="my-6 p-4 bg-gray-900/50 rounded-lg border border-gray-700 text-left">
          <p className="text-sm text-gray-400 font-semibold">Motivo:</p>
          <p className="text-white mt-1">{user.banReason || 'Nenhum motivo especificado.'}</p>
        </div>

        {!isPermanent && expiryDate && (
          <div className="my-6">
            <p className="text-gray-300">Sua suspensão terminará em:</p>
            <p className="text-xl font-bold text-goldenYellow-300 mt-1">{expiryDate}</p>
          </div>
        )}

        <p className="text-sm text-gray-500 mt-8">
          Se você acredita que isso foi um erro, por favor, entre em contato com nosso suporte em <a href="mailto:suporte@artistworld.com" className="text-goldenYellow-400 hover:underline">suporte@artistworld.com</a>.
        </p>
        
        <button 
          onClick={handleLogout}
          className="w-full mt-8 bg-goldenYellow-500 text-black font-bold py-3 px-4 rounded-lg hover:bg-goldenYellow-400 transition-colors"
        >
          Sair
        </button>
      </div>
    </div>
  );
};

export default BannedUserPage;