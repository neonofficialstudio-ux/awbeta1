
import { SessionEngine } from "./sessionEngine";
import { UserIdentity } from "./userIdentity";
import { getRepository } from "../database/repository.factory";
import { TelemetryPRO } from "../../services/telemetry.pro";
import type { User } from "../../types";
import { config } from "../../core/config";
import { getSupabase } from "../supabase/client";
import { mapProfileToUser } from "../supabase/mappings";

const repo = getRepository();

export const AuthEngineV4 = {
    login: async (email: string, password: string): Promise<User> => {
        if (config.useSupabase) {
            const supabase = getSupabase();
            if (!supabase) throw new Error("Supabase client not initialized");

            const { data, error } = await supabase.auth.signInWithPassword({ email, password });

            if (error) {
                TelemetryPRO.event("login_failed", { email, reason: error.message });
                throw new Error("Credenciais inválidas");
            }

            if (!data.user) throw new Error("Erro desconhecido ao recuperar usuário.");

            // Buscar perfil completo
            const { data: profile, error: profileError } = await supabase
                .from('profiles')
                .select('*')
                .eq('id', data.user.id)
                .single();

            if (profileError || !profile) {
                console.error("Profile fetch error:", profileError);
                throw new Error("Perfil de usuário não encontrado no banco de dados.");
            }

            const user = mapProfileToUser(profile);
            const deviceId = SessionEngine.getDeviceId();
            SessionEngine.createSession(user.id, deviceId);

            return user;
        }

        // Mock Fallback (Legado)
        const users = repo.select("users") as User[];
        const user = users.find(u => u.email.toLowerCase() === email.toLowerCase());

        if (!user || user.password !== password) {
             throw new Error("Credenciais inválidas");
        }
        
        const deviceId = SessionEngine.getDeviceId();
        SessionEngine.createSession(user.id, deviceId);
        return UserIdentity.getProfile(user.id)!;
    },

    logout: async () => {
        if (config.useSupabase) {
            const supabase = getSupabase();
            if (supabase) await supabase.auth.signOut();
        }
        SessionEngine.clearSession();
        localStorage.removeItem('authToken');
    },

    restoreSession: async (): Promise<User | null> => {
        if (config.useSupabase) {
            const supabase = getSupabase();
            if (!supabase) return null;

            const { data: { session } } = await supabase.auth.getSession();
            if (!session) return null;

            const { data: profile } = await supabase
                .from('profiles')
                .select('*')
                .eq('id', session.user.id)
                .single();
            
            if (profile) {
                return mapProfileToUser(profile);
            }
            return null;
        }

        const session = SessionEngine.getSession();
        if (!session) return null;
        return UserIdentity.getProfile(session.userId);
    }
};
