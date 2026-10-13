export interface Bloqueador {
  pid: number;
  app: string;
  esperando: boolean;
}

export interface NodoDeEspera {
  app: string;
  pid: number;
  consulta: string;
  bloqueadores: Bloqueador[];
}

export interface EsperaEsperada {
  app: string;
  bloqueadoPor: string[];
  consulta?: RegExp;
}

export interface ConsultadorDeGrafo {
  query<R = any>(sql: string, parametros?: unknown[]): Promise<{ rows: R[] }>;
}

export const APLICACIONES_DE_PRUEBA = 'e2e-%';

export async function grafoDeEspera(
  observador: ConsultadorDeGrafo,
): Promise<NodoDeEspera[]> {
  const { rows } = await observador.query<NodoDeEspera>(
    `SELECT a.application_name AS app, a.pid,
            left(regexp_replace(a.query, '\\s+', ' ', 'g'), 200) AS consulta,
            COALESCE((
              SELECT json_agg(json_build_object(
                       'pid', b.pid,
                       'app', b.application_name,
                       'esperando', b.wait_event_type = 'Lock')
                     ORDER BY b.application_name, b.pid)
                FROM pg_stat_activity b
               WHERE b.pid = ANY(pg_blocking_pids(a.pid))
            ), '[]'::json) AS bloqueadores
       FROM pg_stat_activity a
      WHERE a.wait_event_type = 'Lock' AND a.application_name LIKE $1
      ORDER BY a.application_name, a.pid`,
    [APLICACIONES_DE_PRUEBA],
  );
  return rows;
}

const ordenadas = (apps: string[]) => [...apps].sort();

export function discrepanciasDelGrafo(
  grafo: NodoDeEspera[],
  esperado: EsperaEsperada[],
): string[] {
  const discrepancias: string[] = [];
  const esperadas = new Set(esperado.map((e) => e.app));
  for (const espera of esperado) {
    const nodos = grafo.filter((n) => n.app === espera.app);
    if (nodos.length !== 1) {
      discrepancias.push(
        `se esperaba exactamente un proceso de ${espera.app} esperando y hay ${nodos.length}`,
      );
      continue;
    }
    const reales = ordenadas(nodos[0].bloqueadores.map((b) => b.app));
    const previstos = ordenadas(espera.bloqueadoPor);
    if (JSON.stringify(reales) !== JSON.stringify(previstos)) {
      discrepancias.push(
        `${espera.app} está bloqueado por ${JSON.stringify(reales)} y se esperaba ${JSON.stringify(previstos)}`,
      );
    }
    if (espera.consulta && !espera.consulta.test(nodos[0].consulta)) {
      discrepancias.push(
        `la consulta en espera de ${espera.app} («${nodos[0].consulta}») no coincide con ${espera.consulta}`,
      );
    }
  }
  for (const nodo of grafo) {
    if (!esperadas.has(nodo.app)) {
      discrepancias.push(`espera inesperada de ${nodo.app} (pid ${nodo.pid})`);
    }
  }
  return discrepancias;
}

export async function esperarGrafo(
  observador: ConsultadorDeGrafo,
  esperado: EsperaEsperada[],
  limiteMs = 8000,
  intervaloMs = 20,
): Promise<NodoDeEspera[]> {
  const fin = Date.now() + limiteMs;
  let grafo: NodoDeEspera[] = [];
  let discrepancias: string[] = [];
  while (Date.now() < fin) {
    const actual = await grafoDeEspera(observador);
    const actuales = discrepanciasDelGrafo(actual, esperado);
    if (actuales.length === 0) return actual;
    if (
      discrepancias.length === 0 ||
      (actual.length > 0 && actuales.length < discrepancias.length)
    ) {
      grafo = actual;
      discrepancias = actuales;
    }
    await new Promise((resolver) => setTimeout(resolver, intervaloMs));
  }
  throw new Error(
    `el grafo de espera no coincidió en ${limiteMs} ms:\n- ${discrepancias.join('\n- ')}\ngrafo observado: ${JSON.stringify(
      grafo.map((n) => ({
        app: n.app,
        bloqueadoPor: n.bloqueadores.map((b) => b.app),
        consulta: n.consulta.slice(0, 80),
      })),
    )}`,
  );
}
