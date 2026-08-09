import { PartialType } from '@nestjs/swagger';
import { CreateEventoSanitarioDto } from './create-evento-sanitario.dto';

export class UpdateEventoSanitarioDto extends PartialType(
  CreateEventoSanitarioDto,
) {}
