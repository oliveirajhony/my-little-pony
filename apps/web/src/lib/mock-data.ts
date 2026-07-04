import type { LucideIcon } from 'lucide-react';
import { Compass, FileText, Globe, LayoutGrid, PenLine, Settings } from 'lucide-react';

export const mockUser = {
  name: 'Jhony Oliveira',
  email: 'jhony@mlp.app',
  initials: 'JO',
};

export type Screen = { title: string; href: string; icon: LucideIcon };

export const screens: Screen[] = [
  { title: 'Publicados', href: '/app', icon: Globe },
  { title: 'Rascunhos', href: '/app/rascunhos', icon: PenLine },
  { title: 'Todos os documentos', href: '/app/documentos', icon: FileText },
  { title: 'Explorar', href: '/app/explorar', icon: Compass },
  { title: 'Modelos', href: '/app/modelos', icon: LayoutGrid },
  { title: 'Configurações', href: '/app/config', icon: Settings },
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
};

export const documents: Doc[] = [
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

export const publishedDocs = documents.filter((doc) => doc.status === 'published');
