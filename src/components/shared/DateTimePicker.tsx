// src/components/shared/DateTimePicker.tsx
//
// A pure React Native date/time picker — no extra packages needed.
// Uses ScrollView-based drum/wheel columns for month, day, year, hour, minute.

import React, { useRef, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView,
  TouchableOpacity, NativeSyntheticEvent, NativeScrollEvent,
} from 'react-native';
import { useTheme } from '@/contexts/ThemeContext';
import { Colors, Spacing, Radius } from '@/constants/colors';

const ITEM_H = 44;
const VISIBLE = 5; // odd number so selected is centred
const PAD = Math.floor(VISIBLE / 2); // 2 blank rows top & bottom

const MONTHS = [
  'Jan','Feb','Mar','Apr','May','Jun',
  'Jul','Aug','Sep','Oct','Nov','Dec',
];

function range(start: number, end: number) {
  return Array.from({ length: end - start + 1 }, (_, i) => i + start);
}

function daysInMonth(month: number, year: number) {
  return new Date(year, month + 1, 0).getDate();
}

// ─── Single scroll-wheel column ───────────────────────────────

interface WheelProps {
  items: (string | number)[];
  selectedIndex: number;
  onSelect: (index: number) => void;
  width: number;
}

function Wheel({ items, selectedIndex, onSelect, width }: WheelProps) {
  const { colors } = useTheme();
  const ref = useRef<ScrollView>(null);
  const paddedItems = [
    ...Array(PAD).fill(''),
    ...items,
    ...Array(PAD).fill(''),
  ];

  // Scroll to selected on mount and when it changes externally
  useEffect(() => {
    ref.current?.scrollTo({ y: selectedIndex * ITEM_H, animated: false });
  }, [selectedIndex]);

  const onScrollEnd = useCallback(
    (e: NativeSyntheticEvent<NativeScrollEvent>) => {
      const y = e.nativeEvent.contentOffset.y;
      const idx = Math.round(y / ITEM_H);
      const clamped = Math.max(0, Math.min(idx, items.length - 1));
      if (clamped !== selectedIndex) onSelect(clamped);
      // Snap
      ref.current?.scrollTo({ y: clamped * ITEM_H, animated: true });
    },
    [items.length, selectedIndex, onSelect],
  );

  return (
    <View style={[wStyles.column, { width }]}>
      {/* Selection highlight bar */}
      <View
        pointerEvents="none"
        style={[
          wStyles.selectionBar,
          { borderColor: Colors.primary, top: PAD * ITEM_H },
        ]}
      />
      <ScrollView
        ref={ref}
        showsVerticalScrollIndicator={false}
        snapToInterval={ITEM_H}
        decelerationRate="fast"
        onMomentumScrollEnd={onScrollEnd}
        onScrollEndDrag={onScrollEnd}
        scrollEventThrottle={16}
        contentContainerStyle={{ paddingVertical: 0 }}
      >
        {paddedItems.map((item, i) => {
          const dataIdx = i - PAD;
          const isSelected = dataIdx === selectedIndex;
          return (
            <TouchableOpacity
              key={i}
              style={wStyles.item}
              onPress={() => {
                if (dataIdx >= 0 && dataIdx < items.length) {
                  onSelect(dataIdx);
                  ref.current?.scrollTo({ y: dataIdx * ITEM_H, animated: true });
                }
              }}
              activeOpacity={0.7}
            >
              <Text style={[
                wStyles.itemText,
                { color: isSelected ? Colors.primary : colors.textSecondary },
                isSelected && wStyles.itemTextSelected,
              ]}>
                {item === '' ? '' : String(item)}
              </Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>
    </View>
  );
}

const wStyles = StyleSheet.create({
  column: {
    height: ITEM_H * VISIBLE,
    overflow: 'hidden',
  },
  selectionBar: {
    position: 'absolute',
    left: 4,
    right: 4,
    height: ITEM_H,
    borderTopWidth: 1.5,
    borderBottomWidth: 1.5,
    zIndex: 1,
    pointerEvents: 'none',
  },
  item: {
    height: ITEM_H,
    alignItems: 'center',
    justifyContent: 'center',
  },
  itemText: {
    fontSize: 16,
    fontWeight: '400',
  },
  itemTextSelected: {
    fontSize: 17,
    fontWeight: '700',
  },
});

// ─── Public API ────────────────────────────────────────────────

export interface DateTimePickerValue {
  date: Date;        // full resolved Date object
  hasTime: boolean;  // whether the time wheels are shown
}

interface DateTimePickerProps {
  value: Date;
  hasTime: boolean;
  onToggleTime: (v: boolean) => void;
  onChange: (date: Date) => void;
  minDate?: Date;
}

export function DateTimePicker({
  value,
  hasTime,
  onToggleTime,
  onChange,
  minDate,
}: DateTimePickerProps) {
  const { colors } = useTheme();

  const year = value.getFullYear();
  const month = value.getMonth();   // 0-based
  const day = value.getDate();      // 1-based
  const hour = value.getHours();
  const minute = value.getMinutes();

  const yearStart = new Date().getFullYear();
  const years = range(yearStart, yearStart + 5);
  const days = range(1, daysInMonth(month, year));
  const hours = range(0, 23);
  const minutes = range(0, 59);

  const clampDay = (d: number, m: number, y: number) =>
    Math.min(d, daysInMonth(m, y));

  const update = (
    m = month, d = day, y = year, h = hour, mn = minute,
  ) => {
    const clamped = clampDay(d, m, y);
    const next = new Date(y, m, clamped, h, mn, 0);
    onChange(next);
  };

  return (
    <View style={[pStyles.container, { backgroundColor: colors.surface }]}>
      {/* Date wheels */}
      <View style={pStyles.wheels}>
        {/* Month */}
        <Wheel
          width={64}
          items={MONTHS}
          selectedIndex={month}
          onSelect={(i) => update(i, day, year, hour, minute)}
        />
        {/* Day */}
        <Wheel
          width={48}
          items={days}
          selectedIndex={day - 1}
          onSelect={(i) => update(month, i + 1, year, hour, minute)}
        />
        {/* Year */}
        <Wheel
          width={72}
          items={years}
          selectedIndex={Math.max(0, year - yearStart)}
          onSelect={(i) => update(month, day, yearStart + i, hour, minute)}
        />
      </View>

      {/* All-day / time toggle */}
      <TouchableOpacity
        style={[pStyles.toggleRow, { borderTopColor: colors.border }]}
        onPress={() => onToggleTime(!hasTime)}
        activeOpacity={0.8}
      >
        <Text style={[pStyles.toggleLabel, { color: colors.textPrimary }]}>
          All Day
        </Text>
        <View style={[pStyles.toggle, { backgroundColor: hasTime ? colors.muted : Colors.primary }]}>
          <View style={[pStyles.thumb, !hasTime && pStyles.thumbOn]} />
        </View>
      </TouchableOpacity>

      {/* Time wheels */}
      {hasTime && (
        <View style={[pStyles.timeRow, { borderTopColor: colors.border }]}>
          <Wheel
            width={56}
            items={hours.map((h) => String(h).padStart(2, '0'))}
            selectedIndex={hour}
            onSelect={(i) => update(month, day, year, i, minute)}
          />
          <Text style={[pStyles.timeSep, { color: colors.textPrimary }]}>:</Text>
          <Wheel
            width={56}
            items={minutes.map((m) => String(m).padStart(2, '0'))}
            selectedIndex={minute}
            onSelect={(i) => update(month, day, year, hour, i)}
          />
          <Text style={[pStyles.amLabel, { color: colors.textSecondary }]}>
            {hour < 12 ? 'AM' : 'PM'}
          </Text>
        </View>
      )}
    </View>
  );
}

const pStyles = StyleSheet.create({
  container: {
    borderRadius: Radius.lg,
    overflow: 'hidden',
    marginBottom: Spacing.md,
  },
  wheels: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: Spacing.lg,
    gap: Spacing.sm,
  },
  toggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    borderTopWidth: 1,
  },
  toggleLabel: { fontSize: 15, fontWeight: '500' },
  toggle: {
    width: 46, height: 26, borderRadius: 13,
    justifyContent: 'center', padding: 2,
  },
  thumb: {
    width: 22, height: 22, borderRadius: 11,
    backgroundColor: '#FFFFFF',
    alignSelf: 'flex-end',
  },
  thumbOn: { alignSelf: 'flex-start' },
  timeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderTopWidth: 1,
    paddingHorizontal: Spacing.lg,
    gap: 4,
  },
  timeSep: { fontSize: 24, fontWeight: '700', marginBottom: 2 },
  amLabel: { fontSize: 14, fontWeight: '600', marginLeft: 8, width: 32 },
});
