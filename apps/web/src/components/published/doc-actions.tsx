'use client';

import { Download, Maximize2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { API_BASE } from '../../lib/api-client';

type Props = { ownerId: string; slug: string; onFullscreen: () => void };

/**
 * Ações do documento: baixar PDF (gerado no publish) e tela cheia.
 *
 * O "Receber por e-mail" (EmailDialog) está oculto por enquanto — a feature
 * ainda não está pronta. Para reativar: importe `EmailDialog` de './email-dialog'
 * e renderize `<EmailDialog ownerId={ownerId} slug={slug} />` entre os botões.
 */
export function DocActions({ ownerId, slug, onFullscreen }: Props) {
  const pdfUrl = `${API_BASE}/public/documents/${ownerId}/${encodeURIComponent(slug)}/pdf`;
  return (
    <div className="flex flex-wrap items-center gap-2">
      <Button asChild>
        <a href={pdfUrl} rel="noopener">
          <Download />
          Baixar PDF
        </a>
      </Button>
      <Button variant="outline" onClick={onFullscreen}>
        <Maximize2 />
        Tela cheia
      </Button>
    </div>
  );
}
