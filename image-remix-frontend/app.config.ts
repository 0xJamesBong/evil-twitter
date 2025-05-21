import 'dotenv/config'

const supabaseUrl = process.env.SUPABASE_URL
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase configuration in .env.local')
}

export default {
  expo: {
    name: 'image-remix-frontend',
    slug: 'image-remix-frontend',
    version: '1.0.0',
    extra: {
      supabaseUrl,
      supabaseAnonKey,
    },
  },
}
