export const loadSupabaseAdminRepository = async () => {
    const mod = await import("../supabase/supabase.repositories.admin");
    return mod.supabaseAdminRepository;
};
