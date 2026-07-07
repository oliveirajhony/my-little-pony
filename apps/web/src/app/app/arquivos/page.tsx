import { Suspense } from 'react';
import { ArquivosView } from '../../../components/app/arquivos-view';

export default function ArquivosPage() {
  // Suspense: ArquivosView lê `?file=` (useSearchParams) para abrir um arquivo
  // direto — abrir uma fonte citada no Explorar cai aqui.
  return (
    <Suspense>
      <ArquivosView />
    </Suspense>
  );
}
