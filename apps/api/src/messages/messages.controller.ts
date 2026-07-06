import { ListContactMessages, MarkContactMessageRead } from '@my-little-pony/core';
import {
  Controller,
  Get,
  HttpCode,
  NotFoundException,
  Param,
  ParseUUIDPipe,
  Patch,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiNoContentResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { AccessTokenGuard, type AuthUser, CurrentUser } from '../auth/access-token.guard';
import { ContactMessageListResponse } from './message.response';
import { toContactMessageView } from './message-view';
import { ListMessagesDto } from './messages.dto';

const DEFAULT_PAGE = 1;
const DEFAULT_LIMIT = 20;
const IdParam = new ParseUUIDPipe({ exceptionFactory: () => new NotFoundException() });

// Inbox do autor: mensagens de "Fale com a gente" deixadas nos seus documentos.
@ApiTags('messages')
@ApiBearerAuth()
@Controller('me/messages')
@UseGuards(AccessTokenGuard)
export class MessagesController {
  constructor(
    private readonly listMessages: ListContactMessages,
    private readonly markRead: MarkContactMessageRead,
  ) {}

  @Get()
  @ApiOperation({ summary: 'Lista as mensagens recebidas (com não-lidas)' })
  @ApiOkResponse({ type: ContactMessageListResponse })
  async list(@CurrentUser() user: AuthUser, @Query() query: ListMessagesDto) {
    const page = query.page ?? DEFAULT_PAGE;
    const limit = query.limit ?? DEFAULT_LIMIT;
    const result = await this.listMessages.execute({ ownerId: user.id, page, limit });
    return {
      items: result.items.map(toContactMessageView),
      total: result.total,
      unread: result.unread,
      page,
      limit,
    };
  }

  @Patch(':id/read')
  @HttpCode(204)
  @ApiOperation({ summary: 'Marca uma mensagem como lida' })
  @ApiNoContentResponse()
  async read(@CurrentUser() user: AuthUser, @Param('id', IdParam) id: string) {
    await this.markRead.execute({ id, ownerId: user.id });
  }
}
