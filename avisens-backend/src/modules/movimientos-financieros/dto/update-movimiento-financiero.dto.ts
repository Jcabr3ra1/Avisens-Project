import { PartialType } from '@nestjs/swagger';
import { CreateMovimientoFinancieroDto } from './create-movimiento-financiero.dto';

export class UpdateMovimientoFinancieroDto extends PartialType(
  CreateMovimientoFinancieroDto,
) {}
