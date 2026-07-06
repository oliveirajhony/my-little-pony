import { apiFetch, apiFetchBlob } from './api-client';

/**
 * Cliente da API de documentos-fonte ("Arquivos") do backend Nest — substitui o
 * antigo mock (localStorage + IndexedDB). Rotas autenticadas em `/source-files`
 * (Bearer + refresh no 401). O conteúdo (`/:id/content`) é baixado como Blob
 * porque a rota é protegida — um `<iframe src>` não carregaria o token.
 */

export type FileKind = 'pdf' | 'docx' | 'doc' | 'md' | 'html';

/** Extensões aceitas no seletor / drop. */
export const ACCEPTED_EXT = ['.pdf', '.doc', '.docx', '.md', '.markdown', '.html', '.htm'] as const;
export const ACCEPT_ATTR = ACCEPTED_EXT.join(',');

export const KIND_LABEL: Record<FileKind, string> = {
  pdf: 'PDF',
  docx: 'DOCX',
  doc: 'DOC',
  md: 'Markdown',
  html: 'HTML',
};

export function kindFromName(name: string): FileKind | null {
  const ext = name.toLowerCase().split('.').pop() ?? '';
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

export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  const kb = bytes / 1024;
  if (kb < 1024) return `${kb.toFixed(kb < 10 ? 1 : 0)} KB`;
  return `${(kb / 1024).toFixed(1)} MB`;
}

/** Arquivo importado como a tela consome (nomes alinhados à UI existente). */
export type ImportedFile = {
  id: string;
  name: string;
  kind: FileKind;
  contentType: string;
  sizeBytes: number;
  importedAt: string;
};

/** Shape cru retornado pelo backend (`SourceFileResponse`). */
type SourceFileResponse = {
  id: string;
  filename: string;
  kind: FileKind;
  contentType: string;
  sizeBytes: number;
  createdAt: string;
};

function toImportedFile(dto: SourceFileResponse): ImportedFile {
  return {
    id: dto.id,
    name: dto.filename,
    kind: dto.kind,
    contentType: dto.contentType,
    sizeBytes: dto.sizeBytes,
    importedAt: dto.createdAt,
  };
}

export async function listArquivos(): Promise<ImportedFile[]> {
  const items = await apiFetch<SourceFileResponse[]>('/source-files');
  return items.map(toImportedFile);
}

export async function importArquivo(file: File): Promise<ImportedFile> {
  const form = new FormData();
  form.append('file', file);
  const dto = await apiFetch<SourceFileResponse>('/source-files', { method: 'POST', body: form });
  return toImportedFile(dto);
}

export function deleteArquivo(id: string): Promise<void> {
  return apiFetch<void>(`/source-files/${id}`, { method: 'DELETE' });
}

/** Baixa os bytes do arquivo para pré-visualização (rota autenticada). */
export function getArquivoBlob(id: string): Promise<Blob> {
  return apiFetchBlob(`/source-files/${id}/content`);
}
