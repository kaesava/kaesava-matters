import { useState } from 'react';
import { Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useIconVisibility } from '../hooks/IconVisibilityContext';
import { t } from '@kaesava/i18n';
import { DESIGN_TOKENS } from '../tokens';
import MobileModalDialog from './MobileModalDialog';
import MobileButton from './Button';

export interface InfoTooltipProps {
  content: string;
  title?: string;
}

export function InfoTooltip({ content, title }: InfoTooltipProps) {
  const { showIcons } = useIconVisibility();
  const [visible, setVisible] = useState(false);

  if (!showIcons) return null;

  return (
    <>
      <TouchableOpacity
        onPress={() => setVisible(true)}
        style={styles.iconButton}
        activeOpacity={0.7}
        hitSlop={{ top: 13, bottom: 13, left: 13, right: 13 }}
        accessibilityRole="button"
        accessibilityLabel={title || t('common.info')}
      >
        <Feather name="info" size={14} color={DESIGN_TOKENS.colors.textMuted} />
      </TouchableOpacity>

      <MobileModalDialog
        visible={visible}
        onClose={() => setVisible(false)}
        title={title || t('common.info')}
        footer={
          <MobileButton
            variant="primary"
            title={t('common.gotIt')}
            onPress={() => setVisible(false)}
          />
        }
      >
        <Text style={styles.tooltipContent}>{content}</Text>
      </MobileModalDialog>
    </>
  );
}

const D = DESIGN_TOKENS;
const styles = StyleSheet.create({
  iconButton: {
    width: 20, // mm-allow-interaction: 20dp icon with 13dp hitSlop (= 46dp target)
    height: 20, // mm-allow-interaction: 20dp icon with 13dp hitSlop (= 46dp target)
    borderRadius: 10,
    backgroundColor: D.colors.slate[100],
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 6,
  },
  tooltipContent: {
    fontSize: 15,
    color: D.colors.textPrimary,
    lineHeight: 22,
  },
});

export default InfoTooltip;
