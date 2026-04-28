import * as AlertDialogPrimitive from '@rn-primitives/alert-dialog';
import { useUniwind } from 'uniwind';
import { View } from 'react-native';
import { Text } from './text';

interface AlertDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description: string;
  cancelLabel?: string | null;
  actionLabel?: string;
  onAction: () => void;
}

export function AlertDialog({
  open,
  onOpenChange,
  title,
  description,
  cancelLabel = 'Cancel' as string | null,
  actionLabel = 'Continue',
  onAction,
}: AlertDialogProps) {
  const { theme } = useUniwind();
  const isDark = theme === 'dark';

  return (
    <AlertDialogPrimitive.Root open={open} onOpenChange={onOpenChange}>
      <AlertDialogPrimitive.Portal>
        <AlertDialogPrimitive.Overlay
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0,0,0,0.5)',
            justifyContent: 'center',
            alignItems: 'center',
            padding: 24,
          }}>
          <AlertDialogPrimitive.Content
            style={{
              width: '100%',
              backgroundColor: isDark ? '#111111' : '#ffffff',
              borderRadius: 20,
              padding: 24,
              shadowColor: '#000',
              shadowOffset: { width: 0, height: 8 },
              shadowOpacity: isDark ? 0.6 : 0.12,
              shadowRadius: 24,
              elevation: 12,
            }}>
            <AlertDialogPrimitive.Title>
              <Text className="text-lg font-bold text-foreground mb-1">{title}</Text>
            </AlertDialogPrimitive.Title>

            <AlertDialogPrimitive.Description>
              <Text className="text-sm text-muted-foreground leading-5">{description}</Text>
            </AlertDialogPrimitive.Description>

            <View className="flex-row gap-3 mt-6">
              {cancelLabel != null && (
                <AlertDialogPrimitive.Cancel
                  style={{
                    flex: 1,
                    backgroundColor: isDark ? '#1a1a1a' : '#f5f5f5',
                    borderRadius: 12,
                    paddingVertical: 13,
                    alignItems: 'center',
                  }}>
                  <Text style={{ color: isDark ? '#a3a3a3' : '#525252', fontSize: 14, fontWeight: '600' }}>
                    {cancelLabel}
                  </Text>
                </AlertDialogPrimitive.Cancel>
              )}

              <AlertDialogPrimitive.Action
                onPress={onAction}
                style={{
                  flex: 1,
                  backgroundColor: isDark ? '#e5e5e5' : '#0a0a0a',
                  borderRadius: 12,
                  paddingVertical: 13,
                  alignItems: 'center',
                }}>
                <Text style={{ color: isDark ? '#0a0a0a' : '#ffffff', fontSize: 14, fontWeight: '700' }}>
                  {actionLabel}
                </Text>
              </AlertDialogPrimitive.Action>
            </View>
          </AlertDialogPrimitive.Content>
        </AlertDialogPrimitive.Overlay>
      </AlertDialogPrimitive.Portal>
    </AlertDialogPrimitive.Root>
  );
}
