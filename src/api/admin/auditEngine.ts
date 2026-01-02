import { getSupabase } from "../supabase/client";
import { assertSupabaseProvider } from "../core/backendGuard";

const requireSupabaseClient = () => {
    const client = getSupabase();
    if (!client) throw new Error("[Supabase] Client not initialized");
    return client;
};

export async function adminListAuditLog(limit = 50, offset = 0) {
    assertSupabaseProvider('audit.adminListAuditLog');

    const supabase = requireSupabaseClient();
    const { data, error } = await supabase.rpc(
        "admin_list_audit_log",
        {
            p_limit: limit,
            p_offset: offset,
        }
    );

    if (error) throw error;
    return data?.items ?? [];
}
