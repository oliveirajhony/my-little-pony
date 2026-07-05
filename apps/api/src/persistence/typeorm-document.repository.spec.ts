import { Document, DomainError } from '@my-little-pony/core';
import type { Repository } from 'typeorm';
import { describe, expect, it, vi } from 'vitest';
import type { DocumentOrmEntity } from './document.orm-entity';
import { TypeOrmDocumentRepository } from './typeorm-document.repository';

function uniqueViolation(constraint: string) {
  return {
    name: 'QueryFailedError',
    driverError: { code: '23505', constraint },
  };
}

function aDocument(): Document {
  return Document.create({ id: 'doc-1', ownerId: 'owner-1', title: 'Título', now: new Date() });
}

describe('TypeOrmDocumentRepository.save', () => {
  it('maps a unique-violation on the published-slug index to slug-taken', async () => {
    const fakeRepo = {
      save: vi.fn().mockRejectedValue(uniqueViolation('documents_published_slug_idx')),
    } as unknown as Repository<DocumentOrmEntity>;
    const repository = new TypeOrmDocumentRepository(fakeRepo);

    const error = await repository.save(aDocument()).catch((thrown: unknown) => thrown);
    expect(error).toBeInstanceOf(DomainError);
    expect((error as DomainError).code).toBe('slug-taken');
  });

  it('rethrows unrelated errors untouched', async () => {
    const otherError = new Error('connection reset');
    const fakeRepo = {
      save: vi.fn().mockRejectedValue(otherError),
    } as unknown as Repository<DocumentOrmEntity>;
    const repository = new TypeOrmDocumentRepository(fakeRepo);

    await expect(repository.save(aDocument())).rejects.toBe(otherError);
  });
});
