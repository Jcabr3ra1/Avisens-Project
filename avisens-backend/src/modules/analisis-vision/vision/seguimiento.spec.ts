import {
  Deteccion,
  EstadoAnterior,
  estadoPorMinutos,
  iou,
  seguirPollos,
} from './seguimiento';

const CFG = { quietoMin: 5, muertoMin: 60, olvidarSeg: 600 };

function det(x1: number, y1: number, ancho = 40, confianza = 0.9): Deteccion {
  return { x1, y1, x2: x1 + ancho, y2: y1 + ancho, confianza, clase: 'broiler' };
}

function minutosDespues(base: Date, minutos: number) {
  return new Date(base.getTime() + minutos * 60000);
}

describe('seguimiento de pollos', () => {
  const t0 = new Date('2026-10-26T12:00:00Z');

  it('iou de cajas iguales es 1 y de cajas separadas es 0', () => {
    expect(iou(det(0, 0), det(0, 0))).toBe(1);
    expect(iou(det(0, 0), det(100, 100))).toBe(0);
  });

  it('clasifica por minutos sin moverse', () => {
    expect(estadoPorMinutos(1, CFG)).toBe('normal');
    expect(estadoPorMinutos(5, CFG)).toBe('quieto');
    expect(estadoPorMinutos(60, CFG)).toBe('posible_muerto');
  });

  it('sin foto anterior, todos los pollos son nuevos y normales', () => {
    const r = seguirPollos(null, [det(0, 0), det(100, 0)], t0, CFG);
    expect(r.pollos.map((p) => p.id).sort()).toEqual([1, 2]);
    expect(r.pollos.every((p) => p.estado === 'normal')).toBe(true);
    expect(r.siguienteId).toBe(3);
  });

  it('un pollo que no se mueve acumula tiempo y pasa a quieto y a posible muerto', () => {
    let anterior: EstadoAnterior | null = null;
    let estado = seguirPollos(anterior, [det(10, 10)], t0, CFG);
    for (const minuto of [2, 4, 6]) {
      anterior = { fecha: minutosDespues(t0, minuto - 2), pollos: estado.pollos, siguienteId: estado.siguienteId };
      estado = seguirPollos(anterior, [det(11, 10)], minutosDespues(t0, minuto), CFG);
    }
    expect(estado.pollos[0].id).toBe(1);
    expect(estado.pollos[0].estado).toBe('quieto');
    expect(estado.quietos).toBe(1);

    anterior = { fecha: minutosDespues(t0, 6), pollos: estado.pollos, siguienteId: estado.siguienteId };
    // Fotos cada pocos minutos durante una hora: sigue sin moverse.
    for (let minuto = 9; minuto <= 61; minuto += 3) {
      estado = seguirPollos(anterior, [det(10, 11)], minutosDespues(t0, minuto), CFG);
      anterior = { fecha: minutosDespues(t0, minuto), pollos: estado.pollos, siguienteId: estado.siguienteId };
    }
    expect(estado.pollos[0].estado).toBe('posible_muerto');
    expect(estado.posiblesMuertos).toBe(1);
  });

  it('si el pollo se mueve, el contador vuelve a cero', () => {
    const quieto = seguirPollos(null, [det(10, 10)], t0, CFG);
    const anterior = { fecha: minutosDespues(t0, 9), pollos: [{ ...quieto.pollos[0], quieto_desde: t0.toISOString() }], siguienteId: 2 };
    // Se desplaza media caja: sigue emparejado (solapa) pero cuenta como movimiento.
    const r = seguirPollos(anterior, [det(25, 10)], minutosDespues(t0, 10), CFG);
    expect(r.pollos[0].id).toBe(1);
    expect(r.pollos[0].minutos_quieto).toBe(0);
    expect(r.pollos[0].estado).toBe('normal');
  });

  it('si la foto anterior es muy vieja, empieza de cero pero no repite ids', () => {
    const previo = seguirPollos(null, [det(10, 10)], t0, CFG);
    const anterior = { fecha: t0, pollos: previo.pollos, siguienteId: previo.siguienteId };
    const r = seguirPollos(anterior, [det(10, 10)], minutosDespues(t0, 30), CFG);
    expect(r.pollos[0].id).toBe(2);
    expect(r.pollos[0].estado).toBe('normal');
  });

  it('un pollo nuevo junto a uno quieto no hereda su tiempo', () => {
    const previo = seguirPollos(null, [det(10, 10)], t0, CFG);
    const anterior = { fecha: minutosDespues(t0, 7), pollos: [{ ...previo.pollos[0], quieto_desde: t0.toISOString() }], siguienteId: 2 };
    const r = seguirPollos(anterior, [det(10, 10), det(300, 300)], minutosDespues(t0, 8), CFG);
    const quieto = r.pollos.find((p) => p.id === 1)!;
    const nuevo = r.pollos.find((p) => p.id === 2)!;
    expect(quieto.estado).toBe('quieto');
    expect(nuevo.estado).toBe('normal');
  });
});
