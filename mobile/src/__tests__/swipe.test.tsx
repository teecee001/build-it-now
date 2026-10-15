/// <reference types="jest" />
import { act, fireEvent, render, screen } from '@testing-library/react-native';
import { State } from 'react-native-gesture-handler';
import { fireGestureHandler, getByGestureTestId } from 'react-native-gesture-handler/jest-utils';

import { SwipeToPay } from '@/components/SwipeToPay';

jest.mock('expo-haptics', () => ({
  notificationAsync: jest.fn(() => { throw new Error('haptics unavailable'); }),
  selectionAsync: jest.fn(), impactAsync: jest.fn(),
  ImpactFeedbackStyle: {}, NotificationFeedbackType: {},
}));

const layout = async () => {
  await act(async () => {
    fireEvent(screen.getByLabelText('Send'), 'layout', { nativeEvent: { layout: { width: 320, height: 60, x: 0, y: 0 } } });
  });
};
const swipe = async () => {
  await act(async () => {
    fireGestureHandler(getByGestureTestId('swipe-pan'), [
      { state: State.BEGAN, translationX: 0 },
      { state: State.ACTIVE, translationX: 150 },
      { state: State.ACTIVE, translationX: 300 },
      { state: State.END, translationX: 300 },
    ]);
    await Promise.resolve();
  });
};

test('completing the swipe fires onConfirm once and does not throw', async () => {
  const onConfirm = jest.fn(async () => undefined);
  await render(<SwipeToPay label="Send" onConfirm={onConfirm} />);
  await layout();
  await expect(swipe()).resolves.toBeUndefined();
  expect(onConfirm).toHaveBeenCalledTimes(1);
});

test('a rejected payment or failing haptics never crashes the slider', async () => {
  const onConfirm = jest.fn(async () => { throw new Error('auth failed'); });
  await render(<SwipeToPay label="Send" onConfirm={onConfirm} />);
  await layout();
  await expect(swipe()).resolves.toBeUndefined();
  expect(onConfirm).toHaveBeenCalledTimes(1);
  // Slider is usable again after the failure.
  await swipe();
  expect(onConfirm).toHaveBeenCalledTimes(2);
});

test('a short swipe does not pay', async () => {
  const onConfirm = jest.fn(async () => undefined);
  await render(<SwipeToPay label="Send" onConfirm={onConfirm} />);
  await layout();
  await act(async () => {
    fireGestureHandler(getByGestureTestId('swipe-pan'), [
      { state: State.BEGAN, translationX: 0 }, { state: State.ACTIVE, translationX: 40 }, { state: State.END, translationX: 40 },
    ]);
  });
  expect(onConfirm).not.toHaveBeenCalled();
});
