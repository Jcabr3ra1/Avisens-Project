// Esqueleto de carga: mantiene la forma de la página en vez de un spinner
// que tapa todo y no dice qué va a aparecer.
function EsqueletoGranjas() {
  return (
    <div className="gr-esqueleto" aria-busy="true" aria-label="Cargando la estructura de granjas">
      <div className="gr-hueso gr-hueso--cabecera" />
      <div className="gr-hueso gr-hueso--resumen" />
      {[0, 1, 2].map((indice) => (
        <div key={indice} className="gr-hueso gr-hueso--galpon" />
      ))}
    </div>
  )
}

export default EsqueletoGranjas
