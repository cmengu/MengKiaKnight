export default function PendingApprovalPage() {
  return (
    <main className="flex flex-col items-center justify-center min-h-screen bg-slate-900">
      <div className="bg-slate-800 rounded-xl p-8 w-full max-w-sm border border-slate-700 text-center">
        <div className="text-4xl mb-4">⏳</div>
        <h1 className="text-2xl font-bold text-slate-100 mb-3">Awaiting Approval</h1>
        <p className="text-slate-400 text-sm mb-6">
          Your account has been created. A manager needs to approve it
          before you can log in — check back soon.
        </p>
        <a href="/login" className="text-blue-400 underline text-sm">Back to login</a>
      </div>
    </main>
  )
}
