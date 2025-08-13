import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import ProtectedRoute from './components/ProtectedRoute';
import Login from './pages/Login';
import Register from './pages/Register';
import HomepageStatic from './pages/HomepageStatic';
import '@/styles/styles.css';
import Challenges from './pages/Challenges';
import LearningPaths from './pages/LearningPaths.jsx';
import UserProfile from './pages/UserProfile'; //-> attivare quando si parte con la registrazione
import Header from './components/common/Header';
import Footer from './components/common/Footer';
import NotFound from './pages/NotFound';
import JoinHelpLab from './pages/JoinHelpLab';
import './App.css';
import { routes } from './routes';
import { AuthProvider } from './context/AuthContext';

export default function App() {
  return (
    <AuthProvider>
      <Router>
        <div className="App">
          {/* Intestazione */}
          <Header />
         <main>
  <Routes>
    {/* Rotte pubbliche */}
    <Route path={routes.home} element={<HomepageStatic />} />
    <Route path={routes.auth.login} element={<Login />} />
    <Route path={routes.auth.register} element={<Register />} />
    <Route path={routes.joinHelpLab} element={<JoinHelpLab />} />

    {/* Learning Paths pubblica */}
    <Route path={routes.dashboard.learningPaths} element={<LearningPaths />} />
    {/* Alias senza trattino */}
    <Route path="/learningpaths" element={<Navigate to={routes.dashboard.learningPaths} replace />} />

    {/* Rotte protette */}
    <Route
      path={routes.dashboard.challenges}
      element={
        <ProtectedRoute>
          <Challenges />
        </ProtectedRoute>
      }
    />
    <Route
      path={routes.dashboard.userProfile}
      element={
        <ProtectedRoute>
          <UserProfile />
        </ProtectedRoute>
      }
    />

    {/* Pagina 404 esplicita (se esiste in routes) */}
    {/* <Route path={routes.notFound} element={<NotFound />} /> */}

    {/* Fallback 404 */}
    <Route path="*" element={<NotFound />} />
  </Routes>
</main>

          {/* Questo codice sostituisce la rotta pubblica in produzione o lasciare solo i dati generali per i non loggati
             <Route
                path={routes.dashboard.learningPaths}
                element={
                  <ProtectedRoute>
                    <LearningPaths />
                  </ProtectedRoute>
                }
              />*/}

          {/* Footer */}
          <Footer />
        </div>
      </Router>
    </AuthProvider>
  );
}
