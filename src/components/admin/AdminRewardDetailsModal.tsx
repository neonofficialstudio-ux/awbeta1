
import React, { useState } from 'react';
import { isSupabaseProvider } from '../../api/core/backendGuard';
import { getSupabase } from '../../api/supabase/client';
import { config } from '../../core/config';
import type { RedeemedItem } from '../../types';
import { ModalPortal } from '../ui/overlays/ModalPortal';
import { CheckIcon } from '../../constants';

interface AdminRewardDetailsModalProps {
  item: RedeemedItem;
  onClose: () => void;
  onSetDeadline?: (itemId: string, date: string) => Promise<void>;
}

const DetailField: React.FC<{ label: string; value: string | undefined; isBlock?: boolean; isLink?: boolean }> = ({ label, value, isBlock = false, isLink = false }) => (
    <div>
        <h4 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">{label}</h4>
        {isLink && value ? (
            <a href={value} target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:text-blue-300 underline break-all text-sm">
                {value}
            </a>
        ) : isBlock ? (
             <pre className="mt-1 text-gray-200 bg-gray-900/50 p-3 rounded-md whitespace-pre-wrap font-sans text-sm border border-gray-700">{value || 'Não fornecido'}</pre>
        ) : (
            <p className="text-gray-200 text-sm font-medium">{value || 'Não fornecido'}</p>
        )}
    </div>
);

