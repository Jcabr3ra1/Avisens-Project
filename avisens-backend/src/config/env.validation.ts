import { plainToInstance } from 'class-transformer';
import {
  IsString,
  IsNumberString,
  IsOptional,
  IsIn,
  MinLength,
  validateSync,
} from 'class-validator';

class EnvironmentVariables {
  @IsIn(['development', 'production', 'test'])
  @IsOptional()
  NODE_ENV: string;

  @IsString()
  DATABASE_URL: string;

  // Los secretos JWT deben ser largos: un secreto corto es adivinable por
  // fuerza bruta y permitiría falsificar tokens de sesión.
  @IsString()
  @MinLength(32)
  JWT_SECRET: string;

  @IsString()
  @MinLength(32)
  JWT_REFRESH_SECRET: string;

  @IsString()
  @IsOptional()
  JWT_EXPIRES_IN: string;

  @IsString()
  @IsOptional()
  JWT_REFRESH_EXPIRES_IN: string;

  @IsNumberString()
  @IsOptional()
  PORT: string;

  // Opcional: si no se define, main.ts refleja el origen de la petición
  // (útil en desarrollo). En producción conviene fijar el dominio del frontend.
  @IsString()
  @IsOptional()
  CORS_ORIGIN: string;
}

export function validateEnv(config: Record<string, unknown>) {
  const validated = plainToInstance(EnvironmentVariables, config, {
    enableImplicitConversion: true,
  });

  const errors = validateSync(validated, { skipMissingProperties: false });

  if (errors.length > 0) {
    throw new Error(`Variables de entorno inválidas:\n${errors.toString()}`);
  }

  return validated;
}
