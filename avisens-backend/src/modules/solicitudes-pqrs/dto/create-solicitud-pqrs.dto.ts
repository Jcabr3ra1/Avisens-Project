import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsInt, IsOptional, IsString } from 'class-validator';

export class CreateSolicitudPqrsDto {
  @ApiProperty({ example: 1, description: 'ID del prospecto que radica la PQRS' })
  @IsInt()
  prospecto_id: number;

  @ApiProperty({
    example: 'Petición',
    description: 'Categoria: Petición | Queja | Reclamo | Sugerencia | Felicitación',
  })
  @IsString()
  categoria: string;

  @ApiPropertyOptional({ example: 'Los sensores no llegan', description: 'Asunto de la solicitud' })
  @IsString()
  @IsOptional()
  asunto?: string;

  @ApiPropertyOptional({
    example: 'Hace 3 semanas pedí información y no he recibido respuesta',
    description: 'Detalle de la solicitud',
  })
  @IsString()
  @IsOptional()
  mensaje?: string;
}
