// ============================================================================
// RETROALIMENTACION: el DTO de actualizar estaba vacio.
// Se usa PartialType(CreatePoliticasAlertaDto): reutiliza todos los campos del
// crear pero los vuelve OPCIONALES, para poder actualizar solo lo que cambie
// (mismo patron que usan todos los modulos del proyecto, ej. curvas-objetivo).
// ============================================================================
import { PartialType } from '@nestjs/swagger';
import { CreatePoliticasAlertaDto } from './create-politicas-alerta.dto';

export class UpdatePoliticasAlertaDto extends PartialType(
  CreatePoliticasAlertaDto,
) {}
