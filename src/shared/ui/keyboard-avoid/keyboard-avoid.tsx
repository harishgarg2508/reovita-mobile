import type { ReactNode } from 'react';
import { KeyboardAvoidingView, Platform, type StyleProp, type ViewStyle } from 'react-native';

// Lifts what is inside it above the phone's on-screen keyboard, so the field being typed in is never hidden under it. Put it around a screen (or a drawer's
// content) that holds an input. On the web there is no on-screen keyboard and it does nothing. Android resizes its screens by itself, so only a drawer
// (its own window) asks for the padding there too.
export function KeyboardAvoid({ children, style, always = false, offset = 0 }: { children: ReactNode; style?: StyleProp<ViewStyle>; always?: boolean; offset?: number }) {
  const active = Platform.OS === 'ios' || (always && Platform.OS === 'android');
  return (
    <KeyboardAvoidingView enabled={active} behavior="padding" keyboardVerticalOffset={offset} style={[{ flex: 1 }, style]}>
      {children}
    </KeyboardAvoidingView>
  );
}
