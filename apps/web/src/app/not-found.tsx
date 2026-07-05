import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { ErrorScene } from '../components/system/error-scene';

export default function NotFound() {
  return (
    <ErrorScene
      code="404"
      srTitle="Página não encontrada"
      title="Esta página se perdeu"
      subtitle="O link pode estar quebrado ou o documento foi movido. Vamos te levar de volta."
      actions={
        <>
          <Button asChild>
            <Link href="/app">Voltar para Documentos</Link>
          </Button>
          <Button asChild variant="ghost">
            <Link href="/">Ir para o início</Link>
          </Button>
        </>
      }
    />
  );
}
