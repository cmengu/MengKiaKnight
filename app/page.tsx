import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'

export default async function Home() {
   const cookieStore = await cookies()
   const raw = cookieStore.get('mpt-session')?.value
   const session = raw ? JSON.parse(Buffer.from(raw, 'base64').toString('utf-8')) : null

   if (session?.role === 'manager') {redirect('/manager')}

   if (session?.role === 'worker') {redirect('/worker')}

   redirect('/login')
}