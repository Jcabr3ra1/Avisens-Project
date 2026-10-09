import {
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
import { ROLES } from '../../common/auth/roles';

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

  async login(dto: LoginDto, ip?: string, userAgent?: string) {
    const usuario = await this.prisma.usuario.findUnique({
      where: { email: dto.email },
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

    if (seguridad?.debe_cambiar_password) {
      if (
        !seguridad.password_temporal_expira_en ||
        seguridad.password_temporal_expira_en <= new Date()
      ) {
        throw new ForbiddenException(
          'La contraseña temporal venció. Solicita una nueva recuperación.',
        );
      }

      await this.resetearIntentosFallidos(usuario.id);
      const cambio_password_token = await this.jwt.signAsync(
        { sub: usuario.id, tipo: 'cambio_password' },
        {
          secret: this.config.getOrThrow('JWT_SECRET'),
          expiresIn: '15m',
        },
      );
      return { requiere_cambio_password: true, cambio_password_token };
    }

    await this.resetearIntentosFallidos(usuario.id);

    // session_id: identidad estable de ESTA sesión, generada una sola vez
    // aquí. Viaja firmada dentro del refresh token y se conserva sin
    // cambios en cada rotación (ver refresh() más abajo) -- es lo que le
    // permite a logout() revocar la sesión correcta aunque el token ya
    // haya rotado, en vez de depender de comparar hashes.
    const sessionId = randomUUID();
    const tokens = await this.generarTokens(
      usuario.id,
      usuario.email,
      usuario.rol.nombre,
      usuario.organizacion_id,
      sessionId,
    );

    await this.prisma.sesion.deleteMany({
      where: {
        usuario_id: usuario.id,
        OR: [{ expira_en: { lt: new Date() } }, { revocada: true }],
      },
    });

    await this.prisma.sesion.create({
      data: {
        session_id: sessionId,
        usuario_id: usuario.id,
        refresh_token_hash: this.hashRefreshToken(tokens.refresh_token),
        ip_origen: ip,
        user_agent: userAgent,
        expira_en: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      },
    });

    return {
      requiere_cambio_password: false,
      access_token: tokens.access_token,
      refresh_token: tokens.refresh_token,
      usuario: {
        id: usuario.id,
        nombre: usuario.nombre_completo,
        email: usuario.email,
        rol: usuario.rol.nombre,
        organizacion_id: usuario.organizacion_id,
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
      usuario.email,
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
    email: string,
    rol: string,
    organizacionId: number | null | undefined,
    sessionId: string,
  ) {
    const payloadBase = {
      sub: userId,
      email,
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

  private async resetearIntentosFallidos(userId: number) {
    await this.prisma.seguridadCuenta.upsert({
      where: { usuario_id: userId },
      create: {
        usuario_id: userId,
        intentos_fallidos: 0,
        fecha_ultimo_login: new Date(),
      },
      update: {
        intentos_fallidos: 0,
        bloqueado_hasta: null,
        fecha_ultimo_login: new Date(),
      },
    });
  }
}
