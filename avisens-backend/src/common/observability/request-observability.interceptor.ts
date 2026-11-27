import {
  CallHandler,
  ExecutionContext,
  HttpException,
  Injectable,
  Logger,
  NestInterceptor,
} from '@nestjs/common';
import type { Request, Response } from 'express';
import { randomUUID } from 'crypto';
import type { Observable } from 'rxjs';
import { catchError, finalize } from 'rxjs/operators';
import { throwError } from 'rxjs';
import { ObservabilityService } from './observability.service';

@Injectable()
export class RequestObservabilityInterceptor implements NestInterceptor {
  private readonly logger = new Logger('HTTP');

  constructor(private readonly observability: ObservabilityService) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const http = context.switchToHttp();
    const request = http.getRequest<Request>();
    const response = http.getResponse<Response>();
    const recibido = request.headers['x-request-id'];
    const requestId =
      typeof recibido === 'string' && recibido.length <= 100
        ? recibido
        : randomUUID();
    response.setHeader('X-Request-Id', requestId);
    const inicio = Date.now();
    let statusCode: number | undefined;

    return next.handle().pipe(
      catchError((error: unknown) => {
        statusCode = error instanceof HttpException ? error.getStatus() : 500;
        return throwError(() => error);
      }),
      finalize(() => {
        const duracionMs = Date.now() - inicio;
        const estado = statusCode ?? response.statusCode;
        this.observability.registrarPeticion(estado, duracionMs);
        this.logger.log(
          JSON.stringify({
            evento: 'http.request',
            request_id: requestId,
            metodo: request.method,
            ruta: request.path,
            estado,
            duracion_ms: duracionMs,
          }),
        );
      }),
    );
  }
}
