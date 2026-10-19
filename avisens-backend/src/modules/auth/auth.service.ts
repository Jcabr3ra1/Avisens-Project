import {
  BadRequestException,
  ConflictException,
  Injectable,
  UnauthorizedException,
  ForbiddenException,
  Logger,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcrypt';
import { randomUUID, createHash } from 'crypto';
import { PrismaService } from '../../prisma/prisma.service';
import { LoginDto } from './dto/login.dto';
import { permisosDelRol } from '../../common/auth/permisos';
import { normalizarUsername } from '../../common/auth/username';
import { ROLES } from '../../common/auth/roles';
import { MENSAJE_CUENTA_OCUPADA } from '../../common/errores/bloqueo';
import {
  esEsperaVencida,
  TOPE_ESPERA_ASIGNACION_MS,
  transaccionConPresupuesto,
} from '../../common/bloqueos/presupuesto-transaccion';
import type { PresupuestoTransaccion } from '../../common/bloqueos/presupuesto-transaccion';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private prisma: PrismaService,
    private jwt: JwtService,
    private config: ConfigService,
  ) {}

  obtenerPermisos(rol: string) {
    return { rol, permisos: permisosDelRol(rol) };
  }

  async perfil(usuarioId: number) {
    const usuario = await this.prisma.usuario.findUnique({
      where: { id: usuarioId },
      select: {
        id: true,
        username: true,
        nombre_completo: true,
        email: true,
        telefono: true,
        fecha_creacion: true,
        rol: { select: { nombre: true } },
        organizacion: { select: { id: true, nombre: true } },
        seguridad_cuenta: {
          select: {
            fecha_ultimo_login: true,
            fecha_ultimo_cambio_password: true,
          },
        },
      },
    });
    if (!usuario) throw new UnauthorizedException();
    const { seguridad_cuenta, rol, ...datos } = usuario;
    return {
      ...datos,
      rol: rol.nombre,
      fecha_ultimo_login: seguridad_cuenta?.fecha_ultimo_login ?? null,
      fecha_ultimo_cambio_password:
        seguridad_cuenta?.fecha_ultimo_cambio_password ?? null,
    };
  }

  async cambiarPassword(
    usuarioId: number,
    passwordActual: string,
    nuevaPassword: string,
  ) {
    const usuario = await this.prisma.usuario.findUnique({
      where: { id: usuarioId },
      select: { password_hash: true },
    });
    if (!usuario) throw new UnauthorizedException();
    const actualCorrecta = await bcrypt.compare(
      passwordActual,
      usuario.password_hash,
    );
    if (!actualCorrecta) {
      throw new BadRequestException('La contraseña actual no es correcta.');
    }
    if (await bcrypt.compare(nuevaPassword, usuario.password_hash)) {
      throw new BadRequestException(
        'La nueva contraseña debe ser distinta de la actual.',
      );
    }
    const passwordHash = await bcrypt.hash(nuevaPassword, 12);
    await this.prisma.$transaction([
      this.prisma.usuario.update({
        where: { id: usuarioId },
        data: { password_hash: passwordHash },
      }),
      this.prisma.seguridadCuenta.upsert({
        where: { usuario_id: usuarioId },
        create: {
          usuario_id: usuarioId,
          fecha_ultimo_cambio_password: new Date(),
        },
        update: { fecha_ultimo_cambio_password: new Date() },
      }),
      this.prisma.sesion.updateMany({
        where: { usuario_id: usuarioId, revocada: false },
        data: { revocada: true },
      }),
    ]);
    return { mensaje: 'Contraseña actualizada. Inicia sesión nuevamente.' };
  }

  /**
   * Login en dos fases.
   *
   * Fase A (sin transacción ni bloqueos): lectura del usuario, rechazos
   * tempranos, cuenta bloqueada y bcrypt. bcrypt nunca corre con bloqueos
   * tomados.
   *
   * Fase B (transacción con el presupuesto de transaccionConPresupuesto, tope
   * de espera de 3 s, un paso por sentencia): vuelve a validar lo decidido en
   * la fase A bajo bloqueo y solo entonces modifica seguridad_cuenta y crea la
   * sesión. Orden de bloqueos: usuarios (FOR SHARE) -> seguridad_cuenta
   * (FOR UPDATE) -> sesiones (ids ascendentes).
   *
   * Por qué este orden no se cruza con los escritores relacionados:
   * - La desactivación (PATCH/DELETE de usuario y de organización) y la
   *   eliminación permanente toman antes un bloqueo de fila sobre usuarios
   *   (FOR NO KEY UPDATE / FOR UPDATE) que es incompatible con el FOR SHARE
   *   del login. Si llegan primero, el login espera y ve el usuario inactivo
   *   o inexistente; si el login gana, ellos esperan a que confirme y luego
   *   revocan o eliminan su sesión. La eliminación permanente
   *   (usuarios -> sesiones -> seguridad_cuenta) no puede quedar a medio
   *   camino frente a un login porque este ya habría sido excluido por el
   *   bloqueo previo del usuario.
   * - La aprobación de una recuperación y el cambio de contraseña actualizan
   *   usuarios.password_hash (mismo bloqueo de fila) antes de seguridad_cuenta
   *   y sesiones, como el login.
   * - registrarIntentoFallido, el compare-and-swap del refresh y el logout son
   *   sentencias únicas que no bloquean al usuario: pueden esperar a este
   *   login, pero no forman un ciclo. Sus pendientes quedan fuera de este
   *   alcance.
   * Este orden no es universal: describe solo los caminos de esta familia.
   */
  async login(dto: LoginDto, ip?: string, userAgent?: string) {
    const usuario = await this.prisma.usuario.findUnique({
      where: { username: normalizarUsername(dto.username) },
      include: { rol: true, seguridad_cuenta: true, organizacion: true },
    });

    if (!usuario || !usuario.activo || usuario.organizacion?.activa === false) {
      throw new UnauthorizedException('Credenciales inválidas');
    }

    const seguridad = usuario.seguridad_cuenta;

    if (seguridad?.bloqueado_hasta && seguridad.bloqueado_hasta > new Date()) {
      throw new ForbiddenException('Cuenta bloqueada temporalmente');
    }

    const passwordOk = await bcrypt.compare(
      dto.password,
      usuario.password_hash,
    );

    if (!passwordOk) {
      await this.registrarIntentoFallido(usuario, seguridad);
      throw new UnauthorizedException('Credenciales inválidas');
    }

    try {
      return await transaccionConPresupuesto(
        this.prisma,
        TOPE_ESPERA_ASIGNACION_MS,
        (p) =>
          this.completarLogin(
            p,
            usuario.id,
            usuario.password_hash,
            usuario.username,
            ip,
            userAgent,
          ),
      );
    } catch (error) {
      if (esEsperaVencida(error)) {
        throw new ConflictException(MENSAJE_CUENTA_OCUPADA);
      }
      throw error;
    }
  }

  private async completarLogin(
    p: PresupuestoTransaccion,
    usuarioId: number,
    hashVerificado: string,
    usernameVerificado: string,
    ip?: string,
    userAgent?: string,
  ) {
    const bloqueado = await p.paso(
      'bloquear usuario',
      (tx) =>
        tx.$queryRaw<
          { id: number }[]
        >`SELECT "id" FROM "usuarios" WHERE "id" = ${usuarioId} FOR SHARE`,
    );
    if (bloqueado.length === 0) {
      throw new UnauthorizedException('Credenciales inválidas');
    }

    const [actual] = await p.paso(
      'revalidar usuario',
      (tx) =>
        tx.$queryRaw<
          {
            nombre_completo: string;
            username: string;
            email: string | null;
            activo: boolean;
            password_hash: string;
            organizacion_id: number | null;
            rol: string;
            organizacion_activa: boolean | null;
          }[]
        >`SELECT u."nombre_completo", u."username", u."email", u."activo", u."password_hash", u."organizacion_id", r."nombre" AS "rol", o."activa" AS "organizacion_activa"
            FROM "usuarios" u
            JOIN "roles" r ON r."id" = u."rol_id"
            LEFT JOIN "organizaciones" o ON o."id" = u."organizacion_id"
           WHERE u."id" = ${usuarioId}`,
    );
    if (
      !actual ||
      !actual.activo ||
      actual.organizacion_activa === false ||
      actual.password_hash !== hashVerificado ||
      actual.username !== usernameVerificado
    ) {
      throw new UnauthorizedException('Credenciales inválidas');
    }

    await p.paso(
      'asegurar seguridad de la cuenta',
      (tx) =>
        tx.$executeRaw`INSERT INTO "seguridad_cuenta" ("usuario_id") VALUES (${usuarioId}) ON CONFLICT ("usuario_id") DO NOTHING`,
    );
    const [seguridad] = await p.paso(
      'bloquear seguridad de la cuenta',
      (tx) =>
        tx.$queryRaw<
          {
            bloqueado_hasta: Date | null;
            debe_cambiar_password: boolean;
            password_temporal_expira_en: Date | null;
          }[]
        >`SELECT "bloqueado_hasta", "debe_cambiar_password", "password_temporal_expira_en" FROM "seguridad_cuenta" WHERE "usuario_id" = ${usuarioId} FOR UPDATE`,
    );

    const ahora = new Date();
    if (seguridad.bloqueado_hasta && seguridad.bloqueado_hasta > ahora) {
      throw new ForbiddenException('Cuenta bloqueada temporalmente');
    }

    const reiniciarIntentos = () =>
      p.paso('reiniciar intentos', (tx) =>
        tx.seguridadCuenta.update({
          where: { usuario_id: usuarioId },
          data: {
            intentos_fallidos: 0,
            bloqueado_hasta: null,
            fecha_ultimo_login: ahora,
          },
          select: { id: true },
        }),
      );

    if (seguridad.debe_cambiar_password) {
      if (
        !seguridad.password_temporal_expira_en ||
        seguridad.password_temporal_expira_en <= ahora
      ) {
        throw new ForbiddenException(
          'La contraseña temporal venció. Solicita una nueva recuperación.',
        );
      }

      await reiniciarIntentos();
      const cambio_password_token = await this.jwt.signAsync(
        { sub: usuarioId, tipo: 'cambio_password' },
        {
          secret: this.config.getOrThrow('JWT_SECRET'),
          expiresIn: '15m',
        },
      );
      return { requiere_cambio_password: true, cambio_password_token };
    }

    const candidatas = await p.paso(
      'bloquear sesiones vencidas o revocadas',
      (tx) =>
        tx.$queryRaw<
          { id: number }[]
        >`SELECT "id" FROM "sesiones" WHERE "usuario_id" = ${usuarioId} AND ("expira_en" < ${ahora} OR "revocada" = true) ORDER BY "id" FOR UPDATE`,
    );
    if (candidatas.length > 0) {
      await p.paso('eliminar sesiones vencidas o revocadas', (tx) =>
        tx.sesion.deleteMany({
          where: { id: { in: candidatas.map((fila) => fila.id) } },
        }),
      );
    }

    const sessionId = randomUUID();
    const tokens = await this.generarTokens(
      usuarioId,
      actual.username,
      actual.rol,
      actual.organizacion_id,
      sessionId,
    );
    await p.paso('crear sesión', (tx) =>
      tx.sesion.create({
        data: {
          session_id: sessionId,
          usuario_id: usuarioId,
          refresh_token_hash: this.hashRefreshToken(tokens.refresh_token),
          ip_origen: ip,
          user_agent: userAgent,
          expira_en: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        },
        select: { id: true },
      }),
    );
    await reiniciarIntentos();

    return {
      requiere_cambio_password: false,
      access_token: tokens.access_token,
      refresh_token: tokens.refresh_token,
      usuario: {
        id: usuarioId,
        nombre: actual.nombre_completo,
        username: actual.username,
        email: actual.email,
        rol: actual.rol,
        organizacion_id: actual.organizacion_id,
      },
    };
  }

  // El refresh token completo se compara por SHA-256 (no bcrypt): bcrypt
  // trunca a 72 bytes, y con la forma actual del payload eso confundía
  // tokens distintos de un mismo usuario entre sí (ver docs de diseño).
  // SHA-256 procesa el token completo -- el algoritmo correcto para un
  // secreto de alta entropía generado por el servidor, no para una
  // contraseña elegida por una persona (ahí sigue bcrypt, sin cambios).
  private hashRefreshToken(token: string): string {
    return createHash('sha256').update(token).digest('hex');
  }

  async refresh(userId: number, sessionId: string, refreshToken: string) {
    const usuario = await this.prisma.usuario.findUnique({
      where: { id: userId },
      include: { rol: true, seguridad_cuenta: true, organizacion: true },
    });

    if (
      !usuario ||
      !usuario.activo ||
      usuario.organizacion?.activa === false ||
      usuario.seguridad_cuenta?.debe_cambiar_password
    ) {
      throw new UnauthorizedException();
    }

    const hashAnterior = this.hashRefreshToken(refreshToken);
    // Misma sesión (session_id es estable, no cambia al rotar); el jti
    // nuevo en cada emisión evita que dos rotaciones en el mismo segundo
    // produzcan el mismo token.
    const tokens = await this.generarTokens(
      usuario.id,
      usuario.username,
      usuario.rol.nombre,
      usuario.organizacion_id,
      sessionId,
    );
    const hashNuevo = this.hashRefreshToken(tokens.refresh_token);

    // Rotación atómica (compare-and-swap): un único UPDATE condicional,
    // no "leer y luego escribir". Si otra petición concurrente ya rotó
    // esta misma sesión, o un logout concurrente ya la revocó, o ya
    // expiró, la condición no calza con ninguna fila y count queda en 0
    // -- nunca se devuelven tokens nuevos sobre una sesión que ya no
    // debería poder rotar.
    const resultado = await this.prisma.sesion.updateMany({
      where: {
        session_id: sessionId,
        usuario_id: userId,
        refresh_token_hash: hashAnterior,
        revocada: false,
        expira_en: { gt: new Date() },
      },
      data: { refresh_token_hash: hashNuevo },
    });

    if (resultado.count === 0) {
      throw new UnauthorizedException(
        'Refresh token inválido, expirado o ya utilizado',
      );
    }

    return tokens;
  }

  async logout(userId: number, sessionId: string) {
    // Revoca por identidad de sesión (session_id), no por el hash del
    // token presentado: así, aunque un refresh concurrente ya haya
    // rotado el token, logout sigue pudiendo cerrar ESTA sesión -- no
    // depende de traer el hash vigente. Idempotente (revocar una sesión
    // ya revocada no tiene efecto extra) y no afecta otras sesiones del
    // mismo usuario (el WHERE exige también session_id, no solo
    // usuario_id).
    await this.prisma.sesion.updateMany({
      where: { session_id: sessionId, usuario_id: userId },
      data: { revocada: true },
    });
  }

  private async generarTokens(
    userId: number,
    username: string,
    rol: string,
    organizacionId: number | null | undefined,
    sessionId: string,
  ) {
    const payloadBase = {
      sub: userId,
      username,
      rol,
      organizacion_id: organizacionId ?? null,
    };
    // jti: aleatorio en CADA emisión (login y cada refresh). Sin esto,
    // dos tokens firmados en el mismo segundo de reloj, con el mismo
    // payload, son literalmente el mismo string -- no solo el mismo hash.
    const jti = randomUUID();

    const [access_token, refresh_token] = await Promise.all([
      this.jwt.signAsync(
        { ...payloadBase, jti },
        {
          secret: this.config.getOrThrow('JWT_SECRET'),
          expiresIn: this.config.get('JWT_EXPIRES_IN', '15m'),
        },
      ),
      this.jwt.signAsync(
        // session_id: identidad estable de la sesión (no cambia al
        // rotar) -- distinta del jti, que sí cambia en cada emisión.
        { ...payloadBase, jti, session_id: sessionId },
        {
          secret: this.config.getOrThrow('JWT_REFRESH_SECRET'),
          expiresIn: this.config.get('JWT_REFRESH_EXPIRES_IN', '7d'),
        },
      ),
    ]);

    return { access_token, refresh_token };
  }

  private async registrarIntentoFallido(
    usuario: { id: number; nombre_completo: string },
    seguridad: { id: number; intentos_fallidos: number } | null,
  ) {
    const intentos = (seguridad?.intentos_fallidos ?? 0) + 1;
    const bloqueado_hasta =
      intentos >= 5 ? new Date(Date.now() + 15 * 60 * 1000) : null;

    await this.prisma.seguridadCuenta.upsert({
      where: { usuario_id: usuario.id },
      create: {
        usuario_id: usuario.id,
        intentos_fallidos: intentos,
        bloqueado_hasta,
      },
      update: { intentos_fallidos: intentos, bloqueado_hasta },
    });

    if (intentos === 3 || intentos === 5) {
      await this.notificarAdministradoresDeAcceso(usuario, intentos);
    }
  }

  private async notificarAdministradoresDeAcceso(
    usuario: { id: number; nombre_completo: string },
    intentos: 3 | 5,
  ) {
    try {
      const administradores = await this.prisma.usuario.findMany({
        where: { activo: true, rol: { nombre: ROLES.ADMINISTRADOR } },
        select: { id: true },
      });

      if (administradores.length === 0) return;

      const bloqueada = intentos === 5;
      await this.prisma.notificacion.createMany({
        data: administradores.map(({ id }) => ({
          usuario_id: id,
          tipo: 'seguridad_cuenta',
          titulo: bloqueada
            ? 'Cuenta bloqueada temporalmente'
            : 'Intentos de acceso por revisar',
          mensaje: bloqueada
            ? `La cuenta de ${usuario.nombre_completo} fue bloqueada durante 15 minutos tras cinco intentos fallidos. Puedes orientar a la persona para recuperar su contraseña.`
            : `La cuenta de ${usuario.nombre_completo} acumula tres intentos de acceso fallidos. Confirma con la persona si necesita recuperar su contraseña.`,
          referencia_tipo: 'seguridad_cuenta',
          referencia_id: usuario.id,
        })),
      });
    } catch {
      this.logger.error(
        'No fue posible crear las notificaciones de seguridad de la cuenta',
      );
    }
  }
}
