
import React, { useState, useEffect, useMemo } from 'react';
import type { User, CoinTransaction, Achievement, AchievementRarity } from '../types';
import { MissionIcon, TrophyIcon, StoreIcon, StarIcon, EditIcon, CheckIcon, LockIcon, CoinIcon, CrownIcon, ShareIcon, TrendingUpIcon, ShieldIcon, XPIcon } from '../constants';
import { useAppContext } from '../constants';
import * as api from '../api/index';
import { formatNumber } from './ui/utils/format';
import AvatarWithFrame from './AvatarWithFrame';
import { safeString } from '../api/helpers';
import FaqItem from './ui/patterns/FaqItem';
import { AchievementEngine } from '../services/achievements/achievement.engine';
import { getDisplayName } from '../api/core/getDisplayName';

// --- V6 ICONS & ASSETS ---

const SpotifyIcon = (props: React.SVGProps<SVGSVGElement>) => (
    <svg {...props} viewBox="0 0 24 24" fill="currentColor">
        <path d="M12 2C6.477 2 2 6.477 2 12s4.477 10 10 10 10-4.477 10-10S17.523 2 12 2zm4.624 14.531c-.13.22-.42.285-.64.155-1.802-1.1-4.04-1.353-6.696-.742-.26.06-.52-.1-.58-.36-.06-.26.1-.52.36-.58 2.87-.66 5.33-.38 7.34 0.85.22.13.285.42.155.64zm.92-2.19c-.16.27-.51.36-.78.19-2.09-1.28-5.32-1.65-7.8-0.9-0.315.09-0.63-.09-0.72-.405s.09-.63.405-.72c2.78-.81 6.32-.41 8.68 1.02.27.16.36.51.19.78zm.13-2.31c-2.48-1.48-6.55-1.62-9.08-0.9-0.36.1-0.73-.13-0.83-.49s.13-.73.49-.83c2.88-.81 7.31-.64 10.16 1.02.32.19.42.6.23.92-.19.33-.6.43-.92.23z" />
    </svg>
);
const YoutubeIcon = (props: React.SVGProps<SVGSVGElement>) => (
    <svg {...props} viewBox="0 0 24 24" fill="currentColor">
        <path d="M21.582 6.186A2.232 2.232 0 0019.99 5.32a30.74 30.74 0 00-7.99-.405 30.74 30.74 0 00-7.99.405 2.232 2.232 0 00-1.592.866C2 7.37 2 9.91 2 12s0 4.63.418 5.814a2.232 2.232 0 001.592.866c2.16.31 7.99.405 7.99.405s5.83-.095 7.99-.405a2.232 2.232 0 001.592-.866C22 16.63 22 14.09 22 12s0-4.63-.418-5.814zM9.75 15.3V8.7l6.5 3.3-6.5 3.3z" />
    </svg>
);
const InstagramIcon = (props: React.SVGProps<SVGSVGElement>) => (
    <svg {...props} viewBox="0 0 24 24" fill="currentColor">
        <path d="M7.8,2H16.2C19.4,2 22,4.6 22,7.8V16.2A5.8,5.8 0 0,1 16.2,22H7.8C4.6,22 2,19.4 2,16.2V7.8A5.8,5.8 0 0,1 7.8,2M7.6,4A3.6,3.6 0 0,0 4,7.6V16.4C4,18.39 5.61,20 7.6,20H16.4A3.6,3.6 0 0,0 20,16.4V7.6C20,5.61 18.39,4 16.4,4H7.6M17.25,5.5A1.25,1.25 0 0,1 18.5,6.75A1.25,1.25 0 0,1 17.25,8A1.25,1.25 0 0,1 16,6.75A1.25,1.25 0 0,1 17.25,5.5M12,7A5,5 0 0,1 17,12A5,5 0 0,1 12,17A5,5 0 0,1 7,12A5,5 0 0,1 12,7M12,9A3,3 0 0,0 9,12A3,3 0 0,0 12,15A3,3 0 0,0 15,12A3,3 0 0,0 12,9Z" />
    </svg>
);
const TikTokIcon = (props: React.SVGProps<SVGSVGElement>) => (
    <svg {...props} fill="currentColor" viewBox="0 0 24 24">
        <path d="M12.525.02c1.31-.02 2.61-.01 3.91-.02.08 1.53.63 3.09 1.75 4.17 1.12 1.11 2.7 1.62 4.24 1.79v4.03c-1.44-.05-2.89-.35-4.2-.97-.57-.26-1.1-.59-1.62-.93-.01 2.92.01 5.84-.02 8.75-.08 1.4-.54 2.79-1.35 3.94-1.31 1.92-3.58 3.17-5.91 3.21-2.43.03-4.83-.95-6.43-2.98-1.59-2.02-2.06-4.58-1.21-6.97.62-1.75 1.86-3.07 3.4-3.95.31-.17.65-.3.96-.46 1.49-.77 3.02-1.23 4.56-1.34v4.04c-.45.02-.91.06-1.36.12-.21.03-.43.04-.63.09-1.68.38-3.05 1.9-2.95 3.73.05.9.36 1.75.92 2.42.55.67 1.34 1.07 2.18 1.18.84.11 1.68-.08 2.39-.55.7-.47 1.18-1.24 1.3-2.08.12-.84.05-1.71-.16-2.52-.18-.68-.45-1.33-.78-1.93-.01-1.53.01-3.06.01-4.59.01-1.19-.43-2.33-1.21-3.22-1.03-1.16-2.54-1.7-4.1-1.71v-4.02c.42.01.83.04 1.25.05z"/>
    </svg>
);

