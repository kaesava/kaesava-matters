import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { t } from '@money-matters/i18n';
import { DESIGN_TOKENS } from '../tokens';
import { PLATFORM_STYLE } from './platform-style';

export interface MobilePaginationBarProps {
  page: number;
  totalPages: number;
  pageSize: number;
  totalItems: number;
  pageSizeOptions?: number[];
  onPageChange: (page: number) => void;
  onPageSizeChange: (pageSize: number) => void;
}

// Mobile-native incremental "Show More" footer (replaces web-style Prev/Next page controls).
export function MobilePaginationBar({
  page,
  totalPages,
  pageSize,
  totalItems,
  onPageChange,
}: MobilePaginationBarProps) {
  const shownCount = Math.min(page * pageSize, totalItems);
  if (totalItems < 5 || page >= totalPages || shownCount >= totalItems) return null;

  return (
    <View style={styles.container}>
      <TouchableOpacity
        onPress={() => onPageChange(page + 1)}
        activeOpacity={0.75}
        accessibilityRole="button"
        accessibilityLabel={t('common.showMore')}
        style={styles.loadMoreBtn}
      >
        <Text style={styles.loadMoreText}>{t('common.showMore')}</Text>
        <Text style={styles.countText}>
          ({shownCount}/{totalItems})
        </Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingVertical: 10,
  },
  loadMoreBtn: {
    minHeight: PLATFORM_STYLE.minTouch,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: DESIGN_TOKENS.colors.surface,
    borderWidth: 1,
    borderColor: DESIGN_TOKENS.colors.slate[200],
    borderRadius: DESIGN_TOKENS.radius.md,
    paddingHorizontal: 16,
  },
  loadMoreText: {
    fontSize: 13,
    fontWeight: '700',
    color: DESIGN_TOKENS.colors.accent,
  },
  countText: {
    fontSize: 12,
    fontWeight: '600',
    color: DESIGN_TOKENS.colors.textMuted,
  },
});

export default MobilePaginationBar;
