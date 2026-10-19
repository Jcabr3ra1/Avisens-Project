import { IcArrowRight, IcArrowDown } from '@shared/ui/icons/icons'
import StoryMedia from '../StoryMedia/StoryMedia'
import { storyMedia } from '../../model/landingContent'
import './Hero.css'

export default function Hero() {
  return (
    <section className="av-opening av-scene" data-opening-scene aria-labelledby="av-opening-title">
      <div className="av-stage">
        <div className="av-opening-media" data-opening-media>
          <StoryMedia media={storyMedia.opening} priority />
        </div>
        <div className="av-opening-shade" aria-hidden="true" />
        <div className="av-opening-copy" data-opening-copy>
          <h1 id="av-opening-title">Detrás de cada granja,<br /><span>hay una historia.</span></h1>
          <div className="av-opening-bottom">
            <p>Somos Avisens. Creamos una forma más clara de llevar la información de tu granja, para que puedas concentrarte en lo que cuidas.</p>
            <a className="av-button av-button--maize" href="#quienes-somos">Conoce nuestra historia <IcArrowRight size={18} /></a>
          </div>
        </div>
        <a className="av-opening-scroll" href="#quienes-somos"><IcArrowDown size={16} /><span>La historia continúa abajo</span></a>
      </div>
    </section>
  )
}
