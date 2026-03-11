// src/components/shared/CourseCard.tsx
import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ImageBackground, Dimensions } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Spacing, Radius, Shadows } from '@/constants/colors';
import { StudentCourse, TeacherCourse } from '@/types';

const { width } = Dimensions.get('window');
const CARD_HEIGHT = 180;

// Placeholder gradients per subject keyword
const SUBJECT_GRADIENTS: Record<string, [string, string]> = {
  science: ['#1A3A6B', '#0D6E3A'],
  math: ['#0F2147', '#2E5FA3'],
  english: ['#1A3A6B', '#6B1A3A'],
  filipino: ['#C0272D', '#1A3A6B'],
  history: ['#8B4513', '#1A3A6B'],
  ap: ['#8B4513', '#1A3A6B'],
  araling: ['#8B4513', '#1A3A6B'],
  earth: ['#1A3A6B', '#0D6E3A'],
  biology: ['#0D6E3A', '#1A3A6B'],
  chemistry: ['#2E5FA3', '#0F2147'],
  physics: ['#0F2147', '#2E5FA3'],
  default: ['#1A3A6B', '#0F2147'],
};

function getGradient(title: string): [string, string] {
  const lower = title.toLowerCase();
  for (const [key, colors] of Object.entries(SUBJECT_GRADIENTS)) {
    if (lower.includes(key)) return colors;
  }
  return SUBJECT_GRADIENTS.default;
}

// Format course tag with styled "@"
function CourseTag({ tag, style }: { tag: string; style?: object }) {
  const parts = tag.split('@');
  return (
    <View style={[styles.courseTagRow, style]}>
      <Text style={styles.courseTagCode}>{parts[0]}</Text>
      <Text style={styles.courseTagAt}>@</Text>
      <Text style={styles.courseTagSection}>{parts[1] || ''}</Text>
    </View>
  );
}

interface StudentCourseCardProps {
  course: StudentCourse;
  onPress: () => void;
}

export function StudentCourseCard({ course, onPress }: StudentCourseCardProps) {
  const gradient = getGradient(course.course_title);

  return (
    <TouchableOpacity style={[styles.card, Shadows.card]} onPress={onPress} activeOpacity={0.92}>
      {course.cover_image_url ? (
        <ImageBackground
          source={{ uri: course.cover_image_url }}
          style={styles.cardBg}
          imageStyle={{ borderRadius: Radius.lg }}
        >
          <LinearGradient
            colors={['rgba(26,58,107,0.2)', 'rgba(26,58,107,0.85)']}
            style={styles.gradient}
          >
            <CardContent course={course} showGrade />
          </LinearGradient>
        </ImageBackground>
      ) : (
        <LinearGradient colors={gradient} style={[styles.cardBg, { borderRadius: Radius.lg }]}>
          <CardContent course={course} showGrade />
        </LinearGradient>
      )}
    </TouchableOpacity>
  );
}

interface TeacherCourseCardProps {
  course: TeacherCourse;
  onPress: () => void;
}

export function TeacherCourseCard({ course, onPress }: TeacherCourseCardProps) {
  const gradient = getGradient(course.course_title);

  return (
    <TouchableOpacity style={[styles.card, Shadows.card]} onPress={onPress} activeOpacity={0.92}>
      {course.cover_image_url ? (
        <ImageBackground
          source={{ uri: course.cover_image_url }}
          style={styles.cardBg}
          imageStyle={{ borderRadius: Radius.lg }}
        >
          <LinearGradient
            colors={['rgba(26,58,107,0.2)', 'rgba(26,58,107,0.85)']}
            style={styles.gradient}
          >
            <TeacherCardContent course={course} />
          </LinearGradient>
        </ImageBackground>
      ) : (
        <LinearGradient colors={gradient} style={[styles.cardBg, { borderRadius: Radius.lg }]}>
          <TeacherCardContent course={course} />
        </LinearGradient>
      )}
    </TouchableOpacity>
  );
}

