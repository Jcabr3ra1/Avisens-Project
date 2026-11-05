import type { PrismaClient } from '@prisma/client';
import { registrarRelesDispositivo } from './registro-reles';

// Base simulada en memoria que respeta las restricciones que importan aquí:
// código único y un solo relé por (dispositivo, canal). Así se prueba la
// idempotencia de verdad, no solo qué llamadas se hicieron.
type FilaSensor = {
  id: number;
  dispositivo_id: number;
  galpon_id: number;
  codigo: string;
  tipo: string;
  canal: string | null;
  unidad_medida: string;
  modelo?: string | null;
  estado: string;
};

function errorUnico(target: string[]) {
  return Object.assign(new Error('Unique constraint failed'), {
    code: 'P2002',
    meta: { target },
  });
}

function crearBase(iniciales: Omit<FilaSensor, 'id'>[] = []) {
  const filas: FilaSensor[] = [];
  let siguiente = 100;
  const insertar = (f: Omit<FilaSensor, 'id'>) => {
    const fila = { ...f, id: siguiente++ };
    filas.push(fila);
    return fila;
  };
  iniciales.forEach(insertar);

  const ocupado = (dispositivo: number, canal: string | null, sinId?: number) =>
    canal !== null &&
    filas.some(
      (f) => f.dispositivo_id === dispositivo && f.canal === canal && f.id !== sinId,
    );
  const sel = (f: FilaSensor) => ({
    id: f.id,
    codigo: f.codigo,
    tipo: f.tipo,
    estado: f.estado,
  });

  const sensor = {
    findFirst: jest.fn(({ where }: { where: { dispositivo_id: number; canal: string } }) =>
      Promise.resolve(
        filas
          .filter((f) => f.dispositivo_id === where.dispositivo_id && f.canal === where.canal)
          .map(sel)[0] ?? null,
      ),
    ),
    findMany: jest.fn(
      ({
        where,
      }: {
        where: {
          dispositivo_id: number;
          galpon_id: number;
          codigo: { startsWith: string };
        };
      }) =>
        Promise.resolve(
          filas
            .filter(
              (f) =>
                f.dispositivo_id === where.dispositivo_id &&
                f.galpon_id === where.galpon_id &&
                f.canal === null &&
                f.estado !== 'retirado' &&
                f.unidad_medida.toLowerCase() === 'estado' &&
                f.codigo.toUpperCase().startsWith(where.codigo.startsWith.toUpperCase()),
            )
            .map(sel),
        ),
    ),
    updateMany: jest.fn(
      ({
        where,
        data,
      }: {
        where: { id: number; dispositivo_id: number };
        data: { canal: string };
      }) => {
        const fila = filas.find(
          (f) =>
            f.id === where.id &&
            f.dispositivo_id === where.dispositivo_id &&
            f.canal === null &&
            f.estado !== 'retirado',
        );
        if (!fila) return Promise.resolve({ count: 0 });
        if (ocupado(fila.dispositivo_id, data.canal, fila.id))
          return Promise.reject(errorUnico(['dispositivo_id', 'canal']));
        fila.canal = data.canal;
        return Promise.resolve({ count: 1 });
      },
    ),
    create: jest.fn(({ data }: { data: Omit<FilaSensor, 'id' | 'estado'> }) => {
      if (filas.some((f) => f.codigo === data.codigo))
        return Promise.reject(errorUnico(['codigo']));
      if (ocupado(data.dispositivo_id, data.canal))
        return Promise.reject(errorUnico(['dispositivo_id', 'canal']));
      return Promise.resolve(sel(insertar({ ...data, estado: 'activo' })));
    }),
  };

  return {
    filas,
    sensor,
    prisma: { sensor } as unknown as Pick<PrismaClient, 'sensor'>,
  };
}

const ESP32_A = { id: 10, galpon_id: 1 };
const ESP32_B = { id: 11, galpon_id: 1 };

const releAntiguo = (
  n: number,
  parcial: Partial<FilaSensor> = {},
): Omit<FilaSensor, 'id'> => ({
  dispositivo_id: 10,
  galpon_id: 1,
  codigo: `REL-K${n}-G1-01`,
  tipo: `Relé K${n}`,
  canal: null,
  unidad_medida: 'estado',
  estado: 'activo',
  ...parcial,
});

