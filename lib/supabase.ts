// just a simple client to connect to the supabase database, and allow for easy import

import { createClient } from '@supabase/supabase-js'

// new connection to database type
import { Database } from '@/types/database'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!

export const supabase = createClient<Database>(supabaseUrl, supabaseKey)