import AsyncStorage from '@react-native-async-storage/async-storage';
import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import { Platform } from 'react-native';
import { getAllWorkoutLogs, getExercises, saveExercises } from './storage';
import type { Exercise, WorkoutLog } from './types';
import { formatDateKey } from './utils';

export interface BackupData {
  version: 1;
  exportedAt: string;
  exercises?: Exercise[];
  logs?: Record<string, WorkoutLog>;
}

export async function exportData(what: 'exercises' | 'all'): Promise<void> {
  const exercises = await getExercises();
  const data: BackupData = {
    version: 1,
    exportedAt: new Date().toISOString(),
    exercises,
  };

  if (what === 'all') {
    data.logs = await getAllWorkoutLogs();
  }

  const json = JSON.stringify(data, null, 2);
  const filename = `workout-backup-${formatDateKey(new Date())}.json`;
  if (Platform.OS === 'web') {
    // No file system or share sheet in the browser: download the file instead.
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([json], { type: 'application/json' }));
    a.download = filename;
    a.click();
    URL.revokeObjectURL(a.href);
    return;
  }
  const path = `${FileSystem.cacheDirectory}${filename}`;
  await FileSystem.writeAsStringAsync(path, json, { encoding: FileSystem.EncodingType.UTF8 });
  await Sharing.shareAsync(path, {
    mimeType: 'application/json',
    dialogTitle: 'Save Workout Backup',
    UTI: 'public.json',
  });
}

export async function pickAndParseBackup(): Promise<BackupData> {
  const result = await DocumentPicker.getDocumentAsync({
    type: ['application/json', 'text/plain', 'public.json', '*/*'],
    copyToCacheDirectory: true,
  });

  if (result.canceled) throw new Error('cancelled');

  const uri = result.assets[0].uri;
  // In the browser the picked file is a blob/data URL that the file system module can't read.
  const content =
    Platform.OS === 'web'
      ? await (await fetch(uri)).text()
      : await FileSystem.readAsStringAsync(uri, { encoding: FileSystem.EncodingType.UTF8 });

  let data: BackupData;
  try {
    data = JSON.parse(content);
  } catch {
    throw new Error('invalid_json');
  }

  if (data.version !== 1 || !data.exportedAt) {
    throw new Error('invalid_format');
  }

  return data;
}

export async function importData(
  data: BackupData,
  importExercises: boolean,
  importLogs: boolean,
): Promise<{ exercises: number; logs: number }> {
  let exercisesCount = 0;
  let logsCount = 0;

  if (importExercises && data.exercises?.length) {
    const existing = await getExercises();
    const existingNames = new Set(existing.map(e => e.name.toLowerCase()));
    const fresh = data.exercises.filter(e => !existingNames.has(e.name.toLowerCase()));
    await saveExercises([...existing, ...fresh]);
    exercisesCount = fresh.length;
  }

  if (importLogs && data.logs) {
    const existingLogs = await getAllWorkoutLogs();
    // Existing days are never overwritten — backup fills in missing days only
    const merged = { ...data.logs, ...existingLogs };
    await AsyncStorage.setItem('@wt/logs', JSON.stringify(merged));
    logsCount = Object.keys(data.logs).length;
  }

  return { exercises: exercisesCount, logs: logsCount };
}
