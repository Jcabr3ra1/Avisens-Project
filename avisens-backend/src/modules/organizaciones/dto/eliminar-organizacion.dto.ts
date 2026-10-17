import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, MaxLength } from 'class-validator';

/**
 * Borrar una organización es irreversible: arrastra sus usuarios, granjas,
 * galpones, lotes, sensores y mediciones. Se exige escribir su nombre exacto
 * para que un clic accidental o una petición repetida no la elimine.
 */
export class EliminarOrganizacionDto {
  @ApiProperty({
    example: 'Organización de pop',
    description: 'Nombre exacto de la organización, como confirmación.',
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  confirmacion: string;
}
