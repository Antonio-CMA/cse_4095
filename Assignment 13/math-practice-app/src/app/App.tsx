import { createBrowserRouter, RouterProvider } from 'react-router'
import { RouteError } from '../components/common/RouteError'
import { AppRoutes } from './AppRoutes'

// A data router (rather than <BrowserRouter>) is what lets the practice page
// stop an accidental trip away from a session in progress.
const router = createBrowserRouter([
  { path: '*', element: <AppRoutes />, errorElement: <RouteError /> },
])

function App() {
  return <RouterProvider router={router} />
}

export default App
