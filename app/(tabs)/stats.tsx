import { LineChart, type ChartSeries } from '@/components/LineChart';
import { ThemeToggle } from '@/components/ui/ThemeToggle';
import { SERIES_COLORS } from '@/lib/constants';
import { getAllWorkoutLogs, getExercises } from '@/lib/storage';
import type { Exercise, WorkoutLog } from '@/lib/types';
import { computeStreak, formatChartLabel } from '@/lib/utils';
import { useFocusEffect } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import { Dimensions, ScrollView, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Text } from '@/components/ui/text';
import { useUniwind } from 'uniwind';

const SCREEN_W = Dimensions.get('window').width;
const CHART_W = SCREEN_W - 40; // px-5 on each side

export default function StatsScreen() {
  const { theme } = useUniwind();
  const isDark = theme === 'dark';

  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [allLogs, setAllLogs] = useState<Record<string, WorkoutLog>>({});

  useFocusEffect(
    useCallback(() => {
      Promise.all([getExercises(), getAllWorkoutLogs()]).then(([exs, logs]) => {
        setExercises(exs);
        setAllLogs(logs);
      });
    }, []),
  );

  const logDates = useMemo(() => Object.keys(allLogs), [allLogs]);
  const { current: currentStreak, best: bestStreak } = useMemo(() => computeStreak(logDates), [logDates]);

  const weeklyAvg = useMemo(() => {
    if (logDates.length === 0) return '0';
    const sorted = [...logDates].sort();
    const first = new Date(sorted[0]);
    const last = new Date(sorted[sorted.length - 1]);
    const weeks = Math.max(1, Math.ceil((last.getTime() - first.getTime()) / (7 * 86400000)));
    return (logDates.length / weeks).toFixed(1);
  }, [logDates]);

  const lastWorkout = useMemo(() => {
    if (logDates.length === 0) return null;
    return [...logDates].sort().at(-1) ?? null;
  }, [logDates]);

  // Group all exercises by unit name → each unit gets one chart with all exercises as lines
  const unitGroups = useMemo(() => {
    const groups = new Map<string, { unitName: string; series: ChartSeries[] }>();

    exercises.forEach((ex, exIdx) => {
      const color = SERIES_COLORS[exIdx % SERIES_COLORS.length];
      const sortedDates = [...logDates].sort();

      ex.units.forEach(unit => {
        const points = sortedDates.flatMap(date => {
          const exLog = allLogs[date]?.exercises.find(e => e.exerciseId === ex.id);
          if (!exLog) return [];
          const vals = exLog.sets
            .map(s => parseFloat(s[unit.id] ?? ''))
            .filter(v => !isNaN(v) && v > 0);
          if (vals.length === 0) return [];
          return [{ key: date, label: formatChartLabel(date), value: vals.reduce((a, b) => a + b, 0) }];
        });

        if (points.length === 0) return;

        if (!groups.has(unit.name)) {
          groups.set(unit.name, { unitName: unit.name, series: [] });
        }
        groups.get(unit.name)!.series.push({ id: ex.id, name: ex.name, color, points });
      });
    });

    return Array.from(groups.values());
  }, [exercises, allLogs, logDates]);

  const mutedColor = isDark ? '#525252' : '#a3a3a3';
  const cardBg = isDark ? '#111111' : '#f5f5f5';

  const lastWorkoutText = useMemo(() => {
    if (!lastWorkout) return 'never';
    const days = Math.floor(
      (Date.now() - new Date(lastWorkout + 'T00:00:00').getTime()) / 86400000,
    );
    return days === 0 ? 'today' : days === 1 ? 'yesterday' : `${days} days ago`;
  }, [lastWorkout]);

  return (
    <SafeAreaView style={{ flex: 1 }} className="bg-background" edges={['top']}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 48 }}>
        {/* Header */}
        <View className="flex-row items-center justify-between px-5 pt-2 pb-4">
          <Text className="text-2xl font-bold text-foreground tracking-tight">Stats</Text>
          <ThemeToggle />
        </View>

        {/* Row 1: Total · Streak · Best */}
        <View className="px-5 mb-3">
          <View className="flex-row gap-3">
            <View style={{ backgroundColor: cardBg }} className="flex-1 rounded-2xl p-4">
              <Text className="text-xs text-muted-foreground mb-1">Total</Text>
              <Text className="text-3xl font-bold text-foreground">{logDates.length}</Text>
              <Text className="text-xs text-muted-foreground mt-0.5">sessions</Text>
            </View>
            <View style={{ backgroundColor: cardBg }} className="flex-1 rounded-2xl p-4">
              <Text className="text-xs text-muted-foreground mb-1">Streak</Text>
              <Text className="text-3xl font-bold text-foreground">{currentStreak}</Text>
              <Text className="text-xs text-muted-foreground mt-0.5">days</Text>
            </View>
            <View style={{ backgroundColor: cardBg }} className="flex-1 rounded-2xl p-4">
              <Text className="text-xs text-muted-foreground mb-1">Best</Text>
              <Text className="text-3xl font-bold text-foreground">{bestStreak}</Text>
              <Text className="text-xs text-muted-foreground mt-0.5">day streak</Text>
            </View>
          </View>
        </View>

        {/* Row 2: Per week · Last workout */}
        <View className="px-5 mb-8">
          <View className="flex-row gap-3">
            <View style={{ backgroundColor: cardBg }} className="flex-1 rounded-2xl p-4">
              <Text className="text-xs text-muted-foreground mb-1">Per Week</Text>
              <Text className="text-3xl font-bold text-foreground">{weeklyAvg}</Text>
              <Text className="text-xs text-muted-foreground mt-0.5">avg sessions</Text>
            </View>
            <View style={{ backgroundColor: cardBg, flex: 2 }} className="rounded-2xl p-4">
              <Text className="text-xs text-muted-foreground mb-1">Last Workout</Text>
              <Text className="text-base font-bold text-foreground">
                {lastWorkout
                  ? new Date(lastWorkout + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
                  : '—'}
              </Text>
              <Text className="text-xs text-muted-foreground mt-0.5">{lastWorkoutText}</Text>
            </View>
          </View>
        </View>

        {/* Progress charts */}
        <View className="px-5">
          <Text className="text-xs font-semibold text-muted-foreground uppercase tracking-widest mb-4">
            Progress
          </Text>

          {unitGroups.length === 0 ? (
            <View style={{ backgroundColor: cardBg }} className="rounded-2xl p-8 items-center gap-2">
              <Text className="text-base font-semibold text-foreground">No data yet</Text>
              <Text className="text-sm text-muted-foreground text-center">
                Log workouts on the Calendar tab to see your progress charts here.
              </Text>
            </View>
          ) : (
            <View className="gap-5">
              {unitGroups.map(group => (
                <View key={group.unitName} style={{ backgroundColor: cardBg }} className="rounded-2xl p-4">
                  {/* Unit name */}
                  <Text className="text-sm font-bold text-foreground mb-3">{group.unitName}</Text>

                  {/* Legend */}
                  <View className="flex-row flex-wrap gap-x-4 gap-y-1.5 mb-4">
                    {group.series.map(s => (
                      <View key={s.id} className="flex-row items-center gap-1.5">
                        <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: s.color }} />
                        <Text style={{ color: mutedColor, fontSize: 12, fontWeight: '500' }}>{s.name}</Text>
                      </View>
                    ))}
                  </View>

                  {/* Hint */}
                  <Text style={{ color: mutedColor, fontSize: 10, marginBottom: 8 }}>
                    Tap any dot for details
                  </Text>

                  {/* Chart */}
                  <LineChart
                    series={group.series}
                    width={CHART_W - 32}
                    height={220}
                    isDark={isDark}
                  />
                </View>
              ))}
            </View>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
