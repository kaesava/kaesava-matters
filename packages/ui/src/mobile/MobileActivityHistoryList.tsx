import React from "react";
import { StyleSheet, Text, View } from "react-native";
import { t } from "@kaesava/i18n";
import { DESIGN_TOKENS } from "../tokens";
import { MobileCardRow } from "./MobileCardRow";
import { MobilePaginationBar } from "./MobilePaginationBar";
import { SkeletonCard } from "./SkeletonCard";

export interface MobileActivityItem {
  id: string;
  actorName: string;
  action: string;
  target?: string | null;
  summary?: string | null;
  timestamp: string;
  metadata?: Record<string, string | number | boolean | null>;
}

export interface MobileActivityHistoryListProps {
  items: readonly MobileActivityItem[];
  isLoading?: boolean;
  emptyMessage?: string;
  formatTimestamp?: (iso: string) => string;
  onSelectItem?: (item: MobileActivityItem) => void;
  page?: number;
  totalPages?: number;
  totalItems?: number;
  pageSize?: number;
  onPageChange?: (page: number) => void;
  onPageSizeChange?: (size: number) => void;
}

export function MobileActivityHistoryList({
  items,
  isLoading = false,
  emptyMessage,
  formatTimestamp = (iso) => iso,
  onSelectItem,
  page = 1,
  totalPages = 1,
  totalItems = items.length,
  pageSize = 20,
  onPageChange,
  onPageSizeChange,
}: MobileActivityHistoryListProps) {
  if (isLoading) return <SkeletonCard count={4} height={68} />;
  if (items.length === 0) {
    return (
      <View style={styles.emptyCard}>
        <Text style={styles.emptyText}>{emptyMessage ?? t("settings.workspace.dataExport.activityEmpty")}</Text>
      </View>
    );
  }
  return (
    <View style={styles.container}>
      <View style={styles.listCard}>
        {items.map((item, idx) => (
          <View key={item.id} style={idx > 0 ? styles.rowDivider : undefined}>
            <MobileCardRow
              onPress={onSelectItem ? () => onSelectItem(item) : undefined}
              accessibilityLabel={`${item.actorName} ${item.action}`}
            >
              <View style={styles.rowTop}>
                <Text style={styles.actor} numberOfLines={1}>{item.actorName}</Text>
                <Text style={styles.timestamp}>{formatTimestamp(item.timestamp)}</Text>
              </View>
              <Text style={styles.action} numberOfLines={2}>
                {item.action}
                {item.summary || item.target ? ` · ${item.summary || item.target}` : ""}
              </Text>
            </MobileCardRow>
          </View>
        ))}
      </View>
      {totalItems >= 5 && onPageChange && (
        <MobilePaginationBar
          page={page}
          totalPages={totalPages}
          pageSize={pageSize}
          totalItems={totalItems}
          onPageChange={onPageChange}
          onPageSizeChange={onPageSizeChange ?? (() => {})}
        />
      )}
    </View>
  );
}

const C = DESIGN_TOKENS.colors;
const styles = StyleSheet.create({
  container: { gap: 12 },
  listCard: { backgroundColor: C.surface, borderRadius: 14, borderWidth: 1, borderColor: C.border, overflow: "hidden" },
  rowDivider: { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: C.divider },
  rowTop: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", gap: 8 },
  actor: { fontSize: 14, fontWeight: "700", color: C.textPrimary, flex: 1 },
  timestamp: { fontSize: 12, color: C.textMuted },
  action: { fontSize: 13, color: C.slate[600], marginTop: 2 },
  emptyCard: { backgroundColor: C.surface, borderRadius: 14, borderWidth: 1, borderColor: C.border, padding: 24, alignItems: "center" },
  emptyText: { fontSize: 14, color: C.textMuted, textAlign: "center" },
});
