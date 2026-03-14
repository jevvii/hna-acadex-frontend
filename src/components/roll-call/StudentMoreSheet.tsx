import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Modal, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Spacing, Radius } from '@/constants/colors';

interface StudentMoreSheetProps {
  visible: boolean;
  student: {
    student_id: string;
    student_name: string;
  } | null;
  onClose: () => void;
  onAddNote?: () => void;
  onViewHistory?: () => void;
  onContactParent?: () => void;
}

export function StudentMoreSheet({ visible, student, onClose, onAddNote, onViewHistory, onContactParent }: StudentMoreSheetProps) {
  if (!student) return null;

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={styles.sheet}>
          <View style={styles.handle} />
          <Text style={styles.title}>{student.student_name}</Text>
          <ScrollView>
            <TouchableOpacity style={styles.option} onPress={onAddNote}>
              <View style={styles.optionIcon}>
                <Ionicons name="create-outline" size={22} color={Colors.primary} />
              </View>
              <Text style={styles.optionText}>Add Note</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.option} onPress={onViewHistory}>
              <View style={styles.optionIcon}>
                <Ionicons name="time-outline" size={22} color={Colors.primary} />
              </View>
              <Text style={styles.optionText}>View History</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.option} onPress={onContactParent}>
              <View style={styles.optionIcon}>
                <Ionicons name="call-outline" size={22} color={Colors.primary} />
              </View>
              <Text style={styles.optionText}>Contact Parent</Text>
            </TouchableOpacity>
          </ScrollView>
          <TouchableOpacity style={styles.closeBtn} onPress={onClose}>
            <Text style={styles.closeText}>Close</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  sheet: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: Radius.xl,
    borderTopRightRadius: Radius.xl,
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.xxl,
    maxHeight: '60%',
  },
  handle: {
    width: 40,
    height: 4,
    backgroundColor: '#E0E0E0',
    borderRadius: 2,
    alignSelf: 'center',
    marginTop: 12,
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.primary,
    marginTop: Spacing.lg,
    marginBottom: Spacing.md,
  },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  optionIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.primary + '15',
    alignItems: 'center',
    justifyContent: 'center',
  },
  optionText: {
    marginLeft: Spacing.md,
    fontSize: 15,
    fontWeight: '500',
    color: '#1F2937',
  },
  closeBtn: {
    marginTop: Spacing.lg,
    paddingVertical: Spacing.md,
    borderRadius: Radius.md,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
  },
  closeText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#64748B',
  },
});