import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsIn, IsInt, IsOptional, Min } from 'class-validator';
import { CATEGORIAS_PQRS } from '../dominio/pqrs';
import { TextoSeguro } from '../../../common/validation/texto';

export class CreateSolicitudPqrsDto {
  @ApiProperty({ example: 1, description: 'ID del prospecto que radica la PQRS' })
  @IsInt()
  @Min(1)
  prospecto_id: number;

  @ApiProperty({
    example: 'Petición',
    description: 'Categoria: Petición | Queja | Reclamo | Sugerencia | Felicitación',
  })
  @IsIn(CATEGORIAS_PQRS)
  categoria: string;

  @ApiPropertyOptional({ example: 'Los sensores no llegan', description: 'Asunto de la solicitud' })
  @IsOptional()
  @TextoSeguro('El asunto', 200)
  asunto?: string;

  @ApiPropertyOptional({
    example: 'Hace 3 semanas pedí información y no he recibido respuesta',
    description: 'Detalle de la solicitud',
  })
  @IsOptional()
  @TextoSeguro('El mensaje', 4000, { multilinea: true })
  mensaje?: string;
}
