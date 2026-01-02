// api/logs.ts
const log = (prefix: string, color: string, message: string, data?: object) => {
    console.log(`%c[${prefix}] %c${message}`, `color: ${color}; font-weight: bold;`, 'color: inherit;', data || '');
};

export const logAdminAction = (message: string, data?: object) => {
    log('ADMIN', '#a1a1aa', message, data);
};

export const logMissionFlow = (message: string, data?: object) => {
    log('MISSION', '#60a5fa', message, data);
};

export const logEconomyFlow = (message: string, data?: object) => {
    log('ECONOMY', '#4ade80', message, data);
};
