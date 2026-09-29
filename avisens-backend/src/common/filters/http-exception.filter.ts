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

// Lista blanca deliberadamente estrecha: un solo codigo de dominio y dos
// claves numericas fijas. No es "cualquier codigo con cualquier primitivo" --
// eso reenviaria de mas apenas alguien agregue un campo nuevo al cuerpo de
// una excepcion sin pensar en que es publico. Ampliar esta lista es una
// decision explicita, campo por campo, no un efecto secundario.
const CAMPOS_DETALLE_HORIZONTE_VENCIDO = [
  'dia_faena',
  'ultimo_dia_observado',
] as const;

function extraerDetalleHorizonteVencido(respuesta: unknown): {
  codigo?: string;
  detalle: Record<string, number>;
} {
  if (!respuesta || typeof respuesta !== 'object') return { detalle: {} };
  const objeto = respuesta as Record<string, unknown>;
  if (objeto.codigo !== 'horizonte_vencido') return { detalle: {} };

  const detalle: Record<string, number> = {};
  for (const clave of CAMPOS_DETALLE_HORIZONTE_VENCIDO) {
    const valor = objeto[clave];
    if (typeof valor === 'number') detalle[clave] = valor;
  }
  return { codigo: 'horizonte_vencido', detalle };
}
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
    if (
      !(exception instanceof HttpException) &&
      esViolacionDeLlaveForanea(exception)
    ) {
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
    let codigo: string | undefined;
    let detalle: Record<string, string | number | boolean> = {};

    if (exception instanceof HttpException) {
      const respuesta = exception.getResponse();
      if (typeof respuesta === 'string') {
        message = respuesta;
      } else if (respuesta && typeof respuesta === 'object') {
        const detalleMensaje = (respuesta as { message?: unknown }).message;
        if (Array.isArray(detalleMensaje)) {
          errors = detalleMensaje as string[];
          message = 'Error de validación';
        } else if (typeof detalleMensaje === 'string') {
          message = detalleMensaje;
        }
      }
      ({ codigo, detalle } = extraerDetalleHorizonteVencido(respuesta));
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
      ...(codigo ? { codigo, ...detalle } : {}),
      timestamp: new Date().toISOString(),
      path: request.url,
      requestId: response.getHeader('X-Request-Id'),
    });
  }
}
