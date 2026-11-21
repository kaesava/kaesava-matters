import React from 'react';
import { View, Text, Pressable, ScrollView, StyleSheet, StyleProp, ViewStyle } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { DESIGN_TOKENS } from '../tokens';
import { PLATFORM_STYLE, getRipple } from './platform-style';

export interface SegmentTabItem<T extends string = string> {
  key: T;
  label: string;
  icon?: React.ComponentProps<typeof Feather>['name'];
  badgeCount?: number;
}

export interface SegmentedTabsProps<T extends string = string> {
  tabs: SegmentTabItem<T>[];
  activeKey: T;
  onChange: (key: T) => void;
  scrollable?: boolean;
  style?: StyleProp<ViewStyle>;
}

export function SegmentedTabs<T extends string = string>({
  tabs,
  activeKey,
  onChange,
  scrollable = false,
  style,
}: SegmentedTabsProps<T>) {
  const content = (
    <View style={[styles.container, scrollable && styles.scrollContainer, !scrollable && style]}>
      {tabs.map((tab) => {
        const isActive = tab.key === activeKey;
        return (
          <Pressable
            key={tab.key}
            onPress={() => onChange(tab.key)}
            android_ripple={getRipple()}
            style={({ pressed }) => [
              styles.tab,
              scrollable && styles.scrollTab,
              isActive && styles.tabActive,
              !PLATFORM_STYLE.rippleColor && pressed && { opacity: 0.75 },
            ]}
            accessibilityRole="tab"
            accessibilityState={{ selected: isActive }}
          >
            {tab.icon && (
              <Feather
                name={tab.icon}
                size={14}
                color={isActive ? DESIGN_TOKENS.colors.accent : DESIGN_TOKENS.colors.textMuted}
                style={styles.icon}
              />
            )}
            <Text style={[styles.label, isActive && styles.labelActive]}>
              {tab.label}
            </Text>
            {typeof tab.badgeCount === 'number' && tab.badgeCount > 0 && (
              <View style={[styles.badge, isActive && styles.badgeActive]}>
                <Text style={[styles.badgeText, isActive && styles.badgeTextActive]}>
                  {tab.badgeCount}
                </Text>
              </View>
            )}
          </Pressable>
        );
      })}
    </View>
  );

  if (scrollable) {
    return (
      <View style={[styles.scrollWrapper, style]}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
        >
          {content}
        </ScrollView>
      </View>
    );
  }

  return content;
}

const D = DESIGN_TOKENS;
const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    backgroundColor: D.colors.slate[100],
    borderRadius: D.radius.md,
    padding: 3,
    marginBottom: 14,
  },
  tab: {
    flex: 1,
    minHeight: PLATFORM_STYLE.minTouch - 6,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    paddingHorizontal: 10,
    borderRadius: 9,
    overflow: 'hidden',
  },
  tabActive: {
    backgroundColor: D.colors.surface,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 2,
    elevation: 2,
  },
  icon: {
    marginRight: 6,
  },
  label: {
    fontSize: 13,
    fontWeight: '600',
    color: D.colors.textMuted,
  },
  labelActive: {
    color: D.colors.accent,
    fontWeight: '700',
  },
  badge: {
    marginLeft: 6,
    paddingHorizontal: 5,
    paddingVertical: 1,
    borderRadius: 8,
    backgroundColor: D.colors.slate[200],
  },
  badgeActive: {
    backgroundColor: D.colors.accentLight,
  },
  badgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: D.colors.slate[600],
  },
  badgeTextActive: {
    color: D.colors.accentDark,
  },
  scrollWrapper: {
    marginBottom: 14,
  },
  scrollContent: {
    paddingHorizontal: 0,
  },
  scrollContainer: {
    marginBottom: 0,
  },
  scrollTab: {
    flex: 0,
    paddingHorizontal: 16,
  },
});

export default SegmentedTabs;
