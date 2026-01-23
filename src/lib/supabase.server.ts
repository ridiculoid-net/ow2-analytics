import "server-only";
import { createClient } from "@supabase/supabase-js";
import { ENV } from "@/lib/env.server";

export function supabaseService() {
  return createClient(ENV.SUPABASE_URL, ENV.SUPABASE_SERVICE_ROLE_KEY, {
    auth: { persistSession: false },
  });
}
