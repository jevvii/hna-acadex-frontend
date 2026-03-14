// src/components/shared/ReminderPickerDialog.tsx
//
// A Material Design-style dialog for selecting due date reminders.
// Shows preset options (when deadline exists) and custom option that opens date/time pickers.

import React, { useState, useCallback, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  Pressable,
  TouchableOpacity,
} from 'react-native';
import { Colors, Spacing, Radius } from '@/constants/colors';
import { DatePickerModal } from './DatePickerModal';
import { TimePickerModal } from './TimePickerModal';

export interface ReminderOption {
  id: string;
  label: string;
  value: number | null;
  unit: 'minutes' | 'hours' | 'days' | 'weeks' | null;
}

const PRESET_OPTIONS: ReminderOption[] = [
  { id: '5min', label: '5 Minutes Before', value: 5, unit: 'minutes' },
  { id: '15min', label: '15 Minutes Before', value: 15, unit: 'minutes' },
  { id: '30min', label: '30 Minutes Before', value: 30, unit: 'minutes' },
  { id: '1hr', label: '1 Hour Before', value: 1, unit: 'hours' },
  { id: '1day', label: '1 Day Before', value: 1, unit: 'days' },
  { id: '1week', label: '1 Week Before', value: 7, unit: 'days' },
];

const CUSTOM_OPTION: ReminderOption = {
  id: 'custom',
  label: 'Custom',
  value: null,
  unit: null,
};

export interface ReminderValue {
  id: string;
  value: number;
  unit: 'minutes' | 'hours' | 'days' | 'weeks';
  reminderDate: Date; // The calculated date/time when the reminder should trigger
}

interface ReminderPickerDialogProps {
  visible: boolean;
  onSelect: (reminder: ReminderValue) => void;
  onClose: () => void;
  deadline?: Date;
}

// Calculate reminder date from deadline and offset
function calculateReminderDate(
  deadline: Date,
  value: number,
  unit: 'minutes' | 'hours' | 'days' | 'weeks'
): Date {
  const reminderDate = new Date(deadline);

  switch (unit) {
    case 'minutes':
      reminderDate.setMinutes(reminderDate.getMinutes() - value);
      break;
    case 'hours':
      reminderDate.setHours(reminderDate.getHours() - value);
      break;
    case 'days':
      reminderDate.setDate(reminderDate.getDate() - value);
      break;
    case 'weeks':
      reminderDate.setDate(reminderDate.getDate() - (value * 7));
      break;
  }

  return reminderDate;
}

