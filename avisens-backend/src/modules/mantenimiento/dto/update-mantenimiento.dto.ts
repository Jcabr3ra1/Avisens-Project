import { PartialType } from '@nestjs/swagger';
import { createMantenimientoDto } from './create-mantenimiento.tdo';

export class UpdateMantenimientoDto extends PartialType(
	createMantenimientoDto,
) {}
