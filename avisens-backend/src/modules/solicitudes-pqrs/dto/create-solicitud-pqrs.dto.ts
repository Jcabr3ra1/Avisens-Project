import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsIn, IsInt, IsOptional, IsString, MaxLength } from 'class-validator';
import { CATEGORIAS_PQRS } from '../dominio/pqrs';

export class CreateSolicitudPqrsDto {
  @ApiProperty({ example: 1, description: 'ID del prospecto que radica la PQRS' })
  @IsInt()
  prospecto_id: number;

  @ApiProperty({
    example: 'Petición',
    description: 'Categoria: Petición | Queja | Reclamo | Sugerencia | Felicitación',
  })
  @IsIn(CATEGORIAS_PQRS)
  categoria: string;

  @ApiPropertyOptional({ example: 'Los sensores no llegan', description: 'Asunto de la solicitud' })
  @IsString()
  @MaxLength(200)
  @IsOptional()
  asunto?: string;

  @ApiPropertyOptional({
    example: 'Hace 3 semanas pedí información y no he recibido respuesta',
    description: 'Detalle de la solicitud',
  })
  @IsString()
  @MaxLength(4000)
  @IsOptional()
  mensaje?: string;
}
