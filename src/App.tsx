
import React, { useEffect, useRef } from 'react';
import { AppProvider, useAppContext } from './state/context';
import { QueueProvider } from './providers/QueueProvider';
import { AuthGate } from './core/AuthGate';
import { GlobalErrorBoundary } from './core/errors/globalErrorBoundary';
import { ToastProvider } from './components/ui/providers/ToastProvider';
import { Toaster } from 'react-hot-toast';
import { ModalProvider } from './components/ui/providers/ModalProvider';
import { SanityGuard } from './services/sanity.guard'; 
import { DataConsistency } from './services/data.consistency'; 
import { detectDOMTampering } from "./api/anticheat/domTamper";
import { createHoneypots } from "./api/anticheat/honeypots";
import { getDeviceFingerprint } from "./api/anticheat/deviceFingerprint";
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

        }
    }, []);

    // Optimized State Integrity Check
    useEffect(() => {
        if (!state.activeUser) return;

        // ✅ ENTERPRISE RULE (Supabase is source of truth):
        // Never auto-repair / dispatch "consistency fixes" in runtime when backendProvider is supabase.
        // Background tab throttling can delay timers; when returning, late dispatches can cause global re-renders
        // and remount-sensitive UI (like local modals) appears to "refresh".
        const isSupabase = config.backendProvider === 'supabase';

        // Debounce integrity check to avoid blocking UI on rapid updates
        const timer = setTimeout(() => {
            const safeUser = SanityGuard.user(state.activeUser);
            const tempState = { ...state, activeUser: safeUser };
            
            // Run consistency check
            const { newState, report } = DataConsistency.fullScan(tempState);

            if (report.issues.length > 0) {
                logger.warn("State repaired during runtime consistency check", report.repaired);

                // ✅ In Supabase mode, we only log (no dispatch). Backend is the authority.
                if (isSupabase) return;

                // Determine if we need to dispatch updates (mock-only)
                const userChanged =
                    newState.activeUser && !fastDeepEqual(newState.activeUser, state.activeUser);
                const rankingChanged =
                    newState.rankingGlobal && !fastDeepEqual(newState.rankingGlobal, state.rankingGlobal);
                const queueChanged =
                    newState.queue && !fastDeepEqual(newState.queue, state.queue);

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
                    <Toaster position="top-right" />
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
