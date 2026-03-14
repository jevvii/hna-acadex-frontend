// src/components/shared/DateTimePickerModal.tsx
//
// A composite modal that coordinates date picker and time picker modals.
// Opens DatePickerModal first, then optionally TimePickerModal if hasTime is true.

import React, { useState, useEffect, useCallback } from 'react';
import { DatePickerModal } from './DatePickerModal';
import { TimePickerModal } from './TimePickerModal';

interface DateTimePickerModalProps {
  visible: boolean;
  value: Date;
  onChange: (date: Date) => void;
  onClose: () => void;
  hasTime?: boolean;
  minDate?: Date;
  maxDate?: Date;
  title?: string;
}

type ModalState = 'closed' | 'date' | 'time';

export function DateTimePickerModal({
  visible,
  value,
  onChange,
  onClose,
  hasTime = true, // Default to true for assignment deadlines
  minDate,
  maxDate,
  title,
}: DateTimePickerModalProps) {
  const [modalState, setModalState] = useState<ModalState>('closed');
  const [pendingDate, setPendingDate] = useState<Date>(value);

  // Manage modal state based on visibility
  useEffect(() => {
    if (visible && modalState === 'closed') {
      setPendingDate(value);
      setModalState('date');
    } else if (!visible && modalState !== 'closed') {
      setModalState('closed');
    }
  }, [visible, modalState, value]);

  const handleDateSelect = useCallback((date: Date) => {
    if (hasTime) {
      // Preserve the time from the original value
      const combinedDate = new Date(date);
      combinedDate.setHours(value.getHours());
      combinedDate.setMinutes(value.getMinutes());
      combinedDate.setSeconds(0);
      setPendingDate(combinedDate);
      setModalState('time');
    } else {
      onChange(date);
      setModalState('closed');
      onClose();
    }
  }, [hasTime, value, onChange, onClose]);

  const handleTimeSelect = useCallback((date: Date) => {
    // Combine the pending date with the selected time
    const combinedDate = new Date(pendingDate);
    combinedDate.setHours(date.getHours());
    combinedDate.setMinutes(date.getMinutes());
    combinedDate.setSeconds(0);
    onChange(combinedDate);
    setModalState('closed');
    onClose();
  }, [pendingDate, onChange, onClose]);

  const handleDateClose = useCallback(() => {
    // User cancelled the date picker - close everything
    setModalState('closed');
    onClose();
  }, [onClose]);

  const handleTimeClose = useCallback(() => {
    // User cancelled the time picker - close and call onChange with pending date
    setModalState('closed');
    onChange(pendingDate);
    onClose();
  }, [pendingDate, onChange, onClose]);

  return (
    <>
      <DatePickerModal
        visible={modalState === 'date'}
        value={pendingDate}
        onChange={handleDateSelect}
        onClose={handleDateClose}
        minDate={minDate}
        maxDate={maxDate}
        title={title}
      />
      {hasTime && (
        <TimePickerModal
          visible={modalState === 'time'}
          value={pendingDate}
          onChange={handleTimeSelect}
          onClose={handleTimeClose}
          title={title}
        />
      )}
    </>
  );
}