const SocialLinkCard: React.FC<{ icon: React.ElementType; label: string; url?: string; color: string }> = ({ icon: Icon, label, url, color }) => (
    <a 
        href={url} 
        target="_blank" 
        rel="noopener noreferrer"
        className={`
            flex items-center gap-3 p-4 rounded-xl border transition-all duration-300 group bg-[#121212]
            ${url 
                ? `border-white/10 hover:border-${color} hover:bg-${color}/5 cursor-pointer` 
                : 'border-white/5 opacity-50 cursor-default'}
        `}
    >
        <div className={`p-2 rounded-full bg-[#080808] border border-white/10 ${url ? `text-${color}` : 'text-gray-600'}`}>
            <Icon className="w-6 h-6" />
        </div>
        <div className="flex flex-col">
            <span className="text-xs text-[#808080] font-bold uppercase tracking-wider">{label}</span>
            <span className={`text-sm font-medium truncate max-w-[120px] ${url ? 'text-white' : 'text-gray-600'}`}>
                {url ? 'Conectado' : 'Não vinculado'}
            </span>
        </div>
        {url && <div className={`ml-auto w-2 h-2 rounded-full bg-${color} animate-pulse`}></div>}
    </a>
);

const StatPill: React.FC<{ label: string; value: string | number; icon: React.ElementType; color: string }> = ({ label, value, icon: Icon, color }) => (
    <div className="relative group overflow-hidden bg-[#121212] p-[1px] rounded-2xl">
        <div className={`absolute inset-0 bg-gradient-to-br from-${color}/50 to-transparent opacity-20 group-hover:opacity-40 transition-opacity`}></div>
        <div className="relative bg-[#0A0A0A] rounded-[23px] p-5 flex flex-col items-center justify-center h-full border border-white/5 group-hover:border-white/20 transition-colors">
            <Icon className={`w-6 h-6 text-${color} mb-2 filter drop-shadow-md group-hover:scale-110 transition-transform`} />
            <p className={`text-2xl font-black font-chakra text-${color} text-shadow-glow`}>{value}</p>
            <p className="text-[10px] text-[#808080] uppercase tracking-widest font-bold mt-1">{label}</p>
        </div>
    </div>
);

// Helper to determine icon based on category/id (copied from Achievements.tsx for consistency)
const getAchievementIcon = (id: string, category: string) => {
    if (id.includes('rank_top1')) return CrownIcon;
    if (id.includes('rank')) return TrophyIcon;
    if (id.includes('eco')) return CoinIcon;
    if (id.includes('streak')) return TrendingUpIcon; 
    if (id.includes('lvl')) return XPIcon;
    if (category === 'mission') return MissionIcon;
    if (category === 'economy') return StoreIcon;
    return StarIcon;
};

