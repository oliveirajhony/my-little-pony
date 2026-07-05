import { shortcuts } from '../../../lib/mock-data';

function Kbd({ children }: { children: string }) {
  return (
    <kbd className="inline-flex h-6 min-w-6 items-center justify-center rounded-md border bg-muted px-1.5 font-mono text-[11px] font-medium text-muted-foreground">
      {children}
    </kbd>
  );
}

export function KeyboardShortcuts() {
  return (
    <ul className="divide-y rounded-xl border">
      {shortcuts.map((shortcut) => (
        <li
          key={shortcut.label}
          className="flex items-center justify-between gap-4 px-4 py-3 text-sm"
        >
          <span>{shortcut.label}</span>
          <span className="flex shrink-0 items-center gap-1">
            {shortcut.keys.map((key) => (
              <Kbd key={key}>{key}</Kbd>
            ))}
          </span>
        </li>
      ))}
    </ul>
  );
}
