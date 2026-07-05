import { DomainError } from './errors.js';

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export type UserProps = {
  id: string;
  name: string;
  email: string;
  passwordHash: string;
  avatarUrl: string | null;
  createdAt: Date;
  updatedAt: Date;
};

/**
 * User aggregate. Guards its own invariants: a normalized email, a non-empty
 * name. Passwords arrive already hashed — the domain never sees plaintext.
 */
export class User {
  private constructor(private props: UserProps) {}

  static normalizeEmail(email: string): string {
    return email.trim().toLowerCase();
  }

  static assertValidEmail(email: string): string {
    const normalized = User.normalizeEmail(email);
    if (!EMAIL_PATTERN.test(normalized)) throw new DomainError('invalid-email');
    return normalized;
  }

  static assertValidName(name: string): string {
    const trimmed = name.trim();
    if (trimmed.length === 0) throw new DomainError('invalid-name');
    return trimmed;
  }

  /** Rehydrate from persistence without re-running creation side effects. */
  static fromProps(props: UserProps): User {
    return new User(props);
  }

  static create(input: {
    id: string;
    name: string;
    email: string;
    passwordHash: string;
    now: Date;
    avatarUrl?: string | null;
  }): User {
    return new User({
      id: input.id,
      name: User.assertValidName(input.name),
      email: User.assertValidEmail(input.email),
      passwordHash: input.passwordHash,
      avatarUrl: input.avatarUrl ?? null,
      createdAt: input.now,
      updatedAt: input.now,
    });
  }

  get id(): string {
    return this.props.id;
  }
  get name(): string {
    return this.props.name;
  }
  get email(): string {
    return this.props.email;
  }
  get passwordHash(): string {
    return this.props.passwordHash;
  }
  get avatarUrl(): string | null {
    return this.props.avatarUrl;
  }
  get createdAt(): Date {
    return this.props.createdAt;
  }
  get updatedAt(): Date {
    return this.props.updatedAt;
  }

  rename(name: string, now: Date): void {
    this.props.name = User.assertValidName(name);
    this.props.updatedAt = now;
  }

  changeEmail(email: string, now: Date): void {
    this.props.email = User.assertValidEmail(email);
    this.props.updatedAt = now;
  }

  setAvatar(avatarUrl: string | null, now: Date): void {
    this.props.avatarUrl = avatarUrl;
    this.props.updatedAt = now;
  }

  setPasswordHash(passwordHash: string, now: Date): void {
    this.props.passwordHash = passwordHash;
    this.props.updatedAt = now;
  }

  toProps(): UserProps {
    return { ...this.props };
  }
}
