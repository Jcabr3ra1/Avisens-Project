function Footer() {
  return (
    <footer className="px-6 lg:px-16 pt-12 pb-8 border-t border-border2 bg-bg2 relative z-[1]">
      <div className="max-w-[1200px] mx-auto">

        {/* Top */}
        <div className="grid grid-cols-2 md:grid-cols-[2fr_1fr_1fr_1fr] gap-8 md:gap-12 mb-10">

          {/* Brand */}
          <div>
            <img src="/views/avisens/img/logo.png" alt="AVISENS" className="h-[30px] mb-3" />
            <p className="text-[0.82rem] text-text3 leading-relaxed max-w-[240px] mt-1.5">
              Plataforma SaaS de gestión avícola inteligente para granjas en Latinoamérica.
            </p>
          </div>

          {[
            {
              title: 'Producto',
              links: ['Funciones', 'Health Score™', 'Precios', 'Changelog', 'Roadmap'],
            },
            {
              title: 'Empresa',
              links: ['Nosotros', 'Blog', 'Casos de éxito', 'Prensa', 'Trabaja con nosotros'],
            },
            {
              title: 'Soporte',
              links: ['Documentación', 'Centro de ayuda', 'Estado del sistema', 'Contacto', 'WhatsApp'],
            },
          ].map(({ title, links }) => (
            <div key={title}>
              <div className="font-['Space_Grotesk'] text-[0.82rem] font-semibold mb-4">{title}</div>
              <ul className="flex flex-col gap-2.5 list-none">
                {links.map((l) => (
                  <li key={l}>
                    <a href="#" className="text-[0.8rem] text-text3 no-underline transition-colors duration-200 hover:text-success">
                      {l}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        {/* Bottom */}
        <div className="flex justify-between items-center flex-wrap gap-4 pt-8 mt-4 border-t border-border2">
          <div className="text-[0.78rem] text-text3 font-['DM_Mono',monospace]">
            © 2026 AVISENS · Todos los derechos reservados · Colombia
          </div>
          <div className="flex gap-2.5">
            {[
              {
                label: 'LinkedIn',
                icon: <path d="M16 8a6 6 0 016 6v7h-4v-7a2 2 0 00-2-2 2 2 0 00-2 2v7h-4v-7a6 6 0 016-6zM2 9h4v12H2z"/>,
                extra: <circle cx="4" cy="4" r="2"/>,
              },
              {
                label: 'X',
                icon: <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>,
              },
              {
                label: 'WhatsApp',
                icon: <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>,
              },
            ].map(({ label, icon, extra }) => (
              <a
                key={label}
                href="#"
                aria-label={label}
                className="w-[34px] h-[34px] rounded-lg bg-card border border-border flex items-center justify-center text-text3 no-underline transition-all duration-200 hover:border-success hover:text-success2"
              >
                <svg viewBox="0 0 24 24" fill="currentColor" width="15" height="15">
                  {icon}
                  {extra}
                </svg>
              </a>
            ))}
          </div>
        </div>

      </div>
    </footer>
  )
}

export default Footer
