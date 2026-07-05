export default function ErrorPreview() {
  // Intentionally throws so the error.tsx (500) boundary renders — for previewing
  // the state in this reference repo.
  throw new Error('Demonstração da tela 500 — Estados do sistema.');
}
