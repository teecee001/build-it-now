/// <reference types="jest" />
import { fireEvent, render, screen } from '@testing-library/react-native';

import Login from '@/app/login';
import { Rich } from '@/components/ExoText';
import { SwipeToPay } from '@/components/SwipeToPay';
import { parseSse } from '@/lib/exo';

jest.mock('@/lib/supabase', () => ({
  supabase: { auth: { signInWithPassword: jest.fn(async () => ({ error: { message: 'Invalid login credentials' } })) } },
}));

test('login renders the web copy and shows the web error string', async () => {
  await render(<Login />);
  expect(screen.getByText('Welcome back. Sign in to continue.')).toBeTruthy();
  await fireEvent.changeText(screen.getByPlaceholderText('Email'), 'a@b.co');
  await fireEvent.changeText(screen.getByPlaceholderText('Password'), 'x');
  await fireEvent.press(screen.getByText('Sign in'));
  expect(await screen.findByText('Wrong email or password. Try again or create an account.')).toBeTruthy();
});

test('ai-advisor SSE parsing matches the web contract', () => {
  const raw = 'data: {"choices":[{"delta":{"content":"Hi"}}]}\n\ndata: {"choices":[{"delta":{"content":" there"}}]}\n\ndata: [DONE]\n';
  expect(parseSse(raw)).toBe('Hi there');
});

test('Exo replies render markdown structure instead of raw ### and * markers', async () => {
  await render(<Rich mine={false} text={'### 1. Timing\nSome **bold** text\n* Example: one\n  * nested\n[Reuters](https://example.com/a)'} />);
  expect(screen.getByText('1. Timing')).toBeTruthy();
  expect(screen.queryByText(/###/)).toBeNull();
  expect(screen.getByText('bold')).toBeTruthy();
  expect(screen.getAllByText('•').length).toBe(2);
  expect(screen.getByText('Reuters')).toBeTruthy();
});

test('swipe-to-pay accessibility activate fires once while a payment is in flight', async () => {
  let resolve!: () => void;
  const onConfirm = jest.fn(() => new Promise<void>((r) => (resolve = r)));
  await render(<SwipeToPay label="Send" onConfirm={onConfirm} />);
  const track = screen.getByLabelText('Send');
  const a = fireEvent(track, 'accessibilityAction', { nativeEvent: { actionName: 'activate' } });
  const b = fireEvent(track, 'accessibilityAction', { nativeEvent: { actionName: 'activate' } });
  expect(onConfirm).toHaveBeenCalledTimes(1);
  resolve();
  await Promise.all([a, b]);
});
