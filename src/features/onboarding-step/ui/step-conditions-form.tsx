import { Ionicons } from '@expo/vector-icons';
import { useEffect, useState } from 'react';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

import { tapSelection } from '@shared/lib';
import { BottomSheet } from '@shared/ui/bottom-sheet';

import { FAMILY_CONDITION_OPTIONS, FAMILY_TAG_BY_LABEL } from '../model/family-conditions';
import { useHistoryDraft } from '../model/use-onboarding-drafts';
import type { HistoryInput } from '../model/onboarding.types';

const INITIAL_CONDITIONS = ['Asthma', 'Diabetes', 'Hypertension', 'Thyroid', 'None'];
const EXTRA_CONDITIONS = ['PCOS', 'Allergies', 'Migraine', 'Arthritis', 'Cholesterol', 'Anxiety', 'GERD', 'Heart Disease', 'Kidney Disease'];

// Server tags for the conditions that have one. Other labels are sent as 'other' with the label as free text.
const CONDITION_TAG: Record<string, 'diabetes' | 'hypertension' | 'thyroid' | 'cvd' | 'ckd'> = {
  Diabetes: 'diabetes',
  Hypertension: 'hypertension',
  Thyroid: 'thyroid',
  'Heart Disease': 'cvd',
  'Kidney Disease': 'ckd',
};

