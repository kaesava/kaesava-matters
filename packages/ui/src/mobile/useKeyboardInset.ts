import { useEffect, useState } from 'react';
import { Keyboard, Platform } from 'react-native';

// Why: RN's KeyboardAvoidingView is unreliable inside a transparent Android <Modal>; track the keyboard height directly.
export function useKeyboardInset(enabled = true): number {
  const [inset, setInset] = useState(0);

  useEffect(() => {
    if (!enabled || Platform.OS !== 'android') return;
    const show = Keyboard.addListener('keyboardDidShow', (e) => setInset(e.endCoordinates.height));
    const hide = Keyboard.addListener('keyboardDidHide', () => setInset(0));
    return () => {
      show.remove();
      hide.remove();
    };
  }, [enabled]);

  return inset;
}
