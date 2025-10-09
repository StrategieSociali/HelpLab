import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import ProtectedRoute from './components/ProtectedRoute';
import Login from './pages/Login';
import Register from './pages/Register';
import HomepageStatic from './pages/HomepageStatic';
import '@/styles/styles.css';
import Challenges from './pages/Challenges';
import CreateChallenge from "@/pages/challenges/CreateChallenge";
import LearningPaths from './pages/LearningPaths.jsx';
import UserProfile from './pages/UserProfile'; //-> attivare quando si parte con la registrazione
import Header from './components/common/Header';
import Footer from './components/common/Footer';
import NotFound from './pages/NotFound';
import JoinHelpLab from './pages/JoinHelpLab';
import './App.css';
import { routes } from './routes';
import { AuthProvider } from './context/AuthContext';
import { AdminProposals } from './pages/admin/AdminProposals';
import BusinessPackages from './pages/BusinessPackages.jsx';
import StepAssignJudge from './pages/admin/steps/StepAssignJudge';

export default function App() {
  return (
    <AuthProvider>
      <Router>
        <div className="App">
          {/* Intestazione */}
          <Header />
        <main>
  <Routes>
    {/* Pubbliche */}
    <Route path={routes.home} element={<HomepageStatic />} />
    <Route path={routes.auth.login} element={<Login />} />
    <Route path={routes.auth.register} element={<Register />} />
    <Route path={routes.joinHelpLab} element={<JoinHelpLab />} />
    <Route path={routes.dashboard.learningPaths} element={<LearningPaths />} />
    <Route path={routes.business.packages} element={<BusinessPackages />} />
    <Route
      path="/learningpaths"
      element={<Navigate to={routes.dashboard.learningPaths} replace />}
    />

    {/* Sfide — ora pubblica per la demo */}
    <Route path={routes.dashboard.challenges} element={<Challenges />} />

    {/* Protette */}
    <Route
      path={routes.dashboard.userProfile}
      element={
        <ProtectedRoute>
          <UserProfile />
        </ProtectedRoute>
      }
    />
    <Route
  path={routes.dashboard.challengeCreate}
  element={
    <ProtectedRoute>
      <CreateChallenge />
    </ProtectedRoute>
  }
/>
<Route
  path={routes.admin.proposals}
  element={
    <ProtectedRoute>
      <AdminProposals />
    </ProtectedRoute>
  }
/>
<Route path={routes.admin.assignJudge} element={
  <ProtectedRoute requireAdmin>
    <StepAssignJudge />
  </ProtectedRoute>
} />

    {/* Fallback 404 */}
    <Route path="*" element={<NotFound />} />
  </Routes>
</main>

          {/* Footer */}
          <Footer />
        </div>
      </Router>
    </AuthProvider>
  );
}
