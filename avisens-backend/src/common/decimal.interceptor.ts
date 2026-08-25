import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

function aNumero(valor: unknown): unknown {
  if (Prisma.Decimal.isDecimal(valor)) {
    return valor.toNumber();
  }
  if (Array.isArray(valor)) return valor.map(aNumero);
  if (valor instanceof Date) return valor;
  if (valor && typeof valor === 'object') {
    const copia: Record<string, unknown> = {};
    for (const [clave, v] of Object.entries(valor)) {
      copia[clave] = aNumero(v);
    }
    return copia;
  }
  return valor;
}

@Injectable()
export class DecimalInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    return next.handle().pipe(map(aNumero));
  }
}