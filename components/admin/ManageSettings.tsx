import React, { useState } from 'react';

interface ManageSettingsProps {
  termsContent: string;
  onUpdateTerms: (newTerms: string) => void;
}

const ManageSettings: React.FC<ManageSettingsProps> = ({ termsContent, onUpdateTerms }) => {
  const [currentTerms, setCurrentTerms] = useState(termsContent);
  const [isSaved, setIsSaved] = useState(false);

  const handleSave = () => {
    onUpdateTerms(currentTerms);
    setIsSaved(true);
    setTimeout(() => setIsSaved(false), 2000); // Hide message after 2 seconds
  };

  return (
    <div className="bg-[#121212] p-6 rounded-xl border border-gray-800">
      <h3 className="text-xl font-bold mb-2">Termos e Condições</h3>
      <p className="text-sm text-gray-400 mb-6">Edite o conteúdo dos termos que os usuários devem aceitar durante o registro.</p>
      
      <textarea
        value={currentTerms}
        onChange={(e) => setCurrentTerms(e.target.value)}
        rows={15}
        className="w-full bg-gray-900 border border-gray-700 rounded-lg p-4 text-gray-300 font-mono text-sm focus:outline-none focus:ring-2 focus:ring-goldenYellow-500"
      />

      <div className="mt-6 flex justify-end items-center">
        {isSaved && <p className="text-green-400 mr-4 transition-opacity duration-300">Termos salvos e usuários notificados!</p>}
        <button
          onClick={handleSave}
          className="bg-goldenYellow-500 text-black font-bold py-2 px-6 rounded-lg hover:bg-goldenYellow-400 transition-colors"
        >
          Salvar Alterações
        </button>
      </div>
    </div>
  );
};

export default ManageSettings;