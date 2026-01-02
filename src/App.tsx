
import React, { useEffect, useRef } from 'react';
import { AppProvider, useAppContext } from './state/context';
import { QueueProvider } from './providers/QueueProvider';
import { AuthGate } from './core/AuthGate';
import { GlobalErrorBoundary } from './core/errors/globalErrorBoundary';
import { ToastProvider } from './components/ui/providers/ToastProvider';
import { ModalProvider } from './components/ui/providers/ModalProvider';
import { SanityGuard } from './services/sanity.guard'; 
import { DataConsistency } from './services/data.consistency'; 
import { detectDOMTampering } from "./api/anticheat/domTamper";
import { createHoneypots } from "./api/anticheat/honeypots";
import { getDeviceFingerprint } from "./api/anticheat/deviceFingerprint";
import { LegacyUserNormalizer } from './api/migration/legacyUserNormalizer';
import { fastDeepEqual } from './api/utils/equality';
import { logger } from './core/logger';
import { config } from './core/config';

const AppContent: React.FC = () => {
    const { state, dispatch } = useAppContext();
    const isMounted = useRef(false);

    useEffect(() => {
        // Run once on mount
        if (!isMounted.current) {
            isMounted.current = true;
            
            // Security Initialization
            if (config.features.antiCheat) {
                setTimeout(() => {
                    detectDOMTampering();
                    createHoneypots();
                    getDeviceFingerprint().then(fp => {
                        localStorage.setItem("device_fp", fp);
                    });
                }, 1000);
            }

            // System Integrity Checks
            if (config.backendProvider === 'mock') {
                setTimeout(async () => {
                    const { runMockIntegrityScan } = await import('./api/diagnostics/mockIntegrity');
                    const report = runMockIntegrityScan();
                    logger.info("Startup Integrity Scan", report.summary);
                    LegacyUserNormalizer.run();
                }, 500);
            }
        }
    }, []);

    // Optimized State Integrity Check
    useEffect(() => {
        if (!state.activeUser) return;

        // Debounce integrity check to avoid blocking UI on rapid updates
        const timer = setTimeout(() => {
            const safeUser = SanityGuard.user(state.activeUser);
            const tempState = { ...state, activeUser: safeUser };
            
            // Run consistency check
            const { newState, report } = DataConsistency.fullScan(tempState);

            if (report.issues.length > 0) {
                logger.warn("State repaired during runtime consistency check", report.repaired);

                // Determine if we need to dispatch updates
                const userChanged = newState.activeUser && !fastDeepEqual(newState.activeUser, state.activeUser);
                const rankingChanged = newState.rankingGlobal && !fastDeepEqual(newState.rankingGlobal, state.rankingGlobal);
                const queueChanged = newState.queue && !fastDeepEqual(newState.queue, state.queue);

                if (userChanged) {
                     dispatch({ type: 'UPDATE_USER', payload: newState.activeUser! });
                }
                if (rankingChanged) {
                    dispatch({ type: 'SET_RANKING_GLOBAL', payload: newState.rankingGlobal });
                }
                if (queueChanged) {
                    dispatch({ type: 'SET_QUEUE', payload: newState.queue });
                }
            }
        }, 2000); // 2s delay to let UI settle

        return () => clearTimeout(timer);
    }, [state.activeUser, state.events, state.queue, dispatch]); 

    return <AuthGate />;
};

const App: React.FC = () => {
    return (
        <GlobalErrorBoundary>
            <AppProvider>
                <ToastProvider>
                    <ModalProvider>
                        <QueueProvider>
                             <AppContent />
                        </QueueProvider>
                    </ModalProvider>
                </ToastProvider>
            </AppProvider>
        </GlobalErrorBoundary>
    );
}

export default App;
