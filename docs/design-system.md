# Design System — my-little-pony

A fonte de verdade dos tokens é [`apps/web/src/styles/tokens.css`](../apps/web/src/styles/tokens.css).
A versão viva e navegável fica na rota **`/design-system`** do app (`pnpm dev` → `/design-system`).

O tema é controlado por [`next-themes`](https://github.com/pacocoursey/next-themes) via atributo
`data-theme` no `<html>`. `:root` são os tokens do tema **claro**; `[data-theme='dark']` sobrescreve
para o **escuro**. O modo **sistema** é resolvido pelo next-themes para claro/escuro.

## Tipografia

Duas famílias, via `next/font/google`:

- **Poppins** (`--font-display`) — títulos, botões, labels. Pesos 400/500/600/700.
- **Inter** (`--font-body`) — corpo, inputs, dados. Pesos 400/500/600.

| Papel | Fonte | Tamanho |
| --- | --- | --- |
| Display | Poppins 600 | 40 |
| H1 | Poppins 600 | 30 |
| H2 | Poppins 600 | 24 |
| Subhead | Poppins 500 | 20 |
| Body | Inter 400 | 16 |
| Input | Inter 400 | 15 |
| Label | Poppins 500 | 13 |
| Caption | Inter 400 | 12.5 |

## Cores

Azul de ação, periwinkle/arco-íris do pônei, neutros frios e semânticos. Todos os valores têm
variantes claro/escuro.

- **Azul**: `--blue` `--blue-strong` `--blue-deep` `--blue-050`
- **Pônei**: `--peri-1/2/deep` (corpo), `--mane-1/2/3` (crina arco-íris), `--horn`, `--hoof`
- **Neutros**: `--ink`, `--ink-2`, `--hairline`, `--card`, `--bg-a/b`, `--glow-1`
- **Semânticos**: `--success`, `--error`, `--blush`
- **Superfícies**: `--glass-fill`, `--glass-border`, `--field-bg`, `--field-border`

## Espaçamento

Escala base 4px: `--sp-1` (4) · `--sp-2` (8) · `--sp-3` (12) · `--sp-4` (16) · `--sp-5` (20) ·
`--sp-6` (24) · `--sp-8` (32) · `--sp-10` (40) · `--sp-12` (48) · `--sp-16` (64).

## Raios

`--r-sm` (10) · `--r-md` (14) · `--r-lg` (20) · `--r-xl` (28) · `--r-pill` (999).

## Elevação / Sombras

Sombras suaves azuladas (estilo Apple): `--e1` (sutil) · `--e2` (card) · `--e3` (destaque) ·
`--glass-shadow` (card de vidro).

## Vidro / Blur

O material do card de login: `backdrop-filter: blur(26px) saturate(150%)` sobre `--glass-fill`,
com `--glass-border` e `--glass-shadow`.

## Movimento

- **Durações**: `--dur-fast` (140ms) · `--dur` (240ms) · `--dur-slow` (420ms)
- **Easings**: `--ease` `cubic-bezier(0.22, 0.61, 0.36, 1)` (padrão) ·
  `--ease-back` `cubic-bezier(0.34, 1.56, 0.64, 1)` (pops/elástico)

## Como usar

Referencie os tokens por `var(--token)` em CSS Modules. Exemplo:

```css
.button {
  background: linear-gradient(135deg, var(--blue), var(--blue-deep));
  border-radius: var(--r-md);
  box-shadow: var(--e2);
  transition: transform var(--dur-fast) var(--ease);
}
```
