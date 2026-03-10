// src/App.jsx
import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';

import { routes } from './routes';

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
import ChallengeLiveDashboard from './pages/challenges/ChallengeLiveDashboard';
import CreateChallenge from './pages/challenges/CreateChallenge';

import MyContributions from "@/pages/me/MyContributions";
import UserProfile from './pages/UserProfile';
import LearningPaths from './pages/LearningPaths';
import AdminLearningPaths from './pages/admin/AdminLearningPaths';
import Leaderboard from './pages/Leaderboard';
import BusinessPackages from './pages/BusinessPackages';
import Roadmap from './pages/Roadmap';

import { AdminProposals } from './pages/admin/AdminProposals';
import StepAssignJudge from './pages/admin/steps/StepAssignJudge';
import AdminEvents from './pages/admin/AdminEvents';

import JudgeDashboard from './pages/judge/JudgeDashboard';
import JudgeChallengeOverview from './pages/judge/JudgeChallengeOverview';

import SponsorPublicProfile from './pages/sponsors/SponsorPublicProfile';
import SponsorsList from "./pages/sponsors/SponsorsList";
import SponsorProfileEditor from "./pages/sponsors/SponsorProfileEditor";
import SponsorGuide from "./pages/sponsors/SponsorGuide";
import SponsorshipRequestForm from "./pages/sponsors/SponsorshipRequestForm";
import MySponsorships from "./pages/sponsors/MySponsorships";
import AdminSponsorships from "./pages/admin/AdminSponsorships";

// ── 🎉 EVENTI (sprint events v1.1) ──────────────────────────────────────────
import EventsList from './pages/events/EventsList';
import EventDetail from './pages/events/EventDetail';
import EventLiveDashboard from './pages/events/EventLiveDashboard';
import CreateEvent from './pages/events/CreateEvent';
import EditEvent from './pages/events/EditEvent';
import MyEvents from './pages/events/MyEvents';

import '@/styles/styles.css';


