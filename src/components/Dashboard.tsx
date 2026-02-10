import React, { useState, useEffect, useCallback, useRef } from 'react';
import type { User, Advertisement, ProcessedArtistOfTheDayQueueEntry, Notification, LedgerEntry } from '../types';
import { CoinIcon, XPIcon, StarIcon, CrownIcon, SpotifyIcon, YoutubeIcon, TrendingUpIcon, CheckIcon, InstagramIcon, BellIcon, HistoryIcon } from '../constants';
import { useAppContext } from '../constants';
import CountUp from './CountUp';
import { formatNumber } from './ui/utils/format';
import { Perf } from '../services/perf.engine';
import { AdsTelemetry } from '../api/ads/adsTelemetry'; 
import LoadingSkeleton from './ui/base/LoadingSkeleton';
import { getDisplayName } from '../api/core/getDisplayName';
import { isSupabaseProvider } from '../api/core/backendGuard';
import { getSupabase } from '../api/supabase/client';
import { hasCheckedInToday } from '../api/supabase/supabase.repositories';
import { ProfileSupabase } from '../api/supabase/profile';
import { fetchMyLedger, fetchMyNotifications, getMyCheckinStreak, getMyLevelProgress, markNotificationRead, type CheckinStreakInfo, type LevelProgress } from '../api/supabase/economy';
import { refreshAfterEconomyAction } from '../core/refreshAfterEconomyAction';
import { calculateLevelFromXp, xpForLevelStart } from '../api/economy/economy';
import { clearSessionCache } from '../lib/sessionCache';

interface DashboardProps {
    onShowArtistOfTheDay: (id: string) => void;
    onShowRewardModal: (info: { artistName: string, linkType: 'spotify' | 'youtube', updatedUser: User }) => void;
}

const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Bom dia';
    if (hour < 18) return 'Boa tarde';
    return 'Boa noite';
};

// --- COMPONENTS ---

