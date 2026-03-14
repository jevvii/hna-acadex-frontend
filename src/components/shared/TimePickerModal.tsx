// src/components/shared/TimePickerModal.tsx
//
// A Material Design-style centered time picker modal with clock face.
// Supports hour and minute selection with draggable minute hand.

import React, { useState, useRef, useCallback, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  Pressable,
  TouchableOpacity,
  PanResponder,
  Dimensions,
} from 'react-native';
import { useTheme } from '@/contexts/ThemeContext';
import { Colors, Spacing, Radius } from '@/constants/colors';

const HOUR_NUMBERS = [12, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11];
const MINUTE_NUMBERS = [0, 5, 10, 15, 20, 25, 30, 35, 40, 45, 50, 55];

type TimeMode = 'hour' | 'minute';

interface TimePickerModalProps {
  visible: boolean;
  value: Date;
  onChange: (date: Date) => void;
  onClose: () => void;
  title?: string;
}

export function TimePickerModal({
  visible,
  value,
  onChange,
  onClose,
  title,
}: TimePickerModalProps) {
  const { colors } = useTheme();
  const [mode, setMode] = useState<TimeMode>('hour');
  const [selectedHour, setSelectedHour] = useState(value.getHours());
  const [selectedMinute, setSelectedMinute] = useState(value.getMinutes());
  const [isAm, setIsAm] = useState(value.getHours() < 12);

  // Clock face dimensions - calculate first before refs
  const clockSize = Math.min(Dimensions.get('window').width - 80, 280);
  const clockRadius = clockSize / 2;
  const numberRadius = clockRadius - 30; // Distance from center to numbers
  const handLength = numberRadius; // Hand extends to number position

  // Use refs to avoid stale closures in PanResponder
  const modeRef = useRef(mode);
  const isAmRef = useRef(isAm);
  const clockRadiusRef = useRef(clockRadius);
  // Store clock face position (page coordinates) for accurate touch handling
  const clockLayoutRef = useRef({ x: 0, y: 0, width: clockSize, height: clockSize });
  const clockFaceRef = useRef<View>(null);

  // Keep refs in sync with state
  useEffect(() => {
    modeRef.current = mode;
  }, [mode]);
  useEffect(() => {
    isAmRef.current = isAm;
  }, [isAm]);
  // Update clock radius ref (in case dimensions change)
  clockRadiusRef.current = clockRadius;

  // Measure clock face position after render
  const measureClockFace = useCallback(() => {
    if (clockFaceRef.current) {
      clockFaceRef.current.measure((x, y, width, height, pageX, pageY) => {
        clockLayoutRef.current = { x: pageX, y: pageY, width, height };
      });
    }
  }, []);

  // Reset state when modal opens
  useEffect(() => {
    if (visible) {
      setSelectedHour(value.getHours());
      setSelectedMinute(value.getMinutes());
      setIsAm(value.getHours() < 12);
      setMode('hour');
      // Measure clock face after modal opens
      setTimeout(measureClockFace, 100);
    }
  }, [visible, value, measureClockFace]);

  const handleHourSelect = (hour: number) => {
    // Convert 12-hour to 24-hour
    let adjustedHour = hour;
    if (isAm && hour === 12) {
      adjustedHour = 0;
    } else if (!isAm && hour !== 12) {
      adjustedHour = hour + 12;
    }
    setSelectedHour(adjustedHour);
    // Switch to minute mode after selecting hour
    setMode('minute');
  };

  const handleMinuteSelect = (minute: number) => {
    setSelectedMinute(minute);
    // Don't auto-close - let user click OK
  };

  const handleAmPmToggle = (am: boolean) => {
    setIsAm(am);
    // Adjust hour if needed
    if (am && selectedHour >= 12) {
      setSelectedHour(selectedHour - 12);
    } else if (!am && selectedHour < 12) {
      setSelectedHour(selectedHour + 12);
    }
  };

  const handleConfirm = () => {
    const newDate = new Date(value);
    newDate.setHours(selectedHour);
    newDate.setMinutes(selectedMinute);
    newDate.setSeconds(0);
    onChange(newDate);
    // Note: We don't call onClose here because the parent (DateTimePickerModal)
    // handles closing through onChange callback.
    // onClose is only for cancel actions.
  };

  const handleBack = () => {
    setMode('hour');
  };

  // Calculate position for numbers around the clock
  const getNumberPosition = (index: number, total: number) => {
    const angle = (index * (360 / total)) - 90; // Start from top
    const radian = (angle * Math.PI) / 180;
    return {
      x: Math.cos(radian) * numberRadius,
      y: Math.sin(radian) * numberRadius,
    };
  };

  // Clock hand angle
  const handAngle = mode === 'hour'
    ? ((selectedHour % 12) / 12) * 360 - 90
    : (selectedMinute / 60) * 360 - 90;

  // Display values
  const displayHour = selectedHour % 12 || 12;
  const displayMinute = selectedMinute.toString().padStart(2, '0');

  // Handle pan move using page coordinates (screen coordinates)
  // This fixes the issue where locationX/locationY were relative to child elements
  const handlePanMove = useCallback((pageX: number, pageY: number) => {
    // Get current values from refs
    const currentClockRadius = clockRadiusRef.current;
    const currentMode = modeRef.current;
    const currentIsAm = isAmRef.current;
    const clockLayout = clockLayoutRef.current;

    // Convert page coordinates to clock face coordinates
    // pageX/pageY are screen coordinates, so we subtract the clock face's screen position
    // and then subtract clockRadius to get coordinates relative to center
    const relX = (pageX - clockLayout.x) - currentClockRadius;
    const relY = (pageY - clockLayout.y) - currentClockRadius;

    // Calculate angle from center (0° at top, clockwise)
    const rawAngle = Math.atan2(relY, relX) * (180 / Math.PI);
    const angle = (rawAngle + 90 + 360) % 360; // Convert to 0° at top

    if (currentMode === 'hour') {
      // 360° / 12 hours = 30° per hour
      const hour = Math.round(angle / 30) % 12;
      const hour12 = hour === 0 ? 12 : hour;
      // Convert 12-hour to 24-hour
      let adjustedHour = hour12 === 12 ? (currentIsAm ? 0 : 12) : (currentIsAm ? hour12 : hour12 + 12);
      setSelectedHour(adjustedHour);
    } else {
      // 360° / 60 minutes = 6° per minute
      const minute = Math.round(angle / 6) % 60;
      setSelectedMinute(minute >= 0 ? minute : 0);
    }
  }, []); // No dependencies - use refs for all values

  // Pan responder for dragging the hand
  // Use pageX/pageY instead of locationX/locationY to get accurate coordinates
  // regardless of which child element is touched
  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderGrant: (evt) => {
        // Use pageX/pageY (screen coordinates) for accurate touch position
        handlePanMove(evt.nativeEvent.pageX, evt.nativeEvent.pageY);
      },
      onPanResponderMove: (evt) => {
        handlePanMove(evt.nativeEvent.pageX, evt.nativeEvent.pageY);
      },
      onPanResponderRelease: () => {
        // Drag ended - state is already updated during drag
      },
    })
  ).current;

  const clockNumbers = mode === 'hour' ? HOUR_NUMBERS : MINUTE_NUMBERS;

  // For hours: highlight the selected hour number
  // For minutes: only highlight if exactly on a 5-minute increment
  const selectedIndex = mode === 'hour'
    ? HOUR_NUMBERS.indexOf(selectedHour % 12 || 12)
    : selectedMinute % 5 === 0
      ? MINUTE_NUMBERS.indexOf(selectedMinute)
      : -1; // No highlight if not on exact 5-minute increment

  // For minute mode: calculate the exact position of the selected minute
  // This allows the hand to show exact minute position while numbers show 5-min increments
  const exactMinuteAngle = mode === 'minute'
    ? (selectedMinute / 60) * 360 - 90
    : handAngle;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <Pressable style={styles.backdrop} onPress={onClose}>
        <Pressable style={[styles.modal, { backgroundColor: '#FFFFFF' }]} onPress={(e) => e.stopPropagation()}>
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.timeDisplay}>
              <TouchableOpacity onPress={() => setMode('hour')}>
                <Text style={[styles.timeNumber, mode === 'hour' && styles.timeNumberActive]}>
                  {displayHour}
                </Text>
              </TouchableOpacity>
              <Text style={styles.timeSeparator}>:</Text>
              <TouchableOpacity onPress={() => setMode('minute')}>
                <Text style={[styles.timeNumber, mode === 'minute' && styles.timeNumberActive]}>
                  {displayMinute}
                </Text>
              </TouchableOpacity>
            </View>
            <View style={styles.amPmContainer}>
              <TouchableOpacity
                style={[styles.amPmButton, isAm && styles.amPmButtonActive]}
                onPress={() => handleAmPmToggle(true)}
              >
                <Text style={[styles.amPmText, isAm && styles.amPmTextActive]}>AM</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.amPmButton, !isAm && styles.amPmButtonActive]}
                onPress={() => handleAmPmToggle(false)}
              >
                <Text style={[styles.amPmText, !isAm && styles.amPmTextActive]}>PM</Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Clock face */}
          <View style={styles.clockContainer}>
            <View
              ref={clockFaceRef}
              style={[styles.clockFace, { width: clockSize, height: clockSize }]}
              {...panResponder.panHandlers}
              onLayout={measureClockFace}
            >
              {/* Numbers around the edge */}
              {clockNumbers.map((num, index) => {
                const pos = getNumberPosition(index, clockNumbers.length);
                const isSelected = index === selectedIndex;
                return (
                  <TouchableOpacity
                    key={num}
                    style={[
                      styles.clockNumber,
                      {
                        left: clockRadius + pos.x - 22,
                        top: clockRadius + pos.y - 22,
                      },
                      isSelected && styles.clockNumberSelected,
                    ]}
                    onPress={() => {
                      if (mode === 'hour') {
                        handleHourSelect(num as number);
                      } else {
                        handleMinuteSelect(num as number);
                      }
                    }}
                  >
                    <Text style={[styles.clockNumberText, isSelected && styles.clockNumberTextSelected]}>
                      {mode === 'minute' ? String(num).padStart(2, '0') : num}
                    </Text>
                  </TouchableOpacity>
                );
              })}

              {/* Clock hand - for minutes, use exact angle */}
              <View
                style={[
                  styles.clockHand,
                  {
                    width: handLength,
                    transform: [{ rotate: `${mode === 'minute' ? exactMinuteAngle : handAngle}deg` as any }],
                  },
                ]}
              />

              {/* Center hub */}
              <View style={styles.clockCenter} />

              {/* Selection dot at the end of the hand - always visible, positioned at number radius */}
              <View
                style={[
                  styles.clockHandTip,
                  {
                    left: clockRadius + Math.cos(((mode === 'minute' ? exactMinuteAngle : handAngle) * Math.PI) / 180) * numberRadius - 12,
                    top: clockRadius + Math.sin(((mode === 'minute' ? exactMinuteAngle : handAngle) * Math.PI) / 180) * numberRadius - 12,
                  },
                ]}
              />
            </View>
          </View>

          {/* Mode switch */}
          <View style={styles.modeSwitch}>
            <TouchableOpacity
              style={[styles.modeButton, mode === 'hour' && styles.modeButtonActive]}
              onPress={() => setMode('hour')}
            >
              <Text style={[styles.modeButtonText, mode === 'hour' && styles.modeButtonTextActive]}>
                Hour
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.modeButton, mode === 'minute' && styles.modeButtonActive]}
              onPress={() => setMode('minute')}
            >
              <Text style={[styles.modeButtonText, mode === 'minute' && styles.modeButtonTextActive]}>
                Minute
              </Text>
            </TouchableOpacity>
          </View>

          {/* Footer */}
          <View style={styles.footer}>
            {mode === 'minute' && (
              <TouchableOpacity onPress={handleBack} style={styles.footerButton}>
                <Text style={styles.footerButtonText}>BACK</Text>
              </TouchableOpacity>
            )}
            <View style={{ flex: 1 }} />
            <TouchableOpacity onPress={onClose} style={styles.footerButton}>
              <Text style={styles.footerButtonText}>CANCEL</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={handleConfirm} style={styles.footerButton}>
              <Text style={styles.footerButtonText}>OK</Text>
            </TouchableOpacity>
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modal: {
    borderRadius: 4,
    overflow: 'hidden',
    width: 320,
    maxWidth: '90%',
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 16,
  },
  header: {
    backgroundColor: '#1A3A6B',
    paddingVertical: Spacing.lg,
    paddingHorizontal: Spacing.lg,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  timeDisplay: {
    flexDirection: 'row',
    alignItems: 'baseline',
  },
  timeNumber: {
    fontSize: 56,
    fontWeight: '300',
    color: 'rgba(255, 255, 255, 0.5)',
  },
  timeNumberActive: {
    color: '#FFFFFF',
  },
  timeSeparator: {
    fontSize: 56,
    fontWeight: '300',
    color: 'rgba(255, 255, 255, 0.5)',
    marginHorizontal: 2,
  },
  amPmContainer: {
    marginLeft: Spacing.md,
  },
  amPmButton: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: 2,
    borderRadius: 4,
  },
  amPmButtonActive: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
  },
  amPmText: {
    fontSize: 14,
    fontWeight: '400',
    color: 'rgba(255, 255, 255, 0.5)',
  },
  amPmTextActive: {
    color: '#FFFFFF',
    fontWeight: '500',
  },
  clockContainer: {
    padding: Spacing.md,
    alignItems: 'center',
  },
  clockFace: {
    backgroundColor: '#EEEEEE',
    borderRadius: 999,
    position: 'relative',
  },
  clockNumber: {
    position: 'absolute',
    width: 44,
    height: 44,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 22,
  },
  clockNumberSelected: {
    backgroundColor: '#0F2147',
    borderRadius: 22,
  },
  clockNumberText: {
    fontSize: 16,
    fontWeight: '400',
    color: '#1A1A1A',
  },
  clockNumberTextSelected: {
    color: '#FFFFFF',
    fontWeight: '500',
  },
  clockHand: {
    position: 'absolute',
    left: '50%',
    top: '50%',
    height: 2,
    backgroundColor: '#0F2147',
    transformOrigin: 'left center',
    borderRadius: 1,
  },
  clockCenter: {
    position: 'absolute',
    left: '50%',
    top: '50%',
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#0F2147',
    marginLeft: -6,
    marginTop: -6,
  },
  clockHandTip: {
    position: 'absolute',
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#0F2147',
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },
  modeSwitch: {
    flexDirection: 'row',
    justifyContent: 'center',
    paddingHorizontal: Spacing.md,
    marginBottom: Spacing.sm,
  },
  modeButton: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
    marginHorizontal: Spacing.xs,
    borderRadius: Radius.sm,
  },
  modeButtonActive: {
    backgroundColor: 'rgba(26, 58, 107, 0.1)',
  },
  modeButtonText: {
    fontSize: 14,
    color: '#64748B',
    fontWeight: '500',
  },
  modeButtonTextActive: {
    color: '#1A3A6B',
    fontWeight: '600',
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'flex-start',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderTopWidth: 1,
    borderTopColor: '#E0E0E0',
    backgroundColor: '#FFFFFF',
  },
  footerButton: {
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
    marginLeft: Spacing.sm,
  },
  footerButtonText: {
    color: '#2E5FA3',
    fontSize: 14,
    fontWeight: '500',
    letterSpacing: 1,
  },
});