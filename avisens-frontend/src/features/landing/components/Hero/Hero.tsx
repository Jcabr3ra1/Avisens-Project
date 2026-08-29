import { useEffect, useState, type FocusEvent } from 'react';
import { Link } from 'react-router-dom';
import avicultorImage from '../../assets/hero/avicultor.webp';
import pollosImage from '../../assets/hero/pollos-engorde.webp';
import comunidadImage from '../../assets/hero/comunidad.webp';
import './Hero.css';

const INTERVALO_CARRUSEL = 7500;

const slides = [
  {
    src: avicultorImage,
    label: 'Avicultor cuidando sus aves',
    aside: 'Hacemos más fácil el manejo de tu galpón.',
  },
  {
    src: pollosImage,
    label: 'Pollos de engorde en la granja',
    aside:
      'Tú conoces tu galpón. AVISENS te ayuda a tenerlo todo más organizado y bajo control.',
  },
  {
    src: comunidadImage,
    label: 'Comunidad rural del Cauca',
    aside:
      'Cuidamos más que aves: ayudamos a construir un futuro mejor para las familias, las granjas y las comunidades del campo colombiano.',
  },
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

        <p key={activeIndex} className="hero-aside">
          {slides[activeIndex].aside}
        </p>

        <div className="hero-bottom-left">
          <Link to="/contacto" className="hero-about-link">
            <span aria-hidden="true" />
            Solicitar acompañamiento
          </Link>
          <a href="#beneficios" className="hero-about-link">
            <span aria-hidden="true" />
            Conocer AVISENS
          </a>
        </div>

        <a
          href="#beneficios"
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
