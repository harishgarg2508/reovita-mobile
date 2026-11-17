import { Ionicons } from '@expo/vector-icons';
import { useQueryClient } from '@tanstack/react-query';
import { useMemo, useState, type ReactNode } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, TextInput, useWindowDimensions, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { isApiError } from '@shared/api';
import { ConfirmDialog } from '@shared/ui';
import { BottomSheet } from '@shared/ui/bottom-sheet';
import { Chip } from '@shared/ui/chip';
import { useFormColors, type FormColors } from '@shared/ui/theme/form-colors';

import {
  answerLabel,
  erasePrivate,
  PRIVATE_QUESTIONS,
  PRIVATE_STATUS_KEY,
  questionText,
  savePrivate,
  SECURITY_QUESTIONS,
  unlockPrivate,
  type PrivateItems,
  type PrivateStatus,
} from '../model/private-health';

type Step = 'intro' | 'questions' | 'secure' | 'unlock' | 'view';

const MIN_ANSWER = 3;

// The private questions: an explanation first, then the questions, then a security question and answer that lock the answers.
// Opening saved answers asks for that security answer. Everything typed or read here lives only in this component's state and is
// gone when the sheet closes (the screen remounts it each time it opens).
export function PrivateHealthSheet({ visible, onClose, status }: { visible: boolean; onClose: () => void; status: PrivateStatus | undefined }) {
  const colors = useFormColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const queryClient = useQueryClient();
  const { height } = useWindowDimensions();
  const insets = useSafeAreaInsets();

  const configured = status?.configured === true;
  const lockedUntil = status?.locked_until && new Date(status.locked_until) > new Date() ? new Date(status.locked_until) : null;

  const [step, setStep] = useState<Step>(configured ? 'unlock' : 'intro');
  const [items, setItems] = useState<PrivateItems>({});
  const [questionId, setQuestionId] = useState<string | null>(null);
  const [answer, setAnswer] = useState('');
  const [confirm, setConfirm] = useState('');
  const [showAnswer, setShowAnswer] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [eraseOpen, setEraseOpen] = useState(false);

  const refreshStatus = () => void queryClient.invalidateQueries({ queryKey: PRIVATE_STATUS_KEY });
  const fail = (err: unknown, fallback: string) => setError(isApiError(err) && err.message ? err.message : fallback);

  async function unlock() {
    if (answer.trim().length < MIN_ANSWER || busy) return;
    setBusy(true);
    setError(null);
    try {
      setItems(await unlockPrivate(answer));
      setStep('view');
    } catch (err) {
      fail(err, 'Could not unlock your answers. Try again.');
      refreshStatus();
    } finally {
      setBusy(false);
    }
  }

  async function save() {
    if (busy) return;
    if (!configured) {
      if (!questionId) return setError('Choose a security question.');
      if (answer.trim().length < MIN_ANSWER) return setError(`Your answer needs at least ${MIN_ANSWER} characters.`);
      if (answersDiffer) return setError('The two answers do not match.');
    }
    setBusy(true);
    setError(null);
    try {
      await savePrivate({ answer, ...(configured ? {} : { question_id: questionId as string }), items });
      refreshStatus();
      setStep('view');
    } catch (err) {
      fail(err, 'Could not save your answers. Try again.');
    } finally {
      setBusy(false);
    }
  }

  async function erase() {
    setEraseOpen(false);
    setBusy(true);
    try {
      await erasePrivate();
      refreshStatus();
      onClose();
    } catch (err) {
      fail(err, 'Could not erase your answers. Try again.');
    } finally {
      setBusy(false);
    }
  }

  // The two answers are compared the way the server compares them: without regard to case or extra spaces. Nothing is said until
  // something has been typed in the second box.
  const answersDiffer = answer.trim().toLowerCase() !== confirm.trim().toLowerCase();
  const mismatch = confirm.length > 0 && answersDiffer;

  const pick = (key: keyof PrivateItems, value: string) => setItems((current) => ({ ...current, [key]: current[key] === value ? undefined : value }));

  // Each step has its content, which scrolls, and its buttons, which stay fixed under it. On a short screen the buttons are never
  // pushed off the bottom, and on a phone they sit above the system bar.
  const body: Record<Step, ReactNode> = {
    intro: (
      <>
        <Text style={styles.title}>Your private health answers</Text>
        <Text style={styles.text}>
          These questions are about intimate health. They are completely optional: skip any of them, or choose “Prefer not to say”.
        </Text>
        <Point icon="lock-closed-outline" colors={colors} styles={styles} text="Locked with a security answer that only you know. Without it, nobody can open your answers, including us." />
        <Point icon="eye-off-outline" colors={colors} styles={styles} text="Never shown to doctors, never shared, and never part of an export." />
        <Point icon="trash-outline" colors={colors} styles={styles} text="You can erase them at any time." />
      </>
    ),
    questions: (
      <>
        <Text style={styles.title}>A few private questions</Text>
        {PRIVATE_QUESTIONS.map((question) => (
          <View key={question.key} style={styles.group}>
            <Text style={styles.question}>{question.title}</Text>
            <View style={styles.chips}>
              {question.options.map((option) => (
                <Chip key={option.value} label={option.label} selected={items[question.key] === option.value} onPress={() => pick(question.key, option.value)} />
              ))}
            </View>
          </View>
        ))}
        {error ? <Text style={styles.error}>{error}</Text> : null}
      </>
    ),
    secure: (
      <>
        <Text style={styles.title}>Lock your answers</Text>
        <Text style={styles.text}>Choose a security question and give an answer only you would know. You will need it every time you open or change these answers.</Text>
        <View style={styles.group} accessibilityRole="radiogroup">
          {SECURITY_QUESTIONS.map((q) => (
            <Pressable key={q.id} accessibilityRole="radio" accessibilityState={{ selected: questionId === q.id }} onPress={() => setQuestionId(q.id)} style={[styles.radio, questionId === q.id && styles.radioOn]}>
              <Ionicons name={questionId === q.id ? 'radio-button-on' : 'radio-button-off'} size={18} color={colors.accent} />
              <Text style={styles.radioText}>{q.text}</Text>
            </Pressable>
          ))}
        </View>
        <AnswerInput value={answer} onChange={setAnswer} placeholder="Your answer" show={showAnswer} onToggle={() => setShowAnswer((v) => !v)} colors={colors} styles={styles} />
        <AnswerInput value={confirm} onChange={setConfirm} placeholder="Type it again" show={showAnswer} onToggle={() => setShowAnswer((v) => !v)} colors={colors} styles={styles} invalid={mismatch} />
        {mismatch ? (
          <View style={styles.mismatch} accessibilityLiveRegion="polite">
            <Ionicons name="alert-circle-outline" size={16} color={colors.error} />
            <Text style={styles.mismatchText}>The two answers do not match.</Text>
          </View>
        ) : null}
        <View style={styles.warn}>
          <Ionicons name="information-circle-outline" size={18} color={colors.warnText} />
          <Text style={styles.warnText}>If you forget this answer, your private answers cannot be recovered. You can erase them and start again.</Text>
        </View>
        {error ? <Text style={styles.error}>{error}</Text> : null}
      </>
    ),
    unlock: (
      <>
        <Text style={styles.title}>Open your private answers</Text>
        <Text style={styles.text}>{questionText(status?.question_id ?? null)}</Text>
        {lockedUntil ? (
          <Text style={styles.error}>Too many wrong answers. You can try again at {lockedUntil.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' })}.</Text>
        ) : (
          <>
            <AnswerInput value={answer} onChange={setAnswer} placeholder="Your security answer" show={showAnswer} onToggle={() => setShowAnswer((v) => !v)} colors={colors} styles={styles} onSubmit={() => void unlock()} />
            {error ? <Text style={styles.error}>{error}</Text> : null}
          </>
        )}
        <Pressable accessibilityRole="button" onPress={() => setEraseOpen(true)} hitSlop={8}>
          <Text style={styles.link}>Forgot the answer? Erase and start again</Text>
        </Pressable>
      </>
    ),
    view: (
      <>
        <Text style={styles.title}>Your private answers</Text>
        {PRIVATE_QUESTIONS.map((question) => (
          <View key={question.key} style={styles.viewRow}>
            <Text style={styles.viewQuestion}>{question.title}</Text>
            <Text style={styles.viewAnswer}>{answerLabel(question.key, items[question.key])}</Text>
          </View>
        ))}
        {error ? <Text style={styles.error}>{error}</Text> : null}
        <Pressable accessibilityRole="button" onPress={() => setEraseOpen(true)} hitSlop={8}>
          <Text style={styles.linkDanger}>Erase my private answers</Text>
        </Pressable>
      </>
    ),
  };

  const footer: Record<Step, ReactNode> = {
    intro: (
      <>
        <Primary label="Continue" onPress={() => setStep('questions')} styles={styles} />
        <Secondary label="Not now" onPress={onClose} styles={styles} />
      </>
    ),
    questions: (
      <>
        {configured ? <Primary label="Save" busy={busy} onPress={() => void save()} styles={styles} /> : <Primary label="Next" onPress={() => setStep('secure')} styles={styles} />}
        <Secondary label={configured ? 'Cancel' : 'Back'} onPress={() => setStep(configured ? 'view' : 'intro')} styles={styles} />
      </>
    ),
    secure: (
      <>
        <Primary label="Save privately" busy={busy} onPress={() => void save()} styles={styles} />
        <Secondary label="Back" onPress={() => setStep('questions')} styles={styles} />
      </>
    ),
    unlock: (
      <>
        {lockedUntil ? null : <Primary label="Unlock" busy={busy} disabled={answer.trim().length < MIN_ANSWER} onPress={() => void unlock()} styles={styles} />}
        <Secondary label="Close" onPress={onClose} styles={styles} />
      </>
    ),
    view: (
      <>
        <Primary label="Edit" onPress={() => setStep('questions')} styles={styles} />
        <Secondary label="Close" onPress={onClose} styles={styles} />
      </>
    ),
  };

  // Room above the sheet's own padding, the handle, the buttons and the top of the screen.
  const scrollMax = Math.max(160, height - insets.top - insets.bottom - 250);

  return (
    <BottomSheet visible={visible} onClose={onClose}>
      <ScrollView style={{ maxHeight: scrollMax }} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false} contentContainerStyle={styles.body}>
        {body[step]}
        {busy && step === 'view' ? <ActivityIndicator color={colors.accent} /> : null}
      </ScrollView>
      <View style={[styles.footer, { paddingBottom: insets.bottom }]}>{footer[step]}</View>

      <ConfirmDialog
        visible={eraseOpen}
        title="Erase your private answers?"
        message="This deletes your answers and your security question for good. It cannot be undone."
        confirmLabel="Erase"
        destructive
        onConfirm={() => void erase()}
        onCancel={() => setEraseOpen(false)}
      />
    </BottomSheet>
  );
}