const AdminRewardDetailsModal: React.FC<AdminRewardDetailsModalProps> = ({ item, onClose, onSetDeadline }) => {
  const [deadline, setDeadline] = useState(item.estimatedCompletionDate ? new Date(item.estimatedCompletionDate).toISOString().split('T')[0] : '');
  const [isSaving, setIsSaving] = useState(false);
  const [request, setRequest] = useState<any | null>(null);
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);

  React.useEffect(() => {
    const run = async () => {
      try {
        setLoadError(null);

        // Se ainda existir formData legado, mostra sem buscar
        if (item.formData) return;

        // Só busca no modo Supabase
        if (!isSupabaseProvider() || config.backendProvider !== 'supabase') return;

        setLoading(true);
        const supabase = getSupabase();
        if (!supabase) throw new Error('Supabase client not initialized');

        const { data, error } = await supabase
          .from('production_requests')
          .select('id,status,category,briefing,assets,result,admin_notes,created_at,updated_at')
          .eq('inventory_id', item.id)
          .single();

        if (error) throw error;
        setRequest(data);
      } catch (e: any) {
        setLoadError(e?.message || 'Falha ao carregar briefing');
      } finally {
        setLoading(false);
      }
    };

    run();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [item.id]);
  
  const handleSaveDeadline = async () => {
    if (deadline && onSetDeadline) {
      setIsSaving(true);
      await onSetDeadline(item.id, new Date(deadline).toISOString());
      setIsSaving(false);
      onClose();
    }
  };

  const openImage = (base64: string) => {
      const w = window.open("");
      if(w) {
          w.document.write(`<img src="${base64}" style="max-width: 100%; height: auto;" />`);
          w.document.title = "Visual Reference";
      }
  };

  const briefing = item.formData || request?.briefing || {};
  const assets = item.formData ? { audioFile: item.formData.audioFile, referenceImages: item.formData.referenceImages } : (request?.assets || {});

  return (
    <ModalPortal>
        <div className="fixed inset-0 z-[10000] flex items-center justify-center p-4 bg-black/90 backdrop-blur-sm animate-fade-in" onClick={onClose}>
          <div 
            className="bg-[#121212] rounded-2xl border border-gray-800 w-full max-w-2xl flex flex-col max-h-[90vh] shadow-2xl relative overflow-hidden"
            onClick={e => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex justify-between items-start p-6 border-b border-gray-800 bg-[#151515]">
              <div>
                <div className="flex items-center gap-2 mb-1">
                    <h2 className="text-xl font-bold text-white">Detalhes do Pedido</h2>
                    <span className="bg-gray-800 text-gray-400 text-[10px] px-2 py-0.5 rounded border border-gray-700">{item.id.slice(0, 8)}...</span>
                </div>
                <p className="text-goldenYellow-400 text-sm font-medium">{item.itemName}</p>
              </div>
              <button onClick={onClose} className="text-gray-500 hover:text-white p-2 hover:bg-gray-800 rounded-full transition-colors">
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>
            
            <div className="overflow-y-auto p-6 space-y-8 custom-scrollbar flex-1 bg-[#0E0E0E]">
              {/* Status Banner for Completed Items */}
              {item.status === 'Used' && (
                  <div className="bg-green-900/20 border border-green-500/30 p-4 rounded-xl flex flex-col gap-2">
                      <div className="flex items-center gap-2 text-green-400 font-bold uppercase text-xs tracking-wider">
                          <CheckIcon className="w-4 h-4" /> Pedido Concluído
                      </div>
                      {item.completionUrl && (
                          <div className="mt-1">
                              <p className="text-[10px] text-gray-400 uppercase font-bold mb-1">Link de Entrega Enviado:</p>
                              <a href={item.completionUrl} target="_blank" rel="noopener noreferrer" className="text-white hover:text-blue-400 underline break-all text-sm font-mono block bg-black/40 p-2 rounded border border-white/10">
                                  {item.completionUrl}
                              </a>
                          </div>
                      )}
                  </div>
              )}

              {loading && (
                <div className="bg-gray-900/50 border border-gray-800 p-4 rounded-xl text-gray-300 text-sm">
                  Carregando briefing...
                </div>
              )}

              {loadError && (
                <div className="bg-red-900/20 border border-red-500/30 p-4 rounded-xl text-red-300 text-sm">
                  {loadError}
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                 <div className="space-y-6">
                    <DetailField label="Cliente" value={item.userName} />
                    <DetailField label="Nome da Música" value={briefing.songName} />
                 </div>
                 
                 {/* Audio Player */}
                 <div>
                    <h4 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Áudio de Referência</h4>
                    {assets.audioFile ? (
                        <div className="bg-gray-900 rounded-lg p-2 border border-gray-800">
                             <audio controls src={assets.audioFile} className="w-full h-8 custom-audio-player">
                                Seu navegador não suporta o elemento de áudio.
                             </audio>
                        </div>
                    ) : (
                        <p className="text-gray-600 text-sm italic">Nenhum áudio anexado.</p>
                    )}
                 </div>
              </div>

              <div className="space-y-6">
                  <DetailField label="Ideia / Conceito" value={briefing.idea} isBlock />
                  <DetailField label="Letra da Música" value={briefing.lyrics} isBlock />
              </div>

              {/* Reference Images Section */}
              {assets.referenceImages && assets.referenceImages.length > 0 && (
                  <div>
                      <h4 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-3">Referências Visuais</h4>
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                          {assets.referenceImages.map((img, idx) => (
                              <div key={idx} className="relative aspect-square rounded-lg overflow-hidden border border-gray-700 bg-black group shadow-sm hover:border-goldenYellow-500/50 transition-colors">
                                  <img 
                                      src={img} 
                                      alt={`Referência ${idx + 1}`} 
                                      className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105 cursor-pointer opacity-80 group-hover:opacity-100"
                                      onClick={() => openImage(img)}
                                      title="Clique para ampliar"
                                  />
                                  <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center pointer-events-none">
                                      <span className="text-white text-[10px] font-bold uppercase tracking-widest bg-black/60 px-2 py-1 rounded backdrop-blur-sm">Ver</span>
                                  </div>
                              </div>
                          ))}
                      </div>
                  </div>
              )}
              
              {/* Deadline Manager */}
              {item.status === 'InProgress' && onSetDeadline && (
                <div className="pt-6 border-t border-gray-800">
                    <h4 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-3">Gerenciar Prazo de Entrega</h4>
                    <div className="flex flex-col sm:flex-row items-center gap-3 bg-gray-900/50 p-3 rounded-xl border border-gray-800">
                        <input 
                            type="date"
                            value={deadline}
                            onChange={(e) => setDeadline(e.target.value)}
                            className="bg-[#111] rounded-lg border border-gray-700 text-white p-2.5 w-full sm:w-auto focus:border-goldenYellow-500 outline-none text-sm"
                        />
                        <button 
                            onClick={handleSaveDeadline}
                            disabled={!deadline || isSaving}
                            className="w-full sm:w-auto py-2.5 px-6 rounded-lg bg-goldenYellow-500 text-black font-bold text-sm hover:bg-goldenYellow-400 transition-colors disabled:bg-gray-700 disabled:text-gray-500 disabled:cursor-not-allowed flex items-center justify-center min-w-[120px]"
                        >
                            {isSaving ? <div className="w-4 h-4 border-2 border-t-transparent border-black rounded-full animate-spin"></div> : 'Salvar Data'}
                        </button>
                    </div>
                </div>
              )}

            </div>
          </div>
        </div>
    </ModalPortal>
  );
};

export default AdminRewardDetailsModal;
