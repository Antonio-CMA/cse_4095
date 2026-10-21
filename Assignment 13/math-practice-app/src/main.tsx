import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import { AppProvider } from './app/AppProvider.tsx'
import App from './app/App.tsx'
import { repairStoredData } from './services/dataRepair.ts'
import { reportStorageFailure } from './services/storageFailures.ts'
import { ensureSchema } from './services/storageMigrations.ts'

// Bring any saved data up to date, and put right anything damaged (one kind of
// data at a time), before anything reads it.
const schema = ensureSchema()
if (schema === 'unavailable') reportStorageFailure('unavailable')
const dataProblems = repairStoredData(schema)

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <AppProvider dataProblems={dataProblems}>
      <App />
    </AppProvider>
  </StrictMode>,
)
