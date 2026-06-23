'use client'
  import { useActionState } from 'react'
  import { login } from '@/app/actions/auth'

  export default function LoginPage() {
    const [state, action, pending] = useActionState(login, undefined)

    return (
      <main className="flex flex-col items-center justify-center min-h-screen bg-slate-900">
        <div className="bg-slate-800 rounded-xl p-8 w-full max-w-sm border border-slate-700">
          <h1 className="text-2xl font-bold text-slate-100 mb-6">Login</h1>

          <form action={action} className="flex flex-col gap-4">
            <input
              name="email"
              type="email"
              placeholder="Email"
              className="bg-slate-700 text-white rounded-lg p-3"
            />
            <input
              name="password"
              type="password"
              placeholder="Password"
              className="bg-slate-700 text-white rounded-lg p-3"
            />

            {state?.errors?.general && (
              <p className="text-red-400 text-sm">{state.errors.general}</p>
            )}
  
            <button
              type="submit"
              disabled={pending}
              className="bg-blue-600 text-white font-bold py-3 rounded-lg hover:bg-blue-700 disabled:opacity-50"
            >
              {pending ? 'Logging in...' : 'Login'}
            </button>
          </form>

          <p className="text-slate-400 text-sm mt-4 text-center">
            No account? <a href="/register" className="text-blue-400 underline">Register</a>
          </p>
        </div>
      </main>
    )
  }