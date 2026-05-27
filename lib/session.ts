// i do like a 2 cookie approach
// one for the supabase session and one for the app session
//this is for the app session cookie

import { cookies } from 'next/headers'
import { NextRequest } from 'next/server'

//take note that setSessionCookie and clearSessionCookie are async because they call await cookies()
export async function setSessionCookie(userId: string, role: 'worker' | 'manager') {
  const cookieStore = await cookies()
  //convert to string -> bytes -> encode to base64 so its safe to store in a cookie
  const value = Buffer.from(JSON.stringify({ userId, role })).toString('base64')
  cookieStore.set('mpt-session', value, {
    //here itis false as we need proxy.ts to read it via req.cookies which works at the network level
    //but its fine to keep it readable by js as there is no sensitive data stored in it heh
    httpOnly: false,
    //just a security measure to prevent csrf attacks, not sure if the others are better
    sameSite: 'lax',
    path: '/',
    //i set it to 7 days for now, but you can change it to whatever you want
    maxAge: 60 * 60 * 24 * 7,
    //i guess in prod, we should set it to true to be more secure, but i will leave it as false for now
    secure: process.env.NODE_ENV === 'production',
  })
}

export async function clearSessionCookie() {
  const cookieStore = await cookies()
  cookieStore.delete('mpt-session')
}

//no need async as we are not calling await cookies()
export function getSessionFromRequest(req: NextRequest) {
  //if its undefined, it will just return undefined
  const raw = req.cookies.get('mpt-session')?.value
  // the proxy will treat this as not authenticated
  if (!raw) return null
  try {
    //the exact opp process compared to on top, decode from base64 -> bytes -> string
    return JSON.parse(Buffer.from(raw, 'base64').toString('utf-8'))
  } catch {
    //so proxy dont crash on mistakes lol
    return null
  }
}