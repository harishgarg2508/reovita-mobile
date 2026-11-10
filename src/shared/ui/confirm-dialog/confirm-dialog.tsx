import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';

import { usePalette } from '../theme';

export interface ConfirmDialogProps {
  visible: boolean;
  title: string;
  message: string;
  confirmLabel: string;
  cancelLabel?: string;
  // Destructive actions use the red button. Reversible ones use the accent button.
  destructive?: boolean;
  busy?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

// A custom popup. Works on web and native (Alert.alert does nothing on web).
export function ConfirmDialog({
  visible,
  title,
  message,
  confirmLabel,
  cancelLabel = 'Cancel',
  destructive = false,
  busy = false,
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  const p = usePalette();
  const confirmColor = destructive ? p.red : p.accent;

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onCancel}>
      <View style={[styles.backdrop, { backgroundColor: 'rgba(8, 6, 16, 0.55)' }]}>
        <View style={[styles.sheet, { backgroundColor: p.card, borderColor: p.border }]}>
          <Text style={[styles.title, { color: p.textStrong }]}>{title}</Text>
          <Text style={[styles.message, { color: p.muted }]}>{message}</Text>
          <View style={styles.actions}>
            <Pressable
              accessibilityRole="button"
              onPress={onCancel}
              disabled={busy}
              style={[styles.button, { borderColor: p.border, borderWidth: 1 }]}>
              <Text style={[styles.buttonText, { color: p.textStrong }]}>{cancelLabel}</Text>
            </Pressable>
            <Pressable
              accessibilityRole="button"
              onPress={onConfirm}
              disabled={busy}
              style={[styles.button, { backgroundColor: confirmColor }, busy && styles.disabled]}>
              <Text style={[styles.buttonText, { color: '#FFFFFF' }]}>{busy ? 'Please wait...' : confirmLabel}</Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 },
  sheet: {
    width: '100%',
    maxWidth: 420,
    borderRadius: 24,
    borderWidth: 1,
    padding: 22,
    gap: 12,
    shadowColor: '#000',
    shadowOpacity: 0.2,
    shadowRadius: 24,
    shadowOffset: { width: 0, height: 8 },
    elevation: 8,
  },
  title: { fontSize: 19, fontWeight: '800' },
  message: { fontSize: 14, lineHeight: 20 },
  actions: { flexDirection: 'row', gap: 10, marginTop: 10 },
  button: {
    flex: 1,
    height: 46,
    borderRadius: 23,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonText: { fontSize: 15, fontWeight: '700' },
  disabled: { opacity: 0.6 },
});
