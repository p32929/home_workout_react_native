import { AlertDialog } from '@/components/ui/AlertDialog';
import { ThemeToggle } from '@/components/ui/ThemeToggle';
import { DAYS_SHORT, MONTHS } from '@/lib/constants';
import { getAllWorkoutLogs, getExercises } from '@/lib/storage';
import { formatDateKey } from '@/lib/utils';
import { useFocusEffect, router } from 'expo-router';
import { ChevronLeftIcon, ChevronRightIcon } from 'lucide-react-native';
import { useCallback, useMemo, useState } from 'react';
import { ScrollView, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Text } from '@/components/ui/text';
import { useUniwind } from 'uniwind';

export default function CalendarScreen() {
  const { theme } = useUniwind();
  const isDark = theme === 'dark';

  const now = new Date();
  const todayKey = formatDateKey(now);

  const [currentMonth, setCurrentMonth] = useState(
    new Date(now.getFullYear(), now.getMonth(), 1),
  );
  const [loggedDates, setLoggedDates] = useState<Set<string>>(new Set());
  const [hasExercises, setHasExercises] = useState<boolean | null>(null);
  const [noExercisesDialog, setNoExercisesDialog] = useState(false);

  useFocusEffect(
    useCallback(() => {
      Promise.all([getAllWorkoutLogs(), getExercises()]).then(([logs, exs]) => {
        setLoggedDates(new Set(Object.keys(logs)));
        setHasExercises(exs.length > 0);
      });
    }, []),
  );

  function onDayPress(key: string) {
    if (key > todayKey) return; // block future dates
    if (!hasExercises) {
      setNoExercisesDialog(true);
      return;
    }
    router.push(`/log/${key}`);
  }

  const year = currentMonth.getFullYear();
  const month = currentMonth.getMonth();

  const cells = useMemo<(number | null)[]>(() => {
    const firstDow = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const arr: (number | null)[] = Array(firstDow).fill(null);
    for (let d = 1; d <= daysInMonth; d++) arr.push(d);
    while (arr.length % 7 !== 0) arr.push(null);
    return arr;
  }, [year, month]);

  function monthKey(day: number) {
    const m = String(month + 1).padStart(2, '0');
    const d = String(day).padStart(2, '0');
    return `${year}-${m}-${d}`;
  }

  const thisMonthCount = useMemo(
    () =>
      Array.from(loggedDates).filter(d => {
        const [y, m] = d.split('-').map(Number);
        return y === year && m === month + 1;
      }).length,
    [loggedDates, year, month],
  );

  const iconColor = isDark ? '#e5e5e5' : '#171717';
  const mutedColor = isDark ? '#525252' : '#a3a3a3';

  return (
    <SafeAreaView className="flex-1 bg-background" edges={['top']}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 32 }}>
        {/* Header */}
        <View className="flex-row items-center justify-between px-5 pt-2 pb-4">
          <View className="flex-row items-center gap-3">
            <TouchableOpacity
              onPress={() => setCurrentMonth(new Date(year, month - 1, 1))}
              className="w-9 h-9 items-center justify-center rounded-full bg-secondary">
              <ChevronLeftIcon size={18} color={iconColor} />
            </TouchableOpacity>
            <Text className="text-xl font-bold text-foreground tracking-tight">
              {MONTHS[month]} {year}
            </Text>
            <TouchableOpacity
              onPress={() => setCurrentMonth(new Date(year, month + 1, 1))}
              className="w-9 h-9 items-center justify-center rounded-full bg-secondary">
              <ChevronRightIcon size={18} color={iconColor} />
            </TouchableOpacity>
          </View>
          <ThemeToggle />
        </View>

        {/* Day-of-week headers */}
        <View className="flex-row px-4 mb-1">
          {DAYS_SHORT.map(d => (
            <View key={d} className="flex-1 items-center py-1">
              <Text style={{ color: mutedColor }} className="text-xs font-semibold tracking-wider">
                {d}
              </Text>
            </View>
          ))}
        </View>

        {/* Calendar grid */}
        <View className="flex-row flex-wrap px-4">
          {cells.map((day, i) => {
            if (!day) {
              return <View key={`e-${i}`} style={{ width: '14.28%', aspectRatio: 1 }} />;
            }
            const key = monthKey(day);
            const isToday = key === todayKey;
            const hasWorkout = loggedDates.has(key);
            const isFuture = key > todayKey;

            return (
              <TouchableOpacity
                key={key}
                onPress={() => onDayPress(key)}
                style={{ width: '14.28%', aspectRatio: 1 }}
                className="items-center justify-center">
                <View
                  className={`w-9 h-9 items-center justify-center rounded-full ${
                    isToday ? 'bg-foreground' : ''
                  }`}>
                  <Text
                    className={`text-sm font-medium ${
                      isToday
                        ? 'text-background'
                        : isFuture
                          ? 'text-muted-foreground'
                          : 'text-foreground'
                    }`}>
                    {day}
                  </Text>
                </View>
                {hasWorkout ? (
                  <View
                    className={`w-1.5 h-1.5 rounded-full mt-0.5 ${
                      isToday ? 'bg-background' : 'bg-foreground'
                    }`}
                  />
                ) : (
                  <View className="w-1.5 h-1.5 mt-0.5" />
                )}
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Summary cards */}
        <View className="px-5 mt-8 gap-3">
          <Text className="text-xs font-semibold text-muted-foreground tracking-widest uppercase">
            Summary
          </Text>
          <View className="flex-row gap-3">
            <View className="flex-1 bg-secondary rounded-2xl p-4">
              <Text className="text-xs text-muted-foreground mb-1">This Month</Text>
              <Text className="text-3xl font-bold text-foreground">{thisMonthCount}</Text>
              <Text className="text-xs text-muted-foreground mt-0.5">workouts</Text>
            </View>
            <View className="flex-1 bg-secondary rounded-2xl p-4">
              <Text className="text-xs text-muted-foreground mb-1">All Time</Text>
              <Text className="text-3xl font-bold text-foreground">{loggedDates.size}</Text>
              <Text className="text-xs text-muted-foreground mt-0.5">workouts</Text>
            </View>
          </View>
        </View>
      </ScrollView>

      <AlertDialog
        open={noExercisesDialog}
        onOpenChange={setNoExercisesDialog}
        title="No exercises yet"
        description="Add your exercises first so you can start tracking your workouts."
        cancelLabel="Cancel"
        actionLabel="Go to Exercises"
        onAction={() => {
          setNoExercisesDialog(false);
          router.navigate('/(tabs)/workouts');
        }}
      />
    </SafeAreaView>
  );
}
