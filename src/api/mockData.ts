
// api/mockData.ts
// This file simulates a database. In a real app, you'd be calling a backend service.
import type {
  User, Mission, StoreItem, UsableItem, CoinPack, SubscriptionPlan, Event,
  MissionSubmission, CoinTransaction, RedeemedItem, Participation, Notification,
  MissionCompletionLog, UsableItemQueueEntry, ProcessedUsableItemQueueEntry, FeaturedWinner,
  Advertisement, SubscriptionRequest, EventMission, EventMissionSubmission, EventScoreLog,
  ArtistOfTheDayQueueEntry, ProcessedArtistOfTheDayQueueEntry, CoinPurchaseRequest, ManualEventPointsLog,
  SubscriptionEvent,
  Raffle, RaffleTicket,
  AdminNotification,
  Punishment,
  Achievement,
  JackpotTicket,
  JackpotRound,
  ManualAward,
} from '../types';
import { 
    StarIcon, CoinIcon
} from '../constants';
import { BASE_MISSION_REWARDS } from './economy/economy-constants'; 


const liviaLastCheckIn = new Date();
liviaLastCheckIn.setDate(liviaLastCheckIn.getDate() - 1);

export var allUsersData: User[] = [
    {
        id: 'user-0', name: "Livia Almeida", artisticName: "DJ Livia",
        avatarUrl: "https://i.pravatar.cc/150?u=a042581f4e29026704d", level: 4, xp: 8240, xpToNextLevel: 4000,
        coins: 1350, monthlyMissionsCompleted: 28, totalMissionsCompleted: 112,
        plan: 'Artista em Ascensão', weeklyProgress: 3,
        completedMissions: ['m1'], pendingMissions: [],
        completedEventMissions: ['em1'], pendingEventMissions: ['em2'], joinedEvents: ['e1'],
        email: 'djlivia@example.com', password: '123', phone: '+55 (11) 98765-4321', role: 'user',
        spotifyUrl: 'https://spotify.com/artist/djlivia', youtubeUrl: 'https://youtube.com/djlivia',
        instagramUrl: 'https://instagram.com/djlivia', tiktokUrl: 'https://tiktok.com/@djlivia',
        lastCheckIn: liviaLastCheckIn.toISOString(), weeklyCheckInStreak: 3,
        subscriptionHistory: [
            { id: 'sl3', userId: 'user-0', userName: 'Livia Almeida', oldPlan: 'Free Flow', newPlan: 'Artista em Ascensão', changedAt: new Date(Date.now() - 86400000 * 10).toISOString(), eventType: 'UPGRADE', userLevelAtEvent: 3 },
        ],
        lastArtistLinkClickClaims: [], hasReceivedWelcomeBonus: true, seenArtistOfTheDayAnnouncements: [],
        unseenPlanUpgrade: false,
        joined: '22/05/2024',
        joinedISO: new Date('2024-05-22T10:00:00Z').toISOString(),
        unseenRaffleWin: undefined,
        seenAdminNotifications: [],
        isBanned: false,
        punishmentHistory: [],
        unlockedAchievements: ['ach1', 'ach4'],
    },
    {
        id: 'user-1', name: "DJ Chrono Silva", artisticName: "DJ Chrono",
        avatarUrl: "https://i.pravatar.cc/150?u=chrono", level: 18, xp: 150000, xpToNextLevel: 18000,
        coins: 4200, monthlyMissionsCompleted: 42, totalMissionsCompleted: 250,
        plan: 'Hitmaker', weeklyProgress: 5,
        completedMissions: [], pendingMissions: ['m2'],
        completedEventMissions: [], pendingEventMissions: [], joinedEvents: ['e1'],
        email: 'chrono@example.com', password: '123', phone: '+55 (11) 91111-2222', role: 'user',
        spotifyUrl: 'https://spotify.com/artist/chrono', youtubeUrl: 'https://youtube.com/chrono',
        instagramUrl: 'https://instagram.com/djchrono',
        lastCheckIn: new Date().toISOString(), weeklyCheckInStreak: 5,
        subscriptionHistory: [
             { id: 'sl1', userId: 'user-1', userName: 'DJ Chrono Silva', oldPlan: 'Artista Profissional', newPlan: 'Hitmaker', changedAt: new Date(Date.now() - 86400000 * 2).toISOString(), eventType: 'UPGRADE', userLevelAtEvent: 17 }
        ],
        lastArtistLinkClickClaims: [], hasReceivedWelcomeBonus: true, seenArtistOfTheDayAnnouncements: [],
        unseenPlanUpgrade: false,
        joined: '01/03/2024',
        joinedISO: new Date('2024-03-01T10:00:00Z').toISOString(),
        unseenRaffleWin: undefined,
        seenAdminNotifications: [],
        isBanned: false,
        punishmentHistory: [],
        unlockedAchievements: ['ach1', 'ach2', 'ach4', 'ach5'],
    },
    {
        id: 'user-2', name: "Leo Santos", artisticName: "Synthwave Sorcerer",
        avatarUrl: "https://i.pravatar.cc/150?u=leo", level: 12, xp: 68000, xpToNextLevel: 12000,
        coins: 2500, monthlyMissionsCompleted: 35, totalMissionsCompleted: 180,
        plan: 'Artista Profissional', weeklyProgress: 4,
        completedMissions: [], pendingMissions: [],
        completedEventMissions: [], pendingEventMissions: [], joinedEvents: [],
        email: 'leo@example.com', password: '123', phone: '+55 (21) 98888-7777', role: 'user',
        spotifyUrl: 'https://spotify.com/artist/leo', youtubeUrl: 'https://youtube.com/leo',
        instagramUrl: 'https://instagram.com/leosynth',
        lastCheckIn: new Date(Date.now() - 86400000 * 2).toISOString(), weeklyCheckInStreak: 1,
        subscriptionHistory: [], lastArtistLinkClickClaims: [], hasReceivedWelcomeBonus: true, seenArtistOfTheDayAnnouncements: [], unseenPlanUpgrade: false,
        joined: '15/04/2024', joinedISO: new Date('2024-04-15T12:00:00Z').toISOString(), unseenRaffleWin: undefined,
        seenAdminNotifications: [],
        isBanned: false,
        punishmentHistory: [],
        unlockedAchievements: [],
    },
    {
        id: 'user-3', name: "Beatriz Lima", artisticName: "Bia Bass",
        avatarUrl: "https://i.pravatar.cc/150?u=bia", level: 8, xp: 30000, xpToNextLevel: 8000,
        coins: 980, monthlyMissionsCompleted: 22, totalMissionsCompleted: 95,
        plan: 'Artista em Ascensão', weeklyProgress: 1,
        completedMissions: [], pendingMissions: [],
        completedEventMissions: [], pendingEventMissions: [], joinedEvents: [],
        email: 'bia@example.com', password: '123', phone: '+55 (31) 97777-6666', role: 'user',
        spotifyUrl: 'https://spotify.com/artist/bia', youtubeUrl: '',
        instagramUrl: 'https://instagram.com/biabass',
        lastCheckIn: new Date(Date.now() - 86400000 * 1).toISOString(), weeklyCheckInStreak: 6,
        subscriptionHistory: [], lastArtistLinkClickClaims: [], hasReceivedWelcomeBonus: true, seenArtistOfTheDayAnnouncements: [], unseenPlanUpgrade: false,
        joined: '10/06/2024', joinedISO: new Date('2024-06-10T18:00:00Z').toISOString(), unseenRaffleWin: undefined,
        seenAdminNotifications: [],
        isBanned: false,
        punishmentHistory: [],
        unlockedAchievements: [],
    },
    {
        id: 'user-4', name: "Carlos Mendes", artisticName: "Vibe",
        avatarUrl: "https://i.pravatar.cc/150?u=carlos", level: 5, xp: 12000, xpToNextLevel: 5000,
        coins: 450, monthlyMissionsCompleted: 15, totalMissionsCompleted: 50,
        plan: 'Free Flow', weeklyProgress: 2,
        completedMissions: [], pendingMissions: [],
        completedEventMissions: [], pendingEventMissions: [], joinedEvents: [],
        email: 'carlos@example.com', password: '123', phone: '+55 (41) 96666-5555', role: 'user',
        spotifyUrl: '', youtubeUrl: 'https://youtube.com/carlos',
        instagramUrl: 'https://instagram.com/vibe.carlos',
        lastCheckIn: new Date(Date.now() - 86400000 * 4).toISOString(), weeklyCheckInStreak: 0,
        subscriptionHistory: [], lastArtistLinkClickClaims: [], hasReceivedWelcomeBonus: true, seenArtistOfTheDayAnnouncements: [], unseenPlanUpgrade: false,
        joined: '01/07/2024', joinedISO: new Date('2024-07-01T09:00:00Z').toISOString(), unseenRaffleWin: undefined,
        seenAdminNotifications: [],
        isBanned: false,
        punishmentHistory: [],
        unlockedAchievements: [],
    },
    {
        id: 'user-5', name: "Daniela Rocha", artisticName: "Dani Drops",
        avatarUrl: "https://i.pravatar.cc/150?u=dani", level: 2, xp: 1500, xpToNextLevel: 2000,
        coins: 120, monthlyMissionsCompleted: 8, totalMissionsCompleted: 20,
        plan: 'Free Flow', weeklyProgress: 0,
        completedMissions: [], pendingMissions: [],
        completedEventMissions: [], pendingEventMissions: [], joinedEvents: [],
        email: 'dani@example.com', password: '123', phone: '+55 (51) 95555-4444', role: 'user',
        spotifyUrl: 'https://spotify.com/artist/dani', youtubeUrl: 'https://youtube.com/dani',
        instagramUrl: 'https://instagram.com/danidrops',
        lastCheckIn: new Date(Date.now() - 86400000 * 8).toISOString(), weeklyCheckInStreak: 0,
        subscriptionHistory: [], lastArtistLinkClickClaims: [], hasReceivedWelcomeBonus: true, seenArtistOfTheDayAnnouncements: [], unseenPlanUpgrade: false,
        joined: '20/07/2024', joinedISO: new Date('2024-07-20T14:00:00Z').toISOString(), unseenRaffleWin: undefined,
        seenAdminNotifications: [],
        isBanned: false,
        punishmentHistory: [],
        unlockedAchievements: [],
    },
    {
        id: 'user-6', name: "Rafaela Costa", artisticName: "MC Rima",
        avatarUrl: "https://i.pravatar.cc/150?u=rafa", level: 10, xp: 48000, xpToNextLevel: 10000,
        coins: 1800, monthlyMissionsCompleted: 38, totalMissionsCompleted: 150,
        plan: 'Artista Profissional', weeklyProgress: 6,
        completedMissions: [], pendingMissions: [],
        completedEventMissions: [], pendingEventMissions: [], joinedEvents: ['e1'],
        email: 'rafa@example.com', password: '123', phone: '+55 (61) 94444-3333', role: 'user',
        spotifyUrl: 'https://spotify.com/artist/rafa', youtubeUrl: 'https://youtube.com/rafa',
        instagramUrl: 'https://instagram.com/mc_rima',
        lastCheckIn: new Date().toISOString(), weeklyCheckInStreak: 2,
        subscriptionHistory: [], lastArtistLinkClickClaims: [], hasReceivedWelcomeBonus: true, seenArtistOfTheDayAnnouncements: [], unseenPlanUpgrade: false,
        joined: '05/02/2024', joinedISO: new Date('2024-02-05T20:00:00Z').toISOString(), unseenRaffleWin: undefined,
        seenAdminNotifications: [],
        isBanned: false,
        punishmentHistory: [],
        unlockedAchievements: [],
    },
    {
        id: 'admin-user', name: 'Admin', artisticName: 'Artist World Admin',
        avatarUrl: 'https://i.pravatar.cc/150?u=admin', level: 99, xp: 999999, xpToNextLevel: 100000,
        coins: 99999, monthlyMissionsCompleted: 0, totalMissionsCompleted: 0,
        plan: 'Hitmaker', weeklyProgress: 0,
        completedMissions: [], pendingMissions: [],
        completedEventMissions: [], pendingEventMissions: [], joinedEvents: [],
        email: 'admin@gmail.com', password: '1234', phone: '+00 (00) 00000-0000', role: 'admin',
        spotifyUrl: '', youtubeUrl: '', instagramUrl: 'https://instagram.com/admin', tiktokUrl: '',
        joined: new Date().toLocaleDateString('pt-BR'),
        joinedISO: new Date().toISOString(),
        weeklyCheckInStreak: 0,
        subscriptionHistory: [],
        lastArtistLinkClickClaims: [], hasReceivedWelcomeBonus: true, seenArtistOfTheDayAnnouncements: [],
        unseenPlanUpgrade: false,
        unseenRaffleWin: undefined,
        seenAdminNotifications: [],
        isBanned: false, 
        banReason: null,
        punishmentHistory: [],
        unlockedAchievements: [],
        // @ts-ignore
        freezeEconomy: false 
    }
];

