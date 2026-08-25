import { PartialType } from '@nestjs/swagger';
import { CreateMantenimientoDto } from './create-mantenimiento.dto';

export class UpdateMantenimientoDto extends PartialType(
  CreateMantenimientoDto,
) {}
