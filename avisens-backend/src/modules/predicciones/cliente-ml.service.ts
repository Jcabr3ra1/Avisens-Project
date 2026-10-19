import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class ClienteMlService {
  private readonly logger = new Logger(ClienteMlService.name);

  constructor(private config: ConfigService) {}

  async llamar(ruta: string, cuerpo: unknown): Promise<Response | null> {
    const mlUrl = this.config.get<string>('ML_URL', 'http://ml:8000');
    const token = this.config.get<string>('ML_INTERNAL_TOKEN');
    const timeoutMs = Number(this.config.get<string>('ML_TIMEOUT_MS', '5000'));
    try {
      return await fetch(`${mlUrl}${ruta}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { 'X-ML-Token': token } : {}),
        },
        body: JSON.stringify(cuerpo),
        signal: AbortSignal.timeout(timeoutMs),
      });
    } catch {
      this.logger.warn(`El servicio ML no respondio en ${timeoutMs}ms`);
      return null;
    }
  }

  async leerJson(respuesta: Response): Promise<unknown> {
    try {
      return (await respuesta.json()) as unknown;
    } catch {
      return null;
    }
  }
}