const now = Date.now();
const deadline24h = new Date(now + 24 * 60 * 60 * 1000).toISOString();
const deadline48h = new Date(now + 48 * 60 * 60 * 1000).toISOString();
const deadline72h = new Date(now + 72 * 60 * 60 * 1000).toISOString();


export var missionsData: Mission[] = [
  { id: 'm1', title: 'Curta a publicação oficial (Curta)', description: 'Curta o último post no Instagram da @lummi.art.', xp: BASE_MISSION_REWARDS.curta.xp, coins: BASE_MISSION_REWARDS.curta.coins, type: 'instagram', actionUrl: 'https://instagram.com/lummi.art', createdAt: new Date('2024-08-01T10:00:00Z').toISOString(), deadline: deadline24h, status: 'active' },
  { id: 'm2', title: 'Comente no post da semana (Média)', description: 'Deixe um comentário relevante no post em destaque.', xp: BASE_MISSION_REWARDS.media.xp, coins: BASE_MISSION_REWARDS.media.coins, type: 'instagram', actionUrl: 'https://instagram.com/lummi.art', createdAt: new Date('2024-08-02T10:00:00Z').toISOString(), deadline: deadline48h, status: 'active' },
  { id: 'm3', title: 'Crie um story criativo (Longa)', description: 'Crie e poste um story criativo usando a música tema da semana.', xp: BASE_MISSION_REWARDS.longa.xp, coins: BASE_MISSION_REWARDS.longa.coins, type: 'creative', actionUrl: 'https://instagram.com/lummi.art', createdAt: new Date().toISOString(), deadline: deadline72h, status: 'active' },
];

