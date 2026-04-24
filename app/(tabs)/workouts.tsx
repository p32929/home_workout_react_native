import { AlertDialog } from '@/components/ui/AlertDialog';
import { ThemeToggle } from '@/components/ui/ThemeToggle';
import { DEFAULT_UNITS } from '@/lib/constants';
import { exportData, pickAndParseBackup, importData, type BackupData } from '@/lib/backup';
import { getExercises, saveExercises, getAllWorkoutLogs } from '@/lib/storage';
import type { Exercise, Unit } from '@/lib/types';
import { generateId } from '@/lib/utils';
import { useFocusEffect } from 'expo-router';
import { DownloadIcon, MoreHorizontalIcon, PlusIcon, Trash2Icon, UploadIcon, XIcon } from 'lucide-react-native';
import { useCallback, useState } from 'react';
import {
  Modal,
  Pressable,
  ScrollView,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Text } from '@/components/ui/text';
import { useUniwind } from 'uniwind';

export default function WorkoutsScreen() {
  const { theme } = useUniwind();
  const isDark = theme === 'dark';

  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [modalVisible, setModalVisible] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Exercise | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [importPreview, setImportPreview] = useState<BackupData | null>(null);
  const [importExercises, setImportExercises] = useState(true);
  const [importLogs, setImportLogs] = useState(true);
  const [importing, setImporting] = useState(false);
  const [resetCode, setResetCode] = useState('');
  const [resetInput, setResetInput] = useState('');
  const [resetError, setResetError] = useState(false);
  const [resetOpen, setResetOpen] = useState(false);
  const [name, setName] = useState('');
  const [selectedUnits, setSelectedUnits] = useState<Unit[]>([]);
  const [customUnitText, setCustomUnitText] = useState('');
  const [formError, setFormError] = useState('');
  const [unitDropdownOpen, setUnitDropdownOpen] = useState(false);

  useFocusEffect(
    useCallback(() => {
      getExercises().then(setExercises);
    }, []),
  );

  function openAdd() {
    setEditingId(null);
    setName('');
    setSelectedUnits([]);
    setCustomUnitText('');
    setFormError('');
    setUnitDropdownOpen(false);
    setModalVisible(true);
  }

  function openEdit(ex: Exercise) {
    setEditingId(ex.id);
    setName(ex.name);
    setSelectedUnits([...ex.units]);
    setCustomUnitText('');
    setFormError('');
    setUnitDropdownOpen(false);
    setModalVisible(true);
  }

  function closeModal() {
    setModalVisible(false);
    setFormError('');
    setUnitDropdownOpen(false);
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

    const all = await getExercises();
    let updated: Exercise[];

    if (editingId) {
      updated = all.map(e =>
        e.id === editingId ? { ...e, name: trimmedName, units } : e,
      );
    } else {
      const newEx: Exercise = {
        id: generateId(),
        name: trimmedName,
        units,
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

  async function handleExport(what: 'exercises' | 'all') {
    setMenuOpen(false);
    try {
      await exportData(what);
    } catch (e: any) {
      if (e?.message !== 'cancelled') console.error(e);
    }
  }

  async function handleImportPick() {
    setMenuOpen(false);
    try {
      const data = await pickAndParseBackup();
      setImportExercises(!!(data.exercises?.length));
      setImportLogs(!!(data.logs && Object.keys(data.logs).length > 0));
      setImportPreview(data);
    } catch (e: any) {
      if (e?.message === 'cancelled') return;
      // invalid file — show nothing, could add a toast here
    }
  }

  async function handleImportConfirm() {
    if (!importPreview) return;
    setImporting(true);
    try {
      await importData(importPreview, importExercises, importLogs);
      const refreshed = await getExercises();
      setExercises(refreshed);
    } finally {
      setImporting(false);
      setImportPreview(null);
    }
  }

  function openReset() {
    const code = String(Math.floor(1000 + Math.random() * 9000));
    setResetCode(code);
    setResetInput('');
    setResetError(false);
    setMenuOpen(false);
    setResetOpen(true);
  }

  async function confirmReset() {
    if (resetInput !== resetCode) {
      setResetError(true);
      return;
    }
    const AsyncStorage = (await import('@react-native-async-storage/async-storage')).default;
    await AsyncStorage.multiRemove(['@wt/exercises', '@wt/logs']);
    setExercises([]);
    setResetOpen(false);
  }

  const iconColor = isDark ? '#e5e5e5' : '#171717';
  const inputBg = isDark ? '#1a1a1a' : '#f5f5f5';
  const inputColor = isDark ? '#e5e5e5' : '#0a0a0a';
  const placeholderColor = isDark ? '#525252' : '#a3a3a3';
  const borderColor = isDark ? '#262626' : '#e5e5e5';
  const sheetBg = isDark ? '#111111' : '#ffffff';

  return (
    <SafeAreaView className="flex-1 bg-background" edges={['top']}>
      {/* Header */}
      <View className="flex-row items-center justify-between px-5 pt-2 pb-4">
        <Text className="text-2xl font-bold text-foreground tracking-tight">Exercises</Text>
        <View className="flex-row items-center gap-2">
          <TouchableOpacity
            onPress={() => setMenuOpen(true)}
            className="w-9 h-9 items-center justify-center rounded-full bg-secondary">
            <MoreHorizontalIcon size={18} color={iconColor} />
          </TouchableOpacity>
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
        contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 32 }}>
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
          <View className="gap-3">
            {exercises.map(ex => (
              <TouchableOpacity
                key={ex.id}
                onPress={() => openEdit(ex)}
                onLongPress={() => deleteExercise(ex)}
                activeOpacity={0.7}
                className="bg-card border border-border rounded-2xl p-4">
                <View className="flex-row items-start justify-between">
                  <View className="flex-1 gap-2">
                    <Text className="text-base font-semibold text-foreground">{ex.name}</Text>
                    <View className="flex-row flex-wrap gap-1.5">
                      {ex.units.map(u => (
                        <View
                          key={u.id}
                          className="bg-secondary rounded-full px-2.5 py-1">
                          <Text className="text-xs font-medium text-muted-foreground">
                            {u.name}
                          </Text>
                        </View>
                      ))}
                    </View>
                  </View>
                  <TouchableOpacity
                    onPress={() => deleteExercise(ex)}
                    className="p-1.5 ml-2">
                    <Trash2Icon size={16} color={placeholderColor} />
                  </TouchableOpacity>
                </View>
              </TouchableOpacity>
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
        <Pressable
          className="flex-1 bg-black/40"
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

      {/* Export / Import menu */}
      <Modal visible={menuOpen} transparent animationType="slide" onRequestClose={() => setMenuOpen(false)}>
        <Pressable style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.4)' }} onPress={() => setMenuOpen(false)} />
        <View style={{ backgroundColor: sheetBg, borderTopLeftRadius: 24, borderTopRightRadius: 24, paddingBottom: 40 }}>
          <View className="items-center pt-3 pb-1">
            <View className="w-10 h-1 rounded-full bg-border" />
          </View>
          <Text className="text-base font-bold text-foreground px-5 py-4">Backup & Restore</Text>

          {[
            { icon: UploadIcon, label: 'Export Exercises', sub: 'Share exercise list as a file', onPress: () => handleExport('exercises'), danger: false },
            { icon: UploadIcon, label: 'Export Everything', sub: 'Exercises + all workout logs', onPress: () => handleExport('all'), danger: false },
            { icon: DownloadIcon, label: 'Import from Backup', sub: 'Restore from a .json backup file', onPress: handleImportPick, danger: false },
            { icon: Trash2Icon, label: 'Reset All Data', sub: 'Permanently delete everything', onPress: openReset, danger: true },
          ].map(({ icon: Icon, label, sub, onPress, danger }, i, arr) => (
            <TouchableOpacity
              key={label}
              onPress={onPress}
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                gap: 14,
                paddingHorizontal: 20,
                paddingVertical: 16,
                borderTopWidth: i === 0 ? 1 : 0,
                borderBottomWidth: 1,
                borderColor: isDark ? '#262626' : '#f0f0f0',
              }}>
              <View style={{
                width: 40, height: 40,
                borderRadius: 12,
                backgroundColor: danger ? 'rgba(239,68,68,0.1)' : isDark ? '#1a1a1a' : '#f5f5f5',
                alignItems: 'center', justifyContent: 'center',
              }}>
                <Icon size={18} color={danger ? '#ef4444' : iconColor} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 14, fontWeight: '600', color: danger ? '#ef4444' : isDark ? '#e5e5e5' : '#0a0a0a' }}>{label}</Text>
                <Text className="text-xs text-muted-foreground mt-0.5">{sub}</Text>
              </View>
            </TouchableOpacity>
          ))}
        </View>
      </Modal>

      {/* Import preview modal */}
      <Modal visible={importPreview !== null} transparent animationType="fade" onRequestClose={() => setImportPreview(null)}>
        <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', padding: 24 }}>
          <View style={{ backgroundColor: sheetBg, borderRadius: 20, overflow: 'hidden' }}>
            <View style={{ padding: 20, borderBottomWidth: 1, borderBottomColor: isDark ? '#262626' : '#f0f0f0' }}>
              <Text className="text-lg font-bold text-foreground">What to Import</Text>
              {importPreview?.exportedAt && (
                <Text className="text-xs text-muted-foreground mt-1">
                  Backup from {new Date(importPreview.exportedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                </Text>
              )}
            </View>

            {/* Exercises toggle */}
            {importPreview?.exercises?.length ? (
              <TouchableOpacity
                onPress={() => setImportExercises(v => !v)}
                style={{
                  flexDirection: 'row', alignItems: 'center', gap: 14,
                  padding: 20,
                  borderBottomWidth: 1, borderBottomColor: isDark ? '#262626' : '#f0f0f0',
                }}>
                <View style={{
                  width: 22, height: 22, borderRadius: 6, borderWidth: 2,
                  borderColor: importExercises ? (isDark ? '#e5e5e5' : '#0a0a0a') : (isDark ? '#525252' : '#a3a3a3'),
                  backgroundColor: importExercises ? (isDark ? '#e5e5e5' : '#0a0a0a') : 'transparent',
                  alignItems: 'center', justifyContent: 'center',
                }}>
                  {importExercises && <Text style={{ color: isDark ? '#0a0a0a' : '#fff', fontSize: 12, fontWeight: '700' }}>✓</Text>}
                </View>
                <View style={{ flex: 1 }}>
                  <Text className="text-sm font-semibold text-foreground">{importPreview.exercises.length} Exercises</Text>
                  <Text className="text-xs text-muted-foreground mt-0.5">Duplicates (same name) will be skipped</Text>
                </View>
              </TouchableOpacity>
            ) : null}

            {/* Logs toggle */}
            {importPreview?.logs && Object.keys(importPreview.logs).length > 0 ? (
              <TouchableOpacity
                onPress={() => setImportLogs(v => !v)}
                style={{
                  flexDirection: 'row', alignItems: 'center', gap: 14,
                  padding: 20,
                  borderBottomWidth: 1, borderBottomColor: isDark ? '#262626' : '#f0f0f0',
                }}>
                <View style={{
                  width: 22, height: 22, borderRadius: 6, borderWidth: 2,
                  borderColor: importLogs ? (isDark ? '#e5e5e5' : '#0a0a0a') : (isDark ? '#525252' : '#a3a3a3'),
                  backgroundColor: importLogs ? (isDark ? '#e5e5e5' : '#0a0a0a') : 'transparent',
                  alignItems: 'center', justifyContent: 'center',
                }}>
                  {importLogs && <Text style={{ color: isDark ? '#0a0a0a' : '#fff', fontSize: 12, fontWeight: '700' }}>✓</Text>}
                </View>
                <View style={{ flex: 1 }}>
                  <Text className="text-sm font-semibold text-foreground">{Object.keys(importPreview.logs).length} Workout Days</Text>
                  <Text className="text-xs text-muted-foreground mt-0.5">Existing days won't be overwritten</Text>
                </View>
              </TouchableOpacity>
            ) : null}

            <View style={{ flexDirection: 'row', gap: 10, padding: 20 }}>
              <TouchableOpacity
                onPress={() => setImportPreview(null)}
                style={{ flex: 1, backgroundColor: isDark ? '#1a1a1a' : '#f5f5f5', borderRadius: 12, paddingVertical: 13, alignItems: 'center' }}>
                <Text style={{ color: isDark ? '#a3a3a3' : '#525252', fontSize: 14, fontWeight: '600' }}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={handleImportConfirm}
                disabled={importing || (!importExercises && !importLogs)}
                style={{
                  flex: 1,
                  backgroundColor: isDark ? '#e5e5e5' : '#0a0a0a',
                  borderRadius: 12, paddingVertical: 13, alignItems: 'center',
                  opacity: (!importExercises && !importLogs) ? 0.3 : 1,
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
      <Modal visible={resetOpen} transparent animationType="fade" onRequestClose={() => setResetOpen(false)}>
        <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', padding: 24 }}>
          <View style={{ backgroundColor: sheetBg, borderRadius: 20, padding: 24 }}>
            <Text style={{ fontSize: 18, fontWeight: '700', color: '#ef4444', marginBottom: 8 }}>
              Reset All Data
            </Text>
            <Text style={{ fontSize: 14, color: isDark ? '#a3a3a3' : '#525252', marginBottom: 20, lineHeight: 20 }}>
              This will permanently delete all your exercises and workout logs. This cannot be undone.
            </Text>

            <View style={{
              backgroundColor: isDark ? '#1a1a1a' : '#fef2f2',
              borderRadius: 12,
              padding: 16,
              marginBottom: 20,
              alignItems: 'center',
              gap: 6,
            }}>
              <Text style={{ fontSize: 12, color: isDark ? '#a3a3a3' : '#525252' }}>
                Type this number to confirm:
              </Text>
              <Text style={{ fontSize: 36, fontWeight: '800', color: '#ef4444', letterSpacing: 8 }}>
                {resetCode}
              </Text>
            </View>

            <TextInput
              value={resetInput}
              onChangeText={t => { setResetInput(t); setResetError(false); }}
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
                style={{ flex: 1, backgroundColor: isDark ? '#1a1a1a' : '#f5f5f5', borderRadius: 12, paddingVertical: 13, alignItems: 'center' }}>
                <Text style={{ color: isDark ? '#a3a3a3' : '#525252', fontSize: 14, fontWeight: '600' }}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={confirmReset}
                disabled={resetInput.length !== 4}
                style={{
                  flex: 1, backgroundColor: '#ef4444', borderRadius: 12, paddingVertical: 13, alignItems: 'center',
                  opacity: resetInput.length !== 4 ? 0.4 : 1,
                }}>
                <Text style={{ color: '#ffffff', fontSize: 14, fontWeight: '700' }}>Reset Everything</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}
