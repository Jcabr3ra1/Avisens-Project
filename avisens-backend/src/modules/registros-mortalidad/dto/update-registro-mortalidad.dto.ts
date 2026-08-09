import { PartialType } from '@nestjs/swagger';
import { CreateRegistroMortalidadDto } from './create-registro-mortalidad.dto';

export class UpdateRegistroMortalidadDto extends PartialType(
  CreateRegistroMortalidadDto,
) {}
