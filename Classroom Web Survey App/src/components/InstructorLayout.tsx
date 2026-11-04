import { Link, Navigate, Outlet, useNavigate } from 'react-router-dom'
import { useAuth } from '../lib/AuthContext'
import { Loading } from './ui'

/** Protected shell for all instructor pages: redirects to /login when signed out. */
export default function InstructorLayout() {
  const { session, loading, signOut } = useAuth()
  const navigate = useNavigate()

  if (loading) return <Loading label="Checking login..." />
  if (!session) return <Navigate to="/login" replace />

  return (
    <div className="min-h-screen">
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:absolute focus:left-2 focus:top-2 focus:z-50 focus:rounded focus:bg-white focus:p-2"
      >
        Skip to content
      </a>
      <header className="border-b border-slate-300 bg-white print:hidden">
        <div className="mx-auto flex max-w-5xl flex-wrap items-center justify-between gap-3 px-4 py-3">
          <Link to="/dashboard" className="text-xl font-bold text-blue-800">
            Classroom Survey
          </Link>
          <div className="flex flex-wrap items-center gap-3">
            <span className="text-sm text-slate-700">Signed in as {session.user.email}</span>
            <Link to="/surveys/new" className="btn-primary">
              New Survey
            </Link>
            <button
              className="btn-secondary"
              onClick={async () => {
                await signOut()
                navigate('/login', { replace: true })
              }}
            >
              Logout
            </button>
          </div>
        </div>
      </header>
      <main id="main" className="mx-auto max-w-5xl px-4 py-6">
        <Outlet />
      </main>
    </div>
  )
}