type Styles = ReturnType<typeof createStyles>;

function Point({ icon, text, colors, styles }: { icon: keyof typeof Ionicons.glyphMap; text: string; colors: FormColors; styles: Styles }) {
  return (
    <View style={styles.point}>
      <Ionicons name={icon} size={20} color={colors.accent} />
      <Text style={styles.pointText}>{text}</Text>
    </View>
  );
}

function Primary({ label, onPress, busy, disabled, styles }: { label: string; onPress: () => void; busy?: boolean; disabled?: boolean; styles: Styles }) {
  const off = busy || disabled;
  return (
    <Pressable accessibilityRole="button" accessibilityState={{ disabled: !!off, busy: !!busy }} disabled={off} onPress={onPress} style={[styles.primary, off && styles.primaryOff]}>
      {busy ? <ActivityIndicator color="#FFFFFF" /> : <Text style={styles.primaryText}>{label}</Text>}
    </Pressable>
  );
}

function Secondary({ label, onPress, styles }: { label: string; onPress: () => void; styles: Styles }) {
  return (
    <Pressable accessibilityRole="button" onPress={onPress} style={styles.secondary}>
      <Text style={styles.secondaryText}>{label}</Text>
    </Pressable>
  );
}

function AnswerInput({ value, onChange, placeholder, show, onToggle, colors, styles, onSubmit, invalid }: { value: string; onChange: (v: string) => void; placeholder: string; show: boolean; onToggle: () => void; colors: FormColors; styles: Styles; onSubmit?: () => void; invalid?: boolean }) {
  return (
    <View style={[styles.inputRow, invalid && styles.inputRowError]}>
      <TextInput
        value={value}
        onChangeText={(text) => onChange(text.slice(0, 100))}
        placeholder={placeholder}
        placeholderTextColor={colors.placeholder}
        secureTextEntry={!show}
        autoCapitalize="none"
        autoCorrect={false}
        maxLength={100}
        returnKeyType="done"
        onSubmitEditing={onSubmit}
        style={styles.input}
      />
      <Pressable accessibilityRole="button" accessibilityLabel={show ? 'Hide answer' : 'Show answer'} onPress={onToggle} hitSlop={8}>
        <Ionicons name={show ? 'eye-off-outline' : 'eye-outline'} size={20} color={colors.placeholder} />
      </Pressable>
    </View>
  );
}

