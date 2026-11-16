import React, { useEffect, useState } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { Navbar } from './components/Navbar';
import { Sidebar } from './components/Sidebar';
import { Login } from './pages/Login';
import { JoinSession } from './pages/student/JoinSession';
import { StudentLive } from './pages/student/StudentLive';
import { TeacherDashboard } from './pages/teacher/TeacherDashboard';
import { QuizEditor } from './pages/teacher/QuizEditor';
import { LiveSessionControl } from './pages/teacher/LiveSessionControl';
import { Reports } from './pages/teacher/Reports';
import { ProjectionScreen } from './pages/projection/ProjectionScreen';
import { AdminDashboard } from './pages/admin/AdminDashboard';
import { API, getAuthToken } from './services/api';

const AppLayout: React.FC<{ children: React.ReactNode; user: any }> = ({ children, user }) => {
  const location = useLocation();
  const isCleanView =
    location.pathname.startsWith('/live') ||
    location.pathname.startsWith('/projection') ||
    location.pathname === '/join' ||
    location.pathname === '/login';

  if (isCleanView) {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col">
        {location.pathname !== '/projection' && !location.pathname.startsWith('/projection/') && (
          <Navbar user={user} />
        )}
        <main className="flex-1">{children}</main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col">
      <Navbar user={user} />
      <div className="flex-1 flex">
        <Sidebar role={user?.role} />
        <main className="flex-1 p-4 lg:p-8 max-w-7xl mx-auto w-full">{children}</main>
      </div>
    </div>
  );
};

export const App: React.FC = () => {
  const [currentUser, setCurrentUser] = useState<any>(null);

  useEffect(() => {
    const token = getAuthToken();
    if (token) {
      const saved = localStorage.getItem('aulalive_user');
      if (saved) setCurrentUser(JSON.parse(saved));

      API.getMe().then(res => {
        if (res.success && res.user) {
          setCurrentUser(res.user);
          localStorage.setItem('aulalive_user', JSON.stringify(res.user));
        }
      }).catch(() => {
        setCurrentUser(null);
      });
    }
  }, []);

  return (
    <BrowserRouter>
      <AppLayout user={currentUser}>
        <Routes>
          <Route path="/" element={<Navigate to="/teacher" replace />} />
          <Route path="/login" element={<Login />} />
          <Route path="/join" element={<JoinSession />} />
          <Route path="/live/:sessionId" element={<StudentLive />} />
          <Route path="/projection/:sessionId" element={<ProjectionScreen />} />

          {/* Teacher Routes */}
          <Route path="/teacher" element={<TeacherDashboard />} />
          <Route path="/teacher/quizzes/new" element={<QuizEditor />} />
          <Route path="/teacher/quizzes/:id/edit" element={<QuizEditor />} />
          <Route path="/teacher/session/:sessionId" element={<LiveSessionControl />} />
          <Route path="/teacher/reports" element={<Reports />} />

          {/* Admin Routes */}
          <Route path="/admin" element={<AdminDashboard />} />
          <Route path="/admin/*" element={<AdminDashboard />} />

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </AppLayout>
    </BrowserRouter>
  );
};

export default App;

