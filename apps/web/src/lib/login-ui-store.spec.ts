import { beforeEach, describe, expect, it } from 'vitest';
import { eyesShouldClose, useLoginUi } from './login-ui-store';

const initialState = useLoginUi.getState();

beforeEach(() => {
  useLoginUi.setState(initialState, true);
});

describe('eyesShouldClose', () => {
  it('closes only when a hidden password field is focused', () => {
    expect(eyesShouldClose('password', false)).toBe(true);
    expect(eyesShouldClose('password', true)).toBe(false); // peeking
    expect(eyesShouldClose('email', false)).toBe(false);
    expect(eyesShouldClose(null, false)).toBe(false);
  });
});

describe('useLoginUi', () => {
  it('tracks the focused field and password visibility', () => {
    useLoginUi.getState().setFocusedField('password');
    expect(useLoginUi.getState().focusedField).toBe('password');

    useLoginUi.getState().setPasswordVisible(true);
    expect(useLoginUi.getState().passwordVisible).toBe(true);
  });

  it('bumps the nonce on every reaction', () => {
    const before = useLoginUi.getState().reactionNonce;

    useLoginUi.getState().react('error');
    expect(useLoginUi.getState().reaction).toBe('error');
    expect(useLoginUi.getState().reactionNonce).toBe(before + 1);

    useLoginUi.getState().react('success');
    expect(useLoginUi.getState().reaction).toBe('success');
    expect(useLoginUi.getState().reactionNonce).toBe(before + 2);
  });
});
