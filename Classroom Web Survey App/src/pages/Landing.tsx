import { Link } from 'react-router-dom'

export default function Landing() {
  return (
    <main className="mx-auto flex min-h-screen max-w-xl flex-col items-center justify-center gap-6 p-6 text-center">
      <h1 className="text-4xl font-bold text-blue-800">Classroom Survey</h1>
      <p className="text-xl text-slate-700">Quick in-class understanding checks.</p>
      <Link to="/login" className="btn-primary px-8 text-lg">
        Instructor Login
      </Link>
    </main>
  )
}
