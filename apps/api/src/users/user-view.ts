import type { User } from '@my-little-pony/core';

export type UserView = {
  id: string;
  name: string;
  email: string;
  avatarUrl: string | null;
};

/** Public projection of a user — never exposes the password hash. */
export function toUserView(user: User): UserView {
  return { id: user.id, name: user.name, email: user.email, avatarUrl: user.avatarUrl };
}
