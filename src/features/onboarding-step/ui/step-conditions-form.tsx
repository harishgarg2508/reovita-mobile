import { Ionicons } from '@expo/vector-icons';
import { useEffect, useMemo, useState } from 'react';
import {
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

import { tapSelection } from '@shared/lib';
import { useFormColors, type FormColors } from '@shared/ui/theme/form-colors';
import { BottomSheet } from '@shared/ui/bottom-sheet';

import { FAMILY_CONDITION_OPTIONS, FAMILY_TAG_BY_LABEL } from '../model/family-conditions';
import { OTHER_LABEL, OTHER_TEXT_MAX } from '../model/other-conditions';
import { useHistoryDraft } from '../model/use-onboarding-drafts';
import type { HistoryInput } from '../model/onboarding.types';
import { MedicationsSection } from './medications-section';

// The chips match the server's condition tags one to one. 'Other' opens a field for conditions typed by the user.
const CONDITION_CHIPS = ['Diabetes', 'Hypertension', 'Thyroid', 'Heart Disease', 'Kidney Disease', OTHER_LABEL, 'None'];

// Server tags for the chips. Typed conditions are sent together as one 'other' item with the names as free text.
const CONDITION_TAG: Record<string, 'diabetes' | 'hypertension' | 'thyroid' | 'cvd' | 'ckd'> = {
  Diabetes: 'diabetes',
  Hypertension: 'hypertension',
  Thyroid: 'thyroid',
  'Heart Disease': 'cvd',
  'Kidney Disease': 'ckd',
};



/**
 * Reovita Step 2 Form: "Medical History"
 * Matches the Figma design:
 * - Conditions: multi-select chip tags with checkmark & "+ More"
 * - Other: text area with character counter (0 / 500)
 * - Meds: search box with suggestions & removable pill tags (e.g. Salbutamol, Cetirizine)
 * - Family: Father, Mother, Sibling(s) rows with tag management
 */
export function StepConditionsForm({
  onChange,
  missing = [],
  onFieldLayout,
}: {
  onChange: (value: HistoryInput | null) => void;
  missing?: string[];
  onFieldLayout?: (name: string, y: number) => void;
}) {
  const colors = useFormColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
  // Saved selections live in Redux; only the UI-only state stays local.
  const [draft, patchDraft] = useHistoryDraft();
  const selectedConditions = draft.conditions;
  const otherText = draft.otherText;
  const selectedMeds = draft.medications;
  const fatherConditions = draft.father;
  const motherConditions = draft.mother;
  const siblingConditions = draft.sibling;
  const wifeConditions = draft.wife;

  // The Other field and its chips are shown only while the Other chip is selected.
  const otherSelected = selectedConditions.includes(OTHER_LABEL);
  const [activeFamilyRelation, setActiveFamilyRelation] = useState<'father' | 'mother' | 'sibling' | 'wife' | null>(null);

  // Emit the payload whenever the saved draft changes (also on mount, to restore the step).
  useEffect(() => {
    // Only the server's family conditions are sent; 'None' and anything untracked are dropped.
    const familyFor = (relation: string, labels: string[]) =>
      labels.map((label) => FAMILY_TAG_BY_LABEL[label]).filter((tag): tag is string => Boolean(tag)).map((condition) => ({ relation, condition }));
    const familyItems = [
      ...familyFor('father', fatherConditions),
      ...familyFor('mother', motherConditions),
      ...familyFor('sibling', siblingConditions),
      ...familyFor('wife', wifeConditions),
    ];
    // Chips with a server tag are sent as that tag. The typed names go together in one 'other' item,
    // and only while the Other chip is selected.
    const conditionItems: { tag: string; free_text?: string }[] = selectedConditions
      .map((label) => CONDITION_TAG[label])
      .filter((tag): tag is (typeof CONDITION_TAG)[string] => Boolean(tag))
      .map((tag) => ({ tag }));
    if (otherSelected && otherText.trim().length > 0) {
      conditionItems.push({ tag: 'other', free_text: otherText.trim() });
    }

    onChange({
      // Sent whenever a chip is selected. "None" sends an empty list, which removes the conditions saved before.
      conditions: selectedConditions.length > 0 ? { items: conditionItems } : undefined,
      // Always sent once the step has loaded, so a medicine the user removed is deleted on the server.
      // The id makes the server update this row instead of adding another. An empty ingredient list is sent as it is:
      // it means "not matched", and the server never guesses ingredients from the name.
      medications: selectedMeds.map((m) => ({
        id: m.id,
        name: m.name,
        dose: m.dose.trim(),
        schedule_times: m.schedule_times,
        ingredient_ids: m.ingredient_ids,
      })),
      // Always sent once the step has loaded, so an empty list clears entries the user removed (for example "None").
      family_history: { items: familyItems },
    });
  }, [draft, onChange]); // eslint-disable-line react-hooks/exhaustive-deps

  const toggleCondition = (item: string) => {
    tapSelection();
    let next: string[];
    if (item === 'None') {
      next = selectedConditions.includes('None') ? [] : ['None'];
    } else {
      const withoutNone = selectedConditions.filter((c) => c !== 'None');
      next = withoutNone.includes(item) ? withoutNone.filter((c) => c !== item) : [...withoutNone, item];
    }
    // Turning Other off (or choosing None) also removes the typed conditions.
    if (next.includes(OTHER_LABEL)) {
      patchDraft({ conditions: next });
    } else {
      patchDraft({ conditions: next, otherText: '' });
    }
  };

  const toggleFamilyCondition = (cond: string) => {
    tapSelection();
    if (activeFamilyRelation === null) return;
    const current = draft[activeFamilyRelation];
    const next = current.includes(cond)
      ? current.filter((c) => c !== cond)
      : cond === 'None'
      ? ['None']
      : [...current.filter((c) => c !== 'None'), cond];
    const patch: Partial<typeof draft> =
      activeFamilyRelation === 'father'
        ? { father: next }
        : activeFamilyRelation === 'mother'
        ? { mother: next }
        : activeFamilyRelation === 'sibling'
        ? { sibling: next }
        : { wife: next };
    patchDraft(patch);
  };

  return (
    <View style={styles.container}>
      {/* 1. Conditions Section */}
      <View style={[styles.section, missing.includes('conditions') && styles.blockError]} onLayout={(e) => onFieldLayout?.('conditions', e.nativeEvent.layout.y)}>
        <Text style={styles.sectionLabel}>Conditions</Text>
        <View style={styles.chipsWrap}>
          {CONDITION_CHIPS.map((item) => {
            const isSelected = selectedConditions.includes(item);
            return (
              <Pressable
                key={item}
                accessibilityRole="button"
                accessibilityState={{ selected: isSelected }}
                onPress={() => toggleCondition(item)}
                style={[styles.chip, isSelected && styles.chipSelected]}>
                {isSelected && (
                  <Ionicons name="checkmark" size={13} color={colors.onSoft} style={styles.chipCheck} />
                )}
                <Text style={[styles.chipText, isSelected && styles.chipTextSelected]}>
                  {item}
                </Text>
              </Pressable>
            );
          })}
        </View>
      </View>

      {/* 2. Other conditions: shown only while the Other chip is selected. Free text, written as the user likes. */}
      {otherSelected ? (
        <View style={styles.section} onLayout={(e) => onFieldLayout?.('other', e.nativeEvent.layout.y)}>
          <Text style={styles.sectionLabel}>Other</Text>
          <View style={styles.otherBox}>
            <TextInput
              autoFocus={otherText.length === 0}
              value={otherText}
              onChangeText={(text) => patchDraft({ otherText: text.slice(0, OTHER_TEXT_MAX) })}
              maxLength={OTHER_TEXT_MAX}
              multiline
              textAlignVertical="top"
              placeholder="Describe any other condition, in your own words"
              placeholderTextColor={colors.placeholder}
              accessibilityLabel="Other conditions"
              style={styles.otherInput}
            />
            <Text style={styles.otherCounter}>
              {otherText.length} / {OTHER_TEXT_MAX}
            </Text>
          </View>
        </View>
      ) : null}

      {/* 3. Meds Section */}
      <View style={styles.section} onLayout={(e) => onFieldLayout?.('meds', e.nativeEvent.layout.y)}>
        <Text style={styles.sectionLabel}>Meds</Text>
        <MedicationsSection
          medications={selectedMeds}
          none={draft.noMedications === true}
          // Adding a medicine takes the "none" answer back; saying "none" is only possible with an empty list.
          onChange={(medications) => patchDraft({ medications, ...(medications.length > 0 ? { noMedications: false } : {}) })}
          onNoneChange={(noMedications) => patchDraft({ noMedications })}
        />
      </View>

      {/* 4. Family Section */}
      <View style={styles.section} onLayout={(e) => onFieldLayout?.('family', e.nativeEvent.layout.y)}>
        <Text style={styles.sectionLabel}>Family medical history</Text>
        <Text style={styles.sectionHelp}>
          Health conditions that run in your close family, such as diabetes, heart disease or high blood pressure. Tap a row and choose what they had, if anything.
        </Text>
        <View style={styles.familyCard}>
          {/* Father Row */}
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Edit Father medical history"
            onPress={() => setActiveFamilyRelation('father')}
            style={styles.familyRow}>
            <Text style={styles.familyRelation}>Father</Text>
            <View style={styles.familyValueCol}>
              <Text
                style={[
                  styles.familyTagsText,
                  fatherConditions.length === 0 && styles.familyPlaceholderText,
                ]}>
                {fatherConditions.length > 0 ? fatherConditions.join(', ') : 'Add tags'}
              </Text>
            </View>
            <Ionicons name="add" size={18} color={colors.accent} style={styles.familyAddIcon} />
          </Pressable>

          <View style={styles.familyDivider} />

          {/* Mother Row */}
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Edit Mother medical history"
            onPress={() => setActiveFamilyRelation('mother')}
            style={styles.familyRow}>
            <Text style={styles.familyRelation}>Mother</Text>
            <View style={styles.familyValueCol}>
              <Text
                style={[
                  styles.familyTagsText,
                  motherConditions.length === 0 && styles.familyPlaceholderText,
                ]}>
                {motherConditions.length > 0 ? motherConditions.join(', ') : 'Add tags'}
              </Text>
            </View>
            <Ionicons name="add" size={18} color={colors.accent} style={styles.familyAddIcon} />
          </Pressable>

          <View style={styles.familyDivider} />

          {/* Sibling(s) Row */}
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Edit Sibling medical history"
            onPress={() => setActiveFamilyRelation('sibling')}
            style={styles.familyRow}>
            <Text style={styles.familyRelation}>Sibling(s)</Text>
            <View style={styles.familyValueCol}>
              <Text
                style={[
                  styles.familyTagsText,
                  siblingConditions.length === 0 && styles.familyPlaceholderText,
                ]}>
                {siblingConditions.length > 0 ? siblingConditions.join(', ') : 'Add tags'}
              </Text>
            </View>
            <Ionicons name="add" size={18} color={colors.accent} style={styles.familyAddIcon} />
          </Pressable>

          <View style={styles.familyDivider} />

          {/* Wife Row */}
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Edit Wife medical history"
            onPress={() => setActiveFamilyRelation('wife')}
            style={styles.familyRow}>
            <Text style={styles.familyRelation}>Wife</Text>
            <View style={styles.familyValueCol}>
              <Text
                style={[
                  styles.familyTagsText,
                  wifeConditions.length === 0 && styles.familyPlaceholderText,
                ]}>
                {wifeConditions.length > 0 ? wifeConditions.join(', ') : 'Add tags'}
              </Text>
            </View>
            <Ionicons name="add" size={18} color={colors.accent} style={styles.familyAddIcon} />
          </Pressable>
        </View>
      </View>

      {/* Modal / Sheet for Family Condition Selection */}
      <BottomSheet visible={activeFamilyRelation !== null} onClose={() => setActiveFamilyRelation(null)}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>
                {activeFamilyRelation === 'father'
                  ? 'Father\'s Health'
                  : activeFamilyRelation === 'mother'
                  ? 'Mother\'s Health'
                  : activeFamilyRelation === 'wife'
                  ? "Wife's Health"
                  : 'Sibling(s) Health'}
              </Text>
              <Pressable
                onPress={() => setActiveFamilyRelation(null)}
                hitSlop={8}
                style={styles.modalCloseBtn}>
                <Ionicons name="close" size={20} color={colors.text} />
              </Pressable>
            </View>

            <View style={styles.modalChipsWrap}>
              {FAMILY_CONDITION_OPTIONS.map((cond) => {
                const currentList =
                  activeFamilyRelation === 'father'
                    ? fatherConditions
                    : activeFamilyRelation === 'mother'
                    ? motherConditions
                    : activeFamilyRelation === 'wife'
                    ? wifeConditions
                    : siblingConditions;
                const isSelected = currentList.includes(cond);
                return (
                  <Pressable
                    key={cond}
                    onPress={() => toggleFamilyCondition(cond)}
                    style={[styles.modalChip, isSelected && styles.modalChipSelected]}>
                    {isSelected && (
                      <Ionicons name="checkmark" size={13} color={colors.onSoft} style={styles.chipCheck} />
                    )}
                    <Text style={[styles.chipText, isSelected && styles.chipTextSelected]}>
                      {cond}
                    </Text>
                  </Pressable>
                );
              })}
            </View>

            <Pressable
              onPress={() => setActiveFamilyRelation(null)}
              style={styles.modalDoneBtn}>
              <Text style={styles.modalDoneBtnText}>Done</Text>
            </Pressable>
          </View>
      </BottomSheet>
    </View>
  );
}

const createStyles = (colors: FormColors) =>
  StyleSheet.create({
  container: {
    gap: 28,
    position: 'relative',
  },
  section: {
    gap: 12,
  },
  blockError: { borderWidth: 1.5, borderColor: colors.error, borderRadius: 14, padding: 10 },
  sectionHelp: { fontFamily: 'Poppins_400Regular', fontSize: 13, lineHeight: 19, color: colors.muted, marginTop: -4, marginBottom: 8 },
  sectionLabel: {
    fontFamily: 'Poppins_500Medium',
    fontSize: 14,
    color: colors.text,
  },
  chipsWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    height: 40,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.card,
  },
  chipSelected: {
    backgroundColor: colors.accentSoft,
    borderColor: colors.accent,
    borderWidth: 1.5,
  },
  chipCheck: {
    marginRight: 4,
  },
  chipText: {
    fontFamily: 'Poppins_400Regular',
    fontSize: 14,
    color: colors.muted,
  },
  chipTextSelected: {
    fontFamily: 'Poppins_500Medium',
    color: colors.onSoft,
  },

  /* Meds Box */
  medsBox: {
    gap: 10,
    position: 'relative',
    zIndex: 60,
    elevation: 60,
    overflow: 'visible',
  },
  otherBox: { borderWidth: 1, borderColor: colors.border, borderRadius: 16, backgroundColor: colors.card, padding: 12, gap: 6 },
  otherInput: { minHeight: 96, fontFamily: 'Poppins_400Regular', fontSize: 14, color: colors.text, padding: 0 },
  otherCounter: { alignSelf: 'flex-end', fontFamily: 'Poppins_400Regular', fontSize: 11, color: colors.placeholder },
  medSearchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 52,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 16,
    backgroundColor: colors.card,
    paddingHorizontal: 14,
  },
  searchIcon: {
    marginRight: 8,
  },
  medSearchInput: {
    flex: 1,
    fontFamily: 'Poppins_400Regular',
    fontSize: 13,
    color: colors.text,
    padding: 0,
  },
  dropdownChevron: {
    padding: 4,
  },
  // Overlay under the search bar: it floats over the content below and does not push it down.
  dropdownBackdrop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 50,
    elevation: 50,
  },
  // In the page flow under the search box (not floating), so it never covers the sections below.
  suggestionsDropdown: {
    maxHeight: 220,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    backgroundColor: colors.card,
    paddingVertical: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.12,
    shadowRadius: 12,
  },
  suggestionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.surfaceAlt,
  },
  suggestionText: {
    fontFamily: 'Poppins_400Regular',
    fontSize: 13,
    color: colors.text,
  },
  addCustomMedText: {
    fontFamily: 'Poppins_500Medium',
    fontSize: 13,
    color: colors.accent,
  },
  selectedMedsWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 2,
  },
  medTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 999,
    backgroundColor: colors.accentSoft,
    borderWidth: 1.5,
    borderColor: colors.accent,
  },
  medTagText: {
    fontFamily: 'Poppins_500Medium',
    fontSize: 13,
    color: colors.onSoft,
  },
  medCard: { borderWidth: 1, borderColor: colors.border, borderRadius: 16, backgroundColor: colors.card, padding: 12, gap: 8 },
  medCardHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  medDoseInput: {
    height: 40,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 10,
    paddingHorizontal: 12,
    fontFamily: 'Poppins_400Regular',
    fontSize: 13,
    color: colors.text,
  },
  medTimesLabel: { fontFamily: 'Poppins_400Regular', fontSize: 12, color: colors.placeholder },
  timeTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 999,
    backgroundColor: colors.accentSoft,
    borderWidth: 1,
    borderColor: colors.accent,
  },
  timeTagText: { fontFamily: 'Poppins_500Medium', fontSize: 12, color: colors.onSoft },
  timeAdder: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  timeInput: {
    width: 76,
    height: 30,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 999,
    paddingHorizontal: 10,
    fontFamily: 'Poppins_400Regular',
    fontSize: 12,
    color: colors.text,
  },
  timeAddBtn: { width: 30, height: 30, borderRadius: 15, backgroundColor: colors.accentFill, alignItems: 'center', justifyContent: 'center' },
  suggestionForm: { fontFamily: 'Poppins_400Regular', fontSize: 11, color: colors.placeholder },
  searchingText: { fontFamily: 'Poppins_400Regular', fontSize: 12, color: colors.placeholder, paddingHorizontal: 14, paddingVertical: 8 },
  medTagClose: {
    marginLeft: 2,
  },

  /* Family Card */
  familyCard: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 16,
    backgroundColor: colors.card,
    overflow: 'hidden',
  },
  familyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 15,
  },
  familyRelation: {
    width: 104,
    fontFamily: 'Poppins_500Medium',
    fontSize: 13,
    color: colors.text,
  },
  familyValueCol: {
    flex: 1,
    paddingHorizontal: 8,
  },
  familyTagsText: {
    fontFamily: 'Poppins_500Medium',
    fontSize: 12,
    color: colors.accent,
  },
  familyPlaceholderText: {
    fontFamily: 'Poppins_400Regular',
    color: colors.placeholder,
  },
  familyAddIcon: {
    marginLeft: 'auto',
  },
  familyDivider: {
    height: 1,
    backgroundColor: colors.surfaceAlt,
  },

  /* Modal */
  modalOverlay: {
    flex: 1,
    backgroundColor: colors.card,
    justifyContent: 'flex-end',
  },
  modalSheet: {
    backgroundColor: colors.card,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    gap: 16,
    maxHeight: '70%',
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  modalTitle: {
    fontFamily: 'Poppins_600SemiBold',
    fontSize: 16,
    color: colors.text,
  },
  modalCloseBtn: {
    padding: 4,
  },
  modalContent: {
    gap: 16,
  },
  modalChipsWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginVertical: 8,
  },
  modalChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.card,
  },
  modalChipSelected: {
    backgroundColor: colors.accentSoft,
    borderColor: colors.accent,
    borderWidth: 1.5,
  },
  modalDoneBtn: {
    height: 48,
    borderRadius: 999,
    backgroundColor: colors.accentFill,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
  },
  modalDoneBtnText: {
    fontFamily: 'Poppins_600SemiBold',
    fontSize: 15,
    color: colors.onAccent,
  },
});
