
// 1. Swap createClient for createBrowserClient from the new SSR package
import { createBrowserClient } from '@supabase/ssr'

// 2. Keep database types
import { Database } from '@/types/database'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!

// 3. Initialize the browser client (it will automatically look for cookies now!)
export const supabase = createBrowserClient<Database>(supabaseUrl, supabaseKey)