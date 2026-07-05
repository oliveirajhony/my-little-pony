'use client';

// Fires only when the root layout itself throws — providers, fonts and global
// CSS may be gone, so this screen is fully self-contained: own <html>/<body>,
// inline styles, system fonts, and both themes via prefers-color-scheme.
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="pt-BR">
      <body style={{ margin: 0 }}>
        <style>{`
          .ge{min-height:100vh;display:grid;place-items:center;padding:2rem;
            font-family:ui-sans-serif,system-ui,-apple-system,"Segoe UI",Roboto,sans-serif;
            text-align:center;background:#ffffff;color:#0d1526}
          .ge-num{font-family:ui-monospace,"JetBrains Mono",monospace;font-weight:600;
            font-size:clamp(5rem,20vw,11rem);line-height:1;letter-spacing:-.04em;
            color:rgba(13,21,38,.08)}
          .ge-title{font-size:1.6rem;font-weight:600;margin:.25rem 0 0;letter-spacing:-.01em}
          .ge-sub{margin:.75rem auto 0;max-width:34rem;font-size:.95rem;line-height:1.6;
            color:#5a6478}
          .ge-btn{margin-top:1.75rem;display:inline-flex;align-items:center;height:2.5rem;
            padding:0 1.1rem;border-radius:.6rem;border:0;cursor:pointer;font-size:.9rem;
            font-weight:500;background:#1f6bff;color:#fff}
          .ge-btn:hover{background:#195fe6}
          @media (prefers-color-scheme:dark){
            .ge{background:#0b1120;color:#eaf0ff}
            .ge-num{color:rgba(234,240,255,.09)}
            .ge-sub{color:#9aa6c2}
            .ge-btn{background:#3d82ff}
          }
        `}</style>
        <main className="ge">
          <div>
            <div className="ge-num" aria-hidden>
              500
            </div>
            <h1 className="ge-title">Algo saiu do lugar</h1>
            <p className="ge-sub">
              Um erro inesperado interrompeu o aplicativo. Tente recarregar — se continuar, volte em
              instantes.
            </p>
            {error.digest ? (
              <p
                className="ge-sub"
                style={{ fontFamily: 'ui-monospace, monospace', fontSize: '.75rem' }}
              >
                id: {error.digest}
              </p>
            ) : null}
            <button type="button" className="ge-btn" onClick={() => reset()}>
              Tentar de novo
            </button>
          </div>
        </main>
      </body>
    </html>
  );
}
