import { AlertDialog } from '@/components/ui/AlertDialog';
import { ThemeToggle } from '@/components/ui/ThemeToggle';
import { DEFAULT_UNITS } from '@/lib/constants';
import { getExercises, saveExercises, getAllWorkoutLogs } from '@/lib/storage';
import type { Exercise, Unit } from '@/lib/types';
import { generateId } from '@/lib/utils';
import { useFocusEffect } from 'expo-router';
import { GripVerticalIcon, PlusIcon, Trash2Icon, XIcon } from 'lucide-react-native';
import { useCallback, useMemo, useRef, useState } from 'react';
import {
  KeyboardAvoidingView,
  Modal,
  Pressable,
  ScrollView,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Text } from '@/components/ui/text';
import { useUniwind } from 'uniwind';
import Animated, { useSharedValue, useAnimatedStyle, runOnJS } from 'react-native-reanimated';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import * as Haptics from 'expo-haptics';
import type { SharedValue } from 'react-native-reanimated';

// ─── ExerciseItem ────────────────────────────────────────────────────────────

interface ExerciseItemProps {
  ex: Exercise;
  draggingIdShared: SharedValue<string>;
  dragY: SharedValue<number>;
  isDark: boolean;
  iconColor: string;
  placeholderColor: string;
  onEdit: () => void;
  onDelete: () => void;
  onDragStart: () => void;
  onFinalizeDrag: (exId: string, translationY: number) => void;
  onItemLayout: (height: number) => void;
}

