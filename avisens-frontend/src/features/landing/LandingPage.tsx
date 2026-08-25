import Hero from './components/Hero/Hero'
import Stats from './components/Stats/Stats'
import './LandingPage.css'

function LandingPage() {
  return (
    <div className="landing-page">
      <div className="bg-layer" />
      <div className="grid-layer" />
      <Hero />
      <Stats />
    </div>
  )
}

export default LandingPage
