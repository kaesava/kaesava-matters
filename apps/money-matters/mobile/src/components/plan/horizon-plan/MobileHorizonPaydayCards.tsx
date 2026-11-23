import React from 'react';
import { View, StyleSheet } from 'react-native';
import { MobileHorizonPaydayColumnHeader, type MobileMatrixColumnData } from './MobileHorizonPaydayColumnHeader';

interface MobileHorizonPaydayCardsProps {
  readonly columns: MobileMatrixColumnData[];
  readonly columnStateMap: Record<string, 'AUTO' | 'SAVED' | 'CONFIRMED'>;
  readonly savingColId: string | null;
  readonly onReview: (colId: string) => void;
  readonly onSave: (colId: string, totalIncome: number) => void;
  readonly onReset?: (colId: string) => void;
  readonly onDelete: (colId: string) => void;
  readonly onEditIncome?: (colId: string) => void;
}

// Phone-first view of the horizon: one full-width card per payday with the same actions as the grid column header.
export const MobileHorizonPaydayCards: React.FC<MobileHorizonPaydayCardsProps> = ({
  columns,
  columnStateMap,
  savingColId,
  ...handlers
}) => (
  <View style={styles.list}>
    {columns.map((col) => {
      const state = columnStateMap[col.id] || 'AUTO';
      return (
        <MobileHorizonPaydayColumnHeader
          key={col.id}
          col={col}
          fullWidth
          isConfirmed={state === 'CONFIRMED'}
          isSaved={state === 'SAVED'}
          isSaving={savingColId === col.id}
          {...handlers}
        />
      );
    })}
  </View>
);

const styles = StyleSheet.create({
  list: { paddingHorizontal: 16, gap: 12, paddingBottom: 24 },
});
