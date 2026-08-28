/**
 * Convierte CORS_ORIGIN en lo que espera enableCors.
 *
 * Una entrada puede llevar `*` como comodin. Hace falta porque Vercel crea un
 * subdominio distinto en cada despliegue de previsualizacion: sin comodin,
 * cada rama tendria el chat roto por CORS y el fallo se ve solo en la consola
 * del navegador, no en los logs del servidor.
 *
 * El comodin sustituye a UNA etiqueta del dominio, no a varias: por eso
 * `avisens-*.vercel.app` acepta `avisens-abc.vercel.app` pero no
 * `avisens-x.otro.vercel.app`. Y como el patron va anclado, tampoco cuela
 * `avisens-x.vercel.app.malo.com`.
 */
export function origenesPermitidos(
  corsOrigin?: string,
): Array<string | RegExp> | true {
  const entradas = (corsOrigin ?? '')
    .split(',')
    .map((o) => o.trim())
    .filter(Boolean);

  // Sin valor solo se llega en desarrollo: env.validation lo exige en produccion.
  if (!entradas.length) return true;

  return entradas.map((o) =>
    o.includes('*')
      ? new RegExp(
          `^${o.replace(/[.+?^${}()|[\]\\]/g, '\\$&').replace(/\*/g, '[^.]*')}$`,
        )
      : o,
  );
}
