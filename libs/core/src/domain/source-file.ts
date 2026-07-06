import type { IndexStatus } from './document.js';
import { DomainError } from './errors.js';

/** Tipos de documento-fonte aceitos para importação (só leitura). */
export type SourceFileKind = 'pdf' | 'docx' | 'doc' | 'md' | 'html';

export const SOURCE_FILE_KINDS: readonly SourceFileKind[] = ['pdf', 'docx', 'doc', 'md', 'html'];

export type SourceFileProps = {
  id: string;
  ownerId: string;
  filename: string;
  kind: SourceFileKind;
  contentType: string;
  sizeBytes: number;
  createdAt: Date;
  /** Estado da indexação no pipeline de RAG (fila -> worker Python). */
  indexStatus: IndexStatus;
  /** Versão da indexação; sobe a cada pedido de (re)indexação. */
  version: number;
  /** Quando ficou pronto para busca/RAG (null enquanto não indexado). */
  indexedAt: Date | null;
};

/** Deriva o tipo a partir da extensão do nome. `null` = extensão não suportada. */
export function kindFromFilename(filename: string): SourceFileKind | null {
  const ext = filename.toLowerCase().split('.').pop() ?? '';
  switch (ext) {
    case 'pdf':
      return 'pdf';
    case 'docx':
      return 'docx';
    case 'doc':
      return 'doc';
    case 'md':
    case 'markdown':
      return 'md';
    case 'html':
    case 'htm':
      return 'html';
    default:
      return null;
  }
}

/**
 * Documento-fonte importado (contrato etc.), só-leitura. É o material que a
 * busca/RAG consulta. Os bytes vivem no storage (MinIO); esta entidade guarda
 * só os metadados. Framework-free — id/relógio são injetados.
 */
export class SourceFile {
  private constructor(private props: SourceFileProps) {}

  static fromProps(props: SourceFileProps): SourceFile {
    return new SourceFile(props);
  }

  static create(input: {
    id: string;
    ownerId: string;
    filename: string;
    contentType: string;
    sizeBytes: number;
    now: Date;
  }): SourceFile {
    const filename = input.filename.trim();
    if (filename.length === 0) throw new DomainError('invalid-file');
    const kind = kindFromFilename(filename);
    if (!kind) throw new DomainError('invalid-file');
    if (!Number.isFinite(input.sizeBytes) || input.sizeBytes <= 0) {
      throw new DomainError('invalid-file');
    }
    return new SourceFile({
      id: input.id,
      ownerId: input.ownerId,
      filename,
      kind,
      contentType: input.contentType,
      sizeBytes: input.sizeBytes,
      createdAt: input.now,
      // Todo arquivo importado entra na fila de indexação de imediato.
      indexStatus: 'indexing',
      version: 1,
      indexedAt: null,
    });
  }

  isOwnedBy(userId: string): boolean {
    return this.props.ownerId === userId;
  }

  /** Pede uma (re)indexação: sobe a versão e volta ao estado "indexing". */
  requestReindex(): void {
    this.props.version += 1;
    this.props.indexStatus = 'indexing';
    this.props.indexedAt = null;
  }

  /** Aplica o resultado do pipeline de indexação (vindo da fila). */
  setIndexStatus(status: IndexStatus, now: Date): void {
    this.props.indexStatus = status;
    this.props.indexedAt = status === 'ready' ? now : null;
  }

  get id(): string {
    return this.props.id;
  }
  get ownerId(): string {
    return this.props.ownerId;
  }
  get filename(): string {
    return this.props.filename;
  }
  get kind(): SourceFileKind {
    return this.props.kind;
  }
  get contentType(): string {
    return this.props.contentType;
  }
  get sizeBytes(): number {
    return this.props.sizeBytes;
  }
  get createdAt(): Date {
    return this.props.createdAt;
  }
  get indexStatus(): IndexStatus {
    return this.props.indexStatus;
  }
  get version(): number {
    return this.props.version;
  }
  get indexedAt(): Date | null {
    return this.props.indexedAt;
  }

  toProps(): SourceFileProps {
    return { ...this.props };
  }
}
