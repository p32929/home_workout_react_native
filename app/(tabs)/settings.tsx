import { ThemeToggle } from '@/components/ui/ThemeToggle';
import { Text } from '@/components/ui/text';
import { exportData, pickAndParseBackup, importData, type BackupData } from '@/lib/backup';
import { getExercises } from '@/lib/storage';
import {
  DownloadIcon,
  Trash2Icon,
  UploadIcon,
} from 'lucide-react-native';
import { useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Modal,
  ScrollView,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useUniwind } from 'uniwind';

type ResetMode = 'logs' | 'all';

export default function SettingsScreen() {
  const { theme } = useUniwind();
  const isDark = theme === 'dark';
  const insets = useSafeAreaInsets();

  const [importPreview, setImportPreview] = useState<BackupData | null>(null);
  const [importExercises, setImportExercises] = useState(true);
  const [importLogs, setImportLogs] = useState(true);
  const [importing, setImporting] = useState(false);
  const [resetCode, setResetCode] = useState('');
  const [resetInput, setResetInput] = useState('');
  const [resetError, setResetError] = useState(false);
  const [resetOpen, setResetOpen] = useState(false);
  const [resetting, setResetting] = useState(false);
  const [resetMode, setResetMode] = useState<ResetMode>('logs');

  const iconColor = isDark ? '#e5e5e5' : '#171717';
  const sheetBg = isDark ? '#111111' : '#ffffff';

  async function handleExport(what: 'exercises' | 'all') {
    try {
      await exportData(what);
    } catch (e: any) {
      if (e?.message !== 'cancelled') console.error(e);
    }
  }

  async function handleImportPick() {
    try {
      const data = await pickAndParseBackup();
      setImportExercises(!!data.exercises?.length);
      setImportLogs(!!(data.logs && Object.keys(data.logs).length > 0));
      setImportPreview(data);
    } catch (e: any) {
      if (e?.message === 'cancelled') return;
    }
  }

  async function handleImportConfirm() {
    if (!importPreview) return;
    setImporting(true);
    try {
      await importData(importPreview, importExercises, importLogs);
    } finally {
      setImporting(false);
      setImportPreview(null);
    }
  }

  function openReset(mode: ResetMode) {
    const code = String(Math.floor(1000 + Math.random() * 9000));
    setResetCode(code);
    setResetInput('');
    setResetError(false);
    setResetMode(mode);
    setResetOpen(true);
  }

  async function confirmReset() {
    if (resetInput !== resetCode) {
      setResetError(true);
      return;
    }
    setResetting(true);
    try {
      const AsyncStorage = (await import('@react-native-async-storage/async-storage')).default;
      if (resetMode === 'all') {
        await AsyncStorage.multiRemove(['@wt/exercises', '@wt/logs']);
      } else {
        await AsyncStorage.removeItem('@wt/logs');
      }
    } finally {
      setResetting(false);
      setResetOpen(false);
    }
  }

  const items = [
    {
      icon: UploadIcon,
      label: 'Export Exercises',
      sub: 'Share exercise list as a file',
      onPress: () => handleExport('exercises'),
      danger: false,
    },
    {
      icon: UploadIcon,
      label: 'Export Everything',
      sub: 'Exercises + all workout logs',
      onPress: () => handleExport('all'),
      danger: false,
    },
    {
      icon: DownloadIcon,
      label: 'Import from Backup',
      sub: 'Restore from a .json backup file',
      onPress: handleImportPick,
      danger: false,
    },
    {
      icon: Trash2Icon,
      label: 'Reset Workout Logs',
      sub: 'Delete all tracked workouts (keep exercises)',
      onPress: () => openReset('logs'),
      danger: true,
    },
    {
      icon: Trash2Icon,
      label: 'Reset Everything',
      sub: 'Permanently delete exercises and logs',
      onPress: () => openReset('all'),
      danger: true,
    },
  ];

  return (
    <SafeAreaView className="flex-1 bg-background" edges={['top']}>
      {/* Header */}
      <View className="flex-row items-center justify-between px-5 pt-2 pb-4">
        <Text className="text-2xl font-bold text-foreground tracking-tight">Settings</Text>
        <ThemeToggle />
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: insets.bottom + 88 }}>
        <Text
          style={{
            fontSize: 11,
            fontWeight: '700',
            textTransform: 'uppercase',
            letterSpacing: 1,
            color: isDark ? '#525252' : '#a3a3a3',
            marginBottom: 8,
            marginTop: 8,
          }}>
          Backup & Restore
        </Text>

        <View
          style={{
            backgroundColor: sheetBg,
            borderRadius: 16,
            overflow: 'hidden',
            borderWidth: 1,
            borderColor: isDark ? '#262626' : '#e5e5e5',
          }}>
          {items.map(({ icon: Icon, label, sub, onPress, danger }, i) => (
            <TouchableOpacity
              key={label}
              onPress={onPress}
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                gap: 14,
                paddingHorizontal: 16,
                paddingVertical: 16,
                borderTopWidth: i === 0 ? 0 : 1,
                borderColor: isDark ? '#262626' : '#f0f0f0',
              }}>
              <View
                style={{
                  width: 40,
                  height: 40,
                  borderRadius: 12,
                  backgroundColor: danger ? 'rgba(239,68,68,0.1)' : isDark ? '#1a1a1a' : '#f5f5f5',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}>
                <Icon size={18} color={danger ? '#ef4444' : iconColor} />
              </View>
              <View style={{ flex: 1 }}>
                <Text
                  style={{
                    fontSize: 14,
                    fontWeight: '600',
                    color: danger ? '#ef4444' : isDark ? '#e5e5e5' : '#0a0a0a',
                  }}>
                  {label}
                </Text>
                <Text className="text-xs text-muted-foreground mt-0.5">{sub}</Text>
              </View>
            </TouchableOpacity>
          ))}
        </View>
      </ScrollView>

      {/* Import preview modal */}
      <Modal
        visible={importPreview !== null}
        transparent
        animationType="fade"
        onRequestClose={() => setImportPreview(null)}>
        <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', padding: 24 }}>
          <View style={{ backgroundColor: sheetBg, borderRadius: 20, overflow: 'hidden' }}>
            <View
              style={{
                padding: 20,
                borderBottomWidth: 1,
                borderBottomColor: isDark ? '#262626' : '#f0f0f0',
              }}>
              <Text className="text-lg font-bold text-foreground">What to Import</Text>
              {importPreview?.exportedAt && (
                <Text className="text-xs text-muted-foreground mt-1">
                  Backup from{' '}
                  {new Date(importPreview.exportedAt).toLocaleDateString('en-US', {
                    month: 'short',
                    day: 'numeric',
                    year: 'numeric',
                  })}
                </Text>
              )}
            </View>

            {importPreview?.exercises?.length ? (
              <TouchableOpacity
                onPress={() => setImportExercises(v => !v)}
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: 14,
                  padding: 20,
                  borderBottomWidth: 1,
                  borderBottomColor: isDark ? '#262626' : '#f0f0f0',
                }}>
                <View
                  style={{
                    width: 22,
                    height: 22,
                    borderRadius: 6,
                    borderWidth: 2,
                    borderColor: importExercises
                      ? isDark
                        ? '#e5e5e5'
                        : '#0a0a0a'
                      : isDark
                        ? '#525252'
                        : '#a3a3a3',
                    backgroundColor: importExercises ? (isDark ? '#e5e5e5' : '#0a0a0a') : 'transparent',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}>
                  {importExercises && (
                    <Text style={{ color: isDark ? '#0a0a0a' : '#fff', fontSize: 12, fontWeight: '700' }}>
                      ✓
                    </Text>
                  )}
                </View>
                <View style={{ flex: 1 }}>
                  <Text className="text-sm font-semibold text-foreground">
                    {importPreview.exercises.length} Exercises
                  </Text>
                  <Text className="text-xs text-muted-foreground mt-0.5">
                    Duplicates (same name) will be skipped
                  </Text>
                </View>
              </TouchableOpacity>
            ) : null}

            {importPreview?.logs && Object.keys(importPreview.logs).length > 0 ? (
              <TouchableOpacity
                onPress={() => setImportLogs(v => !v)}
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: 14,
                  padding: 20,
                  borderBottomWidth: 1,
                  borderBottomColor: isDark ? '#262626' : '#f0f0f0',
                }}>
                <View
                  style={{
                    width: 22,
                    height: 22,
                    borderRadius: 6,
                    borderWidth: 2,
                    borderColor: importLogs
                      ? isDark
                        ? '#e5e5e5'
                        : '#0a0a0a'
                      : isDark
                        ? '#525252'
                        : '#a3a3a3',
                    backgroundColor: importLogs ? (isDark ? '#e5e5e5' : '#0a0a0a') : 'transparent',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}>
                  {importLogs && (
                    <Text style={{ color: isDark ? '#0a0a0a' : '#fff', fontSize: 12, fontWeight: '700' }}>
                      ✓
                    </Text>
                  )}
                </View>
                <View style={{ flex: 1 }}>
                  <Text className="text-sm font-semibold text-foreground">
                    {Object.keys(importPreview.logs).length} Workout Days
                  </Text>
                  <Text className="text-xs text-muted-foreground mt-0.5">
                    Existing days won't be overwritten
                  </Text>
                </View>
              </TouchableOpacity>
            ) : null}

            <View style={{ flexDirection: 'row', gap: 10, padding: 20 }}>
              <TouchableOpacity
                onPress={() => setImportPreview(null)}
                style={{
                  flex: 1,
                  backgroundColor: isDark ? '#1a1a1a' : '#f5f5f5',
                  borderRadius: 12,
                  paddingVertical: 13,
                  alignItems: 'center',
                }}>
                <Text style={{ color: isDark ? '#a3a3a3' : '#525252', fontSize: 14, fontWeight: '600' }}>
                  Cancel
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={handleImportConfirm}
                disabled={importing || (!importExercises && !importLogs)}
                style={{
                  flex: 1,
                  backgroundColor: isDark ? '#e5e5e5' : '#0a0a0a',
                  borderRadius: 12,
                  paddingVertical: 13,
                  alignItems: 'center',
                  opacity: !importExercises && !importLogs ? 0.3 : 1,
                }}>
                <Text style={{ color: isDark ? '#0a0a0a' : '#fff', fontSize: 14, fontWeight: '700' }}>
                  {importing ? 'Importing…' : 'Import'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Reset confirmation modal */}
      <Modal
        visible={resetOpen}
        transparent
        animationType="fade"
        onRequestClose={() => setResetOpen(false)}>
        <KeyboardAvoidingView style={{ flex: 1 }} behavior="padding">
          <View
            style={{
              flex: 1,
              backgroundColor: 'rgba(0,0,0,0.5)',
              justifyContent: 'center',
              padding: 24,
            }}>
            <View style={{ backgroundColor: sheetBg, borderRadius: 20, padding: 24 }}>
              <Text style={{ fontSize: 18, fontWeight: '700', color: '#ef4444', marginBottom: 8 }}>
                {resetMode === 'all' ? 'Reset Everything' : 'Reset Workout Logs'}
              </Text>
              <Text
                style={{
                  fontSize: 14,
                  color: isDark ? '#a3a3a3' : '#525252',
                  marginBottom: 20,
                  lineHeight: 20,
                }}>
                {resetMode === 'all'
                  ? 'This will permanently delete all your exercises and workout logs. This cannot be undone.'
                  : 'This will permanently delete all tracked workouts. Your exercises will be kept. This cannot be undone.'}
              </Text>

              <View
                style={{
                  backgroundColor: isDark ? '#1a1a1a' : '#fef2f2',
                  borderRadius: 12,
                  paddingVertical: 16,
                  paddingHorizontal: 20,
                  marginBottom: 20,
                  alignItems: 'center',
                  gap: 8,
                }}>
                <Text style={{ fontSize: 12, color: isDark ? '#a3a3a3' : '#525252' }}>
                  Type this number to confirm:
                </Text>
                <View style={{ flexDirection: 'row', gap: 12 }}>
                  {resetCode.split('').map((digit, i) => (
                    <View
                      key={i}
                      style={{
                        width: 44,
                        height: 52,
                        borderRadius: 10,
                        backgroundColor: isDark ? '#2a2a2a' : '#fecaca',
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}>
                      <Text style={{ fontSize: 28, fontWeight: '800', color: '#ef4444' }}>{digit}</Text>
                    </View>
                  ))}
                </View>
              </View>

              <TextInput
                value={resetInput}
                onChangeText={t => {
                  setResetInput(t);
                  setResetError(false);
                }}
                placeholder="Enter number here"
                placeholderTextColor={isDark ? '#525252' : '#a3a3a3'}
                keyboardType="number-pad"
                maxLength={4}
                style={{
                  backgroundColor: isDark ? '#1a1a1a' : '#f5f5f5',
                  color: resetError ? '#ef4444' : isDark ? '#e5e5e5' : '#0a0a0a',
                  borderRadius: 12,
                  paddingHorizontal: 16,
                  paddingVertical: 13,
                  fontSize: 24,
                  fontWeight: '700',
                  textAlign: 'center',
                  letterSpacing: 8,
                  borderWidth: resetError ? 1.5 : 0,
                  borderColor: '#ef4444',
                  marginBottom: resetError ? 8 : 20,
                }}
              />

              {resetError && (
                <Text style={{ color: '#ef4444', fontSize: 13, textAlign: 'center', marginBottom: 20 }}>
                  Wrong number — try again.
                </Text>
              )}

              <View style={{ flexDirection: 'row', gap: 10 }}>
                <TouchableOpacity
                  onPress={() => setResetOpen(false)}
                  disabled={resetting}
                  style={{
                    flex: 1,
                    backgroundColor: isDark ? '#1a1a1a' : '#f5f5f5',
                    borderRadius: 12,
                    paddingVertical: 13,
                    alignItems: 'center',
                    opacity: resetting ? 0.4 : 1,
                  }}>
                  <Text
                    style={{ color: isDark ? '#a3a3a3' : '#525252', fontSize: 14, fontWeight: '600' }}>
                    Cancel
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={confirmReset}
                  disabled={resetInput.length !== 4 || resetting}
                  style={{
                    flex: 1,
                    backgroundColor: '#ef4444',
                    borderRadius: 12,
                    paddingVertical: 13,
                    alignItems: 'center',
                    opacity: resetInput.length !== 4 || resetting ? 0.4 : 1,
                  }}>
                  {resetting ? (
                    <ActivityIndicator size="small" color="#ffffff" />
                  ) : (
                    <Text style={{ color: '#ffffff', fontSize: 14, fontWeight: '700' }}>
                      {resetMode === 'all' ? 'Reset Everything' : 'Reset Logs'}
                    </Text>
                  )}
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </SafeAreaView>
  );
}
