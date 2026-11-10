import { Ionicons } from '@expo/vector-icons';
import * as Clipboard from 'expo-clipboard';
import { useEffect, useState } from 'react';
import { Pressable, Share, StyleSheet, Text, View } from 'react-native';
import QRCode from 'react-native-qrcode-svg';

import { tapConfirm } from '@shared/lib';

// Shows the subject's codename as a QR code, with the code text, a copy button and a share button.
export function SubjectQr({ codename }: { codename: string }) {
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!copied) return;
    const timer = setTimeout(() => setCopied(false), 1500);
    return () => clearTimeout(timer);
  }, [copied]);

  async function copyCode() {
    tapConfirm();
    await Clipboard.setStringAsync(codename);
    setCopied(true);
  }

  function shareCode() {
    tapConfirm();
    void Share.share({ message: `My Reovita code: ${codename}` });
  }

  return (
    <View style={styles.card}>
      <View style={styles.qrWrap}>
        <QRCode value={codename} size={184} color="#171717" backgroundColor="#FFFFFF" />
      </View>

      <View style={styles.codeRow}>
        <Text selectable style={styles.code}>
          {codename}
        </Text>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Copy code"
          onPress={copyCode}
          style={styles.iconBtn}>
          <Ionicons name={copied ? 'checkmark' : 'copy-outline'} size={18} color="#1F6F3F" />
        </Pressable>
      </View>

      <Pressable accessibilityRole="button" onPress={shareCode} style={styles.shareBtn}>
        <Ionicons name="share-outline" size={18} color="#FFFFFF" />
        <Text style={styles.shareText}>Share code</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    alignItems: 'center',
    gap: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: '#ECEAEF',
    borderRadius: 22,
    backgroundColor: '#FFFFFF',
  },
  qrWrap: {
    padding: 12,
    borderRadius: 16,
    backgroundColor: '#FFFFFF',
  },
  codeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  code: {
    fontSize: 22,
    fontWeight: '800',
    letterSpacing: 2,
    color: '#171717',
  },
  iconBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F1EDF7',
  },
  shareBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    height: 46,
    paddingHorizontal: 22,
    borderRadius: 999,
    backgroundColor: '#1F6F3F',
  },
  shareText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#FFFFFF',
  },
});
