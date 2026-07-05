'use client';

import { Download, Maximize2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { EmailDialog } from './email-dialog';

/** Ações do documento: baixar (impressão), receber por e-mail, tela cheia. */
export function DocActions({ onFullscreen }: { onFullscreen: () => void }) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <Button onClick={() => window.print()}>
        <Download />
        Baixar PDF
      </Button>
      <EmailDialog />
      <Button variant="outline" onClick={onFullscreen}>
        <Maximize2 />
        Tela cheia
      </Button>
    </div>
  );
}
