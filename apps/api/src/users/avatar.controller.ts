import { type AvatarStorage, DomainError, RemoveAvatar, SetAvatar } from '@my-little-pony/core';
import {
  Body,
  Controller,
  Delete,
  Get,
  Inject,
  NotFoundException,
  Param,
  Post,
  Res,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import type { Response } from 'express';
import sharp from 'sharp';
import { AccessTokenGuard, type AuthUser, CurrentUser } from '../auth/access-token.guard';
import { APP_CONFIG } from '../config/config.module';
import type { AppConfig } from '../config/env.schema';
import { AVATAR_STORAGE } from '../tokens';
import { fetchImageFromUrl } from './ssrf-guard';
import { toUserView } from './user-view';
import { AvatarFromUrlDto } from './users.dto';

const MAX_UPLOAD_BYTES = 5 * 1024 * 1024;

// Minimal shape of the multer upload we rely on (avoids a @types/multer dep).
type UploadedImage = { buffer: Buffer; mimetype: string; size: number };

@ApiTags('users')
@Controller('users')
export class AvatarController {
  constructor(
    private readonly setAvatar: SetAvatar,
    private readonly removeAvatar: RemoveAvatar,
    @Inject(AVATAR_STORAGE) private readonly storage: AvatarStorage,
    @Inject(APP_CONFIG) private readonly config: AppConfig,
  ) {}

  @Post('me/avatar')
  @UseGuards(AccessTokenGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Envia uma imagem de avatar' })
  @UseInterceptors(FileInterceptor('file', { limits: { fileSize: MAX_UPLOAD_BYTES } }))
  async upload(@CurrentUser() user: AuthUser, @UploadedFile() file?: UploadedImage) {
    if (!file?.buffer?.length) throw new DomainError('invalid-image');
    if (!file.mimetype.startsWith('image/')) throw new DomainError('invalid-image');
    if (file.size > MAX_UPLOAD_BYTES) throw new DomainError('invalid-image');

    const image = await this.processImage(file.buffer);
    const publicUrl = this.buildPublicUrl(user.id);
    return toUserView(await this.setAvatar.execute(user.id, image, publicUrl));
  }

  @Post('me/avatar/from-url')
  @UseGuards(AccessTokenGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Importa um avatar a partir de uma URL' })
  async uploadFromUrl(@CurrentUser() user: AuthUser, @Body() dto: AvatarFromUrlDto) {
    const source = await fetchImageFromUrl(dto.url);
    const image = await this.processImage(source);
    const publicUrl = this.buildPublicUrl(user.id);
    return toUserView(await this.setAvatar.execute(user.id, image, publicUrl));
  }

  @Delete('me/avatar')
  @UseGuards(AccessTokenGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Remove o avatar' })
  async remove(@CurrentUser() user: AuthUser) {
    return toUserView(await this.removeAvatar.execute(user.id));
  }

  @Get(':id/avatar')
  @ApiOperation({ summary: 'Serve o avatar de um usuário' })
  async serve(@Param('id') id: string, @Res() res: Response): Promise<void> {
    const avatar = await this.storage.get(id);
    if (!avatar) throw new NotFoundException('Avatar não encontrado.');
    res.setHeader('Content-Type', avatar.contentType);
    res.setHeader('Cache-Control', 'private, max-age=300');
    res.end(Buffer.from(avatar.data));
  }

  /** Normalize any input to a square 256px WebP to store and serve. */
  private async processImage(buffer: Buffer): Promise<{ data: Uint8Array; contentType: string }> {
    try {
      const data = await sharp(buffer)
        .rotate()
        .resize(256, 256, { fit: 'cover' })
        .webp({ quality: 82 })
        .toBuffer();
      return { data, contentType: 'image/webp' };
    } catch {
      throw new DomainError('invalid-image');
    }
  }

  private buildPublicUrl(userId: string): string {
    return `${this.config.apiPublicUrl}/users/${userId}/avatar?v=${Date.now()}`;
  }
}
