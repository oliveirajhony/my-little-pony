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
import type { Doc } from '../../lib/mock-data';

export function DocCard({ doc }: { doc: Doc }) {
  const published = doc.status === 'published';

  return (
    <Card className="gap-0 p-5 shadow-none transition-colors hover:border-primary/40">
      <div className="flex items-start justify-between gap-2">
        <span className="flex items-center gap-1.5 text-xs font-medium">
          {published ? (
            <>
              <Globe className="size-3.5 text-primary" />
              <span className="text-primary">Publicado</span>
            </>
          ) : (
            <>
              <PenLine className="size-3.5 text-muted-foreground" />
              <span className="text-muted-foreground">Rascunho</span>
            </>
          )}
        </span>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="-mr-2 -mt-1 size-8 text-muted-foreground"
              aria-label="Ações do documento"
            >
              <EllipsisVertical />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-48">
            <DropdownMenuItem asChild>
              <Link href="/app/editor">
                <Pencil />
                Editar
              </Link>
            </DropdownMenuItem>
            {published && (
              <DropdownMenuItem>
                <ExternalLink />
                Ir para o site
              </DropdownMenuItem>
            )}
            {published ? (
              <DropdownMenuItem>
                <PenLine />
                Despublicar
              </DropdownMenuItem>
            ) : (
              <DropdownMenuItem>
                <Globe />
                Publicar
              </DropdownMenuItem>
            )}
            <DropdownMenuSeparator />
            <DropdownMenuItem variant="destructive">
              <Trash2 />
              Apagar
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <h3 className="mt-3 text-base font-semibold leading-snug">{doc.title}</h3>
      <p className="mt-1.5 line-clamp-2 text-sm text-muted-foreground">{doc.excerpt}</p>

      <div className="mt-4 flex flex-wrap gap-1.5">
        {doc.categories.map((category) => (
          <Badge key={category} variant="secondary" className="font-normal">
            {category}
          </Badge>
        ))}
      </div>
    </Card>
  );
}
