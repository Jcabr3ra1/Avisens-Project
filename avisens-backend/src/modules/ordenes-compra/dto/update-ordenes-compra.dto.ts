import { PartialType } from '@nestjs/swagger';
import { CreateOrdenesCompraDto } from './create-ordenes-compra.dto';

export class UpdateOrdenesCompraDto extends PartialType(
  CreateOrdenesCompraDto,
) {}
