import './Footer.css'
import logoAvisens from '@shared/assets/logo-avisens.png'

const footerGroups = [
  {
    title: 'Producto',
    links: [
      ['Cómo ayuda', '#beneficios'],
    ],
  },
  {
    title: 'Contacto',
    links: [
      ['Contáctanos', 'https://wa.me/573022358210?text=Hola%2C%20quiero%20saber%20m%C3%A1s%20sobre%20AVISENS'],
      ['Ingresar', '/login'],
    ],
  },
]

function Footer() {
  return (
    <footer className="site-footer">
      <div className="footer-inner">
        <div className="footer-top">
          <div className="footer-brand">
            <div className="footer-brand-head">
              <span className="footer-logo-mark">
                <img src={logoAvisens} alt="" />
              </span>
              <span>
                <strong>AVISENS</strong>
                <small>La app que cuida tu granja contigo</small>
              </span>
            </div>
            <p>
              Te avisa a tiempo, te ayuda a llevar las cuentas de la granja y te deja decidir con la cabeza fría — todo desde el celular.
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
        </div>
      </div>
    </footer>
  )
}

export default Footer
