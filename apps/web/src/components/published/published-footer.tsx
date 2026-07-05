import type { SVGProps } from 'react';
import { DocIcon } from '../icons';

function GithubIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" focusable="false" {...props}>
      <path d="M12 .5C5.7.5.5 5.7.5 12c0 5.1 3.3 9.4 7.9 10.9.6.1.8-.3.8-.6v-2c-3.2.7-3.9-1.5-3.9-1.5-.5-1.3-1.3-1.7-1.3-1.7-1.1-.7.1-.7.1-.7 1.2.1 1.8 1.2 1.8 1.2 1 1.8 2.8 1.3 3.5 1 .1-.8.4-1.3.7-1.6-2.6-.3-5.3-1.3-5.3-5.7 0-1.3.5-2.3 1.2-3.1-.1-.3-.5-1.5.1-3.1 0 0 1-.3 3.3 1.2a11.5 11.5 0 0 1 6 0C17 5 18 5.3 18 5.3c.6 1.6.2 2.8.1 3.1.8.8 1.2 1.8 1.2 3.1 0 4.4-2.7 5.4-5.3 5.7.4.4.8 1.1.8 2.2v3.3c0 .3.2.7.8.6 4.6-1.5 7.9-5.8 7.9-10.9C23.5 5.7 18.3.5 12 .5Z" />
    </svg>
  );
}

function LinkedinIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" focusable="false" {...props}>
      <path d="M20.5 2h-17A1.5 1.5 0 0 0 2 3.5v17A1.5 1.5 0 0 0 3.5 22h17a1.5 1.5 0 0 0 1.5-1.5v-17A1.5 1.5 0 0 0 20.5 2ZM8 19H5V9h3v10ZM6.5 7.7a1.7 1.7 0 1 1 0-3.4 1.7 1.7 0 0 1 0 3.4ZM19 19h-3v-5.3c0-1.3-.5-2.1-1.6-2.1-.9 0-1.4.6-1.6 1.2-.1.2-.1.5-.1.8V19h-3V9h3v1.4c.4-.6 1.1-1.5 2.7-1.5 2 0 3.4 1.3 3.4 4V19Z" />
    </svg>
  );
}

const REPO_URL = 'https://github.com/oliveirajhony/my-little-pony';
const GITHUB_URL = 'https://github.com/oliveirajhony';
const LINKEDIN_URL = 'https://www.linkedin.com/in/oliveirajhony/';

export function PublishedFooter() {
  return (
    <footer className="border-t bg-card/40">
      <div className="mx-auto max-w-3xl px-6 py-12 text-center">
        <span className="inline-flex size-9 items-center justify-center rounded-lg bg-primary text-primary-foreground">
          <DocIcon className="size-5" />
        </span>
        <p className="mt-4 text-sm text-muted-foreground">
          Feito com{' '}
          <a
            href={REPO_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="font-medium text-foreground underline-offset-4 hover:underline"
          >
            my-little-pony
          </a>{' '}
          — um document engine open-source.
        </p>
        <p className="mt-1.5 text-sm text-muted-foreground">
          Projeto idealizado e desenvolvido por{' '}
          <span className="text-foreground">Jhony Oliveira</span>.
        </p>
        <div className="mt-4 flex items-center justify-center gap-2">
          <FooterLink href={GITHUB_URL} icon={<GithubIcon className="size-4" />}>
            GitHub
          </FooterLink>
          <FooterLink href={LINKEDIN_URL} icon={<LinkedinIcon className="size-4" />}>
            LinkedIn
          </FooterLink>
        </div>
      </div>
    </footer>
  );
}

function FooterLink({
  href,
  icon,
  children,
}: {
  href: string;
  icon: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
    >
      {icon}
      {children}
    </a>
  );
}
