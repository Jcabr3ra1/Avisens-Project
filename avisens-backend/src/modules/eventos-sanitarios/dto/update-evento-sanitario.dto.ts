import { OmitType, PartialType } from '@nestjs/swagger';
import { CreateEventoSanitarioDto } from './create-evento-sanitario.dto';

export class UpdateEventoSanitarioDto extends PartialType(
  OmitType(CreateEventoSanitarioDto, [
    'evento_padre_id',
    'cantidad_insumo',
  ] as const),
) {}
