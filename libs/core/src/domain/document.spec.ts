import { Document } from './document.js';

const now = new Date('2026-07-05T00:00:00.000Z');
const later = new Date('2026-07-06T00:00:00.000Z');

describe('Document', () => {
  it('creates an empty draft with a slug from the title', () => {
    const doc = Document.create({ id: 'd1', ownerId: 'u1', title: 'Guia de Boas Práticas', now });
    expect(doc.status).toBe('draft');
    expect(doc.slug).toBe('guia-de-boas-praticas');
    expect(doc.version).toBe(0);
    expect(doc.indexStatus).toBe('none');
  });

  it('falls back to a default title when empty', () => {
    expect(Document.create({ id: 'd1', ownerId: 'u1', title: '  ', now }).title).toBe(
      'Documento sem título',
    );
  });

  it('derives an excerpt from HTML content on edit and bumps the version', () => {
    const doc = Document.create({ id: 'd1', ownerId: 'u1', now });
    doc.applyEdit({ content: '<p>Voz ativa e frases curtas.</p>' }, later);
    expect(doc.excerpt).toBe('Voz ativa e frases curtas.');
    expect(doc.version).toBe(1);
    expect(doc.updatedAt).toEqual(later);
  });

  it('slugifies a provided slug on edit', () => {
    const doc = Document.create({ id: 'd1', ownerId: 'u1', now });
    doc.applyEdit({ slug: 'Minha Nota!!' }, later);
    expect(doc.slug).toBe('minha-nota');
  });

  it('publishes: sets status, publishedAt and indexing', () => {
    const doc = Document.create({ id: 'd1', ownerId: 'u1', now });
    doc.publish(later);
    expect(doc.status).toBe('published');
    expect(doc.publishedAt).toEqual(later);
    expect(doc.indexStatus).toBe('indexing');
  });

  it('keeps the original publishedAt when re-published', () => {
    const doc = Document.create({ id: 'd1', ownerId: 'u1', now });
    doc.publish(later);
    doc.unpublish(later);
    const evenLater = new Date('2026-07-07T00:00:00.000Z');
    doc.publish(evenLater);
    expect(doc.publishedAt).toEqual(later);
  });

  it('checks ownership', () => {
    const doc = Document.create({ id: 'd1', ownerId: 'u1', now });
    expect(doc.isOwnedBy('u1')).toBe(true);
    expect(doc.isOwnedBy('u2')).toBe(false);
  });
});