function CardContent({ course, showGrade }: { course: StudentCourse; showGrade: boolean }) {
  const hasGrade = typeof course.final_grade === 'number';
  const gradeValue = hasGrade ? Number(course.final_grade).toFixed(2) : null;
  const letter = course.final_grade_letter || '';
  const numeric = hasGrade ? Number(course.final_grade) : null;
  const badgeStyle = numeric == null
    ? styles.gradeBadgeNone
    : numeric >= 90
      ? styles.gradeBadgeHigh
      : numeric >= 75
        ? styles.gradeBadgeGood
        : numeric >= 60
          ? styles.gradeBadgeWarn
          : styles.gradeBadgeLow;
  const gradeTextStyle = numeric == null
    ? styles.gradeTextNone
    : numeric >= 90
      ? styles.gradeTextHigh
      : numeric >= 75
        ? styles.gradeTextGood
        : numeric >= 60
          ? styles.gradeTextWarn
          : styles.gradeTextLow;

  return (
    <View style={styles.cardInner}>
      {/* Grade badge top-right */}
      {showGrade && (
        <View style={[styles.gradeBadge, badgeStyle]}>
          <Text style={[styles.gradeText, gradeTextStyle]}>
            {hasGrade ? `${gradeValue}% ${letter}` : 'No Grade Yet'}
          </Text>
        </View>
      )}
      <View style={styles.cardBottom}>
        <Text style={styles.courseTitle} numberOfLines={2}>{course.course_title}</Text>
        <CourseTag tag={course.course_tag} />
      </View>
    </View>
  );
}

function TeacherCardContent({ course }: { course: TeacherCourse }) {
  return (
    <View style={styles.cardInner}>
      {/* Student count badge */}
      <View style={styles.studentCountBadge}>
        <Ionicons name="people-outline" size={12} color="#FFFFFF" />
        <Text style={styles.studentCountText}>{course.student_count}</Text>
      </View>
      <View style={styles.cardBottom}>
        <Text style={styles.courseTitle} numberOfLines={2}>{course.course_title}</Text>
        <CourseTag tag={course.course_tag} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: Radius.lg,
    height: CARD_HEIGHT,
    marginBottom: Spacing.md,
    overflow: 'hidden',
  },
  cardBg: {
    flex: 1,
    height: CARD_HEIGHT,
  },
  gradient: {
    flex: 1,
    borderRadius: Radius.lg,
  },
  cardInner: {
    flex: 1,
    padding: Spacing.lg,
    justifyContent: 'space-between',
  },
  gradeBadge: {
    alignSelf: 'flex-end',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: Radius.full,
    borderWidth: 1,
  },
  gradeText: {
    fontSize: 12,
    fontWeight: '800',
  },
  gradeBadgeHigh: { backgroundColor: '#E8F5E9', borderColor: '#A5D6A7' },
  gradeBadgeGood: { backgroundColor: '#E3F2FD', borderColor: '#90CAF9' },
  gradeBadgeWarn: { backgroundColor: '#FFF3E0', borderColor: '#FFCC80' },
  gradeBadgeLow: { backgroundColor: '#FFEBEE', borderColor: '#FFCDD2' },
  gradeBadgeNone: { backgroundColor: 'rgba(255,255,255,0.22)', borderColor: 'rgba(255,255,255,0.28)' },
  gradeTextHigh: { color: '#2E7D32' },
  gradeTextGood: { color: '#1565C0' },
  gradeTextWarn: { color: '#ED6C02' },
  gradeTextLow: { color: '#C62828' },
  gradeTextNone: { color: '#FFFFFF' },
  studentCountBadge: {
    alignSelf: 'flex-end',
    backgroundColor: 'rgba(255,255,255,0.2)',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: Radius.full,
  },
  studentCountText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '600',
  },
  cardBottom: {
    gap: 4,
  },
  courseTitle: {
    color: '#FFFFFF',
    fontSize: 17,
    fontWeight: '700',
    lineHeight: 22,
  },
  courseTagRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  courseTagCode: {
    color: 'rgba(255,255,255,0.85)',
    fontSize: 12,
    fontWeight: '600',
  },
  courseTagAt: {
    color: Colors.accentGold,
    fontSize: 12,
    fontWeight: '800',
  },
  courseTagSection: {
    color: 'rgba(255,255,255,0.85)',
    fontSize: 12,
    fontWeight: '600',
  },
});
