import { BrowserRouter } from 'react-router-dom'
import AppRoutes from './routes'
import Confirmaciones from '@shared/ui/ConfirmarAccion/Confirmaciones'

function App() {
  return (
    <BrowserRouter>
      <AppRoutes />
      <Confirmaciones />
    </BrowserRouter>
  )
}

export default App
