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
    const userName = formData.get('userName') as string
 
    const supabase = await getServerSupabase()
    const { data, error } = await supabase.auth.signUp({ email, password })
    if (error) return { errors: { general: error.message } }

    //workers must be approved by a manager before they can log in
    const status = role === 'manager' ? 'approved' : 'pending'

    const { error: profileError } = await adminSupabase
      .from('user_profiles')
      .insert({
        id: data.user!.id,
        role,
        status,
        user_name: userName,
        email_account: email
      })
    if (profileError) return { errors: { general: profileError.message } }

    if (status === 'pending') {
      //signUp opened a supabase session as a side effect, close it so a pending worker holds no credentials
      await supabase.auth.signOut()
      redirect('/pending-approval')
    }

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
    const { data: profile, error: profileError } = await supabase
      .from('user_profiles')
      .select('role, status')
      .eq('id', user!.id)
      .single()
      //just a minor fix that the user is signed in to supabase, but the app treats them as unauthenticated
      if (profileError || !profile) {
        //surface the real db error in the server log instead of masking it (RLS errors also land here)
        if (profileError) console.error('login profile fetch failed:', profileError.message)
        return { errors: { general: 'Account setup incomplete, please contact support' } }
      }

      if (profile.status !== 'approved') {
        //close the supabase session opened by signInWithPassword, unapproved users hold no credentials
        await supabase.auth.signOut()
        return { errors: { general: profile.status === 'pending'
          ? 'Your account is awaiting manager approval.'
          : 'Your account has been rejected. Contact your manager.' } }
      }

      await setSessionCookie(user!.id, profile.role as 'worker' | 'manager')

    redirect('/')
  }
 
  export async function logout() {
    const supabase = await getServerSupabase()
    await supabase.auth.signOut()
    await clearSessionCookie()
    redirect('/login')
  }