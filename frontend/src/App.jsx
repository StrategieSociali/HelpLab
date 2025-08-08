import React from 'react';
import { BrowserRouter as Router, Route, Routes } from 'react-router-dom';
import ProtectedRoute from './components/ProtectedRoute';
import Login from './pages/Login';
import Register from './pages/Register';
import HomepageStatic from './pages/HomepageStatic';
import '@/styles/styles.css';
import Challenges from './pages/Challenges';
import LearningPaths from './pages/LearningPaths';
import UserProfile from './pages/UserProfile';
import Header from './components/common/Header';
import Footer from './components/common/Footer';
import NotFound from './pages/NotFound';
import JoinHelpLab from './pages/JoinHelpLab';
import './App.css';
import { routes } from './routes';
import { AuthProvider } from './context/AuthContext';

function App() {
  return (
    <AuthProvider>
      <Router>
        <div className="App">
          {/* Intestazione */}
          <Header />

          {/* Contenuto principale */}
          <main>
            <Routes>
              {/* Rotte pubbliche */}
              <Route path={routes.auth.login} element={<Login />} />
              <Route path={routes.auth.register} element={<Register />} />
              <Route path={routes.joinHelpLab} element={<JoinHelpLab />} />

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
                path={routes.dashboard.learningPaths}
                element={
                  <ProtectedRoute>
                    <LearningPaths />
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

              {/* Homepage */}
               <Route path={routes.home} element={<HomepageStatic />} />

              {/* Pagina 404 */}
              <Route path={routes.notFound} element={<NotFound />} />
            </Routes>
          </main>

          {/* Footer */}
          <Footer />
        </div>
      </Router>
    </AuthProvider>
  );
}

export default App;