export var storeItemsData: StoreItem[] = [
  // --- SÉRIE ENTRADA ---
  { id: 's-cover', name: 'Motion Cover (Capa Animada)', description: 'Dê vida à arte do seu single. Animamos sua capa estática com efeitos visuais e partículas (Loop).', price: 800, rarity: 'Regular', imageUrl: 'https://picsum.photos/seed/motion-cover/400/300', exchanges: 0, isOutOfStock: false },
  { id: 's-teaser', name: 'Launch Teaser (15s)', description: 'O hype começa aqui. Vídeo curto focado na data de lançamento e no melhor trecho do beat.', price: 1200, rarity: 'Regular', imageUrl: 'https://picsum.photos/seed/teaser/400/300', exchanges: 0, isOutOfStock: false },

  // --- SÉRIE SCENES (Antigo Vibe - Sem Avatar) ---
  { id: 's-scenes-15', name: 'Visualizer: Scenes (15s)', description: 'Loop de ambiente imersivo (3D/2D) sincronizado com sua música. Foco na atmosfera.', price: 1200, rarity: 'Raro', imageUrl: 'https://picsum.photos/seed/vibe15/400/300', exchanges: 0, isOutOfStock: false },
  { id: 's-scenes-30', name: 'Visualizer: Scenes (30s)', description: 'Versão estendida do ambiente imersivo. Ideal para refrões ou versos completos.', price: 2200, rarity: 'Raro', imageUrl: 'https://picsum.photos/seed/vibe30/400/300', exchanges: 0, isOutOfStock: false },
  { id: 's-scenes-60', name: 'Visualizer: Scenes (1 Minuto)', description: 'Uma jornada visual mais longa através dos cenários do seu universo musical.', price: 4000, rarity: 'Épico', imageUrl: 'https://picsum.photos/seed/vibe60/400/300', exchanges: 0, isOutOfStock: false },

  // --- SÉRIE ARTIST (Antigo Icon - Com Avatar 3D) ---
  { id: 's-artist-15', name: 'Visualizer: Artist (15s)', description: 'Seu Avatar 3D em destaque no centro da ação. Performance e presença visual.', price: 2500, rarity: 'Épico', imageUrl: 'https://picsum.photos/seed/icon15/400/300', exchanges: 0, isOutOfStock: false },
  { id: 's-artist-30', name: 'Visualizer: Artist (30s)', description: 'Avatar 3D com animações mais elaboradas e interações com o cenário.', price: 4500, rarity: 'Lendário', imageUrl: 'https://picsum.photos/seed/icon30/400/300', exchanges: 0, isOutOfStock: false },
  { id: 's-artist-60', name: 'Visualizer: Artist (1 Minuto)', description: 'Produção de alto nível com seu Avatar. Cortes de câmera e direção de arte refinada.', price: 8000, rarity: 'Lendário', imageUrl: 'https://picsum.photos/seed/icon60/400/300', exchanges: 0, isOutOfStock: false },

  // --- GOD TIER ---
  { id: 's-fullclip', name: 'Videoclipe Completo (Masterpiece)', description: 'A obra suprema. Direção criativa total, roteiro, Avatar 3D ou AI Generativa.', price: 20000, rarity: 'Lendário', imageUrl: 'https://picsum.photos/seed/fullclip/400/300', exchanges: 0, isOutOfStock: true },
];

