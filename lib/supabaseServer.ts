import { cookies } from "next/headers"
import { createServerClient } from '@supabase/ssr'

//simply a helpa function to get the supabase client, supabase cookies, not ours 
export async function getServerSupabase() {
    const cookieStore = await cookies()
    //this is the supabase server client
    return createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
      {
        cookies: {
        //this is the function to get all the cookies
          getAll: () => cookieStore.getAll(),
          //when supabase server client sets a cookie, it will write cookies back to da response
          //from the docs
          setAll: (toSet) => toSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options)
          ),
        },
      }
    )
  }