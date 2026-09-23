import "react-native-url-polyfill/auto";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { createClient } from "@supabase/supabase-js";
import { SUPABASE_ANON_KEY, SUPABASE_URL } from "./env";

/**
 * The same Supabase project the website uses, reached with the same anon key and
 * therefore the same row level security policies. A traveller sees exactly what
 * they would see in a browser, no more.
 */
export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    // There is no URL bar on a phone; sessions come from verifyOtp, not a redirect.
    detectSessionInUrl: false,
  },
});
