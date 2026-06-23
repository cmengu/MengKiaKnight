'use server'
 import { redirect } from 'next/navigation'
 import { setSessionCookie, clearSessionCookie } from '@/lib/session'
 import { createClient } from '@supabase/supabase-js'
 import { getServerSupabase } from '@/lib/supabaseServer' 

 //created a admin so that the profile insert works without vilating role level sec
 const adminSupabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

 //optional erroors here
 export type FormState = { errors?: { email?: string; password?: string; role?: string; general?: string } } | undefined

 export async function register(prevState: FormState, formData: FormData): Promise<FormState> {
  //need to check with the frontend on waht the actual input name is and then change this
    const email    = formData.get('email') as string
    const password = formData.get('password') as string
    const role     = formData.get('role') as string   
 
    const supabase = await getServerSupabase()
    const { data, error } = await supabase.auth.signUp({ email, password })
    if (error) return { errors: { general: error.message } }
 
    
    const { error: profileError } = await adminSupabase
      .from('profiles')
      .insert({ id: data.user!.id, role })
    if (profileError) return { errors: { general: profileError.message } }
    //user data defo exists, so just assert it
    await setSessionCookie(data.user!.id, role as 'worker' | 'manager')
    redirect('/')
  }

  export async function login(prevState: FormState, formData: FormData): Promise<FormState> {
    const email    = formData.get('email') as string
    const password = formData.get('password') as string
 
    const supabase = await getServerSupabase()
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) return { errors: { general: error.message } }
 
    
    const { data: { user } } = await supabase.auth.getUser()
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user!.id)
      .single()
      //just a minor fix that the user is signed in to supabase, but the app treats them as unauthenticated
      if (!profile) return { errors: { general: 'Account setup incomplete, please contact support' } }                                                                   
      await setSessionCookie(user!.id, profile.role as 'worker' | 'manager')
 
    redirect('/')
  }
 
  export async function logout() {
    const supabase = await getServerSupabase()
    await supabase.auth.signOut()
    await clearSessionCookie()
    redirect('/login')
  }