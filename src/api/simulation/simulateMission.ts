
// api/simulation/simulateMission.ts
import type { User, Mission, MissionFormat } from '../../types';
import { missionsBank } from '../missions-bank';
import { prepareGeneratedMission } from '../helpers';
import { calculateMissionRewards, BASE_MISSION_REWARDS } from '../economy/economy';
import { validateMissionSubmission } from '../quality/validateInputs';
import { deepClone } from '../helpers';

const getRandomItem = (arr: any[]) => arr[Math.floor(Math.random() * arr.length)];

export const generateSimMission = (): Mission => {
    const duration = getRandomItem(['curta', 'média', 'longa']);
    const durationKey = duration === 'média' ? 'media' : duration;
    const format = getRandomItem(['video', 'story', 'foto']);
    
    // @ts-ignore
    const actionOptions = format === 'foto' ? missionsBank.actions.foto : missionsBank.actions[durationKey];

    const action = getRandomItem(actionOptions);
    const contexto = getRandomItem(missionsBank.contexts);
    const hook = getRandomItem(missionsBank.hooks);
    const title = getRandomItem(missionsBank.titles);

    let platformOptions;
    if (format === 'foto') {
        platformOptions = ["Instagram Feed", "Instagram Story"];
    } else if (format === 'story') {
        platformOptions = ["Instagram Stories"];
    } else {
        platformOptions = ["Instagram Reels", "TikTok", "YouTube Shorts"];
    }
    const plataforma = getRandomItem(platformOptions);

    const formatoMap: Record<string, string> = { video: 'vídeo', story: 'story', foto: 'foto' };
    
    const description = `${action} conectada ao contexto ${contexto}, registrada em formato ${formatoMap[format]}.\nIsso representa um ${hook}.`;

    const generated = {
        title,
        description,
        platform: plataforma,
        xp: 0, 
        coins: 0,
    };
    
    const mission = prepareGeneratedMission(generated);
    
    const rewards = BASE_MISSION_REWARDS[durationKey];

    mission.xp = rewards.xp;
    mission.coins = rewards.coins;

    return mission;
};

export const submitSimMission = (simUser: User, missionData: Mission) => {
    let user = deepClone(simUser);
    
    const desc = missionData.description.toLowerCase();
    
    let missionFormat: MissionFormat = 'link';
    let proof = 'https://instagram.com/p/simulated-proof'; 

    if (desc.includes('formato foto')) {
        missionFormat = 'photo';
        proof = 'data:image/png;base64,simulatedimagecontent'; // Must be image data for photo type
    } else if (desc.includes('formato story')) {
        missionFormat = 'link';
    } else if (desc.includes('formato vídeo')) {
        missionFormat = 'link';
    }

    const validation = validateMissionSubmission({ proof, missionFormat });
    if (!validation.ok) {
        return { success: false, reason: validation.reason, user };
    }

    user.pendingMissions.push(missionData.id);
    return { success: true, reason: 'Submitted successfully', user };
};

export const resolveSimMission = async (simUser: User, missionData: Mission, status: 'approved' | 'rejected') => {
    let user = deepClone(simUser);
    
    user.pendingMissions = user.pendingMissions.filter(id => id !== missionData.id);

    if (status === 'approved') {
        user.completedMissions.push(missionData.id);
        const { updatedUser } = await calculateMissionRewards(user, missionData);
        user = updatedUser;
    }

    return { success: true, reason: `Mission resolved as ${status}`, user };
};
