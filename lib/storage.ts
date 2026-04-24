import AsyncStorage from '@react-native-async-storage/async-storage';
import type { Exercise, WorkoutLog } from './types';

const EXERCISES_KEY = '@wt/exercises';
const LOGS_KEY = '@wt/logs';

export async function getExercises(): Promise<Exercise[]> {
  try {
    const raw = await AsyncStorage.getItem(EXERCISES_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export async function saveExercises(exercises: Exercise[]): Promise<void> {
  await AsyncStorage.setItem(EXERCISES_KEY, JSON.stringify(exercises));
}

export async function getAllWorkoutLogs(): Promise<Record<string, WorkoutLog>> {
  try {
    const raw = await AsyncStorage.getItem(LOGS_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

export async function getWorkoutLog(date: string): Promise<WorkoutLog | null> {
  const logs = await getAllWorkoutLogs();
  return logs[date] ?? null;
}

export async function saveWorkoutLog(log: WorkoutLog): Promise<void> {
  const logs = await getAllWorkoutLogs();
  logs[log.date] = log;
  await AsyncStorage.setItem(LOGS_KEY, JSON.stringify(logs));
}

export async function deleteWorkoutLog(date: string): Promise<void> {
  const logs = await getAllWorkoutLogs();
  delete logs[date];
  await AsyncStorage.setItem(LOGS_KEY, JSON.stringify(logs));
}
