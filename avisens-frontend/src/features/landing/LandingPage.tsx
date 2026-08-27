import Navbar from './components/Navbar/Navbar'
import Hero from './components/Hero/Hero'
import Stats from './components/Stats/Stats'
import Footer from './components/Footer/Footer'
import FloatChat from './components/FloatChat/FloatChat'
import './LandingPage.css'

function LandingPage() {
  return (
    <>
      <div className="landing-page">
        <div className="bg-layer" />
        <div className="grid-layer" />

        <Navbar />

        <div className="landing-hero-frame">
          <Hero />
        </div>

        <Stats />
      </div>
      <Footer />
      <FloatChat />
    </>
  )
}

export default LandingPage
