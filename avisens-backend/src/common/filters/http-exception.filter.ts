import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import type { Request, Response } from 'express';
import {
  esViolacionDeLlaveForanea,
  nombreLegible,
  tablaQueBloquea,
} from '../errores/llave-foranea';

@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(HttpExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    // Una violación de llave foránea no es un fallo del servidor: es que hay
    // datos colgando de lo que se intenta borrar. El filtro de Prisma la
    // atrapa cuando llega con código P2003, pero el adaptador de pg la sube
    // envuelta en DriverAdapterError, que es otra clase, y caía aquí como 500
    // sin decirle nada al usuario.
    if (!(exception instanceof HttpException) && esViolacionDeLlaveForanea(exception)) {
      const bloquea = nombreLegible(tablaQueBloquea(exception));
      const detalle = bloquea
        ? `No se puede eliminar: todavía hay ${bloquea} asociados. Desactívalo en vez de eliminarlo.`
        : 'No se puede eliminar: todavía hay registros que dependen de este.';
      response.status(HttpStatus.CONFLICT).json({
        statusCode: HttpStatus.CONFLICT,
        message: detalle,
        timestamp: new Date().toISOString(),
        path: request.url,
        requestId: response.getHeader('X-Request-Id'),
      });
      return;
    }

    const status =
      exception instanceof HttpException
        ? exception.getStatus()
        : HttpStatus.INTERNAL_SERVER_ERROR;

    let message = 'Error interno del servidor';
    let errors: string[] | undefined;

    if (exception instanceof HttpException) {
      const respuesta = exception.getResponse();
      if (typeof respuesta === 'string') {
        message = respuesta;
      } else if (respuesta && typeof respuesta === 'object') {
        const detalle = (respuesta as { message?: unknown }).message;
        if (Array.isArray(detalle)) {
          errors = detalle as string[];
          message = 'Error de validación';
        } else if (typeof detalle === 'string') {
          message = detalle;
        }
      }
    }

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
      requestId: response.getHeader('X-Request-Id'),
    });
  }
}
