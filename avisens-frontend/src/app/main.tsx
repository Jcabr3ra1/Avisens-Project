import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { Toaster } from 'sonner'
import App from './App'
import '@shared/styles/index.css'
import '@shared/styles/features.css'
import AnimacionAvisens from '@shared/ui/Animacion/AnimacionAvisens'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
    <Toaster
      position="top-right"
      richColors
      icons={{ success: <AnimacionAvisens nombre="exito" modo="una-vez" tamano={22} velocidad={1.2} /> }}
    />
  </StrictMode>,
)
