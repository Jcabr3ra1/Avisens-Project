import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, IsDateString } from 'class-validator';

export class UpdateAlertasCanalesDto {
  @ApiPropertyOptional({
    example: 'enviado',
    description: 'Actualizar estado del envío',
  })
  @IsString()
  @IsOptional()
  estado_envio?: string;

  @ApiPropertyOptional({
    example: '2023-01-01T12:00:00Z',
    description: 'Fecha de envío',
  })
  @IsDateString()
  @IsOptional()
  fecha_envio?: string;
}