export var usableItemsData: UsableItem[] = [
    // New Official Items
    { id: 'ui2', name: 'Feedback Profissional (Instagram)', description: 'Receba uma análise profissional do seu post no Instagram.', price: 600, imageUrl: 'https://picsum.photos/seed/ui-feedback-ig/200', isOutOfStock: false, platform: 'instagram' },
    { id: 'ui3', name: 'Feedback Profissional (YouTube Shorts)', description: 'Receba uma análise profissional do seu YouTube Short.', price: 600, imageUrl: 'https://picsum.photos/seed/ui-feedback-yt/200', isOutOfStock: false, platform: 'youtube' },
    { id: 'ui4', name: 'Booster Comentários IG', description: 'Receba uma onda de comentários engajados no seu post do Instagram.', price: 700, imageUrl: 'https://picsum.photos/seed/ui-booster-ig/200', isOutOfStock: false, platform: 'instagram' },
    { id: 'ui5', name: 'Booster Comentários TikTok', description: 'Impulsione os comentários em seu vídeo do TikTok.', price: 750, imageUrl: 'https://picsum.photos/seed/ui-booster-tt/200', isOutOfStock: false, platform: 'tiktok' },

    // Kept Legacy Items
    { id: 'ui1', name: 'Microfone', description: 'Seu post é divulgado como ação oficial, recebendo curtidas da comunidade.', price: 400, imageUrl: 'https://picsum.photos/seed/mic-item/200', isOutOfStock: false, platform: 'all' },
    // REMOVED 'ui-spotlight' per request
];

