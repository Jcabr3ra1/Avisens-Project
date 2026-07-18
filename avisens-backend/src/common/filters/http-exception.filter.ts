import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import type { Request, Response } from 'express';

@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(HttpExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    const status =
      exception instanceof HttpException
        ? exception.getStatus()
        : HttpStatus.INTERNAL_SERVER_ERROR;

    // Normalizamos a un envoltorio único: siempre un `message` string, y un
    // `errors` opcional (lista) solo para la validación. Así todos los clientes
    // (web y móvil) consumen la misma forma.
    let message = 'Error interno del servidor';
    let errors: string[] | undefined;

    if (exception instanceof HttpException) {
      const respuesta = exception.getResponse();
      if (typeof respuesta === 'string') {
        message = respuesta;
      } else if (respuesta && typeof respuesta === 'object') {
        const detalle = (respuesta as { message?: unknown }).message;
        if (Array.isArray(detalle)) {
          errors = detalle as string[]; // errores de class-validator
          message = 'Error de validación';
        } else if (typeof detalle === 'string') {
          message = detalle;
        }
      }
    }

    // Solo registramos fallos inesperados (no los HttpException controlados,
    // como 401/404/409, que son comportamiento normal y solo harían ruido).
    if (!(exception instanceof HttpException)) {
      this.logger.error(
        `${request.method} ${request.url}`,
        exception instanceof Error ? exception.stack : String(exception),
      );
    }

    response.status(status).json({
      statusCode: status,
      message,
      ...(errors ? { errors } : {}),
      timestamp: new Date().toISOString(),
      path: request.url,
    });
  }
}
