import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App'
import { DemoProvider } from './demoState'
import { EvidenceCenterProvider } from './evidenceCenter'
import { TeachingOperationsProvider } from './teachingOperations'
import './styles.css'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <DemoProvider>
      <EvidenceCenterProvider>
        <TeachingOperationsProvider>
          <App />
        </TeachingOperationsProvider>
      </EvidenceCenterProvider>
    </DemoProvider>
  </StrictMode>,
)