// THIS IS THE ONLY SOURCE OF TRUTH FOR PACKS
// Ensure no packs exist in storeItemsData or usableItemsData above
export var coinPacksData: CoinPack[] = [
  { id: 'cp1', name: 'Starter Pack', coins: 100, price: 49, paymentLink: '#', isOutOfStock: false, imageUrl: 'https://picsum.photos/seed/cp1/400/300' },
  { id: 'cp2', name: 'Artist Pack', coins: 500, price: 249, paymentLink: '#', isOutOfStock: false, imageUrl: 'https://picsum.photos/seed/cp2/400/300' },
];

export var coinPurchaseRequestsData: CoinPurchaseRequest[] = [];

// ... (Rest of the file remains unchanged)
export var subscriptionPlansData: SubscriptionPlan[] = [
  // ... unchanged content
    { name: 'Free Flow', price: 'Gratuito', dailyMissions: 'Para começar sua jornada', icon: null as any, features: [] },
    { name: 'Artista em Ascensão', price: 'R$49/mês', dailyMissions: 'Ideal para artistas em ascensão', icon: null as any, features: [], paymentLink: '#' },
    { name: 'Artista Profissional', price: 'R$89/mês', dailyMissions: 'Para artistas que buscam o topo', icon: null as any, features: [], highlight: true, paymentLink: '#' },
    { name: 'Hitmaker', price: 'R$149/mês', dailyMissions: 'A experiência definitiva', icon: null as any, features: [], paymentLink: '#' },
];

export var eventsData: Event[] = [
    { 
        id: 'e1', 
        title: 'Batalha de Remixes', 
        description: 'O vencedor será destaque em nossas playlists!', 
        date: '2025-12-31T23:59:59Z', 
        prize: 'Destaque Oficial + 1.000 Coins',
        vipPrize: 'Item Lendário da Loja + Mentoria', 
        prizePool: 5000,
        prizeIcon: StarIcon, 
        imageUrl: 'https://picsum.photos/seed/e1/600/400', 
        status: 'current', 
        entryCost: 50,
        goldenPassCost: 200,
        maxCapacity: 1000,
    },
    { 
        id: 'e2', 
        title: 'Collab da Comunidade', 
        description: 'Participe da criação de uma track colaborativa.', 
        date: '2025-06-30T12:00:00Z', 
        prize: 'Lançamento pela Lummi Records', 
        vipPrize: 'Participação nos Royalties',
        prizePool: 10000,
        prizeIcon: StarIcon, 
        imageUrl: 'https://picsum.photos/seed/e2/400/300', 
        status: 'future', 
        entryCost: 50,
        goldenPassCost: 200,
        maxCapacity: 500
    },
];

export var eventMissionsData: EventMission[] = [
  { id: 'em1', eventId: 'e1', title: 'Crie um Remix de 1 Minuto', description: 'Use o sample pack oficial do evento para criar seu remix.', points: 500, xp: 150, actionUrl: 'https://we.tl/t-samplepack', tier: 'normal' },
  { id: 'em2', eventId: 'e1', title: 'Divulgue seu Remix', description: 'Poste um trecho de 15s do seu remix no Instagram Reels ou TikTok.', points: 250, xp: 75, tier: 'normal' },
  { id: 'em3-vip', eventId: 'e1', title: 'Feedback VIP', description: 'Missão Exclusiva: Envie seu remix para feedback antecipado.', points: 1000, xp: 300, tier: 'vip' },
];

export var eventMissionSubmissionsData: EventMissionSubmission[] = [
    { id: 'ems1', userId: 'user-0', eventMissionId: 'em1', eventId: 'e1', userName: 'DJ Livia', userAvatar: 'https://i.pravatar.cc/150?u=a042581f4e29026704d', missionTitle: 'Crie um Remix de 1 Minuto', submittedAtISO: new Date(Date.now() - 86400000 * 2).toISOString(), proofUrl: 'https://example.com/proof.mp3', status: 'approved'},
    { id: 'ems2', userId: 'user-0', eventMissionId: 'em2', eventId: 'e1', userName: 'DJ Livia', userAvatar: 'https://i.pravatar.cc/150?u=a042581f4e29026704d', missionTitle: 'Divulgue seu Remix', submittedAtISO: new Date(Date.now() - 3600000).toISOString(), proofUrl: 'https://instagram.com/p/C-aaaa-aaaa', status: 'pending'},
];
export var featuredWinnersData: FeaturedWinner[] = [
    { id: 'fw1', userId: 'user-1', prizeTitle: 'Vencedor do Desafio "Som do Cotidiano"', date: '2024-07-28' },
];

