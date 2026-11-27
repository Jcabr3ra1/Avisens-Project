import { createSign } from 'node:crypto';
import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { RegistrarDispositivoPushDto } from './dto/registrar-dispositivo-push.dto';

export interface MensajePush {
  titulo: string;
  mensaje: string;
  tipo?: string;
  referencia_tipo?: string;
  referencia_id?: number;
}

interface CredencialesFirebase {
  projectId: string;
  clientEmail: string;
  privateKey: string;
}

const SCOPE_FCM = 'https://www.googleapis.com/auth/firebase.messaging';
const URL_TOKEN_GOOGLE = 'https://oauth2.googleapis.com/token';

function codificarBase64Url(valor: string | Buffer): string {
  return Buffer.from(valor)
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/g, '');
}

function leerCredencialesFirebase(
  env: NodeJS.ProcessEnv = process.env,
): CredencialesFirebase | null {
  const jsonCrudo = env.FIREBASE_SERVICE_ACCOUNT_JSON?.trim();
  if (jsonCrudo) {
    try {
      const texto = jsonCrudo.startsWith('{')
        ? jsonCrudo
        : Buffer.from(jsonCrudo, 'base64').toString('utf8');
      const parsed = JSON.parse(texto) as {
        project_id?: string;
        client_email?: string;
        private_key?: string;
      };
      if (parsed.project_id && parsed.client_email && parsed.private_key) {
        return {
          projectId: parsed.project_id,
          clientEmail: parsed.client_email,
          privateKey: parsed.private_key.replace(/\\n/g, '\n'),
        };
      }
    } catch {
      return null;
    }
  }

  const projectId = env.FIREBASE_PROJECT_ID?.trim();
  const clientEmail = env.FIREBASE_CLIENT_EMAIL?.trim();
  const privateKey = env.FIREBASE_PRIVATE_KEY?.trim()?.replace(/\\n/g, '\n');

  if (!projectId || !clientEmail || !privateKey) return null;
  return { projectId, clientEmail, privateKey };
}

@Injectable()
export class PushService {
  private readonly logger = new Logger(PushService.name);
  private credenciales: CredencialesFirebase | null;
  private accessTokenCache: { token: string; expiraEnMs: number } | null = null;

  constructor(private readonly prisma: PrismaService) {
    this.credenciales = leerCredencialesFirebase();
    if (!this.credenciales) {
      this.logger.log(
        'Push FCM deshabilitado (define FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL y FIREBASE_PRIVATE_KEY para activarlo)',
      );
    }
  }

  estaHabilitado(): boolean {
    return this.credenciales !== null;
  }

  async registrarDispositivo(
    usuarioId: number,
    dto: RegistrarDispositivoPushDto,
  ) {
    const plataforma = dto.plataforma ?? 'android';
    return this.prisma.dispositivoPush.upsert({
      where: { token: dto.token },
      create: {
        usuario_id: usuarioId,
        token: dto.token,
        plataforma,
        activo: true,
      },
      update: {
        usuario_id: usuarioId,
        plataforma,
        activo: true,
      },
      select: {
        id: true,
        usuario_id: true,
        plataforma: true,
        activo: true,
        ultima_actualizacion: true,
      },
    });
  }

  async desactivarDispositivo(usuarioId: number, token: string) {
    const resultado = await this.prisma.dispositivoPush.updateMany({
      where: { token, usuario_id: usuarioId },
      data: { activo: false },
    });
    return { desactivado: resultado.count > 0 };
  }

  async estadoUsuario(usuarioId: number) {
    const dispositivos_activos = await this.prisma.dispositivoPush.count({
      where: { usuario_id: usuarioId, activo: true },
    });
    return {
      habilitado: this.estaHabilitado(),
      dispositivos_activos,
    };
  }

