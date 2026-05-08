import { IsOptional, IsString, MaxLength, MinLength } from 'class-validator';

export class CreateDocumentDto {
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(200)
  title?: string;
}