export var missionSubmissionsData: MissionSubmission[] = [
  { id: 'ms2', userId: 'user-1', missionId: 'm2', userName: 'DJ Chrono', userAvatar: 'https://i.pravatar.cc/150?u=chrono', missionTitle: 'Comente no post da semana', submittedAt: '3h atrás', submittedAtISO: new Date(Date.now() - 10800000).toISOString(), proofUrl: 'https://picsum.photos/seed/proof2/400/600', status: 'pending' },
  { id: 'ms3', userId: 'user-0', missionId: 'm1', userName: 'DJ Livia', userAvatar: 'https://i.pravatar.cc/150?u=a042581f4e29026704d', missionTitle: 'Curta a publicação oficial', submittedAt: '1 dia atrás', submittedAtISO: new Date(Date.now() - 86400000).toISOString(), proofUrl: 'https://picsum.photos/seed/proof3/400/600', status: 'approved' },
];

export var missionCompletionLogData: MissionCompletionLog[] = [
    { id: 'mcl1', userId: 'user-0', missionId: 'm1', completedAt: new Date(Date.now() - 86400000).toISOString(), xpGained: 25, coinsGained: 15 },
];

export var redeemedItemsData: RedeemedItem[] = [
    { id: 'ri3', userId: 'user-0', userName: 'DJ Livia', itemId: 's-artist-15', itemName: 'Visualizer: Artist (15s)', itemPrice: 1350, redeemedAt: '2 dias atrás', redeemedAtISO: new Date(Date.now() - 86400000 * 2).toISOString(), coinsBefore: 2850, coinsAfter: 1500, status: 'Redeemed' },
];

export var participationsData: Participation[] = [
    { id: 'p1', userId: 'user-0', eventId: 'e1', joinedAt: new Date(Date.now() - 86400000 * 3).toISOString(), isGolden: false },
    { id: 'p2', userId: 'user-1', eventId: 'e1', joinedAt: new Date(Date.now() - 86400000 * 4).toISOString(), isGolden: true },
    { id: 'p3', userId: 'user-6', eventId: 'e1', joinedAt: new Date(Date.now() - 86400000 * 1).toISOString(), isGolden: false },
];

export var eventScoreLogData: EventScoreLog[] = [
    { id: 'esl1', userId: 'user-0', eventId: 'e1', eventMissionId: 'em1', pointsGained: 500, timestamp: new Date(Date.now() - 86400000 * 2).toISOString() },
    { id: 'esl2', userId: 'user-1', eventId: 'e1', eventMissionId: 'em1', pointsGained: 500, timestamp: new Date(Date.now() - 86400000 * 3).toISOString() },
    { id: 'esl3', userId: 'user-1', eventId: 'e1', eventMissionId: 'em2', pointsGained: 250, timestamp: new Date(Date.now() - 86400000 * 1).toISOString() },
    { id: 'esl4', userId: 'user-6', eventId: 'e1', eventMissionId: 'em1', pointsGained: 450, timestamp: new Date(Date.now() - 3600000 * 5).toISOString() },
];

export var manualEventPointsLogData: ManualEventPointsLog[] = [];

export var coinTransactionsLogData: CoinTransaction[] = [
    { id: 'ct1', userId: 'user-0', date: '1 dia atrás', dateISO: new Date(Date.now() - 86400000).toISOString(), description: 'Missão: Curta a publicação oficial', amount: 15, type: 'earn', source: 'mission_completion' },
    { id: 'ct2', userId: 'user-0', date: '2 dias atrás', dateISO: new Date(Date.now() - 86400000*2).toISOString(), description: 'Resgate: Avatar 3D + Loop (15s)', amount: -1350, type: 'spend', source: 'store_redemption' },
    { id: 'ct3', userId: 'user-0', date: '3 dias atrás', dateISO: new Date(Date.now() - 86400000 * 3).toISOString(), description: 'Inscrição: Batalha de Remixes', amount: -50, type: 'spend', source: 'event_entry' },
];

export var notificationsData: Notification[] = [
    { id: 'n1', userId: 'user-0', title: 'Missão Aprovada!', description: 'Você ganhou 25 XP e 15 moedas por completar "Curta a publicação oficial".', timestamp: '1 dia atrás', read: true },
];

export var adminNotificationsData: AdminNotification[] = [];

