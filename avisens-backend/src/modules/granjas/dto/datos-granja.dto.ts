import { ApiProperty } from '@nestjs/swagger';
import { Matches } from 'class-validator';
import {
  NombreEntidad,
  TextoSeguro,
} from '../../../common/validation/texto';

// Una dirección real nombra la vía con palabras (Calle, Vereda…); un texto
// de solo dígitos o símbolos, como el «1111…» de QA-05, no lo es.
export const DIRECCION_CON_TEXTO = /\p{L}{2,}/u;

export class DatosGranjaDto {
  @ApiProperty({ example: 'Vereda El Progreso km 4' })
  @TextoSeguro('La dirección', 200, { requerido: true })
  @Matches(DIRECCION_CON_TEXTO, {
    message: 'La dirección debe indicar la vía con texto (calle, carrera, vereda…), no solo números',
  })
  direccion: string;

  @ApiProperty({ example: 'Rionegro' })
  @NombreEntidad('El municipio', 100)
  municipio: string;

  @ApiProperty({ example: 'Antioquia' })
  @NombreEntidad('El departamento', 100)
  departamento: string;
}