describe('registrarRelesDispositivo', () => {
  it('registro inicial: crea los cuatro relés por canal, con nombre, unidad "estado" y el ESP32 y galpón elegidos', async () => {
    const base = crearBase();

    const res = await registrarRelesDispositivo(base.prisma, ESP32_A);

    expect(res.map((c) => [c.canal, c.resultado])).toEqual([
      ['rele:k1', 'creado'],
      ['rele:k2', 'creado'],
      ['rele:k3', 'creado'],
      ['rele:k4', 'creado'],
    ]);
    expect(base.filas).toHaveLength(4);
    expect(base.filas.map((f) => f.tipo)).toEqual([
      'Bombillos de calefacción',
      'Ventiladores',
      'Extractores',
      'Bomba de agua',
    ]);
    for (const f of base.filas) {
      expect(f).toMatchObject({ dispositivo_id: 10, galpon_id: 1, unidad_medida: 'estado' });
    }
    expect(base.filas[0]).toMatchObject({ canal: 'rele:k1', codigo: 'REL-K1-G1-D10', modelo: 'Relé K1' });
  });

  it('repetir el registro no duplica nada: informa los cuatro como existentes', async () => {
    const base = crearBase();
    await registrarRelesDispositivo(base.prisma, ESP32_A);
    base.sensor.create.mockClear();

    const res = await registrarRelesDispositivo(base.prisma, ESP32_A);

    expect(res.every((c) => c.resultado === 'existente')).toBe(true);
    expect(base.sensor.create).not.toHaveBeenCalled();
    expect(base.filas).toHaveLength(4);
  });

  it.each([
    [['rele:k1']],
    [['rele:k1', 'rele:k3']],
    [['rele:k1', 'rele:k2', 'rele:k4']],
  ])('con %j ya registrados, solo crea los que faltan', async (presentes) => {
    const base = crearBase(
      presentes.map((canal) => ({
        dispositivo_id: 10,
        galpon_id: 1,
        codigo: `PREVIO-${canal}`,
        tipo: 'Nombre personalizado',
        canal,
        unidad_medida: 'estado',
        estado: 'activo',
      })),
    );

    const res = await registrarRelesDispositivo(base.prisma, ESP32_A);

    for (const c of res) {
      expect(c.resultado).toBe(presentes.includes(c.canal) ? 'existente' : 'creado');
    }
    expect(base.filas).toHaveLength(4);
    // Lo que ya estaba conserva su nombre: el registro no lo renombra.
    expect(base.filas.filter((f) => f.tipo === 'Nombre personalizado')).toHaveLength(presentes.length);
  });

  it('dos ESP32 del mismo galpón tienen cada uno sus cuatro relés, sin chocar', async () => {
    const base = crearBase();

    await registrarRelesDispositivo(base.prisma, ESP32_A);
    const res = await registrarRelesDispositivo(base.prisma, ESP32_B);

    expect(res.every((c) => c.resultado === 'creado')).toBe(true);
    expect(base.filas).toHaveLength(8);
    expect(base.filas.filter((f) => f.dispositivo_id === 11).map((f) => f.codigo)).toEqual([
      'REL-K1-G1-D11',
      'REL-K2-G1-D11',
      'REL-K3-G1-D11',
      'REL-K4-G1-D11',
    ]);
  });

  it('asocia un registro antiguo REL-K inequívoco: conserva id, código y datos, solo gana el canal', async () => {
    const base = crearBase([releAntiguo(2, { tipo: 'Ventiladores (K2)' })]);
    const antes = { ...base.filas[0] };

    const res = await registrarRelesDispositivo(base.prisma, ESP32_A);

    const k2 = res.find((c) => c.canal === 'rele:k2')!;
    expect(k2).toMatchObject({ resultado: 'asociado', sensor_id: antes.id, codigo: 'REL-K2-G1-01' });
    expect(base.filas[0]).toEqual({ ...antes, canal: 'rele:k2' });
    // Nada se borró ni se recreó: el resto se creó aparte.
    expect(base.filas).toHaveLength(4);
  });

  it('con dos registros antiguos posibles para un canal no toca ninguno y sigue con los demás', async () => {
    const base = crearBase([
      releAntiguo(2),
      releAntiguo(2, { codigo: 'REL-K2-G1-02' }),
    ]);

    const res = await registrarRelesDispositivo(base.prisma, ESP32_A);

    const k2 = res.find((c) => c.canal === 'rele:k2')!;
    expect(k2.resultado).toBe('conflicto');
    expect(k2.motivo).toContain('REL-K2-G1-01');
    expect(k2.motivo).toContain('REL-K2-G1-02');
    expect(base.filas.filter((f) => f.codigo.startsWith('REL-K2-G1-0')).every((f) => f.canal === null)).toBe(true);
    expect(res.filter((c) => c.resultado === 'creado').map((c) => c.canal)).toEqual([
      'rele:k1',
      'rele:k3',
      'rele:k4',
    ]);
  });

  it('no asocia registros antiguos de otro ESP32, de otro galpón, retirados ni sensores que no son relés', async () => {
    const base = crearBase([
      releAntiguo(1, { dispositivo_id: 11 }), // otro ESP32
      releAntiguo(2, { galpon_id: 2, dispositivo_id: 10 }), // otro galpón (dato incoherente)
      releAntiguo(3, { estado: 'retirado' }),
      releAntiguo(4, { unidad_medida: '°C' }), // no reporta estado
      { ...releAntiguo(1), codigo: 'MOT-ALIM-G1-01' }, // motor
    ]);
    const antes = base.filas.map((f) => ({ ...f }));

    const res = await registrarRelesDispositivo(base.prisma, ESP32_A);

    expect(res.every((c) => c.resultado === 'creado')).toBe(true);
    expect(base.filas.slice(0, antes.length)).toEqual(antes);
  });

  it('un registro antiguo en mantenimiento también se asocia: conserva su estado administrativo', async () => {
    const base = crearBase([releAntiguo(4, { estado: 'mantenimiento' })]);
    const res = await registrarRelesDispositivo(base.prisma, ESP32_A);
    expect(res[3].resultado).toBe('asociado');
    expect(base.filas[0]).toMatchObject({ canal: 'rele:k4', estado: 'mantenimiento' });
  });

  it('si el código legible ya lo usa otro sensor, crea con un sufijo en vez de fallar', async () => {
    const base = crearBase([
      { ...releAntiguo(1, { dispositivo_id: 99, galpon_id: 9 }), codigo: 'REL-K1-G1-D10' },
    ]);

    const res = await registrarRelesDispositivo(base.prisma, ESP32_A);

    expect(res[0].resultado).toBe('creado');
    expect(res[0].codigo).toMatch(/^REL-K1-G1-D10-[0-9A-F]{6}$/);
  });

  it('si otro registro simultáneo ocupó el canal, lo informa como existente', async () => {
    const base = crearBase();
    // El primer create de K1 choca porque otro proceso lo insertó justo antes.
    base.sensor.create.mockImplementationOnce(() => {
      base.filas.push({
        id: 500,
        dispositivo_id: 10,
        galpon_id: 1,
        codigo: 'OTRO',
        tipo: 'Bombillos',
        canal: 'rele:k1',
        unidad_medida: 'estado',
        estado: 'activo',
      });
      return Promise.reject(errorUnico(['dispositivo_id', 'canal']));
    });

    const res = await registrarRelesDispositivo(base.prisma, ESP32_A);

    expect(res[0]).toMatchObject({ resultado: 'existente', sensor_id: 500 });
    expect(base.filas.filter((f) => f.canal === 'rele:k1')).toHaveLength(1);
  });

  it('aunque el error de unicidad no diga qué índice chocó, mira la base y no inventa un conflicto', async () => {
    const base = crearBase();
    base.sensor.create.mockImplementationOnce(() => {
      base.filas.push({
        id: 501,
        dispositivo_id: 10,
        galpon_id: 1,
        codigo: 'OTRO-2',
        tipo: 'Ventiladores',
        canal: 'rele:k1',
        unidad_medida: 'estado',
        estado: 'activo',
      });
      // Adaptador que no informa meta.target.
      return Promise.reject(Object.assign(new Error('Unique'), { code: 'P2002' }));
    });

    const res = await registrarRelesDispositivo(base.prisma, ESP32_A);

    expect(res[0]).toMatchObject({ resultado: 'existente', sensor_id: 501 });
  });

  it('un error de base que no es de unicidad no se oculta', async () => {
    const base = crearBase();
    base.sensor.create.mockRejectedValueOnce(new Error('conexión perdida'));
    await expect(registrarRelesDispositivo(base.prisma, ESP32_A)).rejects.toThrow(
      'conexión perdida',
    );
  });
});
