import {
  IsInt,
  IsDateString,
  IsOptional,
  IsString,
  IsPositive,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateAlertasCanalesDto {
  @ApiProperty({
    example: 1,
    description: 'Id del canal donde se genera la alerta',
  })
  @IsInt()
  @IsPositive()
  alerta_id: number;

  @ApiPropertyOptional({
    example: 'sms',
    description: 'Recomendado exigirlo: sin canal el registro no sirve',
  })
  @IsString()
  @IsOptional()
  canal?: string;

  @ApiPropertyOptional({
    example: 'enviado',
    description: 'lo actualiza el backend con la respuesta del provedor ',
  })
  @IsString()
  @IsOptional()
  estado_envio?: string;

  @ApiPropertyOptional({
    example: '2023-01-01 12:00:00',
    description: 'la pone el backend al confirmar el envio ',
  })
  @IsDateString()
  @IsOptional()
  fecha_envio?: string;
}
