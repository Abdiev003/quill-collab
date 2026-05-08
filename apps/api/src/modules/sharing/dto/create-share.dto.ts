import { IsEnum, IsOptional, IsDateString } from 'class-validator';

export class CreateShareDto {
  @IsEnum(['READ', 'WRITE'])
  permission!: 'READ' | 'WRITE';

  @IsOptional()
  @IsDateString()
  expiresAt?: string;
}
