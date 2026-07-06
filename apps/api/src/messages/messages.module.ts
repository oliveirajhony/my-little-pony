import {
  type Clock,
  type ContactMessageRepository,
  ListContactMessages,
  MarkContactMessageRead,
} from '@my-little-pony/core';
import { Module } from '@nestjs/common';
import { CLOCK, CONTACT_MESSAGE_REPOSITORY } from '../tokens';
import { MessagesController } from './messages.controller';

@Module({
  controllers: [MessagesController],
  providers: [
    {
      provide: ListContactMessages,
      inject: [CONTACT_MESSAGE_REPOSITORY],
      useFactory: (messages: ContactMessageRepository) => new ListContactMessages(messages),
    },
    {
      provide: MarkContactMessageRead,
      inject: [CONTACT_MESSAGE_REPOSITORY, CLOCK],
      useFactory: (messages: ContactMessageRepository, clock: Clock) =>
        new MarkContactMessageRead(messages, clock),
    },
  ],
})
export class MessagesModule {}
