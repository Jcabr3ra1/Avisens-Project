import {
  esEsperaVencida,
  PresupuestoAgotado,
  PresupuestoTransaccion,
  SentenciaVencida,
  transaccionConPresupuesto,
} from './presupuesto-transaccion';

const MENSAJE_SENTENCIA = 'canceling statement due to statement timeout';

const errorDeAdaptador = (originalCode: string, originalMessage = '') => {
  const e = new Error(originalMessage || 'error del driver');
  e.name = 'DriverAdapterError';
  (e as Error & { cause: unknown }).cause = { originalCode, originalMessage };
  return e;
};

const consultaCruda = (originalCode: string, originalMessage: string) =>
  Object.assign(new Error('Raw query failed'), {
    name: 'PrismaClientKnownRequestError',
    code: 'P2010',
    meta: { driverAdapterError: { cause: { originalCode, originalMessage } } },
  });

describe('PresupuestoTransaccion', () => {
  let ahora = 0;
  const reloj = () => ahora;
  const viajeDeConfiguracion = { ms: 0 };
  const queryRaw = jest.fn();
  const tx = { $queryRaw: queryRaw } as never;

  const limites = (llamada = 0) => {
    const [, espera, sentencia] = queryRaw.mock.calls[llamada] as [
      unknown,
      string,
      string,
    ];
    return { espera, sentencia };
  };

  const nuevo = (tope = 5000, total = 8000, margen = 250) =>
    new PresupuestoTransaccion(tx, tope, reloj, total, margen);

  beforeEach(() => {
    ahora = 1000;
    viajeDeConfiguracion.ms = 0;
    queryRaw.mockReset();
    queryRaw.mockImplementation(() => {
      ahora += viajeDeConfiguracion.ms;
      return Promise.resolve([{}]);
    });
  });

  it('el primer paso recibe el tope de espera y el restante completo más el margen', async () => {
    const p = nuevo(3000);

    await p.paso('uno', () => Promise.resolve('ok'));

    expect(limites()).toEqual({ espera: '3000ms', sentencia: '8250ms' });
  });

  it('el presupuesto empieza al construirse y descuenta el tiempo transcurrido', async () => {
    const p = nuevo(5000);
    ahora += 2500;

    await p.paso('uno', () => Promise.resolve());

    expect(limites()).toEqual({ espera: '5000ms', sentencia: '5750ms' });
    ahora += 1000;
    await p.paso('dos', () => Promise.resolve());
    expect(limites(1)).toEqual({ espera: '4500ms', sentencia: '4750ms' });
  });

  it('descuenta el mayor viaje de configuración observado (viajeMax), sin garantía futura', async () => {
    const p = nuevo(5000);
    viajeDeConfiguracion.ms = 40;
    await p.paso('uno', () => Promise.resolve());
    viajeDeConfiguracion.ms = 5;
    await p.paso('dos', () => Promise.resolve());

    expect(limites(0)).toEqual({ espera: '5000ms', sentencia: '8250ms' });
    expect(limites(1)).toEqual({ espera: '5000ms', sentencia: '8170ms' });
  });

  it('con k lecturas reparte el restante y el margen entre ellas', async () => {
    const p = nuevo(5000);
    ahora += 900;

    await p.paso('lectura', () => Promise.resolve(), 3);

    expect(limites()).toEqual({ espera: '2366ms', sentencia: '2450ms' });
  });

  it('el reparto entre k lecturas puede rechazar una lectura antes de agotar los 8 s', async () => {
    const p = nuevo(5000);
    ahora += 7100;

    await p.paso('lectura', () => Promise.resolve(), 3);

    const { espera, sentencia } = limites();
    expect(Number.parseInt(espera)).toBe(300);
    expect(Number.parseInt(sentencia)).toBe(300 + 83);
    expect(p.restanteMs()).toBe(900);
  });

  it('un restante positivo pequeño fija 1 ms y nunca 0 (que desactivaría el límite)', async () => {
    const p = nuevo(5000);
    ahora += 7999.5;

    await p.paso('uno', () => Promise.resolve());

    expect(limites()).toEqual({ espera: '1ms', sentencia: '251ms' });
  });

  it('con el restante agotado aborta antes de configurar y de ejecutar el paso', async () => {
    const p = nuevo();
    ahora += 8000;
    const ejecutar = jest.fn();

    await expect(p.paso('tarde', ejecutar)).rejects.toBeInstanceOf(
      PresupuestoAgotado,
    );

    expect(queryRaw).not.toHaveBeenCalled();
    expect(ejecutar).not.toHaveBeenCalled();
  });

  it('un restante negativo tampoco ejecuta: el 1 ms no sirve para continuar una operación vencida', async () => {
    const p = nuevo();
    ahora += 9500;
    const ejecutar = jest.fn();

    await expect(p.paso('tarde', ejecutar)).rejects.toBeInstanceOf(
      PresupuestoAgotado,
    );

    expect(ejecutar).not.toHaveBeenCalled();
  });

  it('el viajeMax puede agotar el restante efectivo antes del paso', async () => {
    const p = nuevo();
    viajeDeConfiguracion.ms = 300;
    await p.paso('uno', () => Promise.resolve());
    ahora += 7500;
    const ejecutar = jest.fn();

    await expect(p.paso('dos', ejecutar)).rejects.toBeInstanceOf(
      PresupuestoAgotado,
    );

    expect(ejecutar).not.toHaveBeenCalled();
    expect(queryRaw).toHaveBeenCalledTimes(1);
  });

  it('si la configuración misma consume lo que quedaba, aborta sin ejecutar el paso', async () => {
    const p = nuevo();
    ahora += 7900;
    viajeDeConfiguracion.ms = 150;
    const ejecutar = jest.fn();

    await expect(p.paso('lento', ejecutar)).rejects.toThrow(/tras configurar/);

    expect(ejecutar).not.toHaveBeenCalled();
  });

  it('la comprobación final aborta si el presupuesto se agotó y pasa si no', () => {
    const p = nuevo();
    ahora += 7999;
    expect(() => p.verificarFinal()).not.toThrow();
    ahora += 1;
    expect(() => p.verificarFinal()).toThrow(PresupuestoAgotado);
  });

  describe('clasificación de 57014', () => {
    const vencimiento = (tope = 5000) => Promise.resolve(nuevo(tope));

    it('statement_timeout con el mensaje exacto y llegada tras el vencimiento armado es SentenciaVencida', async () => {
      const p = await vencimiento();
      const error = errorDeAdaptador('57014', MENSAJE_SENTENCIA);

      const intento = p.paso('espera', () => {
        ahora += 8250;
        return Promise.reject(error);
      });

      await expect(intento).rejects.toBeInstanceOf(SentenciaVencida);
    });

    it('lo mismo con la forma P2010 de consulta cruda', async () => {
      const p = await vencimiento();

      const intento = p.paso('espera', () => {
        ahora += 8250;
        return Promise.reject(consultaCruda('57014', MENSAJE_SENTENCIA));
      });

      await expect(intento).rejects.toBeInstanceOf(SentenciaVencida);
    });

    it('una cancelación manual procesada tarde no se traduce aunque pase el reloj', async () => {
      const p = await vencimiento();
      const manual = errorDeAdaptador(
        '57014',
        'canceling statement due to user request',
      );

      const intento = p.paso('espera', () => {
        ahora += 9000;
        return Promise.reject(manual);
      });

      await expect(intento).rejects.toBe(manual);
    });

    it.each([
      ['mensaje desconocido', 'se canceló la sentencia'],
      [
        'mensaje localizado',
        'cancelando la sentencia debido a que se agotó el tiempo de sentencia',
      ],
      ['mensaje vacío', ''],
    ])(
      '%s con 57014 no se traduce (comportamiento conservador)',
      async (_nombre, mensaje) => {
        const p = await vencimiento();
        const error = errorDeAdaptador('57014', mensaje);

        const intento = p.paso('espera', () => {
          ahora += 9000;
          return Promise.reject(error);
        });

        await expect(intento).rejects.toBe(error);
      },
    );

    it('el mensaje exacto llegado antes del vencimiento armado (menos tolerancia) no se traduce', async () => {
      const p = await vencimiento();
      const error = errorDeAdaptador('57014', MENSAJE_SENTENCIA);

      const intento = p.paso('espera', () => {
        ahora += 3000;
        return Promise.reject(error);
      });

      await expect(intento).rejects.toBe(error);
    });

    it('el vencimiento armado es el del paso en curso, no el reloj global', async () => {
      const p = nuevo(5000);
      ahora += 6000;
      const error = errorDeAdaptador('57014', MENSAJE_SENTENCIA);

      const intento = p.paso('tardío', () => {
        ahora += 500;
        return Promise.reject(error);
      });

      await expect(intento).rejects.toBe(error);
    });

    it('55P03, 40P01, P2028 y errores corrientes pasan sin traducir', async () => {
      const casos = [
        errorDeAdaptador('55P03', 'canceling statement due to lock timeout'),
        errorDeAdaptador('40P01', 'deadlock detected'),
        Object.assign(new Error('expired'), { code: 'P2028' }),
        new Error('otro'),
      ];
      for (const caso of casos) {
        const p = nuevo();
        await expect(
          p.paso('x', () => {
            ahora += 9000;
            return Promise.reject(caso);
          }),
        ).rejects.toBe(caso);
      }
    });
  });
});

