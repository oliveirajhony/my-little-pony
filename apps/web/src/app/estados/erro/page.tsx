// Dinâmica: renderiza a cada request, não no build. Sem isso, o `next build`
// tenta pré-renderizar esta rota, o throw abaixo dispara e o build inteiro falha.
export const dynamic = 'force-dynamic';

export default function ErrorPreview() {
  // Intentionally throws so the error.tsx (500) boundary renders — for previewing
  // the state in this reference repo.
  throw new Error('Demonstração da tela 500 — Estados do sistema.');
}
