import { lazy, Suspense } from 'react'
import { BrowserRouter, Link, Route, Routes } from 'react-router-dom'
import { AuthProvider } from './lib/AuthContext'
import { isConfigured } from './lib/supabase'
import InstructorLayout from './components/InstructorLayout'
import { ConfigMissing, Loading } from './components/ui'
import Landing from './pages/Landing'
import Login from './pages/Login'
const Dashboard = lazy(() => import('./pages/Dashboard'))
const SurveyEditor = lazy(() => import('./pages/SurveyEditor'))
const Present = lazy(() => import('./pages/Present'))
const Results = lazy(() => import('./pages/Results'))
import StudentSurvey from './pages/StudentSurvey'

function NotFound() {
  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col items-center justify-center gap-4 p-6 text-center">
      <h1 className="text-3xl font-bold">Page not found</h1>
      <Link to="/" className="text-blue-800 underline">
        Go home
      </Link>
    </main>
  )
}

export default function App() {
  if (!isConfigured) return <ConfigMissing />
  return (
    <BrowserRouter>
      <AuthProvider>
        <Suspense fallback={<Loading />}>
          <Routes>
            <Route path="/" element={<Landing />} />
            <Route path="/login" element={<Login />} />
            <Route path="/s/:slug" element={<StudentSurvey />} />
            <Route element={<InstructorLayout />}>
              <Route path="/dashboard" element={<Dashboard />} />
              <Route path="/surveys/new" element={<SurveyEditor />} />
              <Route path="/surveys/:id/edit" element={<SurveyEditor key="edit" />} />
              <Route path="/surveys/:id/present" element={<Present />} />
              <Route path="/surveys/:id/results" element={<Results />} />
            </Route>
            <Route path="*" element={<NotFound />} />
          </Routes>
        </Suspense>
      </AuthProvider>
    </BrowserRouter>
  )
}
