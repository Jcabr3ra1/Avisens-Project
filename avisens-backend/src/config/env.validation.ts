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

  @IsString()
  @IsOptional()
  REDIS_URL: string;

  @IsString()
  @IsOptional()
  REDIS_HOST: string;

  @IsNumberString()
  @IsOptional()
  REDIS_PORT: string;

  @IsIn(['true', 'false'])
  @IsOptional()
  JOBS_ENABLED: string;

  @IsNumberString()
  @IsOptional()
  JOB_HISTORY_DAYS: string;

  @IsNumberString()
  @IsOptional()
  IOT_IDEMPOTENCY_DAYS: string;

  @IsString()
  @IsOptional()
  ML_URL: string;

  @IsNumberString()
  @IsOptional()
  ML_TIMEOUT_MS: string;

  @IsString()
  @MinLength(32)
  @IsOptional()
  ML_INTERNAL_TOKEN: string;
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

  if (
    validated.NODE_ENV === 'production' &&
    !validated.REDIS_URL &&
    !validated.REDIS_HOST
  ) {
    throw new Error(
      'REDIS_URL o REDIS_HOST es obligatoria en producción (colas y jobs)',
    );
  }

  if (validated.NODE_ENV === 'production' && !validated.ML_INTERNAL_TOKEN) {
    throw new Error(
      'ML_INTERNAL_TOKEN es obligatoria en producción (comunicación Backend-ML)',
    );
  }

  return validated;
}
