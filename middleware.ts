import { NextRequest, NextResponse } from 'next/server'
import { getSessionFromRequest } from '@/lib/session'

  export function middleware(req: NextRequest) {
    const session = getSessionFromRequest(req)
    const { pathname } = req.nextUrl

    //public routes anyone can access
    const isPublic = pathname === '/login' || pathname === '/register'
    //if no sesh then redirect to login
    if (!session && !isPublic) {
      return NextResponse.redirect(new URL('/login', req.url))
    }

    //if sesh and public then redirect to home
    if (session && isPublic) {
      return NextResponse.redirect(new URL('/', req.url))
    }
    //anything else just continue
    return NextResponse.next()
  }

  export const config = {
    matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
  }