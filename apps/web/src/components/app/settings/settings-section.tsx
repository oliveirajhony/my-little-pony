import type { ReactNode } from 'react';

type SettingsSectionProps = {
  title: string;
  description: string;
  children: ReactNode;
};

/**
 * One row of the settings page: a sticky label column on the left (title +
 * description) and the controls on the right. Sections stack with a hairline
 * divider between them; the first one drops its top border and padding.
 */
export function SettingsSection({ title, description, children }: SettingsSectionProps) {
  return (
    <section className="grid gap-x-10 gap-y-4 border-t py-8 first:border-t-0 first:pt-0 md:grid-cols-[minmax(200px,18rem)_1fr]">
      <div className="md:sticky md:top-8 md:self-start">
        <h2 className="font-display text-base font-semibold tracking-tight">{title}</h2>
        <p className="mt-1 text-sm text-muted-foreground">{description}</p>
      </div>
      <div className="min-w-0">{children}</div>
    </section>
  );
}
