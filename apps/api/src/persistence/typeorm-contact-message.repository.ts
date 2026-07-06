import {
  ContactMessage,
  type ContactMessagePage,
  type ContactMessageRepository,
} from '@my-little-pony/core';
import { IsNull, type Repository } from 'typeorm';
import { ContactMessageOrmEntity } from './contact-message.orm-entity';

/** ContactMessageRepository port backed by TypeORM + Postgres. */
export class TypeOrmContactMessageRepository implements ContactMessageRepository {
  constructor(private readonly repo: Repository<ContactMessageOrmEntity>) {}

  async save(message: ContactMessage): Promise<void> {
    await this.repo.save(this.toOrm(message));
  }

  async findById(id: string): Promise<ContactMessage | null> {
    const row = await this.repo.findOne({ where: { id } });
    return row ? this.toDomain(row) : null;
  }

  async listByOwner(query: {
    ownerId: string;
    page: number;
    limit: number;
  }): Promise<ContactMessagePage> {
    const [rows, total] = await this.repo.findAndCount({
      where: { ownerId: query.ownerId },
      order: { createdAt: 'DESC' },
      skip: (query.page - 1) * query.limit,
      take: query.limit,
    });
    return { items: rows.map((row) => this.toDomain(row)), total };
  }

  async countUnread(ownerId: string): Promise<number> {
    return this.repo.count({ where: { ownerId, readAt: IsNull() } });
  }

  private toDomain(row: ContactMessageOrmEntity): ContactMessage {
    return ContactMessage.fromProps({
      id: row.id,
      documentId: row.documentId,
      ownerId: row.ownerId,
      fromName: row.fromName,
      fromEmail: row.fromEmail,
      message: row.message,
      createdAt: row.createdAt,
      readAt: row.readAt,
    });
  }

  private toOrm(message: ContactMessage): ContactMessageOrmEntity {
    const props = message.toProps();
    const row = new ContactMessageOrmEntity();
    row.id = props.id;
    row.documentId = props.documentId;
    row.ownerId = props.ownerId;
    row.fromName = props.fromName;
    row.fromEmail = props.fromEmail;
    row.message = props.message;
    row.createdAt = props.createdAt;
    row.readAt = props.readAt;
    return row;
  }
}