  async enviarAUsuarios(
    usuarioIds: number[],
    payload: MensajePush,
  ): Promise<{ enviados: number; fallidos: number; omitido: boolean }> {
    const ids = [...new Set(usuarioIds)];
    if (ids.length === 0 || !this.credenciales) {
      return { enviados: 0, fallidos: 0, omitido: true };
    }

    const dispositivos = await this.prisma.dispositivoPush.findMany({
      where: { usuario_id: { in: ids }, activo: true },
      select: { id: true, token: true },
    });
    if (dispositivos.length === 0) {
      return { enviados: 0, fallidos: 0, omitido: true };
    }

    let accessToken: string;
    try {
      accessToken = await this.obtenerAccessToken(this.credenciales);
    } catch (error) {
      this.logger.warn(
        `No se pudo obtener token OAuth2 para FCM: ${error instanceof Error ? error.message : 'error desconocido'}`,
      );
      return { enviados: 0, fallidos: dispositivos.length, omitido: false };
    }

    const url = `https://fcm.googleapis.com/v1/projects/${encodeURIComponent(this.credenciales.projectId)}/messages:send`;
    const dataPayload: Record<string, string> = {};
    if (payload.tipo) dataPayload.tipo = payload.tipo;
    if (payload.referencia_tipo) {
      dataPayload.referencia_tipo = payload.referencia_tipo;
    }
    if (payload.referencia_id !== undefined) {
      dataPayload.referencia_id = String(payload.referencia_id);
    }

    let enviados = 0;
    let fallidos = 0;
    const idsInvalidos: number[] = [];

    await Promise.all(
      dispositivos.map(async (dispositivo) => {
        try {
          const respuesta = await fetch(url, {
            method: 'POST',
            headers: {
              Authorization: `Bearer ${accessToken}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              message: {
                token: dispositivo.token,
                notification: {
                  title: payload.titulo,
                  body: payload.mensaje,
                },
                data: dataPayload,
                android: {
                  priority: 'HIGH',
                  notification: {
                    channel_id: 'avisens_alertas',
                  },
                },
              },
            }),
          });

          if (respuesta.ok) {
            enviados += 1;
            return;
          }

          fallidos += 1;
          const textoError = await respuesta.text().catch(() => '');
          if (
            respuesta.status === 404 ||
            textoError.includes('UNREGISTERED') ||
            textoError.includes('INVALID_ARGUMENT')
          ) {
            idsInvalidos.push(dispositivo.id);
          } else {
            this.logger.warn(
              `FCM respondió ${respuesta.status} para dispositivo ${dispositivo.id}`,
            );
          }
        } catch (error) {
          fallidos += 1;
          this.logger.warn(
            `Error de red enviando push a dispositivo ${dispositivo.id}: ${error instanceof Error ? error.message : 'desconocido'}`,
          );
        }
      }),
    );

    if (idsInvalidos.length > 0) {
      await this.prisma.dispositivoPush
        .updateMany({
          where: { id: { in: idsInvalidos } },
          data: { activo: false },
        })
        .catch(() => undefined);
    }

    return { enviados, fallidos, omitido: false };
  }

  private async obtenerAccessToken(
    credenciales: CredencialesFirebase,
  ): Promise<string> {
    const ahoraMs = Date.now();
    if (
      this.accessTokenCache &&
      this.accessTokenCache.expiraEnMs > ahoraMs + 120_000
    ) {
      return this.accessTokenCache.token;
    }

    const iat = Math.floor(ahoraMs / 1000);
    const exp = iat + 3600;
    const header = codificarBase64Url(
      JSON.stringify({ alg: 'RS256', typ: 'JWT' }),
    );
    const claim = codificarBase64Url(
      JSON.stringify({
        iss: credenciales.clientEmail,
        scope: SCOPE_FCM,
        aud: URL_TOKEN_GOOGLE,
        iat,
        exp,
      }),
    );
    const sinFirma = `${header}.${claim}`;
    const firma = createSign('RSA-SHA256')
      .update(sinFirma)
      .sign(credenciales.privateKey);
    const assertion = `${sinFirma}.${codificarBase64Url(firma)}`;

    const respuesta = await fetch(URL_TOKEN_GOOGLE, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
        assertion,
      }),
    });

    if (!respuesta.ok) {
      throw new Error(`OAuth2 respondió HTTP ${respuesta.status}`);
    }

    const cuerpo = (await respuesta.json()) as {
      access_token?: string;
      expires_in?: number;
    };
    if (!cuerpo.access_token) {
      throw new Error('OAuth2 no devolvió access_token');
    }

    this.accessTokenCache = {
      token: cuerpo.access_token,
      expiraEnMs: ahoraMs + (cuerpo.expires_in ?? 3600) * 1000,
    };
    return cuerpo.access_token;
  }
}
