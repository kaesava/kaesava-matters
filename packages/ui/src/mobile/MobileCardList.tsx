import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { DESIGN_TOKENS } from "../tokens";
import MobileSearchInput from "./SearchInput";
import MobileSkeletonCard from "./SkeletonCard";
import { MobilePaginationBar } from "./MobilePaginationBar";

export interface MobileCardListProps<T> {
  items: readonly T[];
  itemKey: (item: T) => string;
  renderCard: (item: T) => React.ReactNode;
  isLoading?: boolean;
  emptyMessage: string;
  searchQuery?: string;
  onSearchChange?: (val: string) => void;
  searchPlaceholder?: string;
  page?: number;
  pageSize?: number;
  onPageChange?: (page: number) => void;
  onPageSizeChange?: (pageSize: number) => void;
}

export function MobileCardList<T>({
  items,
  itemKey,
  renderCard,
  isLoading = false,
  emptyMessage,
  searchQuery,
  onSearchChange,
  searchPlaceholder,
  page = 1,
  pageSize = 10,
  onPageChange,
  onPageSizeChange,
}: MobileCardListProps<T>) {
  const totalItems = items.length;
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
  const pagedItems = onPageChange
    ? items.slice((page - 1) * pageSize, page * pageSize)
    : items;

  return (
    <View style={styles.container}>
      {onSearchChange && (
        <MobileSearchInput
          value={searchQuery ?? ""}
          onChangeText={onSearchChange}
          placeholder={searchPlaceholder}
        />
      )}
      {isLoading ? (
        <View style={styles.listGap}>
          <MobileSkeletonCard />
          <MobileSkeletonCard />
        </View>
      ) : pagedItems.length === 0 ? (
        <Text style={styles.emptyText}>{emptyMessage}</Text>
      ) : (
        <View style={styles.listGap}>
          {pagedItems.map((item) => (
            <View key={itemKey(item)}>{renderCard(item)}</View>
          ))}
        </View>
      )}
      {onPageChange && totalItems >= 5 && (
        <MobilePaginationBar
          page={page}
          totalPages={totalPages}
          totalItems={totalItems}
          pageSize={pageSize}
          onPageChange={onPageChange}
          onPageSizeChange={onPageSizeChange ?? (() => {})}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { gap: 12 },
  listGap: { gap: 10 },
  emptyText: {
    textAlign: "center",
    fontSize: 14,
    color: DESIGN_TOKENS.colors.textMuted,
    paddingVertical: 24,
  },
});