// Updated Card to match Achievements.tsx style (No Images)
const AchievementCardV6: React.FC<{ achievement: Achievement & { unlocked: boolean } }> = ({ achievement }) => {
    const isUnlocked = achievement.unlocked;

    // Rarity Styles
    const getRarityTheme = (rarity: string) => {
        if (!isUnlocked) return { 
            border: 'border-gray-800 border-dashed', 
            iconColor: 'text-gray-600', 
            iconBg: 'bg-gray-900',
            glow: ''
        };

        switch (rarity) {
            case 'Lendário': return { border: 'border-yellow-500', iconColor: 'text-yellow-400', iconBg: 'bg-yellow-500/20', glow: 'shadow-[0_0_15px_rgba(234,179,8,0.3)]' };
            case 'Épico': return { border: 'border-purple-500', iconColor: 'text-purple-400', iconBg: 'bg-purple-500/20', glow: 'shadow-[0_0_15px_rgba(168,85,247,0.3)]' };
            case 'Raro': return { border: 'border-cyan-500', iconColor: 'text-cyan-400', iconBg: 'bg-cyan-500/20', glow: 'shadow-[0_0_15px_rgba(6,182,212,0.3)]' };
            case 'Incomum': return { border: 'border-green-500', iconColor: 'text-green-400', iconBg: 'bg-green-500/20', glow: 'shadow-[0_0_15px_rgba(34,197,94,0.3)]' };
            default: return { border: 'border-gray-600', iconColor: 'text-gray-300', iconBg: 'bg-gray-800', glow: '' };
        }
    };
    
    const theme = getRarityTheme(achievement.rarity);
    // @ts-ignore
    const IconComponent = getAchievementIcon(achievement.id, achievement.category || 'general');

    return (
        <div className={`
            relative bg-[#121212] rounded-xl border p-4 flex flex-col items-center text-center transition-all duration-300 group
            ${theme.border} ${isUnlocked ? 'hover:shadow-lg hover:-translate-y-1' : 'opacity-60 grayscale'}
            ${theme.glow}
        `}>
            <div className={`
                relative w-16 h-16 mb-3 rounded-full flex items-center justify-center 
                ${theme.iconBg} border border-white/5
            `}>
                 <IconComponent className={`w-8 h-8 ${theme.iconColor}`} />
                 
                 {!isUnlocked && (
                     <div className="absolute inset-0 bg-black/60 flex items-center justify-center rounded-full backdrop-blur-[1px]">
                         <LockIcon className="w-5 h-5 text-gray-500" />
                     </div>
                 )}
                 {isUnlocked && (
                     <div className="absolute -bottom-1 -right-1 bg-green-500 text-black rounded-full p-0.5 border border-black">
                         <CheckIcon className="w-3 h-3" />
                     </div>
                 )}
            </div>
            
            <h4 className={`text-xs font-bold font-chakra uppercase leading-tight mb-1 ${isUnlocked ? 'text-white' : 'text-gray-500'}`}>
                {achievement.title}
            </h4>
            <p className="text-[9px] text-gray-500 leading-tight line-clamp-2">
                {achievement.description}
            </p>
        </div>
    );
}

// ... rest of helper functions (extractUsername, formatPhoneNumber, InputField) ...
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
  if (match[1]) formatted += '+' + match[1];
  if (match[2]) formatted += ' (' + match[2] + ')';
  if (match[3]) formatted += ' ' + match[3];
  if (match[4]) formatted += '-' + match[4];
  return formatted;
};

