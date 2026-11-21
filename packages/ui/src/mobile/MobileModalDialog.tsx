import React from 'react';
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  Pressable,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { t } from '@money-matters/i18n';
import { DESIGN_TOKENS } from '../tokens';
import { PLATFORM_STYLE } from './platform-style';
import { useKeyboardInset } from './useKeyboardInset';
import { showMobileConfirm } from './MobileConfirmDialog';

export interface MobileModalDialogProps {
  visible: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string;
  isDirty?: boolean;
  footer?: React.ReactNode;
  children: React.ReactNode;
}

export { MobileModalDialog };
export default function MobileModalDialog({
  visible,
  onClose,
  title,
  subtitle,
  isDirty = false,
  footer,
  children,
}: MobileModalDialogProps) {
  const D = DESIGN_TOKENS;
  const keyboardInset = useKeyboardInset(visible);

  const handleRequestClose = () => {
    if (isDirty) {
      showMobileConfirm({
        title: t('modals.unsavedChanges.title'),
        message: t('modals.unsavedChanges.description'),
        confirmText: t('modals.unsavedChanges.discard'),
        cancelText: t('common.keepEditing'),
        isDestructive: true,
        onConfirm: onClose,
      });
    } else {
      onClose();
    }
  };

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={handleRequestClose}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={[styles.overlay, { paddingBottom: keyboardInset }]}
      >
        <Pressable
          style={styles.backdrop}
          onPress={handleRequestClose}
          accessibilityRole="button"
          accessibilityLabel={t('common.close')}
        />
        <View style={styles.content}>
          <View style={styles.handle} />
          {/* Header */}
          <View style={styles.header}>
            <View style={{ flex: 1 }}>
              <Text style={styles.title}>{title}</Text>
              {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
            </View>
            <TouchableOpacity onPress={handleRequestClose} style={styles.closeBtn} activeOpacity={0.7}>
              <Feather name="x" size={20} color={D.colors.textMuted} />
            </TouchableOpacity>
          </View>

          {/* Scrollable Content Body */}
          <ScrollView
            contentContainerStyle={styles.body}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
          >
            {children}
          </ScrollView>

          {/* Action Footer */}
          {footer && <View style={styles.footer}>{footer}</View>}
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const D = DESIGN_TOKENS;
const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.45)',
    justifyContent: 'flex-end',
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
  },
  content: {
    maxHeight: '85%',
    backgroundColor: D.colors.surface,
    borderTopLeftRadius: D.radius.lg,
    borderTopRightRadius: D.radius.lg,
    paddingTop: 16,
    paddingHorizontal: 20,
    paddingBottom: PLATFORM_STYLE.sheetBottomPadding + 4,
  },
  handle: {
    alignSelf: 'center',
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: D.colors.slate[300],
    marginBottom: 12,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: D.colors.border,
  },
  title: {
    fontSize: 18,
    fontWeight: '800',
    color: D.colors.primary,
  },
  subtitle: {
    fontSize: 12,
    color: D.colors.textMuted,
    marginTop: 2,
  },
  closeBtn: {
    width: PLATFORM_STYLE.minTouch,
    height: PLATFORM_STYLE.minTouch,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: -12,
    marginTop: -8,
    marginLeft: 4,
  },
  body: {
    paddingVertical: 14,
    gap: 12,
  },
  footer: {
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: D.colors.border,
  },
});
