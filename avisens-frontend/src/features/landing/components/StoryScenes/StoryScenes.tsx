import { Link } from 'react-router-dom'
import { IcArrowRight, IcNote, IcChart, IcCheck, IcLeaf } from '@shared/ui/icons/icons'
import { storyMedia, storySteps } from '../../model/landingContent'
import StoryMedia from '../StoryMedia/StoryMedia'
import './StoryScenes.css'

const stepIcons = [IcNote, IcChart, IcCheck]

export default function StoryScenes() {
  return (
    <>
      <section className="av-about av-section" id="quienes-somos" data-chapter aria-labelledby="av-about-title">
        <div className="av-about-heading" data-story-reveal>
          <h2 id="av-about-title">Estamos del lado<br />de quien <span>cuida.</span></h2>
          <p>Antes que los datos, están las personas. Las que madrugan, recorren el galpón y conocen el valor de cada día de trabajo.</p>
        </div>
        <div className="av-about-body">
          <figure className="av-people-photo av-photo-window">
            <div className="av-parallax-layer" data-story-parallax><StoryMedia media={storyMedia.people} /></div>
            <figcaption>El campo y su gente son nuestra razón de ser.</figcaption>
          </figure>
          <div className="av-about-copy" data-story-reveal>
            <h3>Quiénes somos</h3>
            <p>Avisens es un proyecto colombiano de formación SENA enfocado en la gestión avícola. Trabajamos en una idea concreta: que la información del galpón sea útil para las personas que lo sostienen.</p>
            <p>Queremos acercar el registro del día a día a las decisiones de cada ciclo. Con menos información dispersa y más contexto para entender lo que pasa en la granja.</p>
            <a className="av-text-link" href="#como-acompanamos">Así toma forma nuestro propósito <IcArrowRight size={18} /></a>
          </div>
        </div>
      </section>

      <section className="av-field-scene av-scene" aria-labelledby="av-field-title">
        <div className="av-field-photo av-photo-window">
          <div className="av-parallax-layer" data-story-parallax><StoryMedia media={storyMedia.farm} /></div>
          <div className="av-field-shade" aria-hidden="true" />
          <div className="av-field-copy" data-story-reveal>
            <h2 id="av-field-title">Cada jornada deja<br />algo que aprender.</h2>
            <p>Cuánto alimento se usó. Cómo crece el lote. Qué cambió desde ayer.<br />Detalles pequeños que, juntos, ayudan a ver la granja completa.</p>
          </div>
        </div>
      </section>

      <section className="av-record-scene av-scene" id="como-acompanamos" data-chapter data-record-scene aria-labelledby="av-record-title">
        <div className="av-stage av-record-stage">
          <div className="av-record-intro">
            <h2 id="av-record-title">De lo que pasa<br />a lo que <span>entiendes.</span></h2>
            <ol className="av-story-steps">
              {storySteps.map(step => (
                <li key={step.name} data-story-step data-active="true">
                  <span className="av-step-name">{step.name}</span>
                  <h3>{step.title}</h3>
                  <p>{step.text}</p>
                </li>
              ))}
            </ol>
          </div>
          <figure className="av-journal">
            <div className="av-journal-heading">
              <span className="av-journal-mark" aria-hidden="true"><IcLeaf size={24} /></span>
              <div><span>Tu granja, en contexto</span><strong>Una jornada.<br />Una historia completa.</strong></div>
            </div>
            <div className="av-journal-records">
              {storySteps.map((step, index) => {
                const Icon = stepIcons[index]
                return (
                  <div className="av-journal-record" key={step.name} data-record data-active="true">
                    <span className="av-record-icon" aria-hidden="true"><Icon size={22} /></span>
                    <div><strong>{step.record}</strong><span>{step.detail}</span></div>
                    <IcCheck size={17} />
                  </div>
                )
              })}
            </div>
            <figcaption>Recorrido ilustrativo: del registro a la decisión.</figcaption>
          </figure>
        </div>
      </section>

      <section className="av-purpose av-section" id="nuestro-proposito" data-chapter aria-labelledby="av-purpose-title">
        <div className="av-purpose-statement" data-story-reveal>
          <h2 id="av-purpose-title">La tecnología tiene sentido cuando te acerca a <span>lo que cuidas.</span></h2>
          <div className="av-purpose-foot">
            <p>Ese es nuestro propósito: que llevar la información de la granja sea una ayuda para tu trabajo, desde el primer registro hasta la revisión de cada ciclo.</p>
            <span aria-hidden="true"><IcLeaf size={44} /></span>
          </div>
        </div>
      </section>

      <section className="av-future av-section" aria-labelledby="av-future-title">
        <div className="av-future-heading" data-story-reveal>
          <h2 id="av-future-title">Una visión que crece<br /><span>con el campo.</span></h2>
        </div>
        <div className="av-future-copy" data-story-reveal>
          <p>Estamos construyendo Avisens para que más productores puedan trabajar con información clara, seguir sus lotes y planear con mayor contexto.</p>
          <p>Empezamos por algo esencial: reunir lo que ocurre cada día. Nuestro camino es convertir esa información en una herramienta cada vez más útil para entender, planear y cuidar.</p>
          <p className="av-future-invitation">La mejor manera de seguir construyendo es escuchar a quienes viven la granja.</p>
        </div>
      </section>

      <section className="av-contact av-section" id="conversemos" data-chapter aria-labelledby="av-contact-title">
        <div data-story-reveal>
          <h2 id="av-contact-title">Hablemos de<br /><span>tu granja.</span></h2>
          <div className="av-contact-bottom">
            <p>Cada granja tiene su forma de trabajar.<br />Nos gustaría conocer la tuya.</p>
            <Link className="av-button av-button--maize" to="/contacto">Conversemos <IcArrowRight size={20} /></Link>
          </div>
        </div>
      </section>
    </>
  )
}