const createStyles = (colors: FormColors) =>
  StyleSheet.create({
    body: { gap: 14, paddingBottom: 8 },
    footer: { gap: 10 },
    title: { fontFamily: 'Poppins_600SemiBold', fontSize: 18, color: colors.textStrong },
    text: { fontFamily: 'Poppins_400Regular', fontSize: 13.5, lineHeight: 20, color: colors.muted },
    point: { flexDirection: 'row', gap: 10, alignItems: 'flex-start' },
    pointText: { flex: 1, fontFamily: 'Poppins_400Regular', fontSize: 13, lineHeight: 19, color: colors.text },
    group: { gap: 8 },
    question: { fontFamily: 'Poppins_500Medium', fontSize: 14, color: colors.text },
    chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
    radio: { flexDirection: 'row', alignItems: 'center', gap: 10, borderWidth: 1, borderColor: colors.border, borderRadius: 12, paddingHorizontal: 12, paddingVertical: 10, backgroundColor: colors.card },
    radioOn: { borderColor: colors.accent, backgroundColor: colors.accentSoft },
    radioText: { flex: 1, fontFamily: 'Poppins_400Regular', fontSize: 13, color: colors.text },
    inputRow: { flexDirection: 'row', alignItems: 'center', gap: 10, height: 48, borderWidth: 1, borderColor: colors.border, borderRadius: 14, paddingHorizontal: 14, backgroundColor: colors.card },
    inputRowError: { borderColor: colors.error, borderWidth: 1.5 },
    mismatch: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: -6 },
    mismatchText: { fontFamily: 'Poppins_500Medium', fontSize: 12.5, color: colors.error },
    input: { flex: 1, fontFamily: 'Poppins_400Regular', fontSize: 14, color: colors.text, padding: 0 },
    warn: { flexDirection: 'row', gap: 8, alignItems: 'flex-start', backgroundColor: colors.warnBg, borderRadius: 12, padding: 12 },
    warnText: { flex: 1, fontFamily: 'Poppins_400Regular', fontSize: 12.5, lineHeight: 18, color: colors.warnText },
    error: { fontFamily: 'Poppins_500Medium', fontSize: 13, color: colors.error },
    primary: { height: 50, borderRadius: 999, backgroundColor: colors.accentFill, alignItems: 'center', justifyContent: 'center' },
    primaryOff: { opacity: 0.5 },
    primaryText: { fontFamily: 'Poppins_600SemiBold', fontSize: 15, color: colors.onAccent },
    secondary: { height: 46, borderRadius: 999, borderWidth: 1, borderColor: colors.border2, alignItems: 'center', justifyContent: 'center' },
    secondaryText: { fontFamily: 'Poppins_600SemiBold', fontSize: 14, color: colors.muted },
    link: { fontFamily: 'Poppins_500Medium', fontSize: 12.5, color: colors.muted, textAlign: 'center', textDecorationLine: 'underline' },
    linkDanger: { fontFamily: 'Poppins_500Medium', fontSize: 13, color: colors.error, textAlign: 'center' },
    viewRow: { gap: 2, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.border, paddingBottom: 10 },
    viewQuestion: { fontFamily: 'Poppins_400Regular', fontSize: 12.5, color: colors.muted },
    viewAnswer: { fontFamily: 'Poppins_600SemiBold', fontSize: 14.5, color: colors.text },
  });
