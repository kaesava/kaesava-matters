import React, { useState } from 'react';
import { View, TouchableOpacity, StyleSheet } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { DESIGN_TOKENS, PLATFORM_STYLE } from '@kaesava/ui/mobile';
import { QuickExpenseModal } from './QuickExpenseModal';

import { triggerHaptic } from '../lib/haptics';
import { t } from '@kaesava/i18n';
import { useMobileProductTour } from '../context/ProductTourContext';

export interface QuickActionFabProps {
  visible?: boolean;
  onCustomPress?: () => void;
}

export function QuickActionFab({ visible = true, onCustomPress }: QuickActionFabProps) {
  const [modalVisible, setModalVisible] = useState(false);
  const { registerTourTarget } = useMobileProductTour();
  const fabRef = React.useRef<View>(null);

  if (!visible) return null;

  const handlePress = () => {
    triggerHaptic('light');
    if (onCustomPress) {
      onCustomPress();
    } else {
      setModalVisible(true);
    }
  };

  return (
    <>
      <View
        ref={fabRef}
        pointerEvents="box-none"
        style={styles.container}
        onLayout={() => {
          fabRef.current?.measureInWindow((x, y, width, height) => {
            if (width > 0 && height > 0) registerTourTarget('quick-actions', { x, y, width, height });
          });
        }}
      >
        <TouchableOpacity
          activeOpacity={0.85}
          onPress={handlePress}
          style={styles.fab}
          accessibilityLabel={t('dashboard.quickAction')}
          accessibilityRole="button"
        >
          <Feather name="plus" size={26} color={DESIGN_TOKENS.colors.onAccent} />
        </TouchableOpacity>
      </View>

      <QuickExpenseModal
        visible={modalVisible}
        onClose={() => setModalVisible(false)}
      />
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    bottom: PLATFORM_STYLE.isAndroid ? 72 : 76,
    right: 20,
    zIndex: 99,
  },
  fab: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: DESIGN_TOKENS.colors.sereneBlue,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: DESIGN_TOKENS.colors.primary,
    shadowOpacity: 0.3,
    shadowOffset: { width: 0, height: 4 },
    shadowRadius: 8,
    elevation: 6,
    borderWidth: 2,
    borderColor: DESIGN_TOKENS.colors.surface,
  },
});

export default QuickActionFab;
