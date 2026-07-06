type BrandMarkProps = {
  className?: string;
  /** Texto alternativo. Vazio (padrão) => decorativo, quando há um wordmark ao lado. */
  alt?: string;
};

/**
 * Marca-símbolo do my-little-pony (o pônei). Reaproveita o mesmo SVG do favicon
 * (`/favicon/favicon.svg`) como fonte única da logo — funciona em Server e Client
 * Components e evita colisão de IDs de gradiente ao renderizar mais de uma vez.
 */
export function BrandMark({ className, alt = '' }: BrandMarkProps) {
  return (
    <img
      src="/favicon/favicon.svg"
      alt={alt}
      aria-hidden={alt === '' ? true : undefined}
      width={40}
      height={40}
      className={className}
    />
  );
}
