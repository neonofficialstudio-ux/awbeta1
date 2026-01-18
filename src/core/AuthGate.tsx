
import React, { useEffect, useState } from 'react';
import { useAppContext } from '../constants';
import * as api from '../api/index';
import AuthPage from '../components/AuthPage';
import BannedUserPage from '../components/BannedUserPage';
import BootScreen from '../components/BootScreen';
import { MainLayout } from './MainLayout';
import { config } from './config';
import { getSupabase } from '../api/supabase/client';
import { isAdminCached as checkIsAdmin } from '../api/supabase/admin';
import { ProfileSupabase } from '../api/supabase/profile';

export const AuthGate = (): React.ReactElement => {
    const { state, dispatch } = useAppContext();
    const { activeUser } = state;
    const [termsContent, setTermsContent] = useState('');
    const [isLoading, setIsLoading] = useState(true);

    const syncProfile = async (userId: string) => {
        try {
            const res = await ProfileSupabase.fetchMyProfile(userId);
            if (res?.success && res.user) {
                dispatch({ type: 'UPDATE_USER', payload: res.user });
            }
        } catch {}
    };

    // Initial Load Logic
    useEffect(() => {
        let unsub: (() => void) | null = null;
        let mounted = true;
        const supabase = getSupabase();

        const boot = async () => {
            try {
                // 1. Check sessão atual (1x apenas)
                const {
                    data: { session },
                } = await supabase.auth.getSession();

                if (!mounted) return;

                if (session?.user) {
                    dispatch({ type: 'LOGIN', payload: { user: session.user } });
                    await syncProfile(session.user.id);
                } else {
                    dispatch({ type: 'LOGOUT' });
                }

                // 2. Listener oficial (única fonte depois do boot)
                const { data } = supabase.auth.onAuthStateChange((_event, session) => {
                    if (!mounted) return;

                    if (session?.user) {
                        dispatch({ type: 'LOGIN', payload: { user: session.user } });
                        void syncProfile(session.user.id);
                    } else {
                        dispatch({ type: 'LOGOUT' });
                    }
                });

                unsub = data.subscription.unsubscribe;
            } catch (e) {
                console.error('[AuthGate] boot error', e);
                // IMPORTANTE: não desloga em erro
            } finally {
                if (mounted) setIsLoading(false);
            }
        };

        boot();

        return () => {
            mounted = false;
            if (unsub) unsub();
        };
    }, []);

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
            <BootScreen stage="authentication" />
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
