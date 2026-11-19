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

import {
  ADD_PROFILE_FAILURE_TEXT,
  useAddProfile,
} from '../model/use-profile-switch';

const MAX_NICKNAME = 40;

// Adding a family profile: a short name first (for example Mother), then the person confirms it is them with Google, and the profile
// is created. The Google step only appears when the server asks for it.
export function AddProfileSheet({
  visible,
  onClose,
}: {
  visible: boolean;
  onClose: () => void;
}) {
  const colors = useFormColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const add = useAddProfile();
  const [nickname, setNickname] = useState('');
  const [error, setError] = useState<string | null>(null);

  function close() {
    setNickname('');
    setError(null);
    onClose();
  }

  function submit() {
    const name = nickname.trim();
    if (!name || add.isPending) return;
    setError(null);
    add.mutate(name, {
      onSuccess: (failure) => {
        if (failure === null) close();
        else if (failure !== 'cancelled')
          setError(ADD_PROFILE_FAILURE_TEXT[failure]);
      },
      onError: () => setError(ADD_PROFILE_FAILURE_TEXT.failed),
    });
  }

  return (
    <BottomSheet visible={visible} onClose={close}>
      <View style={styles.wrap}>
        <View style={styles.icon}>
          <Ionicons name="people-outline" size={24} color={colors.accent} />
        </View>
        <Text style={styles.title}>Add a profile</Text>
        <Text style={styles.sub}>
          For someone whose health records you look after. Each profile has its
          own code, reports and score, and you will confirm it is you with
          Google.
        </Text>
        <TextInput
          value={nickname}
          onChangeText={(v) => setNickname(v.slice(0, MAX_NICKNAME))}
          placeholder="Name, for example Mother"
          placeholderTextColor={colors.placeholder}
          maxLength={MAX_NICKNAME}
          editable={!add.isPending}
          style={styles.input}
        />
        {error ? (
          <View style={styles.errorBox} accessibilityLiveRegion="polite">
            <Ionicons name="alert-circle" size={18} color={colors.error} />
            <Text style={styles.errorText}>{error}</Text>
          </View>
        ) : null}
        <Pressable
          accessibilityRole="button"
          accessibilityState={{
            busy: add.isPending,
            disabled: !nickname.trim() || add.isPending,
          }}
          disabled={!nickname.trim() || add.isPending}
          onPress={submit}
          style={[
            styles.primary,
            (!nickname.trim() || add.isPending) && styles.disabled,
          ]}
        >
          {add.isPending ? (
            <ActivityIndicator color={colors.onAccent} />
          ) : (
            <Text style={styles.primaryText}>Continue with Google</Text>
          )}
        </Pressable>
        <Pressable
          accessibilityRole="button"
          onPress={close}
          disabled={add.isPending}
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
    wrap: { gap: 12, paddingBottom: 8 },
    icon: {
      width: 48,
      height: 48,
      borderRadius: 16,
      backgroundColor: colors.accentSoft,
      alignItems: 'center',
      justifyContent: 'center',
    },
    title: {
      fontFamily: 'Poppins_700Bold',
      fontSize: 19,
      color: colors.textStrong,
    },
    sub: {
      fontFamily: 'Poppins_400Regular',
      fontSize: 13,
      lineHeight: 19,
      color: colors.muted,
    },
    input: {
      height: 50,
      borderRadius: 14,
      borderWidth: 1,
      borderColor: colors.border2,
      paddingHorizontal: 14,
      fontFamily: 'Poppins_400Regular',
      fontSize: 15,
      color: colors.text,
      backgroundColor: colors.card,
    },
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
