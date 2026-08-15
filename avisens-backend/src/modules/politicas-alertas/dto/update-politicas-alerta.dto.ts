import { PartialType } from '@nestjs/swagger';
import { CreatePoliticasAlertaDto } from './create-politicas-alerta.dto';

export class UpdatePoliticasAlertaDto extends PartialType(
  CreatePoliticasAlertaDto,
){}