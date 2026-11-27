import { MotionConfig } from 'motion/react'
import Escenas from './escenas/Escenas'
import FloatChat from './components/FloatChat/FloatChat'
import './LandingPage.css'

export default function LandingPage() {
  return (
    <MotionConfig reducedMotion="user">
      <div className="landing-shell av-landing">
        <Escenas />
        <FloatChat />
      </div>
    </MotionConfig>
  )
}