function ExerciseItem({
  ex,
  draggingIdShared,
  dragY,
  isDark,
  iconColor,
  placeholderColor,
  onEdit,
  onDelete,
  onDragStart,
  onFinalizeDrag,
  onItemLayout,
}: ExerciseItemProps) {
  const panGesture = useMemo(
    () =>
      Gesture.Pan()
        .activateAfterLongPress(250)
        .onStart(() => {
          draggingIdShared.value = ex.id;
          dragY.value = 0;
          runOnJS(onDragStart)();
        })
        .onUpdate(e => {
          dragY.value = e.translationY;
        })
        .onFinalize(e => {
          const finalY = e.translationY;
          const exId = ex.id;
          draggingIdShared.value = '';
          dragY.value = 0;
          runOnJS(onFinalizeDrag)(exId, finalY);
        }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [ex.id],
  );

  const animatedStyle = useAnimatedStyle(() => {
    const isDragging = draggingIdShared.value === ex.id;
    return {
      transform: [{ translateY: isDragging ? dragY.value : 0 }],
      zIndex: isDragging ? 100 : 1,
      elevation: isDragging ? 8 : 0,
    };
  });

  return (
    <GestureDetector gesture={panGesture}>
      <Animated.View
        style={[animatedStyle]}
        onLayout={e => onItemLayout(e.nativeEvent.layout.height)}>
        <TouchableOpacity
          onPress={onEdit}
          activeOpacity={0.7}
          style={{
            backgroundColor: isDark ? '#111111' : '#ffffff',
            borderRadius: 16,
            padding: 16,
            borderWidth: 1,
            borderColor: isDark ? '#262626' : '#e5e5e5',
          }}>
          <View style={{ flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between' }}>
            {/* Drag handle */}
            <View style={{ justifyContent: 'center', paddingRight: 10, paddingTop: 2 }}>
              <GripVerticalIcon size={18} color={placeholderColor} />
            </View>

            <View style={{ flex: 1, gap: 8 }}>
              <Text
                style={{
                  fontSize: 15,
                  fontWeight: '600',
                  color: isDark ? '#e5e5e5' : '#0a0a0a',
                }}>
                {ex.name}
              </Text>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
                {ex.units.map(u => (
                  <View
                    key={u.id}
                    style={{
                      backgroundColor: isDark ? '#1a1a1a' : '#f5f5f5',
                      borderRadius: 100,
                      paddingHorizontal: 10,
                      paddingVertical: 4,
                    }}>
                    <Text
                      style={{
                        fontSize: 12,
                        fontWeight: '500',
                        color: isDark ? '#a3a3a3' : '#525252',
                      }}>
                      {u.name}
                    </Text>
                  </View>
                ))}
              </View>
            </View>

            <TouchableOpacity
              onPress={onDelete}
              style={{ padding: 6, marginLeft: 8 }}>
              <Trash2Icon size={16} color={placeholderColor} />
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Animated.View>
    </GestureDetector>
  );
}

// ─── WorkoutsScreen ──────────────────────────────────────────────────────────

export default function WorkoutsScreen() {
  const { theme } = useUniwind();
  const isDark = theme === 'dark';
  const insets = useSafeAreaInsets();

  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [modalVisible, setModalVisible] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Exercise | null>(null);
  const [name, setName] = useState('');
  const [selectedUnits, setSelectedUnits] = useState<Unit[]>([]);
  const [customUnitText, setCustomUnitText] = useState('');
  const [formError, setFormError] = useState('');
  const [unitDropdownOpen, setUnitDropdownOpen] = useState(false);
  const [category, setCategory] = useState('');
  const [categoryDropdownOpen, setCategoryDropdownOpen] = useState(false);

  // Drag-to-reorder
  const exercisesRef = useRef<Exercise[]>([]);
  const draggingIdShared = useSharedValue('');
  const dragY = useSharedValue(0);
  const itemHeightsRef = useRef<Record<string, number>>({});

  // Keep exercisesRef in sync
  useCallback(() => {
    exercisesRef.current = exercises;
  }, [exercises]);

  // Proper sync via a side effect pattern: update ref whenever exercises change
  // We use a ref-based approach without useEffect to avoid import
  exercisesRef.current = exercises;

  useFocusEffect(
    useCallback(() => {
      getExercises().then(setExercises);
    }, []),
  );

  const existingCategories = useMemo(
    () => [...new Set(exercises.map(e => e.category).filter(Boolean) as string[])],
    [exercises],
  );

  const groupedExercises = useMemo(() => {
    const sections: Array<{ title: string | null; items: Exercise[] }> = [];
    const uncategorized = exercises.filter(e => !e.category);
    if (uncategorized.length > 0) sections.push({ title: null, items: uncategorized });
    const seen = new Set<string>();
    for (const ex of exercises) {
      if (!ex.category) continue;
      if (!seen.has(ex.category)) {
        seen.add(ex.category);
        sections.push({ title: ex.category, items: exercises.filter(e => e.category === ex.category) });
      }
    }
    return sections;
  }, [exercises]);

  function openAdd() {
    setEditingId(null);
    setName('');
    setSelectedUnits([]);
    setCustomUnitText('');
    setFormError('');
    setUnitDropdownOpen(false);
    setCategory('');
    setCategoryDropdownOpen(false);
    setModalVisible(true);
  }

  function openEdit(ex: Exercise) {
    setEditingId(ex.id);
    setName(ex.name);
    setSelectedUnits([...ex.units]);
    setCustomUnitText('');
    setFormError('');
    setUnitDropdownOpen(false);
    setCategory(ex.category ?? '');
    setCategoryDropdownOpen(false);
    setModalVisible(true);
  }

  function closeModal() {
    setModalVisible(false);
    setFormError('');
    setUnitDropdownOpen(false);
    setCategoryDropdownOpen(false);
  }

  function removeUnit(id: string) {
    setSelectedUnits(prev => prev.filter(u => u.id !== id));
  }

  function addCustomUnit() {
    const trimmed = customUnitText.trim();
    if (!trimmed) return;
    if (selectedUnits.some(u => u.name.toLowerCase() === trimmed.toLowerCase())) {
      setCustomUnitText('');
      return;
    }
    setSelectedUnits(prev => [...prev, { id: generateId(), name: trimmed }]);
    setCustomUnitText('');
    setUnitDropdownOpen(false);
  }

  async function saveExercise() {
    const trimmedName = name.trim();
    if (!trimmedName) {
      setFormError('Please enter an exercise name.');
      return;
    }
    // Auto-add any unit the user typed but didn't explicitly press +
    const pendingUnit = customUnitText.trim();
    let units = selectedUnits;
    if (pendingUnit && !units.some(u => u.name.toLowerCase() === pendingUnit.toLowerCase())) {
      units = [...units, { id: generateId(), name: pendingUnit }];
      setSelectedUnits(units);
      setCustomUnitText('');
    }
    if (units.length === 0) {
      setFormError('Add at least one tracking unit.');
      return;
    }
    setFormError('');

    const trimmedCategory = category.trim();
    const all = await getExercises();
    let updated: Exercise[];

    if (editingId) {
      updated = all.map(e =>
        e.id === editingId
          ? { ...e, name: trimmedName, units, category: trimmedCategory || undefined }
          : e,
      );
    } else {
      const newEx: Exercise = {
        id: generateId(),
        name: trimmedName,
        units,
        category: trimmedCategory || undefined,
        createdAt: new Date().toISOString(),
      };
      updated = [...all, newEx];
    }

    await saveExercises(updated);
    setExercises(updated);
    closeModal();
  }

  function deleteExercise(ex: Exercise) {
    setDeleteTarget(ex);
  }

  async function confirmDelete() {
    if (!deleteTarget) return;
    const id = deleteTarget.id;
    const updated = exercises.filter(e => e.id !== id);
    await saveExercises(updated);
    // Clean up orphaned exercise entries from all workout logs
    const logs = await getAllWorkoutLogs();
    const AsyncStorage = (await import('@react-native-async-storage/async-storage')).default;
    const cleaned: typeof logs = {};
    for (const [date, log] of Object.entries(logs)) {
      const filteredExercises = log.exercises.filter(e => e.exerciseId !== id);
      if (filteredExercises.length > 0) {
        cleaned[date] = { ...log, exercises: filteredExercises };
      }
    }
    await AsyncStorage.setItem('@wt/logs', JSON.stringify(cleaned));
    setExercises(updated);
    setDeleteTarget(null);
  }

  const handleDragStart = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
  }, []);

  const handleFinalizeDrag = useCallback((exId: string, translationY: number) => {
    const exs = exercisesRef.current;
    const currentIndex = exs.findIndex(e => e.id === exId);
    if (currentIndex < 0) return;
    const heights = Object.values(itemHeightsRef.current);
    const avg =
      heights.length > 0
        ? heights.reduce((a, b) => a + b, 0) / heights.length + 12
        : 88;
    const steps = Math.round(translationY / avg);
    if (steps === 0) return;
    const targetIndex = Math.max(0, Math.min(exs.length - 1, currentIndex + steps));
    const newExs = [...exs];
    const [removed] = newExs.splice(currentIndex, 1);
    newExs.splice(targetIndex, 0, removed);
    setExercises(newExs);
    saveExercises(newExs);
  }, []);

  const iconColor = isDark ? '#e5e5e5' : '#171717';
  const inputBg = isDark ? '#1a1a1a' : '#f5f5f5';
  const inputColor = isDark ? '#e5e5e5' : '#0a0a0a';
  const placeholderColor = isDark ? '#525252' : '#a3a3a3';
  const borderColor = isDark ? '#262626' : '#e5e5e5';
  const sheetBg = isDark ? '#111111' : '#ffffff';
  const mutedColor = isDark ? '#525252' : '#a3a3a3';

  return (
    <SafeAreaView className="flex-1 bg-background" edges={['top']}>
      {/* Header */}
      <View className="flex-row items-center justify-between px-5 pt-2 pb-4">
        <Text className="text-2xl font-bold text-foreground tracking-tight">Exercises</Text>
        <View className="flex-row items-center gap-2">
          <ThemeToggle />
          <TouchableOpacity
            onPress={openAdd}
            className="w-9 h-9 items-center justify-center rounded-full bg-foreground">
            <PlusIcon size={18} color={isDark ? '#0a0a0a' : '#ffffff'} />
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: insets.bottom + 88 }}>
        {exercises.length === 0 ? (
          <View className="items-center justify-center py-24 gap-3">
            <View className="w-16 h-16 rounded-full bg-secondary items-center justify-center">
              <PlusIcon size={28} color={placeholderColor} />
            </View>
            <Text className="text-base font-semibold text-foreground">No exercises yet</Text>
            <Text className="text-sm text-muted-foreground text-center px-8">
              Tap the + button to add your first exercise and define what you want to track.
            </Text>
          </View>
        ) : (
          <View style={{ gap: 12 }}>
            {groupedExercises.map(section => (
              <View key={section.title ?? '__uncategorized__'}>
                {section.title !== null && (
                  <Text
                    style={{
                      fontSize: 11,
                      fontWeight: '700',
                      textTransform: 'uppercase',
                      letterSpacing: 1,
                      color: mutedColor,
                      marginBottom: 8,
                      marginTop: 12,
                    }}>
                    {section.title}
                  </Text>
                )}
                <View style={{ gap: 10 }}>
                  {section.items.map(ex => (
                    <ExerciseItem
                      key={ex.id}
                      ex={ex}
                      draggingIdShared={draggingIdShared}
                      dragY={dragY}
                      isDark={isDark}
                      iconColor={iconColor}
                      placeholderColor={placeholderColor}
                      onEdit={() => openEdit(ex)}
                      onDelete={() => deleteExercise(ex)}
                      onDragStart={handleDragStart}
                      onFinalizeDrag={handleFinalizeDrag}
                      onItemLayout={h => {
                        itemHeightsRef.current[ex.id] = h;
                      }}
                    />
                  ))}
                </View>
              </View>
            ))}
          </View>
        )}
      </ScrollView>

      {/* Add / Edit Modal */}
      <Modal
        visible={modalVisible}
        animationType="slide"
        transparent
        onRequestClose={closeModal}>
        <KeyboardAvoidingView style={{ flex: 1 }} behavior="padding">
        <Pressable
          style={{ flex: 1 }}
          className="bg-black/40"
          onPress={closeModal}
        />
        <View
          style={{ backgroundColor: sheetBg, borderTopLeftRadius: 24, borderTopRightRadius: 24 }}>
          {/* Sheet handle */}
          <View className="items-center pt-3 pb-1">
            <View className="w-10 h-1 rounded-full bg-border" />
          </View>

          {/* Sheet header */}
          <View className="flex-row items-center justify-between px-5 py-4">
            <Text className="text-lg font-bold text-foreground">
              {editingId ? 'Edit Exercise' : 'New Exercise'}
            </Text>
            <TouchableOpacity onPress={closeModal} className="p-1">
              <XIcon size={20} color={iconColor} />
            </TouchableOpacity>
          </View>

          <ScrollView
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
            automaticallyAdjustKeyboardInsets
            contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 40 }}>
              {/* Name input */}
              <Text className="text-xs font-semibold text-muted-foreground uppercase tracking-widest mb-2">
                Exercise Name
              </Text>
              <TextInput
                value={name}
                onChangeText={setName}
                placeholder="e.g. Bench Press"
                placeholderTextColor={placeholderColor}
                style={{
                  backgroundColor: inputBg,
                  color: inputColor,
                  borderRadius: 12,
                  paddingHorizontal: 16,
                  paddingVertical: 13,
                  fontSize: 15,
                  fontWeight: '500',
                  marginBottom: 20,
                }}
                autoFocus={!editingId}
                returnKeyType="done"
              />

              {/* Category input */}
              <Text className="text-xs font-semibold text-muted-foreground uppercase tracking-widest mb-2">
                Category{' '}
                <Text style={{ fontSize: 11, textTransform: 'none', fontWeight: '400', color: mutedColor }}>
                  (optional)
                </Text>
              </Text>
              <TextInput
                value={category}
                onChangeText={text => {
                  setCategory(text);
                  setCategoryDropdownOpen(true);
                }}
                onFocus={() => setCategoryDropdownOpen(true)}
                onBlur={() => setTimeout(() => setCategoryDropdownOpen(false), 150)}
                placeholder="e.g. Chest, Legs, Cardio…"
                placeholderTextColor={placeholderColor}
                returnKeyType="done"
                style={{
                  backgroundColor: inputBg,
                  color: inputColor,
                  borderRadius: 12,
                  paddingHorizontal: 16,
                  paddingVertical: 13,
                  fontSize: 14,
                  marginBottom: 4,
                }}
              />

              {/* Category suggestions */}
              {categoryDropdownOpen && (() => {
                const q = category.trim().toLowerCase();
                const suggestions = existingCategories.filter(c =>
                  c.toLowerCase().includes(q),
                );
                if (suggestions.length === 0) return null;
                return (
                  <View
                    style={{
                      backgroundColor: isDark ? '#1a1a1a' : '#fff',
                      borderRadius: 12,
                      borderWidth: 1,
                      borderColor: borderColor,
                      marginBottom: 4,
                      overflow: 'hidden',
                    }}>
                    {suggestions.map((cat, idx) => (
                      <TouchableOpacity
                        key={cat}
                        onPress={() => {
                          setCategory(cat);
                          setCategoryDropdownOpen(false);
                        }}
                        style={{
                          paddingHorizontal: 16,
                          paddingVertical: 13,
                          borderTopWidth: idx === 0 ? 0 : 1,
                          borderTopColor: borderColor,
                        }}>
                        <Text style={{ color: isDark ? '#a3a3a3' : '#525252', fontSize: 14 }}>
                          {cat}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                );
              })()}

              <View style={{ marginBottom: 16 }} />

              {/* Selected units */}
              {selectedUnits.length > 0 && (
                <>
                  <Text className="text-xs font-semibold text-muted-foreground uppercase tracking-widest mb-2">
                    Tracking Units
                  </Text>
                  <View className="flex-row flex-wrap gap-2 mb-4">
                    {selectedUnits.map(u => (
                      <TouchableOpacity
                        key={u.id}
                        onPress={() => removeUnit(u.id)}
                        style={{
                          backgroundColor: isDark ? '#1a1a1a' : '#0a0a0a',
                          borderRadius: 100,
                          paddingHorizontal: 12,
                          paddingVertical: 7,
                          flexDirection: 'row',
                          alignItems: 'center',
                          gap: 6,
                        }}>
                        <Text style={{ color: isDark ? '#e5e5e5' : '#fff', fontSize: 13, fontWeight: '600' }}>
                          {u.name}
                        </Text>
                        <XIcon size={12} color={isDark ? '#e5e5e5' : '#fff'} />
                      </TouchableOpacity>
                    ))}
                  </View>
                </>
              )}

              {/* Unified unit field */}
              <Text className="text-xs font-semibold text-muted-foreground uppercase tracking-widest mb-2">
                Add Unit
              </Text>
              <View style={{ flexDirection: 'row', alignItems: 'stretch', gap: 12, marginBottom: 4 }}>
                <TextInput
                  value={customUnitText}
                  onChangeText={text => {
                    setCustomUnitText(text);
                    setUnitDropdownOpen(true);
                  }}
                  onFocus={() => setUnitDropdownOpen(true)}
                  onBlur={() => setTimeout(() => setUnitDropdownOpen(false), 150)}
                  placeholder="Search or type a unit…"
                  placeholderTextColor={placeholderColor}
                  returnKeyType="done"
                  onSubmitEditing={addCustomUnit}
                  style={{
                    flex: 1,
                    backgroundColor: inputBg,
                    color: inputColor,
                    borderRadius: 12,
                    paddingHorizontal: 14,
                    paddingVertical: 13,
                    fontSize: 14,
                  }}
                />
                <TouchableOpacity
                  onPress={addCustomUnit}
                  disabled={!customUnitText.trim()}
                  style={{
                    width: 56,
                    backgroundColor: isDark ? '#1a1a1a' : '#0a0a0a',
                    borderRadius: 12,
                    alignItems: 'center',
                    justifyContent: 'center',
                    opacity: customUnitText.trim() ? 1 : 0.3,
                  }}>
                  <PlusIcon size={18} color={isDark ? '#e5e5e5' : '#fff'} />
                </TouchableOpacity>
              </View>

              {/* Suggestions list */}
              {unitDropdownOpen && (() => {
                const q = customUnitText.trim().toLowerCase();
                const suggestions = DEFAULT_UNITS.filter(u =>
                  u.toLowerCase().includes(q),
                );
                if (suggestions.length === 0) return null;
                return (
                  <View
                    style={{
                      backgroundColor: isDark ? '#1a1a1a' : '#fff',
                      borderRadius: 12,
                      borderWidth: 1,
                      borderColor: borderColor,
                      marginBottom: 16,
                      overflow: 'hidden',
                    }}>
                    {suggestions.map((unitName, idx) => (
                      <TouchableOpacity
                        key={unitName}
                        onPress={() => {
                          setSelectedUnits(prev => [...prev, { id: generateId(), name: unitName }]);
                          setCustomUnitText('');
                          setUnitDropdownOpen(false);
                        }}
                        style={{
                          paddingHorizontal: 16,
                          paddingVertical: 13,
                          borderTopWidth: idx === 0 ? 0 : 1,
                          borderTopColor: borderColor,
                        }}>
                        <Text style={{ color: isDark ? '#a3a3a3' : '#525252', fontSize: 14 }}>
                          {unitName}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                );
              })()}

              {/* Inline validation error */}
              {formError ? (
                <Text style={{ color: '#ef4444', fontSize: 13, marginBottom: 10, textAlign: 'center' }}>
                  {formError}
                </Text>
              ) : null}

              {/* Save button */}
              <TouchableOpacity
                onPress={saveExercise}
                style={{
                  backgroundColor: isDark ? '#e5e5e5' : '#0a0a0a',
                  borderRadius: 14,
                  paddingVertical: 15,
                  alignItems: 'center',
                  marginTop: 24,
                }}>
                <Text style={{ color: isDark ? '#0a0a0a' : '#ffffff', fontSize: 15, fontWeight: '700' }}>
                  {editingId ? 'Save Changes' : 'Add Exercise'}
                </Text>
              </TouchableOpacity>
          </ScrollView>
        </View>
        </KeyboardAvoidingView>
      </Modal>

      <AlertDialog
        open={deleteTarget !== null}
        onOpenChange={open => { if (!open) setDeleteTarget(null); }}
        title="Delete Exercise"
        description={`Delete "${deleteTarget?.name}"? Workout logs referencing it will also be cleaned up.`}
        cancelLabel="Cancel"
        actionLabel="Delete"
        onAction={confirmDelete}
      />

    </SafeAreaView>
  );
}
