
import React, { useEffect, useState } from 'react';
import { useAppContext } from '../constants';
import * as api from '../api/index';
import { StabilizationEngine } from './stabilization/stabilizationEngine';
import AuthPage from '../components/AuthPage';
import BannedUserPage from '../components/BannedUserPage';
import { MainLayout } from './MainLayout';
import { config } from './config';
import { getSupabase } from '../api/supabase/client';
import { isAdmin as checkIsAdmin } from '../api/supabase/admin';

export const AuthGate = (): React.ReactElement => {
    const { state, dispatch } = useAppContext();
    const { activeUser } = state;
    const [termsContent, setTermsContent] = useState('');
    const [isLoading, setIsLoading] = useState(true);

    // Initial Load Logic
    useEffect(() => {
        const checkLoginStatus = async () => {
            setIsLoading(true);
            try {
                const { user, notifications, unseenAdminNotifications } = await api.checkAuthStatus();
                if (user) {
                    await StabilizationEngine.runStartupChecks(user.id);
                    if (user.riskScore === undefined) user.riskScore = 0;
                    if (user.shieldLevel === undefined) user.shieldLevel = "normal";
                    
                    dispatch({ type: 'LOGIN', payload: { user, notifications, unseenAdminNotifications } });
                }
            } catch (error: any) {
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
                                const { user, notifications, unseenAdminNotifications } = await api.checkAuthStatus();
                                if (user) {
                                    await StabilizationEngine.runStartupChecks(user.id);
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
            <div className="min-h-screen bg-[#0B0F17] flex items-center justify-center">
                <div className="w-12 h-12 border-4 border-dashed rounded-full animate-spin border-[#FFD447]"></div>
            </div>
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
