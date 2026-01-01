// api/errors/alerts.ts
import * as detector from './anomaly-detector';
import * as db from '../mockData';
import { errorLogs } from './logger';

export type AlertType = 
    | 'economy-risk'
    | 'queue-risk'
    | 'store-risk'
    | 'mission-risk'
    | 'system-error'
    | 'critical-failure';

export interface AdminAlert {
    id: string;
    timestamp: string;
    type: AlertType;
    message: string;
    meta?: any;
}

export const alertsLog: AdminAlert[] = [];

export const generateAdminAlert = (type: AlertType, message: string, meta?: any) => {
    const alert: AdminAlert = {
        id: `alert-${Date.now()}`,
        timestamp: new Date().toISOString(),
        type,
        message,
        meta,
    };
    alertsLog.unshift(alert);
    if (alertsLog.length > 100) {
        alertsLog.pop();
    }
    return alert;
};

export const autoAlertEconomy = () => {
    db.allUsersData.forEach(user => {
        if (detector.detectCoinSpike(user) || detector.detectXpSpike(user)) {
            generateAdminAlert('economy-risk', `Risco de economia detectado para o usuário ${user.name}`, { userId: user.id });
        }
    });
};

export const autoAlertQueues = () => {
    if (detector.detectQueueStall()) {
        generateAdminAlert('queue-risk', 'Itens estão parados na fila por mais de 48 horas.');
    }
};

export const autoAlertStore = () => {
    db.allUsersData.forEach(user => {
        if (detector.detectStoreExploit(user)) {
            generateAdminAlert('store-risk', `Possível exploração da loja pelo usuário ${user.name}`, { userId: user.id });
        }
    });
};

export const autoAlertMissions = () => {
    db.allUsersData.forEach(user => {
        if (detector.detectMissionAbuse(user)) {
            generateAdminAlert('mission-risk', `Possível abuso de missões pelo usuário ${user.name}`, { userId: user.id });
        }
    });
};

export const autoAlertSystem = () => {
    // This would be triggered by calls to handleApiError, etc.
    // For simulation, we can just check if there are recent critical errors.
    const recentCritical = errorLogs.some(log => log.level === 'critical' && new Date(log.timestamp).getTime() > Date.now() - 60000);
    if (recentCritical) {
        generateAdminAlert('system-error', 'Erro crítico detectado no sistema recentemente.');
    }
};
