import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { DESIGN_TOKENS, MobileModalDialog } from '@kaesava/ui/mobile';
import { t } from '@kaesava/i18n';

export interface EnvelopeRowActionTarget {
  id: string;
  name: string;
  envelopeType?: string | null;
  poolType?: string | null;
  isPrivate?: boolean | null;
  isSurplusTarget?: boolean | null;
}

interface EnvelopeRowActionsSheetProps {
  visible: boolean;
  envelope: EnvelopeRowActionTarget | null;
  onClose: () => void;
  onEdit: () => void;
  onDrawDown?: () => void;
  onMarkAsSurplusTarget?: () => void;
}

/**
 * Bottom sheet for per-envelope row actions on Mobile (Edit, Draw down, Mark as Shortfall/Surplus target).
 */
export function EnvelopeRowActionsSheet({
  visible,
  envelope,
  onClose,
  onEdit,
  onDrawDown,
  onMarkAsSurplusTarget,
}: EnvelopeRowActionsSheetProps) {
  if (!envelope) return null;

  const isEveryday = envelope.envelopeType === 'EVERYDAY' || envelope.poolType === 'EVERYDAY';
  const isCurrentTarget = Boolean(envelope.isSurplusTarget);
  const canShowSurplusAction = !envelope.isPrivate && Boolean(onMarkAsSurplusTarget);

  return (
    <MobileModalDialog visible={visible} onClose={onClose} title={envelope.name}>
      <View style={styles.list}>
        {onDrawDown && !isEveryday && (
          <TouchableOpacity
            style={styles.row}
            onPress={() => {
              onClose();
              onDrawDown();
            }}
          >
            <Feather name="arrow-down-circle" size={18} color={DESIGN_TOKENS.colors.accent} />
            <Text style={styles.rowText}>{t('categories.actions.drawDown')}</Text>
          </TouchableOpacity>
        )}

        {canShowSurplusAction && (
          <TouchableOpacity
            style={[styles.row, isCurrentTarget && styles.rowDisabled]}
            disabled={isCurrentTarget}
            onPress={() => {
              if (isCurrentTarget) return;
              onClose();
              onMarkAsSurplusTarget?.();
            }}
          >
            <Feather
              name="target"
              size={18}
              color={isCurrentTarget ? DESIGN_TOKENS.colors.slate[400] : DESIGN_TOKENS.colors.accent}
            />
            <Text style={[styles.rowText, isCurrentTarget && styles.rowTextDisabled]}>
              {t('categories.actions.markAsSurplusTarget')}
            </Text>
          </TouchableOpacity>
        )}

        <TouchableOpacity
          style={styles.row}
          onPress={() => {
            onClose();
            onEdit();
          }}
        >
          <Feather name="edit-2" size={18} color={DESIGN_TOKENS.colors.slate[700]} />
          <Text style={styles.rowText}>{t('common.edit')}</Text>
        </TouchableOpacity>
      </View>
    </MobileModalDialog>
  );
}

const styles = StyleSheet.create({
  list: { gap: 4, paddingVertical: 4 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    minHeight: 48,
    paddingHorizontal: 12,
    paddingVertical: 12,
    borderRadius: 12,
  },
  rowDisabled: { opacity: 0.45 },
  rowText: { fontSize: 15, fontWeight: '600', color: DESIGN_TOKENS.colors.primary, flex: 1 },
  rowTextDisabled: { color: DESIGN_TOKENS.colors.slate[400] },
});