const MEDICATION_SUGGESTIONS = [
  'Salbutamol',
  'Cetirizine',
  'Paracetamol',
  'Metformin',
  'Amlodipine',
  'Atorvastatin',
  'Omeprazole',
  'Levothyroxine',
  'Ibuprofen',
  'Amoxicillin',
  'Lisinopril',
  'Montelukast',
];


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
  // Saved selections live in Redux; only the UI-only state stays local.
  const [draft, patchDraft] = useHistoryDraft();
  const selectedConditions = draft.conditions;
  const otherText = draft.otherText;
  const selectedMeds = draft.medications;
  const fatherConditions = draft.father;
  const motherConditions = draft.mother;
  const siblingConditions = draft.sibling;
  const wifeConditions = draft.wife;

  // Open the full list when a saved condition is only in it, so the saved choice is visible.
  const [showMoreConditions, setShowMoreConditions] = useState(() => draft.conditions.some((c) => EXTRA_CONDITIONS.includes(c)));
  const [medQuery, setMedQuery] = useState('');
  const [medsDropdownOpen, setMedsDropdownOpen] = useState(false);
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
    // Only the 'other' condition carries the typed text. Empty text is not sent, so the server clears it.
    const typedOther = otherText.trim();
    const conditionItems: { tag: string; free_text?: string }[] = selectedConditions
      .filter((c) => c !== 'None')
      .map((label) => {
        const tag = CONDITION_TAG[label];
        if (tag) return { tag };
        return { tag: 'other', free_text: [label, typedOther].filter(Boolean).join(': ') };
      });
    if (typedOther && !conditionItems.some((item) => item.tag === 'other')) {
      conditionItems.push({ tag: 'other', free_text: typedOther });
    }

    onChange({
      conditions: conditionItems.length > 0 ? { items: conditionItems } : undefined,
      medications: selectedMeds.length > 0 ? selectedMeds.map((name) => ({ name })) : undefined,
      family_history: familyItems.length > 0 ? { items: familyItems } : undefined,
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
    patchDraft({ conditions: next });
  };

  const handleOtherTextChange = (text: string) => patchDraft({ otherText: text });

  const addMedication = (name: string) => {
    const trimmed = name.trim();
    if (!trimmed) return;
    if (!selectedMeds.includes(trimmed)) {
      tapSelection();
      patchDraft({ medications: [...selectedMeds, trimmed] });
    }
    setMedQuery('');
    setMedsDropdownOpen(false);
  };

  const removeMedication = (name: string) => {
    tapSelection();
    patchDraft({ medications: selectedMeds.filter((m) => m !== name) });
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

  const visibleConditionsList = showMoreConditions
    ? [...INITIAL_CONDITIONS.filter((c) => c !== 'None'), ...EXTRA_CONDITIONS, 'None']
    : INITIAL_CONDITIONS;

  const filteredMeds = MEDICATION_SUGGESTIONS.filter(
    (m) =>
      m.toLowerCase().includes(medQuery.toLowerCase()) &&
      !selectedMeds.includes(m)
  );

  return (
    <View style={styles.container}>
      {/* 1. Conditions Section */}
      <View style={[styles.section, missing.includes('conditions') && styles.blockError]} onLayout={(e) => onFieldLayout?.('conditions', e.nativeEvent.layout.y)}>
        <Text style={styles.sectionLabel}>Conditions</Text>
        <View style={styles.chipsWrap}>
          {visibleConditionsList.map((item) => {
            const isSelected = selectedConditions.includes(item);
            return (
              <Pressable
                key={item}
                accessibilityRole="button"
                accessibilityState={{ selected: isSelected }}
                onPress={() => toggleCondition(item)}
                style={[styles.chip, isSelected && styles.chipSelected]}>
                {isSelected && (
                  <Ionicons name="checkmark" size={13} color="#2E4D00" style={styles.chipCheck} />
                )}
                <Text style={[styles.chipText, isSelected && styles.chipTextSelected]}>
                  {item}
                </Text>
              </Pressable>
            );
          })}
          {!showMoreConditions && (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Show more conditions"
              onPress={() => {
                tapSelection();
                setShowMoreConditions(true);
              }}
              style={styles.moreChip}>
              <Text style={styles.moreChipText}>+ More</Text>
            </Pressable>
          )}
        </View>
      </View>

      {/* 2. Other Notes Section */}
      <View style={styles.section} onLayout={(e) => onFieldLayout?.('other', e.nativeEvent.layout.y)}>
        <Text style={styles.sectionLabel}>Other</Text>
        <View style={styles.otherCard}>
          <TextInput
            multiline
            maxLength={500}
            value={otherText}
            onChangeText={handleOtherTextChange}
            placeholder="Anything else to add?"
            placeholderTextColor="#9185AA"
            style={styles.otherInput}
          />
          <Text style={styles.charCount}>{otherText.length} / 500</Text>
        </View>
      </View>

      {/* Closes the medication suggestions when the user taps anywhere else in the form. */}
      {medsDropdownOpen ? (
        <Pressable
          accessibilityLabel="Close medication suggestions"
          onPress={() => setMedsDropdownOpen(false)}
          style={styles.dropdownBackdrop}
        />
      ) : null}

      {/* 3. Meds Section */}
      <View style={styles.section} onLayout={(e) => onFieldLayout?.('meds', e.nativeEvent.layout.y)}>
        <Text style={styles.sectionLabel}>Meds</Text>
        <View style={styles.medsBox}>
          {/* Search bar */}
          <View style={styles.medSearchBar}>
            <Ionicons name="search-outline" size={18} color="#9185AA" style={styles.searchIcon} />
            <TextInput
              value={medQuery}
              onChangeText={(text) => {
                setMedQuery(text);
                setMedsDropdownOpen(true);
              }}
              onFocus={() => setMedsDropdownOpen(true)}
              placeholder="Search medications"
              placeholderTextColor="#9185AA"
              returnKeyType="done"
              onSubmitEditing={() => addMedication(medQuery)}
              style={styles.medSearchInput}
            />
            <Pressable
              onPress={() => setMedsDropdownOpen((prev) => !prev)}
              hitSlop={8}
              style={styles.dropdownChevron}>
              <Ionicons
                name={medsDropdownOpen ? 'chevron-up' : 'chevron-down'}
                size={18}
                color="#1F6F3F"
              />
            </Pressable>
          </View>

          {/* Suggestions Dropdown */}
          {medsDropdownOpen && (
            <ScrollView
              style={styles.suggestionsDropdown}
              nestedScrollEnabled
              keyboardShouldPersistTaps="handled">
              {medQuery.trim().length > 0 && !selectedMeds.includes(medQuery.trim()) && (
                <Pressable
                  onPress={() => addMedication(medQuery)}
                  style={styles.suggestionItem}>
                  <Text style={styles.addCustomMedText}>
                    Add &quot;{medQuery.trim()}&quot;
                  </Text>
                </Pressable>
              )}
              {filteredMeds.slice(0, 5).map((med) => (
                <Pressable
                  key={med}
                  onPress={() => addMedication(med)}
                  style={styles.suggestionItem}>
                  <Text style={styles.suggestionText}>{med}</Text>
                  <Ionicons name="add" size={16} color="#1F6F3F" />
                </Pressable>
              ))}
            </ScrollView>
          )}

          {/* Selected Medication Tags */}
          {selectedMeds.length > 0 && (
            <View style={styles.selectedMedsWrap}>
              {selectedMeds.map((med) => (
                <Pressable
                  key={med}
                  accessibilityRole="button"
                  accessibilityLabel={`Remove ${med}`}
                  onPress={() => removeMedication(med)}
                  style={styles.medTag}>
                  <Text style={styles.medTagText}>{med}</Text>
                  <Ionicons name="close" size={14} color="#1F6F3F" style={styles.medTagClose} />
                </Pressable>
              ))}
            </View>
          )}
        </View>
      </View>

      {/* 4. Family Section */}
      <View style={styles.section} onLayout={(e) => onFieldLayout?.('family', e.nativeEvent.layout.y)}>
        <Text style={styles.sectionLabel}>Family</Text>
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
            <Ionicons name="add" size={18} color="#1F6F3F" style={styles.familyAddIcon} />
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
            <Ionicons name="add" size={18} color="#1F6F3F" style={styles.familyAddIcon} />
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
            <Ionicons name="add" size={18} color="#1F6F3F" style={styles.familyAddIcon} />
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
            <Ionicons name="add" size={18} color="#1F6F3F" style={styles.familyAddIcon} />
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
                <Ionicons name="close" size={20} color="#242032" />
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
                      <Ionicons name="checkmark" size={13} color="#2E4D00" style={styles.chipCheck} />
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

const styles = StyleSheet.create({
  container: {
    gap: 20,
    position: 'relative',
  },
  section: {
    gap: 8,
  },
  blockError: { borderWidth: 1.5, borderColor: '#C22F43', borderRadius: 14, padding: 10 },
  sectionLabel: {
    fontFamily: 'Poppins_500Medium',
    fontSize: 14,
    color: '#242032',
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
    paddingVertical: 8,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: '#E5E0EC',
    backgroundColor: '#FFFFFF',
  },
  chipSelected: {
    backgroundColor: '#E8F8CE',
    borderColor: '#1F6F3F',
    borderWidth: 1.5,
  },
  chipCheck: {
    marginRight: 4,
  },
  chipText: {
    fontFamily: 'Poppins_400Regular',
    fontSize: 13,
    color: '#655F74',
  },
  chipTextSelected: {
    fontFamily: 'Poppins_500Medium',
    color: '#2E4D00',
  },
  moreChip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: '#E5E0EC',
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  moreChipText: {
    fontFamily: 'Poppins_500Medium',
    fontSize: 13,
    color: '#655F74',
  },

  /* Other Card */
  otherCard: {
    borderWidth: 1,
    borderColor: '#E5E0EC',
    borderRadius: 14,
    backgroundColor: '#FFFFFF',
    padding: 14,
    minHeight: 100,
    justifyContent: 'space-between',
  },
  otherInput: {
    fontFamily: 'Poppins_400Regular',
    fontSize: 13,
    color: '#242032',
    lineHeight: 18,
    minHeight: 52,
    textAlignVertical: 'top',
    padding: 0,
  },
  charCount: {
    alignSelf: 'flex-end',
    fontFamily: 'Poppins_400Regular',
    fontSize: 11,
    color: '#9185AA',
    marginTop: 4,
  },

  /* Meds Box */
  medsBox: {
    gap: 10,
    position: 'relative',
    zIndex: 60,
    elevation: 60,
    overflow: 'visible',
  },
  medSearchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 48,
    borderWidth: 1,
    borderColor: '#E5E0EC',
    borderRadius: 14,
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 14,
  },
  searchIcon: {
    marginRight: 8,
  },
  medSearchInput: {
    flex: 1,
    fontFamily: 'Poppins_400Regular',
    fontSize: 13,
    color: '#242032',
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
  suggestionsDropdown: {
    position: 'absolute',
    top: 58,
    left: 0,
    right: 0,
    maxHeight: 220,
    zIndex: 70,
    elevation: 70,
    borderWidth: 1,
    borderColor: '#E5E0EC',
    borderRadius: 12,
    backgroundColor: '#FFFFFF',
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
    borderBottomColor: '#F1EDF7',
  },
  suggestionText: {
    fontFamily: 'Poppins_400Regular',
    fontSize: 13,
    color: '#242032',
  },
  addCustomMedText: {
    fontFamily: 'Poppins_500Medium',
    fontSize: 13,
    color: '#1F6F3F',
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
    backgroundColor: '#E8F8CE',
    borderWidth: 1.5,
    borderColor: '#1F6F3F',
  },
  medTagText: {
    fontFamily: 'Poppins_500Medium',
    fontSize: 13,
    color: '#2E4D00',
  },
  medTagClose: {
    marginLeft: 2,
  },

  /* Family Card */
  familyCard: {
    borderWidth: 1,
    borderColor: '#E5E0EC',
    borderRadius: 16,
    backgroundColor: '#FFFFFF',
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
    color: '#242032',
  },
  familyValueCol: {
    flex: 1,
    paddingHorizontal: 8,
  },
  familyTagsText: {
    fontFamily: 'Poppins_500Medium',
    fontSize: 12,
    color: '#1F6F3F',
  },
  familyPlaceholderText: {
    fontFamily: 'Poppins_400Regular',
    color: '#9185AA',
  },
  familyAddIcon: {
    marginLeft: 'auto',
  },
  familyDivider: {
    height: 1,
    backgroundColor: '#F1EDF7',
  },

  /* Modal */
  modalOverlay: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    justifyContent: 'flex-end',
  },
  modalSheet: {
    backgroundColor: '#FFFFFF',
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
    color: '#242032',
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
    borderColor: '#E5E0EC',
    backgroundColor: '#FFFFFF',
  },
  modalChipSelected: {
    backgroundColor: '#E8F8CE',
    borderColor: '#1F6F3F',
    borderWidth: 1.5,
  },
  modalDoneBtn: {
    height: 48,
    borderRadius: 999,
    backgroundColor: '#1F6F3F',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
  },
  modalDoneBtnText: {
    fontFamily: 'Poppins_600SemiBold',
    fontSize: 15,
    color: '#FFFFFF',
  },
});
