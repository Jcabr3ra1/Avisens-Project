import { useEffect, useState, type FocusEvent } from 'react';
import avicultorImage from '../../assets/hero/avicultor.webp';
import pollosImage from '../../assets/hero/pollos-engorde.webp';
import comunidadImage from '../../assets/hero/comunidad.webp';
import './Hero.css';

const INTERVALO_CARRUSEL = 7500;

const slides = [
  { src: avicultorImage, label: 'Avicultor cuidando sus aves' },
  { src: pollosImage, label: 'Pollos de engorde en la granja' },
  { src: comunidadImage, label: 'Comunidad rural del Cauca' },
];

function Hero() {
  const [activeIndex, setActiveIndex] = useState(0);
  const [pausedByInteraction, setPausedByInteraction] = useState(false);
  const [reducedMotion, setReducedMotion] = useState(false);

  useEffect(() => {
    const media = window.matchMedia('(prefers-reduced-motion: reduce)');
    const syncPreference = () => setReducedMotion(media.matches);

    syncPreference();
    media.addEventListener('change', syncPreference);
    return () => media.removeEventListener('change', syncPreference);
  }, []);

  useEffect(() => {
    if (pausedByInteraction || reducedMotion) return;

    const interval = window.setInterval(() => {
      if (document.visibilityState === 'visible') {
        setActiveIndex((current) => (current + 1) % slides.length);
      }
    }, INTERVALO_CARRUSEL);

    return () => window.clearInterval(interval);
  }, [pausedByInteraction, reducedMotion, activeIndex]);

  function handleBlur(event: FocusEvent<HTMLElement>) {
    if (!event.currentTarget.contains(event.relatedTarget as Node | null)) {
      setPausedByInteraction(false);
    }
  }

  return (
    <section
      className="hero"
      aria-labelledby="hero-title"
      onFocusCapture={() => setPausedByInteraction(true)}
      onBlurCapture={handleBlur}
    >
      <div className="hero-carousel" aria-hidden="true">
        {slides.map((slide, index) => (
          <img
            key={slide.src}
            src={slide.src}
            alt=""
            className={`hero-slide${index === activeIndex ? ' is-active' : ''}`}
            loading={index === 0 ? 'eager' : 'lazy'}
            fetchPriority={index === 0 ? 'high' : 'auto'}
          />
        ))}
      </div>

      <div className="hero-bg-overlay" />

      <div className="hero-content">
        <h1 id="hero-title">
          <span>Cultivando</span>
          <span>un futuro</span>
          <span>sostenible</span>
        </h1>

        <p className="hero-aside">
          Cuidamos más que aves: ayudamos a construir un futuro mejor para las
          familias, las granjas y las comunidades del campo colombiano.
        </p>

<<<<<<< HEAD
        <div className="hero-copy">
          <h1>AVISENS</h1>

          <p className="hero-sub">
            Avicultura inteligente para el campo colombiano.
          </p>

          <div className="hero-ctas">
            <a href="#beneficios" className="btn-hero btn-hero-primary">
              Conocer Avisens
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.2"
                strokeLinecap="round"
                strokeLinejoin="round"
                width="18"
                height="18"
                aria-hidden="true"
              >
                <path d="M5 12h14M13 5l7 7-7 7" />
              </svg>
            </a>

            <a
              href="https://wa.me/573022358210?text=Hola%2C%20quiero%20conocer%20m%C3%A1s%20sobre%20Avisens"
              target="_blank"
              rel="noopener noreferrer"
              className="btn-hero btn-hero-secondary"
            >
              Hablar con nosotros
            </a>
          </div>
=======
        <div className="hero-bottom-left">
          <a href="#cifras" className="hero-about-link">
            <span aria-hidden="true" />
            Conocer AVISENS
          </a>
>>>>>>> b4c11d2b01646468d49d52878a548d1ea4ed3106
        </div>

        <a
          href="#cifras"
          className="hero-story-card"
          aria-label="Conocer cómo AVISENS acompaña cada granja"
        >
          <img
            src={pollosImage}
            alt="Pollos de engorde alrededor de un comedero"
            loading="lazy"
          />
          <span className="hero-story-icon" aria-hidden="true">
            <svg viewBox="0 0 24 24">
              <path d="m9 6 9 6-9 6z" />
            </svg>
          </span>
          <strong>De la granja a mejores decisiones</strong>
        </a>
      </div>

      <div
        className="hero-dots"
        role="group"
        aria-label="Seleccionar imagen del hero"
        onMouseEnter={() => setPausedByInteraction(true)}
        onMouseLeave={() => setPausedByInteraction(false)}
      >
        {slides.map((slide, index) => (
          <button
            key={slide.label}
            type="button"
            className={index === activeIndex ? 'is-active' : ''}
            onClick={() => setActiveIndex(index)}
            aria-label={`Mostrar ${slide.label}`}
            aria-current={index === activeIndex ? 'true' : undefined}
          />
        ))}
      </div>
    </section>
  );
}

export default Hero;
