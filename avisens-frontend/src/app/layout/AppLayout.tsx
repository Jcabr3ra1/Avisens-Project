import { Outlet } from 'react-router-dom'
import Navbar from './Navbar/Navbar'
import Footer from './Footer/Footer'
import FloatChat from './FloatChat/FloatChat'
import './AppLayout.css'

function AppLayout() {
  return (
    <div className="app-layout">
      <Navbar />
      <div className="app-content">
        <main className="app-main">
          <Outlet />
        </main>
      </div>
      <Footer />
      <FloatChat />
    </div>
  )
}

export default AppLayout
