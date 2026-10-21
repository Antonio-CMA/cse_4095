import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import { AppProvider } from './app/AppProvider.tsx'
import App from './app/App.tsx'
import { ensureSchema } from './services/storageMigrations.ts'

// Bring any saved data up to date before anything reads it.
ensureSchema()

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <AppProvider>
      <App />
    </AppProvider>
  </StrictMode>,
)
