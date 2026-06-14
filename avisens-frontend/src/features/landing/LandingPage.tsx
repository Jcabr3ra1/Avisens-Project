import Hero from './components/Hero/Hero'
import Stats from './components/Stats/Stats'
import Sensors from './components/Sensors/Sensors'
import Problems from './components/Problems/Problems'
import Features from './components/Features/Features'
import HealthScore from './components/HealthScore/HealthScore'
import Telemetria from './components/Telemetria/Telemetria'
import Devices from './components/Devices/Devices'
import ChatSection from './components/ChatSection/ChatSection'
import FAQ from './components/FAQ/FAQ'
import './LandingPage.css'

function LandingPage() {
  return (
    <div className="landing-page">
      <div className="bg-layer" />
      <div className="grid-layer" />
      <Hero />
      <Stats />
      <Telemetria />
      <Sensors />
      <Problems />
      <Features />
      <HealthScore />
      <Devices />
      <ChatSection />
      <FAQ />
    </div>
  )
}

export default LandingPage
