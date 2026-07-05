'use client';

import { EllipsisVertical, ExternalLink, Globe, Pencil, PenLine, Trash2 } from 'lucide-react';
import Link from 'next/link';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';
import { useAuth } from '../../lib/auth-store';
import type { Doc } from '../../lib/documents-api';
import { useDocumentsStore } from '../../lib/documents-store';
import { fullDate, relativeDate } from '../../lib/format-date';

type Props = {
  doc: Doc;
  activeCategories: string[];
  onToggleCategory: (category: string) => void;
};

export function DocCard({ doc, activeCategories, onToggleCategory }: Props) {
  const published = doc.status === 'published';
  const ownerId = useAuth((s) => s.user?.id);
  const removeDoc = useDocumentsStore((s) => s.removeDoc);
  const setStatus = useDocumentsStore((s) => s.setStatus);

  return (
    <Card className="relative gap-0 p-5 shadow-none transition-colors hover:border-primary/40 focus-within:border-primary/60">
      {/* Stretched link — the whole card opens the editor. Interactive controls
          below sit above it with z-10 so they keep their own clicks. */}
      <Link
        href={`/app/editor?id=${doc.id}`}
        aria-label={`Editar ${doc.title}`}
        className="absolute inset-0 rounded-[inherit] focus-visible:outline-none"
      />

      <div className="relative z-10 flex items-start justify-between gap-2">
        <Badge
          variant={published ? 'secondary' : 'outline'}
          className={cn('gap-1.5', published ? 'text-primary' : 'text-muted-foreground')}
        >
          {published ? <Globe /> : <PenLine />}
          {published ? 'Publicado' : 'Rascunho'}
        </Badge>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="-mr-2 -mt-1 size-8 text-muted-foreground"
              aria-label={`Ações de ${doc.title}`}
            >
              <EllipsisVertical />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-48">
            <DropdownMenuItem asChild>
              <Link href={`/app/editor?id=${doc.id}`}>
                <Pencil />
                Editar
              </Link>
            </DropdownMenuItem>
            {published && ownerId && (
              <DropdownMenuItem asChild>
                <a href={`/d/${ownerId}/${doc.slug}`} target="_blank" rel="noopener noreferrer">
                  <ExternalLink />
                  Ir para o site
                </a>
              </DropdownMenuItem>
            )}
            {published ? (
              <DropdownMenuItem onClick={() => void setStatus(doc.id, 'draft')}>
                <PenLine />
                Despublicar
              </DropdownMenuItem>
            ) : (
              <DropdownMenuItem onClick={() => void setStatus(doc.id, 'published')}>
                <Globe />
                Publicar
              </DropdownMenuItem>
            )}
            <DropdownMenuSeparator />
            <DropdownMenuItem variant="destructive" onClick={() => void removeDoc(doc.id)}>
              <Trash2 />
              Apagar
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <h3 className="mt-3 line-clamp-2 text-base font-semibold leading-snug">{doc.title}</h3>
      <p className="mt-1.5 line-clamp-2 text-sm text-muted-foreground">{doc.excerpt}</p>

      <div className="relative z-10 mt-4 flex flex-wrap items-center gap-1.5">
        {doc.categories.map((category) => {
          const active = activeCategories.includes(category);
          return (
            <Badge key={category} asChild variant={active ? 'default' : 'secondary'}>
              <button
                type="button"
                aria-pressed={active}
                onClick={() => onToggleCategory(category)}
                className={cn(
                  'cursor-pointer font-normal',
                  !active && 'hover:bg-accent hover:text-accent-foreground',
                )}
              >
                {category}
              </button>
            </Badge>
          );
        })}
      </div>

      <time
        dateTime={doc.updatedAt}
        title={fullDate(doc.updatedAt)}
        className="relative z-10 mt-3 block text-xs text-muted-foreground"
      >
        Editado {relativeDate(doc.updatedAt)}
      </time>
    </Card>
  );
}
