# HNA Acadex - Architecture Overview

## What is This App?

HNA Acadex is a mobile app for managing school/college courses. Students can view their courses, submit assignments, and track attendance. Teachers can manage courses, take attendance, and grade students. Admins have full control over the system.

---

## Why React Native?

React Native lets us write the app once and run it on both **iPhone** and **Android**. Instead of maintaining two separate codebases, we have one codebase that works on both platforms.

This app uses **Expo**, which makes development easier by handling native code setup automatically. It also supports running on the web (browser) using React Native Web.

### Key Technologies
| Technology | What It Does |
|------------|--------------|
| React Native | Builds mobile UI for iOS/Android |
| Expo | Handles native features (camera, push notifications, etc.) |
| TypeScript | Adds type safety to prevent bugs |
| Expo Router | Handles app navigation (like web URLs) |
| AsyncStorage | Saves login tokens securely on the device |

---

## The Three Actors

### 1. Student
- Enrolled in courses
- Views assignments, quizzes, announcements
- Submits work
- Checks grades and attendance

### 2. Teacher
- Teaches one or more courses
- Creates assignments and quizzes
- Takes attendance
- Grades student submissions

### 3. Admin
- Full system access
- Manages users and courses
- Can do everything teachers do

---

## Key Components

### Authentication (`src/components/auth/`)
| Component | What It Does |
|-----------|--------------|
| `LoginScreen` | Email/password login |
| `ForgotPasswordScreen` | Reset password |
| `AccountSetupScreen` | First-time password setup |

### Dashboards (`src/components/screens/`)
| Component | Who Uses It | What It Shows |
|-----------|-------------|---------------|
| `StudentDashboard` | Students | Their enrolled courses |
| `TeacherDashboard` | Teachers | Courses they teach |
| `AdminDashboard` | Admins | System overview |

### Course Features (`src/screens/course/`)
| Screen | What It Does |
|--------|--------------|
| `CourseScreen` | Main course page with tabs |
| `CourseAnnouncementsScreen` | Teacher posts updates |
| `CourseDiscussionsScreen` | Class discussions |
| `CourseSyllabusScreen` | Course outline |
| `CoursePeopleScreen` | Students and teachers in course |
| `ActivityDetailsScreen` | View/submit assignments |
| `QuizDetailsScreen` | Take quizzes |

### Roll Call / Attendance (`src/components/roll-call/`)
| Component | What It Does |
|-----------|--------------|
| `RollCallHeader` | Shows date and session info |
| `StudentAttendanceCard` | One student's attendance status |
| `AttendanceSummaryFooter` | Summary statistics |
| `BulkActions` | Quick mark multiple students |

### Gradebook (`src/components/gradebook/`)
| Component | What It Does |
|-----------|--------------|
| `GradebookTable` | Shows all grades in a table |

### Shared Components (`src/components/shared/`)
| Component | What It Does |
|-----------|--------------|
| `TopBar` | Top navigation bar |
| `Sidebar` | Side navigation menu |
| `CourseCard` | Displays course info |
| `DateTimePicker` | Pick dates and times |
| `CircularScore` | Shows score as a circle chart |
| `RichTextInput` | Text editor with formatting |

---

## Global State (Contexts)

Think of "Contexts" as global variables that any part of the app can access.

### AuthContext (`src/contexts/AuthContext.tsx`)
**What it does:** Keeps track of who's logged in.

```
User logs in → AuthContext stores user info → All screens know who you are
```

**Key functions:**
- `signIn(email, password)` - Log in
- `signOut()` - Log out
- `user` - Current user object (or null if logged out)
- `user.role` - Either "student", "teacher", or "admin"

### CourseContext (`src/contexts/CourseContext.tsx`)
**What it does:** Manages data for a specific course.

```
User opens a course → CourseContext fetches data → Displays modules, assignments, etc.
```

**Key data:**
- `modules` - Weekly topics
- `activities` - Assignments
- `announcements` - Teacher updates
- `quizzes` - Tests
- `attendanceSessions` - List of attendance days
- `attendanceRecordMap` - Who was present/absent

### ThemeContext (`src/contexts/ThemeContext.tsx`)
**What it does:** Controls colors (light/dark mode support).

### NotificationContext (`src/contexts/NotificationContext.tsx`)
**What it does:** Handles push notifications (new announcements, assignment due dates, etc.).

---

## API Communication (`src/lib/api.ts`)

The app talks to a backend server (Django). This file handles all HTTP requests.

### How It Works
```
App → api.get('/courses/') → Server → Returns JSON → App displays data
```

### Key Functions
| Function | What It Does |
|----------|--------------|
| `api.get(path)` | Fetch data |
| `api.post(path, body)` | Create something |
| `api.patch(path, body)` | Update something |
| `api.delete(path)` | Delete something |

### Authentication Flow
1. User logs in with email/password
2. Server returns **access token** (short-lived) and **refresh token** (long-lived)
3. App stores tokens in `AsyncStorage`
4. Every request includes the access token
5. If token expires, app automatically uses refresh token to get a new one

---

## Folder Structure

```
src/
├── components/          # UI building blocks
│   ├── auth/            # Login, password screens
│   ├── screens/         # Dashboard screens (student/teacher/admin)
│   ├── shared/          # Reusable components (TopBar, CourseCard, etc.)
│   ├── roll-call/      # Attendance components
│   ├── gradebook/       # Grade display components
│   └── course/         # Course-specific components
├── contexts/           # Global state (Auth, Course, Theme, Notifications)
├── screens/             # Page screens
│   └── course/         # Course-related pages
├── services/            # External services (push notifications, reminders)
├── lib/                 # Utilities (API client)
├── constants/           # Colors, configuration
└── types/              # TypeScript type definitions
```

---

## Data Flow Example: Taking Attendance

1. Teacher opens a course
2. `CourseContext` fetches attendance sessions from server
3. Teacher sees list of students
4. Teacher taps "Present" on a student
5. App calls `api.patch()` to update attendance record
6. Server updates database
7. UI updates to show new status

---

## Summary

| Concept | Simple Explanation |
|---------|---------------------|
| React Native | Write once, run on iPhone + Android |
| Expo | Makes building React Native easier |
| TypeScript | Catches bugs before running |
| Context | Global state accessible anywhere |
| API | Talks to the server |
| Components | Reusable UI building blocks |
| Actors | Student, Teacher, Admin with different permissions |