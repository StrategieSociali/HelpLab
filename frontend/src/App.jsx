// src/App.jsx
import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';

import { AuthProvider } from './context/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';

import { routes } from './routes';

import Header from './components/common/Header';
import Footer from './components/common/Footer';

import HomepageStatic from './pages/HomepageStatic';
import Login from './pages/Login';
import Register from './pages/Register';
import JoinHelpLab from './pages/JoinHelpLab';

import Challenges from './pages/Challenges';
import LearningPaths from './pages/LearningPaths.jsx';
import UserProfile from './pages/UserProfile';
import NotFound from './pages/NotFound';

// (se il file non esiste ancora, commenta questa import fino a quando lo crei)
import CreateChallenge from './pages/challenges/CreateChallenge';

import '@/styles/styles.css';
import './App.css';

export default function App() {
  return (
    <AuthProvider>
      <Router>
        <div className="App">
          {/* Header globale */}
          <Header />

          {/* Contenuto principale */}
          <main>
            <Routes>
              {/* Rotte pubbliche */}
              <Route path={routes.home} element={<HomepageStatic />} />
              <Route path={routes.auth.login} element={<Login />} />
              <Route path={routes.auth.register} element={<Register />} />
              <Route path={routes.joinHelpLab} element={<JoinHelpLab />} />

              {/* Corsi pubblici (progressi salvati solo se loggato) */}
              <Route path={routes.dashboard.learningPaths} element={<LearningPaths />} />
              {/* Alias senza trattino */}
              <Route path="/learningpaths" element={<Navigate to={routes.dashboard.learningPaths} replace />} />

              {/* Sfide — pagina pubblica; le azioni (join/submit) sono protette nella pagina */}
              <Route path={routes.dashboard.challenges} element={<Challenges />} />

              {/* Rotte protette */}
              <Route
                path={routes.dashboard.userProfile}
                element={
                  <ProtectedRoute>
                    <UserProfile />
                  </ProtectedRoute>
                }
              />
              <Route
                path={routes.dashboard.createChallenge}
                element={
                  <ProtectedRoute>
                    <CreateChallenge />
                  </ProtectedRoute>
                }
              />

              {/* 404 finale */}
              <Route path={routes.notFound} element={<NotFound />} />
            </Routes>
          </main>

          {/* Footer globale */}
          <Footer />
        </div>
      </Router>
    </AuthProvider>
  );
}

