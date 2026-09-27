import { BrowserRouter as Router, Routes, Route } from 'react-router-dom'
import { AuthProvider } from './context/AuthContext'
import Navbar          from './components/Navbar'
import ProtectedRoute  from './components/ProtectedRoute'
import AdminRoute      from './components/AdminRoute'
import TeacherRoute    from './components/TeacherRoute'

import Home               from './pages/Home'
import Login              from './pages/Login'
import Register           from './pages/Register'
import ProblemsPage       from './pages/ProblemsPage'
import ProblemDetailPage  from './pages/ProblemDetailPage'
import ProfilePage        from './pages/ProfilePage'
import AdminPage          from './pages/AdminPage'
import TeacherDashboard   from './pages/TeacherDashboard'
import ContestsPage       from './pages/ContestsPage'
import ContestDetailPage  from './pages/ContestDetailPage'
import ContestArenePage   from './pages/ContestArenePage'

function App() {
  return (
    <AuthProvider>
      <Router>
        <Routes>
          {/* Contest Arena — full screen, no Navbar */}
          <Route path="/contests/:contestId/problems/:problemId" element={
            <ProtectedRoute><ContestArenePage /></ProtectedRoute>
          } />

          {/* All other pages — with Navbar */}
          <Route path="/*" element={
            <div className="min-h-screen bg-[#0f0f0f] flex flex-col">
              <Navbar />
              <main className="flex-1">
                <Routes>
                  {/* Public */}
                  <Route path="/"            element={<Home />} />
                  <Route path="/login"       element={<Login />} />
                  <Route path="/register"    element={<Register />} />
                  <Route path="/problems"    element={<ProblemsPage />} />
                  <Route path="/problems/:id" element={<ProblemDetailPage />} />
                  <Route path="/contests"    element={<ContestsPage />} />
                  <Route path="/contests/:id" element={<ContestDetailPage />} />

                  {/* Authenticated only */}
                  <Route path="/profile" element={
                    <ProtectedRoute><ProfilePage /></ProtectedRoute>
                  } />

                  {/* Teacher + Admin */}
                  <Route path="/teacher" element={
                    <TeacherRoute><TeacherDashboard /></TeacherRoute>
                  } />

                  {/* Admin only */}
                  <Route path="/admin" element={
                    <AdminRoute><AdminPage /></AdminRoute>
                  } />
                </Routes>
              </main>
            </div>
          } />
        </Routes>
      </Router>
    </AuthProvider>
  )
}

export default App
