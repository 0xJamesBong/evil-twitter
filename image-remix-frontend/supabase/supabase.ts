import { createClient } from '@supabase/supabase-js'
import 'react-native-url-polyfill/auto'


// TODO: this is a temporary solution, we need to find a better way to handle this
// these variables are entirely and totally exposed 
const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase configuration')
}


export const supabase = createClient(supabaseUrl, supabaseAnonKey)

console.log("supabase:", supabase)