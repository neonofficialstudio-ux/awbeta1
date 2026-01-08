
import React, { useEffect, useState } from 'react';
import { useAppContext } from '../constants';
import * as api from '../api/index';
import { StabilizationEngine } from './stabilization/stabilizationEngine';
import AuthPage from '../components/AuthPage';
import BannedUserPage from '../components/BannedUserPage';
import BootSplash from '../components/BootSplash';
import { MainLayout } from './MainLayout';
import { config } from './config';
import { getSupabase } from '../api/supabase/client';
import { isAdmin as checkIsAdmin } from '../api/supabase/admin';

export const AuthGate = (): React.ReactElement => {
    const { state, dispatch } = useAppContext();
    const { activeUser } = state;
    const [termsContent, setTermsContent] = useState('');
    const [isLoading, setIsLoading] = useState(true);
    const withTimeout = async <T,>(promise: Promise<T>, ms: number, label: string): Promise<T> => {
        let timeoutId: any;
        const timeoutPromise = new Promise<T>((_, reject) => {
            timeoutId = setTimeout(() => reject(new Error(`timeout:${label}`)), ms);
        });

        try {
            return await Promise.race([promise, timeoutPromise]) as T;
        } finally {
            clearTimeout(timeoutId);
        }
    };

    // Initial Load Logic
    useEffect(() => {
        const checkLoginStatus = async () => {
            setIsLoading(true);
            try {
                const { user, notifications, unseenAdminNotifications } =
                    await withTimeout(api.checkAuthStatus(), 8000, 'checkAuthStatus');
                if (user) {
                    await withTimeout(StabilizationEngine.runStartupChecks(user.id), 5000, 'startupChecks');

                    if ((user as any).riskScore === undefined) (user as any).riskScore = 0;
                    if ((user as any).shieldLevel === undefined) (user as any).shieldLevel = "normal";

                    dispatch({ type: 'LOGIN', payload: { user, notifications, unseenAdminNotifications } });
                }
            } catch (error: any) {
                const msg = String(error?.message || error || '');
                if (msg.startsWith('timeout:')) {
                    console.warn('[AuthGate] Boot timeout detected:', msg);

                    // Libera o app: cai pro AuthPage (ou mantém estado atual)
                    dispatch({ type: 'LOGOUT' });
                    setIsLoading(false);
                    return;
                }
                console.error("Auth check failed:", error);

                // ✅ Auto-heal: se token do Supabase estiver corrompido, limpa storage do auth e força logout.
                try {
                    if (config.useSupabase) {
                        const supabase = getSupabase();
                        if (supabase) {
                            const msg = String(error?.message || error || '');

                            // Heurística: erros comuns quando o token/localStorage quebra
                            const looksLikeCorruptAuth =
                                msg.toLowerCase().includes('jwt') ||
                                msg.toLowerCase().includes('token') ||
                                msg.toLowerCase().includes('parse') ||
                                msg.toLowerCase().includes('json') ||
                                msg.toLowerCase().includes('storage');

                            if (looksLikeCorruptAuth) {
                                // Remove o token do supabase-js: sb-<projectRef>-auth-token
                                const url = (import.meta as any).env?.VITE_SUPABASE_URL || '';
                                const match = typeof url === 'string' ? url.match(/^https:\/\/([a-z0-9-]+)\.supabase\.co/i) : null;
                                const projectRef = match?.[1];
                                if (projectRef) {
                                    const key = `sb-${projectRef}-auth-token`;
                                    try { localStorage.removeItem(key); } catch {}
                                }

                                // força logout local
                                await supabase.auth.signOut();
                                dispatch({ type: 'LOGOUT' });
                            }
                        }
                    }
                } catch {}
            } finally {
                setIsLoading(false);
            }
        };
        
        checkLoginStatus();
    }, [dispatch]);

    useEffect(() => {
        if (!isLoading) return;

        const id = setTimeout(() => {
            console.warn('[AuthGate] Watchdog released loading after 12s');
            setIsLoading(false);
        }, 12000);

        return () => clearTimeout(id);
    }, [isLoading]);

    // Supabase Auth Listener
    useEffect(() => {
        if (config.useSupabase) {
            const supabase = getSupabase();
            if (supabase) {
                const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
                    if (event === 'SIGNED_IN' && session) {
                        // User clicked email link or logged in, sync state if not already
                         if (!activeUser) {
                             setIsLoading(true);
                             try {
                                const { user, notifications, unseenAdminNotifications } =
                                    await withTimeout(api.checkAuthStatus(), 8000, 'checkAuthStatus');
                                if (user) {
                                    await withTimeout(StabilizationEngine.runStartupChecks(user.id), 5000, 'startupChecks');
                                    dispatch({ type: 'LOGIN', payload: { user, notifications, unseenAdminNotifications } });
                                }
                             } catch(e) {
                                 console.error("Sync after sign-in failed", e);
                             } finally {
                                 setIsLoading(false);
                             }
                         }
                    } else if (event === 'SIGNED_OUT') {
                         dispatch({ type: 'LOGOUT' });
                    }
                });
                
                return () => subscription.unsubscribe();
            }
        }
    }, [dispatch, activeUser]);

    useEffect(() => {
        if (!activeUser) {
            const fetchTermsContent = async () => {
                const content = await api.fetchTerms();
                setTermsContent(content);
            };
            fetchTermsContent();
        }
    }, [activeUser]);

    useEffect(() => {
        let isMounted = true;

        const verifyAdminStatus = async () => {
            if (!activeUser) {
                dispatch({ type: 'SET_ADMIN_STATUS', payload: null });
                return;
            }

            if (config.backendProvider !== 'supabase') {
                dispatch({ type: 'SET_ADMIN_STATUS', payload: activeUser.role === 'admin' });
                return;
            }

            dispatch({ type: 'SET_ADMIN_STATUS', payload: null });
            const hasAccess = await checkIsAdmin();

            if (isMounted) {
                dispatch({ type: 'SET_ADMIN_STATUS', payload: hasAccess });
            }
        };

        verifyAdminStatus();

        return () => { isMounted = false; };
    }, [activeUser, dispatch]);
    
    if (isLoading) {
        return (
            <BootSplash
                title="ARTIST WORLD"
                message="Inicializando núcleo"
                hint="Verificando sessão, preparando economia e sincronizando notificações."
                progressLabel="AW // BOOT"
            />
        );
    }
    
    if (!activeUser) {
        return <AuthPage termsContent={termsContent} />;
    }

    if (activeUser.isBanned) {
        return <BannedUserPage user={activeUser} />;
    }

    return <MainLayout />;
}
