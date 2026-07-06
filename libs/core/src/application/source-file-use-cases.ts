import type { IndexStatus } from '../domain/document.js';
import { DomainError } from '../domain/errors.js';
import { SourceFile } from '../domain/source-file.js';
import type {
  Clock,
  EventPublisher,
  IdGenerator,
  SourceFileRepository,
  SourceFileStorage,
  StoredSourceFile,
} from './ports.js';

/** Carrega um arquivo garantindo existência + posse (404/403 no domínio). */
async function loadOwned(
  repo: SourceFileRepository,
  id: string,
  ownerId: string,
): Promise<SourceFile> {
  const file = await repo.findById(id);
  if (!file) throw new DomainError('file-not-found');
  if (!file.isOwnedBy(ownerId)) throw new DomainError('forbidden');
  return file;
}

/**
 * Importa (faz upload de) um documento-fonte: grava os bytes e os metadados e
 * pede a indexação (fila -> worker Python) para o arquivo ficar buscável/RAG.
 */
export class ImportSourceFile {
  constructor(
    private readonly repo: SourceFileRepository,
    private readonly storage: SourceFileStorage,
    private readonly ids: IdGenerator,
    private readonly clock: Clock,
    private readonly events: EventPublisher,
  ) {}

  async execute(input: {
    ownerId: string;
    filename: string;
    contentType: string;
    data: Uint8Array;
  }): Promise<SourceFile> {
    const file = SourceFile.create({
      id: this.ids.next(),
      ownerId: input.ownerId,
      filename: input.filename,
      contentType: input.contentType,
      sizeBytes: input.data.byteLength,
      now: this.clock.now(),
    });
    await this.storage.put({
      ownerId: file.ownerId,
      fileId: file.id,
      data: input.data,
      contentType: file.contentType,
    });
    await this.repo.save(file);
    await this.events.indexRequested({
      documentId: file.id,
      ownerId: file.ownerId,
      version: file.version,
      kind: 'file',
    });
    return file;
  }
}

export class ListSourceFiles {
  constructor(private readonly repo: SourceFileRepository) {}

  execute(input: { ownerId: string }): Promise<SourceFile[]> {
    return this.repo.listByOwner(input.ownerId);
  }
}

/** Devolve os bytes + contentType de um arquivo do autor (para preview). */
export class GetSourceFileContent {
  constructor(
    private readonly repo: SourceFileRepository,
    private readonly storage: SourceFileStorage,
  ) {}

  async execute(input: {
    ownerId: string;
    id: string;
  }): Promise<{ filename: string; content: StoredSourceFile }> {
    const file = await loadOwned(this.repo, input.id, input.ownerId);
    const content = await this.storage.get({ ownerId: file.ownerId, fileId: file.id });
    if (!content) throw new DomainError('file-not-found');
    return { filename: file.filename, content };
  }
}

/**
 * Aplica o resultado do pipeline de indexação a um arquivo (vindo da fila).
 * System-level: sem checagem de dono. Arquivo removido no meio é ignorado.
 */
export class MarkSourceFileIndexed {
  constructor(
    private readonly repo: SourceFileRepository,
    private readonly clock: Clock,
  ) {}

  async execute(input: { id: string; status: IndexStatus }): Promise<void> {
    const file = await this.repo.findById(input.id);
    if (!file) return;
    file.setIndexStatus(input.status, this.clock.now());
    await this.repo.save(file);
  }
}

export class DeleteSourceFile {
  constructor(
    private readonly repo: SourceFileRepository,
    private readonly storage: SourceFileStorage,
    private readonly events: EventPublisher,
  ) {}

  async execute(input: { ownerId: string; id: string }): Promise<void> {
    const file = await loadOwned(this.repo, input.id, input.ownerId);
    await this.repo.delete(file.id);
    await this.storage.remove({ ownerId: file.ownerId, fileId: file.id });
    // Remove os vetores do índice para o arquivo sumir da busca/RAG.
    await this.events.deindexRequested({
      documentId: file.id,
      ownerId: file.ownerId,
      kind: 'file',
    });
  }
}
