import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, Matches, MaxLength } from 'class-validator';

// Una dirección real nombra la vía con palabras (Calle, Vereda…); un texto
// de solo dígitos o símbolos, como el «1111…» de QA-05, no lo es.
export const DIRECCION_CON_TEXTO = /\p{L}{2,}/u;

export class DatosGranjaDto {
  @ApiProperty({ example: 'Vereda El Progreso km 4' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  @Matches(DIRECCION_CON_TEXTO, {
    message: 'La dirección debe indicar la vía con texto (calle, carrera, vereda…), no solo números',
  })
  direccion: string;

  @ApiProperty({ example: 'Rionegro' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  municipio: string;

  @ApiProperty({ example: 'Antioquia' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  departamento: string;
}