const InputField: React.FC<{
    label: string;
    name: string;
    value: any;
    placeholder?: string;
    disabled: boolean;
    type?: string;
    onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
    error?: string;
}> = ({ label, name, value, placeholder, disabled, type = "text", onChange, error }) => (
    <div>
        <label htmlFor={name} className="block text-xs font-bold text-[#808080] uppercase tracking-wider mb-2">{label}</label>
        <input 
            type={type}
            name={name} 
            id={name}
            value={String(value)} 
            onChange={onChange}
            placeholder={placeholder}
            disabled={disabled}
            className={`w-full bg-[#050505] rounded-xl border text-white p-4 disabled:bg-[#111] disabled:text-gray-600 transition-colors focus:outline-none focus:ring-1 ${error ? 'border-red-500/50 focus:border-red-500 focus:ring-red-500' : 'border-[#333] focus:border-[#FFD36A] focus:ring-[#FFD36A]'}`}
        />
        {error && <p className="text-red-500 text-xs mt-1.5 font-medium">{error}</p>}
    </div>
);

const faqData = [
    { question: "Como altero minha foto?", answer: "Clique no botão 'Editar Perfil' e depois na sua foto atual para fazer o upload de uma nova imagem." },
    { question: "Posso mudar meu Nome Artístico?", answer: "Sim, você pode atualizar seu nome artístico na edição de perfil. Isso refletirá em todos os rankings e leaderboards." },
    { question: "Onde vejo meu histórico de transações?", answer: "Na seção 'Atividade Recente' aqui no perfil ou, para um detalhamento completo, acesse a aba 'Histórico' no menu Inventário." },
    { question: "Meus dados são públicos?", answer: "Seu nome artístico, foto, nível e conquistas são visíveis nos rankings. Seus dados de contato (email, telefone) são privados." }
];

