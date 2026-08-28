import Navbar from './components/Navbar/Navbar'
import Hero from './components/Hero/Hero'
import Beneficios from './components/Beneficios/Beneficios'
import Sensores from './components/Sensores/Sensores'
import Footer from './components/Footer/Footer'
import FloatChat from './components/FloatChat/FloatChat'
import './LandingPage.css'

function LandingPage() {
  return (
    <div className="landing-shell">
      <div className="landing-page">
        <div className="bg-layer" />
        <div className="grid-layer" />

        <Navbar />

        <div className="landing-hero-frame">
          <Hero />
        </div>

        <Beneficios />
        <Sensores />
      </div>
      <Footer />
      <FloatChat />
    </div>
  )
}

export default LandingPage
