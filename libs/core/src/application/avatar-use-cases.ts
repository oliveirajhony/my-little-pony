import { DomainError } from '../domain/errors.js';
import type { User } from '../domain/user.js';
import type { AvatarStorage, Clock, UserRepository } from './ports.js';

/** The processed image bytes ready to be stored, with their MIME type. */
export type AvatarImage = { data: Uint8Array; contentType: string };

/**
 * Stores a user's avatar in the (private) object storage and records the
 * public URL the API will serve it under on the user aggregate.
 */
export class SetAvatar {
  constructor(
    private readonly users: UserRepository,
    private readonly storage: AvatarStorage,
    private readonly clock: Clock,
  ) {}

  async execute(userId: string, image: AvatarImage, publicUrl: string): Promise<User> {
    const user = await this.users.findById(userId);
    if (!user) throw new DomainError('user-not-found');

    await this.storage.put({ userId, data: image.data, contentType: image.contentType });
    user.setAvatar(publicUrl, this.clock.now());
    await this.users.save(user);
    return user;
  }
}

/** Removes a user's avatar from storage and clears it on the aggregate. */
export class RemoveAvatar {
  constructor(
    private readonly users: UserRepository,
    private readonly storage: AvatarStorage,
    private readonly clock: Clock,
  ) {}

  async execute(userId: string): Promise<User> {
    const user = await this.users.findById(userId);
    if (!user) throw new DomainError('user-not-found');

    await this.storage.remove(userId);
    user.setAvatar(null, this.clock.now());
    await this.users.save(user);
    return user;
  }
}
