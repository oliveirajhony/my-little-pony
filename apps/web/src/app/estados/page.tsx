import Link from 'next/link';

const STATES = [
  {
    code: '404',
    title: 'Página não encontrada',
    desc: 'Rota inexistente — cai no not-found.tsx.',
    href: '/estados/exemplo-inexistente',
  },
  {
    code: '500',
    title: 'Erro inesperado',
    desc: 'Uma página que lança erro — cai no error.tsx.',
    href: '/estados/erro',
  },
  {
    code: '429',
    title: 'Muitas requisições',
    desc: 'Rate limit com contagem regressiva.',
    href: '/estados/limite',
  },
];

export default function StatesIndex() {
  return (
    <div className="mx-auto grid min-h-svh max-w-3xl place-items-center bg-background px-6 py-16">
      <div className="w-full">
        <p className="font-mono text-xs uppercase tracking-[0.14em] text-primary">
          Estados do sistema
        </p>
        <h1 className="mt-2 font-display text-2xl font-semibold tracking-tight">
          Telas de erro e carregamento
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Pré-visualize cada estado. Os skeletons de carregamento aparecem sozinhos ao navegar.
        </p>

        <div className="mt-8 grid gap-3 sm:grid-cols-3">
          {STATES.map((state) => (
            <Link
              key={state.code}
              href={state.href}
              className="group rounded-xl border bg-card p-5 transition-colors hover:border-primary/50"
            >
              <span className="font-mono text-3xl font-semibold tracking-tight text-muted-foreground/40 transition-colors group-hover:text-primary/60">
                {state.code}
              </span>
              <p className="mt-3 font-medium">{state.title}</p>
              <p className="mt-1 text-sm text-muted-foreground">{state.desc}</p>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
