
import React, { useState } from 'react';
import { ModalPortal } from './ui/overlays/ModalPortal';
import type { EventMission } from '../types';
import { CheckIcon } from '../constants';
import { useAppContext } from '../constants';
import { socialLinkValidator } from '../api/quality/socialLinkValidator';

interface EventMissionSubmissionModalProps {
    mission: EventMission;
    onClose: () => void;
    onSubmit: (proof: string) => Promise<void>;
}

const EventMissionSubmissionModal: React.FC<EventMissionSubmissionModalProps> = ({ mission, onClose, onSubmit }) => {
    const [proofUrl, setProofUrl] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const { dispatch } = useAppContext(); 

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);
        
        const trimmedUrl = proofUrl.trim();
        if (!trimmedUrl) return;

        // Validation Logic
        if (!socialLinkValidator.isValid(trimmedUrl)) {
            setError("Por favor, insira um link válido do Instagram, TikTok ou YouTube.");
            return;
        }
        
        setIsSubmitting(true);
        try {
            await onSubmit(trimmedUrl);
            onClose();
            // Ensure we stay on events or refresh current view context
            dispatch({ type: 'SET_VIEW', payload: 'events' }); 
        } catch (e: any) {
            console.error(e);
            setError(e.message || "Erro ao enviar missão.");
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setProofUrl(e.target.value);
        if (error) setError(null);
    };

    return (
        <ModalPortal>
            <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm" onClick={onClose}>
                <div className="bg-[#121212] border border-[#FFD86B]/30 rounded-2xl p-6 w-full max-w-md shadow-2xl relative" onClick={e => e.stopPropagation()}>
                    <button onClick={onClose} className="absolute top-4 right-4 text-gray-500 hover:text-white">✕</button>
                    
                    <h3 className="text-xl font-bold text-white font-chakra mb-2 uppercase tracking-wide">{mission.title}</h3>
                    <p className="text-sm text-gray-400 mb-6">{mission.description}</p>
                    
                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div>
                            <label className="block text-xs font-bold text-[#FFD86B] uppercase tracking-wider mb-2">Link da Prova (Instagram/TikTok/YouTube)</label>
                            <input 
                                type="url" 
                                placeholder="https://..." 
                                value={proofUrl}
                                onChange={handleInputChange}
                                required
                                className={`w-full bg-[#0A0A0A] border rounded-xl p-3 text-white focus:outline-none transition-all ${error ? 'border-red-500 focus:border-red-500' : 'border-gray-700 focus:border-[#FFD86B]'}`}
                            />
                            {error && <p className="text-red-400 text-xs mt-1.5 font-bold">{error}</p>}
                        </div>
                        
                        <button 
                            type="submit" 
                            disabled={isSubmitting || !proofUrl}
                            className="w-full py-3 rounded-xl bg-[#FFD86B] text-black font-black uppercase tracking-widest hover:bg-[#E0BE45] transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
                        >
                            {isSubmitting ? 'Enviando...' : 'Confirmar Envio'}
                        </button>
                    </form>
                </div>
            </div>
        </ModalPortal>
    );
};

export default EventMissionSubmissionModal;
