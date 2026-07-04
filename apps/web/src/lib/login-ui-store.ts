import { create } from 'zustand';

export type FocusedField = 'email' | 'password' | null;
export type Reaction = 'idle' | 'error' | 'success';

type LoginUiState = {
  focusedField: FocusedField;
  passwordVisible: boolean;
  reaction: Reaction;
  /** Bumped on every `react()` call so consumers can retrigger animations. */
  reactionNonce: number;
  setFocusedField: (field: FocusedField) => void;
  setPasswordVisible: (visible: boolean) => void;
  react: (reaction: Reaction) => void;
};

/**
 * Bridges the login form (DOM events) and the mascot (SVG animations) without
 * prop-drilling across the split layout.
 */
export const useLoginUi = create<LoginUiState>((set) => ({
  focusedField: null,
  passwordVisible: false,
  reaction: 'idle',
  reactionNonce: 0,
  setFocusedField: (focusedField) => set({ focusedField }),
  setPasswordVisible: (passwordVisible) => set({ passwordVisible }),
  react: (reaction) => set((state) => ({ reaction, reactionNonce: state.reactionNonce + 1 })),
}));

/** The mascot shuts its eyes while a hidden password field is focused. */
export function eyesShouldClose(field: FocusedField, passwordVisible: boolean): boolean {
  return field === 'password' && !passwordVisible;
}
