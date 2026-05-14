import Hero from './components/Hero/Hero'
import Stats from './components/Stats/Stats'
import Problems from './components/Problems/Problems'
import Features from './components/Features/Features'
import HealthScore from './components/HealthScore/HealthScore'
import Devices from './components/Devices/Devices'
import Pricing from './components/Pricing/Pricing'
import ChatSection from './components/ChatSection/ChatSection'
import Testimonials from './components/Testimonials/Testimonials'
import FAQ from './components/FAQ/FAQ'
import CTAFinal from './components/CTAFinal/CTAFinal'
import './LandingPage.css'

function LandingPage() {
  return (
    <div className="landing-page">
      <div className="bg-layer" />
      <div className="grid-layer" />
      <Hero />
      <Stats />
      <Problems />
      <Features />
      <HealthScore />
      <Devices />
      <Pricing />
      <ChatSection />
      <Testimonials />
      <FAQ />
      <CTAFinal />
    </div>
  )
}

export default LandingPage
