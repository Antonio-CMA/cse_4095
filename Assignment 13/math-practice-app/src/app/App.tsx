import { createBrowserRouter, RouterProvider } from 'react-router'
import { RouteError } from '../components/common/RouteError'
import { AppRoutes } from './AppRoutes'

// A data router (rather than <BrowserRouter>) is what lets the practice page
// stop an accidental trip away from a session in progress.
//
// The app can be hosted below a folder (a web address such as /math/): the
// build's base path (VITE_BASE, "/" by default) is the router's base too.
const router = createBrowserRouter(
  [{ path: '*', element: <AppRoutes />, errorElement: <RouteError /> }],
  { basename: import.meta.env.BASE_URL },
)

function App() {
  return <RouterProvider router={router} />
}

export default App
