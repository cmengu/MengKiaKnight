import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
)

const DEMO_USERS = [
  { email: 'manager@demo.mengkia.com', password: 'demo-manager-123', role: 'manager', userName: 'Demo Manager',   status: 'approved' },
  { email: 'worker@demo.mengkia.com',  password: 'demo-worker-123',  role: 'worker',  userName: 'Demo Worker',    status: 'approved' },
  { email: 'admin@demo.mengkia.com',   password: 'demo-admin-123',   role: 'manager', userName: 'Dev Admin',      status: 'approved' },
  // stays pending so the approval flow is instantly demoable
  { email: 'newbie@demo.mengkia.com',  password: 'demo-newbie-123',  role: 'worker',  userName: 'Pending Worker', status: 'pending' },
] as const

async function main() {
  for (const u of DEMO_USERS) {
    // email_confirm: true marks the email verified, so login works
    // immediately even with "Confirm email" enabled in Supabase Auth
    const { data, error } = await supabase.auth.admin.createUser({
      email: u.email,
      password: u.password,
      email_confirm: true,
    })

    if (error) {
      if (error.message.includes('already been registered')) {
        console.log(`SKIP  ${u.email} (already exists)`)
        continue
      }
      throw new Error(`${u.email}: ${error.message}`)
    }

    const { error: profileError } = await supabase
      .from('user_profiles')
      .insert({
        id: data.user.id,
        role: u.role,
        status: u.status,
        user_name: u.userName,
        email_account: u.email,
      })
    if (profileError) throw new Error(`${u.email} profile: ${profileError.message}`)

    console.log(`OK    ${u.email} (${u.role})`)
  }
}

main()