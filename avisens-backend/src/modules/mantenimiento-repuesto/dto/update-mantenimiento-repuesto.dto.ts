import { PartialType } from '@nestjs/swagger';
import { CreateMantenimientoRepuestoDto } from './create-mantenimiento-repuesto.dto';

export class UpdateMantenimientoRepuestoDto extends PartialType(
  CreateMantenimientoRepuestoDto,
) {}
