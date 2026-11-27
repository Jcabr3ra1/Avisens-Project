import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma, type EstadoProspecto } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { paginate } from '../../common/pagination/paginate';
import { ROLES } from '../../common/auth/roles';
import * as bcrypt from 'bcrypt';
import type { Solicitante } from '../../common/auth/acceso';
import { UsuariosService } from '../usuarios/usuarios.service';
import { ConvertirProspectoDto } from './dto/convertir-prospecto.dto';
import { CerrarProspectoDto } from './dto/cerrar-prospecto.dto';
import { ListarProspectosDto } from './dto/listar-prospectos.dto';

const PROSPECTO_LISTA = {
  id: true,
  nombre: true,
  nombre_granja: true,
  telefono: true,
  municipio: true,
  canal_origen: true,
  puntaje_total: true,
  clasificacion: true,
  estado: true,
  asesor_asignado_id: true,
  fecha_inicio: true,
  fecha_finalizacion: true,
  ultima_actividad: true,
  departamento: true,
  numero_galpones: true,
  area_galpon_m2: true,
  rol_prospecto: true,
  accion_siguiente: true,
  fecha_callback: true,
  senal_caliente: true,
  resultado_cierre: true,
};

const ESTADOS_SIN_TERMINAR: EstadoProspecto[] = [
  'en_proceso',
  'abandonado',
  'cancelado',
  'sin_consentimiento',
];

@Injectable()
export class ProspectosService {
  constructor(
    private prisma: PrismaService,
    private usuarios: UsuariosService,
  ) {}

