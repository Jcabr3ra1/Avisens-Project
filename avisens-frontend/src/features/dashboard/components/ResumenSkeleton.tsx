function ResumenSkeleton() {
  return (
    <div className="page-container dashboard-page rp-page" role="status" aria-busy="true" aria-label="Cargando el resumen">
      <div className="rp-esqueleto rp-esqueleto--hero" />
      <div className="rp-tablero">
        <div className="rp-col">
          <div className="rp-esqueleto rp-esqueleto--semaforo" />
          <div className="rp-esqueleto rp-esqueleto--tarjeta" />
        </div>
        <div className="rp-col">
          <div className="rp-esqueleto rp-esqueleto--lote" />
        </div>
      </div>
    </div>
  )
}

export default ResumenSkeleton
