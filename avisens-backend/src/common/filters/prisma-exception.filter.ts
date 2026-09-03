import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import type { Request, Response } from 'express';

@Catch(Prisma.PrismaClientKnownRequestError)
export class PrismaExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(PrismaExceptionFilter.name);

  catch(exception: Prisma.PrismaClientKnownRequestError, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let message = 'Error de base de datos';

    switch (exception.code) {
      case 'P2002': {
        status = HttpStatus.CONFLICT;
        const target = (exception.meta?.target as string[] | undefined)?.join(
          ', ',
        );
        message = target
          ? `Ya existe un registro con ese valor en: ${target}`
          : 'El registro ya existe';
        break;
      }
      case 'P2025': {
        status = HttpStatus.NOT_FOUND;
        message = 'Registro no encontrado';
        break;
      }
      case 'P2003': {
        // Una llave foránea se rompe en dos direcciones opuestas, y el mensaje
        // tiene que decir cuál de las dos fue. Al crear o actualizar, el padre
        // al que se apunta no existe. Al borrar es al revés: el padre existe y
        // lo que lo bloquea son los hijos que cuelgan de él. Decir "el registro
        // relacionado no existe" cuando alguien intenta borrar una granja con
        // galpones describe justo la situación contraria a la que pasó.
        if (request.method === 'DELETE') {
          status = HttpStatus.CONFLICT;
          message =
            'No se puede eliminar: todavía hay registros que dependen de este';
        } else {
          status = HttpStatus.BAD_REQUEST;
          message = 'Referencia inválida: el registro relacionado no existe';
        }
        break;
      }
      default:
        this.logger.error(`Prisma ${exception.code}: ${exception.message}`);
    }

    response.status(status).json({
      statusCode: status,
      message,
      timestamp: new Date().toISOString(),
      path: request.url,
    });
  }
}
