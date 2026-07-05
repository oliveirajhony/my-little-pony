import { describe, expect, it } from 'vitest';
import { findPublishedDoc } from './mock-data';

describe('findPublishedDoc', () => {
  it('encontra um documento publicado por slug', () => {
    expect(findPublishedDoc('guia-boas-praticas')?.title).toBe('Guia de boas práticas de escrita');
  });

  it('injeta o conteúdo (content) do seed', () => {
    expect(findPublishedDoc('guia-boas-praticas')?.content).toContain('Voz ativa');
  });

  it('ignora rascunhos', () => {
    expect(findPublishedDoc('ideias-newsletter')).toBeUndefined();
  });

  it('retorna undefined para slug inexistente', () => {
    expect(findPublishedDoc('nao-existe')).toBeUndefined();
  });
});