export var achievementsData: Achievement[] = [
    { id: 'ach1', title: 'Primeiros Passos', description: 'Complete sua primeira missão.', iconUrl: 'https://picsum.photos/seed/ach1/100', rarity: 'Comum', rewardCoins: 10, rewardXP: 50, trigger: 'mission_complete', conditionValue: 1 },
    { id: 'ach2', title: 'Artista Ativo', description: 'Complete 10 missões.', iconUrl: 'https://picsum.photos/seed/ach2/100', rarity: 'Incomum', rewardCoins: 25, rewardXP: 100, trigger: 'mission_complete', conditionValue: 10 },
    { id: 'ach6', title: 'Máquina de Missões', description: 'Complete 50 missões.', iconUrl: 'https://picsum.photos/seed/ach6/100', rarity: 'Raro', rewardCoins: 75, rewardXP: 250, trigger: 'mission_complete', conditionValue: 50 },
    { id: 'ach7', title: 'Lenda das Missões', description: 'Complete 100 missões.', iconUrl: 'https://picsum.photos/seed/ach7/100', rarity: 'Épico', rewardCoins: 150, rewardXP: 500, trigger: 'mission_complete', conditionValue: 100 },
    { id: 'ach8', title: 'Subindo de Nível', description: 'Alcance o nível 5.', iconUrl: 'https://picsum.photos/seed/ach8/100', rarity: 'Comum', rewardCoins: 15, rewardXP: 0, trigger: 'level_up', conditionValue: 5 },
    { id: 'ach9', title: 'Força Crescente', description: 'Alcance o nível 10.', iconUrl: 'https://picsum.photos/seed/ach9/100', rarity: 'Incomum', rewardCoins: 30, rewardXP: 0, trigger: 'level_up', conditionValue: 10 },
    { id: 'ach10', title: 'Profissional', description: 'Alcance o nível 25.', iconUrl: 'https://picsum.photos/seed/ach10/100', rarity: 'Raro', rewardCoins: 100, rewardXP: 0, trigger: 'level_up', conditionValue: 25 },
    { id: 'ach4', title: 'Colecionador', description: 'Resgate seu primeiro item na loja.', iconUrl: 'https://picsum.photos/seed/ach4/100', rarity: 'Incomum', rewardCoins: 20, rewardXP: 50, trigger: 'store_redeem', conditionValue: 1 },
    { id: 'ach11', title: 'Gosto Refinado', description: 'Resgate um item Lendário na loja.', iconUrl: 'https://picsum.photos/seed/ach11/100', rarity: 'Épico', rewardCoins: 125, rewardXP: 250, trigger: 'store_redeem', conditionValue: 0 }, 
    { id: 'ach3', title: 'Semana Produtiva', description: 'Faça check-in por 7 dias seguidos.', iconUrl: 'https://picsum.photos/seed/ach3/100', rarity: 'Raro', rewardCoins: 50, rewardXP: 100, trigger: 'check_in_streak', conditionValue: 7 },
    { id: 'ach12', title: 'No Topo', description: 'Termine o mês no Top 10 do Ranking.', iconUrl: 'https://picsum.photos/seed/ach12/100', rarity: 'Raro', rewardCoins: 75, rewardXP: 300, trigger: 'ranking', conditionValue: 10 },
    { id: 'ach13', title: 'O Número Um', description: 'Termine o mês em 1º lugar no Ranking.', iconUrl: 'https://picsum.photos/seed/ach13/100', rarity: 'Lendário', rewardCoins: 250, rewardXP: 1000, trigger: 'ranking', conditionValue: 1 },
];

export var usableItemQueueData: UsableItemQueueEntry[] = [];
export var processedItemQueueHistoryData: ProcessedUsableItemQueueEntry[] = [];

// Legacy / Empty queues for compatibility
export var artistOfTheDayQueueData: ArtistOfTheDayQueueEntry[] = [];
// Keep history, but we stopped adding to it in V13.7
export var processedArtistOfTheDayQueueHistoryData: ProcessedArtistOfTheDayQueueEntry[] = [
    { id: 'padq-1', userId: 'user-1', userName: 'DJ Chrono', userAvatar: 'https://i.pravatar.cc/150?u=chrono', redeemedItemId: 'ri-spotlight-1', itemName: 'Destaque: Artista do Dia', queuedAt: new Date(Date.now() - 86400000 * 3).toISOString(), processedAt: new Date(Date.now() - 86400000 * 2).toISOString() },
];

export var advertisementsData: Advertisement[] = [
  { id: 'ad1', title: 'Novo Pacote de Samples!', description: 'Baixe agora nosso novo pacote de samples de Tech House.', imageUrl: 'https://picsum.photos/seed/ad1/800/400', linkUrl: '#', isActive: true, duration: 7 },
  { id: 'ad2', title: 'Masterclass com DJ Chrono', description: 'Aprenda as técnicas do mestre. Vagas limitadas.', imageUrl: 'https://picsum.photos/seed/ad2/800/400', linkUrl: '#', isActive: true, duration: 5 },
];

export var subscriptionRequestsData: SubscriptionRequest[] = [];

