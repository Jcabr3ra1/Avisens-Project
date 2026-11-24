import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { Toaster } from 'sonner'
import { instalarProteccionInputsNumericos } from '@shared/utils/protegerInputsNumericos'
import App from './App'
import '@shared/styles/index.css'
import '@shared/styles/features.css'

instalarProteccionInputsNumericos()

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
    <Toaster
      position="top-right"
      richColors
    />
  </StrictMode>,
)
