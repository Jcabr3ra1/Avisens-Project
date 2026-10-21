import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { AccionOrdenActuador, ModoActuador, Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import type { Solicitante } from '../../common/auth/acceso';
import {
  verificarAccesoGalpon,
  verificarAccesoSensor,
} from '../../common/auth/alcance';
import { CreateOrdenActuadorDto } from './dto/create-orden-actuador.dto';
import { esCanalRele, esReleControlable } from '../sensores/reles';

// Una orden que el ESP32 no recoge ni confirma en este tiempo ya no refleja
// lo que el usuario quería "ahora": se marca expirada y no se entrega. El
// ESP32 envía cada INTERVALO_ENVIO_MS (5 s), así que 60 s son ~12 ciclos.
export const VIGENCIA_ORDEN_SEGUNDOS = 60;

// Sin un /ingest en este margen el dispositivo se considera fuera de línea:
// la orden se rechaza al crearla (nunca llegaría a tiempo) y el estado que
// informó del relé deja de presentarse como actual.
export const EN_LINEA_SEGUNDOS = 30;

// Solo los relés K1-K4 aceptan modo manual en el firmware
// (GestorActuadores::establecerManual). Los motores de persiana y
// alimentador también se reportan con unidad "estado", pero los gobiernan
// sus propias máquinas de estados y no tienen control remoto. La regla vive
// con la identidad de los relés (sensores/reles.ts): se reexporta aquí.
export { esReleControlable };

export type ResultadoOrdenReportado = {
  orden_id: number;
  resultado: 'aplicada' | 'rechazada' | 'revertida';
  estado_rele?: boolean;
  motivo?: string;
};

// El firmware nuevo identifica el relé por canal ("rele:k1"); el anterior,
// por código. Llega uno de los dos (lo garantiza el DTO de /ingest).
export type EstadoReleReportado = {
  codigo?: string;
  canal?: string;
  modo: ModoActuador;
  encendido: boolean;
  orden_id?: number;
};

// De qué sesión de arranque viene un envío a /ingest:
// - actual: la sesión vigente del ESP32 (o una nueva, que pasa a vigente).
// - anterior: un envío retrasado de la sesión previa al último reinicio.
// - legado: firmware que todavía no informa arranque_id.
export type SesionReporte = 'actual' | 'anterior' | 'legado';

// Lo que viaja al ESP32 en la respuesta de /ingest. `canal` es la identidad
// que usa el firmware nuevo; `codigo` se mantiene para el firmware anterior.
// Un relé antiguo sin canal solo lleva el código: el firmware nuevo la
// rechaza con un motivo claro hasta que se registren los relés por canal.
export type OrdenParaDispositivo = {
  id: number;
  codigo: string;
  canal?: string;
  accion: AccionOrdenActuador;
};

const ORDEN_SELECT = {
  id: true,
  sensor_id: true,
  dispositivo_id: true,
  galpon_id: true,
  accion: true,
  estado: true,
  estado_real: true,
  motivo: true,
  fecha_creacion: true,
  fecha_envio: true,
  fecha_resultado: true,
  actualizada_en: true,
  sensor: { select: { codigo: true, tipo: true } },
  usuario: { select: { id: true, nombre_completo: true } },
} as const;

const EN_CURSO = ['pendiente', 'enviada'] as const;

// Nombre del índice único parcial de la migración (ver schema.prisma).
const INDICE_UNA_EN_CURSO = 'ordenes_actuadores_una_en_curso';

@Injectable()
export class OrdenesActuadoresService {
  constructor(private prisma: PrismaService) {}

  async crear(dto: CreateOrdenActuadorDto, solicitante: Solicitante) {
    const sensor = await this.prisma.sensor.findUnique({
      where: { id: dto.sensor_id },
      select: {
        id: true,
        codigo: true,
        canal: true,
        unidad_medida: true,
        estado: true,
        galpon_id: true,
        dispositivo_id: true,
        dispositivo: { select: { activo: true, ultima_conexion: true } },
        galpon: {
          select: { activo: true, granja: { select: { propietario_id: true } } },
        },
      },
    });
    if (!sensor) {
      throw new NotFoundException(`Sensor con ID ${dto.sensor_id} no encontrado`);
    }

    await verificarAccesoSensor(
      this.prisma,
      sensor.id,
      solicitante,
      'No tienes acceso a este actuador',
      sensor.galpon.granja.propietario_id,
    );

    if (!esReleControlable(sensor)) {
      throw new BadRequestException(
        'Solo los relés K1-K4 del ESP32 se pueden accionar desde la web',
      );
    }
    if (!sensor.galpon.activo) {
      throw new ConflictException('El galpón de este relé está desactivado');
    }
    if (sensor.estado !== 'activo') {
      throw new ConflictException('El relé está inactivo en el sistema');
    }
    if (!sensor.dispositivo.activo) {
      throw new ConflictException('El ESP32 de este relé está desactivado');
    }
    if (!this.estaEnLinea(sensor.dispositivo.ultima_conexion)) {
      throw new ConflictException(
        'El ESP32 no se reporta hace más de ' +
          `${EN_LINEA_SEGUNDOS} s: la orden no le llegaría`,
      );
    }

    // El chequeo da un mensaje claro en el caso normal; el índice único
    // parcial es lo que de verdad impide dos órdenes en curso cuando dos
    // peticiones llegan a la vez.
    await this.expirarVencidas({ sensor_id: sensor.id });
    const enCurso = await this.prisma.ordenActuador.findFirst({
      where: { sensor_id: sensor.id, estado: { in: [...EN_CURSO] } },
      select: { id: true },
    });
    if (enCurso) {
      throw this.conflictoEnCurso(enCurso.id);
    }

    try {
      return await this.prisma.ordenActuador.create({
        data: {
          dispositivo_id: sensor.dispositivo_id,
          galpon_id: sensor.galpon_id,
          sensor_id: sensor.id,
          accion: dto.accion,
          usuario_id: solicitante.id,
        },
        select: ORDEN_SELECT,
      });
    } catch (error: unknown) {
      if (this.esOrdenEnCursoDuplicada(error)) throw this.conflictoEnCurso();
      throw error;
    }
  }

  async obtener(id: number, solicitante: Solicitante) {
    const acceso = await this.prisma.ordenActuador.findUnique({
      where: { id },
      select: {
        sensor_id: true,
        dispositivo: {
          select: {
            galpon: { select: { granja: { select: { propietario_id: true } } } },
          },
        },
      },
    });
    if (!acceso) {
      throw new NotFoundException(`Orden con ID ${id} no encontrada`);
    }
    await verificarAccesoSensor(
      this.prisma,
      acceso.sensor_id,
      solicitante,
      'No tienes acceso a esta orden',
      acceso.dispositivo.galpon.granja.propietario_id,
    );

    await this.expirarVencidas({ id });
    return this.prisma.ordenActuador.findUniqueOrThrow({
      where: { id },
      select: ORDEN_SELECT,
    });
  }

  // La última orden de cada relé del galpón y el estado que el ESP32 informó
  // de cada uno. Son cosas distintas: la orden es historial (qué se pidió y
  // qué respondió el ESP32 entonces); el estado es lo que hay ahora, y solo
  // vale como actual si es reciente ("vigente").
  async ultimasPorGalpon(galponId: number, solicitante: Solicitante) {
    const galpon = await this.prisma.galpon.findUnique({
      where: { id: galponId },
      select: { granja: { select: { propietario_id: true } } },
    });
    if (!galpon) {
      throw new NotFoundException(`Galpón con ID ${galponId} no encontrado`);
    }
    await verificarAccesoGalpon(
      this.prisma,
      galponId,
      solicitante,
      'No tienes acceso a este galpón',
      galpon.granja.propietario_id,
    );

    await this.expirarVencidas({ galpon_id: galponId });
    // La última por relé se resuelve en la base (MAX(id) agrupado): con
    // `distinct`, Prisma traería todo el historial del galpón a memoria.
    const ultimas = await this.prisma.ordenActuador.groupBy({
      by: ['sensor_id'],
      where: { galpon_id: galponId },
      _max: { id: true },
    });
    const ids = ultimas
      .map((u) => u._max.id)
      .filter((id): id is number => id !== null);
    const [ordenes, estados] = await Promise.all([
      ids.length === 0
        ? Promise.resolve([])
        : this.prisma.ordenActuador.findMany({
            where: { id: { in: ids } },
            orderBy: { sensor_id: 'asc' },
            select: ORDEN_SELECT,
          }),
      this.prisma.estadoActuador.findMany({
        where: { sensor: { galpon_id: galponId } },
        select: {
          sensor_id: true,
          modo: true,
          encendido: true,
          orden_id: true,
          reportado_en: true,
        },
      }),
    ]);

    const ahora = new Date();
    return {
      generado_en: ahora,
      ordenes,
      reles: estados.map((e) => ({
        ...e,
        vigente:
          ahora.getTime() - e.reportado_en.getTime() <= EN_LINEA_SEGUNDOS * 1000,
        // `encendido` es la salida que el ESP32 ordenó al pin. Con el hardware
        // actual no hay realimentación que confirme que el relé conmutó o que
        // la carga funciona; el campo lo dice explícitamente para que ningún
        // cliente lo presente como confirmado.
        confirmacion_fisica: 'no_disponible' as const,
      })),
    };
  }

  // ─── Lado del dispositivo (lo llama IngestService) ─────────────────────

  // Órdenes que esta sesión del ESP32 debe aplicar. Una "enviada" se repite
  // solo a la misma sesión que la recibió (si la respuesta se perdió, no la
  // vio; el firmware descarta las que ya aplicó). Una "enviada" a una sesión
  // anterior nunca se reentrega: tras el reinicio ya es "incierta".
  // Una "pendiente" sí se entrega a la sesión nueva: nunca salió, así que no
  // hay ambigüedad, y el ESP32 la vuelve a pasar por sus protecciones.
  async entregarPendientes(
    dispositivoId: number,
    arranqueId?: string,
  ): Promise<OrdenParaDispositivo[]> {
    const sesion = arranqueId ?? null;
    await this.expirarVencidas({ dispositivo_id: dispositivoId });
    const ordenes = await this.prisma.ordenActuador.findMany({
      where: {
        dispositivo_id: dispositivoId,
        // El relé tiene que seguir en este ESP32: si lo movieron a otro, la
        // orden no viaja a ninguno (y expira).
        sensor: { dispositivo_id: dispositivoId },
        OR: [
          { estado: 'pendiente' },
          { estado: 'enviada', arranque_entrega: sesion },
        ],
      },
      orderBy: { id: 'asc' },
      take: 10,
      select: {
        id: true,
        accion: true,
        sensor: { select: { codigo: true, canal: true } },
      },
    });
    if (ordenes.length === 0) return [];

    await this.prisma.ordenActuador.updateMany({
      where: { id: { in: ordenes.map((o) => o.id) }, estado: 'pendiente' },
      data: { estado: 'enviada', fecha_envio: new Date(), arranque_entrega: sesion },
    });
    // El canal sale del sensor en este momento, no de un código compilado
    // en el firmware: es la identidad física del relé dentro de este ESP32.
    return ordenes.map((o) => ({
      id: o.id,
      codigo: o.sensor.codigo,
      ...(esCanalRele(o.sensor.canal) ? { canal: o.sensor.canal } : {}),
      accion: o.accion,
    }));
  }

  // Aplica lo que el ESP32 informó. Todo filtra por dispositivo_id: un
  // dispositivo no puede tocar órdenes ni relés de otro aunque conozca el id.
  // Devuelve a qué sesión de arranque pertenece el envío; IngestService no
  // entrega órdenes a un envío de la sesión anterior.
  async procesarReporte(
    dispositivoId: number,
    resultados: ResultadoOrdenReportado[] = [],
    estadosReles?: EstadoReleReportado[],
    arranqueId?: string,
  ): Promise<SesionReporte> {
    const ahora = new Date();
    const sesion = await this.resolverSesion(dispositivoId, arranqueId, ahora);

    for (const r of resultados) {
      await this.prisma.ordenActuador.updateMany({
        where: {
          id: r.orden_id,
          dispositivo_id: dispositivoId,
          // Solo la sesión que recibió la orden puede confirmarla. Sin
          // arranque_id (firmware anterior) solo valen las entregadas sin él.
          arranque_entrega: arranqueId ?? null,
          // Una confirmación tardía gana sobre "expirada" e "incierta": lo
          // que pasó en el relé es lo que cuenta. "revertida" solo vale para
          // una aplicada.
          estado:
            r.resultado === 'revertida'
              ? 'aplicada'
              : { in: [...EN_CURSO, 'expirada', 'incierta'] },
        },
        data: {
          estado: r.resultado,
          estado_real: r.estado_rele ?? null,
          // Siempre se pisa: una aplicada tarde no debe conservar el motivo
          // "no confirmó a tiempo" que le puso la expiración.
          motivo: r.motivo ?? null,
          fecha_resultado: ahora,
        },
      });
    }

    // Un envío retrasado de la sesión anterior trae relés que ya no existen
    // así: no pisa el estado actual ni reconcilia. Sin el reporte de relés
    // (firmware anterior) tampoco hay nada que guardar.
    if (sesion === 'anterior' || estadosReles === undefined) return sesion;
    await this.registrarEstadosReles(
      dispositivoId,
      estadosReles,
      arranqueId ?? null,
      ahora,
    );
    return sesion;
  }

  // Reconoce la sesión de arranque del envío. Un arranque_id nunca visto es
  // un reinicio (o un firmware recién flasheado). Entonces:
  // - Las "enviada" a otra sesión pasan a "incierta": el ESP32 pudo
  //   aplicarlas antes de reiniciarse y perder la confirmación. No se dan por
  //   aplicadas (sería inventarlo) ni se reentregan (sería repetirlas).
  // - Las "aplicada" de encender/apagar pasan a "revertida": el firmware
  //   arranca con todos los relés en automático, así que ya no rigen.
  // - Las "pendiente" no se tocan: nunca salieron.
  private async resolverSesion(
    dispositivoId: number,
    arranqueId: string | undefined,
    ahora: Date,
  ): Promise<SesionReporte> {
    if (arranqueId === undefined) return 'legado';

    const dispositivo = await this.prisma.dispositivo.findUnique({
      where: { id: dispositivoId },
      select: { arranque_id: true, arranque_anterior: true },
    });
    if (!dispositivo || dispositivo.arranque_id === arranqueId) return 'actual';
    if (dispositivo.arranque_anterior === arranqueId) return 'anterior';

    await this.prisma.ordenActuador.updateMany({
      where: {
        dispositivo_id: dispositivoId,
        estado: 'enviada',
        // NULL no es distinto de nada en SQL: las entregadas a un firmware
        // sin arranque_id se incluyen aparte.
        OR: [{ arranque_entrega: null }, { arranque_entrega: { not: arranqueId } }],
      },
      data: {
        estado: 'incierta',
        motivo:
          'El ESP32 se reinició sin confirmar la orden: no se sabe si llegó a aplicarse. ' +
          'Tras el reinicio el relé arrancó en automático',
        fecha_resultado: ahora,
      },
    });
    await this.prisma.ordenActuador.updateMany({
      where: {
        dispositivo_id: dispositivoId,
        estado: 'aplicada',
        accion: { in: ['encender', 'apagar'] },
      },
      data: {
        estado: 'revertida',
        motivo: 'El ESP32 se reinició: el relé arrancó en automático',
        fecha_resultado: ahora,
      },
    });
    await this.prisma.dispositivo.update({
      where: { id: dispositivoId },
      data: {
        arranque_id: arranqueId,
        arranque_anterior: dispositivo.arranque_id,
        arranque_desde: ahora,
      },
    });
    return 'actual';
  }

  private async registrarEstadosReles(
    dispositivoId: number,
    estados: EstadoReleReportado[],
    sesion: string | null,
    ahora: Date,
  ) {
    // Solo relés de ESTE dispositivo: el canal "rele:k1" de otro ESP32 (u
    // otro galpón) nunca se resuelve aquí, porque el dispositivo sale del
    // token, no del cuerpo del envío.
    const codigos = estados.flatMap((e) => (e.codigo ? [e.codigo] : []));
    const canales = estados.flatMap((e) =>
      esCanalRele(e.canal) ? [e.canal] : [],
    );
    const sensores = await this.prisma.sensor.findMany({
      where: {
        dispositivo_id: dispositivoId,
        OR: [{ codigo: { in: codigos } }, { canal: { in: canales } }],
      },
      select: { id: true, codigo: true, canal: true, unidad_medida: true },
    });
    const controlables = sensores.filter(esReleControlable);
    const sensorPorCodigo = new Map(controlables.map((s) => [s.codigo, s.id]));
    const sensorPorCanal = new Map<string, number>(
      controlables.flatMap((s) =>
        esCanalRele(s.canal) ? [[s.canal, s.id] as const] : [],
      ),
    );

    const procesados = new Set<number>();
    for (const e of estados) {
      const sensorId =
        e.canal !== undefined
          ? sensorPorCanal.get(e.canal)
          : e.codigo !== undefined
            ? sensorPorCodigo.get(e.codigo)
            : undefined;
      // Identidad ajena, no controlable o sin registrar por canal todavía.
      if (sensorId === undefined || procesados.has(sensorId)) continue;
      procesados.add(sensorId);

      const ordenId = e.modo === 'manual_remoto' ? (e.orden_id ?? null) : null;
      await this.prisma.estadoActuador.upsert({
        where: { sensor_id: sensorId },
        create: {
          sensor_id: sensorId,
          modo: e.modo,
          encendido: e.encendido,
          orden_id: ordenId,
          reportado_en: ahora,
        },
        update: {
          modo: e.modo,
          encendido: e.encendido,
          orden_id: ordenId,
          reportado_en: ahora,
        },
      });

      // Si el ESP32 dice que una orden mantiene el relé en manual, esa orden
      // se aplicó, aunque su resultado se haya perdido por el camino (cola
      // llena, respuesta perdida) y el backend la diera por expirada. Solo si
      // la recibió esta misma sesión: un id de otra sesión no se acepta.
      if (ordenId !== null) {
        await this.prisma.ordenActuador.updateMany({
          where: {
            id: ordenId,
            dispositivo_id: dispositivoId,
            sensor_id: sensorId,
            arranque_entrega: sesion,
            accion: { in: ['encender', 'apagar'] },
            estado: { in: [...EN_CURSO, 'expirada'] },
          },
          data: {
            estado: 'aplicada',
            estado_real: e.encendido,
            motivo: null,
            fecha_resultado: ahora,
          },
        });
      }

      // Toda otra orden "aplicada" de encender/apagar en este relé ya no es
      // la que manda: el relé volvió a automático, lo tomó el serial, o una
      // orden posterior la reemplazó.
      await this.prisma.ordenActuador.updateMany({
        where: {
          dispositivo_id: dispositivoId,
          sensor_id: sensorId,
          estado: 'aplicada',
          accion: { in: ['encender', 'apagar'] },
          ...(ordenId !== null ? { id: { not: ordenId } } : {}),
        },
        data: {
          estado: 'revertida',
          motivo: this.motivoReversion(e.modo, ordenId),
          fecha_resultado: ahora,
        },
      });
    }
  }

  private motivoReversion(modo: ModoActuador, ordenVigente: number | null) {
    if (ordenVigente !== null) return `Reemplazada por la orden #${ordenVigente}`;
    if (modo === 'manual_local') {
      return 'El relé quedó en manual local (monitor serie del ESP32)';
    }
    return 'El ESP32 informó que el relé volvió a modo automático';
  }

  private estaEnLinea(ultimaConexion: Date | null): boolean {
    return (
      ultimaConexion !== null &&
      Date.now() - ultimaConexion.getTime() <= EN_LINEA_SEGUNDOS * 1000
    );
  }

  private conflictoEnCurso(id?: number) {
    return new ConflictException(
      `Ya hay una orden en curso para este relé${id ? ` (#${id})` : ''}; espera su confirmación`,
    );
  }

  private esOrdenEnCursoDuplicada(error: unknown): boolean {
    if (!(error instanceof Prisma.PrismaClientKnownRequestError)) return false;
    if (error.code !== 'P2002') return false;
    // Con un índice creado por SQL manual, Prisma informa el nombre del
    // índice o las columnas según el adaptador: se aceptan ambos.
    const objetivo = JSON.stringify(error.meta ?? {});
    return objetivo.includes(INDICE_UNA_EN_CURSO) || objetivo.includes('sensor_id');
  }

  private async expirarVencidas(where: Prisma.OrdenActuadorWhereInput) {
    await this.prisma.ordenActuador.updateMany({
      where: {
        ...where,
        estado: { in: [...EN_CURSO] },
        fecha_creacion: {
          lt: new Date(Date.now() - VIGENCIA_ORDEN_SEGUNDOS * 1000),
        },
      },
      data: {
        estado: 'expirada',
        motivo: 'El ESP32 no confirmó la orden a tiempo',
        fecha_resultado: new Date(),
      },
    });
  }
}