  async listar(dto: ListarProspectosDto) {
    const { page, limit, clasificacion, estado, sin_asignar } = dto;

    const where: Prisma.ProspectoWhereInput = {
      ...(clasificacion ? { clasificacion } : {}),
      estado: estado ?? { notIn: ESTADOS_SIN_TERMINAR },
      ...(sin_asignar ? { asesor_asignado_id: null } : {}),
    };

    const [data, total] = await this.prisma.$transaction([
      this.prisma.prospecto.findMany({
        where,
        select: PROSPECTO_LISTA,
        orderBy: [{ puntaje_total: 'desc' }, { fecha_inicio: 'desc' }],
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.prospecto.count({ where }),
    ]);

    return paginate(data, total, page, limit);
  }

  async obtener(id: number) {
    const prospecto = await this.prisma.prospecto.findUnique({
      where: { id },
      omit: { sesion_id: true },
      include: {
        respuestas: {
          orderBy: { id: 'asc' },
          select: {
            codigo_pregunta: true,
            pregunta_texto: true,
            respuesta_texto: true,
            puntaje_obtenido: true,
          },
        },
        asesor: { select: { id: true, nombre_completo: true, email: true } },
      },
    });
    if (!prospecto) throw new NotFoundException('Prospecto no encontrado');

    return prospecto;
  }

  async eliminar(id: number, confirmacion: string) {
    if (confirmacion !== 'ELIMINAR') {
      throw new BadRequestException('Escribe ELIMINAR para confirmar.');
    }

    try {
      return await this.prisma.$transaction(
        async (tx) => {
          const prospecto = await tx.prospecto.findUnique({
            where: { id },
            select: { id: true },
          });
          if (!prospecto)
            throw new NotFoundException('Prospecto no encontrado');

          // Las relaciones no tienen borrado en cascada. El cliente convertido
          // es independiente del prospecto: no se toca su usuario ni organización.
          await tx.cotizacionSensor.deleteMany({
            where: { cotizacion: { prospecto_id: id } },
          });
          await tx.cotizacion.deleteMany({ where: { prospecto_id: id } });
          await tx.respuestaChatbot.deleteMany({ where: { prospecto_id: id } });
          await tx.interaccionChatbot.deleteMany({
            where: { prospecto_id: id },
          });
          await tx.solicitudPqrs.deleteMany({ where: { prospecto_id: id } });
          await tx.prospecto.delete({ where: { id } });
          return { id, eliminado: true };
        },
        { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
      );
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        ['P2003', 'P2014', 'P2034'].includes(error.code)
      ) {
        throw new ConflictException(
          'El prospecto cambió mientras se eliminaba. No se borró nada; actualiza la ficha e inténtalo de nuevo.',
        );
      }
      throw error;
    }
  }

  async asignar(id: number, asesorId: number) {
    const prospecto = await this.prisma.prospecto.findUnique({
      where: { id },
      select: { id: true, estado: true, clasificacion: true },
    });
    if (!prospecto) throw new NotFoundException('Prospecto no encontrado');

    if (prospecto.estado !== 'calificado') {
      throw new BadRequestException(
        'Solo se pueden asignar prospectos ya calificados',
      );
    }

    // Un prospecto es alguien que todavia NO es cliente, y quien lo atiende es
    // del equipo de Avisens. Un Propietario o un Operario SON clientes:
    // asignarles un prospecto pondria a un cliente a llevar las ventas de su
    // proveedor, y le daria visibilidad sobre prospectos que son competencia
    // suya. El `where` miraba solo que el usuario existiera y estuviera activo.
    const admin = await this.prisma.usuario.findFirst({
      where: { id: asesorId, activo: true },
      select: {
        id: true,
        nombre_completo: true,
        rol: { select: { nombre: true } },
      },
    });
    if (!admin) {
      throw new NotFoundException('El administrador no existe o esta inactivo');
    }
    if (admin.rol?.nombre !== ROLES.ADMINISTRADOR) {
      throw new BadRequestException(
        `${admin.nombre_completo} no es administrador: solo un administrador puede atender un prospecto`,
      );
    }

    await this.prisma.prospecto.update({
      where: { id },
      data: { asesor_asignado_id: asesorId, estado: 'asignado' },
    });

    return {
      prospecto_id: id,
      clasificacion: prospecto.clasificacion,
      admin: admin.nombre_completo,
      asesor: admin.nombre_completo,
      estado: 'asignado',
    };
  }

  async exportarCsv(dto: ListarProspectosDto) {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { page: _page, limit: _limit, ...filtros } = dto;
    const where: Prisma.ProspectoWhereInput = {
      ...(filtros.clasificacion
        ? { clasificacion: filtros.clasificacion }
        : {}),
      estado: filtros.estado ?? { notIn: ESTADOS_SIN_TERMINAR },
      ...(filtros.sin_asignar ? { asesor_asignado_id: null } : {}),
    };

    const filas = await this.prisma.prospecto.findMany({
      where,
      select: PROSPECTO_LISTA,
      orderBy: [{ puntaje_total: 'desc' }, { fecha_inicio: 'desc' }],
    });

    const encabezados = [
      'id',
      'nombre',
      'nombre_granja',
      'telefono',
      'municipio',
      'canal_origen',
      'puntaje_total',
      'clasificacion',
      'estado',
      'asesor_asignado_id',
      'fecha_inicio',
      'fecha_finalizacion',
    ];

    const escapar = (valor: unknown) => {
      if (valor == null) return '';
      // eslint-disable-next-line @typescript-eslint/no-base-to-string
      const texto = valor instanceof Date ? valor.toISOString() : String(valor);
      return /[",\n;]/.test(texto) ? `"${texto.replace(/"/g, '""')}"` : texto;
    };

    // BOM inicial para que Excel respete los acentos al abrir el archivo.
    const lineas = [
      '\ufeff' + encabezados.join(','),
      ...filas.map((fila) =>
        encabezados
          .map((c) => escapar((fila as Record<string, unknown>)[c]))
          .join(','),
      ),
    ];

    return lineas.join('\n');
  }

  /**
   * Un prospecto que ya no esta en juego, con el porque.
   *
   * `cerrado` no distingue ganado de perdido, asi que el resultado va aparte.
   * Un "ganado" tiene que apuntar a un cliente: un prospecto ganado que no
   * corresponde a nadie es justo el agujero que esto viene a cerrar.
   */
  async cerrar(id: number, dto: CerrarProspectoDto) {
    const prospecto = await this.prisma.prospecto.findUnique({
      where: { id },
      select: { id: true, estado: true },
    });
    if (!prospecto) throw new NotFoundException('Prospecto no encontrado');
    if (prospecto.estado === 'cerrado') {
      throw new BadRequestException('Este prospecto ya esta cerrado');
    }

    if (dto.resultado === 'ganado') {
      if (!dto.usuario_id) {
        throw new BadRequestException(
          'Un prospecto ganado tiene que apuntar al cliente en que se convirtio: indica usuario_id, o usa la conversion para crearlo',
        );
      }
      const usuario = await this.prisma.usuario.findUnique({
        where: { id: dto.usuario_id },
        select: { id: true },
      });
      if (!usuario) throw new NotFoundException('Usuario no encontrado');
    }

    return this.prisma.prospecto.update({
      where: { id },
      data: {
        estado: 'cerrado',
        resultado_cierre: dto.resultado,
        motivo_cierre: dto.motivo,
        usuario_convertido_id: dto.usuario_id,
        fecha_finalizacion: new Date(),
      },
      select: {
        id: true,
        estado: true,
        resultado_cierre: true,
        motivo_cierre: true,
        usuario_convertido_id: true,
      },
    });
  }

  /**
   * Volver cliente a un prospecto, en una sola transaccion.
   *
   * Encadenar "crear usuario" y "cerrar prospecto" desde el navegador deja un
   * hueco: si la primera funciona y la segunda falla, queda un cliente creado y
   * un prospecto abierto, nadie sabe que ya se convirtio, y alguien puede
   * convertirlo otra vez. Aqui o pasan las tres cosas o no pasa ninguna.
   *
   * El alta del usuario la hace `UsuariosService` con el mismo `tx`, para que
   * un cliente creado desde el CRM siga las mismas reglas que uno creado desde
   * Personas.
   */
  async convertir(
    id: number,
    dto: ConvertirProspectoDto,
    solicitante: Solicitante,
  ) {
    const prospecto = await this.prisma.prospecto.findUnique({
      where: { id },
      select: { id: true, estado: true, nombre: true },
    });
    if (!prospecto) throw new NotFoundException('Prospecto no encontrado');
    if (prospecto.estado === 'cerrado') {
      throw new BadRequestException('Este prospecto ya esta cerrado');
    }

    const rolPropietario = await this.prisma.rol.findUnique({
      where: { nombre: ROLES.PROPIETARIO },
      select: { id: true },
    });
    if (!rolPropietario) {
      throw new NotFoundException('Rol Propietario no encontrado');
    }

    // Fuera de la transaccion: cuesta unos 100 ms y no toca la base.
    const password_hash = await bcrypt.hash(dto.password, 12);

    return this.prisma.$transaction(async (tx) => {
      const usuario = await this.usuarios.altaDeUsuario(
        tx,
        {
          nombre_completo: dto.nombre_completo,
          cedula: dto.cedula,
          username: dto.username,
          email: dto.email,
          telefono: dto.telefono,
          password: dto.password,
          rol_id: rolPropietario.id,
          organizacion_nombre: dto.organizacion_nombre,
        },
        solicitante,
        password_hash,
      );

      // La granja va DESPUES del usuario y con el `organizacion_id` de ese
      // mismo usuario: la llave foranea es compuesta —(propietario_id,
      // organizacion_id) contra Usuario(id, organizacion_id)— y con cualquier
      // otra organizacion revienta.
      //
      // No se le pone `area_total_m2`: el cuestionario recogia el area de UN
      // galpon, no la de la granja, y desde el recorte ya ni eso.
      await tx.granja.create({
        data: {
          propietario_id: usuario.id,
          organizacion_id: usuario.organizacion_id!,
          nombre: dto.granja_nombre,
          municipio: dto.granja_municipio,
        },
      });

      const cerrado = await tx.prospecto.update({
        where: { id },
        data: {
          estado: 'cerrado',
          resultado_cierre: 'ganado',
          usuario_convertido_id: usuario.id,
          fecha_finalizacion: new Date(),
        },
        select: { id: true, estado: true, resultado_cierre: true },
      });

      return { prospecto: cerrado, usuario };
    });
  }
}
