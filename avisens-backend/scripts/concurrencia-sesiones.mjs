// Pruebas de concurrencia real contra Postgres para la rotación/revocación
// de sesiones (auth.service.ts). Se corre contra un Postgres DESECHABLE
// (ver test-concurrencia-sesiones.sh) -- nunca contra avisens-project.
//
// El bloqueo de verdad se confirma con pg_blocking_pids/pg_stat_activity,
// no con que una promesa de JS tarde en resolver: eso último no prueba que
// Postgres esté bloqueando nada, solo que la promesa no resolvió todavía.

import pg from 'pg';

const { Client } = pg;

const CONEXION = process.env.DATABASE_URL;
if (!CONEXION) {
  console.error('ERROR: falta DATABASE_URL (debe apuntar a la base desechable).');
  process.exit(1);
}

function conTimeout(promesa, ms, etiqueta) {
  let temporizador;
  const timeout = new Promise((_, reject) => {
    temporizador = setTimeout(() => reject(new Error(`TIMEOUT: ${etiqueta} no terminó en ${ms}ms`)), ms);
  });
  return Promise.race([promesa, timeout]).finally(() => clearTimeout(temporizador));
}

async function esperarHastaQue(condicionAsync, { intentos = 50, intervaloMs = 20, etiqueta }) {
  for (let i = 0; i < intentos; i++) {
    if (await condicionAsync()) return true;
    await new Promise((r) => setTimeout(r, intervaloMs));
  }
  throw new Error(`BARRERA NO ALCANZADA: ${etiqueta} tras ${intentos} intentos (${intentos * intervaloMs}ms acotados)`);
}

async function esperarBloqueo(monitor, pidEsperaPor, pidQueBloquea, etiqueta) {
  return esperarHastaQue(async () => {
    const res = await monitor.query('SELECT pg_blocking_pids(pid) AS b FROM pg_stat_activity WHERE pid = $1', [
      pidEsperaPor,
    ]);
    return res.rowCount > 0 && Array.isArray(res.rows[0].b) && res.rows[0].b.includes(pidQueBloquea);
  }, { etiqueta });
}

async function nuevoCliente() {
  const c = new Client({ connectionString: CONEXION });
  await c.connect();
  return c;
}

async function pid(cliente) {
  const r = await cliente.query('SELECT pg_backend_pid() AS pid');
  return r.rows[0].pid;
}

const SESSION_ID = '99999999-9999-4999-8999-999999999999';
const USUARIO_ID = 1;
const HASH_INICIAL = 'hash-inicial-de-la-prueba';

async function resetearFila(cliente) {
  await cliente.query(
    `UPDATE sesiones SET refresh_token_hash = $1, revocada = false, expira_en = now() + interval '7 days'
     WHERE session_id = $2`,
    [HASH_INICIAL, SESSION_ID],
  );
}

// --- Escenario 1: dos refresh concurrentes, mismo hash vigente -------------
// Reproduce el UPDATE condicional exacto de auth.service.ts#refresh().
async function escenarioRefreshVsRefresh() {
  console.log('\n########## Escenario 1: refresh vs refresh (mismo hash) ##########');
  const t1 = await nuevoCliente();
  const t2 = await nuevoCliente();
  const monitor = await nuevoCliente();
  try {
    await resetearFila(monitor);
    const pid1 = await pid(t1);
    const pid2 = await pid(t2);

    await t1.query('BEGIN');
    const r1 = await t1.query(
      `UPDATE sesiones SET refresh_token_hash = $1
       WHERE session_id = $2 AND usuario_id = $3 AND refresh_token_hash = $4
         AND revocada = false AND expira_en > now() RETURNING id`,
      ['hash-nuevo-de-peticion-1', SESSION_ID, USUARIO_ID, HASH_INICIAL],
    );
    assert(r1.rowCount === 1, 'T1 (sin commit) debía afectar 1 fila');

    await t2.query('BEGIN');
    const p2 = t2.query(
      `UPDATE sesiones SET refresh_token_hash = $1
       WHERE session_id = $2 AND usuario_id = $3 AND refresh_token_hash = $4
         AND revocada = false AND expira_en > now() RETURNING id`,
      ['hash-nuevo-de-peticion-2', SESSION_ID, USUARIO_ID, HASH_INICIAL],
    );
    await esperarBloqueo(monitor, pid2, pid1, 'T2 (refresh) bloqueada por T1 (refresh)');
    console.log(`  CONFIRMADO por Postgres: pg_blocking_pids(${pid2}) incluye a ${pid1}`);

    await t1.query('COMMIT');
    const r2 = await conTimeout(p2, 5000, 'T2 tras desbloquearse');
    assert(r2.rowCount === 0, 'T2 (tras desbloquearse) debía afectar 0 filas');
    await t2.query('COMMIT').catch(() => {});

    const estado = await monitor.query('SELECT refresh_token_hash, revocada FROM sesiones WHERE session_id = $1', [
      SESSION_ID,
    ]);
    assert(estado.rows[0].refresh_token_hash === 'hash-nuevo-de-peticion-1', 'el hash final debía ser el de T1, nunca una mezcla');
    console.log('  OK: exactamente una rotación ganó, 0 filas para la otra, hash final sin mezclar.');
  } finally {
    await t1.end().catch(() => {});
    await t2.end().catch(() => {});
    await monitor.end().catch(() => {});
  }
}

