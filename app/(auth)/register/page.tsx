'use client'
  import { useActionState } from 'react'
  import { register } from '@/actions/auth'

  export default function RegisterPage() {
    const [state, action, pending] = useActionState(register, undefined)

    return (
      <main className="flex flex-col items-center justify-center min-h-screen bg-slate-900">
        <div className="bg-slate-800 rounded-xl p-8 w-full max-w-sm border border-slate-700">
          <h1 className="text-2xl font-bold text-slate-100 mb-6">Register</h1>

          <form action={action} className="flex flex-col gap-4">
            <input
              name="userName"
              type="text"
              placeholder="Full Name"
              required
              className="bg-slate-700 text-white rounded-lg p-3"
            />
            <input
              name="email"
              type="email"
              placeholder="Email"
              required
              className="bg-slate-700 text-white rounded-lg p-3"
            />
            <input
              name="password"
              type="password"
              placeholder="Password"
              required
              className="bg-slate-700 text-white rounded-lg p-3"
            />
            <select
              name="role"
              className="bg-slate-700 text-white rounded-lg p-3"
            >
              <option value="worker">Worker</option>
              <option value="manager">Manager</option>
            </select>

            {state?.errors?.general && (
              <p className="text-red-400 text-sm">{state.errors.general}</p>
            )}

            <button
              type="submit"
              disabled={pending}
              className="bg-blue-600 text-white font-bold py-3 rounded-lg hover:bg-blue-700 disabled:opacity-50"
            >
              {pending ? 'Registering...' : 'Register'}
            </button>
          </form>

          <p className="text-slate-400 text-sm mt-4 text-center">
            Already have an account? <a href="/login" className="text-blue-400 underline">Login</a>
          </p>
        </div>
      </main>
    )
  }