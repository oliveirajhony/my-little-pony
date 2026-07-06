import { Check } from 'lucide-react';
import { Button } from '@/components/ui/button';

type SettingsFormFooterProps = {
  /** Whether the submit is in flight (shows the saving label + disables). */
  saving: boolean;
  /** Whether to show the "saved" confirmation next to the button. */
  saved: boolean;
  /** Button label at rest. */
  label: string;
  /** Button label while saving. */
  savingLabel: string;
  /** Confirmation text shown when `saved`. */
  savedLabel?: string;
};

/**
 * Shared action row for the settings forms: a right-aligned submit button with
 * a consistent size, plus an optional "saved" confirmation. Keeps every form's
 * primary button identical.
 */
export function SettingsFormFooter({
  saving,
  saved,
  label,
  savingLabel,
  savedLabel = 'Salvo',
}: SettingsFormFooterProps) {
  return (
    <div className="flex items-center justify-end gap-3">
      {saved && (
        <span className="flex items-center gap-1 text-sm text-primary">
          <Check className="size-4" /> {savedLabel}
        </span>
      )}
      <Button type="submit" disabled={saving}>
        {saving ? savingLabel : label}
      </Button>
    </div>
  );
}