// --- Escenario 2: refresh gana primero, logout (por session_id) después ---
// Debe seguir pudiendo revocar aunque el hash ya haya rotado.
async function escenarioRefreshLuegoLogout() {
  console.log('\n########## Escenario 2: refresh gana primero, logout después (por session_id) ##########');
  const t1 = await nuevoCliente();
  const t2 = await nuevoCliente();
  const monitor = await nuevoCliente();
  try {
    await resetearFila(monitor);
    const pid1 = await pid(t1);
    const pid2 = await pid(t2);

    await t1.query('BEGIN');
    const r1 = await t1.query(
      `UPDATE sesiones SET refresh_token_hash = $1
       WHERE session_id = $2 AND usuario_id = $3 AND refresh_token_hash = $4
         AND revocada = false AND expira_en > now() RETURNING id`,
      ['hash-nuevo-de-refresh', SESSION_ID, USUARIO_ID, HASH_INICIAL],
    );
    assert(r1.rowCount === 1, 'refresh (sin commit) debía afectar 1 fila');

    await t2.query('BEGIN');
    // logout real: por session_id + usuario_id, SIN exigir el hash.
    const p2 = t2.query(
      `UPDATE sesiones SET revocada = true WHERE session_id = $1 AND usuario_id = $2 RETURNING id`,
      [SESSION_ID, USUARIO_ID],
    );
    await esperarBloqueo(monitor, pid2, pid1, 'T2 (logout) bloqueada por T1 (refresh)');
    console.log(`  CONFIRMADO por Postgres: pg_blocking_pids(${pid2}) incluye a ${pid1}`);

    await t1.query('COMMIT');
    const r2 = await conTimeout(p2, 5000, 'logout tras desbloquearse');
    assert(r2.rowCount === 1, 'logout (tras desbloquearse) debía afectar 1 fila -- debe revocar aunque el hash ya rotó');
    await t2.query('COMMIT').catch(() => {});

    const estado = await monitor.query('SELECT refresh_token_hash, revocada FROM sesiones WHERE session_id = $1', [
      SESSION_ID,
    ]);
    assert(estado.rows[0].revocada === true, 'la sesión debía quedar revocada');
    assert(estado.rows[0].refresh_token_hash === 'hash-nuevo-de-refresh', 'el hash rotado por refresh no debía tocarse');
    console.log('  OK: logout revocó la sesión aunque el refresh ya había rotado el hash primero.');
  } finally {
    await t1.end().catch(() => {});
    await t2.end().catch(() => {});
    await monitor.end().catch(() => {});
  }
}

// --- Escenario 3: logout gana primero, refresh después --------------------
// El refresh (que sí exige revocada=false) no debe poder revivir la sesión.
async function escenarioLogoutLuegoRefresh() {
  console.log('\n########## Escenario 3: logout primero (por session_id), refresh después (por hash) ##########');
  const t1 = await nuevoCliente();
  const t2 = await nuevoCliente();
  const monitor = await nuevoCliente();
  try {
    await resetearFila(monitor);
    const pid1 = await pid(t1);
    const pid2 = await pid(t2);

    await t1.query('BEGIN');
    const r1 = await t1.query(
      `UPDATE sesiones SET revocada = true WHERE session_id = $1 AND usuario_id = $2 RETURNING id`,
      [SESSION_ID, USUARIO_ID],
    );
    assert(r1.rowCount === 1, 'logout (sin commit) debía afectar 1 fila');

    await t2.query('BEGIN');
    const p2 = t2.query(
      `UPDATE sesiones SET refresh_token_hash = $1
       WHERE session_id = $2 AND usuario_id = $3 AND refresh_token_hash = $4
         AND revocada = false AND expira_en > now() RETURNING id`,
      ['hash-que-nunca-deberia-escribirse', SESSION_ID, USUARIO_ID, HASH_INICIAL],
    );
    await esperarBloqueo(monitor, pid2, pid1, 'T2 (refresh) bloqueada por T1 (logout)');
    console.log(`  CONFIRMADO por Postgres: pg_blocking_pids(${pid2}) incluye a ${pid1}`);

    await t1.query('COMMIT');
    const r2 = await conTimeout(p2, 5000, 'refresh tras desbloquearse');
    assert(r2.rowCount === 0, 'refresh (tras desbloquearse) debía afectar 0 filas -- no debe revivir una sesión revocada');
    await t2.query('COMMIT').catch(() => {});

    const estado = await monitor.query('SELECT refresh_token_hash, revocada FROM sesiones WHERE session_id = $1', [
      SESSION_ID,
    ]);
    assert(estado.rows[0].revocada === true, 'la sesión debía seguir revocada');
    assert(estado.rows[0].refresh_token_hash === HASH_INICIAL, 'el hash no debía cambiar: el refresh nunca debió escribir');
    console.log('  OK: el refresh no revivió una sesión que un logout concurrente ya había revocado.');
  } finally {
    await t1.end().catch(() => {});
    await t2.end().catch(() => {});
    await monitor.end().catch(() => {});
  }
}

function assert(condicion, mensaje) {
  if (!condicion) {
    throw new Error(`ASERCIÓN FALLIDA: ${mensaje}`);
  }
}

async function main() {
  const setup = await nuevoCliente();
  try {
    await setup.query(
      `INSERT INTO sesiones (session_id, usuario_id, refresh_token_hash, expira_en, revocada)
       VALUES ($1, $2, $3, now() + interval '7 days', false)
       ON CONFLICT (session_id) DO NOTHING`,
      [SESSION_ID, USUARIO_ID, HASH_INICIAL],
    );
  } finally {
    await setup.end();
  }

  await conTimeout(escenarioRefreshVsRefresh(), 20000, 'escenario 1');
  await conTimeout(escenarioRefreshLuegoLogout(), 20000, 'escenario 2');
  await conTimeout(escenarioLogoutLuegoRefresh(), 20000, 'escenario 3');

  console.log('\nRESULTADO: los 3 escenarios de concurrencia real (con bloqueo confirmado por Postgres) pasaron.');
}

main().catch((e) => {
  console.error('\nFALLO:', e.message);
  process.exitCode = 1;
});
