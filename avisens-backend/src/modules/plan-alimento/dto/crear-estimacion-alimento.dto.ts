import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsOptional, IsString } from 'class-validator';

export class CrearEstimacionAlimentoDto {
  @ApiPropertyOptional({
    example: 'Recalculo tras registrar mortalidad de la semana',
    description: 'Motivo de esta versión de la estimación',
  })
  @IsString()
  @IsOptional()
  motivo?: string;

  @ApiPropertyOptional({
    example: true,
    description:
      'Permite usar el perfil zootécnico estándar si el lote no tiene marca',
  })
  @IsBoolean()
  @IsOptional()
  permitir_fallback_estandar?: boolean;
}
