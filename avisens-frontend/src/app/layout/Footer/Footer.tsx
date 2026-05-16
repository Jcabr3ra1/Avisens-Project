import './Footer.css'

const footerGroups = [
  {
    title: 'Producto',
    links: [
      ['Sensores IoT', '#sensores'],
      ['Health Score', '#health'],
      ['Funciones', '#features'],
      ['Planes', '#pricing'],
    ],
  },
  {
    title: 'Operación',
    links: [
      ['Alertas', '#problems'],
      ['Dispositivos', '#devices'],
      ['AVIA', '#chatbot'],
      ['FAQ', '#faq'],
    ],
  },
  {
    title: 'Contacto',
    links: [
      ['Ventas', '#pricing'],
      ['Soporte', '#faq'],
      ['WhatsApp', '#chatbot'],
      ['Ingresar', '/login'],
    ],
  },
]

function Footer() {
  return (
    <footer className="site-footer">
      <div className="footer-inner">
        <div className="footer-callout">
          <span>AVISENS para granjas conectadas</span>
          <a href="#pricing">Ver planes</a>
        </div>
        <div className="footer-top">
          <div className="footer-brand">
            <div className="footer-brand-head">
              <span className="footer-logo-mark">
                <img src="/views/avisens/img/logo.png" alt="" />
              </span>
              <span>
                <strong>AVISENS</strong>
                <small>IoT + IA para avicultura</small>
              </span>
            </div>
            <p>
              Plataforma SaaS para monitorear galpones, anticipar alertas y tomar decisiones con datos vivos de la granja.
            </p>
            <div className="footer-meta">
              <span>Colombia</span>
              <span>LATAM 2026</span>
            </div>
          </div>
          {footerGroups.map(({ title, links }) => (
            <div key={title} className="footer-col">
              <div className="footer-col-title">{title}</div>
              <ul className="footer-links">
                {links.map(([label, href]) => (
                  <li key={label}><a href={href}>{label}</a></li>
                ))}
              </ul>
            </div>
          ))}
        </div>
        <div className="footer-bottom">
          <div className="footer-copy">© 2026 AVISENS. Todos los derechos reservados.</div>
          <div className="footer-socials">
            <a href="#" className="soc-btn" aria-label="LinkedIn">
              <svg viewBox="0 0 24 24" fill="currentColor" width="15" height="15"><path d="M16 8a6 6 0 016 6v7h-4v-7a2 2 0 00-2-2 2 2 0 00-2 2v7h-4v-7a6 6 0 016-6zM2 9h4v12H2z"/><circle cx="4" cy="4" r="2"/></svg>
            </a>
            <a href="#" className="soc-btn" aria-label="X">
              <svg viewBox="0 0 24 24" fill="currentColor" width="15" height="15"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/></svg>
            </a>
            <a href="#" className="soc-btn" aria-label="WhatsApp">
              <svg viewBox="0 0 24 24" fill="currentColor" width="15" height="15"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>
            </a>
          </div>
        </div>
      </div>
    </footer>
  )
}

export default Footer