export default function App() {
  return (
    <AuthProvider>
      <Router>
        <div className="App">
          <Header />

          <main>
            <Routes>

              {/* ===== PUBBLICHE ===== */}
              <Route path={routes.home}          element={<HomepageStatic />} />
              <Route path={routes.auth.login}    element={<Login />} />
              <Route path={routes.auth.register} element={<Register />} />
              <Route path={routes.joinHelpLab}   element={<JoinHelpLab />} />
              <Route path={routes.info}          element={<WelcomeInfo />} />
              <Route path={routes.leaderboard}   element={<Leaderboard />} />
              <Route path={routes.business.packages}      element={<BusinessPackages />} />
              <Route path={routes.roadmap}                element={<Roadmap />} />
              <Route path={routes.dashboard.learningPaths} element={<LearningPaths />} />

              {/* ===== COMMUNITY / SPONSORS ===== */}
              <Route path={routes.community.sponsors}          element={<SponsorsList />} />
              <Route path={routes.community.sponsorProfile()}  element={<SponsorPublicProfile />} />
              {/* Guida sponsorizzazioni — pubblica, accessibile senza login */}
              <Route path={routes.community.sponsorGuide}        element={<SponsorGuide />} />

              {/* redirect legacy */}
              <Route
                path="/learningpaths"
                element={<Navigate to={routes.dashboard.learningPaths} replace />}
              />

              {/* ===== EVENTI (pubblici — nessun token richiesto) ===== */}
              <Route path={routes.events.list}     element={<EventsList />} />
              <Route path={routes.events.detail()} element={<EventDetail />} />
              <Route path={routes.events.live()}   element={<EventLiveDashboard />} />

              {/* ===== EVENTI — AREA PERSONALE ===== */}
              {/* I miei eventi — tutti i ruoli autenticati */}
              <Route
                path={routes.events.mine}
                element={
                  <ProtectedRoute allowedRoles={['user', 'judge', 'admin', 'sponsor']}>
                    <MyEvents />
                  </ProtectedRoute>
                }
              />
              {/* Crea evento — tutti i ruoli autenticati (BE crea in draft, admin approva) */}
              <Route
                path={routes.events.create}
                element={
                  <ProtectedRoute allowedRoles={['user', 'judge', 'admin', 'sponsor']}>
                    <CreateEvent />
                  </ProtectedRoute>
                }
              />
              {/* Modifica evento — creatore o admin (guard ruolo nel componente) */}
              <Route
                path={routes.events.edit()}
                element={
                  <ProtectedRoute allowedRoles={['user', 'judge', 'admin', 'sponsor']}>
                    <EditEvent />
                  </ProtectedRoute>
                }
              />

              {/* ===== CHALLENGES (pubbliche + user) ===== */}
              <Route path={routes.dashboard.challenges} element={<Challenges />} />
              <Route path={routes.dashboard.challengeLive()} element={<ChallengeLiveDashboard />} />

              <Route
                path={routes.dashboard.challengeSubmit}
                element={
                  <ProtectedRoute allowedRoles={['user']}>
                    <ChallengeSubmitPage />
                  </ProtectedRoute>
                }
              />

              {/* ===== ME / USER AREA ===== */}
              <Route
                path={routes.me.contributions}
                element={
                  <ProtectedRoute allowedRoles={['user', 'judge', 'admin']}>
                    <MyContributions />
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

              {/* ===== SPONSOR ===== */}
              <Route
                path={routes.community.sponsorEdit}
                element={
                  <ProtectedRoute allowedRoles={['sponsor']}>
                    <SponsorProfileEditor />
                  </ProtectedRoute>
                }
              />
              {/* Form candidatura sponsorizzazione — riceve ?challenge=ID opzionale */}
              <Route
                path={routes.community.sponsorshipRequest()}
                element={
                  <ProtectedRoute allowedRoles={['sponsor']}>
                    <SponsorshipRequestForm />
                  </ProtectedRoute>
                }
              />
              {/* Dashboard candidature sponsor — lista + stati pagamento */}
              <Route
                path={routes.community.mySponsorships}
                element={
                  <ProtectedRoute allowedRoles={['sponsor']}>
                    <MySponsorships />
                  </ProtectedRoute>
                }
              />

              {/* ===== CHALLENGES — CREAZIONE ===== */}
              <Route
                path={routes.dashboard.challengeCreate}
                element={
                  <ProtectedRoute allowedRoles={['admin', 'sponsor']}>
                    <CreateChallenge />
                  </ProtectedRoute>
                }
              />

              {/* ===== EVENTI — CREAZIONE (admin) ===== */}
              {/* ⚠️  ATTENZIONE: routes.events.create è già definito sopra per tutti i ruoli.
                  Questa route non viene mai raggiunta dal router (vince sempre la prima).
                  Da risolvere in uno sprint dedicato alla gestione permessi eventi. */}
              <Route
                path={routes.events.create}
                element={
                  <ProtectedRoute allowedRoles={['admin']}>
                    <CreateEvent />
                  </ProtectedRoute>
                }
              />

              {/* ===== GIUDICI ===== */}
              <Route
                path={routes.judge.dashboard}
                element={
                  <ProtectedRoute allowedRoles={['judge', 'admin']}>
                    <JudgeDashboard />
                  </ProtectedRoute>
                }
              />
              <Route
                path={routes.judge.challengeOverview()}
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
              <Route
                path={routes.admin.events}
                element={
                  <ProtectedRoute allowedRoles={['admin']}>
                    <AdminEvents />
                  </ProtectedRoute>
                }
              />
              {/* Pannello admin: candidature sponsorizzazione + role requests */}
              <Route
                path={routes.admin.sponsorships}
                element={
                  <ProtectedRoute allowedRoles={['admin']}>
                    <AdminSponsorships />
                  </ProtectedRoute>
                }
              />
              <Route
                path={routes.admin.learningPaths}
                element={
                 <ProtectedRoute allowedRoles={['admin']}>
                   <AdminLearningPaths />
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
