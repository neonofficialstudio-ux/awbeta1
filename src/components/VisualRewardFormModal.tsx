
import React, { useState } from 'react';
import type { RedeemedItem, VisualRewardFormData } from '../types';
import { SoundWaveIcon, MicIcon, StarIcon } from '../constants';
import { ModalPortal } from './ui/overlays/ModalPortal';

interface VisualRewardFormModalProps {
  item: RedeemedItem;
  onClose: () => void;
  onSubmit: (redeemedItemId: string, formData: VisualRewardFormData) => Promise<void>;
}

// Custom Icons for form fields
const MusicNoteIcon = (props: React.SVGProps<SVGSVGElement>) => (
    <svg {...props} fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3" />
    </svg>
);

const CloudUploadIcon = (props: React.SVGProps<SVGSVGElement>) => (
    <svg {...props} fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
    </svg>
);

const ImageIcon = (props: React.SVGProps<SVGSVGElement>) => (
    <svg {...props} fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
    </svg>
);

const VisualRewardFormModal: React.FC<VisualRewardFormModalProps> = ({ item, onClose, onSubmit }) => {
  const [formData, setFormData] = useState<VisualRewardFormData>({
    songName: '',
    lyrics: '',
    idea: '',
    audioFile: '',
    referenceImages: [],
  });
  const [fileName, setFileName] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDragging, setIsDragging] = useState(false);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    processFile(file);
  };

  const processFile = (file: File | undefined) => {
      if (file) {
        setFileName(file.name);
        const reader = new FileReader();
        reader.onloadend = () => {
            setFormData(prev => ({ ...prev, audioFile: reader.result as string }));
        };
        reader.readAsDataURL(file);
      }
  };

  const handleImagesChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      if (e.target.files) {
          const files = Array.from(e.target.files) as File[];
          processImages(files);
      }
  };

  const processImages = (files: File[]) => {
      const promises = files.map(file => {
          return new Promise<string>((resolve) => {
              const reader = new FileReader();
              reader.onloadend = () => resolve(reader.result as string);
              reader.readAsDataURL(file);
          });
      });

      Promise.all(promises).then(base64Images => {
          setFormData(prev => ({
              ...prev,
              referenceImages: [...(prev.referenceImages || []), ...base64Images]
          }));
      });
  };

  const removeImage = (index: number) => {
      setFormData(prev => ({
          ...prev,
          referenceImages: (prev.referenceImages || []).filter((_, i) => i !== index)
      }));
  };
  
  const handleDragOver = (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragging(false);
      // Logic handled simpler: we assume drop is for audio if main area, 
      // but UI complexity suggests keeping drop mainly for audio in that specific zone
      const file = e.dataTransfer.files?.[0];
      if (file && file.type.startsWith('audio')) {
         processFile(file);
      }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
      const {name, value} = e.target;
      setFormData(prev => ({...prev, [name]: value}));
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    await onSubmit(item.id, formData);
    setIsSubmitting(false);
  };

  const isFormComplete = formData.songName && formData.idea && formData.audioFile;

  return (
    <ModalPortal>
        <div className="fixed inset-0 bg-black/90 backdrop-blur-sm flex items-center justify-center z-[9999] p-4 overflow-y-auto">
        <div className="bg-[#121212] rounded-2xl border border-gray-800 shadow-2xl w-full max-w-2xl flex flex-col max-h-[90vh]">
            
            {/* Header */}
            <div className="p-8 border-b border-gray-800 bg-gradient-to-r from-[#1a1a1a] to-[#121212] rounded-t-2xl">
                <h2 className="text-2xl font-black text-white font-chakra uppercase tracking-wider flex items-center gap-3">
                    <span className="w-2 h-8 bg-goldenYellow-500 rounded-full"></span>
                    Briefing de Produção
                </h2>
                <p className="text-gray-400 mt-2 text-sm">
                    Item Selecionado: <span className="text-goldenYellow-400 font-bold">{item.itemName}</span>
                </p>
            </div>

            {/* Body */}
            <div className="p-8 overflow-y-auto custom-scrollbar">
                <form onSubmit={handleSubmit} className="space-y-6">
                    
                    {/* Song Name */}
                    <div className="relative group">
                        <label htmlFor="songName" className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2 ml-1">Nome da Música</label>
                        <div className="relative">
                            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                <MusicNoteIcon className="h-5 w-5 text-gray-500 group-focus-within:text-goldenYellow-500 transition-colors" />
                            </div>
                            <input 
                                type="text" 
                                name="songName" 
                                id="songName" 
                                value={formData.songName} 
                                onChange={handleChange} 
                                required 
                                className="w-full bg-black/60 border border-gray-800 rounded-lg py-3 pl-10 pr-4 text-white placeholder-gray-600 focus:border-goldenYellow-500 focus:ring-1 focus:ring-goldenYellow-500 focus:outline-none transition-all"
                                placeholder="Ex: Midnight Vibes"
                            />
                        </div>
                    </div>

                    {/* Idea */}
                    <div className="relative group">
                        <label htmlFor="idea" className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2 ml-1">Conceito Visual & Ideia</label>
                        <div className="relative">
                            <div className="absolute top-3 left-3 pointer-events-none">
                                <StarIcon className="h-5 w-5 text-gray-500 group-focus-within:text-goldenYellow-500 transition-colors" />
                            </div>
                            <textarea 
                                name="idea" 
                                id="idea" 
                                value={formData.idea} 
                                onChange={handleChange} 
                                required 
                                rows={4} 
                                className="w-full bg-black/60 border border-gray-800 rounded-lg py-3 pl-10 pr-4 text-white placeholder-gray-600 focus:border-goldenYellow-500 focus:ring-1 focus:ring-goldenYellow-500 focus:outline-none transition-all resize-none"
                                placeholder="Descreva a atmosfera, cores, referências e o que você imagina para este visual..."
                            ></textarea>
                        </div>
                    </div>

                    {/* Reference Images */}
                    <div className="relative group">
                        <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2 ml-1">Referências Visuais (Imagens)</label>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <label className="flex flex-col items-center justify-center h-32 border-2 border-dashed border-gray-700 rounded-lg cursor-pointer bg-gray-900/30 hover:bg-gray-800/50 hover:border-goldenYellow-500/50 transition-all">
                                <ImageIcon className="h-8 w-8 text-gray-400 mb-2" />
                                <span className="text-xs text-gray-400 font-bold uppercase tracking-wide">Adicionar Imagens</span>
                                <input type="file" multiple accept="image/*" onChange={handleImagesChange} className="hidden" />
                            </label>
                            
                            {formData.referenceImages && formData.referenceImages.length > 0 && (
                                <div className="col-span-1 md:col-span-2 grid grid-cols-4 gap-2 mt-2">
                                    {formData.referenceImages.map((img, idx) => (
                                        <div key={idx} className="relative aspect-square rounded-lg overflow-hidden border border-gray-700 group/img">
                                            <img src={img} alt={`Ref ${idx}`} className="w-full h-full object-cover" />
                                            <button 
                                                type="button"
                                                onClick={() => removeImage(idx)}
                                                className="absolute top-1 right-1 bg-red-500 text-white rounded-full p-1 opacity-0 group-hover/img:opacity-100 transition-opacity"
                                            >
                                                <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                                </svg>
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Lyrics - UPDATED */}
                    <div className="relative group">
                        <label htmlFor="lyrics" className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2 ml-1">Letra</label>
                        <div className="relative">
                            <div className="absolute top-3 left-3 pointer-events-none">
                                <MicIcon className="h-5 w-5 text-gray-500 group-focus-within:text-goldenYellow-500 transition-colors" />
                            </div>
                            <textarea 
                                name="lyrics" 
                                id="lyrics" 
                                value={formData.lyrics} 
                                onChange={handleChange} 
                                rows={3} 
                                className="w-full bg-black/60 border border-gray-800 rounded-lg py-3 pl-10 pr-4 text-white placeholder-gray-600 focus:border-goldenYellow-500 focus:ring-1 focus:ring-goldenYellow-500 focus:outline-none transition-all resize-none"
                                placeholder="Caso a música tenha letra, coloque a letra completa e correta"
                            ></textarea>
                        </div>
                    </div>

                    {/* Audio Upload */}
                    <div>
                        <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2 ml-1">Arquivo de Áudio</label>
                        <div 
                            className={`
                                mt-1 flex justify-center px-6 pt-5 pb-6 border-2 border-dashed rounded-xl transition-all duration-300
                                ${isDragging ? 'border-goldenYellow-500 bg-goldenYellow-500/10' : 'border-gray-700 bg-gray-900/30 hover:bg-gray-900/50 hover:border-gray-500'}
                            `}
                            onDragOver={handleDragOver}
                            onDragLeave={handleDragLeave}
                            onDrop={handleDrop}
                        >
                            <div className="space-y-2 text-center">
                                {fileName ? (
                                    <div className="flex flex-col items-center">
                                        <div className="w-12 h-12 bg-green-500/20 rounded-full flex items-center justify-center mb-2">
                                            <SoundWaveIcon className="h-6 w-6 text-green-400" />
                                        </div>
                                        <p className="text-sm text-white font-medium break-all">{fileName}</p>
                                        <button type="button" onClick={() => {setFileName(''); setFormData(prev => ({...prev, audioFile: ''}))}} className="text-xs text-red-400 hover:underline mt-2">Remover</button>
                                    </div>
                                ) : (
                                    <>
                                        <CloudUploadIcon className="mx-auto h-12 w-12 text-gray-500" />
                                        <div className="flex text-sm text-gray-400 justify-center">
                                            <label htmlFor="file-upload" className="relative cursor-pointer rounded-md font-medium text-goldenYellow-400 hover:text-goldenYellow-300 focus-within:outline-none">
                                                <span>Clique para enviar</span>
                                                <input id="file-upload" name="file-upload" type="file" className="sr-only" onChange={handleFileChange} accept=".mp3,audio/*" />
                                            </label>
                                            <p className="pl-1">ou arraste aqui</p>
                                        </div>
                                        <p className="text-xs text-gray-500">MP3, WAV (Max 10MB)</p>
                                    </>
                                )}
                            </div>
                        </div>
                    </div>

                </form>
            </div>

            {/* Footer */}
            <div className="p-6 border-t border-gray-800 bg-[#1a1a1a] rounded-b-2xl flex justify-end gap-3">
                <button 
                    onClick={onClose} 
                    className="py-3 px-6 rounded-lg font-bold text-sm text-gray-400 hover:text-white transition-colors uppercase tracking-wide"
                >
                    Cancelar
                </button>
                <button 
                    onClick={handleSubmit}
                    disabled={!isFormComplete || isSubmitting} 
                    className="py-3 px-8 rounded-lg bg-gradient-to-r from-goldenYellow-600 to-goldenYellow-400 text-black font-bold uppercase tracking-wide hover:shadow-[0_0_20px_rgba(251,191,36,0.3)] hover:scale-[1.02] transition-all disabled:opacity-50 disabled:cursor-not-allowed disabled:shadow-none disabled:scale-100 min-w-[180px] flex justify-center items-center"
                >
                {isSubmitting ? <div className="w-5 h-5 border-2 border-t-transparent border-black rounded-full animate-spin"></div> : 'Iniciar Produção'}
                </button>
            </div>

        </div>
        </div>
    </ModalPortal>
  );
};

export default VisualRewardFormModal;
