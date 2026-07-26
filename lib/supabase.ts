
// 1. Swap createClient for createBrowserClient from the new SSR package
import { createBrowserClient } from '@supabase/ssr'

// 2. Keep database types
import { Database } from '@/types/database'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY

// Why the placeholders: `next build` prerenders pages like /manager, which means this
// module is *evaluated on the build server* even though the client it creates is only
// ever used in a browser. createBrowserClient throws on empty credentials, so a build
// machine without env vars (CI, or a fork PR that can't read secrets) dies at export
// time with a cryptic SDK error. No network call happens during prerender, so handing
// it a syntactically-valid dummy is safe — nothing is ever sent anywhere.
const BUILD_PLACEHOLDER_URL = 'http://localhost:54321'
const BUILD_PLACEHOLDER_KEY = 'build-time-placeholder-anon-key'

const MISSING_ENV_MESSAGE =
  'Supabase env vars missing: set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY'

if (!supabaseUrl || !supabaseKey) {
  // In a real browser this is never survivable — every query would silently point at
  // nothing — so fail loudly and immediately, with a message that names the fix. The
  // placeholder is strictly a build-server concession, never a runtime one.
  if (typeof window !== 'undefined') {
    throw new Error(MISSING_ENV_MESSAGE)
  }
  console.warn(`[supabase] ${MISSING_ENV_MESSAGE} — using a build-time placeholder for prerendering only.`)
}

// 3. Initialize the browser client (it will automatically look for cookies now!)
export const supabase = createBrowserClient<Database>(
  supabaseUrl || BUILD_PLACEHOLDER_URL,
  supabaseKey || BUILD_PLACEHOLDER_KEY,
)