const AdvertisementCarousel: React.FC<{ ads: Advertisement[] }> = React.memo(({ ads }) => {
    const [currentIndex, setCurrentIndex] = useState(0);
    const { state } = useAppContext();

    useEffect(() => {
        if (ads.length <= 0) return;
        const currentAd = ads[currentIndex];
        
        // V2.1 Telemetry: Track View
        if (state.activeUser) {
             AdsTelemetry.trackView(currentAd.id, state.activeUser.id);
        }

        const duration = currentAd?.duration ? currentAd.duration * 1000 : 5000;
        const timer = setTimeout(() => {
            setCurrentIndex((prevIndex) => (prevIndex + 1) % ads.length);
        }, duration);
        return () => clearTimeout(timer);
    }, [currentIndex, ads, state.activeUser]);

    const handleAdClick = (ad: Advertisement) => {
        if (state.activeUser) {
            AdsTelemetry.trackClick(ad.id, state.activeUser.id);
        }
    };

    if (ads.length === 0) return null;

    return (
        <div className="relative w-full h-56 md:h-72 lg:h-80 rounded-[26px] overflow-hidden group border border-[#FFD36A]/20 shadow-[0_15px_40px_-10px_rgba(0,0,0,0.6)] bg-[#050505] transition-all duration-500 hover:shadow-[0_20px_50px_-5px_rgba(255,211,106,0.15)] hover:border-[#FFD36A]/40">
            {ads.map((ad, index) => (
                <div
                    key={ad.id}
                    className={`absolute inset-0 transition-opacity duration-1000 ease-in-out ${index === currentIndex ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
                >
                    <a 
                        href={ad.linkUrl} 
                        target="_blank" 
                        rel="noopener noreferrer" 
                        className="block w-full h-full transition-transform duration-1000 hover:scale-105"
                        onClick={() => handleAdClick(ad)}
                    >
                        <div className="absolute inset-0 bg-gradient-to-t from-black via-black/20 to-transparent z-10"></div>
                        <img src={ad.imageUrl} alt={ad.title} className="w-full h-full object-cover opacity-90" />
                        <div className="absolute inset-0 z-20 p-8 md:p-10 flex flex-col justify-end">
                            <h3 className="text-3xl md:text-5xl font-black text-white font-chakra drop-shadow-[0_4px_8px_rgba(0,0,0,1)] leading-tight uppercase tracking-tight text-shadow-glow">{ad.title}</h3>
                            <p className="text-sm md:text-base text-[#FFE7AC] mt-3 font-medium drop-shadow-md max-w-2xl line-clamp-2 tracking-wide">{ad.description}</p>
                        </div>
                    </a>
                </div>
            ))}
            <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex space-x-3 z-30">
                {ads.map((_, index) => (
                    <button
                        key={index}
                        onClick={() => setCurrentIndex(index)}
                        className={`h-1.5 rounded-full transition-all duration-500 backdrop-blur-md ${index === currentIndex ? 'bg-[#FFD36A] w-10 shadow-[0_0_15px_#FFD36A]' : 'bg-white/20 w-2 hover:bg-white/50'}`}
                        aria-label={`Go to slide ${index + 1}`}
                    />
                ))}
            </div>
        </div>
    );
});

const ArtistsOfTheDayCarousel: React.FC<{
  initialArtists?: any[];
  isSupabase: boolean;
  clicked?: Record<string, boolean>;
  dayUtc?: string | null;
  onSupabaseSync?: (next: {
    artist: any | null;
    clicked: Record<string, boolean>;
    dayUtc: string | null;
  }) => void;
}> = ({ initialArtists, isSupabase, clicked, dayUtc, onSupabaseSync }) => {
    const { state, dispatch } = useAppContext();
    const { activeUser } = state;
    const [artists, setArtists] = useState<any[]>([]);
    const [currentIndex, setCurrentIndex] = useState(0);
    const [progress, setProgress] = useState<Record<string, any>>({});
    const [isLoading, setIsLoading] = useState(true);
    const [rotationSeconds, setRotationSeconds] = useState<number>(10);
    const [supabaseClicked, setSupabaseClicked] = useState<Record<string, boolean>>({});
    const [supabaseDayUtc, setSupabaseDayUtc] = useState<string | null>(null);
    const current = artists[currentIndex] ?? null;
    const clickedMap = isSupabase ? supabaseClicked : (progress[current?.id || ''] || {});
    const currentDisplayName = getDisplayName(current ? { ...current, artistic_name: current.artisticName } : null);
    void supabaseDayUtc;

    useEffect(() => {
        if (isSupabase) {
            // ✅ Supabase mode: render-only. Sem polling, sem visibility sync, sem interval.
            setArtists(Array.isArray(initialArtists) ? initialArtists : []);
            setSupabaseClicked(clicked || {});
            setSupabaseDayUtc(dayUtc || null);
            setIsLoading(false);

            // ⚠️ IMPORTANTÍSSIMO:
            // Não chamar sync aqui. Nada de getArtistOfDay / recordArtist... aqui.
            return;
        }

        const loadArtists = async () => {
            try {
                const api = await import('../api/index');
                const data = await api.fetchArtistsOfTheDayFull();
                setArtists(data);
                setCurrentIndex(0);
            } catch (e) {
                console.error(e);
                if (initialArtists) setArtists(initialArtists);
            } finally {
                setIsLoading(false);
            }
        };
        loadArtists();
        if (!isSupabase) {
            const savedProgress = JSON.parse(localStorage.getItem("daily-artist-progress") || "{}");
            setProgress(savedProgress);
        }
    }, [state.eventSettings, isSupabase, initialArtists, clicked, dayUtc]);

    useEffect(() => {
        if (!artists || artists.length <= 1) return;
        if (!rotationSeconds || rotationSeconds <= 0) return;
        const interval = setInterval(() => {
            setCurrentIndex((prev) => (prev + 1 >= artists.length ? 0 : prev + 1));
        }, rotationSeconds * 1000);
        return () => clearInterval(interval);
    }, [artists.length, rotationSeconds]);

    const handleLinkClick = async (platform: 'spotify' | 'youtube' | 'instagram', url: string) => {
        if (!url) return;

        window.open(url, '_blank');

        if (!activeUser || !current) return;

        // ✅ Supabase mode: refresh forte controlado, só no clique
        if (isSupabase) {
            try {
                const api = await import('../api/index');
                await api.recordArtistOfDayClick(platform);
                const aod = await api.getArtistOfDay();
                if (aod?.success && aod?.has_artist) {
                    const artist = {
                        id: aod.artist.id,
                        name: aod.artist.display_name || aod.artist.artistic_name || '',
                        artisticName: aod.artist.artistic_name || '',
                        avatarUrl: aod.artist.avatar_url || '',
                        level: aod.artist.level || 1,
                        links: {
                            spotify: aod.artist.spotify_url || '',
                            youtube: aod.artist.youtube_url || '',
                            instagram: aod.artist.instagram_url || '',
                        },
                    };

                    const nextClicked = (aod.clicked || {}) as Record<string, boolean>;
                    setSupabaseClicked(nextClicked);
                    setSupabaseDayUtc(aod.day_utc || null);
                    onSupabaseSync?.({
                        artist,
                        clicked: nextClicked,
                        dayUtc: aod.day_utc || null,
                    });
                }

                dispatch({
                    type: 'ADD_TOAST',
                    payload: {
                        id: Date.now().toString(),
                        type: 'success',
                        title: 'Registrado!',
                        message: 'Clique registrado ✅',
                    },
                });
                await refreshAfterEconomyAction(activeUser.id, dispatch);
            } catch (e) {
                console.warn('[ArtistOfDay] click sync failed', e);

                dispatch({
                    type: 'ADD_TOAST',
                    payload: {
                        id: Date.now().toString(),
                        type: 'error',
                        title: 'Falha',
                        message: 'Não foi possível registrar agora.',
                    },
                });
            }

            return;
        }

        const key = current.id;
        const artistProgress = progress[key] || {};
        if (artistProgress[platform]) return;
        const updatedArtistProgress = { ...artistProgress, [platform]: true };
        const updatedMap = { ...progress, [key]: updatedArtistProgress };
        setProgress(updatedMap);
        localStorage.setItem("daily-artist-progress", JSON.stringify(updatedMap));

        let required = 0;
        if (current.links?.spotify) required++;
        if (current.links?.instagram) required++;
        if (current.links?.youtube) required++;

        const completedCount = Object.values(updatedArtistProgress).filter(v => v === true).length;
        if (completedCount >= required && !updatedArtistProgress._rewarded && required > 0 && !isSupabase) {
            try {
                const api = await import('../api/index');
                const res = await api.claimArtistOfDayReward(activeUser.id, current.id);
                if (res.success && res.updatedUser) {
                    updatedMap[key]._rewarded = true;
                    setProgress(updatedMap);
                    localStorage.setItem("daily-artist-progress", JSON.stringify(updatedMap));
                    dispatch({ type: 'UPDATE_USER', payload: res.updatedUser });
                    dispatch({ type: 'ADD_TOAST', payload: { id: Date.now().toString(), type: 'success', title: 'Recompensa Coletada', message: `+1 Lummi Coin por apoiar ${currentDisplayName}!` } });
                }
            } catch (e) { console.error("Failed to claim reward", e); }
        }
    };

    if (isLoading && !current) return <LoadingSkeleton height={400} className="mt-12 rounded-[40px]" />;
    if (!current) return null;

    const currentArtistProgress = clickedMap;
    let totalLinks = 0;
    if (current.links?.spotify) totalLinks++;
    if (current.links?.instagram) totalLinks++;
    if (current.links?.youtube) totalLinks++;
    let confirmedDone = 0;
    if (current.links?.spotify && currentArtistProgress.spotify) confirmedDone++;
    if (current.links?.instagram && currentArtistProgress.instagram) confirmedDone++;
    if (current.links?.youtube && currentArtistProgress.youtube) confirmedDone++;
    const pct = totalLinks > 0 ? (confirmedDone / totalLinks) * 100 : 0;
    const isSetComplete = isSupabase ? false : currentArtistProgress._rewarded;
    const avatarUrl = (current?.avatarUrl || (current as any)?.avatar_url || '').trim();
    const rawName =
        (currentDisplayName ||
            current?.artisticName ||
            (current as any)?.artistic_name ||
            current?.name ||
            '') + '';

    const initials = rawName
        .trim()
        .split(/\s+/)
        .slice(0, 2)
        .map((p) => p[0]?.toUpperCase() || '')
        .join('');
    const spotifyUrl = (current?.links?.spotify || '').trim();
    const youtubeUrl = (current?.links?.youtube || '').trim();
    const instagramUrl = (current?.links?.instagram || '').trim();
    const iconBase =
        'w-10 h-10 rounded-full border border-goldenYellow-500/30 flex items-center justify-center transition';
    const enabled =
        'hover:bg-goldenYellow-500/10 hover:border-goldenYellow-400/60 cursor-pointer';
    const disabled =
        'opacity-40 cursor-not-allowed pointer-events-none';

    return (
        <div className="relative animate-fade-in-up mt-12 md:mt-16 px-1">
             <div className="text-center max-w-3xl mx-auto mb-10">
                <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-[#FFD36A]/10 border border-[#FFD36A]/40 mb-4 backdrop-blur-md shadow-[0_0_20px_rgba(255,211,106,0.15)]">
                    <CrownIcon className="w-4 h-4 text-[#FFD36A] animate-pulse" />
                    <span className="text-[11px] font-black text-[#FFD36A] uppercase tracking-[0.25em]">Destaque do Dia</span>
                </div>
                <h2 className="text-3xl md:text-5xl font-black text-white font-chakra tracking-tighter mb-4 drop-shadow-2xl uppercase" style={{ textShadow: '0 0 25px rgba(255,211,106,0.3)' }}>ARTISTAS DO DIA</h2>
            </div>
             <div className="relative min-h-[400px] max-w-5xl mx-auto">
                 <div className="bg-[#080808] border border-[#FFD36A]/30 p-1 rounded-[40px] relative overflow-hidden shadow-[0_0_60px_rgba(255,211,106,0.1)] group hover:border-[#FFD36A]/60 transition-all duration-500">
                    <div className="bg-[#0A0A0A]/95 backdrop-blur-xl p-8 md:p-12 rounded-[36px] relative z-10 flex flex-col md:flex-row items-center gap-10">
                        <div className="relative shrink-0">
                            <div className="absolute -top-12 left-1/2 -translate-x-1/2 text-[#FFD36A] animate-[float_5s_ease-in-out_infinite] z-20 drop-shadow-[0_0_15px_rgba(255,211,106,0.8)]"><CrownIcon className="w-10 h-10" /></div>
                            <div className="relative p-2 rounded-full border-2 border-[#FFD36A] shadow-[0_0_40px_rgba(255,211,106,0.25)] bg-[#050505]">
                                {/* Avatar */}
                                <div className="relative">
                                    <div className="w-28 h-28 rounded-full border border-goldenYellow-500/40 overflow-hidden bg-black/30 flex items-center justify-center">
                                        {avatarUrl ? (
                                            <img
                                                src={avatarUrl}
                                                alt={rawName || 'Artista do Dia'}
                                                className="w-full h-full object-cover"
                                                loading="lazy"
                                                referrerPolicy="no-referrer"
                                            />
                                        ) : (
                                            <div className="w-full h-full flex items-center justify-center text-goldenYellow-400 font-bold text-3xl">
                                                {initials || '🎤'}
                                            </div>
                                        )}
                                    </div>
                                </div>
                                <div className="absolute -bottom-4 left-1/2 -translate-x-1/2 bg-[#050505] text-[#FFD36A] text-[10px] font-black uppercase px-4 py-1.5 rounded-full border border-[#FFD36A] shadow-lg whitespace-nowrap">Lvl {formatNumber(current.level)}</div>
                            </div>
                        </div>
                        <div className="text-center md:text-left flex-1 w-full space-y-6">
                             <div>
                                <h3 className="text-3xl md:text-5xl font-black text-white font-chakra tracking-tight drop-shadow-md mb-2">{currentDisplayName}</h3>
                                <p className="text-[#B3B3B3] text-sm font-medium">{current.name} • {current.plan}</p>
                            </div>
                            <div className="bg-[#111] p-4 rounded-2xl border border-[#222] max-w-md mx-auto md:mx-0">
                                <div className="flex justify-between text-[10px] font-bold uppercase tracking-wider text-[#808080] mb-2">
                                    <span>Progresso de Exploração</span>
                                    <span className={isSetComplete ? 'text-[#FFD36A]' : 'text-white'}>{confirmedDone}/{totalLinks}</span>
                                </div>
                                <div className="h-3 bg-[#050505] rounded-full overflow-hidden border border-[#333]">
                                    <div style={{ width: `${pct}%` }} className={`h-full transition-all duration-700 ${isSetComplete ? 'bg-[#FFD36A] shadow-[0_0_15px_#FFD36A]' : 'bg-gradient-to-r from-[#C79B2C] to-[#FFD36A]'}`}></div>
                                </div>
                                <p className="text-[10px] text-[#666] mt-2 flex items-center gap-2">{isSetComplete ? <><CheckIcon className="w-3 h-3 text-[#FFD36A]"/> Recompensa Coletada!</> : "Visite os links para ganhar +1 Coin"}</p>
                            </div>
                            <div className="flex justify-center md:justify-start gap-4">
                                <button
                                    type="button"
                                    className={`${iconBase} ${spotifyUrl ? enabled : disabled}`}
                                    onClick={() => handleLinkClick('spotify', spotifyUrl)}
                                    aria-label="Spotify"
                                    title={spotifyUrl ? 'Abrir Spotify' : 'Sem link de Spotify'}
                                >
                                    <SpotifyIcon className="w-6 h-6" />
                                </button>
                                <button
                                    type="button"
                                    className={`${iconBase} ${youtubeUrl ? enabled : disabled}`}
                                    onClick={() => handleLinkClick('youtube', youtubeUrl)}
                                    aria-label="YouTube"
                                    title={youtubeUrl ? 'Abrir YouTube' : 'Sem link de YouTube'}
                                >
                                    <YoutubeIcon className="w-6 h-6" />
                                </button>
                                <button
                                    type="button"
                                    className={`${iconBase} ${instagramUrl ? enabled : disabled}`}
                                    onClick={() => handleLinkClick('instagram', instagramUrl)}
                                    aria-label="Instagram"
                                    title={instagramUrl ? 'Abrir Instagram' : 'Sem link de Instagram'}
                                >
                                    <InstagramIcon className="w-6 h-6" />
                                </button>
                            </div>
                        </div>
                    </div>
                 </div>
                 {artists.length > 1 && (
                      <div className="flex justify-center gap-4 mt-8">
                        <button onClick={() => setCurrentIndex((prev) => (prev - 1 + artists.length) % artists.length)} className="px-6 py-2 bg-[#151515] rounded-xl hover:bg-[#222] text-white font-bold text-xs uppercase tracking-widest border border-[#333] transition-colors">◀︎ Anterior</button>
                        <span className="text-xs text-[#666] font-mono self-center bg-[#111] px-3 py-1 rounded border border-[#222]">{currentIndex + 1} / {artists.length}</span>
                        <button onClick={() => setCurrentIndex((prev) => (prev + 1) % artists.length)} className="px-6 py-2 bg-[#151515] rounded-xl hover:bg-[#222] text-white font-bold text-xs uppercase tracking-widest border border-[#333] transition-colors">Próximo ▶︎</button>
                      </div>
                 )}
             </div>
        </div>
    );
};

const SkeletonCheckIn = () => (
    <LoadingSkeleton height={360} className="rounded-[32px]" />
);

const DailyCheckIn: React.FC<{ user: User, onCheckIn: () => void, checkInLoading: boolean, checkInDone: boolean, isSupabase: boolean, streakInfo?: CheckinStreakInfo | null, isLoading?: boolean }> = React.memo(({ user, onCheckIn, checkInLoading, checkInDone, isSupabase, streakInfo, isLoading = false }) => {
    if (isLoading) {
        return <SkeletonCheckIn />;
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const lastCheckInSource = isSupabase ? streakInfo?.lastCheckinUtc : user.lastCheckIn;
    const lastCheckInDate = lastCheckInSource ? new Date(lastCheckInSource) : null;
    if (lastCheckInDate) lastCheckInDate.setHours(0, 0, 0, 0);
    const hasCheckedInToday = isSupabase
        ? checkInDone
        : checkInDone || lastCheckInDate?.getTime() === today.getTime();
    const yesterday = new Date(today);
    yesterday.setDate(today.getDate() - 1);
    const streakBase = isSupabase ? (streakInfo?.streak ?? 0) : user.weeklyCheckInStreak;
    const streak = (lastCheckInDate && lastCheckInDate.getTime() < yesterday.getTime() && !hasCheckedInToday) ? 0 : streakBase;

    const buttonLabel = checkInLoading
        ? 'PROCESSANDO...'
        : hasCheckedInToday
            ? 'CHECK-IN FEITO ✅'
            : 'FAZER CHECK-IN AGORA';

    return (
        <div className="relative overflow-hidden rounded-[32px] p-[1px] bg-gradient-to-b from-[#FFD36A]/20 to-transparent shadow-[0_0_40px_rgba(255,211,106,0.1)] group h-full flex flex-col transition-all duration-500 hover:shadow-[0_0_60px_rgba(255,211,106,0.15)] hover:-translate-y-1">
            <div className="absolute inset-0 bg-[#050505] rounded-[31px] m-[1px] z-0"></div>
            <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/stardust.png')] opacity-20 pointer-events-none mix-blend-overlay z-0"></div>
            <div className="relative z-10 p-8 md:p-10 flex flex-col h-full justify-between">
                <div className="flex justify-between items-start">
                    <div>
                        <div className="flex items-center gap-3 mb-2">
                            <div className="p-2.5 bg-[#FFD36A]/10 rounded-xl border border-[#FFD36A]/40 shadow-[0_0_15px_rgba(255,211,106,0.2)]"><CoinIcon className="w-6 h-6 text-[#FFD36A] animate-[spin_4s_linear_infinite]" /></div>
                            <h3 className="text-2xl md:text-3xl font-black text-white font-chakra uppercase tracking-widest drop-shadow-[0_0_12px_rgba(255,211,106,0.45)] text-shadow-glow">Check-in</h3>
                        </div>
                        <p className="text-[#FFE7AC] text-sm font-bold uppercase tracking-wide drop-shadow-md opacity-90">Ganhe recompensas musicais todos os dias</p>
                    </div>
                    <div className="flex flex-col items-end">
                         <div className="px-4 py-1.5 rounded-full bg-[#111] border border-[#333] flex items-center gap-2 shadow-inner group-hover:border-[#FFD36A]/40 transition-colors">
                            <span className="w-2 h-2 bg-[#3CFF9A] rounded-full animate-pulse shadow-[0_0_8px_#3CFF9A]"></span>
                            <span className="text-xs font-black text-white uppercase tracking-wider">{streak} {streak === 1 ? 'Dia' : 'Dias'}</span>
                         </div>
                    </div>
                </div>
                <div className="flex-grow flex flex-col justify-center pt-10 pb-14">
                    <div className="flex items-end justify-center gap-1.5 h-16 mb-8 opacity-90">
                        {[...Array(12)].map((_, i) => (
                            <div key={i} className="w-2 bg-gradient-to-t from-[#FFD36A] to-[#FFB72E] rounded-t-sm shadow-[0_0_15px_rgba(255,211,106,0.5)]" style={{ height: `${20 + Math.random() * 80}%`, opacity: 0.7 + (i % 3) * 0.1, animation: `bounce 0.${6 + (i % 4)}s infinite alternate ease-in-out` }}></div>
                        ))}
                    </div>
                    <div className="flex justify-between items-center relative px-2">
                         <div className="absolute top-1/2 left-0 w-full h-1.5 bg-[#1A1A1A] rounded-full -z-10 border border-[#333]"></div>
                         <div className="absolute top-1/2 left-0 h-1.5 bg-gradient-to-r from-[#FFB72E] to-[#FFD36A] rounded-full -z-10 transition-all duration-1000 shadow-[0_0_15px_rgba(255,211,106,0.6)]" style={{ width: `${(Math.min(streak, 7) / 7) * 100}%` }}></div>
                         {Array.from({ length: 7 }).map((_, index) => {
                            const dayNum = index + 1;
                            const isCompleted = dayNum <= streak;
                            const isToday = !hasCheckedInToday && dayNum === streak + 1;
                            return (
                                <div key={index} className="relative group/day">
                                    <div className={`w-9 h-9 md:w-11 md:h-11 rounded-full flex items-center justify-center border-2 transition-all duration-500 z-10 relative ${isCompleted ? 'bg-[#FFD36A] border-[#FFB72E] text-black shadow-[0_0_25px_rgba(255,211,106,0.6)] scale-110' : isToday ? 'bg-[#0A0A0A] border-[#FFD36A] text-[#FFD36A] animate-pulse shadow-[0_0_20px_rgba(255,211,106,0.4)] scale-105' : 'bg-[#111] border-[#222] text-gray-700'}`}>
                                        {isCompleted ? <CheckIcon className="w-5 h-5 font-black" /> : <span className="text-[10px] md:text-xs font-black font-mono">{dayNum}</span>}
                                    </div>
                                    {index === 6 && <div className="absolute top-full mt-3 right-0 bg-[#FFD36A] text-black text-[9px] font-black px-3 py-1.5 rounded-lg opacity-100 shadow-[0_0_10px_rgba(255,211,106,0.5)] whitespace-nowrap animate-bounce z-20 border border-black">BÔNUS FINAL: +10 LC</div>}
                                </div>
                            );
                         })}
                    </div>
                </div>
                <div className="mt-auto">
                    <button onClick={onCheckIn} disabled={checkInLoading || hasCheckedInToday} className="w-full py-5 rounded-2xl font-black text-sm uppercase tracking-[0.2em] transition-all duration-300 bg-gradient-to-r from-[#FFCA4F] via-[#FFE08F] to-[#FFCA4F] bg-[length:200%_100%] animate-[shine_3s_linear_infinite] text-black border border-[#FFD36A] shadow-[0_0_35px_rgba(255,211,106,0.4)] hover:shadow-[0_0_60px_rgba(255,211,106,0.6)] hover:scale-[1.03] active:scale-[0.98] relative overflow-hidden group/btn disabled:opacity-70 disabled:hover:scale-100">
                        <span className="relative z-10 flex items-center justify-center gap-3">
                            {hasCheckedInToday ? (
                                <>
                                    {buttonLabel}
                                    <CheckIcon className="w-5 h-5" />
                                </>
                            ) : (
                                <>
                                    {buttonLabel}
                                    {!checkInLoading && <TrendingUpIcon className="w-5 h-5" />}
                                </>
                            )}
                        </span>
                    </button>
                    <p className="text-center text-[10px] text-[#FFD36A] mt-4 uppercase font-bold tracking-[0.15em] drop-shadow-[0_0_10px_rgba(255,211,106,0.8)] animate-pulse">
                        {hasCheckedInToday ? 'VOLTE AMANHÃ' : 'RESGATE SUAS COINS DISPONÍVEIS'}
                    </p>
                </div>
            </div>
        </div>
    );
});

const Dashboard: React.FC<DashboardProps> = ({ onShowArtistOfTheDay, onShowRewardModal }) => {
  useEffect(() => {
      Perf.mark('dashboard_mount');
      Perf.trackRender('Dashboard');
      return () => {};
  }, []);

  const { state, dispatch } = useAppContext();
  const { activeUser: user, prevCoins, notifications: notificationState, ledger: ledgerState } = state;
  const isProfileLoading =
    !!user?.id && (
      user.coins === undefined || user.coins === null ||
      user.xp === undefined || user.xp === null
    );
  const isSupabase = isSupabaseProvider();
  const userDisplayName = getDisplayName(user ? { ...user, artistic_name: user.artisticName } : null);
  const [data, setData] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [ledgerEntries, setLedgerEntries] = useState<LedgerEntry[]>([]);
  const [notificationsFeed, setNotificationsFeed] = useState<Notification[]>([]);
  const [isLedgerLoading, setIsLedgerLoading] = useState(false);
  const [isNotificationsLoading, setIsNotificationsLoading] = useState(false);
  const [levelProgress, setLevelProgress] = useState<LevelProgress | null>(null);
  const [checkinStreakInfo, setCheckinStreakInfo] = useState<CheckinStreakInfo | null>(null);
  const [checkInDone, setCheckInDone] = useState(false);
  const [checkInLoading, setCheckInLoading] = useState(false);
  const [checkedIn, setCheckedIn] = useState<boolean | null>(null);
  const isCheckInStatusLoading = isSupabase && checkedIn === null;
  const hasInitialLoadedRef = useRef(false);
  const lastKnownScrollYRef = useRef<number | null>(null);
  const lastLoadRef = useRef<number>(0);
  const CACHE_TTL_MS = 30_000; // 30s
  const lastUserIdRef = useRef<string | null>(null);
  const lastCheckInDayRef = useRef<string | null>(null);
  const realtimeChannelRef = useRef<any>(null);
  const lastRealtimeLedgerReconcileAtRef = useRef<number>(0);
  const lastRealtimeNotifReconcileAtRef = useRef<number>(0);
  const REALTIME_RECONCILE_MIN_INTERVAL_MS = 20_000;

  const safePrependUniqueById = useCallback(<T extends { id?: any }>(list: T[], item: T) => {
    const id = (item as any)?.id;
    if (!id) return list;
    if (list.some((x) => (x as any)?.id === id)) return list;
    return [item, ...list];
  }, []);

  const getTodayRefId = useCallback(() => new Date().toISOString().split('T')[0], []);

  const restoreScroll = () => {
    const y = lastKnownScrollYRef.current;
    if (typeof y !== 'number') return;

    // 2 RAFs = depois do React commit + paint
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        window.scrollTo({ top: y, left: 0 });
      });
    });
  };

  const markCheckInDoneForToday = useCallback(() => {
    lastCheckInDayRef.current = getTodayRefId();
    setCheckInDone(true);
  }, [getTodayRefId]);

  useEffect(() => {
    setLedgerEntries([]);
    setNotificationsFeed([]);
    setLevelProgress(null);
    setCheckinStreakInfo(null);
    dispatch({ type: 'SET_LEDGER', payload: [] });
    dispatch({ type: 'CLEAR_NOTIFICATIONS' });
    clearSessionCache();
    lastLoadRef.current = 0;
  }, [user?.id, dispatch]);

  const notifications = notificationState;
  const ledger = Array.isArray(ledgerState) && ledgerState.length ? ledgerState : ledgerEntries;

  const safeNotifications = Array.isArray((notificationState as any)?.notifications)
    ? (notificationState as any).notifications
    : Array.isArray((notifications as any))
    ? (notifications as any)
    : [];

  const safeLedger = Array.isArray((ledger as any)) ? (ledger as any) : [];

  const fetchData = useCallback(async (force = false) => {
    if (!user) {
        setLedgerEntries([]);
        dispatch({ type: 'SET_LEDGER', payload: [] });
        setNotificationsFeed([]);
        setLevelProgress(null);
        setCheckinStreakInfo(null);
        return;
    }
    const now = Date.now();
    if (!force && lastLoadRef.current && now - lastLoadRef.current < CACHE_TTL_MS) {
        return;
    }
    lastLoadRef.current = now;

    // Só mostra loading no primeiro carregamento real do Dashboard
    if (!hasInitialLoadedRef.current) {
        setIsLoading(true);
    }
    setError(null);
    try {
        if (isSupabase) {
            setIsLedgerLoading(true);
            setIsNotificationsLoading(true);
            const shouldFetchLedger = force || !Array.isArray(ledgerState) || ledgerState.length === 0;
            const [ledgerResponse, notificationsResponse, levelProgressResponse, checkinStreakResponse] = await Promise.all([
                shouldFetchLedger
                    ? fetchMyLedger(20, 0, { userId: user.id, bypassCache: force })
                    : Promise.resolve({ success: true, ledger: ledgerState }),
                fetchMyNotifications(20, { userId: user.id, bypassCache: force }),
                getMyLevelProgress({ userId: user.id, bypassCache: force }),
                getMyCheckinStreak({ userId: user.id, bypassCache: force }),
            ]);

            const ledgerList = ledgerResponse.success ? ledgerResponse.ledger : [];
            const notificationList = notificationsResponse.success ? notificationsResponse.notifications : [];

            let artistOfDay: any = null;
            let artistOfDayClicked: Record<string, boolean> = {};
            let artistOfDayDayUtc: string | null = null;

            try {
                const api = await import('../api/index');
                const payload = await api.getArtistOfDay();

                if (payload?.success && payload?.has_artist && payload?.artist) {
                    const a = payload.artist;

                    artistOfDay = {
                        id: a.id,
                        name: a.display_name || a.artistic_name || a.id,
                        displayName: a.display_name,
                        artisticName: a.artistic_name,
                        avatarUrl: a.avatar_url,
                        level: a.level ?? 0,
                        spotifyUrl: a.spotify_url,
                        youtubeUrl: a.youtube_url,
                        instagramUrl: a.instagram_url,
                        links: {
                            spotify: a.spotify_url || '',
                            youtube: a.youtube_url || '',
                            instagram: a.instagram_url || '',
                        },
                    };

                    artistOfDayClicked = payload.clicked || {};
                    artistOfDayDayUtc = payload.day_utc || null;
                }
            } catch (e) {
                console.warn('[ArtistOfDay] getArtistOfDay failed', e);
            }

            setLedgerEntries(ledgerList);
            dispatch({ type: 'SET_LEDGER', payload: ledgerList });
            if (levelProgressResponse.success) {
                setLevelProgress(levelProgressResponse.progress);
            }
            if (checkinStreakResponse.success) {
                setCheckinStreakInfo(checkinStreakResponse.data);
            }
            const newNotifications = notificationList.filter(n => !safeNotifications.some(existing => existing.id === n.id));
            const mergedNotifications = [...newNotifications, ...safeNotifications];
            setNotificationsFeed(mergedNotifications.length ? mergedNotifications : notificationList);
            if (newNotifications.length) {
                dispatch({ type: 'ADD_NOTIFICATIONS', payload: newNotifications });
            }

            setData({
                advertisements: [],
                featuredMission: null,
                artistsOfTheDay: artistOfDay ? [artistOfDay] : [],
                processedArtistOfTheDayQueue: [],
                artistsOfTheDayIds: artistOfDay ? [artistOfDay.id] : [],
                artistOfDayClicked,
                artistOfDayDayUtc,
                ledger: ledgerList,
            });

            try {
                if (artistOfDay && artistOfDayDayUtc && user?.id === artistOfDay.id) {
                    const key = `aw_aod_seen:${artistOfDayDayUtc}`;
                    const seen = localStorage.getItem(key) === '1';
                    if (!seen) {
                        onShowArtistOfTheDay(artistOfDayDayUtc);
                    }
                }
            } catch {}
        } else {
            const api = await import('../api/index');
            const dashboardData = await api.fetchDashboardData();
            setData(dashboardData);
            const fallbackLedger = dashboardData?.ledger || [];
            setLedgerEntries(fallbackLedger);
            dispatch({ type: 'SET_LEDGER', payload: fallbackLedger });
            const fallbackLevel = calculateLevelFromXp(user.xp);
            const levelStartXp = xpForLevelStart(fallbackLevel.level);
            const xpIntoLevel = Math.max(0, user.xp - levelStartXp);
            const xpNeededForNext = Math.max(0, fallbackLevel.xpToNextLevel - levelStartXp);
            const pct = xpNeededForNext > 0 ? Math.min(100, Math.max(0, (xpIntoLevel / xpNeededForNext) * 100)) : 0;
            setLevelProgress({
                pct,
                xpIntoLevel,
                xpNeededForNext,
            });
            setCheckinStreakInfo({
                streak: user.weeklyCheckInStreak,
                lastCheckinUtc: user.lastCheckIn ?? null,
            });
            setNotificationsFeed(safeNotifications);
            if (dashboardData?.artistsOfTheDayIds?.includes(user.id)) {
                const processedEntry = dashboardData.processedArtistOfTheDayQueue.find((item: ProcessedArtistOfTheDayQueueEntry) => item.userId === user.id);
                if (processedEntry && !user.seenArtistOfTheDayAnnouncements?.includes(processedEntry.id)) {
                    onShowArtistOfTheDay(processedEntry.id);
                }
            }
        }
    } catch (error) {
        console.error("Failed to fetch dashboard data:", error);
        setError("Não foi possível carregar os dados do dashboard.");
    } finally {
        // Depois do primeiro load, nunca mais “pisca” loading
        hasInitialLoadedRef.current = true;
        setIsLoading(false);
        setIsLedgerLoading(false);
        setIsNotificationsLoading(false);
        Perf.end('dashboard_mount');
    }
  }, [user, isSupabase, notificationState, ledgerState, dispatch, onShowArtistOfTheDay]);

  useEffect(() => {
    // Recarrega quando muda o usuário logado (troca de conta), não quando o fetchData é recriado
    void fetchData(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

  // =====================================================
  // Realtime (Supabase): notifications + economy_ledger
  // - escuta INSERT somente do próprio user_id
  // - faz refetch leve para manter UI consistente
  // =====================================================
  useEffect(() => {
    if (!isSupabase || !user?.id) return;
    const supabase = getSupabase();
    if (!supabase) return;

    // evita canais duplicados ao trocar de usuário / remount
    try {
      if (realtimeChannelRef.current) {
        supabase.removeChannel(realtimeChannelRef.current);
        realtimeChannelRef.current = null;
      }
    } catch (e) {
      // silencioso
    }

    let isActive = true;
    const userId = user.id;

    const channel = supabase.channel(`dashboard:${userId}`);
    realtimeChannelRef.current = channel;

    // Debounce timers (evita burst de refetch)
    let notifTimer: any = null;
    let ledgerTimer: any = null;
    const schedule = (kind: 'notif' | 'ledger', fn: () => Promise<void>) => {
      if (!isActive) return;
      if (kind === 'notif') {
        if (notifTimer) clearTimeout(notifTimer);
        notifTimer = setTimeout(() => { void fn(); }, 500);
      } else {
        if (ledgerTimer) clearTimeout(ledgerTimer);
        ledgerTimer = setTimeout(() => { void fn(); }, 500);
      }
    };

    let lastProfileRefreshAt = 0;

    const refetchProfileThrottled = async () => {
      const now = Date.now();
      if (now - lastProfileRefreshAt < 5000) return;
      lastProfileRefreshAt = now;
      try {
        const profileRes = await ProfileSupabase.fetchMyProfile(userId, { bypassCache: true });
        if (profileRes?.success && profileRes.user) {
          dispatch({ type: 'UPDATE_USER', payload: profileRes.user });
        }
      } catch {}
    };

    const refetchNotifications = async () => {
      const res = await fetchMyNotifications(20, { userId, bypassCache: true });
      if (!isActive) return;
      if (res.success) {
        const list = res.notifications || [];
        setNotificationsFeed(list);
        // Evita duplicar no store: só adiciona as que ainda não existem.
        const existingIds = new Set(safeNotifications.map(n => n.id));
        const onlyNew = list.filter(n => !existingIds.has(n.id));
        if (onlyNew.length) {
          dispatch({ type: 'ADD_NOTIFICATIONS', payload: onlyNew });
        }
      }
    };

    const refetchLedger = async () => {
      const res = await fetchMyLedger(20, 0, { userId, bypassCache: true });
      if (!isActive) return;
      if (res.success) {
        const list = res.ledger || [];
        setLedgerEntries(list);
        dispatch({ type: 'SET_LEDGER', payload: list });
        await refetchProfileThrottled();
      }
    };

    channel
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${userId}`,
        },
        async (payload: any) => {
          const row = payload?.new;
          if (row?.id) {
            setNotificationsFeed((prev) => safePrependUniqueById(Array.isArray(prev) ? prev : [], row));
            dispatch({ type: 'ADD_NOTIFICATIONS', payload: [row] });
          }

          schedule('notif', async () => {
            const now = Date.now();
            if (now - lastRealtimeNotifReconcileAtRef.current < REALTIME_RECONCILE_MIN_INTERVAL_MS) return;
            lastRealtimeNotifReconcileAtRef.current = now;
            try {
              await refetchNotifications();
            } catch (e) {
              console.warn('[Dashboard Realtime] notifications reconcile failed', e);
            }
          });
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'economy_ledger',
          filter: `user_id=eq.${userId}`,
        },
        async (payload: any) => {
          const row = payload?.new;

          if (row?.id) {
            setLedgerEntries((prev) => safePrependUniqueById(Array.isArray(prev) ? prev : [], row));
            dispatch({
              type: 'SET_LEDGER',
              payload: safePrependUniqueById(
                Array.isArray(ledgerState) ? ledgerState : [],
                row
              ),
            });
            try {
              await refetchProfileThrottled();
            } catch {}
          }

          schedule('ledger', async () => {
            const now = Date.now();
            if (now - lastRealtimeLedgerReconcileAtRef.current < REALTIME_RECONCILE_MIN_INTERVAL_MS) return;
            lastRealtimeLedgerReconcileAtRef.current = now;
            try {
              await refetchLedger();
            } catch (e) {
              console.warn('[Dashboard Realtime] ledger reconcile failed', e);
            }
          });
        }
      )
      .subscribe((status: any) => {
        // status: SUBSCRIBED / TIMED_OUT / CHANNEL_ERROR / CLOSED
        if (status !== 'SUBSCRIBED') {
          // não é fatal
          // console.log('[Dashboard Realtime] status', status);
        }
      });

    return () => {
      isActive = false;
      if (notifTimer) clearTimeout(notifTimer);
      if (ledgerTimer) clearTimeout(ledgerTimer);
      try {
        supabase.removeChannel(channel);
      } catch (e) {
        // silencioso
      }
      if (realtimeChannelRef.current === channel) {
        realtimeChannelRef.current = null;
      }
    };
  }, [isSupabase, user?.id, dispatch, ledgerState]);

  useEffect(() => {
    if (!Array.isArray(notifications) || notifications.length === 0) {
      setNotificationsFeed([]);
      return;
    }
    setNotificationsFeed(notifications);
  }, [notifications]);

  useEffect(() => {
    if (!isSupabase) return;
    if (!user?.id) return;

    const supabase = getSupabase();
    if (!supabase) return;

    let alive = true;
    let debounce: number | null = null;

    const channel = supabase.channel(`artist_of_day_clicks:${user.id}`);

    channel
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'artist_of_day_clicks',
          filter: `viewer_id=eq.${user.id}`,
        },
        async () => {
          if (!alive) return;

          if (debounce) window.clearTimeout(debounce);
          debounce = window.setTimeout(async () => {
            try {
              const api = await import('../api/index');
              const payload = await api.getArtistOfDay();
              if (!alive) return;

              if (payload?.success && payload?.has_artist && payload?.artist) {
                const a = payload.artist;

                const artistOfDay = {
                  id: a.id,
                  name: a.display_name || a.artistic_name || a.id,
                  displayName: a.display_name,
                  artisticName: a.artistic_name,
                  avatarUrl: a.avatar_url,
                  level: a.level ?? 0,
                  spotifyUrl: a.spotify_url,
                  youtubeUrl: a.youtube_url,
                  instagramUrl: a.instagram_url,
                  links: {
                    spotify: a.spotify_url || '',
                    youtube: a.youtube_url || '',
                    instagram: a.instagram_url || '',
                  },
                };

                setData((prev: any) => ({
                  ...(prev || {}),
                  artistsOfTheDay: [artistOfDay],
                  artistsOfTheDayIds: [artistOfDay.id],
                  artistOfDayClicked: payload.clicked || {},
                  artistOfDayDayUtc: payload.day_utc || null,
                }));
              }
            } catch (e) {
              console.error('[artist_of_day] realtime refresh failed', e);
            }
          }, 400);
        }
      )
      .subscribe();

    return () => {
      alive = false;
      if (debounce) window.clearTimeout(debounce);
      try {
        supabase.removeChannel(channel);
      } catch {}
    };
  }, [isSupabase, user?.id]);

  useEffect(() => {
    if (!isSupabase || !user) {
        setCheckedIn(false);
        return;
    }

    let isActive = true;
    setCheckedIn(null);

    const loadCheckinStatus = async () => {
        try {
            const result = await hasCheckedInToday(user.id);
            if (!isActive) return;
            setCheckedIn(result);
            if (result) {
                markCheckInDoneForToday();
            } else {
                setCheckInDone(false);
            }
        } catch (error) {
            console.error('[CheckIn] failed to load status', error);
            if (isActive) setCheckedIn(false);
        }
    };

    void loadCheckinStatus();

    return () => { isActive = false; };
  }, [isSupabase, user?.id, markCheckInDoneForToday]);

  useEffect(() => {
    if (!user) {
        setCheckInDone(false);
        setCheckedIn(null);
        lastUserIdRef.current = null;
        lastCheckInDayRef.current = null;
        return;
    }

    if (isSupabase) {
        lastUserIdRef.current = user.id;
        return;
    }

    if (lastUserIdRef.current !== user.id) {
        lastCheckInDayRef.current = null;
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayRefId = getTodayRefId();
    const lastCheckInDate = user.lastCheckIn ? new Date(user.lastCheckIn) : null;
    if (lastCheckInDate) lastCheckInDate.setHours(0, 0, 0, 0);
    const hasCheckedInToday = lastCheckInDate?.getTime() === today.getTime();

    if (hasCheckedInToday) {
        markCheckInDoneForToday();
    } else if (lastCheckInDayRef.current === todayRefId) {
        markCheckInDoneForToday();
    } else {
        setCheckInDone(false);
    }

    lastUserIdRef.current = user.id;
  }, [user?.id, user?.lastCheckIn, getTodayRefId, markCheckInDoneForToday, isSupabase]);

  useEffect(() => {
    if (!isSupabase || !user || checkInDone || checkedIn === null) return;

    let isMounted = true;

    const checkLedgerStatus = async () => {
        setCheckInLoading(true);
        try {
            const todayRefId = getTodayRefId();
            const ledgerResponse = await fetchMyLedger(1, 0, { userId: user.id, bypassCache: true });
            if (!ledgerResponse.success) return;

            const sortedLedger = [...ledgerResponse.ledger].sort((a, b) => b.timestamp - a.timestamp);
            const checkInEntries = sortedLedger.filter(entry => entry.source === 'daily_check_in' || entry.source === 'daily_checkin');
            const latestEntry = (checkInEntries[0] || sortedLedger?.[0]) as any;
            const refId = latestEntry?.metadata?.refId ?? latestEntry?.metadata?.ref_id;

            if (refId === todayRefId && isMounted) {
                markCheckInDoneForToday();
            }
        } catch (ledgerError) {
            console.error('Failed to verify daily check-in status.', ledgerError);
        } finally {
            if (isMounted) setCheckInLoading(false);
        }
    };

    void checkLedgerStatus();

    return () => { isMounted = false; };
  }, [isSupabase, user?.id, checkInDone, checkedIn, getTodayRefId, markCheckInDoneForToday]);

  const handleDailyCheckIn = useCallback(async () => {
    if (!user?.id || checkInLoading || checkInDone || isCheckInStatusLoading) return;
    lastKnownScrollYRef.current = window.scrollY;
    setCheckInLoading(true);
    Perf.mark('check_in_action');
    try {
        clearSessionCache();
        lastLoadRef.current = 0;

        const api = await import('../api/index');
        const response = await api.dailyCheckIn(user.id);

        if (response?.updatedUser) {
            dispatch({ type: 'UPDATE_USER', payload: response.updatedUser });
        }

        const refreshed = await refreshAfterEconomyAction(user.id, dispatch);
        if (refreshed?.ledger?.length) {
            setLedgerEntries(refreshed.ledger);
            setData(prev => prev ? { ...prev, ledger: refreshed.ledger } : prev);
            dispatch({ type: 'SET_LEDGER', payload: refreshed.ledger });
        }
        if (refreshed?.notifications?.length) {
            setNotificationsFeed(refreshed.notifications);
        }

        try {
            const streakRes = await getMyCheckinStreak({ userId: user.id, bypassCache: true });
            if (streakRes?.success) {
                setCheckinStreakInfo(streakRes.data);
            }
        } catch {
            // noop
        }

        dispatch({
            type: 'ADD_TOAST',
            payload: {
                id: Date.now().toString(),
                type: 'coin',
                title: 'Check-in realizado!',
                message: '+1 LC e +10 XP adicionados.',
            }
        });

        markCheckInDoneForToday();
    } catch (e) { 
        console.error(e); 
        dispatch({ type: 'ADD_TOAST', payload: { id: Date.now().toString(), type: 'error', title: 'Erro no check-in', message: 'Não foi possível concluir o check-in.' } });
    } finally { 
        setCheckInLoading(false);
        restoreScroll();
        Perf.end('check_in_action');
    }
  }, [user?.id, checkInLoading, checkInDone, isCheckInStatusLoading, dispatch, markCheckInDoneForToday, restoreScroll]);

  if (isLoading || !user) {
    return (
        <div className="space-y-6">
            <LoadingSkeleton height={300} className="rounded-[26px]" />
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <LoadingSkeleton height={200} className="rounded-[28px]" />
                <LoadingSkeleton height={200} className="rounded-[28px]" />
                <LoadingSkeleton height={200} className="rounded-[28px]" />
            </div>
            <LoadingSkeleton height={400} className="rounded-[32px]" />
        </div>
    );
  }
  
  if (error) return <div className="text-center text-red-500 p-8 border border-red-500/30 rounded-xl bg-red-900/10 backdrop-blur-sm">{error}</div>;
  if (!data) return null;

  const coinStart = prevCoins === null ? 0 : prevCoins;
  const xpIntoLevel = levelProgress?.xpIntoLevel ?? 0;
  const xpNeededForNext = levelProgress?.xpNeededForNext ?? 0;
  const progressPct = levelProgress?.pct ?? 0;

  const getPlanBadge = (plan: User['plan']) => {
      switch (plan) {
          case 'Hitmaker': return { label: '🚀 BOOSTER 10x', color: 'text-red-400', bg: 'bg-red-500/10', border: 'border-red-500/30', glow: 'shadow-[0_0_25px_rgba(248,113,113,0.3)]' };
          case 'Artista Profissional': return { label: '⚡ BOOSTER 5x', color: 'text-neon-magenta', bg: 'bg-neon-magenta/10', border: 'border-neon-magenta/30', glow: 'shadow-[0_0_25px_rgba(255,28,247,0.3)]' };
          case 'Artista em Ascensão': return { label: '🔥 BOOSTER 3x', color: 'text-neon-cyan', bg: 'bg-neon-cyan/10', border: 'border-neon-cyan/30', glow: 'shadow-[0_0_25px_rgba(0,232,255,0.3)]' };
          default: return null;
      }
  };
  const planBadge = getPlanBadge(user.plan);

  return (
    <div className="relative pb-[120px] mb-10 space-y-12">
      <div className="fixed inset-0 pointer-events-none bg-[radial-gradient(circle_at_20%_20%,rgba(255,211,106,0.03),transparent_60%),radial-gradient(circle_at_80%_80%,rgba(10,6,0,0.8),transparent_100%)] z-[-1]"></div>
      
      <div>
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 pb-6">
            <div>
                <p className="text-[#FFD36A] font-bold text-xs mb-2 uppercase tracking-[0.2em] flex items-center gap-2">
                    <span className="w-2 h-2 bg-[#FFD36A] rounded-full animate-pulse shadow-[0_0_10px_#FFD36A]"></span>
                    {getGreeting()},
                </p>
                <div className="text-3xl font-extrabold tracking-tight">
                  {isProfileLoading ? 'CARREGANDO PERFIL…' : (user?.display_name || user?.displayName || user?.name || 'UNKNOWN USER')}
                </div>
            </div>
            <div className="hidden md:block text-right">
                <p className="text-[10px] text-gray-400 uppercase tracking-[0.3em] font-bold mb-1">Carreira Musical</p>
                <p className="text-[#FFD36A] font-bold text-3xl font-chakra tracking-wide drop-shadow-[0_0_10px_rgba(255,211,106,0.4)]">{userDisplayName}</p>
            </div>
        </div>
        
        <AdvertisementCarousel ads={data.advertisements} />

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 md:gap-8 mt-12">
            
            {/* LEVEL CARD */}
            <div className="bg-[#050505]/90 border border-[#FFD36A]/30 p-8 rounded-[28px] relative overflow-hidden group hover:border-[#FFD36A] transition-all duration-500 hover:shadow-[0_0_35px_rgba(255,210,120,0.25)] hover:-translate-y-1 h-full flex flex-col justify-between backdrop-blur-xl animate-[fade-in-up_0.5s_ease-out]">
                <div className="absolute inset-0 bg-[#FFD36A]/5 opacity-0 group-hover:opacity-100 transition-opacity duration-700"></div>
                <div className="absolute top-0 right-0 p-6 opacity-10 group-hover:opacity-30 transition-opacity transform group-hover:scale-110 duration-700">
                    <XPIcon className="w-40 h-40 text-[#FFD36A] drop-shadow-[0_0_15px_rgba(255,211,106,0.5)]" />
                </div>
                
                <div className="relative z-10">
                    <p className="text-[10px] text-[#FFD36A] font-black uppercase tracking-[0.2em] mb-4 flex items-center gap-2 border border-[#FFD36A]/20 px-3 py-1 rounded-full w-fit bg-[#FFD36A]/5 shadow-[0_0_10px_rgba(255,211,106,0.1)]">Nível Atual</p>
                    <div className="flex items-baseline gap-2">
                        <span className="text-6xl md:text-7xl font-black text-white font-chakra tracking-tighter text-shadow-glow">{formatNumber(user.level)}</span>
                        <span className="text-sm text-gray-500 font-bold self-end mb-2">/ 100</span>
                    </div>
                </div>
                <div className="mt-8 relative z-10 space-y-2">
                    <div className="text-xs text-gray-400 uppercase tracking-widest font-bold">XP Total</div>
                    <div className="text-2xl font-black text-white font-chakra tracking-tight">{formatNumber(user.xp)} XP</div>
                    <div className="text-[10px] text-gray-500 uppercase tracking-wider font-bold">
                        Próximo nível: {formatNumber(xpNeededForNext)} XP
                    </div>
                    <div className="mt-3 space-y-2">
                        <div className="flex items-center justify-between text-[10px] uppercase tracking-wider text-gray-500 font-bold">
                            <span>Progresso do nível</span>
                            <span>{formatNumber(xpIntoLevel)} / {formatNumber(xpNeededForNext)} XP</span>
                        </div>
                        <div className="h-2.5 bg-[#0B0B0B] border border-white/10 rounded-full overflow-hidden">
                            <div
                                className="h-full bg-gradient-to-r from-[#A855F7] via-[#C084FC] to-[#E9D5FF] shadow-[0_0_15px_rgba(192,132,252,0.45)] transition-all duration-700"
                                style={{ width: `${progressPct}%` }}
                            ></div>
                        </div>
                    </div>
                </div>
            </div>

            {/* COINS CARD */}
            <div className="bg-[#050505]/90 border border-[#FFD36A]/30 p-8 rounded-[28px] relative overflow-hidden group hover:border-[#FFD36A] transition-all duration-500 hover:shadow-[0_0_35px_rgba(255,210,120,0.25)] hover:-translate-y-1 h-full flex flex-col justify-between backdrop-blur-xl animate-[fade-in-up_0.6s_ease-out]">
                <div className="absolute inset-0 bg-[#FFD36A]/5 opacity-0 group-hover:opacity-100 transition-opacity duration-700"></div>
                <div className="absolute top-0 right-0 p-6 opacity-10 group-hover:opacity-30 transition-opacity transform group-hover:scale-110 duration-700">
                    <CoinIcon className="w-40 h-40 text-[#FFD36A] drop-shadow-[0_0_15px_rgba(255,211,106,0.5)]" />
                </div>
                <div className="relative z-10">
                    <p className="text-[10px] text-[#FFD36A] font-black uppercase tracking-[0.2em] mb-4 flex items-center gap-2 border border-[#FFD36A]/20 px-3 py-1 rounded-full w-fit bg-[#FFD36A]/5 shadow-[0_0_10px_rgba(255,211,106,0.1)]">Saldo Disponível</p>
                    <div className="flex items-center gap-4">
                        <div className="p-3.5 bg-[#FFD36A]/10 rounded-full border border-[#FFD36A]/40 shadow-[0_0_20px_rgba(255,211,106,0.3)] animate-[pulse_2s_infinite]">
                            <CoinIcon className="w-9 h-9 text-[#FFD36A] drop-shadow-md" />
                        </div>
                        <CountUp start={coinStart} end={user.coins} duration={1500} className="text-5xl md:text-6xl font-black text-white font-chakra tracking-tighter text-shadow-glow" />
                    </div>
                </div>
                <p className="text-xs text-[#808080] mt-8 font-medium border-t border-white/10 pt-4 relative z-10 tracking-wide">Use na loja para impulsionar sua carreira.</p>
            </div>

            {/* PLAN CARD */}
            <div className={`bg-[#050505]/90 border p-8 rounded-[28px] relative overflow-hidden flex flex-col justify-between transition-all duration-500 h-full backdrop-blur-xl animate-[fade-in-up_0.7s_ease-out] ${planBadge ? `hover:${planBadge.border} ${planBadge.border} hover:${planBadge.glow}` : 'border-[#00E8FF]/30 hover:border-[#00E8FF] hover:shadow-[0_0_35px_rgba(0,232,255,0.2)]'} hover:-translate-y-1`}>
                <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity bg-gradient-to-br from-transparent to-black/50"></div>
                <div className="relative z-10">
                    <p className={`text-[10px] uppercase tracking-[0.2em] font-black mb-4 flex items-center gap-2 border px-3 py-1 rounded-full w-fit ${planBadge ? `${planBadge.color} ${planBadge.border} ${planBadge.bg}` : 'text-[#00E8FF] border-[#00E8FF]/30 bg-[#00E8FF]/5'}`}>Plano Atual</p>
                    <h3 className={`text-3xl md:text-4xl font-black font-chakra leading-tight mb-2 drop-shadow-lg ${planBadge ? 'text-white' : 'text-gray-200'}`}>{user.plan}</h3>
                    
                    {planBadge ? (
                        <div className={`inline-flex items-center px-4 py-2 rounded-xl border mt-4 backdrop-blur-md ${planBadge.bg} ${planBadge.border} ${planBadge.color} ${planBadge.glow}`}>
                            <span className="text-xs font-bold tracking-widest uppercase">{planBadge.label}</span>
                        </div>
                    ) : (
                        <div className="mt-6">
                            <p className="text-sm text-gray-400 mb-4 font-medium">Acelere seus ganhos e desbloqueie recursos.</p>
                            <button onClick={() => dispatch({ type: 'SET_VIEW', payload: 'subscriptions' })} className="text-xs bg-[#00E8FF]/10 text-[#00E8FF] border border-[#00E8FF]/50 px-6 py-4 rounded-xl font-bold hover:bg-[#00E8FF] hover:text-black transition-all uppercase tracking-[0.15em] shadow-[0_0_20px_rgba(0,232,255,0.2)] hover:shadow-[0_0_40px_rgba(0,232,255,0.5)] w-full active:scale-95 relative overflow-hidden group/btn">
                                <span className="relative z-10">Ativar Boost 🚀</span>
                                <div className="absolute inset-0 bg-white/30 translate-y-full group-hover/btn:translate-y-0 transition-transform duration-300 skew-y-12"></div>
                            </button>
                        </div>
                    )}
                </div>
                <div className="absolute -bottom-10 -right-10 opacity-10 pointer-events-none transform rotate-12 group-hover:scale-110 transition-transform duration-700">
                    <CrownIcon className="w-72 h-72 text-white" />
                </div>
            </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mt-12">
            <DailyCheckIn user={user} onCheckIn={handleDailyCheckIn} checkInLoading={checkInLoading} checkInDone={checkInDone} isSupabase={isSupabase} streakInfo={checkinStreakInfo} isLoading={isCheckInStatusLoading} />

            {/* FEATURED MISSION */}
            {data.featuredMission ? (
            <div 
                className="relative rounded-[32px] overflow-hidden border border-[#FFD36A]/30 bg-[#0A0A0A] shadow-[0_0_40px_rgba(255,211,106,0.1)] group cursor-pointer transition-all duration-500 hover:-translate-y-1 hover:border-[#FFD36A] hover:shadow-[0_0_60px_rgba(255,211,106,0.25)] min-h-[400px] flex flex-col" 
                onClick={() => dispatch({ type: 'SET_VIEW', payload: 'missions' })}
            >
                <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-[#FFD36A] to-transparent opacity-80"></div>
                <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-10 z-0 mix-blend-overlay pointer-events-none"></div>
                <div className="absolute bottom-0 right-0 w-[400px] h-[400px] bg-[#FFD36A]/5 blur-[100px] rounded-full pointer-events-none"></div>
                
                <div className="relative z-10 p-8 md:p-10 h-full flex flex-col">
                    <div className="flex items-center gap-3 mb-8">
                        <div className="p-2.5 bg-[#FFD36A] text-black rounded-xl shadow-[0_0_20px_rgba(255,211,106,0.6)] animate-pulse-slow"><StarIcon className="w-6 h-6" /></div>
                        <h3 className="text-xs font-black text-[#FFD36A] uppercase tracking-[0.3em] text-shadow-glow">Missão em Destaque</h3>
                    </div>

                    <h4 className="text-4xl md:text-5xl font-black text-white mb-6 font-chakra leading-[1.1] drop-shadow-xl uppercase tracking-tight group-hover:text-[#FFD36A] transition-colors duration-500">{data.featuredMission.title}</h4>
                    <p className="text-[#B3B3B3] text-base md:text-lg line-clamp-3 mb-10 flex-grow leading-relaxed font-medium max-w-xl">{data.featuredMission.description}</p>

                    <div className="flex items-center gap-4 mt-auto pt-8 border-t border-white/10">
                        <div className="flex items-center gap-2 bg-[#1A1A1A] px-5 py-2.5 rounded-xl border border-[#A855F7]/30 shadow-[0_0_15px_rgba(168,85,247,0.15)]">
                            <XPIcon className="w-5 h-5 text-[#A855F7]" />
                            <span className="font-black text-white text-sm tracking-wide">{formatNumber(data.featuredMission.xp)} XP</span>
                        </div>
                        <div className="flex items-center gap-2 bg-[#1A1A1A] px-5 py-2.5 rounded-xl border border-[#FFD36A]/30 shadow-[0_0_15px_rgba(255,211,106,0.15)]">
                            <CoinIcon className="w-5 h-5 text-[#FFD36A]" />
                            <span className="font-black text-white text-sm tracking-wide">{formatNumber(data.featuredMission.coins)} Coins</span>
                        </div>
                        <div className="ml-auto">
                             <button className="text-xs font-black text-black uppercase tracking-[0.2em] bg-gradient-to-r from-[#FFD36A] to-[#FFB72E] px-8 py-3.5 rounded-xl shadow-[0_0_25px_rgba(255,211,106,0.4)] hover:shadow-[0_0_40px_rgba(255,211,106,0.6)] transition-all hover:scale-105 active:scale-95 relative overflow-hidden group/btn">
                                <span className="relative z-10">Fazer Agora</span>
                                <div className="absolute inset-0 bg-white/40 translate-y-full group-hover/btn:translate-y-0 transition-transform duration-300 skew-y-12"></div>
                             </button>
                        </div>
                    </div>
                </div>
            </div>
            ) : (
                <div className="bg-[#111] p-8 rounded-[32px] border border-[#333] h-full flex flex-col items-center justify-center text-center shadow-inner min-h-[400px]">
                    <div className="p-6 bg-[#050505] rounded-full mb-6 border border-[#222]"><StarIcon className="w-12 h-12 text-gray-700" /></div>
                    <h3 className="text-2xl font-bold text-gray-500 font-chakra uppercase">Sem destaque hoje</h3>
                    <p className="text-gray-600 mt-2 text-sm tracking-wide">Fique de olho para novas missões!</p>
                </div>
            )}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mt-12">
            <div className="bg-[#050505]/90 border border-[#FFD36A]/20 rounded-[28px] p-8 shadow-[0_0_30px_rgba(255,211,106,0.08)]">
                <div className="flex items-center justify-between mb-6">
                    <div className="flex items-center gap-3">
                        <div className="p-3 rounded-2xl bg-[#FFD36A]/10 border border-[#FFD36A]/30"><HistoryIcon className="w-5 h-5 text-[#FFD36A]" /></div>
                        <div>
                            <p className="text-[10px] uppercase tracking-[0.2em] text-[#FFD36A] font-black">Histórico</p>
                            <h3 className="text-xl font-black text-white font-chakra uppercase tracking-tight">Transações</h3>
                        </div>
                    </div>
                    <span className="text-[10px] text-gray-500 font-bold uppercase tracking-[0.2em]">{safeLedger.length} registros</span>
                </div>
                <div className="space-y-3">
                    {isLedgerLoading ? (
                        <>
                            <LoadingSkeleton height={64} className="rounded-2xl" />
                            <LoadingSkeleton height={64} className="rounded-2xl" />
                            <LoadingSkeleton height={64} className="rounded-2xl" />
                        </>
                    ) : safeLedger.length > 0 ? (
                        safeLedger.slice(0, 5).map(entry => (
                            <div key={entry.id} className="p-4 rounded-2xl bg-[#0A0A0A] border border-white/5 flex items-center justify-between gap-4">
                                <div className="flex-1 min-w-0">
                                    <p className="text-white font-bold truncate">{entry.description}</p>
                                    <p className="text-[11px] text-gray-500 mt-1 uppercase tracking-wide">{entry.source || 'transação'}</p>
                                    <p className="text-xs text-gray-600 mt-1">{new Date(entry.timestamp).toLocaleString('pt-BR')}</p>
                                </div>
                                <div className="text-right">
                                    <p className={`text-lg font-black ${entry.transactionType === 'earn' ? 'text-green-400' : 'text-red-400'}`}>
                                        {entry.transactionType === 'earn' ? '+' : '-'}{formatNumber(Math.abs(entry.amount))} {entry.type === 'XP' ? 'XP' : 'LC'}
                                    </p>
                                    {(() => {
                                        const afterCoins = (entry.metadata as any)?.after?.coins;
                                        const afterXp = (entry.metadata as any)?.after?.xp;

                                        const hasAfter =
                                            typeof afterCoins === 'number' || typeof afterXp === 'number';

                                        const shown =
                                            entry.type === 'XP'
                                                ? (typeof afterXp === 'number' ? afterXp : entry.balanceAfter)
                                                : (typeof afterCoins === 'number' ? afterCoins : entry.balanceAfter);

                                        // Se não temos after e o backend não fornece balance_after, não mentir com 0
                                        const label = (!hasAfter && (entry.balanceAfter ?? 0) === 0)
                                            ? '—'
                                            : formatNumber(shown || 0);

                                        const unit = entry.type === 'XP' ? 'XP' : 'LC';

                                        return (
                                            <p className="text-[10px] text-gray-500 uppercase tracking-widest">
                                                Saldo: {label} {label === '—' ? '' : unit}
                                            </p>
                                        );
                                    })()}
                                </div>
                            </div>
                        ))
                    ) : (
                        <div className="p-6 text-center text-gray-500 bg-[#0A0A0A] rounded-2xl border border-white/5">
                            Nenhuma transação recente.
                        </div>
                    )}
                </div>
            </div>

            <div className="bg-[#050505]/90 border border-[#3C3C3C] rounded-[28px] p-8 shadow-[0_0_30px_rgba(60,60,60,0.15)]">
                <div className="flex items-center justify-between mb-6">
                    <div className="flex items-center gap-3">
                        <div className="p-3 rounded-2xl bg-[#111] border border-[#333]"><BellIcon className="w-5 h-5 text-white" /></div>
                        <div>
                            <p className="text-[10px] uppercase tracking-[0.2em] text-gray-400 font-black">Feed</p>
                            <h3 className="text-xl font-black text-white font-chakra uppercase tracking-tight">Notificações</h3>
                        </div>
                    </div>
                    <span className="text-[10px] text-gray-500 font-bold uppercase tracking-[0.2em]">{notificationsFeed.length} itens</span>
                </div>
                <div className="space-y-3">
                    {isNotificationsLoading ? (
                        <>
                            <LoadingSkeleton height={60} className="rounded-2xl" />
                            <LoadingSkeleton height={60} className="rounded-2xl" />
                            <LoadingSkeleton height={60} className="rounded-2xl" />
                        </>
                    ) : notificationsFeed.length > 0 ? (
                        notificationsFeed.slice(0, 6).map(notification => (
                            <div
                                key={notification.id}
                                onClick={async () => {
                                    if (notification.read) return;
                                    // optimistic UI
                                    setNotificationsFeed(prev => prev.map(n => n.id === notification.id ? { ...n, read: true } : n));
                                    dispatch({ type: 'MARK_NOTIFICATION_READ', payload: { id: notification.id } });
                                    const res = await markNotificationRead(notification.id);
                                    if (!res.success) {
                                        // rollback se falhar
                                        setNotificationsFeed(prev => prev.map(n => n.id === notification.id ? { ...n, read: false } : n));
                                    }
                                }}
                                className={`p-4 rounded-2xl border flex items-start gap-3 cursor-pointer ${notification.read ? 'bg-[#0A0A0A] border-[#1F1F1F]' : 'bg-[#0F0F0F] border-[#FFD36A]/20'}`}
                            >
                                <div className={`w-2 h-2 mt-1 rounded-full ${notification.read ? 'bg-gray-600' : 'bg-[#FFD36A]'}`}></div>
                                <div className="flex-1 min-w-0">
                                    <p className="text-white font-bold truncate">{notification.title}</p>
                                    <p className="text-sm text-gray-400 mt-1 line-clamp-2">{notification.description}</p>
                                    <p className="text-[11px] text-gray-500 mt-1">{notification.timestamp}</p>
                                </div>
                            </div>
                        ))
                    ) : (
                        <div className="p-6 text-center text-gray-500 bg-[#0A0A0A] rounded-2xl border border-white/5">
                            Nenhuma notificação por aqui.
                        </div>
                    )}
                </div>
            </div>
        </div>

        <ArtistsOfTheDayCarousel
          initialArtists={data.artistsOfTheDay}
          isSupabase={isSupabase}
          clicked={data.artistOfDayClicked}
          dayUtc={data.artistOfDayDayUtc}
          onSupabaseSync={(next) => {
            setData((prev: any) => prev ? {
              ...prev,
              artistsOfTheDay: next.artist ? [next.artist] : [],
              artistsOfTheDayIds: next.artist ? [next.artist.id] : [],
              artistOfDayClicked: next.clicked || {},
              artistOfDayDayUtc: next.dayUtc || null,
            } : prev);
          }}
        />
        
      </div>
    </div>
  );
};

export default Dashboard;
