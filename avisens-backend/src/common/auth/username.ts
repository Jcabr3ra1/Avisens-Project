import { applyDecorators } from '@nestjs/common';
import { Transform } from 'class-transformer';
import { IsString, Length, Matches } from 'class-validator';

export const USERNAME_PATTERN = /^[a-z0-9][a-z0-9._-]{2,29}$/;

export function normalizarUsername(value: string): string {
  return value.trim().toLowerCase();
}

// La misma regla en alta, edición, ingreso y recuperación.
export function NombreUsuario() {
  return applyDecorators(
    Transform(({ value }: { value: unknown }) =>
      typeof value === 'string' ? normalizarUsername(value) : value,
    ),
    IsString(),
    Length(3, 30, { message: 'El usuario debe tener entre 3 y 30 caracteres' }),
    Matches(USERNAME_PATTERN, {
      message:
        'El usuario debe comenzar con una letra o número y solo admite letras sin tildes, números, punto, guion y guion bajo',
    }),
  );
}
