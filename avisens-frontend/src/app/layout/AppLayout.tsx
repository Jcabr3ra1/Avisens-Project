import { Outlet } from 'react-router-dom'
import Navbar from './Navbar/Navbar'
import Footer from './Footer/Footer'
import FloatChat from './FloatChat/FloatChat'

function AppLayout() {
  return (
    <div className="flex flex-col min-h-screen">
      <Navbar />
      <div className="flex-1">
        <main className="relative z-[1]">
          <Outlet />
        </main>
      </div>
      <Footer />
      <FloatChat />
    </div>
  )
}

export default AppLayout
