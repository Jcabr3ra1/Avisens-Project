import { useEffect, useState, type FocusEvent } from 'react';
import avicultorImage from '../../assets/hero/avicultor.webp';
import pollosImage from '../../assets/hero/pollos-engorde.webp';
import comunidadImage from '../../assets/hero/comunidad.webp';
import './Hero.css';

const INTERVALO_CARRUSEL = 7500;

// `titulo` es el titular grande y `aside` el texto de la esquina superior
// derecha mientras la foto está activa.
const slides = [
  {
    src: avicultorImage,
    label: 'Avicultor cuidando sus aves',
    titulo: 'Cultivando un futuro sostenible',
    aside:
      'Te ayudamos a cuidar mejor tus aves, aprovechar el alimento y sacar lotes más sanos y rentables.',
  },
  {
    src: comunidadImage,
    label: 'Comunidad rural del Cauca',
    titulo: 'Hacemos más fácil el manejo de tu galpón',
    aside:
      'Anotas el alimento, las bajas y las vacunas desde el celular, y te mostramos cómo va tu lote día a día.',
  },
  {
    src: pollosImage,
    label: 'Pollos de engorde en la granja',
    titulo: 'Tú conoces tu galpón. AVISENS te ayuda a tenerlo bajo control.',
    aside:
      'Nuestros sensores vigilan la temperatura, la humedad y el aire, y te avisan cuando algo no está bien.',
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
        <h1 key={activeIndex} id="hero-title">
          {slides[activeIndex].titulo}
        </h1>

        <p key={`aside-${activeIndex}`} className="hero-aside">
          {slides[activeIndex].aside}
        </p>

        <div className="hero-bottom-left">
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
