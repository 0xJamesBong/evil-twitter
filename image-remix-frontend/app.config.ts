import "dotenv/config";

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error("Missing Supabase configuration in .env.local");
}

export default {
  expo: {
    name: "image-remix-frontend",
    slug: "image-remix-frontend",
    version: "1.0.0",
    extra: {
      supabaseUrl,
      supabaseAnonKey,
    },
  },
};
