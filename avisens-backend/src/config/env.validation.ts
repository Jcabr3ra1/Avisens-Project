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

  if (validated.NODE_ENV === 'production' && !validated.CORS_ORIGIN) {
    throw new Error(
      'CORS_ORIGIN es obligatoria en producción (dominio del frontend)',
    );
  }

  return validated;
}