describe('esEsperaVencida', () => {
  it('acepta 55P03, PresupuestoAgotado y SentenciaVencida', () => {
    expect(esEsperaVencida(errorDeAdaptador('55P03'))).toBe(true);
    expect(esEsperaVencida(new PresupuestoAgotado('x'))).toBe(true);
    expect(esEsperaVencida(new SentenciaVencida('x', null))).toBe(true);
  });

  it('rechaza P2028, deadlock, 57014 crudo y errores corrientes', () => {
    expect(esEsperaVencida(Object.assign(new Error(), { code: 'P2028' }))).toBe(
      false,
    );
    expect(esEsperaVencida(errorDeAdaptador('40P01'))).toBe(false);
    expect(esEsperaVencida(errorDeAdaptador('57014', MENSAJE_SENTENCIA))).toBe(
      false,
    );
    expect(esEsperaVencida(new Error('x'))).toBe(false);
    expect(esEsperaVencida(null)).toBe(false);
  });
});

describe('transaccionConPresupuesto', () => {
  const queryRaw = jest.fn();
  const prisma = {
    $transaction: jest.fn(),
  };
  let reloj: jest.SpyInstance;
  let ahora = 0;

  beforeEach(() => {
    ahora = 0;
    reloj = jest.spyOn(performance, 'now').mockImplementation(() => ahora);
    queryRaw.mockReset();
    queryRaw.mockResolvedValue([{}]);
    prisma.$transaction.mockReset();
    prisma.$transaction.mockImplementation(
      (operacion: (tx: unknown) => Promise<unknown>) =>
        operacion({ $queryRaw: queryRaw }),
    );
  });

  afterEach(() => reloj.mockRestore());

  it('abre la transacción READ COMMITTED con el timeout de Prisma de 10 s', async () => {
    await transaccionConPresupuesto(prisma as never, 5000, () =>
      Promise.resolve(1),
    );

    expect(prisma.$transaction).toHaveBeenCalledWith(expect.any(Function), {
      isolationLevel: 'ReadCommitted',
      timeout: 10000,
    });
  });

  it('devuelve el resultado cuando el presupuesto alcanza', async () => {
    const res = await transaccionConPresupuesto(
      prisma as never,
      5000,
      async (p) => {
        await p.paso('uno', () => Promise.resolve());
        ahora += 7999;
        return 'listo';
      },
    );

    expect(res).toBe('listo');
  });

  it('aborta antes de devolver si el último paso agotó el presupuesto', async () => {
    const intento = transaccionConPresupuesto(
      prisma as never,
      5000,
      async (p) => {
        await p.paso('uno', () => {
          ahora += 8100;
          return Promise.resolve();
        });
        return 'no debe devolverse';
      },
    );

    await expect(intento).rejects.toBeInstanceOf(PresupuestoAgotado);
  });
});
