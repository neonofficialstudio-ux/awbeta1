
import { saveToStorage, loadFromStorage } from '../persist/localStorage';
import type { Mission } from '../../types';

// V4.2 Mission Database Definition
export interface MissionDefinition {
  id: string;
  title: string;
  description: string;
  type: "weekly" | "event-normal" | "event-vip" | "creative" | "instagram" | "tiktok" | "special" | "youtube";
  xp: number;
  coins: number;
  multiplierEnabled: boolean;
  cooldownHours: number;
  repetitionLimit: number; // 0 = unlimited
  proofRequired: boolean;
  eventId?: string; // Optional link to event
  actionUrl?: string;
  format?: 'video' | 'story' | 'foto' | 'text' | 'ambos';
  createdAt: string;
  deadline: string;
  status: 'active' | 'expired';
}

const MISSIONS_DB_KEY = 'aw_missions_db_v4_2';

// Initial Seed Data
const INITIAL_MISSIONS: MissionDefinition[] = [
    {
        id: 'm-weekly-01',
        title: 'Curta a publicação oficial (Semanal)',
        description: 'Engaje com o post da semana no Instagram oficial.',
        type: 'instagram',
        xp: 50,
        coins: 5,
        multiplierEnabled: true,
        cooldownHours: 24,
        repetitionLimit: 1,
        proofRequired: true,
        createdAt: new Date().toISOString(),
        deadline: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
        status: 'active',
        format: 'foto',
        actionUrl: 'https://instagram.com/artistworld'
    },
    {
        id: 'm-weekly-02',
        title: 'Crie um Story Criativo',
        description: 'Mostre seu setup ou bastidores no story.',
        type: 'creative',
        xp: 100,
        coins: 10,
        multiplierEnabled: true,
        cooldownHours: 24,
        repetitionLimit: 1,
        proofRequired: true,
        createdAt: new Date().toISOString(),
        deadline: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
        status: 'active',
        format: 'story'
    },
    {
        id: 'm-event-vip-01',
        title: 'Desafio VIP: Remix Épico',
        description: 'Missão exclusiva para portadores do Golden Pass.',
        type: 'event-vip',
        xp: 500,
        coins: 50,
        multiplierEnabled: true,
        cooldownHours: 0,
        repetitionLimit: 1,
        proofRequired: true,
        eventId: 'e1', // Linked to event ID e1
        createdAt: new Date().toISOString(),
        deadline: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
        status: 'active',
        format: 'video'
    }
];

export const MissionDB = {
    load: (): MissionDefinition[] => {
        const data = loadFromStorage<MissionDefinition[]>(MISSIONS_DB_KEY, []);
        if (data.length === 0) {
            MissionDB.save(INITIAL_MISSIONS);
            return INITIAL_MISSIONS;
        }
        return data;
    },

    save: (missions: MissionDefinition[]) => {
        saveToStorage(MISSIONS_DB_KEY, missions);
    },

    add: (mission: MissionDefinition) => {
        const missions = MissionDB.load();
        missions.push(mission);
        MissionDB.save(missions);
        return mission;
    },

    getById: (id: string) => {
        return MissionDB.load().find(m => m.id === id);
    },

    getByType: (type: MissionDefinition['type']) => {
        return MissionDB.load().filter(m => m.type === type);
    },

    getByEvent: (eventId: string) => {
        return MissionDB.load().filter(m => m.eventId === eventId);
    }
};
