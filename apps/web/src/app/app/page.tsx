import { SquarePlus } from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { DocCard } from '../../components/app/doc-card';
import { documents } from '../../lib/mock-data';

export default function DocumentsPage() {
  return (
    <div className="mx-auto max-w-6xl">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl font-semibold tracking-tight">Documentos</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Publicados e rascunhos — acessíveis por link.
          </p>
        </div>
        <Button asChild>
          <Link href="/app/editor">
            <SquarePlus />
            Nova nota
          </Link>
        </Button>
      </div>

      <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {documents.map((doc) => (
          <DocCard key={doc.id} doc={doc} />
        ))}
      </div>
    </div>
  );
}
