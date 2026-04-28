import { AlertDialog } from '@/components/ui/AlertDialog';
import { Text } from '@/components/ui/text';
import { ThemeToggle } from '@/components/ui/ThemeToggle';
import { deleteWorkoutLog, getExercises, getWorkoutLog, saveWorkoutLog, getAllWorkoutLogs } from '@/lib/storage';
import type { Exercise, ExerciseLog, SetEntry } from '@/lib/types';
import { formatDisplayDate, parseDateKey } from '@/lib/utils';
import { router, useLocalSearchParams } from 'expo-router';
import {
  ChevronDownIcon,
  ChevronLeftIcon,
  ChevronUpIcon,
  PlusIcon,
  Trash2Icon,
} from 'lucide-react-native';
import { useEffect, useRef, useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  TextInput,
  TouchableOpacity,
  View,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useUniwind } from 'uniwind';

type LogData = Record<string, SetEntry[]>;

export default function LogScreen() {
  const { date } = useLocalSearchParams<{ date: string }>();
  const { theme } = useUniwind();
  const isDark = theme === 'dark';

  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [logData, setLogData] = useState<LogData>({});
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [clearDialog, setClearDialog] = useState(false);
  const [legendDialog, setLegendDialog] = useState(false);
  const [prevLogs, setPrevLogs] = useState<Record<string, ExerciseLog>>({});
  const logDataRef = useRef<LogData>({});

  // Keep ref in sync for use inside closures
  useEffect(() => {
    logDataRef.current = logData;
  }, [logData]);

  useEffect(() => {
    async function load() {
      const [exs, existingLog, allLogs] = await Promise.all([
        getExercises(),
        getWorkoutLog(date),
        getAllWorkoutLogs(),
      ]);
      setExercises(exs);

      if (existingLog) {
        const data: LogData = {};
        const expandedSet = new Set<string>();
        for (const el of existingLog.exercises) {
          if (el.sets.length > 0) {
            data[el.exerciseId] = el.sets;
            expandedSet.add(el.exerciseId);
          }
        }
        setLogData(data);
        setExpanded(expandedSet);
      }

      // Compute prevLogs: for each exercise, find the most recent log before `date`
      const sortedDates = Object.keys(allLogs)
        .filter(d => d < date)
        .sort((a, b) => (a > b ? -1 : 1)); // descending

      const computed: Record<string, ExerciseLog> = {};
      for (const ex of exs) {
        for (const d of sortedDates) {
          const log = allLogs[d];
          const entry = log.exercises.find(
            e => e.exerciseId === ex.id && e.sets.length > 0,
          );
          if (entry) {
            computed[ex.id] = entry;
            break;
          }
        }
      }
      setPrevLogs(computed);

      setLoading(false);
    }
    load();
  }, [date]);

  function makeEmptySet(ex: Exercise): SetEntry {
    const entry: SetEntry = {};
    ex.units.forEach(u => (entry[u.id] = ''));
    return entry;
  }

  function addSet(ex: Exercise) {
    setLogData(prev => ({
      ...prev,
      [ex.id]: [...(prev[ex.id] ?? []), makeEmptySet(ex)],
    }));
  }

  function updateSet(exId: string, setIdx: number, unitId: string, value: string) {
    setLogData(prev => {
      const sets = [...(prev[exId] ?? [])];
      sets[setIdx] = { ...sets[setIdx], [unitId]: value };
      return { ...prev, [exId]: sets };
    });
  }

  function removeSet(exId: string, setIdx: number) {
    const ex = exercises.find(e => e.id === exId);
    setLogData(prev => {
      const sets = [...(prev[exId] ?? [])];
      sets.splice(setIdx, 1);
      if (sets.length === 0 && ex) sets.push(makeEmptySet(ex));
      return { ...prev, [exId]: sets };
    });
  }

  function toggleExpand(ex: Exercise) {
    const isOpen = expanded.has(ex.id);

    if (!isOpen) {
      // Auto-add first empty set if none yet
      if (!logDataRef.current[ex.id] || logDataRef.current[ex.id].length === 0) {
        addSet(ex);
      }
      setExpanded(prev => new Set([...prev, ex.id]));
    } else {
      setExpanded(prev => {
        const next = new Set(prev);
        next.delete(ex.id);
        return next;
      });
    }
  }

  async function handleSave() {
    setSaving(true);
    const logExercises: ExerciseLog[] = [];

    for (const [exId, sets] of Object.entries(logData)) {
      const valid = sets.filter(s => Object.values(s).some(v => v.trim() !== ''));
      if (valid.length > 0) {
        logExercises.push({ exerciseId: exId, sets: valid });
      }
    }

    if (logExercises.length === 0) {
      await deleteWorkoutLog(date);
    } else {
      const now = new Date().toISOString();
      await saveWorkoutLog({ date, exercises: logExercises, createdAt: now, updatedAt: now });
    }

    setSaving(false);
    router.back();
  }

  async function confirmClearDay() {
    await deleteWorkoutLog(date);
    router.back();
  }

  // Colors
  const iconColor = isDark ? '#e5e5e5' : '#171717';
  const mutedColor = isDark ? '#a3a3a3' : '#525252';
  const cardBg = isDark ? '#111111' : '#f9f9f9';
  const rowBg = isDark ? '#1a1a1a' : '#ffffff';
  const inputBg = isDark ? '#262626' : '#f0f0f0';
  const inputColor = isDark ? '#e5e5e5' : '#0a0a0a';
  const placeholderColor = isDark ? '#737373' : '#737373';
  const borderColor = isDark ? '#262626' : '#ebebeb';

  // Parse and format the date for display
  const dateObj = parseDateKey(date);
  const displayDate = formatDisplayDate(date);
  const isToday =
    new Date().toDateString() === dateObj.toDateString();

  const totalSets = Object.values(logData).reduce(
    (sum, sets) => sum + sets.filter(s => Object.values(s).some(v => v.trim() !== '')).length,
    0,
  );

  if (loading) {
    return (
      <SafeAreaView style={{ flex: 1 }} className="bg-background items-center justify-center" edges={['top']}>
        <ActivityIndicator color={iconColor} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={{ flex: 1 }} className="bg-background" edges={['top']}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior="padding">
        {/* Header */}
        <View
          style={{ borderBottomWidth: 1, borderBottomColor: borderColor }}
          className="flex-row items-center justify-between px-4 py-3">
          <TouchableOpacity
            onPress={() => router.back()}
            className="flex-row items-center gap-1 py-1">
            <ChevronLeftIcon size={20} color={iconColor} />
            <Text className="text-sm font-medium text-foreground">Back</Text>
          </TouchableOpacity>

          <View className="items-center">
            <Text className="text-sm font-bold text-foreground">
              {isToday ? 'Today' : displayDate}
            </Text>
            {totalSets > 0 && (
              <Text style={{ color: mutedColor }} className="text-xs">
                {totalSets} {totalSets === 1 ? 'set' : 'sets'} logged
              </Text>
            )}
          </View>

          <ThemeToggle />
        </View>

        {/* Exercise list */}
        {exercises.length === 0 ? (
          <View className="flex-1 items-center justify-center gap-3 px-8">
            <Text className="text-base font-semibold text-foreground text-center">
              No exercises in your library
            </Text>
            <Text className="text-sm text-muted-foreground text-center">
              Go to the Exercises tab to add exercises first.
            </Text>
          </View>
        ) : (
          <ScrollView
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
            automaticallyAdjustKeyboardInsets
            contentContainerStyle={{ padding: 16, paddingBottom: 24, gap: 10 }}>
            {exercises.map(ex => {
              const sets = logData[ex.id] ?? [];
              const isOpen = expanded.has(ex.id);
              const filledSets = sets.filter(s =>
                Object.values(s).some(v => v.trim() !== ''),
              );

              const prevEntry = prevLogs[ex.id];

              return (
                <View
                  key={ex.id}
                  style={{ backgroundColor: cardBg, borderRadius: 16, overflow: 'hidden' }}>
                  {/* Exercise header row */}
                  <TouchableOpacity
                    onPress={() => toggleExpand(ex)}
                    activeOpacity={0.7}
                    className="flex-row items-center justify-between px-4 py-3.5">
                    <View className="flex-1">
                      <Text className="text-sm font-semibold text-foreground">{ex.name}</Text>
                      <Text style={{ color: mutedColor, fontSize: 12 }} className="mt-0.5">
                        {ex.units.map(u => u.name).join(' · ')}
                      </Text>
                      {prevEntry && (() => {
                        const setCount = prevEntry.sets.length;
                        const stats = ex.units.map(u => {
                          const vals = prevEntry.sets.map(s => parseFloat(s[u.id] ?? '') || 0);
                          const max = Math.max(...vals);
                          const total = vals.reduce((a, b) => a + b, 0);
                          return { name: u.name.toLowerCase(), max, total };
                        }).filter(s => s.total > 0);
                        if (stats.length === 0) return null;
                        const parts = [
                          `× ${setCount} sets`,
                          ...stats.flatMap(s => [
                            `↑ ${s.max} ${s.name}`,
                            `∑ ${s.total} ${s.name}`,
                          ]),
                        ];
                        return (
                          <TouchableOpacity onPress={() => setLegendDialog(true)} activeOpacity={0.6} hitSlop={{ top: 4, bottom: 4, left: 4, right: 4 }}>
                            <Text style={{ color: isDark ? '#6366f1' : '#6366f1', fontSize: 12, fontWeight: '500', marginTop: 4, lineHeight: 18 }}>
                              {parts.join('   ')}
                            </Text>
                          </TouchableOpacity>
                        );
                      })()}
                    </View>
                    <View className="flex-row items-center gap-2">
                      {filledSets.length > 0 && (
                        <View
                          style={{
                            backgroundColor: isDark ? '#262626' : '#e5e5e5',
                            borderRadius: 100,
                            paddingHorizontal: 8,
                            paddingVertical: 3,
                          }}>
                          <Text style={{ color: isDark ? '#d4d4d4' : '#404040', fontSize: 12, fontWeight: '600' }}>
                            {filledSets.length} {filledSets.length === 1 ? 'set' : 'sets'}
                          </Text>
                        </View>
                      )}
                      {isOpen ? (
                        <ChevronUpIcon size={16} color={mutedColor} />
                      ) : (
                        <ChevronDownIcon size={16} color={mutedColor} />
                      )}
                    </View>
                  </TouchableOpacity>

                  {/* Expanded content */}
                  {isOpen && (
                    <View style={{ borderTopWidth: 1, borderTopColor: borderColor }}>
                      {sets.map((set, si) => (
                          <View
                            key={si}
                            style={{
                              backgroundColor: rowBg,
                              padding: 12,
                              borderTopWidth: si > 0 ? 1 : 0,
                              borderTopColor: borderColor,
                            }}>
                            {/* Set label + delete */}
                            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                              <Text style={{ color: mutedColor, fontSize: 11, fontWeight: '700', letterSpacing: 0.8 }}>
                                SET {si + 1}
                              </Text>
                              <TouchableOpacity onPress={() => removeSet(ex.id, si)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                                <Trash2Icon size={14} color={mutedColor} />
                              </TouchableOpacity>
                            </View>

                            {/* Unit label + input per column */}
                            <View style={{ flexDirection: 'row', gap: 10 }}>
                              {ex.units.map(u => (
                                <View key={u.id} style={{ flex: 1 }}>
                                  <Text style={{ color: mutedColor, fontSize: 12, fontWeight: '600', marginBottom: 6 }}>
                                    {u.name}
                                  </Text>
                                  <TextInput
                                    value={set[u.id] ?? ''}
                                    onChangeText={val => updateSet(ex.id, si, u.id, val)}
                                    keyboardType="decimal-pad"
                                    placeholder="—"
                                    placeholderTextColor={placeholderColor}
                                    style={{
                                      backgroundColor: inputBg,
                                      color: inputColor,
                                      borderRadius: 10,
                                      paddingHorizontal: 10,
                                      paddingVertical: 11,
                                      fontSize: 18,
                                      fontWeight: '700',
                                      textAlign: 'center',
                                    }}
                                  />
                                </View>
                              ))}
                            </View>
                          </View>
                        ))}

                      {/* Add set button */}
                      <TouchableOpacity
                        onPress={() => addSet(ex)}
                        style={{
                          flexDirection: 'row',
                          alignItems: 'center',
                          gap: 8,
                          padding: 14,
                          borderTopWidth: sets.length > 0 ? 1 : 0,
                          borderTopColor: borderColor,
                        }}>
                        <PlusIcon size={15} color={iconColor} />
                        <Text style={{ color: iconColor, fontSize: 13, fontWeight: '600' }}>
                          Add Set
                        </Text>
                      </TouchableOpacity>
                    </View>
                  )}
                </View>
              );
            })}

            {/* Clear day button (only shown if there's data) */}
            {totalSets > 0 && (
              <TouchableOpacity
                onPress={() => setClearDialog(true)}
                className="items-center py-4 mt-2">
                <Text className="text-sm text-destructive font-medium">Clear this day</Text>
              </TouchableOpacity>
            )}
          </ScrollView>
        )}

        {/* Save button */}
        <View
          style={{
            paddingHorizontal: 16,
            paddingTop: 12,
            paddingBottom: 32,
            borderTopWidth: 1,
            borderTopColor: borderColor,
            backgroundColor: isDark ? '#0a0a0a' : '#ffffff',
          }}>
          <TouchableOpacity
            onPress={handleSave}
            disabled={saving}
            style={{
              backgroundColor: isDark ? '#e5e5e5' : '#0a0a0a',
              borderRadius: 14,
              paddingVertical: 15,
              alignItems: 'center',
              opacity: saving ? 0.6 : 1,
            }}>
            <Text
              style={{
                color: isDark ? '#0a0a0a' : '#ffffff',
                fontSize: 15,
                fontWeight: '700',
              }}>
              {saving ? 'Saving…' : totalSets > 0 ? 'Save Workout' : 'Done (Nothing logged)'}
            </Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>

      <AlertDialog
        open={clearDialog}
        onOpenChange={setClearDialog}
        title="Clear this day"
        description="This will remove all logged sets for this day. This can't be undone."
        cancelLabel="Cancel"
        actionLabel="Clear"
        onAction={confirmClearDay}
      />

      <AlertDialog
        open={legendDialog}
        onOpenChange={setLegendDialog}
        title="What do these mean?"
        description={`These stats are from your last session for this exercise.\n\n× sets — how many sets you did\n↑ value — your best (highest) value in a single set\n∑ value — your total across all sets`}
        cancelLabel={null}
        actionLabel="Got it"
        onAction={() => setLegendDialog(false)}
      />
    </SafeAreaView>
  );
}
