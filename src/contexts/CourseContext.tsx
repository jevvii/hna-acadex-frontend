// src/contexts/CourseContext.tsx
// Shared context for course screen state management

import React, { createContext, useContext, useState, useCallback, useEffect, useMemo } from 'react';
import { useLocalSearchParams } from 'expo-router';
import { useAuth } from '@/contexts/AuthContext';
import { api } from '@/lib/api';
import { WeeklyModule, Activity, CourseFile, Announcement, Quiz, AttendanceStatus } from '@/types';

// Tab types
export type CourseTab = 'modules' | 'assignments' | 'files' | 'announcements' | 'quizzes' | 'attendance' | 'grades';

// Attendance record type for student view
export interface AttendanceRecordItem {
  meeting_id: string;
  student_id: string;
  status: AttendanceStatus;
}

// Attendance session type
export interface AttendanceSession {
  id: string;
  date: string;
  title: string;
  created_by?: string;
}

// Attendance student for teacher view
export interface AttendanceStudent {
  id: string;
  full_name: string;
}

// Course data interface
export interface CourseData {
  modules: WeeklyModule[];
  activities: Activity[];
  files: CourseFile[];
  announcements: Announcement[];
  quizzes: Quiz[];
}

// Context value type
interface CourseContextValue {
  // Course info
  courseId: string | undefined;
  courseTitle: string | undefined;
  isTeacher: boolean;
  isAdmin: boolean;
  canManage: boolean;

  // Data
  modules: WeeklyModule[];
  activities: Activity[];
  files: CourseFile[];
  announcements: Announcement[];
  quizzes: Quiz[];

  // Loading states
  loading: boolean;
  refreshing: boolean;

  // Attendance
  attendanceLoading: boolean;
  attendanceSessions: AttendanceSession[];
  attendanceStudents: AttendanceStudent[];
  attendanceRecordMap: Record<string, AttendanceStatus>;
  studentAttendanceSummary: any;
  studentAttendanceHistory: any[];

  // Actions
  fetchData: () => Promise<void>;
  fetchAttendanceData: () => Promise<void>;
  refresh: () => void;

  // Module helpers
  moduleById: Map<string, WeeklyModule>;
  weekLabel: (weeklyModuleId?: string) => string;
}

const CourseContext = createContext<CourseContextValue | null>(null);

export function CourseProvider({ children }: { children: React.ReactNode }) {
  const { id, title } = useLocalSearchParams<{ id: string; title?: string }>();
  const { user } = useAuth();

  // Role checks
  const isTeacher = user?.role === 'teacher';
  const isAdmin = user?.role === 'admin';
  const canManage = isTeacher || isAdmin;

  // Data states
  const [modules, setModules] = useState<WeeklyModule[]>([]);
  const [activities, setActivities] = useState<Activity[]>([]);
  const [files, setFiles] = useState<CourseFile[]>([]);
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [quizzes, setQuizzes] = useState<Quiz[]>([]);

  // Loading states
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [attendanceLoading, setAttendanceLoading] = useState(false);

  // Attendance states
  const [attendanceSessions, setAttendanceSessions] = useState<AttendanceSession[]>([]);
  const [attendanceStudents, setAttendanceStudents] = useState<AttendanceStudent[]>([]);
  const [attendanceRecordMap, setAttendanceRecordMap] = useState<Record<string, AttendanceStatus>>({});
  const [studentAttendanceSummary, setStudentAttendanceSummary] = useState<any>(null);
  const [studentAttendanceHistory, setStudentAttendanceHistory] = useState<any[]>([]);

  // Fetch course content
  const fetchData = useCallback(async () => {
    if (!id) return;
    try {
      const data = await api.get(`/course-sections/${id}/content/`);
      setModules((data.modules || []) as WeeklyModule[]);
      setActivities((data.activities || []) as Activity[]);
      setFiles((data.files || []) as CourseFile[]);
      setAnnouncements((data.announcements || []) as Announcement[]);
      setQuizzes((data.quizzes || []) as Quiz[]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [id]);

  // Build attendance map helper
  const buildAttendanceMap = (records: any[]) => {
    const map: Record<string, AttendanceStatus> = {};
    records.forEach((r) => {
      map[`${r.meeting_id}:${r.student_id}`] = r.status as AttendanceStatus;
    });
    return map;
  };

  // Fetch attendance data
  const fetchAttendanceData = useCallback(async () => {
    if (!id) return;
    setAttendanceLoading(true);
    try {
      const data = await api.get(`/course-sections/${id}/attendance/`);
      setAttendanceSessions(data.sessions || []);
      if (canManage) {
        setAttendanceStudents(data.students || []);
        setAttendanceRecordMap(buildAttendanceMap(data.records || []));
      } else {
        setStudentAttendanceSummary(data.summary || null);
        setStudentAttendanceHistory(data.history || []);
      }
    } catch {
      if (!canManage) {
        setStudentAttendanceSummary(null);
        setStudentAttendanceHistory([]);
      }
    } finally {
      setAttendanceLoading(false);
    }
  }, [id, canManage]);

  // Refresh handler
  const refresh = useCallback(() => {
    setRefreshing(true);
    fetchData();
    fetchAttendanceData();
  }, [fetchData, fetchAttendanceData]);

  // Initial fetch
  useEffect(() => {
    fetchData();
    fetchAttendanceData();
  }, [fetchData, fetchAttendanceData]);

  // Periodic attendance refresh for teachers
  useEffect(() => {
    const timer = setInterval(() => {
      fetchAttendanceData();
    }, 20000);
    return () => clearInterval(timer);
  }, [fetchAttendanceData]);

  // Module lookup map
  const moduleById = useMemo(() => {
    const map = new Map<string, WeeklyModule>();
    modules.forEach((m) => map.set(m.id, m));
    return map;
  }, [modules]);

  // Week label helper
  const weekLabel = useCallback((weeklyModuleId?: string) => {
    if (!weeklyModuleId) return 'Unassigned Topic';
    const module = moduleById.get(weeklyModuleId);
    if (!module) return 'Unassigned Topic';
    return `Week ${module.week_number}: ${module.title}`;
  }, [moduleById]);

  const value: CourseContextValue = {
    courseId: id,
    courseTitle: title,
    isTeacher,
    isAdmin,
    canManage,
    modules,
    activities,
    files,
    announcements,
    quizzes,
    loading,
    refreshing,
    attendanceLoading,
    attendanceSessions,
    attendanceStudents,
    attendanceRecordMap,
    studentAttendanceSummary,
    studentAttendanceHistory,
    fetchData,
    fetchAttendanceData,
    refresh,
    moduleById,
    weekLabel,
  };

  return (
    <CourseContext.Provider value={value}>
      {children}
    </CourseContext.Provider>
  );
}

export function useCourse() {
  const context = useContext(CourseContext);
  if (!context) {
    throw new Error('useCourse must be used within a CourseProvider');
  }
  return context;
}