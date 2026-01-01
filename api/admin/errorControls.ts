// api/admin/errorControls.ts
import { errorLogs } from '../errors/logger';
import { alertsLog, autoAlertEconomy, autoAlertQueues, autoAlertStore, autoAlertMissions, autoAlertSystem } from '../errors/alerts';

export const adminGetErrorLogs = () => {
    return [...errorLogs];
};

export const adminGetAlerts = () => {
    return [...alertsLog];
};

export const adminRunAnomalyScan = () => {
    autoAlertEconomy();
    autoAlertQueues();
    autoAlertStore();
    autoAlertMissions();
    autoAlertSystem(); // This one checks the log for recent criticals
    return {
        message: 'Verificação de anomalias concluída. Verifique os alertas gerados.',
        alertsGenerated: alertsLog.length,
    };
};

export const adminClearLogs = () => {
    errorLogs.length = 0;
    return { message: 'Logs de erro limpos.' };
};

export const adminClearAlerts = () => {
    alertsLog.length = 0;
    return { message: 'Alertas limpos.' };
};