const Profile: React.FC = () => {
    const { state, dispatch } = useAppContext();
    const { activeUser: user } = state;
    const displayName = getDisplayName(user ? { ...user, artistic_name: user.artisticName } : null);

    const [isEditing, setIsEditing] = useState(false);
    const [formData, setFormData] = useState<User | null>(user);
    const [instagramUsername, setInstagramUsername] = useState('');
    const [tiktokUsername, setTiktokUsername] = useState('');
    const [errors, setErrors] = useState<{ spotifyUrl?: string; youtubeUrl?: string; }>({});
    
    const [coinTransactions, setCoinTransactions] = useState<CoinTransaction[]>([]);
    const [allAchievements, setAllAchievements] = useState<Achievement[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        if (user) {
            setIsLoading(true);
            // V7.1: Fetch synced achievements using engine which handles consistency
            const data = AchievementEngine.getUserAchievements(user.id);
            setAllAchievements(data as any); // Type assertion for compatibility

            api.fetchProfileData(user.id).then(data => {
                setCoinTransactions(data.coinTransactions);
                // setAllAchievements(data.allAchievements); // Don't overwrite engine data
                setIsLoading(false);
            });
            setFormData(user);
            setInstagramUsername(extractUsername(user.instagramUrl));
            setTiktokUsername(extractUsername(user.tiktokUrl));
        }
    }, [user]);

    // ... (Handlers: validateUrls, handleChange, handleUsernameChange, handleFileChange, handleSubmit, handleCancel, handleShare, handleUpgrade) ...
    // Reduced for brevity in diff, assume standard handlers exist as before
    const validateUrls = (): boolean => {
        const newErrors: typeof errors = {};
        const { spotifyUrl, youtubeUrl } = formData!;
        if (spotifyUrl && !safeString(spotifyUrl).startsWith('https://open.spotify.com/')) newErrors.spotifyUrl = 'Link inválido (Spotify).';
        if (youtubeUrl && !safeString(youtubeUrl).startsWith('https://www.youtube.com/') && !safeString(youtubeUrl).startsWith('https://www.youtube.com/')) newErrors.youtubeUrl = 'Link inválido (YouTube).';
        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value } = e.target;
        if (name === 'phone') setFormData(prev => prev ? ({ ...prev, phone: formatPhoneNumber(value) }) : null);
        else setFormData(prev => prev ? ({ ...prev, [name]: value }) : null);
        if (errors[name as keyof typeof errors]) setErrors(prev => ({ ...prev, [name]: undefined }));
    };
    
    const handleUsernameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value } = e.target;
        const sanitizedValue = value.replace(/[^a-zA-Z0-9_.]/g, '').replace('@','');
        if (name === 'instagramUsername') setInstagramUsername(sanitizedValue);
        else if (name === 'tiktokUsername') setTiktokUsername(sanitizedValue);
    };

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
          const reader = new FileReader();
          reader.onload = (event) => {
            if (event.target?.result) setFormData(prev => prev ? ({ ...prev, avatarUrl: event.target!.result as string }) : null);
          };
          reader.readAsDataURL(e.target.files[0]);
        }
    };
    
    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (validateUrls() && formData) {
          const dataToSave = {
            ...formData,
            instagramUrl: `https://www.instagram.com/${instagramUsername}`,
            tiktokUrl: tiktokUsername ? `https://www.tiktok.com/@${tiktokUsername}` : '',
          };
          const response = await api.updateUser(dataToSave);
          if (response.updatedUser) dispatch({ type: 'UPDATE_USER', payload: response.updatedUser });
          setIsEditing(false);
        }
    };

    const handleCancel = () => {
        setIsEditing(false);
        setFormData(user);
        setInstagramUsername(extractUsername(user!.instagramUrl));
        setTiktokUsername(extractUsername(user!.tiktokUrl));
    }
    
    const handleShare = () => {
        navigator.clipboard.writeText(window.location.href);
        dispatch({ type: 'ADD_TOAST', payload: { id: Date.now().toString(), type: 'success', title: 'Link Copiado!', message: 'Perfil copiado para a área de transferência.' } });
    };

    const handleUpgrade = () => {
        dispatch({ type: 'SET_VIEW', payload: 'subscriptions' });
    };


    if (isLoading || !user || !formData) {
        return (
            <div className="flex items-center justify-center min-h-[60vh]">
                <div className="w-16 h-16 border-4 border-dashed rounded-full animate-spin border-[#FFD36A]"></div>
            </div>
        );
    }

    const planColor = user.plan === 'Hitmaker' ? 'text-[#3CFF9A]' : user.plan.includes('Profissional') ? 'text-[#A66BFF]' : 'text-[#3CFFF8]';
    const xpProgress = user.xp % 1000;
    const recentActivity = coinTransactions.slice(0, 5);
    
    // Sort Achievements: Unlocked first, then by rarity
    const sortedAchievements = allAchievements.sort((a: any, b: any) => {
        if (a.unlocked && !b.unlocked) return -1;
        if (!a.unlocked && b.unlocked) return 1;
        return 0; // Keep catalogue order otherwise
    }).slice(0, 8); // Top 8

    // Edit Mode UI (Unchanged logic, just keeping structure)
    if (isEditing) {
         // ... (Same as previous edit form)
         return (
            <div className="max-w-4xl mx-auto p-8 bg-[#121212] rounded-[32px] border border-[#FFD36A]/20 animate-fade-in-up shadow-[0_0_50px_rgba(0,0,0,0.5)] relative overflow-hidden">
                <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-[#FFD36A] to-[#FF3CE6]"></div>
                <div className="flex justify-between items-center mb-8 border-b border-white/5 pb-6">
                    <h2 className="text-3xl font-bold text-white font-chakra uppercase tracking-wide">Editar Perfil</h2>
                    <button onClick={handleCancel} className="text-[#808080] hover:text-white text-sm font-bold uppercase tracking-wider px-4 py-2 rounded-lg hover:bg-white/5 transition-colors">Cancelar</button>
                </div>
                <form onSubmit={handleSubmit} className="space-y-8">
                     <div className="flex flex-col items-center gap-4 p-6 bg-[#080808] rounded-2xl border border-white/5">
                        <div className="relative group">
                            <div className="w-32 h-32 rounded-full overflow-hidden border-4 border-[#1A1A1A] shadow-xl">
                                <img src={formData.avatarUrl} alt="Avatar" className="w-full h-full object-cover" />
                            </div>
                            <label className="absolute inset-0 flex items-center justify-center bg-black/60 opacity-0 group-hover:opacity-100 rounded-full cursor-pointer transition-all duration-300 backdrop-blur-sm text-white font-bold uppercase text-xs tracking-wider">
                                Alterar Foto
                                <input type="file" className="hidden" onChange={handleFileChange} accept="image/*" />
                            </label>
                        </div>
                        <p className="text-[#FFD36A] text-xs uppercase tracking-widest font-bold">Upload de Imagem</p>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <InputField label="Nome Completo" name="name" value={formData.name || ''} disabled={false} onChange={handleChange} />
                        <InputField label="Nome Artístico" name="artisticName" value={formData.artisticName || ''} placeholder="Seu nome no palco" disabled={false} onChange={handleChange} />
                        <InputField label="E-mail" name="email" value={formData.email || ''} type="email" disabled={false} onChange={handleChange} />
                        <InputField label="Telefone" name="phone" value={formData.phone || ''} placeholder="+55 (11) 99999-9999" disabled={false} onChange={handleChange} />
                        <InputField label="Spotify URL" name="spotifyUrl" value={formData.spotifyUrl || ''} disabled={false} onChange={handleChange} error={errors.spotifyUrl} />
                        <InputField label="YouTube URL" name="youtubeUrl" value={formData.youtubeUrl || ''} disabled={false} onChange={handleChange} error={errors.youtubeUrl} />
                        <InputField label="Instagram User" name="instagramUsername" value={instagramUsername} placeholder="sem @" disabled={false} onChange={handleUsernameChange} />
                        <InputField label="TikTok User" name="tiktokUsername" value={tiktokUsername} placeholder="sem @" disabled={false} onChange={handleUsernameChange} />
                    </div>
                    <div className="flex justify-end gap-4 pt-8 border-t border-white/5">
                         <button type="button" onClick={handleCancel} className="px-8 py-4 rounded-xl bg-[#1A1A1A] text-[#808080] font-bold text-sm hover:text-white hover:bg-[#222] transition-colors uppercase tracking-widest">Cancelar</button>
                         <button type="submit" className="px-8 py-4 rounded-xl bg-gradient-to-r from-[#FFD36A] to-[#FFB743] text-black font-black text-sm hover:shadow-[0_0_20px_rgba(255,211,106,0.4)] transition-all uppercase tracking-widest">Salvar Perfil</button>
                    </div>
                </form>
            </div>
         );
    }

    return (
        <div className="pb-32 animate-fade-in-up space-y-16">
            
            {/* 1. HERO SECTION (V6 EXTREME) */}
            <section className="relative w-full max-w-5xl mx-auto text-center pt-8">
                {/* Background FX */}
                <div className="absolute top-[-100px] left-1/2 -translate-x-1/2 w-[600px] h-[600px] bg-[#FFD36A]/5 rounded-full blur-[120px] pointer-events-none"></div>
                
                {/* Avatar & Rings */}
                <div className="relative inline-block mb-6 group">
                     <div className="absolute -inset-4 border border-[#FFD36A]/30 rounded-full animate-[spin_10s_linear_infinite] opacity-50 group-hover:opacity-100 transition-opacity"></div>
                     <div className="absolute -inset-8 border border-[#FFD36A]/10 rounded-full animate-[spin_15s_linear_infinite_reverse] opacity-30"></div>
                     <div className="w-40 h-40 rounded-full p-1 bg-gradient-to-b from-[#FFD36A] to-[#C79B2C] shadow-[0_0_40px_rgba(255,211,106,0.3)] relative z-10">
                        <img src={user.avatarUrl} alt={displayName} className="w-full h-full rounded-full object-cover border-4 border-[#050505]" />
                     </div>
                     <div className="absolute -bottom-4 left-1/2 -translate-x-1/2 bg-[#050505] border border-[#FFD36A] text-[#FFD36A] px-4 py-1 rounded-full text-[10px] font-black uppercase tracking-[0.2em] z-20 shadow-lg whitespace-nowrap">
                        Lvl {user.level}
                     </div>
                </div>

                {/* User Info */}
                <h1 className="text-5xl md:text-6xl font-black text-white font-chakra uppercase tracking-tight mb-2 drop-shadow-xl">
                    {displayName}
                </h1>
                <div className="flex items-center justify-center gap-3 mb-8">
                    <span className={`text-xs font-bold uppercase tracking-widest px-3 py-1 rounded bg-white/5 border border-white/10 ${planColor}`}>
                        {user.plan}
                    </span>
                    <span className="text-[#808080] text-xs">•</span>
                    <span className="text-xs text-[#808080] font-medium uppercase tracking-wider">Membro desde {new Date(user.joinedISO || '').getFullYear()}</span>
                </div>

                {/* XP Bar */}
                <div className="max-w-md mx-auto mb-8">
                    <div className="flex justify-between text-[10px] font-bold uppercase tracking-wider text-[#808080] mb-1.5">
                        <span>Progresso do Nível</span>
                        <span className="text-[#FFD36A]">{xpProgress} / 1000 XP</span>
                    </div>
                    <div className="h-1.5 bg-[#1A1A1A] rounded-full overflow-hidden">
                        <div className="h-full bg-gradient-to-r from-[#FFD36A] to-[#FFB743] shadow-[0_0_10px_#FFD36A]" style={{ width: `${(xpProgress / 1000) * 100}%` }}></div>
                    </div>
                </div>

                {/* Actions */}
                <div className="flex justify-center gap-4">
                    <button onClick={() => setIsEditing(true)} className="flex items-center gap-2 px-6 py-3 rounded-xl bg-[#1A1A1A] text-white border border-[#333] hover:border-[#FFD36A] hover:text-[#FFD36A] transition-all text-xs font-bold uppercase tracking-widest group">
                        <EditIcon className="w-4 h-4 group-hover:scale-110 transition-transform" /> Editar Perfil
                    </button>
                    <button onClick={handleShare} className="flex items-center gap-2 px-6 py-3 rounded-xl bg-[#1A1A1A] text-white border border-[#333] hover:border-[#3CFFF8] hover:text-[#3CFFF8] transition-all text-xs font-bold uppercase tracking-widest group">
                        <ShareIcon className="w-4 h-4 group-hover:scale-110 transition-transform" /> Compartilhar
                    </button>
                </div>
            </section>

            {/* 2. STATS GRID (PILL CARDS) */}
            <section className="max-w-6xl mx-auto px-4">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <StatPill label="Missões" value={formatNumber(user.totalMissionsCompleted)} icon={MissionIcon} color="white" />
                    <StatPill label="Total XP" value={formatNumber(user.xp)} icon={StarIcon} color="[#3CFFF8]" />
                    <StatPill label="Coins" value={formatNumber(user.coins)} icon={CoinIcon} color="[#FFD36A]" />
                    <StatPill label="Ranking" value={`#${user.monthlyMissionsCompleted > 0 ? 'Top 10%' : '-'}`} icon={TrophyIcon} color="[#FF3CE6]" />
                </div>
            </section>

            {/* 3. SOCIALS */}
            <section className="max-w-4xl mx-auto px-4">
                <h3 className="text-lg font-bold text-white mb-6 flex items-center gap-2 font-chakra uppercase tracking-wide">
                    <span className="w-1 h-5 bg-[#3CFF9A] rounded-full shadow-[0_0_10px_#3CFF9A]"></span> Redes Conectadas
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
                    <SocialLinkCard icon={InstagramIcon} label="Instagram" url={user.instagramUrl} color="purple-500" />
                    <SocialLinkCard icon={SpotifyIcon} label="Spotify" url={user.spotifyUrl} color="green-500" />
                    <SocialLinkCard icon={YoutubeIcon} label="YouTube" url={user.youtubeUrl} color="red-500" />
                    <SocialLinkCard icon={TikTokIcon} label="TikTok" url={user.tiktokUrl} color="white" />
                </div>
            </section>

            {/* 4. ACHIEVEMENTS (UPDATED TO ICON CARDS) */}
            <section className="max-w-6xl mx-auto px-4">
                 <h3 className="text-lg font-bold text-white mb-6 flex items-center gap-2 font-chakra uppercase tracking-wide">
                    <span className="w-1 h-5 bg-[#FFD36A] rounded-full shadow-[0_0_10px_#FFD36A]"></span> Conquistas Recentes
                </h3>
                {sortedAchievements.length > 0 ? (
                     <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-4">
                        {sortedAchievements.map((ach: any) => (
                            <AchievementCardV6 key={ach.id} achievement={ach} />
                        ))}
                    </div>
                ) : (
                    <div className="p-8 text-center border border-dashed border-[#333] rounded-2xl">
                        <p className="text-gray-500 text-sm">Nenhuma conquista desbloqueada ainda.</p>
                    </div>
                )}
            </section>

            {/* 5. ACTIVITY LOG */}
            <section className="max-w-4xl mx-auto px-4">
                <h3 className="text-lg font-bold text-white mb-6 flex items-center gap-2 font-chakra uppercase tracking-wide">
                    <span className="w-1 h-5 bg-[#3CFFF8] rounded-full shadow-[0_0_10px_#3CFFF8]"></span> Atividade Recente
                </h3>
                <div className="space-y-3">
                    {recentActivity.length > 0 ? recentActivity.map(tx => (
                        <div key={tx.id} className="flex items-center justify-between p-4 bg-[#121212] border border-white/5 rounded-xl hover:bg-[#181818] transition-colors group">
                            <div className="flex items-center gap-4">
                                <div className={`p-2 rounded-lg ${tx.type === 'earn' ? 'bg-green-900/20 text-green-400' : 'bg-red-900/20 text-red-400'}`}>
                                    {tx.type === 'earn' ? <TrendingUpIcon className="w-5 h-5"/> : <StoreIcon className="w-5 h-5"/>}
                                </div>
                                <div>
                                    <p className="text-sm font-bold text-white group-hover:text-[#FFD36A] transition-colors">{tx.description}</p>
                                    <p className="text-[10px] text-[#808080] uppercase tracking-wider">{tx.date}</p>
                                </div>
                            </div>
                            <span className={`font-mono font-bold ${tx.amount > 0 ? 'text-green-400' : 'text-red-400'}`}>
                                {tx.amount > 0 ? '+' : ''}{tx.amount} LC
                            </span>
                        </div>
                    )) : (
                        <div className="text-center text-gray-500 py-8">Nenhuma atividade recente.</div>
                    )}
                </div>
            </section>
            
            {/* FAQ Section */}
            <div className="mt-16 max-w-4xl mx-auto px-4">
                <h2 className="text-2xl font-bold text-center text-white mb-8 font-chakra uppercase tracking-wider flex items-center justify-center gap-2">
                    <ShieldIcon className="w-6 h-6 text-[#FFD65A]" /> Dúvidas Frequentes
                </h2>
                <div className="space-y-4">
                    {faqData.map((item, index) => <FaqItem key={index} question={item.question} answer={item.answer} />)}
                </div>
            </div>

            {/* 6. FOOTER CTA */}
            {user.plan === 'Free Flow' && (
                <section className="max-w-3xl mx-auto px-4 mt-12">
                    <button 
                        onClick={handleUpgrade}
                        className="w-full py-6 rounded-2xl bg-gradient-to-r from-[#FFD36A] to-[#C79B2C] relative overflow-hidden group hover:shadow-[0_0_50px_rgba(255,211,106,0.3)] transition-all duration-500"
                    >
                        <div className="absolute inset-0 bg-white/30 translate-y-full group-hover:translate-y-0 transition-transform duration-500 skew-y-12"></div>
                        <div className="relative z-10 flex flex-col items-center">
                             <span className="text-black font-black text-lg uppercase tracking-[0.2em] flex items-center gap-2">
                                <TrendingUpIcon className="w-6 h-6 animate-bounce" /> Melhorar Assinatura
                             </span>
                             <span className="text-black/70 text-xs font-bold mt-1 uppercase tracking-wide">Desbloqueie mais visibilidade e recompensas</span>
                        </div>
                    </button>
                </section>
            )}
        </div>
    );
};

export default Profile;
