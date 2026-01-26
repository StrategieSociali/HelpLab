//App.jsx
import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';

import { AuthProvider } from './context/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';

import Header from './components/common/Header';
import Footer from './components/common/Footer';

import HomepageStatic from './pages/HomepageStatic';
import Login from './pages/Login';
import Register from './pages/Register';
import NotFound from './pages/NotFound';
import JoinHelpLab from './pages/JoinHelpLab';
import WelcomeInfo from './pages/WelcomeInfo';

import Challenges from './pages/Challenges';
import ChallengeSubmitPage from './pages/challenges/ChallengeSubmitPage';
import ChallengeSubmissions from './pages/challenges/ChallengeSubmissions';

import UserProfile from './pages/UserProfile';
import CreateChallenge from './pages/challenges/CreateChallenge';
import LearningPaths from './pages/LearningPaths';
import Leaderboard from './pages/Leaderboard';
import BusinessPackages from './pages/BusinessPackages';
import Roadmap from './pages/Roadmap';

import { AdminProposals } from './pages/admin/AdminProposals';
import StepAssignJudge from './pages/admin/steps/StepAssignJudge';

// ⚖️ NUOVO: giudici e sponsor v0.8
import JudgeDashboard from './pages/judge/JudgeDashboard';
import JudgeChallengeOverview from './pages/judge/JudgeChallengeOverview';
import SponsorPublicProfile from './pages/sponsors/SponsorPublicProfile';
import SponsorsList from "./pages/sponsors/SponsorsList";
import SponsorProfileEditor from "./pages/sponsors/SponsorProfileEditor";

import { routes } from './routes';

import '@/styles/styles.css';
import './App.css';

export default function App() {
  return (
    <AuthProvider>
      <Router>
        <div className="App">
          <Header />

          <main>
            <Routes>

              {/* ===== PUBBLICHE ===== */}
              <Route path={routes.home} element={<HomepageStatic />} />
              <Route path={routes.auth.login} element={<Login />} />
              <Route path={routes.auth.register} element={<Register />} />
              <Route path={routes.joinHelpLab} element={<JoinHelpLab />} />
              <Route path={routes.info} element={<WelcomeInfo />} />

              <Route path={routes.leaderboard} element={<Leaderboard />} />
              <Route path={routes.business.packages} element={<BusinessPackages />} />
              <Route path={routes.roadmap} element={<Roadmap />} />
              <Route path={routes.dashboard.learningPaths} element={<LearningPaths />} />
              
              {/* ===== COMMUNITY / SPONSORS ===== */}
              <Route path={routes.community.sponsors} element={<SponsorsList />} />
              <Route path={routes.community.sponsorProfile()} element={<SponsorPublicProfile />} />

              {/* redirect legacy */}
              <Route
                path="/learningpaths"
                element={<Navigate to={routes.dashboard.learningPaths} replace />}
              />

              {/* ===== CHALLENGES (pubbliche + user) ===== */}
              <Route path={routes.dashboard.challenges} element={<Challenges />} />

              <Route
                path="/challenges/:id/submit"
                element={
                  <ProtectedRoute allowedRoles={['user']}>
                    <ChallengeSubmitPage />
                  </ProtectedRoute>
                }
              />

              <Route
                path={routes.dashboard.challengeSubmissions}
                element={
                  <ProtectedRoute allowedRoles={['admin', 'judge']}>
                    <ChallengeSubmissions />
                  </ProtectedRoute>
                }
              />

              {/* ===== USER ===== */}
              <Route
                path={routes.dashboard.userProfile}
                element={
                  <ProtectedRoute allowedRoles={['user', 'judge', 'admin', 'sponsor']}>
                    <UserProfile />
                  </ProtectedRoute>
                }
              />
    
                  {/* ===== SPONSOR PROFILE ===== */}
              <Route
                path={routes.community.sponsorEdit}
                element={
                 <ProtectedRoute allowedRoles={['sponsor']}>
                   <SponsorProfileEditor />
                 </ProtectedRoute>
                }
              />

              {/* ===== CREAZIONE CHALLENGE ===== */}
              <Route
                path={routes.dashboard.challengeCreate}
                element={
                  <ProtectedRoute allowedRoles={['admin', 'sponsor']}>
                    <CreateChallenge />
                  </ProtectedRoute>
                }
              />

              {/* ===== GIUDICI v0.8 ===== */}
              <Route
                path="/judge"
                element={
                  <ProtectedRoute allowedRoles={['judge', 'admin']}>
                    <JudgeDashboard />
                  </ProtectedRoute>
                }
              />

              <Route
                path="/judge/challenges/:id"
                element={
                  <ProtectedRoute allowedRoles={['judge', 'admin']}>
                    <JudgeChallengeOverview />
                  </ProtectedRoute>
                }
              />

              {/* ===== ADMIN ===== */}
              <Route
                path={routes.admin.proposals}
                element={
                  <ProtectedRoute allowedRoles={['admin']}>
                    <AdminProposals />
                  </ProtectedRoute>
                }
              />

              <Route
                path={routes.admin.assignJudge}
                element={
                  <ProtectedRoute allowedRoles={['admin']}>
                    <StepAssignJudge />
                  </ProtectedRoute>
                }
              />

              {/* ===== 404 ===== */}
              <Route path="*" element={<NotFound />} />

            </Routes>
          </main>

          <Footer />
        </div>
      </Router>
    </AuthProvider>
  );
}

