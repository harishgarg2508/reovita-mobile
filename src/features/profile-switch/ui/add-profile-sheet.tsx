import { Ionicons } from '@expo/vector-icons';
import { useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

import { BottomSheet } from '@shared/ui/bottom-sheet';
import { useFormColors, type FormColors } from '@shared/ui/theme/form-colors';

import { ADD_PROFILE_FAILURE_TEXT, lastFailureDetail, useLinkChild } from '../model/use-profile-switch';

const MAX_NICKNAME = 40;

// Adding a family member: the name is given, then one Google sign-in of the person being added. That sign-in creates their account if it is new, and
// links it to this account's family. The name is kept while the sheet is closed; it is cleared once the member is added.
export function AddProfileSheet({
  visible,
  onClose,
}: {
  visible: boolean;
  onClose: () => void;
}) {
  const colors = useFormColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const link = useLinkChild();
  const busy = link.isPending;
  const [nickname, setNickname] = useState('');
  const [error, setError] = useState<string | null>(null);
  // The codes behind the failure, shown under the message.
  const [detail, setDetail] = useState('');

  function close() {
    setError(null);
    onClose();
  }

  function submit() {
    const name = nickname.trim();
    if (!name || busy) return;
    setError(null);
    setDetail('');
    link.mutate(name, {
      onSuccess: (failure) => {
        if (failure === null) {
          setNickname('');
          close();
        } else {
          setError(ADD_PROFILE_FAILURE_TEXT[failure]);
          setDetail(lastFailureDetail());
        }
      },
      onError: (err) => {
        setError(ADD_PROFILE_FAILURE_TEXT.failed);
        setDetail(lastFailureDetail() || String((err as Error)?.message ?? ''));
      },
    });
  }

  return (
    <BottomSheet visible={visible} onClose={close}>
      <View style={styles.wrap}>
        <Text style={styles.title}>Add a family member</Text>
        <Text style={styles.sub}>
          Give the family member a name, then sign in with their Google account. Their
          profile keeps its own sign-in, code, reports and score.
        </Text>
        <TextInput
          value={nickname}
          onChangeText={(v) => setNickname(v.slice(0, MAX_NICKNAME))}
          placeholder="Name, for example Mother"
          placeholderTextColor={colors.placeholder}
          maxLength={MAX_NICKNAME}
          editable={!busy}
          returnKeyType="go"
          onSubmitEditing={submit}
          blurOnSubmit={false}
          style={styles.input}
        />
        <Text style={styles.stepText} accessibilityLiveRegion="polite">
          {busy ? 'Pick the Google account of the person you are adding.' : 'One step: sign in with the Google account of the person you are adding.'}
        </Text>
        {error ? (
          <View style={styles.errorBox} accessibilityLiveRegion="polite">
            <Ionicons name="alert-circle" size={18} color={colors.error} />
            <View style={styles.errorTextWrap}>
              <Text style={styles.errorText}>{error}</Text>
              {detail ? <Text style={styles.detailText}>Details: {detail}</Text> : null}
            </View>
          </View>
        ) : null}
        <Pressable
          accessibilityRole="button"
          accessibilityState={{ busy, disabled: !nickname.trim() || busy }}
          disabled={!nickname.trim() || busy}
          onPress={submit}
          style={[styles.primary, (!nickname.trim() || busy) && styles.disabled]}
        >
          {busy ? <ActivityIndicator color={colors.onAccent} /> : <Text style={styles.primaryText}>Continue with Google</Text>}
        </Pressable>
        <Pressable
          accessibilityRole="button"
          onPress={close}
          disabled={busy}
          hitSlop={8}
        >
          <Text style={styles.cancel}>Cancel</Text>
        </Pressable>
      </View>
    </BottomSheet>
  );
}

const createStyles = (colors: FormColors) =>
  StyleSheet.create({
    wrap: { gap: 14, paddingBottom: 8 },
    icon: {
      width: 48,
      height: 48,
      borderRadius: 16,
      backgroundColor: colors.accentSoft,
      alignItems: 'center',
      justifyContent: 'center',
    },
    title: {
      fontFamily: 'Poppins_600SemiBold',
      fontSize: 21,
      lineHeight: 28,
      color: colors.textStrong,
    },
    sub: {
      fontFamily: 'Poppins_400Regular',
      fontSize: 14.5,
      lineHeight: 21,
      color: colors.muted,
    },
    input: {
      height: 52,
      borderRadius: 16,
      borderWidth: 1,
      borderColor: colors.border2,
      paddingHorizontal: 14,
      fontFamily: 'Poppins_400Regular',
      fontSize: 15,
      color: colors.text,
      backgroundColor: colors.card,
    },
    errorTextWrap: { flex: 1, gap: 2 },
    detailText: { fontSize: 11.5, color: colors.muted },
    stepText: { fontSize: 13, lineHeight: 19, color: colors.text, marginTop: 4 },
    errorBox: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      gap: 8,
      padding: 12,
      borderRadius: 14,
      backgroundColor: colors.warnBg,
      borderWidth: 1,
      borderColor: colors.errorBorder,
    },
    errorText: {
      flex: 1,
      fontFamily: 'Poppins_500Medium',
      fontSize: 13,
      lineHeight: 18,
      color: colors.error,
    },
    primary: {
      height: 50,
      borderRadius: 999,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: colors.accentFill,
    },
    primaryText: {
      fontFamily: 'Poppins_600SemiBold',
      fontSize: 15,
      color: colors.onAccent,
    },
    disabled: { opacity: 0.5 },
    cancel: {
      fontFamily: 'Poppins_600SemiBold',
      fontSize: 14,
      textAlign: 'center',
      color: colors.muted,
      paddingVertical: 4,
    },
  });
