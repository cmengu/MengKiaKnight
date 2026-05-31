import { cookies } from 'next/headers'
import { ManagerDashboard } from './ManagerDashboard'
import { WorkerScanner } from './WorkerScanner'

export default async function Home() {
   const cookieStore = await cookies()
   const raw = cookieStore.get('mpt-session')?.value
   const session = raw ? JSON.parse(Buffer.from(raw, 'base64').toString('utf-8')) : null

   if (session?.role === 'manager') return <ManagerDashboard />
   if (session?.role === 'worker') return <WorkerScanner />
    return null 
}