// Saneamento: r1 e r2 atualizados para IDs válidos (s-scenes-15 e s-artist-15)
export var rafflesData: Raffle[] = [
    { id: 'r1', itemId: 's-scenes-15', itemName: 'Visualizer Scenes (15s)', itemImageUrl: 'https://picsum.photos/seed/vibe15/400/300', ticketPrice: 10, ticketLimitPerUser: 10, endsAt: new Date(Date.now() + 86400000 * 3).toISOString(), status: 'active', prizeType: 'item' },
    { id: 'r2', itemId: 's-artist-15', itemName: 'Visualizer Artist (15s)', itemImageUrl: 'https://picsum.photos/seed/icon15/400/300', ticketPrice: 25, ticketLimitPerUser: 5, endsAt: new Date(Date.now() - 86400000 * 2).toISOString(), status: 'finished', winnerId: 'user-1', winnerName: 'DJ Chrono Silva', winnerAvatar: 'https://i.pravatar.cc/150?u=chrono', prizeType: 'item' },
    { id: 'r3', itemId: 's-fullclip', itemName: 'Videoclipe Completo', itemImageUrl: 'https://picsum.photos/seed/fullclip/400/300', ticketPrice: 50, ticketLimitPerUser: 3, startsAt: new Date(Date.now() + 86400000 * 2).toISOString(), endsAt: new Date(Date.now() + 86400000 * 5).toISOString(), status: 'scheduled', prizeType: 'item' }
];
export var raffleTicketsData: RaffleTicket[] = [
    { id: 'rt1', raffleId: 'r1', userId: 'user-0', purchasedAt: new Date().toISOString() },
    { id: 'rt2', raffleId: 'r1', userId: 'user-0', purchasedAt: new Date().toISOString() },
    { id: 'rt3', raffleId: 'r1', userId: 'user-2', purchasedAt: new Date().toISOString() },
];


export var featuredMissionIdData: string | null = 'm2';
export function setFeaturedMissionIdData(id: string | null) { featuredMissionIdData = id; }

export var highlightedRaffleIdData: string | null = null; // V1.0 Raffle Highlight
export function setHighlightedRaffleIdData(id: string | null) { highlightedRaffleIdData = id; }

export var artistsOfTheDayIdsData: string[] = ['user-1'];
export function setArtistsOfTheDayIdsData(ids: string[]) { artistsOfTheDayIdsData = ids; }

export var artistCarouselDurationData: number = 10;
export function setArtistCarouselDurationData(duration: number) { artistCarouselDurationData = duration; }

// V8.4: New persisted settings storage
export var eventSettings: { artistOfTheDayRotationSeconds?: number } = { artistOfTheDayRotationSeconds: 10 };
export function updateEventSettings(settings: Partial<typeof eventSettings>) {
    if (!eventSettings) eventSettings = {};
    Object.assign(eventSettings, settings);
}

export var termsAndConditionsContentData = `
Bem-vindo ao Artist World!

Estes termos e condições descrevem as regras e regulamentos para o uso do nosso aplicativo.
Ao acessar este aplicativo, presumimos que você aceita estes termos e condições. Não continue a usar o Artist World se não concordar com todos os termos e condições declarados nesta página.

1. Contas de Usuário
- Você deve ter pelo menos 18 anos de idade para criar uma conta.
- Você é responsável por manter a confidencialidade de sua conta e senha.
- Reservamo-nos o direito de encerrar contas, remover ou editar conteúdo a nosso exclusivo critério.

2. Conclusão de Missões
- Todas as submissões de missões estão sujeitas a revisão.
- Qualquer tentativa de burlar o sistema resultará na suspensão da conta.

3. Moeda Virtual (Lummi Coins)
- As Lummi Coins não têm valor monetário real e não podem ser trocadas por dinheiro.
- As moedas são usadas exclusivamente para resgatar itens e serviços dentro do aplicativo.

Última atualização: 29 de Julho de 2024
`;
export function setTermsAndConditionsContentData(content: string) { termsAndConditionsContentData = content; }

// Global Jackpot State
export var jackpotData = {
    currentValue: 15000,
    ticketPrice: 100,
    nextDraw: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
    tickets: [] as JackpotTicket[],
    history: [] as JackpotRound[],
    status: 'active' as 'active' | 'in_apuration' | 'waiting_start',
    nextStartDate: undefined as string | undefined,
    // Phase 13.5: New Jackpot Fields - V3.1 Update
    ticketLimits: {
        global: 0, // 0 = unlimited
        perUser: 0, // 0 = unlimited
        perPlan: { // Legacy: Kept for structure compatibility but unused logic-wise
            "Free Flow": 5,
            "Artista em Ascensão": 10,
            "Artista Profissional": 50,
            "Hitmaker": 1000
        }
    },
    salesHistory: [] as { userId: string, amount: number, timestamp: string }[]
};

// V6.0: Season History Mock Store
export var seasonHistoryData: any[] = [];

// V8.3: Manual Awards Store
export var manualAwardsData: ManualAward[] = [];
