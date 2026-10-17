import { Client } from 'pg';
import { readFileSync } from 'fs';
import { join } from 'path';

describe('Migración de cuentas existentes a usuario', () => {
  let db: Client;
  beforeAll(async () => {
    if (process.env.AVISENS_AUTH_TEST_DB !== 'aislada')
      throw new Error('Requiere una base aislada de pruebas');
    db = new Client({ connectionString: process.env.DATABASE_URL });
    await db.connect();
  });
  afterAll(async () => {
    await db?.end();
  });

  it('conserva claves e historial, evita colisiones y permite varias cuentas sin correo', async () => {
    await db.query('BEGIN');
    try {
      await db.query('CREATE SCHEMA migracion_username_prueba');
      await db.query('SET LOCAL search_path TO migracion_username_prueba');
      await db.query(`CREATE TABLE usuarios (id SERIAL PRIMARY KEY, email TEXT NOT NULL UNIQUE, password_hash TEXT NOT NULL);
        CREATE TABLE registros (usuario_id INT REFERENCES usuarios(id), detalle TEXT);
        INSERT INTO usuarios (email, password_hash) VALUES ('maria@gmail.com', 'hash_sin_cambiar_1'), ('maria@otro.co', 'hash_sin_cambiar_2');
        INSERT INTO registros VALUES (1, 'historial conservado');`);
      const sql = readFileSync(
        join(
          __dirname,
          '../prisma/migrations/20261016180000_ingreso_por_usuario/migration.sql',
        ),
        'utf8',
      );
      await db.query(sql);
      const cuentas = await db.query<{
        id: number;
        username: string;
        email: string;
        password_hash: string;
      }>('SELECT * FROM usuarios ORDER BY id');
      expect(cuentas.rows).toEqual([
        {
          id: 1,
          username: 'usuario.1',
          email: 'maria@gmail.com',
          password_hash: 'hash_sin_cambiar_1',
        },
        {
          id: 2,
          username: 'usuario.2',
          email: 'maria@otro.co',
          password_hash: 'hash_sin_cambiar_2',
        },
      ]);
      const historial = await db.query<{ usuario_id: number; detalle: string }>(
        'SELECT * FROM registros',
      );
      expect(historial.rows).toEqual([
        { usuario_id: 1, detalle: 'historial conservado' },
      ]);
      await db.query(
        `INSERT INTO usuarios (username, password_hash) VALUES ('nuevo.uno', 'hash_nuevo'), ('nuevo.dos', 'hash_nuevo')`,
      );
      const sinContacto = await db.query<{ n: number }>(
        'SELECT count(*)::int AS n FROM usuarios WHERE email IS NULL',
      );
      expect(sinContacto.rows[0].n).toBe(2);
      for (const username of ['usuario.1', 'USUARIO.1', 'invalido@correo.co']) {
        await db.query('SAVEPOINT duplicado');
        await expect(
          db.query(
            'INSERT INTO usuarios (username, password_hash) VALUES ($1, $2)',
            [username, 'hash_nuevo'],
          ),
        ).rejects.toThrow();
        await db.query('ROLLBACK TO SAVEPOINT duplicado');
      }
    } finally {
      await db.query('ROLLBACK');
    }
  });
});
