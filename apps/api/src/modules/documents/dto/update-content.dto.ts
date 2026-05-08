import { IsNotEmpty, IsObject } from 'class-validator';

export class UpdateContentDto {
  @IsObject()
  @IsNotEmpty()
  content!: Record<string, unknown>;
}
