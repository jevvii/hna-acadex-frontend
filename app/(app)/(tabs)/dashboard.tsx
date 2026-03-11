// app/(app)/(tabs)/dashboard.tsx
import { useAuth } from '@/contexts/AuthContext';
import { StudentDashboard } from '@/components/screens/student/StudentDashboard';
import { TeacherDashboard } from '@/components/screens/teacher/TeacherDashboard';
import { AdminDashboard } from '@/components/screens/admin/AdminDashboard';

export default function DashboardTab() {
  const { user } = useAuth();

  if (user?.role === 'admin') return <AdminDashboard />;
  if (user?.role === 'teacher') return <TeacherDashboard />;
  return <StudentDashboard />;
}
