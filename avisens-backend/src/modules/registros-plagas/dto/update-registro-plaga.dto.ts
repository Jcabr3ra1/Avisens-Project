import { PartialType } from '@nestjs/swagger';
import { CreateRegistroPlagaDto } from './create-registro-plaga.dto';

export class UpdateRegistroPlagaDto extends PartialType(
  CreateRegistroPlagaDto,
) {}
