import { useEffect, useState } from 'react';
import {
  Animated,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

import {
  BloodDropDetailIcon,
  HeightDetailIcon,
  WeightDetailIcon,
} from '@shared/ui';

import type { HistoryInput } from '../model/onboarding.types';

const BLOOD_GROUPS = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'];

/**
 * Reovita Step 2 Form: "Your Health Details".
 * Exact recreation of Screen 1 from the Figma Design System with rich animations:
 * - Staggered fade & slide-in entrance for the 3 health cards
 * - Height card with measuring figure icon ("5 ft 8 in")
 * - Weight card with lime scale icon ("70 kg")
 * - Blood Group card with glossy red blood droplet ("B+")
 * - Interactive spring scale press feedback
 */
export function StepConditionsForm({
  onChange,
}: {
  onChange: (value: HistoryInput | null) => void;
}) {
  const [height, setHeight] = useState('5 ft 8 in');
  const [weight, setWeight] = useState('70 kg');
  const [bloodGroup, setBloodGroup] = useState('B+');
  const [bloodGroupOpen, setBloodGroupOpen] = useState(false);

  // Entrance animation values
  const [animCard1] = useState(() => new Animated.Value(0));
  const [animCard2] = useState(() => new Animated.Value(0));
  const [animCard3] = useState(() => new Animated.Value(0));

  // Press scale values
  const [scale1] = useState(() => new Animated.Value(1));
  const [scale2] = useState(() => new Animated.Value(1));
  const [scale3] = useState(() => new Animated.Value(1));

  useEffect(() => {
    // Staggered cascade entrance
    Animated.stagger(100, [
      Animated.spring(animCard1, {
        toValue: 1,
        tension: 65,
        friction: 8,
        useNativeDriver: true,
      }),
      Animated.spring(animCard2, {
        toValue: 1,
        tension: 65,
        friction: 8,
        useNativeDriver: true,
      }),
      Animated.spring(animCard3, {
        toValue: 1,
        tension: 65,
        friction: 8,
        useNativeDriver: true,
      }),
    ]).start();
  }, [animCard1, animCard2, animCard3]);

  useEffect(() => {
    onChange({
      conditions: {
        items: [
          { tag: 'height_ft', free_text: height },
          { tag: 'weight_kg', free_text: weight },
          { tag: 'blood_group', free_text: bloodGroup },
        ],
      },
    });
  }, [height, weight, bloodGroup, onChange]);

  function onPressIn(scale: Animated.Value) {
    Animated.spring(scale, {
      toValue: 0.98,
      useNativeDriver: true,
    }).start();
  }

  function onPressOut(scale: Animated.Value) {
    Animated.spring(scale, {
      toValue: 1,
      tension: 100,
      friction: 5,
      useNativeDriver: true,
    }).start();
  }

  return (
    <View style={styles.container}>
      {/* 1. Height Card */}
      <Animated.View
        style={{
          opacity: animCard1,
          transform: [
            {
              translateY: animCard1.interpolate({
                inputRange: [0, 1],
                outputRange: [24, 0],
              }),
            },
            { scale: scale1 },
          ],
        }}>
        <Pressable
          onPressIn={() => onPressIn(scale1)}
          onPressOut={() => onPressOut(scale1)}
          style={styles.card}>
          <View style={styles.iconCol}>
            <HeightDetailIcon size={34} />
          </View>
          <View style={styles.inputCol}>
            <Text style={styles.label}>Height</Text>
            <TextInput
              style={styles.textInput}
              value={height}
              onChangeText={setHeight}
              placeholder="e.g. 5 ft 8 in"
              placeholderTextColor="#8E929A"
            />
          </View>
        </Pressable>
      </Animated.View>

      {/* 2. Weight Card */}
      <Animated.View
        style={{
          opacity: animCard2,
          transform: [
            {
              translateY: animCard2.interpolate({
                inputRange: [0, 1],
                outputRange: [24, 0],
              }),
            },
            { scale: scale2 },
          ],
        }}>
        <Pressable
          onPressIn={() => onPressIn(scale2)}
          onPressOut={() => onPressOut(scale2)}
          style={styles.card}>
          <View style={styles.iconCol}>
            <WeightDetailIcon size={34} />
          </View>
          <View style={styles.inputCol}>
            <Text style={styles.label}>Weight</Text>
            <TextInput
              style={styles.textInput}
              value={weight}
              onChangeText={setWeight}
              placeholder="e.g. 70 kg"
              placeholderTextColor="#8E929A"
            />
          </View>
        </Pressable>
      </Animated.View>

      {/* 3. Blood Group Card */}
      <Animated.View
        style={{
          opacity: animCard3,
          transform: [
            {
              translateY: animCard3.interpolate({
                inputRange: [0, 1],
                outputRange: [24, 0],
              }),
            },
            { scale: scale3 },
          ],
        }}>
        <Pressable
          onPressIn={() => onPressIn(scale3)}
          onPressOut={() => onPressOut(scale3)}
          onPress={() => setBloodGroupOpen(!bloodGroupOpen)}
          style={styles.card}>
          <View style={styles.iconCol}>
            <BloodDropDetailIcon size={34} />
          </View>
          <View style={styles.inputCol}>
            <Text style={styles.label}>Blood Group</Text>
            <View style={styles.dropdownRow}>
              <Text style={styles.bloodText}>{bloodGroup}</Text>
              <Text style={styles.chevron}>{bloodGroupOpen ? '▲' : '▼'}</Text>
            </View>
          </View>
        </Pressable>
      </Animated.View>

      {/* Blood Group Picker Selector */}
      {bloodGroupOpen && (
        <View style={styles.dropdownPicker}>
          {BLOOD_GROUPS.map((bg) => (
            <Pressable
              key={bg}
              style={[
                styles.dropdownItem,
                bloodGroup === bg && styles.dropdownItemSelected,
              ]}
              onPress={() => {
                setBloodGroup(bg);
                setBloodGroupOpen(false);
              }}>
              <Text
                style={[
                  styles.dropdownText,
                  bloodGroup === bg && styles.dropdownTextSelected,
                ]}>
                {bg}
              </Text>
            </Pressable>
          ))}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: 16,
    paddingTop: 8,
  },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderWidth: 1.5,
    borderColor: '#ECEAEF',
    borderRadius: 18,
    paddingHorizontal: 16,
    paddingVertical: 14,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.03,
    shadowRadius: 6,
    elevation: 1,
  },
  iconCol: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: '#F8F8FA',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
  },
  inputCol: {
    flex: 1,
  },
  label: {
    fontSize: 13,
    fontWeight: '500',
    color: '#8E929A',
    marginBottom: 2,
  },
  textInput: {
    fontSize: 16,
    fontWeight: '700',
    color: '#171717',
    padding: 0,
    margin: 0,
  },
  dropdownRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  bloodText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#171717',
  },
  chevron: {
    fontSize: 12,
    color: '#8E929A',
    marginRight: 4,
  },
  dropdownPicker: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    backgroundColor: '#FBFAFC',
    borderWidth: 1.5,
    borderColor: '#ECEAEF',
    borderRadius: 16,
    padding: 12,
    marginTop: -4,
  },
  dropdownItem: {
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 10,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E0E1E6',
  },
  dropdownItemSelected: {
    backgroundColor: '#7545ED',
    borderColor: '#7545ED',
  },
  dropdownText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#171717',
  },
  dropdownTextSelected: {
    color: '#FFFFFF',
  },
});
