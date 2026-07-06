import { Column, Entity, Index, PrimaryColumn } from 'typeorm';

@Entity({ name: 'contact_messages' })
@Index('contact_messages_owner_idx', ['ownerId', 'createdAt'])
export class ContactMessageOrmEntity {
  @PrimaryColumn('uuid')
  id!: string;

  @Column({ type: 'uuid', name: 'document_id' })
  documentId!: string;

  @Column({ type: 'uuid', name: 'owner_id' })
  ownerId!: string;

  @Column({ type: 'text', name: 'from_name' })
  fromName!: string;

  @Column({ type: 'text', name: 'from_email' })
  fromEmail!: string;

  @Column({ type: 'text' })
  message!: string;

  @Column({ type: 'timestamptz', name: 'created_at' })
  createdAt!: Date;

  @Column({ type: 'timestamptz', name: 'read_at', nullable: true })
  readAt!: Date | null;
}
