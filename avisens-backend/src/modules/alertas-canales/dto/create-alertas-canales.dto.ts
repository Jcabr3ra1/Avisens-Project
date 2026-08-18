// ============================================================================
// REVISION (Juan) — corregir antes de mergear:
//  1) RENOMBRAR este archivo a "create-alertas-canales.dto.ts" (con PUNTO, no
//     guion). La convencion del proyecto y el spec lo importan como ".dto"; con
//     "-dto" tsc no lo encuentra (falla el CI).
//  2) Validadores equivocados abajo (ver comentarios en cada campo).
// ============================================================================
import { IsInt, IsDateString, IsOptional, IsString, IsPositive } from 'class-validator';
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
  // REVISION (Juan): @IsPositive() es SOLO para numeros; en un string sobra y
  // rompe la validacion (rechazaria "sms"). Ademas falta @IsOptional() (canal es
  // opcional en el schema). Debe quedar: @IsString() + @IsOptional().
  @IsString()
  @IsOptional()

  canal?: string;

  @ApiPropertyOptional({
    example: 'enviado',
    description: 'lo actualiza el backend con la respuesta del provedor ',
  })
  // REVISION (Juan): estado_envio es un STRING (ej. "enviado"), no un numero.
  // @IsInt() y @IsPositive() estan mal: deben ser @IsString() + @IsOptional().
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
