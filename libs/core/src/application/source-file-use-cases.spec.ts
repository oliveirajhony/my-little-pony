import { DomainError } from '../domain/errors.js';
import type { SourceFile } from '../domain/source-file.js';
import type {
  Clock,
  IdGenerator,
  SourceFileRepository,
  SourceFileStorage,
  StoredSourceFile,
} from './ports.js';
import {
  DeleteSourceFile,
  GetSourceFileContent,
  ImportSourceFile,
  ListSourceFiles,
} from './source-file-use-cases.js';

const clock: Clock = { now: () => new Date('2026-07-06T00:00:00.000Z') };

let seq = 0;
const ids: IdGenerator = { next: () => `f${++seq}` };

class FakeRepo implements SourceFileRepository {
  byId = new Map<string, SourceFile>();
  async save(file: SourceFile) {
    this.byId.set(file.id, file);
  }
  async findById(id: string) {
    return this.byId.get(id) ?? null;
  }
  async delete(id: string) {
    this.byId.delete(id);
  }
  async listByOwner(ownerId: string) {
    return [...this.byId.values()].filter((f) => f.isOwnedBy(ownerId));
  }
}

class FakeStorage implements SourceFileStorage {
  objects = new Map<string, StoredSourceFile>();
  private key(ownerId: string, fileId: string) {
    return `${ownerId}:${fileId}`;
  }
  async put(input: { ownerId: string; fileId: string; data: Uint8Array; contentType: string }) {
    this.objects.set(this.key(input.ownerId, input.fileId), {
      data: input.data,
      contentType: input.contentType,
    });
  }
  async get(input: { ownerId: string; fileId: string }) {
    return this.objects.get(this.key(input.ownerId, input.fileId)) ?? null;
  }
  async remove(input: { ownerId: string; fileId: string }) {
    this.objects.delete(this.key(input.ownerId, input.fileId));
  }
}

beforeEach(() => {
  seq = 0;
});

describe('ImportSourceFile', () => {
  it('stores the bytes and persists metadata derived from the file', async () => {
    const repo = new FakeRepo();
    const storage = new FakeStorage();
    const data = new Uint8Array([1, 2, 3, 4, 5]);
    const file = await new ImportSourceFile(repo, storage, ids, clock).execute({
      ownerId: 'u1',
      filename: 'contrato.pdf',
      contentType: 'application/pdf',
      data,
    });

    expect(file.id).toBe('f1');
    expect(file.kind).toBe('pdf');
    expect(file.sizeBytes).toBe(5);
    expect(repo.byId.get('f1')).toBeDefined();
    expect(storage.objects.get('u1:f1')).toEqual({ data, contentType: 'application/pdf' });
  });

  it('rejects an unsupported extension without touching storage', async () => {
    const repo = new FakeRepo();
    const storage = new FakeStorage();
    await expect(
      new ImportSourceFile(repo, storage, ids, clock).execute({
        ownerId: 'u1',
        filename: 'planilha.xlsx',
        contentType: 'application/vnd.ms-excel',
        data: new Uint8Array([1]),
      }),
    ).rejects.toThrow(DomainError);
    expect(storage.objects.size).toBe(0);
    expect(repo.byId.size).toBe(0);
  });
});

describe('ListSourceFiles', () => {
  it("returns only the owner's files", async () => {
    const repo = new FakeRepo();
    const storage = new FakeStorage();
    const importer = new ImportSourceFile(repo, storage, ids, clock);
    await importer.execute({
      ownerId: 'u1',
      filename: 'a.pdf',
      contentType: 'application/pdf',
      data: new Uint8Array([1]),
    });
    await importer.execute({
      ownerId: 'u2',
      filename: 'b.md',
      contentType: 'text/markdown',
      data: new Uint8Array([2]),
    });

    const list = await new ListSourceFiles(repo).execute({ ownerId: 'u1' });
    expect(list).toHaveLength(1);
    expect(list[0].filename).toBe('a.pdf');
  });
});

describe('GetSourceFileContent', () => {
  it('returns the bytes and filename for the owner', async () => {
    const repo = new FakeRepo();
    const storage = new FakeStorage();
    await new ImportSourceFile(repo, storage, ids, clock).execute({
      ownerId: 'u1',
      filename: 'x.md',
      contentType: 'text/markdown',
      data: new Uint8Array([9]),
    });
    const { filename, content } = await new GetSourceFileContent(repo, storage).execute({
      ownerId: 'u1',
      id: 'f1',
    });
    expect(filename).toBe('x.md');
    expect(content.contentType).toBe('text/markdown');
  });

  it('rejects access by a non-owner (forbidden)', async () => {
    const repo = new FakeRepo();
    const storage = new FakeStorage();
    await new ImportSourceFile(repo, storage, ids, clock).execute({
      ownerId: 'u1',
      filename: 'x.md',
      contentType: 'text/markdown',
      data: new Uint8Array([9]),
    });
    await expect(
      new GetSourceFileContent(repo, storage).execute({ ownerId: 'u2', id: 'f1' }),
    ).rejects.toMatchObject({ code: 'forbidden' });
  });

  it('raises file-not-found for an unknown id', async () => {
    const repo = new FakeRepo();
    const storage = new FakeStorage();
    await expect(
      new GetSourceFileContent(repo, storage).execute({ ownerId: 'u1', id: 'nope' }),
    ).rejects.toMatchObject({ code: 'file-not-found' });
  });
});

describe('DeleteSourceFile', () => {
  it('removes metadata and bytes for the owner', async () => {
    const repo = new FakeRepo();
    const storage = new FakeStorage();
    await new ImportSourceFile(repo, storage, ids, clock).execute({
      ownerId: 'u1',
      filename: 'x.pdf',
      contentType: 'application/pdf',
      data: new Uint8Array([1]),
    });
    await new DeleteSourceFile(repo, storage).execute({ ownerId: 'u1', id: 'f1' });
    expect(repo.byId.size).toBe(0);
    expect(storage.objects.size).toBe(0);
  });

  it('rejects deletion by a non-owner', async () => {
    const repo = new FakeRepo();
    const storage = new FakeStorage();
    await new ImportSourceFile(repo, storage, ids, clock).execute({
      ownerId: 'u1',
      filename: 'x.pdf',
      contentType: 'application/pdf',
      data: new Uint8Array([1]),
    });
    await expect(
      new DeleteSourceFile(repo, storage).execute({ ownerId: 'u2', id: 'f1' }),
    ).rejects.toMatchObject({ code: 'forbidden' });
    expect(repo.byId.size).toBe(1);
  });
});
