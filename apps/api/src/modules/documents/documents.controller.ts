import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  Put,
  UseGuards,
} from '@nestjs/common';
import type { DocumentDetail, DocumentSummary } from '@quill-collab/shared';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import type { JwtPayload } from '../auth/strategies/jwt.strategy';
import { DocumentsService } from './documents.service';
import { CreateDocumentDto } from './dto/create-document.dto';
import { UpdateContentDto } from './dto/update-content.dto';
import { UpdateDocumentDto } from './dto/update-document.dto';

@UseGuards(JwtAuthGuard)
@Controller('documents')
export class DocumentsController {
  constructor(private readonly documents: DocumentsService) {}

  @Get()
  async listActive(@CurrentUser() jwt: JwtPayload): Promise<DocumentSummary[]> {
    const docs = await this.documents.listActive(jwt.sub);
    return docs.map(DocumentsService.toSummary);
  }

  @Get('trash')
  async listTrashed(
    @CurrentUser() jwt: JwtPayload,
  ): Promise<DocumentSummary[]> {
    const docs = await this.documents.listTrashed(jwt.sub);
    return docs.map(DocumentsService.toSummary);
  }

  @Get(':id')
  async getOne(
    @CurrentUser() jwt: JwtPayload,
    @Param('id') id: string,
  ): Promise<DocumentDetail> {
    const doc = await this.documents.findOne(jwt.sub, id);
    return DocumentsService.toDetail(doc);
  }

  @Post()
  async create(
    @CurrentUser() jwt: JwtPayload,
    @Body() dto: CreateDocumentDto,
  ): Promise<DocumentSummary> {
    const doc = await this.documents.create(jwt.sub, dto);
    return DocumentsService.toSummary(doc);
  }

  @Patch(':id')
  async rename(
    @CurrentUser() jwt: JwtPayload,
    @Param('id') id: string,
    @Body() dto: UpdateDocumentDto,
  ): Promise<DocumentSummary> {
    const doc = await this.documents.rename(jwt.sub, id, dto.title);
    return DocumentsService.toSummary(doc);
  }

  @Put(':id/content')
  async updateContent(
    @CurrentUser() jwt: JwtPayload,
    @Param('id') id: string,
    @Body() dto: UpdateContentDto,
  ): Promise<DocumentDetail> {
    const doc = await this.documents.updateContent(jwt.sub, id, dto.content);
    return DocumentsService.toDetail(doc);
  }

  @HttpCode(HttpStatus.NO_CONTENT)
  @Delete(':id')
  async softDelete(
    @CurrentUser() jwt: JwtPayload,
    @Param('id') id: string,
  ): Promise<void> {
    await this.documents.softDelete(jwt.sub, id);
  }

  @Post(':id/restore')
  async restore(
    @CurrentUser() jwt: JwtPayload,
    @Param('id') id: string,
  ): Promise<DocumentSummary> {
    const doc = await this.documents.restore(jwt.sub, id);
    return DocumentsService.toSummary(doc);
  }

  @HttpCode(HttpStatus.NO_CONTENT)
  @Delete(':id/permanent')
  async hardDelete(
    @CurrentUser() jwt: JwtPayload,
    @Param('id') id: string,
  ): Promise<void> {
    await this.documents.hardDelete(jwt.sub, id);
  }
}
