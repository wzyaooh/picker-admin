import { PartialType } from '@nestjs/mapped-types';
import { CreateSmsConfigDto } from './create-sms-config.dto';

export class UpdateSmsConfigDto extends PartialType(CreateSmsConfigDto) {}
