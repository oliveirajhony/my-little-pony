import { Column, Entity, PrimaryColumn } from 'typeorm';

/** Row mapping for the `users` table. The domain id is supplied by the app. */
@Entity({ name: 'users' })
export class UserOrmEntity {
  @PrimaryColumn('uuid')
  id!: string;

  @Column({ type: 'text' })
  name!: string;

  @Column({ type: 'text', unique: true })
  email!: string;

  @Column({ type: 'text', name: 'password_hash' })
  passwordHash!: string;

  @Column({ type: 'text', name: 'avatar_url', nullable: true })
  avatarUrl!: string | null;

  @Column({ type: 'timestamptz', name: 'created_at' })
  createdAt!: Date;

  @Column({ type: 'timestamptz', name: 'updated_at' })
  updatedAt!: Date;
}
