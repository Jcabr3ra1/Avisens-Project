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

const CLAVES_RESERVADAS = new Set(['message', 'statusCode', 'error']);

// Solo se reenvia si la excepcion declara "codigo" -- ese campo es el gesto
// explicito de "esto es un error de dominio estructurado a proposito", no
// un accidente. Aun asi, solo se copian valores primitivos: un objeto o
// array en el cuerpo de la excepcion se descarta, para no reenviar datos
// arbitrarios de excepciones que no pensaron en esto.

function extraerCodigoYDetalle(respuesta: unknown): {
  codigo?: string;
  detalle: Record<string, string | number | boolean>;
} {
  if (!respuesta || typeof respuesta !== 'object') return { detalle: {} };
  const objeto = respuesta as Record<string, unknown>;
  const codigo = typeof objeto.codigo === 'string' ? objeto.codigo : undefined;
  if (!codigo) return { detalle: {} };

  const detalle: Record<string, string | number | boolean> = {};
  for (const [clave, valor] of Object.entries(objeto)) {
    if (CLAVES_RESERVADAS.has(clave) || clave === 'codigo') continue;
    if (
      typeof valor === 'string' ||
      typeof valor === 'number' ||
      typeof valor === 'boolean'
    ) {
      detalle[clave] = valor;
    }
  }
  return { codigo, detalle };
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
      ({ codigo, detalle } = extraerCodigoYDetalle(respuesta));
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
