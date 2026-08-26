import { PartialType } from '@nestjs/swagger';
import { CreateOrganizacionDto } from './create-organizacion.dto';

export class UpdateOrganizacionDto extends PartialType(CreateOrganizacionDto) {}
