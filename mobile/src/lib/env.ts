/**
 * Expo inlines any EXPO_PUBLIC_* variable at build time. These three are the only
 * configuration the app needs; see .env.example and README.md.
 *
 * Nothing secret belongs here. The anon key is designed to be public: every table
 * it can reach is protected by row level security, exactly as on the website.
 */
const req = (name: string, value: string | undefined): string => {
  if (!value) {
    throw new Error(
      `Missing ${name}. Copy .env.example to .env and fill it in, then restart with 'npx expo start --clear'.`
    );
  }
  return value;
};

export const SUPABASE_URL = req("EXPO_PUBLIC_SUPABASE_URL", process.env.EXPO_PUBLIC_SUPABASE_URL);
export const SUPABASE_ANON_KEY = req(
  "EXPO_PUBLIC_SUPABASE_ANON_KEY",
  process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY
);

/** Where the Next.js API routes live. Used for the few actions that need the server. */
export const SITE = (process.env.EXPO_PUBLIC_SITE_URL ?? "https://www.groupsbygatherwell.com").replace(
  /\/$/,
  ""
);
