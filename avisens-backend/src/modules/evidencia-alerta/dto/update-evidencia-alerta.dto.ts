import { PartialType } from '@nestjs/swagger';
import { CreateEvidenciaAlertaDto } from './create-evidencia-alerta.dto';

export class UpdateEvidenciaAlertaDto extends PartialType(
  CreateEvidenciaAlertaDto,
) {}
