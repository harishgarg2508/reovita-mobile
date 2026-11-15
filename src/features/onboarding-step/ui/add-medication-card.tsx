import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import { tapSelection } from '@shared/lib';

import { matchMedication, useIngredientSearch, type IngredientSuggestion } from '../model/use-ingredient-search';

export const NAME_MAX = 100;
export const DOSE_MAX = 50;

export interface NewMedication {
  name: string;
  dose: string;
  ingredient_ids: string[];
}

// Inline card to add one medicine. The user picks a suggestion (which brings its ingredients) or types a name:
// a typed name is checked with the server when "Add" is pressed. Whatever the outcome, the medicine can always be added;
// one that could not be matched is kept and marked as not checked.
export function AddMedicationCard({ existingNames, onAdd, onCancel }: { existingNames: string[]; onAdd: (med: NewMedication) => void; onCancel: () => void }) {
  const [name, setName] = useState('');
  const [dose, setDose] = useState('');
  // Set when a suggestion was picked. Typing again clears it, so ingredients never follow a name the user changed.
  const [picked, setPicked] = useState<IngredientSuggestion | null>(null);
  const [candidates, setCandidates] = useState<IngredientSuggestion[] | null>(null);
  const [checking, setChecking] = useState(false);
  const [listOpen, setListOpen] = useState(true);

  const search = useIngredientSearch(picked ? '' : name);
  const trimmed = name.trim();
  const duplicate = existingNames.some((n) => n.toLowerCase() === trimmed.toLowerCase());

  const finish = (ingredient_ids: string[], finalName = trimmed) => {
    tapSelection();
    onAdd({ name: finalName.slice(0, NAME_MAX), dose: dose.trim().slice(0, DOSE_MAX), ingredient_ids });
  };

  const pick = (item: IngredientSuggestion) => {
    tapSelection();
    setName(item.alias.slice(0, NAME_MAX));
    setPicked(item);
    setCandidates(null);
    setListOpen(false);
  };

  const submit = async () => {
    if (!trimmed || duplicate || checking) return;
    if (picked) return finish(picked.ingredient_ids, name);
    setChecking(true);
    try {
      const result = await matchMedication(trimmed);
      if (result.status === 'matched') return finish(result.ingredient_ids);
      if (result.status === 'candidates' && result.candidates.length > 0) {
        setCandidates(result.candidates);
        return;
      }
      finish([]);
    } catch {
      // The name could not be checked right now. It is still added, and marked as not matched.
      finish([]);
    } finally {
      setChecking(false);
    }
  };

  return (
    <View style={styles.card}>
      <View style={styles.inputRow}>
        <Ionicons name="search-outline" size={18} color="#9185AA" />
        <TextInput
          autoFocus
          value={name}
          onChangeText={(text) => {
            setName(text.slice(0, NAME_MAX));
            setPicked(null);
            setCandidates(null);
            setListOpen(true);
          }}
          placeholder="Search or type a medicine"
          placeholderTextColor="#9185AA"
          maxLength={NAME_MAX}
          returnKeyType="done"
          onSubmitEditing={submit}
          style={styles.input}
        />
        {search.searching ? <ActivityIndicator size="small" color="#1F6F3F" /> : null}
      </View>

      {listOpen && !candidates && search.items.length > 0 ? (
        <View style={styles.list}>
          {search.items.map((item) => (
            <Pressable key={`${item.alias}-${item.ingredient_ids.join()}`} accessibilityRole="button" onPress={() => pick(item)} style={styles.listItem}>
              <Text style={styles.listText}>{item.alias}</Text>
              <Ionicons name="add" size={16} color="#1F6F3F" />
            </Pressable>
          ))}
        </View>
      ) : null}

      {candidates ? (
        <View style={styles.list} accessibilityRole="radiogroup">
          <Text style={styles.question}>Which of these is it?</Text>
          {candidates.map((item) => (
            <Pressable
              key={`${item.alias}-${item.ingredient_ids.join()}`}
              accessibilityRole="radio"
              onPress={() => finish(item.ingredient_ids, trimmed)}
              style={styles.listItem}>
              <Ionicons name="radio-button-off" size={18} color="#1F6F3F" />
              <Text style={[styles.listText, styles.radioText]}>{item.alias}</Text>
            </Pressable>
          ))}
          <Pressable accessibilityRole="radio" onPress={() => finish([])} style={styles.listItem}>
            <Ionicons name="radio-button-off" size={18} color="#655F74" />
            <Text style={[styles.listText, styles.radioText]}>None of these</Text>
          </Pressable>
        </View>
      ) : null}

      <TextInput
        value={dose}
        onChangeText={(text) => setDose(text.slice(0, DOSE_MAX))}
        placeholder="Dose, e.g. 500 mg (optional)"
        placeholderTextColor="#9185AA"
        maxLength={DOSE_MAX}
        style={styles.dose}
      />

      {duplicate ? <Text style={styles.note}>This medicine is already on your list.</Text> : null}

      <View style={styles.actions}>
        <Pressable accessibilityRole="button" onPress={onCancel} style={styles.cancel}>
          <Text style={styles.cancelText}>Cancel</Text>
        </Pressable>
        <Pressable
          accessibilityRole="button"
          accessibilityState={{ disabled: !trimmed || duplicate || checking }}
          disabled={!trimmed || duplicate || checking}
          onPress={submit}
          style={[styles.add, (!trimmed || duplicate || checking) && styles.addDisabled]}>
          {checking ? <ActivityIndicator size="small" color="#FFFFFF" /> : <Text style={styles.addText}>Add</Text>}
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { borderWidth: 1, borderColor: '#E5E0EC', borderRadius: 14, backgroundColor: '#FFFFFF', padding: 12, gap: 10 },
  inputRow: { flexDirection: 'row', alignItems: 'center', gap: 8, height: 44, borderWidth: 1, borderColor: '#E5E0EC', borderRadius: 12, paddingHorizontal: 12 },
  input: { flex: 1, fontFamily: 'Poppins_400Regular', fontSize: 13, color: '#242032', padding: 0 },
  list: { borderWidth: 1, borderColor: '#E5E0EC', borderRadius: 12, backgroundColor: '#FFFFFF', paddingVertical: 4 },
  listItem: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8, paddingHorizontal: 12, paddingVertical: 10 },
  listText: { fontFamily: 'Poppins_400Regular', fontSize: 13, color: '#242032', flexShrink: 1 },
  radioText: { flex: 1 },
  question: { fontFamily: 'Poppins_500Medium', fontSize: 13, color: '#242032', paddingHorizontal: 12, paddingTop: 6 },
  dose: { height: 40, borderWidth: 1, borderColor: '#E5E0EC', borderRadius: 10, paddingHorizontal: 12, fontFamily: 'Poppins_400Regular', fontSize: 13, color: '#242032' },
  note: { fontFamily: 'Poppins_400Regular', fontSize: 12, color: '#C22F43' },
  actions: { flexDirection: 'row', justifyContent: 'flex-end', gap: 10 },
  cancel: { height: 40, paddingHorizontal: 18, borderRadius: 999, borderWidth: 1, borderColor: '#D9D4EA', alignItems: 'center', justifyContent: 'center' },
  cancelText: { fontFamily: 'Poppins_600SemiBold', fontSize: 13, color: '#5C6080' },
  add: { height: 40, minWidth: 72, paddingHorizontal: 18, borderRadius: 999, backgroundColor: '#1F6F3F', alignItems: 'center', justifyContent: 'center' },
  addDisabled: { opacity: 0.4 },
  addText: { fontFamily: 'Poppins_600SemiBold', fontSize: 13, color: '#FFFFFF' },
});
