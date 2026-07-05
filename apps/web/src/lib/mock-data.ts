import type { LucideIcon } from 'lucide-react';
import { Globe, Settings } from 'lucide-react';
import { SEED_CONTENT } from './seed-content';

export type Screen = { title: string; href: string; icon: LucideIcon };

export const screens: Screen[] = [
  { title: 'Documentos', href: '/app', icon: Globe },
  { title: 'Configurações', href: '/app/config', icon: Settings },
];

export type Shortcut = { label: string; keys: string[] };

export const shortcuts: Shortcut[] = [
  { label: 'Abrir busca e comandos', keys: ['Alt', 'B'] },
  { label: 'Alternar menu lateral', keys: ['Ctrl', 'B'] },
  { label: 'Criar nova nota', keys: ['N'] },
  { label: 'Ir para Documentos', keys: ['G', 'D'] },
];

export type DocStatus = 'published' | 'draft';

export type Doc = {
  id: string;
  title: string;
  excerpt: string;
  categories: string[];
  status: DocStatus;
  updatedAt: string;
  slug: string;
  /** Full editor HTML. Absent on seed docs (they only carry an excerpt). */
  content?: string;
};

const seedDocuments: Doc[] = [
  {
    id: 'd1',
    title: 'Guia de boas práticas de escrita',
    excerpt:
      'Um apanhado de princípios para textos claros: voz ativa, frases curtas e a hierarquia da informação.',
    categories: ['Documentação', 'Guia'],
    status: 'published',
    updatedAt: '2026-06-28',
    slug: 'guia-boas-praticas',
  },
  {
    id: 'd2',
    title: 'Roadmap do produto — Q3',
    excerpt:
      'Prioridades do trimestre, marcos e o que fica para depois. Documento vivo, atualizado às sextas.',
    categories: ['Produto'],
    status: 'published',
    updatedAt: '2026-06-25',
    slug: 'roadmap-q3',
  },
  {
    id: 'd3',
    title: 'Notas da reunião de design',
    excerpt:
      'Decisões sobre o novo editor, pendências e responsáveis. Inclui os links dos protótipos.',
    categories: ['Design', 'Reunião'],
    status: 'published',
    updatedAt: '2026-06-22',
    slug: 'notas-design',
  },
  {
    id: 'd4',
    title: 'Política de privacidade',
    excerpt: 'Como tratamos os dados dos usuários, base legal e direitos. Revisado pelo jurídico.',
    categories: ['Legal'],
    status: 'published',
    updatedAt: '2026-06-18',
    slug: 'privacidade',
  },
  {
    id: 'd5',
    title: 'Ideias para a newsletter',
    excerpt:
      'Rascunho de pautas e ganchos para os próximos envios. Ainda bagunçado, precisa de curadoria.',
    categories: ['Marketing'],
    status: 'draft',
    updatedAt: '2026-06-30',
    slug: 'ideias-newsletter',
  },
  {
    id: 'd6',
    title: 'Onboarding de novos membros',
    excerpt: 'Passo a passo para quem entra no time: acessos, ferramentas e a cultura de escrita.',
    categories: ['Documentação', 'RH'],
    status: 'published',
    updatedAt: '2026-06-15',
    slug: 'onboarding',
  },
];

// Injeta o corpo HTML dos seeds a partir do módulo de conteúdo (mantém os
// objetos acima enxutos).
export const documents: Doc[] = seedDocuments.map((doc) => ({
  ...doc,
  content: SEED_CONTENT[doc.id] ?? doc.content,
}));

export const publishedDocs = documents.filter((doc) => doc.status === 'published');

export function findPublishedDoc(slug: string): Doc | undefined {
  return documents.find((doc) => doc.slug === slug && doc.status === 'published');
}