export function ReminderPickerDialog({
  visible,
  onSelect,
  onClose,
  deadline,
}: ReminderPickerDialogProps) {
  const hasDeadline = !!deadline;

  // State for date/time pickers
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [pendingReminderDate, setPendingReminderDate] = useState<Date>(new Date());

  // Options to show - only presets if deadline exists, otherwise just custom
  const options = useMemo(() => {
    if (hasDeadline) {
      return [...PRESET_OPTIONS, CUSTOM_OPTION];
    }
    return [CUSTOM_OPTION];
  }, [hasDeadline]);

  const resetState = useCallback(() => {
    setPendingReminderDate(new Date());
  }, []);

  useEffect(() => {
    if (!visible) {
      resetState();
    }
  }, [visible, resetState]);

  const handleClose = useCallback(() => {
    resetState();
    onClose();
  }, [resetState, onClose]);

  // Handle preset option selection (immediately select and close)
  const handlePresetSelect = useCallback((option: ReminderOption) => {
    if (!deadline || option.value === null || !option.unit) return;

    const reminderDate = calculateReminderDate(deadline, option.value, option.unit);

    const reminder: ReminderValue = {
      id: option.id,
      value: option.value,
      unit: option.unit,
      reminderDate,
    };

    onSelect(reminder);
    handleClose();
  }, [deadline, onSelect, handleClose]);

  // Handle custom option selection - opens date/time picker sequence
  const handleCustomSelect = useCallback(() => {
    setShowDatePicker(true);
  }, []);

  // Handle date selection from date picker
  const handleDateChange = useCallback((date: Date) => {
    setPendingReminderDate(date);
    setShowDatePicker(false);
    setShowTimePicker(true);
  }, []);

  // Handle time selection from time picker
  const handleTimeChange = useCallback((date: Date) => {
    setPendingReminderDate(date);
    setShowTimePicker(false);

    // Create reminder and call onSelect
    const reminder: ReminderValue = {
      id: `custom-${Date.now()}`,
      value: 0,
      unit: 'minutes',
      reminderDate: date,
    };

    onSelect(reminder);
    handleClose();
  }, [onSelect, handleClose]);

  // Handle cancel from date picker
  const handleDatePickerCancel = useCallback(() => {
    setShowDatePicker(false);
    // Don't close the whole dialog, just the picker
  }, []);

  // Handle cancel from time picker
  const handleTimePickerCancel = useCallback(() => {
    setShowTimePicker(false);
    handleClose();
  }, [handleClose]);

  return (
    <>
      <Modal
        visible={visible && !showDatePicker && !showTimePicker}
        transparent
        animationType="fade"
        onRequestClose={handleClose}
      >
        <Pressable style={styles.backdrop} onPress={handleClose}>
          <Pressable
            style={[styles.modal, { backgroundColor: '#FFFFFF' }]}
            onPress={(e) => e.stopPropagation()}
          >
            {/* Title */}
            <Text style={styles.title}>Reminder</Text>

            {/* Options List */}
            <View style={styles.optionsList}>
              {options.map((option) => (
                <TouchableOpacity
                  key={option.id}
                  style={styles.optionItem}
                  onPress={() => {
                    if (option.id === 'custom') {
                      handleCustomSelect();
                    } else {
                      handlePresetSelect(option);
                    }
                  }}
                  activeOpacity={0.7}
                >
                  <View style={styles.radioButton}>
                    <View style={styles.radioButtonInner} />
                  </View>
                  <Text style={styles.optionLabel}>{option.label}</Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* Footer */}
            <View style={styles.footer}>
              <TouchableOpacity onPress={handleClose} style={styles.cancelButton}>
                <Text style={styles.cancelButtonText}>CANCEL</Text>
              </TouchableOpacity>
            </View>
          </Pressable>
        </Pressable>
      </Modal>

      {/* Date Picker Modal */}
      <DatePickerModal
        visible={showDatePicker}
        value={pendingReminderDate}
        onChange={handleDateChange}
        onClose={handleDatePickerCancel}
        minDate={new Date()}
        maxDate={deadline}
        title="Select Reminder Date"
      />

      {/* Time Picker Modal */}
      <TimePickerModal
        visible={showTimePicker}
        value={pendingReminderDate}
        onChange={handleTimeChange}
        onClose={handleTimePickerCancel}
        title="Select Reminder Time"
      />
    </>
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
    width: '90%',
    maxWidth: 400,
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 16,
    paddingTop: 24,
    paddingBottom: 8,
    paddingHorizontal: 24,
  },
  title: {
    fontSize: 20,
    fontWeight: '400',
    color: '#1A1A1A',
    marginBottom: 16,
  },
  optionsList: {
    gap: 0,
  },
  optionItem: {
    height: 52,
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 4,
    paddingHorizontal: 0,
  },
  radioButton: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    borderColor: '#AAAAAA',
    marginRight: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioButtonInner: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: 'transparent',
  },
  optionLabel: {
    fontSize: 16,
    fontWeight: '400',
    color: '#1A1A1A',
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    paddingTop: 8,
    paddingBottom: 8,
    marginTop: 8,
  },
  cancelButton: {
    paddingHorizontal: 8,
    paddingVertical: 12,
  },
  cancelButtonText: {
    color: Colors.primaryLight,
    fontSize: 14,
    fontWeight: '500',
    letterSpacing: 0.5,
  },
});